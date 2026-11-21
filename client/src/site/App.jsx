// =====================================================================
//  INMOBILIARIA · Página pública
//  Carga los datos de la inmobiliaria y las publicaciones, y arma:
//  encabezado, portada, filtros, grilla de propiedades, servicios y contacto.
//  Una propiedad se abre con #propiedad/<id> (ver Detail.jsx).
// =====================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { normalize, prettyWhatsapp, whatsappLink, cerrada, TIPOS, DEPARTAMENTOS } from "../lib/format.js";
import { Brand, PropertyCard } from "./Card.jsx";
import { Detail } from "./Detail.jsx";
import { MailIcon } from "./icons.jsx";

const FILTERS = [
  { id: "todas", name: "Todas" },
  { id: "venta", name: "En venta" },
  { id: "alquiler", name: "En alquiler" },
];

/** ¿Es la misma ciudad o zona? (sin importar tildes ni mayúsculas; filtro vacío = todas) */
const mismo = (valor, filtro) => !filtro || normalize((valor || "").trim()) === normalize(filtro);

/** Lista sin vacíos ni repetidos ("Centro" y "centro" cuentan como una), en orden alfabético */
function distintos(lista) {
  const vistos = new Map();
  for (const x of lista.map((v) => (v || "").trim()).filter(Boolean)) if (!vistos.has(normalize(x))) vistos.set(normalize(x), x);
  return [...vistos.values()].sort((a, b) => a.localeCompare(b, "es"));
}

/**
 * ¿Qué propiedad hay que abrir según la dirección?
 * /propiedad/12 (link corto, con el código) → "ref:12" · #propiedad/<id> (links viejos) → el id
 */
function openId() {
  const ref = location.pathname.match(/^\/propiedad\/(\d+)\/?$/);
  if (ref) return `ref:${Number(ref[1])}`;
  return (location.hash.match(/^#propiedad\/([a-f0-9]{24})$/) || [])[1] || null;
}
const isOpen = (p, open) => open === p.id || open === `ref:${p.ref}`;

/** Abrir la ficha: la dirección pasa a ser el link corto (así se puede copiar y compartir) */
function openProperty(p, setOpen) {
  if (p.ref != null) {
    history.pushState(null, "", `/propiedad/${p.ref}`);
    setOpen(`ref:${p.ref}`);
  } else {
    location.hash = `propiedad/${p.id}`;
  }
}

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

/* Íconos del pie: dibujados con el color del texto (los emojis cambian según el celular) */
const PhoneIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z" fill="currentColor" />
  </svg>
);
const InstagramIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

function Footer({ info }) {
  return (
    <footer className="footer" id="contacto">
      <Brand info={info} />
      <div className="footer-links">
        {info.whatsapp && <a href={whatsappLink(info.whatsapp)} target="_blank" rel="noopener"><PhoneIcon /> {prettyWhatsapp(info.whatsapp)}</a>}
        {info.email && <a href={`mailto:${info.email}`}><MailIcon /> {info.email}</a>}
        {info.instagram && <a href={`https://instagram.com/${info.instagram}`} target="_blank" rel="noopener"><InstagramIcon /> @{info.instagram}</a>}
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
  const [departamento, setDepartamento] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [zona, setZona] = useState("");
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
    // "hashchange" para los links viejos y "popstate" para el botón Atrás del celular
    const onChange = () => setOpen(openId());
    addEventListener("hashchange", onChange);
    addEventListener("popstate", onChange);
    return () => {
      removeEventListener("hashchange", onChange);
      removeEventListener("popstate", onChange);
    };
  }, []);

  useEffect(() => { if (info) document.title = `${info.nombre} ${info.subtitulo} · Inmobiliaria`; }, [info]);

  // Se vuelve a la página principal sin mover la página de donde estaba
  const close = useCallback(() => {
    history.pushState(null, "", "/#propiedades");
    setOpen(null);
  }, []);

  // Primero las disponibles; las vendidas y alquiladas quedan al final, como "casos de éxito"
  const list = useMemo(() => {
    const query = normalize(search.trim());
    return properties
      .filter((p) => (filter === "todas" || p.operacion === filter) && (!tipo || p.tipo === tipo) && (!departamento || p.departamento === departamento) && mismo(p.ciudad, ciudad) && mismo(p.barrio, zona))
      .filter((p) => !query || normalize(`${p.titulo} ${p.barrio} ${p.ciudad} ${p.departamento} ${p.direccion} ${p.caracteristicas.join(" ")}`).includes(query))
      .sort((a, b) => Number(cerrada(a)) - Number(cerrada(b)));
  }, [properties, filter, tipo, departamento, ciudad, zona, search]);

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

  const current = open && properties.find((p) => isOpen(p, open));
  const tiposUsados = [...new Set(properties.map((p) => p.tipo))];
  const departamentosUsados = DEPARTAMENTOS.filter((d) => properties.some((p) => p.departamento === d));
  // Las ciudades del departamento elegido, y las zonas de la ciudad elegida
  const enDepto = properties.filter((p) => !departamento || p.departamento === departamento);
  const ciudadesUsadas = distintos(enDepto.map((p) => p.ciudad));
  const zonasUsadas = distintos(enDepto.filter((p) => mismo(p.ciudad, ciudad)).map((p) => p.barrio));

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
            {departamentosUsados.length > 1 && (
              <select className="input" value={departamento} onChange={(e) => { setDepartamento(e.target.value); setCiudad(""); setZona(""); }} aria-label="Departamento">
                <option value="">Todos los departamentos</option>
                {departamentosUsados.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
            {ciudadesUsadas.length > 1 && (
              <select className="input" value={ciudad} onChange={(e) => { setCiudad(e.target.value); setZona(""); }} aria-label="Ciudad">
                <option value="">Todas las ciudades</option>
                {ciudadesUsadas.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            {zonasUsadas.length > 1 && (
              <select className="input" value={zona} onChange={(e) => setZona(e.target.value)} aria-label="Zona">
                <option value="">Todas las zonas</option>
                {zonasUsadas.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            )}
            <input className="input" type="search" placeholder="🔎 Ciudad, barrio, calle, piscina…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {list.length ? (
          <div className="grid">
            {list.map((p) => <PropertyCard key={p.id} property={p} info={info} onOpen={() => openProperty(p, setOpen)} />)}
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
