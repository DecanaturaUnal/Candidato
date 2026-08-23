/**
 * Banco de pruebas de la base de datos.
 *
 * Levanta un Postgres real en memoria (PGlite), aplica las migraciones y el seed,
 * y despues intenta ROMPER las reglas desde el rol anonimo. La prueba pasa cuando
 * los intentos fallan.
 *
 * No necesita Docker ni una instancia de Supabase: sirve para validar el esquema y
 * las politicas antes de tocar el proyecto real, y para dejarlo en integracion
 * continua.
 *
 * Uso:  node scripts/probar-base.mjs
 */
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const DIR_MIGRACIONES = "supabase/migrations";

let fallos = 0;
let pruebas = 0;

function comprobar(descripcion, condicion, detalle = "") {
  pruebas++;
  if (condicion) {
    console.log(`  OK    ${descripcion}`);
  } else {
    fallos++;
    console.log(`  FALLA ${descripcion}${detalle ? `  -> ${detalle}` : ""}`);
  }
}

/** Ejecuta algo esperando que Postgres lo rechace. */
async function debeFallar(db, descripcion, sql) {
  pruebas++;
  try {
    await db.exec(sql);
    fallos++;
    console.log(`  FALLA ${descripcion}  -> no fue rechazado`);
  } catch (e) {
    console.log(`  OK    ${descripcion}  (${e.message.split("\n")[0]})`);
  }
}

const db = new PGlite();

// -----------------------------------------------------------------------------
// Andamiaje: lo que Supabase da hecho y aqui hay que simular
// -----------------------------------------------------------------------------
console.log("Preparando el entorno (roles y auth.jwt de Supabase)...");
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;

  -- Supabase concede por defecto TODO sobre los objetos nuevos del esquema public
  -- a estos tres roles. Se replica aqui a proposito: si no, el banco de pruebas
  -- seria mas estricto que la realidad y no detectaria un REVOKE que falte.
  alter default privileges in schema public
    grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public
    grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public
    grant all on functions to anon, authenticated, service_role;

  create schema if not exists auth;
  -- Misma semantica que en Supabase: lee las claims del JWT de la peticion.
  create or replace function auth.jwt()
  returns jsonb language sql stable as $$
    select coalesce(
      nullif(current_setting('request.jwt.claims', true), '')::jsonb,
      '{}'::jsonb
    );
  $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.jwt() to anon, authenticated;
`);

// -----------------------------------------------------------------------------
// Migraciones + seed
// -----------------------------------------------------------------------------
const archivos = (await readdir(DIR_MIGRACIONES)).filter((f) =>
  f.endsWith(".sql"),
);
archivos.sort();
console.log("\nAplicando migraciones:");
for (const archivo of archivos) {
  const sql = await readFile(path.join(DIR_MIGRACIONES, archivo), "utf8");
  await db.exec(sql);
  console.log(`  ${archivo}`);
}

console.log("\nAplicando seed:");
await db.exec(await readFile("supabase/seed.sql", "utf8"));
const resumen = await db.query(`
  select
    (select count(*)::int from public.comentarios) as total,
    (select count(*)::int from public.comentarios where estado = 'pendiente') as pendientes,
    (select count(*)::int from public.comentarios_publicos) as muro,
    (select count(*)::int from public.likes) as likes
`);
const { total, pendientes, muro, likes } = resumen.rows[0];
console.log(
  `  ${total} comentarios, ${pendientes} pendiente(s), ${muro} en el muro, ${likes} likes`,
);

console.log("\n--- Estado inicial ---");
comprobar("hay 7 comentarios sembrados", total === 7, `total=${total}`);
comprobar("queda 1 pendiente en la bandeja", pendientes === 1, `p=${pendientes}`);
comprobar(
  "el muro publico muestra 5 (el aprobado sin permiso no sale)",
  muro === 5,
  `muro=${muro}`,
);

const contador = await db.query(`
  select likes_count from public.comentarios where email = 'carlos.munoz@example.com'
