// =====================================================================
//  KIVO · Chat en vivo con el local
//
//  El cliente, desde el chat de la página, toca "Hablar con alguien de
//  Kivo". Si hay alguien del local con el panel abierto y "atendiendo",
//  se abre una charla que le llega al panel al instante (con sonido).
//
//  Las charlas se guardan en MongoDB (colección "chats"), así el cliente
//  no pierde la conversación si recarga la página.
//
//  En vivo se usa la misma técnica que los pedidos (Server-Sent Events):
//    - el panel escucha  /api/vivo/panel/events  (todas las charlas)
//    - el cliente escucha /api/vivo/chats/:id/events (solo la suya)
//
//  El cliente no tiene cuenta: al abrir la charla recibe una "llave"
//  (token) que solo tiene él. Sin esa llave no se puede leer ni escribir.
// =====================================================================

import crypto from "node:crypto";
import { Router } from "express";
import mongoose from "mongoose";
import { userFromToken, requireStaff } from "./auth.js";
import { fail, limit } from "./http.js";

const { Schema, model } = mongoose;

/* ---------- Base de datos ---------- */
const messageSchema = new Schema({
  de: { type: String, enum: ["cliente", "local", "sistema"], required: true },
  texto: { type: String, required: true, maxlength: 1000 },
  autor: { type: String, default: "" }, // nombre de quien respondió del local
  at: { type: Date, default: Date.now },
});

const chatSchema = new Schema({
  token: { type: String, required: true, select: false }, // la "llave" del cliente
  nombre: { type: String, required: true, trim: true, maxlength: 60 },
  estado: { type: String, enum: ["esperando", "atendiendo", "cerrado"], default: "esperando" },
  atendido_por: { type: String, default: "" }, // nombre de quien atiende
  sin_leer: { type: Number, default: 0 },      // mensajes del cliente que el local no vio
  canasta: [{ _id: false, nombre: String, cantidad: Number }],
  mensajes: [messageSchema],
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  toJSON: {
    transform(_doc, ret) {
      ret.id = String(ret._id);
      delete ret._id;
      delete ret.__v;
      delete ret.token;
      ret.mensajes = (ret.mensajes || []).map(({ _id, ...m }) => ({ id: String(_id), ...m }));
      return ret;
    },
  },
});
chatSchema.index({ updated_at: -1 });
const Chat = model("Chat", chatSchema);

const MAX_MESSAGES = 300;
const msgJSON = (m) => ({ id: String(m._id), de: m.de, texto: m.texto, autor: m.autor, at: m.at });
const text = (value, max) => String(value ?? "").trim().slice(0, max);

/* ---------- Conexiones en vivo ---------- */
const panels = new Map();  // res → { atiende: true/false }
const clients = new Map(); // id de la charla → Set de res

function openStream(req, res, onClose) {
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  res.flushHeaders();
  res.write(": conectado\n\n");
  const ping = setInterval(() => res.write(": ping\n\n"), 25_000);
  req.on("close", () => { clearInterval(ping); onClose(); });
}

