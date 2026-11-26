// =====================================================================
//  LUZ SERENA · Cargar los datos iniciales
//
//    npm run seed        → ajustes y primeras publicaciones del blog (solo si la base está vacía)
//    npm run seed:demo   → BORRA TODO y carga datos de prueba: consultas, residentes,
//                          estadísticas y dos cuentas (dueno@luzserena.uy y equipo@luzserena.uy,
//                          contraseña "demo123"). Solo para probar en tu compu, nunca en el sitio real.
// =====================================================================

import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "../src/db.js";
import { User, Setting, Lead, Resident, Post, DailyStat, Activity, Photo } from "../src/models.js";
import { DEFAULT_SETTINGS, SAMPLE_POSTS } from "../src/seed-data.js";

const demo = process.argv.includes("--demo");
const day = (offset = 0) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo" }).format(new Date(Date.now() + offset * 864e5));
const daysAgo = (n) => new Date(Date.now() - n * 864e5);

async function loadBase() {
  await Setting.insertMany(Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({ _id: key, value })));
  await Post.insertMany(SAMPLE_POSTS.map(({ dias, ...p }) => ({ ...p, fecha: day(-dias), publicado: true })));
}

async function loadDemo() {
  const password_hash = await bcrypt.hash("demo123", 10);
  await User.insertMany([
    { email: "dueno@luzserena.uy", nombre: "Dueño (demo)", rol: "dueno", activo: true, password_hash },
    { email: "equipo@luzserena.uy", nombre: "Enfermería", rol: "empleado", activo: true, password_hash },
  ]);

  // timestamps: false → respeta las fechas "de hace unos días" de los ejemplos
  await Lead.insertMany([
    { nombre: "Laura Pereira", telefono: "099 123 456", para: "Mamá", dia: "Lunes a viernes, de tarde", mensaje: "Mi madre tiene 84 años, usa andador. Quisiera conocer las habitaciones.", estado: "nueva", created_at: daysAgo(0.1) },
    { nombre: "Martín Silveira", telefono: "098 555 210", para: "Papá", dia: "Fin de semana", mensaje: "Vivo en Montevideo, puedo ir un sábado.", estado: "nueva", created_at: daysAgo(1) },
    { nombre: "Graciela Núñez", telefono: "091 300 744", para: "Abuela/o", dia: "Cualquier día", estado: "contactada", nota: "Llamar el jueves", created_at: daysAgo(3) },
    { nombre: "Carlos Méndez", telefono: "092 908 117", para: "Mamá", dia: "Lunes a viernes, de mañana", mensaje: "Necesita dieta para diabéticos.", estado: "visita", nota: "Visita viernes 10 h", created_at: daysAgo(6) },
    { nombre: "Sofía Rocha", telefono: "094 221 908", para: "Papá", dia: "Cualquier día", estado: "ingreso", created_at: daysAgo(12) },
    { nombre: "Andrés Olivera", telefono: "097 650 332", para: "Otro familiar", dia: "Fin de semana", mensaje: "Consulta por precios.", estado: "descartada", created_at: daysAgo(18) },
  ].map((l) => ({ ...l, updated_at: l.created_at })), { timestamps: false });

  const cumple = (year, inDays) => `${year}-${day(inDays).slice(5)}`;
  await Resident.insertMany([
    { nombre: "Residente de ejemplo 1", habitacion: "1", nacimiento: cumple(1941, 4), ingreso: "2025-03-10", familiar: "Hija · Ana", telefono_familiar: "099 000 001", observaciones: "Le gusta el jardín por la mañana." },
    { nombre: "Residente de ejemplo 2", habitacion: "2", nacimiento: cumple(1938, 12), ingreso: "2025-05-02", familiar: "Hijo · Pablo", telefono_familiar: "099 000 002", observaciones: "Participa en el taller de baile." },
    { nombre: "Residente de ejemplo 3", habitacion: "3", nacimiento: cumple(1945, 27), ingreso: "2025-08-21", familiar: "Sobrina · Lucía", telefono_familiar: "099 000 003" },
    { nombre: "Residente de ejemplo 4", habitacion: "4", nacimiento: "1936-02-14", ingreso: "2026-01-15", familiar: "Hija · Carmen", telefono_familiar: "099 000 004", observaciones: "Dieta sin sal." },
  ]);

  // 60 días de visitas a la página (más los fines de semana, cuando las familias buscan)
  const stats = [];
  for (let i = 59; i >= 0; i--) {
    const weekend = [0, 6].includes(daysAgo(i).getDay());
    const visitas = Math.round(30 + (59 - i) * 0.45 + (weekend ? 12 : 0) + 8 * Math.sin(i * 1.7) + (i % 5) * 2);
    stats.push({ _id: day(-i), visitas: i === 0 ? Math.round(visitas * 0.6) : visitas, whatsapp: Math.max(0, Math.round(visitas / 9 + Math.sin(i) * 2)) });
  }
  await DailyStat.insertMany(stats);
  await Post.updateMany({}, [{ $set: { lecturas: { $floor: { $multiply: [{ $rand: {} }, 50] } } } }]);
}

await connectDB();
if (demo) {
  await Promise.all([User, Setting, Lead, Resident, Post, DailyStat, Activity, Photo].map((m) => m.deleteMany({})));
  await loadBase();
  await loadDemo();
  console.log("✓ Datos de prueba cargados. Entrá al panel con dueno@luzserena.uy / demo123");
} else if (await Setting.estimatedDocumentCount()) {
  console.log("La base ya tiene datos: no se cargó nada. (Para empezar de cero con datos de prueba: npm run seed:demo)");
} else {
  await loadBase();
  console.log("✓ Ajustes y primeras publicaciones cargados. Ahora creá tu cuenta en /admin.html (la primera queda como dueño).");
}
await mongoose.disconnect();