`);
comprobar(
  "el trigger llevo el contador de likes a 3",
  contador.rows[0].likes_count === 3,
  `likes_count=${contador.rows[0].likes_count}`,
);

// -----------------------------------------------------------------------------
// El rol anonimo intenta pasarse de la raya
// -----------------------------------------------------------------------------
console.log("\n--- Rol anonimo: lo que NO debe poder hacer ---");
await db.exec(`set role anon;`);

await debeFallar(
  db,
  "leer la tabla de comentarios",
  `select * from public.comentarios;`,
);
await debeFallar(
  db,
  "leer los correos electronicos",
  `select email from public.comentarios;`,
);
await debeFallar(
  db,
  "leer los comentarios pendientes",
  `select mensaje from public.comentarios where estado = 'pendiente';`,
);
await debeFallar(
  db,
  "aprobar un comentario",
  `update public.comentarios set estado = 'aprobado';`,
);
await debeFallar(
  db,
  "borrar comentarios",
  `delete from public.comentarios;`,
);
await debeFallar(
  db,
  "leer la lista blanca de moderadores",
  `select * from public.admins;`,
);
// Sin INSERT no hay forma de esquivar el captcha escribiendo directo a la API.
await debeFallar(
  db,
  "guardar un mensaje saltandose el servidor",
  `insert into public.comentarios (nombre, email, mensaje, autoriza_publicacion, autoriza_datos)
     values ('Directo', 'directo@example.com',
             'Intento escribir directamente contra PostgREST, sin pasar por el captcha.',
             true, true);`,
);
// Los likes si se pueden consultar, pero solo los propios: sin cabecera de
// visitante la consulta es legal y devuelve cero filas, aunque la tabla tenga 7.
const likesAjenos = await db.query(`select * from public.likes;`);
comprobar(
  "no puede enumerar los likes de otros navegantes",
  likesAjenos.rows.length === 0,
  `filas visibles=${likesAjenos.rows.length}`,
);

console.log("\n--- Rol anonimo: lo que SI debe poder hacer ---");
const publico = await db.query(`select * from public.comentarios_publicos;`);
comprobar(
  "lee el muro publico por la vista",
  publico.rows.length === 5,
  `filas=${publico.rows.length}`,
);
comprobar(
  "la vista no expone el correo",
  !Object.keys(publico.rows[0]).includes("email"),
  `columnas: ${Object.keys(publico.rows[0]).join(", ")}`,
);
comprobar(
  "el mensaje anonimo sale como 'Anónimo'",
  publico.rows.some((r) => r.nombre === "Anónimo"),
);

// El servidor SI puede escribir (llave de servicio), pero ni siquiera el puede
// crear un mensaje ya aprobado: el trigger pisa los campos de moderacion.
await db.exec(`reset role;`);
await db.exec(`set role service_role;`);
await db.exec(`
  insert into public.comentarios
    (nombre, email, mensaje, autoriza_publicacion, autoriza_datos, estado, destacado, likes_count)
  values
    ('Intruso', 'intruso@example.com',
     'Intento colar este mensaje directamente como aprobado y destacado.',
     true, true, 'aprobado', true, 99);
`);
await db.exec(`reset role;`);
const colado = await db.query(`
  select estado::text, destacado, likes_count
    from public.comentarios where email = 'intruso@example.com'
