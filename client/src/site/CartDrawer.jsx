// =====================================================================
//  KIVO · Canasta y envío del pedido
//  Arma el mensaje de WhatsApp y registra el pedido para que aparezca
//  en el panel del local.
// =====================================================================

import { useEffect, useRef, useState } from "react";
import { money } from "../lib/format.js";
import { DAY_NAMES, nowInUruguay, pickupSlots, toHHMM, dateInUruguay } from "../lib/schedule.js";
import { api } from "../api.js";
import { useStore, useFindItem } from "./store.jsx";
import { useCart } from "./cart.jsx";
import { useToast } from "./toast.jsx";
import { ProductThumb } from "./Catalog.jsx";

/** Botón flotante con el total */
export function CartFab() {
  const { count, total, setOpen, fabRef } = useCart();
  return (
    <button className={`fab${count > 0 ? " show" : ""}`} id="cartFab" aria-label="Abrir canasta" ref={fabRef} onClick={() => setOpen(true)}>
      <svg className="basket" viewBox="0 0 100 100"><path d="M6 34h12l10 36h50l10-30H24" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" /><circle cx="36" cy="84" r="7" fill="#fff" /><circle cx="72" cy="84" r="7" fill="#fff" /></svg>
      <span id="fabTotal">{money(total)}</span><span className="count" id="fabCount">{count}</span>
    </button>
  );
}

/**
 * Canasta chiquita que aparece sola, superpuesta arriba a la derecha,
 * cada vez que se agrega algo. Se va sola a los pocos segundos
 * (si la persona tiene el mouse encima, espera).
 */
const PEEK_SECONDS = 4;

export function CartPeek() {
  const cart = useCart();
  const findItem = useFindItem();
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const timer = useRef(null);

  // Cada vez que se agrega algo (y la canasta grande no está abierta), aparece
  useEffect(() => {
    if (!cart.peek || cart.isOpen) return;
    setVisible(true);
  }, [cart.peek]); // eslint-disable-line react-hooks/exhaustive-deps

  // Se esconde sola; el contador arranca de nuevo con cada producto nuevo
  useEffect(() => {
    clearTimeout(timer.current);
    if (visible && !paused) timer.current = setTimeout(() => setVisible(false), PEEK_SECONDS * 1000);
    return () => clearTimeout(timer.current);
  }, [visible, paused, cart.peek]);

  useEffect(() => { if (cart.isOpen || !cart.count) setVisible(false); }, [cart.isOpen, cart.count]);

  const item = cart.peek && findItem(cart.peek.id);
  const qty = item ? cart.lines.get(cart.peek.id) || 0 : 0;
  // Los últimos productos de la canasta (el recién agregado primero)
  const others = [...cart.lines].filter(([id]) => id !== cart.peek?.id).reverse().slice(0, 2)
    .map(([id, cantidad]) => ({ id, cantidad, item: findItem(id) })).filter((l) => l.item);
  const more = cart.lines.size - 1 - others.length;

  return (
    <div className={`cart-peek${visible && item ? " show" : ""}`} role="status" aria-live="polite"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {item && (
        <>
          <div className="peek-head">
            <span className="peek-check">✓</span> Agregado a tu canasta
            <button className="peek-close" aria-label="Cerrar" onClick={() => setVisible(false)}>✕</button>
          </div>
          <div className="peek-item" key={cart.peek.n}>
            <div className="emoji" style={{ background: item.color || "#f4f4f4" }}><ProductThumb product={item} /></div>
            <div className="name"><b>{item.nombre}</b><small>{item.precio == null ? "Precio a confirmar" : `${money(item.precio)} c/u`}</small></div>
            <div className="qty">
              <button aria-label="Quitar uno" onClick={() => cart.remove(cart.peek.id, 1)}>−</button>
              <span>{qty}</span>
              <button aria-label="Agregar uno" onClick={() => cart.add(cart.peek.id)}>+</button>
            </div>
          </div>
          {others.length > 0 && (
            <ul className="peek-others">
              {others.map((l) => <li key={l.id}>{l.item.emoji} {l.cantidad}× {l.item.nombre}</li>)}
              {more > 0 && <li className="more">y {more} más…</li>}
            </ul>
          )}
          <div className="peek-foot">
            <span>{cart.count} {cart.count === 1 ? "producto" : "productos"} · <b>{money(cart.total)}{cart.pending ? " +" : ""}</b></span>
            <button className="btn btn-green" onClick={() => { setVisible(false); cart.setOpen(true); }}>Ver canasta</button>
          </div>
          {!paused && <i className="peek-timer" key={`t${cart.peek.n}`} style={{ animationDuration: `${PEEK_SECONDS}s` }} />}
        </>
      )}
    </div>
  );
}

