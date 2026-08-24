import type { Metadata } from "next";
import {
  Fira_Sans_Extra_Condensed,
  Fira_Sans,
  Parisienne,
} from "next/font/google";
import "./globals.css";

/**
 * Tipografias.
 *
 * Los titulares grandes de la cabecera ya vienen como imagen. Para el texto vivo:
 * - Fira Sans Extra Condensed: titulares, navegacion y etiquetas.
 * - Fira Sans: parrafos y las itálicas del pie.
 *
 * La condensada se eligio midiendo el mockup: "Construir Futuro" ocupa 370 px de
 * ancho con 48 px de altura de ascendentes (relacion 7,7). Oswald da 8,6 —
 * demasiado ancha. Fira Sans Extra Condensed 700 reproduce esa relacion con un
 * desvio del 0,8 % y comparte superfamilia con el texto de los parrafos.
 * Ambas se sirven con next/font para que no haya salto de fuente al cargar.
 */
const condensada = Fira_Sans_Extra_Condensed({
  variable: "--fuente-titulo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/**
 * Cursiva de "Candidato a decano" en la barra superior.
 *
 * La script original no viene con los archivos de la publicista y en el lockup solo
 * existe rasterizada, con media firma en blanco (ver LogoLockup.tsx). Parisienne es
 * la mas cercana de las disponibles: monolinea, inclinacion suave y letras
 * separadas. Se sirve con next/font, es decir autoalojada -- no hay peticion a
 * fonts.googleapis.com, asi que tampoco hay que abrir la CSP.
 */
const script = Parisienne({
  variable: "--fuente-script",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const firaSans = Fira_Sans({
  variable: "--fuente-texto",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gustavo Osorio · Candidato a Decano",
  description:
    "Campaña de Gustavo Osorio a la Decanatura de la Facultad de Ingeniería y Arquitectura de la Universidad Nacional de Colombia.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${condensada.variable} ${firaSans.variable} ${script.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
