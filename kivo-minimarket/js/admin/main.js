// =====================================================================
//  KIVO PANEL · Arranque
//  1. Si no hay nadie adentro → pantalla de entrar.
//  2. Si la cuenta no está activada → pantalla de espera.
//  3. Si está todo bien → carga los datos y muestra la sección pedida.
// =====================================================================

import { $, $$, isModalOpen, closeModal, confirmDialog } from "./ui.js";
import { state, isOwner } from "./state.js";
import { renderNav, allowedSections } from "./nav.js";
import { initAuth } from "./auth.js";
import { data } from "../data/index.js";

import { renderResumen } from "./views/resumen.js";
import { renderPedidos, onOrderEvent, refreshOrders } from "./views/pedidos.js";
import { renderProductos } from "./views/productos.js";
import { renderCanjear } from "./views/canjear.js";
import { renderPromos } from "./views/promos.js";
import { renderClientes } from "./views/clientes.js";
import { renderEquipo } from "./views/equipo.js";

const VIEWS = {
  resumen: renderResumen,
  pedidos: renderPedidos,
  productos: renderProductos,
  canjear: renderCanjear,
  promos: renderPromos,
  clientes: renderClientes,
  equipo: renderEquipo,
};

/** Muestra la sección que dice la dirección (#pedidos, #productos...) */
function route() {
  const allowed = allowedSections().map((s) => s.id);
  const wanted = location.hash.slice(1);
  state.view = allowed.includes(wanted) ? wanted : "pedidos"; // si no tiene permiso, va a Pedidos
  renderNav();
  $(".mobile-bar .tabs a.on")?.scrollIntoView({ inline: "center", block: "nearest" });
  VIEWS[state.view]();
}

let listeningOrders = false;

async function boot() {
  $("#demoBar").hidden = !data.demo;

  try {
    state.me = await data.me();
  } catch (error) {
    console.error(error);
    state.me = null;
  }

  const me = state.me;
  $("#authScreen").hidden = Boolean(me);
  $("#pendingScreen").hidden = !(me && !me.activo);
  $("#app").hidden = !(me && me.activo);
  if (!me?.activo) return;

  $$("[data-user-name]").forEach((el) => (el.textContent = me.nombre));
  $("#userRole").textContent = isOwner() ? "Dueño" : "Empleado";
  $("#userRole").className = "role" + (isOwner() ? "" : " emp");

  try {
    [state.categories, state.products, state.settings, state.orders] =
      await Promise.all([data.categories(), data.products(), data.settings(), data.orders(30)]);
  } catch (error) {
    console.error(error);
  }

  if (!listeningOrders) {
    listeningOrders = true;
    data.onOrders(onOrderEvent); // pedidos en vivo
  }
  route();
}

async function logout() {
  await data.signOut();
  history.replaceState(null, "", location.pathname);
  boot();
}

/* ---------- Eventos generales ---------- */
addEventListener("hashchange", () => state.me?.activo && route());
$$("[data-logout]").forEach((button) => button.addEventListener("click", logout));
$("#modal").addEventListener("click", (e) => e.target.id === "modal" && closeModal());
addEventListener("keydown", (e) => e.key === "Escape" && closeModal());
data.onAuth((session) => { if (!session && state.me) { state.me = null; boot(); } });

// Los "hace 5 min" de los pedidos se actualizan solos
setInterval(() => { if (state.view === "pedidos" && !isModalOpen()) refreshOrders(); }, 60_000);

// Botones del modo demo
if (data.demo) {
  $("#demoOrder").addEventListener("click", () => data.demoFakeOrder());
  $("#demoReset").addEventListener("click", async () => {
    if (await confirmDialog("¿Reiniciar los datos de prueba?", "Vuelven los productos y pedidos de ejemplo.", "Reiniciar")) {
      data.demoReset();
      boot();
    }
  });
}

initAuth(boot);
boot();
