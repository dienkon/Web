import multer from "multer";
import { parseDocxFile, processExamInChunks } from "../../src/services/ai/aiExamGenerator.js";
import { initSse, sendSse, sendSseError } from "../../src/server/sse.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

type UploadedFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

function parseMultipart(req: any, res: any): Promise<void> {
  return new Promise((resolve, reject) => {
    upload.single("file")(req, res, (error: unknown) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export const maxDuration = 300;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Method Not Allowed",
    });
  }

  initSse(res);

  try {
    await parseMultipart(req, res);

    const uploadedFile = (req as any).file as UploadedFile | undefined;

    if (!uploadedFile?.buffer) {
      return sendSseError(res, new Error("No file uploaded"));
    }

    sendSse(res, {
      type: "info",
      message: "Đang đọc nội dung file Word...",
    });

    const htmlContent = await parseDocxFile(uploadedFile.buffer);

    const result = await processExamInChunks(
      htmlContent,
      (progressMsg) => {
        try {
          sendSse(res, JSON.parse(progressMsg));
        } catch {
          sendSse(res, {
            type: "info",
            message: progressMsg,
          });
        }
      }
    );

    sendSse(res, {
      type: "done",
      result,
    });

    return res.end();
  } catch (error) {
    console.error("[AI Word Import]", error);
    return sendSseError(res, error);
  }
}