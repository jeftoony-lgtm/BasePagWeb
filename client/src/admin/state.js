// =====================================================================
//  INMOBILIARIA PANEL · Lo que el panel tiene cargado, y las secciones del menú
//  Uso en una sección: const { properties, setProperties, isOwner } = useAdmin();
// =====================================================================

import { createContext, useContext } from "react";

export const AdminContext = createContext(null);
export const useAdmin = () => useContext(AdminContext);

// "owner: true" = solo la ve el dueño. Para agregar una sección nueva:
// sumala acá, creá su archivo en views/ y agregala en VIEWS (App.jsx).
export const SECTIONS = [
  { id: "publicaciones", icon: "🏠", name: "Publicaciones" },
  { id: "graficas",      icon: "📊", name: "Gráficas",         owner: true },
  { id: "inmobiliaria",  icon: "⚙️", name: "Datos y contacto", owner: true },
  { id: "equipo",        icon: "🔑", name: "Equipo",           owner: true },
  { id: "papelera",      icon: "🗑️", name: "Papelera",         owner: true },
];

export const allowedSections = (isOwner) => SECTIONS.filter((s) => !s.owner || isOwner);
