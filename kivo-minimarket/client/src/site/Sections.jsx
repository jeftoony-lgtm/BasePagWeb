// =====================================================================
//  KIVO · Encargos especiales, Visitanos (horarios + mapa) y pie de página
// =====================================================================

import { useStore } from "./store.jsx";
import { useAddToCart } from "./cart.jsx";
import { StatusText } from "./Topbar.jsx";
import { DAY_NAMES, nowInUruguay } from "../lib/schedule.js";
import { paymentStyle } from "../lib/payments.js";

/* ---------- Encargos especiales ---------- */
const SPECIAL = [
  { id: "enc-picada", emoji: "⚽🧀", title: "Picada para el partido", text: "Fiambres, quesos, snacks y bebidas para el grupo. Decinos cuántos son y la armamos." },
  { id: "enc-cumple", emoji: "🎂🎈", title: "Cumpleaños", text: "Bebidas, snacks, vasos y todo lo del cumple, listo para pasar a buscar." },
  { id: "enc-asado", emoji: "🔥🥩", title: "Pack asado", text: "Carbón, pan, chorizos, bebidas y lo que falte para el fuego del finde." },
];

export function Encargos() {
  const addToCart = useAddToCart();
  return (
    <section className="block" id="encargos">
      <div className="reveal">
        <span className="eyebrow">Encargos especiales</span>
        <h2 className="h2">¿Tenés algo <em>planeado</em>?</h2>
        <p className="lead">Encargalo con tiempo, elegí el día y la hora, y te lo dejamos armado para retirar.</p>
      </div>
      <div className="orders">
        {SPECIAL.map((s) => (
          <article className="order-card reveal" key={s.id}>
            <div className="emo">{s.emoji}</div>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
            <button className="btn btn-green" onClick={(e) => addToCart(s.id, e.currentTarget)}>Encargar</button>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------- Tabla de horarios ---------- */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // la tabla arranca el lunes
const pretty = (hhmm) => (hhmm === "24:00" ? "00:00" : hhmm);

/** Agrupa días seguidos con el mismo horario: "Lunes a miércoles", "Jueves y viernes"... */
function groupDays(horarios) {
  const key = (day) => JSON.stringify(horarios[day] || []);
  const groups = [];
  for (const day of WEEK_ORDER) {
    const last = groups[groups.length - 1];
    if (last && key(last.days[last.days.length - 1]) === key(day)) last.days.push(day);
    else groups.push({ days: [day], shifts: horarios[day] || [] });
  }
  return groups;
}

function groupLabel(days) {
  const names = days.map((d) => DAY_NAMES[d]);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} y ${names[1].toLowerCase()}`;
  return `${names[0]} a ${names[names.length - 1].toLowerCase()}`;
}

function HoursTable() {
  const horarios = useStore().settings.horarios || {};
  const today = nowInUruguay().day;
  const withBreak = WEEK_ORDER.some((d) => (horarios[d] || []).length > 1);
  return (
    <>
      <table id="hoursTable">
        <tbody>
          {groupDays(horarios).map(({ days, shifts }) => (
            <tr key={days.join()} className={days.includes(today) ? "today" : ""}>
              <td>{groupLabel(days)}</td>
              <td>{shifts.length
                ? shifts.map(([open, close]) => <span key={open}>{pretty(open)} – {pretty(close)}</span>)
                : <span>Cerrado</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Si algún día tiene corte al mediodía, lo aclaramos abajo */}
      <p className="pause" id="hoursNote">{withBreak ? "Los días con dos turnos cerramos un rato al mediodía." : ""}</p>
    </>
  );
}

/* ---------- Visitanos ---------- */
export function Visit({ status }) {
  return (
    <section className="block" id="visitanos" style={{ paddingTop: 10 }}>
      <div className="reveal">
        <span className="eyebrow">Visitanos</span>
        <h2 className="h2">Estamos a la <em>vuelta</em></h2>
      </div>
      <div className="visit">
        <div className="hours reveal">
          <div className="big-status"><StatusText status={status} /></div>
          <HoursTable />
        </div>
        <div className="mapcard reveal">
          <svg viewBox="0 0 400 220" aria-label="Mapa de la esquina">
            <rect width="400" height="220" fill="#e6eddc" />
            <g fill="#d3dec4"><rect x="20" y="20" width="140" height="70" rx="8" /><rect x="240" y="20" width="140" height="70" rx="8" /><rect x="20" y="140" width="140" height="60" rx="8" /><rect x="240" y="140" width="140" height="60" rx="8" /></g>
            <rect x="0" y="100" width="400" height="30" fill="#fff" /><rect x="180" y="0" width="40" height="220" fill="#fff" />
            <text x="300" y="120" fontSize="11" fontWeight="700" fill="#8a948a" fontFamily="Plus Jakarta Sans">Paul Harris</text>
            <text x="196" y="60" fontSize="11" fontWeight="700" fill="#8a948a" fontFamily="Plus Jakarta Sans" transform="rotate(-90 196 60)">Oscar Gestido</text>
            <g transform="translate(222 58)"><path d="M0 0c-14 0-24 10-24 24 0 18 24 40 24 40s24-22 24-40C24 10 14 0 0 0z" fill="#e8952f" /><circle cy="24" r="12" fill="#fff" /><use href="#cart" x="-10" y="14" width="20" height="20" /></g>
          </svg>
          <address>Oscar Gestido esq. Paul Harris, C.78 · Solymar</address>
          <div className="actions">
            <a className="btn btn-green" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=Oscar%20Gestido%20y%20Paul%20Harris%2C%20Solymar%2C%20Canelones">📍 Cómo llegar</a>
            <a className="btn btn-ghost" target="_blank" rel="noopener" href="https://www.instagram.com/kivominimarkets/">📸 @kivominimarkets</a>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Una "tarjetita" con el nombre del medio de pago, en su color */
function PaymentBadge({ name }) {
  const m = paymentStyle(name);
  return (
    <li className={`pay${m.italic ? " italic" : ""}`} style={{ "--pay": m.color }}>
      {m.dots && <span className="dots" aria-hidden="true"><i /><i /></span>}
      {m.icon && <span aria-hidden="true">{m.icon}</span>}
      {m.name}
    </li>
  );
}

export function Footer() {
  const pagos = useStore().settings.pagos || [];
  return (
    <footer className="footer">
      {pagos.length > 0 && (
        <div className="payments">
          <h4>Medios de pago</h4>
          <ul aria-label="Medios de pago que aceptamos">{pagos.map((name) => <PaymentBadge key={name} name={name} />)}</ul>
        </div>
      )}
      <div className="inner">
        <a className="brand" href="#top"><svg><use href="#cart" /></svg><b>KIV<i>O</i></b></a>
        <div>Mini Market · Solymar, Canelones<br /><a href="https://www.instagram.com/kivominimarkets/" target="_blank" rel="noopener">@kivominimarkets</a></div>
        {/* Para el dueño y el personal: lleva a la pantalla de entrar del panel */}
        <a className="staff-link" href="/admin.html">🔑 Acceso del local</a>
      </div>
    </footer>
  );
}
