"use client";

import { useId, useState } from "react";
import type { BloquePrograma } from "@/content/programa";

/**
 * Etiqueta desplegable de la columna derecha.
 *
 * En reposo se ve exactamente como en el mockup: caja azul ajustada al texto mas
 * un bloque turquesa al final. El bloque turquesa hace de indicador de estado
 * (se aclara al abrir), sin agregar iconos que el diseno no tiene.
 */
export function Acordeon({ bloque }: { bloque: BloquePrograma }) {
  const [abierto, setAbierto] = useState(false);
  const idCuerpo = useId();

  return (
    <div className="acordeon" id={bloque.id}>
      <button
        type="button"
        className="acordeon__boton"
        aria-expanded={abierto}
        aria-controls={idCuerpo}
        onClick={() => setAbierto((v) => !v)}
      >
        <span className="acordeon__titulo">{bloque.titulo}</span>
        <span
          className="acordeon__cola"
          style={abierto ? { opacity: 0.6 } : undefined}
          aria-hidden
        />
      </button>

      {abierto && (
        <div className="acordeon__cuerpo" id={idCuerpo}>
          {bloque.cuerpo.map((parrafo, i) => (
            <p key={i}>{parrafo}</p>
          ))}
        </div>
      )}
    </div>
  );
}
