import { z } from "zod";

/**
 * Reglas de validacion del formulario.
 *
 * Este archivo lo usan LOS DOS lados: el navegador para avisar mientras se
 * escribe, y el servidor para decidir si guarda. Compartirlo evita que se
 * separen; la del servidor es la que manda, la del cliente es solo cortesia.
 *
 * Los limites coinciden con los CHECK de la tabla `comentarios`, de modo que la
 * base es la ultima linea de defensa aunque alguien esquive las dos anteriores.
 */

export const LIMITES = {
  nombre: { max: 60 },
  mensaje: { min: 10, max: 800 },
  email: { max: 120 },
  /** Segundos minimos entre abrir el formulario y enviarlo. Un bot tarda menos. */
  segundosMinimos: 3,
} as const;

export const esquemaComentario = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "Escriba su nombre.")
    .max(LIMITES.nombre.max, `Máximo ${LIMITES.nombre.max} caracteres.`),

  esAnonimo: z.boolean(),

  email: z
    .string()
    .trim()
    .max(LIMITES.email.max, "El correo es demasiado largo.")
    .pipe(z.email("Escriba un correo electrónico válido.")),

  mensaje: z
    .string()
    .trim()
    .min(LIMITES.mensaje.min, `Escriba al menos ${LIMITES.mensaje.min} caracteres.`)
    .max(LIMITES.mensaje.max, `Máximo ${LIMITES.mensaje.max} caracteres.`),

  /** Permiso para publicar. Es opcional: sin el, el mensaje llega igual pero no sale al muro. */
  autorizaPublicacion: z.boolean(),

  /** Obligatorio por la Ley 1581 de 2012: sin esto no se puede guardar el dato. */
  autorizaDatos: z.literal(true, {
    message: "Debe autorizar el tratamiento de sus datos para enviar el mensaje.",
  }),
});

export type DatosComentario = z.infer<typeof esquemaComentario>;

/**
 * Lo que viaja de verdad al servidor: los datos del formulario mas las piezas
 * anti-robot. Estas ultimas nunca se muestran ni se guardan.
 */
export const esquemaEnvio = esquemaComentario.extend({
  /** Campo trampa: invisible para las personas, tentador para los robots. */
  sitioWeb: z.string().max(0),
  /** Momento en que se abrio el formulario, en milisegundos. */
  abiertoEn: z.number().int().positive(),
  /** Comprobante del captcha de Cloudflare Turnstile. */
  captcha: z.string().min(1, "Falta la verificación anti-robots."),
});

export type DatosEnvio = z.infer<typeof esquemaEnvio>;

/** Traduce un error de Zod a un mapa campo -> primer mensaje. */
export function erroresPorCampo(error: z.ZodError): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const problema of error.issues) {
    const campo = String(problema.path[0] ?? "general");
    salida[campo] ??= problema.message;
  }
  return salida;
}
