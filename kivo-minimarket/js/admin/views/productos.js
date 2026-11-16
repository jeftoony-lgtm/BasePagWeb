// =====================================================================
//  KIVO PANEL · Productos
//  Dueño: precios, fotos, productos nuevos, ocultar o borrar.
//  Empleado: solo marca "sin stock" / "hay stock".
// =====================================================================

import { $, $$, escapeHTML, money, toast, showError, switchHTML, openModal, closeModal, confirmDialog } from "../ui.js";
import { state, isOwner } from "../state.js";
import { data } from "../../data/index.js";

const BACKGROUNDS = ["#ffe1df", "#fff7c9", "#e3f1da", "#e1f0ff", "#fff3d6", "#f6e8d6", "#efe0d6", "#ffe8ef", "#f4f4f4"];

let category = "todas";
let search = "";

const normalize = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const thumb = (p) => `
  <div class="thumb" style="background:${escapeHTML(p.color || "#f4f4f4")}">
    ${p.foto_url ? `<img src="${escapeHTML(p.foto_url)}" alt="">` : escapeHTML(p.emoji || "🛒")}
  </div>`;

export function renderProductos() {
  $("#view").innerHTML = `
    <div class="view-head">
      <div><h2>Productos</h2>
        <p>${isOwner() ? "Cambiá precios, fotos y stock. Se actualiza en la página al instante." : "Marcá lo que se terminó para que no lo pidan."}</p></div>
      ${isOwner() ? '<button class="btn btn-orange" id="newProduct">＋ Nuevo producto</button>' : ""}
    </div>
    <input class="input" id="productSearch" placeholder="🔎 Buscar producto…" value="${escapeHTML(search)}" style="margin-bottom:12px">
    <div class="chips" id="categoryChips"></div>
    <div class="plist" id="productList"></div>`;

  $("#productSearch").addEventListener("input", (e) => { search = e.target.value; drawList(); });
  $("#newProduct")?.addEventListener("click", () => editProduct(null));
  drawList();
}

function drawList() {
  const chips = [{ id: "todas", nombre: "Todas", emoji: "" }, ...state.categories, { id: "sinstock", nombre: "Sin stock", emoji: "⛔" }];
  $("#categoryChips").innerHTML = chips.map((c) => {
    const count = c.id === "sinstock" ? ` <span class="n">${state.products.filter((p) => !p.en_stock).length}</span>` : "";
    return `<button class="chip ${category === c.id ? "on" : ""}" data-category="${c.id}">${c.emoji} ${escapeHTML(c.nombre)}${count}</button>`;
  }).join("");
  $$("#categoryChips .chip").forEach((chip) => chip.addEventListener("click", () => { category = chip.dataset.category; drawList(); }));

  const query = normalize(search.trim());
  const list = state.products.filter((p) => {
    const inCategory = category === "todas" || (category === "sinstock" ? !p.en_stock : p.categoria === category);
    return inCategory && (!query || normalize(`${p.nombre} ${p.detalle}`).includes(query));
  });

  if (!list.length) {
    $("#productList").innerHTML = '<div class="empty"><div>🔎</div>No hay productos acá.</div>';
    return;
  }

  $("#productList").innerHTML = list.map((p) => `
    <div class="prow ${p.en_stock ? "" : "out"}">
      ${thumb(p)}
      <div>
        <h4>${escapeHTML(p.nombre)}${p.activo ? "" : '<span class="hiddenTag">OCULTO</span>'}</h4>
        <div class="sub">${escapeHTML(p.detalle)}</div>
        <div class="price">${money(p.precio)}</div>
      </div>
      <div class="stock">
        ${switchHTML("", `data-stock="${p.id}" ${p.en_stock ? "checked" : ""} aria-label="Hay stock de ${escapeHTML(p.nombre)}"`)}
        <small class="${p.en_stock ? "si" : "no"}">${p.en_stock ? "Hay stock" : "Sin stock"}</small>
      </div>
      ${isOwner() ? `<button class="ico" data-edit="${p.id}" aria-label="Editar ${escapeHTML(p.nombre)}">✏️</button>` : ""}
    </div>`).join("");

  $$("[data-stock]").forEach((input) => input.addEventListener("change", () => toggleStock(input)));
  $$("[data-edit]").forEach((button) => button.addEventListener("click", () => editProduct(state.products.find((p) => p.id === button.dataset.edit))));
}

async function toggleStock(input) {
  const product = state.products.find((p) => p.id === input.dataset.stock);
  try {
    await data.setStock(product.id, input.checked);
    product.en_stock = input.checked;
    drawList();
    toast(input.checked ? `✅ ${product.nombre}: hay stock` : `⛔ ${product.nombre}: sin stock`);
  } catch (error) {
    input.checked = !input.checked;
    showError(error);
  }
}

/* =================== Crear / editar producto =================== */

