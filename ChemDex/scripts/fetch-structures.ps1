$ErrorActionPreference = 'Stop'
$catalog = @(
 @(962,'Nước'),@(702,'Etanol'),@(887,'Metanol'),@(180,'Axeton'),@(176,'Axit axetic'),@(222,'Amoniac'),@(947,'Nitơ'),@(977,'Oxi'),@(783,'Hiđro'),@(280,'Cacbon đioxit'),@(281,'Cacbon monoxit'),@(297,'Metan'),@(6324,'Etan'),@(6325,'Eten'),@(6326,'Axetilen'),@(6334,'Propan'),@(8252,'Propen'),@(7843,'Butan'),@(6360,'Isobutan'),@(241,'Benzen'),@(1140,'Toluen'),@(996,'Phenol'),@(6115,'Anilin'),@(712,'Fomanđehit'),@(177,'Axetanđehit'),@(284,'Axit fomic'),@(885,'Etyl axetat'),@(178,'Axetamit'),@(1176,'Urê'),@(5793,'Glucozơ'),@(5984,'Fructozơ'),@(5988,'Saccarozơ'),@(753,'Glixerol'),@(784,'Hiđro peoxit'),@(248,'Ozon'),@(1119,'Lưu huỳnh đioxit'),@(24682,'Lưu huỳnh trioxit'),@(145068,'Nitơ monoxit'),@(948,'Đinitơ monoxit'),@(313,'Hiđro clorua'),@(14917,'Hiđro florua'),@(402,'Hiđro sunfua'),@(944,'Axit nitric'),@(1118,'Axit sulfuric'),@(1004,'Axit phosphoric'),@(8078,'Xiclohexan'),@(931,'Naphtalen'),@(2244,'Aspirin'),@(2519,'Cafein'),@(769,'Ion hiđrocacbonat'),@(19660,'Ion cacbonat'),@(1117,'Ion sunfat'),@(223,'Ion amoni'),@(961,'Ion hiđroxit'),@(943,'Ion nitrat'),@(946,'Ion nitrit')
)
$destination = Join-Path $PSScriptRoot '../shared/structures'
New-Item -ItemType Directory -Force -Path $destination | Out-Null
$ids = ($catalog | ForEach-Object { $_[0] }) -join ','
$properties = (Invoke-RestMethod -Uri "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/$ids/property/MolecularFormula,MolecularWeight,IUPACName/JSON" -TimeoutSec 40).PropertyTable.Properties
$records = @()
foreach ($entry in $catalog) {
 $cid=$entry[0]; $name=$entry[1]; $file=Join-Path $destination "$cid.sdf"; $dimension='3d'
 if (-not (Test-Path $file)) {
  try { Invoke-WebRequest -Uri "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/$cid/SDF?record_type=3d" -OutFile $file -TimeoutSec 25 | Out-Null }
  catch { $dimension='2d'; try { Invoke-WebRequest -Uri "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/$cid/SDF?record_type=2d" -OutFile $file -TimeoutSec 25 | Out-Null } catch { Write-Host "Unavailable CID $cid"; continue } }
  Start-Sleep -Milliseconds 350
 } else { if ((Get-Content $file -TotalCount 3) -match '2D') {$dimension='2d'} }
 $prop=$properties | Where-Object CID -EQ $cid
 if (-not $prop) {throw "Missing properties: $cid"}
 $records += [ordered]@{id="cid-$cid";cid=$cid;name_vi=$name;name_en=$prop.IUPACName;formula=$prop.MolecularFormula;molarMass=[double]$prop.MolecularWeight;kind=$(if ($name.StartsWith('Ion')) {'ion'} else {'molecule'});family=$(if ($prop.MolecularFormula -match 'C' -and $cid -notin @(280,281,769,19660)) {'organic'} else {'inorganic'});structure=[ordered]@{format='sdf';url="/shared/structures/$cid.sdf";dimension=$dimension;provenance='PubChem computed conformer';retrievedAt=(Get-Date -Format 'yyyy-MM-dd');source="https://pubchem.ncbi.nlm.nih.gov/compound/$cid"};aliases=@($name,$prop.IUPACName,$prop.MolecularFormula)}
 Write-Host "CID $cid $dimension"
}
$records | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 (Join-Path $PSScriptRoot '../shared/compounds.json')
Write-Host "Downloaded $($records.Count) structures"
