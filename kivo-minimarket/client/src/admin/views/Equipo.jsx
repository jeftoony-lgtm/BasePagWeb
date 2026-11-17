// =====================================================================
//  KIVO PANEL · Equipo (solo dueño)
//  Quién entra al panel (activar, quitar acceso, cambiar rol, poner
//  contraseña nueva) y el registro de lo que se hizo.
// =====================================================================

import { useCallback, useEffect, useState } from "react";
import { api } from "../../api.js";
import { money, timeAgo } from "../../lib/format.js";
import { useAdmin, ORDER_STATES } from "../state.js";
import { useModal, useToast, useShowError, Switch, SheetHead } from "../ui.jsx";

const SETTING_NAMES = {
  combo: "el combo del día", horarios: "los horarios", avisos: "la cinta de avisos",
  cerrado: "el cartel de cerrado", whatsapp: "el WhatsApp de pedidos", asistente: "el asistente del chat",
};

const initials = (name) =>
  (name || "?").replace(/[^\p{L}\s]/gu, "").trim().split(/\s+/).map((w) => w[0] || "").join("").slice(0, 2).toUpperCase() || "?";

/** Convierte un registro de actividad en una frase: "Tita marcó Arroz sin stock" */
function describe(a, products) {
  const d = a.detalle || {};
  const who = <b>{a.usuario || "Alguien"}</b>;

  if (a.tabla === "orders" && d.estado) {
    return ["🧾", <>{who} pasó el pedido #{a.registro} a <b>{ORDER_STATES[d.estado[1]] || d.estado[1]}</b></>];
  }
  if (a.tabla === "giros") {
    return ["🎟️", <>{who} canjeó {a.registro} de {d.cliente} ({d.premio})</>];
  }
  if (a.tabla === "products") {
    const fromList = products.find((p) => p.id === a.registro)?.nombre;
    const name = <b>{d._nombre || fromList || (Array.isArray(d.nombre) ? d.nombre[1] : d.nombre) || "un producto"}</b>;
    if (a.accion === "insert") return ["➕", <>{who} agregó {name}</>];
    if (a.accion === "delete") return ["🗑️", <>{who} eliminó {name}</>];
    if (d.precio) return ["💲", <>{who} cambió el precio de {name}: {money(d.precio[0])} → <b>{money(d.precio[1])}</b></>];
    if (d.en_stock) return [d.en_stock[1] ? "✅" : "⛔", <>{who} marcó {name} {d.en_stock[1] ? "con stock" : "sin stock"}</>];
    return ["✏️", <>{who} editó {name}</>];
  }
  if (a.tabla === "settings") {
    const newValue = d.value?.[1];
    if (a.registro === "ruleta" && newValue) return ["🎡", <>{who} {newValue.activa ? "prendió / actualizó" : "apagó"} la ruleta</>];
    return ["⚙️", <>{who} cambió {SETTING_NAMES[a.registro] || a.registro}</>];
  }
  return ["•", <>{who} hizo un cambio</>];
}

function PasswordForm({ user }) {
  const { close } = useModal();
  const toast = useToast();
  const showError = useShowError();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event) {
    event.preventDefault();
    if (password.length < 6) return setError("Tiene que tener al menos 6 caracteres.");
    try {
      await api.updateProfile(user.id, { password });
      close();
      toast(`Contraseña nueva para ${user.nombre}`);
    } catch (e) {
      showError(e);
    }
  }

  return (
    <>
      <SheetHead title={`Contraseña nueva para ${user.nombre}`} />
      <form className="stack" noValidate onSubmit={onSubmit}>
        <p className="small muted">Pasásela en persona o por WhatsApp. Después la puede usar para entrar con {user.email}.</p>
        <div className="field"><label htmlFor="newPassword">Contraseña nueva</label>
          <input id="newPassword" type="text" autoComplete="off" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <div className="error-text">{error}</div>
        <div className="row" style={{ justifyContent: "flex-end" }}><button className="btn btn-green">Guardar</button></div>
      </form>
    </>
  );
}

