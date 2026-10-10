import { Router, type Request, type Response } from "express";
import { safeFetchHtml } from "../services/webImporter/fetchService";
import { parserRegistry } from "../services/webImporter/parserRegistry";
import { normalizeToDkTestJson } from "../services/webImporter/normalizer";
import {
  extractQuestionsWithGemini,
  verifyExtractionWithGemini,
} from "../services/webImporter/geminiExtractor";

export const webImporterRouter = Router();

/**
 * Endpoint xử lý trích xuất câu hỏi từ URL hoặc HTML dán trực tiếp.
 * Hỗ trợ cả đơn lẻ (url / rawHtml) và hàng loạt (urls: string[]).
 * Hỗ trợ kiểm chứng và tinh chỉnh thông minh bằng Google Gemini AI.
 */
webImporterRouter.post("/extract", async (req: Request, res: Response) => {
  const { url, urls, rawHtml, sourceUrl, enableAiRefinement } = req.body || {};

  // Xử lý đơn lẻ qua HTML dán trực tiếp
  if (rawHtml && typeof rawHtml === "string") {
    try {
      const targetUrl = sourceUrl || "https://manual-import.local";
      const adapter = parserRegistry.getAdapter(targetUrl, rawHtml);
      const extracted = await adapter.extract(rawHtml, targetUrl);

      // Nếu bộ parser thông thường không tìm thấy câu hỏi, thử dùng Gemini AI
      if (extracted.questions.length === 0 && enableAiRefinement) {
        const aiResult = await extractQuestionsWithGemini(rawHtml, {
          title: extracted.title,
          url: targetUrl,
        });
        if (aiResult.questions.length > 0) {
          extracted.questions = aiResult.questions;
          extracted.totalQuestions = aiResult.questions.length;
          extracted.adapterName = "gemini_ai_fallback";
          if (aiResult.suggestedTitle) {
            extracted.title = aiResult.suggestedTitle;
          }
        }
      }

      // Kiểm định & đối chiếu với Gemini AI nếu được yêu cầu
      if (enableAiRefinement && extracted.questions.length > 0) {
        const verification = await verifyExtractionWithGemini(
          extracted.questions,
          rawHtml
        );
        extracted.aiVerification = verification;
      }

      const dktestJson = normalizeToDkTestJson(extracted);

      return res.json({
        success: true,
        data: {
          ...extracted,
          dktestJson,
        },
      });
    } catch (err: any) {
      console.error("[WebImporter] Lỗi trích xuất rawHtml:", err);
      return res.status(400).json({
        success: false,
        error: err.message || "Không thể phân tích nội dung HTML cung cấp.",
      });
    }
  }

  // Xử lý hàng loạt danh sách URLs
  if (Array.isArray(urls) && urls.length > 0) {
    const validUrls = urls
      .map((u) => String(u).trim())
      .filter((u) => u.startsWith("http://") || u.startsWith("https://"));

    if (validUrls.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Không tìm thấy URL hợp lệ nào trong danh sách cung cấp.",
      });
    }

    const CONCURRENCY = 2; // Giới hạn đồng thời để bảo vệ tài nguyên và chống spam nguồn
    const results: any[] = [];

    for (let i = 0; i < validUrls.length; i += CONCURRENCY) {
      const chunk = validUrls.slice(i, i + CONCURRENCY);
      const chunkResults = await Promise.all(
        chunk.map(async (targetUrl) => {
          try {
            const fetchRes = await safeFetchHtml(targetUrl);
            const adapter = parserRegistry.getAdapter(fetchRes.finalUrl, fetchRes.html);
            const extracted = await adapter.extract(fetchRes.html, fetchRes.finalUrl);

            if (extracted.questions.length === 0 && enableAiRefinement) {
              const aiResult = await extractQuestionsWithGemini(fetchRes.html, {
                title: extracted.title,
                url: fetchRes.finalUrl,
              });
              if (aiResult.questions.length > 0) {
                extracted.questions = aiResult.questions;
                extracted.totalQuestions = aiResult.questions.length;
                extracted.adapterName = "gemini_ai_fallback";
                if (aiResult.suggestedTitle) {
                  extracted.title = aiResult.suggestedTitle;
                }
              }
            }

            if (enableAiRefinement && extracted.questions.length > 0) {
              const verification = await verifyExtractionWithGemini(
                extracted.questions,
                fetchRes.html
              );
              extracted.aiVerification = verification;
            }

            const dktestJson = normalizeToDkTestJson(extracted);

            return {
              url: targetUrl,
              success: true,
              data: {
                ...extracted,
                dktestJson,
              },
            };
          } catch (err: any) {
            return {
              url: targetUrl,
              success: false,
              error: err.message || "Lỗi xử lý URL này.",
            };
          }
        })
      );
      results.push(...chunkResults);
    }

    return res.json({
      success: true,
      isBatch: true,
      total: validUrls.length,
      successCount: results.filter((r) => r.success).length,
      results,
    });
  }

  // Xử lý một URL đơn lẻ
  if (!url || typeof url !== "string") {
    return res.status(400).json({
      success: false,
      error: "Vui lòng cung cấp URL trang web hoặc danh sách URLs cần phân tích.",
    });
  }

  const trimmedUrl = url.trim();
  if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
    return res.status(400).json({
      success: false,
      error: "Định dạng URL không hợp lệ. URL phải bắt đầu bằng http:// hoặc https://",
    });
  }

  try {
    const fetchRes = await safeFetchHtml(trimmedUrl);
    const adapter = parserRegistry.getAdapter(fetchRes.finalUrl, fetchRes.html);
    const extracted = await adapter.extract(fetchRes.html, fetchRes.finalUrl);

    // AI Fallback nếu bộ phân tích không tìm thấy câu hỏi
    if (extracted.questions.length === 0 && enableAiRefinement) {
      const aiResult = await extractQuestionsWithGemini(fetchRes.html, {
        title: extracted.title,
        url: fetchRes.finalUrl,
      });
      if (aiResult.questions.length > 0) {
        extracted.questions = aiResult.questions;
        extracted.totalQuestions = aiResult.questions.length;
        extracted.adapterName = "gemini_ai_fallback";
        if (aiResult.suggestedTitle) {
          extracted.title = aiResult.suggestedTitle;
        }
      }
    }

    // AI Verification & Đối chiếu mâu thuẫn
    if (enableAiRefinement && extracted.questions.length > 0) {
      const verification = await verifyExtractionWithGemini(
        extracted.questions,
        fetchRes.html
      );
      extracted.aiVerification = verification;
    }

    const dktestJson = normalizeToDkTestJson(extracted);

    return res.json({
      success: true,
      data: {
        ...extracted,
        dktestJson,
      },
    });
  } catch (err: any) {
    console.error(`[WebImporter] Lỗi xử lý ${trimmedUrl}:`, err);
    return res.status(400).json({
      success: false,
      error: err.message || "Không thể phân tích dữ liệu từ URL này.",
    });
  }
});
