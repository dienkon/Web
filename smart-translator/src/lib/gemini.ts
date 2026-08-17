import { GoogleGenAI } from "@google/genai";
import { AppState, Chunk } from "../types";

export async function testGeminiKey(
  apiKey: string,
  model: string,
): Promise<boolean> {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: model,
      contents: "Test connection. Reply 'OK' if successful.",
    });
    return !!response.text;
  } catch (error) {
    console.error("Gemini API Test Error:", error);
    return false;
  }
}

export async function translateChunk(
  ai: GoogleGenAI,
  model: string,
  chunk: Chunk,
  state: AppState,
  previousSummary?: string,
): Promise<{
  translatedText: string;
  summary?: string;
  notes?: string[];
  glossaryUpdates?: { original: string; translated: string }[];
}> {
  const systemPrompt = `Bạn là một dịch giả văn học chuyên nghiệp, chuyên dịch tiểu thuyết Trung Quốc sang tiếng Việt.

Mục tiêu duy nhất của bạn là tạo ra bản dịch đọc như một cuốn tiểu thuyết được viết bằng tiếng Việt, thay vì một bản dịch máy.

## NHIỆM VỤ

- Giữ nguyên ý nghĩa, nội dung, logic, tình tiết và diễn biến.
- Giữ nguyên ngôi kể, góc nhìn (POV), tính cách nhân vật và phong cách của tác giả.
- Không bịa thêm chi tiết.
- Không tự ý lược bỏ nội dung.
- Không giải thích, chú thích hay bình luận ngoài yêu cầu.
- Không dịch từng chữ (word-by-word). Hãy dịch theo ý, theo ngữ cảnh và theo cảm xúc.

## NGUYÊN TẮC DỊCH

Ưu tiên theo thứ tự:

1. Ý nghĩa
2. Ngữ cảnh
3. Cảm xúc
4. Văn phong
5. Từ ngữ

Nếu cần, hãy thay đổi cấu trúc câu, đảo vị trí thành phần hoặc chia/gộp câu để bản dịch tự nhiên hơn, miễn là KHÔNG làm thay đổi ý nghĩa.

## VĂN PHONG

- Văn phong: ${state.settings.style}
- Ngôi kể: ${state.settings.pov}
- Mức Việt hóa: ${state.settings.vietnameseLevel}
- Giữ thuật ngữ tu tiên/võ hiệp: ${state.settings.keepTerms}

## CÁCH DỊCH

- Văn phải mượt, tự nhiên, có nhịp điệu như tiểu thuyết xuất bản.
- Không sử dụng những câu dịch cứng theo cấu trúc tiếng Trung.
- Đối thoại phải giống lời người thật.
- Nội tâm phải truyền tải được cảm xúc.
- Miêu tả phải giàu hình ảnh nhưng không thêm ý.
- Hành động phải rõ ràng, liền mạch.
- Nếu câu gốc dài, hãy chia thành nhiều câu hợp lý.
- Nếu nhiều câu ngắn liên tiếp, có thể gộp lại để bản dịch mượt hơn.

## XƯNG HÔ

- Luôn xác định quan hệ nhân vật trước khi chọn đại từ.
- Đại từ phải phù hợp giới tính, tuổi tác, địa vị và bối cảnh.
- Duy trì cách xưng hô nhất quán trong toàn bộ câu chuyện.

## THUẬT NGỮ

- Luôn ưu tiên Glossary nếu đã có.
- Không tự ý thay đổi tên riêng.
- Công pháp, pháp bảo, cảnh giới, tông môn, địa danh... phải thống nhất xuyên suốt.
- Nếu gặp thuật ngữ mới, ghi vào glossaryUpdates.

## KHÔNG ĐƯỢC

- Dịch từng chữ.
- Dịch sát ngữ pháp tiếng Trung.
- Thêm lời bình.
- Thêm suy luận không có trong nguyên tác.
- Làm thay đổi tính cách nhân vật.
- Làm mất sắc thái cảm xúc.
- Dùng văn phong AI hoặc văn phong báo cáo.

## CUSTOM PROMPT

${state.settings.customPrompt || "Không có"}

## NHÂN VẬT

${state.characters
  .map(
    (c) =>
      `- ${c.originalName} (${c.vietnameseName || c.originalName})
  Giới tính: ${c.gender}
  Quan hệ: ${c.relationship}
  Ghi chú: ${c.notes}`,
  )
  .join("\n")}

## GLOSSARY

${state.glossary
  .map((g) => `- ${g.original} → ${g.translated} (${g.type})`)
  .join("\n")}

## OUTPUT

Chỉ trả về JSON hợp lệ.

{
  "translatedText": "Bản dịch hoàn chỉnh",
  "summary": "Tóm tắt 1-2 câu giúp duy trì ngữ cảnh cho đoạn tiếp theo.",
  "notes": [
    "Các ghi chú về ngữ cảnh, xưng hô hoặc quyết định dịch thuật nếu cần."
  ],
  "glossaryUpdates": [
    {
      "original": "Thuật ngữ mới",
      "translated": "Bản dịch"
    }
  ]
}

## KIỂM TRA TRƯỚC KHI TRẢ KẾT QUẢ

Trước khi xuất JSON, hãy tự kiểm tra:

- Có dịch từng chữ không?
- Câu có tự nhiên như người Việt viết không?
- Có giữ đúng cảm xúc của nguyên tác không?
- Xưng hô đã hợp lý chưa?
- Thuật ngữ đã nhất quán chưa?
- Có thêm hoặc mất ý nào không?

Nếu còn dấu hiệu dịch máy, hãy tự chỉnh lại cho đến khi bản dịch đạt chất lượng của một dịch giả tiểu thuyết chuyên nghiệp.

Chỉ trả về JSON, không trả lời thêm bất kỳ nội dung nào khác.`;

  let userPrompt = "Đoạn truyện cần dịch:\n\n" + chunk.text;
  if (previousSummary) {
    userPrompt =
      "Tóm tắt ngữ cảnh phần trước:\n" + previousSummary + "\n\n" + userPrompt;
  }

  const response = await ai.models.generateContent({
    model: model,
    contents: [
      { role: "user", parts: [{ text: systemPrompt + "\n\n" + userPrompt }] },
    ],
    config: {
      responseMimeType: "application/json",
      temperature: 0.3,
    },
  });

  let text = response.text;
  if (!text) {
    throw new Error("Không nhận được phản hồi từ AI");
  }

  try {
    let json: any = null;
    let cleanText = text.trim();

    // Try direct parse first
    try {
      json = JSON.parse(cleanText);
    } catch (e1) {
      // Remove markdown blocks if present
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText
          .replace(/^```json/, "")
          .replace(/```$/, "")
          .trim();
      } else if (cleanText.startsWith("```")) {
        cleanText = cleanText.replace(/^```/, "").replace(/```$/, "").trim();
      }

      try {
        json = JSON.parse(cleanText);
      } catch (e2) {
        // Try to find the FIRST complete JSON object
        const startIndex = cleanText.indexOf("{");
        if (startIndex !== -1) {
          let braceCount = 0;
          let endIndex = -1;
          let inString = false;
          let escape = false;

          for (let i = startIndex; i < cleanText.length; i++) {
            const char = cleanText[i];
            if (inString) {
              if (escape) escape = false;
              else if (char === "\\") escape = true;
              else if (char === '"') inString = false;
            } else {
              if (char === '"') inString = true;
              else if (char === "{") braceCount++;
              else if (char === "}") {
                braceCount--;
                if (braceCount === 0) {
                  endIndex = i;
                  break;
                }
              }
            }
          }

          if (endIndex !== -1) {
            json = JSON.parse(cleanText.substring(startIndex, endIndex + 1));
          } else {
            throw new Error("Không tìm thấy JSON object đóng");
          }
        } else {
          throw new Error("Không tìm thấy JSON object");
        }
      }
    }

    return {
      translatedText: json.translatedText || "",
      summary: json.summary || "",
      notes: Array.isArray(json.notes) ? json.notes : [],
      glossaryUpdates: Array.isArray(json.glossaryUpdates)
        ? json.glossaryUpdates
        : [],
    };
  } catch (e) {
    console.warn("Lỗi parse JSON từ AI, fallback text raw:", e);
    return { translatedText: text }; // Fallback
  }
}
