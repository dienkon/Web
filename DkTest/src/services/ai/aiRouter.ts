import express from "express";
import multer from "multer";
import { parseDocxFile, processExamInChunks, processExamFromPromptStream } from "./aiExamGenerator.js";
import { askTutor } from "./aiTutor.js";
import { analyzeExamPerformance, analyzeStructuredExamPerformance } from "./aiAnalytics.js";
import { lookupAndTranslate } from "./aiLookup.js";
import { selectReviewQuestionsWithAi } from "./aiReviewSelector.js";
import { askAdminAssistant } from "./aiAdminAssistant.js";
import { generateStudioChanges } from '../../../server/codeStudioAi.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

export const aiRouter = express.Router();
const studioAiCalls = new Map<string, number>();
aiRouter.post('/code-studio', async (req, res) => {
  const ip = req.ip || 'unknown';
  if ((studioAiCalls.get(ip) || 0) > Date.now() - 2500) return res.status(429).json({ error: 'Vui lòng đợi vài giây trước khi gửi lệnh tiếp.' });
  if (studioAiCalls.size > 2000) studioAiCalls.clear();
  studioAiCalls.set(ip, Date.now());
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55000);
  const cancel = () => { if (!res.writableEnded) controller.abort(); };
  res.on('close', cancel);
  try {
    const streaming = req.get('accept')?.includes('application/x-ndjson');
    const emit = (event: unknown) => { if (!res.destroyed && !res.writableEnded) res.write(JSON.stringify(event) + '\n'); };
    const result = await generateStudioChanges(req.body, req.headers['x-gemini-api-key'] as string, controller.signal, streaming ? text => {
      if (!res.headersSent) { res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8'); res.setHeader('Cache-Control', 'no-store, no-transform'); res.setHeader('X-Accel-Buffering', 'no'); }
      emit({ type: 'delta', text });
    } : undefined);
    if (!controller.signal.aborted) { if (streaming) { if (!res.headersSent) res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8'); emit({ type:'done', ...result }); res.end(); } else res.json(result); }
    else if (!res.destroyed) { emit({ type:'error', error:'AI đã dừng hoặc hết thời gian xử lý.' }); res.end(); }
  } catch (error: any) {
    if (!res.headersSent && !res.destroyed) res.status(error.status || (controller.signal.aborted ? 504 : 400)).json({ error: controller.signal.aborted ? 'AI hết thời gian xử lý. Hãy chia yêu cầu thành bước nhỏ hơn.' : error.message || 'Không thể sửa code bằng AI.' });
    else if (!res.destroyed) { res.write(JSON.stringify({ type:'error', error: controller.signal.aborted ? 'AI hết thời gian xử lý.' : error.message || 'Không thể sửa code bằng AI.' }) + '\n'); res.end(); }
  } finally { clearTimeout(timer); res.off('close', cancel); }
});

// 1. Generate Exam from Word (Streaming SSE)
aiRouter.post("/generate-exam-stream", upload.single("file"), async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    if (!req.file) {
      res.write(`data: ${JSON.stringify({ type: "error", message: "No file uploaded" })}\n\n`);
      res.end();
      return;
    }
    
    res.write(`data: ${JSON.stringify({ type: "info", message: "Đang đọc nội dung file Word..." })}\n\n`);
    
    const htmlContent = await parseDocxFile(req.file.buffer);
    
    const result = await processExamInChunks(htmlContent, (progressMsg) => {
      res.write(`data: ${progressMsg}\n\n`);
    });
    
    res.write(`data: ${JSON.stringify({ type: "done", result })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error("Error generating exam from document:", err);
    res.write(`data: ${JSON.stringify({ type: "error", message: err.message || "Failed to generate exam" })}\n\n`);
    res.end();
  }
});

// 2. Generate Exam from Prompt (Streaming SSE)
aiRouter.post("/generate-exam-prompt-stream", express.json(), async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const { prompt, apiKey } = req.body;
    const customApiKey = (req.headers["x-gemini-api-key"] as string) || apiKey;
    if (!prompt) {
      res.write(`data: ${JSON.stringify({ type: "error", message: "No prompt provided" })}\n\n`);
      res.end();
      return;
    }
    
    const result = await processExamFromPromptStream(prompt, (progressMsg) => {
      res.write(`data: ${progressMsg}\n\n`);
    }, customApiKey);
    
    res.write(`data: ${JSON.stringify({ type: "done", result })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error("Error generating exam from prompt:", err);
    res.write(`data: ${JSON.stringify({ type: "error", message: err.message || "Failed to generate exam from prompt" })}\n\n`);
    res.end();
  }
});

// Legacy non-streaming route (kept just in case)
aiRouter.post("/generate-exam", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const htmlContent = await parseDocxFile(req.file.buffer);
    let lastResult = null;
    const result = await processExamInChunks(htmlContent, (msg) => {
      // Just ignore progress for legacy
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to generate exam from document" });
  }
});

// 2. AI Tutor Chat
aiRouter.post("/tutor", async (req, res) => {
  try {
    const { messages, context, apiKey } = req.body;
    const customApiKey = (req.headers["x-gemini-api-key"] as string) || apiKey;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    const stream = await askTutor(messages, context, customApiKey);
    
    // Set headers for SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    for await (const chunk of stream) {
      if (chunk.text) {
        // We write the text chunk to the stream
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err: any) {
    console.error("Error in AI Tutor:", err);
    res.status(500).json({ error: err.message || "Failed to respond" });
  }
});

// 3. Analyze Exam Performance (Legacy)
aiRouter.post("/analyze-exam", async (req, res) => {
  try {
    const { analyticsInput } = req.body;
    if (!analyticsInput) {
      return res.status(400).json({ error: "Analytics input is required" });
    }

    const analysis = await analyzeExamPerformance(analyticsInput);
    res.json(analysis);
  } catch (err: any) {
    console.error("Error analyzing exam performance:", err);
    res.status(500).json({ error: err.message || "Failed to analyze performance" });
  }
});

// 4. Analyze Structured Exam Performance
aiRouter.post("/analyze-structured-exam", async (req, res) => {
  try {
    const { payload } = req.body;
    if (!payload) {
      return res.status(400).json({ error: "Analysis payload is required" });
    }

    const analysis = await analyzeStructuredExamPerformance(payload);
    res.json(analysis);
  } catch (err: any) {
    console.error("Error analyzing structured exam performance:", err);
    res.status(500).json({ error: err.message || "Failed to analyze structured performance" });
  }
});

// 5. Look up, Pronunciation & Translation using gemini-3.5-flash-lite
aiRouter.post("/lookup", async (req, res) => {
  try {
    const { text, context, apiKey } = req.body;
    const customApiKey = (req.headers["x-gemini-api-key"] as string) || apiKey;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text string is required" });
    }

    const result = await lookupAndTranslate(text.trim(), context, customApiKey);
    res.json(result);
  } catch (err: any) {
    console.error("Error in AI Lookup:", err);
    res.status(500).json({ error: err.message || "Tra cứu thất bại" });
  }
});

// 6. Select Review Questions using Gemini AI
aiRouter.post("/select-review-questions", express.json(), async (req, res) => {
  try {
    const { candidates, userPrompt, targetCount, apiKey } = req.body;
    const customApiKey = (req.headers["x-gemini-api-key"] as string) || apiKey;

    if (!userPrompt || typeof userPrompt !== "string") {
      return res.status(400).json({ error: "Yêu cầu của học sinh không được để trống." });
    }

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ error: "Danh sách ứng viên câu hỏi trống." });
    }

    const result = await selectReviewQuestionsWithAi(
      candidates,
      userPrompt.trim(),
      Number(targetCount) || 10,
      customApiKey
    );

    res.json(result);
  } catch (err: any) {
    console.error("Error in AI Select Review Questions:", err);
    res.status(500).json({ error: err.message || "Không thể lọc câu hỏi qua AI" });
  }
});

