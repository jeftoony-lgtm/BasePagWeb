// =====================================================================
//  LUZ SERENA · Secciones fijas de la página
//  Confianza, servicios, el hogar, preguntas frecuentes y pie.
// =====================================================================

import { CONTACT, FAQ, HOME_PHOTOS, HOME_POINTS, SERVICES, TRUST, prettyWa } from "./content.jsx";
import { useSite } from "./store.jsx";
import { Icon, WaIcon } from "./icons.jsx";
import { Brand } from "./Topbar.jsx";
import { PREVIEW } from "../preview.js";

export function SectionHead({ eyebrow, title, text }) {
  return (
    <div className="sec-head rv">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  );
}

export function Trust() {
  return (
    <section style={{ padding: "0 0 20px" }}>
      <div className="wrap trust rv">
        {TRUST.map((t) => <div key={t.icon}><Icon name={t.icon} /><span>{t.text}</span></div>)}
      </div>
    </section>
  );
}

export function Servicios() {
  return (
    <section className="sec" id="servicios">
      <div className="wrap">
        <SectionHead eyebrow="Servicios" title={<>Todo lo que necesita, <em>en un solo lugar</em>.</>} text="Un equipo que cuida la salud, el cuerpo y el ánimo de cada residente." />
        <div className="svc">
          {SERVICES.map((s, i) => (
            <article key={s.titulo} className={`rv${s.wide ? " wide" : ""}`} style={{ transitionDelay: `${(i % 4) * 80}ms` }}>
              <Icon name={s.icon} /><h3>{s.titulo}</h3><p>{s.texto}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Hogar() {
  return (
    <section className="sec" id="hogar" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <SectionHead eyebrow="El hogar" title={<>Un lugar para sentirse <em>como en casa</em>.</>} />
        <div className="home-grid rv">
          {HOME_PHOTOS.map((p, i) => (
            <figure key={p.src} className={`g${i + 1}`}><img src={p.src} alt={p.alt} loading="lazy" /><figcaption>{p.caption}</figcaption></figure>
          ))}
        </div>
        <div className="home-points rv">{HOME_POINTS.map((t) => <p key={t}>{t}</p>)}</div>
      </div>
    </section>
  );
}

export function Faq() {
  const { libres, wa } = useSite();
  return (
    <section className="sec" id="preguntas" style={{ paddingTop: 0 }}>
      <div className="wrap faq">
        <div className="faq-card rv">
          <p className="eyebrow" style={{ color: "#F3D27A" }}>Preguntas frecuentes</p>
          <h2>Elegir un hogar para quien más querés <em>trae muchas preguntas</em>.</h2>
          <p>Te respondemos las más importantes, sin vueltas. Y si te queda alguna, escribinos.</p>
          <a className="btn btn-wa" {...wa("Hola, tengo una consulta sobre el residencial.")}><WaIcon /> Hacer otra pregunta</a>
        </div>
        <div className="rv">
          {FAQ.map((f, i) => (
            <details key={f.q} open={i === 0}>
              <summary>{f.q}</summary>
              <p>{f.plazas
                ? `${libres > 0 ? "Sí, hoy tenemos plazas disponibles." : "Por ahora estamos completos, pero podés anotarte en la lista de espera."} El costo depende de cada caso: escribinos y te pasamos toda la información.`
                : f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const { settings, wa } = useSite();
  const tel = settings.telefono || "";
  return (
    <footer>
      <div className="wrap foot">
        <div><Brand light /><p style={{ marginTop: 14, maxWidth: "30em" }}>Residencia para la tercera edad en Melo, Cerro Largo. Cuidado integral para adultos mayores.</p></div>
        <div><h4>Contacto</h4>{CONTACT.direccion}, Melo<br />WhatsApp <a {...wa("Hola Luz Serena")}>{prettyWa(settings.whatsapp)}</a><br />{tel && <>Tel. <a href={`tel:+598${tel.replace(/\D/g, "").replace(/^0/, "")}`}>{tel}</a></>}</div>
        <div><h4>Seguinos</h4><a href={`https://www.instagram.com/${CONTACT.instagram}/`} target="_blank" rel="noopener">Instagram</a><br /><a href="#blog">Novedades</a></div>
      </div>
      <div className="wrap foot-bottom">
        <span>© {new Date().getFullYear()} Luz Serena Residencial</span>
        {/* Acceso discreto al panel para el dueño y el equipo */}
        <a className="admin-link" href="admin.html" aria-label="Acceso del equipo" title="Acceso del equipo"
          onClick={PREVIEW ? (e) => { e.preventDefault(); alert("El panel del equipo se habilita cuando la página se publique con su servidor."); } : undefined}>
          <Icon name="lock" />
        </a>
      </div>
    </footer>
  );
}
