// =====================================================================
//  INMOBILIARIA · Cargar los datos iniciales
//
//    npm run seed        → ajustes y publicaciones de ejemplo (solo si no hay publicaciones)
//    npm run seed:demo   → BORRA TODO y carga lo mismo más dos cuentas
//                          (dueno@demo.uy y agente@demo.uy, contraseña "demo123").
//                          Solo para probar en tu compu, nunca en el sitio real.
// =====================================================================

import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "../src/db.js";
import { User, Property, Setting } from "../src/models.js";
import { DEFAULT_SETTINGS, EXAMPLE_PROPERTIES } from "../src/seed-data.js";

const demo = process.argv.includes("--demo");

async function loadExamples() {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await Setting.findByIdAndUpdate(key, { $setOnInsert: { value } }, { upsert: true });
  }
  await Property.insertMany(EXAMPLE_PROPERTIES);
}

await connectDB();

if (demo) {
  console.log("⚠ Modo demo: se borra toda la base y se cargan datos de prueba.");
  await mongoose.connection.dropDatabase();
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).syncIndexes()));
  await loadExamples();
  const password_hash = await bcrypt.hash("demo123", 10);
  await User.insertMany([
    { email: "dueno@demo.uy", nombre: "Dueño (demo)", rol: "dueno", activo: true, password_hash },
    { email: "agente@demo.uy", nombre: "Agente", rol: "empleado", activo: true, password_hash },
  ]);
  console.log("✓ Listo. Entrá al panel con dueno@demo.uy o agente@demo.uy (contraseña: demo123).");
} else if (await Property.estimatedDocumentCount()) {
  console.log("La base ya tiene publicaciones: no se cargó nada (para no pisar lo que hay).");
} else {
  await loadExamples();
  console.log("✓ Ajustes y publicaciones de ejemplo cargados. Ahora creá la cuenta del dueño en /admin.html");
}

await mongoose.disconnect();
