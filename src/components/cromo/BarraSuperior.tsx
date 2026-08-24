"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { LogoLockup } from "@/components/marca/LogoLockup";

/**
 * Barra superior fija: firma de campana a la izquierda, sello de la UNAL a la derecha.
 *
 * Se compacta pasados 80 px de scroll. El listener solo lee `scrollY` y asigna un
 * booleano; React descarta el render cuando el valor no cambia, asi que en la
 * practica hay a lo sumo dos renders en todo el recorrido de la pagina.
 */
const UMBRAL_COMPACTA = 80;

export function BarraSuperior() {
  const [compacta, setCompacta] = useState(false);

  useEffect(() => {
    const alScrollear = () => setCompacta(window.scrollY > UMBRAL_COMPACTA);
    alScrollear();
    window.addEventListener("scroll", alScrollear, { passive: true });
    return () => window.removeEventListener("scroll", alScrollear);
  }, []);

  return (
    <header className="barra" data-compacta={compacta}>
      <a className="barra__firma" href="#inicio">
        <LogoLockup />
      </a>

      <Image
        className="barra__unal"
        src="/marca/unal.png"
        alt="Universidad Nacional de Colombia"
        width={298}
        height={139}
        priority
      />
    </header>
  );
}
