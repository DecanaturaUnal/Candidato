-- =============================================================================
-- Row Level Security y permisos.
--
-- Reparto de poderes:
--   anon          : deja mensajes y pone/quita su like. No lee comentarios.
--   authenticated : lee y modera SOLO si su correo esta en `admins` y activo.
--   service_role  : sin restricciones, y se usa exclusivamente en el servidor.
--
-- Se empieza revocando todo: los permisos por defecto de Supabase sobre el
-- esquema public son amplios y aqui no interesan.
-- =============================================================================

alter table public.comentarios enable row level security;
alter table public.likes       enable row level security;
alter table public.admins      enable row level security;

-- A proposito NO se usa FORCE ROW LEVEL SECURITY: el trigger que lleva el contador
-- de likes es SECURITY DEFINER y actualiza `comentarios` como propietario. Con FORCE,
-- ese UPDATE quedaria sujeto a las politicas, no encontraria ninguna que lo permita
-- y el contador dejaria de subir en silencio.

revoke all on public.comentarios from anon, authenticated;
revoke all on public.likes       from anon, authenticated;
revoke all on public.admins      from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Quien es administrador
--
-- SECURITY DEFINER para poder consultar `admins` sin darle a nadie lectura
-- directa sobre esa tabla, y STABLE para que el planificador no la repita por fila.
-- -----------------------------------------------------------------------------
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.admins a
     where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
       and a.activo
  );
$$;

-- Solo la usan las politicas y el panel: el publico no tiene por que invocarla.
revoke all on function public.es_admin() from public, anon;
grant execute on function public.es_admin() to authenticated;

-- -----------------------------------------------------------------------------
-- PUBLICO (anon)
-- -----------------------------------------------------------------------------

-- El muro se lee unicamente por la vista, nunca por la tabla.
grant select on public.comentarios_publicos to anon, authenticated;

--
-- DEJAR UN MENSAJE: al rol anonimo NO se le concede INSERT.
--
-- Es deliberado. Si el publico pudiera insertar directamente contra la API de
-- PostgREST, bastaria con saltarse la pagina para esquivar el captcha de
-- Turnstile, el campo trampa y el limite de peticiones por IP: toda la defensa
-- de §9 quedaria en adorno.
--
-- El unico camino para guardar un mensaje es el manejador de ruta del servidor
-- (src/app/api/comentarios/route.ts), que valida el captcha y el cupo ANTES de
-- escribir, y lo hace con la llave de servicio.
--
-- Las cerraduras de la propia base siguen puestas por si algun dia se reabre esta
-- puerta: el trigger `comentario_entra_pendiente` fuerza el estado inicial y la
-- restriccion `autorizacion_de_datos_obligatoria` exige el permiso de tratamiento.

-- Likes. Sin sesion no hay identidad que verificar criptograficamente, asi que
-- el `visitante_id` viaja en una cabecera y las politicas exigen que coincida
-- con la fila: se puede crear o borrar el like propio, pero no el de otro,
-- porque haria falta conocer su UUID.
--
-- El SELECT hace falta por dos motivos: para que el navegador pueda preguntar a
-- que comentarios ya le dio like, y porque en Postgres un `DELETE ... WHERE`
-- exige privilegio de lectura sobre las columnas del filtro (sin el, quitar el
-- like falla con "permission denied"). La politica lo acota a las filas propias,
-- asi que sigue sin poder enumerarse quien voto que.
grant select, insert, delete on public.likes to anon;

create policy "anon ve solo sus likes"
  on public.likes
  for select
  to anon
  using (
    visitante_id::text = coalesce(
      current_setting('request.headers', true)::json ->> 'x-visitante-id',
      ''
    )
  );

create policy "anon pone su propio like"
  on public.likes
  for insert
  to anon
  with check (
    visitante_id::text = coalesce(
      current_setting('request.headers', true)::json ->> 'x-visitante-id',
      ''
    )
  );

create policy "anon quita su propio like"
  on public.likes
  for delete
  to anon
  using (
    visitante_id::text = coalesce(
      current_setting('request.headers', true)::json ->> 'x-visitante-id',
      ''
    )
  );

-- -----------------------------------------------------------------------------
-- MODERACION (authenticated + lista blanca)
-- -----------------------------------------------------------------------------
grant select, update, delete on public.comentarios to authenticated;

create policy "moderadores leen todo"
  on public.comentarios for select to authenticated
  using (public.es_admin());

create policy "moderadores actualizan"
  on public.comentarios for update to authenticated
  using (public.es_admin())
  with check (public.es_admin());

create policy "moderadores eliminan"
  on public.comentarios for delete to authenticated
  using (public.es_admin());

grant select on public.admins to authenticated;

create policy "moderadores ven la lista blanca"
  on public.admins for select to authenticated
  using (public.es_admin());

grant select on public.likes to authenticated;

create policy "moderadores ven los likes"
  on public.likes for select to authenticated
  using (public.es_admin());
