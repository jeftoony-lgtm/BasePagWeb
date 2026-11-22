// =====================================================================
//  KIVO · Pedidos
//  Cualquiera puede mandar un pedido nuevo (desde la canasta).
//  Solo el personal los ve y los mueve: Nuevo → Preparando → Listo → Entregado.
// =====================================================================

import { Router } from "express";
import { Order, nextOrderId } from "../models.js";
import { requireStaff, userFromToken } from "../auth.js";
import { fail, limit, daysAgo } from "../http.js";
import { logActivity } from "../activity.js";
import { listen, broadcast } from "../live.js";

export const router = Router();

const STATES = ["nuevo", "preparando", "listo", "entregado", "cancelado"];
const text = (value, max) => (value == null ? "" : String(value).trim().slice(0, max));
const clampInt = (value, min, max) => Math.min(max, Math.max(min, Math.round(Number(value) || min)));

/** Limpia lo que manda la página antes de guardarlo */
function cleanOrder(body) {
  const items = (Array.isArray(body.items) ? body.items : []).slice(0, 60).map((i) => ({
    id: text(i?.id, 40),
    nombre: text(i?.nombre, 120),
    cantidad: clampInt(i?.cantidad, 1, 99),
    precio: i?.precio == null ? null : Math.max(0, Math.round(Number(i.precio) || 0)),
  })).filter((i) => i.id && i.nombre);

  if (!items.length) throw fail(400, "El pedido está vacío.");
  const nombre = text(body.nombre, 80);
  if (!nombre) throw fail(400, "Falta el nombre.");
  const modo = body.modo === "envio" ? "envio" : "retiro";

  return {
    nombre, modo, items,
    telefono: text(body.telefono, 20).replace(/\D/g, "") || null,
    direccion: modo === "envio" ? text(body.direccion, 200) : null,
    dia: /^\d{4}-\d{2}-\d{2}$/.test(body.dia) ? body.dia : null,
    hora: /^\d{2}:\d{2}$/.test(body.hora) ? body.hora : null,
    nota: text(body.nota, 500),
    si_falta: body.si_falta === "quitar" ? "quitar" : "reemplazar",
    // El total lo calcula el servidor (los encargos sin precio no suman)
    total: items.reduce((sum, i) => sum + (i.precio ?? 0) * i.cantidad, 0),
  };
}

router.post("/orders", limit(20), async (req, res) => {
  const order = await Order.create({ _id: await nextOrderId(), ...cleanOrder(req.body), estado: "nuevo" });
  broadcast("INSERT", order.toJSON());
  res.status(201).json({ id: order._id }); // número (order.id sería texto)
});

// Conexión en vivo del panel. EventSource no manda encabezados: el token viene en la dirección.
router.get("/orders/events", async (req, res) => {
  const user = await userFromToken(String(req.query.token || ""));
  if (!user?.activo) throw fail(401, "Sin permiso para hacer esto.");
  listen(req, res);
});

router.get("/orders", requireStaff, async (req, res) => {
  const days = clampInt(req.query.days ?? 30, 1, 365);
  res.json(await Order.find({ created_at: { $gte: daysAgo(days) } }).sort({ created_at: -1 }));
});

router.patch("/orders/:id", requireStaff, async (req, res) => {
  const { estado } = req.body;
  if (!STATES.includes(estado)) throw fail(400, "Ese estado no existe.");
  const order = await Order.findById(Number(req.params.id));
  if (!order) throw fail(404, "Ese pedido no existe.");

  if (order.estado !== estado) {
    await logActivity(req, "orders", order.id, "update", { estado: [order.estado, estado] });
    order.estado = estado;
    await order.save();
    broadcast("UPDATE", order.toJSON());
  }
  res.json(order);
});
