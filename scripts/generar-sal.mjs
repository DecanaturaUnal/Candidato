/**
 * Genera la sal para el hash de IP y la escribe en .env.local.
 *
 * Existe como archivo y no como un `node -e "..."` porque esa forma depende de
 * cómo cite las comillas cada terminal (PowerShell, cmd y bash las tratan
 * distinto) y es una fuente clásica de errores.
 *
 * El valor NO se imprime en pantalla: es un secreto, y así no queda en el
 * historial de la terminal. Va directo al archivo.
 *
 * Uso:
 *   npm run sal              genera solo si falta
 *   npm run sal -- --forzar  reemplaza la que hubiera
 */
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const RUTA = ".env.local";
const CLAVE = "IP_HASH_SALT";
const forzar = process.argv.includes("--forzar");

let contenido;
try {
  contenido = await readFile(RUTA, "utf8");
} catch {
  console.error(
    `No existe ${RUTA}.\n  Cree el archivo primero:  copy .env.example .env.local`,
  );
  process.exit(1);
}

const yaTiene = /^IP_HASH_SALT\s*=\s*"?([^"\r\n]*)"?/m.exec(contenido);
const valorActual = yaTiene?.[1] ?? "";
const esMarcador =
  !valorActual || valorActual.includes("cambieme") || valorActual.length < 32;

if (!esMarcador && !forzar) {
  console.log(
    `${CLAVE} ya tiene un valor de ${valorActual.length} caracteres.\n` +
      "  No se toca. Para reemplazarla:  npm run sal -- --forzar\n" +
      "  OJO: al cambiarla, los hashes de IP ya guardados dejan de poder compararse.",
  );
  process.exit(0);
}

const sal = randomBytes(32).toString("hex");
const linea = `${CLAVE}="${sal}"`;

const actualizado = yaTiene
  ? contenido.replace(/^IP_HASH_SALT\s*=.*$/m, linea)
  : contenido.trimEnd() + `\n\n${linea}\n`;

await writeFile(RUTA, actualizado, "utf8");

console.log(
  `Listo: se escribió ${CLAVE} en ${RUTA} (64 caracteres).\n` +
    "  No se muestra aquí a propósito: es un secreto y no debe quedar en el\n" +
    "  historial de la terminal.",
);
