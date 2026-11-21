// =====================================================================
//  INMOBILIARIA PANEL · Gráficas (solo dueño)
//  Números de arriba + un gráfico de las publicaciones, agrupadas por lo
//  que se elija (estado, barrio, tipo...). Se puede ver en barras,
//  columnas o circular; la línea muestra las publicaciones nuevas por mes.
//  Las barras se pueden arrastrar para ponerlas en el orden que uno quiera
//  (el orden se recuerda en este navegador). Los valores siempre son los
//  reales: arrastrar cambia el orden, nunca el número.
// =====================================================================

import { useMemo, useRef, useState } from "react";
import { useAdmin } from "../state.js";
import { ESTADOS, OPERACIONES, TIPOS, cerrada, normalize, formatDate } from "../../lib/format.js";

/* ---------- Por qué se puede agrupar ---------- */
// key(p) = a qué grupo va la publicación · label(key) = cómo se muestra · natural = orden "lógico"
const DIMENSIONS = {
  estado: {
    name: "Estado",
    key: (p) => p.estado,
    label: (k) => ESTADOS[k] || k,
    natural: ["disponible", "proximamente", "reservada", "vendida", "alquilada"],
  },
  departamento: {
    name: "Departamento",
    key: (p) => p.departamento || "~sin",
    label: (k) => (k === "~sin" ? "Sin departamento" : k),
  },
  ciudad: {
    name: "Ciudad",
    key: (p) => normalize((p.ciudad || "").trim()) || "~sin",
    label: (k, sample) => (k === "~sin" ? "Sin ciudad" : sample?.ciudad.trim() || k),
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

/* ---------- Cómo se ve el gráfico ---------- */
const TYPES = [
  { id: "barras", name: "Barras" },
  { id: "columnas", name: "Columnas" },
  { id: "circular", name: "Circular" },
  { id: "linea", name: "Línea (por mes)" },
];
const savedType = () => {
  try {
    const saved = localStorage.getItem("graficas-tipo");
    return TYPES.some((t) => t.id === saved) ? saved : "barras";
  } catch { return "barras"; }
};

// Colores del circular: 6 tonos en orden fijo (validados para daltonismo contra el fondo del panel).
// Más de 6 grupos: los más chicos se juntan en "Otros" (gris).
// Cada grupo tiene siempre el mismo color, aunque cambie el orden.
const PIE_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"];
const OTHER_COLOR = "#9a9086";
const MAX_SLICES = 6;

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

/* ---------- Tooltip (lo que aparece al pasar el mouse o tocar) ---------- */
function Tip({ tip }) {
  if (!tip) return null;
  return <div className="chart-tip" style={{ left: tip.x, top: tip.y }}><b>{tip.title}</b><span>{tip.text}</span></div>;
}

const countText = (n, total) =>
  `${n} ${n === 1 ? "publicación" : "publicaciones"}${total ? ` · ${Math.round((n / total) * 100)}%` : ""}`;

/** Dónde está el mouse dentro del cuadro del gráfico (para ubicar el tooltip) */
function pointIn(event, box) {
  const r = box.getBoundingClientRect();
  return { x: event.clientX - r.left, y: event.clientY - r.top };
}

/* ---------- Columnas ---------- */
function ColumnChart({ rows, total }) {
  const box = useRef(null);
  const [tip, setTip] = useState(null);
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="chart-box" ref={box} onPointerLeave={() => setTip(null)}>
      <div className="vcols">
        {rows.map((r) => (
          <div key={r.key} className="vcol"
            onPointerMove={(e) => setTip({ ...pointIn(e, box.current), title: r.label, text: countText(r.count, total) })}>
            <span className="vcol-value">{r.count}</span>
            <span className="vcol-bar"><span style={{ height: `${(r.count / max) * 100}%` }} /></span>
            <span className="vcol-label">{r.label}</span>
          </div>
        ))}
      </div>
      <Tip tip={tip} />
    </div>
  );
}

/* ---------- Circular (anillo con el total en el medio) ---------- */
function PieChart({ rows, total, colorOf }) {
  const box = useRef(null);
  const [tip, setTip] = useState(null);
  const [active, setActive] = useState(null);

  // Hasta 6 porciones: si hay más, las más chicas se juntan en "Otros"
  const biggest = [...rows].sort((a, b) => b.count - a.count).slice(0, MAX_SLICES - 1);
  const shown = rows.length > MAX_SLICES ? rows.filter((r) => biggest.includes(r)) : rows;
  const rest = rows.filter((r) => !shown.includes(r));
  const slices = [
    ...shown.map((r) => ({ ...r, color: colorOf(r.key) })),
    ...(rest.length ? [{ key: "~otros", label: `Otros (${rest.length})`, count: rest.reduce((n, r) => n + r.count, 0), color: OTHER_COLOR }] : []),
  ];

  const R = 70;
  const C = 2 * Math.PI * R;
  const gap = slices.length > 1 ? 2 : 0; // 2px de separación entre porciones
  let start = 0;

  const show = (e, sl) => {
    setActive(sl.key);
    setTip({ ...pointIn(e, box.current), title: sl.label, text: countText(sl.count, total) });
  };

  return (
    <div className="chart-box pie-wrap" ref={box} onPointerLeave={() => { setTip(null); setActive(null); }}>
      <svg className="pie" viewBox="0 0 200 200" role="img" aria-label={slices.map((sl) => `${sl.label}: ${sl.count}`).join(", ")}>
        {slices.map((sl) => {
          const len = (sl.count / total) * C;
          const arc = (
            <circle key={sl.key} cx="100" cy="100" r={R} fill="none" stroke={sl.color}
              strokeWidth={active === sl.key ? 34 : 28}
              strokeDasharray={`${Math.max(0.5, len - gap)} ${C}`} strokeDashoffset={-start}
              transform="rotate(-90 100 100)" onPointerMove={(e) => show(e, sl)}
              style={{ opacity: active && active !== sl.key ? 0.45 : 1 }} />
          );
          start += len;
          return arc;
        })}
        <text x="100" y="100" textAnchor="middle" className="pie-total">{total}</text>
        <text x="100" y="120" textAnchor="middle" className="pie-sub">{total === 1 ? "publicación" : "publicaciones"}</text>
      </svg>
      <ul className="legend">
        {slices.map((sl) => (
          <li key={sl.key} className={active === sl.key ? "on" : ""}
            onPointerEnter={() => setActive(sl.key)} onPointerLeave={() => setActive(null)}>
            <i style={{ background: sl.color }} />
            <span>{sl.label}</span>
            <b>{sl.count}</b>
            <small>{Math.round((sl.count / total) * 100)}%</small>
          </li>
        ))}
      </ul>
      <Tip tip={tip} />
    </div>
  );
}

/* ---------- Línea: publicaciones nuevas por mes (últimos 12 meses) ---------- */
function monthlyRows(list) {
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 15);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: formatDate(d, { month: "short", year: "2-digit" }), count: 0 });
  }
  for (const p of list) {
    const d = new Date(p.created_at);
    const row = months.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (row) row.count += 1;
  }
  return months;
}

