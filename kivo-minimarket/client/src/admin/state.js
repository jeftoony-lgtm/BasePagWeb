// =====================================================================
//  KIVO PANEL · Lo que el panel tiene cargado, y las secciones del menú
//  Uso en una sección: const { products, setProducts, isOwner } = useAdmin();
// =====================================================================

import { createContext, useContext } from "react";

export const AdminContext = createContext(null);
export const useAdmin = () => useContext(AdminContext);

export const ORDER_STATES = {
  nuevo: "Nuevo",
  preparando: "Preparando",
  listo: "Listo",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

// "owner: true" = solo la ve el dueño. Para agregar una sección nueva:
// sumala acá, creá su archivo en views/ y agregala en VIEWS (App.jsx).
export const SECTIONS = [
  { id: "resumen",   icon: "📊", name: "Resumen",        owner: true },
  { id: "pedidos",   icon: "🧾", name: "Pedidos" },
  { id: "productos", icon: "🛒", name: "Productos" },
  { id: "canjear",   icon: "🎟️", name: "Canjear código" },
  { id: "promos",    icon: "🎡", name: "Promos y local", owner: true },
  { id: "clientes",  icon: "👥", name: "Clientes",       owner: true },
  { id: "equipo",    icon: "🔑", name: "Equipo",         owner: true },
];

export const allowedSections = (isOwner) => SECTIONS.filter((s) => !s.owner || isOwner);
