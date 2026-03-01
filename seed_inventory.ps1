$ErrorActionPreference = 'Stop'

# Configuración
$ApiBase = 'http://localhost:5000/api'
$AdminEmail = 'admin@empresa.com'
$AdminPassword = 'admin123'
$DefaultUbicacion = 'SOPORTE TECNICO'

# Códigos para herramientas (deben ser ÚNICOS)
$ToolCodePrefix = 'TOOL'
$ToolCodeStart = 1

function Get-AuthToken {
  param(
    [string]$Base,
    [string]$Email,
    [string]$Password
  )

  $body = @{ email = $Email; password = $Password } | ConvertTo-Json
  $res = Invoke-RestMethod -Uri "$Base/auth/login" -Method POST -ContentType 'application/json' -Body $body
  return $res.token
}

function Invoke-Api {
  param(
    [string]$Method,
    [string]$Url,
    [string]$Token,
    [object]$Body = $null
  )

  $headers = @{ Authorization = "Bearer $Token" }
  if ($null -eq $Body) {
    return Invoke-RestMethod -Uri $Url -Method $Method -Headers $headers
  }

  $json = $Body | ConvertTo-Json -Depth 10
  return Invoke-RestMethod -Uri $Url -Method $Method -Headers $headers -ContentType 'application/json' -Body $json
}

function Get-UnidadAndCantidad {
  param(
    [string]$Raw
  )

  $s = $Raw.Trim().ToLowerInvariant()

  if ($s -match '^(\d+)\s*m$') {
    return @{ unidad = 'metro'; cantidad = [int]$Matches[1] }
  }
  if ($s -match '^(\d+)\s*rollos?$') {
    return @{ unidad = 'rollo'; cantidad = [int]$Matches[1] }
  }
  if ($s -match '^(\d+)\s*paquetes?$') {
    return @{ unidad = 'paquete'; cantidad = [int]$Matches[1] }
  }
  if ($s -match '^(\d+)\s*pz$') {
    return @{ unidad = 'pieza'; cantidad = [int]$Matches[1] }
  }
  if ($s -match '^(\d+)\s*pzas$') {
    return @{ unidad = 'pieza'; cantidad = [int]$Matches[1] }
  }

  throw "Formato de cantidad no reconocido: '$Raw'"
}

