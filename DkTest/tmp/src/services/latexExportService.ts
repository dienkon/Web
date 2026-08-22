import katex from "katex";
import type { Exam, Question, Section } from "../types";
import { fixLatexFormatting } from "./ai/aiExamGenerator";

export interface ExportExamOptions {
  includeAnswers: boolean;
  includeExplanation?: boolean;
  schoolName?: string;
  examCode?: string;
  subjectName?: string;
  gradeName?: string;
}

/**
 * Escapes LaTeX special characters in plain text, but preserves math expressions wrapped in $...$ or $$...$$.
 */
export function escapeLatexText(text: string): string {
  if (!text) return "";

  // 1. Fix control character corruption & unescaped math commands
  let sanitized = fixLatexFormatting(text);

  // 2. Wrap un-delimited math commands (like \frac{...}{...}, \sqrt{...}, \notin, \times) into inline math $...$
  const fracRegex =
    /((?:[a-zA-Z](?:\([a-zA-Z0-9]+\))?\s*=\s*)?\\(?:d|t)?frac\s*\{[^{}]*\}\s*\{[^{}]*\})/g;
  sanitized = sanitized.replace(fracRegex, (m) =>
    m.startsWith("$") ? m : `$${m}$`,
  );

  const sqrtRegex = /((?:[a-zA-Z]\s*=\s*)?\\sqrt(?:\[[^\]]*\])?\{[^{}]*\})/g;
  sanitized = sanitized.replace(sqrtRegex, (m) =>
    m.startsWith("$") ? m : `$${m}$`,
  );

  const commonLatexRegex =
    /(\\(?:vec|bar|hat|overline|underline)\s*\{[^{}]*\}|\\(?:int|sum|prod|lim)(?:_\{[^{}]*\}|_[\w\d])?(?:\^\{[^{}]*\}|\^[\w\d])?|\\(?:alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|vartheta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega|pm|mp|times|div|cdot|cap|cup|subset|supset|subseteq|supseteq|in|notin|ni|forall|exists|nexists|le|ge|leq|geq|neq|approx|equiv|sim|cong|propto|infty|nabla|partial|degree|perp|parallel|angle|triangle|rightarrow|to|leftarrow|leftrightarrow|Rightarrow|Leftarrow|Leftrightarrow|sin|cos|tan|cot|arcsin|arccos|arctan|log|ln|lg|exp)\b)/g;

  // Protect existing math mode blocks
  const parts = sanitized.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);

  return parts
    .map((part) => {
      if (part.startsWith("$") && part.endsWith("$")) {
        // Math content: preserve as is
        return part;
      }
      // Text content: wrap un-delimited LaTeX commands in math mode first
      let processedText = part.replace(commonLatexRegex, (cmd) => `$${cmd}$`);

      // Now split by any newly introduced $...$
      const innerParts = processedText.split(/(\$[\s\S]*?\$)/g);
      return innerParts
        .map((ip) => {
          if (ip.startsWith("$") && ip.endsWith("$")) return ip;
          return ip
            .replace(/([&%#_])/g, "\\$1")
            .replace(/~/g, "\\textasciitilde{}")
            .replace(/\^/g, "\\textasciicircum{}");
        })
        .join("");
    })
    .join("");
}

/**
 * Converts inline and block LaTeX ($...$ and $$...$$) to HTML using KaTeX.
 */
export function renderLatexToHtml(text: string): string {
  if (!text) return "";

  const sanitized = fixLatexFormatting(text);

  // Replace $$...$$ block math
  let result = sanitized.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
      });
    } catch {
      return `<code>${math}</code>`;
    }
  });

  // Replace $...$ inline math
  result = result.replace(/\$([\s\S]*?)\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      return `<code>${math}</code>`;
    }
  });

  // Convert line breaks to <br/>
  result = result.replace(/\n/g, "<br/>");

  return result;
}

/**
 * Generates raw, standard LaTeX source code (.tex) ready to compile with pdflatex or XeLaTeX.
 */
