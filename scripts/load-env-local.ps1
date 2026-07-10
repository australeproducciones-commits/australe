# Carga variables de .env.local al proceso actual (sin imprimir valores).
param(
  [string]$EnvFile = (Join-Path (Join-Path $PSScriptRoot '..') '.env.local')
)

if (-not $EnvFile -or -not (Test-Path $EnvFile)) {
  return
}

Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -notmatch '^\s*([^#=]+)=(.*)$') { return }
  $name = $matches[1].Trim()
  $value = $matches[2].Trim()
  if (
    ($value.StartsWith('"') -and $value.EndsWith('"')) -or
    ($value.StartsWith("'") -and $value.EndsWith("'"))
  ) {
    $value = $value.Substring(1, $value.Length - 2)
  }
  Set-Item -Path "Env:$name" -Value $value
}
