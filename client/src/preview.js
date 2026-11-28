// =====================================================================
//  LUZ SERENA · Demostración sin servidor (GitHub Pages)
//  Cuando la página se compila con VITE_PREVIEW=1 no hay servidor ni base
//  de datos. En su lugar, una "base de mentira" guardada en el navegador
//  (localStorage) hace de servidor: la página y el panel funcionan igual,
//  pero todo queda SOLO en ese navegador. No le llega a nadie más.
//  Arranca con los mismos datos de prueba que "npm run seed:demo".
//  En el sitio real (Render) este archivo no se usa.
// =====================================================================

import { DEFAULT_SETTINGS, SAMPLE_POSTS, DEMO_PASSWORD, demoRecords } from "../../server/src/seed-data.js";

export const PREVIEW = import.meta.env.VITE_PREVIEW === "1";
export const DEMO_LOGIN = { email: "dueno@luzserena.uy", password: DEMO_PASSWORD };

const DB_KEY = "luzserena-demo-v1";
const SESSION_KEY = "luzserena-demo-sesion";
const LEAD_STATES = ["nueva", "contactada", "visita", "ingreso", "descartada"];
const STAFF_KEYS = ["agenda"]; // lo que también puede cambiar un empleado (igual que el servidor)

const day = (offset = 0) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo" }).format(new Date(Date.now() + offset * 864e5));
const daysAgo = (n) => new Date(Date.now() - n * 864e5);
const now = () => new Date().toISOString();
const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const clone = (value) => JSON.parse(JSON.stringify(value));
const fail = (message) => { throw new Error(message); };
const text = (value, max) => String(value ?? "").trim().slice(0, max);

/* ---------- La "base de datos" del navegador ---------- */

function freshDb() {
  const { users, leads, residents, stats } = demoRecords({ day, daysAgo });
  const created = daysAgo(30).toISOString();
  return {
    users: users.map((u) => ({ ...u, id: newId(), password: DEMO_PASSWORD, created_at: created })),
    settings: clone(DEFAULT_SETTINGS),
    leads: leads.map((l) => ({ nota: "", mensaje: "", ...l, id: newId(), created_at: l.created_at.toISOString(), updated_at: l.updated_at.toISOString() })),
    residents: residents.map((r) => ({ observaciones: "", ...r, id: newId(), created_at: created })),
    posts: SAMPLE_POSTS.map(({ dias, foto_url, ...p }) => ({
      ...p, id: newId(), fecha: day(-dias), publicado: true,
      foto_url: foto_url?.replace(/^\//, ""), // ruta relativa: en GitHub la página vive en /BasePagWeb/
      lecturas: Math.floor(Math.random() * 50), created_at: daysAgo(dias).toISOString(),
    })),
    stats: Object.fromEntries(stats.map(({ dia, ...s }) => [dia, s])),
    activity: [],
  };
}

let cache = null;
function db() {
  if (cache) return cache;
  try { cache = JSON.parse(localStorage.getItem(DB_KEY)); } catch { cache = null; }
  if (!cache) { cache = freshDb(); save(); }
  return cache;
}

function save() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(cache));
  } catch {
    fail("La demostración se quedó sin lugar en este navegador (las fotos ocupan mucho). Probá con otra foto o tocá \"Reiniciar demostración\".");
  }
}

/** Vuelve a los datos de ejemplo del principio */
export function resetDemo() {
  cache = null;
  try { localStorage.removeItem(DB_KEY); localStorage.removeItem(SESSION_KEY); } catch { /* nada */ }
}

/* ---------- Sesión y permisos ---------- */

const publicUser = ({ password, ...user }) => clone(user); // eslint-disable-line no-unused-vars

function currentUser() {
  let id = null;
  try { id = localStorage.getItem(SESSION_KEY); } catch { /* sin localStorage */ }
  return db().users.find((u) => u.id === id && u.activo) || null;
}
function requireStaff() {
  return currentUser() || fail("Tenés que entrar al panel.");
}
function requireOwner() {
  const user = requireStaff();
  return user.rol === "dueno" ? user : fail("Solo el dueño puede hacer esto.");
}
function logActivity(user, tabla, registro, accion, detalle = {}) {
  db().activity.unshift({ id: newId(), usuario: user?.nombre || "—", tabla, registro: String(registro ?? ""), accion, detalle, created_at: now() });
  db().activity.length = Math.min(db().activity.length, 80);
}
const byId = (list, id, message) => list.find((x) => x.id === id) || fail(message);

