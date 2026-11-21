// =====================================================================
//  INMOBILIARIA · Prepara la foto de una propiedad antes de subirla
//  La achica a un tamaño razonable (pesa menos y carga más rápido en
//  el celular) y la pasa a WebP. Si algo falla, se sube la original.
// =====================================================================

const MAX_SIDE = 1600; // píxeles del lado más largo

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer la foto")); };
    img.src = url;
  });
}

/** Devuelve un archivo nuevo, achicado (o el original si falla) */
export async function preparePhoto(file) {
  try {
    const img = await loadImage(file);
    const fit = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * fit);
    canvas.height = Math.round(img.height * fit);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
  } catch (error) {
    console.warn("No se pudo preparar la foto, se sube como está:", error);
    return file;
  }
}
