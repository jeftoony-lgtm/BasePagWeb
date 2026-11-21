// =====================================================================
//  KIVO · Catálogo: categorías, productos y fotos
//  Cualquiera ve lo activo. El personal ve todo y marca stock.
//  Solo el dueño cambia precios, fotos y productos.
// =====================================================================

import { Router } from "express";
import multer from "multer";
import { Category, Product, Photo } from "../models.js";
import { isStaff, requireOwner, requireStaff } from "../auth.js";
import { fail } from "../http.js";
import { logActivity, changes } from "../activity.js";

export const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6e6 },
  fileFilter: (_req, file, done) => done(file.mimetype.startsWith("image/") ? null : fail(400, "Eso no es una foto."), true),
});

const EDITABLE = ["categoria", "nombre", "detalle", "precio", "emoji", "color", "foto_url", "activo", "en_stock"];
const LOGGED = ["nombre", "precio", "detalle", "categoria", "activo", "emoji", "foto_url", "en_stock"];

/** Se queda solo con los campos que se pueden cambiar */
function productFields(body) {
  const fields = {};
  for (const key of EDITABLE) if (key in body) fields[key] = body[key];
  if ("precio" in fields) fields.precio = Number(fields.precio);
  if (fields.foto_url === "") fields.foto_url = null;
  return fields;
}

async function findProduct(id) {
  const product = await Product.findById(id);
  if (!product) throw fail(404, "Ese producto no existe.");
  return product;
}

/* ---------- Categorías ---------- */
router.get("/categories", async (_req, res) => {
  res.json(await Category.find().sort({ orden: 1 }));
});

/* ---------- Productos ---------- */
router.get("/products", async (req, res) => {
  const filter = isStaff(req) ? {} : { activo: true };
  res.json(await Product.find(filter).sort({ categoria: 1, orden: 1, nombre: 1 }));
});

router.post("/products", requireOwner, async (req, res) => {
  const fields = productFields(req.body);
  if (!(await Category.exists({ _id: fields.categoria }))) throw fail(400, "Esa categoría no existe.");
  const orden = await Product.countDocuments({ categoria: fields.categoria });
  const product = await Product.create({ ...fields, orden });
  await logActivity(req, "products", product.id, "insert", { nombre: product.nombre });
  res.status(201).json(product);
});

router.put("/products/:id", requireOwner, async (req, res) => {
  const product = await findProduct(req.params.id);
  const fields = productFields(req.body);
  const diff = changes(product.toObject(), fields, LOGGED);
  product.set(fields);
  await product.save();
  if (Object.keys(diff).length) await logActivity(req, "products", product.id, "update", { ...diff, _nombre: product.nombre });
  res.json(product);
});

router.delete("/products/:id", requireOwner, async (req, res) => {
  const product = await findProduct(req.params.id);
  await product.deleteOne();
  await logActivity(req, "products", product.id, "delete", { nombre: product.nombre });
  res.status(204).end();
});

// "Sin stock" / "hay stock": lo puede hacer también el empleado
router.patch("/products/:id/stock", requireStaff, async (req, res) => {
  const product = await findProduct(req.params.id);
  const enStock = Boolean(req.body.en_stock);
  if (product.en_stock !== enStock) {
    await logActivity(req, "products", product.id, "update", { en_stock: [product.en_stock, enStock], _nombre: product.nombre });
    product.en_stock = enStock;
    await product.save();
  }
  res.json(product);
});

/* ---------- Fotos ---------- */
router.post("/photos", requireOwner, upload.single("foto"), async (req, res) => {
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