function editProduct(original) {
  const isNew = !original;
  const p = isNew
    ? { categoria: state.categories.find((c) => c.id === category)?.id || state.categories[0]?.id, nombre: "", detalle: "", precio: "", emoji: "🛒", color: "#f4f4f4", activo: true, en_stock: true, foto_url: null }
    : { ...original };

  openModal(`
    <div class="sheet-head"><h3>${isNew ? "Nuevo producto" : "Editar producto"}</h3><button class="close-btn" data-close aria-label="Cerrar">✕</button></div>
    <form class="stack" id="productForm" novalidate>
      <div class="photo">
        <div id="previewThumb">${thumb(p)}</div>
        <div class="stack" style="gap:8px">
          <label class="btn btn-ghost btn-sm" style="cursor:pointer">📷 ${p.foto_url ? "Cambiar foto" : "Subir foto"}<input type="file" accept="image/*" id="photoInput" hidden></label>
          ${p.foto_url ? '<button type="button" class="btn btn-red btn-sm" id="removePhoto">Quitar foto</button>' : '<span class="small muted">Sin foto se muestra el emoji.</span>'}
        </div>
      </div>
      <div class="field"><label for="fName">Nombre</label><input id="fName" value="${escapeHTML(p.nombre)}" placeholder="Ej: Coca-Cola 2,25 L"></div>
      <div class="grid2">
        <div class="field"><label for="fPrice">Precio ($)</label><input id="fPrice" type="number" inputmode="numeric" min="0" step="1" value="${escapeHTML(p.precio)}"></div>
        <div class="field"><label for="fCategory">Categoría</label>
          <select id="fCategory">${state.categories.map((c) => `<option value="${c.id}" ${c.id === p.categoria ? "selected" : ""}>${c.emoji} ${escapeHTML(c.nombre)}</option>`).join("")}</select></div>
      </div>
      <div class="grid2">
        <div class="field"><label for="fDetail">Detalle</label><input id="fDetail" value="${escapeHTML(p.detalle)}" placeholder="Ej: Retornable, 1 kg…"></div>
        <div class="field"><label for="fEmoji">Emoji (si no hay foto)</label><input id="fEmoji" value="${escapeHTML(p.emoji)}" maxlength="4"></div>
      </div>
      <div class="field"><span class="label">Color de fondo</span>
        <div class="swatches">${BACKGROUNDS.map((c) => `<button type="button" data-color="${c}" class="${c === p.color ? "on" : ""}" style="background:${c}" aria-label="Color ${c}"></button>`).join("")}</div></div>
      ${switchHTML("Se muestra en la página", `id="fVisible" ${p.activo ? "checked" : ""}`)}
      <div class="error-text" id="formError"></div>
      <div class="row" style="justify-content:space-between">
        ${isNew ? "<span></span>" : '<button type="button" class="btn btn-red btn-sm" id="deleteProduct">Eliminar</button>'}
        <button class="btn btn-green" id="saveProduct">${isNew ? "Agregar producto" : "Guardar cambios"}</button>
      </div>
    </form>`);

  const refreshThumb = () => {
    p.emoji = $("#fEmoji").value || "🛒";
    $("#previewThumb").innerHTML = thumb(p);
  };

  $("#fEmoji").addEventListener("input", refreshThumb);

  $$("[data-color]").forEach((swatch) => swatch.addEventListener("click", () => {
    p.color = swatch.dataset.color;
    $$("[data-color]").forEach((s) => s.classList.toggle("on", s === swatch));
    refreshThumb();
  }));

  $("#photoInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 6e6) return toast("La foto es muy pesada (máximo 6 MB).", true);
    $("#previewThumb").innerHTML = '<div class="thumb" style="background:#eee;font-size:14px">Subiendo…</div>';
    try {
      p.foto_url = await data.uploadPhoto(file);
      toast("Foto lista. Tocá Guardar.");
    } catch (error) {
      showError(error);
    }
    refreshThumb();
  });

  $("#removePhoto")?.addEventListener("click", (e) => { p.foto_url = null; refreshThumb(); e.target.remove(); });

  $("#deleteProduct")?.addEventListener("click", async () => {
    const ok = await confirmDialog(`¿Eliminar “${p.nombre}”?`,
      "Si solo no hay por ahora, mejor marcalo sin stock o apagá “Se muestra en la página”.", "Eliminar");
    if (!ok) return editProduct(original);
    try {
      await data.deleteProduct(p.id);
      state.products = state.products.filter((x) => x.id !== p.id);
      closeModal();
      drawList();
      toast("Producto eliminado");
    } catch (error) {
      showError(error);
    }
  });

  $("#productForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    Object.assign(p, {
      nombre: $("#fName").value.trim(),
      precio: $("#fPrice").value,
      categoria: $("#fCategory").value,
      detalle: $("#fDetail").value.trim(),
      emoji: $("#fEmoji").value.trim() || "🛒",
      activo: $("#fVisible").checked,
    });

    if (!p.nombre) return ($("#formError").textContent = "Falta el nombre.");
    if (p.precio === "" || Number(p.precio) < 0 || !Number.isInteger(Number(p.precio))) {
      return ($("#formError").textContent = "El precio tiene que ser un número entero (sin centavos).");
    }
    p.precio = Number(p.precio);

    $("#saveProduct").disabled = true;
    try {
      const saved = await data.saveProduct(p);
      if (isNew) state.products.push(saved);
      else Object.assign(state.products.find((x) => x.id === p.id), saved);
      closeModal();
      drawList();
      toast(isNew ? "Producto agregado" : "Cambios guardados");
    } catch (error) {
      $("#saveProduct").disabled = false;
      showError(error);
    }
  });
}
