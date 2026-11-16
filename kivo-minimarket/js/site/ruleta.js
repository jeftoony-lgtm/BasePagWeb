// =====================================================================
//  KIVO · Ruleta de promos
//  Solo aparece si el dueño la prende en el panel (y no pasó la fecha de fin).
//  El premio lo sortea el servidor; acá solo se anima la rueda hasta él.
// =====================================================================

import { $, $$, escapeHTML } from "./utils.js";
import { store } from "./store.js";
import { dateInUruguay } from "./schedule.js";
import { data } from "../data/index.js";

const RADIUS = 190;
let rotation = 0;

function isActive() {
  const ruleta = store.settings.ruleta;
  return Boolean(ruleta?.activa && ruleta.premios?.length && (!ruleta.hasta || dateInUruguay() <= ruleta.hasta));
}

const open = () => $("#ruletaModal").classList.add("open");
const close = () => $("#ruletaModal").classList.remove("open");

/** Punto sobre el círculo a cierto ángulo (0° = arriba) */
const pointAt = (angle, r) => [r * Math.sin((angle * Math.PI) / 180), -r * Math.cos((angle * Math.PI) / 180)];

function drawWheel(prizes) {
  const slice = 360 / prizes.length;
  let svg = '<circle r="198" fill="#fff"/>';

  prizes.forEach((prize, i) => {
    const start = i * slice, middle = start + slice / 2;
    const [x0, y0] = pointAt(start, RADIUS);
    const [x1, y1] = pointAt(start + slice, RADIUS);
    svg += `<path d="M0 0L${x0} ${y0}A${RADIUS} ${RADIUS} 0 0 1 ${x1} ${y1}Z" fill="${escapeHTML(prize.c)}" stroke="#fff" stroke-width="3"/>`;
    svg += `<text transform="rotate(${middle}) translate(0 -118) rotate(90)" text-anchor="middle" dominant-baseline="middle"
              fill="#fff" font-family="Bricolage Grotesque" font-weight="800" font-size="19">${escapeHTML(prize.t)}</text>`;
  });

  // Lucecitas del borde
  for (let i = 0; i < prizes.length; i++) {
    const [x, y] = pointAt(i * slice, 192);
    svg += `<circle cx="${x}" cy="${y}" r="5" fill="#ffd98a"/>`;
  }
  $("#wheel").innerHTML = svg;
}

/** Gira la rueda hasta caer en el premio "index" */
function spinTo(index, total) {
  const slice = 360 / total;
  const wobble = Math.random() * slice * 0.6 - slice * 0.3;
  const target = 360 * 6 + (360 - (index * slice + slice / 2)) + wobble;
  rotation += target - (rotation % 360);
  $("#wheel").style.transform = `rotate(${rotation}deg)`;
}

function confetti() {
  const colors = ["#5a9f43", "#e8952f", "#ffd98a", "#fff", "#2f6b2a"];
  const center = $("#wheel").getBoundingClientRect();
  for (let i = 0; i < 70; i++) {
    const piece = document.createElement("div");
    piece.style.cssText = `position:fixed;z-index:80;width:9px;height:14px;border-radius:2px;pointer-events:none;
      background:${colors[i % colors.length]};left:${center.left + center.width / 2}px;top:${center.top + center.height / 2}px`;
    document.body.appendChild(piece);
    const angle = Math.random() * Math.PI * 2, distance = 160 + Math.random() * 260;
    piece.animate([
      { transform: "translate(0,0) rotate(0)", opacity: 1 },
      { transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance + 200}px) rotate(${Math.random() * 720}deg)`, opacity: 0 },
    ], { duration: 1400 + Math.random() * 800, easing: "cubic-bezier(.2,.7,.4,1)" }).onfinish = () => piece.remove();
  }
}

function showResult(name, result) {
  const box = $("#prize");
  box.innerHTML = result.premio
    ? `<b>¡Ganaste, ${escapeHTML(name)}! 🎉</b>${escapeHTML(result.premio)}.<br>Mostrá este código en caja:<br>
       <code>${escapeHTML(result.code)}</code><p>Válido por 7 días. Le podés sacar una captura.</p>`
    : `<b>¡Uh, casi, ${escapeHTML(name)}!</b>Esta vez no tocó, pero te vamos a avisar de las próximas promos.`;
  box.classList.add("show");
  box.scrollIntoView({ block: "nearest", behavior: "smooth" });
  if (result.premio) confetti();
}

async function onSubmit(event) {
  event.preventDefault();
  const name = $("#wName").value.trim();
  const phone = $("#wPhone").value.replace(/\D/g, "");
  const error = $("#wError");
  const button = $("#spinBtn");

  if (!name) return (error.textContent = "Poné tu nombre.");
  if (!/^09\d{7}$/.test(phone)) return (error.textContent = "El celular tiene que ser uruguayo, tipo 099 123 456.");

  error.textContent = "";
  button.disabled = true;
  try {
    const result = await data.spin(name, phone, $("#wAccept").checked);
    spinTo(result.indice, store.settings.ruleta.premios.length);
    setTimeout(() => showResult(name, result), 5100);
  } catch (e) {
    error.textContent = e.message.includes("Ya giraste") ? "Ya giraste en esta promo. ¡Atento a la próxima!" : e.message;
    button.disabled = false;
  }
}

export function initRuleta() {
  const active = isActive();
  $$("[data-open-ruleta]").forEach((el) => {
    el.hidden = !active;
    el.addEventListener("click", (e) => { e.preventDefault(); open(); });
  });
  $("#promoTab").hidden = !active;
  if (!active) return;

  const { premios, hasta } = store.settings.ruleta;
  drawWheel(premios);
  if (hasta) {
    const [, month, day] = hasta.split("-");
    $("#ruletaUntil").textContent = `Promo válida hasta el ${day}/${month}`;
  }

  $("#promoTab").addEventListener("click", open);
  $("#closeRuleta").addEventListener("click", close);
  $("#ruletaModal").addEventListener("click", (e) => e.target.id === "ruletaModal" && close());
  addEventListener("keydown", (e) => e.key === "Escape" && close());
  $("#wheelForm").addEventListener("submit", onSubmit);
}
