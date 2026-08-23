/**
 * Deduce el encuadre de cada foto comparandola contra el mockup aprobado.
 *
 * La publicista recorto cada foto a mano, sin una regla comun. En vez de estimar los
 * recortes a ojo, este script busca, para cada recuadro, la region de la foto original
 * que mas se parece a lo que muestra el mockup, y la traduce a los valores
 * `posicion` / `zoom` que consume `src/config/sitio.ts`.
 *
 * Se ejecuta a mano cuando cambien las fotos; su salida se pega en la configuracion.
 *
 * Uso:  node scripts/ajustar-encuadres.mjs
 */
import sharp from "sharp";

const MOCKUP = "assets/referencia/image.jpeg";

/** Recuadros del mockup, en px del mockup, y la foto que va en cada uno. */
const RECUADROS = [
  { nombre: "grilla[1] campus-02", foto: "public/fotos/campus-02.jpg", caja: [232, 655, 180, 149] },
  { nombre: "grilla[2] campus-03", foto: "public/fotos/campus-03.jpg", caja: [38, 825, 181, 150] },
  { nombre: "grilla[3] campus-04", foto: "public/fotos/campus-04.jpg", caja: [232, 825, 180, 150] },
  { nombre: "destacada", foto: "public/fotos/campus-destacada.jpg", caja: [441, 959, 431, 337] },
];

/** Resolucion a la que se comparan los recortes: suficiente para la forma, rapido. */
const MUESTRA_W = 64;
const MUESTRA_H = 52;

const aMuestra = (entrada) =>
  sharp(entrada)
    .resize(MUESTRA_W, MUESTRA_H, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer();

/** Diferencia media absoluta entre dos muestras. */
function distancia(a, b) {
  let suma = 0;
  for (let i = 0; i < a.length; i++) suma += Math.abs(a[i] - b[i]);
  return suma / a.length;
}

for (const { nombre, foto, caja } of RECUADROS) {
  const [cx, cy, W, H] = caja;

  const referencia = await aMuestra(
    await sharp(MOCKUP)
      .extract({ left: cx, top: cy, width: W, height: H })
      .toBuffer(),
  );

  const meta = await sharp(foto).metadata();
  const w = meta.width;
  const h = meta.height;
  const relacion = W / H;

  // El recorte mas amplio posible que conserva la relacion del recuadro
  const anchoMaximo = Math.min(w, h * relacion);

  let mejor = null;
  // Dos pasadas: una gruesa para ubicar la zona y otra fina alrededor
  let rango = {
    anchos: [],
    paso: Math.max(4, Math.round(anchoMaximo / 24)),
  };
  for (let f = 0.34; f <= 1.001; f += 0.055) {
    rango.anchos.push(Math.round(anchoMaximo * f));
  }

  for (let pasada = 0; pasada < 2; pasada++) {
    for (const rw of rango.anchos) {
      const rh = Math.round(rw / relacion);
      if (rh > h || rw > w) continue;
      for (let rx = 0; rx <= w - rw; rx += rango.paso) {
        for (let ry = 0; ry <= h - rh; ry += rango.paso) {
          const trozo = await aMuestra(
            await sharp(foto)
              .extract({ left: rx, top: ry, width: rw, height: rh })
              .toBuffer(),
          );
          const d = distancia(referencia, trozo);
          if (!mejor || d < mejor.d) mejor = { d, rx, ry, rw, rh };
        }
      }
    }
    if (pasada === 0) {
      // Refino alrededor del mejor candidato
      const anchos = [];
      for (let k = -3; k <= 3; k++) {
        const a = Math.round(mejor.rw * (1 + k * 0.035));
        if (a > 20 && a <= anchoMaximo) anchos.push(a);
      }
      rango = { anchos, paso: Math.max(2, Math.round(rango.paso / 4)) };
    }
  }

  console.log(
    `${nombre}  (diferencia ${mejor.d.toFixed(1)})\n` +
      `  intrinseco: { ancho: ${w}, alto: ${h} },\n` +
      `  encuadre: { x: ${mejor.rx}, y: ${mejor.ry}, ancho: ${mejor.rw}, alto: ${mejor.rh} },`,
  );
}
