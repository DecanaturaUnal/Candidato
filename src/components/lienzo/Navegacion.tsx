import { NAVEGACION } from "@/config/maqueta";

const u = (n: number) => `calc(${n} * var(--u))`;

/**
 * Barra azul con las tres audiencias. Son anclas a secciones de la misma pagina,
 * no rutas nuevas. Los bloques turquesa que las separan sobresalen deliberadamente
 * por encima y por debajo de la barra, tal como en el mockup.
 */
export function Navegacion() {
  return (
    <nav className="navegacion" aria-label="Audiencias">
      <div className="navegacion__barra" />

      {NAVEGACION.separadores.map((sep) => (
        <div
          key={sep.x}
          className="navegacion__separador"
          style={{ left: u(sep.x), width: u(sep.ancho) }}
          aria-hidden
        />
      ))}

      {NAVEGACION.enlaces.map((enlace) => (
        <a
          key={enlace.id}
          href={`#${enlace.id}`}
          className="navegacion__enlace"
          style={{ left: u(enlace.centro) }}
        >
          {enlace.texto}
        </a>
      ))}
    </nav>
  );
}
