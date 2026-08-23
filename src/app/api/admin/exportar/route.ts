import { NextResponse } from "next/server";
import { sesionDelPanel } from "@/lib/admin";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Comentario } from "@/lib/supabase/tipos";

/**
 * Exportacion de todos los comentarios a CSV, para abrir en Excel.
 *
 * Se lee con el cliente de sesion, no con la llave de servicio: si quien pide el
 * archivo no es moderador, las politicas de RLS no le devuelven ni una fila. La
 * comprobacion previa esta para responder un 404 en vez de un CSV vacio.
 */
export const runtime = "nodejs";

const COLUMNAS = [
  "id",
  "fecha",
  "nombre",
  "es_anonimo",
  "email",
  "mensaje",
  "estado",
  "destacado",
  "likes",
  "autoriza_publicacion",
  "autoriza_datos",
  "respuesta_decano",
  "respuesta_fecha",
  "moderado_por",
  "moderado_en",
] as const;

/**
 * Escapa un valor para CSV.
 *
 * El prefijo con comilla simple cuando el texto empieza por = + - @ evita la
 * inyeccion de formulas: sin el, un mensaje que empiece por "=" se ejecutaria
 * como formula al abrir el archivo en Excel.
 */
function celda(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  let texto = String(valor);
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return `"${texto.replace(/"/g, '""')}"`;
}

export async function GET() {
  const sesion = await sesionDelPanel();
  if (sesion.estado !== "moderador") {
    return new NextResponse("No encontrado", { status: 404 });
  }

  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("comentarios")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return new NextResponse("No se pudo exportar", { status: 500 });
  }

  const filas = (data ?? []) as Comentario[];
  const lineas = [COLUMNAS.join(";")];

  for (const c of filas) {
    lineas.push(
      [
        celda(c.id),
        celda(c.created_at),
        celda(c.nombre),
        celda(c.es_anonimo ? "sí" : "no"),
        celda(c.email),
        celda(c.mensaje),
        celda(c.estado),
        celda(c.destacado ? "sí" : "no"),
        celda(c.likes_count),
        celda(c.autoriza_publicacion ? "sí" : "no"),
        celda(c.autoriza_datos ? "sí" : "no"),
        celda(c.respuesta_decano),
        celda(c.respuesta_fecha),
        celda(c.moderado_por),
        celda(c.moderado_en),
      ].join(";"),
    );
  }

  // El BOM hace que Excel reconozca UTF-8 y no destroce las tildes.
  const csv = "﻿" + lineas.join("\r\n");
  const fecha = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="comentarios-${fecha}.csv"`,
      "cache-control": "no-store",
    },
  });
}
