// =====================================================================
//  KIVO · Utilidades chicas que usan varios archivos de la página
// =====================================================================

/** Busca un elemento (como document.querySelector, pero más corto) */
export const $ = (selector, root = document) => root.querySelector(selector);

/** Busca varios elementos y los devuelve como lista */
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/** Precio en pesos uruguayos: 1650 → "$1.650" */
export const money = (n) => "$" + Number(n || 0).toLocaleString("es-UY");

/** Evita que un texto escrito por alguien se interprete como HTML */
export const escapeHTML = (text) =>
  String(text ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** Saca tildes y mayúsculas para comparar textos: "Almacén" → "almacen" */
export const normalize = (text) => String(text).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Limita un número entre un mínimo y un máximo */
export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

/** Curva de animación suave (empieza rápido y frena) */
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/** Primer emoji de un texto: "🥔 Lay's Clásicas" → "🥔" */
export const firstEmoji = (text) => (String(text).match(/\p{Extended_Pictographic}/u) || [""])[0];

/** Mensajito que aparece abajo unos segundos */
let toastTimer;
export function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
}

/** Lee y guarda en sessionStorage sin romper si el navegador no lo permite */
export const session = {
  get(key, fallback = null) {
    try { return JSON.parse(sessionStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* nada */ }
  },
};

/** ¿La persona pidió menos animaciones en su sistema? */
export const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
