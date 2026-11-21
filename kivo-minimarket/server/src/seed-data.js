// =====================================================================
//  INMOBILIARIA · Datos iniciales
//  Ajustes con los que arranca la página y algunas publicaciones de
//  ejemplo (sin fotos). Los usa scripts/seed.js y, como valores por
//  defecto, la ruta de configuración.
// =====================================================================

export const DEFAULT_SETTINGS = {
  inmobiliaria: {
    nombre: "JTC",
    subtitulo: "Ventas y alquileres",
    eslogan: "Donde los sueños encuentran su lugar.",
    descripcion: "Compra, venta y asesoría en inversiones inmobiliarias.",
    whatsapp: "59899787834",   // con código de país, sin + ni espacios
    telefono2: "098899999",
    instagram: "jtcventasyalquileres",
    servicios: [
      "Rapidez",
      "Valor real del mercado",
      "Galería fotográfica",
      "Difusión en redes sociales (Instagram y Facebook)",
      "Atención personalizada",
      "Visitas guiadas",
    ],
  },
};

export const EXAMPLE_PROPERTIES = [
  {
    titulo: "Casa con piscina y parrillero", operacion: "alquiler", tipo: "casa", barrio: "Barrio Olimar",
    moneda: "UYU", precio: null, dormitorios: 3, banos: 2, destacada: true,
    caracteristicas: ["3 dormitorios", "2 baños", "Living con estufa a leña", "Cocina diseñada a medida", "Parrillero cerrado", "Piscina", "Garaje para dos autos"],
  },
  {
    titulo: "Casa en esquina, lista para banco", operacion: "venta", tipo: "casa", barrio: "Centro",
    moneda: "USD", precio: 80000, dormitorios: 3, banos: 1,
    caracteristicas: ["3 dormitorios", "Living", "Cocina/comedor", "Baño", "Patio cerrado", "Sobre esquina", "Lista para banco"],
  },
  {
    titulo: "Local comercial con salón grande", operacion: "alquiler", tipo: "local", barrio: "Virrey Arredondo",
    moneda: "UYU", precio: 14000, precio_extra: "por mes",
    caracteristicas: ["Local comercial", "Salón grande", "Dos piezas", "Baño", "Excelente ubicación"],
  },
  {
    titulo: "Dos casas en un padrón", operacion: "venta", estado: "vendida", tipo: "casa", barrio: "Laguna Merín",
    moneda: "USD", precio: 98000,
    caracteristicas: ["Dos casas en un padrón", "Ubicada en calle 3 entre calles 14 y 16", "Excelente oportunidad de inversión"],
  },
];
