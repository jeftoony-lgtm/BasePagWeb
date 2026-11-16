// =====================================================================
//  KIVO · Cartel de abierto/cerrado y tabla de horarios
// =====================================================================

import { $, $$ } from "./utils.js";
import { store } from "./store.js";
import { DAY_NAMES, nowInUruguay, storeStatus } from "./schedule.js";

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // la tabla arranca el lunes

/** Pinta todos los carteles de estado (menú, horarios, puerta del dibujo, bienvenida) */
function paintStatus() {
  const status = storeStatus();

  $$("[data-status-dot]").forEach((dot) => dot.classList.toggle("on", status.open));
  $$("[data-status-text]").forEach((text) => {
    text.textContent = status.text;
    text.classList.toggle("closed-txt", !status.open);
  });
  $("#statusPill").classList.toggle("closed", !status.open);

  const doorSign = $("#doorSign");
  doorSign.textContent = status.open ? "ABIERTO" : "CERRADO";
  doorSign.setAttribute("fill", status.open ? "#16301a" : "#d0352a");

  if (!status.open) {
    $("#welcomeTitle").innerHTML = 'Ahora estamos <em class="closed">cerrados</em>';
    $("#welcomeText").textContent = `${status.text.replace("Cerrado · ", "Volvemos: ")}. Igual podés dejar tu pedido armado para retirar.`;
  }
}

/** Agrupa días seguidos con el mismo horario: "Lunes a miércoles", "Jueves y viernes"... */
function groupDays() {
  const horarios = store.settings.horarios || {};
  const key = (day) => JSON.stringify(horarios[day] || []);
  const groups = [];

  for (const day of WEEK_ORDER) {
    const last = groups[groups.length - 1];
    if (last && key(last.days[last.days.length - 1]) === key(day)) last.days.push(day);
    else groups.push({ days: [day], shifts: horarios[day] || [] });
  }
  return groups;
}

function groupLabel(days) {
  const names = days.map((d) => DAY_NAMES[d]);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} y ${names[1].toLowerCase()}`;
  return `${names[0]} a ${names[names.length - 1].toLowerCase()}`;
}

const pretty = (hhmm) => (hhmm === "24:00" ? "00:00" : hhmm);

function paintHoursTable() {
  const today = nowInUruguay().day;
  const rows = groupDays().map(({ days, shifts }) => {
    const hours = shifts.length
      ? shifts.map(([open, close]) => `<span>${pretty(open)} – ${pretty(close)}</span>`).join("")
      : "<span>Cerrado</span>";
    return `<tr class="${days.includes(today) ? "today" : ""}"><td>${groupLabel(days)}</td><td>${hours}</td></tr>`;
  });
  $("#hoursTable").innerHTML = rows.join("");

  // Si algún día tiene corte al mediodía, lo aclaramos abajo
  const withBreak = WEEK_ORDER.filter((d) => (store.settings.horarios?.[d] || []).length > 1);
  $("#hoursNote").textContent = withBreak.length ? "Los días con dos turnos cerramos un rato al mediodía." : "";
}

export function initStatus() {
  paintStatus();
  paintHoursTable();
  setInterval(paintStatus, 60_000); // se actualiza solo cada minuto
}
