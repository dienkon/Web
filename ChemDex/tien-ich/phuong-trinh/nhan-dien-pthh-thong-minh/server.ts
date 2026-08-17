/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Local feedback storage configuration
const FEEDBACK_FILE = path.join(process.cwd(), "feedback_store.json");

async function readFeedbackLogs(): Promise<any[]> {
  try {
    if (!fs.existsSync(FEEDBACK_FILE)) {
      return [];
    }
    const data = await fs.promises.readFile(FEEDBACK_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading feedback logs:", err);
    return [];
  }
}

async function saveFeedbackLog(newLog: any): Promise<void> {
  try {
    const logs = await readFeedbackLogs();
    logs.push(newLog);
    await fs.promises.writeFile(FEEDBACK_FILE, JSON.stringify(logs, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving feedback log:", err);
  }
}

// Load environment variables
dotenv.config();

// Port configurations
const PORT = 3000;
const HOST = "0.0.0.0";

// Lazy Gemini client helper
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY is not configured or still has a placeholder value.");
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

async function startServer() {
  const app = express();
  
  // Parse JSON bodies
  app.use(express.json());

  // API Route: Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // API Route: User Feedback Rating
  app.post("/api/feedback", async (req, res) => {
    try {
      const { rawOCR, finalEquation, rating, comment } = req.body;
      if (!rating) {
        return res.status(400).json({ error: "Rating is required (like or dislike)." });
      }
      const newLog = {
        rawOCR: rawOCR || "",
        finalEquation: finalEquation || "",
        rating,
        comment: comment || "",
        timestamp: new Date().toISOString()
      };
      await saveFeedbackLog(newLog);
      console.log(`[Feedback Saved] Rating: ${rating}, Equation: ${finalEquation || rawOCR}`);
      return res.json({ success: true, message: "Feedback saved successfully!" });
    } catch (err: any) {
      console.error("Failed to save feedback:", err);
      return res.status(500).json({ error: "Failed to process feedback.", details: err.message });
    }
  });

  // API Route: Gemini Verification & Correction proxy
  app.post("/api/gemini/verify", async (req, res) => {
    try {
      const { 
        rawOCR, 
        repairedText, 
        localBalanced, 
        localReactionType, 
        localInferredProducts, 
        localInferenceReasoning,
        language
      } = req.body;

      if (!rawOCR) {
        return res.status(400).json({ error: "Thừa số 'rawOCR' là bắt buộc." });
      }

      const isVi = language === "vi";

      // Load historical dislikes and lessons learned for adaptive logic
      const historicalLogs = await readFeedbackLogs();
      const dislikes = historicalLogs.filter(log => log.rating === "dislike" && log.comment);
      
      let learningContext = "";
      if (dislikes.length > 0) {
        learningContext = isVi 
          ? "\n\n⚠️ BÀI HỌC KINH NGHIỆM TỪ PHẢN HỒI SAI SÓT TRƯỚC ĐÂY CỦA NGƯỜI DÙNG (BẮT BUỘC TRÁNH LẶP LẠI PHẠM SAI LẦM NÀY):\n" + dislikes.map((d, i) => `- Đối với phương trình "${d.rawOCR || d.finalEquation}", người dùng báo lỗi: "${d.comment}". Hãy đảm bảo phân tích của bạn lần này tuyệt đối chính xác và không lặp lại lỗi trên.`).join("\n")
          : "\n\n⚠️ LESSONS LEARNED FROM PAST DISLIKES/USER CORRECTIONS (MUST AVOID THESE MISTAKES):\n" + dislikes.map((d, i) => `- Past reported error when processing "${d.rawOCR || d.finalEquation}": "${d.comment}". Learn from this and ensure your current chemical analysis is highly accurate and free of these mistakes.`).join("\n");
      }

      // Check key and load Gemini client lazily
      let ai;
      try {
        ai = getGeminiClient();
      } catch (keyErr: any) {
        console.warn("Gemini API key error:", keyErr.message);
        return res.status(503).json({ 
          error: "Gemini API key not configured.", 
          details: keyErr.message 
        });
      }

      // Detailed prompt targeting user-requested enhancements
      const prompt = isVi ? `
Hãy kiểm chứng, sửa lỗi hóa học, dự đoán sản phẩm khuyết, cân bằng và phân tích chuyên sâu phương trình hóa học sau:
- Văn bản OCR nhận diện thô từ ảnh: "${rawOCR}"
- Sửa lỗi hóa học đề xuất bởi thuật toán cục bộ: "${repairedText}"
- Loại phản ứng đề xuất: "${localReactionType || "Chưa xác định"}"
- Các sản phẩm dự đoán cục bộ: ${JSON.stringify(localInferredProducts || [])}
- Cân bằng đề xuất: "${localBalanced || "Chưa cân bằng"}"
- Giải thích đề xuất: "${localInferenceReasoning || "Chưa có"}"

Yêu cầu Phân tích Hóa học Chi tiết (BẮT BUỘC TRẢ LỜI BẰNG TIẾNG VIỆT):
1. **Kiểm tra và Sửa lỗi Chất đầu vào**: Đánh giá xem các chất tham gia ở đầu vào có viết sai công thức hoặc sai hóa trị hay không (ví dụ: viết thiếu chỉ số, nhầm lẫn ký tự như 'CaCl,' thành 'CaCl2', 'K»CO3' thành 'K2CO3'). Giải thích chi tiết và cụ thể lỗi sai hóa trị hay sai ký tự này trong danh sách 'corrections'.
2. **Dự đoán sản phẩm khuyết**: Dự đoán và hoàn thiện các sản phẩm khuyết dựa trên các quy luật phản ứng hóa học chính xác (ví dụ: Zn + HCl tạo ra ZnCl2 + H2, Na + H2O tạo ra NaOH + H2).
3. **Cân bằng phương trình**: Cân bằng phương trình hóa học với các hệ số nguyên tối giản.
4. **Điều kiện xảy ra phản ứng**: Nêu cực kỳ chi tiết các điều kiện phản ứng (như nhiệt độ t°, áp suất, chất xúc tác đặc thù, nồng độ dung dịch axit/bazơ, dung môi nếu có) trong phần 'detailedMechanism'.
5. **Hiện tượng thực nghiệm**: Mô tả chi tiết hiện tượng thực nghiệm quan sát được (sự thay đổi màu sắc, xuất hiện chất kết tủa màu gì, giải phóng khí có màu hay không màu, có mùi hay không mùi, phản ứng tỏa nhiệt mạnh hay không).
6. **Phương trình Ion**: Cung cấp phương trình ion đầy đủ và phương trình ion rút gọn nếu xảy ra trong dung dịch.
7. **Phân tích Oxi hóa - Khử**: Nếu là phản ứng oxi hóa khử, chỉ rõ số oxi hóa của từng nguyên tố thay đổi thế nào, xác định chất oxi hóa, chất khử, quá trình oxi hóa, quá trình khử. Nếu không phải, giải thích lý do cụ thể.
8. **Ứng dụng thực tiễn & An toàn**: Nêu các ứng dụng thực tế trong công nghiệp, phòng thí nghiệm, đời sống và các cảnh báo an toàn quan trọng (độc tính, nguy cơ cháy nổ, tỏa nhiệt gây bỏng).
9. **Định dạng LaTeX**: Với mọi công thức hóa học hoặc ion xuất hiện trong phần mô tả bằng văn bản (ví dụ: H2O, CaCO3, Ba2+, Cl-, SO42-), hãy viết chúng dưới định dạng LaTeX sạch sẽ bọc trong ký hiệu $ (ví dụ: $H_2O$, $CaCO_3$, $Ba^{2+}$, $Cl^-$, $SO_4^{2-}$, $Fe_2(SO_4)_3$) để hiển thị đẹp mắt và chuyên nghiệp trên giao diện.
` : `
Please verify, correct chemical errors, predict missing products, balance, and deeply analyze the following chemical equation:
- Raw OCR text from image: "${rawOCR}"
- Repaired text proposed locally: "${repairedText}"
- Reaction type proposed: "${localReactionType || "Unknown"}"
- Predicted products locally: ${JSON.stringify(localInferredProducts || [])}
- Balanced equation proposed: "${localBalanced || "Unbalanced"}"
- Reasoning proposed: "${localInferenceReasoning || "None"}"

Detailed Chemistry Analysis Requirements (MUST ANSWER IN ENGLISH):
1. **Input Substance Error Analysis**: Verify if input reactants are chemically invalid, have incorrect valency, or contain OCR spelling/notation errors (e.g., 'CaCl,' corrected to 'CaCl2', 'K»CO3' corrected to 'K2CO3'). Explain these errors and corrections specifically in the 'corrections' list.
2. **Missing Product Prediction**: Predict and complete any missing products based on correct chemical reaction rules (e.g., Zn + HCl yields ZnCl2 + H2).
3. **Balancing**: Balance the equation using simplified integer coefficients.
4. **Reaction Conditions**: Detail all required reaction conditions (such as temperature t°, pressure, specific catalysts, concentration of acids/bases, solvents) in 'detailedMechanism'.
5. **Physical Phenomena**: Describe physical observations in detail (color changes, precipitation color, gas evolution, gas characteristics, heat release).
6. **Ionic Equations**: Write full and net ionic equations if occurring in aqueous solution.
7. **Redox Analysis**: If it is a redox reaction, specify changes in oxidation states, identify oxidizing/reducing agents, and detail oxidation/reduction half-reactions.
8. **Applications & Safety**: List practical applications in industry, labs, or daily life, along with safety hazards (toxicity, explosion risk, severe exothermicity).
9. **LaTeX Formatting**: For every chemical formula or ion that appears in the descriptive text (e.g., H2O, CaCO3, Ba2+, Cl-, SO42-), wrap them in $ as clean LaTeX (e.g., $H_2O$, $CaCO_3$, $Ba^{2+}$, $Cl^-$, $SO_4^{2-}$, $Fe_2(SO_4)_3$) so the frontend can format them beautifully.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          systemInstruction: `You are an expert chemistry professor and assistant.
Your task is to analyze, verify, correct, balance, and explain chemical equations with high precision.

${learningContext}

Rules:
* Do not perform basic text OCR.
* If reactants have chemical formulas with invalid valencies or syntax errors, detect and detail exactly what was wrong and how you corrected it.
* Recover missing subscripts and coefficients.
* Predict products only if they are chemically valid.
* Balance the equation accurately with integer coefficients.
* Specify reaction conditions, catalysts, and physical phenomena.
* Write the net ionic equation (phương trình ion rút gọn) ONLY, and oxidation-reduction analysis. Ensure the ionic equation is wrapped entirely in LaTeX $...$ (e.g. $Ba^{2+} + SO_4^{2-} \rightarrow BaSO_4$).
* Format all chemical formulas and ions inside descriptions with LaTeX wrapped in $ (e.g. $H_2O$, $Ba^{2+}$, $Fe^{3+}$, $SO_4^{2-}$).
* Write all explanations strictly in ${isVi ? "Vietnamese" : "English"}.
* Output JSON only matching the schema.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              originalOCR: { 
                type: Type.STRING, 
                description: "The raw OCR text sent in the request." 
              },
              correctedEquation: { 
                type: Type.STRING, 
                description: "The cleaned, corrected chemical equation string (with coefficients and subscripts properly formatted, e.g., 'CaCO3 + 2HCl -> CaCl2 + CO2 + H2O')." 
              },
              reactionType: { 
                type: Type.STRING, 
                description: "The type of the reaction (e.g. 'Phản ứng thế', 'Phản ứng trao đổi')." 
              },
              productsPredicted: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of product formulas predicted (e.g. ['CaCl2', 'CO2', 'H2O'])."
              },
              balancedEquation: { 
                type: Type.STRING, 
                description: "The fully balanced equation with correct integer coefficients (e.g., 'CaCO3 + 2HCl -> CaCl2 + CO2 + H2O')." 
              },
              confidence: { 
                type: Type.INTEGER, 
                description: "Your confidence score from 0 to 100." 
              },
              corrections: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "A bulleted list of actual corrections made to element symbols or subscripts."
              },
              reasoning: { 
                type: Type.STRING, 
                description: "A short explanation of how the reaction occurs and how it was balanced." 
              },
              ionicEquation: {
                type: Type.STRING,
                description: "The net ionic equation (phương trình ion rút gọn) ONLY, formatted by wrapping the whole equation in LaTeX math mode with $, for example: '$Ba^{2+} + SO_4^{2-} \\rightarrow BaSO_4$'. Do NOT include the full/complete ionic equation, ONLY the net/shortened ionic equation (phương trình ion rút gọn). If not solution-based or ionic, explain why."
              },
              redoxAnalysis: {
                type: Type.STRING,
                description: "Oxidation states analysis, identifying oxidizing/reducing agents, oxidation/reduction half-reactions. If not redox, explain why."
              },
              detailedMechanism: {
                type: Type.STRING,
                description: "Detailed reaction mechanism, required conditions (temperature, pressure, catalyst), and physical phenomena (color change, precipitate, gas release)."
              },
              practicalApplication: {
                type: Type.STRING,
                description: "Industrial or laboratory applications, real-world uses, and safety warnings (toxicity, heat release, explosion hazard)."
              }
            },
            required: [
              "originalOCR",
              "correctedEquation",
              "reactionType",
              "productsPredicted",
              "balancedEquation",
              "confidence",
              "corrections",
              "reasoning",
              "ionicEquation",
              "redoxAnalysis",
              "detailedMechanism",
              "practicalApplication"
            ]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Không nhận được phản hồi dạng chữ từ Gemini.");
      }

      // Try to parse JSON output to validate
      const parsedJSON = JSON.parse(responseText.trim());
      return res.json(parsedJSON);

    } catch (err: any) {
      console.error("Gemini route error:", err);
      return res.status(500).json({ 
        error: "Cổng thông tin Gemini gặp lỗi xử lý.", 
        details: err.message 
      });
    }
  });

  // Setup Static Files & SPA Fallback for production or Vite for dev
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up dev server with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static production files from dist/...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
