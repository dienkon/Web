import { saveAs } from "file-saver";
import katex from "katex";
import type { Exam, Question, Section, Submission } from "../types";
import { normalizeLatexText } from "../features/exam-builder/editor/LatexPreview";

export interface WordExportOptions {
  schoolName?: string;
  examCode?: string;
  subjectName?: string;
  duration?: number;
  studentName?: string;
  score?: number;
  maxScore?: number;
  submittedAt?: any;
}

/**
 * Converts text containing LaTeX ($...$, $$...$$, \sqrt, \frac, etc.) into
 * Word-friendly HTML with native MathML (<math>) and standard HTML tags.
 */
export function formatTextForWord(input: string): string {
  if (!input) return "";

  // 1. Normalize LaTeX corrupted chars, multiple backslashes, unicode roots
  let text = normalizeLatexText(input);

  // 2. Convert markdown bold **...** and italic *...*
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");

  // 3. Convert markdown images ![alt](url)
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    return `<div style="text-align: center; margin: 8pt 0;"><img src="${url.trim()}" alt="${alt || 'Hình ảnh'}" style="max-width: 420pt; max-height: 240pt; object-fit: contain;" /></div>`;
  });

  // 4. Convert fill-in-the-blank placeholders
  text = text.replace(/\[_\]|\[blank\]/gi, "________");

  // 5. Convert Block LaTeX environments (\begin{aligned}...\end{aligned}, etc.)
  text = text.replace(/\\begin\{(aligned|cases|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|array|tabular)\}([\s\S]*?)\\end\{\1\}/g, (fullMatch) => {
    try {
      return `<div style="text-align: center; margin: 6pt 0;">${katex.renderToString(fullMatch.trim(), { output: "mathml", displayMode: true, throwOnError: false, strict: false })}</div>`;
    } catch {
      return fullMatch;
    }
  });

  // 6. Convert Block math $$...$$ or \[...\]
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    try {
      return `<div style="text-align: center; margin: 6pt 0;">${katex.renderToString(math.trim(), { output: "mathml", displayMode: true, throwOnError: false, strict: false })}</div>`;
    } catch {
      return math;
    }
  });
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
    try {
      return `<div style="text-align: center; margin: 6pt 0;">${katex.renderToString(math.trim(), { output: "mathml", displayMode: true, throwOnError: false, strict: false })}</div>`;
    } catch {
      return math;
    }
  });

  // 7. Convert Inline math \(...\)
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { output: "mathml", displayMode: false, throwOnError: false, strict: false });
    } catch {
      return math;
    }
  });

  // 8. Convert Inline math $...$
  text = text.replace(/(^|[^\\])\$([^\$]+?)\$/g, (match, prefix, math) => {
    try {
      const rendered = katex.renderToString(math.trim(), { output: "mathml", displayMode: false, throwOnError: false, strict: false });
      return `${prefix}${rendered}`;
    } catch {
      return `${prefix}${math}`;
    }
  });

  // 9. Convert undelimited fractions
  const fracRegex = /((?:[a-zA-Z](?:\([a-zA-Z0-9]+\))?\s*=\s*)?\\(?:d|t|c)?frac\s*\{([^{}]*(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}[^{}]*)*)\}\s*\{([^{}]*(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}[^{}]*)*)\})/g;
  text = text.replace(fracRegex, (fullMatch) => {
    try {
      return katex.renderToString(fullMatch.trim(), { output: "mathml", displayMode: false, throwOnError: false, strict: false });
    } catch {
      return fullMatch;
    }
  });

  // 10. Convert undelimited roots
  const sqrtRegex = /((?:[-+]?\s*(?:[0-9a-zA-Z]+|[a-zA-Z]\s*=\s*))?\\sqrt(?:\[[^\]]*\])?\{([^{}]*(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}[^{}]*)*)\})/g;
  text = text.replace(sqrtRegex, (fullMatch) => {
    try {
      return katex.renderToString(fullMatch.trim(), { output: "mathml", displayMode: false, throwOnError: false, strict: false });
    } catch {
      return fullMatch;
    }
  });

  // 11. Convert newlines to <br/>
  text = text.replace(/\n/g, "<br/>");

  return text;
}

