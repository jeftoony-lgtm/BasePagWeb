// =====================================================================
//  INMOBILIARIA · Funciones chicas que usan la página y el panel
// =====================================================================

/** Saca tildes y mayúsculas para comparar textos: "Olimar Chico" → "olimar chico" */
export const normalize = (text) => String(text).toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

/* ---------- Propiedades ---------- */
export const OPERACIONES = { venta: "En venta", alquiler: "En alquiler" };
export const ESTADOS = { disponible: "Disponible", proximamente: "Próximamente", reservada: "Reservada", vendida: "Vendida", alquilada: "Alquilada" };

/** Estados posibles según la operación: una casa en venta se vende, una en alquiler se alquila */
export const estadosDe = (operacion) => ["disponible", "proximamente", "reservada", operacion === "alquiler" ? "alquilada" : "vendida"];

/** Al cambiar de venta a alquiler (o al revés), "vendida" pasa a "alquilada" y viceversa */
export const ajustarEstado = (operacion, estado) =>
  (estado === "vendida" || estado === "alquilada" ? (operacion === "alquiler" ? "alquilada" : "vendida") : estado);

/** ¿Ya se vendió o alquiló? */
export const cerrada = (p) => p.estado === "vendida" || p.estado === "alquilada";

export const TIPOS = { casa: "Casa", apartamento: "Apartamento", local: "Local comercial", terreno: "Terreno", oficina: "Oficina", otro: "Otro" };

// Los 19 departamentos de Uruguay (los mismos que en server/src/models.js)
export const DEPARTAMENTOS = [
  "Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno", "Flores", "Florida", "Lavalleja",
  "Maldonado", "Montevideo", "Paysandú", "Río Negro", "Rivera", "Rocha", "Salto", "San José",
  "Soriano", "Tacuarembó", "Treinta y Tres",
];

// Ciudades y localidades principales de cada departamento (para elegir en el panel).
// Si falta alguna, en el panel está la opción "Otra…" para escribirla.
export const CIUDADES = {
  "Artigas": ["Artigas", "Bella Unión", "Tomás Gomensoro", "Baltasar Brum", "Sequeira"],
  "Canelones": ["Canelones", "Las Piedras", "Pando", "La Paz", "Progreso", "Ciudad de la Costa", "Atlántida", "Parque del Plata", "Salinas", "Santa Lucía", "Tala", "San Ramón", "Sauce", "Toledo", "Barros Blancos", "Joaquín Suárez", "San Jacinto", "Santa Rosa", "Los Cerrillos"],
  "Cerro Largo": ["Melo", "Río Branco", "Fraile Muerto", "Isidoro Noblía", "Aceguá", "Tupambaé", "Plácido Rosas", "Arbolito", "Ramón Trigo", "Lago Merín"],
  "Colonia": ["Colonia del Sacramento", "Carmelo", "Juan Lacaze", "Nueva Helvecia", "Rosario", "Nueva Palmira", "Tarariras", "Ombúes de Lavalle", "Florencio Sánchez", "Colonia Valdense"],
  "Durazno": ["Durazno", "Sarandí del Yí", "Villa del Carmen", "Carlos Reyles", "Blanquillo", "La Paloma"],
  "Flores": ["Trinidad", "Ismael Cortinas", "Andresito"],
  "Florida": ["Florida", "Sarandí Grande", "Casupá", "Fray Marcos", "25 de Mayo", "25 de Agosto", "Cardal"],
  "Lavalleja": ["Minas", "José Pedro Varela", "Solís de Mataojo", "José Batlle y Ordóñez", "Mariscala"],
  "Maldonado": ["Maldonado", "Punta del Este", "San Carlos", "Piriápolis", "Pan de Azúcar", "Aiguá", "La Barra", "José Ignacio", "Garzón"],
  "Montevideo": ["Montevideo"],
  "Paysandú": ["Paysandú", "Guichón", "Quebracho", "Porvenir", "Piedras Coloradas"],
  "Río Negro": ["Fray Bentos", "Young", "Nuevo Berlín", "San Javier"],
  "Rivera": ["Rivera", "Tranqueras", "Vichadero", "Minas de Corrales"],
  "Rocha": ["Rocha", "Chuy", "Castillos", "Lascano", "La Paloma", "Cebollatí", "La Pedrera", "Punta del Diablo", "Aguas Dulces"],
  "Salto": ["Salto", "Constitución", "Belén"],
  "San José": ["San José de Mayo", "Ciudad del Plata", "Libertad", "Rodríguez", "Ecilda Paullier"],
  "Soriano": ["Mercedes", "Dolores", "Cardona", "Palmitas", "José Enrique Rodó"],
  "Tacuarembó": ["Tacuarembó", "Paso de los Toros", "San Gregorio de Polanco", "Ansina"],
  "Treinta y Tres": ["Treinta y Tres", "Vergara", "Santa Clara de Olimar", "Cerro Chato", "José Pedro Varela", "General Enrique Martínez"],
};

