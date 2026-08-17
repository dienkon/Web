/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createWorker } from "tesseract.js";

export interface OCRProgress {
  status: string;
  progress: number;
}

/**
 * Recognizes text from an image (File, Blob, base64, or image element URL) in the browser
 */
export async function recognizeImageText(
  imageSource: File | Blob | string,
  onProgress?: (p: OCRProgress) => void,
): Promise<{ text: string; confidence: number }> {
  // Create worker with English and Vietnamese language support
  const worker = await createWorker("eng+vie", 1, {
    logger: onProgress
      ? (m) => {
          let VietnameseStatus = m.status;
          if (m.status === "loading tesseract core") {
            VietnameseStatus = "Đang nạp lõi nhận diện Tesseract...";
          } else if (m.status === "initializing api") {
            VietnameseStatus = "Đang khởi tạo công cụ ngôn ngữ...";
          } else if (m.status === "recognizing text") {
            VietnameseStatus = "Đang nhận dạng ký tự (OCR)...";
          }
          onProgress({
            status: VietnameseStatus,
            progress: m.progress || 0,
          });
        }
      : undefined,
  });

  try {
    const {
      data: { text, confidence },
    } = await worker.recognize(imageSource);

    // Clean up worker
    await worker.terminate();

    return {
      text: text || "",
      confidence: confidence || 0,
    };
  } catch (err) {
    // Ensure worker is terminated even on failure
    try {
      await worker.terminate();
    } catch (_) {}
    throw err;
  }
}
