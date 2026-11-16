// =====================================================================
//  KIVO PANEL · Lo que el panel tiene cargado en memoria
// =====================================================================

export const state = {
  me: null,          // el usuario que entró: { nombre, rol, activo, ... }
  view: null,        // sección abierta: "pedidos", "productos", ...
  products: [],
  categories: [],
  settings: {},
  orders: [],
};

export const isOwner = () => state.me?.rol === "dueno";

export const ORDER_STATES = {
  nuevo: "Nuevo",
  preparando: "Preparando",
  listo: "Listo",
  entregado: "Entregado",
  cancelado: "Cancelado",
};
