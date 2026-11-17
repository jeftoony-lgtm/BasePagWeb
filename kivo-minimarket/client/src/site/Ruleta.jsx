// =====================================================================
//  KIVO · Ruleta de promos
//  Solo aparece si el dueño la prende en el panel (y no pasó la fecha de fin).
//  El premio lo sortea el servidor; acá solo se anima la rueda hasta él.
// =====================================================================

import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { dateInUruguay } from "../lib/schedule.js";

const RADIUS = 190;

export function isRuletaActive(ruleta) {
  return Boolean(ruleta?.activa && ruleta.premios?.length && (!ruleta.hasta || dateInUruguay() <= ruleta.hasta));
}

/** Punto sobre el círculo a cierto ángulo (0° = arriba) */
const pointAt = (angle, r) => [r * Math.sin((angle * Math.PI) / 180), -r * Math.cos((angle * Math.PI) / 180)];

function Wheel({ prizes, rotation, ref }) {
  const slice = 360 / prizes.length;
  return (
    <svg className="wheel" id="wheel" viewBox="-200 -200 400 400" ref={ref} style={{ transform: `rotate(${rotation}deg)` }}>
      <circle r="198" fill="#fff" />
      {prizes.map((prize, i) => {
        const start = i * slice, middle = start + slice / 2;
        const [x0, y0] = pointAt(start, RADIUS);
        const [x1, y1] = pointAt(start + slice, RADIUS);
        return (
          <g key={i}>
            <path d={`M0 0L${x0} ${y0}A${RADIUS} ${RADIUS} 0 0 1 ${x1} ${y1}Z`} fill={prize.c} stroke="#fff" strokeWidth="3" />
            <text transform={`rotate(${middle}) translate(0 -118) rotate(90)`} textAnchor="middle" dominantBaseline="middle"
              fill="#fff" fontFamily="Bricolage Grotesque" fontWeight="800" fontSize="19">{prize.t}</text>
          </g>
        );
      })}
      {/* Lucecitas del borde */}
      {prizes.map((_, i) => {
        const [x, y] = pointAt(i * slice, 192);
        return <circle key={`l${i}`} cx={x} cy={y} r="5" fill="#ffd98a" />;
      })}
    </svg>
  );
}

