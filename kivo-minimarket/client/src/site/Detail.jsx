// =====================================================================
//  INMOBILIARIA · Ficha de una propiedad (ventana grande)
//  Galería de fotos, precio, datos, descripción y botón de WhatsApp.
//  Se abre con #propiedad/<id>, así el link se puede compartir.
// =====================================================================

import { useEffect, useRef, useState } from "react";
import { OPERACIONES, TIPOS, ESTADOS, price, ribbon, whatsappLink } from "../lib/format.js";

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
  const facts = [
    [TIPOS[p.tipo], "Tipo"],
    p.dormitorios != null && [p.dormitorios, p.dormitorios === 1 ? "Dormitorio" : "Dormitorios"],
    p.banos != null && [p.banos, p.banos === 1 ? "Baño" : "Baños"],
    p.metros != null && [`${p.metros} m²`, "Edificados"],
  ].filter(Boolean);
  const message = `Hola! Me interesa la propiedad "${p.titulo}"${p.barrio ? ` (${p.barrio})` : ""}. ${location.origin}/#propiedad/${p.id}`;

  return (
    <div className="detail" role="dialog" aria-modal="true" aria-label={p.titulo} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <article className="detail-sheet">
        <button className="detail-close" aria-label="Cerrar" onClick={onClose}>✕</button>
        <Gallery fotos={p.fotos || []} />
        <div className="detail-body">
          <div className="detail-tags">
            <span className="tag op">{OPERACIONES[p.operacion]}</span>
            {sign && <span className="tag closed">{ESTADOS[p.estado]}</span>}
            {p.barrio && <span className="tag">📍 {p.barrio}</span>}
          </div>
          <h2>{p.titulo}</h2>
          {p.direccion && <p className="detail-address">{p.direccion}</p>}
          <p className="detail-price">{price(p)}</p>

          <dl className="facts">
            {facts.map(([value, label]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>

          {p.caracteristicas?.length > 0 && (
            <ul className="features">{p.caracteristicas.map((c) => <li key={c}>{c}</li>)}</ul>
          )}
          {p.descripcion && <p className="detail-text">{p.descripcion}</p>}

          {!sign || p.estado === "reservada" ? (
            <a className="btn btn-wa detail-cta" href={whatsappLink(info.whatsapp, message)} target="_blank" rel="noopener">
              Consultar por WhatsApp
            </a>
          ) : (
            <a className="btn btn-ghost detail-cta" href={whatsappLink(info.whatsapp, "Hola! Busco una propiedad parecida a una que ya se cerró. ¿Tienen algo similar?")} target="_blank" rel="noopener">
              Ya se cerró · Pedir algo parecido
            </a>
          )}
        </div>
      </article>
    </div>
  );
}
