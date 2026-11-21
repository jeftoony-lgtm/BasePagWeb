// =====================================================================
//  KIVO · Ruleta, canje de códigos, clientes y búsquedas
//  El premio se sortea en el servidor: nadie puede hacer trampa desde el navegador.
// =====================================================================

import { Router } from "express";
import crypto from "node:crypto";
import { Customer, Spin, Search } from "../models.js";
import { requireOwner, requireStaff } from "../auth.js";
import { fail, limit, dateInUruguay, daysAgo } from "../http.js";
import { logActivity } from "../activity.js";
import { loadSettings } from "./settings.js";

export const router = Router();

const CODE_DAYS = 7; // los códigos vencen a la semana

async function newCode() {
  for (;;) {
    const code = "KIVO-" + crypto.randomBytes(3).toString("hex").slice(0, 5).toUpperCase();
    if (!(await Spin.exists({ code }))) return code;
  }
}

/* ---------- Girar (cualquiera) ---------- */
router.post("/ruleta/girar", limit(10), async (req, res) => {
  const { ruleta } = await loadSettings();
  if (!ruleta?.activa || !ruleta.premios?.length) throw fail(400, "La ruleta no está activa");
  if (ruleta.hasta && dateInUruguay() > ruleta.hasta) throw fail(400, "Esta promo ya terminó");

  const telefono = String(req.body.telefono || "").replace(/\D/g, "");
  const nombre = String(req.body.nombre || "").trim().slice(0, 60);
  if (!/^09\d{7}$/.test(telefono)) throw fail(400, "Celular inválido");
  if (!nombre) throw fail(400, "Falta el nombre");

  // Si ya existía, se actualiza el nombre; "acepta promos" no se apaga si ya lo había aceptado
  const update = { $set: { nombre } };
  if (req.body.acepta) update.$set.acepta_promos = true;
  const customer = await Customer.findOneAndUpdate({ telefono }, update, { upsert: true, new: true, setDefaultsOnInsert: true });

  if (await Spin.exists({ customer: customer._id, promo_id: ruleta.promo_id })) throw fail(409, "Ya giraste en esta promo");

  const indice = crypto.randomInt(ruleta.premios.length);
  const premio = ruleta.premios[indice].d?.trim() || null;
  const code = premio ? await newCode() : null;

  try {
    await Spin.create({
      customer: customer._id, promo_id: ruleta.promo_id, indice, premio, code,
      vence: code ? new Date(Date.now() + CODE_DAYS * 864e5) : null,
    });
  } catch (error) {
    if (error.code === 11000) throw fail(409, "Ya giraste en esta promo"); // dos toques a la vez
    throw error;
  }
  res.json({ indice, premio, code });
});

/* ---------- Canjear en caja (dueño o empleado) ---------- */
router.post("/ruleta/canjear", requireStaff, async (req, res) => {
  const code = String(req.body.code || "").trim().toUpperCase();
  const spin = await Spin.findOne({ code }).populate("customer", "nombre");
  if (!spin) return res.json({ estado: "no_existe" });

  const nombre = spin.customer?.nombre || "";
  if (spin.canjeado_at) return res.json({ estado: "ya_canjeado", premio: spin.premio, nombre, fecha: spin.canjeado_at });
  if (spin.vence && spin.vence < new Date()) return res.json({ estado: "vencido", premio: spin.premio, nombre, fecha: spin.vence });

  // Se marca como canjeado solo si nadie lo canjeó en el mismo instante
  const updated = await Spin.findOneAndUpdate(
    { _id: spin._id, canjeado_at: null },
    { canjeado_at: new Date(), canjeado_por: req.user._id },
  );
  if (!updated) return res.json({ estado: "ya_canjeado", premio: spin.premio, nombre, fecha: new Date() });

  await logActivity(req, "giros", code, "canje", { premio: spin.premio, cliente: nombre });
  res.json({ estado: "ok", premio: spin.premio, nombre });
});

/* ---------- Clientes (solo dueño) ---------- */
router.get("/customers", requireOwner, async (_req, res) => {
  const [customers, spins] = await Promise.all([
    Customer.find().sort({ created_at: -1 }),
    Spin.find().sort({ created_at: 1 }),
  ]);
  const byCustomer = new Map();
  for (const s of spins) {
    const key = String(s.customer);
    if (!byCustomer.has(key)) byCustomer.set(key, []);
    byCustomer.get(key).push({ premio: s.premio, code: s.code, canjeado_at: s.canjeado_at, promo_id: s.promo_id, created_at: s.created_at });
  }
  res.json(customers.map((c) => ({ ...c.toJSON(), giros: byCustomer.get(String(c._id)) || [] })));
});

/* ---------- Búsquedas sin resultado ---------- */
router.post("/busquedas", limit(60), async (req, res) => {
  const termino = String(req.body.termino || "").trim().slice(0, 60);
  if (termino.length >= 2) await Search.create({ termino });
  res.status(204).end();
});

router.get("/busquedas", requireOwner, async (req, res) => {
  const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
  res.json(await Search.find({ created_at: { $gte: daysAgo(days) } }).sort({ created_at: -1 }));
});
