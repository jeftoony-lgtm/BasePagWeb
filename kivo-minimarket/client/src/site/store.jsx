// =====================================================================
//  KIVO · Lo que la página sabe del local (productos, categorías, ajustes)
//  Se carga una sola vez al abrir la página (App.jsx).
// =====================================================================

import { createContext, useContext, useMemo } from "react";
import { firstEmoji } from "../lib/format.js";

export const EMPTY_STORE = { loaded: false, products: [], categories: [], settings: {} };

const StoreContext = createContext(EMPTY_STORE);
export const StoreProvider = StoreContext.Provider;
export const useStore = () => useContext(StoreContext);

// Encargos especiales: no tienen precio fijo, el local lo confirma por WhatsApp
const SPECIAL_ORDERS = {
  "enc-picada": { id: "enc-picada", nombre: "Encargo: Picada para el partido", detalle: "Precio a confirmar según cantidad", precio: null, emoji: "🧀" },
  "enc-cumple": { id: "enc-cumple", nombre: "Encargo: Cumpleaños", detalle: "Precio a confirmar", precio: null, emoji: "🎂" },
  "enc-asado":  { id: "enc-asado",  nombre: "Encargo: Pack asado", detalle: "Precio a confirmar", precio: null, emoji: "🔥" },
};

/** El combo del día armado como si fuera un producto más */
function comboItem(settings) {
  const combo = settings.combo;
  if (!combo?.activo) return null;
  return {
    id: "combo",
    nombre: combo.titulo,
    detalle: (combo.items || []).map((i) => i.replace(firstEmoji(i), "").trim()).join(" + "),
    precio: Number(combo.precio) || 0,
    emoji: firstEmoji(combo.items?.[0] || "") || "⚽",
  };
}

/** Busca cualquier cosa que se pueda poner en la canasta por su id */
export function useFindItem() {
  const store = useStore();
  return useMemo(() => {
    const combo = comboItem(store.settings);
    const byId = new Map(store.products.map((p) => [p.id, p]));
    return (id) => (id === "combo" ? combo : byId.get(id) || SPECIAL_ORDERS[id] || null);
  }, [store]);
}
