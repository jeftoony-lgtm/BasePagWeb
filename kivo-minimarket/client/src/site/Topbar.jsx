// =====================================================================
//  KIVO · Menú de arriba (aparece al scrollear) y cartel de abierto/cerrado
//  hero-motion.js le pone las clases "hide" y "solid" según el scroll.
// =====================================================================

export function StatusText({ status }) {
  return (
    <>
      <span className={`dot${status?.open ? " on" : ""}`}></span>
      <span className={status && !status.open ? "closed-txt" : ""}>{status?.text ?? "…"}</span>
    </>
  );
}

export function Topbar({ ref, status, comboActive, ruletaActive, onOpenRuleta }) {
  return (
    <header className="topbar hide" id="topbar" ref={ref}>
      <a className="brand" href="#top" aria-label="Kivo Mini Market">
        <svg><use href="#cart" /></svg><b>KIV<i>O</i></b>
      </a>
      <nav className="nav">
        {comboActive && <a href="#combo">Combo</a>}
        <a href="#gondolas">Góndolas</a>
        {ruletaActive && <a href="#ruleta" onClick={(e) => { e.preventDefault(); onOpenRuleta(); }}>Ruleta</a>}
        <a href="#encargos">Encargos</a>
        <a href="#visitanos">Visitanos</a>
      </nav>
      <div className={`status-pill${status && !status.open ? " closed" : ""}`} id="statusPill">
        <StatusText status={status} />
      </div>
    </header>
  );
}