/* ---------- Lo mismo que hace el servidor, pero en el navegador ---------- */

export const previewApi = {
  /* Sesión */
  async signIn(email, password) {
    const user = db().users.find((u) => u.email === email.trim().toLowerCase());
    if (!user || user.password !== password) fail("Mail o contraseña incorrectos.");
    localStorage.setItem(SESSION_KEY, user.id);
    return publicUser(user);
  },
  async signUp(email, password, nombre) {
    email = email.trim().toLowerCase();
    if (db().users.some((u) => u.email === email)) fail("Ya existe una cuenta con ese mail.");
    const user = { id: newId(), email, nombre: text(nombre, 60), password, rol: "empleado", activo: false, created_at: now() };
    db().users.push(user);
    save();
    localStorage.setItem(SESSION_KEY, user.id);
    return publicUser(user);
  },
  signOut() {
    try { localStorage.removeItem(SESSION_KEY); } catch { /* nada */ }
  },
  async me() {
    let id = null;
    try { id = localStorage.getItem(SESSION_KEY); } catch { /* nada */ }
    const user = db().users.find((u) => u.id === id);
    return user ? publicUser(user) : null;
  },

  /* Ajustes */
  settings: async () => clone(db().settings),
  async saveSetting(key, value) {
    const user = requireStaff();
    if (!(key in DEFAULT_SETTINGS)) fail("Ese ajuste no existe.");
    if (!STAFF_KEYS.includes(key) && user.rol !== "dueno") fail("Solo el dueño puede cambiar esto.");
    if (key === "plazas") {
      const total = Number(value.total), ocupadas = Number(value.ocupadas);
      if (!Number.isInteger(total) || !Number.isInteger(ocupadas) || total < 1 || ocupadas < 0 || ocupadas > total) {
        fail("Revisá las plazas: las ocupadas no pueden ser más que las totales.");
      }
    }
    logActivity(user, "settings", key, "update", { value: [db().settings[key], value] });
    db().settings[key] = clone(value);
    save();
    return { key, value };
  },

  /* Estadísticas */
  async track(tipo) {
    const stat = (db().stats[day()] ||= { visitas: 0, whatsapp: 0 });
    stat[tipo === "whatsapp" ? "whatsapp" : "visitas"]++;
    try { save(); } catch { /* no importa si falla */ }
  },
  async stats(dias = 60) {
    requireStaff();
    const desde = day(-(dias - 1));
    return Object.entries(db().stats).filter(([dia]) => dia >= desde).sort(([a], [b]) => a.localeCompare(b))
      .map(([dia, s]) => ({ dia, visitas: s.visitas, whatsapp: s.whatsapp }));
  },

  /* Consultas */
  async sendLead(lead) {
    const nombre = text(lead.nombre, 80), telefono = text(lead.telefono, 30);
    if (!nombre) fail("Escribí tu nombre, por favor.");
    if (telefono.replace(/\D/g, "").length < 8) fail("Revisá el teléfono: tiene que tener al menos 8 números.");
    const row = { id: newId(), nombre, telefono, para: text(lead.para, 40), dia: text(lead.dia, 60), mensaje: text(lead.mensaje, 800), estado: "nueva", nota: "", created_at: now(), updated_at: now() };
    db().leads.unshift(row);
    save();
    return { id: row.id };
  },
  async leads() {
    requireStaff();
    return clone([...db().leads].sort((a, b) => b.created_at.localeCompare(a.created_at)));
  },
  async updateLead(id, { estado, nota }) {
    const user = requireStaff();
    const lead = byId(db().leads, id, "Esa consulta no existe.");
    if (estado !== undefined) {
      if (!LEAD_STATES.includes(estado)) fail("Ese estado no existe.");
      if (estado !== lead.estado) logActivity(user, "consultas", lead.id, "update", { estado: [lead.estado, estado], _nombre: lead.nombre });
      lead.estado = estado;
    }
    if (nota !== undefined) lead.nota = text(nota, 300);
    lead.updated_at = now();
    save();
    return clone(lead);
  },
  async deleteLead(id) {
    const user = requireOwner();
    const lead = db().leads.find((l) => l.id === id);
    if (lead) logActivity(user, "consultas", lead.id, "delete", { _nombre: lead.nombre });
    db().leads = db().leads.filter((l) => l.id !== id);
    save();
  },

  /* Residentes */
  async residents() {
    requireStaff();
    return clone([...db().residents].sort((a, b) => a.habitacion.localeCompare(b.habitacion, "es", { numeric: true }) || a.nombre.localeCompare(b.nombre)));
  },
  async saveResident(r) {
    const user = requireStaff();
    const fields = {};
    for (const key of ["nombre", "habitacion", "nacimiento", "ingreso", "familiar", "telefono_familiar", "observaciones"]) if (key in r) fields[key] = String(r[key] ?? "").trim();
    if (!/^(\d{4}-\d{2}-\d{2})?$/.test(fields.nacimiento ?? "") || !/^(\d{4}-\d{2}-\d{2})?$/.test(fields.ingreso ?? "")) fail("Revisá las fechas.");
    let resident;
    if (r.id) {
      resident = Object.assign(byId(db().residents, r.id, "Ese residente no existe."), fields);
      logActivity(user, "residentes", resident.id, "update", { _nombre: resident.nombre });
    } else {
      if (!fields.nombre) fail("Falta el nombre.");
      resident = { habitacion: "", nacimiento: "", ingreso: "", familiar: "", telefono_familiar: "", observaciones: "", ...fields, id: newId(), created_at: now() };
      db().residents.push(resident);
      logActivity(user, "residentes", resident.id, "insert", { _nombre: resident.nombre });
    }
    save();
    return clone(resident);
  },
  async deleteResident(id) {
    const user = requireOwner();
    const resident = db().residents.find((r) => r.id === id);
    if (resident) logActivity(user, "residentes", resident.id, "delete", { _nombre: resident.nombre });
    db().residents = db().residents.filter((r) => r.id !== id);
    save();
  },

  /* Blog */
  async posts() {
    const list = currentUser() ? db().posts : db().posts.filter((p) => p.publicado);
    return clone([...list].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.created_at.localeCompare(a.created_at)));
  },
  async savePost(p) {
    const user = requireStaff();
    const fields = {};
    for (const key of ["titulo", "categoria", "fecha", "foto_url", "texto", "publicado"]) if (key in p) fields[key] = p[key];
    if ("publicado" in fields) fields.publicado = Boolean(fields.publicado);
    if (fields.foto_url === "") fields.foto_url = null;
    if ("fecha" in fields && !/^\d{4}-\d{2}-\d{2}$/.test(fields.fecha)) fields.fecha = day();
    let post;
    if (p.id) {
      post = Object.assign(byId(db().posts, p.id, "Esa publicación no existe."), fields);
      logActivity(user, "posts", post.id, "update", { _nombre: post.titulo });
    } else {
      if (!String(fields.titulo || "").trim()) fail("Poné un título.");
      post = { categoria: "Novedades", foto_url: null, texto: "", publicado: true, lecturas: 0, fecha: day(), ...fields, id: newId(), created_at: now() };
      db().posts.push(post);
      logActivity(user, "posts", post.id, "insert", { _nombre: post.titulo });
    }
    save();
    return clone(post);
  },
  async deletePost(id) {
    const user = requireStaff();
    const post = db().posts.find((p) => p.id === id);
    if (post) logActivity(user, "posts", post.id, "delete", { _nombre: post.titulo });
    db().posts = db().posts.filter((p) => p.id !== id);
    save();
  },
  async readPost(id) {
    const post = db().posts.find((p) => p.id === id && p.publicado);
    if (post) { post.lecturas++; try { save(); } catch { /* no importa */ } }
  },
  async uploadPhoto(file) {
    requireStaff();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result); // la foto queda guardada como texto dentro del navegador
      reader.onerror = () => reject(new Error("No se pudo leer la foto."));
      reader.readAsDataURL(file);
    });
  },

  /* Equipo */
  async profiles() {
    requireOwner();
    return db().users.map(publicUser);
  },
  async updateProfile(id, { rol, activo, password }) {
    const me = requireOwner();
    const user = byId(db().users, id, "Ese usuario no existe.");
    if (user.id === me.id && (activo === false || rol === "empleado")) fail("No te podés quitar el acceso a vos mismo.");
    if (rol !== undefined) user.rol = ["dueno", "empleado"].includes(rol) ? rol : fail("Ese rol no existe.");
    if (activo !== undefined) user.activo = Boolean(activo);
    if (password !== undefined) user.password = String(password).length >= 6 ? String(password) : fail("La contraseña tiene que tener al menos 6 caracteres.");
    save();
    return publicUser(user);
  },
  async activity() {
    requireOwner();
    return clone(db().activity);
  },
};
