// =====================================================================
//  KIVO · Base de datos (MongoDB con Mongoose)
//  Cada "colección" de MongoDB es como una tabla. Acá se define qué
//  campos tiene cada una. Los nombres de los campos son los mismos que
//  usa la página (precio, en_stock, created_at...).
// =====================================================================

import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Al mandar un documento a la página: "_id" pasa a llamarse "id" y se saca lo interno
const toJSON = {
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.password_hash;
    return ret;
  },
};
const timestamps = { createdAt: "created_at", updatedAt: "updated_at" };
const options = { timestamps, toJSON };

/* ---------- Usuarios del panel ---------- */
const userSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  nombre: { type: String, default: "", trim: true, maxlength: 60 },
  rol: { type: String, enum: ["dueno", "empleado"], default: "empleado" },
  activo: { type: Boolean, default: false }, // el dueño activa a cada usuario nuevo
}, options);
export const User = model("User", userSchema);

/* ---------- Catálogo ---------- */
const categorySchema = new Schema({
  _id: String, // "bebidas", "snacks"...
  nombre: { type: String, required: true },
  emoji: { type: String, default: "🛒" },
  orden: { type: Number, default: 0 },
}, { toJSON });
export const Category = model("Category", categorySchema);

const productSchema = new Schema({
  categoria: { type: String, required: true, ref: "Category" },
  nombre: { type: String, required: true, trim: true, maxlength: 120 },
  detalle: { type: String, default: "", trim: true, maxlength: 120 },
  precio: { type: Number, required: true, min: 0, validate: Number.isInteger }, // pesos uruguayos, sin centavos
  emoji: { type: String, default: "🛒" },
  color: { type: String, default: "#f4f4f4" },
  foto_url: { type: String, default: null },
  en_stock: { type: Boolean, default: true },
  activo: { type: Boolean, default: true }, // false = no se muestra en la página
  orden: { type: Number, default: 0 },
}, options);
export const Product = model("Product", productSchema);

/* ---------- Fotos de productos (se guardan dentro de la base) ---------- */
const photoSchema = new Schema({
  data: { type: Buffer, required: true },
  tipo: { type: String, required: true }, // "image/jpeg", "image/png"...
}, { timestamps });
export const Photo = model("Photo", photoSchema);

/* ---------- Configuración (combo, ruleta, horarios, avisos, whatsapp, cerrado, asistente) ---------- */
const settingSchema = new Schema({
  _id: String, // la "key": "combo", "ruleta"...
  value: { type: Schema.Types.Mixed, required: true },
}, { timestamps, minimize: false });
export const Setting = model("Setting", settingSchema);

/* ---------- Pedidos ---------- */
const orderSchema = new Schema({
  _id: Number, // número correlativo (#1001, #1002...), sale de "counters"
  nombre: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },
  telefono: { type: String, default: null },
  modo: { type: String, enum: ["retiro", "envio"], required: true },
  direccion: { type: String, default: null, maxlength: 200 },
  dia: { type: String, default: null },  // "2026-11-13"
  hora: { type: String, default: null }, // "20:30"
  nota: { type: String, default: "", maxlength: 500 },
  items: [{ _id: false, id: String, nombre: String, cantidad: Number, precio: { type: Number, default: null } }],
  total: { type: Number, default: 0 },
  estado: { type: String, enum: ["nuevo", "preparando", "listo", "entregado", "cancelado"], default: "nuevo" },
}, options);
orderSchema.index({ created_at: -1 });
export const Order = model("Order", orderSchema);

const counterSchema = new Schema({ _id: String, seq: { type: Number, default: 1000 } });
const Counter = model("Counter", counterSchema);

/** Siguiente número de pedido (1001, 1002...) sin repetir aunque lleguen dos a la vez */
export async function nextOrderId() {
  const counter = await Counter.findByIdAndUpdate("orders", { $inc: { seq: 1 } }, { new: true, upsert: true });
  return counter.seq;
}

/** Para los datos de ejemplo: que el próximo pedido siga después de los cargados */
export async function setOrderCounter(value) {
  await Counter.findByIdAndUpdate("orders", { seq: value }, { upsert: true });
}

/* ---------- Clientes y ruleta ---------- */
const customerSchema = new Schema({
  nombre: { type: String, required: true, trim: true, maxlength: 60 },
  telefono: { type: String, required: true, unique: true },
  acepta_promos: { type: Boolean, default: false },
}, options);
export const Customer = model("Customer", customerSchema);

const spinSchema = new Schema({
  customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
  promo_id: { type: String, required: true },
  indice: { type: Number, required: true },
  premio: { type: String, default: null }, // null = no ganó
  code: { type: String, default: null },
  vence: { type: Date, default: null },
  canjeado_at: { type: Date, default: null },
  canjeado_por: { type: Schema.Types.ObjectId, ref: "User", default: null },
}, options);
spinSchema.index({ customer: 1, promo_id: 1 }, { unique: true }); // un giro por persona por promo
spinSchema.index({ code: 1 }, { unique: true, partialFilterExpression: { code: { $type: "string" } } });
export const Spin = model("Spin", spinSchema, "giros");

/* ---------- Búsquedas sin resultado (para saber qué piden y no hay) ---------- */
const searchSchema = new Schema({
  termino: { type: String, required: true, minlength: 2, maxlength: 60 },
}, { timestamps: { createdAt: "created_at", updatedAt: false }, toJSON });
export const Search = model("Search", searchSchema, "busquedas");

/* ---------- Registro de actividad (quién hizo qué) ---------- */
const activitySchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", default: null },
  tabla: { type: String, required: true },
  registro: { type: String, default: "" },
  accion: { type: String, required: true },
  detalle: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: "created_at", updatedAt: false }, toJSON, minimize: false });
activitySchema.index({ created_at: -1 });
export const Activity = model("Activity", activitySchema, "actividad");

/* ---------- Contador de mensajes del asistente (para limitar el gasto de la IA) ---------- */
const assistantUsageSchema = new Schema({
  dia: { type: String, required: true },   // "2026-11-13" (hora de Uruguay)
  clave: { type: String, required: true }, // "total" o una IP anonimizada
  mensajes: { type: Number, default: 0 },
  creado: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 }, // se borra solo a los 30 días
});
assistantUsageSchema.index({ dia: 1, clave: 1 }, { unique: true });
export const AssistantUsage = model("AssistantUsage", assistantUsageSchema, "asistente_uso");
