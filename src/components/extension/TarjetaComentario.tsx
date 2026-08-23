"use client";

import type { ComentarioPublico } from "@/lib/supabase/tipos";

/** Fecha estable en servidor y navegador: zona horaria fija, sin depender del equipo. */
const formatoFecha = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Bogota",
});

export function TarjetaComentario({
  comentario,
  meGusta,
  onAlternarLike,
  ocupado,
}: {
  comentario: ComentarioPublico;
  meGusta: boolean;
  onAlternarLike: (id: string) => void;
  ocupado: boolean;
}) {
  const fecha = formatoFecha.format(new Date(comentario.created_at));

  return (
    <article
      className={`comentario${comentario.destacado ? " comentario--destacado" : ""}`}
    >
      <header className="comentario__cabecera">
        <span className="comentario__nombre">{comentario.nombre}</span>
        <time className="comentario__fecha" dateTime={comentario.created_at}>
          {fecha}
        </time>
        {comentario.destacado && (
          <span className="comentario__marca">Destacado</span>
        )}
      </header>

      {/* Texto plano siempre: nada de dangerouslySetInnerHTML. `white-space` respeta
          los saltos de linea sin permitir marcado. */}
      <p className="comentario__mensaje">{comentario.mensaje}</p>

      {comentario.respuesta_decano && (
        <div className="respuesta">
          <p className="respuesta__firma">
            Respuesta de Gustavo Osorio
            {comentario.respuesta_fecha && (
              <>
                {" · "}
                <time dateTime={comentario.respuesta_fecha}>
                  {formatoFecha.format(new Date(comentario.respuesta_fecha))}
                </time>
              </>
            )}
          </p>
          <p className="respuesta__texto">{comentario.respuesta_decano}</p>
        </div>
      )}

      <footer className="comentario__pie">
        <button
          type="button"
          className={`like${meGusta ? " like--activo" : ""}`}
          onClick={() => onAlternarLike(comentario.id)}
          disabled={ocupado}
          aria-pressed={meGusta}
          aria-label={
            meGusta
              ? `Quitar mi me gusta. ${comentario.likes_count} en total`
              : `Me gusta. ${comentario.likes_count} en total`
          }
        >
          <svg viewBox="0 0 24 24" aria-hidden focusable="false">
            <path
              d="M12 20.3 4.6 13a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9A4.6 4.6 0 1 1 19.4 13z"
              fill={meGusta ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
          <span>{comentario.likes_count}</span>
        </button>
      </footer>
    </article>
  );
}
