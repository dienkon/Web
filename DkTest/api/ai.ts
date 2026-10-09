import express from "express";
import { aiRouter } from "../server/aiRoutes.bundled.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

export const maxDuration = 60;

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, X-Admin-Token, X-Auth-Role, X-Gemini-Api-Key, Cache-Control, Pragma, Expires"
  );
  res.setHeader("X-Accel-Buffering", "no");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Normalize URL in case of Vercel rewrite parameter
app.use((req, res, next) => {
  const match = req.query?.match;
  if (typeof match === "string" && match) {
    const targetPath = match.startsWith("/") ? match : `/${match}`;
    if (!req.url.startsWith(`/api/ai${targetPath}`) && !req.url.startsWith(targetPath)) {
      req.url = targetPath;
    }
  } else if (Array.isArray(match) && match.length > 0) {
    const targetPath = `/${match.join("/")}`;
    if (!req.url.startsWith(`/api/ai${targetPath}`) && !req.url.startsWith(targetPath)) {
      req.url = targetPath;
    }
  }
  next();
});

// Support both /api/ai and / prefixes
app.use("/api/ai", aiRouter);
app.use("/", aiRouter);

export default function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, X-Admin-Token, X-Auth-Role, X-Gemini-Api-Key, Cache-Control, Pragma, Expires"
  );
  res.setHeader("X-Accel-Buffering", "no");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  return new Promise((resolve) => {
    res.on("finish", () => resolve(undefined));
    res.on("close", () => resolve(undefined));
    app(req, res, (err: any) => {
      if (err) {
        console.error("[Vercel AI API Uncaught Error]:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "server_error", message: err?.message || String(err) });
        }
      } else if (!res.headersSent) {
        res.status(404).json({ error: "not_found", message: `Không tìm thấy endpoint AI: ${req.url}` });
      }
      resolve(undefined);
    });
  });
}