export function generateExamLatex(
  exam: Partial<Exam>,
  sections: Section[],
  questions: Question[],
  options: ExportExamOptions,
): string {
  const {
    includeAnswers,
    includeExplanation = true,
    schoolName = "TRƯỜNG THPT CHUYÊN .....................",
    examCode = exam.code || "101",
    subjectName = "TOÁN HỌC",
    gradeName = "LỚP 12",
  } = options;

  const docTitle = exam.title || "ĐỀ KIỂM TRA ĐỊNH KỲ";
  const timeLimit = exam.timeLimit || 45;

  let tex = `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{vietnam}
\\usepackage{amsmath,amssymb,amsfonts,mathrsfs}
\\usepackage{graphicx}
\\usepackage[top=20mm,bottom=20mm,left=18mm,right=18mm]{geometry}
\\usepackage{tabularx}
\\usepackage{array}
\\usepackage{enumitem}
\\usepackage{xcolor}
\\usepackage{fancyhdr}
\\usepackage{tikz}
\\usepackage{tasks}

\\settasks{
  label=\\textbf{\\Alph*.},
  label-width=18pt,
  item-indent=0pt,
  column-sep=12pt,
  after-item-skip=3pt
}

\\pagestyle{fancy}
\\fancyhf{}
\\rhead{\\textit{${includeAnswers ? "ĐÁP ÁN & LỜI GIẢI" : "ĐỀ THI"} - Mã đề: ${examCode}}}
\\lhead{\\textit{${escapeLatexText(docTitle)}}}
\\rfoot{Trang \\thepage}

\\newcolumntype{Y}{>{\\centering\\arraybackslash}X}

\\begin{document}

% --- HEADER BLOCK ---
\\begin{table}[h!]
\\noindent\\begin{tabularx}{\\textwidth}{@{}p{0.48\\textwidth} p{0.04\\textwidth} Y@{}}
\\textbf{${escapeLatexText(schoolName)}} & & \\textbf{${includeAnswers ? "HƯỚNG DẪN CHẤM & ĐÁP ÁN CHI TIẾT" : "ĐỀ THI CHÍNH THỨC"}}\\\\
\\textbf{TỔ CHUYÊN MÔN: ${escapeLatexText(subjectName)}} & & \\textbf{MÔN: ${escapeLatexText(subjectName)} - ${escapeLatexText(gradeName)}}\\\\
\\textit{(Đề thi có ${questions.length} câu)} & & \\textit{Thời gian làm bài: ${timeLimit} phút (không kể phát đề)}\\\\
\\end{tabularx}
\\end{table}

\\vspace{-0.3cm}
\\noindent\\rule{\\textwidth}{0.8pt}

\\begin{center}
\\textbf{\\Large ${escapeLatexText(docTitle).toUpperCase()}}\\\\
\\vspace{0.15cm}
\\textbf{MÃ ĐỀ THI: ${examCode}}
\\end{center}

\\noindent\\begin{tabularx}{\\textwidth}{@{}X r@{}}
\\textbf{Họ và tên thí sinh:} \\dotfill & \\textbf{Số báo danh:} \\dotfill\\\\
\\textbf{Lớp:} \\dotfill & \\textbf{Phòng thi:} \\dotfill\\\\
\\end{tabularx}

\\vspace{0.4cm}
`;

  // --- IF ANSWERS: GENERATE FULL ANSWER SUMMARY BOX AT THE VERY TOP ---
  if (includeAnswers) {
    tex += `% =========================================================================
% KHUNG ĐÁP ÁN TỔNG HỢP TOÀN BỘ ĐỀ THI (ANSWER MATRIX SUMMARY)
% =========================================================================
\\begin{center}
\\textbf{\\large BẢNG ĐÁP ÁN TỔNG HỢP TOÀN BỘ CÂU HỎI}
\\end{center}

\\vspace{0.2cm}
`;

    // 1. Single & Multiple choice answers
    const choiceQuestions = questions.filter(
      (q) => q.type === "single_choice" || q.type === "multiple_choice",
    );

    if (choiceQuestions.length > 0) {
      tex += `\\noindent\\textbf{I. BẢNG ĐÁP ÁN TRẮC NGHIỆM}\\\\
\\vspace{0.1cm}
\\noindent\\begin{tabularx}{\\textwidth}{|c|c|c|c|c|c|c|c|c|c|}
\\hline
`;
      // Break into chunks of 10
      const chunkSize = 10;
      for (let i = 0; i < choiceQuestions.length; i += chunkSize) {
        const chunk = choiceQuestions.slice(i, i + chunkSize);

        // Header row: Câu 1, Câu 2...
        const headers = chunk.map((_, idx) => `\\textbf{${i + idx + 1}}`);
        while (headers.length < chunkSize) headers.push("");
        tex += headers.join(" & ") + " \\\\\\hline\n";

        // Answer row: A, B, C, D...
        const answers = chunk.map((q) => {
          const optList = q.options || [];
          const correctLetters = (q.correctOptionIds || []).map((cid) => {
            const optIdx = optList.findIndex((o) => o.id === cid);
            return optIdx !== -1 ? String.fromCharCode(65 + optIdx) : cid;
          });
          return `\\textbf{${correctLetters.join(", ") || "-"}}`;
        });
        while (answers.length < chunkSize) answers.push("");
        tex += answers.join(" & ") + " \\\\\\hline\n";
      }
      tex += `\\end{tabularx}

\\vspace{0.4cm}
`;
    }

    // 2. True / False answers
    const tfQuestions = questions.filter((q) => q.type === "true_false");
    if (tfQuestions.length > 0) {
      tex += `\\noindent\\textbf{II. BẢNG ĐÁP ÁN ĐÚNG / SAI}\\\\
\\vspace{0.1cm}
\\noindent\\begin{tabularx}{\\textwidth}{|c|Y|Y|Y|Y|}
\\hline
\\textbf{Câu} & \\textbf{Lệnh hỏi a)} & \\textbf{Lệnh hỏi b)} & \\textbf{Lệnh hỏi c)} & \\textbf{Lệnh hỏi d)} \\\\\\hline
`;
      tfQuestions.forEach((q, idx) => {
        const stmts = q.statements || [];
        const ans = [0, 1, 2, 3].map((sIdx) => {
          if (sIdx < stmts.length) {
            return stmts[sIdx].correctAnswer ? "\\textbf{Đ}" : "\\textbf{S}";
          }
          return "-";
        });
        tex += `\\textbf{${choiceQuestions.length + idx + 1}} & ${ans.join(" & ")} \\\\\\hline\n`;
      });
      tex += `\\end{tabularx}

\\vspace{0.4cm}
`;
    }

    // 3. Short Answer
    const saQuestions = questions.filter((q) => q.type === "short_answer");
    if (saQuestions.length > 0) {
      tex += `\\noindent\\textbf{III. BẢNG ĐÁP ÁN TRẢ LỜI NGẮN}\\\\
\\vspace{0.1cm}
\\noindent\\begin{tabularx}{\\textwidth}{|c|X|}
\\hline
\\textbf{Câu} & \\textbf{Đáp án chính xác} \\\\\\hline
`;
      saQuestions.forEach((q, idx) => {
        const accepted = q.acceptedAnswers?.join(" \\textit{hoặc} ") || "-";
        const globalIdx = choiceQuestions.length + tfQuestions.length + idx + 1;
        tex += `\\textbf{Câu ${globalIdx}} & ${escapeLatexText(accepted)} \\\\\\hline\n`;
      });
      tex += `\\end{tabularx}

\\vspace{0.6cm}
\\noindent\\rule{\\textwidth}{0.8pt}
\\begin{center}
\\textbf{\\large LỜI GIẢI VÀ HƯỚNG DẪN CHI TIẾT TỪNG CÂU}
\\end{center}
\\vspace{0.3cm}
`;
    }
  }

  // --- RENDER QUESTIONS BODY ---
  let currentSecId: string | null | undefined = undefined;
  const sectionMap = new Map(sections.map((s) => [s.id, s]));

  questions.forEach((q, qIndex) => {
    // Check if new section
    if (q.sectionId !== currentSecId) {
      currentSecId = q.sectionId;
      if (currentSecId && sectionMap.has(currentSecId)) {
        const sec = sectionMap.get(currentSecId)!;
        tex += `\n\\vspace{0.3cm}\n\\noindent\\textbf{\\large ${escapeLatexText(sec.title.toUpperCase())}}\\\\\n`;
        if (sec.description) {
          tex += `\\textit{${escapeLatexText(sec.description)}}\\\\\n`;
        }
        tex += `\\vspace{0.2cm}\n`;
      }
    }

    const questionNumber = qIndex + 1;
    tex += `\n\\noindent\\textbf{Câu ${questionNumber}:} ${escapeLatexText(q.text)}\n\n`;

    if (q.type === "single_choice" || q.type === "multiple_choice") {
      const opts = q.options || [];
      const maxLen = Math.max(...opts.map((o) => (o.text || "").length), 0);
      let numCols = 4;
      if (maxLen > 40) numCols = 1;
      else if (maxLen > 20) numCols = 2;

      tex += `\\begin{tasks}(${numCols})\n`;
      opts.forEach((opt) => {
        const isCorrect = q.correctOptionIds?.includes(opt.id);
        const prefix =
          includeAnswers && isCorrect ? "\\textbf{\\color{blue}" : "";
        const suffix = includeAnswers && isCorrect ? "}" : "";
        tex += `  \\task ${prefix}${escapeLatexText(opt.text)}${suffix}\n`;
      });
      tex += `\\end{tasks}\n`;
    } else if (q.type === "true_false") {
      const stmts = q.statements || [];
      tex += `\\begin{enumerate}[label=\\textbf{\\alph*)}, leftmargin=20pt, itemsep=2pt]\n`;
      stmts.forEach((stmt) => {
        const ansTag = includeAnswers
          ? ` \\textbf{[${stmt.correctAnswer ? "ĐÚNG" : "SAI"}]}`
          : "";
        tex += `  \\item ${escapeLatexText(stmt.text)}${ansTag}\n`;
      });
      tex += `\\end{enumerate}\n`;
    } else if (q.type === "short_answer") {
      if (includeAnswers) {
        tex += `\\noindent\\textbf{Đáp số:} \\textit{${escapeLatexText(q.acceptedAnswers?.join(", ") || "")}}\n\n`;
      } else {
        tex += `\\vspace{0.8cm}\n\\noindent\\textit{Đáp số: .....................................................................................}\n\n`;
      }
    }

    // Explanation
    if (includeAnswers && includeExplanation && q.explanation) {
      tex += `\\vspace{0.1cm}\n\\noindent\\textit{\\textbf{Lời giải:}} ${escapeLatexText(q.explanation)}\n\n`;
    }

    tex += `\\vspace{0.2cm}\n`;
  });

  tex += `\n\\begin{center}\n\\textbf{--- HẾT ---}\n\\end{center}\n\\end{document}`;

  return tex;
}

