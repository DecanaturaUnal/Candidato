import "server-only";

import { clienteAdministrador } from "@/lib/supabase/servidor";
import type { ComentarioPublico, OrdenMuro } from "@/lib/supabase/tipos";

/**
 * Lectura del muro publico.
 *
 * Siempre contra la vista `comentarios_publicos`, nunca contra la tabla: la vista
 * ya filtra por aprobado + con permiso, y no expone correo ni datos de moderacion.
 */

export const POR_PAGINA = 10;

/**
 * "Destacados": primero los marcados a mano, luego los mas gustados, luego los mas
 * recientes. "Recientes": solo por fecha.
 */
export async function leerMuro(
  orden: OrdenMuro,
  pagina = 0,
): Promise<{ comentarios: ComentarioPublico[]; hayMas: boolean }> {
  const supabase = clienteAdministrador();
  const desde = pagina * POR_PAGINA;

  // Se pide uno de mas para saber si queda algo despues, sin un COUNT aparte.
  let consulta = supabase
    .from("comentarios_publicos")
    .select("*")
    .range(desde, desde + POR_PAGINA);

  if (orden === "destacados") {
    consulta = consulta
      .order("destacado", { ascending: false })
      .order("likes_count", { ascending: false })
      .order("created_at", { ascending: false });
  } else {
    consulta = consulta.order("created_at", { ascending: false });
  }

  const { data, error } = await consulta;

  if (error) {
    console.error("Error leyendo el muro:", error);
    return { comentarios: [], hayMas: false };
  }

  const filas = (data ?? []) as ComentarioPublico[];
  return {
    comentarios: filas.slice(0, POR_PAGINA),
    hayMas: filas.length > POR_PAGINA,
  };
}
