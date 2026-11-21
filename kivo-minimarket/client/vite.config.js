// =====================================================================
//  INMOBILIARIA · Configuración de Vite
//  - Dos páginas: index.html (las publicaciones) y admin.html (el panel).
//  - En desarrollo, todo lo que va a /api se pasa al servidor (puerto 3001).
// =====================================================================

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
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