/**
 * Generates high-fidelity HTML designed for print / html2pdf rendering with KaTeX formulas.
 */
export function generateExamHtmlForPrint(
  exam: Partial<Exam>,
  sections: Section[],
  questions: Question[],
  options: ExportExamOptions,
): string {
  const {
    includeAnswers,
    includeExplanation = true,
    schoolName = "TRƯỜNG THPT CHUYÊN .....................",
    examCode = exam.code || "101",
    subjectName = "TOÁN HỌC",
    gradeName = "LỚP 12",
  } = options;

  const docTitle = exam.title || "ĐỀ KIỂM TRA ĐỊNH KỲ";
  const timeLimit = exam.timeLimit || 45;

  const choiceQuestions = questions.filter(
    (q) => q.type === "single_choice" || q.type === "multiple_choice",
  );
  const tfQuestions = questions.filter((q) => q.type === "true_false");
  const saQuestions = questions.filter((q) => q.type === "short_answer");

  let html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${includeAnswers ? "Đáp án & Lời giải" : "Đề thi"} - ${docTitle}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <style>
    @page {
      size: A4;
      margin: 15mm 15mm 15mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 13pt;
      line-height: 1.45;
      color: #111827;
      background: #fff;
      margin: 0;
      padding: 0;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    .header-table td {
      vertical-align: top;
      padding: 2px 4px;
    }
    .title-banner {
      text-align: center;
      margin: 12px 0 16px 0;
    }
    .title-banner h1 {
      font-size: 16pt;
      font-weight: bold;
      margin: 0 0 4px 0;
      text-transform: uppercase;
    }
    .code-badge {
      display: inline-block;
      border: 1.5px solid #111827;
      padding: 2px 14px;
      font-weight: bold;
      font-size: 12pt;
      border-radius: 4px;
      margin-top: 4px;
    }
    .student-info {
      width: 100%;
      margin-bottom: 16px;
      font-size: 12pt;
    }
    .dots {
      border-bottom: 1px dotted #333;
      display: inline-block;
      flex: 1;
      height: 14px;
      margin-left: 4px;
    }
    .divider {
      border-top: 1.5px solid #111827;
      margin: 10px 0 16px 0;
    }
    /* Matrix Summary Table */
    .answer-matrix-box {
      border: 2px solid #1e3a8a;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 24px;
      background-color: #f8fafc;
      page-break-inside: avoid;
    }
    .matrix-title {
      font-size: 14pt;
      font-weight: bold;
      color: #1e3a8a;
      text-align: center;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    .answer-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 11pt;
      text-align: center;
    }
    .answer-table th, .answer-table td {
      border: 1px solid #475569;
      padding: 4px 2px;
    }
    .answer-table th {
      background-color: #e2e8f0;
      font-weight: bold;
    }
    .ans-cell {
      font-weight: bold;
      color: #1e3a8a;
      background-color: #ffffff;
    }
    /* Questions */
    .section-header {
      font-size: 13pt;
      font-weight: bold;
      margin: 18px 0 8px 0;
      text-transform: uppercase;
      color: #0f172a;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 2px;
    }
    .question-item {
      margin-bottom: 14px;
      page-break-inside: avoid;
    }
    .question-text {
      font-weight: normal;
      margin-bottom: 6px;
    }
    .question-label {
      font-weight: bold;
    }
    .options-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px 12px;
      margin-left: 14px;
      margin-bottom: 6px;
    }
    .options-grid.two-cols {
      grid-template-columns: repeat(2, 1fr);
    }
    .options-grid.one-col {
      grid-template-columns: 1fr;
    }
    .opt-item {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }
    .opt-letter {
      font-weight: bold;
    }
    .opt-correct {
      font-weight: bold;
      color: #1d4ed8;
    }
    .explanation-box {
      margin-top: 6px;
      padding: 6px 10px;
      background-color: #f1f5f9;
      border-left: 3px solid #3b82f6;
      border-radius: 3px;
      font-size: 11.5pt;
      color: #334155;
    }
    .tf-table {
      width: 100%;
      border-collapse: collapse;
      margin-left: 14px;
      margin-bottom: 6px;
      font-size: 12pt;
    }
    .tf-table td {
      padding: 3px 0;
    }
    .end-marker {
      text-align: center;
      font-weight: bold;
      margin: 30px 0;
      letter-spacing: 2px;
    }
  </style>
</head>
<body>

  <!-- Header -->
  <table class="header-table">
    <tr>
      <td style="width: 48%; text-align: center;">
        <div style="font-weight: bold;">${escapeLatexText(schoolName)}</div>
        <div style="font-size: 11pt;">TỔ CHUYÊN MÔN: ${escapeLatexText(subjectName)}</div>
        <div style="font-size: 11pt; font-style: italic;">(Đề thi gồm ${questions.length} câu)</div>
      </td>
      <td style="width: 4%;"></td>
      <td style="width: 48%; text-align: center;">
        <div style="font-weight: bold; font-size: 13pt;">${includeAnswers ? "HƯỚNG DẪN CHẤM & ĐÁP ÁN CHI TIẾT" : "ĐỀ THI CHÍNH THỨC"}</div>
        <div style="font-weight: bold;">MÔN: ${escapeLatexText(subjectName)} - ${escapeLatexText(gradeName)}</div>
        <div style="font-size: 11pt; font-style: italic;">Thời gian: ${timeLimit} phút (không kể phát đề)</div>
      </td>
    </tr>
  </table>

  <div class="divider"></div>

  <div class="title-banner">
    <h1>${renderLatexToHtml(docTitle)}</h1>
    <div><span class="code-badge">MÃ ĐỀ THI: ${examCode}</span></div>
  </div>

  <div class="student-info">
    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
      <div style="display: flex; width: 62%;"><strong>Họ và tên thí sinh:</strong><span class="dots"></span></div>
      <div style="display: flex; width: 34%;"><strong>Số báo danh:</strong><span class="dots"></span></div>
    </div>
    <div style="display: flex; justify-content: space-between;">
      <div style="display: flex; width: 62%;"><strong>Lớp:</strong><span class="dots"></span></div>
      <div style="display: flex; width: 34%;"><strong>Phòng thi:</strong><span class="dots"></span></div>
    </div>
  </div>

  <div class="divider"></div>
`;

  // --- IF ANSWERS: FULL MATRIX SUMMARY AT TOP ---
  if (includeAnswers) {
    html += `
  <div class="answer-matrix-box">
    <div class="matrix-title">📋 KHUNG ĐÁP ÁN TỔNG HỢP TOÀN BỘ ĐỀ THI</div>
`;

    // 1. Multiple Choice Matrix Table
    if (choiceQuestions.length > 0) {
      html += `
    <div style="font-weight: bold; margin-bottom: 4px;">I. ĐÁP ÁN TRẮC NGHIỆM NHIỀU LỰA CHỌN:</div>
`;
      const chunkSize = 10;
      for (let i = 0; i < choiceQuestions.length; i += chunkSize) {
        const chunk = choiceQuestions.slice(i, i + chunkSize);
        html += `<table class="answer-table"><tr>`;
        chunk.forEach((_, idx) => {
          html += `<th>Câu ${i + idx + 1}</th>`;
        });
        html += `</tr><tr>`;
        chunk.forEach((q) => {
          const optList = q.options || [];
          const correctLetters = (q.correctOptionIds || []).map((cid) => {
            const optIdx = optList.findIndex((o) => o.id === cid);
            return optIdx !== -1 ? String.fromCharCode(65 + optIdx) : cid;
          });
          html += `<td class="ans-cell">${correctLetters.join(", ") || "-"}</td>`;
        });
        html += `</tr></table>`;
      }
    }

    // 2. True / False Matrix Table
    if (tfQuestions.length > 0) {
      html += `
    <div style="font-weight: bold; margin-top: 8px; margin-bottom: 4px;">II. ĐÁP ÁN TRẮC NGHIỆM ĐÚNG / SAI:</div>
    <table class="answer-table">
      <tr>
        <th style="width: 15%;">Câu hỏi</th>
        <th style="width: 21%;">Lệnh hỏi a)</th>
        <th style="width: 21%;">Lệnh hỏi b)</th>
        <th style="width: 21%;">Lệnh hỏi c)</th>
        <th style="width: 21%;">Lệnh hỏi d)</th>
      </tr>
