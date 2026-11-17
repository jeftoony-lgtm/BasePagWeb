# Kivo Mini Market · Página web + Panel del local + Asistente

Página del minimarket Kivo (Solymar, Uruguay): entrada animada, góndolas, canasta con
pedido por WhatsApp, ruleta de promos, asistente con IA y un panel para que el dueño
y el personal manejen todo desde el celular.

- **Página y panel:** [React](https://react.dev) armado con [Vite](https://vite.dev).
- **Servidor:** [Express](https://expressjs.com) (Node.js).
- **Base de datos:** [MongoDB](https://www.mongodb.com) (productos, pedidos, fotos, cuentas, todo).

---

## Cómo está organizado

```
kivo-minimarket/
├── package.json                 Comandos para todo el proyecto (npm run dev, build, start)
│
├── client/                      La página y el panel (React + Vite)
│   ├── index.html               Página pública
│   ├── admin.html               Panel del local
│   ├── public/img/favicon.svg
│   └── src/
│       ├── api.js               ← Todo lo que se lee o guarda en el servidor pasa por acá
│       ├── styles/              base.css (compartido), site.css (página), admin.css (panel)
│       ├── lib/                 format.js (precios, fechas) y schedule.js (horarios)
│       ├── site/                Página pública, una parte por archivo
│       │   ├── App.jsx          Arranque: carga los datos y arma la página
│       │   ├── store.jsx        Productos y ajustes cargados
│       │   ├── cart.jsx         La canasta (agregar, sacar, animación)
│       │   ├── Topbar.jsx  Hero.jsx  hero-motion.js  hero-scene.svg   Entrada animada
│       │   ├── Catalog.jsx      Cinta de avisos, combo y góndolas
│       │   ├── Sections.jsx     Encargos, horarios, mapa y pie
│       │   ├── CartDrawer.jsx   Canasta y pedido por WhatsApp
│       │   ├── Ruleta.jsx       Ruleta de promos
│       │   └── Assistant.jsx    Chat del asistente
│       └── admin/               Panel
│           ├── App.jsx          Arranque, menú y pedidos en vivo
│           ├── Auth.jsx         Entrar / crear cuenta
│           ├── state.js         Datos cargados y secciones del menú (y quién ve cada una)
│           ├── ui.jsx           Avisos, ventanas, interruptores, sonido
│           └── views/           Una sección por archivo
│               ├── Resumen  Pedidos  Productos  Canjear
│               └── Promos   Clientes  Equipo
│
└── server/                      El servidor (Express + MongoDB)
    ├── .env.example             ← Copialo como .env y completalo
    ├── scripts/
    │   ├── seed.js              Carga productos y ajustes iniciales
    │   └── hacer-dueno.js       Hacer dueño a una cuenta / cambiarle la contraseña
    └── src/
        ├── index.js             Arranque del servidor
        ├── models.js            Qué guarda la base de datos (y con qué campos)
        ├── seed-data.js         Productos, categorías y ajustes de ejemplo
        ├── auth.js              Sesión y permisos (visitante / empleado / dueño)
        ├── activity.js          Registro de quién hizo qué
        ├── live.js              Pedidos en vivo para el panel
        ├── http.js              Errores, límites de uso, fechas
        ├── routes/              Una parte de la API por archivo
        │   ├── auth.js  catalog.js  settings.js  orders.js  ruleta.js  team.js
        └── assistant/           El asistente
            ├── route.js         Habla con la IA (Claude)
            ├── prompt.js        Personalidad y datos del local
            ├── tools.js         Lo que la IA puede hacer con la canasta
            └── practice.js      Asistente de práctica (sin IA)
```

**Reglas para que el código siga prolijo:**
- Estilos en `client/src/styles/`. Cada componente de React o archivo hace una sola cosa y empieza con un comentario que dice qué hace.
- La página y el panel nunca hablan con MongoDB directo: siempre a través de `client/src/api.js` → servidor.
- Los permisos se chequean en el servidor (`server/src/auth.js`), nunca solo en la página.
- Nombres en castellano para lo del negocio (`pedidos`, `precio`) y en inglés para lo técnico (`render`, `init`).
- Sangría de 2 espacios.

---

## Lo que necesitás instalar (una sola vez)

1. **Node.js** versión 20 o más nueva (la "LTS"): [nodejs.org](https://nodejs.org).
   Para ver si ya lo tenés: abrí una terminal y escribí `node -v`.
2. **MongoDB**, una de las dos:
   - **En la nube, gratis (recomendado):** [MongoDB Atlas](https://www.mongodb.com/atlas) → crear cuenta →
     crear un cluster **M0 (Free)** → *Database Access*: crear un usuario con contraseña →
     *Network Access*: agregar tu IP (o `0.0.0.0/0` para que el hosting pueda entrar) →
     *Connect → Drivers*: copiar la dirección `mongodb+srv://...`.
   - **En tu compu:** instalá [MongoDB Community](https://www.mongodb.com/try/download/community).
     La dirección es `mongodb://127.0.0.1:27017/kivo`.

---

## Probarlo en tu compu

En una terminal, dentro de la carpeta del proyecto:

```bash
npm install                      # baja todo lo que hace falta (la primera vez tarda un poco)
cp server/.env.example server/.env
```

Abrí `server/.env` y completá `MONGODB_URI` (la dirección de MongoDB) y `JWT_SECRET`
(cualquier texto largo y al azar). Después:

```bash
npm run seed                     # carga productos, categorías y ajustes iniciales
npm run dev                      # prende el servidor y la página
```

Abrí **http://localhost:5173** (la página) y **http://localhost:5173/admin.html** (el panel).
Lo que cambies se actualiza solo en el navegador mientras programás.

**Primera cuenta = dueño.** La primera persona que toca "Crear cuenta" en el panel queda
como dueño, ya activa. Todas las que vengan después quedan esperando a que el dueño las active.

**¿Querés probar con datos de ejemplo?** `npm run seed:demo` **borra toda la base** y carga
pedidos, clientes y dos cuentas: `dueno@kivo.uy` y `tita@kivo.uy` (contraseña `demo123`).
Solo para tu compu, nunca en el sitio real.

---

## Asistente con IA

El chat entiende lo que la gente escribe ("algo para una picada de 6", "2 cocas grandes"),
arma la canasta y la manda a enviar por WhatsApp. Usa **Claude Haiku 5.5** de Anthropic,
el modelo más económico: cada mensaje cuesta una fracción de centavo de dólar.

La IA corre en el servidor (`server/src/assistant/`), no en la página, para que la clave quede escondida.

1. **Clave de Anthropic:** creá una cuenta en console.anthropic.com, cargá saldo y creá una
   API key. Recomendado: poné un **límite de gasto mensual** en la consola.
2. Pegala en `server/.env` → `ANTHROPIC_API_KEY=sk-ant-...` y reiniciá el servidor.

Sin clave, el chat funciona igual con un **asistente de práctica** (reglas simples, sin IA).

**Control desde el panel** (Promos y local → Asistente del chat): prenderlo o apagarlo,
cambiarle el nombre y escribirle lo que tiene que saber (envíos, pagos, novedades).
Siempre conoce los productos, precios, stock, horarios y el combo del día.

**Protección del gasto** (se ajusta en `LIMITS`, arriba de `server/src/assistant/route.js`):
60 mensajes por persona por día y 2.000 por día en total. La IA nunca inventa productos ni
precios: solo puede sumar lo que está en el catálogo y con stock.

---

## Subirlo a internet

Como ahora hay un servidor, necesita un hosting que corra **Node.js** (no alcanza con uno de
páginas estáticas). Sirven Render, Railway, Fly.io o un VPS. En el hosting:

| | |
|---|---|
| Comando de instalación / build | `npm install && npm run build` |
| Comando de arranque | `npm start` |
| Variables de entorno | `MONGODB_URI`, `JWT_SECRET`, `ANTHROPIC_API_KEY` (las mismas del `.env`) |

El servidor sirve la página y el panel ya compilados (`client/dist`) y la API en `/api`,
todo desde la misma dirección. Las fotos de los productos se guardan dentro de MongoDB,
así que no se pierden aunque el hosting se reinicie.

El `.env` **nunca** se sube a GitHub (ya está en `.gitignore`): las claves se cargan en el panel del hosting.

---

## Trabajar juntos con GitHub

1. github.com → **New repository** → `kivo-minimarket` → **Private** → Create.
2. Subí el proyecto (con GitHub Desktop o `git push`). No subas `node_modules` ni `.env`.
3. **Settings → Collaborators → Add people** → el usuario de GitHub del otro.
4. Si conectás el repo al hosting, se publica solo en cada cambio.

Para no pisarse: antes de cambiar algo, bajá lo último (`git pull` o "Fetch origin" en
GitHub Desktop); al terminar, subí con un mensaje claro ("Cambio el precio del combo").

---

## Contraseñas olvidadas

- **Empleado:** el dueño entra a **Equipo** → 🔒 **Contraseña** y le pone una nueva.
- **Dueño:** desde la terminal, en la carpeta del proyecto:
  ```bash
  npm run hacer-dueno -w server -- mail@del-dueno.com contraseñaNueva
  ```
  (Sin la contraseña, solo convierte esa cuenta en dueño: sirve para pasarle el local a otra persona.)

---

## Quién puede hacer qué

| | Dueño | Empleado |
|---|:-:|:-:|
| Ver y mover pedidos | ✅ | ✅ |
| Marcar sin stock | ✅ | ✅ |
| Canjear códigos de la ruleta | ✅ | ✅ |
| Precios, fotos, productos nuevos | ✅ | ❌ |
| Ruleta, combo, asistente, horarios, avisos, cerrado hoy | ✅ | ❌ |
| Lista de clientes, resumen, actividad | ✅ | ❌ |
| Activar o quitar usuarios, cambiar contraseñas | ✅ | ❌ |

Los permisos los aplica el servidor (`server/src/auth.js`), no la página:
aunque alguien toque el código del navegador, no puede saltárselos.
