// =====================================================================
//  INMOBILIARIA · Propiedades (publicaciones) y fotos
//  Cualquiera ve las publicadas. Cualquier usuario activo del panel
//  puede subir, editar y borrar publicaciones.
// =====================================================================

import { Router } from "express";
import multer from "multer";
import { Property, Photo, OPERACIONES, ESTADOS, TIPOS } from "../models.js";
import { isStaff, requireStaff } from "../auth.js";
import { fail } from "../http.js";
import { logActivity, changes } from "../activity.js";
import { resolveLocation, cleanLocation, approximate } from "../maps.js";

export const router = Router();

const MAX_FOTOS = 20;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6e6 },
  fileFilter: (_req, file, done) => done(file.mimetype.startsWith("image/") ? null : fail(400, "Eso no es una foto."), true),
});

const TEXTS = ["titulo", "barrio", "direccion", "precio_extra", "descripcion"];
const NUMBERS = ["precio", "dormitorios", "banos", "metros"];
const LOGGED = ["titulo", "operacion", "estado", "precio", "moneda", "publicada", "destacada"];

/** Se queda solo con los campos que se pueden cambiar, ya limpios */
function propertyFields(body) {
  const fields = {};
  for (const key of TEXTS) if (key in body) fields[key] = String(body[key] ?? "").trim();
  for (const key of NUMBERS) {
    if (!(key in body)) continue;
    const value = body[key] === "" || body[key] === null ? null : Number(body[key]);
    if (value !== null && (!Number.isFinite(value) || value < 0)) throw fail(400, "Revisá los números (precio, dormitorios, baños, metros).");
    fields[key] = value;
  }
  if ("operacion" in body) {
    if (!OPERACIONES.includes(body.operacion)) throw fail(400, "Elegí si es venta o alquiler.");
    fields.operacion = body.operacion;
  }
  if ("estado" in body) {
    if (!ESTADOS.includes(body.estado)) throw fail(400, "Ese estado no existe.");
    fields.estado = body.estado;
  }
  if ("tipo" in body) {
    if (!TIPOS.includes(body.tipo)) throw fail(400, "Ese tipo de propiedad no existe.");
    fields.tipo = body.tipo;
  }
  if ("moneda" in body) fields.moneda = body.moneda === "UYU" ? "UYU" : "USD";
  if ("publicada" in body) fields.publicada = Boolean(body.publicada);
  if ("destacada" in body) fields.destacada = Boolean(body.destacada);
  if ("ubicacion" in body) fields.ubicacion = cleanLocation(body.ubicacion);
  if ("ubicacion_aproximada" in body) fields.ubicacion_aproximada = Boolean(body.ubicacion_aproximada);
  if ("caracteristicas" in body) {
    const list = Array.isArray(body.caracteristicas) ? body.caracteristicas : [];
    fields.caracteristicas = list.map((c) => String(c).trim().slice(0, 80)).filter(Boolean).slice(0, 30);
  }
  if ("fotos" in body) {
    const list = Array.isArray(body.fotos) ? body.fotos : [];
    // Solo fotos subidas a este servidor
    fields.fotos = list.map(String).filter((url) => /^\/api\/photos\/[a-f0-9]{24}$/.test(url)).slice(0, MAX_FOTOS);
  }
  return fields;
}

async function findProperty(id) {
  const property = await Property.findById(id);
  if (!property) throw fail(404, "Esa publicación no existe.");
  return property;
}

/** Lo que ve el público: si la ubicación es aproximada, nunca sale el punto exacto */
function forPublic(property) {
  const p = property.toJSON();
  if (p.ubicacion_aproximada && p.ubicacion?.lat != null) p.ubicacion = approximate(p.ubicacion);
  return p;
}

/* ---------- Propiedades ---------- */
router.get("/propiedades", async (req, res) => {
  const staff = isStaff(req);
  const list = await Property.find(staff ? {} : { publicada: true }).sort({ destacada: -1, created_at: -1 });
  res.json(staff ? list : list.map(forPublic));
});

router.get("/propiedades/:id", async (req, res) => {
  const property = await findProperty(req.params.id);
  if (!isStaff(req)) {
    if (!property.publicada) throw fail(404, "Esa publicación no existe.");
    return res.json(forPublic(property));
  }
  res.json(property);
});

/* El panel manda el link de Google Maps y recibe la ubicación (para verla antes de guardar) */
router.post("/ubicacion", requireStaff, async (req, res) => {
  res.json(await resolveLocation(req.body?.link));
});

router.post("/propiedades", requireStaff, async (req, res) => {
  const fields = propertyFields(req.body);
  if (!fields.titulo) throw fail(400, "Falta el título.");
  const property = await Property.create(fields);
  await logActivity(req, "propiedades", property.id, "insert", { titulo: property.titulo });
  res.status(201).json(property);
});

router.put("/propiedades/:id", requireStaff, async (req, res) => {
  const property = await findProperty(req.params.id);
  const fields = propertyFields(req.body);
  if ("titulo" in fields && !fields.titulo) throw fail(400, "Falta el título.");
  const diff = changes(property.toObject(), fields, LOGGED);
  property.set(fields);
  await property.save();
  if (Object.keys(diff).length) await logActivity(req, "propiedades", property.id, "update", { ...diff, _titulo: property.titulo });
  res.json(property);
});

router.delete("/propiedades/:id", requireStaff, async (req, res) => {
  const property = await findProperty(req.params.id);
  await property.deleteOne();
  // Las fotos que eran solo de esta publicación ya no sirven: se borran para no llenar la base
  const ids = property.fotos.map((url) => url.split("/").pop());
  const stillUsed = await Property.find({ fotos: { $in: property.fotos } }, "fotos");
  const used = new Set(stillUsed.flatMap((p) => p.fotos));
  await Photo.deleteMany({ _id: { $in: ids.filter((id, i) => !used.has(property.fotos[i])) } });
  await logActivity(req, "propiedades", property.id, "delete", { titulo: property.titulo });
  res.status(204).end();
});

/* ---------- Fotos ---------- */
router.post("/photos", requireStaff, upload.single("foto"), async (req, res) => {
  if (!req.file) throw fail(400, "No llegó ninguna foto.");
  const photo = await Photo.create({ data: req.file.buffer, tipo: req.file.mimetype });
  res.status(201).json({ url: `/api/photos/${photo.id}` });
});

router.get("/photos/:id", async (req, res) => {
  const photo = await Photo.findById(req.params.id);
  if (!photo) throw fail(404, "Esa foto no existe.");
  // Una foto nunca cambia (si se cambia, es otra con otro id): el navegador la puede guardar para siempre
  res.set({ "Content-Type": photo.tipo, "Cache-Control": "public, max-age=31536000, immutable" });
  res.send(photo.data);
});
