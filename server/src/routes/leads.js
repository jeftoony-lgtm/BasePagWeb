// =====================================================================
//  LUZ SERENA · Consultas (familias que piden una visita)
//  Cualquiera puede dejar una consulta desde la página.
//  El equipo las ve, les cambia el estado y les agrega notas.
// =====================================================================

import { Router } from "express";
import { Lead, LEAD_STATES } from "../models.js";
import { requireOwner, requireStaff } from "../auth.js";
import { fail, limit } from "../http.js";
import { logActivity } from "../activity.js";

export const router = Router();

const text = (value, max) => String(value ?? "").trim().slice(0, max);

router.post("/consultas", limit(8), async (req, res) => {
  const nombre = text(req.body.nombre, 80);
  const telefono = text(req.body.telefono, 30);
  if (!nombre) throw fail(400, "Escribí tu nombre, por favor.");
  if (telefono.replace(/\D/g, "").length < 8) throw fail(400, "Revisá el teléfono: tiene que tener al menos 8 números.");
  const lead = await Lead.create({
    nombre, telefono,
    para: text(req.body.para, 40),
    dia: text(req.body.dia, 60),
    mensaje: text(req.body.mensaje, 800),
  });
  res.status(201).json({ id: lead.id });
});

router.get("/consultas", requireStaff, async (_req, res) => {
  res.json(await Lead.find().sort({ created_at: -1 }).limit(500));
});

router.patch("/consultas/:id", requireStaff, async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw fail(404, "Esa consulta no existe.");
  const { estado, nota } = req.body;
  if (estado !== undefined) {
    if (!LEAD_STATES.includes(estado)) throw fail(400, "Ese estado no existe.");
    if (estado !== lead.estado) await logActivity(req, "consultas", lead.id, "update", { estado: [lead.estado, estado], _nombre: lead.nombre });
    lead.estado = estado;
  }
  if (nota !== undefined) lead.nota = text(nota, 300);
  await lead.save();
  res.json(lead);
});

router.delete("/consultas/:id", requireOwner, async (req, res) => {
  const lead = await Lead.findByIdAndDelete(req.params.id);
  if (lead) await logActivity(req, "consultas", lead.id, "delete", { _nombre: lead.nombre });
  res.status(204).end();
});