// 7. Grade Essay Question with Gemini AI
aiRouter.post("/grade-essay", express.json(), async (req, res) => {
  try {
    const { question, studentAnswer, apiKey } = req.body;
    const customApiKey = (req.headers["x-gemini-api-key"] as string) || apiKey;

    if (!question || typeof question !== "object") {
      return res.status(400).json({ error: "Thông tin câu hỏi không hợp lệ." });
    }

    const { gradeEssayWithGemini } = await import("./aiEssayGrader.js");
    const result = await gradeEssayWithGemini(question, studentAnswer || "", customApiKey);
    res.json(result);
  } catch (err: any) {
    console.error("Error in AI Grade Essay:", err);
    res.status(500).json({ error: err.message || "Không thể chấm bài tự luận qua AI" });
  }
});

// 8. Admin AI Virtual Assistant (Streaming SSE) using gemini-3.5-flash-lite
aiRouter.post("/admin-assistant", express.json(), async (req, res) => {
  try {
    const { messages, context, apiKey } = req.body;
    const customApiKey = (req.headers["x-gemini-api-key"] as string) || apiKey;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    const stream = await askAdminAssistant(messages, context, customApiKey);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof (res as any).flushHeaders === "function") {
      (res as any).flushHeaders();
    }

    for await (const chunk of stream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err: any) {
    console.error("Error in Admin AI Assistant:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || "Lỗi xử lý yêu cầu Trợ lý Admin" });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message || "Lỗi xử lý" })}\n\n`);
      res.end();
    }
  }
});

