import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  COOKIE_PORTON,
  huellaDeClave,
  igualSeguro,
  paginaDelPorton,
  portonActivo,
  rutaExenta,
} from "@/lib/porton";

/**
 * Se ejecuta antes de renderizar cualquier ruta. Hace dos cosas:
 *
 *  1. Arma la Content-Security-Policy con un nonce nuevo en cada peticion.
 *  2. Si hay porton puesto, cierra el sitio entero hasta que se escriba la clave.
 *  3. En /admin, refresca la sesion de Supabase y bloquea la cache.
 *
 * Va en `proxy.ts` y no en `middleware.ts`: Next 16 renombro esa convencion y la
 * anterior quedo obsoleta.
 */

/**
 * Politica de seguridad de contenido.
 *
 * El nonce es la pieza clave: sin el habria que permitir `unsafe-inline` en los
 * scripts, porque el App Router incrusta el arranque de React en linea, y con
 * `unsafe-inline` la CSP deja de proteger contra XSS, que es justo para lo que
 * esta. Como el nonce cambia en cada peticion, las paginas se renderizan de forma
 * dinamica; siguen siendo HTML completo servido por el servidor, asi que no afecta
 * a la indexacion.
 *
 * `strict-dynamic` permite que un script ya autorizado cargue otros: es lo que
 * deja funcionar al widget de Turnstile, que se inyecta desde el cliente.
 */
function politicaDeSeguridad(nonce: string, enDesarrollo: boolean): string {
  const directivas = [
    "default-src 'self'",
    // 'unsafe-eval' solo en desarrollo: React lo usa para reconstruir las pilas
    // de error en el navegador. En produccion no hace falta.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${enDesarrollo ? " 'unsafe-eval'" : ""}`,
    // Los estilos si van con 'unsafe-inline': Next inyecta estilos en linea y la
    // inyeccion de CSS no permite ejecutar codigo.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    // Supabase (datos y tiempo real) y la verificacion del captcha.
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com",
    // El captcha se pinta dentro de un iframe propio de Cloudflare.
    "frame-src https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ];
  return directivas.join("; ");
}

export async function proxy(peticion: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const enDesarrollo = process.env.NODE_ENV === "development";
  const csp = politicaDeSeguridad(nonce, enDesarrollo);

  // Next lee esta cabecera de la PETICION para poner el nonce en sus propios
  // scripts; por eso hay que ponerla en los dos lados.
  const cabeceras = new Headers(peticion.headers);
  cabeceras.set("x-nonce", nonce);
  cabeceras.set("Content-Security-Policy", csp);

  let respuesta = NextResponse.next({ request: { headers: cabeceras } });
  respuesta.headers.set("Content-Security-Policy", csp);

  // --- Porton -----------------------------------------------------------------
  // Antes que nada: mientras el sitio no sea publico no debe servirse nada, ni
  // portada ni API. Ver src/lib/porton.ts.
  const ruta = peticion.nextUrl.pathname;
  if (portonActivo() && !rutaExenta(ruta)) {
    const guardada = peticion.cookies.get(COOKIE_PORTON)?.value ?? "";
    const esperada = await huellaDeClave(process.env.CLAVE_PORTON ?? "");
    if (!igualSeguro(guardada, esperada)) {
      return new NextResponse(paginaDelPorton(ruta + peticion.nextUrl.search, false), {
        status: 401,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "x-robots-tag": "noindex, nofollow",
          // El porton se sirve entero desde aqui y no arranca React: no necesita
          // nonce, y sus estilos en linea ya los permite la politica.
          "Content-Security-Policy": csp,
        },
      });
    }
  }

  const esPanel = ruta.startsWith("/admin");
  if (!esPanel) return respuesta;

  // --- Solo para el panel -----------------------------------------------------
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && anonKey) {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return peticion.cookies.getAll();
        },
        setAll(nuevas) {
          for (const { name, value } of nuevas) {
            peticion.cookies.set(name, value);
          }
          respuesta = NextResponse.next({ request: { headers: cabeceras } });
          respuesta.headers.set("Content-Security-Policy", csp);
          for (const { name, value, options } of nuevas) {
            respuesta.cookies.set(name, value, options);
          }
        },
      },
    });

    // Con solo pedir el usuario, el cliente renueva los tokens si hace falta.
    await supabase.auth.getUser();
  }

  // El panel nunca debe quedarse en ninguna cache ni aparecer en buscadores.
  respuesta.headers.set("Cache-Control", "no-store, max-age=0");
  respuesta.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");

  return respuesta;
}

export const config = {
  matcher: [
    /*
     * Todas las rutas menos los ficheros estaticos, que no ejecutan nada y no
     * necesitan ni nonce ni sesion.
     */
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|marca|fotos|_referencia|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
