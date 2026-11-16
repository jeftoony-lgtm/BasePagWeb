// =====================================================================
//  KIVO PANEL · Herramientas de interfaz que usan todas las secciones
// =====================================================================

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/** Evita que un texto escrito por alguien se interprete como HTML */
export const escapeHTML = (text) =>
  String(text ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const money = (n) => "$" + Number(n || 0).toLocaleString("es-UY");

/* ---------- Fechas (siempre en hora de Uruguay) ---------- */
const TIME_ZONE = "America/Montevideo";

export const formatDate = (iso, options) =>
  new Intl.DateTimeFormat("es-UY", { timeZone: TIME_ZONE, ...options }).format(new Date(iso));

/** "2026-11-13" del día de esa fecha en Uruguay */
export const dayKey = (iso) => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date(iso));

/** "recién", "hace 5 min", "hace 2 h" o la fecha */
export function timeAgo(iso) {
  const minutes = Math.round((Date.now() - new Date(iso)) / 60000);
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return formatDate(iso, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** "099123456" → "099 123 456" */
export const prettyPhone = (phone) => (phone ? String(phone).replace(/^(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3") : "");

/* ---------- Avisos ---------- */
let toastTimer;
export function toast(message, isError = false) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.toggle("error", isError);
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

export function showError(error) {
  console.error(error);
  toast(error.message || "Algo salió mal", true);
}

/* ---------- Interruptor (switch) ---------- */
export const switchHTML = (label, inputAttributes = "") =>
  `<label class="switch"><input type="checkbox" ${inputAttributes}><span class="track"></span>${label}</label>`;

/* ---------- Ventana emergente ---------- */
export function openModal(html) {
  $("#sheet").innerHTML = html;
  $("#modal").classList.add("open");
  $$("[data-close]", $("#sheet")).forEach((b) => b.addEventListener("click", closeModal));
}

export function closeModal() {
  $("#modal").classList.remove("open");
}

export const isModalOpen = () => $("#modal").classList.contains("open");

/** Pregunta "¿Seguro?" y devuelve true o false */
export function confirmDialog(title, text, confirmLabel) {
  return new Promise((resolve) => {
    openModal(`
      <div class="sheet-head"><h3>${escapeHTML(title)}</h3></div>
      <p class="muted">${escapeHTML(text)}</p>
      <div class="row" style="justify-content:flex-end;margin-top:18px">
        <button class="btn btn-ghost" id="confirmNo">Volver</button>
        <button class="btn" id="confirmYes" style="background:var(--red);color:#fff">${escapeHTML(confirmLabel)}</button>
      </div>`);
    $("#confirmNo").onclick = () => { closeModal(); resolve(false); };
    $("#confirmYes").onclick = () => { closeModal(); resolve(true); };
  });
}

/* ---------- Sonido de "pedido nuevo" (tres notitas) ---------- */
export function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 1175, 1568].forEach((frequency, i) => {
      const start = ctx.currentTime + i * 0.18;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
      oscillator.start(start);
      oscillator.stop(start + 0.18);
    });
  } catch { /* algunos navegadores no dejan sonar sin tocar la pantalla antes */ }
}
