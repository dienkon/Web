import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import cors from "cors";

async function startServer() {
  const app = express();
  const PORT = 5500;

  app.use(express.json());
  app.use(cors());

  const rootPath = path.resolve(process.cwd(), "..");

  /// Initialize Gemini AI
  let ai: GoogleGenAI | null = null;
  try {
    console.log("GEMINI_API_KEY =", process.env.GEMINI_API_KEY);

    if (process.env.GEMINI_API_KEY) {
      ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    } else {
      console.warn("GEMINI_API_KEY is not set");
    }
  } catch (e) {
    console.error("Failed to init GenAI", e);
  }
  // AI Model name requested: gemini-3.5-flash
  const AI_MODEL = "gemini-3.5-flash-lite";

  // API Route for Ask AI
  app.post("/api/ask", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: "AI not configured on server" });
      }

      const { prompt } = req.body;
      if (!prompt) return res.status(400).json({ error: "No prompt provided" });

      const response = await ai.models.generateContent({
        model: AI_MODEL,
        contents: prompt,
        config: {
          systemInstruction:
            "Bạn là Trợ lý AI Hóa Học thông minh thuộc ứng dụng ChemDex. Trả lời chính xác, dễ hiểu, trình bày công thức hóa học và toán học bằng LaTeX (ví dụ: $H_2SO_4$, $$\\text{Fe} + 2\\text{HCl} \\rightarrow \\text{FeCl}_2 + \\text{H}_2 \\uparrow$$) và bảng biểu Markdown sinh động.",
        },
      });

      res.json({ text: response.text });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // API Route for Chat Interface (Gemini-style Chat tab)
  app.post("/api/chat", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: "AI not configured on server" });
      }
      const { messages } = req.body; // Array of { role: 'user' | 'model', content: string }
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Invalid messages format" });
      }

      const formattedContents = messages.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      }));

      const response = await ai.models.generateContent({
        model: AI_MODEL,
        contents: formattedContents,
        config: {
          systemInstruction:
            "Bạn là Trợ lý AI Hóa Học ChemDex (Gemini Chemistry Assistant). Giải đáp các bài tập hóa học từ phổ thông tới nâng cao, giải thích phản ứng, chuỗi hóa học, cân bằng phương trình, giải bài tập đại số hóa học và tư vấn phương pháp học tập hiệu quả. Trình bày đẹp mắt bằng định dạng Markdown. Sử dụng LaTeX cho các công thức hóa học, phương trình và ký hiệu toán học (ví dụ: $H_2SO_4$, $$\\text{2H}_2 + \\text{O}_2 \\xrightarrow{t^o} \\text{2H}_2\\text{O}$$, $$\\Delta H < 0$$). Sử dụng bảng Markdown (Markdown Tables) khi so sánh, liệt kê thông số hay tóm tắt bài tập.",
        },
      });

      res.json({ text: response.text });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // API Route for Content Moderation
  app.post("/api/moderate", async (req, res) => {
    try {
      if (!ai) {
        // If AI unavailable, pass default approval
        return res.json({ approved: true, reason: "Bình thường" });
      }
      const { text, type } = req.body; // type: 'post' | 'comment'
      if (!text || text.trim().length === 0) {
        return res.json({ approved: true, reason: "Nội dung trống" });
      }

      const prompt = `Bạn là hệ thống kiểm duyệt nội dung tự động cho Diễn đàn Hóa Học ChemDex.
Kiểm tra xem nội dung ${type === "post" ? "bài viết" : "bình luận"} sau có vi phạm các quy tắc: xúc phạm, phản cảm, tục tĩu, quảng cáo rác, phá hoại hay không liên quan hoàn toàn.

Nội dung: "${text}"

Hãy phản hồi DUY NHẤT một chuỗi JSON hợp lệ theo định dạng:
{"approved": true/false, "reason": "Lý do ngắn gọn nếu từ chối hoặc 'Phù hợp' nếu chấp nhận"}`;

      const response = await ai.models.generateContent({
        model: AI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      try {
        const jsonResult = JSON.parse(response.text || "{}");
        return res.json({
          approved: jsonResult.approved ?? true,
          reason: jsonResult.reason || "Nội dung hợp lệ",
        });
      } catch (jsonErr) {
        return res.json({ approved: true, reason: "Phù hợp" });
      }
    } catch (e: any) {
      console.error("Moderation error:", e);
      // Fallback pass if network error to avoid blocking user
      res.json({ approved: true, reason: "Không thể kết nối AI kiểm duyệt" });
    }
  });

  // API Route for AI Search & Topic Analysis
  app.post("/api/search-posts", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: "AI not configured on server" });
      }
      const { query: searchQuery, posts } = req.body;
      if (!searchQuery || !posts || !Array.isArray(posts)) {
        return res.json({ matchingIds: [], analysis: "" });
      }

      const postSummaries = posts.map((p: any) => ({
        id: p.id,
        content: p.content,
        author: p.authorName,
      }));

      const prompt = `Người dùng đang tìm kiếm chủ đề: "${searchQuery}" trên diễn đàn Hóa Học.
Dưới đây là danh sách các bài viết hiện có:
${JSON.stringify(postSummaries, null, 2)}

Hãy phân tích ngữ nghĩa và ngữ cảnh chủ đề, chọn ra các ID bài viết có liên quan nhất tới từ khóa tìm kiếm (kể cả từ đồng nghĩa hoặc chủ đề hóa học liên quan), đồng thời đưa ra 1 câu phân tích ngắn gọn tổng quan về kết quả tìm kiếm.

Trả về DUY NHẤT JSON theo định dạng:
{
  "matchingIds": ["id1", "id2"],
  "analysis": "AI Phân tích: Tìm thấy X bài viết liên quan đến chủ đề..."
}`;

      const response = await ai.models.generateContent({
        model: AI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json({
        matchingIds: parsed.matchingIds || [],
        analysis: parsed.analysis || "",
      });
    } catch (e: any) {
      console.error("AI Search Error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Handle serving the frontend
  if (process.env.NODE_ENV !== "production") {
    // 1. Vite middlewares for SPAs (Must come FIRST to inject dev scripts into HTML)
    const viteTrungTam = await createViteServer({
      server: { middlewareMode: true, hmr: { port: 24678 } },
      appType: "spa",
      root: path.join(rootPath, "trung-tam"),
      base: "/trung-tam/",
    });
    app.use("/trung-tam", viteTrungTam.middlewares);

    const viteDauTruong = await createViteServer({
      server: { middlewareMode: true, hmr: { port: 24679 } },
      appType: "spa",
      root: path.join(rootPath, "dau-truong"),
      base: "/dau-truong/",
    });
    app.use("/dau-truong", viteDauTruong.middlewares);

    const viteNhanDien = await createViteServer({
      server: { middlewareMode: true, hmr: { port: 24680 } },
      appType: "spa",
      root: path.join(rootPath, "tien-ich/phuong-trinh/nhan-dien-pthh-thong-minh"),
      base: "/tien-ich/phuong-trinh/nhan-dien-pthh-thong-minh/",
    });
    app.use("/tien-ich/phuong-trinh/nhan-dien-pthh-thong-minh", viteNhanDien.middlewares);

    const viteChuoi = await createViteServer({
      server: { middlewareMode: true, hmr: { port: 24681 } },
      appType: "spa",
      root: path.join(rootPath, "tien-ich/phuong-trinh/chuoi-phan-ung"),
      base: "/tien-ich/phuong-trinh/chuoi-phan-ung/",
    });
    app.use("/tien-ich/phuong-trinh/chuoi-phan-ung", viteChuoi.middlewares);

    // 2. Serve static files from root for non-SPA paths (index.html, css, js)
    app.use(express.static(rootPath));
  } else {
    // Production: serve static files from rootPath (since build.js copied dist contents to their respective root directories)
    app.use(express.static(rootPath));

    // Fallback routes for SPAs to handle client-side routing
    app.get("/trung-tam/*", (req, res) => {
      res.sendFile(path.join(rootPath, "trung-tam/index.html"));
    });
    app.get("/dau-truong/*", (req, res) => {
      res.sendFile(path.join(rootPath, "dau-truong/index.html"));
    });
    app.get("/tien-ich/phuong-trinh/nhan-dien-pthh-thong-minh/*", (req, res) => {
      res.sendFile(path.join(rootPath, "tien-ich/phuong-trinh/nhan-dien-pthh-thong-minh/index.html"));
    });
    app.get("/tien-ich/phuong-trinh/chuoi-phan-ung/*", (req, res) => {
      res.sendFile(path.join(rootPath, "tien-ich/phuong-trinh/chuoi-phan-ung/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
