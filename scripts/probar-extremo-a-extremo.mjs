/**
 * Prueba del flujo completo, contra la base real (punto §13.3 y §13.4).
 *
 * Recorre el camino de un mensaje de principio a fin:
 *   enviar -> queda pendiente -> NO sale al muro -> aprobar -> sale -> like ->
 *   el contador sube -> no se puede duplicar -> responder -> se ve la respuesta
 *
 * Y despues intenta, con la LLAVE ANONIMA de verdad, leer correos y comentarios
 * pendientes: debe ser imposible.
 *
 * Requisitos:
 *   - Servidor levantado (idealmente `npm run build && npm start`)
 *   - .env.local con las credenciales de Supabase
 *   - Las claves de PRUEBA de Turnstile, que siempre aprueban:
 *       NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
 *       TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
 *     (con las reales el script no puede resolver el captcha, que es justo lo que
 *      se busca: que no haya forma de enviar sin pasarlo)
 *
 * Limpia lo que crea al terminar.
 *
 * Uso:  node scripts/probar-extremo-a-extremo.mjs [url]
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const base = process.argv[2] ?? "http://localhost:3000";
const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const LLAVE_ANONIMA = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const LLAVE_SERVICIO = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_SUPABASE || !LLAVE_ANONIMA || !LLAVE_SERVICIO) {
  console.error("Faltan credenciales en .env.local.");
  process.exit(1);
}

const MARCA = `prueba-e2e-${Date.now()}@example.com`;
const VISITANTE = crypto.randomUUID();

const servicio = createClient(URL_SUPABASE, LLAVE_SERVICIO, {
  auth: { persistSession: false },
});
const anonimo = createClient(URL_SUPABASE, LLAVE_ANONIMA, {
  auth: { persistSession: false },
});

let fallos = 0;
let total = 0;
const comprobar = (descripcion, condicion, detalle = "") => {
  total++;
  if (condicion) console.log(`  OK    ${descripcion}`);
  else {
    fallos++;
    console.log(`  FALLA ${descripcion}${detalle ? `  -> ${detalle}` : ""}`);
  }
};

async function limpiar() {
  await servicio.from("comentarios").delete().eq("email", MARCA);
}

try {
  // ---------------------------------------------------------------------------
  console.log("1. Enviar un mensaje por el formulario");

  const envio = await fetch(`${base}/api/comentarios`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      nombre: "Prueba automatizada",
      esAnonimo: false,
      email: MARCA,
      mensaje:
        "Mensaje de la prueba de extremo a extremo. Debe quedar pendiente y no salir al muro.",
      autorizaPublicacion: true,
      autorizaDatos: true,
      sitioWeb: "",
      // Suficientemente atrás para superar el tiempo mínimo anti-robots
      abiertoEn: Date.now() - 10_000,
      captcha: "XXXX.DUMMY.TOKEN.XXXX",
    }),
  });

  comprobar("el envío es aceptado", envio.status === 201, `estado=${envio.status}`);

  const { data: recien } = await servicio
    .from("comentarios")
    .select("*")
    .eq("email", MARCA)
    .maybeSingle();

  comprobar("el mensaje se guardó", Boolean(recien));
  if (!recien) throw new Error("Sin mensaje guardado: no se puede seguir.");

  comprobar(
    "entró en estado 'pendiente'",
    recien.estado === "pendiente",
    recien.estado,
  );
  comprobar("la IP quedó hasheada, no en claro", /^[0-9a-f]{64}$/.test(recien.ip_hash ?? ""));

  // ---------------------------------------------------------------------------
  console.log("\n2. Estando pendiente, NO debe verse en público");

  const muroAntes = await (await fetch(`${base}/api/muro?orden=recientes`)).json();
  comprobar(
    "no aparece en el muro",
    !muroAntes.comentarios.some((c) => c.id === recien.id),
  );

  const { data: vistaAnon } = await anonimo
    .from("comentarios_publicos")
    .select("id")
    .eq("id", recien.id);
  comprobar("tampoco por la vista pública", (vistaAnon ?? []).length === 0);

  // ---------------------------------------------------------------------------
  console.log("\n3. Aprobarlo (lo que hace el panel)");

  await servicio
    .from("comentarios")
    .update({ estado: "aprobado", moderado_por: "prueba@example.com" })
    .eq("id", recien.id);

  const muroDespues = await (
    await fetch(`${base}/api/muro?orden=recientes`)
  ).json();
  comprobar(
    "ahora sí aparece en el muro",
    muroDespues.comentarios.some((c) => c.id === recien.id),
  );

  const publicado = muroDespues.comentarios.find((c) => c.id === recien.id);
  comprobar(
    "el muro no expone el correo",
    publicado && !("email" in publicado),
    publicado ? Object.keys(publicado).join(", ") : "",
  );

  const { data: sellado } = await servicio
    .from("comentarios")
    .select("moderado_por, moderado_en")
    .eq("id", recien.id)
    .maybeSingle();
  comprobar(
    "queda registrado quién moderó y cuándo",
    Boolean(sellado?.moderado_por && sellado?.moderado_en),
  );

  // ---------------------------------------------------------------------------
  console.log("\n4. Me gusta");

  const like = await (
    await fetch(`${base}/api/likes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        comentarioId: recien.id,
        visitanteId: VISITANTE,
        accion: "poner",
      }),
    })
  ).json();
  comprobar("el contador sube a 1", like.likes === 1, `likes=${like.likes}`);

  const repetido = await (
    await fetch(`${base}/api/likes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        comentarioId: recien.id,
        visitanteId: VISITANTE,
        accion: "poner",
      }),
    })
  ).json();
  comprobar(
    "el mismo navegante no puede votar dos veces",
    repetido.likes === 1,
    `likes=${repetido.likes}`,
  );

  const quitado = await (
    await fetch(`${base}/api/likes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        comentarioId: recien.id,
        visitanteId: VISITANTE,
        accion: "quitar",
      }),
    })
  ).json();
  comprobar("se puede quitar el me gusta", quitado.likes === 0);

  // ---------------------------------------------------------------------------
  console.log("\n5. Respuesta del decano");

  await servicio
    .from("comentarios")
    .update({ respuesta_decano: "Respuesta de prueba del decano." })
    .eq("id", recien.id);

  const conRespuesta = await (
    await fetch(`${base}/api/muro?orden=recientes`)
  ).json();
  const conRta = conRespuesta.comentarios.find((c) => c.id === recien.id);
  comprobar(
    "la respuesta se muestra en el muro",
    conRta?.respuesta_decano === "Respuesta de prueba del decano.",
  );
  comprobar("y con su fecha", Boolean(conRta?.respuesta_fecha));

  // ---------------------------------------------------------------------------
  console.log("\n6. Con la llave anónima, lo que NO se puede hacer (§13.4)");

  const lectura = await anonimo.from("comentarios").select("email");
  comprobar(
    "leer correos de la tabla",
    lectura.error !== null || (lectura.data ?? []).length === 0,
    lectura.error ? lectura.error.message : `devolvió ${lectura.data?.length} filas`,
  );

  const pendientes = await anonimo
    .from("comentarios")
    .select("mensaje")
    .eq("estado", "pendiente");
  comprobar(
    "leer los comentarios pendientes",
    pendientes.error !== null || (pendientes.data ?? []).length === 0,
    pendientes.error ? pendientes.error.message : `devolvió ${pendientes.data?.length}`,
  );

  const insercion = await anonimo.from("comentarios").insert({
    nombre: "Directo",
    email: "directo@example.com",
    mensaje: "Escribiendo sin pasar por el captcha.",
    autoriza_publicacion: true,
    autoriza_datos: true,
  });
  comprobar(
    "guardar un mensaje saltándose el captcha",
    insercion.error !== null,
    insercion.error ? insercion.error.message : "fue aceptado",
  );

  const moderadores = await anonimo.from("admins").select("email");
  comprobar(
    "leer la lista de moderadores",
    moderadores.error !== null || (moderadores.data ?? []).length === 0,
    moderadores.error ? moderadores.error.message : `devolvió ${moderadores.data?.length}`,
  );

  const modificar = await anonimo
    .from("comentarios")
    .update({ estado: "aprobado" })
    .eq("id", recien.id);
  comprobar("aprobar un comentario", modificar.error !== null);
} finally {
  await limpiar();
  console.log("\n(datos de prueba eliminados)");
}

console.log(
  `\n${total - fallos}/${total} comprobaciones correctas` +
    (fallos ? `  --  ${fallos} FALLO(S)` : ""),
);
process.exit(fallos ? 1 : 0);
