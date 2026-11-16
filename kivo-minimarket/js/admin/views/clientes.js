// =====================================================================
//  KIVO PANEL · Clientes (solo dueño)
//  Los que jugaron la ruleta. Se pueden copiar los celulares de los que
//  aceptaron promos o bajar la lista para Excel.
// =====================================================================

import { $, escapeHTML, formatDate, dayKey, timeAgo, prettyPhone, toast, showError, switchHTML } from "../ui.js";
import { data } from "../../data/index.js";

let customers = [];
let search = "";
let onlyPromos = false;

const lastSpin = (c) => (c.giros || []).slice(-1)[0] || {};

export async function renderClientes() {
  $("#view").innerHTML = '<div class="loading">Cargando clientes…</div>';
  try {
    customers = await data.customers();
  } catch (error) {
    return showError(error);
  }

  $("#view").innerHTML = `
    <div class="view-head">
      <div><h2>Clientes</h2><p>Los que jugaron la ruleta. Solo vos ves esta lista.</p></div>
      <div class="row">
        <button class="btn btn-ghost btn-sm" id="copyPhones">📋 Copiar celulares</button>
        <button class="btn btn-ghost btn-sm" id="downloadCsv">⬇ Descargar Excel (CSV)</button>
      </div>
    </div>
    <div class="row" style="margin-bottom:12px">
      <input class="input" id="customerSearch" placeholder="🔎 Buscar por nombre o celular" value="${escapeHTML(search)}" style="flex:1;min-width:200px">
      ${switchHTML("Solo los que aceptan promos", `id="onlyPromos" ${onlyPromos ? "checked" : ""}`)}
    </div>
    <div id="customerTable"></div>`;

  $("#customerSearch").addEventListener("input", (e) => { search = e.target.value; drawTable(); });
  $("#onlyPromos").addEventListener("change", (e) => { onlyPromos = e.target.checked; drawTable(); });
  $("#copyPhones").addEventListener("click", copyPhones);
  $("#downloadCsv").addEventListener("click", downloadCsv);
  drawTable();
}

function drawTable() {
  const query = search.trim().toLowerCase();
  const digits = query.replace(/\D/g, "");
  const list = customers.filter((c) =>
    (!onlyPromos || c.acepta_promos) &&
    (!query || c.nombre.toLowerCase().includes(query) || (digits && c.telefono.includes(digits))));

  if (!list.length) {
    $("#customerTable").innerHTML = `<div class="empty"><div>👥</div>${customers.length ? "Nadie coincide con la búsqueda." : "Todavía no hay clientes. Aparecen cuando alguien gira la ruleta."}</div>`;
    return;
  }

  const rows = list.map((c) => {
    const spin = lastSpin(c);
    const status = !spin.premio ? '<span class="tag t-no">No ganó</span>'
      : spin.canjeado_at ? '<span class="tag t-ok">Canjeado</span>'
      : '<span class="tag t-pend">Sin canjear</span>';
    return `
      <tr>
        <td><b>${escapeHTML(c.nombre)}</b><br><span class="small muted">${timeAgo(c.created_at)}${c.acepta_promos ? " · ✅ promos" : ""}</span></td>
        <td>${escapeHTML(prettyPhone(c.telefono))}</td>
        <td>${escapeHTML(spin.premio || "—")}${spin.code ? `<br><span class="small muted">${escapeHTML(spin.code)}</span>` : ""}</td>
        <td>${status}</td>
      </tr>`;
  }).join("");

  $("#customerTable").innerHTML = `
    <p class="small muted" style="margin-bottom:8px">${list.length} cliente${list.length === 1 ? "" : "s"}</p>
    <table class="table">
      <thead><tr><th>Nombre</th><th>Celular</th><th>Último premio</th><th>Estado</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

async function copyPhones() {
  const list = customers.filter((c) => c.acepta_promos);
  try {
    await navigator.clipboard.writeText(list.map((c) => `${c.nombre}\t${prettyPhone(c.telefono)}`).join("\n"));
    toast(`Copiados ${list.length} contactos que aceptan promos`);
  } catch {
    toast("No se pudo copiar", true);
  }
}

function downloadCsv() {
  const header = ["Nombre", "Celular", "Acepta promos", "Se registró", "Último premio", "Código", "Canjeado"];
  const rows = customers.map((c) => {
    const spin = lastSpin(c);
    return [c.nombre, prettyPhone(c.telefono), c.acepta_promos ? "Sí" : "No",
      formatDate(c.created_at, { day: "2-digit", month: "2-digit", year: "numeric" }),
      spin.premio || "—", spin.code || "", spin.canjeado_at ? "Sí" : "No"];
  });
  // ";" y el BOM (﻿) para que Excel en español lo abra bien con tildes
  const csv = "﻿" + [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = `clientes-kivo-${dayKey(new Date())}.csv`;
  link.click();
}
