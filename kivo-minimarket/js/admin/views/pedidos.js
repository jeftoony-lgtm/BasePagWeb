// =====================================================================
//  KIVO PANEL · Pedidos
//  Llegan en vivo (con sonido). Cada pedido avanza con un botón:
//  Nuevo → Preparando → Listo → Entregado (o Cancelado).
// =====================================================================

import { $, $$, escapeHTML, money, timeAgo, formatDate, dayKey, prettyPhone, toast, showError, confirmDialog, beep } from "../ui.js";
import { state, ORDER_STATES } from "../state.js";
import { renderNav } from "../nav.js";
import { data } from "../../data/index.js";

const FILTERS = {
  activos:    { label: "Para hacer",  states: ["nuevo", "preparando", "listo"] },
  nuevo:      { label: "Nuevos",      states: ["nuevo"] },
  preparando: { label: "Preparando",  states: ["preparando"] },
  listo:      { label: "Listos",      states: ["listo"] },
  entregado:  { label: "Entregados",  states: ["entregado"] },
  cancelado:  { label: "Cancelados",  states: ["cancelado"] },
  todos:      { label: "Todos",       states: Object.keys(ORDER_STATES) },
};

// Qué botón principal tiene cada estado
const NEXT_STEP = {
  nuevo:      { to: "preparando", label: "Empezar a preparar" },
  preparando: { to: "listo",      label: "Marcar como listo" },
  listo:      { to: "entregado",  label: "Entregado ✓" },
};

let filter = "activos";

export function renderPedidos() {
  $("#view").innerHTML = `
    <div class="view-head">
      <div><h2>Pedidos</h2><p>Llegan solos, con sonido. Tocá el botón para avanzar cada pedido.</p></div>
    </div>
    <div class="chips" id="orderFilters"></div>
    <div class="orders" id="orderList"></div>`;
  drawOrders();
}

function orderCard(o) {
  const items = (o.items || []).map((i) => `
    <li><span><b>${escapeHTML(i.cantidad)}×</b> ${escapeHTML(i.nombre)}</span>
        <span>${i.precio == null ? "a confirmar" : money(i.precio * i.cantidad)}</span></li>`).join("");

  const day = o.dia ? (dayKey(new Date()) === o.dia ? "Hoy" : formatDate(o.dia + "T12:00:00", { weekday: "short", day: "numeric" })) : "";
  const next = NEXT_STEP[o.estado];
  const isOpen = ["nuevo", "preparando", "listo"].includes(o.estado);
  const whatsapp = o.telefono ? `https://wa.me/598${String(o.telefono).replace(/^0/, "")}` : null;

  return `
    <article class="order ${o.estado}">
      <div class="order-head">
        <div><b>#${o.id} · ${escapeHTML(o.nombre)}</b><small>${timeAgo(o.created_at)}</small></div>
        <span class="badge b-${o.estado}">${ORDER_STATES[o.estado]}</span>
      </div>
      <div class="meta">
        <span>${o.modo === "envio" ? "🛵 Envío" : "🏪 Retira"}</span>
        ${o.hora ? `<span>🕒 ${escapeHTML(day)} ${escapeHTML(o.hora)}</span>` : ""}
        ${o.telefono ? `<span>📞 ${escapeHTML(prettyPhone(o.telefono))}</span>` : ""}
      </div>
      ${o.modo === "envio" && o.direccion ? `<div class="small"><b>Dirección:</b> ${escapeHTML(o.direccion)}</div>` : ""}
      <ul>${items}</ul>
      ${o.nota ? `<div class="note">📝 ${escapeHTML(o.nota)}</div>` : ""}
      <div class="tot"><span>Total</span><b>${money(o.total)}</b></div>
      <div class="acts">
        ${next ? `<button class="btn btn-green" data-state="${next.to}" data-id="${o.id}">${next.label}</button>` : ""}
        ${isOpen ? `<button class="btn btn-red btn-sm" data-state="cancelado" data-id="${o.id}">Cancelar</button>` : `<button class="btn btn-ghost btn-sm" data-state="nuevo" data-id="${o.id}">↩ Reabrir</button>`}
        ${whatsapp ? `<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="${whatsapp}">WhatsApp</a>` : ""}
      </div>
    </article>`;
}

function drawOrders() {
  if (!$("#orderList")) return;

  $("#orderFilters").innerHTML = Object.entries(FILTERS).map(([key, f]) => {
    const count = state.orders.filter((o) => f.states.includes(o.estado)).length;
    return `<button class="chip ${filter === key ? "on" : ""}" data-filter="${key}">${f.label} <span class="n">${count}</span></button>`;
  }).join("");
  $$("#orderFilters .chip").forEach((chip) => chip.addEventListener("click", () => { filter = chip.dataset.filter; drawOrders(); }));

  const list = state.orders.filter((o) => FILTERS[filter].states.includes(o.estado));
  if (!list.length) {
    $("#orderList").innerHTML = `<div class="empty" style="grid-column:1/-1"><div>${filter === "activos" ? "😌" : "🗂️"}</div>
      ${filter === "activos" ? "No hay pedidos pendientes. Cuando llegue uno, suena." : "No hay pedidos acá."}</div>`;
    return;
  }

  $("#orderList").innerHTML = list.map(orderCard).join("");
  $$("#orderList [data-state]").forEach((button) => button.addEventListener("click", () => changeState(button)));
}

async function changeState(button) {
  const id = Number(button.dataset.id);
  const newState = button.dataset.state;
  if (newState === "cancelado") {
    const ok = await confirmDialog("¿Cancelar este pedido?", "Va a quedar en Cancelados. Lo podés reabrir después.", "Sí, cancelar");
    if (!ok) return;
  }

  button.disabled = true;
  try {
    await data.setOrderState(id, newState);
    state.orders.find((o) => o.id === id).estado = newState;
    renderNav();
    drawOrders();
    toast(`Pedido #${id}: ${ORDER_STATES[newState]}`);
  } catch (error) {
    button.disabled = false;
    showError(error);
  }
}

/** Llamado cuando entra o cambia un pedido (en vivo) */
export function onOrderEvent(type, order) {
  if (!order) return;
  const index = state.orders.findIndex((o) => o.id === order.id);
  if (index >= 0) state.orders[index] = order;
  else state.orders.unshift(order);

  if (type === "INSERT") {
    beep();
    toast(`🛒 Nuevo pedido de ${order.nombre} · ${money(order.total)}`);
    navigator.vibrate?.([120, 60, 120]);
  }
  renderNav();
  if (state.view === "pedidos") drawOrders();
}

/** Refresca los "hace X min" cada minuto */
export const refreshOrders = drawOrders;
