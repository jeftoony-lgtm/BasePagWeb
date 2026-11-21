// =====================================================================
//  KIVO PANEL · Productos
//  Dueño: precios, fotos, productos nuevos, ocultar o borrar.
//  Empleado: solo marca "sin stock" / "hay stock".
// =====================================================================

import { preparePhoto } from "../photo.js";
import { useState } from "react";
import { api } from "../../api.js";
import { money, normalize } from "../../lib/format.js";
import { useAdmin } from "../state.js";
import { useModal, useToast, useShowError, Switch, SheetHead } from "../ui.jsx";

const BACKGROUNDS = ["#ffe1df", "#fff7c9", "#e3f1da", "#e1f0ff", "#fff3d6", "#f6e8d6", "#efe0d6", "#ffe8ef", "#f4f4f4"];

// Se recuerdan al cambiar de sección
let lastCategory = "todas";
let lastSearch = "";

function Thumb({ product: p }) {
  return (
    <div className="thumb" style={{ background: p.color || "#f4f4f4" }}>
      {p.foto_url ? <img src={p.foto_url} alt="" /> : p.emoji || "🛒"}
    </div>
  );
}

/* =================== Crear / editar producto =================== */

function ProductForm({ original, defaultCategory }) {
  const { categories, setProducts } = useAdmin();
  const { close, confirm, open } = useModal();
  const toast = useToast();
  const showError = useShowError();
  const isNew = !original;

  const [p, setP] = useState(() => (isNew
    ? { categoria: defaultCategory || categories[0]?.id, nombre: "", detalle: "", precio: "", emoji: "🛒", color: "#f4f4f4", activo: true, en_stock: true, foto_url: null }
    : { ...original }));
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (changes) => setP((current) => ({ ...current, ...changes }));
  const field = (key) => ({ value: p[key] ?? "", onChange: (e) => set({ [key]: e.target.value }) });

  async function onPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 6e6) return toast("La foto es muy pesada (máximo 6 MB).", true);
    setUploading(true);
    try {
      // Recorta el fondo que sobra y la achica, así el producto se ve entero y grande
      const ready = await preparePhoto(file);
      set({ foto_url: await api.uploadPhoto(ready) });
      toast("Foto lista (ajustada al recuadro). Tocá Guardar.");
    } catch (e) {
      showError(e);
    }
    setUploading(false);
  }

  async function onDelete() {
    const ok = await confirm(`¿Eliminar “${p.nombre}”?`,
      "Si solo no hay por ahora, mejor marcalo sin stock o apagá “Se muestra en la página”.", "Eliminar");
    if (!ok) return open(<ProductForm original={original} />);
    try {
      await api.deleteProduct(p.id);
      setProducts((list) => list.filter((x) => x.id !== p.id));
      toast("Producto eliminado");
    } catch (e) {
      showError(e);
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    const product = { ...p, nombre: p.nombre.trim(), detalle: p.detalle.trim(), emoji: p.emoji.trim() || "🛒" };
    if (!product.nombre) return setError("Falta el nombre.");
    if (product.precio === "" || Number(product.precio) < 0 || !Number.isInteger(Number(product.precio))) {
      return setError("El precio tiene que ser un número entero (sin centavos).");
    }
    product.precio = Number(product.precio);

    setSaving(true);
    try {
      const saved = await api.saveProduct(product);
      setProducts((list) => (isNew ? [...list, saved] : list.map((x) => (x.id === saved.id ? saved : x))));
      close();
      toast(isNew ? "Producto agregado" : "Cambios guardados");
    } catch (e) {
      setSaving(false);
      showError(e);
    }
  }

  return (
    <>
      <SheetHead title={isNew ? "Nuevo producto" : "Editar producto"} />
      <form className="stack" noValidate onSubmit={onSubmit}>
        <div className="photo">
          <div>{uploading ? <div className="thumb" style={{ background: "#eee", fontSize: 14 }}>Subiendo…</div> : <Thumb product={p} />}</div>
          <div className="stack" style={{ gap: 8 }}>
            <label className="btn btn-ghost btn-sm" style={{ cursor: "pointer" }}>📷 {p.foto_url ? "Cambiar foto" : "Subir foto"}
              <input type="file" accept="image/*" hidden onChange={onPhoto} /></label>
            {p.foto_url
              ? <button type="button" className="btn btn-red btn-sm" onClick={() => set({ foto_url: null })}>Quitar foto</button>
              : <span className="small muted">Sin foto se muestra el emoji.</span>}
          </div>
        </div>
        <div className="field"><label htmlFor="fName">Nombre</label><input id="fName" placeholder="Ej: Coca-Cola 2,25 L" {...field("nombre")} /></div>
        <div className="grid2">
          <div className="field"><label htmlFor="fPrice">Precio ($)</label><input id="fPrice" type="number" inputMode="numeric" min="0" step="1" {...field("precio")} /></div>
          <div className="field"><label htmlFor="fCategory">Categoría</label>
            <select id="fCategory" {...field("categoria")}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.nombre}</option>)}
            </select></div>
        </div>
        <div className="grid2">
          <div className="field"><label htmlFor="fDetail">Detalle</label><input id="fDetail" placeholder="Ej: Retornable, 1 kg…" {...field("detalle")} /></div>
          <div className="field"><label htmlFor="fEmoji">Emoji (si no hay foto)</label><input id="fEmoji" maxLength={4} {...field("emoji")} /></div>
        </div>
        <div className="field"><span className="label">Color de fondo</span>
          <div className="swatches">
            {BACKGROUNDS.map((c) => (
              <button type="button" key={c} className={c === p.color ? "on" : ""} style={{ background: c }} aria-label={`Color ${c}`} onClick={() => set({ color: c })}></button>
            ))}
          </div>
        </div>
        <Switch label="Se muestra en la página" checked={p.activo} onChange={(activo) => set({ activo })} />
        <div className="error-text">{error}</div>
        <div className="row" style={{ justifyContent: "space-between" }}>
          {isNew ? <span></span> : <button type="button" className="btn btn-red btn-sm" onClick={onDelete}>Eliminar</button>}
          <button className="btn btn-green" disabled={saving || uploading}>{isNew ? "Agregar producto" : "Guardar cambios"}</button>
        </div>
      </form>
    </>
  );
}

