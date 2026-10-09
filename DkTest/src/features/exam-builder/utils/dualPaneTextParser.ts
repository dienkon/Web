/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { v4 as uuidv4 } from "uuid";
import type { Question, Section, QuestionType } from "../../../types";

/**
 * Convert structured sections and questions into formatted Vietnamese exam text.
 */
export function questionsToExamText(sections: Section[], questions: Question[]): string {
  if (questions.length === 0 && sections.length === 0) {
    return "";
  }

  const lines: string[] = [];
  const renderedQuestions = new Set<string>();

  // Helper to render a question block
  const renderQuestionBlock = (q: Question, idx: number) => {
    renderedQuestions.add(q.id);
    const levelTag = q.level ? `(${q.level.toUpperCase()}) ` : "";
    lines.push(`Câu ${idx + 1}. ${levelTag}${q.text || ""}`);

    if (q.type === "single_choice" || q.type === "multiple_choice" || !q.type) {
      const opts = q.options || [];
      if (opts.length === 4) {
        // Render 2 lines of 2 options if short, or 4 lines
        const oA = opts[0]?.text || "";
        const oB = opts[1]?.text || "";
        const oC = opts[2]?.text || "";
        const oD = opts[3]?.text || "";
        if (oA.length < 35 && oB.length < 35 && oC.length < 35 && oD.length < 35) {
          lines.push(`A. ${oA}\tB. ${oB}`);
          lines.push(`C. ${oC}\tD. ${oD}`);
        } else {
          opts.forEach((opt, oIdx) => {
            const letter = String.fromCharCode(65 + oIdx);
            lines.push(`${letter}. ${opt.text || ""}`);
          });
        }
      } else {
        opts.forEach((opt, oIdx) => {
          const letter = String.fromCharCode(65 + oIdx);
          lines.push(`${letter}. ${opt.text || ""}`);
        });
      }
    } else if (q.type === "true_false") {
      (q.statements || []).forEach((st, sIdx) => {
        const letter = String.fromCharCode(97 + sIdx);
        lines.push(`${letter}) ${st.text || ""} [${st.correctAnswer ? "ĐÚNG" : "SAI"}]`);
      });
    } else if (q.type === "short_answer") {
      lines.push(`Đáp án ngắn: ${(q.acceptedAnswers || []).join(", ")}`);
    } else if (q.type === "essay") {
      if (q.essayRubric) {
        lines.push(`Barem tự luận: ${q.essayRubric}`);
      }
    }

    // Explanation / Lời giải
    const hasExplanation = !!q.explanation;
    const correctLetter =
      q.type === "single_choice" && q.correctOptionIds && q.correctOptionIds.length > 0
        ? (() => {
            const cIdx = q.options?.findIndex((o) => o.id === q.correctOptionIds![0]);
            return cIdx !== undefined && cIdx >= 0 ? String.fromCharCode(65 + cIdx) : null;
          })()
        : null;

    if (hasExplanation || correctLetter) {
      lines.push("");
      lines.push("Lời giải");
      if (q.explanation) {
        lines.push(q.explanation);
      }
      if (correctLetter) {
        lines.push(`Chọn ${correctLetter}`);
      }
    }

    lines.push(""); // Empty line between questions
  };

  if (sections.length > 0) {
    let globalIndex = 0;
    sections.forEach((sec, secIdx) => {
      lines.push(sec.title || `Phần ${secIdx + 1}.`);
      const secQuestions = questions.filter((q) => q.sectionId === sec.id);
      secQuestions.forEach((q) => {
        renderQuestionBlock(q, globalIndex);
        globalIndex++;
      });
    });

    // Any orphan questions without section
    const orphanQuestions = questions.filter((q) => !renderedQuestions.has(q.id));
    orphanQuestions.forEach((q) => {
      renderQuestionBlock(q, globalIndex);
      globalIndex++;
    });
  } else {
    questions.forEach((q, idx) => {
      renderQuestionBlock(q, idx);
    });
  }

  return lines.join("\n");
}

/**
 * Parse standard Vietnamese exam syntax into sections and questions.
 */
