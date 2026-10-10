import {
  CURRENT_EXAM_JSON_VERSION,
  FullExportSchemaV3,
  type ExportV3,
} from "../../../src/utils/json/schema";
import type { ExtractedExam } from "./types";

/**
 * Chuẩn hóa đối tượng ExtractedExam thành cấu trúc ExportV3 chuẩn DkTEST.
 * Đảm bảo:
 * - Version = 3, Source = "DkTEST"
 * - Section ID hợp lệ ("sec-1") và mọi câu hỏi đều liên kết sectionId này
 * - Option ID duy nhất, correctOptionIds liên kết đúng
 * - Điểm từng câu = 1
 * - Kiểm tra Zod schema nghiêm ngặt trước khi xuất
 */
export function normalizeToDkTestJson(extracted: ExtractedExam): ExportV3 {
  const sectionId = "sec-1";

  const dktestPayload: ExportV3 = {
    version: CURRENT_EXAM_JSON_VERSION as 3,
    source: "DkTEST",
    exportedAt: new Date().toISOString(),
    exportType: "exam",
    exam: {
      title: extracted.title || "Đề thi trích xuất từ Web",
      timeLimit: extracted.suggestedTimeLimit || 90,
      shuffleQuestions: false,
      showResults: true,
      showScore: true,
      showDetails: true,
      description: `Đề thi trích xuất từ ${extracted.sourceUrl} (${extracted.domain}) qua Web-to-DkTEST Importer.`,
      subject: extracted.suggestedSubject || "Toán",
      gradeCategory: extracted.suggestedGrade || "12",
      accessMode: "free",
      priceVnd: 0,
      salesEnabled: true,
    },
    sections: [
      {
        id: sectionId,
        title: "Phần I. Câu hỏi trắc nghiệm nhiều phương án lựa chọn",
        description: `Thí sinh trả lời từ câu 1 đến câu ${extracted.questions.length}`,
        order: 0,
        enabled: true,
      },
    ],
    questions: extracted.questions.map((q, idx) => {
      // Đảm bảo id câu hỏi duy nhất và hợp lệ
      const qId = `q-${idx + 1}`;

      // Chuẩn hóa options
      const normalizedOptions =
        q.options && q.options.length > 0
          ? q.options.map((opt) => ({
              id: opt.id || `opt_${opt.key.toLowerCase()}`,
              text: opt.html || opt.text,
            }))
          : undefined;

      // Đảm bảo correctOptionIds chỉ chứa các option tồn tại
      const validOptionIds = new Set(
        (normalizedOptions || []).map((o) => o.id)
      );
      const filteredCorrectOptionIds = (q.correctOptionIds || []).filter((id) =>
        validOptionIds.has(id)
      );

      return {
        id: qId,
        type: q.type || (normalizedOptions ? "single_choice" : "essay"),
        text: q.promptHtml || q.promptText || `Câu ${idx + 1}`,
        options: normalizedOptions,
        correctOptionIds:
          filteredCorrectOptionIds.length > 0 ? filteredCorrectOptionIds : undefined,
        explanation: q.explanationHtml || q.explanation || undefined,
        imageUrl: q.imageUrl || (q.images.length > 0 ? q.images[0] : null),
        points: 1,
        sectionId: sectionId,
        order: idx + 1,
      };
    }),
  };

  // Xác thực nghiêm ngặt bằng Zod FullExportSchemaV3
  const validationResult = FullExportSchemaV3.safeParse(dktestPayload);
  if (!validationResult.success) {
    const errorDetails = validationResult.error.issues
      .map((issue) => `[${issue.path.join(".")}] ${issue.message}`)
      .join("; ");
    throw new Error(`Dữ liệu JSON DkTEST không đạt chuẩn schema v3: ${errorDetails}`);
  }

  return validationResult.data as ExportV3;
}
