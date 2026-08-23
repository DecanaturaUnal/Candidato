-- =============================================================================
-- Datos de ejemplo, para poder ver el muro y la bandeja de moderacion
-- funcionando sin esperar a que llegue trafico real.
--
-- Aplicar con:  supabase db reset      (lo corre solo)
--        o con: psql "$DATABASE_URL" -f supabase/seed.sql
--
-- Los mensajes se insertan y DESPUES se moderan: el trigger
-- `comentarios_entra_pendiente` fuerza el estado inicial, asi que no hay forma de
-- crear un comentario ya aprobado, ni siquiera desde aqui. Es el mismo camino que
-- recorre un mensaje real.
-- =============================================================================

-- --- Moderadores -------------------------------------------------------------
-- TODO: reemplazar por los correos reales del equipo de campana.
insert into public.admins (email, nombre, activo) values
  ('correo-del-decano@example.com', 'Gustavo Osorio', true),
  ('correo-del-equipo@example.com', 'Equipo de campaña', true)
on conflict (email) do nothing;

-- --- Mensajes de ejemplo -----------------------------------------------------
with nuevos as (
  insert into public.comentarios
    (nombre, es_anonimo, email, mensaje, autoriza_publicacion, autoriza_datos)
  values
    ('María Fernanda Ríos', false, 'maria.rios@example.com',
     'Me parece clave fortalecer los laboratorios de la Facultad. ¿Qué plan hay para renovar equipos en los próximos dos años?',
     true, true),

    ('Carlos Alberto Muñoz', false, 'carlos.munoz@example.com',
     'Como egresado, echo de menos un canal permanente con la Facultad. Sería muy valioso tener una red activa de egresados por programa.',
     true, true),

    ('Ana Lucía Trujillo', false, 'ana.trujillo@example.com',
     'Propongo ampliar los horarios de atención psicológica y de bienestar para estudiantes de jornada nocturna.',
     true, true),

    ('Anónimo', true, 'anonimo.docente@example.com',
     'Hace falta simplificar los trámites administrativos para la ejecución de proyectos de investigación. Se pierde mucho tiempo.',
     true, true),

    ('Jorge Iván Betancur', false, 'jorge.betancur@example.com',
     'Me interesa saber cómo se articulará la Facultad con el sector productivo de la región en materia de prácticas profesionales.',
     true, true),

    ('Sandra Milena Ospina', false, 'sandra.ospina@example.com',
     'Este mensaje llegó sin permiso de publicación: sirve para comprobar que no aparece en el muro aunque se apruebe.',
     false, true),

    ('Mensaje de prueba', false, 'prueba@example.com',
     'Este mensaje queda pendiente a propósito, para ver la bandeja de moderación con trabajo por hacer.',
     true, true)
  returning id, nombre, created_at
)
select count(*) as mensajes_insertados from nuevos;

-- --- Moderacion de los ejemplos ---------------------------------------------
-- Seis aprobados (uno de ellos SIN permiso de publicacion, para comprobar que aun
-- asi no sale al muro) y uno que se queda pendiente en la bandeja.
update public.comentarios
   set estado = 'aprobado', moderado_por = 'correo-del-equipo@example.com'
 where email in (
   'maria.rios@example.com',
   'carlos.munoz@example.com',
   'ana.trujillo@example.com',
   'anonimo.docente@example.com',
   'jorge.betancur@example.com',
   'sandra.ospina@example.com'
 );

update public.comentarios
   set destacado = true
 where email = 'carlos.munoz@example.com';

update public.comentarios
   set respuesta_decano = 'Gracias por la pregunta. La renovación de laboratorios es una de las líneas del programa: la idea es priorizarla con recursos de proyectos de extensión y convenios con el sector productivo.'
 where email = 'maria.rios@example.com';

-- --- Likes de ejemplo --------------------------------------------------------
-- El contador `likes_count` no se toca a mano: lo mantiene el trigger.
insert into public.likes (comentario_id, visitante_id)
select c.id, v.visitante_id
  from public.comentarios c
  cross join (values
    ('11111111-1111-4111-8111-111111111111'::uuid),
    ('22222222-2222-4222-8222-222222222222'::uuid),
    ('33333333-3333-4333-8333-333333333333'::uuid)
  ) as v(visitante_id)
 where c.email in ('carlos.munoz@example.com', 'ana.trujillo@example.com')
on conflict do nothing;

insert into public.likes (comentario_id, visitante_id)
select c.id, '44444444-4444-4444-8444-444444444444'::uuid
  from public.comentarios c
 where c.email = 'maria.rios@example.com'
on conflict do nothing;

-- --- Comprobacion rapida -----------------------------------------------------
select
  (select count(*) from public.comentarios)                          as total,
  (select count(*) from public.comentarios where estado = 'pendiente') as pendientes,
  (select count(*) from public.comentarios_publicos)                 as visibles_en_el_muro,
  (select count(*) from public.likes)                                as likes;
