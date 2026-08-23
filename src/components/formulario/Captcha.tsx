"use client";

import { useEffect, useRef } from "react";

/**
 * Widget de Cloudflare Turnstile.
 *
 * Es un captcha invisible: en la mayoria de los casos no pide nada, solo observa
 * senales del navegador y entrega un comprobante. Ese comprobante NO prueba nada
 * por si mismo; quien lo valida es el servidor contra Cloudflare, con la clave
 * secreta (ver src/lib/seguridad.ts). Aqui solo se obtiene.
 */

type ApiTurnstile = {
  render: (
    contenedor: HTMLElement,
    opciones: {
      sitekey: string;
      callback: (comprobante: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      theme?: "light" | "dark" | "auto";
    },
  ) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: ApiTurnstile;
  }
}

const ID_SCRIPT = "turnstile-api";
const URL_SCRIPT =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function Captcha({
  onComprobante,
}: {
  onComprobante: (comprobante: string | null) => void;
}) {
  const contenedor = useRef<HTMLDivElement>(null);

  // La clave publica se sustituye en tiempo de compilacion: es una constante, no
  // hace falta guardarla en estado ni averiguarla dentro de un efecto.
  const clave = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!clave) return;

    if (!document.getElementById(ID_SCRIPT)) {
      const etiqueta = document.createElement("script");
      etiqueta.id = ID_SCRIPT;
      etiqueta.src = URL_SCRIPT;
      etiqueta.async = true;
      etiqueta.defer = true;
      document.head.appendChild(etiqueta);
    }

    let idWidget: string | undefined;
    let cancelado = false;
    let temporizador: ReturnType<typeof setTimeout>;

    // El script tarda en llegar; se reintenta hasta que la API este disponible.
    const montar = () => {
      if (cancelado) return;
      if (window.turnstile && contenedor.current) {
        idWidget = window.turnstile.render(contenedor.current, {
          sitekey: clave,
          theme: "light",
          callback: (comprobante) => onComprobante(comprobante),
          "expired-callback": () => onComprobante(null),
          "error-callback": () => onComprobante(null),
        });
        return;
      }
      temporizador = setTimeout(montar, 200);
    };
    montar();

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
      if (idWidget && window.turnstile) window.turnstile.remove(idWidget);
    };
  }, [clave, onComprobante]);

  if (!clave) {
    return (
      <p className="formulario__aviso" role="status">
        Falta configurar <code>NEXT_PUBLIC_TURNSTILE_SITE_KEY</code>. Sin captcha
        el servidor rechaza los envíos.
      </p>
    );
  }

  return <div ref={contenedor} className="formulario__captcha" />;
}
