$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$toolRoot = Join-Path $env:USERPROFILE '.cache/dktest-android'
if (!$env:JAVA_HOME -and (Test-Path "$toolRoot/java")) { $env:JAVA_HOME = (Get-ChildItem "$toolRoot/java" -Directory | Select-Object -First 1).FullName }
if ($env:JAVA_HOME) { $env:PATH = "$env:JAVA_HOME/bin;$env:PATH" }
$testTemp = Join-Path $PWD 'android/.tmp'
New-Item -ItemType Directory -Path $testTemp -Force | Out-Null
$env:JAVA_TOOL_OPTIONS = "$env:JAVA_TOOL_OPTIONS -Djava.io.tmpdir=`"$testTemp`" -Djdk.net.unixdomain.tmpdir=`"$testTemp`""
$env:FIREBASE_CLI_DISABLE_USAGE_REPORTING = '1'
& npx.cmd firebase emulators:exec --only firestore --project demo-dktest-audit --config firebase.audit.json 'node scripts/test-firestore-rules.mjs'
if ($LASTEXITCODE -ne 0) { throw 'Firestore rules audit failed.' }
