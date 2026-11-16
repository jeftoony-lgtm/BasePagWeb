// =====================================================================
//  KIVO · Canasta y envío del pedido
//  Guarda lo que la persona elige, arma el mensaje de WhatsApp y
//  registra el pedido para que aparezca en el panel del local.
// =====================================================================

import { $, $$, money, escapeHTML, toast, session } from "./utils.js";
import { store, findItem } from "./store.js";
import { DAY_NAMES, nowInUruguay, pickupSlots, toHHMM, dateInUruguay } from "./schedule.js";
import { data } from "../data/index.js";

const cart = new Map(session.get("kivo-cart", [])); // id → cantidad
let deliveryMode = "retiro";

/* =================== Lo que usan otros archivos =================== */

/** Agrega un producto. "fromElement" es el botón tocado (para la animación) */
export function addToCart(id, quantity = 1, fromElement = null) {
  const item = findItem(id);
  if (!item || item.en_stock === false) return false;
  cart.set(id, (cart.get(id) || 0) + quantity);
  if (fromElement) flyToCart(fromElement, item.emoji);
  render();
  return true;
}

/** Saca un producto (todo, o solo algunas unidades) */
export function removeFromCart(id, quantity = null) {
  if (!cart.has(id)) return false;
  const left = quantity ? cart.get(id) - quantity : 0;
  if (left > 0) cart.set(id, left);
  else cart.delete(id);
  render();
  return true;
}

/** Resumen para el asistente: [{ id, nombre, cantidad }] */
export function cartSummary() {
  return [...cart].map(([id, cantidad]) => ({ id, nombre: findItem(id)?.nombre, cantidad }));
}

export function openCart() {
  $("#drawer").classList.add("open");
  $("#scrim").classList.add("open");
}

export function closeCart() {
  $("#drawer").classList.remove("open");
  $("#scrim").classList.remove("open");
}

/* =================== Animación: el producto vuela a la canasta =================== */

function flyToCart(fromElement, emoji) {
  const fab = $("#cartFab");
  fab.classList.add("show");

  const from = fromElement.getBoundingClientRect();
  const to = fab.getBoundingClientRect();
  const flyer = document.createElement("div");
  flyer.className = "flyer";
  flyer.textContent = emoji;
  document.body.appendChild(flyer);

  const x0 = from.left + from.width / 2 - 20, y0 = from.top + from.height / 2 - 24;
  const x1 = to.left + 24, y1 = to.top + 4;
  flyer.animate([
    { transform: `translate(${x0}px, ${y0}px) scale(1)` },
    { transform: `translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - 160}px) scale(1.4) rotate(-20deg)`, offset: 0.45 },
    { transform: `translate(${x1}px, ${y1}px) scale(.4) rotate(20deg)`, opacity: 0.6 },
  ], { duration: 750, easing: "cubic-bezier(.4,0,.2,1)" }).onfinish = () => {
    flyer.remove();
    fab.classList.remove("bump");
    void fab.offsetWidth; // reinicia la animación
    fab.classList.add("bump");
  };

  // El botón "+" muestra un ✓ un ratito
  if (fromElement.classList.contains("add")) {
    fromElement.classList.add("done");
    fromElement.textContent = "✓";
    setTimeout(() => { fromElement.classList.remove("done"); fromElement.textContent = "+"; }, 900);
  }
}

/* =================== Totales y dibujo de la canasta =================== */

function totals() {
  let total = 0, count = 0, pending = false;
  for (const [id, qty] of cart) {
    const item = findItem(id);
    if (!item) continue;
    count += qty;
    if (item.precio == null) pending = true;
    else total += item.precio * qty;
  }
  return { total, count, pending };
}

function render() {
  // Si algo dejó de existir (ej: el dueño lo borró), lo sacamos
  for (const id of cart.keys()) if (!findItem(id)) cart.delete(id);
  session.set("kivo-cart", [...cart]);

  const { total, count, pending } = totals();
  $("#cartFab").classList.toggle("show", count > 0);
  $("#fabCount").textContent = count;
  $("#fabTotal").textContent = money(total);
  $("#cartTotal").textContent = money(total) + (pending ? " + a confirmar" : "");
  $("#checkout").hidden = count === 0;

  const lines = $("#cartLines");
  if (!count) {
    lines.innerHTML = '<div class="cart-empty"><div>🛒</div>Tu canasta está vacía.<br>Pasá por las góndolas o pedile ayuda al asistente.</div>';
  } else {
    lines.innerHTML = [...cart].map(([id, qty]) => {
      const item = findItem(id);
      const price = item.precio == null ? "Precio a confirmar" : `${money(item.precio)} c/u`;
      return `
        <div class="line">
          <div class="emoji">${escapeHTML(item.emoji)}</div>
          <div><h5>${escapeHTML(item.nombre)}</h5><small>${price}</small></div>
          <div class="qty">
            <button data-minus="${id}" aria-label="Quitar uno">−</button>
            <span>${qty}</span>
            <button data-plus="${id}" aria-label="Agregar uno">+</button>
          </div>
        </div>`;
    }).join("");
  }
  updateWhatsappLink();
}

/* =================== Día y hora de retiro =================== */

