import { NextResponse } from "next/server";
import { z } from "zod";
import { clienteAdministrador } from "@/lib/supabase/servidor";
import { huellaDeIp, obtenerIp } from "@/lib/seguridad";

/**
 * Poner y quitar "me gusta".
 *
 * Pasa por el servidor para poder limitar el ritmo por IP; la base ya impide los
 * duplicados con la restriccion unica (comentario_id, visitante_id) y lleva el
 * contador con un trigger, asi que aqui no se cuenta nada a mano.
 *
 * Solo se puede votar lo que ya esta publicado: antes de escribir se comprueba que
 * el comentario aparezca en la vista publica.
 */
export const runtime = "nodejs";

const MAXIMO_POR_IP = 40;
const VENTANA = "10 minutes";

const esquema = z.object({
  comentarioId: z.uuid(),
  visitanteId: z.uuid(),
  accion: z.enum(["poner", "quitar"]),
});

export async function POST(peticion: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await peticion.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const validacion = esquema.safeParse(cuerpo);
  if (!validacion.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const { comentarioId, visitanteId, accion } = validacion.data;

  const supabase = clienteAdministrador();
  const ipHash = huellaDeIp(obtenerIp(peticion));

  const { data: hayCupo } = await supabase.rpc("consumir_cupo", {
    p_clave: `like:${ipHash}`,
    p_maximo: MAXIMO_POR_IP,
    p_ventana: VENTANA,
  });

  if (!hayCupo) {
    return NextResponse.json(
      { ok: false, error: "Demasiadas acciones seguidas. Espere un momento." },
      { status: 429 },
    );
  }

  // Solo se vota lo que es visible en el muro.
  const { data: publico } = await supabase
    .from("comentarios_publicos")
    .select("id")
    .eq("id", comentarioId)
    .maybeSingle();

  if (!publico) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  if (accion === "poner") {
    const { error } = await supabase
      .from("likes")
      .insert({ comentario_id: comentarioId, visitante_id: visitanteId });

    // 23505 = violacion de unicidad: ya habia votado. No es un error para quien usa
    // la pagina, el resultado final es el mismo.
    if (error && error.code !== "23505") {
      console.error("Error poniendo el like:", error);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  } else {
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("comentario_id", comentarioId)
      .eq("visitante_id", visitanteId);

    if (error) {
      console.error("Error quitando el like:", error);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  }

  // Se devuelve el contador que quedo en la base, para que la interfaz corrija su
  // suposicion optimista si no coincide.
  const { data: actualizado } = await supabase
    .from("comentarios_publicos")
    .select("likes_count")
    .eq("id", comentarioId)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    likes: actualizado?.likes_count ?? 0,
  });
}
