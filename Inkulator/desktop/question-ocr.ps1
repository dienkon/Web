$ErrorActionPreference='Stop'
[Console]::InputEncoding=New-Object Text.UTF8Encoding $false
[Console]::OutputEncoding=New-Object Text.UTF8Encoding $false
$request=[Console]::In.ReadToEnd() | ConvertFrom-Json
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null=[Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]
$null=[Windows.Graphics.Imaging.BitmapDecoder,Windows.Graphics.Imaging,ContentType=WindowsRuntime]
$null=[Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]
$null=[Windows.Globalization.Language,Windows.Globalization,ContentType=WindowsRuntime]
$awaiter=([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1)
function Await-Operation($operation,[Type]$resultType){
 $task=$awaiter.MakeGenericMethod($resultType).Invoke($null,@($operation))
 $task.GetAwaiter().GetResult()
}
$file=Await-Operation ([Windows.Storage.StorageFile]::GetFileFromPathAsync($request.file)) ([Windows.Storage.StorageFile])
$stream=Await-Operation ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
$bitmap=$null
try {
 $decoder=Await-Operation ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
 $bitmap=Await-Operation ($decoder.GetSoftwareBitmapAsync([Windows.Graphics.Imaging.BitmapPixelFormat]::Bgra8,[Windows.Graphics.Imaging.BitmapAlphaMode]::Premultiplied)) ([Windows.Graphics.Imaging.SoftwareBitmap])
 $engine=[Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
 if(-not $engine){$engine=[Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new('en-US'))}
 if(-not $engine){throw 'Windows OCR language is not installed'}
 $result=Await-Operation ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
 $lines=@($result.Lines | ForEach-Object { $_.Text })
 [Console]::Out.Write((@{text=($lines -join "`n");language=$engine.RecognizerLanguage.LanguageTag;engine='Windows OCR';available=$true} | ConvertTo-Json -Compress))
} finally {if($bitmap){$bitmap.Dispose()};$stream.Dispose()}
