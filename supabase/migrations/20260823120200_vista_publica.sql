-- =============================================================================
-- Vista publica del muro.
--
-- Es la UNICA puerta por la que el rol anonimo puede leer mensajes. Expone solo
-- las columnas necesarias para pintar el muro; `email`, `ip_hash`, `user_agent`,
-- `autoriza_*` y los campos de moderacion se quedan fuera.
--
-- Importante: la vista se crea SIN `security_invoker`, es decir se ejecuta con
-- los permisos de su propietario. Asi puede leer `comentarios` aunque el rol
-- anonimo no tenga ningun acceso a esa tabla. Si se pusiera `security_invoker`,
-- la vista devolveria siempre vacio para el publico.
-- =============================================================================

create view public.comentarios_publicos as
select
  c.id,
  case when c.es_anonimo then 'Anónimo' else c.nombre end as nombre,
  c.mensaje,
  c.likes_count,
  c.destacado,
  c.respuesta_decano,
  c.respuesta_fecha,
  c.created_at
from public.comentarios c
where c.estado = 'aprobado'
  and c.autoriza_publicacion;

comment on view public.comentarios_publicos is
  'Muro publico. Solo mensajes aprobados y con permiso de publicacion del autor.';
