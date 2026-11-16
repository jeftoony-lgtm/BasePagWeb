// =====================================================================
//  KIVO · Asistente de compras (chat)
//
//  La persona escribe como le sale ("necesito algo para una picada de 6")
//  y el asistente le arma la canasta. Al final la manda a la canasta para
//  enviar el pedido por WhatsApp.
//
//  La IA corre en el servidor (supabase/functions/asistente). Acá solo se
//  dibuja el chat y se aplican las "acciones" que devuelve:
//    { type: "add", id, cantidad }   → suma a la canasta
//    { type: "remove", id, cantidad }→ saca de la canasta
//    { type: "show", ids: [...] }    → muestra tarjetas de productos
//    { type: "checkout" }            → botón para ir a enviar el pedido
// =====================================================================

import { $, money, escapeHTML, session } from "./utils.js";
import { store, findItem } from "./store.js";
import { addToCart, removeFromCart, cartSummary, openCart } from "./cart.js";
import { productThumb } from "./catalog.js";
import { storeStatus } from "./schedule.js";
import { data } from "../data/index.js";

const MAX_HISTORY = 16;      // cuántos mensajes se le mandan a la IA (para que sea rápido y barato)
const SUGGESTIONS = [
  "Armame una picada para 4 🧀",
  "¿Hasta qué hora abren?",
  "Quiero 2 cocas y unas papas",
  "¿Hacen envíos?",
];

// messages: lo que se le manda a la IA · log: lo que se ve en pantalla
const state = {
  messages: session.get("kivo-chat-messages", []),
  log: session.get("kivo-chat-log", []),
  waiting: false,
};

const save = () => {
  session.set("kivo-chat-messages", state.messages.slice(-MAX_HISTORY));
  session.set("kivo-chat-log", state.log.slice(-60));
};

/* =================== Dibujo del chat =================== */

function productCard(p) {
  return `
    <div class="chat-card">
      <div class="thumb" style="background:${escapeHTML(p.color || "#f4f4f4")}">${productThumb(p)}</div>
      <b>${escapeHTML(p.nombre)}</b>
      <div class="row">
        <span class="price">${p.precio == null ? "—" : money(p.precio)}</span>
        <button class="add" data-add="${p.id}" aria-label="Agregar ${escapeHTML(p.nombre)}" ${p.en_stock === false ? "disabled" : ""}>+</button>
      </div>
    </div>`;
}

function entryHTML(entry) {
  switch (entry.kind) {
    case "me":
      return `<div class="msg me">${escapeHTML(entry.text)}</div>`;
    case "bot":
      return `<div class="msg bot">${escapeHTML(entry.text)}</div>`;
    case "note":
      return `<div class="msg note ${entry.remove ? "remove" : ""}">${escapeHTML(entry.text)}</div>`;
    case "cards": {
      const products = entry.ids.map(findItem).filter(Boolean);
      return products.length ? `<div class="chat-cards">${products.map(productCard).join("")}</div>` : "";
    }
    case "checkout":
      return `<button class="btn btn-wa chat-cta" data-chat-checkout>🛒 Ver canasta y enviar por WhatsApp</button>`;
    default:
      return "";
  }
}

function renderLog() {
  const log = $("#chatLog");
  log.innerHTML = state.log.map(entryHTML).join("") + (state.waiting ? '<div class="typing"><i></i><i></i><i></i></div>' : "");
  log.scrollTop = log.scrollHeight;
  $("#chatSend").disabled = state.waiting;
  $("#chatChips").hidden = state.messages.length > 0;
}

function push(entry) {
  state.log.push(entry);
  save();
  renderLog();
}

/* =================== Saludo =================== */

function greeting() {
  const hour = new Date().getHours();
  const hello = hour < 12 ? "¡Buen día!" : hour < 20 ? "¡Buenas tardes!" : "¡Buenas noches!";
  const name = store.settings.asistente?.nombre || "Kivi";
  const closedNote = storeStatus().open ? "" : " Ahora estamos cerrados, pero te dejo el pedido armado para cuando abramos.";
  return `${hello} Soy ${name}, de Kivo 👋 Contame qué necesitás y te voy armando la canasta.${closedNote}`;
}

