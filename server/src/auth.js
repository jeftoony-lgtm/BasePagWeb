// =====================================================================
//  KIVO · Sesión y permisos
//  El panel manda un "token" en cada pedido (Authorization: Bearer ...).
//  Acá se averigua quién es y se decide qué puede hacer:
//    - visitante: ve el catálogo, hace pedidos, gira la ruleta
//    - empleado activo: pedidos, stock y canjes
//    - dueño activo: todo
//  Los permisos se chequean en el servidor: tocar la página no sirve para saltarlos.
// =====================================================================

import jwt from "jsonwebtoken";
import { User } from "./models.js";
import { fail } from "./http.js";

const secret = () => {
  if (!process.env.JWT_SECRET) throw new Error("Falta JWT_SECRET en server/.env");
  return process.env.JWT_SECRET;
};

export const signToken = (user) => jwt.sign({ sub: String(user._id) }, secret(), { expiresIn: "30d" });

/** Busca al usuario de un token. Si el token no sirve, devuelve null */
export async function userFromToken(token) {
  if (!token) return null;
  try {
    const { sub } = jwt.verify(token, secret());
    return await User.findById(sub);
  } catch {
    return null; // vencido o inválido: sigue como visitante
  }
}

/** Middleware: deja en req.user al que entró (o nada si es un visitante) */
export async function readUser(req, _res, next) {
  const header = req.get("authorization") || "";
  req.user = header.startsWith("Bearer ") ? await userFromToken(header.slice(7)) : null;
  next();
}

export const isStaff = (req) => Boolean(req.user?.activo);
export const isOwner = (req) => Boolean(req.user?.activo && req.user.rol === "dueno");

export const requireStaff = (req, _res, next) =>
  next(isStaff(req) ? undefined : fail(req.user ? 403 : 401, "Sin permiso para hacer esto."));

export const requireOwner = (req, _res, next) =>
  next(isOwner(req) ? undefined : fail(req.user ? 403 : 401, "Sin permiso para hacer esto."));
