-- =============================================================================
-- Automatismos de la base.
--
-- La idea es que los invariantes no dependan de que el cliente se porte bien:
-- el estado inicial, el contador de likes y el sello de moderacion los pone
-- Postgres, no la aplicacion.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Todo mensaje entra 'pendiente', pase lo que pase.
--    Aunque alguien llame directamente a la API con los campos de moderacion
--    rellenos, aqui se sobreescriben.
-- -----------------------------------------------------------------------------
create or replace function public.comentario_entra_pendiente()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.estado          := 'pendiente';
  new.destacado       := false;
  new.likes_count     := 0;
  new.respuesta_decano := null;
  new.respuesta_fecha := null;
  new.moderado_por    := null;
  new.moderado_en     := null;
  new.created_at      := now();

  -- El nombre real no se guarda si la persona pidio salir como anonima.
  if new.es_anonimo then
    new.nombre := 'Anónimo';
  end if;

  return new;
end;
$$;

create trigger comentarios_entra_pendiente
before insert on public.comentarios
for each row execute function public.comentario_entra_pendiente();

-- -----------------------------------------------------------------------------
-- 2. Contador de likes: lo lleva la base, nunca el cliente.
--    SECURITY DEFINER porque quien inserta el like (rol anonimo) no tiene
--    permiso de UPDATE sobre `comentarios`.
-- -----------------------------------------------------------------------------
create or replace function public.recalcular_likes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.comentarios
       set likes_count = likes_count + 1
     where id = new.comentario_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.comentarios
       set likes_count = greatest(likes_count - 1, 0)
     where id = old.comentario_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger likes_actualizan_contador
after insert or delete on public.likes
for each row execute function public.recalcular_likes();

-- -----------------------------------------------------------------------------
-- 3. Sello de moderacion: quien toco que y cuando.
--    Solo se dispara si cambio algo que sea realmente un acto de moderacion,
--    asi el UPDATE del contador de likes no ensucia el registro.
-- -----------------------------------------------------------------------------
create or replace function public.sellar_moderacion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.estado is distinct from old.estado
     or new.destacado is distinct from old.destacado
     or new.respuesta_decano is distinct from old.respuesta_decano
  then
    new.moderado_por := coalesce(
      nullif(auth.jwt() ->> 'email', ''),
      new.moderado_por
    );
    new.moderado_en := now();
  end if;

  if new.respuesta_decano is distinct from old.respuesta_decano then
    new.respuesta_fecha := case
      when new.respuesta_decano is null then null
      else now()
    end;
  end if;

  return new;
end;
$$;

create trigger comentarios_sellan_moderacion
before update on public.comentarios
for each row execute function public.sellar_moderacion();

-- -----------------------------------------------------------------------------
-- Estas funciones solo tienen sentido disparadas por sus triggers. Supabase daria
-- EXECUTE a anon y authenticated por defecto; aqui se les quita, sobre todo a
-- `recalcular_likes`, que es SECURITY DEFINER y escribe en `comentarios`.
-- -----------------------------------------------------------------------------
revoke all on function public.comentario_entra_pendiente() from public, anon, authenticated;
revoke all on function public.recalcular_likes()           from public, anon, authenticated;
revoke all on function public.sellar_moderacion()          from public, anon, authenticated;
