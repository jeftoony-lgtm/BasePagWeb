// =====================================================================
//  KIVO · Datos de ejemplo para el MODO DEMO
//  Son los mismos que carga supabase/schema.sql (precios de ejemplo).
// =====================================================================

const uid = () => Math.random().toString(36).slice(2, 10);
const minutesAgo = (min) => new Date(Date.now() - min * 60000).toISOString();

export const CATEGORIES = [
  { id: "bebidas",  nombre: "Bebidas",       emoji: "🥤", orden: 1 },
  { id: "snacks",   nombre: "Snacks",        emoji: "🥔", orden: 2 },
  { id: "almacen",  nombre: "Almacén",       emoji: "🧉", orden: 3 },
  { id: "fiambre",  nombre: "Fiambrería",    emoji: "🧀", orden: 4 },
  { id: "grido",    nombre: "Helados Grido", emoji: "🍦", orden: 5 },
  { id: "mundial",  nombre: "Mundial 2026",  emoji: "⚽", orden: 6 },
  { id: "limpieza", nombre: "Limpieza",      emoji: "🧽", orden: 7 },
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
  asistente: {
    activo: true,
    nombre: "Kivi",
    notas: "Hacemos envíos dentro de Solymar; el costo se coordina por WhatsApp. Aceptamos efectivo, débito y transferencia.",
  },
};

export function createSeed() {
  const products = PRODUCT_ROWS.map(([categoria, nombre, detalle, precio, emoji, color], i) => ({
    id: uid(), categoria, nombre, detalle, precio, emoji, color,
    foto_url: null, en_stock: true, activo: true, orden: i,
  }));

  const item = (nombre, cantidad) => {
    const p = products.find((x) => x.nombre === nombre);
    return { id: p.id, nombre: p.nombre, cantidad, precio: p.precio };
  };

  const order = (id, minAgo, nombre, modo, items, estado, extra = {}) => ({
    id, nombre, modo, items, estado,
    created_at: minutesAgo(minAgo),
    telefono: extra.telefono || null,
    direccion: modo === "envio" ? "Av. Giannattasio km 23, casa 4" : null,
    dia: new Date().toISOString().slice(0, 10),
    hora: extra.hora || "20:30",
    nota: extra.nota || "",
    total: items.reduce((sum, i) => sum + i.precio * i.cantidad, 0),
  });

  return {
    categories: structuredClone(CATEGORIES),
    products,
    settings: structuredClone(DEFAULT_SETTINGS),

    orders: [
      order(1007, 4, "Rodrigo", "retiro", [item("Coca-Cola 2,25 L", 2), item("Lay's Clásicas", 1), item("Salame", 1)], "nuevo", { hora: "21:30", nota: "La Coca bien fría 🙏", telefono: "099123456" }),
      order(1006, 18, "Lucía", "envio", [item("Grido Tentación Granizado", 1), item("Galletitas dulces", 2)], "preparando", { hora: "21:00" }),
      order(1005, 55, "Martín", "retiro", [item("Yerba Canarias", 1), item("Pan flauta", 3)], "listo"),
      order(1004, 160, "Sofía", "retiro", [item("Sobre de figuritas", 5), item("Álbum Mundial 2026", 1)], "entregado"),
      order(1003, 1500, "Agustina", "retiro", [item("Cerveza Pilsen 1 L", 4), item("Maní salado", 2)], "entregado"),
      order(1002, 2900, "Diego", "envio", [item("Papel higiénico", 1), item("Detergente", 1)], "cancelado"),
      order(1001, 4300, "Rodrigo", "retiro", [item("Coca-Cola 2,25 L", 1), item("Lay's Clásicas", 2)], "entregado"),
    ],

    profiles: [
      { id: "u-dueno", email: "dueno@kivo.uy", nombre: "Dueño (demo)", rol: "dueno", activo: true, created_at: minutesAgo(9000) },
      { id: "u-tita", email: "tita@kivo.uy", nombre: "Tita", rol: "empleado", activo: true, created_at: minutesAgo(8000) },
      { id: "u-nuevo", email: "sobrino.kivo@gmail.com", nombre: "Sobrino", rol: "empleado", activo: false, created_at: minutesAgo(60) },
    ],

    customers: [
      { id: uid(), nombre: "Rodrigo", telefono: "099123456", acepta_promos: true, created_at: minutesAgo(200),
        giros: [{ premio: "Una Coca-Cola 600 ml de regalo", code: "KIVO-7F3A2", canjeado_at: null, promo_id: "promo-1", created_at: minutesAgo(200) }] },
      { id: uid(), nombre: "Agustina", telefono: "098765432", acepta_promos: true, created_at: minutesAgo(1500),
        giros: [{ premio: "10% de descuento en tu próxima compra", code: "KIVO-91BC0", canjeado_at: minutesAgo(900), promo_id: "promo-1", created_at: minutesAgo(1500) }] },
      { id: uid(), nombre: "Martín", telefono: "091222333", acepta_promos: false, created_at: minutesAgo(3000),
        giros: [{ premio: null, code: null, canjeado_at: null, promo_id: "promo-1", created_at: minutesAgo(3000) }] },
    ],

    busquedas: ["fernet", "fernet", "hielo", "fernet", "carbón", "hielo", "pilas", "fernet", "carbón", "pañales"]
      .map((termino, i) => ({ termino, created_at: minutesAgo(i * 300) })),

    actividad: [
      { id: 3, user_id: "u-tita", tabla: "orders", registro: "1005", accion: "update", detalle: { estado: ["preparando", "listo"] }, created_at: minutesAgo(40) },
      { id: 2, user_id: "u-tita", tabla: "products", registro: "", accion: "update", detalle: { en_stock: [true, false], _nombre: "Hielo 2 kg" }, created_at: minutesAgo(300) },
      { id: 1, user_id: "u-dueno", tabla: "products", registro: "", accion: "update", detalle: { precio: [180, 189], _nombre: "Lay's Clásicas" }, created_at: minutesAgo(1440) },
    ],

    nextOrderId: 1008,
    nextActivityId: 4,
  };
}
