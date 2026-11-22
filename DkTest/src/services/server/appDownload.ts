import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GENERATED_RELEASE_META } from "./generatedReleaseMeta.js";

export interface AppDownloadMetadata {
  version: string;
  androidVersionCode: number;
  releaseDate: string;
  apkFileName: string;
  apkVersion: string;
  exactReleaseFound: boolean;
  downloadUrl: string | null;
  releasesPageUrl: string;
  source: "env" | "github_release" | "fallback";
}

const DEFAULT_GITHUB_RELEASES_URL = "https://github.com/dienkon/Web/releases";
const GITHUB_API_RELEASES_URL = "https://api.github.com/repos/dienkon/Web/releases?per_page=15";

function compareSemver(a: string, b: string): number {
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

function extractVersionFromTagOrAsset(tagName?: string, assetName?: string): string {
  const tagMatch = String(tagName || "").match(/dktest-v(\d+\.\d+\.\d+)/i);
  if (tagMatch?.[1]) return tagMatch[1];
  const assetMatch = String(assetName || "").match(/DkTEST-(\d+\.\d+\.\d+)/i);
  if (assetMatch?.[1]) return assetMatch[1];
  return "";
}

export function readCurrentReleaseJson(): {
  version: string;
  androidVersionCode: number;
  date: string;
} {
  const candidates: string[] = [
    path.join(process.cwd(), "release.json"),
    path.join(process.cwd(), "DkTest", "release.json"),
  ];
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    candidates.unshift(path.resolve(here, "../../../release.json"));
  } catch {}

  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
        if (parsed?.version) {
          return {
            version: String(parsed.version),
            androidVersionCode: Number(parsed.androidVersionCode) || GENERATED_RELEASE_META.androidVersionCode,
            date: String(parsed.date || GENERATED_RELEASE_META.date || ""),
          };
        }
      }
    } catch {}
  }

  return {
    version: GENERATED_RELEASE_META.version,
    androidVersionCode: GENERATED_RELEASE_META.androidVersionCode,
    date: GENERATED_RELEASE_META.date,
  };
}

export async function resolveAndroidApkDownload(): Promise<AppDownloadMetadata> {
  const rel = readCurrentReleaseJson();
  const apkFileName = `DkTEST-${rel.version}-debug.apk`;

  const envApkUrl = String(
    process.env.ANDROID_APK_URL || process.env.VITE_ANDROID_APK_URL || ""
  ).trim();
  if (/^https?:\/\//i.test(envApkUrl)) {
    return {
      version: rel.version,
      androidVersionCode: rel.androidVersionCode,
      releaseDate: rel.date,
      apkFileName,
      apkVersion: rel.version,
      exactReleaseFound: true,
      downloadUrl: envApkUrl,
      releasesPageUrl: DEFAULT_GITHUB_RELEASES_URL,
      source: "env",
    };
  }

  try {
    const ghRes = await fetch(GITHUB_API_RELEASES_URL, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "DkTEST-AppDownload/1.0",
      },
      signal: AbortSignal.timeout(4000),
    });

    if (ghRes.ok) {
      const releases = (await ghRes.json()) as Array<{
        tag_name?: string;
        draft?: boolean;
        prerelease?: boolean;
        assets?: Array<{ name?: string; browser_download_url?: string }>;
      }>;
      if (Array.isArray(releases)) {
        const expectedTag = `dktest-v${rel.version}`;
        const candidates: Array<{
          release: (typeof releases)[number];
          asset: { name: string; browser_download_url: string };
          detectedVersion: string;
          matchedExact: boolean;
        }> = [];

        for (const r of releases) {
          if (!r || r.draft) continue;
          const apkAsset = (r.assets || []).find(
            (a) =>
              typeof a?.browser_download_url === "string" &&
              typeof a?.name === "string" &&
              a.name.toLowerCase().endsWith(".apk")
          );
          if (!apkAsset?.browser_download_url || !apkAsset.name) continue;
          const matchedExact = r.tag_name === expectedTag;
          const detectedVersion =
            extractVersionFromTagOrAsset(r.tag_name, apkAsset.name) ||
            (matchedExact ? rel.version : "");
          candidates.push({
            release: r,
            asset: { name: apkAsset.name, browser_download_url: apkAsset.browser_download_url },
            detectedVersion,
            matchedExact,
          });
        }

        // Always prefer the highest published semver APK (or exact release tag)
        candidates.sort((a, b) => {
          const cmp = compareSemver(b.detectedVersion, a.detectedVersion);
          if (cmp !== 0) return cmp;
          if (a.matchedExact !== b.matchedExact) return a.matchedExact ? -1 : 1;
          return 0;
        });

        const best = candidates[0];
        if (best) {
          const bestVer = best.detectedVersion || rel.version;
          const isNewerOrEqual = compareSemver(bestVer, rel.version) >= 0;
          return {
            version: isNewerOrEqual ? bestVer : rel.version,
            androidVersionCode: rel.androidVersionCode,
            releaseDate: rel.date,
            apkFileName: best.asset.name || apkFileName,
            apkVersion: bestVer,
            exactReleaseFound: best.matchedExact || isNewerOrEqual,
            downloadUrl: best.asset.browser_download_url,
            releasesPageUrl: DEFAULT_GITHUB_RELEASES_URL,
            source: "github_release",
          };
        }
      }
    }
  } catch {}

  return {
    version: rel.version,
    androidVersionCode: rel.androidVersionCode,
    releaseDate: rel.date,
    apkFileName,
    apkVersion: "",
    exactReleaseFound: false,
    downloadUrl: null,
    releasesPageUrl: DEFAULT_GITHUB_RELEASES_URL,
    source: "fallback",
  };
}

export function renderFallbackDownloadHtml(meta: AppDownloadMetadata): string {
  const safeVersion = meta.version.replace(/[^0-9A-Za-z._-]/g, "");
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Tải DkTEST Android v${safeVersion}</title>
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#0f172a;margin:0;padding:24px;display:flex;min-height:100vh;align-items:center;justify-content:center}
    .card{max-width:460px;width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:24px;padding:28px;box-shadow:0 12px 30px rgba(15,23,42,.06)}
    .badge{display:inline-block;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700}
    h1{font-size:22px;margin:12px 0 8px}
    p{font-size:14px;color:#475569;line-height:1.55;margin:0 0 18px}
    .btn{display:block;text-align:center;text-decoration:none;padding:12px 16px;border-radius:14px;font-weight:700;font-size:14px;margin-bottom:10px}
    .primary{background:#2563eb;color:#fff}
    .secondary{background:#f1f5f9;color:#0f172a}
    .note{font-size:12px;color:#64748b;margin-top:12px}
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">DkTEST Android v${safeVersion} • Build ${meta.androidVersionCode}</span>
    <h1>Tải Ứng Dụng DkTEST Android</h1>
    <p>File cài đặt APK (<code>${meta.apkFileName}</code>) đang được đồng bộ lên trang phát hành. Bạn có thể mở trang GitHub Releases để tải bản APK mới nhất hoặc cài đặt trực tiếp PWA trên trình duyệt Chrome.</p>
    <a class="btn primary" href="${meta.releasesPageUrl}">Mở trang tải APK chính thức (GitHub Releases)</a>
    <a class="btn secondary" href="/">Quay lại DkTEST Web</a>
    <div class="note">Hướng dẫn Android: Tải tệp .apk &rarr; Mở tệp vừa tải &rarr; Cho phép cài đặt ứng dụng từ trình duyệt nếu được hỏi.</div>
  </div>
</body>
</html>`;
}
