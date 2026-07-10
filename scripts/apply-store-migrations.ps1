# Aplica migraciones store en Supabase remoto usando credenciales de .env.local
# Requiere en .env.local (gitignored):
#   SUPABASE_ACCESS_TOKEN=sbp_...
#   SUPABASE_DB_PASSWORD=...
$ErrorActionPreference = 'Stop'
$ProjectRef = 'vfmzabiyqmsnlpesfman'
$RepoRoot = Split-Path $PSScriptRoot -Parent

function Clear-SensitiveEnv {
  foreach ($name in @('SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'SUPABASE_DB_URL')) {
    [Environment]::SetEnvironmentVariable($name, $null, 'Process')
  }
}

try {
  . (Join-Path $PSScriptRoot 'load-env-local.ps1')

  function Require-Env([string]$Name) {
    $val = [Environment]::GetEnvironmentVariable($Name, 'Process')
    if (-not $val) {
      throw "Falta $Name en .env.local"
    }
    if ($Name -eq 'SUPABASE_ACCESS_TOKEN' -and $val -notmatch '^sbp_') {
      throw 'SUPABASE_ACCESS_TOKEN debe comenzar con sbp_ (Personal Access Token de Supabase)'
    }
  }

  Set-Location $RepoRoot
  Require-Env 'SUPABASE_ACCESS_TOKEN'
  Require-Env 'SUPABASE_DB_PASSWORD'

  Write-Host 'Verificando proyectos...'
  $json = npx supabase --agent no --output-format json projects list 2>&1
  if ($LASTEXITCODE -ne 0) { throw "projects list falló" }
  $parsed = $json | ConvertFrom-Json
  $australe = @($parsed.projects) | Where-Object { $_.ref -eq $ProjectRef }
  if (-not $australe) {
    throw "El token no tiene acceso a $ProjectRef"
  }
  Write-Host "Proyecto OK: $($australe.name)"

  Write-Host 'Vinculando...'
  npx supabase --agent no --output-format text link --project-ref $ProjectRef
  if ($LASTEXITCODE -ne 0) { throw 'link falló' }

  Write-Host 'Migraciones pendientes:'
  npx supabase --agent no --output-format text migration list --linked

  Write-Host 'Dry-run:'
  npx supabase --agent no --output-format text db push --linked --dry-run

  Write-Host 'Aplicando migraciones...'
  npx supabase --agent no --output-format text db push --linked --yes
  if ($LASTEXITCODE -ne 0) { throw 'db push falló' }

  Write-Host 'Validando remoto...'
  node scripts/validate-store-remote.mjs
  if ($LASTEXITCODE -ne 0) { throw 'validate-store-remote falló' }

  Write-Host 'MIGRACIONES_STORE_OK'
} finally {
  Clear-SensitiveEnv
}
