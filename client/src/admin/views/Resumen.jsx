// =====================================================================
//  LUZ SERENA PANEL · Resumen (solo dueño)
//  Ocupación, consultas pendientes, visitas a la página y toques en
//  WhatsApp, próximos cumpleaños y lo más leído del blog.
// =====================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api.js";
import { dayKey } from "../../lib/format.js";
import { useAdmin, LEAD_STATES, waTo, niceDay } from "../state.js";
import { useShowError } from "../ui.jsx";

/** Lista de barras horizontales: [["Nueva", 2], ...] */
function BarList({ entries }) {
  const max = Math.max(1, ...entries.map(([, value]) => value));
  return entries.map(([label, value]) => (
    <div className="bar" title={`${label}: ${value}`} key={label}>
      <span>{label}</span>
      <span className="t"><i style={{ width: `${(value / max) * 100}%`, minWidth: value ? 4 : 0 }}></i></span>
      <b>{value}</b>
    </div>
  ));
}

/** Gráfico de línea de una sola serie, con número al pasar el dedo o el mouse */
function LineChart({ data, label }) {
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);
  const W = 640, H = 220, P = { l: 36, r: 10, t: 14, b: 26 };
  const max = Math.ceil(Math.max(10, ...data.map((d) => d.v)) / 10) * 10;
  const x = (i) => P.l + (i * (W - P.l - P.r)) / Math.max(1, data.length - 1);
  const y = (v) => P.t + (H - P.t - P.b) * (1 - v / max);
  const points = data.map((d, i) => `${x(i)},${y(d.v)}`).join(" ");

  function onMove(event) {
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((event.clientX - rect.left) * W) / rect.width;
    const i = Math.max(0, Math.min(data.length - 1, Math.round((px - P.l) / ((W - P.l - P.r) / Math.max(1, data.length - 1)))));
    setHover({ i, left: (x(i) / W) * rect.width, top: (y(data[i].v) / H) * rect.height });
  }

  if (!data.length) return <p className="muted small">Todavía no hay visitas registradas.</p>;
  return (
    <div className="chart">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <defs><linearGradient id="gf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#C99A2E" stopOpacity=".28" /><stop offset="1" stopColor="#C99A2E" stopOpacity="0" /></linearGradient></defs>
        {[0, 0.5, 1].map((f) => (
          <g key={f}><line x1={P.l} x2={W - P.r} y1={y(max * f)} y2={y(max * f)} stroke="#EFE6D3" />
            <text x={P.l - 8} y={y(max * f) + 4} textAnchor="end" fontSize="11" fill="#7A6F60">{Math.round(max * f)}</text></g>
        ))}
        <polygon points={`${P.l},${y(0)} ${points} ${x(data.length - 1)},${y(0)}`} fill="url(#gf)" />
        <polyline points={points} fill="none" stroke="#B8861F" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (i % 7 === 0 || i === data.length - 1) && <text key={d.dia} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="#7A6F60">{d.short}</text>)}
        {hover && <>
          <line x1={x(hover.i)} x2={x(hover.i)} y1={P.t} y2={y(0)} stroke="#2A251F" strokeDasharray="3 3" opacity=".4" />
          <circle cx={x(hover.i)} cy={y(data[hover.i].v)} r="5" fill="#B8861F" stroke="#fff" strokeWidth="2" />
        </>}
        <rect x={P.l} y="0" width={W - P.l - P.r} height={H} fill="transparent" />
      </svg>
      {hover && <div className="tip" style={{ left: hover.left, top: hover.top, opacity: 1 }}><b>{data[hover.i].v}</b> visitas · {data[hover.i].long}</div>}
    </div>
  );
}

/** Días que faltan para el próximo cumpleaños y cuántos cumple */
function nextBirthdays(residents) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return residents.filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.nacimiento)).map((r) => {
    const [year, month, day] = r.nacimiento.split("-").map(Number);
    const next = new Date(now.getFullYear(), month - 1, day);
    if (next < now) next.setFullYear(now.getFullYear() + 1);
    return { r, dias: Math.round((next - now) / 864e5), edad: next.getFullYear() - year };
  }).sort((a, b) => a.dias - b.dias);
}

