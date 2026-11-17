// =====================================================================
//  KIVO PANEL · Resumen (solo dueño)
//  Números del día y de la semana, lo más pedido y lo que buscan y no hay.
//  Los pedidos cancelados no cuentan.
// =====================================================================

import { useEffect, useState } from "react";
import { api } from "../../api.js";
import { money, formatDate, dayKey } from "../../lib/format.js";
import { useAdmin } from "../state.js";
import { useShowError } from "../ui.jsx";

const WEEK_MS = 7 * 864e5;

/** Lista de barras horizontales: [["Coca-Cola", 5], ...] */
function BarList({ entries, variant = "" }) {
  const max = Math.max(1, ...entries.map(([, value]) => value));
  return entries.map(([label, value]) => (
    <div className={`bar ${variant}`} title={`${label}: ${value}`} key={label}>
      <span>{label}</span>
      <span className="t"><i style={{ width: `${(value / max) * 100}%` }}></i></span>
      <b>{value}</b>
    </div>
  ));
}

function countBy(list, getKey, getAmount = () => 1) {
  const totals = {};
  list.forEach((x) => { const k = getKey(x); totals[k] = (totals[k] || 0) + getAmount(x); });
  return Object.entries(totals).sort((a, b) => b[1] - a[1]);
}

export function Resumen() {
  const { orders } = useAdmin();
  const showError = useShowError();
  const [searches, setSearches] = useState([]);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    Promise.all([api.searches(30), api.customers()])
      .then(([s, c]) => { setSearches(s); setCustomers(c); })
      .catch(showError);
  }, [showError]);

  const valid = orders.filter((o) => o.estado !== "cancelado");
  const today = dayKey(new Date());
  const todays = valid.filter((o) => dayKey(o.created_at) === today);
  const week = valid.filter((o) => Date.now() - new Date(o.created_at) < WEEK_MS);
  const newCustomers = customers.filter((c) => Date.now() - new Date(c.created_at) < WEEK_MS).length;
  const sum = (list) => list.reduce((total, o) => total + o.total, 0);

  const topProducts = countBy(valid.flatMap((o) => o.items || []), (i) => i.nombre, (i) => Number(i.cantidad) || 0).slice(0, 6);
  const missing = countBy(searches, (s) => s.termino.trim().toLowerCase()).slice(0, 6);

  const days = [...Array(7)].map((_, i) => {
    const date = new Date(Date.now() - (6 - i) * 864e5);
    const list = valid.filter((o) => dayKey(o.created_at) === dayKey(date));
    return { key: dayKey(date), label: formatDate(date, { weekday: "short" }).replace(".", ""), count: list.length, total: sum(list) };
  });
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  return (
    <>
      <div className="view-head"><div><h2>Resumen</h2><p>Cómo viene la página. Los pedidos cancelados no cuentan.</p></div></div>

      <div className="kpis">
        <div className="kpi"><small>Pedidos hoy</small><b>{todays.length}</b><span>{orders.filter((o) => o.estado === "nuevo").length} esperando</span></div>
        <div className="kpi"><small>Vendido hoy</small><b>{money(sum(todays))}</b><span>en pedidos online</span></div>
        <div className="kpi"><small>Últimos 7 días</small><b>{week.length}</b><span>{money(sum(week))} en total</span></div>
        <div className="kpi"><small>Clientes nuevos</small><b>{newCustomers}</b><span>en 7 días (ruleta)</span></div>
      </div>

      <div className="grid2" style={{ alignItems: "start" }}>
        <section className="card">
          <h3>Pedidos por día</h3><p className="small muted">Últimos 7 días</p>
          <div className="week">
            {days.map((d) => (
              <div className="c" key={d.key} title={`${d.label}: ${d.count} pedido${d.count === 1 ? "" : "s"} · ${money(d.total)}`}>
                <span className="v">{d.count || ""}</span>
                <div className="col" style={{ height: `${(d.count / maxDay) * 100}%` }}></div>
                <small>{d.label}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h3>Lo más pedido</h3><p className="small muted">Unidades en pedidos online, últimos 30 días</p>
          <div className="bars">{topProducts.length ? <BarList entries={topProducts} /> : <p className="muted small">Todavía no hay pedidos.</p>}</div>
        </section>

        <section className="card" style={{ gridColumn: "1/-1" }}>
          <h3>Lo que buscan y no encuentran</h3>
          <p className="small muted">Búsquedas en la página que no dieron resultado (30 días). Ideas para traer.</p>
          <div className="bars">{missing.length ? <BarList entries={missing} variant="o" /> : <p className="muted small">Nadie buscó algo que no haya. 👌</p>}</div>
        </section>
      </div>
    </>
  );
}
