// =====================================================================
//  INMOBILIARIA · Ubicación a partir de un link de Google Maps
//  El agente pega el link que da Google Maps ("Compartir → Copiar link")
//  y acá se sacan las coordenadas. Acepta también:
//    - links cortos del celular (maps.app.goo.gl/...): se sigue la redirección
//    - coordenadas sueltas: "-33.2311, -54.3836"
//    - una dirección escrita: "Calle 3 y 14, Treinta y Tres" (el mapa la busca)
//  Resultado: { lat, lng } o { texto }.
// =====================================================================

import { fail } from "./http.js";

// Solo se siguen links de Google (para no usar el servidor para visitar cualquier página)
const GOOGLE_HOST = /(^|\.)(google\.(com|[a-z]{2}|com?\.[a-z]{2})|goo\.gl)$/i;

const round6 = (n) => Math.round(n * 1e6) / 1e6;

function valid(lat, lng) {
  lat = Number(lat);
  lng = Number(lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat: round6(lat), lng: round6(lng) };
}

/** Busca coordenadas dentro de un texto o link. Las más precisas primero */
export function coordsFrom(text) {
  let s = String(text);
  try { s = decodeURIComponent(s); } catch { /* queda como vino */ }
  const N = "(-?\\d{1,3}\\.\\d+)";
  const patterns = [
    new RegExp(`!3d${N}!4d${N}`),                                    // el punto exacto del lugar
    new RegExp(`[?&](?:q|query|ll|center|destination)=${N}\\s*,\\s*\\+?${N}`, "i"),
    new RegExp(`/(?:place|search|dir)/${N}\\s*,\\s*\\+?${N}`),
    new RegExp(`@${N},${N}`),                                         // el centro de la pantalla
    new RegExp(`^\\s*${N}\\s*,\\s*${N}\\s*$`),                        // coordenadas sueltas
  ];
  for (const pattern of patterns) {
    const m = s.match(pattern);
    if (m) {
      const coords = valid(m[1], m[2]);
      if (coords) return coords;
    }
  }
  return null;
}

/** Nombre o dirección que trae el link, para cuando no tiene coordenadas */
function placeName(url) {
  const place = url.pathname.match(/\/place\/([^/@]+)/);
  const name = place ? place[1] : url.searchParams.get("q") || url.searchParams.get("query");
  if (!name) return null;
  try { return decodeURIComponent(name).replace(/\+/g, " ").trim().slice(0, 160) || null; } catch { return null; }
}

export async function resolveLocation(input) {
  const text = String(input ?? "").trim().slice(0, 2000);
  if (!text) throw fail(400, "Pegá el link de Google Maps.");

  // No es un link: coordenadas o una dirección escrita
  if (!/^https?:\/\//i.test(text)) return coordsFrom(text) || { texto: text.slice(0, 160) };

  let url;
  try { url = new URL(text); } catch { throw fail(400, "Ese link no se entiende."); }

  for (let hop = 0; hop < 6; hop++) {
    if (!GOOGLE_HOST.test(url.hostname)) throw fail(400, "Ese link no es de Google Maps.");
    const coords = coordsFrom(url.href);
    if (coords) return coords;
    // Link largo con el nombre del lugar y sin coordenadas: el mapa lo busca por nombre
    if (!/goo\.gl$/i.test(url.hostname) && placeName(url)) break;

    // Pantalla de cookies de Google: el destino real viene en "continue"
    const next = url.searchParams.get("continue");
    if (next) { url = new URL(next); continue; }

    let res;
    try {
      res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(6000), headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "es" } });
    } catch {
      throw fail(502, "No pude abrir el link. Probá de nuevo en un rato.");
    }
    const location = res.headers.get("location");
    if (location) { url = new URL(location, url); continue; }
    // Sin más redirecciones. (No se leen coordenadas de la página de Google:
    // ahí aparece el centro del mapa de quien la abre, no el lugar.)
    break;
  }

  const name = placeName(url);
  if (name) return { texto: name };
  throw fail(400, "No encontré la ubicación en ese link. En Google Maps tocá el lugar → Compartir → Copiar link.");
}

/** Lo que se guarda: { lat, lng }, { texto } o null */
export function cleanLocation(value) {
  if (!value || typeof value !== "object") return null;
  if (value.lat != null) {
    const coords = valid(value.lat, value.lng);
    if (!coords) throw fail(400, "La ubicación no es válida.");
    return coords;
  }
  const texto = String(value.texto ?? "").trim().slice(0, 160);
  return texto ? { texto } : null;
}

/** Zona aproximada: se corre el punto a una grilla de ~300 m, así no se ve la casa exacta */
export function approximate({ lat, lng }) {
  const step = 0.0025;
  return { lat: round6(Math.round(lat / step) * step), lng: round6(Math.round(lng / step) * step) };
}
