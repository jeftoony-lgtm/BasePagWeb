// =====================================================================
//  KIVO · Tira que se desliza para el costado
//  Para las tarjetas de productos del chat y las sugerencias rápidas.
//  Se mueve con: el dedo (celular), las flechas ‹ ›, la ruedita del
//  mouse o arrastrando con el mouse.
// =====================================================================

import { useEffect, useRef, useState } from "react";

export function SideScroll({ className, children, hidden }) {
  const trackRef = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  // ¿Hay más contenido a la izquierda o a la derecha? (para mostrar las flechas)
  const update = () => {
    const el = trackRef.current;
    if (!el) return;
    setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    update();
    const resize = new ResizeObserver(update);
    resize.observe(el);

    // Ruedita del mouse: si la tira tiene más contenido, mueve para el costado
    const onWheel = (e) => {
      if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const atStart = el.scrollLeft <= 0 && e.deltaY < 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 && e.deltaY > 0;
      if (atStart || atEnd) return; // en los bordes, deja que se mueva el chat
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    // Arrastrar con el mouse (en el celular ya se desliza con el dedo)
    let drag = null;
    const onDown = (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      drag = { x: e.clientX, left: el.scrollLeft, moved: false };
    };
    const onMove = (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 5) drag.moved = true;
      if (drag.moved) { el.scrollLeft = drag.left - dx; el.classList.add("dragging"); }
    };
    const onUp = () => {
      if (drag?.moved) {
        // Que soltar el arrastre no cuente como tocar el "+"
        const swallow = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
        el.addEventListener("click", swallow, { capture: true, once: true });
        setTimeout(() => { el.removeEventListener("click", swallow, { capture: true }); el.classList.remove("dragging"); }, 50);
      }
      drag = null;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onDown);
    addEventListener("pointermove", onMove);
    addEventListener("pointerup", onUp);
    return () => {
      resize.disconnect();
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onDown);
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerup", onUp);
    };
  }, []);

  useEffect(update, [children]);

  const go = (direction) => {
    const el = trackRef.current;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className={`side-scroll${edges.left ? " more-left" : ""}${edges.right ? " more-right" : ""}`} hidden={hidden}>
      <button type="button" className="side-arrow left" aria-label="Ver anteriores" tabIndex={-1} onClick={() => go(-1)}>‹</button>
      <div className={className} ref={trackRef} onScroll={update}>{children}</div>
      <button type="button" className="side-arrow right" aria-label="Ver más" tabIndex={-1} onClick={() => go(1)}>›</button>
    </div>
  );
}
