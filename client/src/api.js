// =====================================================================
//  KIVO · Conexión con el servidor
//  Todo lo que la página y el panel leen o guardan pasa por acá.
//  Uso:  import { api } from "../api.js";
//        const productos = await api.products();
// =====================================================================

const TOKEN_KEY = "kivo-token";

export const session = {
  get token() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  save(token) {
    try { localStorage.setItem(TOKEN_KEY, token); } catch { /* sin localStorage */ }
  },
  clear() {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* sin localStorage */ }
  },
};

/** Pide algo al servidor. Si falla, tira un error con el mensaje en castellano */
async function request(method, path, body, options = {}) {
  const headers = {};
  const token = session.token;
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch("/api" + path, { method, headers, body: payload, ...options });
  } catch {
    throw new Error("No hay conexión con el servidor.");
  }
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || "Algo salió mal.");
  return data;
}

const get = (path) => request("GET", path);
const post = (path, body, options) => request("POST", path, body, options);
const put = (path, body) => request("PUT", path, body);
const patch = (path, body) => request("PATCH", path, body);

export const api = {
  /* ---------- Sesión del panel ---------- */
  async signIn(email, password) {
    const { token, user } = await post("/auth/login", { email, password });
    session.save(token);
    return user;
  },
  async signUp(email, password, nombre) {
    const { token, user } = await post("/auth/signup", { email, password, nombre });
    session.save(token);
    return user;
  },
  signOut() {
    session.clear();
  },
  async me() {
    if (!session.token) return null;
    const { user } = await get("/auth/me");
    if (!user) session.clear(); // el token venció
    return user;
  },

  /* ---------- Catálogo ---------- */
  categories: () => get("/categories"),
  products: () => get("/products"),
  saveProduct: (p) => (p.id ? put(`/products/${p.id}`, p) : post("/products", p)),
  deleteProduct: (id) => request("DELETE", `/products/${id}`),
  setStock: (id, enStock) => patch(`/products/${id}/stock`, { en_stock: enStock }),
  async uploadPhoto(file) {
    const form = new FormData();
    form.append("foto", file);
    return (await post("/photos", form)).url;
  },

  /* ---------- Configuración del local ---------- */
  settings: () => get("/settings"),
  saveSetting: (key, value) => put(`/settings/${key}`, { value }),

  /* ---------- Pedidos ---------- */
  orders: (days = 30) => get(`/orders?days=${days}`),
  setOrderState: (id, estado) => patch(`/orders/${id}`, { estado }),
  // keepalive: se manda igual aunque la persona se vaya a WhatsApp
  createOrder: (order) => post("/orders", order, { keepalive: true }),

  /** Pedidos en vivo. Devuelve una función para cortar la conexión */
  onOrders(callback) {
    const source = new EventSource(`/api/orders/events?token=${encodeURIComponent(session.token || "")}`);
    source.onmessage = (event) => {
      try {
        const { type, order } = JSON.parse(event.data);
        callback(type, order);
      } catch { /* mensaje roto: se ignora */ }
    };
    return () => source.close();
  },

  /* ---------- Ruleta y clientes ---------- */
  spin: (nombre, telefono, acepta) => post("/ruleta/girar", { nombre, telefono, acepta }),
  redeem: (code) => post("/ruleta/canjear", { code }),
  customers: () => get("/customers"),
  logSearch: (termino) => post("/busquedas", { termino }).catch(() => { /* no importa si falla */ }),
  searches: (days = 30) => get(`/busquedas?days=${days}`),

  /* ---------- Asistente ---------- */
  chat: (messages, cart) => post("/asistente", { messages, cart }),

  /* ---------- Equipo ---------- */
  profiles: () => get("/profiles"),
  updateProfile: (id, changes) => patch(`/profiles/${id}`, changes),
  activity: () => get("/activity"),
};
