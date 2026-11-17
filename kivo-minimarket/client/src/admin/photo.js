// =====================================================================
//  KIVO · Prepara la foto de un producto antes de subirla
//  1. Recorta el fondo que sobra alrededor del producto (blanco, liso
//     o transparente), así el producto ocupa bien el recuadro.
//  2. La achica a un tamaño razonable (pesa menos y carga más rápido).
//  Si algo falla, se sube la foto original tal cual.
// =====================================================================

const MAX_SIDE = 900;   // píxeles del lado más largo
const MARGIN = 0.05;    // aire que se deja alrededor del producto (5%)
const TOLERANCE = 42;   // cuánto puede diferir un píxel del fondo y seguir siendo "fondo"

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer la foto")); };
    img.src = url;
  });
}

/** Busca el rectángulo donde está el producto (lo que no es fondo) */
function findContent(data, width, height) {
  const at = (x, y) => (y * width + x) * 4;
  const corners = [at(0, 0), at(width - 1, 0), at(0, height - 1), at(width - 1, height - 1)].map((i) => [data[i], data[i + 1], data[i + 2], data[i + 3]]);
  const transparent = corners.every((c) => c[3] < 20);
  // El fondo tiene que ser parejo: si las esquinas son muy distintas, es una foto "de ambiente" y no se recorta
  const avg = [0, 1, 2].map((k) => corners.reduce((s, c) => s + c[k], 0) / 4);
  const even = corners.every((c) => Math.abs(c[0] - avg[0]) + Math.abs(c[1] - avg[1]) + Math.abs(c[2] - avg[2]) < TOLERANCE);
  if (!transparent && !even) return null;

  const isContent = (i) => (transparent
    ? data[i + 3] > 20
    : data[i + 3] > 20 && Math.abs(data[i] - avg[0]) + Math.abs(data[i + 1] - avg[1]) + Math.abs(data[i + 2] - avg[2]) > TOLERANCE);

  let top = height, bottom = -1, left = width, right = -1;
  const step = Math.max(1, Math.floor(Math.min(width, height) / 600)); // en fotos grandes no hace falta mirar cada píxel
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (!isContent(at(x, y))) continue;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
      if (x < left) left = x;
      if (x > right) right = x;
    }
  }
  if (bottom < 0) return null;
  const w = right - left + 1, h = bottom - top + 1;
  if (w * h < width * height * 0.02) return null; // casi todo fondo: mejor no tocar
  return { x: left, y: top, w, h };
}

/** Devuelve un archivo nuevo, recortado y achicado (o el original si no hace falta / falla) */
export async function preparePhoto(file) {
  try {
    const img = await loadImage(file);
    const scan = document.createElement("canvas");
    // Se analiza una versión chica para que sea rápido
    const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
    scan.width = Math.round(img.width * scale);
    scan.height = Math.round(img.height * scale);
    const ctx = scan.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, scan.width, scan.height);
    const box = findContent(ctx.getImageData(0, 0, scan.width, scan.height).data, scan.width, scan.height);

    // Rectángulo a recortar en la foto original, con un poco de aire alrededor
    let crop = { x: 0, y: 0, w: img.width, h: img.height };
    if (box) {
      const pad = Math.max(box.w, box.h) * MARGIN;
      const x = Math.max(0, box.x - pad), y = Math.max(0, box.y - pad);
      crop = {
        x: x / scale, y: y / scale,
        w: (Math.min(scan.width, box.x + box.w + pad) - x) / scale,
        h: (Math.min(scan.height, box.y + box.h + pad) - y) / scale,
      };
    }

    const out = document.createElement("canvas");
    const fit = Math.min(1, MAX_SIDE / Math.max(crop.w, crop.h));
    out.width = Math.round(crop.w * fit);
    out.height = Math.round(crop.h * fit);
    out.getContext("2d").drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, out.width, out.height);

    // WebP mantiene la transparencia y pesa poco
    const blob = await new Promise((resolve) => out.toBlob(resolve, "image/webp", 0.88));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
  } catch (error) {
    console.warn("No se pudo preparar la foto, se sube como está:", error);
    return file;
  }
}