/* =================== Acciones que manda la IA =================== */

function applyActions(actions = []) {
  const added = [], removed = [];

  for (const action of actions) {
    if (action.type === "add" && addToCart(action.id, Math.max(1, Number(action.cantidad) || 1))) {
      added.push(`${action.cantidad || 1}× ${findItem(action.id).nombre}`);
    }
    if (action.type === "remove") {
      const item = findItem(action.id);
      if (item && removeFromCart(action.id, action.cantidad || null)) removed.push(item.nombre);
    }
  }

  if (added.length) {
    push({ kind: "note", text: `✓ Sumé ${added.join(", ")}` });
    const fab = $("#cartFab");
    fab.classList.remove("bump");
    void fab.offsetWidth;
    fab.classList.add("bump");
  }
  if (removed.length) push({ kind: "note", remove: true, text: `Saqué ${removed.join(", ")}` });

  const show = actions.find((a) => a.type === "show");
  if (show?.ids?.length) push({ kind: "cards", ids: show.ids.slice(0, 8) });

  if (actions.some((a) => a.type === "checkout")) push({ kind: "checkout" });
}

/* =================== Mandar un mensaje =================== */

async function send(text) {
  text = text.trim().slice(0, 500);
  if (!text || state.waiting) return;

  push({ kind: "me", text });
  state.messages.push({ role: "user", content: text });
  state.waiting = true;
  renderLog();

  try {
    const answer = await data.chat(state.messages.slice(-MAX_HISTORY), cartSummary());
    state.waiting = false;
    const reply = (answer.reply || "").trim() || "¡Listo!";
    state.messages.push({ role: "assistant", content: reply });
    push({ kind: "bot", text: reply });
    applyActions(answer.actions);
  } catch (error) {
    console.warn("Asistente:", error);
    state.waiting = false;
    push({ kind: "bot", text: "Uy, se me trabó la conexión 😅 Probá de nuevo en un ratito, o armá el pedido desde las góndolas." });
  }
  save();
  renderLog();
}

/* =================== Abrir, cerrar y el globito de "¿Te ayudo?" =================== */

function openChat() {
  $("#chat").classList.add("open");
  $("#chatBubble").classList.remove("show");
  session.set("kivo-chat-seen", true);
  if (!state.log.length) push({ kind: "bot", text: greeting() });
  renderLog();
  if (matchMedia("(min-width: 561px)").matches) $("#chatInput").focus();
}

function closeChat() {
  $("#chat").classList.remove("open");
}

function showHelloBubble() {
  if (session.get("kivo-chat-seen")) return;
  const bubble = $("#chatBubble");
  bubble.textContent = "¿Te ayudo a armar el pedido? 🛒";
  setTimeout(() => bubble.classList.add("show"), 7000);
  setTimeout(() => bubble.classList.remove("show"), 17000);
}

export function initAssistant() {
  const settings = store.settings.asistente;
  if (settings && settings.activo === false) return; // el dueño lo apagó desde el panel

  $("#chatLauncher").hidden = false;
  $("#chatName").textContent = settings?.nombre || "Kivi";

  $("#chatChips").innerHTML = SUGGESTIONS.map((s) => `<button type="button">${escapeHTML(s)}</button>`).join("");
  $("#chatChips").addEventListener("click", (e) => {
    const chip = e.target.closest("button");
    if (chip) send(chip.textContent);
  });

  $("#chatForm").addEventListener("submit", (e) => {
    e.preventDefault();
    send($("#chatInput").value);
    $("#chatInput").value = "";
  });

  $("#chatLog").addEventListener("click", (e) => {
    if (e.target.closest("[data-chat-checkout]")) { closeChat(); openCart(); }
  });

  $("#chatLauncher").addEventListener("click", openChat);
  $("#chatBubble").addEventListener("click", openChat);
  $("#chatBubble").addEventListener("keydown", (e) => e.key === "Enter" && openChat());
  $("#closeChat").addEventListener("click", closeChat);
  addEventListener("keydown", (e) => e.key === "Escape" && closeChat());

  showHelloBubble();
}
