/**
 * Compara la captura de la pagina contra el mockup aprobado.
 *
 * Genera dos archivos en scripts/salida/:
 *   - diferencia.png : mapa de diferencias (negro = coincide, rojo = desviacion)
 *   - lado-a-lado.png: mockup y render uno al lado del otro, para revisar a ojo
 *
 * Ademas imprime el porcentaje de pixeles que difieren, por franjas horizontales,
 * para saber en que zona esta el problema.
 *
 * Uso:  node scripts/comparar.mjs [render.png] [mockup.jpg]
 */
import sharp from "sharp";
import path from "node:path";
import { mkdir, readFile } from "node:fs/promises";

const rutaRender = process.argv[2] ?? "scripts/salida/render.png";
const rutaMockup = process.argv[3] ?? "assets/referencia/image.jpeg";
const salidaDir = "scripts/salida";

/** Diferencia de color por encima de la cual se considera desviacion real. */
const UMBRAL = 34;

const leer = async (ruta, ancho, alto) => {
  let img = sharp(ruta).removeAlpha();
  if (ancho) img = img.resize(ancho, alto, { fit: "fill" });
  return img.raw().toBuffer({ resolveWithObject: true });
};

const mockup = await leer(rutaMockup);
const { width: W, height: H } = mockup.info;
const render = await leer(rutaRender, W, H);

const diff = Buffer.alloc(W * H * 3);
let distintos = 0;
const porFranja = new Array(Math.ceil(H / 100)).fill(0);

for (let i = 0; i < W * H; i++) {
  const j = i * 3;
  const d =
    Math.abs(mockup.data[j] - render.data[j]) +
    Math.abs(mockup.data[j + 1] - render.data[j + 1]) +
    Math.abs(mockup.data[j + 2] - render.data[j + 2]);

  if (d > UMBRAL) {
    distintos++;
    porFranja[Math.floor(Math.floor(i / W) / 100)]++;
    diff[j] = Math.min(255, 80 + d); // rojo proporcional a la desviacion
    diff[j + 1] = 0;
    diff[j + 2] = 0;
  } else {
    const gris = Math.round(render.data[j] * 0.12);
    diff[j] = gris;
    diff[j + 1] = gris;
    diff[j + 2] = gris;
  }
}

await mkdir(salidaDir, { recursive: true });
await sharp(diff, { raw: { width: W, height: H, channels: 3 } })
  .png()
  .toFile(path.join(salidaDir, "diferencia.png"));

const lado = await sharp({
  create: {
    width: W * 2 + 24,
    height: H,
    channels: 3,
    background: { r: 255, g: 255, b: 255 },
  },
})
  .composite([
    { input: rutaMockup, left: 0, top: 0 },
    {
      input: await sharp(rutaRender).resize(W, H, { fit: "fill" }).toBuffer(),
      left: W + 24,
      top: 0,
    },
  ])
  .png()
  .toBuffer();
await sharp(lado).toFile(path.join(salidaDir, "lado-a-lado.png"));

/**
 * Zonas ocupadas por fotografias. Se contabilizan aparte porque ahi la diferencia no
 * mide la maquetacion: el mockup es un JPEG recomprimido y una de las fotos de la
 * grilla se cambio a proposito respecto de la referencia.
 */
const ZONAS_FOTO = [
  [38, 655, 181, 149],
  [232, 655, 180, 149],
  [38, 825, 181, 150],
  [232, 825, 180, 150],
  [441, 959, 431, 337],
];
const enFoto = (x, y) =>
  ZONAS_FOTO.some(
    ([l, t, w, h]) => x >= l && x < l + w && y >= t && y < t + h,
  );

/**
 * Banda de arriba que tapa la barra superior fija.
 *
 * La barra es cromo de la web, no parte de la pieza aprobada: comparar esos pixeles
 * contra el mockup no mide nada. El alto lo escribe captura.mjs, medido sobre la
 * pagina real, porque depende del ancho del viewport. Si el archivo no esta --por
 * ejemplo tras una captura hecha con una version anterior-- se descuenta 0 y la
 * comparacion se comporta como siempre.
 */
let altoBarra = 0;
try {
  const { alto } = JSON.parse(
    await readFile(path.join(salidaDir, "franja-barra.json"), "utf8"),
  );
  altoBarra = Number(alto) || 0;
} catch {
  altoBarra = 0;
}

let distintosSinFotos = 0;
let totalSinFotos = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (y < altoBarra) continue;
    if (enFoto(x, y)) continue;
    totalSinFotos++;
    const j = (y * W + x) * 3;
    const d =
      Math.abs(mockup.data[j] - render.data[j]) +
      Math.abs(mockup.data[j + 1] - render.data[j + 1]) +
      Math.abs(mockup.data[j + 2] - render.data[j + 2]);
    if (d > UMBRAL) distintosSinFotos++;
  }
}

const pct = ((distintos / (W * H)) * 100).toFixed(2);
const pctSin = ((distintosSinFotos / totalSinFotos) * 100).toFixed(2);
console.log(`Pixeles con desviacion: ${distintos} de ${W * H}  (${pct} %)`);
console.log(
  `  excluyendo fotografias${altoBarra ? ` y la franja de la barra (${altoBarra} px)` : ""}: ` +
    `${pctSin} %  <- esto mide la maquetacion`,
);
console.log("Desviacion por franja de 100 px de alto:");
porFranja.forEach((n, i) => {
  const p = (n / (W * 100)) * 100;
  const barra = "#".repeat(Math.min(50, Math.round(p / 2)));
  console.log(
    `  y ${String(i * 100).padStart(4)}-${String(i * 100 + 99).padStart(4)}  ${p.toFixed(1).padStart(5)} %  ${barra}`,
  );
});
