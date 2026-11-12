$ErrorActionPreference = 'Stop'
Push-Location (Join-Path $PSScriptRoot '..')
try {
  & node scripts/fetch-nist-geometries.mjs @args
  if ($LASTEXITCODE -ne 0) { throw 'NIST import failed; inspect the validation error above.' }
} finally { Pop-Location }
