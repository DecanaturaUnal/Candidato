"""
Reporte del estado del muro.

Da de un vistazo lo que hace falta para gobernar la conversación: cuánto hay
pendiente, qué tan rápido se está moderando, qué mensajes están gustando y cuánto
tráfico llega por día.

Uso (con el entorno virtual activado):
    python scripts/python/reporte.py
"""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone

from _comun import cargar_entorno, descargar_comentarios, preparar_consola


def a_fecha(valor: str | None) -> datetime | None:
    if not valor:
        return None
    try:
        return datetime.fromisoformat(str(valor).replace("Z", "+00:00"))
    except ValueError:
        return None


def barra(cantidad: int, maximo: int, ancho: int = 32) -> str:
    if maximo <= 0:
        return ""
    return "#" * max(1, round(cantidad / maximo * ancho)) if cantidad else ""


def titulo(texto: str) -> None:
    print(f"\n{texto}")
    print("-" * len(texto))


def main() -> None:
    preparar_consola()
    url, llave = cargar_entorno()

    comentarios = descargar_comentarios(url, llave)
    if not comentarios:
        print("No hay comentarios todavía.")
        return

    ahora = datetime.now(timezone.utc)

    print(f"REPORTE DEL MURO · {ahora.astimezone():%Y-%m-%d %H:%M}")
    print(f"Total de mensajes recibidos: {len(comentarios)}")

    # --- Estado de moderación -------------------------------------------------
    titulo("Estado de moderación")
    por_estado = Counter(c.get("estado", "?") for c in comentarios)
    maximo = max(por_estado.values())
    for estado in ("pendiente", "aprobado", "rechazado"):
        cantidad = por_estado.get(estado, 0)
        print(f"  {estado:<11} {cantidad:>5}  {barra(cantidad, maximo)}")

    publicables = [
        c
        for c in comentarios
        if c.get("estado") == "aprobado" and c.get("autoriza_publicacion")
    ]
    aprobados_sin_permiso = por_estado.get("aprobado", 0) - len(publicables)
    print(f"\n  Visibles en el muro: {len(publicables)}")
    if aprobados_sin_permiso:
        print(
            f"  Aprobados que NO salen por falta de permiso del autor: "
            f"{aprobados_sin_permiso}"
        )

    # --- Cuánto lleva esperando lo pendiente ----------------------------------
    pendientes = [c for c in comentarios if c.get("estado") == "pendiente"]
    if pendientes:
        titulo("Pendientes")
        esperas = []
        for comentario in pendientes:
            creado = a_fecha(comentario.get("created_at"))
            if creado:
                esperas.append((ahora - creado, comentario))
        esperas.sort(key=lambda par: par[0], reverse=True)

        print(f"  Hay {len(pendientes)} sin revisar.")
        if esperas:
            horas = esperas[0][0].total_seconds() / 3600
            print(f"  El más antiguo lleva esperando {horas:.1f} horas.")
            print("\n  Los 5 que llevan más tiempo:")
            for espera, comentario in esperas[:5]:
                dias = espera.days
                nombre = comentario.get("nombre", "?")
                texto = (comentario.get("mensaje") or "").replace("\n", " ")
                print(f"    [{dias}d] {nombre[:22]:<22} {texto[:56]}…")

    # --- Tiempo de respuesta del equipo ---------------------------------------
    demoras = []
    for comentario in comentarios:
        creado = a_fecha(comentario.get("created_at"))
        moderado = a_fecha(comentario.get("moderado_en"))
        if creado and moderado and moderado >= creado:
            demoras.append((moderado - creado).total_seconds() / 3600)

    if demoras:
        titulo("Rapidez de la moderación")
        demoras.sort()
        mitad = demoras[len(demoras) // 2]
        print(f"  Mensajes moderados: {len(demoras)}")
        print(f"  Mediana de espera:  {mitad:.1f} horas")
        print(f"  El que más tardó:   {demoras[-1]:.1f} horas")

    # --- Participación --------------------------------------------------------
    titulo("Participación")
    total_likes = sum(int(c.get("likes_count") or 0) for c in comentarios)
    anonimos = sum(1 for c in comentarios if c.get("es_anonimo"))
    con_respuesta = sum(1 for c in comentarios if c.get("respuesta_decano"))
    print(f"  Me gusta en total:        {total_likes}")
    print(f"  Mensajes anónimos:        {anonimos}")
    print(f"  Respondidos por el decano: {con_respuesta}")

    mas_gustados = sorted(
        publicables, key=lambda c: int(c.get("likes_count") or 0), reverse=True
    )[:5]
    if mas_gustados and int(mas_gustados[0].get("likes_count") or 0) > 0:
        print("\n  Los que más gustan:")
        for comentario in mas_gustados:
            likes = comentario.get("likes_count", 0)
            nombre = comentario.get("nombre", "?")
            texto = (comentario.get("mensaje") or "").replace("\n", " ")
            print(f"    {likes:>4} ♥  {nombre[:20]:<20} {texto[:50]}…")

    # --- Llegada por día ------------------------------------------------------
    titulo("Mensajes recibidos por día (últimos 14)")
    desde = ahora - timedelta(days=14)
    por_dia: Counter[str] = Counter()
    for comentario in comentarios:
        creado = a_fecha(comentario.get("created_at"))
        if creado and creado >= desde:
            por_dia[creado.astimezone().strftime("%Y-%m-%d")] += 1

    if not por_dia:
        print("  Sin mensajes en las últimas dos semanas.")
    else:
        tope = max(por_dia.values())
        for dia in sorted(por_dia):
            print(f"  {dia}  {por_dia[dia]:>3}  {barra(por_dia[dia], tope)}")

    print()


if __name__ == "__main__":
    main()
