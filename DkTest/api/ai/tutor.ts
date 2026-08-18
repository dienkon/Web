
import { askTutor } from "../../src/services/ai/aiTutor.js";
import { initSse, sendSse, sendSseError, sendSseRaw } from "../../src/server/sse";

export const maxDuration = 300;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = req.body ?? {};
    const messages = body.messages;
    const context = body.context;

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    initSse(res);
    const stream = await askTutor(messages, context);

    for await (const chunk of stream) {
      const text = chunk.text ?? "";
      if (text) sendSse(res, { text });
    }

    sendSseRaw(res, "[DONE]");
    return res.end();
  } catch (error) {
    console.error("[AI Tutor]", error);
    if (!res.headersSent) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to respond",
      });
    }
    sendSseError(res, error);
  }
}
