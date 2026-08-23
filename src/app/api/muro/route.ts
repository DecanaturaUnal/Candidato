import { NextResponse } from "next/server";
import { z } from "zod";
import { leerMuro } from "@/lib/muro";

/**
 * Paginas siguientes del muro ("cargar más") y cambio de pestana.
 *
 * La primera pagina no pasa por aqui: la pinta el servidor al renderizar la
 * portada, para que el muro exista en el HTML inicial y sea indexable.
 */
export const runtime = "nodejs";

const esquema = z.object({
  orden: z.enum(["destacados", "recientes"]).default("destacados"),
  pagina: z.coerce.number().int().min(0).max(500).default(0),
});

export async function GET(peticion: Request) {
  const parametros = new URL(peticion.url).searchParams;
  const validacion = esquema.safeParse({
    orden: parametros.get("orden") ?? undefined,
    pagina: parametros.get("pagina") ?? undefined,
  });

  if (!validacion.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { orden, pagina } = validacion.data;
  const resultado = await leerMuro(orden, pagina);

  return NextResponse.json({ ok: true, ...resultado });
}
