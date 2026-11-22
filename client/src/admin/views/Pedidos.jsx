// =====================================================================
//  KIVO PANEL · Pedidos
//  Llegan en vivo (con sonido). Cada pedido avanza con un botón:
//  Nuevo → Preparando → Listo → Entregado (o Cancelado).
// =====================================================================

import { useEffect, useState } from "react";
import { api } from "../../api.js";
import { money, timeAgo, formatDate, dayKey, prettyPhone } from "../../lib/format.js";
import { useAdmin, ORDER_STATES } from "../state.js";
import { useModal, useToast, useShowError } from "../ui.jsx";

const FILTERS = {
  activos:    { label: "Para hacer",  states: ["nuevo", "preparando", "listo"] },
  nuevo:      { label: "Nuevos",      states: ["nuevo"] },
  preparando: { label: "Preparando",  states: ["preparando"] },
  listo:      { label: "Listos",      states: ["listo"] },
  entregado:  { label: "Entregados",  states: ["entregado"] },
  cancelado:  { label: "Cancelados",  states: ["cancelado"] },
  todos:      { label: "Todos",       states: Object.keys(ORDER_STATES) },
};

// Qué botón principal tiene cada estado
const NEXT_STEP = {
  nuevo:      { to: "preparando", label: "Empezar a preparar" },
  preparando: { to: "listo",      label: "Marcar como listo" },
  listo:      { to: "entregado",  label: "Entregado ✓" },
};

let lastFilter = "activos"; // se recuerda al cambiar de sección

function OrderCard({ order: o, onChange }) {
  const [busy, setBusy] = useState(false);
  const day = o.dia ? (dayKey(new Date()) === o.dia ? "Hoy" : formatDate(o.dia + "T12:00:00", { weekday: "short", day: "numeric" })) : "";
  const next = NEXT_STEP[o.estado];
  const isOpen = ["nuevo", "preparando", "listo"].includes(o.estado);
  const whatsapp = o.telefono ? `https://wa.me/598${String(o.telefono).replace(/^0/, "")}` : null;

  const move = async (estado) => {
    setBusy(true);
    if (!(await onChange(o.id, estado))) setBusy(false);
  };

  return (
    <article className={`order ${o.estado}`}>
      <div className="order-head">
        <div><b>#{o.id} · {o.nombre}</b><small>{timeAgo(o.created_at)}</small></div>
        <span className={`badge b-${o.estado}`}>{ORDER_STATES[o.estado]}</span>
      </div>
      <div className="meta">
        <span>{o.modo === "envio" ? "🛵 Envío" : "🏪 Retira"}</span>
        {o.hora && <span>🕒 {day} {o.hora}</span>}
        {o.telefono && <span>📞 {prettyPhone(o.telefono)}</span>}
      </div>
      {o.modo === "envio" && o.direccion && <div className="small"><b>Dirección:</b> {o.direccion}</div>}
      <ul>
        {(o.items || []).map((i, n) => (
          <li key={n}><span><b>{i.cantidad}×</b> {i.nombre}</span><span>{i.precio == null ? "a confirmar" : money(i.precio * i.cantidad)}</span></li>
        ))}
      </ul>
      {o.nota && <div className="note">📝 {o.nota}</div>}
      <div className="small"><b>Si falta algo:</b> {o.si_falta === "quitar" ? "❌ sacarlo del pedido" : "🔄 cambiarlo por uno parecido"}</div>
      <div className="tot"><span>Total</span><b>{money(o.total)}</b></div>
      <div className="acts">
        {next && <button className="btn btn-green" disabled={busy} onClick={() => move(next.to)}>{next.label}</button>}
        {isOpen
          ? <button className="btn btn-red btn-sm" disabled={busy} onClick={() => move("cancelado")}>Cancelar</button>
          : <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => move("nuevo")}>↩ Reabrir</button>}
        {whatsapp && <a className="btn btn-ghost btn-sm" target="_blank" rel="noopener" href={whatsapp}>WhatsApp</a>}
      </div>
    </article>
  );
}

export function Pedidos() {
  const { orders, setOrders } = useAdmin();
  const { confirm } = useModal();
  const toast = useToast();
  const showError = useShowError();
  const [filter, setFilter] = useState(lastFilter);
  const [, setTick] = useState(0);

  useEffect(() => { lastFilter = filter; }, [filter]);

  // Los "hace 5 min" se actualizan solos
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  /** Devuelve true si se cambió */
  async function changeState(id, estado) {
    if (estado === "cancelado") {
      const ok = await confirm("¿Cancelar este pedido?", "Va a quedar en Cancelados. Lo podés reabrir después.", "Sí, cancelar");
      if (!ok) return false;
    }
    try {
      await api.setOrderState(id, estado);
      setOrders((list) => list.map((o) => (o.id === id ? { ...o, estado } : o)));
      toast(`Pedido #${id}: ${ORDER_STATES[estado]}`);
      return true;
    } catch (error) {
      showError(error);
      return false;
    }
  }

  const list = orders.filter((o) => FILTERS[filter].states.includes(o.estado));

  return (
    <>
      <div className="view-head">
        <div><h2>Pedidos</h2><p>Llegan solos, con sonido. Tocá el botón para avanzar cada pedido.</p></div>
      </div>
      <div className="chips">
        {Object.entries(FILTERS).map(([key, f]) => (
          <button key={key} className={`chip${filter === key ? " on" : ""}`} onClick={() => setFilter(key)}>
            {f.label} <span className="n">{orders.filter((o) => f.states.includes(o.estado)).length}</span>
          </button>
        ))}
      </div>
      <div className="orders">
        {list.length ? list.map((o) => <OrderCard key={`${o.id}-${o.estado}`} order={o} onChange={changeState} />) : (
          <div className="empty" style={{ gridColumn: "1/-1" }}>
            <div>{filter === "activos" ? "😌" : "🗂️"}</div>
            {filter === "activos" ? "No hay pedidos pendientes. Cuando llegue uno, suena." : "No hay pedidos acá."}
          </div>
        )}
      </div>
    </>
  );
}
