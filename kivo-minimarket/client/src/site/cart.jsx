// =====================================================================
//  KIVO · Canasta: lo que la persona eligió
//  Uso: const cart = useCart(); cart.add(id); cart.remove(id, 1);
//  Se guarda en la pestaña (sessionStorage) para no perderla al recargar.
// =====================================================================

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { tabStorage } from "../lib/format.js";
import { useFindItem, useStore } from "./store.jsx";

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

/** Animación: el producto vuela desde el botón tocado hasta la canasta */
function flyToCart(fromElement, emoji, fab, onLanded) {
  if (!fab) return;
  fab.classList.add("show");

  const from = fromElement.getBoundingClientRect();
  const to = fab.getBoundingClientRect();
  const flyer = document.createElement("div");
  flyer.className = "flyer";
  flyer.textContent = emoji;
  document.body.appendChild(flyer);

  const x0 = from.left + from.width / 2 - 20, y0 = from.top + from.height / 2 - 24;
  const x1 = to.left + 24, y1 = to.top + 4;
  flyer.animate([
    { transform: `translate(${x0}px, ${y0}px) scale(1)` },
    { transform: `translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - 160}px) scale(1.4) rotate(-20deg)`, offset: 0.45 },
    { transform: `translate(${x1}px, ${y1}px) scale(.4) rotate(20deg)`, opacity: 0.6 },
  ], { duration: 750, easing: "cubic-bezier(.4,0,.2,1)" }).onfinish = () => {
    flyer.remove();
    onLanded();
  };
}

export function CartProvider({ children }) {
  const store = useStore();
  const findItem = useFindItem();

  // La canasta vive en un ref (así varias acciones seguidas del asistente ven el valor al día)
  // y "version" hace que React vuelva a dibujar cuando cambia.
  const linesRef = useRef(new Map(tabStorage.get("kivo-cart", []))); // id → cantidad
  const [version, setVersion] = useState(0);
  const [isOpen, setOpen] = useState(false);
  // Último producto agregado: hace aparecer la canasta chiquita arriba a la derecha
  const [peek, setPeek] = useState(null); // { id, n }
  const fabRef = useRef(null);

  const commit = useCallback((next) => {
    linesRef.current = next;
    tabStorage.set("kivo-cart", [...next]);
    setVersion((v) => v + 1);
  }, []);

  // Si algo dejó de existir (ej: el dueño lo borró), lo sacamos
  useEffect(() => {
    if (!store.loaded) return;
    const current = linesRef.current;
    const next = new Map([...current].filter(([id]) => findItem(id)));
    if (next.size !== current.size) commit(next);
  }, [store.loaded, findItem, commit]);

  /** Hace "saltar" el botón de la canasta */
  const bump = useCallback(() => {
    const fab = fabRef.current;
    if (!fab) return;
    fab.classList.remove("bump");
    void fab.offsetWidth; // reinicia la animación
    fab.classList.add("bump");
  }, []);

  /** Agrega un producto. "fromElement" es el botón tocado (para la animación) */
  const add = useCallback((id, quantity = 1, fromElement = null) => {
    const item = findItem(id);
    if (!item || item.en_stock === false) return false;
    const next = new Map(linesRef.current);
    next.set(id, (next.get(id) || 0) + quantity);
    commit(next);
    const showPeek = () => setPeek({ id, n: Date.now() });
    if (fromElement) flyToCart(fromElement, item.emoji, fabRef.current, () => { bump(); showPeek(); });
    else showPeek();
    return true;
  }, [findItem, commit, bump]);

  /** Saca un producto (todo, o solo algunas unidades) */
  const remove = useCallback((id, quantity = null) => {
    const current = linesRef.current;
    if (!current.has(id)) return false;
    const next = new Map(current);
    const left = quantity ? current.get(id) - quantity : 0;
    if (left > 0) next.set(id, left);
    else next.delete(id);
    commit(next);
    return true;
  }, [commit]);

  const clear = useCallback(() => commit(new Map()), [commit]);

  const value = useMemo(() => {
    const lines = linesRef.current;
    let total = 0, count = 0, pending = false;
    for (const [id, qty] of lines) {
      const item = findItem(id);
      if (!item) continue;
      count += qty;
      if (item.precio == null) pending = true;
      else total += item.precio * qty;
    }
    return {
      lines, total, count, pending, add, remove, clear, bump, fabRef, isOpen, setOpen, peek, setPeek,
      /** Resumen para el asistente: [{ id, nombre, cantidad }] */
      summary: () => [...linesRef.current].map(([id, cantidad]) => ({ id, nombre: findItem(id)?.nombre, cantidad })),
    };
  }, [version, findItem, add, remove, clear, bump, isOpen, peek]); // "version" cambia cuando cambia la canasta

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/** Agrega (aparece la canasta chiquita). Los encargos abren la canasta para completar los datos */
export function useAddToCart() {
  const { add, setOpen } = useCart();
  return useCallback((id, element) => {
    if (!add(id, 1, element)) return false;
    if (id.startsWith("enc-")) setTimeout(() => setOpen(true), 500);
    return true;
  }, [add, setOpen]);
}

/** Botón "+" de un producto: muestra un ✓ un ratito después de agregar */
export function AddButton({ id, label, disabled = false }) {
  const addToCart = useAddToCart();
  const [done, setDone] = useState(false);

  const onClick = (event) => {
    if (!addToCart(id, event.currentTarget)) return;
    setDone(true);
    setTimeout(() => setDone(false), 900);
  };

  return (
    <button className={`add${done ? " done" : ""}`} aria-label={label} disabled={disabled} onClick={onClick}>
      {done ? "✓" : "+"}
    </button>
  );
}
