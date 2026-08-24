/**
 * Comprobaciones del formulario de mensajes.
 *
 * Verifica lo que se puede verificar sin una instancia de Supabase conectada: que
 * la modal abre desde el campo del pie, que la validacion del cliente atrapa los
 * errores, que el contador de caracteres funciona y que la casilla de tratamiento
 * de datos es obligatoria.
 *
 * El envio real (captcha + guardado) necesita credenciales y se prueba aparte.
 *
 * Uso:  node scripts/probar-formulario.mjs [url]
 */
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3000";

let fallos = 0;
let total = 0;
const comprobar = (descripcion, condicion, detalle = "") => {
  total++;
  if (condicion) console.log(`  OK    ${descripcion}`);
  else {
    fallos++;
    console.log(`  FALLA ${descripcion}${detalle ? `  -> ${detalle}` : ""}`);
  }
};

const navegador = await chromium.launch();
const pagina = await navegador.newPage({
  viewport: { width: 1440, height: 1000 },
});
await pagina.goto(base, { waitUntil: "networkidle" });
await pagina.waitForTimeout(600);

console.log("Apertura de la modal:");
comprobar(
  "la modal no esta abierta al cargar",
  (await pagina.locator(".modal").count()) === 0,
);

await pagina.locator("#contenido .pie__campo").click();
await pagina.waitForSelector(".modal", { timeout: 5000 });
comprobar("el campo del pie abre el formulario completo", true);

const dialogo = pagina.locator(".modal__caja");
comprobar(
  "la modal se anuncia como dialogo",
  (await dialogo.getAttribute("aria-modal")) === "true",
);

// La composicion del pie no debe cambiar de alto al abrir la modal
const pie = await pagina.locator("#contenido .pie").boundingBox();
comprobar(
  "el pie de la pieza conserva su alto",
  Math.abs(pie.height - 293 * (pie.width / 896)) < 1.5,
  `alto=${pie.height.toFixed(1)}`,
);

console.log("\nValidacion en el cliente:");
await pagina.locator('button[type="submit"]').click();
await pagina.waitForTimeout(300);
const errores = await pagina.locator(".campo__error").allTextContents();
comprobar(
  "enviar vacio muestra errores por campo",
  errores.length >= 3,
  `errores=${errores.length}`,
);

await pagina.fill("#f-nombre", "Prueba Automatizada");
await pagina.fill("#f-email", "no-es-un-correo");
await pagina.fill("#f-mensaje", "corto");
await pagina.locator('button[type="submit"]').click();
await pagina.waitForTimeout(300);
const textos = (await pagina.locator(".campo__error").allTextContents()).join(" | ");
comprobar(
  "rechaza un correo mal escrito",
  /correo electrónico válido/i.test(textos),
  textos,
);
comprobar(
  "rechaza un mensaje demasiado corto",
  /al menos 10 caracteres/i.test(textos),
  textos,
);

console.log("\nContador de caracteres:");
await pagina.fill("#f-mensaje", "x".repeat(120));
await pagina.waitForTimeout(200);
const contador = await pagina.locator("#contador-mensaje").textContent();
comprobar(
  "el contador refleja lo escrito",
  contador.includes("120 de 800"),
  contador.trim(),
);

console.log("\nAutorizaciones:");
await pagina.fill("#f-mensaje", "Este es un mensaje de prueba con longitud suficiente.");
await pagina.fill("#f-email", "prueba@example.com");
await pagina.locator('button[type="submit"]').click();
await pagina.waitForTimeout(300);
const conDatos = (await pagina.locator(".campo__error").allTextContents()).join(" | ");
comprobar(
  "no deja enviar sin autorizar el tratamiento de datos",
  /tratamiento de sus datos/i.test(conDatos),
  conDatos,
);

console.log("\nCampo trampa:");
const trampa = pagina.locator('input[name="sitioWeb"]');
comprobar("el campo trampa existe en el DOM", (await trampa.count()) === 1);
comprobar(
  "pero esta fuera de pantalla",
  (await trampa.boundingBox()).x < -1000,
);
comprobar(
  "y no es alcanzable con el tabulador",
  (await trampa.getAttribute("tabindex")) === "-1",
);

console.log("\nCierre:");
await pagina.keyboard.press("Escape");
await pagina.waitForTimeout(300);
comprobar(
  "la tecla Escape cierra la modal",
  (await pagina.locator(".modal").count()) === 0,
);

console.log(
  `\n${total - fallos}/${total} comprobaciones correctas` +
    (fallos ? `  --  ${fallos} FALLO(S)` : ""),
);

await navegador.close();
process.exit(fallos ? 1 : 0);
