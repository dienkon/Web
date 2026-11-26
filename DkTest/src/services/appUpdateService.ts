import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { getApiBaseUrl } from "./apiClient";
import {
  APP_DOWNLOAD_API_PATH,
  APP_LINK_ORIGIN,
  GITHUB_RELEASES_URL,
  getAppVersionMetadata,
} from "./appLinks";

export interface RemoteAppReleaseMetadata {
  version: string;
  androidVersionCode: number;
  releaseDate?: string;
  apkFileName?: string;
  apkVersion?: string;
  exactReleaseFound?: boolean;
  downloadUrl: string | null;
  releasesPageUrl: string;
  source?: "env" | "github_release" | "fallback";
  /** Mandatory force-update policy (defaults to true so users always run the latest safe release) */
  forceUpdate?: boolean;
}

const SKIPPED_VERSION_KEY = "dktest_app_update_skipped_version";

export function compareSemver(a: string, b: string): number {
  const parse = (raw: string) =>
    String(raw || "")
      .trim()
      .replace(/^v/i, "")
      .split("-")[0]
      .split(".")
      .map((n) => {
        const parsed = parseInt(n, 10);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
      });

  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.length, pb.length, 3);
  for (let i = 0; i < len; i++) {
    const va = pa[i] || 0;
    const vb = pb[i] || 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

/**
 * Determines whether the remote release is genuinely newer AND installable as an APK (on Android)
 * or reloadable (on Web/PWA).
 * Prevents prompting Android users to re-download the current APK if CI hasn't finished publishing the new tag yet.
 */
export function isNewerAppRelease(
  installed: { version: string; androidVersionCode: number },
  remote: Partial<RemoteAppReleaseMetadata> | null | undefined,
  options?: { platform?: "android" | "web" }
): boolean {
  if (!remote || !remote.version) return false;
  const remoteVersion = String(remote.version).trim();
  const remoteCode = Number(remote.androidVersionCode) || 0;
  const hasNewerMeta =
    compareSemver(remoteVersion, installed.version) > 0 ||
    remoteCode > Number(installed.androidVersionCode || 0);

  if (!hasNewerMeta) return false;

  if (options?.platform === "web") {
    return true;
  }

  // On Android: if GitHub Release fell back to an older APK while CI is still building, wait until a newer APK exists
  if (remote.exactReleaseFound === false) {
    const apkVer = String(remote.apkVersion || "").trim();
    if (!apkVer || compareSemver(apkVer, installed.version) <= 0) {
      return false;
    }
  }

  return Boolean(remote.downloadUrl || remote.releasesPageUrl);
}

export function isMandatoryUpdate(
  remote: Partial<RemoteAppReleaseMetadata> | null | undefined
): boolean {
  return remote?.forceUpdate !== false;
}

export function getSkippedAppVersion(): string {
  if (typeof localStorage === "undefined") return "";
  try {
    return String(localStorage.getItem(SKIPPED_VERSION_KEY) || "").trim();
  } catch {
    return "";
  }
}

export function setSkippedAppVersion(version: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    const clean = String(version || "").trim();
    if (clean) {
      localStorage.setItem(SKIPPED_VERSION_KEY, clean);
    }
  } catch {}
}

export function clearSkippedAppVersion(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(SKIPPED_VERSION_KEY);
  } catch {}
}

export function shouldPromptForAppUpdate(
  installed: { version: string; androidVersionCode: number },
  remote: Partial<RemoteAppReleaseMetadata> | null | undefined,
  sessionDismissedVersion: string | null = null,
  options?: { platform?: "android" | "web"; enforceMandatory?: boolean }
): boolean {
  if (!isNewerAppRelease(installed, remote, { platform: options?.platform })) return false;
  const remoteVersion = String(remote?.version || "").trim();
  if (!remoteVersion) return false;

  // Mandatory force-update ignores skipped/dismissed flags so every user upgrades promptly
  const mandatory =
    options?.enforceMandatory !== undefined
      ? options.enforceMandatory
      : isMandatoryUpdate(remote);
  if (mandatory) {
    return true;
  }

  const skipped = getSkippedAppVersion();
  if (skipped && compareSemver(remoteVersion, skipped) <= 0) {
    return false;
  }
  if (sessionDismissedVersion && sessionDismissedVersion === remoteVersion) {
    return false;
  }
  return true;
}

/**
 * Safely refreshes the Web/PWA bundle to the newest release WITHOUT deleting localStorage or IndexedDB
 * (preserving Firebase Auth tokens & saved user profile so users never have to log in again).
 */
export async function performSafeWebAppUpdate(): Promise<void> {
  clearSkippedAppVersion();
  try {
    if (typeof caches !== "undefined" && typeof caches.keys === "function") {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
    }
  } catch {}

  try {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        regs.map((r) =>
          r.update().catch(() => {
            return r.unregister().catch(() => false);
          })
        )
      );
    }
  } catch {}

  if (typeof window !== "undefined") {
    const url = new URL(window.location.href);
    url.searchParams.set("_upd", String(Date.now()));
    window.location.replace(url.toString());
  }
}

export function resolveApkUpdateActionUrl(
  remote: Partial<RemoteAppReleaseMetadata> | null | undefined
): string {
  const direct = String(remote?.downloadUrl || "").trim();
  if (/^https?:\/\//i.test(direct)) return direct;
  const base = getApiBaseUrl() || APP_LINK_ORIGIN;
  if (remote?.source === "fallback" && remote?.releasesPageUrl) {
    return remote.releasesPageUrl;
  }
  return `${base.replace(/\/+$/, "")}${APP_DOWNLOAD_API_PATH}`;
}

export async function fetchLatestAppReleaseMetadata(): Promise<RemoteAppReleaseMetadata | null> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return null;

  const base = (getApiBaseUrl() || APP_LINK_ORIGIN).replace(/\/+$/, "");
  const url = `${base}${APP_DOWNLOAD_API_PATH}?format=json&_t=${Date.now()}`;

  try {
    if (Capacitor.getPlatform() === "android" && typeof CapacitorHttp?.get === "function") {
      try {
        const res = await CapacitorHttp.get({
          url,
          headers: { Accept: "application/json" },
          connectTimeout: 8000,
          readTimeout: 8000,
        });
        if (res.status >= 200 && res.status < 300) {
          const parsed = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
          if (parsed && typeof parsed.version === "string") {
            return {
              version: parsed.version,
              androidVersionCode: Number(parsed.androidVersionCode) || 0,
              releaseDate: parsed.releaseDate || "",
              apkFileName: parsed.apkFileName || "",
              apkVersion: parsed.apkVersion || parsed.version,
              exactReleaseFound: parsed.exactReleaseFound,
              downloadUrl: parsed.downloadUrl || null,
              releasesPageUrl: parsed.releasesPageUrl || GITHUB_RELEASES_URL,
              source: parsed.source,
            };
          }
        }
      } catch {
        // Fall through to standard fetch
      }
    }

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined,
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data || typeof data.version !== "string") return null;

    return {
      version: data.version,
      androidVersionCode: Number(data.androidVersionCode) || 0,
      releaseDate: data.releaseDate || "",
      apkFileName: data.apkFileName || "",
      apkVersion: data.apkVersion || data.version,
      exactReleaseFound: data.exactReleaseFound,
      downloadUrl: data.downloadUrl || null,
      releasesPageUrl: data.releasesPageUrl || GITHUB_RELEASES_URL,
      source: data.source,
    };
  } catch {
    return null;
  }
}

export function getInstalledAppVersionInfo() {
  return getAppVersionMetadata();
}
