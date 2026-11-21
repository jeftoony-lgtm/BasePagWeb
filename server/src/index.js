// =====================================================================
//  KIVO · Servidor (Express + MongoDB)
//  - /api/...  → los datos (catálogo, pedidos, ruleta, panel, asistente)
//  - el resto  → en producción, la página ya compilada (client/dist)
//  En desarrollo la página la sirve Vite (npm run dev) y le pasa /api a este servidor.
// =====================================================================

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { connectDB } from "./db.js";
import { readUser } from "./auth.js";
import { errorHandler, fail } from "./http.js";

import { router as authRoutes } from "./routes/auth.js";
import { router as catalogRoutes } from "./routes/catalog.js";
import { router as settingsRoutes } from "./routes/settings.js";
import { router as orderRoutes } from "./routes/orders.js";
import { router as ruletaRoutes } from "./routes/ruleta.js";
import { router as teamRoutes } from "./routes/team.js";
import { router as assistantRoutes } from "./assistant/route.js";

const app = express();
app.set("trust proxy", 1); // detrás del hosting: para saber la IP real (límites de uso)
app.disable("x-powered-by");

app.use("/api", express.json({ limit: "200kb" }), readUser);
app.use("/api/auth", authRoutes);
app.use("/api", catalogRoutes, settingsRoutes, orderRoutes, ruletaRoutes, teamRoutes, assistantRoutes);
app.use("/api", () => { throw fail(404, "Esa dirección no existe."); });

// Producción: la página compilada por Vite (npm run build)
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist");
if (fs.existsSync(dist)) app.use(express.static(dist));

app.use(errorHandler);

const port = Number(process.env.PORT) || 3001;
await connectDB();
app.listen(port, () => console.log(`🛒 Kivo listo en http://localhost:${port}`));
