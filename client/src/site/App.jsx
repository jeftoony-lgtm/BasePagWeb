// =====================================================================
//  LUZ SERENA · Arranque de la página
//  Carga los ajustes y el blog, cuenta la visita y arma la página.
//  #blog muestra todas las novedades; cualquier otra dirección, el inicio.
// =====================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { FALLBACK_SETTINGS, waLink } from "./content.js";
import { SiteContext } from "./store.jsx";
import { Sky } from "./Sky.jsx";
import { Topbar } from "./Topbar.jsx";
import { Hero } from "./Hero.jsx";
import { Trust, Servicios, Hogar, Faq, Footer } from "./Sections.jsx";
import { Semana } from "./Semana.jsx";
import { BlogPreview, BlogPage, PostModal } from "./Blog.jsx";
import { Visita } from "./Visita.jsx";
import { WaIcon } from "./icons.jsx";
import { tabStorage } from "../lib/format.js";

const pageFromHash = () => (location.hash === "#blog" ? "blog" : "inicio");

/** Hace aparecer suave cada bloque con clase "rv" cuando entra en pantalla */
function useReveal(deps) {
  useEffect(() => {
    const items = document.querySelectorAll(".rv:not(.in)");
    if (!("IntersectionObserver" in window)) { items.forEach((el) => el.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }), { threshold: 0.12 });
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

export function App() {
  const [settings, setSettings] = useState(FALLBACK_SETTINGS);
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(pageFromHash);
  const [openPost, setOpenPost] = useState(null);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    api.settings().then((s) => setSettings({ ...FALLBACK_SETTINGS, ...s })).catch(console.error);
    api.posts().then(setPosts).catch(console.error);
    // Una visita por pestaña (si recarga, no cuenta de nuevo)
    if (!tabStorage.get("luzserena-visita")) { tabStorage.set("luzserena-visita", true); api.track("visitas"); }
    const show = setTimeout(() => setHint(true), 2500);
    const hide = setTimeout(() => setHint(false), 7000);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, []);

  // Navegación: #blog ↔ inicio. Al volver al inicio con #seccion, baja hasta esa sección
  useEffect(() => {
    const onHash = () => {
      const next = pageFromHash();
      setPage((current) => {
        if (current !== next) window.scrollTo(0, 0);
        return next;
      });
      if (next === "inicio" && location.hash.length > 1) {
        setTimeout(() => document.querySelector(location.hash)?.scrollIntoView({ behavior: "smooth" }), 60);
      }
    };
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);

  useReveal([page, posts.length]);

  const closePost = useCallback(() => setOpenPost(null), []);

  const value = useMemo(() => {
    const { total = 0, ocupadas = 0 } = settings.plazas || {};
    return {
      settings, posts,
      libres: Math.max(0, total - ocupadas),
      // Props para un link de WhatsApp: <a {...wa("Hola")}>. Cuenta el toque en las estadísticas
      wa: (mensaje) => ({ href: waLink(settings.whatsapp, mensaje), target: "_blank", rel: "noopener", onClick: () => api.track("whatsapp") }),
    };
  }, [settings, posts]);

  return (
    <SiteContext.Provider value={value}>
      <Sky />
      <Topbar />
      {page === "blog" ? <BlogPage onOpen={setOpenPost} /> : (
        <main>
          <Hero />
          <Trust />
          <Servicios />
          <Semana />
          <Hogar />
          <BlogPreview onOpen={setOpenPost} />
          <Faq />
          <Visita />
        </main>
      )}
      <Footer />
      <a className={`wa-float${hint ? " hint" : ""}`} aria-label="Escribinos por WhatsApp" {...value.wa("Hola Luz Serena, quisiera información sobre el residencial.")}>
        <span className="wa-tip">¿Hablamos? Escribinos</span><WaIcon />
      </a>
      <PostModal post={openPost} onClose={closePost} />
    </SiteContext.Provider>
  );
}
