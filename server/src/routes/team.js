// =====================================================================
//  LUZ SERENA · Equipo (solo dueño)
//  Activar o quitar acceso, cambiar rol, poner contraseña nueva,
//  y ver el registro de actividad.
// =====================================================================

import { Router } from "express";
import bcrypt from "bcryptjs";
import { User, Activity } from "../models.js";
import { requireOwner } from "../auth.js";
import { fail } from "../http.js";

export const router = Router();

router.get("/profiles", requireOwner, async (_req, res) => {
  res.json(await User.find().sort({ created_at: 1 }));
});

router.patch("/profiles/:id", requireOwner, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw fail(404, "Ese usuario no existe.");
  const isMe = user._id.equals(req.user._id);
  const { rol, activo, password } = req.body;

  // Para no quedarse afuera por error: el dueño no puede sacarse el acceso ni el rol a sí mismo
  if (isMe && (activo === false || rol === "empleado")) throw fail(400, "No te podés quitar el acceso a vos mismo.");

  if (rol !== undefined) {
    if (!["dueno", "empleado"].includes(rol)) throw fail(400, "Ese rol no existe.");
    user.rol = rol;
  }
  if (activo !== undefined) user.activo = Boolean(activo);
  if (password !== undefined) {
    if (String(password).length < 6) throw fail(400, "La contraseña tiene que tener al menos 6 caracteres.");
    user.password_hash = await bcrypt.hash(String(password), 10);
  }
  await user.save();
  res.json(user);
});

router.get("/activity", requireOwner, async (_req, res) => {
  const rows = await Activity.find().sort({ created_at: -1 }).limit(80).populate("user", "nombre");
  res.json(rows.map((a) => ({ ...a.toJSON(), user: undefined, usuario: a.user?.nombre || "—" })));
});
