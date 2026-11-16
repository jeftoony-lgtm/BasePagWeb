# Kivo Mini Market · Página web + Panel del local + Asistente

Página del minimarket Kivo (Solymar, Uruguay): entrada animada, góndolas, canasta con
pedido por WhatsApp, ruleta de promos, asistente con IA y un panel para que el dueño
y el personal manejen todo desde el celular.

Hecho con HTML, CSS y JavaScript sin frameworks ni compilación: se abre y funciona.
Los datos viven en [Supabase](https://supabase.com) (base de datos, login y fotos).

---

## Cómo está organizado

```
kivo-minimarket/
├── index.html                  Página pública (solo estructura, sin estilos ni lógica)
├── admin.html                  Panel del local
├── img/favicon.svg
│
├── css/
│   ├── base.css                Colores, letras, botones, campos (compartido)
│   ├── site.css                Estilos de la página, en el mismo orden que la página
│   └── admin.css               Estilos del panel
│
├── js/
│   ├── config.js               ← Claves de Supabase (vacías = modo demo)
│   ├── data/                   Todo lo que se lee o guarda pasa por acá
│   │   ├── index.js            Elige Supabase o modo demo
│   │   ├── supabase.js         Datos reales
│   │   ├── demo.js             Modo demo (guarda en el navegador)
│   │   ├── demo-assistant.js   Asistente de práctica, sin IA
│   │   └── seed.js             Productos y ajustes de ejemplo
│   ├── site/                   Página pública, una parte por archivo
│   │   ├── main.js             Arranque: carga datos y prende cada parte
│   │   ├── hero.js             Entrada: cortina, luces, carrito, zoom
│   │   ├── status.js           Abierto/cerrado y tabla de horarios
│   │   ├── schedule.js         Cálculos de horarios
│   │   ├── catalog.js          Cinta de avisos, combo y góndolas
│   │   ├── cart.js             Canasta y pedido por WhatsApp
│   │   ├── ruleta.js           Ruleta de promos
│   │   ├── assistant.js        Chat del asistente
│   │   ├── store.js            Productos y ajustes cargados
│   │   └── utils.js            Funciones chicas compartidas
│   └── admin/                  Panel
│       ├── main.js             Arranque, menú y navegación
│       ├── auth.js             Entrar / crear cuenta
│       ├── nav.js              Secciones del menú (y quién ve cada una)
│       ├── state.js            Datos cargados en el panel
│       ├── ui.js               Avisos, ventanas, fechas, sonido
│       └── views/              Una sección por archivo
│           ├── resumen.js  pedidos.js  productos.js  canjear.js
│           └── promos.js   clientes.js  equipo.js
│
└── supabase/
    ├── schema.sql              Base de datos: tablas, permisos, datos iniciales
    └── functions/asistente/
        └── index.ts            El asistente con IA (corre en el servidor)
```

**Reglas para que el código siga prolijo:**
- HTML solo con estructura. Estilos en `css/`, lógica en `js/`.
- Cada archivo de JS hace una sola cosa y empieza con un comentario que dice qué hace.
- Nombres en castellano para lo del negocio (`pedidos`, `precio`) y en inglés para lo técnico (`render`, `init`).
- Sangría de 2 espacios.

---

## Probarlo en tu compu

1. Abrí la carpeta en **VS Code**.
2. Instalá la extensión **Live Server**.
3. Clic derecho en `index.html` → **Open with Live Server**. (El panel: `admin.html`.)

> Los archivos usan módulos de JavaScript, así que **no funcionan con doble clic**:
> hay que abrirlos con Live Server o desde el hosting.

Con `js/config.js` vacío todo funciona en **modo demo**: productos de ejemplo, el panel
con los botones "Entrar como Dueño / como Tita" y un asistente de práctica (sin IA).
Lo que cambies en el panel se ve en la página, en el mismo navegador.

---

## Conectar Supabase (una sola vez)

1. **Proyecto:** supabase.com → New project → nombre `kivo`, región **São Paulo**.
   Guardá la contraseña de la base de datos.
2. **Base de datos:** SQL Editor → New query → pegá todo `supabase/schema.sql` → **Run**.
3. **Claves:** Project Settings → API → copiá **Project URL** y la clave **anon public**
   en `js/config.js`. (La anon es pública a propósito. **Nunca** pongas la `service_role`.)
4. **Login:** Authentication → URL Configuration → **Site URL** = dirección del sitio
   (para probar: `http://127.0.0.1:5500`; después, el dominio real).
5. **Cuenta del dueño:** en `admin.html` → "Crear cuenta" con el mail del dueño → confirmar el mail.
6. **Hacerlo dueño:** en el SQL Editor:
   ```sql
   update public.profiles set rol = 'dueno', activo = true where email = 'MAIL-DEL-DUEÑO';
   ```
7. **Sumar empleados:** que creen su cuenta en `admin.html`; el dueño los activa en **Equipo**.

---

## Asistente con IA

El chat entiende lo que la gente escribe ("algo para una picada de 6", "2 cocas grandes"),
arma la canasta y la manda a enviar por WhatsApp. Usa **Claude Haiku 5.5** de Anthropic,
el modelo más económico: cada mensaje cuesta una fracción de centavo de dólar.

La IA corre en una **función de Supabase** (`supabase/functions/asistente/index.ts`), no en
la página, para que la clave quede escondida. Para prenderla:

1. **Clave de Anthropic:** creá una cuenta en console.anthropic.com, cargá saldo y creá una
   API key. Recomendado: poné un **límite de gasto mensual** en la consola.
2. **Subir la función** (una de las dos):
   - Desde el panel de Supabase → **Edge Functions** → crear una función nueva llamada
     `asistente` → pegar el contenido de `index.ts` → Deploy.
   - O con la terminal: `supabase functions deploy asistente`
3. **Guardar la clave como secreto** (nunca en el código):
   Edge Functions → Secrets → `ANTHROPIC_API_KEY` = tu clave.
   (Terminal: `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`)

Listo: la página usa la IA sola cuando `config.js` tiene las claves de Supabase.

**Control desde el panel** (Promos y local → Asistente del chat): prenderlo o apagarlo,
cambiarle el nombre y escribirle lo que tiene que saber (envíos, pagos, novedades).
Siempre conoce los productos, precios, stock, horarios y el combo del día.

**Protección del gasto** (se ajusta en `LIMITS`, arriba de `index.ts`): 60 mensajes por
persona por día y 2.000 por día en total. La IA nunca inventa productos ni precios:
solo puede sumar lo que está en el catálogo y con stock.

---

## Subirlo a GitHub y trabajar juntos

1. github.com → **New repository** → `kivo-minimarket` → **Private** → Create.
2. **uploading an existing file** → arrastrá **todo el contenido** de esta carpeta → **Commit changes**.
3. **Settings → Collaborators → Add people** → el usuario de GitHub del otro.
4. **Hosting:** es un sitio estático, sirve cualquier hosting (Netlify, Vercel,
   Cloudflare Pages, GitHub Pages o uno propio). Si se conecta el repo, se publica solo
   en cada cambio.
5. Con el dominio listo: Supabase → Authentication → URL Configuration → **Site URL** = dominio real.

Para no pisarse: antes de cambiar algo, bajá lo último (`git pull` o "Fetch origin" en
GitHub Desktop); al terminar, subí con un mensaje claro ("Cambio el precio del combo").

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
| Activar o quitar usuarios | ✅ | ❌ |

Los permisos los aplica la base de datos (Row Level Security), no la página:
aunque alguien toque el código del navegador, no puede saltárselos.
