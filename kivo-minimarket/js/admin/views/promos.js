// =====================================================================
//  KIVO PANEL · Promos y local (solo dueño)
//  Ruleta, combo del día, asistente, cerrado hoy, horarios, avisos y WhatsApp.
//  Cada tarjeta guarda por separado con su propio botón.
// =====================================================================

import { $, $$, escapeHTML, dayKey, toast, showError, switchHTML } from "../ui.js";
import { state } from "../state.js";
import { data } from "../../data/index.js";

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const WHEEL_COLORS = ["#5a9f43", "#e8952f", "#2f6b2a", "#c9761a"];

/** Guarda un ajuste y muestra "Guardado ✓" al lado del botón */
async function saveSetting(button, key, value) {
  button.disabled = true;
  try {
    await data.saveSetting(key, value);
    state.settings[key] = value;
    const saved = button.parentElement.querySelector(".saved");
    saved.classList.add("show");
    setTimeout(() => saved.classList.remove("show"), 2200);
    return true;
  } catch (error) {
    showError(error);
    return false;
  } finally {
    button.disabled = false;
  }
}

const saveBar = (id, label) => `<div class="savebar"><span class="saved">Guardado ✓</span><button class="btn btn-green" id="${id}">${label}</button></div>`;

/* =================== Tarjetas =================== */

function ruletaCard(r) {
  const today = dayKey(new Date());
  const isOn = r.activa && (!r.hasta || today <= r.hasta);
  const statusText = isOn ? "La ruleta se ve en la página ahora"
    : r.activa && r.hasta && today > r.hasta ? "Apagada: ya pasó la fecha de fin"
    : "Apagada: la gente no la ve";

  return `
    <section class="card">
      <h3>🎡 Ruleta de promos</h3>
      <div class="state-line"><span class="d" style="background:${isOn ? "var(--green)" : "var(--red)"}"></span>${statusText}</div>
      <div class="stack">
        ${switchHTML("Ruleta prendida", `id="ruletaOn" ${r.activa ? "checked" : ""}`)}
        <div class="field"><label for="ruletaUntil">Se apaga sola después del día (opcional)</label><input type="date" id="ruletaUntil" value="${escapeHTML(r.hasta || "")}"></div>
        <div>
          <span class="label">Premios <span class="muted" style="font-weight:500">· dejá el premio vacío para “no ganó”</span></span>
          <div class="stack" id="prizeRows" style="gap:8px;margin-top:8px"></div>
          <button type="button" class="btn btn-ghost btn-sm" id="addPrize" style="margin-top:8px">＋ Agregar premio</button>
        </div>
        <div class="small muted" style="background:var(--cream);padding:10px 12px;border-radius:12px">
          Cada celular puede girar <b>una vez por promo</b>. Si empezás una promo nueva, todos pueden volver a girar.<br>
          <div style="margin-top:8px">${switchHTML("Empezar promo nueva al guardar", 'id="ruletaNew"')}</div>
        </div>
      </div>
      ${saveBar("saveRuleta", "Guardar ruleta")}
    </section>`;
}

function comboCard(c) {
  return `
    <section class="card">
      <h3>🧀 Combo del día</h3>
      <div class="stack" style="margin-top:10px">
        ${switchHTML("Mostrar el combo en la página", `id="comboOn" ${c.activo !== false ? "checked" : ""}`)}
        <div class="field"><label for="comboTitle">Título</label><input id="comboTitle" value="${escapeHTML(c.titulo || "")}"></div>
        <div class="grid2">
          <div class="field"><label for="comboTag">Etiqueta</label><input id="comboTag" value="${escapeHTML(c.etiqueta || "")}"></div>
          <div class="field"><label for="comboPrice">Precio ($)</label><input id="comboPrice" type="number" inputmode="numeric" value="${escapeHTML(c.precio || "")}"></div>
        </div>
        <div class="field"><label for="comboText">Frase</label><input id="comboText" value="${escapeHTML(c.subtitulo || "")}"></div>
        <div class="field"><label for="comboItems">Qué incluye (uno por renglón, con emoji adelante)</label><textarea id="comboItems" rows="4">${escapeHTML((c.items || []).join("\n"))}</textarea></div>
      </div>
      ${saveBar("saveCombo", "Guardar combo")}
    </section>`;
}

