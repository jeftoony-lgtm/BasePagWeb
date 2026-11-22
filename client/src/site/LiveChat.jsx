// =====================================================================
//  KIVO · Chat en vivo con alguien del local (dentro del chat de la página)
//
//  1. Pregunta al servidor si hay alguien del local atendiendo.
//     - No hay nadie → ofrece WhatsApp (y volver al asistente).
//     - Hay alguien  → pide el nombre y la consulta, y abre la charla.
//  2. La charla queda guardada en este navegador (localStorage): si la
//     persona recarga la página, sigue donde estaba.
//  3. Los mensajes del local llegan solos (conexión en vivo).
// =====================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { useStore } from "./store.jsx";
import { useCart } from "./cart.jsx";

const SESSION_KEY = "kivo-live-chat"; // { id, token }
const NAME_KEY = "kivo-live-name";
const SLOW_SECONDS = 90; // si nadie contesta en este tiempo, se ofrece WhatsApp

const storage = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* nada */ } },
  remove(key) { try { localStorage.removeItem(key); } catch { /* nada */ } },
};

/** ¿Hay una charla en vivo empezada en este navegador? */
export const hasLiveSession = () => Boolean(storage.get(SESSION_KEY)?.id);

const hour = (iso) => new Date(iso).toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" });

function WhatsappButton({ number, text }) {
  if (!number) return null;
  return (
    <a className="btn btn-wa chat-cta" target="_blank" rel="noopener" href={`https://wa.me/${number}?text=${encodeURIComponent(text)}`}>
      💬 Escribinos por WhatsApp
    </a>
  );
}

