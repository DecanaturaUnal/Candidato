"""
Piezas compartidas por las utilidades de operación.

Todas hablan con Supabase a través de su API REST usando la llave de servicio.
Esa llave se salta las políticas de RLS, así que estos scripts se ejecutan en el
equipo del responsable de la campaña, nunca en un servidor público ni en el
navegador de nadie.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv

# Raíz del proyecto: scripts/python/_comun.py -> scripts/python -> scripts -> raíz
RAIZ = Path(__file__).resolve().parents[2]
CARPETA_SALIDA = RAIZ / "scripts" / "salida"


def preparar_consola() -> None:
    """Evita que la consola de Windows rompa con las tildes."""
    for flujo in (sys.stdout, sys.stderr):
        try:
            flujo.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass


def cargar_entorno() -> tuple[str, str]:
    """
    Lee las credenciales de `.env.local`.

    Devuelve (url, llave_de_servicio) y aborta con un mensaje claro si falta algo,
    que es el error más habitual al usar estos scripts por primera vez.
    """
    load_dotenv(RAIZ / ".env.local")

    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    llave = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not llave:
        print(
            "Faltan credenciales.\n"
            f"  Revise que {RAIZ / '.env.local'} exista y contenga:\n"
            "    NEXT_PUBLIC_SUPABASE_URL\n"
            "    SUPABASE_SERVICE_ROLE_KEY\n"
            "  Puede copiarlo de .env.example.",
            file=sys.stderr,
        )
        raise SystemExit(1)

    return url.rstrip("/"), llave


def descargar_comentarios(url: str, llave: str) -> list[dict]:
    """
    Trae todos los comentarios, paginando.

    PostgREST limita cuántas filas devuelve por petición, así que se pide de mil
    en mil hasta que deja de haber datos: con un tope fijo se perderían mensajes
    en silencio cuando la campaña crezca.
    """
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
                f"{url}/rest/v1/comentarios",
                params={"select": "*", "order": "created_at.desc"},
                headers={**cabeceras, "Range": f"{desde}-{desde + tamano - 1}"},
            )
            respuesta.raise_for_status()
            lote = respuesta.json()
            filas.extend(lote)

            if len(lote) < tamano:
                break
            desde += tamano

    return filas


def carpeta_de_salida() -> Path:
    """Crea (si hace falta) y devuelve la carpeta donde se dejan los archivos."""
    CARPETA_SALIDA.mkdir(parents=True, exist_ok=True)
    return CARPETA_SALIDA


def texto_seguro_para_hoja(valor) -> str:
    """
    Prepara un texto para una celda de hoja de cálculo.

    El prefijo con comilla simple cuando empieza por = + - @ evita la inyección de
    fórmulas: sin él, un mensaje que empiece por «=» se ejecutaría como fórmula al
    abrir el archivo.
    """
    if valor is None:
        return ""
    texto = str(valor)
    if texto[:1] in ("=", "+", "-", "@"):
        return "'" + texto
    return texto
