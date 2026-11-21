// =====================================================================
//  INMOBILIARIA · Hacer dueño a una cuenta (y, si hace falta, ponerle contraseña)
//  Para cuando el dueño se olvidó la contraseña o hay que pasarle la inmobiliaria a otro.
//
//    npm run hacer-dueno -w server -- mail@dueno.com
//    npm run hacer-dueno -w server -- mail@dueno.com contraseñaNueva
// =====================================================================

import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "../src/db.js";
import { User } from "../src/models.js";

const [email, password] = process.argv.slice(2);
if (!email) {
  console.log("Uso: npm run hacer-dueno -w server -- mail@dueno.com [contraseñaNueva]");
  process.exit(1);
}
if (password && password.length < 6) {
  console.log("La contraseña tiene que tener al menos 6 caracteres.");
  process.exit(1);
}

await connectDB();
const user = await User.findOne({ email: email.trim().toLowerCase() });
if (!user) {
  console.log(`No hay ninguna cuenta con ${email}. Primero creala en el panel.`);
} else {
  user.rol = "dueno";
  user.activo = true;
  if (password) user.password_hash = await bcrypt.hash(password, 10);
  await user.save();
  console.log(`✓ ${user.nombre} (${user.email}) ahora es dueño${password ? " y tiene contraseña nueva" : ""}.`);
}
await mongoose.disconnect();
