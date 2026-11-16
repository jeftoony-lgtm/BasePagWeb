-- =====================================================================
--  KIVO MINI MARKET · Base de datos (Supabase / PostgreSQL)
--  Cómo usarlo: Supabase → SQL Editor → New query → pegar todo → Run.
--  Se corre una sola vez en un proyecto nuevo.
-- =====================================================================

-- ---------- Roles y perfiles ----------
create type rol_usuario as enum ('dueno', 'empleado');

create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text,
  nombre      text not null default '',
  rol         rol_usuario not null default 'empleado',
  activo      boolean not null default false,   -- el dueño activa a cada usuario nuevo
  created_at  timestamptz not null default now()
);

-- Cuando alguien crea cuenta, se le hace un perfil INACTIVO (no puede hacer nada hasta que el dueño lo active)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, nombre)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and activo);
$$;

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and activo and rol = 'dueno');
$$;

-- ---------- Catálogo ----------
create table public.categories (
  id      text primary key,
  nombre  text not null,
  emoji   text not null default '🛒',
  orden   int  not null default 0
);

create table public.products (
  id          uuid primary key default gen_random_uuid(),
  categoria   text not null references public.categories on update cascade,
  nombre      text not null,
  detalle     text not null default '',
  precio      int  not null check (precio >= 0),        -- en pesos uruguayos, sin decimales
  emoji       text not null default '🛒',
  color       text not null default '#f4f4f4',
  foto_url    text,
  en_stock    boolean not null default true,
  activo      boolean not null default true,            -- false = no se muestra en la página
  orden       int not null default 0,
  updated_at  timestamptz not null default now()
);

-- ---------- Configuración (combo, ruleta, horarios, avisos, whatsapp, cerrado) ----------
create table public.settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

-- ---------- Pedidos ----------
create table public.orders (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  nombre      text not null check (length(nombre) between 1 and 80),
  telefono    text,
  modo        text not null check (modo in ('retiro', 'envio')),
  direccion   text,
  dia         date,
  hora        text,
  nota        text check (length(nota) <= 500),
  items       jsonb not null,                -- [{id, nombre, cantidad, precio}]
  total       int not null default 0,
  estado      text not null default 'nuevo' check (estado in ('nuevo','preparando','listo','entregado','cancelado')),
  updated_at  timestamptz not null default now()
);

-- ---------- Clientes y ruleta ----------
create table public.customers (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null,
  telefono       text not null unique,
  acepta_promos  boolean not null default false,
  created_at     timestamptz not null default now()
);

create table public.giros (
  id            bigint generated always as identity primary key,
  customer_id   uuid not null references public.customers on delete cascade,
  promo_id      text not null,
  indice        int not null,
  premio        text,                         -- null = no ganó
  code          text unique,
  created_at    timestamptz not null default now(),
  vence         timestamptz,
  canjeado_at   timestamptz,
  canjeado_por  uuid references public.profiles,
  unique (customer_id, promo_id)              -- un giro por persona por promo
);

-- ---------- Búsquedas sin resultado (para saber qué piden y no hay) ----------
create table public.busquedas (
  id          bigint generated always as identity primary key,
  termino     text not null check (length(termino) between 2 and 60),
  created_at  timestamptz not null default now()
);

-- ---------- Registro de actividad (quién hizo qué) ----------
create table public.actividad (
  id          bigint generated always as identity primary key,
  user_id     uuid references public.profiles on delete set null,
  tabla       text not null,
  registro    text,
  accion      text not null,
  detalle     jsonb,
  created_at  timestamptz not null default now()
);

-- =====================================================================
--  Triggers: updated_at + registro de actividad
-- =====================================================================
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger t_products_touch before update on public.products for each row execute function public.touch_updated_at();
create trigger t_orders_touch   before update on public.orders   for each row execute function public.touch_updated_at();
create trigger t_settings_touch before update on public.settings for each row execute function public.touch_updated_at();

create or replace function public.log_cambio() returns trigger
language plpgsql security definer set search_path = public as $$
declare d jsonb; rec jsonb;
begin
  if auth.uid() is null then return coalesce(new, old); end if;   -- solo cambios hechos por el personal
  rec := to_jsonb(coalesce(new, old));
  if tg_op = 'UPDATE' then
    select jsonb_object_agg(o.key, jsonb_build_array(o.value, n.value)) into d
      from jsonb_each(to_jsonb(old)) o join jsonb_each(to_jsonb(new)) n using (key)
     where o.value is distinct from n.value and o.key not in ('updated_at');
    if d is null then return new; end if;
  else
    d := jsonb_build_object('nombre', rec->>'nombre');
  end if;
  insert into actividad (user_id, tabla, registro, accion, detalle)
  values (auth.uid(), tg_table_name, coalesce(rec->>'id', rec->>'key'), lower(tg_op), d);
  return coalesce(new, old);
