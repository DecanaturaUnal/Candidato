/**
 * Lectura de las variables de entorno de Supabase.
 *
 * Se centraliza aqui para fallar temprano y con un mensaje util si falta algo,
 * en vez de dar un error opaco de red en mitad de una peticion.
 */

function exigir(nombre: string, valor: string | undefined): string {
  if (!valor) {
    throw new Error(
      `Falta la variable de entorno ${nombre}. ` +
        `Copie .env.example como .env.local y rellenela.`,
    );
  }
  return valor;
}

/**
 * Si el proyecto todavia no tiene credenciales de Supabase.
 *
 * Permite distinguir "aun no esta configurado" (normal recien clonado el
 * repositorio) de "esta configurado pero fallo", que si es un problema.
 */
export function faltaConfigurar(): boolean {
  return !(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** Datos publicos: viajan al navegador y estan protegidos por RLS. */
export function entornoPublico() {
  return {
    url: exigir(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    anonKey: exigir(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  };
}

/** Clave de servicio: se salta la RLS. Solo puede leerse en el servidor. */
export function claveDeServicio(): string {
  return exigir(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
