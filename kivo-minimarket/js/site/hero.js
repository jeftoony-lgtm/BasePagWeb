// =====================================================================
//  KIVO · Entrada animada
//  Mientras la persona scrollea: sube la cortina, se prenden las luces,
//  el carrito cruza la vereda y la "cámara" entra por la puerta.
//  "progress" va de 0 (arriba de todo) a 1 (fin de la entrada).
// =====================================================================

import { $, clamp, easeOut, prefersReducedMotion } from "./utils.js";

const SVG_NS = "http://www.w3.org/2000/svg";

// Ajustes según la pantalla (se recalculan al girar el celular)
const layout = { cartFrom: 110, cartTo: 1320, zoom: 1.6 };

let el = {};

/** Dibuja las líneas horizontales de la cortina metálica */
function drawShutterSlats() {
  for (let y = 330; y < 660; y += 22) {
    const slat = document.createElementNS(SVG_NS, "rect");
    Object.entries({ x: 250, y, width: 700, height: 3, fill: "#5d666b", opacity: 0.6 })
      .forEach(([k, v]) => slat.setAttribute(k, v));
    $("#slats").appendChild(slat);
  }
}

/** Encuadra el dibujo según la pantalla */
function fitToScreen() {
  const ratio = innerWidth / innerHeight;
  if (ratio < 1) {
    // Celular parado: encuadre más cerrado para que el cartel entre entero
    el.svg.setAttribute("viewBox", "330 -170 540 970");
    el.svg.setAttribute("preserveAspectRatio", "xMidYMax meet");
    Object.assign(layout, { cartFrom: 350, cartTo: 900, zoom: 0.55 });
  } else {
    // Compu: en pantallas anchas y bajas se ve entero (sin cortarse arriba)
    el.svg.setAttribute("viewBox", "0 -170 1200 970");
    el.svg.setAttribute("preserveAspectRatio", ratio > 1200 / 970 ? "xMidYMax meet" : "xMidYMax slice");
    Object.assign(layout, { cartFrom: 110, cartTo: 1320, zoom: 1.6 });
  }
}

/** Actualiza toda la escena según cuánto se scrolleó */
function render() {
  const rect = el.hero.getBoundingClientRect();
  const progress = clamp(-rect.top / (el.hero.offsetHeight - innerHeight));

  // 1. La cortina sube (en el primer 45% del recorrido)
  const shutterUp = easeOut(clamp(progress / 0.45));
  el.shutter.setAttribute("transform", `translate(0 ${-shutterUp * 335})`);

  // 2. Se prenden las luces de adentro, el cartel y la luz en la vereda
  const light = clamp((progress - 0.25) / 0.25);
  el.dark.setAttribute("opacity", (0.85 * (1 - light)).toFixed(3));
  el.spill.setAttribute("opacity", light.toFixed(2));
  el.signText.setAttribute("opacity", (0.35 + 0.65 * clamp((progress - 0.05) / 0.15)).toFixed(2));

  // 3. El carrito cruza la vereda, con las ruedas girando y un rebotito
  const cartX = layout.cartFrom + clamp(progress / 0.6) * (layout.cartTo - layout.cartFrom);
  const wheelTurn = ((cartX * 2.2) % 360).toFixed(1);
  el.cart.setAttribute("transform", `translate(${cartX.toFixed(1)} 0)`);
  el.wheelA.setAttribute("transform", `translate(36 696) rotate(${wheelTurn})`);
  el.wheelB.setAttribute("transform", `translate(88 696) rotate(${wheelTurn})`);
  el.cartBody.setAttribute("transform", `translate(0 ${(-Math.abs(Math.sin(cartX / 22)) * 3).toFixed(1)})`);

  // 4. Al final, la cámara entra por la puerta y aparece la bienvenida
  const zoomIn = clamp((progress - 0.55) / 0.35);
  el.scene.style.transform = `scale(${1 + easeOut(zoomIn) * layout.zoom})`;

  const welcome = clamp((progress - 0.72) / 0.18);
  el.welcome.style.opacity = welcome;
  el.welcome.style.pointerEvents = welcome > 0.6 ? "auto" : "none";
  el.welcome.querySelector(".card").style.transform = `translateY(${(1 - welcome) * 40}px) scale(${0.92 + 0.08 * welcome})`;

  // Título de arriba y "Deslizá" se van apenas empieza
  el.copy.style.opacity = 1 - clamp(progress / 0.18);
  el.copy.style.transform = `translateY(${-progress * 120}px)`;
  el.hint.style.opacity = progress > 0.05 ? 0 : 0.85;

  // Menú: escondido al principio, con fondo claro cuando hay algo detrás
  el.topbar.classList.toggle("hide", scrollY < 40);
  el.topbar.classList.toggle("solid", rect.bottom < 80 || progress > 0.62);
}

/** Si la persona pidió menos movimiento: mostramos el local ya abierto */
function renderStatic() {
  el.hero.style.height = "100vh";
  el.shutter.setAttribute("transform", "translate(0 -335)");
  el.dark.setAttribute("opacity", 0);
  el.welcome.style.opacity = 1;
  el.welcome.style.pointerEvents = "auto";
  addEventListener("scroll", () => {
    el.topbar.classList.toggle("hide", scrollY < 40);
    el.topbar.classList.toggle("solid", scrollY > innerHeight - 80);
  }, { passive: true });
}

export function initHero() {
  el = {
    hero: $(".hero"), scene: $("#scene"), svg: $("#heroSvg"), topbar: $("#topbar"),
    shutter: $("#shutter"), dark: $("#dark"), spill: $("#spill"), signText: $("#signText"),
    cart: $("#heroCart"), cartBody: $("#cartBody"), wheelA: $("#wheelA"), wheelB: $("#wheelB"),
    welcome: $("#welcome"), copy: $("#heroCopy"), hint: $("#scrollHint"),
  };

  drawShutterSlats();
  fitToScreen();

  if (prefersReducedMotion()) return renderStatic();

  addEventListener("scroll", render, { passive: true });
  addEventListener("resize", () => { fitToScreen(); render(); });
  render();
}
