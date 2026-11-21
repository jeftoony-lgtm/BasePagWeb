// =====================================================================
//  INMOBILIARIA · Íconos de línea (tarjeta y ficha de la propiedad)
//  Se dibujan con el color del texto, así se ven igual en todos los
//  celulares (los emojis cambian según la marca).
// =====================================================================

const Svg = ({ children, fill }) => (
  <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" fill={fill ? "currentColor" : "none"}
    stroke={fill ? "none" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

export const BedIcon = () => <Svg><path d="M3 18V6M3 14h18v4M21 14v-1a4 4 0 0 0-4-4h-6v5" /><circle cx="7" cy="11" r="1.8" /></Svg>;
export const BathIcon = () => <Svg><path d="M4 12h16v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-2zM6 12V6a2 2 0 0 1 4 0M7 19l-1 2M17 19l1 2" /></Svg>;
export const HouseIcon = () => <Svg><path d="M3 11l9-7 9 7M5 9.5V20h14V9.5M10 20v-5h4v5" /></Svg>;
export const LandIcon = () => <Svg><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></Svg>;
export const CarIcon = () => <Svg><path d="M5 11l1.6-4.2A2 2 0 0 1 8.5 5.5h7a2 2 0 0 1 1.9 1.3L19 11M4 11h16v6H4zM6 17v2M18 17v2" /><circle cx="8" cy="14" r=".6" /><circle cx="16" cy="14" r=".6" /></Svg>;
export const PinIcon = () => <Svg><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></Svg>;
export const MailIcon = () => <Svg><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></Svg>;
export const CheckIcon = () => <Svg><path d="M5 12.5l4.2 4.2L19 7" /></Svg>;
export const PhoneIcon = () => (
  <Svg fill><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z" /></Svg>
);
export const WhatsappIcon = () => (
  <Svg><path d="M20 12a8 8 0 0 1-11.9 7L4 20l1.1-4A8 8 0 1 1 20 12z" /><path d="M9 9.2c0 3 2.6 5.6 5.6 5.8l1-1.3-1.7-.8-.8.8a4 4 0 0 1-2.2-2.2l.8-.8-.8-1.7L9 9.2z" /></Svg>
);

/** Datos cortos con ícono (dormitorios, baños, m²…): solo los que están cargados */
export function quickFacts(p) {
  return [
    p.dormitorios != null && { Icon: BedIcon, value: p.dormitorios, label: p.dormitorios === 1 ? "dormitorio" : "dormitorios" },
    p.banos != null && { Icon: BathIcon, value: p.banos, label: p.banos === 1 ? "baño" : "baños" },
    p.metros != null && { Icon: HouseIcon, value: `${p.metros} m²`, label: "edificados" },
    p.metros_terreno != null && { Icon: LandIcon, value: `${p.metros_terreno} m²`, label: "de terreno" },
    p.garaje && { Icon: CarIcon, value: "Garaje", label: "tiene garaje" },
  ].filter(Boolean);
}
