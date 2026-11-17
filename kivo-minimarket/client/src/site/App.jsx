// =====================================================================
//  KIVO · Página pública
//  1. Trae del servidor los productos, precios, horarios y promos.
//  2. Arma cada parte de la página (cada una vive en su propio archivo).
// =====================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { storeStatus } from "../lib/schedule.js";
import { EMPTY_STORE, StoreProvider } from "./store.jsx";
import { ToastProvider } from "./toast.jsx";
import { CartProvider } from "./cart.jsx";
import { Topbar } from "./Topbar.jsx";
import { Hero } from "./Hero.jsx";
import { Marquee, Combo, Shelves } from "./Catalog.jsx";
import { Encargos, Visit, Footer } from "./Sections.jsx";
import { CartFab, CartPeek, CartDrawer } from "./CartDrawer.jsx";
import { Ruleta, isRuletaActive } from "./Ruleta.jsx";
import { Assistant } from "./Assistant.jsx";

async function loadStore() {
  try {
    const [products, categories, settings] = await Promise.all([api.products(), api.categories(), api.settings()]);
    return { loaded: true, products: products.filter((p) => p.activo !== false), categories, settings };
  } catch (error) {
    // Si el servidor no responde, la página igual se ve (sin productos)
    console.error("No se pudieron cargar los datos:", error);
    return { ...EMPTY_STORE, loaded: true };
  }
}

/** ¿Está abierto? Se recalcula solo cada minuto */
function useStoreStatus(store) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(timer);
  }, []);
  return store.loaded ? storeStatus(store.settings) : null;
}

/** Las secciones aparecen suavemente cuando entran en pantalla */
function useReveal(ready) {
  useEffect(() => {
    if (!ready) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.15 });
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ready]);
}

/**
 * Vuelve a pedir los ajustes (ruleta, combo, horarios...) cada minuto y cuando
 * la persona vuelve a la pestaña: si el dueño apaga algo, desaparece sin recargar.
 */
function useLiveSettings(loaded, setStore) {
  const refresh = useCallback(async () => {
    try {
      const settings = await api.settings();
      setStore((store) => ({ ...store, settings }));
      return settings;
    } catch {
      return null; // sin conexión: queda lo que había
    }
  }, [setStore]);

  useEffect(() => {
    if (!loaded) return;
    const timer = setInterval(refresh, 60_000);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    addEventListener("focus", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      removeEventListener("focus", onVisible);
    };
  }, [loaded, refresh]);

  return refresh;
}

export function App() {
  const [store, setStore] = useState(EMPTY_STORE);
  const [ruletaOpen, setRuletaOpen] = useState(false);
  const topbarRef = useRef(null);

  useEffect(() => { loadStore().then(setStore); }, []);
  useReveal(store.loaded);

  const refreshSettings = useLiveSettings(store.loaded, setStore);

  const status = useStoreStatus(store);
  const ruletaActive = isRuletaActive(store.settings.ruleta);
  const closeRuleta = useCallback(() => setRuletaOpen(false), []);
  // Antes de abrir la ruleta se confirma con el servidor que siga prendida
  const openRuleta = useCallback(async () => {
    const settings = await refreshSettings();
    if (!settings || isRuletaActive(settings.ruleta)) setRuletaOpen(true);
  }, [refreshSettings]);

  // Si el dueño la apaga mientras está abierta, se cierra
  useEffect(() => { if (!ruletaActive) setRuletaOpen(false); }, [ruletaActive]);

  return (
    <StoreProvider value={store}>
      <ToastProvider>
        <CartProvider>
          <Topbar ref={topbarRef} status={status} comboActive={Boolean(store.settings.combo?.activo)}
            ruletaActive={ruletaActive} onOpenRuleta={openRuleta} />

          {/* La entrada no depende de los datos: arranca ya */}
          <Hero status={status} topbarRef={topbarRef} />

          {store.loaded && (
            <>
              <Marquee />
              <Combo />
              <Shelves />
              <Encargos />
              <Visit status={status} />
              <Footer />

              <CartFab />
              <CartPeek />
              <CartDrawer />
              {ruletaActive && <Ruleta ruleta={store.settings.ruleta} isOpen={ruletaOpen} onOpen={openRuleta} onClose={closeRuleta} onEnded={refreshSettings} />}
              <Assistant storeOpen={status?.open} />
            </>
          )}
        </CartProvider>
      </ToastProvider>
    </StoreProvider>
  );
}
