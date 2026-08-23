/**
 * Deteccion de contenido todavia sin entregar por la campana.
 *
 * Los textos pendientes van marcados con el prefijo `TODO:`. Varias partes del
 * sitio necesitan saber si eso sigue asi -- el aviso del muro de audiencias y,
 * sobre todo, robots.txt -- y conviene que todas usen el mismo criterio: si cada
 * una lo comprobara a su manera, acabarian discrepando.
 */
import { BLOQUES_PROGRAMA } from "./programa";
import { AUDIENCIAS, type Audiencia } from "./audiencias";
import { RESPONSABLE } from "@/config/sitio";

const esMarcador = (texto: string) => texto.startsWith("TODO");

/** Si a una audiencia concreta le falta el texto real. */
export const audienciaIncompleta = (audiencia: Audiencia) =>
  esMarcador(audiencia.entradilla) || audiencia.puntos.some(esMarcador);

/**
 * Si queda cualquier texto sin entregar en todo el sitio.
 *
 * Mientras devuelva `true` el sitio se sirve con robots.txt cerrado: un despliegue
 * publico con los marcadores puestos podria quedar indexado con ellos, y eso pesa
 * sobre el nombre del candidato mucho despues de haberlos reemplazado.
 */
export function contenidoIncompleto(): boolean {
  return (
    esMarcador(RESPONSABLE.nombre) ||
    esMarcador(RESPONSABLE.correo) ||
    BLOQUES_PROGRAMA.some((bloque) => bloque.cuerpo.some(esMarcador)) ||
    AUDIENCIAS.some(audienciaIncompleta)
  );
}