function assistantCard(a) {
  return `
    <section class="card">
      <h3>💬 Asistente del chat</h3>
      <p class="small muted">Ayuda a la gente a armar el pedido. Conoce los productos, precios y horarios. Lo que escribas en “Lo que tiene que saber” lo usa para responder.</p>
      <div class="stack" style="margin-top:10px">
        ${switchHTML("Asistente prendido", `id="assistantOn" ${a.activo !== false ? "checked" : ""}`)}
        <div class="field"><label for="assistantName">Nombre</label><input id="assistantName" value="${escapeHTML(a.nombre || "Kivi")}" maxlength="20"></div>
        <div class="field"><label for="assistantNotes">Lo que tiene que saber (envíos, pagos, novedades…)</label>
          <textarea id="assistantNotes" rows="4" maxlength="1500" placeholder="Ej: Hacemos envíos en Solymar por $50. Aceptamos efectivo y transferencia. Los sábados hay asado.">${escapeHTML(a.notas || "")}</textarea></div>
      </div>
      ${saveBar("saveAssistant", "Guardar asistente")}
    </section>`;
}

function closedCard(c) {
  return `
    <section class="card">
      <h3>🔴 Cerrado hoy</h3>
      <p class="small muted">Para feriados o imprevistos. La página muestra “Cerrado” aunque sea horario de abrir.</p>
      <div class="stack" style="margin-top:10px">
        ${switchHTML("Marcar el local como cerrado", `id="closedOn" ${c.activo ? "checked" : ""}`)}
        <div class="field"><label for="closedReason">Motivo (se muestra en la página)</label><input id="closedReason" value="${escapeHTML(c.motivo || "")}" placeholder="Ej: Cerrado por feriado, volvemos mañana"></div>
      </div>
      ${saveBar("saveClosed", "Guardar")}
    </section>`;
}

function hoursCard(h) {
  const value = (day, i) => (h[day]?.[i] ? h[day][i].join("-") : "");
  const rows = [1, 2, 3, 4, 5, 6, 0].map((d) => `
    <div class="hour-row"><span>${DAY_NAMES[d]}</span>
      <input class="input" data-day="${d}" value="${value(d, 0)}" placeholder="10:00-14:30" aria-label="${DAY_NAMES[d]} turno 1">
      <input class="input" data-day="${d}" value="${value(d, 1)}" placeholder="—" aria-label="${DAY_NAMES[d]} turno 2">
    </div>`).join("");

  return `
    <section class="card">
      <h3>🕒 Horarios</h3>
      <p class="small muted">Formato 10:00-14:30. El segundo turno es opcional. Medianoche = 24:00. Vacío = cerrado ese día.</p>
      <div class="stack" style="gap:8px;margin-top:10px">${rows}</div>
      <div class="error-text small" id="hoursError" style="margin-top:8px"></div>
      ${saveBar("saveHours", "Guardar horarios")}
    </section>`;
}

function noticesCard(avisos) {
  return `
    <section class="card">
      <h3>📣 Cinta de avisos</h3>
      <p class="small muted">Los mensajes que pasan en la franja verde. Uno por renglón.</p>
      <div class="field" style="margin-top:10px"><textarea id="notices" rows="5" aria-label="Avisos">${escapeHTML(avisos.join("\n"))}</textarea></div>
      ${saveBar("saveNotices", "Guardar avisos")}
    </section>`;
}

function whatsappCard(number) {
  return `
    <section class="card">
      <h3>📱 WhatsApp de pedidos</h3>
      <div class="field" style="margin-top:10px"><label for="whatsapp">Celular (como lo marcás en Uruguay)</label>
        <input id="whatsapp" inputmode="tel" value="${escapeHTML(String(number || "").replace(/^598/, "0"))}" placeholder="099 123 456"></div>
      <div class="error-text small" id="whatsappError" style="margin-top:8px"></div>
      ${saveBar("saveWhatsapp", "Guardar")}
    </section>`;
}

/* =================== Pantalla =================== */

export function renderPromos() {
  const s = state.settings;
  $("#view").innerHTML = `
    <div class="view-head"><div><h2>Promos y local</h2><p>Todo lo que cambies acá se ve en la página apenas tocás Guardar.</p></div></div>
    <div class="promos">
      <div class="stack">
        ${ruletaCard(s.ruleta || { premios: [] })}
        ${comboCard(s.combo || {})}
      </div>
      <div class="stack">
        ${assistantCard(s.asistente || {})}
        ${closedCard(s.cerrado || {})}
        ${hoursCard(s.horarios || {})}
        ${noticesCard(s.avisos || [])}
        ${whatsappCard(s.whatsapp)}
      </div>
    </div>`;

  setupRuleta(s.ruleta || { premios: [] });
  setupOthers();
}

/* =================== Ruleta: editor de premios =================== */

