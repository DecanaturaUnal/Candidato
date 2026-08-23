import type { NextConfig } from "next";

/**
 * Cabeceras de seguridad que no dependen de la peticion.
 *
 * La Content-Security-Policy NO va aqui: necesita un nonce distinto en cada
 * peticion y se arma en `src/proxy.ts`.
 */
const cabecerasDeSeguridad = [
  // Nadie puede meter el sitio en un iframe: cierra el clickjacking.
  { key: "X-Frame-Options", value: "DENY" },
  // El navegador respeta el content-type declarado y no lo adivina.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Al salir del sitio solo se comparte el origen, nunca la ruta completa.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Dos anos de HTTPS obligatorio. Solo tiene efecto servido por HTTPS.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // El sitio no usa camara, microfono ni ubicacion: se renuncia explicitamente.
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  // El indicador flotante de desarrollo estorba al comparar capturas contra el mockup.
  devIndicators: false,

  // No se anuncia la tecnologia ni la version del servidor.
  poweredByHeader: false,

  async headers() {
    return [{ source: "/:path*", headers: cabecerasDeSeguridad }];
  },
};

export default nextConfig;
