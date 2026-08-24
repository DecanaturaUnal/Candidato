/**
 * Limpia el fondo horneado de los PNG de marca.
 *
 * POR QUE HACE FALTA
 * ------------------
 * Los archivos que entrego la publicista no son recortes limpios: ademas de la
 * figura y del texto, traen "horneada" la franja turquesa de la cabecera (y, en el
 * caso de la figura, tambien el bloque verde limon al 23 % de opacidad).
 *
 * Eso rompe la superposicion del diseno: el turquesa opaco de la figura tapa las
 * palabras "OSORIO" y "Facultad de Ingenieria y Arquitectura" del lockup, que en el
 * mockup aprobado se ven completas.
 *
 * Ademas, el bloque verde limon del PNG de la figura NO guarda con ella la misma
 * proporcion que en el mockup: medido sobre la referencia, en la pieza final el
 * bloque es un 9 % mas ancho respecto a la figura de lo que viene en el archivo.
 * Son dos elementos independientes que el exportador aplano juntos. Por eso aqui
 * tambien se quita el bloque: la pagina lo dibuja aparte, con su geometria real
 * (ver `MARCA.bloqueClaro` en src/config/maqueta.ts).
 *
 * QUE HACE
 * --------
 * Vuelve transparentes los pixeles de fondo horneado y deja intacto todo lo demas
 * (el cuerpo de Gustavo, el texto blanco del lockup):
 *   - turquesa plano, por debajo de donde arranca la franja
 *   - verde limon translucido (sobre blanco) y aplanado sobre turquesa
 *
 * El resultado son recortes de verdad, que se pueden apilar en cualquier orden
 * sobre la franja turquesa que dibuja la propia pagina.
 *
 * Es idempotente: parte siempre de assets/marca/ y reescribe public/marca/.
 *
 * Uso:  node scripts/preparar-assets.mjs
 */
import sharp from "sharp";
import path from "node:path";
import { mkdir, rm } from "node:fs/promises";

const ORIGEN = "assets/marca";
const DESTINO = "public/marca";

/** Colores de marca, muestreados de los propios PNG. */
const TURQUESA = [58, 167, 178];
/** Verde limon translucido, tal como esta guardado sobre fondo blanco. */
const LIMON = [235, 234, 137];
/** El mismo limon, ya aplanado sobre el turquesa dentro del archivo. */
const LIMON_APLANADO = [118, 183, 171];

const cerca = (r, g, b, ref, tol) =>
  Math.abs(r - ref[0]) <= tol &&
  Math.abs(g - ref[1]) <= tol &&
  Math.abs(b - ref[2]) <= tol;

/**
 * Localiza la primera fila totalmente ocupada por turquesa plano: ahi empieza la
 * franja horneada. Se busca en una columna del borde, lejos de la figura y del texto.
 */
function filaDeLaFranja(datos, ancho, alto, canales, xSonda) {
  for (let y = 0; y < alto; y++) {
    const i = (y * ancho + xSonda) * canales;
    const a = canales === 4 ? datos[i + 3] : 255;
    if (a > 200 && cerca(datos[i], datos[i + 1], datos[i + 2], TURQUESA, 12)) {
      return y;
    }
  }
  return -1;
}

async function limpiar(archivo, salida, xSonda, quitarBloque = false) {
  const entrada = sharp(path.join(ORIGEN, archivo)).ensureAlpha();
  const { data, info } = await entrada
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const y0 = filaDeLaFranja(data, width, height, channels, xSonda);
  if (y0 < 0) {
    console.log(`  ${archivo}: sin franja horneada, se copia tal cual`);
  }

  let franja = 0;
  let bloque = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      if (data[i + 3] < 40) continue;
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];

      // La franja solo existe por debajo de y0; arriba, ese turquesa es tipografia.
      if (y0 >= 0 && y >= y0 && cerca(r, g, b, TURQUESA, 16)) {
        data[i + 3] = 0;
        franja++;
      } else if (
        quitarBloque &&
        (cerca(r, g, b, LIMON, 15) || cerca(r, g, b, LIMON_APLANADO, 15))
      ) {
        data[i + 3] = 0;
        bloque++;
      }
    }
  }

  await mkdir(DESTINO, { recursive: true });
  await sharp(data, { raw: { width, height, channels } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(DESTINO, salida));

  console.log(
    `  ${salida.padEnd(20)} ${width}x${height}  franja desde y=${y0}  ` +
      `px de franja: ${franja}  px de bloque: ${bloque}`,
  );
}

/** Turquesa de la paleta del sitio (src/config/sitio.ts -> PALETA.turquesa). */
const TURQUESA_SITIO = [59, 167, 179];

/**
 * Sello institucional: de cuadro turquesa a marca turquesa recortada.
 *
 * El archivo oficial viene como cuadro de color con la forma en blanco calada y las
 * letras en negativo. Puesto tal cual sobre el cristal claro de la barra se veria
 * como un rectangulo pegado encima. Lo que hace falta es lo contrario: la FORMA en
 * turquesa y el fondo transparente, con las letras caladas dejando pasar la barra.
 *
 * Se invierte midiendo cuanto se acerca cada pixel al blanco, tomando como cero el
 * color de la esquina --no se supone cual es-- y usando esa distancia como alfa. Al
 * ser una rampa y no un umbral, los bordes suavizados del original se conservan y
 * la marca no queda dentada.
 */
async function sello(archivo, salida) {
  const { data, info } = await sharp(path.join(ORIGEN, archivo))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const luz = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
  const fondo = luz(data[0], data[1], data[2]);
  const rango = 255 - fondo;

  for (let i = 0; i < data.length; i += channels) {
    const cercania = (luz(data[i], data[i + 1], data[i + 2]) - fondo) / rango;
    [data[i], data[i + 1], data[i + 2]] = TURQUESA_SITIO;
    data[i + 3] = Math.round(Math.max(0, Math.min(1, cercania)) * 255);
  }

  await mkdir(DESTINO, { recursive: true });
  const recortada = await sharp(data, {
    raw: { width, height, channels },
  })
    // Fuera el margen que deja el cuadro original, ya transparente.
    .trim()
    .png({ compressionLevel: 9 })
    .toFile(path.join(DESTINO, salida));

  console.log(
    `  ${salida.padEnd(20)} ${width}x${height} -> ` +
      `${recortada.width}x${recortada.height} recortado, en turquesa de marca`,
  );
}

console.log("Limpiando fondos horneados de los PNG de marca:");

// xSonda: una columna que solo atraviese fondo, nunca la figura ni el texto.
await limpiar("REFERENTES GUSTAVIO oSORIO-20.png", "gustavo-figura.png", 60, true);
await limpiar("REFERENTES GUSTAVIO oSORIO-21.png", "titulo-lockup.png", 40);

// Estos dos ya venian con transparencia limpia: solo se copian normalizados.
await limpiar("REFERENTES GUSTAVIO oSORIO-22.png", "eslogan.png", 5);
await limpiar("REFERENTES GUSTAVIO oSORIO-23.png", "planilla-2.png", 5);

// Sello de la universidad para la barra superior: caso aparte, se invierte.
await sello("unal.png", "unal.png");

// next/image guarda las versiones optimizadas en disco y no se entera de que los
// originales cambiaron: sin esto se seguirian sirviendo los PNG viejos.
for (const cache of [".next/dev/cache/images", ".next/cache/images"]) {
  await rm(cache, { recursive: true, force: true });
}
console.log("Listo. (cache de imagenes de next invalidada)");
