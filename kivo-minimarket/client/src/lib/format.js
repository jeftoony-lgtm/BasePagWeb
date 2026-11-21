// =====================================================================
//  INMOBILIARIA · Funciones chicas que usan la página y el panel
// =====================================================================

/** Saca tildes y mayúsculas para comparar textos: "Olimar Chico" → "olimar chico" */
export const normalize = (text) => String(text).toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

/* ---------- Propiedades ---------- */
export const OPERACIONES = { venta: "En venta", alquiler: "En alquiler" };
export const ESTADOS = { disponible: "Disponible", reservada: "Reservada", vendida: "Vendida", alquilada: "Alquilada" };

/** Estados posibles según la operación: una casa en venta se vende, una en alquiler se alquila */
export const estadosDe = (operacion) => ["disponible", "reservada", operacion === "alquiler" ? "alquilada" : "vendida"];

/** Al cambiar de venta a alquiler (o al revés), "vendida" pasa a "alquilada" y viceversa */
export const ajustarEstado = (operacion, estado) =>
  (estado === "vendida" || estado === "alquilada" ? (operacion === "alquiler" ? "alquilada" : "vendida") : estado);

/** ¿Ya se vendió o alquiló? */
export const cerrada = (p) => p.estado === "vendida" || p.estado === "alquilada";

export const TIPOS = { casa: "Casa", apartamento: "Apartamento", local: "Local comercial", terreno: "Terreno", oficina: "Oficina", otro: "Otro" };

/** Precio de una propiedad: "USD 80.000", "$ 14.000 por mes" o "Consultar" */
export function price(p) {
  if (p.precio === null || p.precio === undefined || p.precio === "") return "Consultar";
  const amount = Number(p.precio).toLocaleString("es-UY");
  return `${p.moneda === "UYU" ? "$" : "USD"} ${amount}${p.precio_extra ? ` ${p.precio_extra}` : ""}`;
}

/** El cartel diagonal de la foto: "¡Vendida!", "¡Alquilada!", "Reservada" o nada */
export function ribbon(p) {
  if (p.estado === "vendida") return "¡Vendida!";
  if (p.estado === "alquilada") return "¡Alquilada!";
  if (p.estado === "reservada") return "Reservada";
  return "";
}

/** Link de WhatsApp con un mensaje ya escrito */
export const whatsappLink = (number, text) =>
  `https://wa.me/${String(number || "").replace(/\D/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

/** "59899787834" → "+598 99 787 834" */
export function prettyWhatsapp(number) {
  const digits = String(number || "").replace(/\D/g, "");
  const m = digits.match(/^598(\d{2})(\d{3})(\d{3})$/);
  return m ? `+598 ${m[1]} ${m[2]} ${m[3]}` : digits;
}

/* ---------- Fechas (siempre en hora de Uruguay) ---------- */
const TIME_ZONE = "America/Montevideo";

export const formatDate = (iso, options) =>
  new Intl.DateTimeFormat("es-UY", { timeZone: TIME_ZONE, ...options }).format(new Date(iso));

/** "recién", "hace 5 min", "hace 2 h" o la fecha */
export function timeAgo(iso) {
  const minutes = Math.round((Date.now() - new Date(iso)) / 60000);
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return formatDate(iso, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
