
import multer from "multer";
import { parseDocxFile, processExamInChunks } from "../../src/services/ai/aiExamGenerator.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

function parseMultipart(req: any, res: any) {
  return new Promise<void>((resolve, reject) => {
    upload.single("file")(req, res, (error: unknown) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export const maxDuration = 300;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    await parseMultipart(req, res);
    const uploadedFile = (req as any & { file?: Express.Multer.File }).file;
    if (!uploadedFile) return res.status(400).json({ error: "No file uploaded" });

    const htmlContent = await parseDocxFile(uploadedFile.buffer);
    const result = await processExamInChunks(htmlContent, () => undefined);
    return res.status(200).json(result);
  } catch (error) {
    console.error("[AI Exam Import]", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to generate exam from document",
    });
  }
}
