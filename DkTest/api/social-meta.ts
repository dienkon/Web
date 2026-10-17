import {
  renderSocialPageHtml,
  resolveSocialMetadataForUrl,
} from "../src/services/server/socialMetadata.js";

export const maxDuration = 30;

export default async function handler(req: any, res: any) {
  try {
    // 1. Extract target URL path and query parameters
    let targetPath = (req.query?.path || "") as string;
    if (!targetPath && typeof req.url === "string") {
      targetPath = req.url.replace(/^\/api\/social-meta(?:\.ts)?(?:\?|$)/, "");
    }
    if (!targetPath) {
      targetPath = req.originalUrl || req.url || "/";
    }

    // If query has voucher/code, or examId, or submissionId, reconstruct the path only if not already specified
    const voucher = (req.query?.voucher || req.query?.code || "") as string;
    const examId = (req.query?.examId || req.query?.id || "") as string;
    const submissionId = (req.query?.submissionId || "") as string;

    if (submissionId && examId && !targetPath.includes("/result") && !targetPath.includes("/submissions")) {
      targetPath = `/student/exam/${encodeURIComponent(examId)}/result/${encodeURIComponent(submissionId)}`;
    } else if (voucher && !targetPath.includes("/voucher")) {
      targetPath = `/student/wallet?voucher=${encodeURIComponent(voucher)}`;
    } else if (examId && !targetPath.includes("/exam")) {
      targetPath = `/student/exam/${encodeURIComponent(examId)}`;
    }

    // 2. Compute canonical origin / base URL
    const rawProto = req.headers?.["x-forwarded-proto"];
    const proto =
      (Array.isArray(rawProto) ? rawProto[0] : rawProto) ||
      (req.connection?.encrypted ? "https" : "https");

    const rawHost = req.headers?.["x-forwarded-host"] || req.headers?.["host"];
    const host =
      (Array.isArray(rawHost) ? rawHost[0] : rawHost) ||
      process.env.VERCEL_URL ||
      process.env.VITE_APP_URL ||
      `localhost:${process.env.PORT || 3636}`;

    const hostClean =
      host.startsWith("http://") || host.startsWith("https://")
        ? host.replace(/^https?:\/\//, "")
        : host;

    const baseUrl = `${proto}://${hostClean}`;

    // If client requested JSON metadata (?format=json)
    if (req.query?.format === "json") {
      const meta = await resolveSocialMetadataForUrl({
        url: targetPath,
        baseUrl,
      });
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(200).json(meta);
    }

    // 3. Render dynamic HTML with complete Open Graph / Twitter / Zalo metadata
    const { html, status } = await renderSocialPageHtml({
      url: targetPath,
      baseUrl,
      isDev: false,
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300"
    );
    return res.status(status).send(html);
  } catch (err: any) {
    console.error("[api/social-meta] Error processing request:", err);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    const { html } = await renderSocialPageHtml({
      url: "/",
      baseUrl: "https://dktest.vn",
      isDev: false,
    });
    return res.status(200).send(html);
  }
}
