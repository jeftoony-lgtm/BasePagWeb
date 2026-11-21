// =====================================================================
//  INMOBILIARIA · Link corto de cada propiedad: /propiedad/12
//  Es la misma página de siempre (abre la ficha de esa propiedad), pero
//  con los datos de la propiedad escritos adentro. Así, cuando se manda
//  el link por WhatsApp (o Facebook), aparece la foto, el título y el precio.
//  Solo en producción (con la página compilada en client/dist).
// =====================================================================

import { Property } from "./models.js";
import { loadSettings } from "./routes/settings.js";

/** "JTC" + 12 → "JTC-012" (las letras salen del nombre de la inmobiliaria) */
export function refCode(ref, nombre) {
  const letras = String(nombre || "").normalize("NFD").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 4) || "REF";
  return `${letras}-${String(ref).padStart(3, "0")}`;
}

const escape = (text) => String(text ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function priceText(p) {
  if (p.precio == null) return "Consultar";
  return `${p.moneda === "UYU" ? "$" : "USD"} ${p.precio.toLocaleString("es-UY")}${p.precio_extra ? ` ${p.precio_extra}` : ""}`;
}

/** Devuelve la función que atiende /propiedad/:ref, usando el index.html compilado */
export function shareRoute(indexHtml) {
  return async (req, res) => {
    const ref = Number(req.params.ref);
    const p = Number.isInteger(ref) ? await Property.findOne({ ref, publicada: true }) : null;
    if (!p) return res.type("html").send(indexHtml); // no existe: la página normal

    const { inmobiliaria: info } = await loadSettings();
    const base = `${req.protocol}://${req.get("host")}`;
    const lugar = [p.barrio, p.ciudad, p.departamento].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).join(", ");
    const title = `${priceText(p)} · ${p.titulo}`;
    const description = [
      `Ref. ${refCode(p.ref, info.nombre)}`,
      lugar,
      p.dormitorios != null && `${p.dormitorios} dorm.`,
      p.banos != null && `${p.banos} baño${p.banos === 1 ? "" : "s"}`,
      p.metros != null && `${p.metros} m²`,
    ].filter(Boolean).join(" · ");

    const meta = [
      ["og:type", "website"],
      ["og:site_name", `${info.nombre} ${info.subtitulo || ""}`.trim()],
      ["og:title", title],
      ["og:description", description],
      ["og:url", `${base}/propiedad/${p.ref}`],
      p.fotos[0] && ["og:image", `${base}${p.fotos[0]}`],
    ].filter(Boolean).map(([key, value]) => `<meta property="${key}" content="${escape(value)}">`);
    meta.push(`<meta name="twitter:card" content="${p.fotos[0] ? "summary_large_image" : "summary"}">`);

    res.type("html").send(indexHtml
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(title)}</title>`)
      .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escape(description)}">`)
      .replace("</head>", `${meta.join("\n")}\n</head>`));
  };
}
