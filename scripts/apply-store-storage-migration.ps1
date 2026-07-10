# Aplica únicamente la migración Storage de productos de tienda en Supabase producción.
# Project-ref: vfmzabiyqmsnlpesfman (Australe Producciones)
# No imprime secretos. Limpia credenciales temporales al finalizar.
$ErrorActionPreference = 'Stop'
$ProjectRef = 'vfmzabiyqmsnlpesfman'
$MigrationName = '20260710170300_store_products_storage.sql'
$RepoRoot = Split-Path $PSScriptRoot -Parent

function Clear-SensitiveEnv {
  foreach ($name in @('SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'SUPABASE_DB_URL')) {
    [Environment]::SetEnvironmentVariable($name, $null, 'Process')
  }
}

function Read-Secret([string]$Prompt) {
  $secure = Read-Host $Prompt -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
}

try {
  . (Join-Path $PSScriptRoot 'load-env-local.ps1')

  $dbPassword = [Environment]::GetEnvironmentVariable('SUPABASE_DB_PASSWORD', 'Process')
  if (-not $dbPassword) {
    Write-Host 'Ingresá la contraseña de Postgres del proyecto Australe (no se mostrará ni se guardará).'
    $dbPassword = Read-Secret 'SUPABASE_DB_PASSWORD'
    [Environment]::SetEnvironmentVariable('SUPABASE_DB_PASSWORD', $dbPassword, 'Process')
  }

  $accessToken = [Environment]::GetEnvironmentVariable('SUPABASE_ACCESS_TOKEN', 'Process')
  if (-not $accessToken) {
    Write-Host 'Opcional: Personal Access Token de Supabase (sbp_...) para verificar proyecto. Enter para omitir y usar solo DB URL.'
    $secureToken = Read-Host 'SUPABASE_ACCESS_TOKEN (opcional)' -AsSecureString
    if ($secureToken.Length -gt 0) {
      $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
      try {
        $accessToken = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
        [Environment]::SetEnvironmentVariable('SUPABASE_ACCESS_TOKEN', $accessToken, 'Process')
      } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
      }
    }
  }

  if ($accessToken) {
    if ($accessToken -notmatch '^sbp_') {
      throw 'SUPABASE_ACCESS_TOKEN debe comenzar con sbp_'
    }
    Write-Host 'Verificando acceso al proyecto Australe...'
    $json = npx supabase --agent no --output-format json projects list 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'projects list falló' }
    $parsed = $json | ConvertFrom-Json
    $australe = @($parsed.projects) | Where-Object { $_.ref -eq $ProjectRef }
    if (-not $australe) {
      throw "El token no tiene acceso a $ProjectRef"
    }
    Write-Host "Proyecto OK: $($australe.name)"
  } else {
    Write-Host "Continuando con DB URL directa (project-ref $ProjectRef)."
  }

  $encodedPassword = [Uri]::EscapeDataString($dbPassword)

  $poolerFile = Join-Path $RepoRoot 'supabase\.temp\pooler-url'
  if (Test-Path $poolerFile) {
    $poolerBase = (Get-Content $poolerFile -Raw).Trim()
    if ($poolerBase -match '^(postgresql://)([^:@]+)@(.+)$') {
      $dbUrl = "$($matches[1])$($matches[2]):$encodedPassword@$($matches[3])"
    } else {
      $dbUrl = "postgresql://postgres.${ProjectRef}:${encodedPassword}@db.${ProjectRef}.supabase.co:5432/postgres"
    }
  } else {
    $dbUrl = "postgresql://postgres.${ProjectRef}:${encodedPassword}@db.${ProjectRef}.supabase.co:5432/postgres"
  }

  Set-Location $RepoRoot

  Write-Host 'Dry-run de migraciones pendientes:'
  npx supabase --agent no --output-format text db push --db-url $dbUrl --dry-run
  if ($LASTEXITCODE -ne 0) { throw 'dry-run falló' }

  $dryOutput = npx supabase --agent no --output-format text db push --db-url $dbUrl --dry-run 2>&1 | Out-String
  if ($dryOutput -match '2026071017' -and $dryOutput -notmatch [regex]::Escape($MigrationName)) {
    Write-Warning 'Hay migraciones pendientes además de storage. Revisá antes de continuar.'
    $confirm = Read-Host '¿Aplicar igualmente todas las pendientes? (s/N)'
    if ($confirm -ne 's') { throw 'Cancelado por el operador.' }
  }

  Write-Host 'Aplicando migración Storage...'
  npx supabase --agent no --output-format text db push --db-url $dbUrl --yes
  if ($LASTEXITCODE -ne 0) { throw 'db push falló' }

  Write-Host 'Validando store remoto...'
  node scripts/validate-store-remote.mjs
  if ($LASTEXITCODE -ne 0) { throw 'validate-store-remote falló' }

  Write-Host 'Validando storage...'
  node scripts/validate-store-storage.mjs
  if ($LASTEXITCODE -ne 0) { throw 'validate-store-storage falló' }

  Write-Host 'STORAGE_MIGRATION_OK'
} finally {
  Clear-SensitiveEnv
}
