import { describe, it, expect, beforeEach } from "vitest";
import {
  clearSkippedAppVersion,
  compareSemver,
  getSkippedAppVersion,
  isNewerAppRelease,
  resolveApkUpdateActionUrl,
  setSkippedAppVersion,
  shouldPromptForAppUpdate,
} from "./appUpdateService";

describe("appUpdateService version check & skippable prompt helpers", () => {
  const storageMap: Record<string, string> = {};

  beforeEach(() => {
    for (const key of Object.keys(storageMap)) delete storageMap[key];
    (globalThis as any).localStorage = {
      getItem: (k: string) => storageMap[k] ?? null,
      setItem: (k: string, v: string) => {
        storageMap[k] = String(v);
      },
      removeItem: (k: string) => {
        delete storageMap[k];
      },
    };
    clearSkippedAppVersion();
  });

  it("compares semantic versions accurately", () => {
    expect(compareSemver("1.9.6", "1.9.5")).toBe(1);
    expect(compareSemver("1.10.0", "1.9.9")).toBe(1);
    expect(compareSemver("2.0.0", "1.9.9")).toBe(1);
    expect(compareSemver("1.9.6", "1.9.6")).toBe(0);
    expect(compareSemver("1.9.5", "1.9.6")).toBe(-1);
  });

  it("detects newer release only when a newer APK is actually ready", () => {
    const installed = { version: "1.9.5", androidVersionCode: 11 };

    // Newer release with exact APK ready
    expect(
      isNewerAppRelease(installed, {
        version: "1.9.6",
        androidVersionCode: 12,
        apkVersion: "1.9.6",
        exactReleaseFound: true,
        downloadUrl: "https://github.com/dienkon/Web/releases/download/dktest-v1.9.6/DkTEST-1.9.6-debug.apk",
      })
    ).toBe(true);

    // Server bumped to 1.9.6, but GitHub Actions still only has 1.9.5 APK -> do not nag to re-download 1.9.5
    expect(
      isNewerAppRelease(installed, {
        version: "1.9.6",
        androidVersionCode: 12,
        apkVersion: "1.9.5",
        exactReleaseFound: false,
        downloadUrl: "https://github.com/dienkon/Web/releases/download/dktest-v1.9.5/DkTEST-1.9.5-debug.apk",
      })
    ).toBe(false);

    // Same version installed
    expect(
      isNewerAppRelease(installed, {
        version: "1.9.5",
        androidVersionCode: 11,
        apkVersion: "1.9.5",
        exactReleaseFound: true,
        downloadUrl: "https://example.com/DkTEST-1.9.5-debug.apk",
      })
    ).toBe(false);
  });

  it("enforces mandatory force-update by default regardless of skipped/dismissed state", () => {
    const installed = { version: "2.0.5", androidVersionCode: 29 };
    const release206 = {
      version: "2.0.6",
      androidVersionCode: 30,
      apkVersion: "2.0.6",
      exactReleaseFound: true,
      downloadUrl: "https://example.com/DkTEST-2.0.6-debug.apk",
      releasesPageUrl: "https://github.com/dienkon/Web/releases",
    };

    // Mandatory by default: cannot be dismissed or skipped
    expect(shouldPromptForAppUpdate(installed, release206, null)).toBe(true);
    expect(shouldPromptForAppUpdate(installed, release206, "2.0.6")).toBe(true);

    setSkippedAppVersion("2.0.6");
    expect(getSkippedAppVersion()).toBe("2.0.6");
    expect(shouldPromptForAppUpdate(installed, release206, null)).toBe(true);

    // Web platform also triggers force update even without APK URL
    expect(
      shouldPromptForAppUpdate(
        installed,
        { version: "2.0.6", androidVersionCode: 30, downloadUrl: null, releasesPageUrl: "" },
        "2.0.6",
        { platform: "web" }
      )
    ).toBe(true);

    // Optional release (forceUpdate: false) still honors skip & session dismissal
    const optionalRelease = { ...release206, forceUpdate: false };
    expect(shouldPromptForAppUpdate(installed, optionalRelease, "2.0.6")).toBe(false);
    expect(shouldPromptForAppUpdate(installed, optionalRelease, null)).toBe(false);

    const optionalNewer = {
      ...optionalRelease,
      version: "2.0.7",
      androidVersionCode: 31,
      apkVersion: "2.0.7",
    };
    expect(shouldPromptForAppUpdate(installed, optionalNewer, null)).toBe(true);
  });

  it("resolves download URL directly when provided or falls back safely", () => {
    expect(
      resolveApkUpdateActionUrl({
        downloadUrl: "https://github.com/dienkon/Web/releases/download/dktest-v1.9.6/DkTEST-1.9.6-debug.apk",
      })
    ).toContain("DkTEST-1.9.6-debug.apk");

    expect(
      resolveApkUpdateActionUrl({
        downloadUrl: null,
        source: "fallback",
        releasesPageUrl: "https://github.com/dienkon/Web/releases",
      })
    ).toBe("https://github.com/dienkon/Web/releases");
  });
});
