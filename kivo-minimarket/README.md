# Inmobiliaria · Página de propiedades + Panel de publicaciones

Página de la inmobiliaria (JTC Ventas y Alquileres): propiedades en venta y en alquiler con
fotos, precio y contacto por WhatsApp, y un panel con login para subir y editar las
publicaciones desde el celular.

- **Página y panel:** [React](https://react.dev) armado con [Vite](https://vite.dev).
- **Servidor:** [Express](https://expressjs.com) (Node.js).
- **Base de datos:** [MongoDB](https://www.mongodb.com) (publicaciones, fotos, cuentas, todo).

---

## Cómo está organizado

```
kivo-minimarket/
├── package.json                 Comandos para todo el proyecto (npm run dev, build, start)
│
├── client/                      La página y el panel (React + Vite)
│   ├── index.html               Página pública
│   ├── admin.html               Panel (login + publicaciones)
│   ├── public/img/favicon.svg
│   └── src/
│       ├── api.js               ← Todo lo que se lee o guarda en el servidor pasa por acá
│       ├── styles/              base.css (compartido), card.css (tarjeta de propiedad),
│       │                        site.css (página), admin.css (panel)
│       ├── lib/format.js        Precios, etiquetas (En venta, Vendida...), WhatsApp, fechas
│       ├── site/                Página pública
│       │   ├── App.jsx          Arranque: encabezado, portada, filtros, grilla, servicios, contacto
│       │   ├── Card.jsx         Tarjeta de una propiedad (estilo post de Instagram)
│       │   └── Detail.jsx       Ficha con galería de fotos y botón de WhatsApp
│       └── admin/               Panel
│           ├── App.jsx          Arranque y menú
│           ├── Auth.jsx         Entrar / crear cuenta
│           ├── state.js         Datos cargados y secciones del menú (y quién ve cada una)
│           ├── photo.js         Achica las fotos antes de subirlas
│           ├── ui.jsx           Avisos, ventanas, interruptores
│           └── views/           Una sección por archivo
│               ├── Publicaciones   Subir, editar, marcar vendida, ocultar, borrar
│               ├── Graficas        Números y gráfico de barras (solo dueño)
│               ├── Inmobiliaria    Nombre, frase, WhatsApp, Instagram, servicios
│               └── Equipo          Cuentas y registro de actividad
│
└── server/                      El servidor (Express + MongoDB)
    ├── .env.example             ← Copialo como .env y completalo
    ├── scripts/
    │   ├── seed.js              Carga los datos de la inmobiliaria y publicaciones de ejemplo
    │   └── hacer-dueno.js       Hacer dueño a una cuenta / cambiarle la contraseña
    └── src/
        ├── index.js             Arranque del servidor
        ├── models.js            Qué guarda la base de datos (y con qué campos)
        ├── seed-data.js         Datos de la inmobiliaria y publicaciones de ejemplo
        ├── auth.js              Sesión y permisos (visitante / agente / dueño)
        ├── activity.js          Registro de quién hizo qué
        ├── http.js              Errores, límites de uso, fechas
        └── routes/              Una parte de la API por archivo
            ├── auth.js  propiedades.js  settings.js  team.js
```

**Reglas para que el código siga prolijo:**
- Estilos en `client/src/styles/`. Cada componente de React o archivo hace una sola cosa y empieza con un comentario que dice qué hace.
- La página y el panel nunca hablan con MongoDB directo: siempre a través de `client/src/api.js` → servidor.
- Los permisos se chequean en el servidor (`server/src/auth.js`), nunca solo en la página.
- Nombres en castellano para lo del negocio (`propiedades`, `precio`) y en inglés para lo técnico (`render`, `init`).
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
     La dirección es `mongodb://127.0.0.1:27017/inmobiliaria`.

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
npm run seed                     # carga los datos de la inmobiliaria y 4 publicaciones de ejemplo
npm run dev                      # prende el servidor y la página
```

Abrí **http://localhost:5173** (la página) y **http://localhost:5173/admin.html** (el panel).
Lo que cambies se actualiza solo en el navegador mientras programás.

**Primera cuenta = dueño.** La primera persona que toca "Crear cuenta" en el panel queda
como dueño, ya activa. Todas las que vengan después quedan esperando a que el dueño las active.

**¿Querés probar con datos de ejemplo?** `npm run seed:demo` **borra toda la base** y carga
las publicaciones de ejemplo y dos cuentas: `dueno@demo.uy` y `agente@demo.uy` (contraseña `demo123`).
Solo para tu compu, nunca en el sitio real.

---

## Subir una publicación

1. Entrá al panel (`/admin.html`) con tu mail y contraseña.
2. **Publicaciones → ＋ Nueva publicación.**
3. Agregá las fotos (hasta 20; la primera es la portada, con ★ elegís otra), el título,
   si es **venta o alquiler**, barrio, precio y características (una por renglón).
4. **Publicar.** Aparece en la página al instante.

Para editarla tocá **Editar**. Desde la lista también podés cambiar el estado
(Disponible / Reservada / **Vendida** / **Alquilada**: le pone el cartel en la foto) u ocultarla.
Si apagás "Publicada" queda como borrador y solo se ve en el panel.

El nombre, la frase, el WhatsApp, el Instagram y la lista de servicios se cambian en
**Datos y contacto** (solo el dueño).

Cada propiedad tiene su link para compartir: `tu-pagina.com/#propiedad/<id>`
(es el que va en el mensaje de WhatsApp que manda la gente).

---

## Subirlo a internet

Como ahora hay un servidor, necesita un hosting que corra **Node.js** (no alcanza con uno de
páginas estáticas). Sirven Render, Railway, Fly.io o un VPS. En el hosting:

| | |
|---|---|
| Comando de instalación / build | `npm install && npm run build` |
| Comando de arranque | `npm start` |
| Variables de entorno | `MONGODB_URI`, `JWT_SECRET` (las mismas del `.env`) |

El servidor sirve la página y el panel ya compilados (`client/dist`) y la API en `/api`,
todo desde la misma dirección. Las fotos de las propiedades se guardan dentro de MongoDB,
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

- **Agente:** el dueño entra a **Equipo** → 🔒 **Contraseña** y le pone una nueva.
- **Dueño:** desde la terminal, en la carpeta del proyecto:
  ```bash
  npm run hacer-dueno -w server -- mail@del-dueno.com contraseñaNueva
  ```
  (Sin la contraseña, solo convierte esa cuenta en dueño: sirve para pasarle el panel a otra persona.)

---

## Quién puede hacer qué

| | Dueño | Agente |
|---|:-:|:-:|
| Subir, editar y borrar publicaciones | ✅ | ✅ |
| Marcar vendida / alquilada, ocultar | ✅ | ✅ |
| Gráficas | ✅ | ❌ |
| Nombre, WhatsApp, Instagram, servicios | ✅ | ❌ |
| Activar o quitar usuarios, cambiar contraseñas, ver actividad | ✅ | ❌ |

Los permisos los aplica el servidor (`server/src/auth.js`), no la página:
aunque alguien toque el código del navegador, no puede saltárselos.
