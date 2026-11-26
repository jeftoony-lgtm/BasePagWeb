// =====================================================================
//  LUZ SERENA · Textos fijos de la página
//  Servicios, preguntas frecuentes, fotos del hogar y datos de contacto.
//  Para cambiar un texto de la página, casi siempre es acá.
// =====================================================================

export const CONTACT = {
  direccion: "Luis Alberto de Herrera 489",
  ciudad: "Ciudad de Melo, Cerro Largo",
  instagram: "luzserenaresidencial",
  mapa: "Luis Alberto de Herrera 489, Melo, Cerro Largo, Uruguay",
};

// Si el servidor no responde, la página se arma igual con estos valores
export const FALLBACK_SETTINGS = {
  plazas: { total: 20, ocupadas: 16 },
  whatsapp: "59891411961",
  telefono: "098 794 970",
  agenda: {},
};

/** Link de WhatsApp con el mensaje ya escrito */
export const waLink = (numero, mensaje) => `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;

/** "59891411961" → "091 411 961" */
export const prettyWa = (numero) => String(numero).replace(/^598(\d{2})(\d{3})(\d{3})$/, "0$1 $2 $3");

export const TRUST = [
  { icon: "siren", text: <>Emergencia móvil <b>24/7</b></> },
  { icon: "steth", text: "Control médico semanal en policlínica interna" },
  { icon: "nurse", text: "Enfermería y asistente social" },
  { icon: "apple", text: "Menú planificado por Licenciado en Nutrición" },
];

export const SERVICES = [
  { icon: "steth", wide: true, titulo: "Seguimiento médico semanal", texto: "Controles en nuestra policlínica interna de medicina y Emergencia Móvil 24/7 para cualquier imprevisto, de día o de noche." },
  { icon: "nurse", titulo: "Enfermería", texto: "Atención diaria, control de medicación y acompañamiento cercano." },
  { icon: "apple", titulo: "Nutrición", texto: "Comidas caseras planificadas por un Licenciado en Nutrición." },
  { icon: "move", titulo: "Fisioterapia semanal", texto: "Ejercicios para ganar autonomía, equilibrio y confianza." },
  { icon: "brain", titulo: "Talleres lúdicos", texto: "Estimulación cognitiva y corporal, y talleres de baile con un profesional." },
  { icon: "heart", titulo: "Asistente social", texto: "Acompaña a cada familia en el ingreso y en los trámites." },
  { icon: "spark", titulo: "Pedicuría y manicuría", texto: "Porque sentirse bien también es verse bien." },
];

export const HOME_PHOTOS = [
  { src: "/img/fotos/comedor.jpg", alt: "Comedor del residencial", caption: "Comedor" },
  { src: "/img/fotos/jardin.jpg", alt: "Patio con césped", caption: "Patio y jardín" },
  { src: "/img/fotos/dormitorio.jpg", alt: "Dormitorio", caption: "Dormitorios" },
  { src: "/img/fotos/living.jpg", alt: "Living", caption: "Living" },
  { src: "/img/fotos/merienda.jpg", alt: "Residente en su merienda", caption: "La merienda" },
  { src: "/img/fotos/bingo.jpg", alt: "Tarde de bingo", caption: "Tarde de bingo" },
];

export const HOME_POINTS = [
  "Instalaciones cómodas, seguras y luminosas.",
  "Espacios amplios y cálidos para sentirse como en casa.",
  "Un residencial pensado para el bienestar de cada residente.",
];

/** Preguntas frecuentes. La de plazas se completa sola según lo que cargue el dueño */
export const FAQ = [
  { q: "¿Puedo conocer el residencial antes de decidir?", a: "Sí, y te lo recomendamos. Agendá una visita, recorré las instalaciones y conocé al equipo con tranquilidad, sin compromiso." },
  { q: "¿Qué atención de salud reciben los residentes?", a: "Hay enfermería, seguimiento médico semanal en nuestra policlínica interna y cobertura de Emergencia Móvil 24/7. Además, fisioterapia todas las semanas." },
  { q: "¿Cómo es la alimentación?", a: "Las comidas las planifica un Licenciado en Nutrición. Contanos las indicaciones de su médico y lo tenemos en cuenta." },
  { q: "¿Qué hacen durante el día?", a: "Talleres de estimulación cognitiva y corporal, baile, fisioterapia, juegos como el bingo, celebraciones y momentos al aire libre en el jardín. Podés ver la agenda de la semana más arriba." },
  { q: "¿Cómo me entero de cómo está mi familiar?", a: "Estamos a un mensaje de distancia por WhatsApp, y en esta página y en Instagram compartimos lo que hacemos día a día." },
  { q: "¿Tienen plazas disponibles? ¿Cuánto cuesta?", plazas: true },
];

export const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
