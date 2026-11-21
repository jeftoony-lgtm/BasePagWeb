// =====================================================================
//  INMOBILIARIA PANEL · Gráficas (solo dueño)
//  Números de arriba + un gráfico de barras de las publicaciones,
//  agrupadas por lo que se elija (estado, barrio, tipo...).
//  Las barras se pueden arrastrar para ponerlas en el orden que uno quiera
//  (el orden se recuerda en este navegador). Los valores siempre son los
//  reales: arrastrar cambia el orden, nunca el número.
// =====================================================================

import { useMemo, useRef, useState } from "react";
import { useAdmin } from "../state.js";
import { ESTADOS, OPERACIONES, TIPOS, cerrada, normalize } from "../../lib/format.js";

/* ---------- Por qué se puede agrupar ---------- */
// key(p) = a qué grupo va la publicación · label(key) = cómo se muestra · natural = orden "lógico"
const DIMENSIONS = {
  estado: {
    name: "Estado",
    key: (p) => p.estado,
    label: (k) => ESTADOS[k] || k,
    natural: ["disponible", "reservada", "vendida", "alquilada"],
  },
  barrio: {
    name: "Barrio / zona",
    key: (p) => normalize(p.barrio.trim()) || "~sin",
    label: (k, sample) => (k === "~sin" ? "Sin barrio" : sample?.barrio.trim() || k),
  },
  tipo: {
    name: "Tipo",
    key: (p) => p.tipo,
    label: (k) => TIPOS[k] || k,
    natural: Object.keys(TIPOS),
  },
  operacion: {
    name: "Operación",
    key: (p) => p.operacion,
    label: (k) => OPERACIONES[k] || k,
    natural: Object.keys(OPERACIONES),
  },
  dormitorios: {
    name: "Dormitorios",
    key: (p) => (p.dormitorios == null ? "~sin" : p.dormitorios >= 4 ? "4+" : String(p.dormitorios)),
    label: (k) => ({ "~sin": "Sin dato", "4+": "4 o más", 0: "Monoambiente", 1: "1 dormitorio" }[k] || `${k} dormitorios`),
    natural: ["0", "1", "2", "3", "4+", "~sin"],
  },
  precio: {
    name: "Precio (USD)",
    note: "Solo publicaciones en dólares.",
    only: (p) => p.moneda === "USD",
    key: (p) => {
      if (p.precio == null) return "consultar";
      if (p.precio < 50_000) return "a";
      if (p.precio < 100_000) return "b";
      if (p.precio < 200_000) return "c";
      return "d";
    },
    label: (k) => ({ a: "Menos de 50 mil", b: "50 a 100 mil", c: "100 a 200 mil", d: "200 mil o más", consultar: "Consultar" }[k]),
    natural: ["a", "b", "c", "d", "consultar"],
  },
};

const SORTS = [
  { id: "mayor", name: "Mayor a menor" },
  { id: "natural", name: "Orden lógico" },
  { id: "mio", name: "Mi orden" },
];

/* ---------- El orden propio se guarda en este navegador ---------- */
const storageKey = (dim) => `graficas-orden-${dim}`;
const savedOrder = (dim) => {
  try { return JSON.parse(localStorage.getItem(storageKey(dim))) || []; } catch { return []; }
};
const saveOrder = (dim, keys) => {
  try { localStorage.setItem(storageKey(dim), JSON.stringify(keys)); } catch { /* sin localStorage */ }
};

/** Agrupa y cuenta: [{ key, label, count }] */
function group(list, dimension) {
  const map = new Map();
  for (const p of list) {
    const key = dimension.key(p);
    const row = map.get(key) || { key, label: dimension.label(key, p), count: 0 };
    row.count += 1;
    map.set(key, row);
  }
  return [...map.values()];
}

function sortRows(rows, sort, dimension, custom) {
  const byLabel = (a, b) => a.label.localeCompare(b.label, "es");
  if (sort === "mayor") return [...rows].sort((a, b) => b.count - a.count || byLabel(a, b));
  if (sort === "natural") {
    if (!dimension.natural) return [...rows].sort(byLabel);
    const pos = (k) => { const i = dimension.natural.indexOf(k); return i < 0 ? 999 : i; };
    return [...rows].sort((a, b) => pos(a.key) - pos(b.key));
  }
  // Mi orden: lo guardado primero; lo nuevo (que no estaba) al final, de mayor a menor
  const pos = (k) => { const i = custom.indexOf(k); return i < 0 ? Infinity : i; };
  return [...rows].sort((a, b) => pos(a.key) - pos(b.key) || b.count - a.count);
}

/* ---------- Números de arriba ---------- */
function Stat({ label, value }) {
  return <div className="stat"><span>{label}</span><b>{value}</b></div>;
}