end $$;

create trigger t_products_log after insert or update or delete on public.products for each row execute function public.log_cambio();
create trigger t_orders_log   after update on public.orders   for each row execute function public.log_cambio();
create trigger t_settings_log after update on public.settings for each row execute function public.log_cambio();

-- =====================================================================
--  Funciones seguras (el navegador las llama, pero corren en el servidor)
-- =====================================================================

-- Girar la ruleta: el premio se sortea en el servidor (nadie puede hacer trampa desde el navegador)
create or replace function public.jugar_ruleta(p_nombre text, p_telefono text, p_acepta boolean)
returns json language plpgsql security definer set search_path = public as $$
declare cfg jsonb; premios jsonb; n int; idx int; prem jsonb; cust uuid; v_code text; tel text;
begin
  select value into cfg from settings where key = 'ruleta';
  if cfg is null or not coalesce((cfg->>'activa')::boolean, false) then
    raise exception 'La ruleta no está activa';
  end if;
  if coalesce(cfg->>'hasta', '') <> '' and (now() at time zone 'America/Montevideo')::date > (cfg->>'hasta')::date then
    raise exception 'Esta promo ya terminó';
  end if;
  tel := regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g');
  if tel !~ '^09[0-9]{7}$' then raise exception 'Celular inválido'; end if;
  if length(trim(coalesce(p_nombre, ''))) = 0 then raise exception 'Falta el nombre'; end if;

  insert into customers (nombre, telefono, acepta_promos)
  values (trim(p_nombre), tel, coalesce(p_acepta, false))
  on conflict (telefono) do update
    set nombre = excluded.nombre, acepta_promos = customers.acepta_promos or excluded.acepta_promos
  returning id into cust;

  if exists (select 1 from giros where customer_id = cust and promo_id = cfg->>'promo_id') then
    raise exception 'Ya giraste en esta promo';
  end if;

  premios := cfg->'premios';
  n := jsonb_array_length(premios);
  idx := floor(random() * n)::int;
  prem := premios->idx;

  if coalesce(prem->>'d', '') <> '' then
    loop
      v_code := 'KIVO-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5));
      exit when not exists (select 1 from giros where code = v_code);
    end loop;
  end if;

  insert into giros (customer_id, promo_id, indice, premio, code, vence)
  values (cust, cfg->>'promo_id', idx, nullif(prem->>'d', ''), v_code,
          case when v_code is null then null else now() + interval '7 days' end);

  return json_build_object('indice', idx, 'premio', nullif(prem->>'d', ''), 'code', v_code);
end $$;

-- Canjear un código en caja (dueño o empleado)
create or replace function public.canjear_codigo(p_code text)
returns json language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if not is_staff() then raise exception 'Sin permiso'; end if;
  select g.*, c.nombre into r from giros g join customers c on c.id = g.customer_id
   where g.code = upper(trim(p_code));
  if not found then return json_build_object('estado', 'no_existe'); end if;
  if r.canjeado_at is not null then
    return json_build_object('estado', 'ya_canjeado', 'premio', r.premio, 'nombre', r.nombre, 'fecha', r.canjeado_at);
  end if;
  if r.vence < now() then
    return json_build_object('estado', 'vencido', 'premio', r.premio, 'nombre', r.nombre, 'fecha', r.vence);
  end if;
  update giros set canjeado_at = now(), canjeado_por = auth.uid() where id = r.id;
  insert into actividad (user_id, tabla, registro, accion, detalle)
  values (auth.uid(), 'giros', r.code, 'canje', jsonb_build_object('premio', r.premio, 'cliente', r.nombre));
  return json_build_object('estado', 'ok', 'premio', r.premio, 'nombre', r.nombre);
end $$;

