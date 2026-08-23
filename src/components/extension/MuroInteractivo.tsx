"use client";

import { useCallback, useEffect, useState } from "react";
import { clienteNavegador } from "@/lib/supabase/navegador";
import { obtenerVisitanteId } from "@/lib/visitante";
import type { ComentarioPublico, OrdenMuro } from "@/lib/supabase/tipos";
import { TarjetaComentario } from "./TarjetaComentario";

/**
 * Muro de mensajes de la comunidad.
 *
 * La primera pagina llega ya pintada desde el servidor, asi que el muro existe en
 * el HTML inicial (bueno para buscadores y para quien tenga mala conexion). A
 * partir de ahi, cambiar de pestana o cargar mas se resuelve contra /api/muro.
 */

const PESTANAS: { id: OrdenMuro; texto: string }[] = [
  { id: "destacados", texto: "Destacados" },
  { id: "recientes", texto: "Recientes" },
];

export function MuroInteractivo({
  inicial,
  hayMasInicial,
}: {
  inicial: ComentarioPublico[];
  hayMasInicial: boolean;
}) {
  const [orden, setOrden] = useState<OrdenMuro>("destacados");
  const [comentarios, setComentarios] = useState(inicial);
  const [pagina, setPagina] = useState(0);
  const [hayMas, setHayMas] = useState(hayMasInicial);
  const [cargando, setCargando] = useState(false);
  const [misLikes, setMisLikes] = useState<Set<string>>(new Set());
  const [ocupados, setOcupados] = useState<Set<string>>(new Set());

  // Que comentarios ya voté. La consulta va con la cabecera `x-visitante-id` y la
  // politica de RLS la acota a las filas propias: no se puede ver el voto de nadie mas.
  useEffect(() => {
    let cancelado = false;
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return;
    }
    (async () => {
      try {
        const { data } = await clienteNavegador()
          .from("likes")
          .select("comentario_id");
        if (!cancelado && data) {
          const filas = data as { comentario_id: string }[];
          setMisLikes(new Set(filas.map((fila) => fila.comentario_id)));
        }
      } catch {
        // Sin credenciales de Supabase el muro sigue leyendose; solo no se sabe
        // que voto este navegador.
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  const cargar = useCallback(
    async (nuevoOrden: OrdenMuro, nuevaPagina: number, acumular: boolean) => {
      setCargando(true);
      try {
        const respuesta = await fetch(
          `/api/muro?orden=${nuevoOrden}&pagina=${nuevaPagina}`,
        );
        const cuerpo = await respuesta.json();
        if (!cuerpo.ok) return;
        setComentarios((previos) =>
          acumular ? [...previos, ...cuerpo.comentarios] : cuerpo.comentarios,
        );
        setHayMas(cuerpo.hayMas);
        setPagina(nuevaPagina);
      } finally {
        setCargando(false);
      }
    },
    [],
  );

  const cambiarPestana = (nuevo: OrdenMuro) => {
    if (nuevo === orden) return;
    setOrden(nuevo);
    cargar(nuevo, 0, false);
  };

  /**
   * Like con actualizacion optimista: el contador se mueve al instante y, si el
   * servidor devuelve otra cosa, se corrige con su valor.
   */
  const alternarLike = async (id: string) => {
    if (ocupados.has(id)) return;
    const teniaLike = misLikes.has(id);

    setOcupados((previos) => new Set(previos).add(id));
    setMisLikes((previos) => {
      const copia = new Set(previos);
      if (teniaLike) copia.delete(id);
      else copia.add(id);
      return copia;
    });
    setComentarios((previos) =>
      previos.map((c) =>
        c.id === id
          ? { ...c, likes_count: c.likes_count + (teniaLike ? -1 : 1) }
          : c,
      ),
    );

    try {
      const respuesta = await fetch("/api/likes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          comentarioId: id,
          visitanteId: obtenerVisitanteId(),
          accion: teniaLike ? "quitar" : "poner",
        }),
      });
      const cuerpo = await respuesta.json();

      if (!cuerpo.ok) throw new Error("rechazado");

      setComentarios((previos) =>
        previos.map((c) => (c.id === id ? { ...c, likes_count: cuerpo.likes } : c)),
      );
    } catch {
      // Deshacer la suposicion optimista
      setMisLikes((previos) => {
        const copia = new Set(previos);
        if (teniaLike) copia.add(id);
        else copia.delete(id);
        return copia;
      });
      setComentarios((previos) =>
        previos.map((c) =>
          c.id === id
            ? { ...c, likes_count: c.likes_count + (teniaLike ? 1 : -1) }
            : c,
        ),
      );
    } finally {
      setOcupados((previos) => {
        const copia = new Set(previos);
        copia.delete(id);
        return copia;
      });
    }
  };

  return (
    <section className="muro" id="muro" aria-label="Mensajes de la comunidad">
      <h2 className="bloque__titulo">Lo que dice la comunidad</h2>

      <div className="muro__pestanas" role="tablist">
        {PESTANAS.map((pestana) => (
          <button
            key={pestana.id}
            type="button"
            role="tab"
            aria-selected={orden === pestana.id}
            className={`muro__pestana${orden === pestana.id ? " muro__pestana--activa" : ""}`}
            onClick={() => cambiarPestana(pestana.id)}
          >
            {pestana.texto}
          </button>
        ))}
      </div>

      {comentarios.length === 0 ? (
        <p className="muro__vacio">
          Todavía no hay mensajes publicados. Escriba el suyo desde el cuadro
          “Conversemos”.
        </p>
      ) : (
        <div className="muro__lista">
          {comentarios.map((comentario) => (
            <TarjetaComentario
              key={comentario.id}
              comentario={comentario}
              meGusta={misLikes.has(comentario.id)}
              onAlternarLike={alternarLike}
              ocupado={ocupados.has(comentario.id)}
            />
          ))}
        </div>
      )}

      {hayMas && (
        <button
          type="button"
          className="boton muro__mas"
          onClick={() => cargar(orden, pagina + 1, true)}
          disabled={cargando}
        >
          {cargando ? "Cargando…" : "Cargar más"}
        </button>
      )}
    </section>
  );
}