`;
      tfQuestions.forEach((q, idx) => {
        const stmts = q.statements || [];
        const globalNum = choiceQuestions.length + idx + 1;
        html += `<tr><td style="font-weight: bold;">Câu ${globalNum}</td>`;
        [0, 1, 2, 3].forEach((sIdx) => {
          if (sIdx < stmts.length) {
            const isT = stmts[sIdx].correctAnswer;
            html += `<td class="ans-cell" style="color: ${isT ? "#16a34a" : "#dc2626"}; font-weight: bold;">${isT ? "ĐÚNG" : "SAI"}</td>`;
          } else {
            html += `<td>-</td>`;
          }
        });
        html += `</tr>`;
      });
      html += `</table>`;
    }

    // 3. Short Answer Matrix Table
    if (saQuestions.length > 0) {
      html += `
    <div style="font-weight: bold; margin-top: 8px; margin-bottom: 4px;">III. ĐÁP ÁN TRẢ LỜI NGẮN:</div>
    <table class="answer-table" style="text-align: left;">
      <tr>
        <th style="width: 20%; text-align: center;">Câu hỏi</th>
        <th style="text-align: left; padding-left: 10px;">Đáp án chính xác</th>
      </tr>
`;
      saQuestions.forEach((q, idx) => {
        const globalNum = choiceQuestions.length + tfQuestions.length + idx + 1;
        html += `<tr>
          <td style="font-weight: bold; text-align: center;">Câu ${globalNum}</td>
          <td class="ans-cell" style="text-align: left; padding-left: 10px;">${escapeLatexText(q.acceptedAnswers?.join("  hoặc  ") || "-")}</td>
        </tr>`;
      });
      html += `</table>`;
    }

    html += `
  </div>
  <div style="text-align: center; font-weight: bold; font-size: 14pt; margin: 18px 0; text-transform: uppercase; color: #1e3a8a;">
    HƯỚNG DẪN GIẢI VÀ LỜI GIẢI CHI TIẾT TỪNG CÂU
  </div>
`;
  }

  // --- RENDER QUESTIONS ---
  let currentSecId: string | null | undefined = undefined;
  const sectionMap = new Map(sections.map((s) => [s.id, s]));

  questions.forEach((q, qIndex) => {
    if (q.sectionId !== currentSecId) {
      currentSecId = q.sectionId;
      if (currentSecId && sectionMap.has(currentSecId)) {
        const sec = sectionMap.get(currentSecId)!;
        html += `<div class="section-header">${renderLatexToHtml(sec.title)}</div>`;
        if (sec.description) {
          html += `<div style="font-style: italic; margin-bottom: 8px;">${renderLatexToHtml(sec.description)}</div>`;
        }
      }
    }

    const questionNumber = qIndex + 1;

    html += `
  <div class="question-item">
    <div class="question-text">
      <span class="question-label">Câu ${questionNumber}:</span> ${renderLatexToHtml(q.text)}
    </div>
`;

    if (q.type === "single_choice" || q.type === "multiple_choice") {
      const opts = q.options || [];
      // Calculate column count based on option text length
      const maxLen = Math.max(...opts.map((o) => o.text.length), 0);
      let colClass = "";
      if (maxLen > 40) colClass = "one-col";
      else if (maxLen > 20) colClass = "two-cols";

      html += `<div class="options-grid ${colClass}">`;
      opts.forEach((opt, oIdx) => {
        const isCorrect = q.correctOptionIds?.includes(opt.id);
        const letter = String.fromCharCode(65 + oIdx);
        html += `
        <div class="opt-item ${includeAnswers && isCorrect ? "opt-correct" : ""}">
          <span class="opt-letter">${letter}.</span>
          <span>${renderLatexToHtml(opt.text)}</span>
        </div>
`;
      });
      html += `</div>`;
    } else if (q.type === "true_false") {
      const stmts = q.statements || [];
      html += `<table class="tf-table">`;
      stmts.forEach((stmt, sIdx) => {
        const letter = String.fromCharCode(97 + sIdx);
        const ansTag = includeAnswers
          ? `<strong style="color: ${stmt.correctAnswer ? "#16a34a" : "#dc2626"};">[${stmt.correctAnswer ? "ĐÚNG" : "SAI"}]</strong>`
          : "";
        html += `
        <tr>
          <td style="width: 28px; font-weight: bold; vertical-align: top;">${letter})</td>
          <td>${renderLatexToHtml(stmt.text)} ${ansTag}</td>
        </tr>
`;
      });
      html += `</table>`;
    } else if (q.type === "short_answer") {
      if (includeAnswers) {
        html += `<div style="margin-left: 14px; font-weight: bold; color: #1e3a8a;">Đáp số: ${escapeLatexText(q.acceptedAnswers?.join(", ") || "")}</div>`;
      } else {
        html += `<div style="margin: 12px 0 12px 14px; font-style: italic;">Đáp số: .................................................................................</div>`;
      }
    }

    // Explanation
    if (includeAnswers && includeExplanation && q.explanation) {
      html += `
    <div class="explanation-box">
      <strong>Lời giải:</strong> ${renderLatexToHtml(q.explanation)}
    </div>
`;
    }

    html += `</div>`;
  });

  html += `
  <div class="end-marker">--------- HẾT ---------</div>
</body>
</html>
`;

  return html;
}

