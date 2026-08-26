import { NextResponse } from "next/server";
import {
  COOKIE_PORTON,
  huellaDeClave,
  igualSeguro,
  paginaDelPorton,
  portonActivo,
} from "@/lib/porton";

/**
 * Desbloqueo del porton (ver src/lib/porton.ts).
 *
 * Va por POST y no por query para que la clave no acabe en la barra de direcciones,
 * ni en el historial, ni en los registros del servidor.
 */
export const runtime = "nodejs";

/** Un mes: lo justo para no reescribir la clave a diario durante la revision. */
const DURACION = 60 * 60 * 24 * 30;

/**
 * Solo se admiten destinos internos. Sin esto, `destino` seria un redirector
 * abierto: bastaria mandarle a alguien un enlace al porton con un destino externo.
 *
 * No basta con descartar los que empiezan por `//`. El parser de URL trata la barra
 * invertida igual que la normal en los esquemas web, asi que `/\ejemplo.com` sale
 * del origen exactamente igual que `//ejemplo.com` -- comprobado, se escapaba. Por
 * eso la comprobacion que manda no es sintactica sino de resultado: se construye la
 * URL final y se exige que caiga en el mismo origen.
 */
function destinoSeguro(valor: FormDataEntryValue | null, base: string): string {
  const s = typeof valor === "string" ? valor : "";
  if (!s.startsWith("/")) return "/";
  try {
    const destino = new URL(s, base);
    return destino.origin === new URL(base).origin
      ? destino.pathname + destino.search
      : "/";
  } catch {
    return "/";
  }
}

export async function POST(peticion: Request) {
  if (!portonActivo()) return NextResponse.redirect(new URL("/", peticion.url));

  const formulario = await peticion.formData();
  const destino = destinoSeguro(formulario.get("destino"), peticion.url);
  const clave = formulario.get("clave");

  const esperada = await huellaDeClave(process.env.CLAVE_PORTON ?? "");
  const recibida = await huellaDeClave(typeof clave === "string" ? clave : "");

  if (!igualSeguro(esperada, recibida)) {
    return new NextResponse(paginaDelPorton(destino, true), {
      status: 401,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-robots-tag": "noindex, nofollow",
      },
    });
  }

  const respuesta = NextResponse.redirect(new URL(destino, peticion.url), 303);
  respuesta.cookies.set(COOKIE_PORTON, esperada, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACION,
  });
  return respuesta;
}
