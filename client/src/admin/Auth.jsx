// =====================================================================
//  LUZ SERENA PANEL · Entrar, crear cuenta y "olvidé mi contraseña"
//  La primera cuenta que se crea queda como dueño. Las demás esperan
//  a que el dueño las active en Equipo.
// =====================================================================

import { useState } from "react";
import { api } from "../api.js";

const TEXTS = {
  login:  { title: "Panel del equipo",     subtitle: "Entrá con tu mail y tu contraseña.",                button: "Entrar" },
  signup: { title: "Crear cuenta",         subtitle: "Después de crearla, el dueño tiene que activarla.",   button: "Crear cuenta" },
  forgot: { title: "Olvidé mi contraseña", subtitle: "Pedile al dueño que te ponga una contraseña nueva desde Equipo. Si sos el dueño, mirá el README (npm run hacer-dueno).", button: null },
};

export const Logo = () => (
  <div className="logo"><img src="img/logo.webp" alt="" width="44" height="44" /><b>LUZ SERENA<small>Panel</small></b></div>
);

export function AuthScreen({ onLoggedIn }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const t = TEXTS[mode];
  const field = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) });

  const switchTo = (next) => { setMode(next); setMessage(""); };

  async function onSubmit(event) {
    event.preventDefault();
    const email = form.email.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setMessage("Escribí un mail válido.");
    if (form.password.length < 6) return setMessage("La contraseña tiene que tener al menos 6 caracteres.");
    if (mode === "signup" && !form.name.trim()) return setMessage("Escribí tu nombre.");

    setBusy(true);
    try {
      if (mode === "login") await api.signIn(email, form.password);
      else await api.signUp(email, form.password, form.name.trim());
      await onLoggedIn();
    } catch (error) {
      setMessage(error.message);
      setBusy(false);
    }
  }

  return (
    <section className="auth">
      <div className="card">
        <Logo />
        <h1>{t.title}</h1>
        <p className="muted">{t.subtitle}</p>

        <form noValidate onSubmit={onSubmit}>
          {mode === "signup" && (
            <div className="field"><label htmlFor="authName">Tu nombre</label><input id="authName" autoComplete="name" placeholder="Ej: Enfermería" {...field("name")} /></div>
          )}
          {mode !== "forgot" && (
            <>
              <div className="field"><label htmlFor="authEmail">Mail</label><input id="authEmail" type="email" autoComplete="email" placeholder="tu@mail.com" {...field("email")} /></div>
              <div className="field"><label htmlFor="authPassword">Contraseña</label>
                <input id="authPassword" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder="••••••••" {...field("password")} /></div>
              <div className="message">{message}</div>
              <button className="btn btn-gold" type="submit" disabled={busy}>{t.button}</button>
            </>
          )}
          <div className="links">
            <button type="button" onClick={() => switchTo(mode === "login" ? "signup" : "login")}>{mode === "login" ? "Crear cuenta" : "Ya tengo cuenta"}</button>
            {mode === "login" && <button type="button" onClick={() => switchTo("forgot")}>Olvidé mi contraseña</button>}
          </div>
          <a className="back" href="/">← Volver a la página</a>
        </form>
      </div>
    </section>
  );
}

export function PendingScreen({ onLogout }) {
  return (
    <section className="auth">
      <div className="card" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 54 }}>⏳</div>
        <h1>Cuenta creada</h1>
        <p className="muted" style={{ margin: "8px 0 18px" }}>Ya estás registrado/a. Ahora el dueño tiene que activar tu cuenta desde el panel. Cuando lo haga, entrá de nuevo.</p>
        <button className="btn btn-ghost" onClick={onLogout}>Salir</button>
      </div>
    </section>
  );
}
