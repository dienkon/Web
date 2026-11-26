import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GENERATED_RELEASE_META } from "./generatedReleaseMeta.js";

export interface IosAppDownloadMetadata {
  version: string;
  bundleId: string;
  profileFileName: string;
  profileDownloadUrl: string;
  installPageUrl: string;
  ipaFileName: string;
  ipaVersion: string;
  ipaAvailable: boolean;
  ipaDownloadUrl: string | null;
  releasesPageUrl: string;
  source: "env" | "github_release" | "webclip_only";
}

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
  ios?: IosAppDownloadMetadata;
}

const DEFAULT_GITHUB_RELEASES_URL = "https://github.com/dienkon/Web/releases";
const GITHUB_API_RELEASES_URL = "https://api.github.com/repos/dienkon/Web/releases?per_page=15";
const DEFAULT_APP_ORIGIN = "https://dk-test-v3.vercel.app";
const IOS_BUNDLE_ID = "vn.dktest.student";

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

export function readIosAppIconBase64(): string | null {
  const candidates: string[] = [
    path.join(process.cwd(), "public", "images", "ios-app-icon-180.png"),
    path.join(process.cwd(), "DkTest", "public", "images", "ios-app-icon-180.png"),
    path.join(process.cwd(), "public", "apple-touch-icon.png"),
    path.join(process.cwd(), "DkTest", "public", "apple-touch-icon.png"),
  ];
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    candidates.unshift(
      path.resolve(here, "../../../public/images/ios-app-icon-180.png"),
      path.resolve(here, "../../../public/apple-touch-icon.png")
    );
  } catch {}

  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        const buf = fs.readFileSync(filePath);
        if (buf.length > 0) {
          return buf.toString("base64");
        }
      }
    } catch {}
  }
  return null;
}

