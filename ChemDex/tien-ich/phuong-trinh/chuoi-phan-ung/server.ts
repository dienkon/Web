import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Lazy Gemini client giống file pthh
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("Thiếu GEMINI_API_KEY trong file .env hoặc biến môi trường.");
    }

    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  return aiClient;
}

// JSON Schema for chemical steps
const chemicalResponseSchema = {
  type: Type.OBJECT,
  properties: {
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          equation: {
            type: Type.STRING,
            description: "Plain text chemical equation, e.g., 'Fe + 2HCl -> FeCl2 + H2'",
          },
          latex: {
            type: Type.STRING,
            description: "LaTeX formula of the equation, e.g., 'Fe + 2HCl \\rightarrow FeCl_2 + H_2\\uparrow'",
          },
          latexWithCondition: {
            type: Type.STRING,
            description:
              "LaTeX equation with condition over the reaction arrow, e.g., 'Fe + 2HCl \\xrightarrow{\\text{loãng}} FeCl_2 + H_2\\uparrow' or 'CaCO_3 \\xrightarrow{t^o} CaO + CO_2\\uparrow'",
          },
          condition: {
            type: Type.STRING,
            description: "Reaction condition in Vietnamese, e.g., 'Nhiệt độ phòng', 't°', 'Dung dịch HCl loãng'",
          },
          explanation: {
            type: Type.STRING,
            description: "Short Vietnamese explanation of this chemical reaction step.",
          },
        },
        required: ["equation", "latex", "latexWithCondition", "condition", "explanation"],
      },
    },
    error: {
      type: Type.STRING,
      description:
        "Error message in Vietnamese if the requested chain or reaction is chemically impossible or invalid.",
    },
  },
} as const;

const MAIN_MODEL = "gemini-3.5-flash-lite";
const FALLBACK_MODEL = "gemini-3.1-flash-lite";

// Route for analyzing reaction chain (Tab 1)
app.post("/api/analyze", async (req, res) => {
  const { chain } = req.body;

  if (!chain || typeof chain !== "string" || !chain.trim()) {
    return res.status(400).json({ error: "Chuỗi phản ứng không được để trống." });
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

  try {
    const ai = getGeminiClient();

    let response;
    try {
      response = await ai.models.generateContent({
        model: MAIN_MODEL,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: chemicalResponseSchema,
        },
      });
    } catch (err: any) {
      console.warn(`Failed with ${MAIN_MODEL}, retrying with ${FALLBACK_MODEL}...`, err.message);

      response = await ai.models.generateContent({
        model: FALLBACK_MODEL,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: chemicalResponseSchema,
        },
      });
    }

    if (!response.text) {
      throw new Error("Không nhận được phản hồi từ AI.");
    }

    const data = JSON.parse(response.text.trim());
    return res.json(data);
  } catch (error: any) {
    console.error("Gemini Analyze Error:", error);
    return res.status(500).json({
      error: error.message || "Đã xảy ra lỗi khi phân tích chuỗi phản ứng. Vui lòng thử lại.",
    });
  }
});

// Route for generating reaction chain (Tab 2)
app.post("/api/generate-chain", async (req, res) => {
  const { start, end, minSteps } = req.body;

  if (!start || typeof start !== "string" || !start.trim()) {
    return res.status(400).json({ error: "Chất đầu không được để trống." });
  }
  if (!end || typeof end !== "string" || !end.trim()) {
    return res.status(400).json({ error: "Chất cuối không được để trống." });
  }

  const stepsCount = parseInt(minSteps, 10);
  if (Number.isNaN(stepsCount) || stepsCount < 1) {
    return res.status(400).json({ error: "Số phương trình trung gian tối thiểu phải lớn hơn hoặc bằng 1." });
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

  try {
    const ai = getGeminiClient();

    let response;
    try {
      response = await ai.models.generateContent({
        model: MAIN_MODEL,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: chemicalResponseSchema,
        },
      });
    } catch (err: any) {
      console.warn(`Failed with ${MAIN_MODEL}, retrying with ${FALLBACK_MODEL}...`, err.message);

      response = await ai.models.generateContent({
        model: FALLBACK_MODEL,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: chemicalResponseSchema,
        },
      });
    }

    if (!response.text) {
      throw new Error("Không nhận được phản hồi từ AI.");
    }

    const data = JSON.parse(response.text.trim());
    return res.json(data);
  } catch (error: any) {
    console.error("Gemini Generate Error:", error);
    return res.status(500).json({
      error: error.message || "Đã xảy ra lỗi khi tạo chuỗi phản ứng. Vui lòng thử lại.",
    });
  }
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Running on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});