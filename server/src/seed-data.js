// =====================================================================
//  KIVO · Datos iniciales
//  Categorías, productos y ajustes con los que arranca el local
//  (precios de ejemplo). Los usa scripts/seed.js y, como valores por
//  defecto, la ruta de configuración.
// =====================================================================

export const CATEGORIES = [
  { _id: "bebidas",  nombre: "Bebidas",       emoji: "🥤", orden: 1 },
  { _id: "snacks",   nombre: "Snacks",        emoji: "🥔", orden: 2 },
  { _id: "almacen",  nombre: "Almacén",       emoji: "🧉", orden: 3 },
  { _id: "fiambre",  nombre: "Fiambrería",    emoji: "🧀", orden: 4 },
  { _id: "grido",    nombre: "Helados Grido", emoji: "🍦", orden: 5 },
  { _id: "mundial",  nombre: "Mundial 2026",  emoji: "⚽", orden: 6 },
  { _id: "limpieza", nombre: "Limpieza",      emoji: "🧽", orden: 7 },
];

// [categoría, nombre, detalle, precio, emoji, color de fondo]
const PRODUCT_ROWS = [
  ["bebidas", "Coca-Cola 2,25 L", "Retornable", 165, "🥤", "#ffe1df"],
  ["bebidas", "Coca-Cola 600 ml", "Bien fría", 75, "🥤", "#ffe1df"],
  ["bebidas", "Agua Salus 2,25 L", "Sin gas", 85, "💧", "#e1f0ff"],
  ["bebidas", "Cerveza Pilsen 1 L", "Retornable", 150, "🍺", "#fff3d6"],
  ["bebidas", "Cerveza Patricia 1 L", "Retornable", 155, "🍺", "#fff3d6"],
  ["snacks", "Lay's Clásicas", "Bolsa grande", 189, "🥔", "#fff7c9"],
  ["snacks", "Maní salado", "200 g", 95, "🥜", "#f6e8d6"],
  ["snacks", "Chocolate", "Tableta 100 g", 120, "🍫", "#efe0d6"],
  ["snacks", "Galletitas dulces", "Paquete", 70, "🍪", "#f6e8d6"],
  ["almacen", "Yerba Canarias", "1 kg", 290, "🧉", "#e3f1da"],
  ["almacen", "Fideos tallarines", "500 g", 65, "🍝", "#fff3d6"],
  ["almacen", "Arroz", "1 kg", 70, "🍚", "#f4f4f4"],
  ["almacen", "Aceite de girasol", "900 ml", 140, "🫒", "#f2f6d8"],
  ["almacen", "Pan flauta", "Del día", 45, "🥖", "#f6e8d6"],
  ["fiambre", "Salame", "200 g", 160, "🍖", "#ffe1df"],
  ["fiambre", "Queso dambo", "300 g", 210, "🧀", "#fff7c9"],
  ["fiambre", "Jamón cocido", "200 g", 170, "🥓", "#ffe8ef"],
  ["grido", "Grido Tentación Granizado", "1 L", 390, "🍨", "#efe0d6"],
  ["grido", "Palito helado Grido", "Unidad", 60, "🍦", "#e1f0ff"],
  ["mundial", "Álbum Mundial 2026", "Tapa blanda", 250, "📒", "#e3f1da"],
  ["mundial", "Sobre de figuritas", "Mundial 2026", 60, "✨", "#fff3d6"],
  ["limpieza", "Detergente", "750 ml", 95, "🧴", "#e1f0ff"],
  ["limpieza", "Papel higiénico", "Pack x4", 130, "🧻", "#f4f4f4"],
  ["limpieza", "Esponjas", "Pack x3", 55, "🧽", "#fff7c9"],
];

export const PRODUCTS = PRODUCT_ROWS.map(([categoria, nombre, detalle, precio, emoji, color], i) => ({
  categoria, nombre, detalle, precio, emoji, color, orden: i,
}));

export const DEFAULT_SETTINGS = {
  whatsapp: "59899000000",
  cerrado: { activo: false, motivo: "" },
  horarios: {
    0: [["10:00", "19:00"]],
    1: [["10:00", "14:30"], ["15:00", "23:00"]],
    2: [["10:00", "14:30"], ["15:00", "23:00"]],
    3: [["10:00", "14:30"], ["15:00", "23:00"]],
    4: [["10:00", "14:30"], ["15:00", "24:00"]],
    5: [["10:00", "14:30"], ["15:00", "24:00"]],
    6: [["10:00", "24:00"]],
  },
  avisos: [
    "🍦 Ahora con Grido",
    "⚽ Álbum y figuritas del Mundial 2026",
    "🧀 Pack Picada Mundial $650",
    "🛒 Pedí online, retirá en el local",
    "📍 Oscar Gestido y Paul Harris",
  ],
  combo: {
    activo: true,
    titulo: "Promo pack Picada Mundial",
    subtitulo: "Todo lo que necesitás para la picada, en un solo toque.",
    etiqueta: "⚽ Para ver el partido",
    precio: 650,
    items: ["🥔 Lay's Clásicas", "🍖 Salame", "🧀 Queso", "🥤 Coca-Cola"],
  },
  ruleta: {
    activa: false,
    hasta: "",
    promo_id: "promo-1",
    premios: [
      { t: "10% OFF",      d: "10% de descuento en tu próxima compra", c: "#5a9f43" },
      { t: "Coca 600",     d: "Una Coca-Cola 600 ml de regalo",        c: "#e8952f" },
      { t: "2 sobres",     d: "2 sobres de figuritas del Mundial",     c: "#2f6b2a" },
      { t: "Palito Grido", d: "Un palito helado Grido de regalo",      c: "#c9761a" },
      { t: "5% OFF",       d: "5% de descuento en tu próxima compra",  c: "#5a9f43" },
      { t: "¡Casi!",       d: "",                                      c: "#16301a" },
      { t: "15% OFF",      d: "15% en el Pack Picada Mundial",         c: "#e8952f" },
      { t: "Maní gratis",  d: "Un maní salado con tu próxima compra",  c: "#2f6b2a" },
    ],
  },
  // Medios de pago que se muestran al pie de la página (el dueño los elige en el panel)
  pagos: ["Efectivo", "Débito", "Transferencia", "Visa", "Mastercard", "OCA", "Creditel", "Cabal", "American Express", "Diners Club", "Tarjeta D", "Líder", "Passcard", "Anda", "BROU"],
  asistente: {
    activo: true,
    nombre: "Kivi",
    notas: "Hacemos envíos dentro de Solymar; el costo se coordina por WhatsApp. Aceptamos efectivo, débito y transferencia.",
  },
};
