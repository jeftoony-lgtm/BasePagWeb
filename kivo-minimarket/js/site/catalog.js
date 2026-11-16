// =====================================================================
//  KIVO · Cinta de avisos, combo del día y góndolas
//  Todo se arma con lo que el dueño carga en el panel.
// =====================================================================

import { $, $$, money, escapeHTML, normalize, firstEmoji } from "./utils.js";
import { store } from "./store.js";
import { data } from "../data/index.js";

let currentCategory = null;

/* ---------- Cinta de avisos ---------- */
function renderMarquee() {
  const avisos = store.settings.avisos || [];
  const marquee = $("#marquee");
  if (!avisos.length) return marquee.remove();
  // Se repite dos veces para que el movimiento no tenga cortes
  const spans = avisos.map((a) => `<span>${escapeHTML(a)}</span>`).join("");
  marquee.innerHTML = `<div>${spans}${spans}</div>`;
}

/* ---------- Combo del día ---------- */
function renderCombo() {
  const combo = store.settings.combo;
  const visible = Boolean(combo?.activo);
  $("#combo").hidden = !visible;
  $$("[data-combo-link]").forEach((link) => (link.hidden = !visible));
  if (!visible) return;

  // Título: la segunda mitad va resaltada en naranja ("Promo pack <em>Picada Mundial</em>")
  const words = escapeHTML(combo.titulo).split(" ");
  const half = Math.ceil(words.length / 2);
  $("#comboTitle").innerHTML = `${words.slice(0, half).join(" ")} <em>${words.slice(half).join(" ")}</em>`;

  const items = combo.items || [];
  const emojis = items.map(firstEmoji).filter(Boolean).slice(0, 4);
  $("#comboArt").innerHTML =
    emojis.map((e) => `<div class="item">${e}</div>`).join("") +
    `<div class="price-burst"><div><small>TODO POR</small><strong>${money(combo.precio)}</strong></div></div>`;

  $("#comboTag").textContent = combo.etiqueta || "";
  $("#comboTag").hidden = !combo.etiqueta;
  $("#comboText").textContent = combo.subtitulo || "";
  $("#comboItems").innerHTML = items.map((i) => `<li>${escapeHTML(i)}</li>`).join("");
}

/* ---------- Tarjeta de un producto ---------- */
export function productThumb(p) {
  return p.foto_url
    ? `<img src="${escapeHTML(p.foto_url)}" alt="" loading="lazy">`
    : `<span>${escapeHTML(p.emoji || "🛒")}</span>`;
}

function productCard(p, index) {
  const badge = !p.en_stock
    ? '<span class="badge out">SIN STOCK</span>'
    : p.categoria === "grido" ? '<span class="badge">NUEVO</span>' : "";
  return `
    <article class="prod ${p.en_stock ? "" : "out"}" style="animation:pop .45s ${index * 0.04}s both cubic-bezier(.2,1.4,.4,1)">
      <div class="thumb" style="background:${escapeHTML(p.color || "#f4f4f4")}">${badge}${productThumb(p)}</div>
      <h4>${escapeHTML(p.nombre)}</h4>
      <div class="meta">${escapeHTML(p.detalle)}</div>
      <div class="row">
        <span class="price">${money(p.precio)}</span>
        <button class="add" data-add="${p.id}" aria-label="Agregar ${escapeHTML(p.nombre)}" ${p.en_stock ? "" : "disabled"}>+</button>
      </div>
    </article>`;
}

/* ---------- Góndolas: pestañas, estante y buscador ---------- */
function renderTabs() {
  $("#tabs").innerHTML = store.categories
    .filter((c) => store.products.some((p) => p.categoria === c.id))
    .map((c) => `<button class="tab" role="tab" data-category="${c.id}"><span>${c.emoji}</span>${escapeHTML(c.nombre)}</button>`)
    .join("");

  $$("#tabs .tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      currentCategory = tab.dataset.category;
      $("#search").value = "";
      renderShelf();
    });
  });
}

let searchLogTimer;
function renderShelf() {
  const query = normalize($("#search").value.trim());

  $$("#tabs .tab").forEach((tab) => tab.setAttribute("aria-selected", !query && tab.dataset.category === currentCategory));

  const list = query
    ? store.products.filter((p) => normalize(`${p.nombre} ${p.detalle}`).includes(query))
    : store.products.filter((p) => p.categoria === currentCategory);

  const shelf = $("#shelf");
  shelf.scrollLeft = 0;

  if (!list.length) {
    shelf.innerHTML = '<p class="shelf-empty">No encontramos eso. Probá con otra palabra, preguntale al asistente o pedilo en la nota.</p>';
    // Le avisamos al dueño qué buscan y no hay (aparece en el panel → Resumen)
    clearTimeout(searchLogTimer);
    if (query.length >= 3) searchLogTimer = setTimeout(() => data.logSearch(query), 1500);
    return;
  }

  shelf.innerHTML = list.map(productCard).join("");
}

export function initCatalog() {
  renderMarquee();
  renderCombo();
  currentCategory = store.categories.find((c) => store.products.some((p) => p.categoria === c.id))?.id;
  renderTabs();
  renderShelf();
  $("#search").addEventListener("input", renderShelf);
}
