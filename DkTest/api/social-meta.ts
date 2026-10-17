import {
  renderSocialPageHtml,
  resolveSocialMetadataForUrl,
  isSocialCrawler,
} from "../src/services/server/socialMetadata.js";

export const maxDuration = 30;

function cleanParam(val: unknown): string {
  if (!val || typeof val !== "string") return "";
  const s = val.trim();
  if (/^[:$](?:[a-zA-Z0-9_]+|\d+)$/.test(s)) {
    return "";
  }
  return s;
}

export default async function handler(req: any, res: any) {
  try {
    const userAgent = (req.headers?.["user-agent"] || "") as string;
    const isCrawler = isSocialCrawler(userAgent);

    // 1. Extract target URL path and query parameters
    const matchedHeader = (
      req.headers?.["x-matched-path"] ||
      req.headers?.["x-vercel-matched-path"] ||
      req.headers?.["x-forwarded-uri"] ||
      req.headers?.["x-original-url"] ||
      ""
    ) as string;

    let targetPath = cleanParam(req.query?.path);
    if (!targetPath && matchedHeader && !matchedHeader.startsWith("/api/")) {
      targetPath = matchedHeader;
    }
    if (!targetPath && typeof req.url === "string") {
      targetPath = req.url.replace(/^\/api\/social-meta(?:\.ts)?(?:\?|$)/, "");
    }
    if (!targetPath) {
      targetPath = req.originalUrl || req.url || "/";
    }

    // 2. Extract voucher / code, examId, submissionId cleanly (ignore placeholders like :code, $1)
    let voucher =
      cleanParam(req.query?.voucher) ||
      cleanParam(req.query?.code) ||
      cleanParam(req.query?.redeem);
    let examId = cleanParam(req.query?.examId) || cleanParam(req.query?.id);
    let submissionId = cleanParam(req.query?.submissionId);

    // Check matchedHeader or targetPath if parameters weren't cleanly extracted
    const pathToCheck = matchedHeader && !matchedHeader.startsWith("/api/") ? matchedHeader : targetPath;
    if (!voucher && pathToCheck) {
      const vMatch = pathToCheck.match(/^\/(?:student\/)?vouchers?\/([^/?#]+)/i);
      if (vMatch) voucher = cleanParam(decodeURIComponent(vMatch[1]));
    }
    if (!examId && pathToCheck) {
      const eMatch = pathToCheck.match(/^\/(?:student\/exam|exam|(?:parent|admin)\/exams)\/([^/?#]+)/i);
      if (eMatch) examId = cleanParam(decodeURIComponent(eMatch[1]));
    }
    if (!submissionId && pathToCheck) {
      const sMatch = pathToCheck.match(/\/(?:result|submissions)\/([^/?#]+)/i);
      if (sMatch) submissionId = cleanParam(decodeURIComponent(sMatch[1]));
    }

    // Replace literal template placeholders in targetPath if present
    if (voucher && /[:$](?:code|1)/i.test(targetPath)) {
      targetPath = targetPath.replace(/[:$](?:code|1)/gi, encodeURIComponent(voucher));
    } else if (voucher && !targetPath.includes("/voucher")) {
      targetPath = `/student/wallet?voucher=${encodeURIComponent(voucher)}`;
    } else if (targetPath.includes("/voucher/") && /[:$](?:code|1)/i.test(targetPath)) {
      targetPath = voucher ? `/voucher/${encodeURIComponent(voucher)}` : "/voucher";
    }

    if (examId && /[:$](?:examId|id|1)/i.test(targetPath)) {
      targetPath = targetPath.replace(/[:$](?:examId|id|1)/gi, encodeURIComponent(examId));
    }
    if (submissionId && /[:$](?:submissionId|2)/i.test(targetPath)) {
      targetPath = targetPath.replace(/[:$](?:submissionId|2)/gi, encodeURIComponent(submissionId));
    }

    if (submissionId && examId && !targetPath.includes("/result") && !targetPath.includes("/submissions")) {
      targetPath = `/student/exam/${encodeURIComponent(examId)}/result/${encodeURIComponent(submissionId)}`;
    } else if (examId && !targetPath.includes("/exam")) {
      targetPath = `/student/exam/${encodeURIComponent(examId)}`;
    }

    // Preserve any extra query parameters like ?v=1 or ?t=... (crucial for Zalo cache-busting)
    const extraQuery = new URLSearchParams();
    if (req.query && typeof req.query === "object") {
      for (const [k, v] of Object.entries(req.query)) {
        const kLower = k.toLowerCase();
        if (
          !["path", "voucher", "code", "redeem", "examid", "id", "submissionid", "codeexamid", "format"].includes(
            kLower
          )
        ) {
          if (typeof v === "string" && v) {
            extraQuery.append(k, v);
          }
        }
      }
    }
    const extraQueryStr = extraQuery.toString();
    if (extraQueryStr && !targetPath.includes("?")) {
      targetPath += `?${extraQueryStr}`;
    } else if (extraQueryStr && targetPath.includes("?")) {
      targetPath += `&${extraQueryStr}`;
    }

    // 3. Compute canonical origin / base URL
    const rawProto = req.headers?.["x-forwarded-proto"];
    let proto =
      (Array.isArray(rawProto) ? rawProto[0] : rawProto) ||
      (req.connection?.encrypted ? "https" : "https");

    const rawHost = req.headers?.["x-forwarded-host"] || req.headers?.["host"];
    let host =
      (Array.isArray(rawHost) ? rawHost[0] : rawHost) ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      process.env.VERCEL_URL ||
      process.env.VITE_APP_URL ||
      "dk-test-v3.vercel.app";

    let hostClean =
      host.startsWith("http://") || host.startsWith("https://")
        ? host.replace(/^https?:\/\//, "")
        : host;

    hostClean = hostClean.split("/")[0].trim();

    // External crawlers (Zalo, Facebook, etc.) can never resolve localhost!
    // In production, or when accessed by crawlers, or if host is localhost, fallback to dk-test-v3.vercel.app
    if (
      (isCrawler || process.env.NODE_ENV === "production" || process.env.VERCEL) &&
      (hostClean.includes("localhost") || hostClean.includes("127.0.0.1") || !hostClean)
    ) {
      hostClean = process.env.VERCEL_PROJECT_PRODUCTION_URL || "dk-test-v3.vercel.app";
    }

    if (isCrawler || hostClean.includes("vercel.app") || !hostClean.includes("localhost")) {
      proto = "https";
    }

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

    // 4. Render dynamic HTML with complete Open Graph / Twitter / Zalo metadata
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
      baseUrl: "https://dk-test-v3.vercel.app",
      isDev: false,
    });
    return res.status(200).send(html);
  }
}
