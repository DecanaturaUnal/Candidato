/**
 * Comprobaciones de interaccion de la portada.
 *
 *  - Los acordeones se abren sin descuadrar la columna izquierda de la pieza.
 *  - Los tres enlaces de la barra de navegacion apuntan a anclas que existen.
 *
 * Uso:  node scripts/probar-interaccion.mjs [url]
 */
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3000";

const navegador = await chromium.launch();
const pagina = await navegador.newPage({
  viewport: { width: 1440, height: 1100 },
  deviceScaleFactor: 1,
});

await pagina.goto(base, { waitUntil: "networkidle" });
await pagina.evaluate(async () => {
  document.querySelectorAll("img").forEach((im) => (im.loading = "eager"));
  await document.fonts.ready;
});
await pagina.waitForTimeout(800);

const caja = (sel) => pagina.locator(sel).boundingBox();

const grillaAntes = await caja(".construir__grilla");
const seccionAntes = await caja(".construir");

for (const boton of await pagina.locator(".acordeon__boton").all()) {
  await boton.click();
}
await pagina.waitForTimeout(400);

const grillaDespues = await caja(".construir__grilla");
const seccionDespues = await caja(".construir");

const igual = (a, b) =>
  Math.abs(a.x - b.x) < 0.6 &&
  Math.abs(a.y - b.y) < 0.6 &&
  Math.abs(a.width - b.width) < 0.6 &&
  Math.abs(a.height - b.height) < 0.6;

console.log("Acordeones abiertos:");
console.log(
  `  grilla de fotos quieta: ${igual(grillaAntes, grillaDespues) ? "SI" : "NO"}`,
);
console.log(
  `  alto de la seccion: ${seccionAntes.height.toFixed(1)} -> ${seccionDespues.height.toFixed(1)}`,
);

const anclas = await pagina.evaluate(() =>
  [...document.querySelectorAll(".navegacion__enlace")].map((a) => {
    const destino = document.querySelector(a.getAttribute("href"));
    return `  ${a.textContent} -> ${a.getAttribute("href")}: ${destino ? "existe" : "ROTO"}`;
  }),
);
console.log("Anclas de la navegacion:");
console.log(anclas.join("\n"));

await pagina.evaluate(() =>
  document.querySelector(".construir").scrollIntoView(),
);
await pagina.waitForTimeout(300);
await pagina.screenshot({ path: "scripts/salida/acordeones-abiertos.png" });

await navegador.close();