export function examTextToQuestions(text: string): { sections: Section[]; questions: Question[] } {
  const lines = text.split(/\r?\n/);
  const sections: Section[] = [];
  const questions: Question[] = [];

  let currentSection: Section | null = null;
  let currentQuestion: Partial<Question> | null = null;
  let currentSectionQuestionsCount = 0;
  let isInExplanation = false;
  let explanationLines: string[] = [];

  const finalizeQuestion = () => {
    if (!currentQuestion) return;

    if (isInExplanation && explanationLines.length > 0) {
      currentQuestion.explanation = explanationLines.join("\n").trim();
    }

    // Check if correct option wasn't picked yet
    if (
      currentQuestion.type === "single_choice" &&
      (!currentQuestion.correctOptionIds || currentQuestion.correctOptionIds.length === 0) &&
      currentQuestion.explanation
    ) {
      const match = currentQuestion.explanation.match(/Chọn\s+([A-D])/i);
      if (match) {
        const letter = match[1].toUpperCase();
        const letterIdx = letter.charCodeAt(0) - 65;
        if (currentQuestion.options && currentQuestion.options[letterIdx]) {
          currentQuestion.correctOptionIds = [currentQuestion.options[letterIdx].id];
        }
      }
    }

    // Default 1 point or 0.25 point
    if (!currentQuestion.points) {
      currentQuestion.points = 0.25;
    }

    questions.push(currentQuestion as Question);
    currentQuestion = null;
    isInExplanation = false;
    explanationLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    // 1. Detect Section Header (Phần 1, Phần I, Phần một...)
    const sectionMatch = line.match(/^Phần\s+([0-9IVXLCDM]+|[A-Z])[\.:\s]*(.*)$/i);
    if (sectionMatch && !line.toLowerCase().startsWith("phương pháp")) {
      finalizeQuestion();
      const secId = `sec_${uuidv4().substring(0, 8)}`;
      currentSection = {
        id: secId,
        examId: "temp-exam-id",
        title: line,
        order: sections.length,
        questionCount: 0,
        enabled: true,
      };
      sections.push(currentSection);
      continue;
    }

    // 2. Detect Question (Câu 1., Câu 2:, Bài 1., etc.)
    const questionMatch = line.match(/^Câu\s+(\d+)[\.:\s]*(?:\(([A-Za-z0-9]+)\))?\s*(.*)$/i);
    if (questionMatch) {
      finalizeQuestion();
      const levelRaw = questionMatch[2]?.toUpperCase() || "TH";
      const validLevels = ["NB", "TH", "VD", "VDC"];
      const level = validLevels.includes(levelRaw) ? levelRaw : "TH";
      const qText = questionMatch[3] || "";

      const qId = `q_${uuidv4().substring(0, 8)}`;
      currentQuestion = {
        id: qId,
        examId: "temp-exam-id",
        order: questions.length,
        type: "single_choice",
        text: qText,
        level,
        points: 0.25,
        sectionId: currentSection ? currentSection.id : undefined,
        options: [],
        correctOptionIds: [],
        explanation: "",
      };
      continue;
    }

    // 3. Detect "Lời giải" or "Hướng dẫn giải"
    if (/^(Lời giải|Hướng dẫn giải|Giải chi tiết)/i.test(line)) {
      isInExplanation = true;
      continue;
    }

    // 4. If currently in Explanation block
    if (isInExplanation && currentQuestion) {
      // Check for "Chọn A / B / C / D"
      const chonMatch = line.match(/^Chọn\s+([A-D])/i);
      if (chonMatch && currentQuestion.options) {
        const letter = chonMatch[1].toUpperCase();
        const letterIdx = letter.charCodeAt(0) - 65;
        if (currentQuestion.options[letterIdx]) {
          currentQuestion.correctOptionIds = [currentQuestion.options[letterIdx].id];
        }
      }
      explanationLines.push(line);
      continue;
    }

    // 5. Options parsing (Single line with A. ... B. ... or single option A. ...)
    if (currentQuestion && (currentQuestion.type === "single_choice" || currentQuestion.type === "multiple_choice")) {
      // Check multiple options in same line: e.g. "A. Cat    B. Dog"
      const multiOptRegex = /([A-D])[\.:]\s*([^A-D\t]+?)(?=(?:\s+[A-D][\.:]|$))/g;
      const matches = Array.from(rawLine.matchAll(multiOptRegex));

      if (matches.length > 0) {
        if (!currentQuestion.options) currentQuestion.options = [];
        matches.forEach((m) => {
          const letter = m[1].toUpperCase();
          const optText = m[2].trim();
          const optId = `opt_${uuidv4().substring(0, 6)}`;
          currentQuestion!.options!.push({
            id: optId,
            text: optText,
          });
        });
        continue;
      }

      // Check single option: e.g. "A. Đáp án này"
      const singleOptMatch = line.match(/^([A-D])[\.:]\s*(.*)$/);
      if (singleOptMatch) {
        if (!currentQuestion.options) currentQuestion.options = [];
        const optId = `opt_${uuidv4().substring(0, 6)}`;
        currentQuestion.options.push({
          id: optId,
          text: singleOptMatch[2].trim(),
        });
        continue;
      }

      // Check True/False statements: e.g. "a) Phát biểu 1 [ĐÚNG]"
      const tfMatch = line.match(/^([a-d])\)\s*(.*?)(?:\s*\[(ĐÚNG|SAI)\])?$/i);
      if (tfMatch) {
        currentQuestion.type = "true_false";
        if (!currentQuestion.statements) currentQuestion.statements = [];
        const isTrue = tfMatch[3] ? tfMatch[3].toUpperCase() === "ĐÚNG" : true;
        currentQuestion.statements.push({
          id: `st_${uuidv4().substring(0, 6)}`,
          text: tfMatch[2].trim(),
          correctAnswer: isTrue,
        });
        continue;
      }

      // Check Essay Prompt/Rubric
      if (/^Barem tự luận:\s*(.*)$/i.test(line)) {
        currentQuestion.type = "essay";
        currentQuestion.essayRubric = line.replace(/^Barem tự luận:\s*/i, "").trim();
        continue;
      }

      // If text belongs to Question text continuation
      if (!currentQuestion.options || currentQuestion.options.length === 0) {
        currentQuestion.text = currentQuestion.text ? `${currentQuestion.text}\n${line}` : line;
      }
    }
  }

  finalizeQuestion();

  // If no sections were present, but we have questions, wrap in a default section
  if (sections.length === 0 && questions.length > 0) {
    sections.push({
      id: "sec_default",
      examId: "temp-exam-id",
      title: "Phần 1. TRẮC NGHIỆM",
      order: 0,
      questionCount: questions.length,
      enabled: true,
    });
    questions.forEach((q) => {
      q.sectionId = "sec_default";
    });
  }

  return { sections, questions };
}

