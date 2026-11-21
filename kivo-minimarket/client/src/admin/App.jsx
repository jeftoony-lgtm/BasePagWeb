// =====================================================================
//  INMOBILIARIA PANEL · Arranque y menú
//  1. Si no hay nadie adentro → pantalla de entrar.
//  2. Si la cuenta no está activada → pantalla de espera.
//  3. Si está todo bien → carga los datos y muestra la sección pedida (#publicaciones...).
// =====================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { AdminContext, allowedSections } from "./state.js";
import { ModalProvider } from "./ui.jsx";
import { AuthScreen, PendingScreen, Logo } from "./Auth.jsx";

import { Publicaciones } from "./views/Publicaciones.jsx";
import { Graficas } from "./views/Graficas.jsx";
import { Inmobiliaria } from "./views/Inmobiliaria.jsx";
import { Equipo } from "./views/Equipo.jsx";

const VIEWS = {
  publicaciones: Publicaciones,
  graficas: Graficas,
  inmobiliaria: Inmobiliaria,
  equipo: Equipo,
};

const EMPTY = { properties: [], settings: {} };

function Nav({ sections, current }) {
  return sections.map((s) => (
    <a key={s.id} href={`#${s.id}`} className={current === s.id ? "on" : ""}>
      <span>{s.icon}</span>{s.name}
    </a>
  ));
}

export function AdminApp() {
  const [me, setMe] = useState(undefined); // undefined = cargando, null = nadie adentro
  const [data, setData] = useState(EMPTY);
  const [hash, setHash] = useState(() => location.hash.slice(1));

  const boot = useCallback(async () => {
    let user = null;
    try {
      user = await api.me();
    } catch (error) {
      console.error(error);
    }
    if (user?.activo) {
      try {
        const [properties, settings] = await Promise.all([api.properties(), api.settings()]);
        setData({ properties, settings });
      } catch (error) {
        console.error(error);
      }
    }
    setMe(user);
  }, []);

  useEffect(() => { boot(); }, [boot]);

  useEffect(() => {
    const onHash = () => setHash(location.hash.slice(1));
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);

  const isOwner = me?.activo && me.rol === "dueno";
  const sections = allowedSections(isOwner);
  const view = sections.some((s) => s.id === hash) ? hash : "publicaciones"; // si no tiene permiso, va a Publicaciones

  useEffect(() => { document.title = "Panel · Inmobiliaria"; }, []);
  useEffect(() => { document.querySelector(".mobile-bar .tabs a.on")?.scrollIntoView({ inline: "center", block: "nearest" }); }, [view, me]);

  const logout = useCallback(() => {
    api.signOut();
    history.replaceState(null, "", location.pathname);
    setHash("");
    setData(EMPTY);
    setMe(null);
  }, []);

  // Lo que ven todas las secciones. setX acepta un valor nuevo o una función (como useState)
  const context = useMemo(() => {
    const setter = (key) => (next) => setData((d) => ({ ...d, [key]: typeof next === "function" ? next(d[key]) : next }));
    return {
      me, isOwner, ...data,
      setProperties: setter("properties"),
      setSettings: setter("settings"),
    };
  }, [me, isOwner, data]);

  if (me === undefined) return <div className="loading">Cargando…</div>;
  if (!me) return <AuthScreen onLoggedIn={boot} />;
  if (!me.activo) return <PendingScreen onLogout={logout} />;

  const View = VIEWS[view] || Publicaciones; // por las dudas: nunca dejar la pantalla en blanco

  return (
    <AdminContext.Provider value={context}>
      <ModalProvider>
        <div className="app" id="app">
          {/* Menú lateral (compu) */}
          <aside className="side">
            <Logo />
            <div className="who"><b>{me.nombre}</b><span className={`role${isOwner ? "" : " emp"}`}>{isOwner ? "Dueño" : "Agente"}</span></div>
            <nav className="nav"><Nav sections={sections} current={view} /></nav>
            <div className="bottom">
              <a href="/" target="_blank" rel="noopener">↗ Ver la página</a>
              <button onClick={logout}>Salir</button>
            </div>
          </aside>

          <div>
            {/* Barra de arriba (celular) */}
            <div className="mobile-bar">
              <div className="bar">
                <Logo />
                <div className="me"><b>{me.nombre}</b><br /><button className="small" onClick={logout} style={{ textDecoration: "underline", opacity: 0.85 }}>Salir</button></div>
              </div>
              <nav className="tabs"><Nav sections={sections} current={view} /></nav>
            </div>

            <main>
              <div id="view"><View key={view} /></div>
            </main>
          </div>
        </div>
      </ModalProvider>
    </AdminContext.Provider>
  );
}
