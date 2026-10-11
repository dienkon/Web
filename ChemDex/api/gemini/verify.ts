import { Type } from "@google/genai";
import {
  callWithGeminiFallback,
  generateContentWithModelFallback,
  safeParseJson,
} from "./client";

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const {
    rawOCR,
    repairedText,
    localBalanced,
    localReactionType,
    localInferredProducts,
    localInferenceReasoning,
    language,
  } = body || {};

  if (!rawOCR) {
    return res.status(400).json({ error: "Thừa số 'rawOCR' là bắt buộc." });
  }

  const isVi = language === "vi";

  const prompt = isVi
    ? `
Hãy kiểm chứng, sửa lỗi hóa học, dự đoán sản phẩm khuyết, cân bằng và phân tích chuyên sâu phương trình hóa học sau:
- Văn bản OCR nhận diện thô từ ảnh: "${rawOCR}"
- Sửa lỗi hóa học đề xuất bởi thuật toán cục bộ: "${repairedText || ""}"
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
- Repaired text proposed locally: "${repairedText || ""}"
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

  const schema = {
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
  };

  const systemInstruction = `You are an expert chemistry professor and assistant.
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
* Output JSON only matching the schema.`;

  try {
    const response = await callWithGeminiFallback(async (ai) => {
      return await generateContentWithModelFallback(
        ai,
        "gemini-3.1-flash-lite",
        () => ({
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: schema,
          },
        })
      );
    });

    const responseText = response?.text;
    if (!responseText) {
      throw new Error("Không nhận được phản hồi dạng chữ từ Gemini.");
    }

    const parsedJSON = safeParseJson(responseText);
    if (!parsedJSON) {
      throw new Error("Không thể phân tích phản hồi JSON từ Gemini.");
    }

    return res.status(200).json(parsedJSON);
  } catch (err: any) {
    console.error("Gemini verify execution error:", err);

    // Provide graceful chemistry fallback if AI fails
    const fallbackEquation = localBalanced || repairedText || rawOCR;
    const fallbackResponse = {
      originalOCR: rawOCR,
      correctedEquation: repairedText || rawOCR,
      reactionType: localReactionType || (isVi ? "Phản ứng hóa học" : "Chemical reaction"),
      productsPredicted: localInferredProducts || [],
      balancedEquation: fallbackEquation,
      confidence: 70,
      corrections: [
        isVi
          ? "Phản hồi dự phòng tự động từ bộ phân tích cục bộ."
          : "Automated fallback response from local analysis engine."
      ],
      reasoning: localInferenceReasoning || (isVi ? "Phân tích và cân bằng dựa trên mô hình hóa học cục bộ." : "Analyzed and balanced using local chemical rules."),
      ionicEquation: isVi ? "Không áp dụng hoặc chưa xác định trong dung dịch." : "Not applicable or undetermined in solution.",
      redoxAnalysis: isVi ? "Xác định theo số oxi hóa chuẩn của các nguyên tố." : "Determined by standard elemental oxidation numbers.",
      detailedMechanism: isVi ? "Điều kiện phản ứng thông thường." : "Standard reaction conditions.",
      practicalApplication: isVi ? "Ứng dụng trong thí nghiệm học tập." : "Educational lab application.",
    };

    return res.status(200).json(fallbackResponse);
  }
}
