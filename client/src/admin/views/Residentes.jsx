// =====================================================================
//  LUZ SERENA PANEL · Residentes
//  Ficha simple de cada residente: habitación, fechas, familiar de
//  contacto y observaciones (gustos, dieta, cuidados).
// =====================================================================

import { useState } from "react";
import { api } from "../../api.js";
import { useAdmin, niceDay } from "../state.js";
import { useModal, useToast, useShowError, SheetHead } from "../ui.jsx";

const EMPTY = { nombre: "", habitacion: "", nacimiento: "", ingreso: "", familiar: "", telefono_familiar: "", observaciones: "" };

function ResidentForm({ resident }) {
  const { setResidents, isOwner } = useAdmin();
  const { close, confirm } = useModal();
  const toast = useToast();
  const showError = useShowError();
  const [form, setForm] = useState({ ...EMPTY, ...resident });
  const [busy, setBusy] = useState(false);
  const field = (key) => ({ value: form[key] || "", onChange: (e) => setForm({ ...form, [key]: e.target.value }) });

  async function onSubmit(event) {
    event.preventDefault();
    if (!form.nombre.trim()) return toast("Falta el nombre", true);
    setBusy(true);
    try {
      const saved = await api.saveResident(form);
      setResidents((list) => (resident?.id ? list.map((r) => (r.id === saved.id ? saved : r)) : [...list, saved]));
      close();
      toast("Residente guardado ✓");
    } catch (e) { showError(e); setBusy(false); }
  }

  async function remove() {
    if (!(await confirm("¿Quitar de la lista?", `Se borra la ficha de ${resident.nombre}.`, "Quitar"))) return;
    try {
      await api.deleteResident(resident.id);
      setResidents((list) => list.filter((r) => r.id !== resident.id));
      toast("Ficha borrada");
    } catch (e) { showError(e); }
  }

  return (
    <>
      <SheetHead title={resident?.id ? "Editar residente" : "Nuevo residente"} />
      <form noValidate onSubmit={onSubmit}>
        <div className="form-grid">
          <div className="field full"><label htmlFor="rNombre">Nombre y apellido</label><input id="rNombre" autoFocus {...field("nombre")} /></div>
          <div className="field"><label htmlFor="rHab">Habitación</label><input id="rHab" {...field("habitacion")} /></div>
          <div className="field"><label htmlFor="rNac">Fecha de nacimiento</label><input id="rNac" type="date" {...field("nacimiento")} /></div>
          <div className="field"><label htmlFor="rIng">Fecha de ingreso</label><input id="rIng" type="date" {...field("ingreso")} /></div>
          <div className="field"><label htmlFor="rFam">Familiar de contacto</label><input id="rFam" placeholder="Ej.: Hija · Ana" {...field("familiar")} /></div>
          <div className="field full"><label htmlFor="rTel">Teléfono del familiar</label><input id="rTel" type="tel" {...field("telefono_familiar")} /></div>
          <div className="field full"><label htmlFor="rObs">Observaciones (gustos, dieta, cuidados)</label><textarea id="rObs" rows="3" {...field("observaciones")} /></div>
        </div>
        <div className="row">
          <button className="btn btn-gold" type="submit" disabled={busy}>Guardar</button>
          {resident?.id && isOwner && <button type="button" className="btn btn-ghost danger-text" onClick={remove}>Quitar residente</button>}
        </div>
      </form>
    </>
  );
}

export function Residentes() {
  const { residents } = useAdmin();
  const { open } = useModal();
  const sorted = [...residents].sort((a, b) => String(a.habitacion).localeCompare(String(b.habitacion), "es", { numeric: true }));

  return (
    <>
      <div className="view-head">
        <div><h2>Residentes</h2><p>{residents.length} residentes cargados.</p></div>
        <button className="btn btn-gold btn-sm" onClick={() => open(<ResidentForm />)}>+ Agregar residente</button>
      </div>
      <section className="card table-wrap">
        <table className="table">
          <thead><tr><th>Residente</th><th>Hab.</th><th>Ingreso</th><th>Familiar de contacto</th><th>Observaciones</th><th></th></tr></thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id}>
                <td><b>{r.nombre}</b>{r.nacimiento && <><br /><small className="muted">Nació el {niceDay(r.nacimiento, { day: "numeric", month: "numeric", year: "numeric" })}</small></>}</td>
                <td>{r.habitacion}</td>
                <td>{niceDay(r.ingreso, { day: "numeric", month: "numeric", year: "numeric" })}</td>
                <td>{r.familiar}{r.telefono_familiar && <><br /><a href={`tel:${r.telefono_familiar.replace(/\s/g, "")}`}>{r.telefono_familiar}</a></>}</td>
                <td className="obs">{r.observaciones}</td>
                <td><button className="mini-btn" onClick={() => open(<ResidentForm resident={r} />)}>Editar</button></td>
              </tr>
            ))}
            {!sorted.length && <tr><td colSpan="6" className="muted">Todavía no hay residentes cargados.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}
