// =====================================================================
//  INMOBILIARIA · Conexión con MongoDB (la dirección está en server/.env)
// =====================================================================

import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Falta MONGODB_URI en server/.env (mirá server/.env.example)");
  await mongoose.connect(uri);
  console.log("✓ Conectado a MongoDB");
}
