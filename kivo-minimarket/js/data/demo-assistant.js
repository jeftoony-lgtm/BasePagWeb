// =====================================================================
//  KIVO · Asistente de PRÁCTICA (modo demo, sin IA)
//
//  Imita al asistente real con reglas simples, para poder probar el chat
//  sin Supabase ni clave de IA. Devuelve lo mismo que la IA real:
//    { reply: "texto", actions: [ {type:"add"|"remove"|"show"|"checkout", ...} ] }
//  Cuando se conecta Supabase, este archivo deja de usarse.
// =====================================================================

const NUMBER_WORDS = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, docena: 12 };

// Palabras que la gente usa y a qué producto se refieren
const SYNONYMS = {
  coca: "coca-cola", cocas: "coca-cola", birra: "cerveza", birras: "cerveza", cervezas: "cerveza",
  papas: "lay's", papitas: "lay's", lays: "lay's", helado: "grido", helados: "grido",
  figus: "figuritas", figu: "figuritas", sobres: "figuritas", album: "álbum", yerbita: "yerba",
  fideo: "fideos", pan: "pan flauta", flautas: "pan flauta", queso: "queso", salamin: "salame",
};

const ADD_WORDS = ["agrega", "agregame", "suma", "sumame", "pone", "poneme", "quiero", "dame", "mandame", "necesito", "traeme", "anota", "anotame"];
const REMOVE_WORDS = ["saca", "sacame", "quita", "quitame", "borra", "elimina", "no quiero"];
const DONE_WORDS = ["listo", "eso es todo", "nada mas", "nada más", "terminar", "enviar", "confirmo", "mandalo", "ya esta", "es todo"];

const normalize = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[¿?¡!.,]/g, " ");
const has = (text, words) => words.some((w) => new RegExp(`(^|\\s)${normalize(w)}(\\s|$)`).test(text));
const pick = (options) => options[Math.floor(Math.random() * options.length)];
const fmt = (n) => "$" + Number(n).toLocaleString("es-UY");

// Busca productos mencionados en el texto, con la cantidad que dijo la persona
function findProducts(text, products) {
  const words = text.split(/\s+/).filter(Boolean);
  const found = new Map();

  words.forEach((rawWord, index) => {
    const word = SYNONYMS[rawWord] ? normalize(SYNONYMS[rawWord]) : rawWord;
    if (word.length < 4 && !SYNONYMS[rawWord]) return; // evita confundir "que" con "Queso"

    const matches = products.filter((p) => {
      const name = normalize(p.nombre);
      return name.split(/\s+/).some((w) => w.startsWith(word) || word.startsWith(w) && w.length >= 4) || name.includes(word);
    });
    if (!matches.length) return;

    // "queso dambo" son dos palabras pero un solo producto: no lo contamos dos veces
    const alreadyFound = [...found.values()].some((f) => f.matches.length === 1 && matches.length === 1 && f.matches[0].id === matches[0].id);
    if (alreadyFound) return;

    const before = words[index - 1];
    const qty = Number(before) || NUMBER_WORDS[before] || 1;
    found.set(word, { matches, qty });
  });

  return [...found.values()];
}

export function demoAssistant({ messages, cart, products, settings }) {
  const last = normalize(messages[messages.length - 1]?.content || "");
  const notas = settings.asistente?.notas || "";
  const inCart = cart.length > 0;

  // Saludos
  if (/^(hola|buenas|buen dia|buenas tardes|buenas noches|holi)\b/.test(last.trim()) && last.split(/\s+/).length <= 3) {
    return { reply: pick(["¡Hola! ¿Qué andás necesitando hoy?", "¡Buenas! Contame qué te hace falta y te lo voy armando."]), actions: [] };
  }

  // Terminar el pedido
  if (has(last, DONE_WORDS) && inCart) {
    return { reply: "¡Buenísimo! Revisá la canasta, elegí si pasás a buscar o te lo mandamos, y lo enviás por WhatsApp. 🙌", actions: [{ type: "checkout" }] };
  }

  // Horarios
  if (/\b(hora|horario|abren|abierto|cierran|cierra|abre)\b/.test(last)) {
    return { reply: "De lunes a miércoles abrimos de 10 a 14:30 y de 15 a 23. Jueves y viernes hasta la medianoche, sábados de 10 a 00 y domingos de 10 a 19. Fijate arriba si estamos abiertos ahora 😉", actions: [] };
  }

  // Envíos y pagos
  if (/\b(envio|envios|envian|delivery|domicilio|mandan|pago|pagar|tarjeta|transferencia|efectivo)\b/.test(last)) {
    return { reply: notas || "Eso coordinalo por WhatsApp cuando mandes el pedido y te confirman al toque.", actions: [] };
  }

  // Picada → mostrar lo típico
  if (last.includes("picada")) {
    const names = ["Salame", "Queso dambo", "Lay's Clásicas", "Coca-Cola 2,25 L", "Cerveza Pilsen 1 L"];
    const ids = names.map((n) => products.find((p) => p.nombre === n)?.id).filter(Boolean);
    const combo = settings.combo?.activo ? ` Ojo que está el ${settings.combo.titulo} a ${fmt(settings.combo.precio)}, sale más barato.` : "";
    return { reply: `¡Una picada! ¿Para cuántos es? Te dejo lo que más sale.${combo}`, actions: [{ type: "show", ids }] };
  }

  const found = findProducts(last, products);

  // Quitar de la canasta
  if (found.length && has(last, REMOVE_WORDS)) {
    const actions = found.map(({ matches }) => ({ type: "remove", id: matches[0].id, cantidad: null }));
    return { reply: "Listo, lo saqué. ¿Algo más?", actions };
  }

  if (found.length) {
    const sure = found.filter((f) => f.matches.length === 1);
    const unsure = found.filter((f) => f.matches.length > 1);
    const wantsToAdd = has(last, ADD_WORDS) || /^\d/.test(last.trim()) || sure.length > 0;

    // Varios productos posibles (ej: "coca" → 2,25 L o 600 ml): preguntar cuál
    if (unsure.length && !sure.length) {
      const options = unsure[0].matches.slice(0, 6);
      return { reply: `Tengo ${options.length} opciones, ¿cuál te sirve? Tocá el + en la que quieras.`, actions: [{ type: "show", ids: options.map((p) => p.id) }] };
    }

    if (wantsToAdd && sure.length) {
      const outOfStock = sure.filter((f) => !f.matches[0].en_stock);
      const ok = sure.filter((f) => f.matches[0].en_stock);
      const actions = ok.map(({ matches, qty }) => ({ type: "add", id: matches[0].id, cantidad: qty }));
      let reply = ok.length ? pick(["¡Dale! Ya te lo sumé.", "Listo, anotado.", "Hecho 👌"]) : "";
      if (outOfStock.length) reply += ` ${outOfStock.map((f) => f.matches[0].nombre).join(" y ")} no nos queda por hoy, perdón.`;
      reply += " ¿Algo más o te armo el pedido?";
      return { reply: reply.trim(), actions };
    }
  }

  // No entendió: ayudar sin trabarse
  return {
    reply: pick([
      "Mmm, eso no lo encuentro. Probá con el nombre del producto, tipo \"2 cocas y unas papas\".",
      "No te sigo del todo 😅 Decime qué producto buscás y te lo agrego.",
    ]),
    actions: [],
  };
}