`);
console.log("\n--- Ni el servidor puede crear un mensaje ya aprobado ---");
comprobar(
  "entra en estado 'pendiente'",
  colado.rows[0].estado === "pendiente",
  `estado=${colado.rows[0].estado}`,
);
comprobar("entra sin destacar", colado.rows[0].destacado === false);
comprobar("entra con 0 likes", colado.rows[0].likes_count === 0);

const muroTrasIntruso = await db.query(
  `select count(*)::int as n from public.comentarios_publicos`,
);
comprobar(
  "y NO aparece en el muro publico",
  muroTrasIntruso.rows[0].n === 5,
  `muro=${muroTrasIntruso.rows[0].n}`,
);

// -----------------------------------------------------------------------------
// Likes: cada quien toca el suyo
// -----------------------------------------------------------------------------
console.log("\n--- Likes ---");
const idMuro = publico.rows[0].id;
const visitante = "55555555-5555-4555-8555-555555555555";

await db.exec(`set role anon;`);
await db.exec(`select set_config('request.headers', '{"x-visitante-id":"${visitante}"}', false);`);
await db.exec(
  `insert into public.likes (comentario_id, visitante_id) values ('${idMuro}', '${visitante}');`,
);
await db.exec(`reset role;`);
const trasLike = await db.query(
  `select likes_count from public.comentarios where id = '${idMuro}'`,
);
comprobar(
  "poner like sube el contador",
  trasLike.rows[0].likes_count > 0,
  `likes_count=${trasLike.rows[0].likes_count}`,
);

await db.exec(`set role anon;`);
await debeFallar(
  db,
  "no se puede repetir el like (restriccion unica)",
  `insert into public.likes (comentario_id, visitante_id) values ('${idMuro}', '${visitante}');`,
);
// Con otra cabecera, no puede borrar el like ajeno
await db.exec(`select set_config('request.headers', '{"x-visitante-id":"99999999-9999-4999-8999-999999999999"}', false);`);
await db.exec(
  `delete from public.likes where comentario_id = '${idMuro}' and visitante_id = '${visitante}';`,
);
await db.exec(`reset role;`);
const trasIntentoBorrar = await db.query(
  `select count(*)::int as n from public.likes where comentario_id = '${idMuro}' and visitante_id = '${visitante}'`,
);
comprobar(
  "no se puede borrar el like de otro navegante",
  trasIntentoBorrar.rows[0].n === 1,
  `quedan=${trasIntentoBorrar.rows[0].n}`,
);

// -----------------------------------------------------------------------------
// Moderacion: hace falta estar en la lista blanca
// -----------------------------------------------------------------------------
console.log("\n--- Moderacion ---");
const comoUsuario = async (correo) => {
  await db.exec(`reset role;`);
  await db.exec(
    `select set_config('request.jwt.claims', '{"email":"${correo}"}', false);`,
  );
  await db.exec(`set role authenticated;`);
};

await comoUsuario("cualquiera@example.com");
const ajeno = await db.query(`select count(*)::int as n from public.comentarios`);
comprobar(
  "un autenticado que NO esta en la lista blanca no ve nada",
  ajeno.rows[0].n === 0,
  `filas=${ajeno.rows[0].n}`,
);

await comoUsuario("correo-del-equipo@example.com");
const admin = await db.query(`select count(*)::int as n from public.comentarios`);
comprobar(
  "un moderador de la lista blanca ve todos los comentarios",
  admin.rows[0].n === 8,
  `filas=${admin.rows[0].n}`,
);

await db.exec(
  `update public.comentarios set estado = 'aprobado' where email = 'intruso@example.com';`,
);
await db.exec(`reset role;`);
const sello = await db.query(`
  select moderado_por, moderado_en is not null as sellado
    from public.comentarios where email = 'intruso@example.com'
`);
comprobar(
  "al moderar queda registrado quien lo hizo",
  sello.rows[0].moderado_por === "correo-del-equipo@example.com",
  `moderado_por=${sello.rows[0].moderado_por}`,
);
comprobar("y cuando lo hizo", sello.rows[0].sellado === true);

// Moderador desactivado
await db.exec(
  `update public.admins set activo = false where email = 'correo-del-equipo@example.com';`,
);
await comoUsuario("correo-del-equipo@example.com");
const desactivado = await db.query(
  `select count(*)::int as n from public.comentarios`,
);
comprobar(
  "un moderador desactivado deja de ver los comentarios",
  desactivado.rows[0].n === 0,
  `filas=${desactivado.rows[0].n}`,
);
await db.exec(`reset role;`);

// -----------------------------------------------------------------------------
// Limite de peticiones por IP
// -----------------------------------------------------------------------------
console.log("\n--- Limite de peticiones ---");
const cupo = async () => {
  const r = await db.query(
    `select public.consumir_cupo('comentario:prueba', 3, interval '10 minutes') as ok`,
  );
  return r.rows[0].ok;
};
const intentos = [await cupo(), await cupo(), await cupo(), await cupo()];
comprobar(
  "deja pasar los 3 primeros envios de una IP",
  intentos.slice(0, 3).every(Boolean),
  `resultados=${intentos.join(", ")}`,
);
comprobar("y corta el cuarto", intentos[3] === false);

const otraIp = await db.query(
  `select public.consumir_cupo('comentario:otra-ip', 3, interval '10 minutes') as ok`,
);
comprobar(
  "el cupo es por IP, no global",
  otraIp.rows[0].ok === true,
);

await db.exec(`set role anon;`);
await debeFallar(
  db,
  "el publico no puede leer el registro de cupos",
  `select * from public.limites_tasa;`,
);
await debeFallar(
  db,
  "el publico no puede gastar cupo por su cuenta",
  `select public.consumir_cupo('comentario:falso', 3, interval '10 minutes');`,
);
await debeFallar(
  db,
  "el publico no puede invocar el trigger del contador de likes",
  `select public.recalcular_likes();`,
);
await db.exec(`reset role;`);

// -----------------------------------------------------------------------------
console.log(
  `\n${pruebas - fallos}/${pruebas} comprobaciones correctas` +
    (fallos ? `  --  ${fallos} FALLO(S)` : ""),
);
await db.close();
process.exit(fallos ? 1 : 0);
