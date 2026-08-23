import { REDES } from "@/config/sitio";
import { CampoConversemos } from "./CampoConversemos";
import {
  IconoConversemos,
  IconoFacebook,
  IconoInstagram,
  IconoLinkedIn,
} from "./Iconos";

/**
 * Pie de pagina.
 *
 * El cuadro celeste "Conversemos" es la puerta de entrada al muro de mensajes:
 * el campo visible se conserva tal cual lo aprobo el diseno y, al enfocarlo, abre
 * el formulario completo en una ventana modal (nombre, correo, mensaje y
 * autorizaciones), de modo que la composicion del pie no cambia de alto.
 *
 * Los tres circulos de redes sobresalen a proposito del borde inferior azul.
 */
export function PieDePagina() {
  const redes = [
    { url: REDES.instagram, nombre: "Instagram", Icono: IconoInstagram },
    { url: REDES.facebook, nombre: "Facebook", Icono: IconoFacebook },
    { url: REDES.linkedin, nombre: "LinkedIn", Icono: IconoLinkedIn },
  ];

  return (
    <footer className="pie">
      <div className="pie__azul" />

      <p className="pie__lema">Construimos conexiones para el futuro.</p>

      <div className="pie__tarjeta" />
      <IconoConversemos className="pie__icono" />
      <p className="pie__invitacion">
        Conversemos,
        <br />
        propone un tema de interés
      </p>
      <CampoConversemos />

      <div className="pie__redes">
        {redes.map(({ url, nombre, Icono }) => (
          <a
            key={nombre}
            className="pie__red"
            href={url}
            aria-label={nombre}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icono />
          </a>
        ))}
      </div>

      <a className="pie__privacidad" href="/privacidad">
        Política de privacidad
      </a>
    </footer>
  );
}
