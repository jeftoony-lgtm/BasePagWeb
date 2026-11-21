// =====================================================================
//  INMOBILIARIA · Tarjeta de una propiedad (como los posts de Instagram)
//  Foto de portada, "EN VENTA / EN ALQUILER", cartel de vendida y el
//  recuadro de abajo con barrio, precio y características.
//  La usan la página y el panel (vista previa). Estilos en styles/card.css.
// =====================================================================

import { OPERACIONES, price, ribbon } from "../lib/format.js";

export function Brand({ info }) {
  return (
    <span className="brand">
      <svg aria-hidden="true"><use href="#logo" /></svg>
      <span><b>{info?.nombre || "Inmobiliaria"}</b>{info?.subtitulo && <small>{info.subtitulo}</small>}</span>
    </span>
  );
}

export function PropertyCard({ property: p, info, onOpen }) {
  const cover = p.fotos?.[0];
  const sign = ribbon(p);
  const features = (p.caracteristicas || []).slice(0, 6);
  const Tag = onOpen ? "button" : "div";

  return (
    <Tag type={onOpen ? "button" : undefined} className={`pcard${sign ? " closed" : ""}`} onClick={onOpen}
      aria-label={onOpen ? `Ver ${p.titulo}` : undefined}>
      <div className="pcard-photo">
        {cover ? <img src={cover} alt="" loading="lazy" /> : <div className="pcard-empty"><svg aria-hidden="true"><use href="#logo" /></svg></div>}
        <div className="pcard-top">
          <span className="pcard-op">{OPERACIONES[p.operacion]}</span>
          <Brand info={info} />
        </div>
        {sign && <span className="pcard-ribbon">{sign}</span>}
        {p.fotos?.length > 1 && <span className="pcard-count">📷 {p.fotos.length}</span>}
      </div>
      <div className="pcard-info">
        <div className="pcard-pill"><span>{p.barrio || p.titulo}</span><b>{price(p)}</b></div>
        {features.length > 0 && <p>· {features.join(" · ")} ·</p>}
      </div>
    </Tag>
  );
}
