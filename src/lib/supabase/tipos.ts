/**
 * Tipos de la base de datos.
 *
 * Escritos a mano para que coincidan con las migraciones de `supabase/migrations/`.
 * Si se cambia el esquema, hay que actualizarlos aqui (o regenerarlos con
 * `supabase gen types typescript`).
 */

export type EstadoComentario = "pendiente" | "aprobado" | "rechazado";

/** Fila completa de `comentarios`. Solo accesible desde el servidor o el panel. */
export type Comentario = {
  id: string;
  nombre: string;
  es_anonimo: boolean;
  /** Uso interno del equipo. Nunca se envia al muro publico. */
  email: string;
  mensaje: string;
  autoriza_publicacion: boolean;
  autoriza_datos: boolean;
  estado: EstadoComentario;
  destacado: boolean;
  likes_count: number;
  respuesta_decano: string | null;
  respuesta_fecha: string | null;
  ip_hash: string | null;
  user_agent: string | null;
  created_at: string;
  moderado_por: string | null;
  moderado_en: string | null;
};

/**
 * Fila de la vista `comentarios_publicos`: lo unico que puede leer el publico.
 * No incluye correo, autorizaciones, estado ni datos de trazabilidad.
 */
export type ComentarioPublico = {
  id: string;
  nombre: string;
  mensaje: string;
  likes_count: number;
  destacado: boolean;
  respuesta_decano: string | null;
  respuesta_fecha: string | null;
  created_at: string;
};

export type Like = {
  id: string;
  comentario_id: string;
  visitante_id: string;
  created_at: string;
};

export type Admin = {
  email: string;
  nombre: string;
  activo: boolean;
  created_at: string;
};

/** Campos que el formulario publico puede enviar. El resto los pone la base. */
export type ComentarioNuevo = Pick<
  Comentario,
  | "nombre"
  | "es_anonimo"
  | "email"
  | "mensaje"
  | "autoriza_publicacion"
  | "autoriza_datos"
>;

/** Orden del muro publico. */
export type OrdenMuro = "destacados" | "recientes";
