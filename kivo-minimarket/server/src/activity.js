// =====================================================================
//  INMOBILIARIA · Registro de actividad (quién hizo qué desde el panel)
//  Lo ve el dueño en Equipo → Actividad.
// =====================================================================

import { Activity } from "./models.js";

/** Anota un cambio. "detalle" es lo que cambió: { precio: [180, 189] } */
export async function logActivity(req, tabla, registro, accion, detalle = {}) {
  try {
    await Activity.create({ user: req.user?._id, tabla, registro: String(registro ?? ""), accion, detalle });
  } catch (error) {
    console.warn("No se pudo anotar la actividad:", error.message); // no frena lo que se estaba haciendo
  }
}

/** Qué cambió entre dos versiones: { campo: [antes, después] } */
export function changes(before, after, keys) {
  const result = {};
  for (const key of keys) {
    if (!(key in after)) continue;
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) result[key] = [before[key], after[key]];
  }
  return result;
}
