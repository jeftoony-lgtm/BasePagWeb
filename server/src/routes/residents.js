// =====================================================================
//  LUZ SERENA · Residentes (solo el equipo)
//  Ficha simple: habitación, fechas, familiar de contacto y observaciones.
// =====================================================================

import { Router } from "express";
import { Resident } from "../models.js";
import { requireOwner, requireStaff } from "../auth.js";
import { fail } from "../http.js";
import { logActivity } from "../activity.js";

export const router = Router();

const EDITABLE = ["nombre", "habitacion", "nacimiento", "ingreso", "familiar", "telefono_familiar", "observaciones"];
const DATE = /^(\d{4}-\d{2}-\d{2})?$/;

function residentFields(body) {
  const fields = {};
  for (const key of EDITABLE) if (key in body) fields[key] = String(body[key] ?? "").trim();
  if (!DATE.test(fields.nacimiento ?? "") || !DATE.test(fields.ingreso ?? "")) throw fail(400, "Revisá las fechas.");
  return fields;
}

router.get("/residentes", requireStaff, async (_req, res) => {
  res.json(await Resident.find().sort({ habitacion: 1, nombre: 1 }));
});

router.post("/residentes", requireStaff, async (req, res) => {
  const fields = residentFields(req.body);
  if (!fields.nombre) throw fail(400, "Falta el nombre.");
  const resident = await Resident.create(fields);
  await logActivity(req, "residentes", resident.id, "insert", { _nombre: resident.nombre });
  res.status(201).json(resident);
});

router.put("/residentes/:id", requireStaff, async (req, res) => {
  const resident = await Resident.findById(req.params.id);
  if (!resident) throw fail(404, "Ese residente no existe.");
  resident.set(residentFields(req.body));
  await resident.save();
  await logActivity(req, "residentes", resident.id, "update", { _nombre: resident.nombre });
  res.json(resident);
});

router.delete("/residentes/:id", requireOwner, async (req, res) => {
  const resident = await Resident.findByIdAndDelete(req.params.id);
  if (resident) await logActivity(req, "residentes", resident.id, "delete", { _nombre: resident.nombre });
  res.status(204).end();
});
