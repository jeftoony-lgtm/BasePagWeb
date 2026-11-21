// =====================================================================
//  INMOBILIARIA · Entrar y crear cuenta (panel)
//  La PRIMERA cuenta que se crea queda como dueño activo. Las demás quedan
//  inactivas hasta que el dueño las activa en Equipo.
// =====================================================================

import { Router } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models.js";
import { signToken } from "../auth.js";
import { fail, limit } from "../http.js";

export const router = Router();

const EMAIL = /^\S+@\S+\.\S+$/;

router.post("/signup", limit(10), async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const nombre = String(req.body.nombre || "").trim().slice(0, 60);

  if (!EMAIL.test(email)) throw fail(400, "Escribí un mail válido.");
  if (password.length < 6) throw fail(400, "La contraseña tiene que tener al menos 6 caracteres.");
  if (!nombre) throw fail(400, "Escribí tu nombre.");
  if (await User.exists({ email })) throw fail(409, "Ya existe una cuenta con ese mail.");

  const first = (await User.estimatedDocumentCount()) === 0;
  const user = await User.create({
    email, nombre,
    password_hash: await bcrypt.hash(password, 10),
    rol: first ? "dueno" : "empleado",
    activo: first,
  });
  res.status(201).json({ token: signToken(user), user });
});

router.post("/login", limit(20), async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const user = await User.findOne({ email });
  const ok = user && (await bcrypt.compare(String(req.body.password || ""), user.password_hash));
  if (!ok) throw fail(401, "Mail o contraseña incorrectos.");
  res.json({ token: signToken(user), user });
});

router.get("/me", (req, res) => {
  res.json({ user: req.user || null });
});
