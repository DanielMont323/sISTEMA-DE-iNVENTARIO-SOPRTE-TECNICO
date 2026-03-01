$ErrorActionPreference = 'Stop'

# Configuración
$ApiBase = 'http://localhost:5000/api'
$AdminEmail = 'admin@empresa.com'
$AdminPassword = 'admin123'
$DefaultUbicacion = 'SOPORTE TECNICO'

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

function Post-ToolWithRetry {
  param(
    [string]$Token,
    [object]$Payload,
    [int]$MaxRetries = 10
  )

  $attempt = 0
  $delaySeconds = 2

  while ($true) {
    try {
      Invoke-Api -Method POST -Url "$ApiBase/herramientas" -Token $Token -Body $Payload | Out-Null
      return @{ ok = $true; message = 'created' }
    } catch {
      $attempt++

      $err = $_
      $resp = $err.Exception.Response
      $statusCode = $null
      try {
        if ($resp -and $resp.StatusCode) { $statusCode = [int]$resp.StatusCode }
      } catch { }

      # Si el código ya existe, lo damos por OK.
      if ($err.Exception.Message -match 'c[oó]digo' -or $err.Exception.Message -match 'already exists') {
        return @{ ok = $true; message = 'duplicate-code' }
      }

      if ($statusCode -eq 429 -and $attempt -le $MaxRetries) {
        Write-Host "429 Too Many Requests. Reintentando en $delaySeconds s... (intento $attempt/$MaxRetries)" -ForegroundColor Yellow
        Start-Sleep -Seconds $delaySeconds
        $delaySeconds = [Math]::Min($delaySeconds * 2, 30)
        continue
      }

      return @{ ok = $false; message = $err.Exception.Message }
    }
  }
}

# Lista exacta de herramientas que fallaron por 429 en la corrida anterior
$RemainingTools = @(
  # Pinzas de corte de precisión (TOOL-0049 a TOOL-0054)
  @{ nombre = 'Pinzas de corte de precisión'; codigo = 'TOOL-0049' },
  @{ nombre = 'Pinzas de corte de precisión'; codigo = 'TOOL-0050' },
  @{ nombre = 'Pinzas de corte de precisión'; codigo = 'TOOL-0051' },
  @{ nombre = 'Pinzas de corte de precisión'; codigo = 'TOOL-0052' },
  @{ nombre = 'Pinzas de corte de precisión'; codigo = 'TOOL-0053' },
  @{ nombre = 'Pinzas de corte de precisión'; codigo = 'TOOL-0054' },

  # Pinza ponchadora RJ45, RJ12 y RG11 (TOOL-0055 a TOOL-0064)
  @{ nombre = 'Pinza ponchadora RJ45, RJ12 y RG11'; codigo = 'TOOL-0055' },
  @{ nombre = 'Pinza ponchadora RJ45, RJ12 y RG11'; codigo = 'TOOL-0056' },
  @{ nombre = 'Pinza ponchadora RJ45, RJ12 y RG11'; codigo = 'TOOL-0057' },
  @{ nombre = 'Pinza ponchadora RJ45, RJ12 y RG11'; codigo = 'TOOL-0058' },
  @{ nombre = 'Pinza ponchadora RJ45, RJ12 y RG11'; codigo = 'TOOL-0059' },
  @{ nombre = 'Pinza ponchadora RJ45, RJ12 y RG11'; codigo = 'TOOL-0060' },
  @{ nombre = 'Pinza ponchadora RJ45, RJ12 y RG11'; codigo = 'TOOL-0061' },
  @{ nombre = 'Pinza ponchadora RJ45, RJ12 y RG11'; codigo = 'TOOL-0062' },
  @{ nombre = 'Pinza ponchadora RJ45, RJ12 y RG11'; codigo = 'TOOL-0063' },
  @{ nombre = 'Pinza ponchadora RJ45, RJ12 y RG11'; codigo = 'TOOL-0064' },

  # Navaja multiusos plegable (TOOL-0065 a TOOL-0074)
  @{ nombre = 'Navaja multiusos plegable'; codigo = 'TOOL-0065' },
  @{ nombre = 'Navaja multiusos plegable'; codigo = 'TOOL-0066' },
  @{ nombre = 'Navaja multiusos plegable'; codigo = 'TOOL-0067' },
  @{ nombre = 'Navaja multiusos plegable'; codigo = 'TOOL-0068' },
  @{ nombre = 'Navaja multiusos plegable'; codigo = 'TOOL-0069' },
  @{ nombre = 'Navaja multiusos plegable'; codigo = 'TOOL-0070' },
  @{ nombre = 'Navaja multiusos plegable'; codigo = 'TOOL-0071' },
  @{ nombre = 'Navaja multiusos plegable'; codigo = 'TOOL-0072' },
  @{ nombre = 'Navaja multiusos plegable'; codigo = 'TOOL-0073' },
  @{ nombre = 'Navaja multiusos plegable'; codigo = 'TOOL-0074' },

  # Resto
  @{ nombre = 'Nivel láser de 4 líneas'; codigo = 'TOOL-0075' },
  @{ nombre = 'Multímetro'; codigo = 'TOOL-0076' },
  @{ nombre = 'Microscopio digital'; codigo = 'TOOL-0077' },
  @{ nombre = 'Microscopio digital'; codigo = 'TOOL-0078' }
)

$token = Get-AuthToken -Base $ApiBase -Email $AdminEmail -Password $AdminPassword

Write-Host "Token OK. Insertando herramientas faltantes con throttling..."

$ok = 0
$fail = 0
foreach ($t in $RemainingTools) {
  $payload = @{
    nombre = $t.nombre
    descripcion = ''
    codigo = $t.codigo
    categoria = 'Herramientas'
    estado = 'disponible'
    ubicacion = $DefaultUbicacion
    activo = $true
  }

  $result = Post-ToolWithRetry -Token $token -Payload $payload
  if ($result.ok) {
    $ok++
  } else {
    $fail++
    Write-Host "[ERROR] $($t.nombre) ($($t.codigo)) -> $($result.message)" -ForegroundColor Red
  }

  # Throttle para evitar rate limit
  Start-Sleep -Milliseconds 350
}

Write-Host "Herramientas faltantes insertadas OK: $ok | Fallidas: $fail"
Write-Host 'Listo.'
