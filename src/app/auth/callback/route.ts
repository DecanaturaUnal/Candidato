import { NextResponse } from "next/server";
import { clienteAdministrador, clienteServidor } from "@/lib/supabase/servidor";

/**
 * Aterrizaje del enlace magico.
 *
 * El enlace del correo trae un codigo de un solo uso que aqui se canjea por una
 * sesion. El canje ocurre en el servidor: el token nunca pasa por el navegador.
 *
 * Despues se manda siempre a /admin, que es quien decide si esa persona puede
 * ver algo o le devuelve un 404.
 */
export const runtime = "nodejs";

export async function GET(peticion: Request) {
  const url = new URL(peticion.url);
  const codigo = url.searchParams.get("code");

  if (codigo) {
    const supabase = await clienteServidor();
    const { data, error } = await supabase.auth.exchangeCodeForSession(codigo);

    if (error) {
      console.error("No se pudo canjear el enlace de acceso:", error);
      return NextResponse.redirect(new URL("/admin?error=enlace", url.origin));
    }

    // Se comprueba la lista blanca AQUI y no solo en el panel porque este es el
    // unico punto del flujo donde se pueden escribir cookies: si la persona no
    // modera, la sesion se cierra de verdad en vez de quedar abierta y limitarse
    // a ver un 404 en cada visita.
    const correo = data.user?.email?.toLowerCase();
    if (correo) {
      const { data: admin } = await clienteAdministrador()
        .from("admins")
        .select("activo")
        .eq("email", correo)
        .maybeSingle();

      if (!(admin as { activo?: boolean } | null)?.activo) {
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL("/admin?error=enlace", url.origin));
      }
    }
  }

  return NextResponse.redirect(new URL("/admin", url.origin));
}
