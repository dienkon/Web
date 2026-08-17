import { GoogleGenAI, Type } from "@google/genai";

let ai: GoogleGenAI | null = null;

function getAI() {
  if (ai) return ai;

  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Thiếu GEMINI_API_KEY trên Vercel.");
  }

  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  return ai;
}

const schema = {
  type: Type.OBJECT,
  properties: {
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          equation: { type: Type.STRING },
          latex: { type: Type.STRING },
          latexWithCondition: { type: Type.STRING },
          condition: { type: Type.STRING },
          explanation: { type: Type.STRING },
        },
        required: [
          "equation",
          "latex",
          "latexWithCondition",
          "condition",
          "explanation",
        ],
      },
    },
    error: {
      type: Type.STRING,
    },
  },
};

const MAIN_MODEL = "gemini-3.5-flash-lite";
const FALLBACK_MODEL = "gemini-3.1-flash-lite";

async function generate(prompt: string, systemInstruction: string) {
  const client = getAI();

  try {
    return await client.models.generateContent({
      model: MAIN_MODEL,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });
  } catch (error: any) {
    console.warn(`${MAIN_MODEL} failed:`, error?.message);

    return await client.models.generateContent({
      model: FALLBACK_MODEL,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method Not Allowed",
    });
  }

  try {
    const { action, chain, start, end, minSteps } = req.body ?? {};

    // =========================
    // ANALYZE
    // =========================

    if (action === "analyze") {
      if (typeof chain !== "string" || !chain.trim()) {
        return res.status(400).json({
          error: "Chuỗi phản ứng không được để trống.",
        });
      }

      const systemInstruction = `Bạn là một Giáo sư Hóa học chuyên nghiệp và cố vấn học tập học sinh Việt Nam.
Nhiệm vụ của bạn là phân tích chuỗi phản ứng hóa học đầu vào do người dùng cung cấp (ví dụ: "Fe -> FeCl2 -> Fe(OH)2 -> FeO" hoặc "Na -> NaOH -> NaCl -> AgCl").
Bạn phải xác định rõ từng bước phản ứng, cân bằng chính xác từng phương trình hóa học, tìm điều kiện phản ứng và viết giải thích ngắn gọn bằng tiếng Việt.

YÊU CẦU QUAN TRỌNG VỀ HÓA HỌC:

1. Chỉ sử dụng các phản ứng hóa học có thật trong thực tế, có thể xảy ra và chính xác về mặt lý thuyết. Không bịa phản ứng.
2. Tất cả phương trình hóa học phải được cân bằng chính xác hoàn toàn về số nguyên tử của các nguyên tố.
3. Không tạo các chất không hợp lệ.
4. Ưu tiên các phản ứng đơn giản, phổ biến trong chương trình THPT Việt Nam.
5. Tạo chuỗi LaTeX thật chuẩn:
   - Sử dụng các ký hiệu LaTeX như \\rightarrow (hoặc \\xrightleftharpoons cho phản ứng thuận nghịch).
   - Đặt điều kiện phản ứng TRÊN mũi tên bằng cách sử dụng lệnh \\xrightarrow{\\text{điều kiện}} hoặc \\xrightarrow{t^o}.
   - Ký hiệu kết tủa là \\downarrow, khí bay lên là \\uparrow.
   - Ví dụ: "Fe + 2HCl \\xrightarrow{\\text{loãng}} FeCl_2 + H_2\\uparrow".
6. Nếu chuỗi phản ứng đầu vào không hợp lệ hoặc chứa các phản ứng không thể thực hiện được trong thực tế, hãy trả về thông báo lỗi chi tiết ở trường "error" và không trả về mảng "steps".`;

    const prompt = `Hãy phân tích chuỗi phản ứng hóa học sau đây: "${chain}"`;

      const response = await generate(prompt, systemInstruction);

      if (!response.text) {
        throw new Error("Gemini không trả về dữ liệu.");
      }

      return res.status(200).json(JSON.parse(response.text));
    }

    // =========================
    // GENERATE
    // =========================

    if (action === "generate") {
      if (typeof start !== "string" || !start.trim()) {
        return res.status(400).json({
          error: "Chất đầu không được để trống.",
        });
      }

      if (typeof end !== "string" || !end.trim()) {
        return res.status(400).json({
          error: "Chất cuối không được để trống.",
        });
      }

      const stepsCount = Number(minSteps);

      if (!Number.isInteger(stepsCount) || stepsCount < 1) {
        return res.status(400).json({
          error: "Số phương trình tối thiểu phải >= 1.",
        });
      }

     const systemInstruction = `Bạn là một Giáo sư Hóa học xuất sắc chuyên thiết kế chuỗi phản ứng hóa học.
Nhiệm vụ của bạn là tạo ra một chuỗi phản ứng hóa học hoàn chỉnh, liên tục và hợp lý xuất phát từ "Chất đầu" và kết thúc ở "Chất cuối".

YÊU CẦU QUAN TRỌNG:

1. Chuỗi phản ứng phải đi từ Chất đầu đến Chất cuối thông qua các phương trình phản ứng hóa học nối tiếp nhau liên tục. Chất sản phẩm của phản ứng trước phải là chất tham gia của phản ứng sau.
2. Tổng số phản ứng trong chuỗi phải LỚN HƠN HOẶC BẰNG số phương trình trung gian tối thiểu được yêu cầu. Có thể nhiều hơn để đảm bảo tính khả thi hóa học, tuyệt đối không được ít hơn.
3. Chỉ dùng phản ứng hóa học có thật trong thực tế, có thể xảy ra và chính xác về mặt lý thuyết. Không tự bịa phản ứng hay tạo chất ảo.
4. Các phương trình phản ứng phải được cân bằng chính xác hoàn toàn.
5. Tạo chuỗi LaTeX thật chuẩn:
   - Sử dụng các ký hiệu LaTeX như \\rightarrow (hoặc \\xrightleftharpoons cho phản ứng thuận nghịch).
   - Đặt điều kiện phản ứng TRÊN mũi tên bằng cách sử dụng lệnh \\xrightarrow{\\text{điều kiện}} hoặc \\xrightarrow{t^o}.
   - Ký hiệu kết tủa là \\downarrow, khí bay lên là \\uparrow.
   - Ví dụ: "Fe + 2HCl \\xrightarrow{\\text{loãng}} FeCl_2 + H_2\\uparrow".
6. Nếu không thể tạo ra bất kỳ chuỗi phản ứng hợp lệ nào từ Chất đầu đến Chất cuối, hãy trả về thông báo lỗi chi tiết ở trường "error" giải thích lý do hóa học cụ thể, và không trả về mảng "steps".`;

     const prompt = `Hãy tạo chuỗi phản ứng hóa học từ chất đầu "${start}" đến chất cuối "${end}" với số phương trình phản ứng trung gian ít nhất là ${stepsCount}.`;
      const response = await generate(prompt, systemInstruction);

      if (!response.text) {
        throw new Error("Gemini không trả về dữ liệu.");
      }

      return res.status(200).json(JSON.parse(response.text));
    }

    return res.status(400).json({
      error: "action phải là 'analyze' hoặc 'generate'.",
    });
  } catch (error: any) {
    console.error("CHAIN API ERROR:", error);

    return res.status(500).json({
      error: error?.message || "Lỗi máy chủ.",
    });
  }
}
