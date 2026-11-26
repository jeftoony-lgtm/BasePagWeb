// =====================================================================
//  LUZ SERENA · Datos iniciales
//  Ajustes por defecto y las primeras publicaciones del blog.
//  Si un ajuste no está guardado en la base, se usa el de acá.
// =====================================================================

export const DEFAULT_SETTINGS = {
  // Plazas del residencial: la página muestra "Plazas disponibles" o "lista de espera"
  plazas: { total: 20, ocupadas: 16 },
  // WhatsApp con 598 y sin el 0 (091 411 961 → 59891411961)
  whatsapp: "59891411961",
  telefono: "098 794 970",
  // Agenda de la semana. 0 = domingo, 1 = lunes... Cada actividad: { hora, titulo, detalle }
  agenda: {
    1: [{ hora: "10:00", titulo: "Fisioterapia", detalle: "Movilidad y equilibrio" }, { hora: "15:30", titulo: "Taller de estimulación cognitiva", detalle: "Memoria y atención" }, { hora: "17:00", titulo: "Merienda compartida", detalle: "" }],
    2: [{ hora: "10:30", titulo: "Caminata en el jardín", detalle: "" }, { hora: "15:30", titulo: "Taller de manualidades", detalle: "" }],
    3: [{ hora: "10:00", titulo: "Control médico semanal", detalle: "Policlínica interna" }, { hora: "16:00", titulo: "Tarde de bingo", detalle: "Con premios" }],
    4: [{ hora: "10:00", titulo: "Fisioterapia", detalle: "" }, { hora: "16:00", titulo: "Taller de baile", detalle: "Música de siempre" }],
    5: [{ hora: "10:30", titulo: "Estimulación corporal", detalle: "" }, { hora: "15:00", titulo: "Pedicuría y manicuría", detalle: "" }],
    6: [{ hora: "11:00", titulo: "Mañana al sol en el jardín", detalle: "" }, { hora: "16:00", titulo: "Visitas de las familias", detalle: "" }],
    0: [{ hora: "11:00", titulo: "Misa (una vez al mes)", detalle: "" }, { hora: "16:00", titulo: "Visitas de las familias", detalle: "Mate y torta" }],
  },
};

/** Primeras publicaciones (textos de ejemplo, a revisar con el residencial). dias = hace cuántos días */
export const SAMPLE_POSTS = [
  { dias: 2, titulo: "Moverse es vivir: fisioterapia en el jardín", categoria: "Salud", foto_url: "/img/fotos/bandas.jpg",
    texto: "Esta semana la clase de fisioterapia fue al aire libre. Con bandas elásticas trabajamos brazos, hombros y espalda, cada uno a su ritmo.\n\nMoverse todos los días ayuda a mantener la autonomía, mejora el equilibrio y, sobre todo, nos pone de buen humor. ¡Gracias a todos por las ganas!" },
  { dias: 5, titulo: "Tarde de bingo en el living", categoria: "Recreación", foto_url: "/img/fotos/bingo.jpg",
    texto: "Bolillero, cartones y muchas risas. El bingo es uno de los momentos favoritos de la semana: ejercita la memoria y la atención, y se comparte en grupo.\n\nHubo premios para los ganadores y merienda para todos." },
  { dias: 9, titulo: "Taller de estimulación cognitiva", categoria: "Talleres", foto_url: "/img/fotos/dibujo.jpg",
    texto: "En el taller de esta semana trabajamos con figuras: copiar formas, reconocerlas y dibujarlas. Son ejercicios simples que estimulan la atención, la memoria y la coordinación de las manos.\n\nCada residente avanza a su propio ritmo, acompañado por nuestro equipo." },
  { dias: 15, titulo: "Mabel y Luis, nuestros primeros residentes", categoria: "Celebraciones", foto_url: "/img/fotos/mabel.jpg",
    texto: "Queremos compartir este recuerdo con Mabel y Luis, quienes fueron los primeros en elegirnos como su hogar.\n\nGracias por la confianza y por llenar la casa de alegría desde el primer día." },
  { dias: 21, titulo: "Misa en el residencial", categoria: "Comunidad", foto_url: "/img/fotos/misa.jpg",
    texto: "Recibimos la visita del sacerdote, que celebró misa en el living para quienes quisieron participar. Fue un momento de encuentro y tranquilidad que compartimos en familia." },
];
