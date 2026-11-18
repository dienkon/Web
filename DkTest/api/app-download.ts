import {
  renderFallbackDownloadHtml,
  resolveAndroidApkDownload,
} from "../src/services/server/appDownload.js";

export const maxDuration = 15;

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
    const meta = await resolveAndroidApkDownload();

    if (req.query?.format === "json") {
      res.setHeader(
        "Cache-Control",
        req.query?._t
          ? "no-store, max-age=0"
          : "public, s-maxage=30, stale-while-revalidate=60"
      );
      return res.status(200).json(meta);
    }

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
