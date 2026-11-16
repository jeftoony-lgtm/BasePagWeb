// =====================================================================
//  KIVO · MODO DEMO (sin Supabase)
//
//  Imita a la base de datos guardando todo en este navegador (localStorage),
//  con los mismos permisos que la base real: el empleado no puede cambiar
//  precios, no ve clientes, etc. Sirve para probar y para mostrar el proyecto.
// =====================================================================

import { createSeed } from "./seed.js";
import { demoAssistant } from "./demo-assistant.js";

const STORAGE_KEY = "kivo-demo-v2";
const USER_KEY = "kivo-demo-user";

const clone = (x) => structuredClone(x);
const wait = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));
const nowISO = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.products) return saved;
  } catch { /* sin localStorage: arrancamos de cero */ }
  return createSeed();
}

export function createDemoData() {
  let db = load();
  let userId = null;
  try { userId = sessionStorage.getItem(USER_KEY); } catch { /* nada */ }

  const orderListeners = [];
  const authListeners = [];

  const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch { /* nada */ } };
  const me = () => db.profiles.find((p) => p.id === userId);
  const isStaff = () => Boolean(me()?.activo);
  const isOwner = () => Boolean(me()?.activo && me().rol === "dueno");
  const require = (check) => { if (!check()) throw new Error("Sin permiso para hacer esto."); };

  function log(tabla, registro, accion, detalle) {
    db.actividad.unshift({ id: db.nextActivityId++, user_id: userId, tabla, registro: String(registro), accion, detalle, created_at: nowISO() });
  }

  function emitOrder(type, order) {
    orderListeners.forEach((cb) => cb(type, clone(order)));
  }

  return {
    demo: true,

    /* ---------- Solo para el modo demo ---------- */
    demoReset() {
      db = createSeed();
      save();
    },
    demoFakeOrder() {
      const names = ["Valentina", "Joaquín", "Camila", "Nicolás", "Florencia"];
      const pick = (list) => list[Math.floor(Math.random() * list.length)];
      const items = [pick(db.products), pick(db.products)].map((p) => ({ id: p.id, nombre: p.nombre, cantidad: 1 + Math.floor(Math.random() * 3), precio: p.precio }));
      const order = {
        id: db.nextOrderId++, created_at: nowISO(), estado: "nuevo",
        nombre: pick(names), telefono: null, modo: Math.random() < 0.7 ? "retiro" : "envio",
        direccion: "Calle de prueba 123", dia: nowISO().slice(0, 10), hora: "22:00", nota: "",
        items, total: items.reduce((sum, i) => sum + i.precio * i.cantidad, 0),
      };
      db.orders.unshift(order);
      save();
      emitOrder("INSERT", order);
    },

    /* ---------- Sesión ---------- */
    async session() {
      return userId ? { user: { id: userId } } : null;
    },
    async signIn(email) {
      await wait(300);
      const profile = db.profiles.find((p) => p.email.toLowerCase() === String(email).toLowerCase().trim());
      if (!profile) throw new Error("Mail o contraseña incorrectos.");
      userId = profile.id;
      try { sessionStorage.setItem(USER_KEY, userId); } catch { /* nada */ }
      authListeners.forEach((cb) => cb({ user: { id: userId } }));
    },
    async signUp(email, _password, nombre) {
      await wait(300);
      if (db.profiles.some((p) => p.email === email)) throw new Error("Ya existe una cuenta con ese mail.");
      db.profiles.push({ id: "u-" + uid(), email, nombre: nombre || email.split("@")[0], rol: "empleado", activo: false, created_at: nowISO() });
      save();
    },
    async signOut() {
      userId = null;
      try { sessionStorage.removeItem(USER_KEY); } catch { /* nada */ }
      authListeners.forEach((cb) => cb(null));
    },
    async resetPassword() {
      await wait(300);
    },
    onAuth(callback) {
      authListeners.push(callback);
    },
    async me() {
      return userId ? clone(me()) : null;
    },

    /* ---------- Catálogo ---------- */
    async categories() {
      return clone(db.categories);
    },
    async products() {
      await wait();
      return clone(db.products.filter((p) => p.activo || isStaff()));
    },
    async saveProduct(p) {
      require(isOwner);
      await wait();
      if (p.id) {
        const current = db.products.find((x) => x.id === p.id);
        const changes = {};
        ["nombre", "precio", "detalle", "categoria", "activo", "emoji", "foto_url"].forEach((k) => {
          if (k in p && current[k] !== p[k]) changes[k] = [current[k], p[k]];
        });
        Object.assign(current, p);
        if (Object.keys(changes).length) log("products", current.id, "update", { ...changes, _nombre: current.nombre });
        save();
        return clone(current);
      }
      const created = { id: uid(), en_stock: true, orden: db.products.length, ...p, precio: Number(p.precio), activo: p.activo !== false };
      db.products.push(created);
      log("products", created.id, "insert", { nombre: created.nombre });
      save();
      return clone(created);
    },
    async deleteProduct(id) {
      require(isOwner);
      const product = db.products.find((x) => x.id === id);
      db.products = db.products.filter((x) => x.id !== id);
      log("products", id, "delete", { nombre: product?.nombre });
      save();
    },
    async setStock(id, enStock) {
      require(isStaff);
      const product = db.products.find((x) => x.id === id);
      if (product.en_stock !== enStock) log("products", id, "update", { en_stock: [product.en_stock, enStock], _nombre: product.nombre });
      product.en_stock = enStock;
      save();
    },
    async uploadPhoto(file) {
      require(isOwner);
      // En demo la foto se achica y se guarda dentro del navegador
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, 480 / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.8));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      });
    },

    /* ---------- Configuración del local ---------- */
    async settings() {
      return clone(db.settings);
    },
    async saveSetting(key, value) {
      require(isOwner);
      await wait();
      const before = db.settings[key];
      db.settings[key] = clone(value);
      log("settings", key, "update", { value: [before, value] });
      save();
    },

    /* ---------- Pedidos ---------- */
    async orders(days = 30) {
      require(isStaff);
      await wait();
      const since = Date.now() - days * 864e5;
      return clone(db.orders.filter((o) => new Date(o.created_at) >= since));
    },
    async setOrderState(id, estado) {
      require(isStaff);
      const order = db.orders.find((o) => o.id === id);
      log("orders", id, "update", { estado: [order.estado, estado] });
      order.estado = estado;
      save();
      emitOrder("UPDATE", order);
    },
    onOrders(callback) {
      orderListeners.push(callback);
    },
    async createOrder(order) {
      const created = { ...order, id: db.nextOrderId++, created_at: nowISO(), estado: "nuevo" };
      db.orders.unshift(created);
      save();
    },

    /* ---------- Ruleta y clientes ---------- */
    async spin(nombre, telefono, acepta) {
      await wait(300);
      const ruleta = db.settings.ruleta;
      if (!ruleta.activa) throw new Error("La ruleta no está activa");
      const tel = String(telefono).replace(/\D/g, "");
      if (!/^09\d{7}$/.test(tel)) throw new Error("Celular inválido");

      let customer = db.customers.find((c) => c.telefono === tel);
      if (customer?.giros.some((g) => g.promo_id === ruleta.promo_id)) throw new Error("Ya giraste en esta promo");
      if (!customer) {
        customer = { id: uid(), nombre, telefono: tel, acepta_promos: Boolean(acepta), created_at: nowISO(), giros: [] };
        db.customers.unshift(customer);
      }

      const indice = Math.floor(Math.random() * ruleta.premios.length);
      const prize = ruleta.premios[indice];
      const code = prize.d ? "KIVO-" + Math.random().toString(36).slice(2, 7).toUpperCase() : null;
      customer.giros.push({ premio: prize.d || null, code, canjeado_at: null, promo_id: ruleta.promo_id, created_at: nowISO() });
      save();
      return { indice, premio: prize.d || null, code };
    },
    async redeem(code) {
      require(isStaff);
      await wait(250);
      code = String(code).trim().toUpperCase();
      for (const customer of db.customers) {
        for (const giro of customer.giros) {
          if (giro.code !== code) continue;
          if (giro.canjeado_at) return { estado: "ya_canjeado", premio: giro.premio, nombre: customer.nombre, fecha: giro.canjeado_at };
          giro.canjeado_at = nowISO();
          log("giros", code, "canje", { premio: giro.premio, cliente: customer.nombre });
          save();
          return { estado: "ok", premio: giro.premio, nombre: customer.nombre };
        }
      }
      return { estado: "no_existe" };
    },
    async customers() {
      require(isOwner);
      await wait();
      return clone(db.customers);
    },
    async logSearch(termino) {
      db.busquedas.unshift({ termino, created_at: nowISO() });
      save();
    },
    async searches() {
      require(isOwner);
      return clone(db.busquedas);
    },

    /* ---------- Asistente ---------- */
    async chat(messages, cart) {
      await wait(700 + Math.random() * 600); // que parezca que escribe
      const products = db.products.filter((p) => p.activo);
      return demoAssistant({ messages, cart, products, settings: db.settings });
    },

    /* ---------- Equipo ---------- */
    async profiles() {
      require(isOwner);
      return clone(db.profiles);
    },
    async updateProfile(id, patch) {
      require(isOwner);
      Object.assign(db.profiles.find((p) => p.id === id), patch);
      save();
    },
    async activity() {
      require(isOwner);
      return clone(db.actividad).map((a) => ({
        ...a,
        profiles: { nombre: db.profiles.find((p) => p.id === a.user_id)?.nombre || "—" },
      }));
    },
  };
}