const send = (res, data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

/** Hay alguien del local con el panel abierto y atendiendo */
export const someoneAvailable = () => [...panels.values()].some((p) => p.atiende);

function toPanels(chat) {
  const data = { type: "chat", chat: chat.toJSON() };
  for (const res of panels.keys()) send(res, data);
}

function toClient(chat, data) {
  for (const res of clients.get(String(chat._id)) || []) send(res, data);
}

/** Avisa a todos (panel y cliente) que la charla cambió */
function notify(chat, newMessage) {
  toPanels(chat);
  toClient(chat, {
    type: "update",
    estado: chat.estado,
    atendido_por: chat.atendido_por,
    mensaje: newMessage ? msgJSON(newMessage) : null,
  });
}

function addMessage(chat, message) {
  chat.mensajes.push(message);
  if (chat.mensajes.length > MAX_MESSAGES) chat.mensajes.splice(0, chat.mensajes.length - MAX_MESSAGES);
  return chat.mensajes[chat.mensajes.length - 1];
}

/** Busca la charla del cliente comprobando su llave */
async function clientChat(id, token) {
  if (!mongoose.isValidObjectId(id) || !token) throw fail(404, "No encontramos esa charla.");
  const chat = await Chat.findById(id).select("+token");
  const ok = chat && chat.token.length === String(token).length &&
    crypto.timingSafeEqual(Buffer.from(chat.token), Buffer.from(String(token)));
  if (!ok) throw fail(404, "No encontramos esa charla.");
  return chat;
}

async function staffChat(id) {
  if (!mongoose.isValidObjectId(id)) throw fail(404, "No encontramos esa charla.");
  const chat = await Chat.findById(id);
  if (!chat) throw fail(404, "No encontramos esa charla.");
  return chat;
}

export const router = Router();

/* ---------- Lo que usa el cliente (sin cuenta) ---------- */

// ¿Hay alguien para atender?
router.get("/vivo/estado", (_req, res) => res.json({ disponible: someoneAvailable() }));

// Abrir una charla nueva con el primer mensaje
router.post("/vivo/chats", limit(10), async (req, res) => {
  const nombre = text(req.body.nombre, 60);
  const texto = text(req.body.texto, 500);
  if (!nombre) throw fail(400, "Poné tu nombre para que sepamos cómo llamarte.");
  if (!texto) throw fail(400, "Escribí tu consulta.");
  if (!someoneAvailable()) throw fail(409, "Justo ahora no hay nadie del local conectado.");

  const canasta = (Array.isArray(req.body.canasta) ? req.body.canasta : []).slice(0, 40)
    .map((i) => ({ nombre: text(i?.nombre, 120), cantidad: Math.max(1, Math.min(99, Number(i?.cantidad) || 1)) }))
    .filter((i) => i.nombre);

  const token = crypto.randomBytes(24).toString("hex");
  const chat = new Chat({ token, nombre, canasta, sin_leer: 1, mensajes: [{ de: "cliente", texto }] });
  await chat.save();
  toPanels(chat);
  res.status(201).json({ id: String(chat._id), token, chat: chat.toJSON() });
});

// Leer la charla (al recargar la página)
router.get("/vivo/chats/:id", async (req, res) => {
  res.json((await clientChat(req.params.id, req.query.token)).toJSON());
});

// El cliente escribe
router.post("/vivo/chats/:id/mensajes", limit(120), async (req, res) => {
  const chat = await clientChat(req.params.id, req.body.token);
  if (chat.estado === "cerrado") throw fail(409, "Esta charla ya terminó. Podés empezar una nueva.");
  const texto = text(req.body.texto, 500);
  if (!texto) throw fail(400, "Escribí un mensaje.");
  const message = addMessage(chat, { de: "cliente", texto });
  chat.sin_leer += 1;
  await chat.save();
  notify(chat, message);
  res.status(201).json(msgJSON(message));
});

// El cliente termina la charla
router.post("/vivo/chats/:id/cerrar", async (req, res) => {
  const chat = await clientChat(req.params.id, req.body.token);
  if (chat.estado !== "cerrado") {
    chat.estado = "cerrado";
    const message = addMessage(chat, { de: "sistema", texto: `${chat.nombre} terminó la charla.` });
    await chat.save();
    notify(chat, message);
  }
  res.json({ ok: true });
});

// En vivo para el cliente. EventSource no manda encabezados: la llave viene en la dirección.
router.get("/vivo/chats/:id/events", async (req, res) => {
  const chat = await clientChat(req.params.id, req.query.token);
  const id = String(chat._id);
  if (!clients.has(id)) clients.set(id, new Set());
  clients.get(id).add(res);
  openStream(req, res, () => {
    clients.get(id)?.delete(res);
    if (!clients.get(id)?.size) clients.delete(id);
  });
});

/* ---------- Lo que usa el panel del local ---------- */

// En vivo para el panel. atiende=1 → cuenta como "hay alguien para atender"
router.get("/vivo/panel/events", async (req, res) => {
  const user = await userFromToken(String(req.query.token || ""));
  if (!user?.activo) throw fail(401, "Sin permiso para hacer esto.");
  panels.set(res, { atiende: req.query.atiende === "1" });
  openStream(req, res, () => panels.delete(res));
});

// Charlas abiertas + las cerradas de las últimas 24 horas
router.get("/vivo/chats", requireStaff, async (_req, res) => {
  const since = new Date(Date.now() - 864e5);
  const chats = await Chat.find({ $or: [{ estado: { $ne: "cerrado" } }, { updated_at: { $gte: since } }] })
    .sort({ updated_at: -1 }).limit(100);
  res.json(chats.map((c) => c.toJSON()));
});

// Responder
router.post("/vivo/chats/:id/responder", requireStaff, async (req, res) => {
  const chat = await staffChat(req.params.id);
  if (chat.estado === "cerrado") throw fail(409, "Esta charla ya terminó.");
  const texto = text(req.body.texto, 1000);
  if (!texto) throw fail(400, "Escribí un mensaje.");
  const autor = req.user.nombre || "Kivo";
  if (chat.estado === "esperando" || !chat.atendido_por) {
    chat.estado = "atendiendo";
    chat.atendido_por = autor;
  }
  const message = addMessage(chat, { de: "local", texto, autor });
  chat.sin_leer = 0;
  await chat.save();
  notify(chat, message);
  res.status(201).json(chat.toJSON());
});

// Marcar como leída
router.post("/vivo/chats/:id/leido", requireStaff, async (req, res) => {
  const chat = await staffChat(req.params.id);
  if (chat.sin_leer) {
    chat.sin_leer = 0;
    await chat.save();
    toPanels(chat);
  }
  res.json({ ok: true });
});

// Terminar la charla desde el local
router.post("/vivo/chats/:id/terminar", requireStaff, async (req, res) => {
  const chat = await staffChat(req.params.id);
  if (chat.estado !== "cerrado") {
    chat.estado = "cerrado";
    chat.sin_leer = 0;
    const message = addMessage(chat, { de: "sistema", texto: "La charla terminó. ¡Gracias por escribirnos! 🙌" });
    await chat.save();
    notify(chat, message);
  }
  res.json(chat.toJSON());
});
