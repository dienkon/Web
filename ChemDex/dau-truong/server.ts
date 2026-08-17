import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { FALLBACK_QUESTIONS as ACADEMIC_QUESTIONS } from "./src/data/chemistryQuestions";

dotenv.config();

// Comprehensive Chemistry Fallback Database for absolute robust performance

// Simple array shuffle helper
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Seamless local question generator function
function getFallbackQuestions(mode: string, difficulty: string, count: number) {
  const difficulties = ['easy', 'medium', 'hard'];

  if (mode === 'ranked_mixed') {
    const modes = ['balance', 'fill_blank', 'compound_name', 'element_quiz', 'oxidation_state'];
    const shuffledModes = shuffleArray([...modes]);
    const questions: any[] = [];
    
    shuffledModes.forEach(m => {
      difficulties.forEach(diff => {
        const list = ACADEMIC_QUESTIONS[m]?.[diff] || ACADEMIC_QUESTIONS[m]?.['medium'] || [];
        if (list.length > 0) {
          questions.push({
            ...list[Math.floor(Math.random() * list.length)],
            mode: m,
            difficulty: diff
          });
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
        const q = { ...list[Math.floor(Math.random() * list.length)], mode: randomMode, difficulty: targetDiff };
        questions.push(q);
      }
    }
    return questions;
  }
  
  const questions: any[] = [];
  for (let i = 0; i < count; i++) {
    const targetDiff = difficulty === 'random' ? difficulties[Math.floor(Math.random() * difficulties.length)] : difficulty;
    const list = ACADEMIC_QUESTIONS[mode]?.[targetDiff] || ACADEMIC_QUESTIONS[mode]?.['medium'] || [];
    if (list.length > 0) {
      questions.push({ ...list[Math.floor(Math.random() * list.length)], mode, difficulty: targetDiff });
    }
  }
  return questions;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ limit: "20mb", extended: true }));

  // API Route for Local Question Generation
  app.post("/api/generate-questions", async (req, res) => {
    const { mode, difficulty, count } = req.body;
    try {
      const questionsData = getFallbackQuestions(mode, difficulty, count || 3);
      res.json(questionsData);
    } catch (error: any) {
      console.error("Local Question Generation Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route for Bug Reporting via Discord Webhook
  app.post("/api/report-bug", async (req, res) => {
    const { title, description, userEmail, image } = req.body;
    const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1536400377308782744/lWvQFo1XH84KCi5AJcQBx-xgPq_fZJ9opwvrXdh9oGulx2Oy0_dYXFtmfZFgvbBEaP6K";

    try {
      let imageUrl: string | null = null;
      if (image && typeof image === "string" && image.startsWith("data:")) {
        try {
          const cloudRes = await fetch("https://api.cloudinary.com/v1_1/dys3wgutz/image/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              file: image,
              upload_preset: "comic_raw_files_preset"
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

      const payload: any = {
        content: `🚨 **BÁO CÁO LỖI MỚI TỪ CHEMARENA** 🚨`,
        embeds: [{
          title: title || "Báo cáo lỗi mới",
          description: description || "Không có mô tả chi tiết.",
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
