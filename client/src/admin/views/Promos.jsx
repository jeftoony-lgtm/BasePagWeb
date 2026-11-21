// =====================================================================
//  KIVO PANEL · Promos y local (solo dueño)
//  Ruleta, combo del día, asistente, cerrado hoy, horarios, avisos y WhatsApp.
//  Cada tarjeta guarda por separado con su propio botón.
// =====================================================================

import { PAYMENT_METHODS } from "../../lib/payments.js";
import { useState } from "react";
import { api } from "../../api.js";
import { dayKey } from "../../lib/format.js";
import { DAY_NAMES } from "../../lib/schedule.js";
import { useAdmin } from "../state.js";
import { useToast, useShowError, Switch, SaveBar } from "../ui.jsx";

const WHEEL_COLORS = ["#5a9f43", "#e8952f", "#2f6b2a", "#c9761a"];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Guarda un ajuste en el servidor y en lo cargado. Devuelve true si salió bien */
function useSaveSetting() {
  const { setSettings } = useAdmin();
  const showError = useShowError();
  return async (key, value) => {
    try {
      await api.saveSetting(key, value);
      setSettings((s) => ({ ...s, [key]: value }));
      return true;
    } catch (error) {
      showError(error);
      return false;
    }
  };
}

/* =================== Ruleta =================== */

