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

/* ---------- Datos de prueba ----------
   Los usa "npm run seed:demo" (en tu compu) y la demostración del panel en
   GitHub Pages (client/src/preview.js). Nunca se cargan en el sitio real.
   day(n) = fecha "AAAA-MM-DD" de hoy + n días · daysAgo(n) = Date de hace n días */
export const DEMO_PASSWORD = "demo123";

export function demoRecords({ day, daysAgo }) {
  const users = [
    { email: "dueno@luzserena.uy", nombre: "Dueño (demo)", rol: "dueno", activo: true },
    { email: "equipo@luzserena.uy", nombre: "Enfermería", rol: "empleado", activo: true },
  ];

  const leads = [
    { nombre: "Laura Pereira", telefono: "099 123 456", para: "Mamá", dia: "Lunes a viernes, de tarde", mensaje: "Mi madre tiene 84 años, usa andador. Quisiera conocer las habitaciones.", estado: "nueva", created_at: daysAgo(0.1) },
    { nombre: "Martín Silveira", telefono: "098 555 210", para: "Papá", dia: "Fin de semana", mensaje: "Vivo en Montevideo, puedo ir un sábado.", estado: "nueva", created_at: daysAgo(1) },
    { nombre: "Graciela Núñez", telefono: "091 300 744", para: "Abuela/o", dia: "Cualquier día", estado: "contactada", nota: "Llamar el jueves", created_at: daysAgo(3) },
    { nombre: "Carlos Méndez", telefono: "092 908 117", para: "Mamá", dia: "Lunes a viernes, de mañana", mensaje: "Necesita dieta para diabéticos.", estado: "visita", nota: "Visita viernes 10 h", created_at: daysAgo(6) },
    { nombre: "Sofía Rocha", telefono: "094 221 908", para: "Papá", dia: "Cualquier día", estado: "ingreso", created_at: daysAgo(12) },
    { nombre: "Andrés Olivera", telefono: "097 650 332", para: "Otro familiar", dia: "Fin de semana", mensaje: "Consulta por precios.", estado: "descartada", created_at: daysAgo(18) },
  ].map((l) => ({ ...l, updated_at: l.created_at }));

  const cumple = (year, inDays) => `${year}-${day(inDays).slice(5)}`;
  const residents = [
    { nombre: "Residente de ejemplo 1", habitacion: "1", nacimiento: cumple(1941, 4), ingreso: "2025-03-10", familiar: "Hija · Ana", telefono_familiar: "099 000 001", observaciones: "Le gusta el jardín por la mañana." },
    { nombre: "Residente de ejemplo 2", habitacion: "2", nacimiento: cumple(1938, 12), ingreso: "2025-05-02", familiar: "Hijo · Pablo", telefono_familiar: "099 000 002", observaciones: "Participa en el taller de baile." },
    { nombre: "Residente de ejemplo 3", habitacion: "3", nacimiento: cumple(1945, 27), ingreso: "2025-08-21", familiar: "Sobrina · Lucía", telefono_familiar: "099 000 003" },
    { nombre: "Residente de ejemplo 4", habitacion: "4", nacimiento: "1936-02-14", ingreso: "2026-01-15", familiar: "Hija · Carmen", telefono_familiar: "099 000 004", observaciones: "Dieta sin sal." },
  ];

  // 60 días de visitas a la página (más los fines de semana, cuando las familias buscan)
  const stats = [];
  for (let i = 59; i >= 0; i--) {
    const weekend = [0, 6].includes(daysAgo(i).getDay());
    const visitas = Math.round(30 + (59 - i) * 0.45 + (weekend ? 12 : 0) + 8 * Math.sin(i * 1.7) + (i % 5) * 2);
    stats.push({ dia: day(-i), visitas: i === 0 ? Math.round(visitas * 0.6) : visitas, whatsapp: Math.max(0, Math.round(visitas / 9 + Math.sin(i) * 2)) });
  }

  return { users, leads, residents, stats };
}