function LineChart({ rows }) {
  const box = useRef(null);
  const [index, setIndex] = useState(null);
  // Medidas del dibujo (se escala solo al ancho de la pantalla)
  const W = 640, H = 240, LEFT = 34, RIGHT = 14, TOP = 16, BOTTOM = 30;
  const max = Math.max(1, ...rows.map((r) => r.count));
  const step = max <= 5 ? 1 : Math.ceil(max / 4);
  const top = Math.ceil(max / step) * step;
  const x = (i) => LEFT + (i * (W - LEFT - RIGHT)) / (rows.length - 1);
  const y = (v) => TOP + (1 - v / top) * (H - TOP - BOTTOM);
  const ticks = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  const path = rows.map((r, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(r.count).toFixed(1)}`).join(" ");

  // El mes más cercano al mouse / dedo
  function onMove(e) {
    const svg = e.currentTarget.ownerSVGElement;
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setIndex(Math.max(0, Math.min(rows.length - 1, Math.round(((px - LEFT) / (W - LEFT - RIGHT)) * (rows.length - 1)))));
  }

  const cur = index != null ? rows[index] : null;
  let tip = null;
  if (cur && box.current) {
    const r = box.current.querySelector("svg").getBoundingClientRect();
    const b = box.current.getBoundingClientRect();
    tip = { x: r.left - b.left + (x(index) / W) * r.width, y: r.top - b.top + (y(cur.count) / H) * r.height, title: cur.label, text: countText(cur.count) };
  }

  return (
    <div className="chart-box" ref={box}>
      <svg className="line-chart" viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={rows.map((r) => `${r.label}: ${r.count}`).join(", ")} onPointerLeave={() => setIndex(null)}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={LEFT} x2={W - RIGHT} y1={y(v)} y2={y(v)} className="grid" />
            <text x={LEFT - 8} y={y(v) + 4} textAnchor="end" className="axis">{v}</text>
          </g>
        ))}
        {/* Un mes sí y uno no, para que no se encimen (el último siempre) */}
        {rows.map((r, i) => (i % 2 === (rows.length - 1) % 2) && (
          <text key={r.key} x={x(i)} y={H - 8} textAnchor="middle" className="axis">{r.label}</text>
        ))}
        {cur && <line x1={x(index)} x2={x(index)} y1={TOP} y2={H - BOTTOM} className="crosshair" />}
        <path d={path} className="line" />
        {rows.map((r, i) => <circle key={r.key} cx={x(i)} cy={y(r.count)} r={index === i ? 6 : 4} className="dot" />)}
        <rect x={LEFT} y={0} width={W - LEFT - RIGHT} height={H - BOTTOM} fill="transparent" onPointerMove={onMove} onPointerDown={onMove} />
      </svg>
      <Tip tip={tip} />
    </div>
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
  const [type, setType] = useState(savedType);
  const dimension = DIMENSIONS[dim];
  const isLine = type === "linea";

  function pickType(id) {
    setType(id);
    try { localStorage.setItem("graficas-tipo", id); } catch { /* sin localStorage */ }
  }

  // Los filtros de arriba valen para todo lo de abajo (números y gráfico)
  const scoped = useMemo(() => properties.filter((p) => (drafts || p.publicada)
    && (operacion === "todas" || p.operacion === operacion)), [properties, drafts, operacion]);

  const charted = dimension.only ? scoped.filter(dimension.only) : scoped;
  const rows = sortRows(group(charted, dimension), sort, dimension, custom);
  const monthly = useMemo(() => monthlyRows(scoped), [scoped]);
  // Color fijo por grupo (no por posición): sale del orden lógico de TODAS las publicaciones,
  // así no cambia al reordenar ni al filtrar
  const colorKeys = sortRows(group(properties, dimension), "natural", dimension, []).map((r) => r.key);
  const colorOf = (key) => PIE_COLORS[Math.max(0, colorKeys.indexOf(key)) % PIE_COLORS.length];

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
            <h3>{isLine ? "Publicaciones nuevas por mes" : `Publicaciones por ${dimension.name.toLowerCase()}`}</h3>
            <p className="small muted">
              {isLine
                ? `Últimos 12 meses, según cuándo se subió cada una. ${monthly.reduce((n, m) => n + m.count, 0)} en ese período.`
                : <>{charted.length} {charted.length === 1 ? "publicación" : "publicaciones"}. {dimension.note || ""}{type === "barras" && " Arrastrá ⠿ para cambiar el orden."}</>}
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setAsTable(!asTable)}>{asTable ? "📊 Ver gráfico" : "▤ Ver tabla"}</button>
        </div>

        <div className="segmented small-seg chart-types" role="group" aria-label="Tipo de gráfico">
          {TYPES.map((t) => (
            <button type="button" key={t.id} className={type === t.id ? "on" : ""} aria-pressed={type === t.id}
              onClick={() => pickType(t.id)}>{t.name}</button>
          ))}
        </div>

        {!isLine && <div className="chart-controls">
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
        </div>}

        {isLine ? (
          asTable ? (
            <table className="data-table">
              <thead><tr><th>Mes</th><th>Publicaciones nuevas</th></tr></thead>
              <tbody>{monthly.map((m) => <tr key={m.key}><td>{m.label}</td><td>{m.count}</td></tr>)}</tbody>
            </table>
          ) : <LineChart rows={monthly} />
        ) : !rows.length ? (
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
        ) : type === "columnas" ? (
          <ColumnChart rows={rows} total={charted.length} />
        ) : type === "circular" ? (
          <PieChart rows={rows} total={charted.length} colorOf={colorOf} />
        ) : (
          <BarChart rows={rows} total={charted.length} onReorder={onReorder} />
        )}
      </section>
    </>
  );
}
