// =====================================================================
//  LUZ SERENA · Portada
//  Titular, botones de WhatsApp y visita, aviso de plazas y las fotos
//  con el sol dorado del logo detrás.
// =====================================================================

import { useSite } from "./store.jsx";
import { WaIcon } from "./icons.jsx";

export function PlazasBadge() {
  const { libres } = useSite();
  return (
    <span className={`plazas${libres > 0 ? "" : " wait"}`}><i></i>
      <span>{libres > 0 ? `Plazas disponibles · ${libres} ${libres === 1 ? "lugar" : "lugares"}` : "Sin plazas por ahora · lista de espera"}</span>
    </span>
  );
}

export function Hero() {
  const { wa } = useSite();
  return (
    <section className="hero" id="inicio">
      <div className="wrap hero-grid">
        <div>
          <p className="eyebrow">Residencial para adultos mayores · Melo</p>
          <h1>Cuidado profesional con la <em>cercanía</em> de una verdadera familia.</h1>
          <p className="lead">Acompañamos a quienes más querés con atención de salud todas las semanas, actividades todos los días y un hogar cálido y luminoso.</p>
          <div className="hero-ctas">
            <a className="btn btn-wa" {...wa("Hola Luz Serena, quisiera información sobre el residencial.")}><WaIcon /> Escribinos por WhatsApp</a>
            <a className="btn btn-ghost" href="#visita">Agendar una visita</a>
          </div>
          <PlazasBadge />
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="rays"></div><div className="halo"></div>
          <div className="ph a"><img src="/img/fotos/mabel.jpg" alt="" /><span className="cap">Mabel y Luis, nuestros primeros residentes</span></div>
          <div className="ph b"><img src="/img/fotos/bandas.jpg" alt="" /><span className="cap">Moverse es vivir</span></div>
          <img className="seal" src="/img/logo.webp" alt="" />
        </div>
      </div>
    </section>
  );
}
