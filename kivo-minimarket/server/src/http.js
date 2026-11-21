// =====================================================================
//  INMOBILIARIA · Ayudas para las rutas: errores en castellano, límites de uso
//  y fechas en hora de Uruguay.
// =====================================================================

import rateLimit from "express-rate-limit";

/** Error con código HTTP: throw fail(403, "Sin permiso") */
export const fail = (status, message) => Object.assign(new Error(message), { status });

/** Convierte cualquier error en una respuesta { error: "mensaje" } */
export function errorHandler(error, _req, res, _next) {
  if (error.status) return res.status(error.status).json({ error: error.message });
  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({ error: "Hay datos inválidos. Revisá lo que escribiste." });
  }
  if (error.code === 11000) return res.status(409).json({ error: "Eso ya existe." });
  if (error.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "La foto es muy pesada (máximo 6 MB)." });
  console.error(error);
  res.status(500).json({ error: "Algo salió mal en el servidor." });
}

/** Límite de pedidos por persona (IP) para lo que puede usar cualquiera sin entrar */
export const limit = (max, minutes = 15) => rateLimit({
  windowMs: minutes * 60_000,
  limit: max,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Probá de nuevo en un rato." },
});

/** Fecha de hoy + N días en Uruguay, como "2026-11-13" */
export function dateInUruguay(offsetDays = 0) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo" })
    .format(new Date(Date.now() + offsetDays * 864e5));
}

/** Fecha de hace N días (para filtrar "últimos 30 días") */
export const daysAgo = (days) => new Date(Date.now() - days * 864e5);
