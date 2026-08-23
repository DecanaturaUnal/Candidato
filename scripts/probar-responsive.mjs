/**
 * Comprobacion del comportamiento en distintos anchos (punto §13.2).
 *
 * Verifica en movil, tableta y escritorio que:
 *   - no hay desplazamiento horizontal
 *   - el lienzo conserva la proporcion del mockup (896 x 1600)
 *   - se mantiene el efecto de "vista alejada": el lienzo no ocupa todo el ancho
 *     de la pantalla mientras quepa, y se ajusta al 100 % cuando no cabe
 *   - la pieza no se re-acomoda: las proporciones internas son las mismas en todos
 *     los anchos
 *
 * Uso:  node scripts/probar-responsive.mjs [url]
 */
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3000";

const ANCHO_MOCKUP = 896;
const ALTO_MOCKUP = 1600;
const PROPORCION = ALTO_MOCKUP / ANCHO_MOCKUP;

const PANTALLAS = [
  { nombre: "móvil", ancho: 375, alto: 812 },
  { nombre: "tableta", ancho: 768, alto: 1024 },
  { nombre: "escritorio", ancho: 1440, alto: 900 },
  { nombre: "escritorio grande", ancho: 1920, alto: 1080 },
];

let fallos = 0;
let total = 0;
const comprobar = (descripcion, condicion, detalle = "") => {
  total++;
  if (condicion) console.log(`    OK    ${descripcion}`);
  else {
    fallos++;
    console.log(`    FALLA ${descripcion}${detalle ? `  -> ${detalle}` : ""}`);
  }
};

const navegador = await chromium.launch();
/** Referencias internas medidas en cada ancho, para comparar proporciones. */
const proporcionesPorAncho = [];

for (const pantalla of PANTALLAS) {
  console.log(`\n${pantalla.nombre} (${pantalla.ancho} px)`);

  const pagina = await navegador.newPage({
    viewport: { width: pantalla.ancho, height: pantalla.alto },
  });
  await pagina.goto(base, { waitUntil: "networkidle" });
  await pagina.evaluate(async () => {
    document.querySelectorAll("img").forEach((im) => (im.loading = "eager"));
    await document.fonts.ready;
  });
  await pagina.waitForTimeout(500);

  const medidas = await pagina.evaluate(() => {
    const lienzo = document.querySelector(".lienzo").getBoundingClientRect();
    const franja = document
      .querySelector(".cabecera__franja")
      .getBoundingClientRect();
    const nav = document.querySelector(".navegacion__barra").getBoundingClientRect();
    return {
      desbordeHorizontal:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      lienzo: { ancho: lienzo.width, alto: lienzo.height },
      // Dos referencias internas, para comprobar que nada se re-acomoda
      franjaRelativa: franja.height / lienzo.width,
      navRelativa: nav.height / lienzo.width,
      anchoVentana: window.innerWidth,
    };
  });

  comprobar(
    "sin desplazamiento horizontal",
    medidas.desbordeHorizontal <= 0,
    `sobra ${medidas.desbordeHorizontal} px`,
  );

  const proporcionReal = medidas.lienzo.alto / medidas.lienzo.ancho;
  // El lienzo crece por debajo del mockup (audiencias y muro van aparte), asi que
  // se compara solo que la parte de la pieza mantenga su proporcion: eso se
  // verifica con las referencias internas de abajo.
  comprobar(
    "el lienzo es al menos tan alto como el mockup",
    proporcionReal >= PROPORCION - 0.02,
    `proporción=${proporcionReal.toFixed(3)} (mockup ${PROPORCION.toFixed(3)})`,
  );

  // El invariante de la "vista alejada" es uno solo: el lienzo mide
  // min(ancho de la ventana, 900 x --canvas-scale). Nunca se estira mas alla de
  // ese tope aunque sobre pantalla, y nunca desborda cuando falta.
  const TOPE = 900 * 0.85;
  const esperado = Math.min(medidas.anchoVentana, TOPE);
  comprobar(
    `el lienzo mide min(ventana, ${TOPE}) = ${esperado.toFixed(0)} px`,
    Math.abs(medidas.lienzo.ancho - esperado) < 2,
    `${medidas.lienzo.ancho.toFixed(1)} px`,
  );

  if (medidas.anchoVentana > TOPE + 80) {
    comprobar(
      "vista alejada: queda escenario visible a los lados",
      medidas.lienzo.ancho < medidas.anchoVentana - 40,
      `lienzo=${medidas.lienzo.ancho.toFixed(0)} ventana=${medidas.anchoVentana}`,
    );
  }

  proporcionesPorAncho.push({ pantalla: pantalla.nombre, ...medidas });
  await pagina.close();
}

console.log("\nLas proporciones internas son idénticas en todos los anchos:");
const referencia = proporcionesPorAncho[0];
for (const medida of proporcionesPorAncho.slice(1)) {
  comprobar(
    `${medida.pantalla}: la franja turquesa conserva su proporción`,
    Math.abs(medida.franjaRelativa - referencia.franjaRelativa) < 0.002,
    `${medida.franjaRelativa.toFixed(4)} vs ${referencia.franjaRelativa.toFixed(4)}`,
  );
  comprobar(
    `${medida.pantalla}: la barra de navegación también`,
    Math.abs(medida.navRelativa - referencia.navRelativa) < 0.002,
    `${medida.navRelativa.toFixed(4)} vs ${referencia.navRelativa.toFixed(4)}`,
  );
}

console.log(
  `\n${total - fallos}/${total} comprobaciones correctas` +
    (fallos ? `  --  ${fallos} FALLO(S)` : ""),
);

await navegador.close();
process.exit(fallos ? 1 : 0);
