import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { claveDeServicio, entornoPublico } from "./entorno";

/**
 * Cliente de Supabase con la sesion de la persona que hace la peticion.
 *
 * Es el que usa el panel de moderacion: las politicas de RLS deciden que puede
 * ver segun su correo y si esta en la lista blanca de `admins`.
 */
export async function clienteServidor() {
  const { url, anonKey } = entornoPublico();
  const almacen = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return almacen.getAll();
      },
      setAll(nuevas) {
        try {
          for (const { name, value, options } of nuevas) {
            almacen.set(name, value, options);
          }
        } catch {
          // Desde un Server Component no se pueden escribir cookies. El middleware
          // ya refresca la sesion, asi que aqui se puede ignorar sin consecuencias.
        }
      },
    },
  });
}

/**
 * Cliente con la llave de servicio: se salta la RLS por completo.
 *
 * Solo para operaciones que la aplicacion debe poder hacer en nombre del sistema
 * (guardar un mensaje tras validar el captcha, contar likes con limite de tasa,
 * exportar a CSV). El `import "server-only"` de arriba hace que la compilacion
 * falle si alguien intenta importar este archivo desde un componente de cliente.
 */
export function clienteAdministrador() {
  const { url } = entornoPublico();

  return createClient(url, claveDeServicio(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
