// =====================================================================
//  LUZ SERENA · Funciones chicas que usan la página y el panel
// =====================================================================

/** Precio en pesos uruguayos: 1650 → "$1.650" */
export const money = (n) => "$" + Number(n || 0).toLocaleString("es-UY");

/** Saca tildes y mayúsculas para comparar textos: "Almacén" → "almacen" */
export const normalize = (text) => String(text).toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

/** Limita un número entre un mínimo y un máximo */
export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

/** Curva de animación suave (empieza rápido y frena) */
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/** Primer emoji de un texto: "🥔 Lay's Clásicas" → "🥔" */
export const firstEmoji = (text) => (String(text).match(/\p{Extended_Pictographic}/u) || [""])[0];

/** ¿La persona pidió menos animaciones en su sistema? */
export const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Lee y guarda en sessionStorage sin romper si el navegador no lo permite */
export const tabStorage = {
  get(key, fallback = null) {
    try { return JSON.parse(sessionStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* nada */ }
  },
};

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
