// =====================================================================
//  KIVO · Configuración de Vite
//  - Dos páginas: index.html (la tienda) y admin.html (el panel).
//  - En desarrollo, todo lo que va a /api se pasa al servidor, en el
//    puerto que diga PORT en server/.env (si no dice nada, 3001).
// =====================================================================

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig(({ mode }) => {
  const { PORT } = loadEnv(mode, resolve(import.meta.dirname, "../server"), "");
  return {
    plugins: [react()],
    server: {
      proxy: { "/api": `http://localhost:${PORT || 3001}` },
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(import.meta.dirname, "index.html"),
          admin: resolve(import.meta.dirname, "admin.html"),
        },
      },
    },
  };
});
