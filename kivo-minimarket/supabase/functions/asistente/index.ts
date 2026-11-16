// =====================================================================
//  KIVO · Asistente de compras (Supabase Edge Function)
//
//  Corre en el servidor de Supabase, NO en el navegador: así la clave de la
//  IA queda escondida. La página le manda la charla y la canasta; esta función:
//    1. lee el catálogo, horarios y notas del dueño desde la base de datos,
//    2. le pregunta a Claude (modelo Haiku, el más económico),
//    3. devuelve la respuesta + acciones para la canasta.
//
//  Necesita el secreto ANTHROPIC_API_KEY (ver README → "Asistente con IA").
// =====================================================================

const MODEL = "claude-haiku-5-5";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

// Límites para que nadie dispare el gasto (se pueden ajustar)
const LIMITS = {
  messagesPerPersonPerDay: 60,
  messagesPerDayTotal: 2000,
  historyLength: 16,   // mensajes de la charla que se le mandan a la IA
  messageLength: 500,  // caracteres por mensaje
  toolRounds: 4,       // vueltas máximas de "agregar / mostrar" por respuesta
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

// ---------------------------------------------------------------------
//  Base de datos (con la clave de servicio, que solo existe en el servidor)
// ---------------------------------------------------------------------
async function db(path: string, init: RequestInit = {}) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key!, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!response.ok) throw new Error(`Base de datos: ${response.status} ${await response.text()}`);
  return response.json();
}

async function loadStore() {
  const [products, categories, settingsRows] = await Promise.all([
    db("products?select=id,nombre,detalle,precio,categoria,en_stock&activo=eq.true&order=categoria,orden,nombre"),
    db("categories?select=id,nombre"),
    db("settings?select=key,value"),
  ]);
  const settings = Object.fromEntries(settingsRows.map((r: { key: string; value: unknown }) => [r.key, r.value]));
  return { products, categories, settings };
}

/** Suma 1 al contador del día y devuelve cuántos mensajes van */
async function countUsage(key: string): Promise<number> {
  return await db("rpc/contar_uso_asistente", { method: "POST", body: JSON.stringify({ p_clave: key }) });
}

