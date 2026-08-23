/**
 * Aplica las migraciones (y opcionalmente el seed) sobre la base de Supabase.
 *
 * Evita tener que pegar cinco archivos a mano en el editor SQL del panel, que es
 * donde es facil saltarse uno o cambiarles el orden.
 *
 * Necesita `DATABASE_URL` en .env.local: es la cadena de conexion directa a
 * Postgres, distinta de la URL de la API. Se encuentra en el panel de Supabase, en
 * Project Settings -> Database -> Connection string -> URI.
 *
 * Uso:
 *   node scripts/aplicar-esquema.mjs            aplica solo las migraciones
 *   node scripts/aplicar-esquema.mjs --seed     aplica ademas los datos de ejemplo
 *   node scripts/aplicar-esquema.mjs --estado   solo informa de que hay aplicado
 */
import pg from "pg";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import { revisarCadena } from "./revisar-cadena.mjs";

config({ path: ".env.local", quiet: true });

const DIR = "supabase/migrations";
const conSeed = process.argv.includes("--seed");
const soloEstado = process.argv.includes("--estado");

const cadena = process.env.DATABASE_URL;
if (!cadena) {
  console.error(
    "Falta DATABASE_URL en .env.local.\n\n" +
      "  Es la conexión directa a Postgres, no la URL de la API. Se copia de:\n" +
      "  Supabase -> Project Settings -> Database -> Connection string -> URI\n\n" +
      "  Debe verse así:\n" +
      "  postgresql://postgres.xxxx:CONTRASEÑA@aws-0-region.pooler.supabase.com:5432/postgres",
  );
  process.exit(1);
}

const avisos = revisarCadena(cadena);
if (avisos.length) {
  console.error("Hay algo raro en DATABASE_URL:\n");
  for (const aviso of avisos) console.error("  - " + aviso + "\n");
  console.error("  Se copia de: Supabase > Project Settings > Database >");
  console.error("  Connection string > URI\n");
  process.exit(1);
}

const cliente = new pg.Client({
  connectionString: cadena,
  // Supabase exige TLS, pero su certificado no está en el almacén del sistema.
  ssl: { rejectUnauthorized: false },
});

await cliente.connect();
console.log("Conectado a la base.\n");

/** Registro de lo aplicado, para que volver a correr esto sea inofensivo. */
await cliente.query(`
  create table if not exists public.migraciones_aplicadas (
    archivo text primary key,
    aplicada_en timestamptz not null default now()
  );
`);

const { rows: yaAplicadas } = await cliente.query(
  "select archivo from public.migraciones_aplicadas",
);
const aplicadas = new Set(yaAplicadas.map((f) => f.archivo));

const archivos = (await readdir(DIR)).filter((f) => f.endsWith(".sql")).sort();

if (soloEstado) {
  console.log("Migraciones:");
  for (const archivo of archivos) {
    console.log(`  ${aplicadas.has(archivo) ? "aplicada  " : "PENDIENTE "} ${archivo}`);
  }
  await cliente.end();
  process.exit(0);
}

let nuevas = 0;
for (const archivo of archivos) {
  if (aplicadas.has(archivo)) {
    console.log(`  ya estaba  ${archivo}`);
    continue;
  }

  const sql = await readFile(path.join(DIR, archivo), "utf8");
  try {
    // Cada migración va en su propia transacción: si falla, no deja la base a medias.
    await cliente.query("begin");
    await cliente.query(sql);
    await cliente.query(
      "insert into public.migraciones_aplicadas (archivo) values ($1)",
      [archivo],
    );
    await cliente.query("commit");
    console.log(`  APLICADA   ${archivo}`);
    nuevas++;
  } catch (error) {
    await cliente.query("rollback");
    console.error(`\n  FALLÓ      ${archivo}\n  ${error.message}\n`);
    console.error("No se aplicó ningún cambio de este archivo.");
    await cliente.end();
    process.exit(1);
  }
}

console.log(
  nuevas ? `\n${nuevas} migración(es) nueva(s).` : "\nTodo estaba al día.",
);

if (conSeed) {
  console.log("\nAplicando datos de ejemplo…");
  const { rows } = await cliente.query(
    "select count(*)::int as n from public.comentarios",
  );
  if (rows[0].n > 0) {
    console.log(
      `  Ya hay ${rows[0].n} comentarios: no se siembra nada para no duplicar.`,
    );
  } else {
    const seed = await readFile("supabase/seed.sql", "utf8");
    await cliente.query(seed);
    console.log("  Listo.");
  }
}

// Resumen final
const { rows: resumen } = await cliente.query(`
  select
    (select count(*)::int from public.comentarios) as total,
    (select count(*)::int from public.comentarios where estado = 'pendiente') as pendientes,
    (select count(*)::int from public.comentarios_publicos) as muro,
    (select count(*)::int from public.admins) as moderadores
`);
const { total, pendientes, muro, moderadores } = resumen[0];
console.log(
  `\nEstado: ${total} comentarios (${pendientes} pendiente(s)), ` +
    `${muro} visibles en el muro, ${moderadores} moderador(es).`,
);

await cliente.end();
