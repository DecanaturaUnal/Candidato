import { leerMuro } from "@/lib/muro";
import { faltaConfigurar } from "@/lib/supabase/entorno";
import { MuroInteractivo } from "./MuroInteractivo";

/**
 * Envoltorio de servidor del muro.
 *
 * Lee la primera pagina al renderizar para que los mensajes viajen en el HTML
 * inicial. Si Supabase todavia no esta configurado, el muro aparece vacio en vez
 * de tumbar la portada entera.
 */
export async function Muro() {
  let inicial: Awaited<ReturnType<typeof leerMuro>> = {
    comentarios: [],
    hayMas: false,
  };

  if (faltaConfigurar()) {
    // Recien clonado el repositorio esto es lo normal, no un fallo: se avisa sin
    // ensuciar la consola con un error.
    console.warn(
      "Muro vacío: falta configurar Supabase. Copie .env.example como .env.local.",
    );
  } else {
    try {
      inicial = await leerMuro("destacados", 0);
    } catch (error) {
      console.error("El muro no pudo leerse:", error);
    }
  }

  return (
    <MuroInteractivo
      inicial={inicial.comentarios}
      hayMasInicial={inicial.hayMas}
    />
  );
}
