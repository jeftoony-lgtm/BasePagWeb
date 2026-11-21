// =====================================================================
//  INMOBILIARIA · Configuración (nombre, eslogan, WhatsApp, servicios...)
//  Todos la leen (la página la necesita); solo el dueño la cambia.
// =====================================================================

import { Router } from "express";
import { Setting } from "../models.js";
import { requireOwner } from "../auth.js";
import { fail } from "../http.js";
import { logActivity } from "../activity.js";
import { DEFAULT_SETTINGS } from "../seed-data.js";

export const router = Router();

/** Todos los ajustes: { inmobiliaria: {...} } (con valores por defecto si falta alguno, por ejemplo un dato nuevo como el email) */
export async function loadSettings() {
  const settings = structuredClone(DEFAULT_SETTINGS);
  for (const row of await Setting.find()) {
    const isObject = row.value && typeof row.value === "object" && !Array.isArray(row.value);
    settings[row._id] = isObject ? { ...settings[row._id], ...row.value } : row.value;
  }
  return settings;
}

router.get("/settings", async (_req, res) => {
  res.json(await loadSettings());
});

router.put("/settings/:key", requireOwner, async (req, res) => {
  const { key } = req.params;
  if (!(key in DEFAULT_SETTINGS)) throw fail(400, "Ese ajuste no existe.");
  const { value } = req.body;
  if (value === undefined || value === null) throw fail(400, "Falta el valor.");
  if (JSON.stringify(value).length > 20_000) throw fail(400, "Es demasiado largo.");

  const before = (await Setting.findById(key))?.value ?? DEFAULT_SETTINGS[key];
  await Setting.findByIdAndUpdate(key, { value }, { upsert: true });
  await logActivity(req, "settings", key, "update", { value: [before, value] });
  res.json({ key, value });
});
