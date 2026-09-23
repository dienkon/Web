/**
 * Gemini DkAI Real API Client for DkDocShop 2.0 (Section AL, BE, BD)
 * Model: gemini-3.5-flash-lite
 */
import { ENV } from "../config/environment.js";
import { aiGuard } from "./guard.js";
import { aiCache } from "./cache.js";
import { logger } from "../utils/logger.js";
import {
  TUTOR_PROMPT,
  SOLVER_PROMPT,
  SUMMARY_PROMPT,
  DOCUMENT_QA_PROMPT,
  FLASHCARD_PROMPT,
  SEARCH_INTENT_PROMPT,
} from "./prompts.js";

const MODEL_NAME = ENV.GEMINI.model || "gemini-3.5-flash-lite";

export class GeminiClient {
  constructor() {
    this.apiKey = ENV.GEMINI.apiKey || "AQ.Ab8RN6IN26kW2Y19as279t01oGlKlYqXwbjlIkjLcC7Hu_OLPg";
    this.baseUrl = ENV.GEMINI.apiUrl || "https://generativelanguage.googleapis.com/v1beta/models";
  }

  setApiKey(key) {
    this.apiKey = key;
  }

  getSystemInstruction(mode) {
    switch (mode) {
      case "solver":
        return SOLVER_PROMPT;
      case "tutor":
        return TUTOR_PROMPT;
      case "summary":
        return SUMMARY_PROMPT;
      case "flashcards":
        return FLASHCARD_PROMPT;
      case "qa":
        return DOCUMENT_QA_PROMPT;
      case "search":
        return SEARCH_INTENT_PROMPT;
      default:
        return TUTOR_PROMPT;
    }
  }

