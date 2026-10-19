import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { FALLBACK_QUESTIONS as ACADEMIC_QUESTIONS } from "./src/data/chemistryQuestions";
import { generateStemQuestion } from "./src/data/stemGenerators";
import { cleanAndUpgradeQuestion } from "./src/data/questionCleaner";
import { validateGameAnswer } from "./src/games/registry";
import { EXPANDED_QUESTIONS, getExpandedQuestions } from "./src/data/expandedQuestionBank";
import { sanitizeQuestionForClient, extractMasterSolution, roomSolutionVault, MasterSolution } from "./src/features/security/safeQuestions";
import { getRoomQuestionTimeLimit } from "./src/config/gameConfig";

dotenv.config();

// Simple array shuffle helper
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const STEM_MODES = ['mol_calc', 'math_algebra', 'physics_calc', 'unit_convert', 'science_mcq', 'substance_match'];

// In-memory rate limiter for bug reports (IP based: max 3 requests per 10 mins)
const bugReportLimits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const entry = bugReportLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    bugReportLimits.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (entry.count >= 3) {
    return true;
  }
  entry.count++;
  return false;
}

// Seamless local question generator function
function getFallbackQuestions(mode: string, difficulty: string, count: number, grade?: number) {
  const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];

  // Nếu người dùng chọn ôn tập theo lớp (8 - 12), ưu tiên lấy từ ngân hàng mở rộng GDPT 2018
  if (grade) {
    const matching = getExpandedQuestions({
      grade,
      difficulty: difficulty !== 'random' ? difficulty : undefined,
      mode: (mode !== 'mixed' && mode !== 'ranked_mixed' && mode !== 'stem_mixed') ? mode : undefined
    });
    if (matching.length >= count) {
      return shuffleArray(matching).slice(0, count);
    }
  }

  // STEM Mixed mode (luân phiên toàn bộ các game STEM)
  if (mode === 'stem_mixed') {
    const questions: any[] = [];
    for (let i = 0; i < count; i++) {
      const randomStemMode = STEM_MODES[i % STEM_MODES.length];
      const targetDiff: 'easy' | 'medium' | 'hard' = difficulty === 'random'
        ? difficulties[Math.floor(Math.random() * difficulties.length)]
        : (difficulty as any);
      questions.push(generateStemQuestion(randomStemMode, targetDiff));
    }
    return questions;
  }

  // Chế độ đơn môn STEM sinh theo công thức
  if (STEM_MODES.includes(mode)) {
    const questions: any[] = [];
    for (let i = 0; i < count; i++) {
      const targetDiff: 'easy' | 'medium' | 'hard' = difficulty === 'random'
        ? difficulties[Math.floor(Math.random() * difficulties.length)]
        : (difficulty as any);
      questions.push(generateStemQuestion(mode, targetDiff));
    }
    return questions;
  }

  if (mode === 'ranked_mixed') {
    const modes = ['balance', 'fill_blank', 'compound_name', 'element_quiz', 'oxidation_state'];
    const shuffledModes = shuffleArray([...modes]);
    const questions: any[] = [];
    
    shuffledModes.forEach(m => {
      difficulties.forEach(diff => {
        const list = ACADEMIC_QUESTIONS[m]?.[diff] || ACADEMIC_QUESTIONS[m]?.['medium'] || [];
        if (list.length > 0) {
          const rawQ = list[Math.floor(Math.random() * list.length)];
          questions.push(cleanAndUpgradeQuestion(rawQ, m, diff));
        }
      });
    });

    return questions;
  }
  
  if (mode === 'mixed') {
    const modes = ['balance', 'fill_blank', 'compound_name', 'element_quiz', 'oxidation_state'];
    const questions: any[] = [];
    for (let i = 0; i < count; i++) {
      const randomMode = modes[i % modes.length];
      const targetDiff = difficulty === 'random' ? difficulties[Math.floor(Math.random() * difficulties.length)] : difficulty;
      const list = ACADEMIC_QUESTIONS[randomMode]?.[targetDiff] || ACADEMIC_QUESTIONS[randomMode]?.['medium'] || [];
      if (list.length > 0) {
        const rawQ = list[Math.floor(Math.random() * list.length)];
        questions.push(cleanAndUpgradeQuestion(rawQ, randomMode, targetDiff));
      }
    }
    return questions;
  }
  
  const questions: any[] = [];
  for (let i = 0; i < count; i++) {
    const targetDiff = difficulty === 'random' ? difficulties[Math.floor(Math.random() * difficulties.length)] : difficulty;
    const list = ACADEMIC_QUESTIONS[mode]?.[targetDiff] || ACADEMIC_QUESTIONS[mode]?.['medium'] || [];
    if (list.length > 0) {
      const rawQ = list[Math.floor(Math.random() * list.length)];
      questions.push(cleanAndUpgradeQuestion(rawQ, mode, targetDiff));
    }
  }
  return questions;
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ limit: "5mb", extended: true }));

  const apiRouter = express.Router();

  // API Route for Local Question Generation
  apiRouter.post("/generate-questions", async (req, res) => {
    const { mode, difficulty, count, grade, safe, roomId, customTimeLimitSec, isPractice } = req.body;
    try {
      const questionsData = getFallbackQuestions(mode, difficulty, count || 3, grade ? Number(grade) : undefined);
      
      // Gán thời gian thi đấu chuẩn xác cho từng câu:
      // 1. Nếu là luyện tập Solo và có tùy chỉnh thời gian: áp dụng custom (0 = vô hạn thời gian)
      // 2. Nếu là phòng ghép đấu nhiều người: thời gian phụ thuộc độ khó câu hỏi (Min 45s, Max 120s / 2 phút)
      questionsData.forEach((q) => {
        if (isPractice && customTimeLimitSec !== undefined) {
          q.timeLimitSec = Number(customTimeLimitSec);
        } else {
          q.timeLimitSec = getRoomQuestionTimeLimit(q.mode || mode, q.difficulty || difficulty, q.equation);
        }
      });

      // Chế độ bảo mật: giấu đáp án và lưu lời giải vào kho an toàn
      if (safe && roomId) {
        const solutions: Record<number, MasterSolution> = {};
        questionsData.forEach((q, idx) => {
          solutions[idx + 1] = extractMasterSolution(q);
        });
        roomSolutionVault.setRoomSolutions(roomId, solutions);
        const safeQuestions = questionsData.map(q => sanitizeQuestionForClient(q));
        res.json(safeQuestions);
        return;
      }

      res.json(questionsData);
    } catch (error: any) {
      console.error("Local Question Generation Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API mở đáp án và giải thích cho vòng vừa kết thúc
  apiRouter.post("/reveal-solution", (req, res) => {
    const { roomId, round } = req.body;
    if (!roomId || round === undefined) {
      res.status(400).json({ error: "Thiếu roomId hoặc round" });
      return;
    }
    const sol = roomSolutionVault.getRoundSolution(roomId, Number(round));
    if (!sol) {
      res.status(404).json({ error: "Không tìm thấy đáp án hoặc phòng đã kết thúc." });
      return;
    }
    res.json(sol);
  });

  // API Route for Answer Validation (Server-side validation support)
  apiRouter.post("/validate-answer", (req, res) => {
    const { mode, question, answer } = req.body;
    try {
      const validation = validateGameAnswer(mode, question, answer);
      res.json(validation);
    } catch (error: any) {
      console.error("Answer Validation Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route for Bug Reporting via Discord Webhook with Rate-limit
  apiRouter.post("/report-bug", async (req, res) => {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

    if (isRateLimited(clientIp)) {
      res.status(429).json({ error: "Bạn đã gửi quá nhiều báo cáo. Vui lòng thử lại sau 10 phút." });
      return;
    }

    const { title, description, userEmail, image } = req.body;
    const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";
    const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "dys3wgutz";
    const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || "";

    if (!DISCORD_WEBHOOK_URL) {
      console.warn("DISCORD_WEBHOOK_URL is not set. Bug report skipped.");
      res.status(503).json({ error: "Tính năng báo lỗi chưa được cấu hình webhook trên máy chủ." });
      return;
    }

    try {
      let imageUrl: string | null = null;
      if (image && typeof image === "string" && image.startsWith("data:") && CLOUDINARY_UPLOAD_PRESET) {
        try {
          const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              file: image,
              upload_preset: CLOUDINARY_UPLOAD_PRESET
            })
          });
          if (cloudRes.ok) {
            const cloudData = await cloudRes.json();
            imageUrl = cloudData.secure_url;
            console.log("Cloudinary upload successful! Image URL:", imageUrl);
          } else {
            const errBody = await cloudRes.text().catch(() => "");
            console.error("Cloudinary upload failed with status:", cloudRes.status, "Body:", errBody);
          }
        } catch (cloudinaryErr) {
          console.error("Cloudinary upload error:", cloudinaryErr);
        }
      }

      // Sanitize @everyone and @here mentions
      const cleanTitle = (title || "Báo cáo lỗi mới").replace(/@(everyone|here)/gi, "@\u200b$1");
      const cleanDesc = (description || "Không có mô tả chi tiết.").replace(/@(everyone|here)/gi, "@\u200b$1");

      const payload: any = {
        content: `🚨 **BÁO CÁO LỖI MỚI TỪ CHEMARENA** 🚨`,
        embeds: [{
          title: cleanTitle,
          description: cleanDesc,
          color: 15539236, // Red/rose tone
          fields: [
            { name: "Người gửi", value: userEmail || "Khách / Ẩn danh", inline: true },
            { name: "Thời gian", value: new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) + " (VN)", inline: true }
          ]
        }]
      };

      if (imageUrl) {
        payload.embeds[0].image = { url: imageUrl };
      }

      const response = await fetch(DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Discord returned status ${response.status}`);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Bug report delivery failed:", error);
      res.status(500).json({ error: error.message || "Failed to deliver report" });
    }
  });

  // Mount API router for both direct /api and subpath /dau-truong/api
  app.use("/api", apiRouter);
  app.use("/dau-truong/api", apiRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use('/dau-truong', express.static(distPath));
    app.use(express.static(distPath));
    app.get(['/dau-truong/*', '*'], (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Cổng ${PORT} hiện đang bị chiếm dụng bởi một tiến trình Node khác.`);
      console.error(`👉 Để giải phóng cổng ${PORT}, bạn hãy chạy lệnh trong PowerShell:`);
      console.error(`   Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force\n`);
    } else {
      console.error("Server error:", err);
    }
    process.exit(1);
  });
}

startServer();
