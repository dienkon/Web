
import { processExamFromPromptStream } from "../../src/services/ai/aiExamGenerator.js";
import { initSse, sendSse, sendSseError } from "../../src/server/sse.js";

export const maxDuration = 300;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
    if (!prompt) {
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
    console.error("[AI Exam Prompt]", error);
    if (!res.headersSent) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to generate exam from prompt",
      });
    }
    sendSseError(res, error);
  }
}
