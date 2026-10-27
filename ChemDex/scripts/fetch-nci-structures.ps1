$ErrorActionPreference = 'Stop'
$records = Get-Content (Join-Path $PSScriptRoot '../shared/compound-seeds.json') -Raw | ConvertFrom-Json
$destination = Join-Path $PSScriptRoot '../shared/structures'
New-Item -ItemType Directory -Force -Path $destination | Out-Null
$downloaded = @()
foreach ($record in $records) {
 $file = Join-Path $destination "$($record.cid).sdf"
 $resolver = switch ($record.cid) {947 {'dinitrogen'} 977 {'dioxygen'} 783 {'dihydrogen'} 281 {'[C-]#[O+]'} default {$record.name_en}}
 $identifier = [uri]::EscapeDataString($resolver)
 $url = "https://cactus.nci.nih.gov/chemical/structure/$identifier/file?format=sdf&get3d=true"
 try {
  $content = if ((Test-Path $file) -and ((Get-Content $file -Raw) -match 'M  END')) {Get-Content $file -Raw} else {(Invoke-WebRequest $url -TimeoutSec 25).Content}
  if ($content -notmatch 'V2000' -or $content -notmatch 'M  END' -or $content -match '<html') {throw 'Invalid SDF response'}
  $content | Set-Content -Encoding utf8 $file
  $record | Add-Member -NotePropertyName structure -NotePropertyValue ([ordered]@{format='sdf';url="/shared/structures/$($record.cid).sdf";dimension='3d';provenance='NCI/CADD CACTVS computed coordinates';retrievedAt=(Get-Date -Format 'yyyy-MM-dd');source=$url}) -Force
  $downloaded += $record
  $downloaded | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 (Join-Path $PSScriptRoot '../shared/compounds.json')
  Write-Host "Downloaded $($record.cid): $($record.name_en)"
 } catch {Write-Host "Unavailable $($record.cid): $($_.Exception.Message)"}
 Start-Sleep -Milliseconds 700
}
Write-Host "Downloaded $($downloaded.Count) structures"
