param([Parameter(Mandatory = $true)][string]$Installer)

$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class InkulatorLicenseWindow {
    delegate bool EnumWindow(IntPtr window, IntPtr param);
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumWindow callback, IntPtr param);
    [DllImport("user32.dll")] static extern bool EnumChildWindows(IntPtr window, EnumWindow callback, IntPtr param);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr window, out uint process);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    static extern int GetClassName(IntPtr window, StringBuilder name, int maximum);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    static extern IntPtr SendMessageTimeout(IntPtr window, uint message, IntPtr capacity, StringBuilder text,
                                            uint flags, uint timeout, out IntPtr copied);

    public static string Read(int process) {
        string license = null;
        EnumWindows((window, param) => {
            uint owner;
            GetWindowThreadProcessId(window, out owner);
            if (owner != process) return true;
            EnumChildWindows(window, (child, unused) => {
                var name = new StringBuilder(64);
                GetClassName(child, name, name.Capacity);
                if (!name.ToString().StartsWith("richedit", StringComparison.OrdinalIgnoreCase)) return true;
                var text = new StringBuilder(65536);
                IntPtr copied;
                if (SendMessageTimeout(child, 0x000D, (IntPtr)text.Capacity, text, 2, 500, out copied) != IntPtr.Zero && copied != IntPtr.Zero)
                    license = text.ToString();
                return license == null;
            }, IntPtr.Zero);
            return license == null;
        }, IntPtr.Zero);
        return license;
    }
}
'@

$exe = (Resolve-Path -LiteralPath $Installer).Path
$policy = Get-Content -LiteralPath "$PSScriptRoot/../policies/USAGE.txt" -Raw -Encoding utf8
$expected = ($policy -replace '\r\n?', "`n").TrimEnd()
$wizard = Start-Process -FilePath $exe -PassThru -WindowStyle Hidden
try {
  $clock = [Diagnostics.Stopwatch]::StartNew()
  $license = $null
  while (!$license -and !$wizard.HasExited -and $clock.Elapsed.TotalSeconds -lt 15) {
    $license = [InkulatorLicenseWindow]::Read($wizard.Id)
    if (!$license) { Start-Sleep -Milliseconds 200 }
  }
  if (!$license) { throw 'Could not read the installer license control.' }
  $actual = ($license -replace '\r\n?', "`n").TrimEnd()
  if (![string]::Equals($actual, $expected, [StringComparison]::Ordinal)) {
    throw "Installer license differs from policies/USAGE.txt. First line read: $(($actual -split "`n", 2)[0])"
  }
  Write-Output "PASS $([IO.Path]::GetFileName($exe)): all $($actual.Length) characters in the Windows license control match policies/USAGE.txt."
} finally {
  if (!$wizard.HasExited) { Stop-Process -Id $wizard.Id }
}
