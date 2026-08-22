import express from "express";
import multer from "multer";
import { parseDocxFile, processExamInChunks, processExamFromPromptStream } from "./aiExamGenerator";
import { askTutor } from "./aiTutor";
import { analyzeExamPerformance } from "./aiAnalytics";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

export const aiRouter = express.Router();

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
    const { prompt } = req.body;
    if (!prompt) {
      res.write(`data: ${JSON.stringify({ type: "error", message: "No prompt provided" })}\n\n`);
      res.end();
      return;
    }
    
    const result = await processExamFromPromptStream(prompt, (progressMsg) => {
      res.write(`data: ${progressMsg}\n\n`);
    });
    
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
    const { messages, context } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    const stream = await askTutor(messages, context);
    
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

// 3. Analyze Exam Performance
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
