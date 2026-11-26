// =====================================================================
//  LUZ SERENA · Barra de arriba
//  Logo, menú (en celular se abre con el botón ☰), botón "A+" para
//  agrandar la letra y botón de agendar visita.
// =====================================================================

import { useEffect, useState } from "react";
import { Icon } from "./icons.jsx";

const LINKS = [
  ["#servicios", "Servicios"], ["#semana", "Actividades"], ["#hogar", "El hogar"],
  ["#novedades", "Novedades"], ["#preguntas", "Preguntas"], ["#visita", "Visitanos"],
];
const BIG_KEY = "luzserena-letra-grande";

export function Brand({ light = false }) {
  return (
    <a className="brand" href="#inicio" aria-label="Luz Serena, inicio">
      <img src="/img/logo.webp" alt="" width="48" height="48" />
      <span><b style={light ? { color: "#fff" } : undefined}>LUZ SERENA</b><small style={light ? { color: "#D9B460" } : undefined}>Residencial</small></span>
    </a>
  );
}

export function Topbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [big, setBig] = useState(() => { try { return localStorage.getItem(BIG_KEY) === "1"; } catch { return false; } });

  useEffect(() => {
    document.documentElement.classList.toggle("big", big);
    try { localStorage.setItem(BIG_KEY, big ? "1" : ""); } catch { /* nada */ }
  }, [big]);

  useEffect(() => {
    const onScroll = () => setScrolled(scrollY > 10);
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`top${scrolled ? " scrolled" : ""}`}>
      <div className="wrap nav">
        <Brand />
        <nav className={`menu${open ? " open" : ""}`} id="menu" aria-label="Principal" onClick={(e) => e.target.tagName === "A" && setOpen(false)}>
          {LINKS.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
        </nav>
        <div className="tools">
          <button className="icon-btn" aria-pressed={big} title="Agrandar letra" aria-label="Agrandar el tamaño de la letra" onClick={() => setBig(!big)}>A+</button>
          <a className="btn btn-gold btn-sm btn-cta" href="#visita">Agendar visita</a>
          <button className="icon-btn" id="burger" aria-label="Abrir menú" aria-expanded={open} aria-controls="menu" onClick={() => setOpen(!open)}><Icon name="menu" /></button>
        </div>
      </div>
    </header>
  );
}
