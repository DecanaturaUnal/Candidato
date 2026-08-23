import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sesionDelPanel } from "@/lib/admin";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Comentario, EstadoComentario } from "@/lib/supabase/tipos";
import { Acceso } from "./Acceso";
import { FilaComentario } from "./FilaComentario";
import { salir } from "./acciones";

export const metadata: Metadata = {
  title: "Moderación",
  robots: { index: false, follow: false, nocache: true },
};

/** Nunca en cache: la bandeja cambia con cada accion. */
export const dynamic = "force-dynamic";

const FILTROS: { id: string; texto: string }[] = [
  { id: "pendiente", texto: "Pendientes" },
  { id: "aprobado", texto: "Aprobados" },
  { id: "rechazado", texto: "Rechazados" },
  { id: "todos", texto: "Todos" },
];

type Parametros = { estado?: string; buscar?: string; error?: string };

/**
 * Panel de moderacion.
 *
 * Tres caminos posibles:
 *   - sin sesion            -> formulario de acceso por enlace magico
 *   - con sesion, sin permiso -> 404 generico (no "no autorizado": eso confirmaria
 *                                que la ruta existe y que se llego a autenticar)
 *   - moderador             -> la bandeja
 *
 * La ruta no esta enlazada desde ninguna parte del sitio publico, esta excluida en
 * robots.txt y el middleware le pone `noindex` y `no-store`.
 */
export default async function Panel({
  searchParams,
}: {
  searchParams: Promise<Parametros>;
}) {
  const parametros = await searchParams;
  const sesion = await sesionDelPanel();

  if (sesion.estado === "sin-configurar") {
    return (
      <main className="panel">
        <div className="acceso">
          <div className="acceso__caja">
            <h1 className="acceso__titulo">Moderación</h1>
            <p className="formulario__aviso">
              Falta configurar Supabase. Copie <code>.env.example</code> como{" "}
              <code>.env.local</code> y complete las credenciales.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (sesion.estado === "anonimo") {
    return (
      <main className="panel">
        <Acceso aviso={parametros.error} />
      </main>
    );
  }

  // Autenticado pero fuera de la lista blanca: se cierra la sesion y se responde
  // exactamente lo mismo que ante una ruta inexistente.
  if (sesion.estado === "intruso") {
    await salirSilencioso();
    notFound();
  }

  const estado = (parametros.estado ?? "pendiente") as
    | EstadoComentario
    | "todos";
  const buscar = (parametros.buscar ?? "").trim();

  const supabase = await clienteServidor();

  let consulta = supabase
    .from("comentarios")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (estado !== "todos") consulta = consulta.eq("estado", estado);
  if (buscar) {
    const patron = `%${buscar.replace(/[%_]/g, "")}%`;
    consulta = consulta.or(
      `nombre.ilike.${patron},mensaje.ilike.${patron},email.ilike.${patron}`,
    );
  }

  const { data, error } = await consulta;
  const comentarios = (data ?? []) as Comentario[];

  const { count: pendientes } = await supabase
    .from("comentarios")
    .select("id", { count: "exact", head: true })
    .eq("estado", "pendiente");

  return (
    <main className="panel">
      <header className="panel__cabecera">
        <div>
          <h1 className="panel__titulo">Moderación</h1>
          <p className="panel__quien">
            {sesion.nombre} · {sesion.correo}
          </p>
        </div>
        <div className="panel__herramientas">
          <span className="panel__contador">
            {pendientes ?? 0} pendiente{pendientes === 1 ? "" : "s"}
          </span>
          <a className="boton" href="/api/admin/exportar">
            Exportar CSV
          </a>
          <form action={salir}>
            <button type="submit" className="boton">
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>

      <form className="panel__filtros" action="/admin" method="get">
        <div className="panel__pestanas">
          {FILTROS.map((filtro) => (
            <a
              key={filtro.id}
              href={`/admin?estado=${filtro.id}${buscar ? `&buscar=${encodeURIComponent(buscar)}` : ""}`}
              className={`muro__pestana${estado === filtro.id ? " muro__pestana--activa" : ""}`}
            >
              {filtro.texto}
            </a>
          ))}
        </div>
        <div className="panel__buscador">
          <input type="hidden" name="estado" value={estado} />
          <input
            type="search"
            name="buscar"
            defaultValue={buscar}
            placeholder="Buscar por nombre, correo o texto…"
            aria-label="Buscar comentarios"
          />
          <button type="submit" className="boton">
            Buscar
          </button>
        </div>
      </form>

      {error && (
        <p className="formulario__error-general">
          No se pudieron cargar los comentarios: {error.message}
        </p>
      )}

      {comentarios.length === 0 ? (
        <p className="muro__vacio">
          No hay mensajes que coincidan con este filtro.
        </p>
      ) : (
        <div className="panel__lista">
          {comentarios.map((comentario) => (
            <FilaComentario key={comentario.id} comentario={comentario} />
          ))}
        </div>
      )}
    </main>
  );
}

/** Cierra la sesion sin redirigir, para poder responder un 404 a continuacion. */
async function salirSilencioso() {
  const supabase = await clienteServidor();
  await supabase.auth.signOut();
}
