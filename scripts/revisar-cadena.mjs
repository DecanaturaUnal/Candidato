/**
 * Revisa los tropiezos habituales de DATABASE_URL ANTES de intentar conectar.
 *
 * Existe porque el error que devuelve Postgres en estos casos es
 * "password authentication failed", que no dice nada sobre la causa real y manda
 * a la gente a cambiar la contrasena cuando el problema es otro.
 *
 * Devuelve una lista de avisos; vacia si la cadena tiene buena pinta.
 */
export function revisarCadena(cadena) {
  const avisos = [];
  const partes = /^postgresql:\/\/([^:]+):([^@]*)@(.+)$/.exec(cadena);

  if (!partes) {
    avisos.push(
      "La cadena no tiene la forma esperada:\n" +
        "      postgresql://USUARIO:CONTRASENA@HOST:PUERTO/postgres",
    );
    return avisos;
  }

  const clave = partes[2];
  const host = partes[3];

  // El error numero uno: Supabase muestra [YOUR-PASSWORD] y se dejan los corchetes.
  if (/^\[.*\]$/.test(clave)) {
    avisos.push(
      "La contrasena conserva los CORCHETES del marcador.\n" +
        "      Supabase muestra  :[YOUR-PASSWORD]@  y hay que reemplazar el\n" +
        "      marcador ENTERO, corchetes incluidos.",
    );
  } else if (/[[\]]/.test(clave)) {
    avisos.push("La contrasena contiene [ o ], que casi siempre sobran.");
  }

  if (clave.includes("YOUR-PASSWORD") || clave === "CONTRASENA") {
    avisos.push("La contrasena sigue siendo el texto de ejemplo de la plantilla.");
  }

  if (clave.length === 0) {
    avisos.push("La contrasena esta vacia.");
  }

  // Caracteres que rompen la URL si no se codifican
  if (/[@:/?#\s]/.test(clave)) {
    avisos.push(
      "La contrasena tiene caracteres que hay que codificar:\n" +
        "      @ -> %40    : -> %3A    / -> %2F    # -> %23    espacio -> %20",
    );
  }

  if (!host.includes("supabase")) {
    avisos.push(`El host no parece de Supabase: ${host.split("/")[0]}`);
  }

  return avisos;
}
