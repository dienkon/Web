import { processExamFromPromptStream } from "../../src/services/ai/aiExamGenerator.js";

export const maxDuration = 300;

function initSse(res: any) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
}

function sendSse(res: any, payload: unknown) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { prompt } = req.body ?? {};
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "No prompt provided" });
    }

    initSse(res);
    const result = await processExamFromPromptStream(prompt, (progressMsg) => {
      try {
        sendSse(res, JSON.parse(progressMsg));
      } catch {
        sendSse(res, { type: "info", message: progressMsg });
      }
    });

    sendSse(res, { type: "done", result });
    return res.end();
  } catch (error) {
    console.error("[AI Generate Prompt]", error);
    if (!res.headersSent) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to generate exam" });
    }
    sendSse(res, { type: "error", message: error instanceof Error ? error.message : "Failed to generate exam" });
    return res.end();
  }
}