function confetti(wheel) {
  const colors = ["#5a9f43", "#e8952f", "#ffd98a", "#fff", "#2f6b2a"];
  const center = wheel.getBoundingClientRect();
  for (let i = 0; i < 70; i++) {
    const piece = document.createElement("div");
    piece.style.cssText = `position:fixed;z-index:80;width:9px;height:14px;border-radius:2px;pointer-events:none;
      background:${colors[i % colors.length]};left:${center.left + center.width / 2}px;top:${center.top + center.height / 2}px`;
    document.body.appendChild(piece);
    const angle = Math.random() * Math.PI * 2, distance = 160 + Math.random() * 260;
    piece.animate([
      { transform: "translate(0,0) rotate(0)", opacity: 1 },
      { transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance + 200}px) rotate(${Math.random() * 720}deg)`, opacity: 0 },
    ], { duration: 1400 + Math.random() * 800, easing: "cubic-bezier(.2,.7,.4,1)" }).onfinish = () => piece.remove();
  }
}

export function Ruleta({ ruleta, isOpen, onOpen, onClose, onEnded }) {
  const [rotation, setRotation] = useState(0);
  const [form, setForm] = useState({ name: "", phone: "", accept: false });
  const [error, setError] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null); // { name, premio, code }
  const wheelRef = useRef(null);
  const prizeRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onClose]);

  // Cuando aparece el resultado: se muestra y, si ganó, papelitos
  useEffect(() => {
    if (!result) return;
    prizeRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    if (result.premio) confetti(wheelRef.current);
  }, [result]);

  /** Gira la rueda hasta caer en el premio "index" */
  function spinTo(index) {
    const slice = 360 / ruleta.premios.length;
    const wobble = Math.random() * slice * 0.6 - slice * 0.3;
    const target = 360 * 6 + (360 - (index * slice + slice / 2)) + wobble;
    setRotation((r) => r + target - (r % 360));
  }

  async function onSubmit(event) {
    event.preventDefault();
    const name = form.name.trim();
    const phone = form.phone.replace(/\D/g, "");
    if (!name) return setError("Poné tu nombre.");
    if (!/^09\d{7}$/.test(phone)) return setError("El celular tiene que ser uruguayo, tipo 099 123 456.");

    setError("");
    setSpinning(true);
    try {
      const answer = await api.spin(name, phone, form.accept);
      spinTo(answer.indice);
      setTimeout(() => setResult({ name, ...answer }), 5100);
    } catch (e) {
      setError(e.message.includes("Ya giraste") ? "Ya giraste en esta promo. ¡Atento a la próxima!" : e.message);
      setSpinning(false);
      // El local la apagó o terminó la promo: se actualiza la página y la ruleta desaparece
      if (/no está activa|ya terminó/.test(e.message)) setTimeout(onEnded, 1800);
    }
  }

  const until = ruleta.hasta ? (() => { const [, month, day] = ruleta.hasta.split("-"); return `Promo válida hasta el ${day}/${month}`; })() : "Promo por tiempo limitado";

  return (
    <>
      <button className="promo-tab" id="promoTab" aria-label="Abrir la ruleta de promos" onClick={onOpen}>
        <span className="mini-wheel"></span>
        <span className="label">¡Ruleta de promos!<small>Girá y ganá</small></span>
      </button>

      <div className={`promo-modal${isOpen ? " open" : ""}`} id="ruletaModal" role="dialog" aria-modal="true" aria-labelledby="ruletaTitle"
        onClick={(e) => e.target === e.currentTarget && onClose()}>
        <section className="wheel-card" id="ruleta">
          <button className="close-btn" aria-label="Cerrar" onClick={onClose}>✕</button>
          <div className="inner">
            <div>
              <span className="eyebrow">{until}</span>
              <h2 className="h2" id="ruletaTitle">Girá la <em>ruleta Kivo</em></h2>
              <p className="lead">Dejá tu nombre y tu celular, girá y llevate un premio para tu próxima compra en el local.</p>
              <form className="wheel-form" noValidate onSubmit={onSubmit}>
                <div className="field"><label htmlFor="wName">Nombre</label>
                  <input id="wName" autoComplete="given-name" placeholder="Ej: Rodrigo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="field"><label htmlFor="wPhone">Celular</label>
                  <input id="wPhone" inputMode="tel" autoComplete="tel" placeholder="09X XXX XXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <label className="check"><input type="checkbox" checked={form.accept} onChange={(e) => setForm({ ...form, accept: e.target.checked })} /> Quiero recibir las promos de Kivo por WhatsApp.</label>
                <div className="form-error">{error}</div>
                <button className="btn btn-orange" type="submit" disabled={spinning}>🎡 ¡Girar!</button>
              </form>
              <div className={`prize${result ? " show" : ""}`} id="prize" ref={prizeRef}>
                {result && (result.premio ? (
                  <>
                    <b>¡Ganaste, {result.name}! 🎉</b>{result.premio}.<br />Mostrá este código en caja:<br />
                    <code>{result.code}</code><p>Válido por 7 días. Le podés sacar una captura.</p>
                  </>
                ) : (
                  <><b>¡Uh, casi, {result.name}!</b>Esta vez no tocó, pero te vamos a avisar de las próximas promos.</>
                ))}
              </div>
            </div>
            <div className="wheel-box">
              <div className="pointer"></div>
              <Wheel prizes={ruleta.premios} rotation={rotation} ref={wheelRef} />
              <div className="hub"><svg viewBox="0 0 100 100"><use href="#cart" /></svg></div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