/**
 * Predefined sample templates that teachers can insert with 1-click.
 */
export const EXAM_SYNTAX_TEMPLATES = {
  sample1: `Phần 1. TRẮC NGHIỆM
Câu 1. (VD) Trong cuộc khai thác thuộc địa lần thứ hai ở Đông Dương 1919-1929, thực dân Pháp tập trung đầu tư vào
A. Ngành chế tạo máy.\tB. Công nghiệp luyện kim.
C. Đồn điền cao su.\tD. Công nghiệp hóa chất.

Lời giải
Phương pháp: SGK Lịch sử 12, trang 76 - 77.
Cách giải: Trong cuộc khai thác thuộc địa lần thứ hai ở Đông Dương (1919-1929), thực dân Pháp tập trung đầu tư vào đồn điền cao su.
Chọn C

Câu 2. (NB) Nội dung nào sau đây phản ánh đúng tình hình Việt Nam sau Hiệp định Giơnevơ năm 1954 về Đông Dương?
A. Đất nước tạm thời bị chia cắt làm hai miền Nam, Bắc.
B. Miền Bắc chưa được giải phóng.
C. Miền Nam đã được giải phóng.
D. Cả nước được giải phóng và tiến lên xây dựng chủ nghĩa xã hội.

Lời giải
Phương pháp: SGK Lịch sử 12, trang 157 - 158.
Cách giải: Đất nước tạm thời bị chia cắt làm hai miền Nam, Bắc là nội dung phản ánh đúng tình hình Việt Nam sau Hiệp định Giơnevơ năm 1954 về Đông Dương.
Chọn A

Câu 3. Trong Đông - Xuân 1953-1954, bộ đội chủ lực Việt Nam mở chiến dịch tiến công quân Pháp ở
A. Đồng Khởi.\tB. Thái Nguyên.\tC. Thị xã Lai Châu.\tD. Quảng Trị.

Lời giải
Phương pháp: SGK Lịch sử 12, trang 147.
Cách giải: Trong Đông - Xuân 1953-1954, bộ đội chủ lực Việt Nam mở chiến dịch tiến công quân Pháp ở thị xã Lai Châu.
Chọn C

Phần 2. TỰ LUẬN
Câu 4. Từ năm 1952 đến năm 1973, khoa học - kĩ thuật và công nghệ của Nhật Bản chủ yếu tập trung vào lĩnh vực
Barem tự luận: Nêu bật các phát minh ứng dụng công nghiệp dân dụng, nhập bản quyền kỹ thuật và tinh thần cải tiến công nghệ.

Lời giải
Phương pháp: SGK Lịch sử 12, trang 54.
Cách giải: Từ năm 1952 đến năm 1973, khoa học - kĩ thuật và công nghệ của Nhật Bản chủ yếu tập trung vào lĩnh vực sản xuất ứng dụng dân dụng.`,

  sample2: `Phần 1. CÂU HỎI TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN
Câu 1. (NB) Cho hàm số $y = f(x)$ có bảng biến thiên trên đoạn $[-2; 3]$. Giá trị cực đại của hàm số đã cho bằng
A. 5\tB. 2
C. -1\tD. 3

Lời giải
Dựa vào bảng biến thiên, hàm số đạt cực đại tại $x = 1$ và giá trị cực đại bằng 5.
Chọn A

Câu 2. (TH) Cho cấp số nhân $(u_n)$ có số hạng đầu $u_1 = 3$ và công bội $q = 2$. Giá trị của $u_4$ bằng
A. 24\tB. 48\tC. 18\tD. 12

Lời giải
Ta có công thức số hạng tổng quát của cấp số nhân: $u_n = u_1 \\cdot q^{n-1}$.
Do đó $u_4 = 3 \\cdot 2^3 = 3 \\cdot 8 = 24$.
Chọn A`,

  sample3: `Phần 1. ĐIỀN VÀO CHỖ TRỐNG
Câu 1. (TH) Điền từ hoặc số thích hợp vào chỗ trống:
Phương trình bậc hai $x^2 - 5x + 6 = 0$ có hai nghiệm là $x_1 = [_]$ và $x_2 = [_]$.

Lời giải
Giải phương trình ta được hai nghiệm phân biệt: $x_1 = 2$ và $x_2 = 3$.`,

  sample4: `Phần 1. TRẮC NGHIỆM NHIỀU ĐÁP ÁN ĐÚNG
Câu 1. (VD) Trong các số sau đây, những số nào là số nguyên tố?
A. 2\tB. 3
C. 4\tD. 9

Lời giải
Số 2 và số 3 chỉ chia hết cho 1 và chính nó nên là số nguyên tố.
Chọn A, B`,

  sample5: `Phần 1. CÂU HỎI TRẮC NGHIỆM ĐÚNG SAI
Câu 1. (VD) Cho hàm số bậc ba $y = f(x) = ax^3 + bx^2 + cx + d$. Xét tính đúng sai của các khẳng định sau:
a) Đồ thị hàm số luôn có tâm đối xứng. [ĐÚNG]
b) Hàm số luôn có hai điểm cực trị phân biệt. [SAI]
c) Nếu $a > 0$ thì $\\lim_{x \\to +\\infty} f(x) = +\\infty$. [ĐÚNG]
d) Đồ thị hàm số luôn cắt trục tung tại điểm có tung độ bằng $d$. [ĐÚNG]

Lời giải
- Khẳng định a đúng vì đồ thị hàm bậc ba luôn nhận điểm uốn làm tâm đối xứng.
- Khẳng định b sai vì hàm số có thể đơn điệu trên R nếu phương trình đạo hàm vô nghiệm hoặc có nghiệm kép.`,

  sample6: `Phần 1. TRẮC NGHIỆM 4 LỰA CHỌN
Câu 1. (NB) Nguyên tử khối của Carbon là
A. 12\tB. 14\tC. 16\tD. 1

Lời giải
Nguyên tử khối của nguyên tố Cacbon là 12 đvC.
Chọn A

Phần 2. ĐÚNG - SAI
Câu 2. (TH) Xét tính đúng sai của các mệnh đề sau về kim loại kiềm:
a) Kim loại kiềm có nhiệt độ nóng chảy thấp. [ĐÚNG]
b) Có thể bảo quản Natri trong nước. [SAI]

Lời giải
Natri phản ứng mãnh liệt với nước nên phải được ngâm trong dầu hỏa.

Phần 3. TỰ LUẬN
Câu 3. (VD) Nêu hiện tượng và viết phương trình hóa học khi sục khí $CO_2$ từ từ đến dư vào dung dịch nước vôi trong.
Barem tự luận: Nêu được hiện tượng kết tủa trắng sau đó tan dần thành dung dịch trong suốt. Viết đúng 2 PTHH.

Lời giải
Hiện tượng: Ban đầu xuất hiện kết tủa trắng vẩn đục, sau đó kết tủa tan dần cho dung dịch trong suốt.
PTHH: $CO_2 + Ca(OH)_2 \\to CaCO_3\\downarrow + H_2O$ và $CO_2 + H_2O + CaCO_3 \\to Ca(HCO_3)_2$.`,
};
