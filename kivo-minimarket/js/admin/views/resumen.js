// =====================================================================
//  KIVO PANEL · Resumen (solo dueño)
//  Números del día y de la semana, lo más pedido y lo que buscan y no hay.
//  Los pedidos cancelados no cuentan.
// =====================================================================

import { $, escapeHTML, money, formatDate, dayKey, showError } from "../ui.js";
import { state } from "../state.js";
import { data } from "../../data/index.js";

const WEEK_MS = 7 * 864e5;

/** Lista de barras horizontales: [["Coca-Cola", 5], ...] */
function barList(entries, variant = "") {
  const max = Math.max(1, ...entries.map(([, value]) => value));
  return entries.map(([label, value]) => `
    <div class="bar ${variant}" title="${escapeHTML(label)}: ${value}">
      <span>${escapeHTML(label)}</span>
      <span class="t"><i style="width:${(value / max) * 100}%"></i></span>
      <b>${value}</b>
    </div>`).join("");
}

function countBy(list, getKey, getAmount = () => 1) {
  const totals = {};
  list.forEach((x) => { const k = getKey(x); totals[k] = (totals[k] || 0) + getAmount(x); });
  return Object.entries(totals).sort((a, b) => b[1] - a[1]);
}

export async function renderResumen() {
  let searches = [], customers = [];
  try {
    [searches, customers] = await Promise.all([data.searches(30), data.customers()]);
  } catch (error) {
    showError(error);
  }

  const valid = state.orders.filter((o) => o.estado !== "cancelado");
  const today = dayKey(new Date());
  const todays = valid.filter((o) => dayKey(o.created_at) === today);
  const week = valid.filter((o) => Date.now() - new Date(o.created_at) < WEEK_MS);
  const newCustomers = customers.filter((c) => Date.now() - new Date(c.created_at) < WEEK_MS).length;
  const sum = (orders) => orders.reduce((total, o) => total + o.total, 0);

  const topProducts = countBy(valid.flatMap((o) => o.items || []), (i) => i.nombre, (i) => Number(i.cantidad) || 0).slice(0, 6);
  const missing = countBy(searches, (s) => s.termino.trim().toLowerCase()).slice(0, 6);

  const days = [...Array(7)].map((_, i) => {
    const date = new Date(Date.now() - (6 - i) * 864e5);
    const orders = valid.filter((o) => dayKey(o.created_at) === dayKey(date));
    return { label: formatDate(date, { weekday: "short" }).replace(".", ""), count: orders.length, total: sum(orders) };
  });
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  $("#view").innerHTML = `
    <div class="view-head"><div><h2>Resumen</h2><p>Cómo viene la página. Los pedidos cancelados no cuentan.</p></div></div>

    <div class="kpis">
      <div class="kpi"><small>Pedidos hoy</small><b>${todays.length}</b><span>${state.orders.filter((o) => o.estado === "nuevo").length} esperando</span></div>
      <div class="kpi"><small>Vendido hoy</small><b>${money(sum(todays))}</b><span>en pedidos online</span></div>
      <div class="kpi"><small>Últimos 7 días</small><b>${week.length}</b><span>${money(sum(week))} en total</span></div>
      <div class="kpi"><small>Clientes nuevos</small><b>${newCustomers}</b><span>en 7 días (ruleta)</span></div>
    </div>

    <div class="grid2" style="align-items:start">
      <section class="card">
        <h3>Pedidos por día</h3><p class="small muted">Últimos 7 días</p>
        <div class="week">${days.map((d) => `
          <div class="c" title="${d.label}: ${d.count} pedido${d.count === 1 ? "" : "s"} · ${money(d.total)}">
            <span class="v">${d.count || ""}</span>
            <div class="col" style="height:${(d.count / maxDay) * 100}%"></div>
            <small>${d.label}</small>
          </div>`).join("")}</div>
      </section>

      <section class="card">
        <h3>Lo más pedido</h3><p class="small muted">Unidades en pedidos online, últimos 30 días</p>
        <div class="bars">${topProducts.length ? barList(topProducts) : '<p class="muted small">Todavía no hay pedidos.</p>'}</div>
      </section>

      <section class="card" style="grid-column:1/-1">
        <h3>Lo que buscan y no encuentran</h3>
        <p class="small muted">Búsquedas en la página que no dieron resultado (30 días). Ideas para traer.</p>
        <div class="bars">${missing.length ? barList(missing, "o") : '<p class="muted small">Nadie buscó algo que no haya. 👌</p>'}</div>
      </section>
    </div>`;
}