// Cómo está la propiedad
export const CONSERVACION = { a_estrenar: "A estrenar", excelente: "Excelente", muy_bueno: "Muy bueno", bueno: "Bueno", a_reciclar: "A reciclar" };

// Servicios que se pueden marcar en cada propiedad (en el panel se tildan)
export const SERVICIOS_CASA = [
  "Agua corriente (OSE)", "Luz (UTE)", "Saneamiento", "Pozo negro", "Internet / fibra óptica", "Gas",
  "Calefón / agua caliente", "Calefacción", "Estufa a leña", "Aire acondicionado", "Parrillero", "Patio",
  "Jardín", "Piscina", "Alarma", "Rejas", "Portero eléctrico", "Ascensor", "Amueblada", "Acepta mascotas",
];

// Hacia dónde da el frente de la propiedad
export const ORIENTACIONES = {
  norte: "Norte", sur: "Sur", este: "Este", oeste: "Oeste",
  noreste: "Noreste", noroeste: "Noroeste", sureste: "Sureste", suroeste: "Suroeste",
};

/** Dónde queda: "Centro, Río Branco, Cerro Largo" (sin repetir si la ciudad se llama igual que el departamento) */
export function lugar(p) {
  const partes = [p.barrio, p.ciudad, p.departamento].map((x) => (x || "").trim()).filter(Boolean);
  return partes.filter((x, i) => partes.findIndex((y) => normalize(y) === normalize(x)) === i).join(", ");
}

/** Precio de una propiedad: "USD 80.000", "$ 14.000 por mes" o "Consultar" */
export function price(p) {
  if (p.precio === null || p.precio === undefined || p.precio === "") return "Consultar";
  const amount = Number(p.precio).toLocaleString("es-UY");
  return `${p.moneda === "UYU" ? "$" : "USD"} ${amount}${p.precio_extra ? ` ${p.precio_extra}` : ""}`;
}

/** Código de referencia: "JTC" + 12 → "JTC-012" (igual que server/src/share.js) */
export function refCode(p, nombre) {
  if (p.ref == null) return "";
  const letras = String(nombre || "").normalize("NFD").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 4) || "REF";
  return `${letras}-${String(p.ref).padStart(3, "0")}`;
}

/** Link corto para compartir una propiedad: https://.../propiedad/12 (con foto y precio en WhatsApp) */
export const shareLink = (p) => (p.ref != null ? `${location.origin}/propiedad/${p.ref}` : `${location.origin}/#propiedad/${p.id}`);

/** ¿Mostrar el cartel "Precio rebajado"? (el servidor guarda el precio de antes cuando baja; si ya se cerró, no) */
export const rebajado = (p) =>
  p.precio_anterior != null && p.precio != null && p.precio !== "" && Number(p.precio) < p.precio_anterior && !cerrada(p);

/** El precio de antes, para mostrarlo tachado: "USD 75.000" */
export const precioAnterior = (p) =>
  `${p.moneda === "UYU" ? "$" : "USD"} ${Number(p.precio_anterior).toLocaleString("es-UY")}`;

/** El cartel diagonal de la foto: "¡Vendida!", "¡Alquilada!", "Reservada" o nada */
export function ribbon(p) {
  if (p.estado === "vendida") return "¡Vendida!";
  if (p.estado === "alquilada") return "¡Alquilada!";
  if (p.estado === "reservada") return "Reservada";
  if (p.estado === "proximamente") return "Próximamente";
  return "";
}

/** Link para mandar un email con el asunto y el mensaje ya escritos */
export const mailLink = (email, subject, body) =>
  `mailto:${email}?subject=${encodeURIComponent(subject || "")}&body=${encodeURIComponent(body || "")}`;

/** Link para llamar por teléfono: "59899787834" → "tel:+59899787834" */
export const telLink = (number) => `tel:+${String(number || "").replace(/\D/g, "")}`;

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

/* ---------- Mapa (Google Maps, sin clave) ---------- */
// ubicacion = { lat, lng } o { texto: "Calle 3 y 14, Treinta y Tres" }
const mapQuery = (u) => (u?.lat != null ? `${u.lat},${u.lng}` : u?.texto || "");

/** Mapa para meter en la página (iframe) */
export const mapEmbed = (u, aproximada = false) =>
  `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery(u))}&z=${aproximada ? 15 : 16}&hl=es&output=embed`;

/** Link para abrir el lugar en Google Maps (en el celular abre la app) */
export const mapLink = (u) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery(u))}`;
