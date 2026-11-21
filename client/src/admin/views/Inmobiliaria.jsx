// =====================================================================
//  INMOBILIARIA PANEL · Datos y contacto (solo dueño)
//  Nombre, eslogan, WhatsApp, Instagram y la lista de servicios que
//  se muestran en la página.
// =====================================================================

import { useState } from "react";
import { api } from "../../api.js";
import { prettyWhatsapp } from "../../lib/format.js";
import { useAdmin } from "../state.js";
import { useShowError, SaveBar } from "../ui.jsx";

export function Inmobiliaria() {
  const { settings, setSettings } = useAdmin();
  const showError = useShowError();
  const [info, setInfo] = useState(() => ({ ...settings.inmobiliaria }));
  const [servicios, setServicios] = useState(() => (settings.inmobiliaria?.servicios || []).join("\n"));
  const [error, setError] = useState("");
  // ¿Hay algo distinto a lo guardado?
  const serviceList = servicios.split("\n").map((x) => x.trim()).filter(Boolean);
  const dirty = JSON.stringify({ ...info, servicios: serviceList }) !== JSON.stringify(settings.inmobiliaria);
  const field = (key) => ({ value: info[key] ?? "", onChange: (e) => setInfo({ ...info, [key]: e.target.value }) });

  async function save() {
    const value = {
      ...info,
      nombre: (info.nombre || "").trim(),
      whatsapp: (info.whatsapp || "").replace(/\D/g, ""),
      instagram: (info.instagram || "").trim().replace(/^@/, ""),
      email: (info.email || "").trim().toLowerCase(),
      servicios: servicios.split("\n").map((s) => s.trim()).filter(Boolean),
    };
    if (!value.nombre) { setError("Falta el nombre."); return false; }
    if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) { setError("Revisá el email."); return false; }
    if (value.whatsapp.length < 8) { setError("El WhatsApp tiene que tener el código de país. Ej: 59899787834"); return false; }
    setError("");
    try {
      await api.saveSetting("inmobiliaria", value);
      setSettings((s) => ({ ...s, inmobiliaria: value }));
      setInfo(value);
      return true;
    } catch (e) {
      showError(e);
      return false;
    }
  }

  return (
    <>
      <div className="view-head"><div><h2>Datos y contacto</h2><p>Lo que se ve arriba y abajo de la página.</p></div></div>
      <section className="card stack" style={{ maxWidth: 640 }}>
        <div className="grid2">
          <div className="field"><label htmlFor="sName">Nombre</label><input id="sName" placeholder="Ej: JTC" {...field("nombre")} /></div>
          <div className="field"><label htmlFor="sSub">Debajo del nombre</label><input id="sSub" placeholder="Ej: Ventas y alquileres" {...field("subtitulo")} /></div>
        </div>
        <div className="field"><label htmlFor="sSlogan">Frase</label><input id="sSlogan" {...field("eslogan")} /></div>
        <div className="field"><label htmlFor="sDesc">Qué hacen</label><input id="sDesc" {...field("descripcion")} /></div>
        <div className="grid2">
          <div className="field"><label htmlFor="sWa">WhatsApp (con 598)</label>
            <input id="sWa" inputMode="tel" placeholder="59899787834" {...field("whatsapp")} />
            <span className="small muted">{prettyWhatsapp(info.whatsapp)}</span></div>
          <div className="field"><label htmlFor="sIg">Instagram (usuario)</label><input id="sIg" placeholder="jtcventasyalquileres" {...field("instagram")} /></div>
        </div>
        <div className="field"><label htmlFor="sMail">Email (para el botón "Consultar")</label>
          <input id="sMail" type="email" inputMode="email" placeholder="jtcventasyalquileres@gmail.com" {...field("email")} /></div>
        <div className="field"><label htmlFor="sServ">Servicios (uno por renglón)</label>
          <textarea id="sServ" rows={6} value={servicios} onChange={(e) => setServicios(e.target.value)} /></div>
        <div className="error-text">{error}</div>
        <SaveBar label="Guardar cambios" onSave={save} dirty={dirty} confirmText="Se van a cambiar los datos de la inmobiliaria. Se ven en la página al instante." />
      </section>
    </>
  );
}
