// =====================================================================
//  KIVO · Capa de datos
//
//  Todo lo que la página y el panel leen o guardan pasa por acá.
//  - Si js/config.js tiene las claves de Supabase → datos reales.
//  - Si no → MODO DEMO con datos de prueba guardados en el navegador.
//
//  Uso:  import { data } from "../data/index.js";
//        const productos = await data.products();
// =====================================================================

import { CONFIG } from "../config.js";
import { createSupabaseData } from "./supabase.js";
import { createDemoData } from "./demo.js";

const hasSupabase = Boolean(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY && window.supabase);

export const data = hasSupabase ? createSupabaseData(CONFIG) : createDemoData();
