// =====================================================================
//  KIVO PANEL · Entrar, crear cuenta y recuperar contraseña
// =====================================================================

import { $, $$ } from "./ui.js";
import { data } from "../data/index.js";

const TEXTS = {
  login:  { title: "Panel del local",      subtitle: "Entrá con tu mail y tu contraseña.",                       button: "Entrar" },
  signup: { title: "Crear cuenta",         subtitle: "Después de crearla, el dueño tiene que activarla.",          button: "Crear cuenta" },
  reset:  { title: "Recuperar contraseña", subtitle: "Te mandamos un mail para elegir una contraseña nueva.",      button: "Mandar mail" },
};

let mode = "login";

function setMode(newMode) {
  mode = newMode;
  const t = TEXTS[mode];
  $("#authTitle").textContent = t.title;
  $("#authSubtitle").textContent = t.subtitle;
  $("#authSubmit").textContent = t.button;
  $("#nameField").hidden = mode !== "signup";
  $("#passwordField").hidden = mode === "reset";
  $("#toggleSignup").textContent = mode === "login" ? "Crear cuenta" : "Ya tengo cuenta";
  $("#authPassword").autocomplete = mode === "signup" ? "new-password" : "current-password";
  showMessage("");
}

function showMessage(text, ok = false) {
  const el = $("#authMessage");
  el.textContent = text;
  el.style.color = ok ? "var(--green-d)" : "";
}

async function onSubmit(event, onLoggedIn) {
  event.preventDefault();
  const email = $("#authEmail").value.trim();
  const password = $("#authPassword").value;
  const name = $("#authName").value.trim();

  if (!/^\S+@\S+\.\S+$/.test(email)) return showMessage("Escribí un mail válido.");
  if (mode !== "reset" && password.length < 6 && !data.demo) return showMessage("La contraseña tiene que tener al menos 6 caracteres.");
  if (mode === "signup" && !name) return showMessage("Escribí tu nombre.");

  $("#authSubmit").disabled = true;
  try {
    if (mode === "login") {
      await data.signIn(email, password);
      await onLoggedIn();
    } else if (mode === "signup") {
      await data.signUp(email, password, name);
      setMode("login");
      showMessage(data.demo
        ? "Cuenta creada. El dueño la tiene que activar en Equipo."
        : "Listo. Revisá tu mail para confirmar la cuenta, y después el dueño la activa.", true);
    } else {
      await data.resetPassword(email);
      showMessage("Si el mail existe, te llegó un link para cambiar la contraseña.", true);
    }
  } catch (error) {
    showMessage(error.message);
  }
  $("#authSubmit").disabled = false;
}

export function initAuth(onLoggedIn) {
  $("#demoLogin").hidden = !data.demo;
  $("#toggleSignup").addEventListener("click", () => setMode(mode === "login" ? "signup" : "login"));
  $("#toggleReset").addEventListener("click", () => setMode("reset"));
  $("#authForm").addEventListener("submit", (e) => onSubmit(e, onLoggedIn));

  // Botones del modo demo: entran directo como dueño o como Tita
  $$("[data-demo-login]").forEach((button) => {
    button.addEventListener("click", async () => {
      await data.signIn(button.dataset.demoLogin, "demo");
      onLoggedIn();
    });
  });

  setMode("login");
}
