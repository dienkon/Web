import { askTutor } from "../../src/services/ai/aiTutor.js";

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
    const body = req.body ?? {};
    const { messages, context } = body;

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    initSse(res);
    const stream = await askTutor(messages, context);

    for await (const chunk of stream) {
      const text = chunk.text ?? "";
      if (text) sendSse(res, { text });
    }

    res.write("data: [DONE]\n\n");
    return res.end();
  } catch (error) {
    console.error("[AI Tutor]", error);
    if (!res.headersSent) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to respond",
      });
    }
    res.write(`data: ${JSON.stringify({ type: "error", message: error instanceof Error ? error.message : "Failed to respond" })}\n\n`);
    return res.end();
  }
}
