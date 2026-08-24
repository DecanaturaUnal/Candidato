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

// Acotado a #contenido: el fondo desenfocado es una COPIA del mismo arbol, asi
// que sin acotar cada selector encontraria dos elementos y Playwright, que es
// estricto a proposito, se negaria a elegir.
const caja = (sel) => pagina.locator(`#contenido ${sel}`).boundingBox();

const grillaAntes = await caja(".construir__grilla");
const seccionAntes = await caja(".construir");

for (const boton of await pagina.locator("#contenido .acordeon__boton").all()) {
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
  [...document.querySelectorAll("#contenido .navegacion__enlace")].map((a) => {
    const destino = document.querySelector(a.getAttribute("href"));
    return `  ${a.textContent} -> ${a.getAttribute("href")}: ${destino ? "existe" : "ROTO"}`;
  }),
);
console.log("Anclas de la navegacion:");
console.log(anclas.join("\n"));

/*
  El fondo es una copia del contenido. Si esa copia no queda bien marcada, duplica
  la pagina para los lectores de pantalla y mete una segunda tanda de elementos
  enfocables con el tabulador. Se comprueba aqui porque es consecuencia directa de
  como esta hecho el fondo, y es facil de romper sin darse cuenta.
*/
const clon = await pagina.evaluate(() => {
  const c = document.querySelector(".fondo__clon");
  if (!c) return null;
  const real = document.querySelector("#contenido");
  return {
    ariaHidden: c.getAttribute("aria-hidden"),
    inert: c.hasAttribute("inert"),
    ids: c.querySelectorAll("[id]").length,
    vaDespues: Boolean(
      real.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING,
    ),
  };
});
console.log("Copia decorativa del fondo:");
if (!clon) {
  console.log("  NO EXISTE (el fondo no llego a montarse)");
} else {
  const si = (v) => (v ? "SI" : "NO");
  console.log("  oculta a lectores de pantalla: " + si(clon.ariaHidden === "true"));
  console.log("  fuera del tabulador (inert):   " + si(clon.inert));
  console.log("  sin ids duplicados:            " + si(clon.ids === 0));
  console.log("  despues del contenido real:    " + si(clon.vaDespues));
}

await pagina.evaluate(() =>
  document.querySelector("#contenido .construir").scrollIntoView(),
);
await pagina.waitForTimeout(300);
await pagina.screenshot({ path: "scripts/salida/acordeones-abiertos.png" });

await navegador.close();
