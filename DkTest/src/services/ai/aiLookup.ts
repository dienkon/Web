import { getAiClient } from "./aiClient.js";

export interface LookupResult {
  text: string;
  pronunciation: string;
  translation: string;
  partOfSpeech: string;
  definition: string;
  grammarNotes?: string;
  examples?: Array<{ en: string; vi: string }>;
}

export async function lookupAndTranslate(
  text: string,
  context?: string,
  customApiKey?: string
): Promise<LookupResult> {
  const ai = getAiClient(customApiKey);

  const prompt = `Bạn là một trợ lý ngôn ngữ và chuyên gia từ điển học thông minh.
Học sinh đang đọc một câu hỏi/bài tập và bôi đen đoạn văn bản sau:
"${text}"
${context ? `Ngữ cảnh trong bài thi/câu hỏi: "${context}"` : ""}

Nhiệm vụ của bạn là giải nghĩa, phiên âm và phân tích chi tiết đoạn văn bản này bằng tiếng Việt.
HÃY TRẢ VỀ DUY NHẤT một chuỗi JSON hợp lệ (không kèm Markdown code block \`\`\`json) theo đúng cấu trúc sau:
{
  "pronunciation": "Phiên âm quốc tế IPA chuẩn xác (ví dụ: /ˈdɪkʃənri/ hoặc phiên âm cho cả cụm/câu nếu có)",
  "translation": "Bản dịch tiếng Việt tự nhiên, chuẩn xác theo đúng ngữ cảnh bài thi",
  "partOfSpeech": "Từ loại (Danh từ / Động từ / Tính từ / Cụm từ / Câu hoàn chỉnh)",
  "definition": "Định nghĩa và ý nghĩa chi tiết",
  "grammarNotes": "Ghi chú ngữ pháp, cấu trúc đi kèm, giới từ hoặc lưu ý cách dùng",
  "examples": [
    {
      "en": "Ví dụ câu tiếng Anh",
      "vi": "Dịch nghĩa tiếng Việt của câu ví dụ"
    }
  ]
}`;

  const candidateModels = [
    "gemini-3.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ];

  let lastError: any = null;
  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "";
      const cleaned = responseText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      const parsed = JSON.parse(cleaned);

      return {
        text,
        pronunciation: parsed.pronunciation || "",
        translation: parsed.translation || "Chưa có bản dịch",
        partOfSpeech: parsed.partOfSpeech || "Từ / Cụm từ",
        definition: parsed.definition || "",
        grammarNotes: parsed.grammarNotes || "",
        examples: parsed.examples || [],
      };
    } catch (err: any) {
      lastError = err;
      console.warn(`Model ${model} failed for lookup, trying fallback:`, err?.message || err);
    }
  }

  throw new Error(lastError?.message || "Không thể dịch và tra cứu từ này bằng Gemini.");
}
