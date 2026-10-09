import express from "express";
import { aiRouter } from "../../src/services/ai/aiRouter.js";
import { renderExamPageHtml } from "../../src/services/server/examMetadata.js";

/**
 * One Vercel Function handles every /api/ai/* endpoint.
 *
 * Keep bodyParser disabled at the Vercel adapter so multipart uploads can be
 * consumed by multer in aiRouter. Express parses JSON and urlencoded payloads.
 */
export const config = { api: { bodyParser: false } };
export const maxDuration = 300;

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

async function serveExamMeta(req: any, res: any) {
  const queryValue = req.query?.examId ?? req.query?.id;
  let examId = typeof queryValue === "string"
    ? queryValue
    : Array.isArray(queryValue) && typeof queryValue[0] === "string"
      ? queryValue[0]
      : "";

  if (!examId && typeof req.url === "string") {
    const match = req.url.match(/\/student\/exam\/([^/?#]+)/);
    if (match) examId = match[1];
  }

  const forwardedProto = req.headers?.["x-forwarded-proto"];
  const proto = String(forwardedProto || "https").split(",")[0].trim();
  const forwardedHost = req.headers?.["x-forwarded-host"];
  const hostHeader = req.headers?.["host"];
  const rawHost = forwardedHost || hostHeader || process.env.VERCEL_URL ||
    process.env.VITE_APP_URL || "localhost:" + (process.env.PORT || "3636");
  const host = String(rawHost)
    .replace(/^https?:\/\//i, "")
    .split(",")[0]
    .trim();
  const baseUrl = (proto === "http" ? "http" : "https") + "://" + host;

  try {
    const { html, status } = await renderExamPageHtml({
      examId,
      baseUrl,
      isDev: false,
    });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res.status(status).send(html);
  } catch (error: any) {
    console.error("[api/ai/exam-meta] Failed to render exam metadata:", error);
    try {
      const { html } = await renderExamPageHtml({
        examId: "",
        baseUrl: "https://dktest.vn",
        isDev: false,
      });
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(500).send(html);
    } catch (fallbackError) {
      console.error("[api/ai/exam-meta] Fallback rendering failed:", fallbackError);
      return res.status(500).type("text/plain").send("Unable to render exam metadata.");
    }
  }
}

// The rewrite for /student/exam/:examId targets /api/ai/exam-meta.
// Register both forms because some Vercel adapters expose a function-relative URL.
app.get("/api/ai/exam-meta", serveExamMeta);
app.get("/exam-meta", serveExamMeta);

// Keep the existing AI router as the single source of truth for AI endpoints.
// Mount both prefixes to tolerate either full-path or function-relative req.url.
app.use("/api/ai", aiRouter);
app.use("/", aiRouter);

app.use((req, res) => {
  res.status(404).json({
    error: "not_found",
    message: "AI endpoint not found: " + req.method + " " + req.originalUrl,
  });
});

app.use((error: any, req: any, res: any, next: any) => {
  console.error("[Vercel AI API] Unhandled error:", error);
  if (res.headersSent) return next(error);
  return res.status(500).json({
    error: "server_error",
    message: error instanceof Error ? error.message : String(error),
  });
});

export default function handler(req: any, res: any) {
  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    res.once("finish", finish);
    res.once("close", finish);

    app(req, res, (error: any) => {
      if (error) {
        console.error("[Vercel AI API] Adapter error:", error);
        if (!res.headersSent && !res.writableEnded) {
          res.status(500).json({
            error: "server_error",
            message: error instanceof Error ? error.message : String(error),
          });
        } else if (!res.writableEnded) {
          res.end();
        }
      } else if (!res.headersSent && !res.writableEnded) {
        res.status(404).json({
          error: "not_found",
          message: "AI endpoint not found: " + req.method + " " + req.url,
        });
      }
      finish();
    });
  });
}
