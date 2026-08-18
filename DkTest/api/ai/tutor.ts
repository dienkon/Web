import { askTutor } from "../../src/services/ai/aiTutor.js";

function setSseHeaders(res: any) {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : (req.body ?? {});

    const { messages, context } = body;

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    setSseHeaders(res);

    const stream = await askTutor(messages, context);

    for await (const chunk of stream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    console.error("[AI Tutor]", error);

    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({
        error: error?.message || "Failed to respond"
      })}\n\n`);
      res.end();
      return;
    }

    res.status(500).json({
      error: error?.message || "Failed to respond"
    });
  }
}
