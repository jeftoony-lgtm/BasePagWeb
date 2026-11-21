// =====================================================================
//  INMOBILIARIA · Página pública
//  Carga los datos de la inmobiliaria y las publicaciones, y arma:
//  encabezado, portada, filtros, grilla de propiedades, servicios y contacto.
//  Una propiedad se abre con #propiedad/<id> (ver Detail.jsx).
// =====================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { normalize, prettyWhatsapp, whatsappLink, cerrada, TIPOS } from "../lib/format.js";
import { Brand, PropertyCard } from "./Card.jsx";
import { Detail } from "./Detail.jsx";

const FILTERS = [
  { id: "todas", name: "Todas" },
  { id: "venta", name: "En venta" },
  { id: "alquiler", name: "En alquiler" },
];

const openId = () => (location.hash.match(/^#propiedad\/([a-f0-9]{24})$/) || [])[1] || null;

function Header({ info }) {
  return (
    <header className="topbar">
      <a href="#" className="topbar-brand" aria-label="Inicio"><Brand info={info} /></a>
      <nav>
        <a href="#propiedades">Propiedades</a>
        <a href="#servicios">Servicios</a>
        <a href="#contacto">Contacto</a>
      </nav>
      <a className="btn btn-wa btn-sm" href={whatsappLink(info.whatsapp)} target="_blank" rel="noopener">WhatsApp</a>
    </header>
  );
}

function Hero({ info, counts }) {
  return (
    <section className="hero">
      <svg className="hero-logo" aria-hidden="true"><use href="#logo" /></svg>
      <h1>{info.nombre}<small>{info.subtitulo}</small></h1>
      {info.eslogan && <p className="hero-quote">“{info.eslogan}”</p>}
      {info.descripcion && <p className="hero-text">{info.descripcion}</p>}
      <div className="hero-actions">
        <a className="btn btn-light" href="#propiedades">Ver propiedades</a>
        <a className="btn btn-outline" href={whatsappLink(info.whatsapp, "Hola! Quiero vender o alquilar mi propiedad.")} target="_blank" rel="noopener">
          Quiero vender o alquilar
        </a>
      </div>
      <div className="hero-counts">
        <span><b>{counts.venta}</b> en venta</span>
        <span><b>{counts.alquiler}</b> en alquiler</span>
        {counts.cerradas > 0 && <span><b>{counts.cerradas}</b> {counts.cerradas === 1 ? "concretada" : "vendidas y alquiladas"}</span>}
      </div>
    </section>
  );
}

function Services({ info }) {
  if (!info.servicios?.length) return null;
  return (
    <section className="services" id="servicios">
      <h2>¿Buscás vender, alquilar o comprar una propiedad?</h2>
      <p>Te ofrecemos nuestros servicios:</p>
      <ul>{info.servicios.map((s) => <li key={s}>{s}</li>)}</ul>
      <a className="btn btn-wa" href={whatsappLink(info.whatsapp, "Hola! Quiero hacer una consulta.")} target="_blank" rel="noopener">Escribinos</a>
    </section>
  );
}

function Footer({ info }) {
  return (
    <footer className="footer" id="contacto">
      <Brand info={info} />
      <div className="footer-links">
        {info.whatsapp && <a href={whatsappLink(info.whatsapp)} target="_blank" rel="noopener">📲 WhatsApp {prettyWhatsapp(info.whatsapp)}</a>}
        {info.telefono2 && <a href={`tel:${info.telefono2}`}>📞 {info.telefono2}</a>}
        {info.instagram && <a href={`https://instagram.com/${info.instagram}`} target="_blank" rel="noopener">📷 @{info.instagram}</a>}
      </div>
      <small>
        © {new Date().getFullYear()} {info.nombre} {info.subtitulo}
        {/* Entrada al panel: a propósito casi no se ve */}
        <a className="footer-access" href="/admin.html" rel="nofollow">· Acceso</a>
      </small>
    </footer>
  );
}

export function App() {
  const [info, setInfo] = useState(null);
  const [properties, setProperties] = useState([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("todas");
  const [tipo, setTipo] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(openId);

  // Carga los datos al abrir, cada vez que se vuelve a la pestaña y cada minuto:
  // así lo que se cambia en el panel aparece sin tener que recargar la página
  useEffect(() => {
    let first = true;
    const load = () => Promise.all([api.settings(), api.properties()])
      .then(([settings, list]) => { setInfo(settings.inmobiliaria); setProperties(list); setError(""); })
      .catch((e) => { if (first) setError(e.message); }) // si falla una recarga, se queda con lo que tenía
      .finally(() => { first = false; });
    load();
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(() => document.visibilityState === "visible" && load(), 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const onHash = () => setOpen(openId());
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => { if (info) document.title = `${info.nombre} ${info.subtitulo} · Inmobiliaria`; }, [info]);

  // Se saca el #propiedad/... sin mover la página de donde estaba
  const close = useCallback(() => {
    history.pushState(null, "", location.pathname + "#propiedades");
    setOpen(null);
  }, []);

  // Primero las disponibles; las vendidas y alquiladas quedan al final, como "casos de éxito"
  const list = useMemo(() => {
    const query = normalize(search.trim());
    return properties
      .filter((p) => (filter === "todas" || p.operacion === filter) && (!tipo || p.tipo === tipo))
      .filter((p) => !query || normalize(`${p.titulo} ${p.barrio} ${p.direccion} ${p.caracteristicas.join(" ")}`).includes(query))
      .sort((a, b) => Number(cerrada(a)) - Number(cerrada(b)));
  }, [properties, filter, tipo, search]);

  const counts = useMemo(() => {
    const available = properties.filter((p) => p.estado === "disponible");
    return {
      venta: available.filter((p) => p.operacion === "venta").length,
      alquiler: available.filter((p) => p.operacion === "alquiler").length,
      cerradas: properties.filter(cerrada).length,
    };
  }, [properties]);

  if (error) return <div className="page-message">😕 {error}<br /><button className="btn btn-ghost" onClick={() => location.reload()}>Probar de nuevo</button></div>;
  if (!info) return <div className="page-message">Cargando…</div>;

  const current = open && properties.find((p) => p.id === open);
  const tiposUsados = [...new Set(properties.map((p) => p.tipo))];

  return (
    <>
      <Header info={info} />
      <Hero info={info} counts={counts} />

      <main className="listing" id="propiedades">
        <div className="listing-head">
          <h2>Propiedades</h2>
          <div className="filters">
            {FILTERS.map((f) => (
              <button key={f.id} className={`chip${filter === f.id ? " on" : ""}`} onClick={() => setFilter(f.id)}>{f.name}</button>
            ))}
            {tiposUsados.length > 1 && (
              <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo de propiedad">
                <option value="">Todos los tipos</option>
                {tiposUsados.map((t) => <option key={t} value={t}>{TIPOS[t]}</option>)}
              </select>
            )}
            <input className="input" type="search" placeholder="🔎 Barrio, calle, piscina…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {list.length ? (
          <div className="grid">
            {list.map((p) => <PropertyCard key={p.id} property={p} info={info} onOpen={() => { location.hash = `propiedad/${p.id}`; }} />)}
          </div>
        ) : (
          <div className="page-message">No hay propiedades con esos filtros.</div>
        )}
      </main>

      <Services info={info} />
      <Footer info={info} />

      {current && <Detail property={current} info={info} onClose={close} />}
    </>
  );
}
