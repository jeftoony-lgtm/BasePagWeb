// =====================================================================
//  INMOBILIARIA · Propiedades (publicaciones) y fotos
//  Cualquiera ve las publicadas. Cualquier usuario activo del panel
//  puede subir, editar y borrar publicaciones.
// =====================================================================

import { Router } from "express";
import multer from "multer";
import { Property, Photo, nextRef, OPERACIONES, ESTADOS, TIPOS, DEPARTAMENTOS, ORIENTACIONES, CONSERVACION } from "../models.js";
import mongoose from "mongoose";
import { isStaff, requireStaff, requireOwner } from "../auth.js";
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

const TEXTS = ["titulo", "ciudad", "barrio", "direccion", "precio_extra", "descripcion", "piso", "gastos_comunes", "contribucion"];
const NUMBERS = ["precio", "dormitorios", "banos", "metros", "metros_terreno"];
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
  if ("departamento" in body) {
    const value = String(body.departamento ?? "");
    if (value && !DEPARTAMENTOS.includes(value)) throw fail(400, "Ese departamento no existe.");
    fields.departamento = value;
  }
  if ("orientacion" in body) {
    const value = String(body.orientacion ?? "");
    if (!ORIENTACIONES.includes(value)) throw fail(400, "Esa orientación no existe.");
    fields.orientacion = value;
  }
  if ("garaje" in body) fields.garaje = Boolean(body.garaje);
  if ("conservacion" in body) {
    const value = String(body.conservacion ?? "");
    if (!CONSERVACION.includes(value)) throw fail(400, "Ese estado de conservación no existe.");
    fields.conservacion = value;
  }
  if ("servicios" in body) {
    const list = Array.isArray(body.servicios) ? body.servicios : [];
    fields.servicios = [...new Set(list.map((s) => String(s).trim().slice(0, 60)).filter(Boolean))].slice(0, 30);
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

/**
 * Cartel "Precio rebajado": si al editar baja el precio, se guarda el de antes.
 * - Si vuelve a bajar, se sigue mostrando el primero (el más alto), así se ve toda la rebaja.
 * - Si sube hasta el precio de antes (o más), cambia la moneda, queda en "Consultar"
 *   o se toca "Quitar cartel" en el panel, el cartel se va.
 */
function ajustarRebaja(property, antes, quitar) {
  const ahora = property.precio;
  if (quitar || ahora == null || property.moneda !== antes.moneda) {
    property.precio_anterior = null;
  } else if (antes.precio != null && ahora < antes.precio) {
    property.precio_anterior = Math.max(property.precio_anterior ?? 0, antes.precio);
  } else if (property.precio_anterior != null && ahora >= property.precio_anterior) {
    property.precio_anterior = null;
  }
}

/** Busca una publicación. Las que están en la papelera no aparecen, salvo que se pida "papelera: true" */
async function findProperty(id, { papelera = false } = {}) {
  const property = mongoose.isValidObjectId(id) ? await Property.findById(id) : null;
  if (!property || Boolean(property.eliminada) !== papelera) throw fail(404, "Esa publicación no existe.");
  return property;
}

// Lo que está en la papelera no se ve ni en la página ni en el panel
const NO_ELIMINADA = { eliminada: { $ne: true } };

/** Lo que ve el público: si la ubicación es aproximada, nunca sale el punto exacto */
function forPublic(property) {
  const p = property.toJSON();
  if (p.ubicacion_aproximada && p.ubicacion?.lat != null) p.ubicacion = approximate(p.ubicacion);
  return p;
}

/* ---------- Propiedades ---------- */
router.get("/propiedades", async (req, res) => {
  const staff = isStaff(req);
  const list = await Property.find(staff ? NO_ELIMINADA : { ...NO_ELIMINADA, publicada: true }).sort({ destacada: -1, created_at: -1 });
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
  const property = await Property.create({ ...fields, ref: await nextRef() });
  await logActivity(req, "propiedades", property.id, "insert", { titulo: property.titulo });
  res.status(201).json(property);
});

router.put("/propiedades/:id", requireStaff, async (req, res) => {
  const property = await findProperty(req.params.id);
  const fields = propertyFields(req.body);
  if ("titulo" in fields && !fields.titulo) throw fail(400, "Falta el título.");
  const diff = changes(property.toObject(), fields, LOGGED);
  const antes = { precio: property.precio, moneda: property.moneda };
  property.set(fields);
  ajustarRebaja(property, antes, Boolean(req.body.quitar_rebaja));
  await property.save();
  if (Object.keys(diff).length) await logActivity(req, "propiedades", property.id, "update", { ...diff, _titulo: property.titulo });
  res.json(property);
});

/* ---------- Borrado lógico: "Eliminar" manda a la papelera ----------
   La publicación desaparece de la página y del panel, pero sus datos y fotos
   se guardan. Desde la Papelera (solo el dueño) se restaura o se borra para siempre. */
router.delete("/propiedades/:id", requireStaff, async (req, res) => {
  const property = await findProperty(req.params.id);
  property.set({ eliminada: true, eliminada_at: new Date(), eliminada_por: req.user._id });
  await property.save();
  await logActivity(req, "propiedades", property.id, "delete", { titulo: property.titulo, papelera: true });
  res.status(204).end();
});

router.get("/papelera", requireOwner, async (_req, res) => {
  const list = await Property.find({ eliminada: true }).sort({ eliminada_at: -1 }).populate("eliminada_por", "nombre email");
  res.json(list);
});

router.post("/papelera/:id/restaurar", requireOwner, async (req, res) => {
  const property = await findProperty(req.params.id, { papelera: true });
  property.set({ eliminada: false, eliminada_at: null, eliminada_por: null });
  await property.save();
  await logActivity(req, "propiedades", property.id, "restore", { titulo: property.titulo });
  res.json(property);
});

/* Borrado definitivo (físico): solo el dueño y solo desde la papelera. No se puede deshacer */
router.delete("/papelera/:id", requireOwner, async (req, res) => {
  const property = await findProperty(req.params.id, { papelera: true });
  await property.deleteOne();
  // Las fotos que eran solo de esta publicación ya no sirven: se borran para no llenar la base
  const ids = property.fotos.map((url) => url.split("/").pop());
  const stillUsed = await Property.find({ fotos: { $in: property.fotos } }, "fotos");
  const used = new Set(stillUsed.flatMap((p) => p.fotos));
  await Photo.deleteMany({ _id: { $in: ids.filter((id, i) => !used.has(property.fotos[i])) } });
  await logActivity(req, "propiedades", property.id, "purge", { titulo: property.titulo });
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
