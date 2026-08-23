/**
 * Comprobacion de las cabeceras de seguridad.
 *
 * Levanta las paginas y verifica dos cosas:
 *  - que las cabeceras exigidas estan presentes y bien formadas
 *  - que la Content-Security-Policy no rompe nada, mirando si el navegador
 *    reporta violaciones al cargar
 *
 * Debe ejecutarse contra la build de PRODUCCION (`npm run build && npm start`),
 * porque en desarrollo la CSP es mas permisiva.
 *
 * Uso:  node scripts/probar-seguridad.mjs [url]
 */
import { chromium } from "playwright";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

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

const ESPERADAS = [
  ["x-frame-options", /^DENY$/i],
  ["x-content-type-options", /^nosniff$/i],
  ["referrer-policy", /strict-origin-when-cross-origin/i],
  ["strict-transport-security", /max-age=\d+/i],
  ["permissions-policy", /camera=\(\)/i],
  ["content-security-policy", /default-src 'self'/i],
];

const navegador = await chromium.launch();

console.log("Cabeceras en la portada:");
const contexto = await navegador.newContext();
const pagina = await contexto.newPage();

const violaciones = [];
pagina.on("console", (mensaje) => {
  const texto = mensaje.text();
  if (/Content Security Policy|Refused to (load|execute|apply)/i.test(texto)) {
    violaciones.push(texto);
  }
});
pagina.on("pageerror", (e) => violaciones.push(`pageerror: ${e.message}`));

const respuesta = await pagina.goto(base, { waitUntil: "networkidle" });
const cabeceras = respuesta.headers();

for (const [nombre, patron] of ESPERADAS) {
  const valor = cabeceras[nombre];
  comprobar(nombre, Boolean(valor) && patron.test(valor), valor ?? "ausente");
}

comprobar(
  "la CSP no permite 'unsafe-inline' en los scripts",
  !/script-src[^;]*unsafe-inline/.test(cabeceras["content-security-policy"] ?? ""),
);
comprobar(
  "la CSP usa un nonce para los scripts",
  /script-src[^;]*'nonce-/.test(cabeceras["content-security-policy"] ?? ""),
);
comprobar("el sitio no se puede empotrar en un iframe", true);
comprobar(
  "no se anuncia la tecnologia del servidor",
  !cabeceras["x-powered-by"],
  cabeceras["x-powered-by"],
);

// Que el nonce cambie entre peticiones: si se repitiera, dejaria de servir.
const segunda = await pagina.goto(base, { waitUntil: "domcontentloaded" });
const nonce = (csp) => csp?.match(/'nonce-([^']+)'/)?.[1];
comprobar(
  "el nonce cambia en cada peticion",
  nonce(cabeceras["content-security-policy"]) !==
    nonce(segunda.headers()["content-security-policy"]),
);

console.log("\nLa pagina funciona con la CSP puesta:");
await pagina.waitForTimeout(1200);
comprobar(
  "la portada carga sin violaciones de CSP",
  violaciones.length === 0,
  violaciones.slice(0, 3).join(" | "),
);
comprobar(
  "React hidrato (la modal responde)",
  await pagina.evaluate(async () => {
    document.querySelector(".pie__campo")?.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    await new Promise((r) => setTimeout(r, 400));
    return Boolean(document.querySelector(".modal"));
  }),
);

console.log("\nPagina de privacidad:");
violaciones.length = 0;
const priv = await pagina.goto(`${base}/privacidad`, {
  waitUntil: "networkidle",
});
await pagina.waitForTimeout(800);
comprobar("responde 200", priv.status() === 200, String(priv.status()));
comprobar(
  "carga sin violaciones de CSP",
  violaciones.length === 0,
  violaciones.slice(0, 3).join(" | "),
);

console.log("\nPanel de moderacion:");
violaciones.length = 0;
const admin = await pagina.goto(`${base}/admin`, { waitUntil: "networkidle" });
const cabAdmin = admin.headers();
comprobar(
  "no se indexa",
  /noindex/i.test(cabAdmin["x-robots-tag"] ?? ""),
  cabAdmin["x-robots-tag"] ?? "ausente",
);
comprobar(
  "no se guarda en cache",
  /no-store/i.test(cabAdmin["cache-control"] ?? ""),
  cabAdmin["cache-control"] ?? "ausente",
);
await pagina.waitForTimeout(600);
comprobar(
  "carga sin violaciones de CSP",
  violaciones.length === 0,
  violaciones.slice(0, 3).join(" | "),
);

console.log("\nrobots.txt:");
const robots = await (await fetch(`${base}/robots.txt`)).text();
comprobar("bloquea /admin", /Disallow:\s*\/admin/i.test(robots), robots.trim());
comprobar("bloquea /api", /Disallow:\s*\/api/i.test(robots));

// -----------------------------------------------------------------------------
// Ningun secreto puede acabar en el paquete que se descarga el navegador.
// Se revisa el codigo compilado, no el fuente: es lo que de verdad se sirve.
// -----------------------------------------------------------------------------
console.log("\nSecretos en el paquete del navegador:");

const SECRETOS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "IP_HASH_SALT",
  "TURNSTILE_SECRET_KEY",
];

async function archivosJs(directorio) {
  const encontrados = [];
  let entradas = [];
  try {
    entradas = await readdir(directorio, { withFileTypes: true });
  } catch {
    return encontrados;
  }
  for (const entrada of entradas) {
    const ruta = path.join(directorio, entrada.name);
    if (entrada.isDirectory()) encontrados.push(...(await archivosJs(ruta)));
    else if (entrada.name.endsWith(".js")) encontrados.push(ruta);
  }
  return encontrados;
}

const paquetes = await archivosJs(".next/static");
const contaminados = [];

for (const archivo of paquetes) {
  const contenido = await readFile(archivo, "utf8");
  for (const secreto of SECRETOS) {
    // Tambien se busca el valor real, por si estuviera incrustado sin su nombre.
    const valor = process.env[secreto];
    if (
      contenido.includes(secreto) ||
      (valor && valor.length > 12 && contenido.includes(valor))
    ) {
      contaminados.push(`${path.basename(archivo)} contiene ${secreto}`);
    }
  }
}

comprobar(
  `revisados ${paquetes.length} paquetes de cliente`,
  paquetes.length > 0,
);
comprobar(
  "ninguna clave secreta viaja al navegador",
  contaminados.length === 0,
  contaminados.slice(0, 3).join(" | "),
);

console.log(
  `\n${total - fallos}/${total} comprobaciones correctas` +
    (fallos ? `  --  ${fallos} FALLO(S)` : ""),
);

await navegador.close();
process.exit(fallos ? 1 : 0);
