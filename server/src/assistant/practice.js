// =====================================================================
//  KIVO · Asistente de PRÁCTICA (sin IA)
//
//  Imita al asistente real con reglas, para que el chat funcione aunque
//  no haya clave de IA. Devuelve lo mismo que la IA real:
//    { reply: "texto", actions: [ {type:"add"|"remove"|"show"|"checkout", ...} ] }
//  Se usa cuando server/.env no tiene ANTHROPIC_API_KEY.
//
//  Qué entiende:
//   - Varios productos de una: "2 cocas grandes, unas papas y 3 cervezas Pilsen"
//   - Picadas por cantidad de personas: "picada para 6" (o pregunta para cuántos)
//   - Ideas: mate, desayuno, asado, cumple, merienda
//   - Preguntas: precios, "¿tienen X?", horarios de hoy, envíos y pagos, dónde están
//   - La canasta: "¿qué llevo?", "sacá la coca", "vaciá todo", "listo"
//   - Ofrece algo que combina y entiende el "dale" de respuesta
// =====================================================================

import { storeStatus, uruguayNow } from "./prompt.js";

/* ---------- Diccionarios ---------- */

const NUMBER_WORDS = {
  un: 1, una: 1, uno: 1, unos: 1, unas: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7,
  ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, quince: 15, veinte: 20, docena: 12,
};

// Cómo lo dice la gente → cómo se llama en el catálogo
const SYNONYMS = {
  coca: "coca", cocas: "coca", cocacola: "coca", birra: "cerveza", birras: "cerveza", chela: "cerveza",
  papas: "lays", papitas: "lays", fritas: "lays", helado: "grido", helados: "grido",
  figus: "figuritas", figu: "figuritas", figurita: "figuritas", galleta: "galletitas", galletas: "galletitas",
  yerbita: "yerba", fideo: "fideos", flauta: "pan", flautas: "pan", panes: "pan", salamin: "salame",
  manicito: "mani", jamon: "jamon", choco: "chocolate", aguita: "agua",
  grande: "2,25", grandes: "2,25", chica: "600", chicas: "600", chiquita: "600", chiquitas: "600",
  papel: "papel", higienico: "higienico", esponjita: "esponjas",
};

// Palabras que no dicen qué producto es
const STOPWORDS = new Set(`pedir pido pedido hacer comprar compra encargar llevar buscar busco ayuda ayudame ayudar armar armame quiero queria quisiera dame dale agrega agregame agregale suma sumame sumale pone poneme ponele
  mandame manda necesito traeme anota anotame tambien mas de del la las el los lo le les unos unas por favor porfa para
  me te que si a al en mi y e con sin bien algo alguna algun otro otra otros otras ademas tenes tienen tenés hay venden
  cuanto cuesta cuestan sale salen vale valen precio precios saca sacame sacale quita quitame borra borrame elimina
  no hola buenas gracias capaz porfis ahi aca este esta ese esa`.split(/\s+/));

const CATEGORY_WORDS = {
  bebida: "bebidas", bebidas: "bebidas", refresco: "bebidas", refrescos: "bebidas", gaseosa: "bebidas", gaseosas: "bebidas", tomar: "bebidas",
  snack: "snacks", snacks: "snacks", picar: "snacks", picoteo: "snacks",
  almacen: "almacen", fiambre: "fiambre", fiambres: "fiambre", fiambreria: "fiambre",
  grido: "grido", mundial: "mundial", limpieza: "limpieza", limpiar: "limpieza",
};

const ADD_WORDS = ["agrega", "agregame", "agregale", "suma", "sumame", "sumale", "pone", "poneme", "ponele", "quiero", "dame", "mandame", "necesito", "traeme", "anota", "anotame", "queria", "quisiera"];
const REMOVE_WORDS = ["saca", "sacame", "sacale", "quita", "quitame", "borra", "borrame", "elimina", "no quiero", "mejor no"];
const DONE_WORDS = ["listo", "eso es todo", "eso seria todo", "nada mas", "terminar", "enviar", "confirmo", "mandalo", "ya esta", "es todo", "nada"];
const YES_WORDS = ["si", "dale", "bueno", "ok", "okey", "de una", "va", "joya", "obvio", "claro", "perfecto", "bárbaro", "barbaro", "sumalo", "agregalo", "sale"];

