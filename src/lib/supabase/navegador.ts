"use client";

import { createBrowserClient } from "@supabase/ssr";
import { entornoPublico } from "./entorno";
import { obtenerVisitanteId } from "@/lib/visitante";

/**
 * Cliente de Supabase para el navegador.
 *
 * Usa la llave anonima, que no es un secreto: lo que protege los datos es la RLS
 * (ver supabase/migrations/...rls.sql). Con esta llave solo se puede leer el muro
 * publico y tocar los "me gusta" propios.
 *
 * Se envia siempre la cabecera `x-visitante-id`: las politicas de la tabla `likes`
 * la usan para acotar cada operacion al navegante que la hace.
 */
let instancia: ReturnType<typeof createBrowserClient> | null = null;

export function clienteNavegador() {
  if (instancia) return instancia;

  const { url, anonKey } = entornoPublico();
  instancia = createBrowserClient(url, anonKey, {
    global: {
      headers: { "x-visitante-id": obtenerVisitanteId() },
    },
  });
  return instancia;
}
