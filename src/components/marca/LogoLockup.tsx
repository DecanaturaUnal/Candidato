/**
 * Firma de campana para la barra superior.
 *
 * Deliberadamente NO reutiliza public/marca/titulo-lockup.png. Ese archivo trae
 * "OSORIO" y "Facultad de Ingenieria y Arquitectura" en BLANCO, porque en la pieza
 * se leen contra la franja turquesa de la cabecera. Sobre el cristal claro de la
 * barra esa mitad de la firma desapareceria, y sobre uno oscuro desapareceria la
 * otra (el "GUSTAVO" azul marino): ningun fondo plano sirve para las dos.
 *
 * Se rehace aqui con la misma jerarquia -- cursiva / nombre condensado / facultad --
 * y los colores recolocados para que contrasten contra la barra. Al ser texto y no
 * imagen, escala sin perder nitidez y se lee con lector de pantalla.
 */
export function LogoLockup() {
  return (
    <span
      className="firma"
      role="img"
      aria-label="Gustavo Osorio, candidato a decano de la Facultad de Ingeniería y Arquitectura"
    >
      <span className="firma__cursiva" aria-hidden>
        Candidato a decano
      </span>
      <span className="firma__nombre" aria-hidden>
        <span className="firma__gustavo">GUSTAVO</span>
        <span className="firma__osorio">OSORIO</span>
      </span>
      <span className="firma__facultad" aria-hidden>
        Facultad de Ingeniería y Arquitectura
      </span>
    </span>
  );
}
