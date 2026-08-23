/**
 * Captura la portada renderizada para poder compararla contra el mockup aprobado.
 *
 * Fija el lienzo a 896 px de ancho (el ancho nativo del mockup) para que la
 * comparacion sea 1:1 y no dependa de --canvas-scale.
 *
 * Uso:  node scripts/captura.mjs [url] [salida]
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const url = process.argv[2] ?? "http://localhost:3000";
const salida = process.argv[3] ?? "scripts/salida/render.png";

const navegador = await chromium.launch();
// Viewport mas alto que el lienzo: asi ninguna imagen queda fuera de pantalla
// y el lazy-loading de next/image no deja huecos en blanco en la captura.
const pagina = await navegador.newPage({
  viewport: { width: 1100, height: 1750 },
  deviceScaleFactor: 1,
});

await pagina.goto(url, { waitUntil: "networkidle" });

// Ancho nativo del mockup y sin animaciones que ensucien la captura
await pagina.addStyleTag({
  content: `
    :root { --canvas-ancho: 896px !important; --canvas-scale: 1 !important; }
    .escenario { padding-block: 0 !important; }
    *, *::before, *::after { transition: none !important; animation: none !important; }
  `,
});
// Fuerza la carga inmediata de todas las imagenes y espera a que terminen
await pagina.evaluate(async () => {
  document.querySelectorAll("img").forEach((im) => {
    im.loading = "eager";
    im.decoding = "sync";
  });
  await document.fonts.ready;
  await Promise.all(
    [...document.querySelectorAll("img")].map((im) =>
      im.complete && im.naturalWidth > 0
        ? Promise.resolve()
        : new Promise((ok) => {
            im.addEventListener("load", ok, { once: true });
            im.addEventListener("error", ok, { once: true });
          }),
    ),
  );
});
await pagina.waitForTimeout(800);

const sinCargar = await pagina.evaluate(() =>
  [...document.querySelectorAll("img")]
    .filter((im) => !im.naturalWidth)
    .map((im) => im.src),
);
if (sinCargar.length) {
  console.warn("Imagenes que no cargaron:\n  " + sinCargar.join("\n  "));
}

await mkdir(path.dirname(salida), { recursive: true });
const lienzo = pagina.locator(".lienzo");
await lienzo.screenshot({ path: salida });

const caja = await lienzo.boundingBox();
console.log(`Capturado ${salida} -> ${caja.width} x ${caja.height}`);

await navegador.close();
