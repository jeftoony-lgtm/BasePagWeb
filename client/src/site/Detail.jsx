// =====================================================================
//  INMOBILIARIA · Ficha de una propiedad (ventana grande)
//  Galería de fotos, precio, datos, descripción y botón de WhatsApp.
//  Se abre con #propiedad/<id>, así el link se puede compartir.
// =====================================================================

import { useEffect, useRef, useState } from "react";
import { OPERACIONES, TIPOS, ESTADOS, ORIENTACIONES, CONSERVACION, price, ribbon, cerrada, rebajado, precioAnterior, refCode, whatsappLink, mapEmbed, mapLink, lugar } from "../lib/format.js";
import { ContactButtons, PriceDropBadge } from "./Card.jsx";
import { PinIcon, CheckIcon, quickFacts } from "./icons.jsx";

function Gallery({ fotos }) {
  const [index, setIndex] = useState(0);
  const track = useRef(null);

  const go = (i) => {
    const next = (i + fotos.length) % fotos.length;
    track.current?.children[next]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  };

  // Al deslizar con el dedo, se actualiza qué foto se está viendo
  const onScroll = () => {
    const el = track.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  if (!fotos.length) return <div className="gallery empty"><svg aria-hidden="true"><use href="#logo" /></svg></div>;

  return (
    <div className="gallery">
      <div className="gallery-track" ref={track} onScroll={onScroll}>
        {fotos.map((url, i) => <img key={url} src={url} alt={`Foto ${i + 1} de ${fotos.length}`} loading={i ? "lazy" : "eager"} />)}
      </div>
      {fotos.length > 1 && (
        <>
          <button className="gallery-nav prev" aria-label="Foto anterior" onClick={() => go(index - 1)}>‹</button>
          <button className="gallery-nav next" aria-label="Foto siguiente" onClick={() => go(index + 1)}>›</button>
          <div className="gallery-dots">{index + 1} / {fotos.length}</div>
        </>
      )}
    </div>
  );
}

export function Detail({ property: p, info, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const sign = ribbon(p);
  const donde = lugar(p);
  const facts = quickFacts(p);
  // La ficha: solo los datos que están cargados (lo que queda vacío no aparece)
  const ficha = [
    ["Referencia", refCode(p, info?.nombre)],
    ["Tipo", TIPOS[p.tipo]],
    ["Departamento", p.departamento],
    ["Ciudad", p.ciudad],
    ["Zona", p.barrio],
    ["Dirección", p.direccion],
    ["Dormitorios", p.dormitorios],
    ["Baños", p.banos],
    ["Superficie edificada", p.metros != null && `${p.metros} m²`],
    ["Superficie del terreno", p.metros_terreno != null && `${p.metros_terreno} m²`],
    ["Piso", p.piso],
    ["Orientación", ORIENTACIONES[p.orientacion]],
    ["Estado", CONSERVACION[p.conservacion]],
    ["Garaje", p.garaje && "Sí"],
    ["Gastos comunes", p.gastos_comunes],
    ["Contribución inmobiliaria", p.contribucion],
  ].filter(([, value]) => value !== null && value !== undefined && value !== "" && value !== false);

  return (
    <div className="detail" role="dialog" aria-modal="true" aria-label={p.titulo} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <article className="detail-sheet">
        <button className="detail-close" aria-label="Cerrar" onClick={onClose}>✕</button>
        <Gallery fotos={p.fotos || []} />
        <div className="detail-body">
          <div className="detail-tags">
            <span className="tag op">{OPERACIONES[p.operacion]}</span>
            {sign && <span className={`tag ${p.estado === "proximamente" ? "soon" : "closed"}`}>{ESTADOS[p.estado]}</span>}
          </div>
          <h2>{p.titulo}</h2>
          {p.ref != null && <p className="detail-ref">Ref. <b>{refCode(p, info?.nombre)}</b> · nombralo al consultar</p>}
          <p className="detail-price">
            {price(p)}
            {rebajado(p) && <><s className="price-before">{precioAnterior(p)}</s> <PriceDropBadge inline /></>}
          </p>
          {donde && <p className="detail-where"><PinIcon /> {donde}</p>}

          {facts.length > 0 && (
            <ul className="pcard-facts detail-facts">
              {facts.map(({ Icon, value, label }) => <li key={label}><Icon /> {value} <small>{label}</small></li>)}
            </ul>
          )}

          {cerrada(p) ? (
            <a className="btn btn-ghost" href={whatsappLink(info.whatsapp, "Hola! Busco una propiedad parecida a una que ya se cerró. ¿Tienen algo similar?")} target="_blank" rel="noopener">
              Ya se cerró · Pedir algo parecido
            </a>
          ) : (
            <ContactButtons property={p} info={info} big />
          )}

          {p.descripcion && <p className="detail-text">{p.descripcion}</p>}

          {ficha.length > 0 && (
            <section className="detail-section">
              <h3>Ficha</h3>
              <dl className="ficha">
                {ficha.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
              </dl>
            </section>
          )}

          {p.servicios?.length > 0 && (
            <section className="detail-section">
              <h3>Servicios</h3>
              <ul className="servicios">{p.servicios.map((s) => <li key={s}><CheckIcon /> {s}</li>)}</ul>
            </section>
          )}

          {p.caracteristicas?.length > 0 && (
            <section className="detail-section">
              <h3>Características</h3>
              <ul className="features">{p.caracteristicas.map((c) => <li key={c}>{c}</li>)}</ul>
            </section>
          )}

          {p.ubicacion && (
            <section className="detail-map">
              <h3>{p.ubicacion_aproximada ? "Zona aproximada" : "Ubicación"}</h3>
              <div className="detail-map-frame">
                <iframe title={`Mapa: ${p.titulo}`} src={mapEmbed(p.ubicacion, p.ubicacion_aproximada)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              </div>
              <a href={mapLink(p.ubicacion)} target="_blank" rel="noopener">Abrir en Google Maps ↗</a>
            </section>
          )}
        </div>
      </article>
    </div>
  );
}
