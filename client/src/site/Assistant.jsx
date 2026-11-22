// =====================================================================
//  KIVO · Asistente de compras (chat)
//
//  La persona escribe como le sale ("necesito algo para una picada de 6")
//  y el asistente le arma la canasta. Al final la manda a la canasta para
//  enviar el pedido por WhatsApp.
//
//  La IA corre en el servidor (server/src/assistant). Acá solo se dibuja
//  el chat y se aplican las "acciones" que devuelve:
//    { type: "add", id, cantidad }   → suma a la canasta
//    { type: "remove", id, cantidad }→ saca de la canasta
//    { type: "show", ids: [...] }    → muestra tarjetas de productos
//    { type: "checkout" }            → botón para ir a enviar el pedido
// =====================================================================

import { useEffect, useRef, useState } from "react";
import { money, tabStorage } from "../lib/format.js";
import { api } from "../api.js";
import { useStore, useFindItem } from "./store.jsx";
import { useCart, AddButton } from "./cart.jsx";
import { ProductThumb } from "./Catalog.jsx";
import { SideScroll } from "./SideScroll.jsx";
import { LiveChat, hasLiveSession } from "./LiveChat.jsx";

const MAX_HISTORY = 16; // cuántos mensajes se le mandan a la IA (para que sea rápido y barato)
// Botoncitos de respuesta rápida: cambian según si ya hay algo en la canasta
const SUGGESTIONS = [
  "Armame una picada para 4 🧀",
  "Quiero 2 cocas y unas papas",
  "Algo para el mate 🧉",
  "¿Hasta qué hora abren?",
  "¿Hacen envíos?",
];
const SUGGESTIONS_WITH_CART = [
  "¿Qué llevo?",
  "Listo, eso es todo ✅",
  "¿Qué promo hay?",
  "¿Hacen envíos?",
];

function greeting(name, isOpen) {
  const hour = new Date().getHours();
  const hello = hour < 12 ? "¡Buen día!" : hour < 20 ? "¡Buenas tardes!" : "¡Buenas noches!";
  const closedNote = isOpen ? "" : " Ahora estamos cerrados, pero te dejo el pedido armado para cuando abramos.";
  return `${hello} Soy ${name}, de Kivo 👋 Contame qué necesitás y te voy armando la canasta.${closedNote}`;
}

function ChatCard({ product: p }) {
  return (
    <div className="chat-card">
      <div className="thumb" style={{ background: p.color || "#f4f4f4" }}><ProductThumb product={p} /></div>
      <b>{p.nombre}</b>
      <div className="row">
        <span className="price">{p.precio == null ? "—" : money(p.precio)}</span>
        <AddButton id={p.id} label={`Agregar ${p.nombre}`} disabled={p.en_stock === false} />
      </div>
    </div>
  );
}

