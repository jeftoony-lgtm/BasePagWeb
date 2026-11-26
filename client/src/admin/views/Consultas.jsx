// =====================================================================
//  LUZ SERENA PANEL · Consultas
//  Las familias que pidieron una visita desde la página. Se les cambia
//  el estado, se anotan cosas y se les escribe o llama con un toque.
// =====================================================================

import { useState } from "react";
import { api } from "../../api.js";
import { dayKey } from "../../lib/format.js";
import { useAdmin, LEAD_STATES, waTo, niceDay } from "../state.js";
import { useModal, useToast, useShowError } from "../ui.jsx";

function exportCsv(leads) {
  const rows = [["Fecha", "Nombre", "Teléfono", "Para", "Día preferido", "Mensaje", "Estado", "Nota"],
    ...leads.map((l) => [dayKey(l.created_at), l.nombre, l.telefono, l.para, l.dia, l.mensaje, LEAD_STATES[l.estado], l.nota])];
  const csv = "﻿" + rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = "consultas-luz-serena.csv";
  link.click();
}

function LeadCard({ lead }) {
  const { setLeads, isOwner } = useAdmin();
  const { confirm } = useModal();
  const toast = useToast();
  const showError = useShowError();
  const [nota, setNota] = useState(lead.nota);

  async function update(changes, message) {
    try {
      const saved = await api.updateLead(lead.id, changes);
      setLeads((list) => list.map((l) => (l.id === saved.id ? saved : l)));
      toast(message);
    } catch (e) { showError(e); }
  }

  async function remove() {
    if (!(await confirm("¿Borrar esta consulta?", `Se borra la consulta de ${lead.nombre}. No se puede deshacer.`, "Borrar"))) return;
    try {
      await api.deleteLead(lead.id);
      setLeads((list) => list.filter((l) => l.id !== lead.id));
      toast("Consulta borrada");
    } catch (e) { showError(e); }
  }

  return (
    <div className="lead-card">
      <div>
        <h4>{lead.nombre} <span className={`pill st-${lead.estado}`}>{LEAD_STATES[lead.estado]}</span></h4>
        <div className="meta">Para {lead.para.toLowerCase() || "un familiar"} · {niceDay(dayKey(lead.created_at))} · Prefiere: {lead.dia || "cualquier día"} · {lead.telefono}</div>
        {lead.mensaje && <p className="msg">“{lead.mensaje}”</p>}
        <input className="note" value={nota} placeholder="Agregar una nota (ej.: llamar el jueves)" aria-label="Nota"
          onChange={(e) => setNota(e.target.value)} onBlur={() => nota !== lead.nota && update({ nota }, "Nota guardada")} />
      </div>
      <div className="acts">
        <select value={lead.estado} aria-label="Estado" onChange={(e) => update({ estado: e.target.value }, "Estado actualizado")}>
          {Object.entries(LEAD_STATES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <a className="mini-btn" href={`tel:${lead.telefono.replace(/\s/g, "")}`}>📞 Llamar</a>
        <a className="mini-btn wa" target="_blank" rel="noopener" href={waTo(lead.telefono, `Hola ${lead.nombre.split(" ")[0]}, te escribimos de Luz Serena Residencial por tu consulta para agendar una visita.`)}>WhatsApp</a>
        {isOwner && <button className="mini-btn danger" onClick={remove} aria-label="Borrar consulta">🗑️</button>}
      </div>
    </div>
  );
}

export function Consultas() {
  const { leads } = useAdmin();
  const [query, setQuery] = useState("");
  const [state, setState] = useState("");
  const q = query.trim().toLowerCase();
  const list = leads.filter((l) => (!state || l.estado === state) && (l.nombre.toLowerCase().includes(q) || l.telefono.includes(q)));

  return (
    <>
      <div className="view-head">
        <div><h2>Consultas</h2><p>Familias que pidieron una visita desde la página.</p></div>
        <button className="btn btn-ghost btn-sm" onClick={() => exportCsv(leads)}>⬇ Descargar para Excel</button>
      </div>
      <div className="toolbar">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o teléfono" aria-label="Buscar" />
        <select value={state} onChange={(e) => setState(e.target.value)} aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          {Object.entries(LEAD_STATES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {list.length ? list.map((l) => <LeadCard key={l.id} lead={l} />) : <div className="empty">No hay consultas con ese filtro.</div>}
    </>
  );
}
