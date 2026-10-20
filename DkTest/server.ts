import "dotenv/config";
import http from "http";
import express from "express";
import path from "path";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import { aiRouter } from "./src/services/ai/aiRouter.js";
import { renderExamPageHtml } from "./src/services/server/examMetadata.js";
import {
  renderSocialPageHtml,
  resolveSocialMetadataForUrl,
  isSocialCrawler,
} from "./src/services/server/socialMetadata.js";
import { adminRouter } from "./server/routes/adminRoutes.js";
import { authRouter } from "./server/routes/authRoutes.js";
import { walletRouter } from "./server/routes/walletRoutes.js";
import { webImporterRouter } from "./server/routes/webImporterRoutes.js";
import { initFirebaseAdmin } from "./server/firebaseAdmin.js";
import { codeStudioRouter, handleStudioSharePage } from './server/routes/codeStudioRoutes.js';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3636;
  const httpServer = http.createServer(app);

  // Global CORS Middleware (Handles preflight OPTIONS and prevents Failed to fetch)
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, Accept, X-Admin-Token, X-Auth-Role, Cache-Control, Pragma"
    );
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use('/api/code-studio', codeStudioRouter);
  app.get('/code/:slug', handleStudioSharePage);
  app.get('/s/:slug', handleStudioSharePage);

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

  // Wallet and Exam Unlock Router
  app.use("/api", walletRouter);

  // Web to DkTEST Importer Router
  app.use("/api/web-importer", webImporterRouter);

  // Question error report handler (proxies securely to Discord)
  app.post("/api/report-question", async (req, res) => {
    const { examTitle, examCode, studentEmail, questionIndex, originalIndex, questionText, reason } = req.body || {};
    if (!reason || typeof reason !== "string") {
      return res.status(400).json({ error: "missing_reason", message: "Vui lòng nhập lý do báo cáo." });
    }
    const webhookUrl =
      process.env.DISCORD_REPORT_WEBHOOK_URL ||
      "https://discord.com/api/webhooks/1500812404190085120/R1oclYbsjomTS5AUdbVkCD1hw1FqZZhb8LzvrfsyJVozADVmXWDlf4Mk3HlGUKqRI8zn";

    const payload = {
      embeds: [
        {
          title: "🚩 BÁO CÁO CÂU HỎI BÀI THI CÓ LỖI",
          color: 15158332,
          fields: [
            {
              name: "📌 Thông tin bài thi",
              value: `**Tên:** ${examTitle || "N/A"}\n**Mã đề:** \`${examCode || "N/A"}\``,
              inline: false,
            },
            {
              name: "👤 Thí sinh báo cáo",
              value: `\`${studentEmail || "Thí sinh"}\``,
              inline: true,
            },
            {
              name: "🔢 Vị trí câu hỏi",
              value: `Đề hiện tại: **Câu ${(questionIndex ?? 0) + 1}**\nĐề gốc: **Câu ${(originalIndex ?? 0) + 1}**`,
              inline: true,
            },
            {
              name: "❓ Nội dung câu hỏi",
              value: questionText ? String(questionText).substring(0, 300) : "(Trống)",
              inline: false,
            },
            {
              name: "📝 Lý do báo cáo từ thí sinh",
              value: String(reason).trim().substring(0, 500),
              inline: false,
            },
          ],
          footer: {
            text: "Hệ thống báo cáo tự động DkTEST",
          },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    try {
      const resp = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        throw new Error(`Discord Webhook HTTP ${resp.status}`);
      }
      return res.status(200).json({ success: true, message: "Đã gửi báo cáo thành công!" });
    } catch (err: any) {
      console.error("[server.ts] Failed to forward Discord webhook:", err);
      return res.status(500).json({ error: "discord_error", message: "Không thể gửi báo cáo tới Discord." });
    }
  });

  // Direct API handler for /api/meta (returns JSON or HTML metadata)
  const directApiMetaHandler = async (
    req: express.Request,
    res: express.Response,
  ) => {
    const targetUrl = (req.query?.url || req.query?.path || "/") as string;
    const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const host =
      req.headers["x-forwarded-host"] ||
      req.headers["host"] ||
      `localhost:${PORT}`;
    const baseUrl = `${proto}://${host}`;

    if (req.query?.format === "json") {
      const meta = await resolveSocialMetadataForUrl({ url: targetUrl, baseUrl });
      return res.json(meta);
    }

    const { html, status } = await renderSocialPageHtml({
      url: targetUrl,
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

  // Direct API handler for /api/voucher-meta
  const directApiVoucherMetaHandler = async (
    req: express.Request,
    res: express.Response,
  ) => {
    const code = (req.query?.code || req.query?.voucher || "") as string;
    const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const host =
      req.headers["x-forwarded-host"] ||
      req.headers["host"] ||
      `localhost:${PORT}`;
    const baseUrl = `${proto}://${host}`;
    const targetUrl = `/student/wallet?voucher=${encodeURIComponent(code)}`;

    if (req.query?.format === "json") {
      const meta = await resolveSocialMetadataForUrl({ url: targetUrl, baseUrl });
      return res.json(meta);
    }

    const { html, status } = await renderSocialPageHtml({
      url: targetUrl,
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

  app.get("/api/meta", directApiMetaHandler);
  app.get("/api/voucher-meta", directApiVoucherMetaHandler);
  app.get("/api/ai/exam-meta", directApiExamMetaHandler);
  app.get("/api/exam-meta", directApiExamMetaHandler);

  // 404 handler for API routes (prevent falling through to Vite SPA proxy loop)
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "not_found", message: `API endpoint ${req.method} ${req.originalUrl} không tồn tại.` });
  });

  // Dynamic Open Graph & Social Preview Route handler
  const handleSocialMetaRoute = async (
    req: express.Request,
    res: express.Response,
    vite?: any,
  ) => {
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

      const { html, status } = await renderSocialPageHtml({
        url: req.originalUrl || req.url,
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
      console.error("[server.ts] Error rendering dynamic social page:", err);
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

  const socialPreviewRoutes = [
    "/voucher/:code",
    "/vouchers/:code",
    "/student/voucher/:code",
    "/voucher",
    "/vouchers",
    "/student/voucher",
    "/student/wallet",
    "/wallet",
    "/student/exam/:examId/result/:submissionId",
    "/parent/exams/:examId/submissions/:submissionId",
    "/admin/exams/:examId/submissions/:submissionId",
    "/student/exam/:examId/take",
    "/student/exam/:examId",
    "/exam/:examId",
    "/parent/exams/:examId",
    "/code-exam/:id",
    "/student/journey",
    "/journey",
    "/student/escape-room",
    "/escape-room",
    "/student/practice",
    "/practice",
    "/student/community",
    "/student/ai-tutor",
    "/ai-tutor",
    "/student/history",
    "/student/profile",
    "/student/tutorial/exam",
    "/student/tutorial/result",
    "/parent/dashboard",
    "/exams",
    "/login",
    "/register",
    "/legal-policy",
  ];

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: "spa",
    });

    // Explicit social routes in development
    socialPreviewRoutes.forEach((route) => {
      app.get(route, (req, res, next) => {
        // If crawler or query includes voucher/code or specific link
        const userAgent = req.headers["user-agent"] || "";
        const hasVoucherQuery = Boolean(
          req.query?.voucher || req.query?.code || req.query?.redeem
        );
        if (
          isSocialCrawler(userAgent) ||
          hasVoucherQuery ||
          route.includes("/voucher") ||
          route.includes("/result")
        ) {
          return handleSocialMetaRoute(req, res, vite);
        }
        next();
      });
    });

    // Detect crawlers for any other path in dev mode
    app.use((req, res, next) => {
      const userAgent = req.headers["user-agent"] || "";
      if (
        req.method === "GET" &&
        isSocialCrawler(userAgent) &&
        !req.path.startsWith("/@") &&
        !req.path.startsWith("/node_modules") &&
        !req.path.startsWith("/src")
      ) {
        return handleSocialMetaRoute(req, res, vite);
      }
      next();
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");

    // Dynamic Open Graph metadata routes in production
    socialPreviewRoutes.forEach((route) => {
      app.get(route, (req, res) => handleSocialMetaRoute(req, res));
    });

    app.use(express.static(distPath));

    app.get("*", (req, res) => {
      const userAgent = req.headers["user-agent"] || "";
      // If a social crawler requests ANY page or if query has voucher/code, render dynamic OG tags
      const hasVoucherQuery = Boolean(
        req.query?.voucher || req.query?.code || req.query?.redeem
      );
      if (isSocialCrawler(userAgent) || hasVoucherQuery) {
        return handleSocialMetaRoute(req, res);
      }
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