/**
 * Exports directly to PDF using html2pdf.js
 */
export async function exportExamToPdf(
  exam: Partial<Exam>,
  sections: Section[],
  questions: Question[],
  options: ExportExamOptions,
  filename?: string,
): Promise<void> {
  const html = generateExamHtmlForPrint(exam, sections, questions, options);

  const prevScrollY = window.scrollY;
  window.scrollTo(0, 0);

  const defaultName = options.includeAnswers
    ? `${exam.title || "De_Thi"}_Dap_An_Chi_Tiet.pdf`
    : `${exam.title || "De_Thi"}_De_Thi.pdf`;

  const finalFileName = (filename || defaultName).replace(
    /[\/\\:*?"<>|]/g,
    "_",
  );

  const container = document.createElement("div");
  container.id = "pdf-export-container";
  container.style.position = "absolute";
  container.style.left = "0";
  container.style.top = "0";
  container.style.width = "794px"; // Standard A4 width at 96 DPI
  container.style.backgroundColor = "#ffffff";
  container.style.color = "#111827";
  container.style.zIndex = "99999";
  container.style.boxSizing = "border-box";
  container.style.padding = "0";
  container.style.margin = "0";

  // Parse HTML string and extract style tags and body content
  const parser = new DOMParser();
  const parsedDoc = parser.parseFromString(html, "text/html");

  const styleElements: string[] = [];
  parsedDoc.querySelectorAll("style").forEach((s) => {
    styleElements.push(s.outerHTML);
  });

  const katexCssLink = `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">`;
  const bodyInner = parsedDoc.body ? parsedDoc.body.innerHTML : html;

  container.innerHTML = `
    ${katexCssLink}
    ${styleElements.join("\n")}
    <div style="background:#ffffff; color:#111827; padding: 15mm; font-family: 'Times New Roman', Times, serif; width: 794px; box-sizing: border-box;">
      ${bodyInner}
    </div>
  `;

  document.body.appendChild(container);

  // Wait 1200ms for KaTeX CSS and webfonts
  await new Promise((resolve) => setTimeout(resolve, 1200));

  try {
    const html2pdf = (await import("html2pdf.js")).default;

    const opt = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename: finalFileName,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        windowWidth: 794,
        windowHeight: container.scrollHeight,
        logging: false,
      },
      jsPDF: {
        unit: "mm" as const,
        format: "a4" as const,
        orientation: "portrait" as const,
      },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    };

    await html2pdf().set(opt).from(container).save();
  } catch (err) {
    console.warn("html2pdf failed, invoking browser print fallback", err);
    printExamDocument(exam, sections, questions, options);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
    window.scrollTo(0, prevScrollY);
  }
}

/**
 * Direct print dialog preview via hidden iframe (100% vector & cross-browser)
 */
export function printExamDocument(
  exam: Partial<Exam>,
  sections: Section[],
  questions: Question[],
  options: ExportExamOptions,
) {
  const html = generateExamHtmlForPrint(exam, sections, questions, options);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.zIndex = "-1";

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }, 800);
  }
}

/**
 * Downloads raw LaTeX file (.tex)
 */
export function downloadLatexSource(
  exam: Partial<Exam>,
  sections: Section[],
  questions: Question[],
  options: ExportExamOptions,
) {
  const texContent = generateExamLatex(exam, sections, questions, options);
  const blob = new Blob([texContent], { type: "text/plain;charset=utf-8" });
  const filename = options.includeAnswers
    ? `${exam.title || "De_Thi"}_Dap_An.tex`
    : `${exam.title || "De_Thi"}_De_Thi.tex`;

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename.replace(/[\/\\:*?"<>|]/g, "_");
  link.click();
  URL.revokeObjectURL(link.href);
}
