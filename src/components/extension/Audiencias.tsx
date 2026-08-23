import { AUDIENCIAS, type Audiencia } from "@/content/audiencias";

/**
 * Mientras la campana no entregue los textos siguen los marcadores TODO. El aviso
 * solo debe verse en ese caso: si quedara fijo, se publicaria junto al texto real.
 * Mismo criterio que en src/app/privacidad/page.tsx.
 */
const faltaCompletar = (audiencia: Audiencia) =>
  audiencia.entradilla.startsWith("TODO") ||
  audiencia.puntos.some((punto) => punto.startsWith("TODO"));

/**
 * Secciones a las que apunta la barra de navegacion de la pieza.
 *
 * Los `id` coinciden con NAVEGACION.enlaces (src/config/maqueta.ts): son las anclas
 * de Docentes, Estudiantes y Egresados.
 */
export function Audiencias() {
  return (
    <section className="audiencias" aria-label="Propuestas por audiencia">
      {AUDIENCIAS.map((audiencia) => (
        <article key={audiencia.id} id={audiencia.id} className="audiencia">
          <h2 className="bloque__titulo">{audiencia.titulo}</h2>
          {faltaCompletar(audiencia) && (
            <p className="pendiente">Contenido pendiente</p>
          )}
          <p className="audiencia__entradilla">{audiencia.entradilla}</p>
          <ul className="audiencia__puntos">
            {audiencia.puntos.map((punto, i) => (
              <li key={i}>{punto}</li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
