// =====================================================================
//  LUZ SERENA · "Visitanos"
//  Formulario para agendar una visita (llega al panel, en Consultas),
//  datos de contacto y mapa.
// =====================================================================

import { useState } from "react";
import { api } from "../api.js";
import { CONTACT, prettyWa, waLink } from "./content.jsx";
import { useSite } from "./store.jsx";
import { SectionHead } from "./Sections.jsx";
import { Icon, WaIcon } from "./icons.jsx";

const PARA = ["Mamá", "Papá", "Abuela/o", "Otro familiar", "Para mí"];
const DIAS = ["Cualquier día", "Lunes a viernes, de mañana", "Lunes a viernes, de tarde", "Fin de semana"];

function VisitForm() {
  const { settings } = useSite();
  const [form, setForm] = useState({ nombre: "", telefono: "", dia: DIAS[0], para: PARA[0], mensaje: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const field = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) });

  async function onSubmit(event) {
    event.preventDefault();
    if (!form.nombre.trim()) return setError("Escribí tu nombre, por favor.");
    if (form.telefono.replace(/\D/g, "").length < 8) return setError("Revisá el teléfono: tiene que tener al menos 8 números.");
    setBusy(true);
    setError("");
    try {
      await api.sendLead(form);
      setSent(true);
    } catch (e) {
      setError(`${e.message} Si preferís, escribinos por WhatsApp.`);
    }
    setBusy(false);
  }

  if (sent) {
    const text = `Hola, soy ${form.nombre.trim()}. Dejé mis datos en la web para agendar una visita (es para ${form.para.toLowerCase()}). Mi teléfono: ${form.telefono}.`;
    return (
      <div className="ok show" role="status">
        <Icon name="check" />
        <h3>¡Gracias! Ya recibimos tus datos.</h3>
        <p style={{ color: "var(--muted)" }}>Te vamos a llamar a la brevedad para coordinar. Si preferís, avisanos también por WhatsApp:</p>
        <a className="btn btn-wa" href={waLink(settings.whatsapp, text)} target="_blank" rel="noopener"><WaIcon /> Avisar por WhatsApp</a>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit}>
      <div className="field"><label htmlFor="vName">Tu nombre</label><input id="vName" autoComplete="name" placeholder="Ej.: Laura Pereira" {...field("nombre")} /></div>
      <div className="row2">
        <div className="field"><label htmlFor="vPhone">Tu teléfono o celular</label><input id="vPhone" type="tel" inputMode="tel" autoComplete="tel" placeholder="09X XXX XXX" {...field("telefono")} /></div>
        <div className="field"><label htmlFor="vDay">¿Qué día te queda mejor?</label><select id="vDay" {...field("dia")}>{DIAS.map((d) => <option key={d}>{d}</option>)}</select></div>
      </div>
      <div className="field"><label id="whoL">¿Para quién es?</label>
        <div className="who" role="radiogroup" aria-labelledby="whoL">
          {PARA.map((p) => (
            <label key={p}><input type="radio" name="para" value={p} checked={form.para === p} onChange={() => setForm({ ...form, para: p })} /><span>{p}</span></label>
          ))}
        </div>
      </div>
      <div className="field"><label htmlFor="vMsg">¿Algo que quieras contarnos? <span style={{ fontWeight: 400, color: "var(--muted)" }}>(opcional)</span></label>
        <textarea id="vMsg" placeholder="Ej.: usa andador, necesita dieta para diabéticos…" {...field("mensaje")} /></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="btn btn-gold" style={{ width: "100%" }} type="submit" disabled={busy}>{busy ? "Enviando…" : "Quiero agendar una visita"}</button>
    </form>
  );
}

export function Visita() {
  const { settings, wa } = useSite();
  const tel = settings.telefono || "";
  const mapQuery = encodeURIComponent(CONTACT.mapa);
  return (
    <section className="sec" id="visita" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <SectionHead eyebrow="Visitanos" title={<>Vení a conocernos, <em>te esperamos</em>.</>} text="Dejanos tus datos y te llamamos para coordinar el día. Lleva menos de un minuto." />
        <div className="visit">
          <div className="card rv"><VisitForm /></div>
          <div className="card rv">
            <ul className="info-list">
              <li><Icon name="pin" /><div><b>{CONTACT.direccion}</b><br /><span className="soft">{CONTACT.ciudad}</span></div></li>
              <li><Icon name="phone" /><div>WhatsApp <a {...wa("Hola Luz Serena, quisiera información.")}>{prettyWa(settings.whatsapp)}</a>{tel && <><br />Teléfono <a href={`tel:+598${tel.replace(/\D/g, "").replace(/^0/, "")}`}>{tel}</a></>}</div></li>
              <li><Icon name="ig" /><div><a href={`https://www.instagram.com/${CONTACT.instagram}/`} target="_blank" rel="noopener">@{CONTACT.instagram}</a><br /><span className="soft">Seguinos para ver el día a día</span></div></li>
            </ul>
            <div className="map"><iframe title="Mapa: Luz Serena Residencial" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}></iframe></div>
            <a className="btn btn-ghost btn-sm" style={{ marginTop: 12, width: "100%" }} href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`} target="_blank" rel="noopener">Cómo llegar</a>
          </div>
        </div>
      </div>
    </section>
  );
}