  /**
   * Send prompt to Gemini API with optional file attachment (Image or PDF)
   */
  async generate({
    mode = "tutor",
    prompt = "",
    contextText = "",
    fileAttachment = null, // { mimeType, base64 }
    temperature = 0.4,
  } = {}) {
    if (!prompt && !fileAttachment) {
      throw new Error("Vui lòng nhập câu hỏi hoặc đính kèm tài liệu.");
    }

    // 1. Quota & Rate Limit Check
    aiGuard.checkQuota();

    // 2. Check Cache (if text-only)
    if (!fileAttachment) {
      const cached = aiCache.get(mode, prompt, contextText);
      if (cached) {
        logger.info("[DkAI] Served from Cache:", mode);
        return cached;
      }
    }

    // 3. Assemble User Content Parts
    const parts = [];

    // Context prefix if any
    if (contextText) {
      parts.push({
        text: `[NGỮ CẢNH TÀI LIỆU]\n${contextText}\n\n[HẾT NGỮ CẢNH]`,
      });
    }

    // File inline data (Section BE: Image, PDF)
    if (fileAttachment && fileAttachment.base64 && fileAttachment.mimeType) {
      parts.push({
        inlineData: {
          mimeType: fileAttachment.mimeType,
          data: fileAttachment.base64,
        },
      });
    }

    // User prompt
    if (prompt) {
      parts.push({ text: prompt });
    }

    const systemInstruction = this.getSystemInstruction(mode);

    const payload = {
      contents: [
        {
          role: "user",
          parts,
        },
      ],
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      generationConfig: {
        temperature,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2500,
      },
    };

    // If apiKey is empty, check if dev backend proxy exists or simulate safe fallback
    if (!this.apiKey) {
      // In production without API key, explain clearly
      return this.generateOfflineFallback(mode, prompt, contextText);
    }

    const endpoint = `${this.baseUrl}/${MODEL_NAME}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const status = response.status;
        aiGuard.recordError();

        if (status === 429) {
          throw new Error("DkAI đang nhận quá nhiều yêu cầu từ cộng đồng. Vui lòng thử lại sau 1 phút.");
        } else if (status === 400) {
          throw new Error("Yêu cầu không hợp lệ hoặc file đính kèm vượt kích thước cho phép.");
        } else {
          throw new Error(`Không thể kết nối DkAI lúc này (Mã lỗi: ${status}).`);
        }
      }

      const data = await response.json();
      const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!answer) {
        throw new Error("Không nhận được câu trả lời từ máy chủ DkAI.");
      }

      aiGuard.recordSuccess();

      // Cache successful response
      if (!fileAttachment) {
        aiCache.set(mode, prompt, answer, contextText);
      }

      return answer;
    } catch (err) {
      logger.error("[DkAI API Error]:", err);
      // If network fails, provide educational fallback if offline
      if (err.name === "TypeError" || !navigator.onLine) {
        return this.generateOfflineFallback(mode, prompt, contextText);
      }
      throw err;
    }
  }

  /**
   * Educational pedagogical fallback when network or API key is unconfigured
   */
  generateOfflineFallback(mode, prompt, contextText) {
    const q = prompt.toLowerCase();

    if (q.includes("hàm số") || q.includes("đạo hàm") || q.includes("cực trị")) {
      return `
<h3>1. Ý tưởng & Bản chất Toán học</h3>
<p>Để tìm cực trị của hàm số \\(y = f(x)\\), ta khảo sát dấu của đạo hàm bậc nhất \\(f'(x)\\).</p>
<div class="katex-block-wrapper my-3 text-center">
  $$y' = f'(x) = 0 \\implies x = x_0$$
</div>
<h3>2. Quy tắc xét dấu</h3>
<p>Nếu qua điểm \\(x_0\\), đạo hàm \\(f'(x)\\) đổi dấu từ dương sang âm thì hàm số đạt cực đại tại \\(x_0\\). Ngược lại nếu đổi dấu từ âm sang dương thì hàm số đạt cực tiểu.</p>
<div class="katex-block-wrapper my-3 text-center">
  $$f''(x_0) < 0 \\implies x_0 \\text{ là điểm cực đại}$$
  $$f''(x_0) > 0 \\implies x_0 \\text{ là điểm cực tiểu}$$
</div>
<h3>3. Cảnh báo lỗi thường gặp</h3>
<p>Nhiều học sinh hay nhầm lẫn giữa <strong>điểm cực trị của hàm số</strong> (giá trị \\(x\\)), <strong>giá trị cực trị</strong> (giá trị \\(y\\)) và <strong>điểm cực trị của đồ thị hàm số</strong> (tọa độ \\((x; y)\\)). Hãy đọc kỹ yêu cầu đề bài!</p>
      `;
    }

    if (q.includes("phương trình") || q.includes("delta")) {
      return `
<h3>1. Phương pháp giải phương trình bậc hai</h3>
<p>Xét phương trình bậc hai: \\(ax^2 + bx + c = 0\\) với \\(a \\neq 0\\).</p>
<div class="katex-block-wrapper my-3 text-center">
  $$\\Delta = b^2 - 4ac$$
</div>
<h3>2. Các trường hợp của nghiệm</h3>
<ul>
  <li>Nếu \\(\\Delta > 0\\): Phương trình có 2 nghiệm phân biệt:
    $$x_{1,2} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$$
  </li>
  <li>Nếu \\(\\Delta = 0\\): Phương trình có nghiệm kép:
    $$x_1 = x_2 = -\\frac{b}{2a}$$
  </li>
  <li>Nếu \\(\\Delta < 0\\): Phương trình vô nghiệm trên tập số thực \\(\\mathbb{R}\\).</li>
</ul>
<h3>3. Hệ thức Viète</h3>
<div class="katex-block-wrapper my-3 text-center">
  $$S = x_1 + x_2 = -\\frac{b}{a}, \\quad P = x_1 \\cdot x_2 = \\frac{c}{a}$$
</div>
      `;
    }

    return `
<h3>Phân tích câu hỏi từ DkAI</h3>
<p>DkAI đã tiếp nhận câu hỏi của bạn: <em>"${prompt}"</em>.</p>
<h3>Hướng tiếp cận kiến thức</h3>
<p>1. Xác định rõ khái niệm lý thuyết nền tảng liên quan đến môn học.</p>
<p>2. Vận dụng công thức toán học/khoa học tương ứng:</p>
<div class="katex-block-wrapper my-3 text-center">
  $$\\lim_{x \\to x_0} f(x) = L$$
</div>
<p>3. Kiểm tra lại điều kiện biên trước khi kết luận đáp án.</p>
<p><em>(Lưu ý: Bạn có thể cấu hình VITE_GEMINI_API_KEY trong file .env để kết nối trực tiếp đến mô hình Gemini 3.5 Flash Lite trên máy chủ Google).</em></p>
    `;
  }
}

export const geminiClient = new GeminiClient();
export default geminiClient;
