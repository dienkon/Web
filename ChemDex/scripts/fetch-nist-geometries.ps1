$ErrorActionPreference='Stop'
$species=@(@(962,'7732185'),@(222,'7664417'),@(297,'74828'),@(280,'124389'))
$geometries=@()
foreach($entry in $species){
 $url="https://cccbdb.nist.gov/expgeom2x.asp?casno=$($entry[1])&charge=0"
 $content=(Invoke-WebRequest $url -TimeoutSec 25).Content
 $pattern='(?is)<TR>\s*<TD>\s*([A-Z][a-z]?)(\d+)\s*<TD class="num">\s*(-?\d+\.\d+)\s*<TD class="num">\s*(-?\d+\.\d+)\s*<TD class="num">\s*(-?\d+\.\d+)'
 $coordinates=@([regex]::Matches($content,$pattern)|ForEach-Object{[ordered]@{element=$_.Groups[1].Value;label=$_.Groups[1].Value+$_.Groups[2].Value;x=[double]$_.Groups[3].Value;y=[double]$_.Groups[4].Value;z=[double]$_.Groups[5].Value}})
 if($coordinates.Count -lt 3){throw "No experimental coordinates for CID $($entry[0])"}
 $geometries += [ordered]@{cid=$entry[0];source=$url;provenance='NIST CCCBDB SRD 101, experimental gas-phase Cartesian coordinates';retrievedAt=(Get-Date -Format 'yyyy-MM-dd');atoms=$coordinates}
 Write-Host "NIST CID $($entry[0]): $($coordinates.Count) atoms"
 Start-Sleep -Milliseconds 500
}
$geometries|ConvertTo-Json -Depth 6|Set-Content -Encoding utf8 (Join-Path $PSScriptRoot '../shared/nist-geometries.json')
