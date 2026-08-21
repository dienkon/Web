import { renderExamPageHtml } from "../../src/services/server/examMetadata";

export default async function handler(req: any, res: any) {
  try {
    // 1. Extract examId from query or path
    let examId = (req.query?.examId || req.query?.id || "") as string;

    if (!examId && typeof req.url === "string") {
      const match = req.url.match(/\/student\/exam\/([^/?#]+)/);
      if (match) {
        examId = match[1];
      }
    }

    if (!examId) {
      examId = "";
    }

    // 2. Compute canonical origin / base URL
    const proto =
      req.headers?.["x-forwarded-proto"] ||
      (req.connection?.encrypted ? "https" : "https");
    const host =
      req.headers?.["x-forwarded-host"] ||
      req.headers?.["host"] ||
      process.env.VERCEL_URL ||
      process.env.VITE_APP_URL ||
      "localhost:3000";

    const hostClean =
      host.startsWith("http://") || host.startsWith("https://")
        ? host.replace(/^https?:\/\//, "")
        : host;

    const baseUrl = `${proto}://${hostClean}`;

    // 3. Render dynamic HTML with real Open Graph / Twitter metadata
    const { html, status } = await renderExamPageHtml({
      examId,
      baseUrl,
      isDev: false,
    });

    // 4. Send response with appropriate caching
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300",
    );
    return res.status(status).send(html);
  } catch (err: any) {
    console.error("[api/exam-meta] Error processing request:", err);

    // Fallback safe HTML on unexpected error
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(500).send(`<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <title>DkTEST - Bài kiểm tra</title>
    <meta name="description" content="Tham gia bài kiểm tra trên DkTEST" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="DkTEST - Bài kiểm tra" />
    <meta property="og:description" content="Tham gia bài kiểm tra trên DkTEST" />
    <meta property="og:site_name" content="DkTEST" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`);
  }
}
