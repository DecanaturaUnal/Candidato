/**
 * Configuracion editable del sitio: enlaces, textos legales y datos del responsable.
 * Todo lo marcado como TODO debe completarlo el equipo de campana antes de publicar.
 */

/** Paleta muestreada directamente del mockup aprobado. */
export const PALETA = {
  azul: "#243468",
  turquesa: "#3BA7B3",
  celeste: "#EBF4FD",
  blanco: "#FFFFFF",
  /** Verde limon de marca. En la cabecera aparece al 23 % y ya viene horneado en el PNG. */
  limon: "#EBEA89",
} as const;

/** Redes sociales del pie de pagina. */
export const REDES = {
  instagram: "#", // TODO: reemplazar por la URL real de Instagram
  facebook: "#", // TODO: reemplazar por la URL real de Facebook
  linkedin: "#", // TODO: reemplazar por la URL real de LinkedIn
} as const;

/** Datos del responsable del tratamiento de datos (Ley 1581 de 2012). */
export const RESPONSABLE = {
  nombre: "TODO: nombre del responsable del tratamiento",
  correo: "TODO: correo-de-contacto@example.com",
  direccion: "TODO: direccion fisica de notificaciones",
} as const;

/**
 * Fotos de la seccion "Construir Futuro".
 *
 * `intrinseco` es el tamano real del archivo y `encuadre` la region de ese archivo
 * que se ve dentro del recuadro, en pixeles de la propia foto. Expresarlo asi -- y no
 * como object-position -- permite cualquier recorte: con object-position el zoom se
 * aplica desde el centro y hay encuadres del mockup que quedan fuera de alcance.
 *
 * Los valores salen de `scripts/ajustar-encuadres.mjs`, que busca en cada foto la
 * region que mas se parece a lo que muestra el mockup: la publicista recorto cada una
 * a mano y no siguen una regla comun.
 *
 * Para cambiar una foto basta con reemplazar el archivo y volver a correr ese script;
 * el recuadro y su posicion en la maqueta no se mueven.
 */
export const FOTOS = {
  grilla: [
    {
      // Sin referencia en el mockup: alli va otro recorte de la aerea. Se centra.
      src: "/fotos/campus-01.jpg",
      alt: "Letrero del campus universitario de Manizales",
      intrinseco: { ancho: 512, alto: 512 },
      encuadre: { x: 0, y: 46, ancho: 512, alto: 421 },
    },
    {
      src: "/fotos/campus-02.jpg",
      alt: "Edificio curvo del campus visto desde la escalinata",
      intrinseco: { ancho: 335, alto: 597 },
      encuadre: { x: 12, y: 68, ancho: 308, alto: 255 },
    },
    {
      src: "/fotos/campus-03.jpg",
      alt: "Edificio de fachada verde rodeado de zonas verdes",
      intrinseco: { ancho: 1024, alto: 596 },
      encuadre: { x: 424, y: 56, ancho: 581, alto: 481 },
    },
    {
      src: "/fotos/campus-04.jpg",
      alt: "Vista aerea de las terrazas y senderos del campus",
      intrinseco: { ancho: 512, alto: 512 },
      encuadre: { x: 270, y: 280, ancho: 241, alto: 201 },
    },
  ],
  destacada: {
    src: "/fotos/campus-destacada.jpg",
    alt: "Fachada del edificio con celosia verde y jardin de aves del paraiso",
    intrinseco: { ancho: 2000, alto: 1647 },
    encuadre: { x: 0, y: 83, ancho: 2000, alto: 1564 },
  },
} as const;
