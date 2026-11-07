$ErrorActionPreference='Stop'
[Console]::InputEncoding=New-Object Text.UTF8Encoding $false
[Console]::OutputEncoding=New-Object Text.UTF8Encoding $false
$request=[Console]::In.ReadToEnd() | ConvertFrom-Json
$target=Get-Process -ErrorAction SilentlyContinue | Where-Object { try { $_.Path -eq $request.file -and $_.MainWindowHandle -ne 0 } catch { $false } } | Select-Object -First 1
if(-not $target -and $request.mode -eq 'open'){
 $launched=Start-Process -FilePath $request.file -WorkingDirectory (Split-Path -LiteralPath $request.file) -WindowStyle Normal -PassThru
 [Console]::Out.Write((@{pid=$launched.Id;reused=$false}|ConvertTo-Json -Compress));exit
}
if(-not $target){[Console]::Out.Write('null');exit}
Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
public class InkulatorNativeWindow {
 [StructLayout(LayoutKind.Sequential)] public struct RECT {public int Left,Top,Right,Bottom;}
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out RECT r);
 [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h,IntPtr dc,uint flags);
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h,int mode);
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
}
'@
if($request.mode -eq 'focus' -or $request.mode -eq 'open'){
 if([InkulatorNativeWindow]::IsIconic($target.MainWindowHandle)){$null=[InkulatorNativeWindow]::ShowWindow($target.MainWindowHandle,9)}
 $null=[InkulatorNativeWindow]::SetForegroundWindow($target.MainWindowHandle)
 [Console]::Out.Write((@{pid=$target.Id;title=$target.MainWindowTitle;reused=$true}|ConvertTo-Json -Compress));exit
}
if($request.mode -ne 'capture' -or [InkulatorNativeWindow]::IsIconic($target.MainWindowHandle)){[Console]::Out.Write('null');exit}
Add-Type -AssemblyName System.Drawing
$r=New-Object InkulatorNativeWindow+RECT
$null=[InkulatorNativeWindow]::GetWindowRect($target.MainWindowHandle,[ref]$r)
$w=$r.Right-$r.Left;$h=$r.Bottom-$r.Top
if($w -lt 10 -or $h -lt 10 -or $w*$h -gt 8000000){throw 'Invalid calculator window size'}
$bitmap=New-Object Drawing.Bitmap $w,$h
$graphics=[Drawing.Graphics]::FromImage($bitmap)
$dc=$graphics.GetHdc()
try{$ok=[InkulatorNativeWindow]::PrintWindow($target.MainWindowHandle,$dc,2)}finally{$graphics.ReleaseHdc($dc)}
if(-not $ok){$graphics.Dispose();$bitmap.Dispose();throw 'Cannot capture calculator window'}
$stream=New-Object IO.MemoryStream
try{$bitmap.Save($stream,[Drawing.Imaging.ImageFormat]::Png);[Console]::Out.Write((@{src=('data:image/png;base64,'+[Convert]::ToBase64String($stream.ToArray()));width=$w;height=$h}|ConvertTo-Json -Compress))}finally{$stream.Dispose();$graphics.Dispose();$bitmap.Dispose()}
