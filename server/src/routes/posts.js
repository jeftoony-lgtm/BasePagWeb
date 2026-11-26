// =====================================================================
//  LUZ SERENA · Blog
//  La página ve las publicaciones publicadas. El equipo ve también los
//  borradores, escribe, edita y borra.
// =====================================================================

import { Router } from "express";
import { Post } from "../models.js";
import { isStaff, requireStaff } from "../auth.js";
import { fail, limit, dateInUruguay } from "../http.js";
import { logActivity } from "../activity.js";

export const router = Router();

const EDITABLE = ["titulo", "categoria", "fecha", "foto_url", "texto", "publicado"];

function postFields(body) {
  const fields = {};
  for (const key of EDITABLE) if (key in body) fields[key] = body[key];
  if ("publicado" in fields) fields.publicado = Boolean(fields.publicado);
  if (fields.foto_url === "") fields.foto_url = null;
  if ("fecha" in fields && !/^\d{4}-\d{2}-\d{2}$/.test(fields.fecha)) fields.fecha = dateInUruguay();
  return fields;
}

router.get("/posts", async (req, res) => {
  const filter = isStaff(req) ? {} : { publicado: true };
  res.json(await Post.find(filter).sort({ fecha: -1, created_at: -1 }).limit(200));
});

// Cuenta una lectura (la página lo llama al abrir una publicación)
router.post("/posts/:id/leido", limit(120), async (req, res) => {
  await Post.updateOne({ _id: req.params.id, publicado: true }, { $inc: { lecturas: 1 } });
  res.status(204).end();
});

router.post("/posts", requireStaff, async (req, res) => {
  const fields = postFields(req.body);
  if (!String(fields.titulo || "").trim()) throw fail(400, "Poné un título.");
  const post = await Post.create({ fecha: dateInUruguay(), ...fields });
  await logActivity(req, "posts", post.id, "insert", { _nombre: post.titulo });
  res.status(201).json(post);
});

router.put("/posts/:id", requireStaff, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw fail(404, "Esa publicación no existe.");
  post.set(postFields(req.body));
  await post.save();
  await logActivity(req, "posts", post.id, "update", { _nombre: post.titulo });
  res.json(post);
});

router.delete("/posts/:id", requireStaff, async (req, res) => {
  const post = await Post.findByIdAndDelete(req.params.id);
  if (post) await logActivity(req, "posts", post.id, "delete", { _nombre: post.titulo });
  res.status(204).end();
});
