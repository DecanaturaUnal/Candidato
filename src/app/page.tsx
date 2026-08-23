import { Audiencias } from "@/components/extension/Audiencias";
import { Muro } from "@/components/extension/Muro";
import { Cabecera } from "@/components/lienzo/Cabecera";
import { ConstruirFuturo } from "@/components/lienzo/ConstruirFuturo";
import { Navegacion } from "@/components/lienzo/Navegacion";
import { PieDePagina } from "@/components/lienzo/PieDePagina";

/**
 * La portada se renderiza en cada peticion.
 *
 * No es un capricho: la Content-Security-Policy lleva un nonce distinto cada vez
 * (ver src/proxy.ts), y un nonce solo funciona si el HTML se genera en el momento.
 * Sigue siendo HTML completo servido por el servidor, asi que los buscadores lo
 * indexan igual, y de paso el muro muestra siempre lo ultimo aprobado.
 */
export const dynamic = "force-dynamic";

/**
 * Portada de campana.
 *
 * El lienzo reproduce el mockup aprobado y no debe reinterpretarse. El muro de
 * mensajes de la comunidad va DEBAJO del pie, como bloque aparte, para no tocar
 * la composicion original.
 */
export default function Portada() {
  return (
    <main className="escenario">
      <div className="canvas">
        <div className="lienzo">
          <Cabecera />
          <Navegacion />
          <ConstruirFuturo />
          <PieDePagina />
        </div>
      </div>

      {/* Fuera de la pieza aprobada: secciones de audiencia y muro de mensajes. */}
      <div className="extension">
        <Audiencias />
        <Muro />
      </div>
    </main>
  );
}
