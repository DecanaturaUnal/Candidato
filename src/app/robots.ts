import type { MetadataRoute } from "next";

/**
 * robots.txt
 *
 * El panel y las rutas de API quedan fuera del alcance de los buscadores. No es
 * una medida de seguridad -- robots.txt es una peticion, no una barrera -- sino
 * higiene: la proteccion de verdad son la lista blanca y las politicas de RLS.
 * Ademas, el middleware pone `X-Robots-Tag: noindex` en todas las respuestas
 * de /admin, que sí obliga.
 */
export default function robots(): MetadataRoute.Robots {
  const sitio = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/", "/api/", "/auth/"],
    },
    sitemap: `${sitio}/sitemap.xml`,
  };
}
