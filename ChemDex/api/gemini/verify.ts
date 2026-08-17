import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error(
        "GEMINI_API_KEY is not configured or still has a placeholder value.",
      );
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

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      rawOCR,
      repairedText,
      localBalanced,
      localReactionType,
      localInferredProducts,
      localInferenceReasoning,
      language,
    } = req.body || {};

    if (!rawOCR) {
      return res.status(400).json({ error: "Thừa số 'rawOCR' là bắt buộc." });
    }

    const isVi = language === "vi";
    const ai = getGeminiClient();

    const prompt = isVi
      ? `
Hãy kiểm chứng, sửa lỗi hóa học, dự đoán sản phẩm khuyết, cân bằng và phân tích chuyên sâu phương trình hóa học sau:
- Văn bản OCR nhận diện thô từ ảnh: "${rawOCR}"
- Sửa lỗi hóa học đề xuất bởi thuật toán cục bộ: "${repairedText}"
- Loại phản ứng đề xuất: "${localReactionType || "Chưa xác định"}"
- Các sản phẩm dự đoán cục bộ: ${JSON.stringify(localInferredProducts || [])}
- Cân bằng đề xuất: "${localBalanced || "Chưa cân bằng"}"
- Giải thích đề xuất: "${localInferenceReasoning || "Chưa có"}"

Yêu cầu Phân tích Hóa học Chi tiết (BẮT BUỘC TRẢ LỜI BẰNG TIẾNG VIỆT):
1. **Kiểm tra và Sửa lỗi Chất đầu vào**: Đánh giá xem các chất tham gia ở đầu vào có viết sai công thức hoặc sai hóa trị hay không.
2. **Dự đoán sản phẩm khuyết**: Dự đoán và hoàn thiện các sản phẩm khuyết dựa trên các quy luật phản ứng hóa học chính xác.
3. **Cân bằng phương trình**: Cân bằng phương trình hóa học với các hệ số nguyên tối giản.
4. **Điều kiện xảy ra phản ứng**: Nêu cực kỳ chi tiết các điều kiện phản ứng.
5. **Hiện tượng thực nghiệm**: Mô tả chi tiết hiện tượng thực nghiệm quan sát được.
6. **Phương trình Ion**: Cung cấp phương trình ion rút gọn nếu xảy ra trong dung dịch.
7. **Phân tích Oxi hóa - Khử**: Nếu là phản ứng oxi hóa khử, chỉ rõ số oxi hóa.
8. **Ứng dụng thực tiễn & An toàn**: Nêu các ứng dụng thực tế và cảnh báo an toàn.
9. **Định dạng LaTeX**: Mọi công thức hóa học/ion phải bọc trong $...$.
`
      : `
Please verify, correct chemical errors, predict missing products, balance, and deeply analyze the following chemical equation:
- Raw OCR text from image: "${rawOCR}"
- Repaired text proposed locally: "${repairedText}"
- Reaction type proposed: "${localReactionType || "Unknown"}"
- Predicted products locally: ${JSON.stringify(localInferredProducts || [])}
- Balanced equation proposed: "${localBalanced || "Unbalanced"}"
- Reasoning proposed: "${localInferenceReasoning || "None"}"

Detailed Chemistry Analysis Requirements (MUST ANSWER IN ENGLISH):
1. **Input Substance Error Analysis**: Verify if input reactants are chemically invalid, have incorrect valency, or contain OCR spelling/notation errors.
2. **Missing Product Prediction**: Predict and complete any missing products.
3. **Balancing**: Balance the equation using simplified integer coefficients.
4. **Reaction Conditions**: Detail all required reaction conditions.
5. **Physical Phenomena**: Describe physical observations in detail.
6. **Ionic Equations**: Write net ionic equation if occurring in aqueous solution.
7. **Redox Analysis**: If it is a redox reaction, specify changes in oxidation states.
8. **Applications & Safety**: List practical applications and safety hazards.
9. **LaTeX Formatting**: Wrap all chemical formulas and ions in $...$.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        systemInstruction: `You are an expert chemistry professor and assistant.
Your task is to analyze, verify, correct, balance, and explain chemical equations with high precision.

Rules:
* Do not perform basic text OCR.
* If reactants have chemical formulas with invalid valencies or syntax errors, detect and detail exactly what was wrong and how you corrected it.
* Recover missing subscripts and coefficients.
* Predict products only if they are chemically valid.
* Balance the equation accurately with integer coefficients.
* Specify reaction conditions, catalysts, and physical phenomena.
* Write the net ionic equation (phương trình ion rút gọn) ONLY.
* Format all chemical formulas and ions inside descriptions with LaTeX wrapped in $...$.
* Write all explanations strictly in ${isVi ? "Vietnamese" : "English"}.
* Output JSON only matching the schema.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            originalOCR: { type: Type.STRING },
            correctedEquation: { type: Type.STRING },
            reactionType: { type: Type.STRING },
            productsPredicted: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            balancedEquation: { type: Type.STRING },
            confidence: { type: Type.INTEGER },
            corrections: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            reasoning: { type: Type.STRING },
            ionicEquation: { type: Type.STRING },
            redoxAnalysis: { type: Type.STRING },
            detailedMechanism: { type: Type.STRING },
            practicalApplication: { type: Type.STRING },
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
            "practicalApplication",
          ],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      return res
        .status(500)
        .json({ error: "Không nhận được phản hồi dạng chữ từ Gemini." });
    }

    const parsedJSON = JSON.parse(responseText.trim());
    return res.json(parsedJSON);
  } catch (err: any) {
    return res.status(500).json({
      error: "Cổng thông tin Gemini gặp lỗi xử lý.",
      details: err?.message || String(err),
    });
  }
}
