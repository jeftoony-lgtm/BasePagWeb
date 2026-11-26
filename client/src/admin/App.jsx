// =====================================================================
//  LUZ SERENA PANEL · Arranque y menú
//  1. Si no hay nadie adentro → pantalla de entrar.
//  2. Si la cuenta no está activada → pantalla de espera.
//  3. Si está todo bien → carga los datos y muestra la sección pedida (#consultas, #blog...).
//  Cada minuto se fija si llegaron consultas nuevas (suena y avisa).
// =====================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import { AdminContext, allowedSections } from "./state.js";
import { ModalProvider, useToast, beep } from "./ui.jsx";
import { AuthScreen, PendingScreen, Logo } from "./Auth.jsx";

import { Resumen } from "./views/Resumen.jsx";
import { Consultas } from "./views/Consultas.jsx";
import { Residentes } from "./views/Residentes.jsx";
import { Blog } from "./views/Blog.jsx";
import { Actividades } from "./views/Actividades.jsx";
import { Ajustes } from "./views/Ajustes.jsx";
import { Equipo } from "./views/Equipo.jsx";

const VIEWS = {
  resumen: Resumen,
  consultas: Consultas,
  residentes: Residentes,
  blog: Blog,
  actividades: Actividades,
  ajustes: Ajustes,
  equipo: Equipo,
};

const EMPTY = { settings: {}, leads: [], residents: [], posts: [] };
const CHECK_EVERY = 60_000; // cada cuánto se buscan consultas nuevas

function Nav({ sections, current, newLeads }) {
  return sections.map((s) => (
    <a key={s.id} href={`#${s.id}`} className={current === s.id ? "on" : ""}>
      <span>{s.icon}</span>{s.name}
      {s.id === "consultas" && newLeads > 0 && <span className="count">{newLeads}</span>}
    </a>
  ));
}

export function AdminApp() {
  const toast = useToast();
  const [me, setMe] = useState(undefined); // undefined = cargando, null = nadie adentro
  const [data, setData] = useState(EMPTY);
  const [hash, setHash] = useState(() => location.hash.slice(1));
  const seenLeads = useRef(null);

  const boot = useCallback(async () => {
    let user = null;
    try {
      user = await api.me();
    } catch (error) {
      console.error(error);
    }
    if (user?.activo) {
      try {
        const [settings, leads, residents, posts] = await Promise.all([api.settings(), api.leads(), api.residents(), api.posts()]);
        seenLeads.current = new Set(leads.map((l) => l.id));
        setData({ settings, leads, residents, posts });
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

  // Consultas nuevas (con sonido)
  const active = Boolean(me?.activo);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(async () => {
      try {
        const leads = await api.leads();
        const fresh = leads.filter((l) => !seenLeads.current?.has(l.id));
        seenLeads.current = new Set(leads.map((l) => l.id));
        setData((d) => ({ ...d, leads }));
        if (fresh.length) {
          beep();
          navigator.vibrate?.([120, 60, 120]);
          toast(`📥 Nueva consulta de ${fresh[0].nombre}${fresh.length > 1 ? ` y ${fresh.length - 1} más` : ""}`);
        }
      } catch { /* sin conexión: se prueba en el próximo minuto */ }
    }, CHECK_EVERY);
    return () => clearInterval(timer);
  }, [active, toast]);

  const isOwner = me?.activo && me.rol === "dueno";
  const sections = allowedSections(isOwner);
  const fallback = isOwner ? "resumen" : "consultas";
  const view = sections.some((s) => s.id === hash) ? hash : fallback; // si no tiene permiso, va a la de siempre
  const newLeads = data.leads.filter((l) => l.estado === "nueva").length;

  useEffect(() => { document.title = (newLeads ? `(${newLeads}) ` : "") + "Panel · Luz Serena"; }, [newLeads]);
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
      setSettings: setter("settings"),
      setLeads: setter("leads"),
      setResidents: setter("residents"),
      setPosts: setter("posts"),
    };
  }, [me, isOwner, data]);

  if (me === undefined) return <div className="loading">Cargando…</div>;
  if (!me) return <AuthScreen onLoggedIn={boot} />;
  if (!me.activo) return <PendingScreen onLogout={logout} />;

  const View = VIEWS[view];

  return (
    <AdminContext.Provider value={context}>
      <ModalProvider>
        <div className="app" id="app">
          {/* Menú lateral (compu) */}
          <aside className="side">
            <Logo />
            <div className="who"><b>{me.nombre}</b><span className={`role${isOwner ? "" : " emp"}`}>{isOwner ? "Dueño" : "Equipo"}</span></div>
            <nav className="nav"><Nav sections={sections} current={view} newLeads={newLeads} /></nav>
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
              <nav className="tabs"><Nav sections={sections} current={view} newLeads={newLeads} /></nav>
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
