import {
  renderSocialPageHtml,
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

    const matchedHeader = (
      req.headers?.["x-matched-path"] ||
      req.headers?.["x-vercel-matched-path"] ||
      req.headers?.["x-forwarded-uri"] ||
      req.headers?.["x-original-url"] ||
      ""
    ) as string;

    // 1. Extract parameters cleanly
    let voucher =
      cleanParam(req.query?.voucher) ||
      cleanParam(req.query?.code) ||
      cleanParam(req.query?.redeem);
    let examId = cleanParam(req.query?.examId) || cleanParam(req.query?.id);
    let submissionId = cleanParam(req.query?.submissionId);

    let targetUrl = cleanParam(req.query?.path);
    if (!targetUrl && matchedHeader && !matchedHeader.startsWith("/api/")) {
      targetUrl = matchedHeader;
    }

    const pathToCheck = matchedHeader && !matchedHeader.startsWith("/api/") ? matchedHeader : targetUrl;
    if (!examId && pathToCheck) {
      const eMatch = pathToCheck.match(/^\/(?:student\/exam|exam|(?:parent|admin)\/exams)\/([^/?#]+)/i);
      if (eMatch) examId = cleanParam(decodeURIComponent(eMatch[1]));
    }
    if (!submissionId && pathToCheck) {
      const sMatch = pathToCheck.match(/\/(?:result|submissions)\/([^/?#]+)/i);
      if (sMatch) submissionId = cleanParam(decodeURIComponent(sMatch[1]));
    }

    if (examId && /[:$](?:examId|id|1)/i.test(targetUrl)) {
      targetUrl = targetUrl.replace(/[:$](?:examId|id|1)/gi, encodeURIComponent(examId));
    }
    if (submissionId && /[:$](?:submissionId|2)/i.test(targetUrl)) {
      targetUrl = targetUrl.replace(/[:$](?:submissionId|2)/gi, encodeURIComponent(submissionId));
    }

    if (!targetUrl) {
      if (submissionId && examId) {
        targetUrl = `/student/exam/${encodeURIComponent(examId)}/result/${encodeURIComponent(submissionId)}`;
      } else if (voucher) {
        targetUrl = `/student/wallet?voucher=${encodeURIComponent(voucher)}`;
      } else if (examId) {
        targetUrl = `/student/exam/${encodeURIComponent(examId)}`;
      } else if (typeof req.url === "string") {
        const examMatch = req.url.match(/\/(?:student\/)?exam\/([^/?#]+)/);
        if (examMatch) {
          targetUrl = `/student/exam/${cleanParam(examMatch[1]) || ""}`;
        }
      }
    }

    if (!targetUrl || targetUrl === "/student/exam/" || targetUrl === "/exam/") {
      targetUrl = examId ? `/student/exam/${encodeURIComponent(examId)}` : "/exams";
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
    if (extraQueryStr && !targetUrl.includes("?")) {
      targetUrl += `?${extraQueryStr}`;
    } else if (extraQueryStr && targetUrl.includes("?")) {
      targetUrl += `&${extraQueryStr}`;
    }

    // 2. Compute canonical origin / base URL
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

    // 3. Render dynamic HTML with complete Open Graph / Twitter / Zalo metadata
    const { html, status } = await renderSocialPageHtml({
      url: targetUrl,
      baseUrl,
      isDev: false,
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300",
    );
    return res.status(status).send(html);
  } catch (err: any) {
    console.error("[api/exam-meta] Error processing request:", err);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    const { html } = await renderSocialPageHtml({
      url: "/",
      baseUrl: "https://dk-test-v3.vercel.app",
      isDev: false,
    });
    return res.status(200).send(html);
  }
}
