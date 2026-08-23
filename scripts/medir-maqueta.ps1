<#
    Mide un conjunto fijo de referencias geometricas sobre una imagen de la portada.

    Sirve para comparar la pagina renderizada contra el mockup aprobado: se ejecuta
    sobre las dos imagenes y se contrastan las salidas linea por linea.

    Uso:  powershell -File scripts\medir-maqueta.ps1 -Ruta ruta\a\imagen.png
#>
param(
    [Parameter(Mandatory = $true)][string]$Ruta
)

Add-Type -AssemblyName System.Drawing

$imagen = New-Object System.Drawing.Bitmap($Ruta)
$anchoImg = $imagen.Width
$altoImg = $imagen.Height
$bloqueo = $imagen.LockBits(
    (New-Object System.Drawing.Rectangle(0, 0, $anchoImg, $altoImg)),
    [System.Drawing.Imaging.ImageLockMode]::ReadOnly,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$paso = $bloqueo.Stride
$datos = New-Object 'byte[]' ($paso * $altoImg)
[System.Runtime.InteropServices.Marshal]::Copy($bloqueo.Scan0, $datos, 0, $datos.Length)
$imagen.UnlockBits($bloqueo)
$imagen.Dispose()

# --- Clasificacion de color -------------------------------------------------
# 1 azul marino | 2 blanco | 3 turquesa | 0 cualquier otra cosa
function Clasificar([int]$x, [int]$y) {
    $i = $y * $paso + $x * 4
    $b = [int]$datos[$i]; $g = [int]$datos[$i + 1]; $r = [int]$datos[$i + 2]
    if ($r -lt 95 -and $g -lt 100 -and $b -gt 85 -and $b -lt 165) { return 1 }
    if ($r -gt 235 -and $g -gt 235 -and $b -gt 235) { return 2 }
    if ($r -lt 125 -and $g -gt 128 -and $b -gt 142) { return 3 }
    return 0
}

# Corridas de color a lo largo de una columna: da los limites de las bandas
function BandasVerticales([int]$x, [int]$y0, [int]$y1, [int]$minAlto) {
    $salida = @(); $previo = -1; $inicio = $y0
    for ($y = $y0; $y -le $y1; $y++) {
        $k = Clasificar $x $y
        if ($k -ne $previo) {
            if ($previo -ge 0 -and ($y - $inicio) -ge $minAlto) {
                $salida += ("{0}:{1}-{2}" -f $previo, $inicio, ($y - 1))
            }
            $previo = $k; $inicio = $y
        }
    }
    if (($y1 - $inicio) -ge $minAlto) { $salida += ("{0}:{1}-{2}" -f $previo, $inicio, $y1) }
    return ($salida -join "  ")
}

# Caja envolvente de los pixeles de un color dado dentro de una region
function CajaColor([int]$xa, [int]$xb, [int]$ya, [int]$yb, [int]$tipo) {
    $mnx = 999999; $mxx = -1; $mny = 999999; $mxy = -1
    for ($y = $ya; $y -le $yb; $y++) {
        $fila = $y * $paso
        for ($x = $xa; $x -le $xb; $x++) {
            $i = $fila + $x * 4
            $b = [int]$datos[$i]; $g = [int]$datos[$i + 1]; $r = [int]$datos[$i + 2]
            $ok = $false
            if ($tipo -eq 1) { $ok = ($r -lt 95 -and $g -lt 100 -and $b -gt 85 -and $b -lt 165) }
            elseif ($tipo -eq 2) { $ok = ($r -gt 235 -and $g -gt 235 -and $b -gt 235) }
            elseif ($tipo -eq 3) { $ok = ($r -lt 125 -and $g -gt 128 -and $b -gt 142) }
            else { $ok = -not ($r -gt 232 -and $g -gt 232 -and $b -gt 232) }
            if ($ok) {
                if ($x -lt $mnx) { $mnx = $x }; if ($x -gt $mxx) { $mxx = $x }
                if ($y -lt $mny) { $mny = $y }; if ($y -gt $mxy) { $mxy = $y }
            }
        }
    }
    if ($mxx -lt 0) { return "vacio" }
    return ("x {0}..{1} ({2})  y {3}..{4} ({5})" -f $mnx, $mxx, ($mxx - $mnx + 1), $mny, $mxy, ($mxy - $mny + 1))
}

# Cuenta renglones de texto por proyeccion de filas con contenido
function ContarLineas([int]$xa, [int]$xb, [int]$ya, [int]$yb) {
    $lineas = @(); $dentro = $false; $ini = 0
    for ($y = $ya; $y -le $yb; $y++) {
        $fila = $y * $paso; $n = 0
        for ($x = $xa; $x -le $xb; $x += 2) {
            $i = $fila + $x * 4
            if (-not ([int]$datos[$i] -gt 232 -and [int]$datos[$i + 1] -gt 232 -and [int]$datos[$i + 2] -gt 232)) { $n++ }
        }
        if ($n -ge 2 -and -not $dentro) { $dentro = $true; $ini = $y }
        elseif ($n -lt 2 -and $dentro) { $dentro = $false; $lineas += $ini }
    }
    if ($dentro) { $lineas += $ini }
    if ($lineas.Count -eq 0) { return "0 lineas" }
    $primera = $lineas[0]; $ultima = $lineas[$lineas.Count - 1]
    $pasoLinea = if ($lineas.Count -gt 1) { [math]::Round(($ultima - $primera) / ($lineas.Count - 1), 2) } else { 0 }
    return ("{0} lineas  primera y={1}  ultima y={2}  paso={3}" -f $lineas.Count, $primera, $ultima, $pasoLinea)
}

"IMAGEN                 : $Ruta  ($anchoImg x $altoImg)"
"bandas borde izquierdo : " + (BandasVerticales 8 0 ([math]::Min($altoImg - 1, 1599)) 6
)
"grilla 2x2             : " + (CajaColor 20 430 640 990 0)
"titulo Construir Futuro: " + (CajaColor 20 430 575 645 1)
"parrafo izquierdo      : " + (ContarLineas 30 420 980 1300)
"etiqueta 1 (azul)      : " + (CajaColor 435 890 645 695 1)
"etiqueta 1 (cola turq) : " + (CajaColor 560 890 645 695 3)
"etiqueta 2 (azul)      : " + (CajaColor 435 890 696 738 1)
"etiqueta 2 (cola turq) : " + (CajaColor 700 890 696 738 3)
"etiqueta 3 (azul)      : " + (CajaColor 435 890 739 782 1)
"etiqueta 3 (cola turq) : " + (CajaColor 670 890 739 782 3)
"parrafo derecho        : " + (ContarLineas 435 880 795 950)
"foto destacada         : " + (CajaColor 425 890 930 1310 0)
"lema del pie (blanco)  : " + (CajaColor 30 430 1330 1500 2)
"iconos sociales (turq) : " + (CajaColor 250 650 1480 1599 3)
