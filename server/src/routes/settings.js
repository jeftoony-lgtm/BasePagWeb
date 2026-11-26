// =====================================================================
//  LUZ SERENA · Configuración del residencial
//  (plazas, whatsapp, teléfono, agenda de la semana)
//  Todos la leen (la página la necesita). La agenda la puede cambiar
//  todo el equipo; el resto, solo el dueño.
// =====================================================================

import { Router } from "express";
import { Setting } from "../models.js";
import { isOwner, requireStaff } from "../auth.js";
import { fail } from "../http.js";
import { logActivity } from "../activity.js";
import { DEFAULT_SETTINGS } from "../seed-data.js";

export const router = Router();

const STAFF_KEYS = ["agenda"]; // lo que también puede cambiar un empleado

/** Todos los ajustes: { plazas: {...}, agenda: {...}, ... } (con valores por defecto si falta alguno) */
export async function loadSettings() {
  const rows = await Setting.find();
  return { ...structuredClone(DEFAULT_SETTINGS), ...Object.fromEntries(rows.map((r) => [r._id, r.value])) };
}

router.get("/settings", async (_req, res) => {
  res.json(await loadSettings());
});

router.put("/settings/:key", requireStaff, async (req, res) => {
  const { key } = req.params;
  if (!(key in DEFAULT_SETTINGS)) throw fail(400, "Ese ajuste no existe.");
  if (!STAFF_KEYS.includes(key) && !isOwner(req)) throw fail(403, "Solo el dueño puede cambiar esto.");
  const { value } = req.body;
  if (value === undefined || value === null) throw fail(400, "Falta el valor.");
  if (JSON.stringify(value).length > 20_000) throw fail(400, "Es demasiado largo.");
  if (key === "plazas") {
    const total = Number(value.total), ocupadas = Number(value.ocupadas);
    if (!Number.isInteger(total) || !Number.isInteger(ocupadas) || total < 1 || ocupadas < 0 || ocupadas > total) {
      throw fail(400, "Revisá las plazas: las ocupadas no pueden ser más que las totales.");
    }
  }

  const before = (await Setting.findById(key))?.value ?? DEFAULT_SETTINGS[key];
  await Setting.findByIdAndUpdate(key, { value }, { upsert: true });
  await logActivity(req, "settings", key, "update", { value: [before, value] });
  res.json({ key, value });
});
