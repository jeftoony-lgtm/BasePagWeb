// =====================================================================
//  KIVO · Instrucciones del asistente: personalidad + datos del local
// =====================================================================

const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export function uruguayNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Montevideo", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { day, time: `${get("hour")}:${get("minute")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

export function storeStatus(settings) {
  const now = uruguayNow();
  if (settings.cerrado?.activo) return `cerrado hoy (${settings.cerrado.motivo || "sin motivo"})`;
  const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const open = (settings.horarios?.[now.day] || []).some(([a, b]) => now.minutes >= toMin(a) && now.minutes < toMin(b));
  return open ? "abierto" : "cerrado en este momento";
}

function hoursText(settings) {
  return [1, 2, 3, 4, 5, 6, 0].map((d) => {
    const shifts = settings.horarios?.[d] || [];
    return `${DAY_NAMES[d]}: ${shifts.length ? shifts.map(([a, b]) => `${a} a ${b === "24:00" ? "00:00" : b}`).join(" y ") : "cerrado"}`;
  }).join("; ");
}

/**
 * Catálogo con referencias cortas (P1, P2...) para que la IA no se
 * equivoque copiando ids largos.
 */
export function buildCatalog(products, settings) {
  const items = products.map((p, i) => ({ ref: `P${i + 1}`, id: String(p.id), nombre: p.nombre, precio: p.precio, en_stock: p.en_stock }));
  const combo = settings.combo;
  if (combo?.activo) items.push({ ref: "COMBO", id: "combo", nombre: combo.titulo, precio: Number(combo.precio) || 0, en_stock: true });
  return items;
}

/**
 * Devuelve las instrucciones en partes:
 *  - personality: fija, igual para todos
 *  - storeInfo: cambia poco (catálogo, horarios): se guarda en caché para que salga más barato
 */
export function systemPrompt(settings, catalog, products, categories) {
  const name = settings.asistente?.nombre || "Kivi";
  const now = uruguayNow();
  const categoryName = (id) => categories.find((c) => c.id === id)?.nombre || id;
  const combo = settings.combo?.activo
    ? `${settings.combo.titulo}: ${(settings.combo.items || []).join(", ")} a $${settings.combo.precio} (ref COMBO)`
    : "no hay combo hoy";

  const catalogLines = catalog.map((item) => {
    const p = products.find((x) => String(x.id) === item.id);
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
- Para picadas, calculá más o menos 1 salame, 1 queso, 1 bolsa de papas y 1 refresco grande cada 3 personas, y ofrecé cerveza (1 litro cada 2). Si no te dicen para cuántos, preguntalo.
- Si preguntan "¿qué llevo?" o "¿cuánto va?", contá lo que hay en CANASTA ACTUAL con el total.
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
- Horarios: ${hoursText(settings)}.
- Combo del día: ${combo}.
- Medios de pago: ${(settings.pagos || []).join(", ") || "consultar"}.
- Lo que cuenta el dueño: ${settings.asistente?.notas || "nada especial"}.

CATÁLOGO (ref | producto | detalle | categoría | precio)
${catalogLines}`;

  // Lo que cambia minuto a minuto va al final, fuera de la caché
  const rightNow = `AHORA: ${DAY_NAMES[now.day]} ${now.time} en Uruguay. El local está ${storeStatus(settings)}.`;

  return { personality, storeInfo, rightNow };
}
