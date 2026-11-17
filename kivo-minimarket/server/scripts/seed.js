// =====================================================================
//  KIVO · Cargar los datos iniciales
//
//    npm run seed        → categorías, productos y ajustes (solo si la base está vacía)
//    npm run seed:demo   → BORRA TODO y carga datos de prueba: pedidos, clientes y
//                          dos cuentas (dueno@kivo.uy y tita@kivo.uy, contraseña "demo123").
//                          Solo para probar en tu compu, nunca en el sitio real.
// =====================================================================

import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "../src/db.js";
import {
  User, Category, Product, Setting, Order, Customer, Spin, Search, Activity, setOrderCounter,
} from "../src/models.js";
import { CATEGORIES, PRODUCTS, DEFAULT_SETTINGS } from "../src/seed-data.js";

const demo = process.argv.includes("--demo");
const minutesAgo = (min) => new Date(Date.now() - min * 60000);
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo" }).format(new Date());

async function loadCatalog() {
  await Category.insertMany(CATEGORIES);
  const products = await Product.insertMany(PRODUCTS);
  await Setting.insertMany(Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({ _id: key, value })));
  return products;
}

async function loadDemo(products) {
  const password_hash = await bcrypt.hash("demo123", 10);
  const [dueno, tita] = await User.insertMany([
    { email: "dueno@kivo.uy", nombre: "Dueño (demo)", rol: "dueno", activo: true, password_hash },
    { email: "tita@kivo.uy", nombre: "Tita", rol: "empleado", activo: true, password_hash },
    { email: "sobrino.kivo@gmail.com", nombre: "Sobrino", rol: "empleado", activo: false, password_hash },
  ]);

  const item = (nombre, cantidad) => {
    const p = products.find((x) => x.nombre === nombre);
    return { id: String(p._id), nombre: p.nombre, cantidad, precio: p.precio };
  };
  const order = (id, minAgo, nombre, modo, items, estado, extra = {}) => ({
    _id: id, nombre, modo, items, estado,
    created_at: minutesAgo(minAgo),
    telefono: extra.telefono || null,
    direccion: modo === "envio" ? "Av. Giannattasio km 23, casa 4" : null,
    dia: today(),
    hora: extra.hora || "20:30",
    nota: extra.nota || "",
    total: items.reduce((sum, i) => sum + i.precio * i.cantidad, 0),
  });

  // timestamps: false → respeta las fechas "de hace un rato" de los ejemplos
  await Order.insertMany([
    order(1007, 4, "Rodrigo", "retiro", [item("Coca-Cola 2,25 L", 2), item("Lay's Clásicas", 1), item("Salame", 1)], "nuevo", { hora: "21:30", nota: "La Coca bien fría 🙏", telefono: "099123456" }),
    order(1006, 18, "Lucía", "envio", [item("Grido Tentación Granizado", 1), item("Galletitas dulces", 2)], "preparando", { hora: "21:00" }),
    order(1005, 55, "Martín", "retiro", [item("Yerba Canarias", 1), item("Pan flauta", 3)], "listo"),
    order(1004, 160, "Sofía", "retiro", [item("Sobre de figuritas", 5), item("Álbum Mundial 2026", 1)], "entregado"),
    order(1003, 1500, "Agustina", "retiro", [item("Cerveza Pilsen 1 L", 4), item("Maní salado", 2)], "entregado"),
    order(1002, 2900, "Diego", "envio", [item("Papel higiénico", 1), item("Detergente", 1)], "cancelado"),
    order(1001, 4300, "Rodrigo", "retiro", [item("Coca-Cola 2,25 L", 1), item("Lay's Clásicas", 2)], "entregado"),
  ], { timestamps: false });
  await setOrderCounter(1007);

  const [rodrigo, agustina, martin] = await Customer.insertMany([
    { nombre: "Rodrigo", telefono: "099123456", acepta_promos: true, created_at: minutesAgo(200) },
    { nombre: "Agustina", telefono: "098765432", acepta_promos: true, created_at: minutesAgo(1500) },
    { nombre: "Martín", telefono: "091222333", acepta_promos: false, created_at: minutesAgo(3000) },
  ], { timestamps: false });
  await Spin.insertMany([
    { customer: rodrigo._id, promo_id: "promo-1", indice: 1, premio: "Una Coca-Cola 600 ml de regalo", code: "KIVO-7F3A2", vence: minutesAgo(-7 * 1440), created_at: minutesAgo(200) },
    { customer: agustina._id, promo_id: "promo-1", indice: 0, premio: "10% de descuento en tu próxima compra", code: "KIVO-91BC0", vence: minutesAgo(-5 * 1440), canjeado_at: minutesAgo(900), canjeado_por: tita._id, created_at: minutesAgo(1500) },
    { customer: martin._id, promo_id: "promo-1", indice: 5, premio: null, code: null, created_at: minutesAgo(3000) },
  ], { timestamps: false });

  await Search.insertMany(["fernet", "fernet", "hielo", "fernet", "carbón", "hielo", "pilas", "fernet", "carbón", "pañales"]
    .map((termino, i) => ({ termino, created_at: minutesAgo(i * 300) })), { timestamps: false });

  const lays = products.find((p) => p.nombre === "Lay's Clásicas");
  await Activity.insertMany([
    { user: tita._id, tabla: "orders", registro: "1005", accion: "update", detalle: { estado: ["preparando", "listo"] }, created_at: minutesAgo(40) },
    { user: dueno._id, tabla: "products", registro: String(lays._id), accion: "update", detalle: { precio: [180, 189], _nombre: "Lay's Clásicas" }, created_at: minutesAgo(1440) },
  ], { timestamps: false });
}

await connectDB();

if (demo) {
  console.log("⚠ Modo demo: se borra toda la base y se cargan datos de prueba.");
  await mongoose.connection.dropDatabase();
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).syncIndexes()));
  const products = await loadCatalog();
  await loadDemo(products);
  console.log("✓ Listo. Entrá al panel con dueno@kivo.uy o tita@kivo.uy (contraseña: demo123).");
} else if (await Product.estimatedDocumentCount()) {
  console.log("La base ya tiene productos: no se cargó nada (para no pisar lo que hay).");
} else {
  await loadCatalog();
  console.log("✓ Categorías, productos y ajustes cargados. Ahora creá la cuenta del dueño en /admin.html");
}

await mongoose.disconnect();
