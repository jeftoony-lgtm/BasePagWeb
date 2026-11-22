// =====================================================================
//  KIVO PANEL · Chat en vivo con los clientes de la página
//  Las charlas llegan solas (con sonido). Mientras "Estoy atendiendo"
//  esté prendido, la página les ofrece a los clientes hablar con el local.
//  Si nadie del local atiende, la página los manda a WhatsApp.
// =====================================================================

import { useEffect, useRef, useState } from "react";
import { api } from "../../api.js";
import { timeAgo } from "../../lib/format.js";
import { useAdmin } from "../state.js";
import { Switch, useShowError } from "../ui.jsx";

/** La charla espera respuesta del local (para el numerito del menú) */
export const chatNeedsAnswer = (c) => c.estado !== "cerrado" && (c.estado === "esperando" || c.sin_leer > 0);

const STATES = { esperando: "Esperando", atendiendo: "Atendiendo", cerrado: "Terminada" };
const hour = (iso) => new Date(iso).toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" });

function ChatItem({ chat: c, selected, onSelect }) {
  const last = c.mensajes.at(-1);
  return (
    <button className={`live-item${selected ? " on" : ""}${c.estado === "cerrado" ? " closed" : ""}`} onClick={onSelect}>
      <div className="live-item-top">
        <b>{c.nombre}</b>
        <small>{timeAgo(c.updated_at)}</small>
      </div>
      <div className="live-item-bottom">
        <span className="live-preview">{last ? `${last.de === "local" ? "Vos: " : ""}${last.texto}` : ""}</span>
        {c.sin_leer > 0 && c.estado !== "cerrado"
          ? <span className="count">{c.sin_leer}</span>
          : <span className={`badge live-${c.estado}`}>{STATES[c.estado]}</span>}
      </div>
    </button>
  );
}

function Conversation({ chat: c, onBack }) {
  const { setChats } = useAdmin();
  const showError = useShowError();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef(null);
  const inputRef = useRef(null);
  const closed = c.estado === "cerrado";

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [c.mensajes.length]);
  useEffect(() => { if (matchMedia("(min-width: 861px)").matches) inputRef.current?.focus(); }, [c.id]);

  // Si está abierta en pantalla, los mensajes nuevos quedan como leídos
  useEffect(() => {
    if (c.sin_leer > 0 && document.visibilityState === "visible") api.liveRead(c.id).catch(() => {});
  }, [c.id, c.sin_leer]);

  const replace = (chat) => setChats((list) => [chat, ...list.filter((x) => x.id !== chat.id)]);

  async function reply(event) {
    event.preventDefault();
    const texto = input.trim();
    if (!texto || busy) return;
    setBusy(true);
    try {
      replace(await api.liveReply(c.id, texto));
      setInput("");
    } catch (error) {
      showError(error);
    }
    setBusy(false);
    inputRef.current?.focus();
  }

  async function end() {
    setBusy(true);
    try {
      replace(await api.liveEnd(c.id));
    } catch (error) {
      showError(error);
    }
    setBusy(false);
  }

  return (
    <section className="live-conv">
      <div className="live-conv-head">
        <button className="btn btn-ghost btn-sm live-back" onClick={onBack}>←</button>
        <div>
          <b>{c.nombre}</b>
          <small>{STATES[c.estado]}{c.atendido_por ? ` · atiende ${c.atendido_por}` : ""} · desde {hour(c.created_at)}</small>
        </div>
        {!closed && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={end}>Terminar</button>}
      </div>

      {c.canasta?.length > 0 && (
        <div className="live-cart"><b>🛒 Tiene en la canasta:</b> {c.canasta.map((i) => `${i.cantidad}× ${i.nombre}`).join(", ")}</div>
      )}

      <div className="live-msgs" ref={logRef}>
        {c.mensajes.map((m) => (
          m.de === "sistema"
            ? <div key={m.id} className="live-msg sys">{m.texto}</div>
            : <div key={m.id} className={`live-msg ${m.de === "local" ? "mine" : "theirs"}`}>
                {m.de === "local" && m.autor && <b>{m.autor}</b>}
                {m.texto}
                <time>{hour(m.at)}</time>
              </div>
        ))}
      </div>

      {closed ? (
        <p className="live-closed">Esta charla terminó.</p>
      ) : (
        <form className="live-reply" onSubmit={reply}>
          <input ref={inputRef} className="input" maxLength={1000} placeholder={`Responderle a ${c.nombre}…`} aria-label="Respuesta"
            value={input} onChange={(e) => setInput(e.target.value)} />
          <button className="btn btn-green" disabled={busy || !input.trim()}>Enviar</button>
        </form>
      )}
    </section>
  );
}

export function ChatVivo() {
  const { chats, attending, setAttending } = useAdmin();
  const [selectedId, setSelectedId] = useState(() => chats.find(chatNeedsAnswer)?.id || null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Primero las que esperan respuesta, después las abiertas, al final las terminadas
  const order = (c) => (chatNeedsAnswer(c) ? 0 : c.estado === "cerrado" ? 2 : 1);
  const list = [...chats].sort((a, b) => order(a) - order(b) || new Date(b.updated_at) - new Date(a.updated_at));
  const selected = chats.find((c) => c.id === selectedId);

  return (
    <>
      <div className="view-head">
        <div><h2>Chat en vivo</h2><p>Los clientes de la página te escriben acá. Suena cuando llega un mensaje.</p></div>
        <div className={`live-attend${attending ? " on" : ""}`}>
          <Switch label={attending ? "Estoy atendiendo" : "No estoy atendiendo"} checked={attending} onChange={setAttending} />
          <small>{attending ? "La página ofrece hablar con el local." : "Mientras nadie atienda, la página manda a WhatsApp."}</small>
        </div>
      </div>

      {!list.length ? (
        <div className="empty"><div>💬</div>Todavía no hay charlas. Cuando un cliente escriba, suena y aparece acá.</div>
      ) : (
        <div className={`live-layout${selected ? " has-selected" : ""}`}>
          <div className="live-list">
            {list.map((c) => <ChatItem key={c.id} chat={c} selected={c.id === selectedId} onSelect={() => setSelectedId(c.id)} />)}
          </div>
          {selected
            ? <Conversation key={selected.id} chat={selected} onBack={() => setSelectedId(null)} />
            : <div className="live-conv live-placeholder">Elegí una charla para responder.</div>}
        </div>
      )}
    </>
  );
}