-- Marcar "sin stock" / "hay stock" (dueño o empleado)
create or replace function public.set_stock(p_id uuid, p_stock boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'Sin permiso'; end if;
  update products set en_stock = p_stock where id = p_id;
end $$;

-- Contador de mensajes del asistente (para limitar el gasto de la IA).
-- Solo lo usa la función del servidor; nadie lo puede leer desde la página.
create table public.asistente_uso (
  dia       date not null default (now() at time zone 'America/Montevideo')::date,
  clave     text not null,             -- 'total' o una IP anonimizada
  mensajes  int  not null default 0,
  primary key (dia, clave)
);

create or replace function public.contar_uso_asistente(p_clave text)
returns int language sql security definer set search_path = public as $$
  insert into asistente_uso (clave, mensajes) values (p_clave, 1)
  on conflict (dia, clave) do update set mensajes = asistente_uso.mensajes + 1
  returning mensajes;
$$;
revoke execute on function public.contar_uso_asistente(text) from public, anon, authenticated;
grant execute on function public.contar_uso_asistente(text) to service_role;

-- =====================================================================
--  Permisos (Row Level Security)
-- =====================================================================
alter table public.profiles   enable row level security;
alter table public.categories enable row level security;
alter table public.products   enable row level security;
alter table public.settings   enable row level security;
alter table public.orders     enable row level security;
alter table public.customers  enable row level security;
alter table public.giros      enable row level security;
alter table public.busquedas  enable row level security;
alter table public.actividad  enable row level security;
alter table public.asistente_uso enable row level security;  -- sin políticas: nadie de afuera entra

-- Perfiles: cada uno ve el suyo; el dueño ve y edita todos
create policy "ver mi perfil"         on profiles for select using (id = auth.uid() or is_owner());
create policy "dueño edita perfiles"  on profiles for update using (is_owner()) with check (is_owner());

-- Catálogo: todos ven lo activo; el personal ve todo; solo el dueño modifica
create policy "público ve categorías"   on categories for select using (true);
create policy "dueño edita categorías"  on categories for all using (is_owner()) with check (is_owner());
create policy "público ve productos"    on products for select using (activo or is_staff());
create policy "dueño crea productos"    on products for insert with check (is_owner());
create policy "dueño edita productos"   on products for update using (is_owner()) with check (is_owner());
create policy "dueño borra productos"   on products for delete using (is_owner());

-- Configuración: todos la leen (la página la necesita); solo el dueño la cambia
create policy "público ve config"   on settings for select using (true);
create policy "dueño edita config"  on settings for all using (is_owner()) with check (is_owner());

-- Pedidos: cualquiera puede crear uno nuevo; solo el personal los ve y los mueve
create policy "cliente crea pedido"   on orders for insert with check (estado = 'nuevo');
create policy "personal ve pedidos"   on orders for select using (is_staff());
create policy "personal mueve pedidos" on orders for update using (is_staff()) with check (is_staff());
create policy "dueño borra pedidos"   on orders for delete using (is_owner());

-- Clientes y giros: solo el dueño (la ruleta y el canje pasan por las funciones de arriba)
create policy "dueño ve clientes"  on customers for select using (is_owner());
create policy "dueño borra clientes" on customers for delete using (is_owner());
create policy "dueño ve giros"     on giros for select using (is_owner());

-- Búsquedas: cualquiera registra; el dueño las ve
create policy "registrar búsqueda" on busquedas for insert with check (true);
create policy "dueño ve búsquedas" on busquedas for select using (is_owner());

-- Actividad: solo el dueño la ve
create policy "dueño ve actividad" on actividad for select using (is_owner());

-- Las funciones las puede llamar cualquiera, pero adentro chequean permisos
grant execute on function public.jugar_ruleta(text, text, boolean) to anon, authenticated;
grant execute on function public.canjear_codigo(text) to authenticated;
grant execute on function public.set_stock(uuid, boolean) to authenticated;

-- Pedidos en vivo en el panel
alter publication supabase_realtime add table public.orders;

-- =====================================================================
--  Fotos de productos (Storage)
-- =====================================================================
insert into storage.buckets (id, name, public) values ('productos', 'productos', true)
on conflict (id) do nothing;

create policy "dueño sube fotos"   on storage.objects for insert with check (bucket_id = 'productos' and public.is_owner());
create policy "dueño cambia fotos" on storage.objects for update using (bucket_id = 'productos' and public.is_owner());
create policy "dueño borra fotos"  on storage.objects for delete using (bucket_id = 'productos' and public.is_owner());

-- =====================================================================
--  Datos iniciales (los mismos del prototipo; precios de ejemplo)
-- =====================================================================
insert into categories (id, nombre, emoji, orden) values
  ('bebidas','Bebidas','🥤',1), ('snacks','Snacks','🥔',2), ('almacen','Almacén','🧉',3),
  ('fiambre','Fiambrería','🧀',4), ('grido','Helados Grido','🍦',5), ('mundial','Mundial 2026','⚽',6),
  ('limpieza','Limpieza','🧽',7);

insert into products (categoria, nombre, detalle, precio, emoji, color, orden) values
  ('bebidas','Coca-Cola 2,25 L','Retornable',165,'🥤','#ffe1df',1),
  ('bebidas','Coca-Cola 600 ml','Bien fría',75,'🥤','#ffe1df',2),
  ('bebidas','Agua Salus 2,25 L','Sin gas',85,'💧','#e1f0ff',3),
  ('bebidas','Cerveza Pilsen 1 L','Retornable',150,'🍺','#fff3d6',4),
  ('bebidas','Cerveza Patricia 1 L','Retornable',155,'🍺','#fff3d6',5),
  ('snacks','Lay''s Clásicas','Bolsa grande',189,'🥔','#fff7c9',1),
  ('snacks','Maní salado','200 g',95,'🥜','#f6e8d6',2),
  ('snacks','Chocolate','Tableta 100 g',120,'🍫','#efe0d6',3),
  ('snacks','Galletitas dulces','Paquete',70,'🍪','#f6e8d6',4),
  ('almacen','Yerba Canarias','1 kg',290,'🧉','#e3f1da',1),
  ('almacen','Fideos tallarines','500 g',65,'🍝','#fff3d6',2),
  ('almacen','Arroz','1 kg',70,'🍚','#f4f4f4',3),
  ('almacen','Aceite de girasol','900 ml',140,'🫒','#f2f6d8',4),
  ('almacen','Pan flauta','Del día',45,'🥖','#f6e8d6',5),
  ('fiambre','Salame','200 g',160,'🍖','#ffe1df',1),
  ('fiambre','Queso dambo','300 g',210,'🧀','#fff7c9',2),
  ('fiambre','Jamón cocido','200 g',170,'🥓','#ffe8ef',3),
  ('grido','Grido Tentación Granizado','1 L',390,'🍨','#efe0d6',1),
  ('grido','Palito helado Grido','Unidad',60,'🍦','#e1f0ff',2),
  ('mundial','Álbum Mundial 2026','Tapa blanda',250,'📒','#e3f1da',1),
  ('mundial','Sobre de figuritas','Mundial 2026',60,'✨','#fff3d6',2),
  ('limpieza','Detergente','750 ml',95,'🧴','#e1f0ff',1),
  ('limpieza','Papel higiénico','Pack x4',130,'🧻','#f4f4f4',2),
  ('limpieza','Esponjas','Pack x3',55,'🧽','#fff7c9',3);

insert into settings (key, value) values
  ('whatsapp', '"59899000000"'),
  ('cerrado',  '{"activo": false, "motivo": ""}'),
  ('asistente', '{"activo": true, "nombre": "Kivi", "notas": "Hacemos envíos dentro de Solymar; el costo se coordina por WhatsApp. Aceptamos efectivo, débito y transferencia."}'),
  ('horarios', '{"0":[["10:00","19:00"]],
                 "1":[["10:00","14:30"],["15:00","23:00"]],
                 "2":[["10:00","14:30"],["15:00","23:00"]],
                 "3":[["10:00","14:30"],["15:00","23:00"]],
                 "4":[["10:00","14:30"],["15:00","24:00"]],
                 "5":[["10:00","14:30"],["15:00","24:00"]],
                 "6":[["10:00","24:00"]]}'),
  ('avisos',   '["🍦 Ahora con Grido", "⚽ Álbum y figuritas del Mundial 2026", "🧀 Pack Picada Mundial $650", "🛒 Pedí online, retirá en el local", "📍 Oscar Gestido y Paul Harris"]'),
  ('combo',    '{"activo": true, "titulo": "Promo pack Picada Mundial", "subtitulo": "Todo lo que necesitás para la picada, en un solo toque.",
                 "etiqueta": "⚽ Para ver el partido", "precio": 650,
                 "items": ["🥔 Lay''s Clásicas", "🍖 Salame", "🧀 Queso", "🥤 Coca-Cola"]}'),
  ('ruleta',   '{"activa": false, "hasta": "", "promo_id": "promo-1",
                 "premios": [
                   {"t":"10% OFF","d":"10% de descuento en tu próxima compra","c":"#5a9f43"},
                   {"t":"Coca 600","d":"Una Coca-Cola 600 ml de regalo","c":"#e8952f"},
                   {"t":"2 sobres","d":"2 sobres de figuritas del Mundial","c":"#2f6b2a"},
                   {"t":"Palito Grido","d":"Un palito helado Grido de regalo","c":"#c9761a"},
                   {"t":"5% OFF","d":"5% de descuento en tu próxima compra","c":"#5a9f43"},
                   {"t":"¡Casi!","d":"","c":"#16301a"},
                   {"t":"15% OFF","d":"15% en el Pack Picada Mundial","c":"#e8952f"},
                   {"t":"Maní gratis","d":"Un maní salado con tu próxima compra","c":"#2f6b2a"}]}');

-- =====================================================================
--  ÚLTIMO PASO (después de que tu amigo cree su cuenta en el panel):
--  cambiá el mail y corré SOLO esta línea para hacerlo dueño.
-- =====================================================================
-- update public.profiles set rol = 'dueno', activo = true where email = 'MAIL-DE-TU-AMIGO@gmail.com';