function RuletaCard({ ruleta: r }) {
  const save = useSaveSetting();
  const toast = useToast();
  const [on, setOn] = useState(Boolean(r.activa));
  const [until, setUntil] = useState(r.hasta || "");
  const [prizes, setPrizes] = useState(() => structuredClone(r.premios || []));
  const [newPromo, setNewPromo] = useState(false);

  const today = dayKey(new Date());
  const isOn = r.activa && (!r.hasta || today <= r.hasta);
  const statusText = isOn ? "La ruleta se ve en la página ahora"
    : r.activa && r.hasta && today > r.hasta ? "Apagada: ya pasó la fecha de fin"
    : "Apagada: la gente no la ve";

  // El interruptor prende/apaga al instante (no hace falta tocar "Guardar")
  async function onToggle(value) {
    setOn(value);
    const ok = await save("ruleta", { ...r, activa: value });
    if (ok) toast(value ? "🎡 Ruleta prendida: ya se ve en la página" : "Ruleta apagada: nadie más puede girar");
    else setOn(!value);
  }

  const editPrize = (i, key, value) => setPrizes((list) => list.map((p, n) => (n === i ? { ...p, [key]: value } : p)));

  async function onSave() {
    const clean = prizes.map((p) => ({ t: (p.t || "").trim(), d: (p.d || "").trim(), c: p.c || "#5a9f43" }));
    if (clean.some((p) => !p.t)) { toast("Cada premio necesita un texto para la ruleta.", true); return false; }
    if (clean.length < 4) { toast("La ruleta necesita al menos 4 casilleros.", true); return false; }

    const value = {
      activa: on,
      hasta: until,
      promo_id: newPromo ? "promo-" + Date.now() : r.promo_id || "promo-1",
      premios: clean,
    };
    const ok = await save("ruleta", value);
    if (ok) {
      setNewPromo(false);
      toast(value.activa ? "🎡 Ruleta prendida" : "Ruleta apagada");
    }
    return ok;
  }

  return (
    <section className="card">
      <h3>🎡 Ruleta de promos</h3>
      <div className="state-line"><span className="d" style={{ background: isOn ? "var(--green)" : "var(--red)" }}></span>{statusText}</div>
      <div className="stack">
        <Switch label="Ruleta prendida" checked={on} onChange={onToggle} />
        <div className="field"><label htmlFor="ruletaUntil">Se apaga sola después del día (opcional)</label>
          <input type="date" id="ruletaUntil" value={until} onChange={(e) => setUntil(e.target.value)} /></div>
        <div>
          <span className="label">Premios <span className="muted" style={{ fontWeight: 500 }}>· dejá el premio vacío para “no ganó”</span></span>
          <div className="stack" style={{ gap: 8, marginTop: 8 }}>
            {prizes.map((p, i) => (
              <div className="prize-row" key={i}>
                <input className="input" value={p.t} maxLength={14} placeholder="En la ruleta" aria-label={`Texto en la ruleta ${i + 1}`} onChange={(e) => editPrize(i, "t", e.target.value)} />
                <input className="input" value={p.d || ""} placeholder="Premio (vacío = no ganó)" aria-label={`Premio ${i + 1}`} onChange={(e) => editPrize(i, "d", e.target.value)} />
                <input type="color" className="colorpick" value={p.c || "#5a9f43"} aria-label={`Color ${i + 1}`} onChange={(e) => editPrize(i, "c", e.target.value)} />
                <button type="button" className="ico" aria-label={`Quitar premio ${i + 1}`} disabled={prizes.length <= 4} style={prizes.length <= 4 ? { opacity: 0.35 } : undefined}
                  onClick={() => setPrizes((list) => list.filter((_, n) => n !== i))}>✕</button>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} disabled={prizes.length >= 10}
            onClick={() => setPrizes((list) => [...list, { t: "", d: "", c: WHEEL_COLORS[list.length % WHEEL_COLORS.length] }])}>＋ Agregar premio</button>
        </div>
        <div className="small muted" style={{ background: "var(--cream)", padding: "10px 12px", borderRadius: 12 }}>
          Cada celular puede girar <b>una vez por promo</b>. Si empezás una promo nueva, todos pueden volver a girar.<br />
          <div style={{ marginTop: 8 }}><Switch label="Empezar promo nueva al guardar" checked={newPromo} onChange={setNewPromo} /></div>
        </div>
      </div>
      <SaveBar label="Guardar ruleta" onSave={onSave} />
    </section>
  );
}

/* =================== Combo del día =================== */

function ComboCard({ combo: c }) {
  const save = useSaveSetting();
  const [form, setForm] = useState({
    activo: c.activo !== false, titulo: c.titulo || "", etiqueta: c.etiqueta || "",
    precio: c.precio ?? "", subtitulo: c.subtitulo || "", items: (c.items || []).join("\n"),
  });
  const field = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) });

  const onSave = () => save("combo", {
    activo: form.activo,
    titulo: form.titulo.trim(),
    etiqueta: form.etiqueta.trim(),
    precio: Number(form.precio) || 0,
    subtitulo: form.subtitulo.trim(),
    items: form.items.split("\n").map((x) => x.trim()).filter(Boolean),
  });

  return (
    <section className="card">
      <h3>🧀 Combo del día</h3>
      <div className="stack" style={{ marginTop: 10 }}>
        <Switch label="Mostrar el combo en la página" checked={form.activo} onChange={(activo) => setForm({ ...form, activo })} />
        <div className="field"><label htmlFor="comboTitle">Título</label><input id="comboTitle" {...field("titulo")} /></div>
        <div className="grid2">
          <div className="field"><label htmlFor="comboTag">Etiqueta</label><input id="comboTag" {...field("etiqueta")} /></div>
          <div className="field"><label htmlFor="comboPrice">Precio ($)</label><input id="comboPrice" type="number" inputMode="numeric" {...field("precio")} /></div>
        </div>
        <div className="field"><label htmlFor="comboText">Frase</label><input id="comboText" {...field("subtitulo")} /></div>
        <div className="field"><label htmlFor="comboItems">Qué incluye (uno por renglón, con emoji adelante)</label><textarea id="comboItems" rows="4" {...field("items")} /></div>
      </div>
      <SaveBar label="Guardar combo" onSave={onSave} />
    </section>
  );
}

/* =================== Asistente =================== */