export function Resumen() {
  const { settings, leads, residents, posts } = useAdmin();
  const showError = useShowError();
  const [stats, setStats] = useState(null);

  useEffect(() => { api.stats(60).then(setStats).catch((e) => { setStats([]); showError(e); }); }, [showError]);

  const series = useMemo(() => {
    const byDay = Object.fromEntries((stats || []).map((s) => [s.dia, s]));
    return [...Array(60)].map((_, i) => {
      const date = new Date(Date.now() - (59 - i) * 864e5);
      const key = dayKey(date);
      return { dia: key, v: byDay[key]?.visitas || 0, wa: byDay[key]?.whatsapp || 0, short: `${date.getDate()}/${date.getMonth() + 1}`, long: niceDay(key, { weekday: "short", day: "numeric", month: "short" }) };
    });
  }, [stats]);

  const last30 = series.slice(30), prev30 = series.slice(0, 30);
  const sum = (list, k = "v") => list.reduce((t, d) => t + d[k], 0);
  const visits = sum(last30), visitsBefore = sum(prev30);
  const change = visitsBefore ? Math.round(((visits - visitsBefore) / visitsBefore) * 100) : null;

  const { total = 0, ocupadas = 0 } = settings.plazas || {};
  const pct = total ? Math.round((ocupadas / total) * 100) : 0;
  const pending = leads.filter((l) => l.estado === "nueva");
  const monthLeads = leads.filter((l) => Date.now() - new Date(l.created_at) < 30 * 864e5).length;
  const admitted = leads.filter((l) => l.estado === "ingreso").length;
  const conversion = leads.length ? Math.round((admitted / leads.length) * 100) : 0;
  const birthdays = nextBirthdays(residents).slice(0, 4);
  const mostRead = [...posts].sort((a, b) => b.lecturas - a.lecturas).slice(0, 3);
  const hour = new Date().getHours();

  return (
    <>
      <div className="view-head"><div>
        <h2>{hour < 12 ? "Buen día" : hour < 20 ? "Buenas tardes" : "Buenas noches"} 👋</h2>
        <p>Así viene Luz Serena hoy, {new Date().toLocaleDateString("es-UY", { weekday: "long", day: "numeric", month: "long" })}.</p>
      </div></div>

      <div className="kpis">
        <div className="kpi"><small>Plazas ocupadas</small><b>{ocupadas} / {total}</b><div className="meter"><i style={{ width: `${pct}%` }}></i></div><span>{Math.max(0, total - ocupadas)} libres · {pct}% de ocupación</span></div>
        <div className="kpi"><small>Consultas sin responder</small><b style={{ color: pending.length ? "var(--red)" : undefined }}>{pending.length}</b><span>{monthLeads} consultas en los últimos 30 días</span></div>
        <div className="kpi"><small>Visitas a la web · 30 días</small><b>{stats ? visits : "…"}</b><span className="up">{change === null ? "Primer mes con datos" : `${change >= 0 ? "▲" : "▼"} ${Math.abs(change)}% vs. mes anterior`}</span></div>
        <div className="kpi"><small>Toques en WhatsApp · 30 días</small><b>{stats ? sum(last30, "wa") : "…"}</b><span>{conversion}% de las consultas terminó en ingreso</span></div>
      </div>

      <div className="grid2 wide-left">
        <section className="card"><h3>Visitas a la página</h3><p className="small muted">Personas que entraron cada día, últimos 30 días. Pasá el dedo o el mouse para ver el número.</p>
          {stats ? <LineChart data={last30} label="Visitas diarias de los últimos 30 días" /> : <div className="loading">Cargando…</div>}</section>
        <section className="card"><h3>Para atender hoy</h3><p className="small muted">Familias que esperan respuesta</p>
          <ul className="list-mini">
            {pending.slice(0, 4).map((l) => (
              <li key={l.id}><span><b>{l.nombre}</b><br /><small className="muted">Para {l.para.toLowerCase() || "un familiar"} · {niceDay(dayKey(l.created_at))}</small></span>
                <a className="mini-btn wa" target="_blank" rel="noopener" aria-label={`WhatsApp a ${l.nombre}`} href={waTo(l.telefono, `Hola ${l.nombre.split(" ")[0]}, te escribimos de Luz Serena Residencial por tu consulta.`)}>WhatsApp</a></li>
            ))}
            {!pending.length && <li>¡Todo al día! No hay consultas pendientes.</li>}
          </ul>
          {pending.length > 0 && <a className="btn btn-ghost btn-sm" href="#consultas" style={{ width: "100%", marginTop: 10 }}>Ver todas las consultas</a>}
        </section>
      </div>

      <div className="grid3">
        <section className="card"><h3>Consultas por estado</h3><p className="small muted">Dónde está cada familia</p>
          <div className="bars"><BarList entries={Object.entries(LEAD_STATES).map(([k, label]) => [label, leads.filter((l) => l.estado === k).length])} /></div></section>
        <section className="card"><h3>🎂 Próximos cumpleaños</h3><p className="small muted">Para preparar la torta a tiempo</p>
          <ul className="list-mini">
            {birthdays.map(({ r, dias, edad }) => (
              <li key={r.id}><span>{r.nombre}<br /><small className="muted">Cumple {edad} años</small></span>
                <span className={`pill ${dias <= 7 ? "st-nueva" : "st-contactada"}`}>{dias === 0 ? "¡Hoy!" : dias === 1 ? "Mañana" : `En ${dias} días`}</span></li>
            ))}
            {!birthdays.length && <li className="muted">Cargá la fecha de nacimiento en Residentes.</li>}
          </ul></section>
        <section className="card"><h3>Novedades más leídas</h3><p className="small muted">Lo que más interesa a las familias</p>
          <ul className="list-mini">
            {mostRead.map((p) => <li key={p.id}><span>{p.titulo}</span><b>{p.lecturas}</b></li>)}
            {!mostRead.length && <li className="muted">Todavía no hay publicaciones.</li>}
          </ul></section>
      </div>
    </>
  );
}