async function hash(text: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------------
//  Catálogo con referencias cortas (P1, P2...) para que la IA no se
//  equivoque copiando ids largos
// ---------------------------------------------------------------------
type Product = { id: string; nombre: string; detalle: string; precio: number; categoria: string; en_stock: boolean };
type CatalogItem = { ref: string; id: string; nombre: string; precio: number; en_stock: boolean };

function buildCatalog(products: Product[], settings: Record<string, any>) {
  const items: CatalogItem[] = products.map((p, i) => ({ ref: `P${i + 1}`, id: p.id, nombre: p.nombre, precio: p.precio, en_stock: p.en_stock }));
  const combo = settings.combo;
  if (combo?.activo) items.push({ ref: "COMBO", id: "combo", nombre: combo.titulo, precio: Number(combo.precio) || 0, en_stock: true });
  return items;
}

// ---------------------------------------------------------------------
//  Instrucciones para la IA: personalidad + datos del local
// ---------------------------------------------------------------------
function uruguayNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Montevideo", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { day, time: `${get("hour")}:${get("minute")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

function storeStatus(settings: Record<string, any>) {
  const now = uruguayNow();
  if (settings.cerrado?.activo) return `cerrado hoy (${settings.cerrado.motivo || "sin motivo"})`;
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const open = (settings.horarios?.[now.day] || []).some(([a, b]: string[]) => now.minutes >= toMin(a) && now.minutes < toMin(b));
  return open ? "abierto" : "cerrado en este momento";
}

function hoursText(settings: Record<string, any>) {
  return [1, 2, 3, 4, 5, 6, 0].map((d) => {
    const shifts = settings.horarios?.[d] || [];
    return `${DAY_NAMES[d]}: ${shifts.length ? shifts.map(([a, b]: string[]) => `${a} a ${b === "24:00" ? "00:00" : b}`).join(" y ") : "cerrado"}`;
  }).join("; ");
}

function systemPrompt(settings: Record<string, any>, catalog: CatalogItem[], products: Product[], categories: { id: string; nombre: string }[]) {
  const name = settings.asistente?.nombre || "Kivi";
  const now = uruguayNow();
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.nombre || id;
  const combo = settings.combo?.activo
    ? `${settings.combo.titulo}: ${(settings.combo.items || []).join(", ")} a $${settings.combo.precio} (ref COMBO)`
    : "no hay combo hoy";

  const catalogLines = catalog.map((item) => {
    const p = products.find((x) => x.id === item.id);
    const extra = p ? `${p.detalle} | ${categoryName(p.categoria)}` : "combo";
    return `${item.ref} | ${item.nombre} | ${extra} | $${item.precio}${item.en_stock ? "" : " | SIN STOCK"}`;
  }).join("\n");

  const personality = `Sos ${name} y atendés el chat de Kivo Mini Market, el minimarket de barrio de Solymar (Canelones, Uruguay), en Oscar Gestido esquina Paul Harris.

CÓMO HABLÁS
- Como alguien que trabaja en el local: uruguayo, cálido y rápido. Voseo ("tenés", "querés", "fijate"), y expresiones naturales como "dale", "de una", "bárbaro", sin exagerar.
- Mensajes cortos: una a tres frases. Sin listas largas, sin títulos, sin negritas. Como mucho un emoji por mensaje.
- Nada de frases de manual ("¡Claro! Estoy aquí para ayudarte", "¿En qué más puedo asistirte?"). Hablá como en WhatsApp.
- No te presentes como IA ni como bot. Si te preguntan directamente si sos una persona, decí con naturalidad que sos el asistente automático de Kivo y que el pedido lo confirma una persona del local por WhatsApp.

QUÉ HACÉS
- Ayudás a armar la compra. Entendés pedidos sueltos ("algo para una picada de 6", "lo del mate", "para el desayuno"), proponés cantidades razonables y cosas que combinan, y las sumás a la canasta con agregar_a_canasta.
- Si el pedido es claro, sumalo directo sin pedir permiso. Si es ambiguo (por ejemplo "coca" y hay de 2,25 L y 600 ml), preguntá o mostrá las opciones con mostrar_productos.
- Cuando conviene, ofrecé el combo del día o algo que combine, una sola vez y sin insistir.
- Cuando sumes o saques algo, contalo en una frase.
- Cuando la persona termina ("listo", "eso es todo", "nada más") usá terminar_pedido: en la canasta elige retiro o envío, día y hora, y lo manda por WhatsApp.

REGLAS
- Solo existe lo que está en el CATÁLOGO, con esos precios. Nunca inventes productos, marcas, precios, descuentos ni promos.
- Si algo no está, decilo y ofrecé lo más parecido, o que lo anote en la nota del pedido para que el local se fije.
- Lo que dice SIN STOCK no se puede agregar.
- No cobrás, no confirmás horarios de entrega ni prometés envíos más allá de lo que dicen las notas del local.
- Si te preguntan algo que no tiene que ver con el local, respondé cortito y volvé a la compra.`;

  const storeInfo = `DATOS DEL LOCAL
- Ahora: ${DAY_NAMES[now.day]} ${now.time} en Uruguay. El local está ${storeStatus(settings)}.
- Horarios: ${hoursText(settings)}.
- Combo del día: ${combo}.
- Lo que cuenta el dueño: ${settings.asistente?.notas || "nada especial"}.

CATÁLOGO (ref | producto | detalle | categoría | precio)
${catalogLines}`;

  return { personality, storeInfo };
}

// ---------------------------------------------------------------------
//  Herramientas que la IA puede usar sobre la canasta
// ---------------------------------------------------------------------
const TOOLS = [
  {
    name: "agregar_a_canasta",
    description: "Suma productos del catálogo a la canasta de la persona. Usalo cuando quiere algo concreto.",
    input_schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              ref: { type: "string", description: "Referencia del catálogo, ej. P3 o COMBO" },
              cantidad: { type: "integer", minimum: 1, maximum: 50 },
            },
            required: ["ref", "cantidad"],
          },
        },
      },
      required: ["items"],
    },
  },
  {
    name: "quitar_de_canasta",
    description: "Saca productos de la canasta. Sin cantidad, saca todas las unidades de ese producto.",
    input_schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: { ref: { type: "string" }, cantidad: { type: "integer", minimum: 1 } },
            required: ["ref"],
          },
        },
      },
      required: ["items"],
    },
  },
  {
    name: "mostrar_productos",
    description: "Muestra tarjetas de productos en el chat para que la persona elija tocando +. Usalo para dar opciones.",
    input_schema: {
      type: "object",
      properties: { refs: { type: "array", items: { type: "string" }, maxItems: 8 } },
      required: ["refs"],
    },
  },
  {
    name: "terminar_pedido",
    description: "Muestra el botón para revisar la canasta y enviar el pedido por WhatsApp. Usalo cuando la persona terminó.",
    input_schema: { type: "object", properties: {} },
  },
];

