// =====================================================================
//  LUZ SERENA · Fotos (las que sube el equipo para el blog)
//  Se guardan dentro de MongoDB. Cualquiera las ve; solo el equipo sube.
// =====================================================================

import { Router } from "express";
import multer from "multer";
import { Photo } from "../models.js";
import { requireStaff } from "../auth.js";
import { fail } from "../http.js";

export const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6e6 },
  fileFilter: (_req, file, done) => done(file.mimetype.startsWith("image/") ? null : fail(400, "Eso no es una foto."), true),
});

router.post("/photos", requireStaff, upload.single("foto"), async (req, res) => {
  if (!req.file) throw fail(400, "No llegó ninguna foto.");
  const photo = await Photo.create({ data: req.file.buffer, tipo: req.file.mimetype });
  res.status(201).json({ url: `/api/photos/${photo.id}` });
});

router.get("/photos/:id", async (req, res) => {
  const photo = await Photo.findById(req.params.id);
  if (!photo) throw fail(404, "Esa foto no existe.");
  // Una foto nunca cambia (si se cambia, es otra con otro id): el navegador la puede guardar para siempre
  res.set({ "Content-Type": photo.tipo, "Cache-Control": "public, max-age=31536000, immutable" });
  res.send(photo.data);
});
