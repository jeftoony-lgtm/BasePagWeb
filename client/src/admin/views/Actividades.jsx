// =====================================================================
//  LUZ SERENA PANEL · Actividades de la semana
//  Lo que se carga acá se ve en la página, en "Una semana en Luz Serena".
// =====================================================================

import { useState } from "react";
import { api } from "../../api.js";
import { useAdmin } from "../state.js";
import { useShowError, SaveBar } from "../ui.jsx";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function Actividades() {
  const { settings, setSettings } = useAdmin();
  const showError = useShowError();
  const [agenda, setAgenda] = useState(() => structuredClone(settings.agenda || {}));

  const change = (day, i, key, value) => setAgenda((a) => ({ ...a, [day]: (a[day] || []).map((x, j) => (j === i ? { ...x, [key]: value } : x)) }));
  const add = (day) => setAgenda((a) => ({ ...a, [day]: [...(a[day] || []), { hora: "", titulo: "", detalle: "" }] }));
  const remove = (day, i) => setAgenda((a) => ({ ...a, [day]: (a[day] || []).filter((_, j) => j !== i) }));

  async function save() {
    const clean = Object.fromEntries(ORDER.map((d) => [d, (agenda[d] || [])
      .map((x) => ({ hora: x.hora, titulo: x.titulo.trim(), detalle: (x.detalle || "").trim() }))
      .filter((x) => x.titulo)
      .sort((a, b) => a.hora.localeCompare(b.hora))]));
    try {
      await api.saveSetting("agenda", clean);
      setAgenda(clean);
      setSettings((s) => ({ ...s, agenda: clean }));
      return true;
    } catch (e) { showError(e); return false; }
  }

  return (
    <>
      <div className="view-head">
        <div><h2>Actividades de la semana</h2><p>Lo que cargues acá se ve en la sección «Una semana en Luz Serena».</p></div>
        <SaveBar label="Guardar cambios" onSave={save} />
      </div>
      {ORDER.map((d) => (
        <section className="day-ed" key={d}>
          <h4>{DAYS[d]}</h4>
          {(agenda[d] || []).map((a, i) => (
            <div className="act-row" key={i}>
              <input type="time" value={a.hora} aria-label="Hora" onChange={(e) => change(d, i, "hora", e.target.value)} />
              <input value={a.titulo} placeholder="Actividad" aria-label="Actividad" onChange={(e) => change(d, i, "titulo", e.target.value)} />
              <input value={a.detalle || ""} placeholder="Detalle (opcional)" aria-label="Detalle" className="opt" onChange={(e) => change(d, i, "detalle", e.target.value)} />
              <button className="mini-btn danger" aria-label="Quitar" onClick={() => remove(d, i)}>✕</button>
            </div>
          ))}
          <button className="mini-btn" onClick={() => add(d)}>+ Agregar actividad</button>
        </section>
      ))}
    </>
  );
}
