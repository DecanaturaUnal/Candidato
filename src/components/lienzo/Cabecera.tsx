import Image from "next/image";
import { BANDAS, BLOQUE_CLARO, MARCA } from "@/config/maqueta";

/** Convierte una medida en "pixeles de mockup" a la unidad escalable del lienzo. */
const u = (n: number) => `calc(${n} * var(--u))`;

/**
 * Cabecera de la pieza.
 *
 * Los PNG que se usan aqui son los que produce `scripts/preparar-assets.mjs`: los
 * originales traian la franja turquesa horneada y su turquesa opaco tapaba las
 * palabras "OSORIO" y "Facultad de Ingenieria y Arquitectura". Ya limpios, el
 * apilado es el del diseno original y no necesita recortes:
 *
 *   franja turquesa (la dibuja la pagina)  ->  figura  ->  lockup  ->  eslogan / #2
 *
 * El lockup va encima de la figura porque en el mockup la "O" turquesa de GUSTAVO
 * pisa el sueter.
 */
export function Cabecera() {
  // El borde superior del bloque esta inclinado: se recorta con un poligono cuyo
  // vertice derecho baja la diferencia entre los dos topes medidos en el mockup.
  const altoBloque = BLOQUE_CLARO.yFin - BLOQUE_CLARO.yTopIzq;
  const caidaTope =
    ((BLOQUE_CLARO.yTopDer - BLOQUE_CLARO.yTopIzq) / altoBloque) * 100;
  // El bloque entra y sale de la franja turquesa, asi que cambia de tono dos veces:
  // crema sobre el blanco de arriba, verde agua dentro de la franja, crema de nuevo
  // en el respiro blanco que queda antes de la barra de navegacion.
  const entraFranja = BANDAS.franjaTurquesa.y - BLOQUE_CLARO.yTopIzq;
  const saleFranja =
    BANDAS.franjaTurquesa.y + BANDAS.franjaTurquesa.alto - BLOQUE_CLARO.yTopIzq;

  return (
    <header className="cabecera">
      <div className="cabecera__franja" />

      <div
        className="cabecera__bloque"
        style={{
          left: u(BLOQUE_CLARO.x),
          top: u(BLOQUE_CLARO.yTopIzq),
          width: u(BLOQUE_CLARO.ancho),
          height: u(altoBloque),
          clipPath: `polygon(0 0, 100% ${caidaTope.toFixed(3)}%, 100% 100%, 0 100%)`,
          background:
            `linear-gradient(to bottom,` +
            ` ${BLOQUE_CLARO.sobreBlanco} 0 ${u(entraFranja)},` +
            ` ${BLOQUE_CLARO.sobreTurquesa} ${u(entraFranja)} ${u(saleFranja)},` +
            ` ${BLOQUE_CLARO.sobreBlanco} ${u(saleFranja)} 100%)`,
        }}
      />

      {/* Figura de Gustavo, ya sin la franja ni el bloque horneados. */}
      <div
        className="marca marca--figura"
        style={{
          left: u(MARCA.figura.x),
          top: u(MARCA.figura.y),
          width: u(MARCA.figura.ancho),
          height: u(MARCA.figura.alto),
        }}
      >
        <Image
          src={MARCA.figura.src}
          alt="Gustavo Osorio, candidato a decano, sentado en un butaco"
          width={1667}
          height={2500}
          priority
        />
      </div>

      <div
        className="marca marca--lockup"
        style={{
          left: u(MARCA.lockup.x),
          top: u(MARCA.lockup.y),
          width: u(MARCA.lockup.ancho),
          height: u(MARCA.lockup.alto),
        }}
      >
        <Image
          src={MARCA.lockup.src}
          alt="Candidato a decano Gustavo Osorio - Facultad de Ingeniería y Arquitectura"
          width={2461}
          height={1315}
          priority
        />
      </div>

      <div
        className="marca marca--eslogan"
        style={{
          left: u(MARCA.eslogan.x),
          top: u(MARCA.eslogan.y),
          width: u(MARCA.eslogan.ancho),
          height: u(MARCA.eslogan.alto),
        }}
      >
        <Image
          src={MARCA.eslogan.src}
          alt="Lo que construimos juntos, ahora lo llevamos al siguiente nivel."
          width={2461}
          height={491}
          priority
        />
      </div>

      <div
        className="marca marca--planilla"
        style={{
          left: u(MARCA.planilla.x),
          top: u(MARCA.planilla.y),
          width: u(MARCA.planilla.ancho),
          height: u(MARCA.planilla.alto),
        }}
      >
        <Image
          src={MARCA.planilla.src}
          alt="Planilla número 2"
          width={863}
          height={642}
          priority
        />
      </div>
    </header>
  );
}
