import {
  renderFallbackDownloadHtml,
  resolveAndroidApkDownload,
} from "../src/services/server/appDownload.js";

export const maxDuration = 15;

export default async function handler(req: any, res: any) {
  try {
    const meta = await resolveAndroidApkDownload();

    if (req.query?.format === "json") {
      res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=300");
      return res.status(200).json(meta);
    }

    if (meta.downloadUrl) {
      res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=300");
      res.setHeader("Location", meta.downloadUrl);
      return res.status(302).end();
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=60");
    return res.status(200).send(renderFallbackDownloadHtml(meta));
  } catch (err: any) {
    console.error("[api/app-download] Error:", err);
    return res.redirect(302, "https://github.com/dienkon/Web/releases");
  }
}
