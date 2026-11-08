param([switch]$Release)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$toolRoot = Join-Path $env:USERPROFILE '.cache/dktest-android'
if (!$env:JAVA_HOME -and (Test-Path -LiteralPath "$toolRoot/java")) {
    $env:JAVA_HOME = (Get-ChildItem -LiteralPath "$toolRoot/java" -Directory | Select-Object -First 1).FullName
}
if (!$env:ANDROID_HOME -and (Test-Path -LiteralPath "$toolRoot/sdk")) { $env:ANDROID_HOME = "$toolRoot/sdk" }
if (!$env:JAVA_HOME -or !$env:ANDROID_HOME) { throw 'Cần JDK 21 (JAVA_HOME) và Android SDK 36 (ANDROID_HOME). Xem docs/android-offline.md.' }
# A short path also avoids Windows MSIX/JDK loopback socket failures in desktop build hosts.
New-Item -ItemType Directory -Path "$projectRoot/android/.tmp" -Force | Out-Null
$env:JAVA_TOOL_OPTIONS = "$env:JAVA_TOOL_OPTIONS -Djava.io.tmpdir=`"$projectRoot/android/.tmp`" -Djdk.net.unixdomain.tmpdir=`"$projectRoot/android/.tmp`""
& npm.cmd run build:mobile
if ($LASTEXITCODE -ne 0) { throw 'Build giao diện thất bại.' }
& npx.cmd cap sync android
if ($LASTEXITCODE -ne 0) { throw 'Đồng bộ Android thất bại.' }
$task = if ($Release) { 'assembleRelease' } else { 'assembleDebug' }
Push-Location -LiteralPath "$projectRoot/android"
try {
    & ./gradlew.bat $task --console=plain
    if ($LASTEXITCODE -ne 0) { throw 'Build APK thất bại.' }
} finally { Pop-Location }
New-Item -ItemType Directory -Path "$projectRoot/releases" -Force | Out-Null
$variant = if ($Release) { 'release' } else { 'debug' }
$source = if ($Release) { 'app-release-unsigned.apk' } else { 'app-debug.apk' }
$destination = "$projectRoot/releases/DkTEST-$variant.apk"
Copy-Item -LiteralPath "$projectRoot/android/app/build/outputs/apk/$variant/$source" -Destination $destination -Force
$digest = [System.Security.Cryptography.SHA256]::Create()
$apkStream = [System.IO.File]::OpenRead($destination)
try { $apkHash = [BitConverter]::ToString($digest.ComputeHash($apkStream)).Replace('-', '').ToLowerInvariant() }
finally { $apkStream.Dispose(); $digest.Dispose() }
[System.IO.File]::WriteAllText("$destination.sha256", "$apkHash  DkTEST-$variant.apk`n")
Write-Output "SHA256: $apkHash"
Write-Output "APK: $destination"