export function Assistant({ storeOpen }) {
  const settings = useStore().settings.asistente;
  const findItem = useFindItem();
  const cart = useCart();
  const name = settings?.nombre || "Kivi";

  // messages: lo que se le manda a la IA · log: lo que se ve en pantalla
  const [messages, setMessages] = useState(() => tabStorage.get("kivo-chat-messages", []));
  const [log, setLog] = useState(() => tabStorage.get("kivo-chat-log", []));
  const [waiting, setWaiting] = useState(false);
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState(hasLiveSession); // true = hablando con alguien del local
  const [bubble, setBubble] = useState(false);
  const [input, setInput] = useState("");
  const logRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { tabStorage.set("kivo-chat-messages", messages.slice(-MAX_HISTORY)); }, [messages]);
  useEffect(() => { tabStorage.set("kivo-chat-log", log.slice(-60)); }, [log]);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log, waiting, open]);

  // Globito "¿Te ayudo a armar el pedido?" (una sola vez por pestaña)
  useEffect(() => {
    if (tabStorage.get("kivo-chat-seen")) return;
    const show = setTimeout(() => setBubble(true), 7000);
    const hide = setTimeout(() => setBubble(false), 17000);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, []);

  // Avisa al resto de la página que el chat está abierto (la canasta chiquita se corre para no taparlo)
  useEffect(() => { document.body.classList.toggle("chat-open", open); }, [open]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  if (settings && settings.activo === false) return null; // el dueño lo apagó desde el panel

  const push = (...entries) => setLog((current) => [...current, ...entries]);

  /** Borra la charla y arranca de cero (la canasta no se toca) */
  function restart() {
    setMessages([]);
    setLog([{ kind: "bot", text: greeting(name, storeOpen) }]);
    inputRef.current?.focus();
  }

  function openChat() {
    setOpen(true);
    setBubble(false);
    tabStorage.set("kivo-chat-seen", true);
    if (!log.length) push({ kind: "bot", text: greeting(name, storeOpen) });
    if (matchMedia("(min-width: 561px)").matches) setTimeout(() => inputRef.current?.focus(), 50);
  }

  /** Aplica a la canasta lo que decidió el asistente y devuelve lo que hay que mostrar */
  function applyActions(actions = []) {
    const entries = [];
    const added = [], removed = [];

    for (const action of actions) {
      if (action.type === "add" && cart.add(action.id, Math.max(1, Number(action.cantidad) || 1))) {
        added.push(`${action.cantidad || 1}× ${findItem(action.id).nombre}`);
      }
      if (action.type === "remove") {
        const item = findItem(action.id);
        if (item && cart.remove(action.id, action.cantidad || null)) removed.push(item.nombre);
      }
    }

    if (added.length) {
      entries.push({ kind: "note", text: `✓ Sumé ${added.join(", ")}` });
      cart.bump();
    }
    if (removed.length) entries.push({ kind: "note", remove: true, text: `Saqué ${removed.join(", ")}` });

    const show = actions.find((a) => a.type === "show");
    if (show?.ids?.length) entries.push({ kind: "cards", ids: show.ids.slice(0, 8) });
    if (actions.some((a) => a.type === "checkout")) entries.push({ kind: "checkout" });
    return entries;
  }

  async function send(text) {
    text = text.trim().slice(0, 500);
    if (!text || waiting) return;

    const history = [...messages, { role: "user", content: text }];
    push({ kind: "me", text });
    setMessages(history);
    setWaiting(true);

    try {
      const answer = await api.chat(history.slice(-MAX_HISTORY), cart.summary());
      const reply = (answer.reply || "").trim() || "¡Listo!";
      setMessages([...history, { role: "assistant", content: reply }]);
      push({ kind: "bot", text: reply }, ...applyActions(answer.actions));
    } catch (error) {
      console.warn("Asistente:", error);
      push({ kind: "bot", text: "Uy, se me trabó la conexión 😅 Probá de nuevo en un ratito, o armá el pedido desde las góndolas." });
    }
    setWaiting(false);
  }

  function entry(e, i) {
    switch (e.kind) {
      case "me": return <div key={i} className="msg me">{e.text}</div>;
      case "bot": return <div key={i} className="msg bot">{e.text}</div>;
      case "note": return <div key={i} className={`msg note${e.remove ? " remove" : ""}`}>{e.text}</div>;
      case "cards": {
        const products = e.ids.map(findItem).filter(Boolean);
        return products.length ? <SideScroll key={i} className="chat-cards">{products.map((p) => <ChatCard key={p.id} product={p} />)}</SideScroll> : null;
      }
      case "checkout":
        return <button key={i} className="btn btn-wa chat-cta" onClick={() => { setOpen(false); cart.setOpen(true); }}>🛒 Ver canasta y enviar por WhatsApp</button>;
      default: return null;
    }
  }

  return (
    <>
      <div className={`chat-bubble${bubble ? " show" : ""}`} id="chatBubble" role="button" tabIndex={0}
        onClick={openChat} onKeyDown={(e) => e.key === "Enter" && openChat()}>¿Te ayudo a armar el pedido? 🛒</div>

      <button className="chat-launcher" id="chatLauncher" aria-label="Abrir el chat de ayuda" onClick={openChat}>
        <svg viewBox="0 0 100 100"><use href="#cart" /></svg>
        <span className="online"></span>
      </button>

      <section className={`chat${open ? " open" : ""}`} id="chat" role="dialog" aria-label="Chat de ayuda">
        <div className="chat-head">
          <div className="avatar"><svg viewBox="0 0 100 100"><use href="#cart" /></svg></div>
          {live
            ? <div><b>Kivo Mini Market</b><small>Chat con alguien del local</small></div>
            : <div><b>{name}</b><small>de Kivo Mini Market · responde al toque</small></div>}
          <div className="chat-head-actions">
            {cart.count > 0 && (
              <button className="chat-cart" aria-label="Ver canasta" title="Ver canasta" onClick={() => { setOpen(false); cart.setOpen(true); }}>
                🛒 {cart.count} · {money(cart.total)}
              </button>
            )}
            {live
              ? <button className="close-btn" aria-label="Volver al asistente" title="Volver al asistente" onClick={() => setLive(false)}>🤖</button>
              : <button className="close-btn" aria-label="Hablar con alguien del local" title="Hablar con alguien del local" onClick={() => setLive(true)}>👤</button>}
            {!live && messages.length > 0 && <button className="close-btn" aria-label="Empezar de nuevo" title="Empezar de nuevo" onClick={restart}>↺</button>}
            <button className="close-btn" aria-label="Cerrar chat" onClick={() => setOpen(false)}>✕</button>
          </div>
        </div>
        {live ? <LiveChat open={open} onBack={() => setLive(false)} /> : <>
        <div className="chat-log" id="chatLog" aria-live="polite" ref={logRef}>
          {log.map(entry)}
          {waiting && <div className="typing"><i></i><i></i><i></i></div>}
        </div>
        <SideScroll className="chat-chips" hidden={waiting}>
          <button type="button" className="live-chip" onClick={() => setLive(true)}>👤 Hablar con una persona</button>
          {(cart.count ? SUGGESTIONS_WITH_CART : SUGGESTIONS).map((s) => <button type="button" key={s} onClick={() => send(s)}>{s}</button>)}
        </SideScroll>
        <form className="chat-form" autoComplete="off" onSubmit={(e) => { e.preventDefault(); send(input); setInput(""); }}>
          <input ref={inputRef} maxLength={500} placeholder="Escribí lo que necesitás…" aria-label="Mensaje" value={input} onChange={(e) => setInput(e.target.value)} />
          <button aria-label="Enviar" disabled={waiting}>➤</button>
        </form>
        </>}
      </section>
    </>
  );
}
