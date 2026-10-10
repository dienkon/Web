import { apiClient } from "./apiClient";
import type { ExportV3 } from "../utils/json/schema";
import type {
  ExtractedExam,
  ExtractedQuestion,
} from "../../server/services/webImporter/types";

export interface ExtractSingleResponse {
  success: boolean;
  data: ExtractedExam & {
    dktestJson: ExportV3;
  };
  error?: string;
}

export interface ExtractBatchItem {
  url: string;
  success: boolean;
  data?: ExtractedExam & {
    dktestJson: ExportV3;
  };
  error?: string;
}

export interface ExtractBatchResponse {
  success: boolean;
  isBatch: boolean;
  total: number;
  successCount: number;
  results: ExtractBatchItem[];
  error?: string;
}

/**
 * Trích xuất đề thi từ một URL web duy nhất.
 */
export async function extractExamFromUrl(
  url: string,
  enableAiRefinement: boolean = false
): Promise<ExtractSingleResponse> {
  return apiClient<ExtractSingleResponse>("/api/web-importer/extract", {
    method: "POST",
    body: JSON.stringify({ url, enableAiRefinement }),
  });
}

/**
 * Trích xuất hàng loạt đề thi từ nhiều URLs.
 */
export async function extractExamsFromBatchUrls(
  urls: string[],
  enableAiRefinement: boolean = false
): Promise<ExtractBatchResponse> {
  return apiClient<ExtractBatchResponse>("/api/web-importer/extract", {
    method: "POST",
    body: JSON.stringify({ urls, enableAiRefinement }),
  });
}

/**
 * Trích xuất đề thi từ mã nguồn HTML dán thủ công.
 */
export async function extractExamFromRawHtml(
  rawHtml: string,
  sourceUrl?: string,
  enableAiRefinement: boolean = false
): Promise<ExtractSingleResponse> {
  return apiClient<ExtractSingleResponse>("/api/web-importer/extract", {
    method: "POST",
    body: JSON.stringify({ rawHtml, sourceUrl, enableAiRefinement }),
  });
}

/**
 * Tải file JSON xuống máy tính của người dùng an toàn.
 */
export function downloadJsonFile(
  data: any,
  fileName: string = "dktest_exam.json"
): void {
  const jsonStr =
    typeof data === "string" ? data : JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".json") ? fileName : `${fileName}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Sao chép chuỗi JSON vào Clipboard với cơ chế dự phòng tương thích cao.
 */
export async function copyJsonToClipboard(jsonString: string): Promise<boolean> {
  if (!jsonString) return false;

  try {
    if (navigator?.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(jsonString);
      return true;
    }
  } catch (err) {
    console.warn("[WebImporter] navigator.clipboard gặp lỗi, dùng textarea fallback:", err);
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = jsonString;
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textarea);
    return successful;
  } catch (err) {
    console.error("[WebImporter] Clipboard copy thất bại hoàn toàn:", err);
    return false;
  }
}
