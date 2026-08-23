import Image from "next/image";
import { FOTOS } from "@/config/sitio";
import {
  BLOQUES_PROGRAMA,
  PARRAFO_DERECHO,
  PARRAFO_IZQUIERDO,
} from "@/content/programa";
import { Acordeon } from "./Acordeon";

type Foto = {
  src: string;
  alt: string;
  intrinseco: { ancho: number; alto: number };
  encuadre: { x: number; y: number; ancho: number; alto: number };
};

/**
 * Coloca la foto dentro de su recuadro mostrando exactamente la region indicada en
 * `encuadre`. Todo va en porcentajes del recuadro, asi que el recorte se conserva
 * intacto cuando el lienzo se reescala.
 */
function FotoEncuadrada({ foto }: { foto: Foto }) {
  const { intrinseco: nat, encuadre: e } = foto;
  return (
    <div className="construir__foto">
      <Image
        src={foto.src}
        alt={foto.alt}
        width={nat.ancho}
        height={nat.alto}
        style={{
          position: "absolute",
          width: `${(nat.ancho / e.ancho) * 100}%`,
          height: `${(nat.alto / e.alto) * 100}%`,
          left: `${(-e.x / e.ancho) * 100}%`,
          top: `${(-e.y / e.alto) * 100}%`,
          maxWidth: "none",
        }}
      />
    </div>
  );
}

/**
 * Seccion central.
 *
 * La columna izquierda va posicionada en absoluto (nada de lo que contiene cambia
 * de alto), mientras que la derecha vive en el flujo normal: asi, cuando se abre
 * un acordeon, la seccion crece hacia abajo sin descuadrar la grilla de fotos.
 */
export function ConstruirFuturo() {
  return (
    <section className="construir">
      <h2 className="construir__titulo">Construir Futuro</h2>

      <div className="construir__izq">
        <div className="construir__grilla">
          {FOTOS.grilla.map((foto) => (
            <FotoEncuadrada key={foto.src} foto={foto} />
          ))}
        </div>

        <p className="parrafo construir__parrafo-izq">{PARRAFO_IZQUIERDO}</p>
      </div>

      <div className="construir__der">
        {BLOQUES_PROGRAMA.map((bloque) => (
          <Acordeon key={bloque.id} bloque={bloque} />
        ))}

        <p className="parrafo construir__parrafo-der">{PARRAFO_DERECHO}</p>

        <div className="construir__destacada">
          <FotoEncuadrada foto={FOTOS.destacada} />
        </div>
      </div>
    </section>
  );
}
