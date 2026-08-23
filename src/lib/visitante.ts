"use client";

/**
 * Identidad del navegante para los "me gusta".
 *
 * Es un UUID v4 que se genera la primera vez y se guarda en localStorage. No pide
 * registro, no identifica a nadie y no se cruza con ningun otro dato: solo sirve
 * para que la base pueda impedir que el mismo navegador vote dos veces el mismo
 * comentario (restriccion unica sobre `comentario_id, visitante_id`).
 */

const CLAVE = "decanatura:visitante";

/** UUID de reserva para cuando no hay localStorage (modo privado, SSR). */
const SIN_ALMACENAMIENTO = "00000000-0000-4000-8000-000000000000";

let enMemoria: string | null = null;

function nuevoUuid(): string {
  const azar = globalThis.crypto;
  if (typeof azar?.randomUUID === "function") {
    return azar.randomUUID();
  }
  // Camino alterno para navegadores sin randomUUID
  const bytes = new Uint8Array(16);
  azar.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function obtenerVisitanteId(): string {
  if (enMemoria) return enMemoria;
  if (typeof window === "undefined") return SIN_ALMACENAMIENTO;

  try {
    const guardado = window.localStorage.getItem(CLAVE);
    if (guardado) {
      enMemoria = guardado;
      return guardado;
    }
    const nuevo = nuevoUuid();
    window.localStorage.setItem(CLAVE, nuevo);
    enMemoria = nuevo;
    return nuevo;
  } catch {
    // Navegacion privada o almacenamiento bloqueado: se usa solo en memoria.
    enMemoria ??= nuevoUuid();
    return enMemoria;
  }
}
