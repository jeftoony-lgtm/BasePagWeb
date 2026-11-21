// =====================================================================
//  KIVO · Asistente de compras (ruta POST /api/asistente)
//
//  Corre en el servidor, NO en el navegador: así la clave de la IA queda
//  escondida. La página le manda la charla y la canasta; esta ruta:
//    1. lee el catálogo, horarios y notas del dueño desde MongoDB,
//    2. le pregunta a Claude (modelo Haiku, el más económico),
//    3. devuelve la respuesta + acciones para la canasta.
//
//  Sin ANTHROPIC_API_KEY en server/.env usa el asistente de práctica (sin IA).
// =====================================================================

import { Router } from "express";
import crypto from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { Product, Category, AssistantUsage } from "../models.js";
import { limit, dateInUruguay } from "../http.js";
import { loadSettings } from "../routes/settings.js";
import { buildCatalog, systemPrompt } from "./prompt.js";
import { TOOLS, runTool } from "./tools.js";
import { practiceAssistant } from "./practice.js";

export const router = Router();

const MODEL = "claude-haiku-5-5";

// Límites para que nadie dispare el gasto (se pueden ajustar)
const LIMITS = {
  messagesPerPersonPerDay: 60,
  messagesPerDayTotal: 2000,
  historyLength: 16,   // mensajes de la charla que se le mandan a la IA
  messageLength: 500,  // caracteres por mensaje
  toolRounds: 4,       // vueltas máximas de "agregar / mostrar" por respuesta
};

const SORRY = "Uy, se me trabó algo 😅 Probá de nuevo en un ratito.";

let client = null;
const anthropic = () => (client ??= new Anthropic()); // lee ANTHROPIC_API_KEY del .env

/** Suma 1 al contador del día y devuelve cuántos mensajes van */
async function countUsage(clave) {
  const row = await AssistantUsage.findOneAndUpdate(
    { dia: dateInUruguay(), clave },
    { $inc: { mensajes: 1 } },
    { upsert: true, new: true },
  );
  return row.mensajes;
}

const hash = (text) => crypto.createHash("sha256").update(text).digest("hex").slice(0, 24);

/** Limpia la charla que manda el navegador: solo texto, alternando, empezando por la persona */
function cleanHistory(raw) {
  if (!Array.isArray(raw)) return [];
  const result = [];
  for (const m of raw.slice(-LIMITS.historyLength)) {
    if (!m || !["user", "assistant"].includes(m.role) || typeof m.content !== "string") continue;
    const content = m.content.trim().slice(0, LIMITS.messageLength);
    if (!content) continue;
    const last = result[result.length - 1];
    if (last?.role === m.role) last.content += "\n" + content;
    else result.push({ role: m.role, content });
  }
  while (result.length && result[0].role !== "user") result.shift();
  return result;
}

/** Charla con Claude: deja que use las herramientas hasta que conteste */
async function askClaude({ system, history, catalog, cart }) {
  const messages = history.map((m) => ({ role: m.role, content: m.content }));
  const actions = [];
  const texts = [];

  for (let round = 0; round <= LIMITS.toolRounds; round++) {
    const answer = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: "low" }, // charla corta: poco "pensar", más rápido y barato
      system,
      tools: TOOLS,
      messages,
    });

    if (answer.stop_reason === "refusal") break; // no quiso responder: queda el texto de respaldo
    for (const block of answer.content) {
      if (block.type === "text" && block.text.trim()) texts.push(block.text.trim());
    }
    if (answer.stop_reason !== "tool_use") break;

    // La IA pidió usar herramientas: las ejecutamos y le contamos el resultado (todo en un solo mensaje)
    messages.push({ role: "assistant", content: answer.content });
    const results = answer.content
      .filter((block) => block.type === "tool_use")
      .map((block) => ({ type: "tool_result", tool_use_id: block.id, content: runTool(block.name, block.input, catalog, cart, actions) }));
    messages.push({ role: "user", content: results });
  }

  return { reply: texts.join("\n\n") || (actions.length ? "¡Listo!" : SORRY), actions };
}

router.post("/asistente", limit(40, 5), async (req, res) => {
  const history = cleanHistory(req.body.messages);
  if (!history.length || history[history.length - 1].role !== "user") {
    return res.json({ reply: "¿Qué andás necesitando?", actions: [] });
  }

  const [productDocs, categoryDocs, settings] = await Promise.all([
    Product.find({ activo: true }).sort({ categoria: 1, orden: 1, nombre: 1 }),
    Category.find(),
    loadSettings(),
  ]);
  const products = productDocs.map((p) => p.toJSON());
  const categories = categoryDocs.map((c) => c.toJSON());

  if (settings.asistente?.activo === false) {
    return res.json({ reply: "El chat está apagado por ahora. Podés armar el pedido desde las góndolas.", actions: [] });
  }

  // Sin clave de IA: asistente de práctica con reglas simples
  if (!process.env.ANTHROPIC_API_KEY) {
    const cartLines = Array.isArray(req.body.cart) ? req.body.cart : [];
    return res.json(practiceAssistant({ messages: history, cart: cartLines, products, settings }));
  }

  // Límites de uso por persona (IP anonimizada) y por día
  const [personCount, totalCount] = await Promise.all([countUsage("ip:" + hash(req.ip || "anon")), countUsage("total")]);
  if (personCount > LIMITS.messagesPerPersonPerDay || totalCount > LIMITS.messagesPerDayTotal) {
    return res.json({ reply: "Por hoy ya charlamos un montón 😅 Armá el pedido desde las góndolas o escribinos por WhatsApp.", actions: [] });
  }

  const catalog = buildCatalog(products, settings);

  // La canasta actual que manda la página (se valida contra el catálogo)
  const cart = new Map();
  for (const line of Array.isArray(req.body.cart) ? req.body.cart : []) {
    if (catalog.some((c) => c.id === line?.id)) cart.set(line.id, Math.min(50, Math.max(1, Number(line.cantidad) || 1)));
  }
  const cartLine = cart.size
    ? [...cart].map(([id, q]) => `${q}× ${catalog.find((c) => c.id === id).nombre}`).join(", ")
    : "vacía";

  const { personality, storeInfo, rightNow } = systemPrompt(settings, catalog, products, categories);
  const system = [
    { type: "text", text: personality },
    { type: "text", text: storeInfo, cache_control: { type: "ephemeral" } }, // se reutiliza entre mensajes: más barato
    { type: "text", text: `${rightNow}\nCANASTA ACTUAL: ${cartLine}` },
  ];

  try {
    res.json(await askClaude({ system, history, catalog, cart }));
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return res.json({ reply: "Estoy con mucha gente a la vez 😅 Probá en un minuto.", actions: [] });
    }
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("Asistente: la ANTHROPIC_API_KEY no es válida");
    } else if (error instanceof Anthropic.APIError) {
      console.error(`Asistente: error ${error.status} de la IA:`, error.message);
    } else {
      console.error("Asistente:", error);
    }
    res.json({ reply: SORRY, actions: [] });
  }
});