type Action = { type: string; id?: string; ids?: string[]; cantidad?: number | null };

/** Ejecuta una herramienta: actualiza la canasta "de mentira" y devuelve el resultado para la IA */
function runTool(name: string, input: any, catalog: CatalogItem[], cart: Map<string, number>, actions: Action[]) {
  const byRef = (ref: string) => catalog.find((c) => c.ref === String(ref).toUpperCase());
  const cartText = () => {
    const lines = [...cart].map(([id, q]) => { const c = catalog.find((x) => x.id === id); return c ? `${q}× ${c.nombre}` : null; }).filter(Boolean);
    const total = [...cart].reduce((sum, [id, q]) => sum + (catalog.find((x) => x.id === id)?.precio || 0) * q, 0);
    return lines.length ? `Canasta: ${lines.join(", ")}. Total $${total}.` : "La canasta quedó vacía.";
  };

  if (name === "agregar_a_canasta") {
    const notes: string[] = [];
    for (const { ref, cantidad } of input.items || []) {
      const item = byRef(ref);
      const qty = Math.min(50, Math.max(1, Number(cantidad) || 1));
      if (!item) { notes.push(`${ref} no existe en el catálogo`); continue; }
      if (!item.en_stock) { notes.push(`${item.nombre} está SIN STOCK, no se agregó`); continue; }
      cart.set(item.id, (cart.get(item.id) || 0) + qty);
      actions.push({ type: "add", id: item.id, cantidad: qty });
      notes.push(`agregado ${qty}× ${item.nombre}`);
    }
    return `${notes.join("; ")}. ${cartText()}`;
  }

  if (name === "quitar_de_canasta") {
    const notes: string[] = [];
    for (const { ref, cantidad } of input.items || []) {
      const item = byRef(ref);
      if (!item || !cart.has(item.id)) { notes.push(`${ref} no estaba en la canasta`); continue; }
      const left = cantidad ? cart.get(item.id)! - cantidad : 0;
      if (left > 0) cart.set(item.id, left); else cart.delete(item.id);
      actions.push({ type: "remove", id: item.id, cantidad: cantidad || null });
      notes.push(`sacado ${item.nombre}`);
    }
    return `${notes.join("; ")}. ${cartText()}`;
  }

  if (name === "mostrar_productos") {
    const ids = (input.refs || []).map(byRef).filter(Boolean).map((c: CatalogItem) => c.id);
    if (ids.length) actions.push({ type: "show", ids });
    return ids.length ? `Se mostraron ${ids.length} productos en el chat.` : "Ninguna ref era válida.";
  }

  if (name === "terminar_pedido") {
    if (!cart.size) return "La canasta está vacía: primero hay que sumar algo.";
    actions.push({ type: "checkout" });
    return `Se mostró el botón para enviar el pedido. ${cartText()}`;
  }

  return "Herramienta desconocida.";
}

// ---------------------------------------------------------------------
//  Charla con Claude
// ---------------------------------------------------------------------
async function askClaude(system: object[], messages: object[]) {
  const response = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 2000, system, tools: TOOLS, messages }),
  });
  if (!response.ok) throw new Error(`IA: ${response.status} ${await response.text()}`);
  return response.json();
}

