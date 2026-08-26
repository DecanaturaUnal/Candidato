/**
 * Porton de acceso mientras el sitio no esta listo para publico.
 *
 * POR QUE EXISTE
 * El sitio se despliega antes de tener los textos definitivos, para poder revisarlo
 * en el dominio real. Cerrarlo con `robots.txt` evita que lo indexen, pero no impide
 * que alguien que reciba el enlace lo abra. Esto si lo impide.
 *
 * NO ES UN SISTEMA DE AUTENTICACION y no pretende serlo: es una clave compartida
 * para que el sitio no quede a la vista mientras se termina. Quien modera sigue
 * entrando al panel por enlace magico, que es lo que de verdad controla el acceso a
 * los datos; y la RLS sigue siendo la unica barrera que protege la base.
 *
 * Se apaga solo: si `CLAVE_PORTON` no esta puesta, el porton no existe. Asi el dia
 * que el sitio salga a publico basta con quitar la variable y volver a desplegar,
 * sin tocar codigo.
 */

export const COOKIE_PORTON = "porton";

/** Rutas que nunca se cierran, o se romperia algo. */
const EXENTAS = [
  // El propio formulario de desbloqueo.
  "/api/porton",
  // El canje del enlace magico del panel: quien modera puede abrirlo desde el
  // correo, en otro dispositivo, sin haber pasado antes por el porton. Solo
  // intercambia un token y redirige; no sirve contenido.
  "/auth/",
];

export function portonActivo(): boolean {
  return Boolean(process.env.CLAVE_PORTON);
}

export function rutaExenta(ruta: string): boolean {
  return EXENTAS.some((e) => ruta === e || ruta.startsWith(e));
}

/**
 * Huella de la clave. En la cookie no se guarda la clave en claro: si el navegador
 * de alguien quedara comprometido, la cookie no revela con que abrir el sitio.
 *
 * Usa Web Crypto y no `node:crypto` porque esto corre tambien en el middleware.
 */
export async function huellaDeClave(clave: string): Promise<string> {
  const sal = process.env.IP_HASH_SALT ?? "sin-sal";
  const datos = new TextEncoder().encode(`porton:${clave}:${sal}`);
  const resumen = await crypto.subtle.digest("SHA-256", datos);
  return [...new Uint8Array(resumen)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Comparacion de tiempo constante: no filtra cuanto se acerto por lo que tarda. */
export function igualSeguro(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
}

/**
 * Pagina del porton. Va sin JavaScript y sin recursos externos a proposito: asi
 * funciona aunque el resto del sitio no llegue a cargar, y no depende de la CSP mas
 * que en lo que ya esta permitido (estilos en linea).
 */
export function paginaDelPorton(destino: string, fallo: boolean): string {
  const seguro = destino.replace(/[<>"'&]/g, "");
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Sitio en preparación</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center;
    background: radial-gradient(125% 85% at 50% 0%, #1b2a5c 0%, #0e1836 52%, #080f24 100%);
    color: #e8edf7; padding: 24px;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  .caja {
    width: min(100%, 380px); padding: 32px 28px;
    background: rgb(10 18 42 / 72%); border: 1px solid rgb(59 167 179 / 28%);
    border-radius: 10px; box-shadow: 0 20px 60px rgb(3 7 20 / 45%);
  }
  h1 { margin: 0 0 6px; font-size: 20px; letter-spacing: .2px; }
  p { margin: 0 0 20px; font-size: 14px; line-height: 1.5; color: #aab6cf; }
  label { display: block; font-size: 13px; margin-bottom: 7px; color: #cdd6e8; }
  input {
    width: 100%; padding: 11px 12px; font-size: 15px;
    background: rgb(255 255 255 / 6%); color: #fff;
    border: 1px solid rgb(255 255 255 / 18%); border-radius: 6px;
  }
  input:focus { outline: 2px solid #3ba7b3; outline-offset: 1px; }
  button {
    width: 100%; margin-top: 16px; padding: 11px; font-size: 15px; font-weight: 600;
    background: #3ba7b3; color: #04121a; border: 0; border-radius: 6px; cursor: pointer;
  }
  button:hover { background: #4bbcc8; }
  .error {
    margin: 0 0 16px; padding: 9px 11px; font-size: 13px;
    background: rgb(220 90 90 / 14%); border-left: 3px solid #dc5a5a; border-radius: 4px;
    color: #ffc9c9;
  }
</style>
</head>
<body>
  <main class="caja">
    <h1>Sitio en preparación</h1>
    <p>Esta página todavía no es pública. Si tiene la clave de acceso, escríbala para continuar.</p>
    ${fallo ? '<p class="error">La clave no es correcta.</p>' : ""}
    <form method="POST" action="/api/porton">
      <input type="hidden" name="destino" value="${seguro}">
      <label for="clave">Clave de acceso</label>
      <input id="clave" name="clave" type="password" autocomplete="current-password" autofocus required>
      <button type="submit">Entrar</button>
    </form>
  </main>
</body>
</html>`;
}
