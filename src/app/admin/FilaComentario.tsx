"use client";

import { useState, useTransition } from "react";
import {
  alternarDestacado,
  aprobar,
  eliminar,
  guardarRespuesta,
  rechazar,
} from "./acciones";
import type { Comentario } from "@/lib/supabase/tipos";

const formatoFecha = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

const ETIQUETA_ESTADO: Record<Comentario["estado"], string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

/**
 * Una fila de la bandeja de moderacion.
 *
 * Es el unico sitio de todo el proyecto donde se muestra el correo del autor: la
 * vista publica no lo expone y el rol anonimo no puede leer la tabla.
 */
export function FilaComentario({ comentario }: { comentario: Comentario }) {
  const [respuesta, setRespuesta] = useState(comentario.respuesta_decano ?? "");
  const [editando, setEditando] = useState(false);
  const [pendiente, iniciar] = useTransition();

  const correr = (accion: () => Promise<void>) => iniciar(() => accion());

  return (
    <article className={`fila fila--${comentario.estado}`}>
      <header className="fila__cabecera">
        <div>
          <span className="fila__nombre">
            {comentario.es_anonimo ? "Anónimo" : comentario.nombre}
          </span>
          {comentario.es_anonimo && (
            <span className="fila__aclaracion">(pidió anonimato)</span>
          )}
          <a className="fila__correo" href={`mailto:${comentario.email}`}>
            {comentario.email}
          </a>
        </div>
        <div className="fila__meta">
          <span className={`chip chip--${comentario.estado}`}>
            {ETIQUETA_ESTADO[comentario.estado]}
          </span>
          {comentario.destacado && <span className="chip chip--destacado">Destacado</span>}
          {!comentario.autoriza_publicacion && (
            <span className="chip chip--aviso" title="El autor no autorizó publicarlo">
              Sin permiso de publicación
            </span>
          )}
          <span className="fila__fecha">
            {formatoFecha.format(new Date(comentario.created_at))}
          </span>
          <span className="fila__likes">{comentario.likes_count} ♥</span>
        </div>
      </header>

      <p className="fila__mensaje">{comentario.mensaje}</p>

      {comentario.moderado_por && (
        <p className="fila__rastro">
          Moderado por {comentario.moderado_por}
          {comentario.moderado_en &&
            ` · ${formatoFecha.format(new Date(comentario.moderado_en))}`}
        </p>
      )}

      {(comentario.respuesta_decano || editando) && (
        <div className="fila__respuesta">
          {editando ? (
            <>
              <label htmlFor={`r-${comentario.id}`}>Respuesta del decano</label>
              <textarea
                id={`r-${comentario.id}`}
                rows={3}
                maxLength={2000}
                value={respuesta}
                onChange={(e) => setRespuesta(e.target.value)}
                placeholder="Escriba la respuesta. Dejarlo vacío la retira."
              />
              <div className="fila__acciones">
                <button
                  type="button"
                  className="boton boton--principal"
                  disabled={pendiente}
                  onClick={() =>
                    correr(async () => {
                      await guardarRespuesta(comentario.id, respuesta);
                      setEditando(false);
                    })
                  }
                >
                  Guardar respuesta
                </button>
                <button
                  type="button"
                  className="boton"
                  onClick={() => {
                    setRespuesta(comentario.respuesta_decano ?? "");
                    setEditando(false);
                  }}
                >
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <p className="fila__respuesta-texto">{comentario.respuesta_decano}</p>
          )}
        </div>
      )}

      <div className="fila__acciones">
        {comentario.estado !== "aprobado" && (
          <button
            type="button"
            className="boton boton--principal"
            disabled={pendiente}
            onClick={() => correr(() => aprobar(comentario.id))}
          >
            Aprobar
          </button>
        )}
        {comentario.estado !== "rechazado" && (
          <button
            type="button"
            className="boton"
            disabled={pendiente}
            onClick={() => correr(() => rechazar(comentario.id))}
          >
            Rechazar
          </button>
        )}
        <button
          type="button"
          className="boton"
          disabled={pendiente}
          onClick={() =>
            correr(() => alternarDestacado(comentario.id, !comentario.destacado))
          }
        >
          {comentario.destacado ? "Quitar destacado" : "Destacar"}
        </button>
        {!editando && (
          <button
            type="button"
            className="boton"
            onClick={() => setEditando(true)}
          >
            {comentario.respuesta_decano ? "Editar respuesta" : "Responder"}
          </button>
        )}
        <button
          type="button"
          className="boton boton--peligro"
          disabled={pendiente}
          onClick={() => {
            if (
              confirm(
                "¿Eliminar este mensaje de forma permanente? No se puede deshacer.",
              )
            ) {
              correr(() => eliminar(comentario.id));
            }
          }}
        >
          Eliminar
        </button>
      </div>
    </article>
  );
}
