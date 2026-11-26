// =====================================================================
//  LUZ SERENA PANEL · Lo que el panel tiene cargado, y las secciones del menú
//  Uso en una sección: const { leads, setLeads, isOwner } = useAdmin();
// =====================================================================

import { createContext, useContext } from "react";

export const AdminContext = createContext(null);
export const useAdmin = () => useContext(AdminContext);

export const LEAD_STATES = {
  nueva: "Nueva",
  contactada: "Contactada",
  visita: "Visita agendada",
  ingreso: "Ingresó",
  descartada: "Descartada",
};

export const POST_CATEGORIES = ["Recreación", "Salud", "Talleres", "Celebraciones", "Comunidad", "Novedades"];

// "owner: true" = solo la ve el dueño. Para agregar una sección nueva:
// sumala acá, creá su archivo en views/ y agregala en VIEWS (App.jsx).
export const SECTIONS = [
  { id: "resumen",     icon: "📊", name: "Resumen",     owner: true },
  { id: "consultas",   icon: "📥", name: "Consultas" },
  { id: "residentes",  icon: "🏡", name: "Residentes" },
  { id: "blog",        icon: "📝", name: "Blog" },
  { id: "actividades", icon: "📅", name: "Actividades" },
  { id: "ajustes",     icon: "⚙️", name: "Ajustes",     owner: true },
  { id: "equipo",      icon: "🔑", name: "Equipo",      owner: true },
];

export const allowedSections = (isOwner) => SECTIONS.filter((s) => !s.owner || isOwner);

/** "099 123 456" → link de WhatsApp a ese celular uruguayo, con mensaje */
export const waTo = (telefono, mensaje) =>
  `https://wa.me/598${String(telefono).replace(/\D/g, "").replace(/^0/, "")}?text=${encodeURIComponent(mensaje)}`;

/** "2026-11-25" → "25 de noviembre" (sin líos de zona horaria) */
export const niceDay = (fecha, options = { day: "numeric", month: "long" }) =>
  fecha ? new Date(`${fecha}T12:00:00`).toLocaleDateString("es-UY", options) : "";
