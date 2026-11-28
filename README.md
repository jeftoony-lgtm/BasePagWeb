# Luz Serena Residencial · Página web + Blog + Panel del equipo

Página del residencial para adultos mayores **Luz Serena** (Melo, Cerro Largo): portada con
"la luz que acompaña", servicios, agenda de la semana, fotos del hogar, blog, preguntas
frecuentes y formulario para agendar visitas. Y un panel para que el dueño y el equipo
manejen todo desde el celular.

> Rama del proyecto base **BasePagWeb**. Trabajar en `luzserena_develop`; publicar desde `luzserena_master`.

> **Vista previa para el cliente:** https://jeftoony-lgtm.github.io/BasePagWeb/ (se actualiza sola al subir `luzserena_master`;
> sin servidor: blog y agenda de ejemplo, el formulario no guarda y no hay panel).

- **Página y panel:** [React](https://react.dev) armado con [Vite](https://vite.dev).
- **Servidor:** [Express](https://expressjs.com) (Node.js).
- **Base de datos:** [MongoDB](https://www.mongodb.com) (consultas, residentes, blog, fotos, cuentas).

---

## Cómo está organizado

```
BasePagWeb/  (rama luzserena_develop)
├── client/                      La página y el panel (React + Vite)
│   ├── index.html               Página pública
│   ├── admin.html               Panel del equipo
│   ├── public/img/              logo.webp, favicon.svg y fotos/ (fotos del residencial)
│   └── src/
│       ├── api.js               ← Todo lo que se lee o guarda en el servidor pasa por acá
│       ├── styles/              site.css (página), base.css + admin.css (panel)
│       ├── lib/format.js        Fechas en hora de Uruguay y ayudas chicas
│       ├── site/                Página pública, una parte por archivo
│       │   ├── App.jsx          Arranque: carga ajustes y blog, cuenta la visita
│       │   ├── content.js       ← Textos fijos: servicios, preguntas, fotos, contacto
│       │   ├── store.jsx        Lo que la página tiene cargado
│       │   ├── Sky.jsx          El sol que cruza la pantalla al bajar
│       │   ├── Topbar.jsx  Hero.jsx  Sections.jsx  Semana.jsx  Blog.jsx  Visita.jsx
│       │   └── icons.jsx        Íconos de línea
│       └── admin/               Panel
│           ├── App.jsx          Arranque, menú y aviso de consultas nuevas
│           ├── Auth.jsx         Entrar / crear cuenta
│           ├── state.js         Datos cargados y secciones del menú (y quién ve cada una)
│           ├── ui.jsx           Avisos, ventanas, interruptores, sonido
│           ├── photo.js         Achica las fotos antes de subirlas
│           └── views/           Resumen  Consultas  Residentes  Blog  Actividades  Ajustes  Equipo
│
└── server/                      El servidor (Express + MongoDB)
    ├── .env.example             ← Copialo como .env y completalo
    ├── scripts/
    │   ├── seed.js              Carga ajustes y primeras publicaciones
    │   └── hacer-dueno.js       Hacer dueño a una cuenta / cambiarle la contraseña
    └── src/
        ├── index.js             Arranque del servidor
        ├── models.js            Qué guarda la base de datos (y con qué campos)
        ├── seed-data.js         Ajustes por defecto (plazas, WhatsApp, agenda) y posts de ejemplo
        ├── auth.js              Sesión y permisos (visitante / equipo / dueño)
        ├── activity.js          Registro de quién hizo qué
        ├── http.js              Errores, límites de uso, fechas
        └── routes/              auth  settings  photos  leads  residents  posts  stats  team
```

---

## Probarlo en tu compu

En una terminal, dentro de la carpeta `luzserena`:

```bash
cd luzserena
```

Y después:

```bash
npm install
cp server/.env.example server/.env
```

Abrí `server/.env` y completá `MONGODB_URI` (usá una base **nueva**, por ejemplo `.../luzserena`,
para no mezclar con otro cliente) y `JWT_SECRET` (cualquier texto largo y al azar). Después:

```bash
npm run seed:demo                # BORRA esa base y carga datos de prueba (solo en tu compu)
npm run dev                      # prende el servidor y la página
```

- Página: **http://localhost:5173**
- Panel: **http://localhost:5173/admin.html** → `dueno@luzserena.uy` / `demo123`
  (o `equipo@luzserena.uy` / `demo123` para ver lo que ve alguien del equipo)

Para el sitio real se usa `npm run seed` (no borra nada) y la **primera cuenta que se crea
en el panel queda como dueño**.

---

## Lo que hace el panel

| Sección | Para qué sirve | Quién |
|---|---|:-:|
| **Resumen** | Plazas ocupadas, consultas sin responder, visitas a la página y toques en WhatsApp (gráfico de 30 días), próximos cumpleaños, lo más leído del blog | Dueño |
| **Consultas** | Cada familia que completa "Agendar una visita". Estado (nueva → contactada → visita → ingresó), notas, llamar o WhatsApp con un toque, descargar para Excel. Suena cuando entra una nueva | Todos |
| **Residentes** | Ficha simple: habitación, fechas, familiar de contacto, observaciones | Todos (borrar: dueño) |
| **Blog** | Publicar con foto desde el celular; aparece al instante en la página. Borradores | Todos |
| **Actividades** | La agenda de la semana que se ve en la página | Todos |
| **Ajustes** | Plazas (cambian el cartel "Plazas disponibles"), WhatsApp y teléfono | Dueño |
| **Equipo** | Activar cuentas, roles, contraseñas y registro de actividad | Dueño |

Los permisos los aplica el servidor (`server/src/auth.js`), no la página.

Las estadísticas no guardan datos de las personas: solo suman 1 por día a "visitas" o "WhatsApp".

---

## Subirlo a internet

Necesita un hosting que corra **Node.js** (Render, Railway, Fly.io o un VPS):

| | |
|---|---|
| Comando de instalación / build | `npm install && npm run build` |
| Comando de arranque | `npm start` |
| Variables de entorno | `MONGODB_URI`, `JWT_SECRET` (las mismas del `.env`) |

El `.env` **nunca** se sube a GitHub (ya está en `.gitignore`).

---

## Contraseñas olvidadas

- **Alguien del equipo:** el dueño entra a **Equipo** → 🔒 **Contraseña** y le pone una nueva.
- **Dueño:** `npm run hacer-dueno -w server -- mail@del-dueno.com contraseñaNueva`

---

## Pendiente con el residencial

- Fotos reales en buena calidad (las de `client/public/img/fotos/` salieron de Instagram).
- Confirmar teléfonos (WhatsApp 091 411 961 / fijo 098 794 970) desde **Ajustes**.
- Revisar las respuestas de preguntas frecuentes (`client/src/site/content.js`) y la agenda de la semana.
