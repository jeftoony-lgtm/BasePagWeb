// =====================================================================
//  LUZ SERENA · Vista previa sin servidor (GitHub Pages)
//  Cuando la página se compila con VITE_PREVIEW=1 no hay servidor ni base
//  de datos: el blog y la agenda salen de los datos de ejemplo del servidor
//  y el formulario avisa que todavía no guarda nada.
//  En el sitio real (Render) este archivo no se usa.
// =====================================================================

import { DEFAULT_SETTINGS, SAMPLE_POSTS } from "../../server/src/seed-data.js";

export const PREVIEW = import.meta.env.VITE_PREVIEW === "1";

const day = (offset) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo" }).format(new Date(Date.now() + offset * 864e5));

export const previewApi = {
  settings: async () => DEFAULT_SETTINGS,
  posts: async () => SAMPLE_POSTS.map(({ dias, foto_url, ...p }, i) => ({
    ...p,
    id: `ejemplo-${i + 1}`,
    fecha: day(-dias),
    foto_url: foto_url?.replace(/^\//, ""), // ruta relativa: en GitHub la página vive en /BasePagWeb/
    publicado: true,
  })),
  sendLead: async () => {
    throw new Error("Esta es una vista previa: el formulario todavía no guarda los datos.");
  },
  track: async () => {},
  readPost: async () => {},
};
