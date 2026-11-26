// =====================================================================
//  LUZ SERENA · Conexión con el servidor
//  Todo lo que la página y el panel leen o guardan pasa por acá.
//  Uso:  import { api } from "../api.js";
//        const posts = await api.posts();
// =====================================================================

const TOKEN_KEY = "luzserena-token";

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
const del = (path) => request("DELETE", path);

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

  /* ---------- Configuración (plazas, whatsapp, agenda) ---------- */
  settings: () => get("/settings"),
  saveSetting: (key, value) => put(`/settings/${key}`, { value }),

  /* ---------- Estadísticas de la página ---------- */
  // keepalive: se manda igual aunque la persona se vaya a WhatsApp
  track: (tipo) => post("/visitas", { tipo }, { keepalive: true }).catch(() => { /* no importa si falla */ }),
  stats: (dias = 60) => get(`/estadisticas?dias=${dias}`),

  /* ---------- Consultas (pedidos de visita) ---------- */
  sendLead: (lead) => post("/consultas", lead),
  leads: () => get("/consultas"),
  updateLead: (id, changes) => patch(`/consultas/${id}`, changes),
  deleteLead: (id) => del(`/consultas/${id}`),

  /* ---------- Residentes ---------- */
  residents: () => get("/residentes"),
  saveResident: (r) => (r.id ? put(`/residentes/${r.id}`, r) : post("/residentes", r)),
  deleteResident: (id) => del(`/residentes/${id}`),

  /* ---------- Blog ---------- */
  posts: () => get("/posts"),
  savePost: (p) => (p.id ? put(`/posts/${p.id}`, p) : post("/posts", p)),
  deletePost: (id) => del(`/posts/${id}`),
  readPost: (id) => post(`/posts/${id}/leido`).catch(() => { /* no importa si falla */ }),
  async uploadPhoto(file) {
    const form = new FormData();
    form.append("foto", file);
    return (await post("/photos", form)).url;
  },

  /* ---------- Equipo ---------- */
  profiles: () => get("/profiles"),
  updateProfile: (id, changes) => patch(`/profiles/${id}`, changes),
  activity: () => get("/activity"),
};
