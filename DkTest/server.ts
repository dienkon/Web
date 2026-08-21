import express from "express";
import path from "path";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import { aiRouter } from "./src/services/ai/aiRouter";
import { renderExamPageHtml } from "./src/services/server/examMetadata";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // AI Router
  app.use("/api/ai", aiRouter);

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
      "localhost:3000";
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
      server: { middlewareMode: true },
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