/** Días que se pueden elegir (hoy y los 3 siguientes, si abre) */
function availableDays(settings) {
  const today = nowInUruguay().day;
  const days = [];
  for (let offset = 0; offset < 4; offset++) {
    if (!pickupSlots(settings, offset).length) continue;
    days.push({ offset, label: offset === 0 ? "Hoy" : offset === 1 ? "Mañana" : DAY_NAMES[(today + offset) % 7] });
  }
  return days;
}

export function CartDrawer() {
  const { settings } = useStore();
  const findItem = useFindItem();
  const cart = useCart();
  const toast = useToast();

  const [mode, setMode] = useState("retiro");
  const [dayOffset, setDayOffset] = useState(null);
  const [time, setTime] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", address: "", note: "" });
  const field = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) });

  const close = () => cart.setOpen(false);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && cart.setOpen(false);
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [cart.setOpen]);

  // Día y hora: si lo elegido ya no está disponible, se toma el primero que haya
  const days = availableDays(settings);
  const day = days.find((d) => d.offset === dayOffset) || days[0];
  const slots = day ? pickupSlots(settings, day.offset).map(toHHMM) : [];
  const hour = slots.includes(time) ? time : slots[0] || "";

  const lines = [...cart.lines].map(([id, cantidad]) => ({ id, cantidad, item: findItem(id) })).filter((l) => l.item);

  const order = {
    nombre: form.name.trim(),
    telefono: form.phone.replace(/\D/g, "") || null,
    modo: mode,
    direccion: mode === "envio" ? form.address.trim() : null,
    dia: dateInUruguay(day?.offset || 0),
    hora: hour,
    nota: form.note.trim(),
    items: lines.map(({ id, cantidad, item }) => ({ id, nombre: item.nombre, cantidad, precio: item.precio })),
    total: cart.total,
  };

  const problem =
    !cart.count ? "Agregá productos para armar tu pedido."
    : !hour ? "Hoy ya no quedan horarios. Elegí otro día."
    : !order.nombre ? "Poné tu nombre para enviar el pedido."
    : mode === "envio" && !order.direccion ? "Falta la dirección de envío."
    : null;

  function whatsappMessage() {
    const itemLines = order.items.map((i) =>
      `• ${i.cantidad} x ${i.nombre}${i.precio == null ? " (a confirmar)" : " — " + money(i.precio * i.cantidad)}`);
    let text = `¡Hola Kivo! 👋 Quiero hacer un pedido:\n\n${itemLines.join("\n")}\n\n`;
    text += `*Total: ${money(order.total)}${cart.pending ? " + encargos a confirmar" : ""}*\n\n`;
    text += order.modo === "retiro"
      ? `🏪 Paso a retirar: ${day?.label || ""} ${order.hora}\n`
      : `🛵 Envío a: ${order.direccion} — ${day?.label || ""} ${order.hora}\n`;
    text += `👤 A nombre de: ${order.nombre}\n`;
    if (order.nota) text += `📝 ${order.nota}\n`;
    return text;
  }

  const whatsappLink = problem ? "#" : `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(whatsappMessage())}`;

  function onSend(event) {
    if (problem) return event.preventDefault();
    // Se guarda para el panel del local (sin frenar la apertura de WhatsApp)
    api.createOrder(order).catch((error) => console.warn("No se pudo registrar el pedido:", error));
    setTimeout(() => { cart.clear(); close(); toast("¡Pedido enviado! Te esperamos 🙌"); }, 400);
  }

  return (
    <>
      <div className={`scrim${cart.isOpen ? " open" : ""}`} id="scrim" onClick={close}></div>

      <aside className={`drawer${cart.isOpen ? " open" : ""}`} id="drawer" aria-label="Tu canasta">
        <div className="drawer-head">
          <h3>Tu canasta</h3>
          <button className="close-btn" aria-label="Cerrar" onClick={close}>✕</button>
        </div>

        <div className="drawer-body">
          <div id="cartLines">
            {!lines.length ? (
              <div className="cart-empty"><div>🛒</div>Tu canasta está vacía.<br />Pasá por las góndolas o pedile ayuda al asistente.</div>
            ) : lines.map(({ id, cantidad, item }) => (
              <div className="line" key={id}>
                <div className="emoji">{item.emoji}</div>
                <div><h5>{item.nombre}</h5><small>{item.precio == null ? "Precio a confirmar" : `${money(item.precio)} c/u`}</small></div>
                <div className="qty">
                  <button aria-label="Quitar uno" onClick={() => cart.remove(id, 1)}>−</button>
                  <span>{cantidad}</span>
                  <button aria-label="Agregar uno" onClick={() => cart.add(id)}>+</button>
                </div>
              </div>
            ))}
          </div>

          <div id="checkout" hidden={!cart.count}>
            <div className="segmented" role="group" aria-label="Forma de entrega">
              <button type="button" aria-pressed={mode === "retiro"} onClick={() => setMode("retiro")}>🏪 Retiro en el local</button>
              <button type="button" aria-pressed={mode === "envio"} onClick={() => setMode("envio")}>🛵 Envío</button>
            </div>
            <div className="checkout-fields">
              <div className="two-cols">
                <div className="field"><label htmlFor="cDay">Día</label>
                  <select id="cDay" value={day?.offset ?? ""} onChange={(e) => setDayOffset(Number(e.target.value))}>
                    {days.map((d) => <option key={d.offset} value={d.offset}>{d.label}</option>)}
                  </select></div>
                <div className="field"><label htmlFor="cTime">Hora</label>
                  <select id="cTime" value={hour} onChange={(e) => setTime(e.target.value)}>
                    {slots.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select></div>
              </div>
              <div className="field"><label htmlFor="cName">Tu nombre</label><input id="cName" autoComplete="given-name" placeholder="¿A nombre de quién?" {...field("name")} /></div>
              <div className="field"><label htmlFor="cPhone">Tu celular (opcional)</label><input id="cPhone" inputMode="tel" autoComplete="tel" placeholder="09X XXX XXX" {...field("phone")} /></div>
              {mode === "envio" && (
                <div className="field" id="addressField"><label htmlFor="cAddress">Dirección en Solymar</label><input id="cAddress" autoComplete="street-address" placeholder="Calle, número y esquina" {...field("address")} /></div>
              )}
              <div className="field"><label htmlFor="cNote">Nota (opcional)</label><textarea id="cNote" rows="2" placeholder="Ej: la Coca bien fría 🙏" {...field("note")} /></div>
            </div>
          </div>
        </div>

        <div className="drawer-foot">
          <div className="total"><span>Total</span><b id="cartTotal">{money(cart.total)}{cart.pending ? " + a confirmar" : ""}</b></div>
          <a className="btn btn-wa" id="sendWhatsapp" target="_blank" rel="noopener" href={whatsappLink} aria-disabled={problem ? "true" : "false"} onClick={onSend}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.3.5-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.2.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.2.1.7-.1 1.3z" /></svg>
            Enviar pedido por WhatsApp
          </a>
          <p className="hint" id="cartHint">{problem || "Se abre WhatsApp con tu pedido ya escrito."}</p>
        </div>
      </aside>
    </>
  );
}
