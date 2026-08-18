import { processExamFromPromptStream } from "../../src/services/ai/aiExamGenerator";

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

    const { prompt } = body;

    if (!prompt) {
      return res.status(400).json({ error: "No prompt provided" });
    }

    setSseHeaders(res);
    res.write(`data: ${JSON.stringify({
      type: "info",
      message: "Đang tạo đề bằng AI..."
    })}\n\n`);

    const result = await processExamFromPromptStream(prompt, (progressMsg) => {
      res.write(`data: ${JSON.stringify(progressMsg)}\n\n`);
    });

    res.write(`data: ${JSON.stringify({
      type: "done",
      result
    })}\n\n`);

    res.end();
  } catch (error: any) {
    console.error("[AI Exam Prompt]", error);

    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({
        type: "error",
        message: error?.message || "Failed to generate exam from prompt"
      })}\n\n`);
      res.end();
      return;
    }

    res.status(500).json({
      error: error?.message || "Failed to generate exam from prompt"
    });
  }
}