/* =================== Lista =================== */

export function Productos() {
  const { products, categories, setProducts, isOwner } = useAdmin();
  const { open } = useModal();
  const toast = useToast();
  const showError = useShowError();
  const [category, setCategory] = useState(lastCategory);
  const [search, setSearch] = useState(lastSearch);

  const pickCategory = (id) => { lastCategory = id; setCategory(id); };
  const onSearch = (text) => { lastSearch = text; setSearch(text); };

  async function toggleStock(product, enStock) {
    try {
      await api.setStock(product.id, enStock);
      setProducts((list) => list.map((x) => (x.id === product.id ? { ...x, en_stock: enStock } : x)));
      toast(enStock ? `✅ ${product.nombre}: hay stock` : `⛔ ${product.nombre}: sin stock`);
    } catch (error) {
      showError(error);
    }
  }

  const chips = [{ id: "todas", nombre: "Todas", emoji: "" }, ...categories, { id: "sinstock", nombre: "Sin stock", emoji: "⛔" }];
  const query = normalize(search.trim());
  const list = products.filter((p) => {
    const inCategory = category === "todas" || (category === "sinstock" ? !p.en_stock : p.categoria === category);
    return inCategory && (!query || normalize(`${p.nombre} ${p.detalle}`).includes(query));
  });
  const newProduct = () => open(<ProductForm defaultCategory={categories.find((c) => c.id === category)?.id} />);

  return (
    <>
      <div className="view-head">
        <div><h2>Productos</h2>
          <p>{isOwner ? "Cambiá precios, fotos y stock. Se actualiza en la página al instante." : "Marcá lo que se terminó para que no lo pidan."}</p></div>
        {isOwner && <button className="btn btn-orange" onClick={newProduct}>＋ Nuevo producto</button>}
      </div>
      <input className="input" placeholder="🔎 Buscar producto…" value={search} onChange={(e) => onSearch(e.target.value)} style={{ marginBottom: 12 }} />
      <div className="chips">
        {chips.map((c) => (
          <button key={c.id} className={`chip${category === c.id ? " on" : ""}`} onClick={() => pickCategory(c.id)}>
            {c.emoji} {c.nombre}{c.id === "sinstock" && <> <span className="n">{products.filter((p) => !p.en_stock).length}</span></>}
          </button>
        ))}
      </div>
      <div className="plist">
        {!list.length ? <div className="empty"><div>🔎</div>No hay productos acá.</div> : list.map((p) => (
          <div className={`prow${p.en_stock ? "" : " out"}`} key={p.id}>
            <Thumb product={p} />
            <div>
              <h4>{p.nombre}{!p.activo && <span className="hiddenTag">OCULTO</span>}</h4>
              <div className="sub">{p.detalle}</div>
              <div className="price">{money(p.precio)}</div>
            </div>
            <div className="stock">
              <Switch checked={p.en_stock} onChange={(enStock) => toggleStock(p, enStock)} aria-label={`Hay stock de ${p.nombre}`} />
              <small className={p.en_stock ? "si" : "no"}>{p.en_stock ? "Hay stock" : "Sin stock"}</small>
            </div>
            {isOwner && <button className="ico" aria-label={`Editar ${p.nombre}`} onClick={() => open(<ProductForm original={p} />)}>✏️</button>}
          </div>
        ))}
      </div>
    </>
  );
}