function UserRow({ user, isMe, onChange }) {
  const { open } = useModal();
  return (
    <div className="user">
      <div className="av" style={{ background: user.rol === "dueno" ? "var(--orange)" : "var(--green)" }}>{initials(user.nombre)}</div>
      <div><b>{user.nombre}</b>{isMe && <span className="small muted"> (vos)</span>}<br /><span className="small muted">{user.email || ""}</span></div>
      <div className="ctrl">
        {isMe ? <span className="role">Dueño</span> : (
          <>
            <select value={user.rol} aria-label={`Rol de ${user.nombre}`} onChange={(e) => onChange(user, { rol: e.target.value }, "Rol actualizado")}>
              <option value="empleado">Empleado</option>
              <option value="dueno">Dueño</option>
            </select>
            <Switch label={user.activo ? "Con acceso" : "Sin acceso"} checked={user.activo}
              onChange={(activo) => onChange(user, { activo }, activo ? "Acceso activado" : "Acceso quitado")} />
          </>
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => open(<PasswordForm user={user} />)}>🔒 Contraseña</button>
      </div>
    </div>
  );
}

export function Equipo() {
  const { me, products } = useAdmin();
  const toast = useToast();
  const showError = useShowError();
  const [users, setUsers] = useState(null);
  const [activity, setActivity] = useState([]);

  const load = useCallback(async () => {
    try {
      const [u, a] = await Promise.all([api.profiles(), api.activity()]);
      setUsers(u);
      setActivity(a);
    } catch (error) {
      showError(error);
    }
  }, [showError]);

  useEffect(() => { load(); }, [load]);

  async function onChange(user, changes, message) {
    try {
      await api.updateProfile(user.id, changes);
      toast(message);
      load();
    } catch (error) {
      showError(error);
    }
  }

  if (!users) return <div className="loading">Cargando…</div>;

  const waiting = users.filter((u) => !u.activo);
  const active = users.filter((u) => u.activo);
  const panelLink = location.href.split("#")[0];
  const row = (u) => <UserRow key={u.id} user={u} isMe={u.id === me.id} onChange={onChange} />;

  return (
    <>
      <div className="view-head"><div><h2>Equipo</h2><p>Quién entra al panel y qué se hizo.</p></div></div>
      <div className="grid2" style={{ alignItems: "start" }}>
        <div className="stack">
          {waiting.length > 0 && <section className="card"><h3>⏳ Esperando que los actives</h3><div className="pending">{waiting.map(row)}</div></section>}
          <section className="card"><h3>Con acceso</h3>{active.map(row)}</section>
          <section className="card">
            <h3>➕ Sumar a alguien</h3>
            <ol className="small" style={{ paddingLeft: 18, display: "grid", gap: 6, marginTop: 8 }}>
              <li>Mandale el link del panel: <b>{panelLink}</b></li>
              <li>Que toque <b>“Crear cuenta”</b> y ponga su nombre, mail y contraseña.</li>
              <li>Le aparece acá arriba en “Esperando”. Prendé <b>“Con acceso”</b> y listo.</li>
            </ol>
            <p className="small muted" style={{ marginTop: 10 }}><b>Empleado:</b> pedidos, stock y canjear códigos. <b>Dueño:</b> todo.</p>
          </section>
        </div>

        <section className="card">
          <h3>Actividad</h3><p className="small muted">Últimos cambios hechos desde el panel</p>
          {activity.length ? activity.map((a) => {
            const [icon, text] = describe(a, products);
            return <div className="act" key={a.id}><div className="i">{icon}</div><div>{text}<br /><small>{timeAgo(a.created_at)}</small></div></div>;
          }) : <p className="muted small" style={{ marginTop: 10 }}>Todavía no hay movimientos.</p>}
        </section>
      </div>
    </>
  );
}
