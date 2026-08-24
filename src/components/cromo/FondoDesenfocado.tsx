"use client";

import { useEffect, useRef } from "react";

/**
 * Fondo: copia ampliada y desenfocada del propio contenido.
 *
 * POR QUE SE CLONA EN EL CLIENTE Y NO EN EL SERVIDOR
 * Duplicar el arbol en el servidor habria duplicado tambien el muro interactivo
 * --que consulta Supabase al montarse-- y los controles del formulario: dos
 * peticiones y dos formularios fantasma por cada visita. Clonando el DOM ya
 * pintado se obtiene el mismo resultado visual sin ejecutar nada dos veces, y las
 * imagenes salen de la cache del navegador en vez de pedirse otra vez.
 *
 * SINCRONIZACION CON EL SCROLL
 * El clon esta ampliado por ESCALA, asi que NO basta con desplazarlo -scrollY: al
 * estar magnificado necesita recorrer MAS pixeles para mostrar el mismo tramo de
 * contenido. Con la capa transformada como `translate3d(0,T,0) scale(S)` y origen
 * arriba al centro, un punto del contenido a distancia `y` del inicio aparece en
 * pantalla en `y*S + T`; delante, ese mismo punto esta en `y - scrollY`. Igualando
 * ambos en el centro del viewport (la referencia que menos se nota al desviarse):
 *
 *     T = -S*scrollY + (alto/2)*(1 - S)
 *
 * Es decir se MULTIPLICA por la escala, no se divide. Medido sobre esta pagina, con
 * el titulo de seccion mas cercano al centro de la pantalla como testigo:
 *
 *              inicio   mitad   final
 *   x escala     264      -5     -208   <- esta
 *   / escala     343     682     1086   <- se va corriendo con el scroll
 *   -scrollY     343     408      539
 *
 * El registro es exacto en el centro del viewport por construccion; lo que queda es
 * error de escala, que crece con la distancia a ese centro y no con el scroll. Por
 * eso la escala se mantiene baja: con blur(34px) basta un sangrado de ~100 px para
 * que no se vean los bordes del clon, y cada decima de mas es deriva de regalo.
 */
const ESCALA = 1.16;

/**
 * Margen de sangrado, en px, para que el desenfoque no descubra el borde del clon.
 * Tiene que superar el radio del blur de .fondo__capa.
 */
const SANGRADO = 120;

/** Cuanto persigue el fondo a su objetivo en cada cuadro. Mas bajo = mas inercia. */
const SUAVIZADO = 0.08;

/** Por debajo de esto se considera que llego y se detiene el bucle. */
const EPSILON = 0.1;

export function FondoDesenfocado({ selector }: { selector: string }) {
  const capaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const capa = capaRef.current;
    const origen = document.querySelector(selector);
    if (!capa || !origen) return;

    const clonar = () => {
      const clon = origen.cloneNode(true) as HTMLElement;
      // Los id duplicados romperian las anclas (#docentes podria saltar al clon) y
      // los label[for] del formulario. Se limpian en la copia, no en el original.
      clon.removeAttribute("id");
      for (const nodo of clon.querySelectorAll("[id]")) nodo.removeAttribute("id");
      // Nada del clon debe ser alcanzable: ni con el raton, ni con el teclado, ni
      // por un lector de pantalla.
      clon.setAttribute("aria-hidden", "true");
      clon.setAttribute("inert", "");
      clon.classList.add("fondo__clon");
      capa.replaceChildren(clon);
    };

    const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");

    /*
      La escala HORIZONTAL se calcula aparte, y suele ser bastante mayor.
      El contenido es una columna estrecha centrada (unos 765 px): ampliada solo
      1,16 deja franjas a los lados donde no hay nada que desenfocar, y ahi vuelve a
      asomar el color plano. Estirarla a lo ancho hasta cubrir el viewport no cuesta
      nada, porque el eje X no interviene en la sincronizacion con el scroll: la
      deriva la manda unicamente la escala vertical. La deformacion no se aprecia
      bajo 34 px de desenfoque.
    */
    let escalaX = ESCALA;
    const calcularEscalaX = () => {
      const columna = document.querySelector(`${selector} .canvas`);
      const ancho = columna?.getBoundingClientRect().width ?? window.innerWidth;
      return Math.max(ESCALA, (window.innerWidth + 2 * SANGRADO) / Math.max(ancho, 1));
    };

    let objetivo = 0;
    let actual = 0;
    let animando = false;
    let cuadro = 0;

    const aplicar = () => {
      capa.style.transform =
        `translate3d(0, ${actual.toFixed(2)}px, 0) ` +
        `scale(${escalaX.toFixed(3)}, ${ESCALA})`;
    };

    /*
      El alto del viewport se lee en el momento y no se guarda al montar: si el
      componente monta con la pestana en segundo plano, ahi innerHeight vale 0 y el
      termino constante quedaria mal para el resto de la vida de la pagina.
      Ademas asi el giro del movil no necesita ningun aviso aparte.
    */
    const calcularObjetivo = () =>
      -ESCALA * window.scrollY + (window.innerHeight / 2) * (1 - ESCALA);

    const bucle = () => {
      const resto = objetivo - actual;
      if (Math.abs(resto) < EPSILON) {
        actual = objetivo;
        aplicar();
        animando = false;
        return;
      }
      actual += resto * SUAVIZADO;
      aplicar();
      cuadro = requestAnimationFrame(bucle);
    };

    // El listener no hace mas que anotar el objetivo; el trabajo va en el rAF.
    const alScrollear = () => {
      objetivo = calcularObjetivo();
      if (!animando) {
        animando = true;
        cuadro = requestAnimationFrame(bucle);
      }
    };

    clonar();
    escalaX = calcularEscalaX();

    if (sinMovimiento.matches) {
      // Estatico y desenfocado: sin inercia y sin seguir el scroll.
      actual = 0;
      aplicar();
      return () => capa.replaceChildren();
    }

    objetivo = calcularObjetivo();
    actual = objetivo;
    aplicar();
    window.addEventListener("scroll", alScrollear, { passive: true });

    // Al cambiar de tamano el contenido se remaqueta: hay que rehacer la copia.
    let reloj: ReturnType<typeof setTimeout>;
    const alRedimensionar = () => {
      clearTimeout(reloj);
      reloj = setTimeout(() => {
        clonar();
        escalaX = calcularEscalaX();
        objetivo = calcularObjetivo();
        actual = objetivo;
        aplicar();
      }, 200);
    };
    window.addEventListener("resize", alRedimensionar, { passive: true });

    // Con la pestana en segundo plano el navegador no entrega cuadros, asi que el
    // rAF no corre y el fondo se queda donde estuviera. Al volver se recoloca de
    // golpe en vez de arrastrarse desde una posicion vieja.
    const alVolver = () => {
      if (document.visibilityState !== "visible") return;
      escalaX = calcularEscalaX();
      objetivo = calcularObjetivo();
      actual = objetivo;
      aplicar();
    };
    document.addEventListener("visibilitychange", alVolver);

    return () => {
      window.removeEventListener("scroll", alScrollear);
      window.removeEventListener("resize", alRedimensionar);
      document.removeEventListener("visibilitychange", alVolver);
      clearTimeout(reloj);
      cancelAnimationFrame(cuadro);
      capa.replaceChildren();
    };
  }, [selector]);

  return (
    <div className="fondo" aria-hidden>
      <div className="fondo__capa" ref={capaRef} />
      <div className="fondo__velo" />
    </div>
  );
}
