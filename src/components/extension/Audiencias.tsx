import { AUDIENCIAS } from "@/content/audiencias";
import { audienciaIncompleta } from "@/content/pendientes";

/**
 * Secciones a las que apunta la barra de navegacion de la pieza.
 *
 * Los `id` coinciden con NAVEGACION.enlaces (src/config/maqueta.ts): son las anclas
 * de Docentes, Estudiantes y Egresados.
 *
 * El aviso de pendiente solo aparece mientras el texto siga siendo un marcador: si
 * quedara fijo, se publicaria junto al texto real.
 */
export function Audiencias() {
  return (
    <section className="audiencias" aria-label="Propuestas por audiencia">
      {AUDIENCIAS.map((audiencia) => (
        <article key={audiencia.id} id={audiencia.id} className="audiencia">
          <h2 className="bloque__titulo">{audiencia.titulo}</h2>
          {audienciaIncompleta(audiencia) && (
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
