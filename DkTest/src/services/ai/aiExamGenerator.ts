import mammoth from "mammoth";
import { getAiClient, defaultModel } from "./aiClient.js";
import { aiExamImportResultSchema } from "./aiSchema.js";
import { Type } from "@google/genai";

export async function parseDocxFile(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.convertToHtml({ buffer });
    return result.value || "";
  } catch (err: any) {
    console.error("Mammoth DOCX parse error:", err);
    throw new Error(`Không thể đọc định dạng file Word. Hãy đảm bảo file ở định dạng .docx chuẩn. (${err.message || ""})`);
  }
}

const schema = {
  type: Type.OBJECT,
  properties: {
    version: { type: Type.INTEGER, description: "Always 1" },
    exam: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        timeLimit: { type: Type.INTEGER },
      },
    },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ["id", "title"],
      },
    },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          type: {
            type: Type.STRING,
            description: "Must be 'single_choice', 'multiple_choice', 'true_false', or 'short_answer'",
          },
          text: { type: Type.STRING },
          explanation: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                text: { type: Type.STRING },
              },
              required: ["id", "text"],
            },
          },
          correctOptionIds: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          statements: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                text: { type: Type.STRING },
                correctAnswer: { type: Type.BOOLEAN },
              },
              required: ["text", "correctAnswer"],
            },
          },
          acceptedAnswers: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          sectionId: { type: Type.STRING },
          points: { type: Type.NUMBER },
          answerSource: {
            type: Type.STRING,
            description: "Must be 'document', 'ai_generated', or 'unknown'",
          },
          answerConfidence: { type: Type.NUMBER },
        },
        required: ["type", "text"],
      },
    },
  },
  required: ["questions"],
};

const latexAndFormatGuideline = `
CRITICAL LATEX & MATH FORMATTING REQUIREMENTS:
1. MATHEMATICAL & SCIENTIFIC FORMULAS:
   - YOU MUST RECOGNIZE and FORMAT all mathematical formulas, numbers with exponents, roots, fractions, algebra, geometry, trigonometry, calculus, vectors, sets, intervals, limits, matrices, units, and chemistry reactions into standard LaTeX format.
   - Use '$...$' for inline math expressions inside question text, section descriptions, explanations, and options (e.g. '$x^2 + 2x - 3 = 0$', '$\\frac{a}{b}$', '$\\sqrt{x^2 + 1}$', '$\\alpha, \\beta, \\Delta$', '$\\vec{u} = (1; 2)$', '$f\'(x)$', '$\\int_{0}^{1} x dx$', '$H_2SO_4$', '$[-\\infty; 3)$', '$\\Delta > 0$').
   - Use '$$...$$' for centered standalone multi-line equations or complex mathematical systems.
   - For multiple choice options (A, B, C, D), if an option is a mathematical expression, variable, fraction, or equation, ALWAYS wrap it in '$...$' (e.g., text: '$x = 2$', text: '$\\frac{\\sqrt{3}}{2}$', text: '$y = 2x + 1$').
   - DO NOT leave math as raw plain text like 'x^2' or 'sqrt(x)' or '1/2'. Convert them strictly to '$x^2$', '$\\sqrt{x}$', '$\\frac{1}{2}$'.

2. QUESTION CLEANUP & PRESERVATION:
   - REMOVE QUESTION PREFIXES: Strip prefixes like "Câu 1:", "Câu 2.", "Bài 3:", "Question 4:", "Q5." from the question text. The "text" field must contain ONLY the actual content of the question.
   - CLEAN OPTIONS: Strip prefixes like "A.", "B.", "C.", "D.", "A)", "(B)" from the option text. The option text must contain only the answer content itself.
   - SHARED CONTEXT / READING PASSAGES: If multiple questions share a reading passage, common scenario, or data table, extract the shared text into a Section (put the full passage in Section "description") and link the sub-questions via "sectionId". Do not duplicate the shared passage in each question.
   - INFER ACCURATE ANSWERS: If answers are not explicitly marked in the document, deduce the correct answer logically and mark answerSource="ai_generated" with confidence (0.8 - 1.0). If an answer is clearly marked, mark answerSource="document".
`;

const systemInstructionDocument = `You are an expert exam document parser for DkTEST.
Your job is to convert educational exam files (Word/docx) into clean, standard structured exam JSON.
${latexAndFormatGuideline}
Return ONLY valid structured JSON matching the requested schema.`;