function AssistantCard({ assistant: a }) {
  const save = useSaveSetting();
  const [form, setForm] = useState({ activo: a.activo !== false, nombre: a.nombre || "Kivi", notas: a.notas || "" });
  const field = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) });

  return (
    <section className="card">
      <h3>💬 Asistente del chat</h3>
      <p className="small muted">Ayuda a la gente a armar el pedido. Conoce los productos, precios y horarios. Lo que escribas en “Lo que tiene que saber” lo usa para responder.</p>
      <div className="stack" style={{ marginTop: 10 }}>
        <Switch label="Asistente prendido" checked={form.activo} onChange={(activo) => setForm({ ...form, activo })} />
        <div className="field"><label htmlFor="assistantName">Nombre</label><input id="assistantName" maxLength={20} {...field("nombre")} /></div>
        <div className="field"><label htmlFor="assistantNotes">Lo que tiene que saber (envíos, pagos, novedades…)</label>
          <textarea id="assistantNotes" rows="4" maxLength={1500} placeholder="Ej: Hacemos envíos en Solymar por $50. Aceptamos efectivo y transferencia. Los sábados hay asado." {...field("notas")} /></div>
      </div>
      <SaveBar label="Guardar asistente" onSave={() => save("asistente", { activo: form.activo, nombre: form.nombre.trim() || "Kivi", notas: form.notas.trim() })} />
    </section>
  );
}

/* =================== Cerrado hoy =================== */

function ClosedCard({ closed: c }) {
  const save = useSaveSetting();
  const [on, setOn] = useState(Boolean(c.activo));
  const [reason, setReason] = useState(c.motivo || "");

  return (
    <section className="card">
      <h3>🔴 Cerrado hoy</h3>
      <p className="small muted">Para feriados o imprevistos. La página muestra “Cerrado” aunque sea horario de abrir.</p>
      <div className="stack" style={{ marginTop: 10 }}>
        <Switch label="Marcar el local como cerrado" checked={on} onChange={setOn} />
        <div className="field"><label htmlFor="closedReason">Motivo (se muestra en la página)</label>
          <input id="closedReason" value={reason} placeholder="Ej: Cerrado por feriado, volvemos mañana" onChange={(e) => setReason(e.target.value)} /></div>
      </div>
      <SaveBar label="Guardar" onSave={() => save("cerrado", { activo: on, motivo: reason.trim() })} />
    </section>
  );
}

/* =================== Horarios =================== */

/** Convierte lo escrito ("10:00-14:30") en turnos; anota los días mal escritos */
function parseHours(rows) {
  const isTime = (t) => /^([01]\d|2[0-4]):[0-5]\d$/.test(t);
  const pad = (t) => (t && t.length === 4 ? "0" + t : t); // "9:00" → "09:00"
  const result = {}, wrong = new Set();

  for (let day = 0; day < 7; day++) {
    result[day] = [];
    for (const raw of rows[day]) {
      const text = raw.replace(/\s/g, "").replace(/–/g, "-");
      if (!text) continue;
      const [open, close] = text.split("-").map(pad);
      if (isTime(open) && isTime(close) && open < close) result[day].push([open, close]);
      else wrong.add(DAY_NAMES[day]);
    }
  }
  return { result, wrong: [...wrong] };
}

function HoursCard({ hours: h }) {
  const save = useSaveSetting();
  const [rows, setRows] = useState(() =>
    Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, [0, 1].map((i) => (h[d]?.[i] ? h[d][i].join("-") : ""))])));
  const [error, setError] = useState("");

  const edit = (day, i, value) => setRows((r) => ({ ...r, [day]: r[day].map((v, n) => (n === i ? value : v)) }));

  function onSave() {
    const { result, wrong } = parseHours(rows);
    if (wrong.length) {
      setError(`Revisá el formato en: ${wrong.join(", ")} (ej: 10:00-14:30).`);
      return false;
    }
    setError("");
    return save("horarios", result);
  }

  return (
    <section className="card">
      <h3>🕒 Horarios</h3>
      <p className="small muted">Formato 10:00-14:30. El segundo turno es opcional. Medianoche = 24:00. Vacío = cerrado ese día.</p>
      <div className="stack" style={{ gap: 8, marginTop: 10 }}>
        {WEEK_ORDER.map((d) => (
          <div className="hour-row" key={d}><span>{DAY_NAMES[d]}</span>
            <input className="input" value={rows[d][0]} placeholder="10:00-14:30" aria-label={`${DAY_NAMES[d]} turno 1`} onChange={(e) => edit(d, 0, e.target.value)} />
            <input className="input" value={rows[d][1]} placeholder="—" aria-label={`${DAY_NAMES[d]} turno 2`} onChange={(e) => edit(d, 1, e.target.value)} />
          </div>
        ))}
      </div>
      <div className="error-text small" style={{ marginTop: 8 }}>{error}</div>
      <SaveBar label="Guardar horarios" onSave={onSave} />
    </section>
  );
}

