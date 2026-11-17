// =====================================================================
//  KIVO · Movimiento de la entrada
//  Mientras la persona scrollea: sube la cortina, se prenden las luces,
//  el carrito cruza la vereda de punta a punta y la "cámara" entra por la puerta.
//  "progress" va de 0 (arriba de todo) a 1 (fin de la entrada).
//  startHero(...) arranca todo y devuelve una función para apagarlo.
// =====================================================================

import { clamp, prefersReducedMotion } from "../lib/format.js";

const SVG_NS = "http://www.w3.org/2000/svg";

export function startHero({ hero, scene, copy, hint, topbar }) {
  const $ = (selector) => scene.querySelector(selector);
  const el = {
    svg: $("#heroSvg"), shutter: $("#shutter"), dark: $("#dark"), spill: $("#spill"), neon: $("#neonSign"),
    cart: $("#heroCart"), cartBody: $("#cartBody"), wheelA: $("#wheelA"), wheelB: $("#wheelB"), slats: $("#slats"),
  };

  // Ajustes según la pantalla (se recalculan al girar el celular)
  const layout = { cartFrom: 110, cartTo: 1320, zoom: 1.6 };

  // "Menos movimiento" (accesibilidad del sistema): la cortina y el carrito se mueven igual,
  // porque solo avanzan cuando la persona scrollea; se saca el zoom final.
  const calm = prefersReducedMotion();

  /** Dibuja las líneas horizontales de la cortina metálica */
  el.slats.replaceChildren();
  for (let y = 330; y < 660; y += 22) {
    const slat = document.createElementNS(SVG_NS, "rect");
    Object.entries({ x: 250, y, width: 700, height: 3, fill: "#5d666b", opacity: 0.6 })
      .forEach(([k, v]) => slat.setAttribute(k, v));
    el.slats.appendChild(slat);
  }

  /**
   * Encuadra el dibujo según la pantalla. El carrito arranca a la izquierda
   * del local (a la vista) y termina justo afuera del borde derecho.
   */
  function fitToScreen() {
    const ratio = innerWidth / innerHeight;
    if (ratio < 1) {
      // Celular parado: encuadre más cerrado para que el cartel entre entero (se ve de x=330 a x=870)
      el.svg.setAttribute("viewBox", "330 -170 540 970");
      el.svg.setAttribute("preserveAspectRatio", "xMidYMax meet");
      Object.assign(layout, { cartFrom: 350, cartTo: 870 + 10, zoom: 0.55 });
    } else {
      // Compu: en pantallas anchas y bajas se ve entero (sin cortarse arriba).
      // El alto del dibujo (970) llena la pantalla, así que el ancho visible es 970 × proporción.
      el.svg.setAttribute("viewBox", "0 -170 1200 970");
      el.svg.setAttribute("preserveAspectRatio", ratio > 1200 / 970 ? "xMidYMax meet" : "xMidYMax slice");
      const half = (970 * ratio) / 2;
      Object.assign(layout, { cartFrom: 110, cartTo: 600 + half + 10, zoom: 1.6 });
    }
  }

  // ---- Suavizado ----
  // La escena no copia el scroll al instante: lo "persigue" con un poquito de inercia,
  // así cada tirón de la ruedita se convierte en un movimiento continuo.
  const FOLLOW = 0.16;           // segundos que tarda en alcanzar el scroll (más chico = más pegado)
  let target = 0;                // hasta dónde scrolleó la persona (0 a 1)
  let shown = 0;                 // lo que se está dibujando ahora
  let cartPrevX = null, speed = 0, frame = 0, lastTime = 0;

  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
  const WHEEL_RADIUS = 11;

  function readScroll() {
    const rect = hero.getBoundingClientRect();
    target = clamp(-rect.top / (hero.offsetHeight - innerHeight));
    // Menú: escondido al principio, con fondo claro cuando hay algo detrás (esto va sin suavizar)
    topbar.classList.toggle("hide", scrollY < 40);
    topbar.classList.toggle("solid", rect.bottom < 80 || target > 0.62);
  }

  /** Dibuja la escena para un "progress" dado */
  function draw(progress, dt) {
    // 1. La cortina sube: arranca despacito (pesa), toma envión y frena arriba
    const shutterUp = easeInOut(clamp((progress - 0.02) / 0.43));
    // un temblorcito de chapa mientras se mueve
    const rattle = shutterUp > 0 && shutterUp < 1 ? Math.sin(progress * 260) * 0.6 * Math.sin(Math.PI * shutterUp) : 0;
    el.shutter.setAttribute("transform", `translate(${rattle.toFixed(2)} ${(-shutterUp * 335).toFixed(2)})`);

    // 2. Se prenden las luces de adentro y la luz en la vereda
    const light = easeInOutSine(clamp((progress - 0.22) / 0.3));
    el.dark.setAttribute("opacity", (0.85 * (1 - light)).toFixed(3));
    el.spill.setAttribute("opacity", light.toFixed(3));

    // ...y apenas empieza a subir la cortina, se prende el neón ABIERTO / CERRADO
    el.neon.classList.toggle("lit", progress > 0.04);

    // 3. El carrito: arranca suave, va andando y sale de pantalla
    const travel = easeInOutSine(clamp((progress - 0.05) / 0.6));
    const cartX = layout.cartFrom + travel * (layout.cartTo - layout.cartFrom);

    // velocidad (unidades del dibujo por segundo), suavizada para que no tiemble
    if (cartPrevX !== null && dt > 0) speed += ((cartX - cartPrevX) / dt - speed) * Math.min(1, dt * 10);
    cartPrevX = cartX;

    // ruedas: giran exactamente lo que avanzó el carrito (no "patinan")
    const wheelTurn = ((cartX / WHEEL_RADIUS) * (180 / Math.PI)) % 360;
    // se inclina para atrás al acelerar y para adelante al frenar; rebota según la velocidad
    const lean = clamp(-speed / 900, -5, 5);
    const bounce = -Math.abs(Math.sin(cartX / 14)) * clamp(Math.abs(speed) / 1200, 0, 1) * 2.5;

    el.cart.setAttribute("transform", `translate(${cartX.toFixed(2)} 0)`);
    el.wheelA.setAttribute("transform", `translate(36 696) rotate(${wheelTurn.toFixed(1)})`);
    el.wheelB.setAttribute("transform", `translate(88 696) rotate(${wheelTurn.toFixed(1)})`);
    el.cartBody.setAttribute("transform", `translate(0 ${bounce.toFixed(2)}) rotate(${lean.toFixed(2)} 62 700)`);

    // 4. Al final, la cámara entra por la puerta (salvo que la persona pida menos movimiento)
    const zoomIn = calm ? 0 : easeInOut(clamp((progress - 0.55) / 0.4));
    scene.style.transform = `scale(${(1 + zoomIn * layout.zoom).toFixed(4)})`;

    // Título de arriba y "Deslizá" se van apenas empieza
    copy.style.opacity = (1 - easeInOutSine(clamp(progress / 0.18))).toFixed(3);
    copy.style.transform = `translateY(${(-progress * 120).toFixed(1)}px)`;
    hint.style.opacity = progress > 0.05 ? 0 : 0.85;
  }

  /** Cada cuadro acerca lo dibujado al scroll; se detiene sola cuando llega */
  function tick(now) {
    const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 1 / 60;
    lastTime = now;
    shown += (target - shown) * (1 - Math.exp(-dt / FOLLOW));
    const done = Math.abs(target - shown) < 0.0004 && Math.abs(speed) < 2;
    if (done) { shown = target; speed = 0; }
    draw(shown, dt);
    frame = done ? 0 : requestAnimationFrame(tick);
    if (done) lastTime = 0;
  }

  function render() {
    readScroll();
    if (!frame) frame = requestAnimationFrame(tick);
  }

  fitToScreen();

  const onResize = () => { fitToScreen(); render(); };
  addEventListener("scroll", render, { passive: true });
  addEventListener("resize", onResize);
  // Primer dibujo: directo donde está (si recargó a mitad de página, no "viaja")
  readScroll();
  shown = target;
  draw(shown, 0);
  return () => {
    cancelAnimationFrame(frame);
    removeEventListener("scroll", render);
    removeEventListener("resize", onResize);
  };
}