# Consumibles: se insertan como 1 registro por producto (stock_actual = cantidad)
$Consumibles = @(
  # ADAPTADORES Y CABLES
  @{ nombre = 'Adaptador DisplayPort macho a VGA hembra'; categoria = 'Adaptadores y cables'; cantidad = '10 pz' },
  @{ nombre = 'Cable HDMI'; categoria = 'Adaptadores y cables'; cantidad = '5 pz' },
  @{ nombre = 'Cable HDMI macho a VGA hembra'; categoria = 'Adaptadores y cables'; cantidad = '10 pz' },
  @{ nombre = 'Patch cord 0.3 m ultradelgado CAT 6'; categoria = 'Adaptadores y cables'; cantidad = '60 pz' },
  @{ nombre = 'Patch cord 0.9 m CAT 6'; categoria = 'Adaptadores y cables'; cantidad = '100 pz' },
  @{ nombre = 'Patch cord 2.1 m CAT 6'; categoria = 'Adaptadores y cables'; cantidad = '100 pz' },
  @{ nombre = 'Patch cord 2.1 m ultradelgado CAT 6'; categoria = 'Adaptadores y cables'; cantidad = '30 pz' },

  # REDES Y CONECTIVIDAD
  @{ nombre = 'Jacks categoría 6 minicom'; categoria = 'Redes y conectividad'; cantidad = '500 pz' },
  @{ nombre = 'Grapa para cable UTP CAT 6'; categoria = 'Redes y conectividad'; cantidad = '400 pz' },
  @{ nombre = 'Insertos ciegos blancos'; categoria = 'Redes y conectividad'; cantidad = '100 pz' },
  @{ nombre = 'Insertos ciegos negros'; categoria = 'Redes y conectividad'; cantidad = '100 pz' },
  @{ nombre = 'Caja de sobreponer universal'; categoria = 'Redes y conectividad'; cantidad = '100 pz' },
  @{ nombre = 'Tramos de canaleta LD10 (1.82 m)'; categoria = 'Redes y conectividad'; cantidad = '150 pz' },
  @{ nombre = 'Tramos de canaleta LDS (1.82 m)'; categoria = 'Redes y conectividad'; cantidad = '200 pz' },
  @{ nombre = 'Velcro continuo autoadherible 3/4" negro'; categoria = 'Redes y conectividad'; cantidad = '100 m' },

  # BROCAS Y FIJACIÓN
  @{ nombre = 'Broca para concreto 1/4"'; categoria = 'Brocas y fijación'; cantidad = '10 pz' },
  @{ nombre = 'Broca SDS 1/4" (6 pulgadas)'; categoria = 'Brocas y fijación'; cantidad = '1 pz' },
  @{ nombre = 'Brocas SDS 3/8" (mínimo 15")'; categoria = 'Brocas y fijación'; cantidad = '1 pz' },
  @{ nombre = 'Brocas SDS 1/2" (mínimo 15")'; categoria = 'Brocas y fijación'; cantidad = '1 pz' },
  @{ nombre = 'Brocas SDS cincel plano'; categoria = 'Brocas y fijación'; cantidad = '3 pz' },
  @{ nombre = 'Taquetes 1/4"'; categoria = 'Brocas y fijación'; cantidad = '500 pz' },
  @{ nombre = 'Taquetes para tablaroca'; categoria = 'Brocas y fijación'; cantidad = '500 pz' },
  @{ nombre = 'Pijas 1 1/2"'; categoria = 'Brocas y fijación'; cantidad = '150 pz' },
  @{ nombre = 'Pijas No. 8 de 1 1/4"'; categoria = 'Brocas y fijación'; cantidad = '500 pz' },

  # LIMPIEZA Y MANTENIMIENTO
  @{ nombre = 'Aire comprimido 330 ml'; categoria = 'Limpieza y mantenimiento'; cantidad = '25 pz' },
  @{ nombre = 'Espuma limpiadora 432 ml'; categoria = 'Limpieza y mantenimiento'; cantidad = '30 pz' },
  @{ nombre = 'Limpiador de equipo electrónico 250 ml'; categoria = 'Limpieza y mantenimiento'; cantidad = '40 pz' },
  @{ nombre = 'Limpiador dieléctrico de circuitos 454 ml'; categoria = 'Limpieza y mantenimiento'; cantidad = '40 pz' },
  @{ nombre = 'Líquido limpiador de pantalla'; categoria = 'Limpieza y mantenimiento'; cantidad = '30 pz' },
  @{ nombre = 'Lubricante y limpiador electrónico (lata 17 ml)'; categoria = 'Limpieza y mantenimiento'; cantidad = '25 pz' },
  @{ nombre = 'Paño de microfibra 40 × 40 cm'; categoria = 'Limpieza y mantenimiento'; cantidad = '30 pz' },
  @{ nombre = 'Franela de algodón gris'; categoria = 'Limpieza y mantenimiento'; cantidad = '15 m' },
  @{ nombre = 'Toalla azul multiusos'; categoria = 'Limpieza y mantenimiento'; cantidad = '40 pz' },

  # ELECTRÓNICA Y SOLDADURA
  @{ nombre = 'Estación de soldadura'; categoria = 'Electrónica y soldadura'; cantidad = '2 pz' },
  @{ nombre = 'Soldadura para equipo electrónico (450 g)'; categoria = 'Electrónica y soldadura'; cantidad = '10 rollos' },
  @{ nombre = 'Pasta para equipo electrónico (100 g)'; categoria = 'Electrónica y soldadura'; cantidad = '15 pz' },

  # ENERGÍA Y BATERÍAS
  @{ nombre = 'Batería de 9V'; categoria = 'Energía y baterías'; cantidad = '25 pz' },
  @{ nombre = 'Batería para no break 12V / 5Ah / 20HR (SBNB50 compatible)'; categoria = 'Energía y baterías'; cantidad = '100 pz' },
  @{ nombre = 'Pilas CR2032 (paquete c/2)'; categoria = 'Energía y baterías'; cantidad = '40 paquetes' },

  # SEGURIDAD Y PROTECCIÓN
  @{ nombre = 'Guantes de nitrilo industriales negros talla L (sin talco)'; categoria = 'Seguridad y protección'; cantidad = '2 paquetes' },
  @{ nombre = 'Pulsera antiestática'; categoria = 'Seguridad y protección'; cantidad = '10 pz' },
  @{ nombre = 'Spray antiestático para ropa'; categoria = 'Seguridad y protección'; cantidad = '24 pz' },
  @{ nombre = 'Respirador desechable N95'; categoria = 'Seguridad y protección'; cantidad = '60 pz' },

  # OTROS
  @{ nombre = 'Charola para montaje en pared modelo NOTH051'; categoria = 'Otros'; cantidad = '20 pz' },
  @{ nombre = 'Charola para rack 19" × 10"'; categoria = 'Otros'; cantidad = '10 pz' },
  @{ nombre = 'Cinta aislante'; categoria = 'Otros'; cantidad = '10 pz' },
  @{ nombre = 'Cinta para ducto gris'; categoria = 'Otros'; cantidad = '10 pz' },
  @{ nombre = 'Cinta doble cara (8.89 m)'; categoria = 'Otros'; cantidad = '10 pz' },
  @{ nombre = 'Brocha antiestática 1.5"'; categoria = 'Otros'; cantidad = '15 pz' },
  @{ nombre = 'Brocha antiestática 2"'; categoria = 'Otros'; cantidad = '15 pz' },
  @{ nombre = 'Punta de cruz imantada No. 2 para taladro'; categoria = 'Otros'; cantidad = '15 pz' }
)

