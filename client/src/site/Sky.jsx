// =====================================================================
//  LUZ SERENA · "La luz que acompaña"
//  Un sol suave cruza la pantalla mientras se baja por la página y el
//  fondo cambia de color como pasa el día (amanecer → tarde).
//  Si la persona pidió menos movimiento, queda quieto.
// =====================================================================

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "../lib/format.js";

const STOPS = [[255, 246, 226], [251, 246, 236], [250, 236, 220]];

export function Sky() {
  const sky = useRef(null);
  const sun = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let frame = 0;
    const paint = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - innerHeight || 1;
      const p = Math.min(1, scrollY / max);
      const [a, b] = p < 0.5 ? [STOPS[0], STOPS[1]] : [STOPS[1], STOPS[2]];
      const t = p < 0.5 ? p * 2 : (p - 0.5) * 2;
      const color = a.map((v, i) => Math.round(v + (b[i] - v) * t));
      sky.current.style.setProperty("--sky", `rgb(${color})`);
      const x = innerWidth * (0.85 - 0.95 * p) - 260;
      const y = -160 - Math.sin(p * Math.PI) * 60 + p * innerHeight * 0.55;
      sun.current.style.setProperty("--sx", `${x}px`);
      sun.current.style.setProperty("--sy", `${y}px`);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(paint); };
    paint();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => { removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll); cancelAnimationFrame(frame); };
  }, []);

  return (
    <>
      <div id="sky" ref={sky} aria-hidden="true"></div>
      <div id="sun" ref={sun} aria-hidden="true"></div>
    </>
  );
}
