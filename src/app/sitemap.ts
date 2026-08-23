import type { MetadataRoute } from "next";

/**
 * Mapa del sitio.
 *
 * Solo las paginas publicas. El panel de moderacion no aparece aqui a proposito:
 * la ruta no debe anunciarse en ninguna parte.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const sitio = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const ahora = new Date();

  return [
    { url: sitio, lastModified: ahora, changeFrequency: "daily", priority: 1 },
    {
      url: `${sitio}/privacidad`,
      lastModified: ahora,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
