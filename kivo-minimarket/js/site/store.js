// =====================================================================
//  KIVO · Lo que la página sabe del local
//  Se llena una sola vez al cargar (main.js) con los datos del panel.
// =====================================================================

import { firstEmoji } from "./utils.js";

export const store = {
  products: [],
  categories: [],
  settings: {},
};

// Encargos especiales: no tienen precio fijo, el local lo confirma por WhatsApp
const SPECIAL_ORDERS = {
  "enc-picada": { id: "enc-picada", nombre: "Encargo: Picada para el partido", detalle: "Precio a confirmar según cantidad", precio: null, emoji: "🧀" },
  "enc-cumple": { id: "enc-cumple", nombre: "Encargo: Cumpleaños", detalle: "Precio a confirmar", precio: null, emoji: "🎂" },
  "enc-asado":  { id: "enc-asado",  nombre: "Encargo: Pack asado", detalle: "Precio a confirmar", precio: null, emoji: "🔥" },
};

/** El combo del día armado como si fuera un producto más */
function comboItem() {
  const combo = store.settings.combo;
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
export function findItem(id) {
  if (id === "combo") return comboItem();
  return store.products.find((p) => p.id === id) || SPECIAL_ORDERS[id] || null;
}