/**
 * Builds the complete Microsoft Word HTML document with headers, full questions, and answer table.
 */
export function generateExamWordHtml(
  exam: Partial<Exam>,
  sections: Section[],
  questions: Question[],
  options: WordExportOptions = {}
): string {
  const schoolName = options.schoolName || (exam as any)?.schoolName || "DK TEST";
  const examTitle = exam.title || "BÀI KIỂM TRA";
  const examCode = options.examCode || exam.code || "101";
  const duration = options.duration || exam.duration || 45;
  const subjectName = options.subjectName || (exam as any)?.subject || "Toán học";

  // Separate questions by types for the final answer table
  const choiceQuestions = questions.filter(
    (q) => q.type === "single_choice" || q.type === "multiple_choice" || (!q.type && (q.options?.length ?? 0) > 0)
  );
  const tfQuestions = questions.filter((q) => q.type === "true_false");
  const saQuestions = questions.filter((q) => q.type === "short_answer");
  const otherQuestions = questions.filter(
    (q) => !choiceQuestions.includes(q) && !tfQuestions.includes(q) && !saQuestions.includes(q)
  );

  let html = `
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns:m='http://schemas.microsoft.com/office/2004/12/omml'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>${examTitle}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: 210mm 297mm;
      margin: 20mm 20mm 20mm 20mm;
      mso-header-margin: 35.4pt;
      mso-footer-margin: 35.4pt;
      mso-paper-source: 0;
    }
    div.Section1 { page: Section1; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.35;
      color: #000000;
      background: #ffffff;
    }
    p {
      margin: 0 0 5pt 0;
    }
    table.header-table {
      width: 100%;
      border-collapse: collapse;
      border: none;
      margin-bottom: 12pt;
    }
    table.header-table td {
      border: none;
      padding: 2pt 4pt;
      vertical-align: top;
    }
    table.options-table {
      width: 100%;
      border-collapse: collapse;
      border: none;
      margin: 4pt 0 8pt 0;
    }
    table.options-table td {
      border: none;
      padding: 3pt 6pt;
      vertical-align: top;
    }
    table.answer-table {
      width: 100%;
      border-collapse: collapse;
      margin: 8pt 0;
      font-size: 11pt;
    }
    table.answer-table th, table.answer-table td {
      border: 1pt solid #000000;
      padding: 4pt 6pt;
      text-align: center;
    }
    table.answer-table th {
      background-color: #f1f5f9;
      font-weight: bold;
    }
    .section-title {
      font-size: 12.5pt;
      font-weight: bold;
      margin: 14pt 0 6pt 0;
      text-transform: uppercase;
      color: #1e3a8a;
    }
    .question-item {
      margin-bottom: 9pt;
      page-break-inside: avoid;
    }
    .question-title {
      font-weight: bold;
      color: #000000;
    }
    .ans-correct {
      font-weight: bold;
      color: #16a34a;
    }
  </style>
</head>
<body>
<div class="Section1">

  <!-- EXAM HEADER -->
  <table class="header-table">
    <tr>
      <td style="width: 45%; text-align: center;">
        <div style="font-size: 11pt; text-transform: uppercase; font-weight: bold;">${schoolName}</div>
        <div style="font-size: 10pt; font-weight: bold;">HỆ THỐNG THI TRỰC TUYẾN DKTEST</div>
        <div style="margin-top: 2pt;">-----------------------</div>
      </td>
      <td style="width: 55%; text-align: center;">
        <div style="font-size: 12pt; text-transform: uppercase; font-weight: bold; color: #1e3a8a;">${examTitle}</div>
        <div style="font-size: 11pt; font-weight: bold; margin-top: 2pt;">Môn thi: ${subjectName}</div>
        <div style="font-size: 10pt; font-style: italic;">Thời gian làm bài: ${duration} phút (không kể thời gian giao đề)</div>
        <div style="font-size: 10pt; font-weight: bold; margin-top: 2pt;">Mã đề thi: ${examCode}</div>
      </td>
    </tr>
  </table>
`;

  // Student details if available
  if (options.studentName) {
    html += `
  <div style="border: 1pt solid #94a3b8; background-color: #f8fafc; padding: 6pt 10pt; margin-bottom: 12pt; border-radius: 4pt; font-size: 11pt;">
    <table style="width: 100%; border-collapse: collapse; border: none;">
      <tr>
        <td style="border: none; padding: 2pt 0;"><strong>Họ và tên thí sinh:</strong> ${options.studentName}</td>
        <td style="border: none; padding: 2pt 0; text-align: right;">
          ${options.score !== undefined ? `<strong>Điểm số:</strong> <span style="color: #2563eb; font-weight: bold; font-size: 12pt;">${options.score}</span> / ${options.maxScore || 10}` : ""}
        </td>
      </tr>
    </table>
  </div>
`;
  }

  html += `
  <hr style="border: 0; border-top: 1.5pt solid #000000; margin: 6pt 0 14pt 0;" />
`;

  // --- FULL QUESTIONS LIST ---
  let currentSectionId: string | null | undefined = undefined;
  const sectionMap = new Map(sections.map((s) => [s.id, s]));

  questions.forEach((q, qIndex) => {
    // Print section header if question enters a new section
    if (q.sectionId !== currentSectionId) {
      currentSectionId = q.sectionId;
      if (currentSectionId && sectionMap.has(currentSectionId)) {
        const sec = sectionMap.get(currentSectionId)!;
        html += `<div class="section-title">${formatTextForWord(sec.title)}</div>`;
        if (sec.description) {
          html += `<div style="font-style: italic; margin-bottom: 8pt; color: #475569;">${formatTextForWord(sec.description)}</div>`;
        }
      }
    }

    const questionNumber = qIndex + 1;
    const formattedQuestionText = formatTextForWord(q.text);

    html += `
  <div class="question-item">
    <p style="text-align: justify;">
      <span class="question-title">Câu ${questionNumber}:</span> ${formattedQuestionText}
    </p>
`;

    // Question Image if available
    if (q.imageUrl) {
      html += `
    <div style="text-align: center; margin: 6pt 0;">
      <img src="${q.imageUrl}" alt="Hình câu ${questionNumber}" style="max-width: 420pt; max-height: 240pt; object-fit: contain;" />
    </div>
`;
    }

    // Single choice & Multiple choice options
    if (q.type === "single_choice" || q.type === "multiple_choice" || (!q.type && (q.options?.length ?? 0) > 0)) {
      const opts = q.options || [];
      const maxLen = Math.max(...opts.map((o) => (o.text || "").length), 0);

      if (maxLen <= 25 && opts.length <= 4) {
        // 4 columns table
        html += `<table class="options-table"><tr>`;
        opts.forEach((opt, oIdx) => {
          const letter = String.fromCharCode(65 + oIdx);
          html += `<td style="width: 25%;"><strong>${letter}.</strong> ${formatTextForWord(opt.text)}</td>`;
        });
        html += `</tr></table>`;
      } else if (maxLen <= 55 && opts.length <= 4) {
        // 2 columns table
        html += `<table class="options-table">`;
        for (let i = 0; i < opts.length; i += 2) {
          html += `<tr>`;
          for (let j = 0; j < 2; j++) {
            const idx = i + j;
            if (idx < opts.length) {
              const letter = String.fromCharCode(65 + idx);
              html += `<td style="width: 50%;"><strong>${letter}.</strong> ${formatTextForWord(opts[idx].text)}</td>`;
            } else {
              html += `<td style="width: 50%;">&nbsp;</td>`;
            }
          }
          html += `</tr>`;
        }
        html += `</table>`;
      } else {
        // 1 column table (vertical stack)
        html += `<table class="options-table">`;
        opts.forEach((opt, oIdx) => {
          const letter = String.fromCharCode(65 + oIdx);
          html += `<tr><td><strong>${letter}.</strong> ${formatTextForWord(opt.text)}</td></tr>`;
        });
        html += `</table>`;
      }
    } else if (q.type === "true_false") {
      // True / False statements
      const stmts = q.statements || [];
      html += `<div style="margin: 4pt 0 6pt 16pt;">`;
      stmts.forEach((stmt, sIdx) => {
        const letter = String.fromCharCode(97 + sIdx);
        html += `
      <p style="margin: 2pt 0;">
        <strong>${letter})</strong> ${formatTextForWord(stmt.text)}
      </p>`;
      });
      html += `</div>`;
    } else if (q.type === "short_answer") {
      html += `
    <p style="margin: 4pt 0 6pt 16pt; font-style: italic; color: #64748b;">
      Trả lời: .................................................................................................................................................
    </p>`;
    } else if (q.type === "fill_blank") {
      html += `
    <p style="margin: 4pt 0 6pt 16pt; font-style: italic; color: #64748b;">
      (Điền đáp án thích hợp vào các vị trí ô trống tương ứng)
    </p>`;
    } else if (q.type === "ordering") {
      const items = q.orderingItems || [];
      html += `<div style="margin: 4pt 0 6pt 16pt;">`;
      items.forEach((it, itIdx) => {
        html += `<p style="margin: 2pt 0;">[${itIdx + 1}] ${formatTextForWord(it.text)}</p>`;
      });
      html += `</div>`;
    }

    html += `</div>`;
  });

  // End of test delimiter
  html += `
  <div style="text-align: center; margin: 18pt 0; font-weight: bold;">
    ---------- HẾT ----------
  </div>
`;

  // ==========================================
  // PAGE BREAK FOR ANSWER KEY TABLE
  // ==========================================
  html += `
  <br clear="all" style="page-break-before: always; mso-break-type: section-break;" />

  <div style="text-align: center; font-size: 14pt; font-weight: bold; margin: 16pt 0 8pt 0; text-transform: uppercase; color: #1e3a8a;">
    BẢNG ĐÁP ÁN ĐỀ THI
  </div>
  <div style="text-align: center; font-size: 11pt; font-style: italic; margin-bottom: 12pt;">
    Mã đề thi: ${examCode} - Môn: ${subjectName}
  </div>
`;

  // 1. Multiple Choice Answers Grid Table (10 per row)
  if (choiceQuestions.length > 0) {
    html += `
  <div style="font-weight: bold; margin: 10pt 0 4pt 0;">I. ĐÁP ÁN TRẮC NGHIỆM NHIỀU LỰA CHỌN:</div>
`;
    const chunkSize = 10;
    for (let i = 0; i < choiceQuestions.length; i += chunkSize) {
      const chunk = choiceQuestions.slice(i, i + chunkSize);
      html += `<table class="answer-table"><tr>`;
      chunk.forEach((_, idx) => {
        const globalIdx = questions.indexOf(chunk[idx]) + 1;
        html += `<th style="width: 10%;">Câu ${globalIdx}</th>`;
      });
      html += `</tr><tr>`;
      chunk.forEach((q) => {
        const optList = q.options || [];
        const correctLetters = (q.correctOptionIds || []).map((cid) => {
          const optIdx = optList.findIndex((o) => o.id === cid);
          return optIdx !== -1 ? String.fromCharCode(65 + optIdx) : cid;
        });
        html += `<td style="font-weight: bold; font-size: 12pt; color: #1e3a8a;">${correctLetters.join(", ") || "-"}</td>`;
      });
      html += `</tr></table>`;
    }
  }

  // 2. True / False Answers Matrix Table
  if (tfQuestions.length > 0) {
    html += `
  <div style="font-weight: bold; margin: 12pt 0 4pt 0;">II. ĐÁP ÁN TRẮC NGHIỆM ĐÚNG / SAI:</div>
  <table class="answer-table">
    <tr>
      <th style="width: 16%;">Câu hỏi</th>
      <th style="width: 21%;">Lệnh hỏi a)</th>
      <th style="width: 21%;">Lệnh hỏi b)</th>
      <th style="width: 21%;">Lệnh hỏi c)</th>
      <th style="width: 21%;">Lệnh hỏi d)</th>
    </tr>
`;
    tfQuestions.forEach((q) => {
      const globalIdx = questions.indexOf(q) + 1;
      const stmts = q.statements || [];
      html += `<tr><td style="font-weight: bold;">Câu ${globalIdx}</td>`;
      [0, 1, 2, 3].forEach((sIdx) => {
        if (sIdx < stmts.length) {
          const isT = stmts[sIdx].correctAnswer;
          html += `<td style="font-weight: bold; color: ${isT ? "#16a34a" : "#dc2626"};">${isT ? "ĐÚNG" : "SAI"}</td>`;
        } else {
          html += `<td>-</td>`;
        }
      });
      html += `</tr>`;
    });
    html += `</table>`;
  }

  // 3. Short Answer & Fill Blank Table
  if (saQuestions.length > 0 || otherQuestions.length > 0) {
    html += `
  <div style="font-weight: bold; margin: 12pt 0 4pt 0;">III. ĐÁP ÁN TRẢ LỜI NGẮN / ĐIỀN KHUYẾT:</div>
  <table class="answer-table" style="text-align: left;">
    <tr>
      <th style="width: 18%; text-align: center;">Câu hỏi</th>
      <th style="text-align: left; padding-left: 10pt;">Đáp án chính xác</th>
    </tr>
`;
    [...saQuestions, ...otherQuestions].forEach((q) => {
      const globalIdx = questions.indexOf(q) + 1;
      let ansText = "-";
      if (q.acceptedAnswers && q.acceptedAnswers.length > 0) {
        ansText = q.acceptedAnswers.join("  hoặc  ");
      } else if (q.acceptedAnswersPerBlank) {
        ansText = Object.entries(q.acceptedAnswersPerBlank)
          .map(([idx, arr]) => `Ô [${Number(idx) + 1}]: ${arr.join(" | ")}`)
          .join("; ");
      } else if (q.type === "ordering" && q.correctOrder) {
        ansText = q.correctOrder.map((id, idx) => `[${idx + 1}]`).join(" -> ");
      }

      html += `<tr>
        <td style="font-weight: bold; text-align: center;">Câu ${globalIdx}</td>
        <td style="text-align: left; padding-left: 10pt; font-weight: bold; color: #1e3a8a;">${formatTextForWord(ansText)}</td>
      </tr>`;
    });
    html += `</table>`;
  }

  // 4. Detailed Explanations (if available)
  const questionsWithExplanation = questions.filter((q) => q.explanation && q.explanation.trim());
  if (questionsWithExplanation.length > 0) {
    html += `
  <div style="text-align: center; font-size: 13pt; font-weight: bold; margin: 20pt 0 10pt 0; text-transform: uppercase; color: #1e3a8a;">
    HƯỚNG DẪN GIẢI CHI TIẾT
  </div>
`;
    questionsWithExplanation.forEach((q) => {
      const globalIdx = questions.indexOf(q) + 1;
      html += `
    <div style="margin-bottom: 10pt; page-break-inside: avoid;">
      <p><strong>Câu ${globalIdx}:</strong></p>
      <div style="margin-left: 12pt; text-align: justify; font-style: italic; color: #334155;">
        ${formatTextForWord(q.explanation || "")}
      </div>
    </div>
`;
    });
  }

  html += `
</div>
</body>
</html>
`;

  return html;
}

/**
 * Exports full exam with questions and answer table directly to Microsoft Word (.doc format).
 */
export async function exportExamToWordFile(
  exam: Partial<Exam>,
  sections: Section[],
  questions: Question[],
  options: WordExportOptions = {}
): Promise<void> {
  const html = generateExamWordHtml(exam, sections, questions, options);

  // Blob with standard MS Word MIME type
  const blob = new Blob(["\ufeff" + html], {
    type: "application/msword;charset=utf-8",
  });

  const rawTitle = exam.title || "De_Thi";
  const cleanTitle = rawTitle.replace(/[\/\\:*?"<>|]/g, "_");
  const fileName = `${cleanTitle}_FullDe_DapAn.doc`;

  saveAs(blob, fileName);
}
