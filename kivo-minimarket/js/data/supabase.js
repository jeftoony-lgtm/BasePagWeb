// =====================================================================
//  KIVO · Datos reales (Supabase)
//  Cada función habla con la base de datos. Los permisos los decide la
//  base de datos (supabase/schema.sql), no este archivo.
// =====================================================================

const ERRORS = {
  "Invalid login credentials": "Mail o contraseña incorrectos.",
  "Email not confirmed": "Todavía no confirmaste tu mail. Revisá tu casilla.",
  "User already registered": "Ya existe una cuenta con ese mail.",
  "Password should be at least 6 characters": "La contraseña tiene que tener al menos 6 caracteres.",
};

// Saca el resultado de una respuesta de Supabase, o tira un error en castellano
function unwrap({ data, error }) {
  if (error) throw new Error(ERRORS[error.message] || error.message);
  return data;
}

const daysAgoISO = (days) => new Date(Date.now() - days * 864e5).toISOString();

export function createSupabaseData(config) {
  const sb = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

  return {
    demo: false,

    /* ---------- Sesión ---------- */
    async session() {
      const { data } = await sb.auth.getSession();
      return data.session;
    },
    async signIn(email, password) {
      unwrap(await sb.auth.signInWithPassword({ email, password }));
    },
    async signUp(email, password, nombre) {
      unwrap(await sb.auth.signUp({ email, password, options: { data: { nombre } } }));
    },
    async signOut() {
      await sb.auth.signOut();
    },
    async resetPassword(email) {
      unwrap(await sb.auth.resetPasswordForEmail(email, { redirectTo: location.href.split("#")[0] }));
    },
    onAuth(callback) {
      sb.auth.onAuthStateChange((_event, session) => callback(session));
    },
    async me() {
      const session = await this.session();
      if (!session) return null;
      return unwrap(await sb.from("profiles").select("*").eq("id", session.user.id).single());
    },

    /* ---------- Catálogo ---------- */
    async categories() {
      return unwrap(await sb.from("categories").select("*").order("orden"));
    },
    async products() {
      return unwrap(await sb.from("products").select("*").order("categoria").order("orden").order("nombre"));
    },
    async saveProduct(p) {
      const row = {
        categoria: p.categoria,
        nombre: p.nombre,
        detalle: p.detalle || "",
        precio: Number(p.precio),
        emoji: p.emoji || "🛒",
        color: p.color || "#f4f4f4",
        foto_url: p.foto_url || null,
        activo: p.activo !== false,
        en_stock: p.en_stock !== false,
      };
      const query = p.id
        ? sb.from("products").update(row).eq("id", p.id)
        : sb.from("products").insert(row);
      return unwrap(await query.select().single());
    },
    async deleteProduct(id) {
      unwrap(await sb.from("products").delete().eq("id", id));
    },
    async setStock(id, enStock) {
      unwrap(await sb.rpc("set_stock", { p_id: id, p_stock: enStock }));
    },
    async uploadPhoto(file) {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      unwrap(await sb.storage.from("productos").upload(path, file, { contentType: file.type }));
      return sb.storage.from("productos").getPublicUrl(path).data.publicUrl;
    },

    /* ---------- Configuración del local ---------- */
    async settings() {
      const rows = unwrap(await sb.from("settings").select("key, value"));
      return Object.fromEntries(rows.map((r) => [r.key, r.value]));
    },
    async saveSetting(key, value) {
      unwrap(await sb.from("settings").upsert({ key, value }));
    },

    /* ---------- Pedidos ---------- */
    async orders(days = 30) {
      return unwrap(await sb.from("orders").select("*").gte("created_at", daysAgoISO(days)).order("created_at", { ascending: false }));
    },
    async setOrderState(id, estado) {
      unwrap(await sb.from("orders").update({ estado }).eq("id", id));
    },
    onOrders(callback) {
      sb.channel("orders")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (p) => callback(p.eventType, p.new))
        .subscribe();
    },
    async createOrder(order) {
      unwrap(await sb.from("orders").insert(order));
    },

    /* ---------- Ruleta y clientes ---------- */
    async spin(nombre, telefono, acepta) {
      return unwrap(await sb.rpc("jugar_ruleta", { p_nombre: nombre, p_telefono: telefono, p_acepta: acepta }));
    },
    async redeem(code) {
      return unwrap(await sb.rpc("canjear_codigo", { p_code: code }));
    },
    async customers() {
      return unwrap(await sb.from("customers").select("*, giros(premio, code, canjeado_at, promo_id, created_at)").order("created_at", { ascending: false }));
    },
    async logSearch(termino) {
      try { await sb.from("busquedas").insert({ termino: termino.slice(0, 60) }); } catch { /* no importa si falla */ }
    },
    async searches(days = 30) {
      return unwrap(await sb.from("busquedas").select("termino, created_at").gte("created_at", daysAgoISO(days)));
    },

    /* ---------- Asistente ---------- */
    async chat(messages, cart) {
      const { data, error } = await sb.functions.invoke("asistente", { body: { messages, cart } });
      if (error) throw new Error("El asistente no está disponible");
      return data;
    },

    /* ---------- Equipo ---------- */
    async profiles() {
      return unwrap(await sb.from("profiles").select("*").order("created_at"));
    },
    async updateProfile(id, patch) {
      unwrap(await sb.from("profiles").update(patch).eq("id", id));
    },
    async activity() {
      return unwrap(await sb.from("actividad").select("*, profiles(nombre)").order("id", { ascending: false }).limit(80));
    },
  };
}
