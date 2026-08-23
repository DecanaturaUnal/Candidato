import type { MetadataRoute } from "next";
import { contenidoIncompleto } from "@/content/pendientes";

/** Rutas que nunca deben rastrearse, este el contenido completo o no. */
const NUNCA = ["/admin", "/admin/", "/api/", "/auth/"];

/**
 * robots.txt
 *
 * El panel y las rutas de API quedan fuera del alcance de los buscadores. No es
 * una medida de seguridad -- robots.txt es una peticion, no una barrera -- sino
 * higiene: la proteccion de verdad son la lista blanca y las politicas de RLS.
 * Ademas, el middleware pone `X-Robots-Tag: noindex` en todas las respuestas
 * de /admin, que sí obliga.
 *
 * Mientras queden textos sin entregar se cierra ademas el sitio entero. Un
 * despliegue de prueba no es privado por ser poco conocido: los dominios que emite
 * Vercel aparecen en los registros publicos de Certificate Transparency, que los
 * rastreadores recorren. Sin esto, los marcadores `TODO:` podrian acabar indexados
 * junto al nombre del candidato. Se reabre solo en cuanto llegan los textos reales.
 *
 * El `/` global no sustituye a las entradas explicitas: se suma a ellas. Asi la
 * proteccion de /admin y /api no depende de que el contenido siga incompleto.
 */
export default function robots(): MetadataRoute.Robots {
  const sitio = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const incompleto = contenidoIncompleto();

  return {
    rules: {
      userAgent: "*",
      ...(incompleto ? {} : { allow: "/" }),
      disallow: incompleto ? ["/", ...NUNCA] : NUNCA,
    },
    // Sin contenido definitivo no se anuncia mapa del sitio: seria invitar a rastrear
    // justo lo que se acaba de cerrar.
    ...(incompleto ? {} : { sitemap: `${sitio}/sitemap.xml` }),
  };
}