/** Limpia la charla que manda el navegador: solo texto, alternando, empezando por la persona */
function cleanHistory(raw: unknown): { role: string; content: string }[] {
  if (!Array.isArray(raw)) return [];
  const result: { role: string; content: string }[] = [];
  for (const m of raw.slice(-LIMITS.historyLength)) {
    if (!m || !["user", "assistant"].includes(m.role) || typeof m.content !== "string") continue;
    const content = m.content.trim().slice(0, LIMITS.messageLength);
    if (!content) continue;
    const last = result[result.length - 1];
    if (last?.role === m.role) last.content += "\n" + content;
    else result.push({ role: m.role, content });
  }
  while (result.length && result[0].role !== "user") result.shift();
  return result;
}

function reply(body: object, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}

export async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (request.method !== "POST") return reply({ error: "Usá POST" }, 405);

  try {
    const body = await request.json().catch(() => ({}));
    const history = cleanHistory(body.messages);
    if (!history.length || history[history.length - 1].role !== "user") {
      return reply({ reply: "¿Qué andás necesitando?", actions: [] });
    }
    if (!Deno.env.get("ANTHROPIC_API_KEY")) {
      return reply({ reply: "El chat todavía no está configurado. Armá tu pedido desde las góndolas 🙏", actions: [] });
    }

    // Límites de uso por persona (IP anonimizada) y por día
    const ip = (request.headers.get("x-forwarded-for") || "anon").split(",")[0].trim();
    const [personCount, totalCount] = await Promise.all([countUsage("ip:" + (await hash(ip))), countUsage("total")]);
    if (personCount > LIMITS.messagesPerPersonPerDay || totalCount > LIMITS.messagesPerDayTotal) {
      return reply({ reply: "Por hoy ya charlamos un montón 😅 Armá el pedido desde las góndolas o escribinos por WhatsApp.", actions: [] });
    }

    const { products, categories, settings } = await loadStore();
    if (settings.asistente?.activo === false) {
      return reply({ reply: "El chat está apagado por ahora. Podés armar el pedido desde las góndolas.", actions: [] });
    }

    const catalog = buildCatalog(products, settings);

    // La canasta actual que manda la página (se valida contra el catálogo)
    const cart = new Map<string, number>();
    for (const line of Array.isArray(body.cart) ? body.cart : []) {
      if (catalog.some((c) => c.id === line?.id)) cart.set(line.id, Math.max(1, Number(line.cantidad) || 1));
    }
    const cartLine = cart.size
      ? [...cart].map(([id, q]) => `${q}× ${catalog.find((c) => c.id === id)!.nombre}`).join(", ")
      : "vacía";

    const { personality, storeInfo } = systemPrompt(settings, catalog, products, categories);
    const system = [
      { type: "text", text: personality },
      { type: "text", text: storeInfo, cache_control: { type: "ephemeral" } }, // se reutiliza entre mensajes: más barato
      { type: "text", text: `CANASTA ACTUAL: ${cartLine}` },
    ];

    const messages: object[] = history.map((m) => ({ role: m.role, content: m.content }));
    const actions: Action[] = [];
    const texts: string[] = [];

    for (let round = 0; round <= LIMITS.toolRounds; round++) {
      const answer = await askClaude(system, messages);
      for (const block of answer.content) if (block.type === "text" && block.text.trim()) texts.push(block.text.trim());
      if (answer.stop_reason !== "tool_use") break;

      // La IA pidió usar herramientas: las ejecutamos y le contamos el resultado
      messages.push({ role: "assistant", content: answer.content });
      const results = answer.content
        .filter((block: any) => block.type === "tool_use")
        .map((block: any) => ({ type: "tool_result", tool_use_id: block.id, content: runTool(block.name, block.input, catalog, cart, actions) }));
      messages.push({ role: "user", content: results });
    }

    return reply({ reply: texts.join("\n\n") || "¡Listo!", actions });
  } catch (error) {
    console.error(error);
    return reply({ reply: "Uy, se me trabó algo 😅 Probá de nuevo en un ratito.", actions: [] }, 200);
  }
}

Deno.serve(handler);
