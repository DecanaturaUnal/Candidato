/**
 * Captura la pagina tal como la ve un visitante, con el escenario alrededor.
 *
 * A diferencia de `captura.mjs` (que aisla el lienzo a 896 px para comparar contra
 * el mockup), aqui NO se toca `--canvas-scale`: se mira el resultado real.
 *
 * Uso:  node scripts/captura-escenario.mjs [ancho] [alto] [salida]
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const ancho = Number(process.argv[2] ?? 1440);
const alto = Number(process.argv[3] ?? 1000);
const salida = process.argv[4] ?? `scripts/salida/escenario-${ancho}.png`;

const navegador = await chromium.launch();
const pagina = await navegador.newPage({
  viewport: { width: ancho, height: alto },
  deviceScaleFactor: 1,
});

await pagina.goto("http://localhost:3000", { waitUntil: "networkidle" });
await pagina.evaluate(async () => {
  document.querySelectorAll("img").forEach((im) => (im.loading = "eager"));
  await document.fonts.ready;
  await Promise.all(
    [...document.querySelectorAll("img")].map((im) =>
      im.complete && im.naturalWidth
        ? Promise.resolve()
        : new Promise((ok) => {
            im.addEventListener("load", ok, { once: true });
            im.addEventListener("error", ok, { once: true });
          }),
    ),
  );
});
await pagina.waitForTimeout(700);

await mkdir(path.dirname(salida), { recursive: true });
await pagina.screenshot({ path: salida });
console.log(`Capturado ${salida} (${ancho}x${alto})`);

await navegador.close();
