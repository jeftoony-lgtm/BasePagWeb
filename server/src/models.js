// =====================================================================
//  INMOBILIARIA · Base de datos (MongoDB con Mongoose)
//  Cada "colección" de MongoDB es como una tabla. Acá se define qué
//  campos tiene cada una. Los nombres de los campos son los mismos que
//  usa la página (precio, operacion, created_at...).
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

/* ---------- Propiedades (las publicaciones) ---------- */
export const OPERACIONES = ["venta", "alquiler"];
export const ESTADOS = ["disponible", "proximamente", "reservada", "vendida", "alquilada"];
// Una casa en venta se "vende" y una en alquiler se "alquila": el cierre depende de la operación
const CIERRE = { venta: "vendida", alquiler: "alquilada" };
export const TIPOS = ["casa", "apartamento", "local", "terreno", "oficina", "otro"];
// Los 19 departamentos de Uruguay (los mismos que en client/src/lib/format.js)
export const DEPARTAMENTOS = [
  "Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno", "Flores", "Florida", "Lavalleja",
  "Maldonado", "Montevideo", "Paysandú", "Río Negro", "Rivera", "Rocha", "Salto", "San José",
  "Soriano", "Tacuarembó", "Treinta y Tres",
];
// Cómo está la propiedad ("" = sin aclarar)
export const CONSERVACION = ["", "a_estrenar", "excelente", "muy_bueno", "bueno", "a_reciclar"];
// Hacia dónde da el frente de la propiedad ("" = sin aclarar)
export const ORIENTACIONES = ["", "norte", "sur", "este", "oeste", "noreste", "noroeste", "sureste", "suroeste"];

const propertySchema = new Schema({
  ref: { type: Number, default: null },                                    // código corto: 12 → "JTC-012" (lo pone el servidor)
  titulo: { type: String, required: true, trim: true, maxlength: 120 },     // "Casa con piscina en Barrio Olimar"
  operacion: { type: String, enum: OPERACIONES, required: true },
  estado: { type: String, enum: ESTADOS, default: "disponible" },
  tipo: { type: String, enum: TIPOS, default: "casa" },
  departamento: { type: String, enum: ["", ...DEPARTAMENTOS], default: "" }, // "Cerro Largo"
  ciudad: { type: String, default: "", trim: true, maxlength: 80 },         // "Melo", "Río Branco"
  barrio: { type: String, default: "", trim: true, maxlength: 80 },         // "Barrio Olimar", "Centro"
  direccion: { type: String, default: "", trim: true, maxlength: 160 },
  moneda: { type: String, enum: ["USD", "UYU"], default: "USD" },
  precio: { type: Number, default: null, min: 0 },                         // null = "Consultar"
  precio_anterior: { type: Number, default: null, min: 0 },               // se llena solo cuando baja el precio (cartel "Precio rebajado")
  precio_extra: { type: String, default: "", trim: true, maxlength: 40 },  // "+ cuotas", "por mes"
  dormitorios: { type: Number, default: null, min: 0, max: 50 },
  banos: { type: Number, default: null, min: 0, max: 50 },
  metros: { type: Number, default: null, min: 0 },                         // m² edificados
  metros_terreno: { type: Number, default: null, min: 0 },                 // m² del terreno
  piso: { type: String, default: "", trim: true, maxlength: 20 },          // "3", "Planta baja"
  conservacion: { type: String, enum: CONSERVACION, default: "" },
  gastos_comunes: { type: String, default: "", trim: true, maxlength: 40 }, // "$ 3.500 por mes"
  contribucion: { type: String, default: "", trim: true, maxlength: 40 },  // "$ 6.000 por año"
  servicios: { type: [String], default: [] },                              // ["Agua corriente (OSE)", "Saneamiento"]
  orientacion: { type: String, enum: ORIENTACIONES, default: "" },         // hacia dónde da el frente
  garaje: { type: Boolean, default: false },
  caracteristicas: { type: [String], default: [] },                        // ["Piscina", "Garaje para dos autos"]
  descripcion: { type: String, default: "", trim: true, maxlength: 4000 },
  ubicacion: { type: Schema.Types.Mixed, default: null },                  // { lat, lng } o { texto } (ver maps.js)
  ubicacion_aproximada: { type: Boolean, default: false },                 // en la página se ve la zona, no el punto exacto
  fotos: { type: [String], default: [] },                                  // la primera es la portada
  publicada: { type: Boolean, default: true },  // false = borrador, no se ve en la página
  destacada: { type: Boolean, default: false }, // aparece primero (como los posts fijados)
}, options);
propertySchema.index({ destacada: -1, created_at: -1 });
propertySchema.index({ ref: 1 }, { unique: true, partialFilterExpression: { ref: { $type: "number" } } });

// Si quedó "alquilada" una casa en venta (o al revés, por ejemplo al cambiar la operación), se corrige sola
propertySchema.pre("validate", function () {
  if (["vendida", "alquilada"].includes(this.estado)) this.estado = CIERRE[this.operacion];
});
export const Property = model("Property", propertySchema, "propiedades");

/** Corrige las publicaciones viejas que quedaron con el cierre equivocado (se llama al arrancar) */
export async function fixEstados() {
  await Property.updateMany({ operacion: "venta", estado: "alquilada" }, { estado: "vendida" });
  await Property.updateMany({ operacion: "alquiler", estado: "vendida" }, { estado: "alquilada" });
}

/* ---------- Contador de códigos de referencia (1, 2, 3...: nunca se repite, aunque se borre una) ---------- */
const counterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } });
const Counter = model("Counter", counterSchema, "contadores");

export async function nextRef() {
  const counter = await Counter.findByIdAndUpdate("propiedades", { $inc: { seq: 1 } }, { upsert: true, new: true });
  return counter.seq;
}

/** Al arrancar: las publicaciones que todavía no tienen código reciben uno (de la más vieja a la más nueva) */
export async function fixRefs() {
  // El contador nunca puede quedar por debajo del código más alto que ya existe
  const top = (await Property.findOne({ ref: { $type: "number" } }).sort({ ref: -1 }))?.ref ?? 0;
  const counter = await Counter.findById("propiedades");
  if (!counter || counter.seq < top) await Counter.updateOne({ _id: "propiedades" }, { seq: top }, { upsert: true });
  for (const p of await Property.find({ ref: null }).sort({ created_at: 1 })) {
    await Property.updateOne({ _id: p._id }, { ref: await nextRef() });
  }
}

/* ---------- Fotos (se guardan dentro de la base) ---------- */
const photoSchema = new Schema({
  data: { type: Buffer, required: true },
  tipo: { type: String, required: true }, // "image/jpeg", "image/webp"...
}, { timestamps });
export const Photo = model("Photo", photoSchema);

/* ---------- Configuración (datos de la inmobiliaria: nombre, whatsapp, redes...) ---------- */
const settingSchema = new Schema({
  _id: String, // la "key": "inmobiliaria"
  value: { type: Schema.Types.Mixed, required: true },
}, { timestamps, minimize: false });
export const Setting = model("Setting", settingSchema);

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
