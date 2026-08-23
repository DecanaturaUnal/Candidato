"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { cerrarSesion, sesionDelPanel } from "@/lib/admin";
import { clienteServidor } from "@/lib/supabase/servidor";
import { limpiarTexto } from "@/lib/seguridad";

/**
 * Acciones de moderacion.
 *
 * Todas escriben con el cliente de SESION, no con la llave de servicio: asi la
 * autorizacion la sigue decidiendo la base mediante las politicas de RLS. La
 * comprobacion de `sesionDelPanel()` que hay al principio es una cortesia para dar
 * un error claro, no la barrera de verdad.
 *
 * Quien modero y cuando lo anota un trigger de la base, no este codigo.
 */

const idComentario = z.uuid();

async function exigirModerador() {
  const sesion = await sesionDelPanel();
  if (sesion.estado !== "moderador") {
    throw new Error("Sin permisos de moderación.");
  }
  return sesion;
}

async function cambiarEstado(id: string, estado: "aprobado" | "rechazado") {
  await exigirModerador();
  const comentarioId = idComentario.parse(id);

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("comentarios")
    .update({ estado })
    .eq("id", comentarioId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function aprobar(id: string) {
  await cambiarEstado(id, "aprobado");
}

export async function rechazar(id: string) {
  await cambiarEstado(id, "rechazado");
}

export async function alternarDestacado(id: string, destacado: boolean) {
  await exigirModerador();
  const comentarioId = idComentario.parse(id);

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("comentarios")
    .update({ destacado })
    .eq("id", comentarioId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function guardarRespuesta(id: string, texto: string) {
  await exigirModerador();
  const comentarioId = idComentario.parse(id);

  const limpio = limpiarTexto(texto);
  // Vaciar el campo equivale a retirar la respuesta; el trigger deja la fecha en
  // nulo cuando el texto pasa a nulo.
  const respuesta = limpio.length === 0 ? null : limpio.slice(0, 2000);

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("comentarios")
    .update({ respuesta_decano: respuesta })
    .eq("id", comentarioId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function eliminar(id: string) {
  await exigirModerador();
  const comentarioId = idComentario.parse(id);

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("comentarios")
    .delete()
    .eq("id", comentarioId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function salir() {
  await cerrarSesion();
  redirect("/admin");
}