function fillDays() {
  const today = nowInUruguay().day;
  const select = $("#cDay");
  select.innerHTML = "";
  for (let offset = 0; offset < 4; offset++) {
    if (!pickupSlots(offset).length) continue;
    const label = offset === 0 ? "Hoy" : offset === 1 ? "Mañana" : DAY_NAMES[(today + offset) % 7];
    select.add(new Option(label, offset));
  }
  fillTimes();
}

function fillTimes() {
  const select = $("#cTime");
  select.innerHTML = "";
  pickupSlots(Number($("#cDay").value || 0)).forEach((m) => select.add(new Option(toHHMM(m), toHHMM(m))));
  updateWhatsappLink();
}

/* =================== Pedido por WhatsApp =================== */

function orderData() {
  const items = [...cart].map(([id, cantidad]) => {
    const item = findItem(id);
    return { id, nombre: item.nombre, cantidad, precio: item.precio };
  });
  return {
    nombre: $("#cName").value.trim(),
    telefono: $("#cPhone").value.replace(/\D/g, "") || null,
    modo: deliveryMode,
    direccion: deliveryMode === "envio" ? $("#cAddress").value.trim() : null,
    dia: dateInUruguay(Number($("#cDay").value || 0)),
    hora: $("#cTime").value,
    nota: $("#cNote").value.trim(),
    items,
    total: totals().total,
  };
}

function whatsappMessage(order) {
  const { pending } = totals();
  const lines = order.items.map((i) =>
    `• ${i.cantidad} x ${i.nombre}${i.precio == null ? " (a confirmar)" : " — " + money(i.precio * i.cantidad)}`);
  const day = $("#cDay").selectedOptions[0]?.textContent || "";

  let text = `¡Hola Kivo! 👋 Quiero hacer un pedido:\n\n${lines.join("\n")}\n\n`;
  text += `*Total: ${money(order.total)}${pending ? " + encargos a confirmar" : ""}*\n\n`;
  text += order.modo === "retiro"
    ? `🏪 Paso a retirar: ${day} ${order.hora}\n`
    : `🛵 Envío a: ${order.direccion} — ${day} ${order.hora}\n`;
  text += `👤 A nombre de: ${order.nombre}\n`;
  if (order.nota) text += `📝 ${order.nota}\n`;
  return text;
}

function missingInfo() {
  if (!cart.size) return "Agregá productos para armar tu pedido.";
  if (!$("#cTime").value) return "Hoy ya no quedan horarios. Elegí otro día.";
  if (!$("#cName").value.trim()) return "Poné tu nombre para enviar el pedido.";
  if (deliveryMode === "envio" && !$("#cAddress").value.trim()) return "Falta la dirección de envío.";
  return null;
}

function updateWhatsappLink() {
  const link = $("#sendWhatsapp");
  const problem = missingInfo();
  link.setAttribute("aria-disabled", problem ? "true" : "false");
  link.href = problem ? "#" : `https://wa.me/${store.settings.whatsapp}?text=${encodeURIComponent(whatsappMessage(orderData()))}`;
  $("#cartHint").textContent = problem || "Se abre WhatsApp con tu pedido ya escrito.";
}

function onSendOrder() {
  if (missingInfo()) return;
  // Se guarda para el panel del local (sin frenar la apertura de WhatsApp)
  data.createOrder(orderData()).catch((error) => console.warn("No se pudo registrar el pedido:", error));
  cart.clear();
  setTimeout(() => { render(); closeCart(); toast("¡Pedido enviado! Te esperamos 🙌"); }, 400);
}

/* =================== Arranque =================== */

export function initCart() {
  // Cualquier botón con data-add="id" agrega a la canasta (góndolas, combo, encargos, chat)
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-add]");
    if (!button) return;
    event.preventDefault();
    const item = findItem(button.dataset.add);
    if (addToCart(button.dataset.add, 1, button)) {
      toast(`${item.emoji} ${item.nombre} a la canasta`);
      if (button.dataset.add.startsWith("enc-")) setTimeout(openCart, 500);
    }
  });

  // + y − dentro de la canasta
  $("#cartLines").addEventListener("click", (event) => {
    const plus = event.target.closest("[data-plus]");
    const minus = event.target.closest("[data-minus]");
    if (plus) addToCart(plus.dataset.plus);
    if (minus) removeFromCart(minus.dataset.minus, 1);
  });

  $("#cartFab").addEventListener("click", openCart);
  $("#scrim").addEventListener("click", closeCart);
  $("#closeCart").addEventListener("click", closeCart);
  addEventListener("keydown", (e) => e.key === "Escape" && closeCart());

  $$(".segmented button").forEach((button) => {
    button.addEventListener("click", () => {
      deliveryMode = button.dataset.mode;
      $$(".segmented button").forEach((b) => b.setAttribute("aria-pressed", b === button));
      $("#addressField").hidden = deliveryMode !== "envio";
      updateWhatsappLink();
    });
  });

  $("#cDay").addEventListener("change", fillTimes);
  ["#cTime", "#cName", "#cPhone", "#cAddress", "#cNote"].forEach((s) => $(s).addEventListener("input", updateWhatsappLink));
  $("#sendWhatsapp").addEventListener("click", onSendOrder);

  fillDays();
  render();
}
