import {
  buildIosMobileConfigProfile,
  renderFallbackDownloadHtml,
  renderIosInstallHtml,
  resolveAndroidApkDownload,
  resolveIosAppDownload,
} from "../src/services/server/appDownload.js";

export const maxDuration = 15;

function isIosUserAgent(ua: string): boolean {
  return /iPhone|iPad|iPod/i.test(ua);
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Cache-Control, Pragma, Expires"
  );

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    const platformParam = String(req.query?.platform || "").trim().toLowerCase();
    const formatParam = String(req.query?.format || "").trim().toLowerCase();
    const userAgent = String(req.headers?.["user-agent"] || "");

    // JSON metadata returns both Android top-level fields (backwards-compatible) and iOS block
    if (formatParam === "json") {
      const [androidMeta, iosMeta] = await Promise.all([
        resolveAndroidApkDownload(),
        resolveIosAppDownload(),
      ]);
      res.setHeader(
        "Cache-Control",
        req.query?._t
          ? "no-store, max-age=0"
          : "public, s-maxage=30, stale-while-revalidate=60"
      );
      return res.status(200).json({ ...androidMeta, ios: iosMeta });
    }

    // Explicit iOS platform request
    if (platformParam === "ios") {
      const iosMeta = await resolveIosAppDownload();

      if (formatParam === "ipa") {
        if (iosMeta.ipaDownloadUrl) {
          res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=180");
          res.setHeader("Location", iosMeta.ipaDownloadUrl);
          return res.status(302).end();
        }
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=30");
        return res.status(200).send(renderIosInstallHtml(iosMeta));
      }

      if (formatParam === "html") {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=60");
        return res.status(200).send(renderIosInstallHtml(iosMeta));
      }

      // Default for ?platform=ios (or ?platform=ios&format=mobileconfig): serve Apple Web Clip profile
      const profileXml = buildIosMobileConfigProfile({ version: iosMeta.version });
      res.setHeader("Content-Type", "application/x-apple-aspen-config; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${iosMeta.profileFileName}"`
      );
      res.setHeader("Cache-Control", "public, max-age=60");
      return res.status(200).send(profileXml);
    }

    // Auto-detect iPhone/iPad when user opens /api/app-download directly without specifying ?platform=android
    if (!platformParam && isIosUserAgent(userAgent)) {
      const iosMeta = await resolveIosAppDownload();
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=60");
      return res.status(200).send(renderIosInstallHtml(iosMeta));
    }

    // Default Android APK download flow
    const meta = await resolveAndroidApkDownload();

    if (meta.downloadUrl) {
      res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=180");
      res.setHeader("Location", meta.downloadUrl);
      return res.status(302).end();
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=30");
    return res.status(200).send(renderFallbackDownloadHtml(meta));
  } catch (err: any) {
    console.error("[api/app-download] Error:", err);
    return res.redirect(302, "https://github.com/dienkon/Web/releases");
  }
}