// Lo que combina con cada producto (se ofrece una sola vez)
const PAIRS = [
  ["Salame", "Pan flauta"], ["Queso dambo", "Pan flauta"], ["Jamón cocido", "Pan flauta"],
  ["Lay's Clásicas", "Coca-Cola 2,25 L"], ["Yerba Canarias", "Galletitas dulces"],
  ["Fideos tallarines", "Aceite de girasol"], ["Álbum Mundial 2026", "Sobre de figuritas"],
  ["Cerveza Pilsen 1 L", "Maní salado"], ["Cerveza Patricia 1 L", "Maní salado"],
  ["Coca-Cola 2,25 L", "Lay's Clásicas"], ["Detergente", "Esponjas"],
];

// Ideas armadas (se muestran como tarjetas para elegir)
const IDEAS = [
  { words: ["mate", "matear"], text: "Para el mate tengo esto 🧉", names: ["Yerba Canarias", "Galletitas dulces", "Pan flauta"] },
  { words: ["desayuno", "merienda", "merendar", "desayunar"], text: "Para la merienda te dejo opciones 😋", names: ["Galletitas dulces", "Pan flauta", "Jamón cocido", "Queso dambo", "Chocolate"] },
  { words: ["asado", "parrilla", "chivito"], text: "Carne no vendemos, pero tenemos el Pack asado en Encargos especiales 🔥 Para acompañar:", names: ["Pan flauta", "Coca-Cola 2,25 L", "Cerveza Pilsen 1 L", "Cerveza Patricia 1 L"] },
  { words: ["cumple", "cumpleanos", "fiesta", "previa"], text: "¡Para el cumple! Si querés lo armamos nosotros (Encargos especiales). Lo que más sale:", names: ["Coca-Cola 2,25 L", "Lay's Clásicas", "Maní salado", "Chocolate", "Grido Tentación Granizado"] },
  { words: ["cena", "cenar", "comida", "almorzar", "almuerzo"], text: "Algo rápido para cocinar:", names: ["Fideos tallarines", "Arroz", "Aceite de girasol", "Queso dambo", "Pan flauta"] },
];

/* ---------- Herramientas de texto ---------- */

/** minúsculas, sin tildes ni signos (deja la coma de "2,25") */
const normalize = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/['’´`]/g, "").replace(/[¿?¡!.;:()"*_\-]/g, " ");
const words = (s) => s.replace(/,(?!\d)|(?<!\d),/g, " ").split(/\s+/).filter(Boolean);
const has = (text, list) => list.some((w) => new RegExp(`(^|\\s)${normalize(w)}(\\s|$)`).test(text));
const pick = (options) => options[Math.floor(Math.random() * options.length)];
const fmt = (n) => "$" + Number(n).toLocaleString("es-UY");
const tokenMatch = (user, product) =>
  user === product || (user.length >= 4 && product.startsWith(user)) || (product.length >= 4 && user.startsWith(product));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const joinNice = (list) => (list.length <= 1 ? list.join("") : `${list.slice(0, -1).join(", ")} y ${list[list.length - 1]}`);

/** Saca la cantidad de un pedazo de texto: "2", "x3", "dos", "media docena", "un par" */
function takeQuantity(tokens) {
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const digits = t.match(/^x?(\d{1,2})x?$/);
    const unit = ["l", "lt", "lts", "litro", "litros", "ml", "kg", "g", "gr", "k", "cc"].includes(tokens[i + 1]);
    if (digits && !unit && Number(digits[1]) > 0 && Number(digits[1]) <= 50) {
      return { qty: Number(digits[1]), rest: tokens.filter((_, j) => j !== i) };
    }
    if (NUMBER_WORDS[t]) return { qty: NUMBER_WORDS[t], rest: tokens.filter((_, j) => j !== i) };
  }
  return { qty: 1, rest: tokens };
}

