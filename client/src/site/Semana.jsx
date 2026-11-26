// =====================================================================
//  LUZ SERENA · "Una semana en Luz Serena"
//  Las actividades de cada día (las carga el equipo desde el panel).
//  Arranca mostrando el día de hoy.
// =====================================================================

import { useState } from "react";
import { DAYS, WEEK_ORDER } from "./content.js";
import { useSite } from "./store.jsx";
import { SectionHead } from "./Sections.jsx";

export function Semana() {
  const { settings } = useSite();
  const today = new Date().getDay();
  const [day, setDay] = useState(today);
  const items = settings.agenda?.[day] || [];

  return (
    <section className="sec" id="semana" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <SectionHead eyebrow="Actividades" title={<>Una semana en <em>Luz Serena</em>.</>} text="Cada día tiene algo para disfrutar. Tocá un día para ver qué hacemos." />
        <div className="week">
          <div className="rv">
            <div className="days" role="tablist" aria-label="Días de la semana">
              {WEEK_ORDER.map((d) => (
                <button key={d} role="tab" aria-selected={d === day} onClick={() => setDay(d)}>
                  {DAYS[d].slice(0, 3)}<small>{d === today ? "Hoy" : " "}</small>
                </button>
              ))}
            </div>
            <ul className="agenda" key={day}>
              {items.length ? items.map((a, i) => (
                <li key={i} style={{ animationDelay: `${i * 70}ms` }}><b>{a.hora}</b><span>{a.titulo}{a.detalle && <em>{a.detalle}</em>}</span></li>
              )) : <li><b></b><span>Día tranquilo y de descanso.</span></li>}
            </ul>
          </div>
          <div className="week-photo rv">
            <img src="/img/fotos/bandas.jpg" alt="Residentes haciendo ejercicios con bandas elásticas en el jardín" loading="lazy" />
            <div><strong>Moverse es vivir.</strong>Más autonomía, más confianza, más calidad de vida.</div>
          </div>
        </div>
      </div>
    </section>
  );
}
