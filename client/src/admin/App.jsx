// =====================================================================
//  KIVO PANEL · Arranque y menú
//  1. Si no hay nadie adentro → pantalla de entrar.
//  2. Si la cuenta no está activada → pantalla de espera.
//  3. Si está todo bien → carga los datos y muestra la sección pedida (#pedidos, #productos...).
// =====================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { money } from "../lib/format.js";
import { AdminContext, allowedSections } from "./state.js";
import { ModalProvider, useToast, beep } from "./ui.jsx";
import { AuthScreen, PendingScreen } from "./Auth.jsx";

import { Resumen } from "./views/Resumen.jsx";
import { Pedidos } from "./views/Pedidos.jsx";
import { Productos } from "./views/Productos.jsx";
import { Canjear } from "./views/Canjear.jsx";
import { Promos } from "./views/Promos.jsx";
import { Clientes } from "./views/Clientes.jsx";
import { Equipo } from "./views/Equipo.jsx";

const VIEWS = {
  resumen: Resumen,
  pedidos: Pedidos,
  productos: Productos,
  canjear: Canjear,
  promos: Promos,
  clientes: Clientes,
  equipo: Equipo,
};

const EMPTY = { products: [], categories: [], settings: {}, orders: [] };
const Logo = () => <div className="logo"><svg><use href="#cart" /></svg><b>KIV<i>O</i></b></div>;

function Nav({ sections, current, newOrders }) {
  return sections.map((s) => (
    <a key={s.id} href={`#${s.id}`} className={current === s.id ? "on" : ""}>
      <span>{s.icon}</span>{s.name}
      {s.id === "pedidos" && newOrders > 0 && <span className="count">{newOrders}</span>}
    </a>
  ));
}

export function AdminApp() {
  const toast = useToast();
  const [me, setMe] = useState(undefined); // undefined = cargando, null = nadie adentro
  const [data, setData] = useState(EMPTY);
  const [hash, setHash] = useState(() => location.hash.slice(1));

  const boot = useCallback(async () => {
    let user = null;
    try {
      user = await api.me();
    } catch (error) {
      console.error(error);
    }
    if (user?.activo) {
      try {
        const [categories, products, settings, orders] = await Promise.all([api.categories(), api.products(), api.settings(), api.orders(30)]);
        setData({ categories, products, settings, orders });
      } catch (error) {
        console.error(error);
      }
    }
    setMe(user);
  }, []);

  useEffect(() => { boot(); }, [boot]);

  useEffect(() => {
    const onHash = () => setHash(location.hash.slice(1));
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);

  // Pedidos en vivo (con sonido cuando entra uno nuevo)
  const active = Boolean(me?.activo);
  useEffect(() => {
    if (!active) return;
    return api.onOrders((type, order) => {
      setData((d) => {
        const exists = d.orders.some((o) => o.id === order.id);
        return { ...d, orders: exists ? d.orders.map((o) => (o.id === order.id ? order : o)) : [order, ...d.orders] };
      });
      if (type === "INSERT") {
        beep();
        toast(`🛒 Nuevo pedido de ${order.nombre} · ${money(order.total)}`);
        navigator.vibrate?.([120, 60, 120]);
      }
    });
  }, [active, toast]);

  const isOwner = me?.activo && me.rol === "dueno";
  const sections = allowedSections(isOwner);
  const view = sections.some((s) => s.id === hash) ? hash : "pedidos"; // si no tiene permiso, va a Pedidos
  const newOrders = data.orders.filter((o) => o.estado === "nuevo").length;

  useEffect(() => { document.title = (newOrders ? `(${newOrders}) ` : "") + "Panel · Kivo"; }, [newOrders]);
  useEffect(() => { document.querySelector(".mobile-bar .tabs a.on")?.scrollIntoView({ inline: "center", block: "nearest" }); }, [view, me]);

  const logout = useCallback(() => {
    api.signOut();
    history.replaceState(null, "", location.pathname);
    setHash("");
    setData(EMPTY);
    setMe(null);
  }, []);

  // Lo que ven todas las secciones. setX acepta un valor nuevo o una función (como useState)
  const context = useMemo(() => {
    const setter = (key) => (next) => setData((d) => ({ ...d, [key]: typeof next === "function" ? next(d[key]) : next }));
    return {
      me, isOwner, ...data,
      setProducts: setter("products"),
      setSettings: setter("settings"),
      setOrders: setter("orders"),
    };
  }, [me, isOwner, data]);

  if (me === undefined) return <div className="loading">Cargando…</div>;
  if (!me) return <AuthScreen onLoggedIn={boot} />;
  if (!me.activo) return <PendingScreen onLogout={logout} />;

  const View = VIEWS[view];

  return (
    <AdminContext.Provider value={context}>
      <ModalProvider>
        <div className="app" id="app">
          {/* Menú lateral (compu) */}
          <aside className="side">
            <Logo />
            <div className="who"><b>{me.nombre}</b><span className={`role${isOwner ? "" : " emp"}`}>{isOwner ? "Dueño" : "Empleado"}</span></div>
            <nav className="nav"><Nav sections={sections} current={view} newOrders={newOrders} /></nav>
            <div className="bottom">
              <a href="/" target="_blank" rel="noopener">↗ Ver la página</a>
              <button onClick={logout}>Salir</button>
            </div>
          </aside>

          <div>
            {/* Barra de arriba (celular) */}
            <div className="mobile-bar">
              <div className="bar">
                <Logo />
                <div className="me"><b>{me.nombre}</b><br /><button className="small" onClick={logout} style={{ textDecoration: "underline", opacity: 0.85 }}>Salir</button></div>
              </div>
              <nav className="tabs"><Nav sections={sections} current={view} newOrders={newOrders} /></nav>
            </div>

            <main>
              <div id="view"><View key={view} /></div>
            </main>
          </div>
        </div>
      </ModalProvider>
    </AdminContext.Provider>
  );
}
