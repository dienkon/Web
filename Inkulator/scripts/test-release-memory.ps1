param(
  [Parameter(Mandatory = $true)][string]$Executable,
  [Parameter(Mandatory = $true)][string]$Report
)

$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.ComponentModel;
using System.Diagnostics;
using System.Runtime.InteropServices;

public static class InkulatorMemoryJob {
    [StructLayout(LayoutKind.Sequential)]
    struct BasicLimits {
        public long ProcessTime, JobTime;
        public uint Flags;
        public UIntPtr MinWorkingSet, MaxWorkingSet;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint Priority, SchedulingClass;
    }
    [StructLayout(LayoutKind.Sequential)]
    struct Limits {
        public BasicLimits Basic;
        public ulong ReadOps, WriteOps, OtherOps, ReadBytes, WriteBytes, OtherBytes;
        public UIntPtr ProcessLimit, JobLimit, ProcessPeak, JobPeak;
    }
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    static extern IntPtr CreateJobObject(IntPtr attributes, string name);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool SetInformationJobObject(IntPtr job, int kind, ref Limits value, int size);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool QueryInformationJobObject(IntPtr job, int kind, out Limits value, int size, IntPtr used);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
    static IntPtr job;
    public static void Apply(ulong bytes) {
        job = CreateJobObject(IntPtr.Zero, null);
        if (job == IntPtr.Zero) throw new Win32Exception();
        var limits = new Limits();
        limits.Basic.Flags = 0x200 | 0x2000; // job commit limit and kill on handle close
        limits.JobLimit = new UIntPtr(bytes);
        if (!SetInformationJobObject(job, 9, ref limits, Marshal.SizeOf<Limits>())) throw new Win32Exception();
        if (!AssignProcessToJobObject(job, Process.GetCurrentProcess().Handle)) throw new Win32Exception();
    }
    public static ulong Peak() {
        Limits limits;
        if (!QueryInformationJobObject(job, 9, out limits, Marshal.SizeOf<Limits>(), IntPtr.Zero)) throw new Win32Exception();
        return limits.JobPeak.ToUInt64();
    }
}
'@

$inkulatorExe = (Resolve-Path -LiteralPath $Executable).Path
$inkulatorReport = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Report)
$inkulatorCap = 4GB
[InkulatorMemoryJob]::Apply($inkulatorCap)
node "$PSScriptRoot/../tests/windows-release-smoke.cjs" $inkulatorExe $inkulatorReport
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$inkulatorMetrics = Get-Content -LiteralPath $inkulatorReport -Raw | ConvertFrom-Json -AsHashtable
$inkulatorMetrics.jobCommitLimitBytes = $inkulatorCap
$inkulatorMetrics.jobPeakCommitBytes = [InkulatorMemoryJob]::Peak()
if ($inkulatorMetrics.jobPeakCommitBytes -le 0 -or $inkulatorMetrics.jobPeakCommitBytes -gt $inkulatorCap) { throw 'Unexpected Job Object peak commit.' }
$inkulatorMetrics | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $inkulatorReport -Encoding utf8NoBOM
Write-Output "Windows Job Object peak commit: $($inkulatorMetrics.jobPeakCommitBytes) / $inkulatorCap bytes."
