import { Audiencias } from "@/components/extension/Audiencias";
import { Muro } from "@/components/extension/Muro";
import { BarraSuperior } from "@/components/cromo/BarraSuperior";
import { FondoDesenfocado } from "@/components/cromo/FondoDesenfocado";
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
 *
 * El fondo es una copia desenfocada de `#contenido`, asi que va como HERMANO y
 * nunca dentro: si estuviera dentro se clonaria a si mismo. Y va DESPUES de <main>
 * para que el contenido real sea siempre el primero en el orden del documento.
 */
export default function Portada() {
  return (
    <>
      <BarraSuperior />

      <main className="escenario" id="contenido">
        <div className="canvas" id="inicio">
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

      {/* Detras de <main> a proposito: asi `querySelector` devuelve el contenido
          real y no la copia. Que se pinte detras lo decide z-index, no el orden. */}
      <FondoDesenfocado selector="#contenido" />
    </>
  );
}
