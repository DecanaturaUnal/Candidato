import { NextResponse } from "next/server";
import { clienteAdministrador } from "@/lib/supabase/servidor";
import {
  huellaDeIp,
  limpiarTexto,
  obtenerIp,
  verificarCaptcha,
} from "@/lib/seguridad";
import { LIMITES, erroresPorCampo, esquemaEnvio } from "@/lib/validacion";

/**
 * Recepcion de mensajes de la comunidad.
 *
 * Es el UNICO camino por el que puede entrar un comentario: al rol anonimo se le
 * revoco el INSERT sobre la tabla justamente para que nadie pueda esquivar estos
 * controles escribiendo directo contra la API de Supabase.
 *
 * El orden importa: primero lo barato (forma de los datos, campo trampa, tiempo de
 * diligenciamiento) y solo despues lo caro (captcha contra Cloudflare, escritura).
 * Asi un robot que dispare en masa se topa con la puerta antes de gastarnos nada.
 */
export const runtime = "nodejs";

const MAXIMO_POR_IP = 3;
const VENTANA = "10 minutes";

export async function POST(peticion: Request) {
  // 1. Forma de los datos
  let cuerpo: unknown;
  try {
    cuerpo = await peticion.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "No se pudo leer el mensaje." },
      { status: 400 },
    );
  }

  const validacion = esquemaEnvio.safeParse(cuerpo);
  if (!validacion.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Revise los datos del formulario.",
        campos: erroresPorCampo(validacion.error),
      },
      { status: 400 },
    );
  }
  const datos = validacion.data;

  // 2. Senales anti-robot. Se responde igual que en un envio correcto para no
  //    darle al atacante una pista de que fue lo que le delato.
  const demasiadoRapido =
    Date.now() - datos.abiertoEn < LIMITES.segundosMinimos * 1000;
  if (demasiadoRapido) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  // 3. Captcha, ya del lado del servidor
  const ip = obtenerIp(peticion);
  const captchaValido = await verificarCaptcha(datos.captcha, ip);
  if (!captchaValido) {
    return NextResponse.json(
      {
        ok: false,
        error: "No pudimos verificar que no sea un robot. Intente de nuevo.",
      },
      { status: 403 },
    );
  }

  const supabase = clienteAdministrador();
  const ipHash = huellaDeIp(ip);

  // 4. Cupo por IP
  const { data: hayCupo, error: errorCupo } = await supabase.rpc(
    "consumir_cupo",
    {
      p_clave: `comentario:${ipHash}`,
      p_maximo: MAXIMO_POR_IP,
      p_ventana: VENTANA,
    },
  );

  if (errorCupo) {
    console.error("Error consultando el cupo:", errorCupo);
    return NextResponse.json(
      { ok: false, error: "No pudimos recibir el mensaje. Intente más tarde." },
      { status: 500 },
    );
  }

  if (!hayCupo) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Ya envió varios mensajes en los últimos minutos. Espere un momento antes de escribir otro.",
      },
      { status: 429 },
    );
  }

  // 5. Guardado. El estado siempre lo pone la base: aqui ni se menciona.
  const { error } = await supabase.from("comentarios").insert({
    nombre: limpiarTexto(datos.nombre),
    es_anonimo: datos.esAnonimo,
    email: datos.email.toLowerCase(),
    mensaje: limpiarTexto(datos.mensaje),
    autoriza_publicacion: datos.autorizaPublicacion,
    autoriza_datos: datos.autorizaDatos,
    ip_hash: ipHash,
    user_agent: peticion.headers.get("user-agent")?.slice(0, 300) ?? null,
  });

  if (error) {
    console.error("Error guardando el comentario:", error);
    return NextResponse.json(
      { ok: false, error: "No pudimos guardar el mensaje. Intente más tarde." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
