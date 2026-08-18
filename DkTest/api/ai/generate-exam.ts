import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

import {
  parseDocxFile,
  processExamInChunks,
} from "../../src/services/ai/aiExamGenerator";

export default function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  return upload.single("file")(req, res, async (uploadError: any) => {
    if (uploadError) {
      return res.status(400).json({
        error: uploadError?.message || "File upload failed"
      });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const htmlContent = await parseDocxFile(req.file.buffer);
      const result = await processExamInChunks(htmlContent, () => {});
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("[AI Word Import Legacy]", error);
      return res.status(500).json({
        error: error?.message || "Failed to generate exam from document"
      });
    }
  });
}
