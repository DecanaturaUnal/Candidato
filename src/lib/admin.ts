import "server-only";

import { clienteAdministrador, clienteServidor } from "@/lib/supabase/servidor";
import { faltaConfigurar } from "@/lib/supabase/entorno";
import type { Admin } from "@/lib/supabase/tipos";

/**
 * Quien esta usando el panel.
 *
 * Estar autenticado NO basta: cualquiera puede pedir un enlace magico. Hay que
 * figurar en la tabla `admins` con `activo = true`. La comprobacion se hace aqui
 * para poder mostrar un 404 generico, y otra vez en la base a traves de las
 * politicas de RLS, que son las que de verdad impiden leer o escribir.
 */
export type SesionPanel =
  | { estado: "sin-configurar" }
  | { estado: "anonimo" }
  | { estado: "intruso"; correo: string }
  | { estado: "moderador"; correo: string; nombre: string };

export async function sesionDelPanel(): Promise<SesionPanel> {
  if (faltaConfigurar()) return { estado: "sin-configurar" };

  const supabase = await clienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return { estado: "anonimo" };

  const correo = user.email.toLowerCase();

  // Se consulta con la llave de servicio para poder distinguir "no esta en la
  // lista" de "esta pero desactivado" sin depender de las politicas.
  const { data } = await clienteAdministrador()
    .from("admins")
    .select("email, nombre, activo")
    .eq("email", correo)
    .maybeSingle();

  const admin = data as Pick<Admin, "email" | "nombre" | "activo"> | null;

  if (!admin?.activo) return { estado: "intruso", correo };

  return { estado: "moderador", correo, nombre: admin.nombre };
}

/** Cierra la sesion del visitante actual. */
export async function cerrarSesion() {
  const supabase = await clienteServidor();
  await supabase.auth.signOut();
}
