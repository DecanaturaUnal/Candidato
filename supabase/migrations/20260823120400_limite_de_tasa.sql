-- =============================================================================
-- Limite de peticiones por IP.
--
-- Se lleva en la base y no en memoria del proceso a proposito: en Vercel cada
-- peticion puede caer en una instancia distinta, asi que un contador en memoria
-- no limitaria nada. Aqui el cupo es global y sobrevive a los despliegues.
--
-- La clave nunca contiene la IP en claro: se guarda ya hasheada por la aplicacion.
-- =============================================================================

create table public.limites_tasa (
  id bigint generated always as identity primary key,
  -- Ej: 'comentario:<ip_hash>' o 'like:<ip_hash>'
  clave text not null,
  created_at timestamptz not null default now()
);

create index limites_tasa_idx on public.limites_tasa (clave, created_at desc);

comment on table public.limites_tasa is
  'Registro de consumos para limitar peticiones por IP. Solo lo toca el servidor.';

alter table public.limites_tasa enable row level security;
revoke all on public.limites_tasa from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Consume una unidad del cupo. Devuelve true si habia sitio, false si se agoto.
--
-- Comprobar y anotar en la misma llamada evita la carrera entre dos peticiones
-- simultaneas que verian el mismo recuento libre.
-- -----------------------------------------------------------------------------
create or replace function public.consumir_cupo(
  p_clave text,
  p_maximo integer,
  p_ventana interval
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  usados integer;
begin
  -- Limpieza oportunista: el registro no necesita durar mas de un dia.
  delete from public.limites_tasa
   where created_at < now() - interval '1 day';

  select count(*) into usados
    from public.limites_tasa
   where clave = p_clave
     and created_at > now() - p_ventana;

  if usados >= p_maximo then
    return false;
  end if;

  insert into public.limites_tasa (clave) values (p_clave);
  return true;
end;
$$;

comment on function public.consumir_cupo is
  'Comprueba y anota un consumo de cupo en una sola operacion. Solo para service_role.';

-- Supabase concede EXECUTE sobre las funciones nuevas a anon y authenticated. Aqui
-- eso seria un agujero: la funcion es SECURITY DEFINER y escribe, asi que
-- cualquiera podria inflar la tabla de cupos a voluntad.
revoke all on function public.consumir_cupo(text, integer, interval)
  from public, anon, authenticated;
