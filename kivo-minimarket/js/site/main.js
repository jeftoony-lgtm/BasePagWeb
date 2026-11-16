// =====================================================================
//  KIVO · Arranque de la página
//  1. Trae del panel los productos, precios, horarios y promos.
//  2. Prende cada parte de la página (cada una vive en su propio archivo).
// =====================================================================

import { $$ } from "./utils.js";
import { store } from "./store.js";
import { data } from "../data/index.js";
import { DEFAULT_SETTINGS, CATEGORIES } from "../data/seed.js";

import { initHero } from "./hero.js";
import { initStatus } from "./status.js";
import { initCatalog } from "./catalog.js";
import { initCart } from "./cart.js";
import { initRuleta } from "./ruleta.js";
import { initAssistant } from "./assistant.js";

/** Las secciones aparecen suavemente cuando entran en pantalla */
function initReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("in");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.15 });
  $$(".reveal").forEach((el) => observer.observe(el));
}

async function loadStore() {
  try {
    const [products, categories, settings] = await Promise.all([data.products(), data.categories(), data.settings()]);
    store.products = products.filter((p) => p.activo !== false);
    store.categories = categories;
    store.settings = { ...DEFAULT_SETTINGS, ...settings };
  } catch (error) {
    // Si la base de datos no responde, la página igual se ve (sin productos)
    console.error("No se pudieron cargar los datos:", error);
    store.categories = CATEGORIES;
    store.settings = DEFAULT_SETTINGS;
  }
}

initHero(); // la entrada no depende de los datos: arranca ya
await loadStore();
initStatus();
initCatalog();
initCart();
initRuleta();
initAssistant();
initReveal();
