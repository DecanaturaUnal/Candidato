/**
 * Geometria del lienzo, medida pixel a pixel sobre `assets/referencia/image.jpeg`.
 *
 * El mockup aprobado mide 896 x 1600 px. Todas las medidas de este archivo estan
 * expresadas en esos "pixeles de mockup". En CSS se traducen con la variable `--u`,
 * definida en `lienzo.css` como `calc(100cqw / 896)`: es decir, 1u == 1 px del mockup.
 *
 * Cambiar `ANCHO_MOCKUP` o `--canvas-scale` reescala la pieza completa como una unidad,
 * sin alterar ninguna proporcion interna.
 */

export const ANCHO_MOCKUP = 896;
export const ALTO_MOCKUP = 1600;

/** Bandas horizontales de color, de arriba hacia abajo (y inicial y alto, en u). */
export const BANDAS = {
  cabecera: { alto: 505 },
  franjaTurquesa: { y: 259, alto: 246 },
  navegacion: { alto: 66, barraY: 13, barraAlto: 39, sepY: 7, sepAlto: 53 },
  construir: { altoMinimo: 736 },
  pie: { alto: 293, azulAlto: 225 },
} as const;

/**
 * Piezas de la cabecera. Posicion y tamano en u, relativos a la cabecera.
 *
 * Los PNG que se consumen aqui son los que produce `scripts/preparar-assets.mjs`,
 * no los originales: estos traian horneados la franja turquesa y el bloque verde
 * limon, y con ellos era imposible reproducir el apilado del diseno.
 *
 * La figura esta posicionada con dos anclajes tomados del mockup que no admiten
 * ambiguedad: el tope de la cabeza (y=52) y el borde inferior de los zapatos
 * (y=496). Sobre el archivo esos puntos caen en el 2,000 % y el 98,200 % de su
 * altura, de donde salen alto = 461,5 y tope = 42,77. El ancho se comprobo aparte:
 * a la altura de los zapatos el contorno mide 91 u tanto en el mockup como aqui.
 */
export const MARCA = {
  figura: { src: "/marca/gustavo-figura.png", x: 419.65, y: 42.77, ancho: 307.7, alto: 461.5 },
  lockup: { src: "/marca/titulo-lockup.png", x: 112.0, y: 100.2, ancho: 486.8, alto: 260.1 },
  eslogan: { src: "/marca/eslogan.png", x: 73.5, y: 372.3, ancho: 396.2, alto: 79.1 },
  planilla: { src: "/marca/planilla-2.png", x: 650, y: 199, ancho: 171, alto: 127.2 },
} as const;

/**
 * Bloque vertical claro que va detras de la figura. Es un elemento propio, no parte
 * del PNG: en el mockup no guarda con la figura la proporcion que trae el archivo.
 *
 * Tiene el borde superior inclinado (baja 21,6 u de izquierda a derecha) y cruza la
 * linea de la franja turquesa, asi que se ve en dos tonos: crema sobre el blanco y
 * verde agua sobre el turquesa. Ambos valores estan muestreados del mockup.
 */
export const BLOQUE_CLARO = {
  x: 464,
  ancho: 226,
  /** Y del borde superior en el extremo izquierdo y en el derecho. */
  yTopIzq: 8.8,
  yTopDer: 30.4,
  yFin: 511,
  sobreBlanco: "#F9FAE8",
  sobreTurquesa: "#70C0B0",
} as const;

/**
 * Fraccion de la altura del lockup donde empezaba su turquesa horneado (803/1315).
 *
 * Ya no se usa para recortar -- `scripts/preparar-assets.mjs` elimina esa franja de
 * los PNG -- pero es la referencia con la que se dedujo la posicion vertical del
 * lockup: ese punto tenia que caer exactamente sobre el inicio de la franja (y=259).
 */
export const TURQUESA_EN_LOCKUP = 0.61065;

/** Barra de navegacion: separadores turquesa entre etiquetas. */
export const NAVEGACION = {
  separadores: [
    { x: 269, ancho: 24 },
    { x: 621, ancho: 24 },
  ],
  enlaces: [
    { id: "docentes", texto: "Docentes", centro: 145.5 },
    { id: "estudiantes", texto: "Estudiantes", centro: 459.5 },
    { id: "egresados", texto: "Egresados", centro: 778 },
  ],
} as const;

/** Seccion "Construir Futuro". Coordenadas relativas al inicio de la seccion. */
export const CONSTRUIR = {
  titulo: { x: 40, y: 18 },
  columnaIzq: { x: 38, ancho: 374 },
  columnaDer: { x: 440, ancho: 432 },
  grilla: { y: 84, anchoCol: [181, 180], altoFila: [149, 150], huecoX: 13, huecoY: 21 },
  parrafoIzq: { y: 425, x: 40, ancho: 372 },
  etiquetas: { y: 82, alto: 38, hueco: 6, colaAncho: 24, colaHueco: 2 },
  parrafoDer: { y: 237, ancho: 404 },
  fotoDestacada: { y: 388, x: 1, ancho: 431, alto: 337 },
} as const;

/** Pie de pagina. Coordenadas relativas al inicio de la seccion (y = 1307 del mockup). */
export const PIE = {
  textoIzq: { x: 58, y: 58, ancho: 300 },
  tarjeta: { x: 443, y: 69, ancho: 368, alto: 98, radio: 20 },
  icono: { cx: 625, cy: 53, diametro: 66 },
  campo: { x: 476, y: 133, ancho: 302, alto: 24, radio: 6 },
  redes: { diametro: 71, cy: 227, centros: [344, 447.5, 551] },
} as const;
