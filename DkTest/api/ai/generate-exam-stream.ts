import multer from "multer";
import { parseDocxFile, processExamInChunks } from "../../src/services/ai/aiExamGenerator.js";

export const config = { api: { bodyParser: false } };
export const maxDuration = 300;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

function parseMultipart(req: any, res: any): Promise<void> {
  return new Promise((resolve, reject) => {
    upload.single("file")(req, res, (error: unknown) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

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
    await parseMultipart(req, res);
    const uploadedFile = (req as any).file as { buffer?: Buffer } | undefined;
    if (!uploadedFile?.buffer) return res.status(400).json({ error: "No file uploaded" });

    initSse(res);
    sendSse(res, { type: "info", message: "Đang đọc nội dung file Word..." });

    const htmlContent = await parseDocxFile(uploadedFile.buffer);
    const result = await processExamInChunks(htmlContent, (progressMsg) => {
      try {
        sendSse(res, JSON.parse(progressMsg));
      } catch {
        sendSse(res, { type: "info", message: progressMsg });
      }
    });

    sendSse(res, { type: "done", result });
    return res.end();
  } catch (error) {
    console.error("[AI Word Import]", error);
    if (!res.headersSent) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to generate exam" });
    }
    sendSse(res, { type: "error", message: error instanceof Error ? error.message : "Failed to generate exam" });
    return res.end();
  }
}