const systemInstructionPrompt = `You are an expert educational exam generator for DkTEST.
Your job is to generate a comprehensive, high-quality exam based on the user's prompt (topic, subject, grade level, number of questions, difficulty).
${latexAndFormatGuideline}
- Always generate clear, accurate questions with rigorous correct answers and detailed explanations.
- Default to single_choice or multiple_choice if question types are not specified.
- Set answerSource="ai_generated" for all generated questions.
Return ONLY valid structured JSON matching the requested schema.`;

function normalizeQuestionsAndExam(rawData: any, defaultTitle: string, defaultDesc: string) {
  const rawQuestions = Array.isArray(rawData?.questions) ? rawData.questions : [];
  const rawSections = Array.isArray(rawData?.sections) ? rawData.sections : [];

  const normalizedSections = rawSections.map((sec: any, idx: number) => ({
    id: String(sec.id || `sec-${Date.now()}-${idx}`),
    title: String(sec.title || `Phần ${idx + 1}`),
    description: String(sec.description || ""),
    order: idx,
  }));

  const normalizedQuestions: any[] = [];

  rawQuestions.forEach((q: any, idx: number) => {
    if (!q || (!q.text && !q.options?.length)) return;

    let type = String(q.type || "single_choice").toLowerCase();
    if (type.includes("true") || type.includes("false") || type.includes("tf")) {
      type = "true_false";
    } else if (type.includes("short") || type.includes("fill") || type.includes("essay") || type.includes("text")) {
      type = "short_answer";
    } else if (type.includes("multi")) {
      type = "multiple_choice";
    } else {
      type = "single_choice";
    }

    const questionId = String(q.id || `q-${Date.now()}-${idx}`);
    let text = String(q.text || "").trim();

    // Strip leading "Câu X:", "Bài X:", "Question X." if still present
    text = text.replace(/^(câu|bài|question|q)\s*\d+[\s.:\-–—]+/i, "").trim();

    const normalizedQ: any = {
      id: questionId,
      type,
      text: text || "Câu hỏi không có nội dung",
      explanation: String(q.explanation || "").trim(),
      sectionId: q.sectionId ? String(q.sectionId) : null,
      points: typeof q.points === "number" && q.points > 0 ? q.points : 1,
      order: idx,
      answerSource: q.answerSource === "document" ? "document" : "ai_generated",
      answerConfidence: typeof q.answerConfidence === "number" ? q.answerConfidence : 0.95,
    };

    if (type === "single_choice" || type === "multiple_choice") {
      let rawOptions = Array.isArray(q.options) ? q.options : [];
      
      // If options are missing, create fallback options A, B, C, D
      if (rawOptions.length < 2) {
        rawOptions = [
          { id: "opt-0", text: "Đáp án A" },
          { id: "opt-1", text: "Đáp án B" },
          { id: "opt-2", text: "Đáp án C" },
          { id: "opt-3", text: "Đáp án D" },
        ];
      }

      normalizedQ.options = rawOptions.map((opt: any, optIdx: number) => {
        let optText = String(opt?.text || "").trim();
        // Strip leading A., B., C., D. or A), B)
        optText = optText.replace(/^[A-Da-d][\s.):\-–—]+/, "").trim();
        return {
          id: String(opt?.id || `opt-${optIdx}`),
          text: optText || `Lựa chọn ${String.fromCharCode(65 + optIdx)}`,
        };
      });

      // Normalize correctOptionIds
      let correctIds: string[] = [];
      if (Array.isArray(q.correctOptionIds) && q.correctOptionIds.length > 0) {
        correctIds = q.correctOptionIds.map((cid: any) => String(cid));
      } else {
        // Fallback to first option if none specified
        correctIds = [normalizedQ.options[0].id];
      }
      normalizedQ.correctOptionIds = correctIds;
    } else if (type === "true_false") {
      const rawStatements = Array.isArray(q.statements) ? q.statements : [];
      if (rawStatements.length === 0) {
        normalizedQ.statements = [
          { id: "stmt-0", text: "Mệnh đề A", correctAnswer: true },
          { id: "stmt-1", text: "Mệnh đề B", correctAnswer: false },
        ];
      } else {
        normalizedQ.statements = rawStatements.map((stmt: any, sIdx: number) => ({
          id: String(stmt?.id || `stmt-${sIdx}`),
          text: String(stmt?.text || "").trim() || `Mệnh đề ${sIdx + 1}`,
          correctAnswer: Boolean(stmt?.correctAnswer),
        }));
      }
    } else if (type === "short_answer") {
      const rawAnswers = Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers : [];
      normalizedQ.acceptedAnswers = rawAnswers.length > 0
        ? rawAnswers.map((ans: any) => String(ans).trim()).filter(Boolean)
        : ["Đáp án đúng"];
    }

    normalizedQuestions.push(normalizedQ);
  });

  const finalExam = {
    version: 1 as const,
    exam: {
      title: rawData?.exam?.title || defaultTitle,
      description: rawData?.exam?.description || defaultDesc,
      timeLimit: typeof rawData?.exam?.timeLimit === "number" ? rawData.exam.timeLimit : 60,
    },
    sections: normalizedSections,
    questions: normalizedQuestions,
    statistics: {
      totalQuestions: normalizedQuestions.length,
      byType: {
        singleChoice: normalizedQuestions.filter((q) => q.type === "single_choice").length,
        multipleChoice: normalizedQuestions.filter((q) => q.type === "multiple_choice").length,
        trueFalse: normalizedQuestions.filter((q) => q.type === "true_false").length,
        shortAnswer: normalizedQuestions.filter((q) => q.type === "short_answer").length,
      },
      answersFromDocument: normalizedQuestions.filter((q) => q.answerSource === "document").length,
      answersGeneratedByAI: normalizedQuestions.filter((q) => q.answerSource === "ai_generated").length,
      answersUnknown: normalizedQuestions.filter((q) => q.answerSource === "unknown").length,
    },
  };

  return aiExamImportResultSchema.parse(finalExam);
}

