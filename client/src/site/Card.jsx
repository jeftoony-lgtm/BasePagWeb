// =====================================================================
//  INMOBILIARIA · Tarjeta de una propiedad
//  Foto de portada (con "EN VENTA / EN ALQUILER" y el cartel de vendida,
//  reservada o próximamente), título, precio, dónde queda, datos con
//  íconos y los botones para consultar por email, WhatsApp o llamar.
//  La usan la página y el panel (vista previa). Estilos en styles/card.css.
// =====================================================================

import { OPERACIONES, TIPOS, price, ribbon, cerrada, lugar, rebajado, precioAnterior, refCode, shareLink, whatsappLink, mailLink, telLink } from "../lib/format.js";
import { PinIcon, MailIcon, PhoneIcon, WhatsappIcon, quickFacts } from "./icons.jsx";

export function Brand({ info }) {
  return (
    <span className="brand">
      <svg aria-hidden="true"><use href="#logo" /></svg>
      <span><b>{info?.nombre || "Inmobiliaria"}</b>{info?.subtitulo && <small>{info.subtitulo}</small>}</span>
    </span>
  );
}

/** Links para consultar por una propiedad (el mensaje ya va escrito, con el link a la publicación) */
export function contactLinks(p, info) {
  const donde = lugar(p);
  const code = refCode(p, info?.nombre);
  // El código va primero: aunque la persona borre el resto, la dueña sabe de qué propiedad le hablan
  const message = `Hola! Consulto por la propiedad${code ? ` Ref. ${code}` : ""}: "${p.titulo}"${donde ? ` (${donde})` : ""}. ${shareLink(p)}`;
  return {
    whatsapp: info?.whatsapp ? whatsappLink(info.whatsapp, message) : "",
    email: info?.email ? mailLink(info.email, `Consulta${code ? ` Ref. ${code}` : ""}: ${p.titulo}`, message) : "",
    phone: info?.whatsapp ? telLink(info.whatsapp) : "",
  };
}

/** Los tres botones: Consultar (email), WhatsApp y llamar. Solo aparecen los que tienen dato */
export function ContactButtons({ property, info, big = false }) {
  const links = contactLinks(property, info);
  return (
    <div className={`contact-buttons${big ? " big" : ""}`}>
      {links.email && <a className="cbtn cbtn-mail" href={links.email}><MailIcon /> Consultar</a>}
      {links.whatsapp && <a className="cbtn cbtn-wa" href={links.whatsapp} target="_blank" rel="noopener"><WhatsappIcon /> WhatsApp</a>}
      {links.phone && <a className="cbtn cbtn-call" href={links.phone} aria-label="Llamar" title="Llamar"><PhoneIcon />{big && " Llamar"}</a>}
    </div>
  );
}

/** Cartel "Precio rebajado" (con una flechita para abajo) */
export function PriceDropBadge({ inline = false }) {
  return (
    <span className={`price-drop${inline ? " inline" : ""}`}>
      <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7l6 6 4-4 8 8M21 11v6h-6" />
      </svg>
      Precio rebajado
    </span>
  );
}

export function PropertyCard({ property: p, info, onOpen }) {
  const cover = p.fotos?.[0];
  const sign = ribbon(p);
  const facts = quickFacts(p);
  const zona = [p.barrio, p.ciudad].filter(Boolean).join(", ") || p.departamento;
  // Toda la tarjeta (menos los botones de contacto) abre la ficha
  const Open = onOpen ? "button" : "div";

  return (
    <article className={`pcard${cerrada(p) ? " closed" : ""}`}>
      <Open type={onOpen ? "button" : undefined} className="pcard-open" onClick={onOpen} aria-label={onOpen ? `Ver ${p.titulo}` : undefined}>
        <div className="pcard-photo">
          {cover ? <img src={cover} alt="" loading="lazy" /> : <div className="pcard-empty"><svg aria-hidden="true"><use href="#logo" /></svg></div>}
          <div className="pcard-top">
            <span className="pcard-op">{OPERACIONES[p.operacion]}</span>
            <Brand info={info} />
          </div>
          {sign && <span className={`pcard-ribbon${p.estado === "proximamente" ? " soon" : ""}`}>{sign}</span>}
          {p.fotos?.length > 1 && <span className="pcard-count">📷 {p.fotos.length}</span>}
          {rebajado(p) && <PriceDropBadge />}
        </div>

        <div className="pcard-body">
          <h3 className="pcard-title">{p.titulo}</h3>
          <div className="pcard-price">
            <b>{price(p)}</b>
            {rebajado(p) && <s className="price-before" aria-label={`Antes ${precioAnterior(p)}`}>{precioAnterior(p)}</s>}
            <span className="pcard-badge">{p.operacion === "alquiler" ? "Alquiler" : "Venta"}</span>
          </div>
          <p className="pcard-where">
            {zona && <span><PinIcon /> {zona}</span>}
            <span>{TIPOS[p.tipo]}</span>
            {p.ref != null && <span className="pcard-ref">Ref. {refCode(p, info?.nombre)}</span>}
          </p>
          {facts.length > 0 && (
            <ul className="pcard-facts">
              {facts.map(({ Icon, value, label }) => <li key={label} title={`${value} ${label}`}><Icon /> {value}</li>)}
            </ul>
          )}
        </div>
      </Open>
      <ContactButtons property={p} info={info} />
    </article>
  );
}
