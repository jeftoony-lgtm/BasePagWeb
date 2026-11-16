// =====================================================================
//  KIVO PANEL · Menú de secciones
//  "owner: true" = solo la ve el dueño. Para agregar una sección nueva:
//  sumala acá y creá su archivo en js/admin/views/.
// =====================================================================

import { $$ } from "./ui.js";
import { state, isOwner } from "./state.js";

export const SECTIONS = [
  { id: "resumen",   icon: "📊", name: "Resumen",        owner: true },
  { id: "pedidos",   icon: "🧾", name: "Pedidos" },
  { id: "productos", icon: "🛒", name: "Productos" },
  { id: "canjear",   icon: "🎟️", name: "Canjear código" },
  { id: "promos",    icon: "🎡", name: "Promos y local", owner: true },
  { id: "clientes",  icon: "👥", name: "Clientes",       owner: true },
  { id: "equipo",    icon: "🔑", name: "Equipo",         owner: true },
];

export const allowedSections = () => SECTIONS.filter((s) => !s.owner || isOwner());

export function renderNav() {
  const newOrders = state.orders.filter((o) => o.estado === "nuevo").length;

  const html = allowedSections().map((s) => {
    const badge = s.id === "pedidos" && newOrders ? `<span class="count">${newOrders}</span>` : "";
    return `<a href="#${s.id}" class="${state.view === s.id ? "on" : ""}"><span>${s.icon}</span>${s.name}${badge}</a>`;
  }).join("");

  $$("[data-nav]").forEach((nav) => (nav.innerHTML = html));
  document.title = (newOrders ? `(${newOrders}) ` : "") + "Panel · Kivo";
}
