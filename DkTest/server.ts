import "dotenv/config";
import http from "http";
import express from "express";
import path from "path";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import { aiRouter } from "./src/services/ai/aiRouter";
import { renderExamPageHtml } from "./src/services/server/examMetadata";
import { adminRouter } from "./server/routes/adminRoutes";
import { authRouter } from "./server/routes/authRoutes";
import { initFirebaseAdmin } from "./server/firebaseAdmin";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3636;
  const httpServer = http.createServer(app);

  // Global CORS Middleware (Handles preflight OPTIONS and prevents Failed to fetch)
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/health/firebase", (req, res) => {
    const { isConfigured } = initFirebaseAdmin();
    res.json({
      status: "ok",
      firebaseAdminConfigured: isConfigured,
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "exam-fd7a1",
      timestamp: new Date().toISOString(),
    });
  });

  // Authentication API routes (Username & Password, checks, claims)
  app.use("/api/auth", authRouter);

  // Admin privileged API routes
  app.use("/api/admin", adminRouter);

  // AI Router
  app.use("/api/ai", aiRouter);

  // Direct API handler for /api/ai/exam-meta and /api/exam-meta
  const directApiExamMetaHandler = async (
    req: express.Request,
    res: express.Response,
  ) => {
    let examId = (req.query?.examId || req.query?.id || "") as string;
    const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const host =
      req.headers["x-forwarded-host"] ||
      req.headers["host"] ||
      `localhost:${PORT}`;
    const baseUrl = `${proto}://${host}`;

    const { html, status } = await renderExamPageHtml({
      examId,
      baseUrl,
      isDev: process.env.NODE_ENV !== "production",
    });

    res.status(status);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300",
    );
    return res.send(html);
  };

  app.get("/api/ai/exam-meta", directApiExamMetaHandler);
  app.get("/api/exam-meta", directApiExamMetaHandler);

  // 404 handler for API routes (prevent falling through to Vite SPA proxy loop)
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "not_found", message: `API endpoint ${req.method} ${req.originalUrl} không tồn tại.` });
  });

  // Dynamic Exam Open Graph & Social Preview Route handler
  const handleExamMetaRoute = async (
    req: express.Request,
    res: express.Response,
    vite?: any,
  ) => {
    const examId = req.params.examId;
    const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const host =
      req.headers["x-forwarded-host"] ||
      req.headers["host"] ||
      `localhost:${PORT}`;
    const baseUrl = `${proto}://${host}`;

    try {
      let customTemplate = "";
      if (vite) {
        const rawIndex = fs.readFileSync(
          path.join(process.cwd(), "index.html"),
          "utf-8",
        );
        customTemplate = await vite.transformIndexHtml(
          req.originalUrl,
          rawIndex,
        );
      }

      const { html, status } = await renderExamPageHtml({
        examId,
        baseUrl,
        isDev: process.env.NODE_ENV !== "production",
        customTemplate,
      });

      res.status(status);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader(
        "Cache-Control",
        "public, s-maxage=60, stale-while-revalidate=300",
      );
      return res.send(html);
    } catch (err) {
      console.error("[server.ts] Error rendering dynamic exam page:", err);
      if (vite) {
        try {
          const raw = fs.readFileSync(
            path.join(process.cwd(), "index.html"),
            "utf-8",
          );
          const transformed = await vite.transformIndexHtml(
            req.originalUrl,
            raw,
          );
          return res
            .status(200)
            .set({ "Content-Type": "text/html" })
            .end(transformed);
        } catch (e) {}
      }
      const distPath = path.join(process.cwd(), "dist");
      return res.sendFile(path.join(distPath, "index.html"));
    }
  };

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: "spa",
    });

    // Dynamic Open Graph metadata route in dev mode
    app.get("/student/exam/:examId", (req, res) =>
      handleExamMetaRoute(req, res, vite),
    );

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");

    // Dynamic Open Graph metadata route in production
    app.get("/student/exam/:examId", (req, res) =>
      handleExamMetaRoute(req, res),
    );

    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\n❌ [Lỗi Cổng] Cổng ${PORT} hiện đang được sử dụng bởi một tiến trình khác.`);
      console.error(`👉 Hãy chạy lệnh sau trên PowerShell để giải phóng cổng 3636:`);
      console.error(`   Get-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess | Stop-Process -Force\n`);
      process.exit(1);
    } else {
      console.error("❌ [Lỗi Khởi Động Server]", err);
    }
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 Server đang chạy tại http://localhost:${PORT}`);
  });
}

startServer();