function setupRuleta(ruleta) {
  const prizes = structuredClone(ruleta.premios || []);

  const drawPrizes = () => {
    $("#prizeRows").innerHTML = prizes.map((p, i) => `
      <div class="prize-row">
        <input class="input" data-key="t" data-i="${i}" value="${escapeHTML(p.t)}" maxlength="14" placeholder="En la ruleta" aria-label="Texto en la ruleta ${i + 1}">
        <input class="input" data-key="d" data-i="${i}" value="${escapeHTML(p.d || "")}" placeholder="Premio (vacío = no ganó)" aria-label="Premio ${i + 1}">
        <input type="color" class="colorpick" data-key="c" data-i="${i}" value="${escapeHTML(p.c || "#5a9f43")}" aria-label="Color ${i + 1}">
        <button type="button" class="ico" data-remove="${i}" aria-label="Quitar premio ${i + 1}" ${prizes.length <= 4 ? "disabled style='opacity:.35'" : ""}>✕</button>
      </div>`).join("");
    $$("#prizeRows [data-key]").forEach((input) => input.addEventListener("input", () => { prizes[input.dataset.i][input.dataset.key] = input.value; }));
    $$("#prizeRows [data-remove]").forEach((b) => b.addEventListener("click", () => { prizes.splice(Number(b.dataset.remove), 1); drawPrizes(); }));
    $("#addPrize").disabled = prizes.length >= 10;
  };
  drawPrizes();

  $("#addPrize").addEventListener("click", () => {
    prizes.push({ t: "", d: "", c: WHEEL_COLORS[prizes.length % WHEEL_COLORS.length] });
    drawPrizes();
  });

  $("#saveRuleta").addEventListener("click", async (e) => {
    const clean = prizes.map((p) => ({ t: (p.t || "").trim(), d: (p.d || "").trim(), c: p.c || "#5a9f43" }));
    if (clean.some((p) => !p.t)) return toast("Cada premio necesita un texto para la ruleta.", true);
    if (clean.length < 4) return toast("La ruleta necesita al menos 4 casilleros.", true);

    const value = {
      activa: $("#ruletaOn").checked,
      hasta: $("#ruletaUntil").value,
      promo_id: $("#ruletaNew").checked ? "promo-" + Date.now() : ruleta.promo_id || "promo-1",
      premios: clean,
    };
    if (await saveSetting(e.currentTarget, "ruleta", value)) {
      toast(value.activa ? "🎡 Ruleta prendida" : "Ruleta apagada");
      renderPromos();
    }
  });
}

/* =================== El resto de las tarjetas =================== */

function parseHours() {
  const isTime = (t) => /^([01]\d|2[0-4]):[0-5]\d$/.test(t);
  const pad = (t) => (t && t.length === 4 ? "0" + t : t); // "9:00" → "09:00"
  const result = {}, wrong = new Set();

  for (let day = 0; day < 7; day++) {
    result[day] = [];
    $$(`[data-day="${day}"]`).forEach((input) => {
      const text = input.value.replace(/\s/g, "").replace(/–/g, "-");
      if (!text) return;
      const [open, close] = text.split("-").map(pad);
      if (isTime(open) && isTime(close) && open < close) result[day].push([open, close]);
      else wrong.add(DAY_NAMES[day]);
    });
  }
  return { result, wrong: [...wrong] };
}

function setupOthers() {
  $("#saveCombo").addEventListener("click", (e) => saveSetting(e.currentTarget, "combo", {
    activo: $("#comboOn").checked,
    titulo: $("#comboTitle").value.trim(),
    etiqueta: $("#comboTag").value.trim(),
    precio: Number($("#comboPrice").value) || 0,
    subtitulo: $("#comboText").value.trim(),
    items: $("#comboItems").value.split("\n").map((x) => x.trim()).filter(Boolean),
  }));

  $("#saveAssistant").addEventListener("click", (e) => saveSetting(e.currentTarget, "asistente", {
    activo: $("#assistantOn").checked,
    nombre: $("#assistantName").value.trim() || "Kivi",
    notas: $("#assistantNotes").value.trim(),
  }));

  $("#saveClosed").addEventListener("click", (e) => saveSetting(e.currentTarget, "cerrado", {
    activo: $("#closedOn").checked,
    motivo: $("#closedReason").value.trim(),
  }));

  $("#saveNotices").addEventListener("click", (e) => saveSetting(e.currentTarget, "avisos",
    $("#notices").value.split("\n").map((x) => x.trim()).filter(Boolean)));

  $("#saveHours").addEventListener("click", (e) => {
    const { result, wrong } = parseHours();
    if (wrong.length) return ($("#hoursError").textContent = `Revisá el formato en: ${wrong.join(", ")} (ej: 10:00-14:30).`);
    $("#hoursError").textContent = "";
    saveSetting(e.currentTarget, "horarios", result);
  });

  $("#saveWhatsapp").addEventListener("click", (e) => {
    const number = $("#whatsapp").value.replace(/\D/g, "");
    if (!/^09\d{7}$/.test(number)) return ($("#whatsappError").textContent = "Tiene que ser un celular uruguayo, tipo 099 123 456.");
    $("#whatsappError").textContent = "";
    saveSetting(e.currentTarget, "whatsapp", "598" + number.slice(1));
  });
}
