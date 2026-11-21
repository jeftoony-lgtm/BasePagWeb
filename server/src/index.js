// =====================================================================
//  INMOBILIARIA · Servidor (Express + MongoDB)
//  - /api/...  → los datos (publicaciones, fotos, ajustes, panel)
//  - el resto  → en producción, la página ya compilada (client/dist)
//  En desarrollo la página la sirve Vite (npm run dev) y le pasa /api a este servidor.
// =====================================================================

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { connectDB } from "./db.js";
import { fixEstados, fixRefs } from "./models.js";
import { shareRoute } from "./share.js";
import { readUser } from "./auth.js";
import { errorHandler, fail } from "./http.js";

import { router as authRoutes } from "./routes/auth.js";
import { router as propertyRoutes } from "./routes/propiedades.js";
import { router as settingsRoutes } from "./routes/settings.js";
import { router as teamRoutes } from "./routes/team.js";

const app = express();
app.set("trust proxy", 1); // detrás del hosting: para saber la IP real (límites de uso)
app.disable("x-powered-by");

app.use("/api", express.json({ limit: "200kb" }), readUser);
app.use("/api/auth", authRoutes);
app.use("/api", propertyRoutes, settingsRoutes, teamRoutes);
app.use("/api", () => { throw fail(404, "Esa dirección no existe."); });

// Producción: la página compilada por Vite (npm run build)
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist");
if (fs.existsSync(dist)) {
  // Link corto de cada propiedad (con foto y precio al mandarlo por WhatsApp): ver share.js
  app.get("/propiedad/:ref", shareRoute(fs.readFileSync(path.join(dist, "index.html"), "utf8")));
  app.use(express.static(dist));
}

app.use(errorHandler);

const port = Number(process.env.PORT) || 3001;
await connectDB();
await fixEstados();
await fixRefs();
app.listen(port, () => console.log(`🏠 Inmobiliaria lista en http://localhost:${port}`));
