// =====================================================================
//  INMOBILIARIA PANEL · Publicaciones
//  Subir propiedades nuevas (con varias fotos), editarlas, marcarlas
//  como vendidas / alquiladas, ocultarlas o borrarlas.
//  Lo puede hacer cualquier usuario activo del panel.
// =====================================================================

import { useRef, useState } from "react";
import { api } from "../../api.js";
import { normalize, price, OPERACIONES, ESTADOS, TIPOS, estadosDe, ajustarEstado, cerrada, mapEmbed } from "../../lib/format.js";
import { useAdmin } from "../state.js";
import { useModal, useToast, useShowError, Switch, SheetHead, SaveBar } from "../ui.jsx";
import { preparePhoto } from "../photo.js";
import { PropertyCard } from "../../site/Card.jsx";

const MAX_FOTOS = 20;

const EMPTY = {
  titulo: "", operacion: "venta", estado: "disponible", tipo: "casa",
  barrio: "", direccion: "", moneda: "USD", precio: "", precio_extra: "",
  dormitorios: "", banos: "", metros: "",
  caracteristicas: [], descripcion: "", fotos: [], publicada: true, destacada: false,
  ubicacion: null, ubicacion_aproximada: false,
};

// Se recuerdan al cambiar de sección
let lastFilter = "todas";
let lastSearch = "";

