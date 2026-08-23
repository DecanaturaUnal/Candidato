-- =============================================================================
-- Esquema base del muro de mensajes de la comunidad.
--
-- Tres tablas:
--   comentarios : cada mensaje recibido, con su estado de moderacion
--   likes       : un "me gusta" por navegante y comentario
--   admins      : lista blanca de quien puede moderar
--
-- Regla de fondo: NADA se publica solo. Todo mensaje entra en 'pendiente' y solo
-- aparece en el muro cuando un moderador lo aprueba Y su autor autorizo publicarlo.
-- =============================================================================

create type public.estado_comentario as enum ('pendiente', 'aprobado', 'rechazado');

create table public.comentarios (
  id uuid primary key default gen_random_uuid(),

  -- Datos que escribe la persona
  nombre text not null
    check (char_length(btrim(nombre)) between 1 and 60),
  es_anonimo boolean not null default false,
  -- El correo NUNCA sale al publico: no aparece en la vista `comentarios_publicos`
  -- y el rol anonimo no tiene lectura sobre esta tabla.
  email text not null
    check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  mensaje text not null
    check (char_length(btrim(mensaje)) between 10 and 800),

  -- Autorizaciones. Publicar es un PERMISO, no una orden de publicar.
  autoriza_publicacion boolean not null default false,
  autoriza_datos boolean not null default false,

  -- Moderacion
  estado public.estado_comentario not null default 'pendiente',
  destacado boolean not null default false,
  likes_count integer not null default 0 check (likes_count >= 0),
  respuesta_decano text
    check (respuesta_decano is null or char_length(btrim(respuesta_decano)) between 1 and 2000),
  respuesta_fecha timestamptz,
  moderado_por text,
  moderado_en timestamptz,

  -- Trazabilidad. La IP va hasheada (SHA-256 + sal), nunca en claro.
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now(),

  -- Ley 1581 de 2012: sin autorizacion de tratamiento no se puede guardar el dato.
  constraint autorizacion_de_datos_obligatoria check (autoriza_datos)
);

comment on column public.comentarios.email is
  'Uso interno del equipo de campana. No se expone en ninguna vista publica.';
comment on column public.comentarios.autoriza_publicacion is
  'Permiso del autor. Necesario pero NO suficiente: hace falta aprobacion.';
comment on column public.comentarios.ip_hash is
  'SHA-256 de la IP con una sal de entorno. Sirve para limitar abuso, no identifica.';

-- Bandeja de moderacion: filtrar por estado y ver lo mas reciente primero.
create index comentarios_bandeja_idx
  on public.comentarios (estado, created_at desc);

-- Muro publico: destacados primero, luego mas gustados, luego mas recientes.
create index comentarios_muro_idx
  on public.comentarios (destacado desc, likes_count desc, created_at desc)
  where estado = 'aprobado' and autoriza_publicacion;

create table public.likes (
  id uuid primary key default gen_random_uuid(),
  comentario_id uuid not null
    references public.comentarios (id) on delete cascade,
  -- UUID v4 que el navegador guarda en localStorage. No identifica a nadie.
  visitante_id uuid not null,
  created_at timestamptz not null default now(),

  -- Un like por comentario y por navegante: la unicidad la garantiza la base,
  -- no el cliente.
  constraint likes_unicos unique (comentario_id, visitante_id)
);

create index likes_comentario_idx on public.likes (comentario_id);

create table public.admins (
  email text primary key check (email = lower(email)),
  nombre text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.admins is
  'Lista blanca de moderadores. Estar autenticado no basta: hay que estar aqui y activo.';
