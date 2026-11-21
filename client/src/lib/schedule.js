// =====================================================================
//  KIVO · Horarios: ¿está abierto?, ¿a qué hora abre?, turnos para retirar
//  Los horarios vienen del panel con el formato { "1": [["10:00","14:30"], ...] }
//  donde 0 = domingo, 1 = lunes ... 6 = sábado. "24:00" = medianoche.
// =====================================================================

export const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/** "14:30" → 870 (minutos desde la medianoche) */
const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** 870 → "14:30" (y 1440 → "00:00") */
export const toHHMM = (minutes) => {
  const m = minutes % 1440;
  return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
};

/** Turnos de un día en minutos: [[600, 870], [900, 1380]] */
export function shiftsOf(settings, day) {
  return (settings.horarios?.[day] || []).map(([open, close]) => [toMinutes(open), toMinutes(close)]);
}

/** Día y hora actuales en Uruguay, aunque el celular esté en otro país */
export function nowInUruguay() {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Montevideo", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date());
    const get = (type) => parts.find((p) => p.type === type).value;
    const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
    return { day, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
  } catch {
    const d = new Date();
    return { day: d.getDay(), minutes: d.getHours() * 60 + d.getMinutes() };
  }
}

/** Fecha de hoy + N días en Uruguay, como "2026-11-13" */
export function dateInUruguay(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 864e5);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo" }).format(date);
}

/** ¿Está abierto ahora? Devuelve { open, text } para mostrar */
export function storeStatus(settings) {
  const closedToday = settings.cerrado;
  if (closedToday?.activo) {
    return { open: false, text: closedToday.motivo || "Cerrado hoy" };
  }

  const { day, minutes } = nowInUruguay();
  for (const [open, close] of shiftsOf(settings, day)) {
    if (minutes >= open && minutes < close) return { open: true, text: "Abierto · cierra " + toHHMM(close) };
  }
  for (const [open] of shiftsOf(settings, day)) {
    if (minutes < open) return { open: false, text: "Cerrado · abre " + toHHMM(open) };
  }
  for (let i = 1; i <= 7; i++) {
    const next = (day + i) % 7;
    const shifts = shiftsOf(settings, next);
    if (shifts.length) {
      const when = i === 1 ? "mañana" : DAY_NAMES[next].toLowerCase();
      return { open: false, text: `Cerrado · abre ${when} ${toHHMM(shifts[0][0])}` };
    }
  }
  return { open: false, text: "Cerrado" };
}

/** Horarios para pasar a retirar (cada 30 min, con 30 min de margen si es hoy) */
export function pickupSlots(settings, offsetDays) {
  if (offsetDays === 0 && settings.cerrado?.activo) return [];
  const { day, minutes } = nowInUruguay();
  const targetDay = (day + offsetDays) % 7;
  const slots = [];
  for (const [open, close] of shiftsOf(settings, targetDay)) {
    for (let m = open + 30; m <= close - 15; m += 30) {
      if (offsetDays === 0 && m < minutes + 30) continue;
      slots.push(m);
    }
  }
  return slots;
}
