// =====================================================================
//  LUZ SERENA PANEL · Ajustes (solo dueño)
//  Plazas (cambian el cartel "Plazas disponibles" de la página),
//  WhatsApp y teléfono.
// =====================================================================

import { useState } from "react";
import { api } from "../../api.js";
import { useAdmin } from "../state.js";
import { useShowError, useToast, SaveBar } from "../ui.jsx";

export function Ajustes() {
  const { settings, setSettings } = useAdmin();
  const showError = useShowError();
  const toast = useToast();
  const [plazas, setPlazas] = useState({ total: 20, ocupadas: 0, ...settings.plazas });
  const [whatsapp, setWhatsapp] = useState(settings.whatsapp || "");
  const [telefono, setTelefono] = useState(settings.telefono || "");
  const libres = Math.max(0, Number(plazas.total) - Number(plazas.ocupadas));

  async function savePlazas() {
    const value = { total: Number(plazas.total), ocupadas: Number(plazas.ocupadas) };
    if (value.ocupadas > value.total) { toast("Las ocupadas no pueden ser más que las totales", true); return false; }
    try {
      await api.saveSetting("plazas", value);
      setSettings((s) => ({ ...s, plazas: value }));
      return true;
    } catch (e) { showError(e); return false; }
  }

  async function saveContact() {
    const wa = whatsapp.replace(/\D/g, "");
    if (!/^598\d{8}$/.test(wa)) { toast("El WhatsApp va con 598 y sin el 0. Ej.: 59891411961", true); return false; }
    try {
      await Promise.all([api.saveSetting("whatsapp", wa), api.saveSetting("telefono", telefono.trim())]);
      setSettings((s) => ({ ...s, whatsapp: wa, telefono: telefono.trim() }));
      setWhatsapp(wa);
      return true;
    } catch (e) { showError(e); return false; }
  }

  return (
    <>
      <div className="view-head"><div><h2>Ajustes</h2><p>Datos que se muestran en la página.</p></div></div>
      <div className="grid2" style={{ alignItems: "start" }}>
        <section className="card">
          <h3>Plazas</h3>
          <p className="small muted">La página muestra {libres > 0 ? <b>«Plazas disponibles · {libres}»</b> : <b>«Sin plazas por ahora · lista de espera»</b>}.</p>
          <div className="form-grid">
            <div className="field"><label htmlFor="sTotal">Plazas totales</label><input id="sTotal" type="number" min="1" inputMode="numeric" value={plazas.total} onChange={(e) => setPlazas({ ...plazas, total: e.target.value })} /></div>
            <div className="field"><label htmlFor="sOcup">Plazas ocupadas</label><input id="sOcup" type="number" min="0" inputMode="numeric" value={plazas.ocupadas} onChange={(e) => setPlazas({ ...plazas, ocupadas: e.target.value })} /></div>
          </div>
          <SaveBar label="Guardar plazas" onSave={savePlazas} />
        </section>
        <section className="card">
          <h3>Contacto</h3>
          <div className="field"><label htmlFor="sWa">WhatsApp (con 598 y sin el 0)</label><input id="sWa" inputMode="numeric" placeholder="59891411961" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} /></div>
          <div className="field"><label htmlFor="sTel">Teléfono fijo o celular</label><input id="sTel" type="tel" placeholder="098 794 970" value={telefono} onChange={(e) => setTelefono(e.target.value)} /></div>
          <SaveBar label="Guardar contacto" onSave={saveContact} />
        </section>
      </div>
    </>
  );
}
