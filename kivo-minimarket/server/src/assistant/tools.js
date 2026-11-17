// =====================================================================
//  KIVO · Herramientas que la IA puede usar sobre la canasta
//  La IA no toca la canasta de verdad: el servidor lleva una copia,
//  la actualiza y devuelve "acciones" para que la página las aplique:
//    { type: "add", id, cantidad } · { type: "remove", id, cantidad }
//    { type: "show", ids: [...] }  · { type: "checkout" }
// =====================================================================

export const TOOLS = [
  {
    name: "agregar_a_canasta",
    description: "Suma productos del catálogo a la canasta de la persona. Usalo cuando quiere algo concreto.",
    input_schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              ref: { type: "string", description: "Referencia del catálogo, ej. P3 o COMBO" },
              cantidad: { type: "integer", minimum: 1, maximum: 50 },
            },
            required: ["ref", "cantidad"],
          },
        },
      },
      required: ["items"],
    },
  },
  {
    name: "quitar_de_canasta",
    description: "Saca productos de la canasta. Sin cantidad, saca todas las unidades de ese producto.",
    input_schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: { ref: { type: "string" }, cantidad: { type: "integer", minimum: 1 } },
            required: ["ref"],
          },
        },
      },
      required: ["items"],
    },
  },
  {
    name: "mostrar_productos",
    description: "Muestra tarjetas de productos en el chat para que la persona elija tocando +. Usalo para dar opciones.",
    input_schema: {
      type: "object",
      properties: { refs: { type: "array", items: { type: "string" }, maxItems: 8 } },
      required: ["refs"],
    },
  },
  {
    name: "terminar_pedido",
    description: "Muestra el botón para revisar la canasta y enviar el pedido por WhatsApp. Usalo cuando la persona terminó.",
    input_schema: { type: "object", properties: {} },
  },
];

/** Ejecuta una herramienta y devuelve el texto que se le cuenta a la IA */
export function runTool(name, input, catalog, cart, actions) {
  const byRef = (ref) => catalog.find((c) => c.ref === String(ref).toUpperCase());
  const cartText = () => {
    const lines = [...cart].map(([id, q]) => { const c = catalog.find((x) => x.id === id); return c ? `${q}× ${c.nombre}` : null; }).filter(Boolean);
    const total = [...cart].reduce((sum, [id, q]) => sum + (catalog.find((x) => x.id === id)?.precio || 0) * q, 0);
    return lines.length ? `Canasta: ${lines.join(", ")}. Total $${total}.` : "La canasta quedó vacía.";
  };

  if (name === "agregar_a_canasta") {
    const notes = [];
    for (const { ref, cantidad } of input?.items || []) {
      const item = byRef(ref);
      const qty = Math.min(50, Math.max(1, Number(cantidad) || 1));
      if (!item) { notes.push(`${ref} no existe en el catálogo`); continue; }
      if (!item.en_stock) { notes.push(`${item.nombre} está SIN STOCK, no se agregó`); continue; }
      cart.set(item.id, (cart.get(item.id) || 0) + qty);
      actions.push({ type: "add", id: item.id, cantidad: qty });
      notes.push(`agregado ${qty}× ${item.nombre}`);
    }
    return `${notes.join("; ")}. ${cartText()}`;
  }

  if (name === "quitar_de_canasta") {
    const notes = [];
    for (const { ref, cantidad } of input?.items || []) {
      const item = byRef(ref);
      if (!item || !cart.has(item.id)) { notes.push(`${ref} no estaba en la canasta`); continue; }
      const left = cantidad ? cart.get(item.id) - cantidad : 0;
      if (left > 0) cart.set(item.id, left); else cart.delete(item.id);
      actions.push({ type: "remove", id: item.id, cantidad: cantidad || null });
      notes.push(`sacado ${item.nombre}`);
    }
    return `${notes.join("; ")}. ${cartText()}`;
  }

  if (name === "mostrar_productos") {
    const ids = (input?.refs || []).map(byRef).filter(Boolean).map((c) => c.id);
    if (ids.length) actions.push({ type: "show", ids });
    return ids.length ? `Se mostraron ${ids.length} productos en el chat.` : "Ninguna ref era válida.";
  }

  if (name === "terminar_pedido") {
    if (!cart.size) return "La canasta está vacía: primero hay que sumar algo.";
    actions.push({ type: "checkout" });
    return `Se mostró el botón para enviar el pedido. ${cartText()}`;
  }

  return "Herramienta desconocida.";
}
