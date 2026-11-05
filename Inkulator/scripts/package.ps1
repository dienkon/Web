$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$distRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot 'dist'))
$productRoot = [IO.Path]::GetFullPath((Join-Path $distRoot 'SCRBLE-MATH-STUDIO'))
if (-not $productRoot.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Package target is outside the project.' }
if (Test-Path -LiteralPath $productRoot) { Remove-Item -LiteralPath $productRoot -Recurse -Force }
New-Item -ItemType Directory -Path $productRoot -Force | Out-Null
foreach ($name in @('index.html','README.md','package.json','package-lock.json','css','js','assets','vendor','tests','scripts','examples','docs')) {
  $sourcePath = Join-Path $projectRoot $name
  if (Test-Path -LiteralPath $sourcePath) { Copy-Item -LiteralPath $sourcePath -Destination $productRoot -Recurse }
}
$zipPath = Join-Path $distRoot 'SCRBLE-MATH-STUDIO.zip'
Compress-Archive -Path (Join-Path $distRoot 'SCRBLE-MATH-STUDIO') -DestinationPath $zipPath -Force
Write-Output $productRoot
Write-Output $zipPath
