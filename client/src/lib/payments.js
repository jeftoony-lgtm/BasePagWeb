// =====================================================================
//  KIVO · Medios de pago que se pueden mostrar en la página
//  El dueño elige cuáles acepta en el panel (Promos → Medios de pago).
//  Se guardan por nombre en el ajuste "pagos".
// =====================================================================

export const PAYMENT_METHODS = [
  { name: "Efectivo", icon: "💵", color: "#2f6b2a" },
  { name: "Débito", icon: "💳", color: "#16301a" },
  { name: "Transferencia", icon: "🏦", color: "#16301a" },
  { name: "Visa", color: "#1a1f71", italic: true },
  { name: "Mastercard", color: "#eb001b", dots: true },
  { name: "OCA", color: "#0047bb", italic: true },
  { name: "Creditel", color: "#0099d8" },
  { name: "Cabal", color: "#004b87" },
  { name: "American Express", color: "#2e77bb" },
  { name: "Diners Club", color: "#0b3d7a" },
  { name: "Tarjeta D", color: "#0b8a3a" },
  { name: "Líder", color: "#e30613" },
  { name: "Passcard", color: "#2aa8e0" },
  { name: "Anda", color: "#0067b1" },
  { name: "BROU", color: "#004a8f" },
  { name: "Mercado Pago", color: "#009ee3" },
];

/** Busca cómo dibujar un medio de pago (si no está en la lista, se muestra simple) */
export const paymentStyle = (name) => PAYMENT_METHODS.find((m) => m.name === name) || { name, color: "#16301a" };