function escapeXml(raw: string): string {
  return String(raw || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapBase64(b64: string): string {
  const chunks: string[] = [];
  for (let i = 0; i < b64.length; i += 76) {
    chunks.push(b64.slice(i, i + 76));
  }
  return chunks.join("\n        ");
}

export function buildIosMobileConfigProfile(options?: {
  version?: string;
  appUrl?: string;
  iconBase64?: string | null;
}): string {
  const rel = readCurrentReleaseJson();
  const safeVersion = String(options?.version || rel.version || "2.0.4").replace(
    /[^0-9A-Za-z._-]/g,
    ""
  );
  const appUrl =
    options?.appUrl && /^https?:\/\//i.test(options.appUrl)
      ? options.appUrl
      : `${DEFAULT_APP_ORIGIN}/`;
  const iconB64 =
    options?.iconBase64 !== undefined ? options.iconBase64 : readIosAppIconBase64();
  const iconXml = iconB64
    ? `      <key>Icon</key>
      <data>
        ${wrapBase64(iconB64)}
      </data>
`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>FullScreen</key>
      <true/>
${iconXml}      <key>IgnoreManifestScope</key>
      <false/>
      <key>IsRemovable</key>
      <true/>
      <key>Label</key>
      <string>DkTEST</string>
      <key>PayloadDescription</key>
      <string>Cài đặt biểu tượng ứng dụng DkTEST toàn màn hình trên iPhone và iPad.</string>
      <key>PayloadDisplayName</key>
      <string>DkTEST App v${escapeXml(safeVersion)}</string>
      <key>PayloadIdentifier</key>
      <string>${IOS_BUNDLE_ID}.webclip</string>
      <key>PayloadType</key>
      <string>com.apple.webClip.managed</string>
      <key>PayloadUUID</key>
      <string>D7A41E92-8B31-4C5F-9A14-202611260001</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
      <key>Precomposed</key>
      <true/>
      <key>URL</key>
      <string>${escapeXml(appUrl)}</string>
    </dict>
  </array>
  <key>PayloadDescription</key>
  <string>Hồ sơ cài đặt ứng dụng DkTEST chính thức cho iOS (toàn màn hình, an toàn, có thể gỡ bỏ bất cứ lúc nào như ứng dụng thông thường).</string>
  <key>PayloadDisplayName</key>
  <string>DkTEST iOS App (v${escapeXml(safeVersion)})</string>
  <key>PayloadIdentifier</key>
  <string>${IOS_BUNDLE_ID}.profile</string>
  <key>PayloadOrganization</key>
  <string>DkTEST Education</string>
  <key>PayloadRemovalDisallowed</key>
  <false/>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadUUID</key>
  <string>D7A41E92-8B31-4C5F-9A14-202611260000</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
</dict>
</plist>
`;
}

export async function resolveIosAppDownload(): Promise<IosAppDownloadMetadata> {
  const rel = readCurrentReleaseJson();
  const profileFileName = `DkTEST-iOS-v${rel.version}.mobileconfig`;
  const ipaFileName = `DkTEST-${rel.version}-ios-unsigned.ipa`;
  const profileDownloadUrl = "/api/app-download?platform=ios&format=mobileconfig";
  const installPageUrl = "/api/app-download?platform=ios&format=html";

  const envIpaUrl = String(
    process.env.IOS_IPA_URL || process.env.VITE_IOS_IPA_URL || ""
  ).trim();
  if (/^https?:\/\//i.test(envIpaUrl)) {
    return {
      version: rel.version,
      bundleId: IOS_BUNDLE_ID,
      profileFileName,
      profileDownloadUrl,
      installPageUrl,
      ipaFileName,
      ipaVersion: rel.version,
      ipaAvailable: true,
      ipaDownloadUrl: envIpaUrl,
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
        assets?: Array<{ name?: string; browser_download_url?: string }>;
      }>;
      if (Array.isArray(releases)) {
        const expectedTag = `dktest-v${rel.version}`;
        const candidates: Array<{
          asset: { name: string; browser_download_url: string };
          detectedVersion: string;
          matchedExact: boolean;
        }> = [];

        for (const r of releases) {
          if (!r || r.draft) continue;
          const ipaAsset = (r.assets || []).find(
            (a) =>
              typeof a?.browser_download_url === "string" &&
              typeof a?.name === "string" &&
              a.name.toLowerCase().endsWith(".ipa")
          );
          if (!ipaAsset?.browser_download_url || !ipaAsset.name) continue;
          const matchedExact = r.tag_name === expectedTag;
          const detectedVersion =
            extractVersionFromTagOrAsset(r.tag_name, ipaAsset.name) ||
            (matchedExact ? rel.version : "");
          candidates.push({
            asset: { name: ipaAsset.name, browser_download_url: ipaAsset.browser_download_url },
            detectedVersion,
            matchedExact,
          });
        }

        candidates.sort((a, b) => {
          const cmp = compareSemver(b.detectedVersion, a.detectedVersion);
          if (cmp !== 0) return cmp;
          if (a.matchedExact !== b.matchedExact) return a.matchedExact ? -1 : 1;
          return 0;
        });

        const best = candidates[0];
        if (best) {
          const bestVer = best.detectedVersion || rel.version;
          return {
            version: compareSemver(bestVer, rel.version) >= 0 ? bestVer : rel.version,
            bundleId: IOS_BUNDLE_ID,
            profileFileName,
            profileDownloadUrl,
            installPageUrl,
            ipaFileName: best.asset.name || ipaFileName,
            ipaVersion: bestVer,
            ipaAvailable: true,
            ipaDownloadUrl: best.asset.browser_download_url,
            releasesPageUrl: DEFAULT_GITHUB_RELEASES_URL,
            source: "github_release",
          };
        }
      }
    }
  } catch {}

  return {
    version: rel.version,
    bundleId: IOS_BUNDLE_ID,
    profileFileName,
    profileDownloadUrl,
    installPageUrl,
    ipaFileName,
    ipaVersion: "",
    ipaAvailable: false,
    ipaDownloadUrl: null,
    releasesPageUrl: DEFAULT_GITHUB_RELEASES_URL,
    source: "webclip_only",
  };
}

export function renderIosInstallHtml(iosMeta: IosAppDownloadMetadata): string {
  const safeVersion = iosMeta.version.replace(/[^0-9A-Za-z._-]/g, "");
  const ipaBlock = iosMeta.ipaAvailable && iosMeta.ipaDownloadUrl
    ? `<a class="btn outline" href="${escapeXml(iosMeta.ipaDownloadUrl)}">Tải tệp .IPA (${escapeXml(iosMeta.ipaFileName)}) cho AltStore / Sideloadly</a>`
    : `<a class="btn outline" href="${escapeXml(iosMeta.releasesPageUrl)}">Xem bản phát hành .IPA trên GitHub Releases</a>`;

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <title>Tải DkTEST iOS v${safeVersion}</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',system-ui,sans-serif;background:#f8fafc;color:#0f172a;margin:0;padding:20px;display:flex;min-height:100vh;align-items:center;justify-content:center}
    .card{max-width:480px;width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:26px;padding:28px;box-shadow:0 16px 36px rgba(15,23,42,.07)}
    .top{display:flex;align-items:center;gap:14px;margin-bottom:16px}
    .icon{width:56px;height:56px;border-radius:14px;border:1px solid #e2e8f0;object-fit:cover}
    .badge{display:inline-block;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700}
    h1{font-size:20px;margin:6px 0 2px;line-height:1.25}
    .sub{font-size:13px;color:#475569;margin:0}
    p{font-size:13.5px;color:#475569;line-height:1.55;margin:12px 0 16px}
    .btn{display:block;text-align:center;text-decoration:none;padding:13px 16px;border-radius:14px;font-weight:700;font-size:14px;margin-bottom:10px}
    .primary{background:#2563eb;color:#fff}
    .secondary{background:#f1f5f9;color:#0f172a}
    .outline{background:#fff;color:#334155;border:1px solid #cbd5e1;font-size:13px}
    .steps{background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:14px 16px;margin:14px 0;font-size:13px;color:#334155;line-height:1.6}
    .steps b{color:#0f172a}
    .steps ol{margin:6px 0 0;padding-left:18px}
    .note{font-size:12px;color:#64748b;margin-top:12px;line-height:1.5}
  </style>
</head>
<body>
  <div class="card">
    <div class="top">
      <img class="icon" src="/images/ios-app-icon-180.png" alt="DkTEST iOS" />
      <div>
        <span class="badge">DkTEST iOS v${safeVersion} • Toàn màn hình</span>
        <h1>Cài Ứng Dụng DkTEST cho iPhone / iPad</h1>
        <div class="sub">Hỗ trợ iOS 14+ • Không cần App Store</div>
      </div>
    </div>

    <a class="btn primary" href="${escapeXml(iosMeta.profileDownloadUrl)}">⬇ Tải cấu hình cài App iOS (.mobileconfig)</a>

    <div class="steps">
      <b>Hướng dẫn hoàn tất trong 15 giây (3 bước):</b>
      <ol>
        <li>Bấm nút màu xanh phía trên trên <b>Safari</b> → chọn <b>Cho phép (Allow)</b>.</li>
        <li>Mở ứng dụng <b>Cài đặt (Settings)</b> trên iPhone → chọn <b>Đã tải về hồ sơ (Profile Downloaded)</b> ở ngay đầu danh sách.</li>
        <li>Bấm <b>Cài đặt (Install)</b> ở góc trên phải → nhập mật khẩu máy (nếu hỏi) → biểu tượng <b>DkTEST</b> sẽ xuất hiện ngay trên Màn hình chính!</li>
      </ol>
    </div>

    <div class="steps">
      <b>Hoặc cài nhanh không cần tải hồ sơ:</b>
      <ol>
        <li>Mở <b>dk-test-v3.vercel.app</b> bằng trình duyệt <b>Safari</b>.</li>
        <li>Chạm nút <b>Chia sẻ (biểu tượng mũi tên lên)</b> ở thanh dưới cùng → chọn <b>Thêm vào MH chính (Add to Home Screen)</b> → <b>Thêm</b>.</li>
      </ol>
    </div>

    ${ipaBlock}
    <a class="btn secondary" href="/">Mở ngay DkTEST Web</a>
    <div class="note">Lưu ý kỹ thuật: Hồ sơ .mobileconfig và chế độ "Thêm vào MH chính" hoạt động ngay lập tức trên mọi iPhone/iPad (toàn màn hình, gỡ bỏ dễ dàng như app thường). Riêng tệp .IPA chưa ký Apple Developer chỉ dành cho cài qua AltStore / Sideloadly / TrollStore hoặc tự ký bằng Xcode.</div>
  </div>
</body>
</html>`;
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