/* ---------- Gráfico de barras horizontales que se pueden arrastrar ---------- */
function BarChart({ rows, total, onReorder }) {
  const listRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const max = Math.max(1, ...rows.map((r) => r.count));

  // Mientras se arrastra, la barra se mueve al lugar de la fila que tiene debajo el dedo / mouse
  function onPointerDown(event, key) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(key);
  }
  function onPointerMove(event) {
    if (!dragging) return;
    const items = [...listRef.current.children];
    const from = rows.findIndex((r) => r.key === dragging);
    let to = items.findIndex((el) => {
      const box = el.getBoundingClientRect();
      return event.clientY < box.top + box.height / 2;
    });
    if (to < 0) to = rows.length - 1;
    else if (to > from) to -= 1;
    if (to !== from) onReorder(move(rows, from, to));
  }
  const endDrag = () => setDragging(null);

  // Con teclado: flechas arriba / abajo sobre la manija
  function onKeyDown(event, index) {
    const to = event.key === "ArrowUp" ? index - 1 : event.key === "ArrowDown" ? index + 1 : null;
    if (to === null || to < 0 || to >= rows.length) return;
    event.preventDefault();
    onReorder(move(rows, index, to));
    requestAnimationFrame(() => listRef.current?.children[to]?.querySelector(".handle")?.focus());
  }

  return (
    <ol className={`hbars${dragging ? " is-dragging" : ""}`} ref={listRef} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
      {rows.map((r, i) => {
        const share = Math.round((r.count / total) * 100);
        return (
          <li key={r.key} className={`hbar${dragging === r.key ? " dragging" : ""}`} tabIndex={-1}
            title={`${r.label}: ${r.count} ${r.count === 1 ? "publicación" : "publicaciones"} (${share}%)`}>
            <button type="button" className="handle" aria-label={`Mover ${r.label} (flechas arriba y abajo)`}
              onPointerDown={(e) => onPointerDown(e, r.key)} onKeyDown={(e) => onKeyDown(e, i)}>⠿</button>
            <span className="hbar-label">{r.label}</span>
            <span className="hbar-track">
              <span className="hbar-fill" style={{ width: `${(r.count / max) * 100}%` }} />
              <span className="hbar-value"><b>{r.count}</b><small>{share}%</small></span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function move(list, from, to) {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/* ---------- La sección ---------- */
export function Graficas() {
  const { properties } = useAdmin();
  const [dim, setDim] = useState("estado");
  const [operacion, setOperacion] = useState("todas");
  const [drafts, setDrafts] = useState(false);
  const [sort, setSort] = useState(() => (savedOrder("estado").length ? "mio" : "natural"));
  const [custom, setCustom] = useState(() => savedOrder("estado"));
  const [asTable, setAsTable] = useState(false);
  const dimension = DIMENSIONS[dim];

  // Los filtros de arriba valen para todo lo de abajo (números y gráfico)
  const scoped = useMemo(() => properties.filter((p) => (drafts || p.publicada)
    && (operacion === "todas" || p.operacion === operacion)), [properties, drafts, operacion]);

  const charted = dimension.only ? scoped.filter(dimension.only) : scoped;
  const rows = sortRows(group(charted, dimension), sort, dimension, custom);

  function pickDim(id) {
    const order = savedOrder(id);
    setDim(id);
    setCustom(order);
    setSort(order.length ? "mio" : DIMENSIONS[id].natural ? "natural" : "mayor");
  }

  function onReorder(next) {
    const keys = next.map((r) => r.key);
    setCustom(keys);
    setSort("mio");
    saveOrder(dim, keys);
  }

  function resetOrder() {
    saveOrder(dim, []);
    setCustom([]);
    setSort(dimension.natural ? "natural" : "mayor");
  }

  const available = scoped.filter((p) => p.estado === "disponible");

  return (
    <>
      <div className="view-head"><div><h2>Gráficas</h2><p>Para tener una idea de cómo vienen las publicaciones.</p></div></div>

      {/* Filtros: una fila, arriba de todo */}
      <div className="filters-row">
        <div className="chips" role="group" aria-label="Operación">
          {[["todas", "Todas"], ["venta", "En venta"], ["alquiler", "En alquiler"]].map(([id, name]) => (
            <button key={id} className={`chip${operacion === id ? " on" : ""}`} onClick={() => setOperacion(id)}>{name}</button>
          ))}
        </div>
        <label className="check"><input type="checkbox" checked={drafts} onChange={(e) => setDrafts(e.target.checked)} /> Incluir borradores</label>
      </div>

      <div className="stats">
        <Stat label="Publicaciones" value={scoped.length} />
        <Stat label="Disponibles en venta" value={available.filter((p) => p.operacion === "venta").length} />
        <Stat label="Disponibles en alquiler" value={available.filter((p) => p.operacion === "alquiler").length} />
        <Stat label="Vendidas y alquiladas" value={scoped.filter(cerrada).length} />
      </div>

      <section className="card chart-card">
        <div className="chart-head">
          <div>
            <h3>Publicaciones por {dimension.name.toLowerCase()}</h3>
            <p className="small muted">
              {charted.length} {charted.length === 1 ? "publicación" : "publicaciones"}. {dimension.note || ""} Arrastrá ⠿ para cambiar el orden.
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setAsTable(!asTable)}>{asTable ? "📊 Ver gráfico" : "▤ Ver tabla"}</button>
        </div>

        <div className="chart-controls">
          <label className="field inline"><span className="label">Agrupar por</span>
            <select value={dim} onChange={(e) => pickDim(e.target.value)}>
              {Object.entries(DIMENSIONS).map(([id, d]) => <option key={id} value={id}>{d.name}</option>)}
            </select>
          </label>
          <div className="segmented small-seg" role="group" aria-label="Orden">
            {SORTS.filter((s) => s.id !== "mio" || custom.length).map((s) => (
              <button type="button" key={s.id} className={sort === s.id ? "on" : ""} onClick={() => setSort(s.id)}>{s.name}</button>
            ))}
          </div>
          {custom.length > 0 && <button className="link-btn" onClick={resetOrder}>Borrar mi orden</button>}
        </div>

        {!rows.length ? (
          <div className="empty"><div>📊</div>No hay publicaciones con estos filtros.</div>
        ) : asTable ? (
          <table className="data-table">
            <thead><tr><th>{dimension.name}</th><th>Publicaciones</th><th>%</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}><td>{r.label}</td><td>{r.count}</td><td>{Math.round((r.count / charted.length) * 100)}%</td></tr>
              ))}
            </tbody>
          </table>
        ) : (
          <BarChart rows={rows} total={charted.length} onReorder={onReorder} />
        )}
      </section>
    </>
  );
}
