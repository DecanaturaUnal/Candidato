import "server-only";

import { createHash } from "node:crypto";

/**
 * Utilidades de seguridad del lado del servidor.
 * Nada de este archivo puede llegar al navegador (lo garantiza `server-only`).
 */

/**
 * Direccion IP de quien hace la peticion.
 *
 * Detras de Vercel o Cloudflare la conexion la termina el proxy, asi que la IP
 * real viaja en cabeceras. Se toma la PRIMERA de `x-forwarded-for`, que es la del
 * cliente; las siguientes son los saltos intermedios.
 */
export function obtenerIp(peticion: Request): string {
  const cadena = peticion.headers.get("x-forwarded-for");
  if (cadena) {
    const primera = cadena.split(",")[0]?.trim();
    if (primera) return primera;
  }
  return (
    peticion.headers.get("cf-connecting-ip") ??
    peticion.headers.get("x-real-ip") ??
    "desconocida"
  );
}

/**
 * Huella de la IP: SHA-256 con una sal secreta.
 *
 * Nunca se guarda la IP en claro. La sal es imprescindible: el espacio de
 * direcciones IPv4 es tan pequeno que un SHA-256 sin sal se revierte por fuerza
 * bruta en minutos, y entonces no seria un dato anonimizado.
 */
export function huellaDeIp(ip: string): string {
  const sal = process.env.IP_HASH_SALT;
  if (!sal || sal.length < 16) {
    throw new Error(
      "Falta IP_HASH_SALT o es demasiado corta. Genere una cadena aleatoria larga " +
        "(ver .env.example) antes de aceptar mensajes.",
    );
  }
  return createHash("sha256").update(`${ip}:${sal}`).digest("hex");
}

/** Respuesta de la API de verificacion de Turnstile. */
type RespuestaTurnstile = {
  success: boolean;
  "error-codes"?: string[];
};

/**
 * Valida el comprobante del captcha CONTRA CLOUDFLARE, desde el servidor.
 *
 * Hacerlo en el cliente no serviria de nada: el comprobante hay que canjearlo en
 * el servidor, que es el unico que tiene la clave secreta.
 */
export async function verificarCaptcha(
  comprobante: string,
  ip: string,
): Promise<boolean> {
  const secreta = process.env.TURNSTILE_SECRET_KEY;
  if (!secreta) {
    throw new Error(
      "Falta TURNSTILE_SECRET_KEY. El formulario no acepta mensajes sin captcha.",
    );
  }

  const cuerpo = new URLSearchParams({
    secret: secreta,
    response: comprobante,
  });
  if (ip && ip !== "desconocida") cuerpo.set("remoteip", ip);

  try {
    const respuesta = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: cuerpo,
        cache: "no-store",
      },
    );
    const datos = (await respuesta.json()) as RespuestaTurnstile;
    return datos.success === true;
  } catch {
    // Ante un fallo de red se rechaza: mas vale perder un mensaje que abrir la puerta.
    return false;
  }
}

/**
 * Caracteres que no deben acabar en la base.
 *
 * Se comprueba por codigo y no con una expresion regular a proposito: asi queda
 * a la vista que rangos se descartan y por que.
 *   - controles ASCII invisibles (se conservan el tabulador y el salto de linea)
 *   - marcas de direccion bidireccional, que permiten escribir un texto que se lee
 *     al reves de como esta guardado: un truco clasico de suplantacion
 */
function esInvisible(codigo: number): boolean {
  const controlBajo = codigo <= 0x08;
  const controlMedio = codigo === 0x0b || codigo === 0x0c;
  const controlAlto = codigo >= 0x0e && codigo <= 0x1f;
  const suprimir = codigo === 0x7f;
  const marcaDireccion =
    codigo === 0x200e ||
    codigo === 0x200f ||
    (codigo >= 0x202a && codigo <= 0x202e) ||
    (codigo >= 0x2066 && codigo <= 0x2069);

  return (
    controlBajo || controlMedio || controlAlto || suprimir || marcaDireccion
  );
}

/**
 * Limpia un texto antes de guardarlo.
 *
 * El mensaje se guarda y se muestra SIEMPRE como texto plano (nunca con
 * dangerouslySetInnerHTML), asi que no hay que escapar HTML. Lo que si hace falta
 * es quitar lo invisible y normalizar los saltos de linea.
 */
export function limpiarTexto(texto: string): string {
  const sinInvisibles = Array.from(texto.normalize("NFC"))
    .filter((caracter) => !esInvisible(caracter.codePointAt(0) ?? 0))
    .join("");

  return sinInvisibles
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
