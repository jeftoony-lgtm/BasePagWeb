// =====================================================================
//  LUZ SERENA · Configuración de Vite
//  - Dos páginas: index.html (la página) y admin.html (el panel).
//  - En desarrollo, todo lo que va a /api se pasa al servidor (puerto 3001).
//  - Vista previa en GitHub Pages: PAGES_BASE=/BasePagWeb/ VITE_PREVIEW=1 (ver .github/workflows).
// =====================================================================

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  // En GitHub Pages la página vive en /BasePagWeb/ (lo pasa el workflow); en Render, en la raíz
  base: process.env.PAGES_BASE || "/",
  plugins: [react()],
  server: {
    proxy: { "/api": "http://localhost:3001" },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        admin: resolve(import.meta.dirname, "admin.html"),
      },
    },
  },
});