# Herramientas: se insertan como N registros individuales (una por pieza)
$Herramientas = @(
  @{ nombre = 'Desarmador de cruz'; categoria = 'Herramientas'; cantidad = 5 },
  @{ nombre = 'Desarmador plano'; categoria = 'Herramientas'; cantidad = 5 },
  @{ nombre = 'Juego de desarmadores para reparación de laptop'; categoria = 'Herramientas'; cantidad = 3 },
  @{ nombre = 'Juego de herramientas para pantalla'; categoria = 'Herramientas'; cantidad = 5 },
  @{ nombre = 'Juego de puntas para destornillador de impacto (40 pzas)'; categoria = 'Herramientas'; cantidad = 1 },
  @{ nombre = 'Desarmadores tipo matraca con punteo'; categoria = 'Herramientas'; cantidad = 6 },
  @{ nombre = 'Matraca con juego de dados de acero al carbono'; categoria = 'Herramientas'; cantidad = 6 },
  @{ nombre = 'Pinzas de corte de uso rudo'; categoria = 'Herramientas'; cantidad = 1 },
  @{ nombre = 'Pinzas peladoras de cable profesionales'; categoria = 'Herramientas'; cantidad = 10 },
  @{ nombre = 'Pinzas de corte de precisión'; categoria = 'Herramientas'; cantidad = 12 },
  @{ nombre = 'Pinza ponchadora RJ45, RJ12 y RG11'; categoria = 'Herramientas'; cantidad = 10 },
  @{ nombre = 'Navaja multiusos plegable'; categoria = 'Herramientas'; cantidad = 10 },
  @{ nombre = 'Nivel láser de 4 líneas'; categoria = 'Herramientas'; cantidad = 1 },
  @{ nombre = 'Multímetro'; categoria = 'Herramientas'; cantidad = 1 },
  @{ nombre = 'Microscopio digital'; categoria = 'Herramientas'; cantidad = 2 }
)

$token = Get-AuthToken -Base $ApiBase -Email $AdminEmail -Password $AdminPassword

Write-Host "Token OK. Insertando consumibles..."
$consOk = 0
$consFail = 0
foreach ($c in $Consumibles) {
  try {
    $u = Get-UnidadAndCantidad -Raw $c.cantidad
    $payload = @{
      nombre = $c.nombre
      descripcion = ''
      categoria = $c.categoria
      unidad = $u.unidad
      stock_actual = $u.cantidad
      stock_minimo = $u.cantidad
      ubicacion = $DefaultUbicacion
      activo = $true
    }

    Invoke-Api -Method POST -Url "$ApiBase/consumibles" -Token $token -Body $payload | Out-Null
    $consOk++
  } catch {
    $consFail++
    Write-Host "[Consumible ERROR] $($c.nombre) -> $($_.Exception.Message)" -ForegroundColor Red
  }
}
Write-Host "Consumibles insertados OK: $consOk | Fallidos: $consFail"

Write-Host "Insertando herramientas..."
$toolOk = 0
$toolFail = 0
$code = $ToolCodeStart

foreach ($h in $Herramientas) {
  for ($i = 1; $i -le [int]$h.cantidad; $i++) {
    $created = $false
    $tries = 0
    while (-not $created -and $tries -lt 20) {
      $tries++
      $toolCode = "{0}-{1}" -f $ToolCodePrefix, $code.ToString('0000')
      $code++

      try {
        $payload = @{
          nombre = $h.nombre
          descripcion = ''
          codigo = $toolCode
          categoria = $h.categoria
          estado = 'disponible'
          ubicacion = $DefaultUbicacion
          activo = $true
        }
        Invoke-Api -Method POST -Url "$ApiBase/herramientas" -Token $token -Body $payload | Out-Null
        $toolOk++
        $created = $true
      } catch {
        # Si el código ya existe, reintentar con otro
        $msg = $_.Exception.Message
        if ($msg -match 'c[oó]digo') {
          continue
        }
        $toolFail++
        Write-Host "[Herramienta ERROR] $($h.nombre) ($toolCode) -> $msg" -ForegroundColor Red
        $created = $true
      }
    }
  }
}

Write-Host "Herramientas insertadas OK: $toolOk | Fallidas: $toolFail"
Write-Host 'Listo.'
