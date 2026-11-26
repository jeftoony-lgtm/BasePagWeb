// =====================================================================
//  LUZ SERENA · Estadísticas de la página
//  La página avisa cuando alguien entra o toca WhatsApp (sin guardar
//  datos de la persona: solo se suma 1 al día). El dueño ve los totales.
// =====================================================================

import { Router } from "express";
import { DailyStat } from "../models.js";
import { requireStaff } from "../auth.js";
import { limit, dateInUruguay } from "../http.js";

export const router = Router();

router.post("/visitas", limit(60), async (req, res) => {
  const tipo = req.body.tipo === "whatsapp" ? "whatsapp" : "visitas";
  await DailyStat.updateOne({ _id: dateInUruguay() }, { $inc: { [tipo]: 1 } }, { upsert: true });
  res.status(204).end();
});

router.get("/estadisticas", requireStaff, async (req, res) => {
  const dias = Math.min(365, Math.max(1, Number(req.query.dias) || 60));
  const desde = dateInUruguay(-(dias - 1));
  const rows = await DailyStat.find({ _id: { $gte: desde } }).sort({ _id: 1 });
  res.json(rows.map((r) => ({ dia: r._id, visitas: r.visitas, whatsapp: r.whatsapp })));
});
