/**
 * Iconografia del pie de pagina, recreada en SVG (no hay archivos de imagen para esto).
 * Los trazos usan terminaciones rectas para reproducir el aire geometrico del mockup.
 */

/**
 * Circulo turquesa con el "¿?" blanco que corona la tarjeta "Conversemos".
 *
 * Los dos signos son la misma forma: el de apertura es el de cierre girado 180
 * grados. El trazo va con terminaciones rectas y el punto es cuadrado, como en el
 * mockup, donde los signos ocupan casi todo el circulo y quedan casi pegados.
 */
export function IconoConversemos({ className }: { className?: string }) {
  // Giro del signo de cierre para obtener el de apertura, y su desplazamiento.
  const giro = "translate(-37 2) rotate(180 66 50)";
  const gancho = "M 52,36 A 14,14 0 1 1 66,50 L 66,58";

  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Conversemos"
    >
      <circle cx="50" cy="50" r="50" fill="var(--turquesa)" />

      <g transform={giro}>
        <path
          d={gancho}
          fill="none"
          stroke="#fff"
          strokeWidth="13"
          strokeLinecap="butt"
        />
        <rect x="59.5" y="71" width="13" height="13" fill="#fff" />
      </g>

      <path
        d={gancho}
        fill="none"
        stroke="#fff"
        strokeWidth="13"
        strokeLinecap="butt"
      />
      <rect x="59.5" y="71" width="13" height="13" fill="#fff" />
    </svg>
  );
}

export function IconoInstagram() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable="false">
      <rect
        x="2.5"
        y="2.5"
        width="19"
        height="19"
        rx="5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        cx="12"
        cy="12"
        r="4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="17.6" cy="6.4" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function IconoFacebook() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M15.6 8.4h-2.1V6.9c0-.7.2-1.1 1.2-1.1h1V3.1c-.4 0-1.2-.1-2.1-.1-2.2 0-3.7 1.3-3.7 3.7v1.7H7.8v3h2.1V21h3.6v-9.6h2.1z"
      />
    </svg>
  );
}

export function IconoLinkedIn() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M6.9 20.5H3.6V9.7h3.3zM5.2 8.2A1.95 1.95 0 1 1 5.2 4.3a1.95 1.95 0 0 1 0 3.9M20.5 20.5h-3.3v-5.3c0-1.3 0-2.9-1.8-2.9s-2 1.4-2 2.8v5.4H10V9.7h3.2v1.5h.1a3.5 3.5 0 0 1 3.1-1.7c3.4 0 4 2.2 4 5.1z"
      />
    </svg>
  );
}
