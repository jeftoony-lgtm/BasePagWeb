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
import { DEFAULT_SETTINGS, SAMPLE_POSTS, DEMO_PASSWORD, demoRecords } from "../src/seed-data.js";

const demo = process.argv.includes("--demo");
const day = (offset = 0) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo" }).format(new Date(Date.now() + offset * 864e5));
const daysAgo = (n) => new Date(Date.now() - n * 864e5);

async function loadBase() {
  await Setting.insertMany(Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({ _id: key, value })));
  await Post.insertMany(SAMPLE_POSTS.map(({ dias, ...p }) => ({ ...p, fecha: day(-dias), publicado: true })));
}

async function loadDemo() {
  const { users, leads, residents, stats } = demoRecords({ day, daysAgo });
  const password_hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await User.insertMany(users.map((u) => ({ ...u, password_hash })));
  // timestamps: false → respeta las fechas "de hace unos días" de los ejemplos
  await Lead.insertMany(leads, { timestamps: false });
  await Resident.insertMany(residents);
  await DailyStat.insertMany(stats.map(({ dia, ...s }) => ({ _id: dia, ...s })));
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