/* =================== Avisos y WhatsApp =================== */

function NoticesCard({ notices }) {
  const save = useSaveSetting();
  const [text, setText] = useState(notices.join("\n"));
  return (
    <section className="card">
      <h3>📣 Cinta de avisos</h3>
      <p className="small muted">Los mensajes que pasan en la franja verde. Uno por renglón.</p>
      <div className="field" style={{ marginTop: 10 }}><textarea rows="5" aria-label="Avisos" value={text} onChange={(e) => setText(e.target.value)} /></div>
      <SaveBar label="Guardar avisos" onSave={() => save("avisos", text.split("\n").map((x) => x.trim()).filter(Boolean))} />
    </section>
  );
}

function PaymentsCard({ payments }) {
  const save = useSaveSetting();
  const [chosen, setChosen] = useState(() => new Set(payments));
  const toggle = (name, on) => setChosen((set) => { const next = new Set(set); on ? next.add(name) : next.delete(name); return next; });
  return (
    <section className="card">
      <h3>💳 Medios de pago</h3>
      <p className="small muted">Marcá lo que aceptás. Se muestra al pie de la página y el asistente lo usa para responder.</p>
      <div className="pay-grid" style={{ marginTop: 10 }}>
        {PAYMENT_METHODS.map((m) => (
          <Switch key={m.name} label={`${m.icon ? m.icon + " " : ""}${m.name}`} checked={chosen.has(m.name)} onChange={(on) => toggle(m.name, on)} />
        ))}
      </div>
      {/* Se guarda en el mismo orden de la lista */}
      <SaveBar label="Guardar medios de pago" onSave={() => save("pagos", PAYMENT_METHODS.map((m) => m.name).filter((n) => chosen.has(n)))} />
    </section>
  );
}

function WhatsappCard({ number }) {
  const save = useSaveSetting();
  const [phone, setPhone] = useState(String(number || "").replace(/^598/, "0"));
  const [error, setError] = useState("");

  function onSave() {
    const digits = phone.replace(/\D/g, "");
    if (!/^09\d{7}$/.test(digits)) {
      setError("Tiene que ser un celular uruguayo, tipo 099 123 456.");
      return false;
    }
    setError("");
    return save("whatsapp", "598" + digits.slice(1));
  }

  return (
    <section className="card">
      <h3>📱 WhatsApp de pedidos</h3>
      <div className="field" style={{ marginTop: 10 }}><label htmlFor="whatsapp">Celular (como lo marcás en Uruguay)</label>
        <input id="whatsapp" inputMode="tel" value={phone} placeholder="099 123 456" onChange={(e) => setPhone(e.target.value)} /></div>
      <div className="error-text small" style={{ marginTop: 8 }}>{error}</div>
      <SaveBar label="Guardar" onSave={onSave} />
    </section>
  );
}

/* =================== Pantalla =================== */

export function Promos() {
  const { settings: s } = useAdmin();
  return (
    <>
      <div className="view-head"><div><h2>Promos y local</h2><p>Todo lo que cambies acá se ve en la página apenas tocás Guardar.</p></div></div>
      <div className="promos">
        <div className="stack">
          <RuletaCard ruleta={s.ruleta || { premios: [] }} />
          <ComboCard combo={s.combo || {}} />
        </div>
        <div className="stack">
          <AssistantCard assistant={s.asistente || {}} />
          <ClosedCard closed={s.cerrado || {}} />
          <HoursCard hours={s.horarios || {}} />
          <NoticesCard notices={s.avisos || []} />
          <PaymentsCard payments={s.pagos || []} />
          <WhatsappCard number={s.whatsapp} />
        </div>
      </div>
    </>
  );
}
