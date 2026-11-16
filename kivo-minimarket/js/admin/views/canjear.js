// =====================================================================
//  KIVO PANEL · Canjear código de la ruleta
//  Cada código sirve una sola vez y vence a los 7 días.
// =====================================================================

import { $, escapeHTML, formatDate, showError, beep } from "../ui.js";
import { data } from "../../data/index.js";

const RESULTS = {
  ok:          (r) => ["r-ok",   "✅", "¡Código válido!", `Entregale a <b>${escapeHTML(r.nombre)}</b>:<br><b style="font-size:19px">${escapeHTML(r.premio)}</b>`],
  ya_canjeado: (r) => ["r-warn", "⚠️", "Ya fue usado", `Este código de ${escapeHTML(r.nombre)} se canjeó el ${formatDate(r.fecha, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}. No lo entregues de nuevo.`],
  vencido:     (r) => ["r-warn", "⌛", "Código vencido", `Era de ${escapeHTML(r.nombre)} y venció el ${formatDate(r.fecha, { day: "numeric", month: "short" })}.`],
  no_existe:   ()  => ["r-bad",  "❌", "Ese código no existe", "Revisá que esté bien escrito."],
};

export function renderCanjear() {
  $("#view").innerHTML = `
    <div class="view-head">
      <div><h2>Canjear código</h2><p>Cuando un cliente muestra su código de la ruleta, escribilo acá. Cada código sirve una sola vez.</p></div>
    </div>
    <form class="card redeem" id="redeemForm" novalidate>
      <input class="input" id="code" placeholder="KIVO-XXXXX" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Código">
      <button class="btn btn-orange" style="width:100%;margin-top:12px">Canjear</button>
      <div id="redeemResult"></div>
    </form>`;

  $("#code").focus();
  $("#redeemForm").addEventListener("submit", onSubmit);
}

async function onSubmit(event) {
  event.preventDefault();
  let code = $("#code").value.trim().toUpperCase().replace(/\s/g, "");
  if (!code) return;
  if (!code.startsWith("KIVO-")) code = "KIVO-" + code.replace(/^KIVO/, ""); // se puede escribir solo el final

  try {
    const result = await data.redeem(code);
    const [style, icon, title, text] = RESULTS[result.estado](result);
    $("#redeemResult").innerHTML = `<div class="result ${style}"><div class="big">${icon}</div><h3>${title}</h3><p>${text}</p></div>`;
    if (result.estado === "ok") {
      $("#code").value = "";
      beep();
    }
  } catch (error) {
    showError(error);
  }
}
