import express from "express";
import { adminRouter } from "../../server/adminRoutes.bundled.js";

const app = express();
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, X-Admin-Token, X-Auth-Role");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Mount both on /api/admin and / so it works regardless of Vercel URL rewriting
app.use("/api/admin", adminRouter);
app.use("/", adminRouter);

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, X-Admin-Token, X-Auth-Role");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  return new Promise((resolve) => {
    res.on("finish", () => resolve(undefined));
    res.on("close", () => resolve(undefined));
    app(req, res, (err: any) => {
      if (err) {
        console.error("[Vercel Admin API Uncaught Error]:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "server_error", message: err?.message || String(err) });
        }
      } else if (!res.headersSent) {
        res.status(404).json({ error: "not_found", message: `Không tìm thấy endpoint: ${req.url}` });
      }
      resolve(undefined);
    });
  });
}
