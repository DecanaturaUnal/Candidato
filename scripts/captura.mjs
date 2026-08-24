/**
 * Captura la portada renderizada para poder compararla contra el mockup aprobado.
 *
 * Fija el lienzo a 896 px de ancho (el ancho nativo del mockup) para que la
 * comparacion sea 1:1 y no dependa de --canvas-scale.
 *
 * Uso:  node scripts/captura.mjs [url] [salida]
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
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
const lienzo = pagina.locator("#contenido .lienzo");
await lienzo.screenshot({ path: salida });

const caja = await lienzo.boundingBox();
console.log(`Capturado ${salida} -> ${caja.width} x ${caja.height}`);

/*
  La barra superior es fija y se superpone sobre las primeras filas de la pieza, asi
  que en la captura tapa una banda que el mockup no tiene. No se oculta para
  capturar --lo que se compara debe ser lo que ve el visitante-- sino que se mide
  cuanto tapa y se anota, para que la comparacion la descuente. Se mide aqui y no se
  fija a mano porque el alto de la barra depende del ancho del viewport.
*/
const franjaBarra = await pagina.evaluate(() => {
  const barra = document.querySelector(".barra");
  const pieza = document.querySelector("#contenido .lienzo");
  if (!barra || !pieza) return 0;
  const b = barra.getBoundingClientRect();
  const p = pieza.getBoundingClientRect();

  /*
    La barra no acaba en su borde: la sombra sigue tinendo pixeles por debajo. Si
    solo se descontara la caja, esa cola quedaria dentro de la comparacion y se
    contaria como desviacion de la maquetacion, que es justo lo que no es. El
    alcance de cada capa de sombra es desplazamiento + desenfoque + extension; las
    capas `inset` no salen del elemento y no cuentan.
  */
  const sombra = getComputedStyle(barra).boxShadow;
  let cola = 0;
  if (sombra && sombra !== "none") {
    for (const capa of sombra.split(/,(?![^(]*\))/)) {
      if (capa.includes("inset")) continue;
      const n = capa.match(/-?[\d.]+px/g);
      if (!n || n.length < 3) continue;
      const [, desplazamientoY, desenfoque, extension = "0"] = n;
      cola = Math.max(
        cola,
        parseFloat(desplazamientoY) + parseFloat(desenfoque) + parseFloat(extension),
      );
    }
  }

  const abajo = Math.min(b.bottom + cola, p.bottom);
  return Math.max(0, abajo - Math.max(b.top, p.top));
});
await writeFile(
  path.join(path.dirname(salida), "franja-barra.json"),
  JSON.stringify({ alto: Math.ceil(franjaBarra) }),
);
console.log(`  la barra superior tapa ${Math.ceil(franjaBarra)} px de alto`);

await navegador.close();
