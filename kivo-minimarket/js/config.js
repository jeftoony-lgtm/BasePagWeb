// =====================================================================
//  KIVO · Conexión con Supabase
//
//  Supabase → Project Settings → API → copiá "Project URL" y la clave "anon public".
//  Si los dejás vacíos, la página y el panel funcionan en MODO DEMO (datos de prueba).
//
//  La anon key es pública a propósito: lo que protege los datos son los permisos
//  de la base de datos (Row Level Security). NUNCA pongas acá la "service_role" key.
// =====================================================================

export const CONFIG = {
  SUPABASE_URL: "",       // ej: "https://abcdxyz.supabase.co"
  SUPABASE_ANON_KEY: "",  // ej: "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
};