/* =================== Ubicación en el mapa =================== */
// Se pega el link de Google Maps; el servidor saca las coordenadas y se ve el mapa antes de guardar
function LocationField({ value, approx, onChange, onApprox }) {
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function find(text = link) {
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    try {
      onChange(await api.locate(text));
      setLink("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="field location">
      <label htmlFor="pMap">Ubicación en el mapa (opcional)</label>
      <div className="location-row">
        <input id="pMap" placeholder="Pegá el link de Google Maps (o escribí la dirección)" value={link}
          onChange={(e) => setLink(e.target.value)}
          onPaste={(e) => { const text = e.clipboardData.getData("text"); if (/^https?:\/\//.test(text.trim())) { e.preventDefault(); setLink(text); find(text); } }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); find(); } }} />
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => find()} disabled={busy || !link.trim()}>{busy ? "Buscando…" : "Buscar"}</button>
      </div>
      {error && <span className="error-text">{error}</span>}
      {!value && !error && <span className="small muted">En Google Maps: tocá el lugar → <b>Compartir</b> → <b>Copiar link</b>, y pegalo acá.</span>}
      {value && (
        <>
          <div className="location-preview">
            <iframe title="Ubicación" src={mapEmbed(value, approx)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
          <div className="row" style={{ justifyContent: "space-between", gap: 12 }}>
            <Switch label="Mostrar solo la zona (no la casa exacta)" checked={approx} onChange={onApprox} />
            <button type="button" className="link-btn" onClick={() => onChange(null)}>Quitar ubicación</button>
          </div>
        </>
      )}
    </div>
  );
}

/* =================== Fotos de la publicación =================== */

function PhotoManager({ fotos, onChange, onBusy }) {
  const toast = useToast();
  const showError = useShowError();
  const [progress, setProgress] = useState("");

  async function onFiles(event) {
    const files = [...event.target.files];
    event.target.value = ""; // para poder elegir las mismas otra vez
    const room = MAX_FOTOS - fotos.length;
    if (!room) return toast(`Máximo ${MAX_FOTOS} fotos por publicación.`, true);
    if (files.length > room) toast(`Se suben solo ${room} (máximo ${MAX_FOTOS}).`, true);

    onBusy(true);
    let list = fotos;
    const batch = files.slice(0, room);
    for (const [i, file] of batch.entries()) {
      setProgress(`Subiendo ${i + 1} de ${batch.length}…`);
      try {
        const url = await api.uploadPhoto(await preparePhoto(file));
        list = [...list, url];
        onChange(list);
      } catch (e) {
        showError(e);
      }
    }
    setProgress("");
    onBusy(false);
  }

  const move = (from, to) => {
    const list = [...fotos];
    const [item] = list.splice(from, 1);
    list.splice(to, 0, item);
    onChange(list);
  };

  return (
    <div className="field">
      <span className="label">Fotos ({fotos.length}/{MAX_FOTOS}) · la primera es la portada</span>
      <div className="photos">
        {fotos.map((url, i) => (
          <figure key={url} className={i === 0 ? "cover" : ""}>
            <img src={url} alt={`Foto ${i + 1}`} />
            {i === 0 && <span className="cover-tag">Portada</span>}
            <div className="photo-acts">
              {i > 0 && <button type="button" title="Hacer portada" aria-label="Hacer portada" onClick={() => move(i, 0)}>★</button>}
              {i > 0 && <button type="button" title="Mover antes" aria-label="Mover antes" onClick={() => move(i, i - 1)}>‹</button>}
              {i < fotos.length - 1 && <button type="button" title="Mover después" aria-label="Mover después" onClick={() => move(i, i + 1)}>›</button>}
              <button type="button" className="del" title="Quitar" aria-label="Quitar foto" onClick={() => onChange(fotos.filter((_, j) => j !== i))}>✕</button>
            </div>
          </figure>
        ))}
        {fotos.length < MAX_FOTOS && (
          <label className="add-photo">
            {progress || <>📷<br />Agregar fotos</>}
            <input type="file" accept="image/*" multiple hidden disabled={Boolean(progress)} onChange={onFiles} />
          </label>
        )}
      </div>
    </div>
  );
}

/* =================== Crear / editar publicación =================== */

function PropertyForm({ original }) {
  const { setProperties, settings } = useAdmin();
  const { close, confirm } = useModal();
  const toast = useToast();
  const showError = useShowError();
  const isNew = !original;

  const [p, setP] = useState(() => (isNew ? { ...EMPTY } : {
    ...EMPTY, ...original,
    precio: original.precio ?? "", dormitorios: original.dormitorios ?? "", banos: original.banos ?? "", metros: original.metros ?? "",
  }));
  // Las características se escriben una por renglón
  const [features, setFeatures] = useState(() => (original?.caracteristicas || []).join("\n"));
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const set = (changes) => setP((current) => ({ ...current, ...changes }));
  const field = (key) => ({ value: p[key] ?? "", onChange: (e) => set({ [key]: e.target.value }) });

  const caracteristicas = features.split(/\n|·/).map((c) => c.trim()).filter(Boolean);
  const preview = { ...p, caracteristicas, precio: p.precio === "" ? null : Number(p.precio) };

  // ¿Cambió algo desde que se abrió? (una publicación nueva siempre se puede guardar)
  const initial = useRef(JSON.stringify([p, features]));
  const dirty = isNew || JSON.stringify([p, features]) !== initial.current;

  async function onDelete() {
    const ok = await confirm(`¿Borrar “${p.titulo}”?`,
      "Se borra para siempre, con sus fotos. Si ya se vendió o alquiló, mejor cambiale el estado: queda en la página como caso de éxito.", "Borrar");
    if (!ok) return;
    try {
      await api.deleteProperty(p.id);
      setProperties((list) => list.filter((x) => x.id !== p.id));
      close();
      toast("Publicación borrada");
    } catch (e) {
      showError(e);
    }
  }

  /** Lo llama la barra de guardar después de "Sí, guardar". Devuelve true si se guardó */
  async function save() {
    const property = { ...p, titulo: p.titulo.trim(), caracteristicas };
    if (!property.titulo) { setError("Falta el título."); return false; }
    for (const key of ["precio", "dormitorios", "banos", "metros"]) {
      if (property[key] !== "" && (Number(property[key]) < 0 || Number.isNaN(Number(property[key])))) {
        setError("Revisá los números: no pueden ser negativos.");
        return false;
      }
    }
    setError("");
    try {
      const saved = await api.saveProperty(property);
      setProperties((list) => (isNew ? [saved, ...list] : list.map((x) => (x.id === saved.id ? saved : x))));
      close();
      toast(isNew ? (saved.publicada ? "¡Publicada! Ya se ve en la página." : "Guardada como borrador") : "Cambios guardados");
      return true;
    } catch (e) {
      showError(e);
      return false;
    }
  }

  return (
    <>
      <SheetHead title={isNew ? "Nueva publicación" : "Editar publicación"} />
      <form className="stack" noValidate onSubmit={(e) => e.preventDefault()}>
        <PhotoManager fotos={p.fotos} onChange={(fotos) => set({ fotos })} onBusy={setUploading} />

        <div className="field"><label htmlFor="pTitle">Título</label>
          <input id="pTitle" maxLength={120} placeholder="Ej: Casa con piscina y parrillero" {...field("titulo")} /></div>

        <div className="field"><span className="label">Operación</span>
          <div className="segmented">
            {Object.entries(OPERACIONES).map(([id, name]) => (
              <button type="button" key={id} className={p.operacion === id ? "on" : ""} onClick={() => set({ operacion: id, estado: ajustarEstado(id, p.estado) })}>{name}</button>
            ))}
          </div>
        </div>

        <div className="grid2">
          <div className="field"><label htmlFor="pType">Tipo</label>
            <select id="pType" {...field("tipo")}>{Object.entries(TIPOS).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div>
          <div className="field"><label htmlFor="pState">Estado</label>
            <select id="pState" {...field("estado")}>{estadosDe(p.operacion).map((id) => <option key={id} value={id}>{ESTADOS[id]}</option>)}</select></div>
        </div>

        <div className="grid2">
          <div className="field"><label htmlFor="pBarrio">Barrio / zona</label><input id="pBarrio" placeholder="Ej: Barrio Olimar" {...field("barrio")} /></div>
          <div className="field"><label htmlFor="pAddress">Dirección (opcional)</label><input id="pAddress" placeholder="Ej: Calle 3 entre 14 y 16" {...field("direccion")} /></div>
        </div>

        <LocationField value={p.ubicacion} approx={p.ubicacion_aproximada}
          onChange={(ubicacion) => set({ ubicacion })} onApprox={(ubicacion_aproximada) => set({ ubicacion_aproximada })} />

        <div className="price-row">
          <div className="field"><label htmlFor="pCurrency">Moneda</label>
            <select id="pCurrency" {...field("moneda")}><option value="USD">USD</option><option value="UYU">$ pesos</option></select></div>
          <div className="field"><label htmlFor="pPrice">Precio</label>
            <input id="pPrice" type="number" inputMode="numeric" min="0" placeholder="Vacío = Consultar" {...field("precio")} /></div>
          <div className="field"><label htmlFor="pExtra">Aclaración</label>
            <input id="pExtra" maxLength={40} placeholder={p.operacion === "alquiler" ? "Ej: por mes" : "Ej: + cuotas"} {...field("precio_extra")} /></div>
        </div>

        <div className="grid3">
          <div className="field"><label htmlFor="pRooms">Dormitorios</label><input id="pRooms" type="number" inputMode="numeric" min="0" {...field("dormitorios")} /></div>
          <div className="field"><label htmlFor="pBaths">Baños</label><input id="pBaths" type="number" inputMode="numeric" min="0" {...field("banos")} /></div>
          <div className="field"><label htmlFor="pM2">m²</label><input id="pM2" type="number" inputMode="numeric" min="0" {...field("metros")} /></div>
        </div>

        <div className="field"><label htmlFor="pFeatures">Características (una por renglón)</label>
          <textarea id="pFeatures" rows={4} placeholder={"Living con estufa a leña\nParrillero cerrado\nPiscina"} value={features} onChange={(e) => setFeatures(e.target.value)} /></div>

        <div className="field"><label htmlFor="pDesc">Descripción</label>
          <textarea id="pDesc" rows={4} maxLength={4000} placeholder="Todo lo que quieras contar de la propiedad…" {...field("descripcion")} /></div>

        <div className="row" style={{ gap: 20 }}>
          <Switch label="Publicada (se ve en la página)" checked={p.publicada} onChange={(publicada) => set({ publicada })} />
          <Switch label="Destacada (va primero)" checked={p.destacada} onChange={(destacada) => set({ destacada })} />
        </div>

        <details className="preview">
          <summary>👁️ Vista previa en la página</summary>
          <div className="preview-card"><PropertyCard property={preview} info={settings.inmobiliaria} /></div>
        </details>

        {!p.fotos.length && <p className="small muted">Sin fotos, en la página se ve el logo. Podés agregarlas después.</p>}
        <div className="error-text">{error}</div>
        <SaveBar onSave={save} dirty={dirty} disabled={uploading}
          label={uploading ? "Esperá las fotos…" : isNew ? (p.publicada ? "Publicar" : "Guardar borrador") : "Guardar cambios"}
          confirmLabel={isNew && p.publicada ? "Sí, publicar" : "Sí, guardar"}
          confirmText={isNew
            ? (p.publicada ? `Se va a publicar “${p.titulo.trim() || "sin título"}” y se va a ver en la página al instante.` : "Se va a guardar como borrador (no se ve en la página).")
            : `Se van a guardar los cambios de “${p.titulo.trim() || "sin título"}”.`}>
          {!isNew && <button type="button" className="btn btn-red btn-sm push-left" onClick={onDelete}>Borrar</button>}
        </SaveBar>
      </form>
    </>
  );
}

/* =================== Lista =================== */

const FILTERS = [
  { id: "todas", name: "Todas" },
  { id: "venta", name: "En venta" },
  { id: "alquiler", name: "En alquiler" },
  { id: "cerradas", name: "Vendidas / alquiladas" },
  { id: "borradores", name: "Borradores" },
];

function matches(p, filter) {
  if (filter === "venta" || filter === "alquiler") return p.operacion === filter;
  if (filter === "cerradas") return cerrada(p);
  if (filter === "borradores") return !p.publicada;
  return true;
}

export function Publicaciones() {
  const { properties, setProperties } = useAdmin();
  const { open, confirm } = useModal();
  const toast = useToast();
  const showError = useShowError();
  const [filter, setFilter] = useState(lastFilter);
  const [search, setSearch] = useState(lastSearch);

  const pickFilter = (id) => { lastFilter = id; setFilter(id); };
  const onSearch = (text) => { lastSearch = text; setSearch(text); };

  async function quickChange(property, changes, message) {
    if (!(await confirm("¿Estás seguro?", `“${property.titulo}” → ${message}`, "Sí, guardar", false))) return;
    try {
      const saved = await api.saveProperty({ id: property.id, ...changes });
      setProperties((list) => list.map((x) => (x.id === saved.id ? saved : x)));
      toast(`Guardado: ${property.titulo} → ${message}`);
    } catch (error) {
      showError(error);
    }
  }

  const query = normalize(search.trim());
  const list = properties.filter((p) => matches(p, filter)
    && (!query || normalize(`${p.titulo} ${p.barrio} ${p.direccion}`).includes(query)));

  return (
    <>
      <div className="view-head">
        <div><h2>Publicaciones</h2><p>Lo que subas acá aparece en la página al instante.</p></div>
        <button className="btn btn-orange" onClick={() => open(<PropertyForm />)}>＋ Nueva publicación</button>
      </div>
      <input className="input" placeholder="🔎 Buscar por título, barrio o dirección…" value={search} onChange={(e) => onSearch(e.target.value)} style={{ marginBottom: 12 }} />
      <div className="chips">
        {FILTERS.map((f) => (
          <button key={f.id} className={`chip${filter === f.id ? " on" : ""}`} onClick={() => pickFilter(f.id)}>
            {f.name} <span className="n">{properties.filter((p) => matches(p, f.id)).length}</span>
          </button>
        ))}
      </div>

      {!list.length ? (
        <div className="empty"><div>🏠</div>{properties.length ? "No hay publicaciones acá." : "Todavía no hay publicaciones. Tocá “Nueva publicación” para subir la primera."}</div>
      ) : (
        <div className="prop-list">
          {list.map((p) => (
            <div className={`prop-row${p.publicada ? "" : " draft"}`} key={p.id}>
              <button className="prop-thumb" onClick={() => open(<PropertyForm original={p} />)} aria-label={`Editar ${p.titulo}`}>
                {p.fotos[0] ? <img src={p.fotos[0]} alt="" /> : <svg aria-hidden="true"><use href="#logo" /></svg>}
              </button>
              <div className="prop-main">
                <h4>
                  {p.destacada && <span title="Destacada">📌 </span>}{p.titulo}
                  {!p.publicada && <span className="hiddenTag">BORRADOR</span>}
                </h4>
                <div className="sub">{OPERACIONES[p.operacion]} · {TIPOS[p.tipo]}{p.barrio ? ` · ${p.barrio}` : ""} · {p.fotos.length} {p.fotos.length === 1 ? "foto" : "fotos"}</div>
                <div className="price">{price(p)}</div>
              </div>
              <div className="prop-ctrl">
                <select value={p.estado} aria-label={`Estado de ${p.titulo}`}
                  onChange={(e) => quickChange(p, { estado: e.target.value }, ESTADOS[e.target.value])}>
                  {estadosDe(p.operacion).map((id) => <option key={id} value={id}>{ESTADOS[id]}</option>)}
                </select>
                <Switch label={p.publicada ? "Visible" : "Oculta"} checked={p.publicada}
                  onChange={(publicada) => quickChange(p, { publicada }, publicada ? "Ahora se ve en la página" : "Oculta de la página")} />
                <button className="btn btn-ghost btn-sm" onClick={() => open(<PropertyForm original={p} />)}>✏️ Editar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
