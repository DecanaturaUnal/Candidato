"""
Respaldo completo de los datos del muro.

Guarda comentarios, «me gusta» y moderadores en un único archivo JSON con fecha.
Está pensado para correrlo periódicamente: si algo se borra por error en el panel
o en Supabase, aquí queda la copia.

El archivo contiene los correos electrónicos de quienes escribieron, así que es un
dato personal: guárdelo en un lugar controlado y no lo comparta.

Uso (con el entorno virtual activado):
    python scripts/python/respaldo.py
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

import httpx

from _comun import (
    cargar_entorno,
    carpeta_de_salida,
    descargar_comentarios,
    preparar_consola,
)


def descargar_tabla(url: str, llave: str, tabla: str) -> list[dict]:
    """Trae una tabla completa por la API REST."""
    cabeceras = {
        "apikey": llave,
        "Authorization": f"Bearer {llave}",
        "Accept": "application/json",
    }
    filas: list[dict] = []
    tamano = 1000
    desde = 0

    with httpx.Client(timeout=60.0) as cliente:
        while True:
            respuesta = cliente.get(
                f"{url}/rest/v1/{tabla}",
                params={"select": "*"},
                headers={**cabeceras, "Range": f"{desde}-{desde + tamano - 1}"},
            )
            respuesta.raise_for_status()
            lote = respuesta.json()
            filas.extend(lote)
            if len(lote) < tamano:
                break
            desde += tamano

    return filas


def main() -> None:
    preparar_consola()
    url, llave = cargar_entorno()

    print("Descargando datos…")
    datos = {
        "generado_en": datetime.now(timezone.utc).isoformat(),
        "origen": url,
        "comentarios": descargar_comentarios(url, llave),
        "likes": descargar_tabla(url, llave, "likes"),
        "admins": descargar_tabla(url, llave, "admins"),
    }

    for tabla in ("comentarios", "likes", "admins"):
        print(f"  {tabla}: {len(datos[tabla])} filas")

    marca = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d_%H%M")
    destino = carpeta_de_salida() / f"respaldo_{marca}.json"

    with destino.open("w", encoding="utf-8") as archivo:
        json.dump(datos, archivo, ensure_ascii=False, indent=2)

    tamano_kb = destino.stat().st_size / 1024
    print(f"\nListo: {destino}  ({tamano_kb:.1f} KB)")
    print(
        "AVISO: este archivo contiene correos electrónicos. Guárdelo en un lugar\n"
        "       controlado y no lo comparta."
    )


if __name__ == "__main__":
    main()
