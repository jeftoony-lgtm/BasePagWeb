// =====================================================================
//  LUZ SERENA · Base de datos (MongoDB con Mongoose)
//  Cada "colección" de MongoDB es como una tabla. Acá se define qué
//  campos tiene cada una. Los nombres de los campos son los mismos que
//  usa la página (nombre, estado, created_at...).
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

/* ---------- Fotos (blog y residencial; se guardan dentro de la base) ---------- */
const photoSchema = new Schema({
  data: { type: Buffer, required: true },
  tipo: { type: String, required: true }, // "image/jpeg", "image/webp"...
}, { timestamps });
export const Photo = model("Photo", photoSchema);

/* ---------- Configuración (plazas, whatsapp, teléfono, agenda de la semana) ---------- */
const settingSchema = new Schema({
  _id: String, // la "key": "plazas", "agenda"...
  value: { type: Schema.Types.Mixed, required: true },
}, { timestamps, minimize: false });
export const Setting = model("Setting", settingSchema);

/* ---------- Consultas: familias que piden una visita desde la página ---------- */
export const LEAD_STATES = ["nueva", "contactada", "visita", "ingreso", "descartada"];
const leadSchema = new Schema({
  nombre: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },
  telefono: { type: String, required: true, trim: true, maxlength: 30 },
  para: { type: String, default: "", trim: true, maxlength: 40 },   // "Mamá", "Papá"...
  dia: { type: String, default: "", trim: true, maxlength: 60 },    // día que le queda mejor
  mensaje: { type: String, default: "", trim: true, maxlength: 800 },
  estado: { type: String, enum: LEAD_STATES, default: "nueva" },
  nota: { type: String, default: "", trim: true, maxlength: 300 },  // nota interna del equipo
}, options);
leadSchema.index({ created_at: -1 });
export const Lead = model("Lead", leadSchema, "consultas");

/* ---------- Residentes ---------- */
const residentSchema = new Schema({
  nombre: { type: String, required: true, trim: true, maxlength: 80 },
  habitacion: { type: String, default: "", trim: true, maxlength: 20 },
  nacimiento: { type: String, default: "" }, // "1941-03-15"
  ingreso: { type: String, default: "" },    // "2025-03-10"
  familiar: { type: String, default: "", trim: true, maxlength: 80 },
  telefono_familiar: { type: String, default: "", trim: true, maxlength: 30 },
  observaciones: { type: String, default: "", trim: true, maxlength: 800 },
}, options);
export const Resident = model("Resident", residentSchema, "residentes");

/* ---------- Blog: lo que viven en el residencial ---------- */
const postSchema = new Schema({
  titulo: { type: String, required: true, trim: true, maxlength: 120 },
  categoria: { type: String, default: "Novedades", trim: true, maxlength: 40 },
  fecha: { type: String, required: true }, // "2026-11-25"
  foto_url: { type: String, default: null },
  texto: { type: String, default: "", maxlength: 6000 },
  publicado: { type: Boolean, default: true }, // false = borrador, no se ve en la página
  lecturas: { type: Number, default: 0 },
}, options);
postSchema.index({ fecha: -1 });
export const Post = model("Post", postSchema, "posts");

/* ---------- Estadísticas por día (visitas a la página y toques en WhatsApp) ---------- */
const dailyStatSchema = new Schema({
  _id: String, // "2026-11-25" (hora de Uruguay)
  visitas: { type: Number, default: 0 },
  whatsapp: { type: Number, default: 0 },
}, { toJSON });
export const DailyStat = model("DailyStat", dailyStatSchema, "estadisticas");

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