export async function processExamFromPromptStream(prompt: string, onProgress: (msg: string) => void) {
  const ai = getAiClient();
  const startTime = Date.now();
  
  onProgress(JSON.stringify({ 
    type: "log", 
    level: "info",
    percent: 15,
    message: "Khởi động mô hình Gemini AI để phân tích yêu cầu...",
    timestamp: new Date().toLocaleTimeString("vi-VN")
  }));
  
  onProgress(JSON.stringify({ 
    type: "log", 
    level: "info",
    percent: 30,
    message: "Đang xây dựng ngân hàng câu hỏi và nhận diện công thức toán/hóa học chuẩn LaTeX ($...$)...",
    timestamp: new Date().toLocaleTimeString("vi-VN")
  }));
  
  const response = await ai.models.generateContent({
    model: defaultModel,
    contents: `Tạo đề thi đầy đủ, chính xác, định dạng LaTeX chuẩn cho công thức toán học/hóa học theo yêu cầu sau:\n"${prompt}"`,
    config: {
      systemInstruction: systemInstructionPrompt,
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  onProgress(JSON.stringify({ 
    type: "log", 
    level: "success",
    percent: 75,
    message: "Gemini AI đã tạo xong nội dung thô. Đang kiểm tra cấu trúc dữ liệu JSON...",
    timestamp: new Date().toLocaleTimeString("vi-VN")
  }));

  try {
    const jsonStr = response.text || "{}";
    const rawData = JSON.parse(jsonStr);
    
    onProgress(JSON.stringify({ 
      type: "log", 
      level: "info",
      percent: 90,
      message: `Đang chuẩn hóa các câu hỏi (${rawData?.questions?.length || 0} câu) và kiểm tra công thức LaTeX...`,
      timestamp: new Date().toLocaleTimeString("vi-VN")
    }));

    const validatedData = normalizeQuestionsAndExam(rawData, "Đề thi tự động từ AI", prompt);

    onProgress(JSON.stringify({ 
      type: "log", 
      level: "success",
      percent: 100,
      message: `Hoàn tất tạo đề thành công trong ${((Date.now() - startTime) / 1000).toFixed(1)}s! Sẵn sàng xuất đề.`,
      timestamp: new Date().toLocaleTimeString("vi-VN")
    }));

    return validatedData;
  } catch (e: any) {
    console.error("Prompt parse error:", e);
    throw new Error(`Không thể tạo đề từ yêu cầu này. (${e.message || ""}). Vui lòng thử lại.`);
  }
}

export async function processExamInChunks(htmlContent: string, onProgress: (msg: string) => void) {
  const ai = getAiClient();
  const startTime = Date.now();
  
  if (!htmlContent || htmlContent.trim().length === 0) {
    throw new Error("File Word không có nội dung văn bản để phân tích.");
  }

  onProgress(JSON.stringify({ 
    type: "log", 
    level: "info",
    percent: 10,
    message: `Đã đọc thành công nội dung Word (${htmlContent.length.toLocaleString()} ký tự). Đang phân đoạn tài liệu...`,
    timestamp: new Date().toLocaleTimeString("vi-VN")
  }));

  // Split HTML into reasonable chunks (15000 chars)
  const CHUNK_SIZE = 15000;
  const chunks: string[] = [];
  
  let currentPos = 0;
  while (currentPos < htmlContent.length) {
    let nextPos = currentPos + CHUNK_SIZE;
    if (nextPos < htmlContent.length) {
      const safeSplit = htmlContent.indexOf("</p>", nextPos - 2000);
      if (safeSplit !== -1 && safeSplit < nextPos + 2000) {
        nextPos = safeSplit + 4;
      }
    }
    chunks.push(htmlContent.slice(currentPos, nextPos));
    currentPos = nextPos;
  }

  if (chunks.length === 0) {
    chunks.push(htmlContent);
  }

  onProgress(JSON.stringify({ 
    type: "log", 
    level: "info",
    percent: 20,
    message: `Tài liệu được chia thành ${chunks.length} phần để xử lý song song & chuẩn hóa LaTeX...`,
    timestamp: new Date().toLocaleTimeString("vi-VN")
  }));

  const combinedRawData: { exam?: any; sections: any[]; questions: any[] } = {
    sections: [],
    questions: [],
  };
  
  for (let i = 0; i < chunks.length; i++) {
    const chunkPercent = Math.round(20 + ((i + 1) / chunks.length) * 65);
    onProgress(JSON.stringify({
      type: "log",
      level: "info",
      current: i + 1,
      total: chunks.length,
      percent: chunkPercent,
      message: `Đang gửi phần ${i + 1}/${chunks.length} tới Gemini AI: nhận diện câu hỏi, tách đáp án & chuyển đổi công thức Toán/Lý/Hóa sang LaTeX...`,
      timestamp: new Date().toLocaleTimeString("vi-VN")
    }));
    
    try {
      const response = await ai.models.generateContent({
        model: defaultModel,
        contents: `Phân tích phần ${i + 1}/${chunks.length} của đề thi. Nhận diện chính xác câu hỏi, đáp án, và chuyển đổi mọi công thức toán học/hóa học sang LaTeX ($...$):\n\n${chunks[i]}`,
        config: {
          systemInstruction: systemInstructionDocument,
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      });

      const jsonStr = response.text || "{}";
      const rawChunk = JSON.parse(jsonStr);
      
      const foundQuestions = Array.isArray(rawChunk.questions) ? rawChunk.questions.length : 0;
      const foundSections = Array.isArray(rawChunk.sections) ? rawChunk.sections.length : 0;

      onProgress(JSON.stringify({
        type: "log",
        level: "success",
        percent: chunkPercent,
        message: `Phần ${i + 1}/${chunks.length}: Phát hiện thành công ${foundQuestions} câu hỏi và ${foundSections} phần thi.`,
        timestamp: new Date().toLocaleTimeString("vi-VN")
      }));

      if (rawChunk.exam && !combinedRawData.exam) {
        combinedRawData.exam = rawChunk.exam;
      }
      if (Array.isArray(rawChunk.sections)) {
        combinedRawData.sections.push(...rawChunk.sections);
      }
      if (Array.isArray(rawChunk.questions)) {
        combinedRawData.questions.push(...rawChunk.questions);
      }
    } catch (e: any) {
      console.error(`Error processing chunk ${i + 1}:`, e);
      onProgress(JSON.stringify({
        type: "log",
        level: "warning",
        percent: chunkPercent,
        message: `Cảnh báo phần ${i + 1}: ${e.message || "Lỗi xử lý nhẹ, đang tiếp tục..."}`,
        timestamp: new Date().toLocaleTimeString("vi-VN")
      }));
    }
  }

  onProgress(JSON.stringify({ 
    type: "log", 
    level: "info",
    percent: 92,
    message: "Tổng hợp toàn bộ câu hỏi, chuẩn hóa LaTeX ($...$), gán ID và tạo thống kê đề thi...",
    timestamp: new Date().toLocaleTimeString("vi-VN")
  }));

  if (combinedRawData.questions.length === 0) {
    throw new Error("AI không tìm thấy câu hỏi hợp lệ nào trong file Word. Vui lòng kiểm tra lại nội dung file.");
  }

  const validatedData = normalizeQuestionsAndExam(combinedRawData, "Đề thi tự động từ file Word", "Được tạo tự động từ tài liệu Word tải lên.");
  
  onProgress(JSON.stringify({ 
    type: "log", 
    level: "success",
    percent: 100,
    message: `Đã hoàn tất trích xuất ${validatedData.questions.length} câu hỏi thành công trong ${((Date.now() - startTime) / 1000).toFixed(1)}s!`,
    timestamp: new Date().toLocaleTimeString("vi-VN")
  }));

  return validatedData;
}
