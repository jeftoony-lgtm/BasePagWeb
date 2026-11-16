// =====================================================================
//  KIVO PANEL · Equipo (solo dueño)
//  Quién entra al panel (activar, quitar acceso, cambiar rol)
//  y el registro de lo que se hizo.
// =====================================================================

import { $, $$, escapeHTML, money, timeAgo, toast, showError, switchHTML } from "../ui.js";
import { state, ORDER_STATES } from "../state.js";
import { data } from "../../data/index.js";

const SETTING_NAMES = {
  combo: "el combo del día", horarios: "los horarios", avisos: "la cinta de avisos",
  cerrado: "el cartel de cerrado", whatsapp: "el WhatsApp de pedidos", asistente: "el asistente del chat",
};

const initials = (name) =>
  (name || "?").replace(/[^\p{L}\s]/gu, "").trim().split(/\s+/).map((w) => w[0] || "").join("").slice(0, 2).toUpperCase() || "?";

function userRow(user) {
  const isMe = user.id === state.me.id;
  const controls = isMe
    ? '<span class="role">Dueño</span>'
    : `<select data-role="${user.id}" aria-label="Rol de ${escapeHTML(user.nombre)}">
         <option value="empleado" ${user.rol === "empleado" ? "selected" : ""}>Empleado</option>
         <option value="dueno" ${user.rol === "dueno" ? "selected" : ""}>Dueño</option>
       </select>
       ${switchHTML(user.activo ? "Con acceso" : "Sin acceso", `data-access="${user.id}" ${user.activo ? "checked" : ""}`)}`;

  return `
    <div class="user">
      <div class="av" style="background:${user.rol === "dueno" ? "var(--orange)" : "var(--green)"}">${escapeHTML(initials(user.nombre))}</div>
      <div><b>${escapeHTML(user.nombre)}</b>${isMe ? ' <span class="small muted">(vos)</span>' : ""}<br><span class="small muted">${escapeHTML(user.email || "")}</span></div>
      <div class="ctrl">${controls}</div>
    </div>`;
}

/** Convierte un registro de actividad en una frase: "Tita marcó Arroz sin stock" */
function describe(a) {
  const d = a.detalle || {};
  const who = `<b>${escapeHTML(a.profiles?.nombre || "Alguien")}</b>`;

  if (a.tabla === "orders" && d.estado) {
    return ["🧾", `${who} pasó el pedido #${escapeHTML(a.registro)} a <b>${ORDER_STATES[d.estado[1]] || escapeHTML(d.estado[1])}</b>`];
  }
  if (a.tabla === "giros") {
    return ["🎟️", `${who} canjeó ${escapeHTML(a.registro)} de ${escapeHTML(d.cliente)} (${escapeHTML(d.premio)})`];
  }
  if (a.tabla === "products") {
    const fromList = state.products.find((p) => p.id === a.registro)?.nombre;
    const name = escapeHTML(d._nombre || fromList || (Array.isArray(d.nombre) ? d.nombre[1] : d.nombre) || "un producto");
    if (a.accion === "insert") return ["➕", `${who} agregó <b>${name}</b>`];
    if (a.accion === "delete") return ["🗑️", `${who} eliminó <b>${name}</b>`];
    if (d.precio) return ["💲", `${who} cambió el precio de <b>${name}</b>: ${money(d.precio[0])} → <b>${money(d.precio[1])}</b>`];
    if (d.en_stock) return [d.en_stock[1] ? "✅" : "⛔", `${who} marcó <b>${name}</b> ${d.en_stock[1] ? "con stock" : "sin stock"}`];
    return ["✏️", `${who} editó <b>${name}</b>`];
  }
  if (a.tabla === "settings") {
    const newValue = d.value?.[1];
    if (a.registro === "ruleta" && newValue) return ["🎡", `${who} ${newValue.activa ? "prendió / actualizó" : "apagó"} la ruleta`];
    return ["⚙️", `${who} cambió ${SETTING_NAMES[a.registro] || escapeHTML(a.registro)}`];
  }
  return ["•", `${who} hizo un cambio`];
}

export async function renderEquipo() {
  $("#view").innerHTML = '<div class="loading">Cargando…</div>';
  let users = [], activity = [];
  try {
    [users, activity] = await Promise.all([data.profiles(), data.activity()]);
  } catch (error) {
    return showError(error);
  }

  const waiting = users.filter((u) => !u.activo);
  const active = users.filter((u) => u.activo);
  const panelLink = location.href.split("#")[0];

  $("#view").innerHTML = `
    <div class="view-head"><div><h2>Equipo</h2><p>Quién entra al panel y qué se hizo.</p></div></div>
    <div class="grid2" style="align-items:start">
      <div class="stack">
        ${waiting.length ? `<section class="card"><h3>⏳ Esperando que los actives</h3><div class="pending">${waiting.map(userRow).join("")}</div></section>` : ""}
        <section class="card"><h3>Con acceso</h3>${active.map(userRow).join("")}</section>
        <section class="card">
          <h3>➕ Sumar a alguien</h3>
          <ol class="small" style="padding-left:18px;display:grid;gap:6px;margin-top:8px">
            <li>Mandale el link del panel: <b>${escapeHTML(panelLink)}</b></li>
            <li>Que toque <b>“Crear cuenta”</b> y ponga su nombre, mail y contraseña.</li>
            <li>Le aparece acá arriba en “Esperando”. Prendé <b>“Con acceso”</b> y listo.</li>
          </ol>
          <p class="small muted" style="margin-top:10px"><b>Empleado:</b> pedidos, stock y canjear códigos. <b>Dueño:</b> todo.</p>
        </section>
      </div>

      <section class="card">
        <h3>Actividad</h3><p class="small muted">Últimos cambios hechos desde el panel</p>
        ${activity.length
          ? activity.map((a) => { const [icon, text] = describe(a); return `<div class="act"><div class="i">${icon}</div><div>${text}<br><small>${timeAgo(a.created_at)}</small></div></div>`; }).join("")
          : '<p class="muted small" style="margin-top:10px">Todavía no hay movimientos.</p>'}
      </section>
    </div>`;

  $$("[data-role]").forEach((select) => select.addEventListener("change", async () => {
    try {
      await data.updateProfile(select.dataset.role, { rol: select.value });
      toast("Rol actualizado");
      renderEquipo();
    } catch (error) { showError(error); }
  }));

  $$("[data-access]").forEach((input) => input.addEventListener("change", async () => {
    try {
      await data.updateProfile(input.dataset.access, { activo: input.checked });
      toast(input.checked ? "Acceso activado" : "Acceso quitado");
      renderEquipo();
    } catch (error) {
      input.checked = !input.checked;
      showError(error);
    }
  }));
}
