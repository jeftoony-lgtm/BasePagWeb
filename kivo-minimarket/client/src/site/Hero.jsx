// =====================================================================
//  KIVO · Entrada: el local con la cortina baja y el cartel de neón.
//  Al scrollear se levanta la cortina y el carrito cruza la vereda.
//  El dibujo está en hero-scene.svg y el movimiento en hero-motion.js.
// =====================================================================

import { useEffect, useRef } from "react";
import sceneSvg from "./hero-scene.svg?raw";
import { startHero } from "./hero-motion.js";

export function Hero({ status, topbarRef }) {
  const heroRef = useRef(null);
  const sceneRef = useRef(null);
  const copyRef = useRef(null);
  const hintRef = useRef(null);

  useEffect(() => startHero({
    hero: heroRef.current, scene: sceneRef.current,
    copy: copyRef.current, hint: hintRef.current, topbar: topbarRef.current,
  }), [topbarRef]);

  // Cartel de neón: ABIERTO (verde) o CERRADO (rojo). Mientras carga, apagado.
  const state = status ? (status.open ? "open" : "closed") : "off";
  useEffect(() => {
    const sign = sceneRef.current.querySelector("#neonSign");
    sign.querySelector("#neonText").textContent = state === "closed" ? "CERRADO" : "ABIERTO";
    sign.classList.remove("open", "closed", "off");
    sign.classList.add(state);
  }, [state]);

  return (
    <section className="hero" id="top" ref={heroRef}>
      <div className="stage">
        {/* El dibujo no lo maneja React: lo mueve hero-motion.js */}
        <div className="scene" id="scene" ref={sceneRef} dangerouslySetInnerHTML={{ __html: sceneSvg }} />

        <div className="hero-copy" id="heroCopy" ref={copyRef}>
          <h1>Tu mini market<br />de <em>Solymar</em></h1>
          <p>Deslizá para abrir la cortina</p>
        </div>

        <div className="scroll-hint" id="scrollHint" ref={hintRef}><span></span>Deslizá</div>
      </div>
    </section>
  );
}