/* ---------- El asistente ---------- */

export function practiceAssistant({ messages, cart, products, settings }) {
  const raw = messages[messages.length - 1]?.content || "";
  const text = ` ${normalize(raw).replace(/\s+/g, " ").trim()} `;
  const lastBot = [...messages].reverse().find((m) => m.role === "assistant")?.content || "";
  const allBot = messages.filter((m) => m.role === "assistant").map((m) => m.content).join("\n");
  const notas = settings.asistente?.notas || "";
  const combo = settings.combo?.activo ? settings.combo : null;

  const byName = (name) => products.find((p) => p.nombre === name) || null;
  const byId = (id) => (id === "combo" && combo ? { id: "combo", nombre: combo.titulo, precio: Number(combo.precio), en_stock: true } : products.find((p) => String(p.id) === String(id)));
  const cartLines = (Array.isArray(cart) ? cart : []).map((l) => ({ ...l, item: byId(l.id) })).filter((l) => l.item);
  const cartTotal = (lines) => lines.reduce((sum, l) => sum + (l.item.precio || 0) * l.cantidad, 0);
  const inCart = (id) => cartLines.some((l) => String(l.id) === String(id));
  // ¿Ya se le ofreció este producto con "¿Le sumo ...?"? (para no insistir)
  const offered = (name) => allBot.split("¿Le sumo").slice(1).some((part) => part.split("?")[0].includes(name));
  const priceOf = (p) => (p.precio == null ? "precio a confirmar" : fmt(p.precio));

  /* --- Productos mencionados en el texto (puede haber varios) --- */
  function findProducts(source) {
    const segments = normalize(source)
      .replace(/media docena/g, "6").replace(/un par de|un par/g, "2")
      .split(/,(?!\d)|\s(?:y|e|mas|con|ademas|tambien)\s|\n|\+/);
    const results = [];
    for (const segment of segments) {
      const { qty, rest } = takeQuantity(words(segment));
      const tokens = rest.map((t) => SYNONYMS[t] || t).filter((t) => !STOPWORDS.has(t) && t.length > 1);
      if (!tokens.length) continue;

      const scored = products.map((p) => {
        const name = words(normalize(p.nombre));
        const detail = words(normalize(p.detalle || ""));
        let score = 0, inName = 0;
        for (const t of tokens) {
          if (name.some((n) => tokenMatch(t, n))) { score += 2; inName++; }
          else if (detail.some((d) => tokenMatch(t, d))) score += 1;
        }
        return { p, score, inName };
      }).filter((s) => s.inName > 0);

      if (!scored.length) { results.push({ unknown: tokens.join(" "), tokens }); continue; }
      const best = Math.max(...scored.map((s) => s.score));
      const matches = scored.filter((s) => s.score === best).map((s) => s.p);
      results.push({ matches, qty, explicitQty: qty !== 1 || /\b(1|un|una|uno)\b/.test(segment) });
    }
    return results;
  }

  /** Arma la respuesta de "agregué", con lo que no hay y una sugerencia que combina */
  function addReply(items, intro) {
    const ok = items.filter(({ p }) => p.en_stock !== false);
    const out = items.filter(({ p }) => p.en_stock === false);
    const actions = ok.map(({ p, qty }) => ({ type: "add", id: p.id, cantidad: qty }));
    const added = ok.map(({ p, qty }) => `${qty > 1 ? qty + " " : ""}${p.nombre}`);

    let reply = intro ?? (ok.length ? `${pick(["¡Dale! Te sumé", "Listo, te sumé", "Hecho 👌 Te sumé", "De una, te sumé"])} ${joinNice(added)}.` : "");
    if (out.length) reply += ` ${joinNice(out.map(({ p }) => p.nombre))} no nos queda por hoy, perdón.`;

    // Algo que combina, si no lo tiene y no se le ofreció antes
    const justAdded = new Set(ok.map(({ p }) => p.nombre));
    const pair = PAIRS.find(([from, to]) => justAdded.has(from) && !justAdded.has(to)
      && byName(to)?.en_stock !== false && byName(to) && !inCart(byName(to).id) && !offered(to));
    reply += pair ? ` ¿Le sumo ${pair[1]}?` : ok.length ? " ¿Algo más?" : "";
    return { reply: reply.trim(), actions };
  }

  /** Picada para N personas: 1 de cada cosa cada 3 personas */
  function picada(people) {
    const portions = Math.max(1, Math.ceil(people / 3));
    const items = ["Salame", "Queso dambo", "Lay's Clásicas", "Coca-Cola 2,25 L"]
      .map(byName).filter((p) => p && p.en_stock !== false).map((p) => ({ p, qty: portions }));
    if (people >= 4 && byName("Maní salado")) items.push({ p: byName("Maní salado"), qty: Math.ceil(people / 4) });
    if (!items.length) return { reply: "Ahora no tengo fiambres cargados 😕 Fijate en las góndolas.", actions: [] };
    const beers = byName("Cerveza Pilsen 1 L");
    const list = joinNice(items.map(({ p, qty }) => `${qty} ${p.nombre}`));
    let reply = `Te armé una picada para ${people}: ${list}. Total aprox. ${fmt(items.reduce((s, { p, qty }) => s + (p.precio || 0) * qty, 0))}.`;
    if (combo && people <= 4) reply += ` Ojo: el ${combo.titulo} sale ${fmt(combo.precio)} y te puede convenir.`;
    if (beers && beers.en_stock !== false && !inCart(beers.id) && !offered(beers.nombre)) reply += ` ¿Le sumo ${Math.ceil(people / 2)}× ${beers.nombre}?`;
    else reply += " ¿Cambio algo?";
    const { actions } = addReply(items, "");
    return { reply, actions };
  }

  /* 1. Saludo */
  if (/^ (hola|buenas|buen dia|buenos dias|buenas tardes|buenas noches|holi|que tal)\b/.test(text) && text.trim().split(" ").length <= 4) {
    return { reply: pick(["¡Hola! ¿Qué andás necesitando hoy?", "¡Buenas! Contame qué te hace falta y te lo voy armando."]), actions: [] };
  }

  /* 2. Gracias */
  if (/\b(gracias|grax|muchas gracias|genial|buenisimo)\b/.test(text) && text.trim().split(" ").length <= 4) {
    return { reply: cartLines.length ? "¡De nada! Cuando quieras te armo el pedido para mandarlo 🙌" : "¡De nada! Acá estoy si precisás algo.", actions: [] };
  }

  /* 3. Respuestas a lo que preguntó el asistente */
  const offer = lastBot.match(/¿Le sumo (?:(\d+)× )?(.+?)\?/);
  if (offer && has(text, YES_WORDS) && text.trim().split(" ").length <= 4) {
    const p = byName(offer[2]);
    if (p) return addReply([{ p, qty: Number(offer[1]) || 1 }]);
  }
  const saysNo = /^ (no|nah|no gracias|nada|asi esta bien|esta bien asi)\b/.test(text) && text.trim().split(" ").length <= 4;
  if (offer && saysNo) {
    return { reply: cartLines.length ? "Bárbaro. ¿Algo más o te armo el pedido?" : "Dale. ¿Qué más necesitás?", actions: [] };
  }
  // "¿Algo más?" → "no": se termina el pedido
  if (saysNo && /¿Algo más/.test(lastBot) && cartLines.length) {
    return { reply: `¡Buenísimo! Son ${fmt(cartTotal(cartLines))}. Revisá la canasta, elegí retiro o envío, y lo mandás por WhatsApp 🙌`, actions: [{ type: "checkout" }] };
  }
  const askedPeople = /¿Para cuántos/.test(lastBot);
  const peopleMatch = text.match(/\b(\d{1,2})\b/) || text.match(new RegExp(`\\b(${Object.keys(NUMBER_WORDS).join("|")})\\b`));
  if (askedPeople && peopleMatch && !/\b(saca|quita|borra)/.test(text)) {
    return picada(Number(peopleMatch[1]) || NUMBER_WORDS[peopleMatch[1]] || 4);
  }

  /* 4. Vaciar la canasta */
  if (/\b(vacia|vaciar|vaciame|borra todo|saca todo|sacame todo|empezar de nuevo|arranco de nuevo)\b/.test(text)) {
    if (!cartLines.length) return { reply: "La canasta ya está vacía. ¿Arrancamos?", actions: [] };
    return { reply: "Listo, vacié la canasta. ¿Arrancamos de nuevo?", actions: cartLines.map((l) => ({ type: "remove", id: l.id, cantidad: null })) };
  }

  /* 5. ¿Qué llevo? / ¿Cuánto va? */
  if (/\b(que llevo|que tengo|mi canasta|mi pedido|cuanto va|cuanto es|cuanto seria|el total|ver canasta|ver pedido|resumen)\b/.test(text)) {
    if (!cartLines.length) return { reply: "Por ahora la canasta está vacía. Decime qué necesitás y te lo sumo.", actions: [] };
    const list = joinNice(cartLines.map((l) => `${l.cantidad} ${l.item.nombre}`));
    return { reply: `Llevás ${list}. Total: ${fmt(cartTotal(cartLines))}. ¿Algo más o lo mandamos?`, actions: [{ type: "checkout" }] };
  }

  /* 6. Terminar */
  if (has(text, DONE_WORDS) && !findProducts(raw).some((r) => r.matches)) {
    if (!cartLines.length) return { reply: "Todavía no sumaste nada 😅 Decime qué necesitás, por ejemplo \"2 cocas y unas papas\".", actions: [] };
    return { reply: `¡Buenísimo! Son ${fmt(cartTotal(cartLines))}. Revisá la canasta, elegí si pasás a buscar o te lo mandamos, y lo enviás por WhatsApp 🙌`, actions: [{ type: "checkout" }] };
  }

  /* 7. Horarios */
  if (/\b(hora|horario|horarios|abren|abierto|abiertos|cierran|cierra|abre|cerrado|atienden)\b/.test(text)) {
    const now = uruguayNow();
    const dayNames = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    const pretty = (t) => (t === "24:00" ? "00:00" : t);
    const shifts = (d) => settings.horarios?.[d] || [];
    const say = (d) => (shifts(d).length ? shifts(d).map(([a, b]) => `${pretty(a)} a ${pretty(b)}`).join(" y ") : "cerrado");
    const tomorrow = (now.day + 1) % 7;
    const wantsTomorrow = /\bmanana\b/.test(text);
    const status = storeStatus(settings);
    const nowText = status === "abierto" ? "ahora estamos abiertos 🟢" : status.startsWith("cerrado hoy") ? `hoy está cerrado ${status.slice(12)}` : "ahora estamos cerrados";
    const reply = wantsTomorrow
      ? `Mañana (${dayNames[tomorrow]}) ${shifts(tomorrow).length ? `abrimos de ${say(tomorrow)}` : "no abrimos"}.`
      : `Hoy ${dayNames[now.day]} ${shifts(now.day).length ? `abrimos de ${say(now.day)}` : "no abrimos"}, y ${nowText}. Los horarios de toda la semana están abajo, en "Visitanos".`;
    return { reply, actions: [] };
  }

  /* 8. Envíos y pagos */
  if (/\b(envio|envios|envian|delivery|domicilio|mandan|llevan|pago|pagar|pagos|tarjeta|debito|credito|transferencia|efectivo|mercadopago)\b/.test(text)) {
    const pagos = settings.pagos?.length ? `Aceptamos ${joinNice(settings.pagos.map((p) => (["Efectivo", "Débito", "Transferencia"].includes(p) ? p.toLowerCase() : p)))}.` : "";
    const asksPayment = /\b(pago|pagar|pagos|tarjeta|debito|credito|transferencia|efectivo|mercadopago)\b/.test(text);
    const reply = asksPayment && pagos ? `${pagos} ${notas.replace(/\s*Aceptamos[^.]*\./, "")}`.trim() : notas;
    return { reply: reply || "Eso coordinalo por WhatsApp cuando mandes el pedido y te confirman al toque.", actions: [] };
  }

  /* 9. Dónde están */
  if (/\b(donde estan|donde queda|direccion|ubicacion|ubicados|como llego|mapa)\b/.test(text)) {
    return { reply: "Estamos en Oscar Gestido esquina Paul Harris, en Solymar 📍 Abajo en \"Visitanos\" tenés el botón para abrir el mapa.", actions: [] };
  }

  /* 10. Picada */
  if (/\bpicada|picadita\b/.test(text) && !/\b(combo|promo|pack)\b/.test(text)) {
    const n = text.match(/\b(?:para|somos|de)\s+(\d{1,2}|[a-z]+)\b/);
    const people = n && (Number(n[1]) || NUMBER_WORDS[n[1]]);
    if (people) return picada(people);
    const ids = ["Salame", "Queso dambo", "Lay's Clásicas", "Coca-Cola 2,25 L", "Cerveza Pilsen 1 L"].map(byName).filter(Boolean).map((p) => p.id);
    const comboNote = combo ? ` También está el ${combo.titulo} a ${fmt(combo.precio)}.` : "";
    return { reply: `¡Una picada! ¿Para cuántos es? Te la armo con las cantidades justas.${comboNote}`, actions: [{ type: "show", ids: combo ? ["combo", ...ids] : ids }] };
  }

  /* 11. Combo / promo */
  if (/\b(combo|promo|promos|promocion|oferta|ofertas|pack)\b/.test(text)) {
    if (!combo) return { reply: "Hoy no tenemos promo armada, pero decime qué buscás y te lo sumo.", actions: [] };
    if (has(text, ADD_WORDS) || has(text, YES_WORDS)) {
      return { reply: `¡De una! Te sumé el ${combo.titulo} (${fmt(combo.precio)}). ¿Algo más?`, actions: [{ type: "add", id: "combo", cantidad: 1 }] };
    }
    return { reply: `Hoy está el ${combo.titulo}: ${(combo.items || []).join(", ")} a ${fmt(combo.precio)}. Tocá el + si lo querés.`, actions: [{ type: "show", ids: ["combo"] }] };
  }

  /* 12. Ideas (mate, merienda, asado, cumple...) */
  const idea = IDEAS.find((i) => has(text, i.words));
  if (idea && !findProducts(raw).some((r) => r.matches)) {
    const ids = idea.names.map(byName).filter((p) => p && p.en_stock !== false).map((p) => p.id);
    return { reply: `${idea.text} Tocá el + en lo que quieras.`, actions: [{ type: "show", ids }] };
  }

  const found = findProducts(raw);
  const sure = found.filter((f) => f.matches?.length === 1);
  const unsure = found.filter((f) => f.matches?.length > 1);
  const unknown = found.filter((f) => f.unknown);

  /* 13. Sacar de la canasta */
  if (has(text, REMOVE_WORDS) && found.some((f) => f.matches)) {
    const actions = [], names = [];
    for (const f of found.filter((x) => x.matches)) {
      // Si dice "la coca" y en la canasta hay una sola coca, es esa
      const targets = f.matches.filter((p) => inCart(p.id));
      if (targets.length > 1) {
        return { reply: `¿Cuál saco: ${joinNice(targets.map((p) => p.nombre))}?`, actions: [] };
      }
      const target = targets[0];
      if (!target) continue;
      actions.push({ type: "remove", id: target.id, cantidad: f.explicitQty ? f.qty : null });
      names.push(target.nombre);
    }
    if (!actions.length) return { reply: "Eso no estaba en la canasta 🤔 ¿Querés que te diga lo que llevás?", actions: [] };
    return { reply: `Listo, saqué ${joinNice(names)}. ¿Algo más?`, actions };
  }

  /* 14. Precios */
  if (/\b(cuanto|precio|precios|sale|salen|cuesta|cuestan|vale|valen)\b/.test(text)) {
    const options = found.flatMap((f) => f.matches || []).slice(0, 6);
    if (options.length) {
      const prices = joinNice(options.map((p) => `${p.nombre} ${priceOf(p)}`));
      return { reply: `${prices}. ¿Te lo sumo?`, actions: [{ type: "show", ids: options.map((p) => p.id) }] };
    }
  }

  /* 15. "¿Tienen...?" / "mostrame las bebidas" */
  const isQuestion = /\b(tienen|tenes|hay|venden|trabajan|queda|quedan|mostrame|muestrame|que tienen|que hay|ver)\b/.test(text);
  const category = words(text).map((t) => CATEGORY_WORDS[t]).find(Boolean);
  if (category && (isQuestion || !found.some((f) => f.matches))) {
    const list = products.filter((p) => p.categoria === category).slice(0, 8);
    if (list.length) return { reply: pick(["Mirá lo que tenemos 👇", "Esto es lo que hay:"]) + " Tocá el + para sumar.", actions: [{ type: "show", ids: list.map((p) => p.id) }] };
  }
  if (isQuestion && !has(text, ADD_WORDS)) {
    const options = found.flatMap((f) => f.matches || []).slice(0, 6);
    if (options.length) {
      const what = options.length === 1 ? `Sí, tenemos ${options[0].nombre} a ${priceOf(options[0])}` : `Sí, tenemos ${options.length} opciones`;
      const stock = options.every((p) => p.en_stock === false) ? ", pero hoy no nos queda 😕" : ". ¿Te lo sumo?";
      return { reply: what + stock, actions: [{ type: "show", ids: options.map((p) => p.id) }] };
    }
    if (unknown.length) {
      return { reply: `${cap(unknown[0].unknown)} no tenemos 😕 Si querés, ponelo en la nota del pedido y el local se fija si lo consigue.`, actions: [] };
    }
  }

  /* 16. Agregar productos */
  if (sure.length || unsure.length) {
    const result = sure.length ? addReply(sure.map((f) => ({ p: f.matches[0], qty: f.qty })))
      : { reply: "", actions: [] };
    if (unsure.length) {
      const options = unsure[0].matches.slice(0, 6);
      result.actions.push({ type: "show", ids: options.map((p) => p.id) });
      result.reply = `${result.reply.replace(/ ¿(Algo más|Le sumo .+)\?$/, "")} ${sure.length ? "Y de" : "De"} eso tengo ${options.length} opciones, ¿cuál querés? Tocá el + en la que va.`.trim();
    }
    if (unknown.length) result.reply += ` (${unknown.map((u) => u.unknown).join(", ")} no lo encontré.)`;
    return result;
  }

  /* 17. No entendió: ayudar sin trabarse (mostrando solo lo que hay en stock) */
  const popular = ["Coca-Cola 2,25 L", "Coca-Cola 600 ml", "Lay's Clásicas", "Cerveza Pilsen 1 L", "Palito helado Grido", "Sobre de figuritas"]
    .map(byName).filter((p) => p && p.en_stock !== false).map((p) => p.id);

  // "Quiero pedir algo", "¿me ayudás?": invitar a decir qué necesita
  if (!unknown.length) {
    return { reply: pick(["¡Dale! Decime qué necesitás, por ejemplo \"2 cocas y unas papas\" o \"picada para 6\". Lo que más sale:", "¡De una! ¿Qué te hace falta? Te dejo lo que más sale:"]), actions: [{ type: "show", ids: popular }] };
  }
  return {
    reply: unknown.length
      ? `${cap(unknown[0].unknown)} no lo encuentro 😕 Probá con otro nombre o mirá lo que más sale:`
      : pick(["No te sigo del todo 😅 Probá con algo tipo \"2 cocas y unas papas\" o \"picada para 6\". Lo que más sale:", "Mmm, no te entendí. Decime el producto, por ejemplo \"una birra y maní\". Lo que más sale:"]),
    actions: [{ type: "show", ids: popular }],
  };
}
