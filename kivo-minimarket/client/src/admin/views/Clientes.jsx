// =====================================================================
//  KIVO PANEL · Clientes (solo dueño)
//  Los que jugaron la ruleta. Se pueden copiar los celulares de los que
//  aceptaron promos o bajar la lista para Excel.
// =====================================================================

import { useEffect, useState } from "react";
import { api } from "../../api.js";
import { formatDate, dayKey, timeAgo, prettyPhone } from "../../lib/format.js";
import { useToast, useShowError, Switch } from "../ui.jsx";

const lastSpin = (c) => (c.giros || []).slice(-1)[0] || {};

function downloadCsv(customers) {
  const header = ["Nombre", "Celular", "Acepta promos", "Se registró", "Último premio", "Código", "Canjeado"];
  const rows = customers.map((c) => {
    const spin = lastSpin(c);
    return [c.nombre, prettyPhone(c.telefono), c.acepta_promos ? "Sí" : "No",
      formatDate(c.created_at, { day: "2-digit", month: "2-digit", year: "numeric" }),
      spin.premio || "—", spin.code || "", spin.canjeado_at ? "Sí" : "No"];
  });
  // ";" y el BOM (﻿) para que Excel en español lo abra bien con tildes
  const csv = "﻿" + [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = `clientes-kivo-${dayKey(new Date())}.csv`;
  link.click();
}

export function Clientes() {
  const toast = useToast();
  const showError = useShowError();
  const [customers, setCustomers] = useState(null);
  const [search, setSearch] = useState("");
  const [onlyPromos, setOnlyPromos] = useState(false);

  useEffect(() => {
    api.customers().then(setCustomers, (error) => { showError(error); setCustomers([]); });
  }, [showError]);

  if (!customers) return <div className="loading">Cargando clientes…</div>;

  async function copyPhones() {
    const list = customers.filter((c) => c.acepta_promos);
    try {
      await navigator.clipboard.writeText(list.map((c) => `${c.nombre}\t${prettyPhone(c.telefono)}`).join("\n"));
      toast(`Copiados ${list.length} contactos que aceptan promos`);
    } catch {
      toast("No se pudo copiar", true);
    }
  }

  const query = search.trim().toLowerCase();
  const digits = query.replace(/\D/g, "");
  const list = customers.filter((c) =>
    (!onlyPromos || c.acepta_promos) &&
    (!query || c.nombre.toLowerCase().includes(query) || (digits && c.telefono.includes(digits))));

  return (
    <>
      <div className="view-head">
        <div><h2>Clientes</h2><p>Los que jugaron la ruleta. Solo vos ves esta lista.</p></div>
        <div className="row">
          <button className="btn btn-ghost btn-sm" onClick={copyPhones}>📋 Copiar celulares</button>
          <button className="btn btn-ghost btn-sm" onClick={() => downloadCsv(customers)}>⬇ Descargar Excel (CSV)</button>
        </div>
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        <input className="input" placeholder="🔎 Buscar por nombre o celular" value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
        <Switch label="Solo los que aceptan promos" checked={onlyPromos} onChange={setOnlyPromos} />
      </div>

      {!list.length ? (
        <div className="empty"><div>👥</div>{customers.length ? "Nadie coincide con la búsqueda." : "Todavía no hay clientes. Aparecen cuando alguien gira la ruleta."}</div>
      ) : (
        <>
          <p className="small muted" style={{ marginBottom: 8 }}>{list.length} cliente{list.length === 1 ? "" : "s"}</p>
          <table className="table">
            <thead><tr><th>Nombre</th><th>Celular</th><th>Último premio</th><th>Estado</th></tr></thead>
            <tbody>
              {list.map((c) => {
                const spin = lastSpin(c);
                const status = !spin.premio ? <span className="tag t-no">No ganó</span>
                  : spin.canjeado_at ? <span className="tag t-ok">Canjeado</span>
                  : <span className="tag t-pend">Sin canjear</span>;
                return (
                  <tr key={c.id}>
                    <td><b>{c.nombre}</b><br /><span className="small muted">{timeAgo(c.created_at)}{c.acepta_promos ? " · ✅ promos" : ""}</span></td>
                    <td>{prettyPhone(c.telefono)}</td>
                    <td>{spin.premio || "—"}{spin.code && <><br /><span className="small muted">{spin.code}</span></>}</td>
                    <td>{status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}