export function LiveChat({ open, onBack }) {
  const { settings } = useStore();
  const cart = useCart();
  const [session, setSession] = useState(() => storage.get(SESSION_KEY));
  const [chat, setChat] = useState(null);           // la charla con sus mensajes
  const [available, setAvailable] = useState(null); // null = preguntando
  const [name, setName] = useState(() => storage.get(NAME_KEY) || "");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [, setTick] = useState(0);
  const logRef = useRef(null);
  const inputRef = useRef(null);

  const forget = useCallback(() => {
    storage.remove(SESSION_KEY);
    setSession(null);
    setChat(null);
  }, []);

  // Sin charla: ¿hay alguien para atender? (se vuelve a preguntar cada 20 s)
  useEffect(() => {
    if (session || !open) return;
    let alive = true;
    const check = () => api.liveStatus().then((r) => alive && setAvailable(r.disponible)).catch(() => alive && setAvailable(false));
    check();
    const timer = setInterval(check, 20_000);
    return () => { alive = false; clearInterval(timer); };
  }, [session, open]);

  // Con charla: la carga y escucha los mensajes nuevos
  useEffect(() => {
    if (!session) return;
    const load = () => api.liveChat(session.id, session.token).then(setChat).catch(forget); // si ya no existe, se olvida
    load();
    return api.onLiveChat(session.id, session.token, (event) => {
      if (event.type !== "update") return;
      setChat((c) => {
        if (!c) return c;
        const mensajes = event.mensaje && !c.mensajes.some((m) => m.id === event.mensaje.id) ? [...c.mensajes, event.mensaje] : c.mensajes;
        return { ...c, estado: event.estado, atendido_por: event.atendido_por, mensajes };
      });
    }, load); // al reconectarse, se vuelve a cargar por si se perdió algo
  }, [session, forget]);

  // "hace X": para saber si conviene ofrecer WhatsApp
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 15_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [chat, available, open]);
  useEffect(() => { if (open && matchMedia("(min-width: 561px)").matches) setTimeout(() => inputRef.current?.focus(), 50); }, [open, session]);

  async function submit(event) {
    event.preventDefault();
    const texto = input.trim();
    if (!texto || sending) return;
    setError("");
    setSending(true);
    try {
      if (!session) {
        const nombre = name.trim();
        if (!nombre) throw new Error("Poné tu nombre para que sepamos cómo llamarte.");
        storage.set(NAME_KEY, nombre);
        const created = await api.liveStart(nombre, texto, cart.summary().filter((l) => l.nombre));
        const next = { id: created.id, token: created.token };
        storage.set(SESSION_KEY, next);
        setChat(created.chat);
        setSession(next);
      } else {
        const message = await api.liveSend(session.id, session.token, texto);
        setChat((c) => (c.mensajes.some((m) => m.id === message.id) ? c : { ...c, mensajes: [...c.mensajes, message] }));
      }
      setInput("");
    } catch (e) {
      setError(e.message);
      if (!session) api.liveStatus().then((r) => setAvailable(r.disponible)).catch(() => {});
    }
    setSending(false);
  }

  async function endChat() {
    if (session) api.liveClose(session.id, session.token).catch(() => {});
    forget();
    onBack();
  }

  const closed = chat?.estado === "cerrado";
  const lastFromStore = chat?.mensajes.filter((m) => m.de === "local").at(-1);
  const lastFromMe = chat?.mensajes.filter((m) => m.de === "cliente").at(-1);
  const slow = chat && !closed && lastFromMe && (!lastFromStore || lastFromStore.at < lastFromMe.at) &&
    Date.now() - new Date(lastFromMe.at).getTime() > SLOW_SECONDS * 1000;
  const waText = `¡Hola Kivo! 👋 ${chat ? "Les escribí por el chat de la página: " + (lastFromMe?.texto || "") : "Tengo una consulta."}`;

  return (
    <>
      <div className="chat-log live-log" aria-live="polite" ref={logRef}>
        {!session && available === null && <div className="msg note">Fijándonos si hay alguien del local…</div>}

        {!session && available === false && (
          <>
            <div className="msg bot">Justo ahora no hay nadie del local conectado 😕 Escribinos por WhatsApp y te respondemos apenas podamos.</div>
            <WhatsappButton number={settings.whatsapp} text={waText} />
            <button className="btn btn-ghost chat-cta" onClick={onBack}>🤖 Seguir con el asistente</button>
          </>
        )}

        {!session && available && (
          <div className="msg bot">¡Hola! Te atiende alguien del local en un ratito 🙌 Poné tu nombre y escribí tu consulta.</div>
        )}

        {chat?.mensajes.map((m) => (
          m.de === "sistema"
            ? <div key={m.id} className="msg note">{m.texto}</div>
            : <div key={m.id} className={`msg ${m.de === "cliente" ? "me" : "bot"}`}>
                {m.de === "local" && <b className="live-author">{m.autor || "Kivo"}</b>}
                {m.texto}
                <time className="live-time">{hour(m.at)}</time>
              </div>
        ))}

        {chat && !closed && chat.estado === "esperando" && <div className="msg note">⏳ Esperando que alguien del local te atienda…</div>}
        {slow && (
          <>
            <div className="msg note">¿Tarda un poco? También podés escribirnos por WhatsApp.</div>
            <WhatsappButton number={settings.whatsapp} text={waText} />
          </>
        )}
        {closed && (
          <>
            <button className="btn btn-green chat-cta" onClick={forget}>💬 Empezar otra consulta</button>
            <button className="btn btn-ghost chat-cta" onClick={() => { forget(); onBack(); }}>🤖 Volver al asistente</button>
          </>
        )}
      </div>

      {error && <p className="live-error" role="alert">{error}</p>}

      {(session ? !closed : available) && (
        <form className="chat-form live-form" autoComplete="off" onSubmit={submit}>
          {!session && (
            <input className="live-name" maxLength={60} placeholder="Tu nombre" aria-label="Tu nombre" autoComplete="given-name"
              value={name} onChange={(e) => setName(e.target.value)} />
          )}
          <div className="live-row">
            <input ref={inputRef} maxLength={500} placeholder={session ? "Escribí tu mensaje…" : "Tu consulta…"} aria-label="Mensaje"
              value={input} onChange={(e) => setInput(e.target.value)} />
            <button aria-label="Enviar" disabled={sending}>➤</button>
          </div>
          {session && <button type="button" className="live-end" onClick={endChat}>Terminar charla</button>}
        </form>
      )}
    </>
  );
}
