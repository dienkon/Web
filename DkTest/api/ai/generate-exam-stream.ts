import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

import {
  parseDocxFile,
  processExamInChunks,
} from "../../src/services/ai/aiExamGenerator";

function setSseHeaders(res: any) {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
}

export default function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  return upload.single("file")(req, res, async (uploadError: any) => {
    if (uploadError) {
      console.error("[AI Word Import]", uploadError);
      return res.status(400).json({
        error: uploadError?.message || "File upload failed"
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    setSseHeaders(res);

    try {
      res.write(`data: ${JSON.stringify({
        type: "info",
        message: "Đang đọc nội dung file Word..."
      })}\n\n`);

      const htmlContent = await parseDocxFile(req.file.buffer);

      const result = await processExamInChunks(htmlContent, (progressMsg) => {
        res.write(`data: ${JSON.stringify(progressMsg)}\n\n`);
      });

      res.write(`data: ${JSON.stringify({
        type: "done",
        result
      })}\n\n`);

      res.end();
    } catch (error: any) {
      console.error("[AI Word Import]", error);

      res.write(`data: ${JSON.stringify({
        type: "error",
        message: error?.message || "Failed to generate exam"
      })}\n\n`);
      res.end();
    }
  });
}
