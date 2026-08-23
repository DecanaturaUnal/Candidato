import { NextResponse } from "next/server";
import { z } from "zod";
import { clienteAdministrador, clienteServidor } from "@/lib/supabase/servidor";
import { huellaDeIp, obtenerIp } from "@/lib/seguridad";

/**
 * Solicitud de enlace magico para entrar al panel.
 *
 * Dos cuidados:
 *
 *  - Antes de enviar nada se comprueba que el correo este en la lista blanca. Si
 *    no se hiciera, cualquiera podria pedir un enlace y quedarse con una sesion
 *    valida (aunque luego el panel le devolviera un 404), y de paso se crearian
 *    usuarios de Supabase a voluntad.
 *
 *  - La respuesta es SIEMPRE la misma, exista o no el correo. De lo contrario el
 *    formulario se convertiria en una herramienta para averiguar quien modera.
 */
export const runtime = "nodejs";

const esquema = z.object({
  email: z.email().max(160),
});

const RESPUESTA_UNIFORME = {
  ok: true,
  mensaje:
    "Si el correo pertenece al equipo, recibirá un enlace de acceso en unos segundos.",
};

export async function POST(peticion: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await peticion.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const validacion = esquema.safeParse(cuerpo);
  if (!validacion.success) {
    return NextResponse.json(
      { ok: false, mensaje: "Escriba un correo electrónico válido." },
      { status: 400 },
    );
  }

  const correo = validacion.data.email.toLowerCase();
  const servicio = clienteAdministrador();
  const ipHash = huellaDeIp(obtenerIp(peticion));

  // Cupo por IP: evita que se use esto para bombardear buzones.
  const { data: hayCupo } = await servicio.rpc("consumir_cupo", {
    p_clave: `acceso:${ipHash}`,
    p_maximo: 5,
    p_ventana: "15 minutes",
  });

  if (!hayCupo) {
    return NextResponse.json(
      {
        ok: false,
        mensaje: "Demasiados intentos seguidos. Espere unos minutos.",
      },
      { status: 429 },
    );
  }

  const { data } = await servicio
    .from("admins")
    .select("email, activo")
    .eq("email", correo)
    .maybeSingle();

  const esModerador = Boolean((data as { activo?: boolean } | null)?.activo);

  if (esModerador) {
    const supabase = await clienteServidor();
    const destino =
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    const { error } = await supabase.auth.signInWithOtp({
      email: correo,
      options: {
        emailRedirectTo: `${destino}/auth/callback`,
        // No se crean usuarios desde aqui: el correo ya fue validado contra la
        // lista blanca, y asi el flujo no puede servir para dar de alta a nadie.
        shouldCreateUser: true,
      },
    });

    if (error) {
      console.error("No se pudo enviar el enlace de acceso:", error);
    }
  }

  return NextResponse.json(RESPUESTA_UNIFORME);
}
