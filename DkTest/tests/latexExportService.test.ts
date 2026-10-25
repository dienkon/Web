import { describe, it, expect } from "vitest";
import {
  renderLatexToHtml,
  generateExamHtmlForPrint,
  estimateExamPageBudget,
  classifyOptionsLayout,
  escapeLatexText,
  formatHtmlWidgetForPrint,
  ExportExamOptions,
} from "../src/services/latexExportService";
import type { Question, Section, Exam } from "../src/types";

describe("latexExportService - PDF & Print Export Engine", () => {
  describe("Diagram & Visualization Formatting", () => {
    it("renders <graph> math function graphs into crisp, responsive SVGs for PDF", () => {
      const text = `Cho hàm số có đồ thị như sau:
<graph title="Đồ thị hàm số bậc 3" xmin="-3" xmax="3" ymin="-3" ymax="3">
f(x) = x^3 - 3*x
point: (0, 0)
</graph>
Hãy tìm các điểm cực trị của hàm số.`;

      const html = renderLatexToHtml(text);
      expect(html).toContain("dk-print-diagram");
      expect(html).toContain("dk-print-graph");
      expect(html).toContain("<svg");
      expect(html).toContain("Đồ thị hàm số bậc 3");
      expect(html).toContain("Hãy tìm các điểm cực trị");
    });

    it("renders fenced ```graph code blocks into SVGs", () => {
      const text = `Hình vẽ bên là đồ thị hàm số:
\`\`\`graph
f(x) = x^2 - 4
\`\`\`
Hàm số đồng biến trên khoảng nào?`;

      const html = renderLatexToHtml(text);
      expect(html).toContain("dk-print-diagram");
      expect(html).toContain("dk-print-graph");
      expect(html).toContain("<svg");
    });

    it("renders <bbt> variation tables into formatted HTML with arrow SVGs", () => {
      const text = `Cho bảng biến thiên sau:
<bbt title="Bảng biến thiên hàm số f(x)">
x: -oo | -1 | 1 | +oo
y': | + | 0 | - | 0 | + |
y: -oo / 2 \\ -2 / +oo
</bbt>
Khẳng định nào dưới đây đúng?`;

      const html = renderLatexToHtml(text);
      expect(html).toContain("dk-print-diagram");
      expect(html).toContain("dk-print-bbt");
      expect(html).toContain("dk-bbt-container");
      expect(html).toContain("<table");
      expect(html).toContain("Bảng biến thiên hàm số f(x)");
    });

    it("renders fenced ```bbt blocks into variation tables", () => {
      const text = `Quan sát bảng xét dấu:
\`\`\`bbt
x: -oo | 0 | +oo
y': | - | 0 | + |
\`\`\`
Tìm khoảng nghịch biến.`;

      const html = renderLatexToHtml(text);
      expect(html).toContain("dk-print-diagram");
      expect(html).toContain("dk-print-bbt");
    });

    it("renders <live-canvas> canvas code blocks into print containers with metadata", () => {
      const text = `Hình vẽ hình học không gian:
<live-canvas title="Hình chóp S.ABCD" width="450" height="300">
ctx.beginPath();
ctx.moveTo(100, 100);
ctx.lineTo(200, 200);
ctx.stroke();
</live-canvas>
Tính thể tích khối chóp.`;

      const html = renderLatexToHtml(text);
      expect(html).toContain("dk-print-diagram");
      expect(html).toContain("dk-print-live-canvas");
      expect(html).toContain("Hình chóp S.ABCD");
      // Contains either pre-rendered img or canvas with data-code
      expect(html.includes("dk-print-canvas-img") || html.includes("dk-live-canvas")).toBe(true);
    });

    it("renders <live-canvas> chemical structure (triglyceride) with responsive, centered styling for print", () => {
      const chemSnippet = `
<live-canvas title="Cấu tạo Triglyceride" width="500" height="340">
(function() {
    ctx.strokeStyle = "#111827";
    function bond(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); }
    bond(20, 95, 775, 108);
})();
</live-canvas>`;
      const html = renderLatexToHtml(chemSnippet);
      expect(html).toContain("dk-print-live-canvas");
      expect(html).toContain("Cấu tạo Triglyceride");
      expect(html).toContain("display: block");
      expect(html).toContain("margin: 0 auto");
    });

    it("renders <html-widget> interactive blocks into clean, script-safe print cards", () => {
      const widgetContent = `<html-widget title="Mô phỏng Dao động điều hòa">
<!DOCTYPE html>
<html>
<head>
  <style>.box { color: blue; }</style>
  <script>alert('bad');</script>
</head>
<body>
  <div class="box"><h3>Con lắc đơn dao động</h3></div>
  <button onclick="run()">Kích hoạt dao động</button>
</body>
</html>
</html-widget>`;

      const html = renderLatexToHtml(widgetContent);
      expect(html).toContain("dk-print-html-widget");
      expect(html).toContain("Mô phỏng Dao động điều hòa");
      expect(html).toContain("Con lắc đơn dao động");
      // Scripts must be completely stripped in print
      expect(html).not.toContain("<script>alert('bad');</script>");
      // Buttons converted to printable badge
      expect(html).toContain("[Nút: Kích hoạt dao động]");
    });

    it("formats programming code blocks (```python, ```c) with clean light styling and border accents", () => {
      const codeSnippet = `Đoạn mã sau thực hiện thuật toán tìm kiếm:
\`\`\`python
def binary_search(arr, target):
    low = 0
    high = len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
    return -1
\`\`\`
Giá trị trả về là gì?`;

      const html = renderLatexToHtml(codeSnippet);
      expect(html).toContain("dk-print-code-box");
      expect(html).toContain("PYTHON");
      expect(html).toContain("binary_search");
      expect(html).toContain("page-break-inside: avoid");
    });
  });

  describe("Layout & Option Grid Classification", () => {
    const shortOptions = [
      { text: "$1$" },
      { text: "$2$" },
      { text: "$3$" },
      { text: "$4$" },
    ];
    const mediumOptions = [
      { text: "$x = \\frac{1}{2}$" },
      { text: "$x = -\\frac{1}{2}$" },
      { text: "$x = 1$" },
      { text: "$x = -1$" },
    ];
    const longOptions = [
      { text: "Hàm số đồng biến trên toàn bộ tập xác định $\\mathbb{R}$" },
      { text: "Hàm số nghịch biến trên khoảng $(-\\infty; 0)$" },
      { text: "Hàm số đạt cực tiểu tại điểm $x = 2$" },
      { text: "Đồ thị hàm số không có đường tiệm cận đứng" },
    ];

    it("classifies short options into four-cols for 1-column documents", () => {
      expect(classifyOptionsLayout(shortOptions, false)).toBe("four-cols");
    });

    it("classifies medium options into two-cols for 1-column documents", () => {
      expect(classifyOptionsLayout(mediumOptions, false)).toBe("two-cols");
    });

    it("classifies long options into one-col for 1-column documents", () => {
      expect(classifyOptionsLayout(longOptions, false)).toBe("one-col");
    });

    it("adapts options in 2-column mode to prevent cramping into 4 columns", () => {
      // In 2-col mode, medium options should NOT use 4-cols
      expect(classifyOptionsLayout(mediumOptions, true)).toBe("two-cols");
      expect(classifyOptionsLayout(longOptions, true)).toBe("one-col");
    });
  });

  describe("Page Budget Estimation & Smart Layout Auto-Fit", () => {
    const mockQuestions: Question[] = [
      {
        id: "q1",
        examId: "ex1",
        points: 1,
        order: 1,
        type: "single_choice",
        text: "Cho hàm số $y = x^3 - 3x + 1$. Khảo sát điểm cực trị.",
        options: [
          { id: "o1", text: "$A(1; -1)$" },
          { id: "o2", text: "$B(-1; 3)$" },
          { id: "o3", text: "$C(0; 1)$" },
          { id: "o4", text: "$D(2; 3)$" },
        ],
        correctOptionIds: ["o1"],
      },
      {
        id: "q2",
        examId: "ex1",
        points: 1,
        order: 2,
        type: "single_choice",
        text: `<graph title="Đồ thị f(x)">
f(x) = x^2 - 2
</graph>
Tìm giá trị nhỏ nhất của hàm số.`,
        options: [
          { id: "o1", text: "$-2$" },
          { id: "o2", text: "$0$" },
          { id: "o3", text: "$2$" },
          { id: "o4", text: "$-4$" },
        ],
        correctOptionIds: ["o1"],
      },
      {
        id: "q3",
        examId: "ex1",
        points: 1,
        order: 3,
        type: "true_false",
        text: "Xét tính đúng sai của các mệnh đề sau:",
        statements: [
          { id: "s1", text: "Hàm số liên tục tại $x = 0$", correctAnswer: true },
          { id: "s2", text: "Đạo hàm cấp một bằng 0", correctAnswer: false },
          { id: "s3", text: "Tiệm cận ngang là $y = 1$", correctAnswer: true },
          { id: "s4", text: "Tập xác định là $\\mathbb{R}$", correctAnswer: true },
        ],
      },
      {
        id: "q4",
        examId: "ex1",
        points: 1,
        order: 4,
        type: "short_answer",
        text: "Tìm nghiệm nguyên dương nhỏ nhất của bất phương trình $2^x > 16$.",
        acceptedAnswers: ["5"],
      },
    ];

    it("estimates page budget correctly for a short exam", () => {
      const options: ExportExamOptions = {
        includeAnswers: false,
        layoutMode: "one-col",
        fontSizePreset: "normal",
        spacingPreset: "normal",
      };

      const budget = estimateExamPageBudget(mockQuestions, options);
      expect(budget.estimatedPages).toBe(1);
      expect(budget.fitsWithinTarget).toBe(true);
      expect(budget.usableHeightPerPagePx).toBeGreaterThan(900);
    });

    it("correctly identifies when content fits within admin's target maxPages", () => {
      const options: ExportExamOptions = {
        includeAnswers: false,
        maxPages: 2,
        layoutMode: "one-col",
      };

      const budget = estimateExamPageBudget(mockQuestions, options);
      expect(budget.fitsWithinTarget).toBe(true);
    });

    it("provides smart recommendations when exam exceeds target maxPages", () => {
      // Simulate a long exam (e.g. 35 questions)
      const longExamQuestions: Question[] = [];
      for (let i = 0; i < 35; i++) {
        longExamQuestions.push({
          id: `q_${i}`,
          examId: "ex1",
          points: 1,
          order: i + 1,
          type: "single_choice",
          text: `Câu hỏi số ${i + 1}: Tìm tập xác định của hàm số $y = \\sqrt{x^2 - ${i + 1}}$.`,
          options: [
            { id: "a", text: "$(-\\infty; -1) \\cup (1; +\\infty)$" },
            { id: "b", text: "$[-1; 1]$" },
            { id: "c", text: "$\\mathbb{R} \\setminus \\{0\\}$" },
            { id: "d", text: "$\\emptyset$" },
          ],
          correctOptionIds: ["a"],
        });
      }

      // Admin requests max 2 pages
      const options: ExportExamOptions = {
        includeAnswers: true,
        includeExplanation: true,
        maxPages: 2,
        layoutMode: "one-col",
      };

      const budget = estimateExamPageBudget(longExamQuestions, options);
      expect(budget.estimatedPages).toBeGreaterThan(2);
      expect(budget.fitsWithinTarget).toBe(false);
      // Smart recommendation should advise switching to 2-column layout and compact font
      expect(budget.recommendedLayout).toBe("two-cols");
      expect(budget.recommendedFontSize).toBe("compact");
      expect(budget.recommendedSpacing).toBe("tight");
    });
  });

  describe("generateExamHtmlForPrint - Full Document Assembly", () => {
    const mockExam: Partial<Exam> = {
      title: "ĐỀ KIỂM TRA ĐỊNH KỲ GIỮA KỲ 2",
      code: "102",
      timeLimit: 90,
    };

    const mockSections: Section[] = [
      {
        id: "sec1",
        examId: "ex1",
        title: "Phần I: Câu hỏi trắc nghiệm nhiều phương án lựa chọn",
        order: 0,
        questionCount: 1,
        enabled: true,
      },
    ];

    const mockQuestions: Question[] = [
      {
        id: "q1",
        examId: "ex1",
        points: 1,
        order: 1,
        sectionId: "sec1",
        type: "single_choice",
        text: "Tập nghiệm của bất phương trình $\\log_2(x - 1) < 3$ là:",
        options: [
          { id: "o1", text: "$(1; 9)$" },
          { id: "o2", text: "$(-\\infty; 9)$" },
          { id: "o3", text: "$(1; 8)$" },
          { id: "o4", text: "$(9; +\\infty)$" },
        ],
        correctOptionIds: ["o1"],
        explanation: "Điều kiện: $x > 1$. Bất phương trình tương đương: $x - 1 < 2^3 = 8 \\iff x < 9$. Kết hợp $x > 1 \\implies x \\in (1; 9)$.",
      },
    ];

    it("generates valid HTML document with KaTeX, CSS variables, and layout classes", () => {
      const html = generateExamHtmlForPrint(mockExam, mockSections, mockQuestions, {
        includeAnswers: false,
        layoutMode: "two-cols",
        fontSizePreset: "compact",
        spacingPreset: "tight",
        diagramScalePreset: "small",
        schoolName: "TRƯỜNG THPT CHUYÊN LÊ HỒNG PHONG",
        examCode: "102",
        subjectName: "TOÁN HỌC",
        gradeName: "LỚP 12",
      });

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("TRƯỜNG THPT CHUYÊN LÊ HỒNG PHONG");
      expect(html).toContain("ĐỀ KIỂM TRA ĐỊNH KỲ GIỮA KỲ 2");
      expect(html).toContain("MÃ ĐỀ THI: 102");
      expect(html).toContain("two-cols");
      expect(html).toContain("--exam-font-size: 10.5pt");
      expect(html).toContain("--exam-margin: 8mm");
      expect(html).toContain("--diagram-max-height: 180px");
      expect(html).toContain("span-full-width");
      expect(html).toContain("katex.min.css");
      // When includeAnswers is false, explanation must NOT be shown
      expect(html).not.toContain("Lời giải:");
    });

    it("generates answer matrix summary when includeAnswers is true", () => {
      const html = generateExamHtmlForPrint(mockExam, mockSections, mockQuestions, {
        includeAnswers: true,
        includeExplanation: true,
        layoutMode: "one-col",
      });

      expect(html).toContain("KHUNG ĐÁP ÁN TỔNG HỢP TOÀN BỘ ĐỀ THI");
      expect(html).toContain("ĐÁP ÁN TRẮC NGHIỆM NHIỀU LỰA CHỌN");
      expect(html).toContain("Câu 1");
      expect(html).toContain("Lời giải:");
      expect(html).toContain("Điều kiện:");
      expect(html).toContain("katex");
    });
  });

  describe("escapeLatexText safety", () => {
    it("preserves formulas while stripping custom HTML tags for LaTeX source", () => {
      const text = "Cho hàm số $y = \\sqrt{x + 1}$ và đồ thị <graph>f(x)=x</graph>. Tìm nghiệm.";
      const tex = escapeLatexText(text);
      expect(tex).toContain("$y = \\sqrt{x + 1}$");
      expect(tex).not.toContain("<graph>");
      expect(tex).toContain("% [Đồ thị hàm số]");
    });

    it("sanitizes fenced diagram blocks into LaTeX comments in .tex output", () => {
      const text = `Hình vẽ bên là đồ thị:\n\`\`\`graph\nf(x) = x^2\n\`\`\`\nKhảo sát tính đồng biến.`;
      const tex = escapeLatexText(text);
      expect(tex).not.toContain("```graph");
      expect(tex).toContain("% [Khối GRAPH]");
      expect(tex).toContain("Khảo sát tính đồng biến.");
    });
  });

  describe("Advanced Diagram & Print Enhancements", () => {
    it("renders fenced diagram code blocks with titles cleanly", () => {
      const text = `Cho đồ thị hàm số sau:
\`\`\`graph:Đồ thị hàm bậc ba
f(x) = x^3 - 3*x
\`\`\`
Khảo sát cực trị.`;

      const html = renderLatexToHtml(text);
      expect(html).toContain("dk-print-graph");
      expect(html).toContain("Đồ thị hàm bậc ba");
    });

    it("renders fenced BBT blocks with titles", () => {
      const text = `Xét bảng biến thiên:
\`\`\`bbt:Bảng xét dấu f'(x)
x: -oo | 0 | +oo
y': | + | 0 | - |
\`\`\`
Tìm khoảng nghịch biến.`;

      const html = renderLatexToHtml(text);
      expect(html).toContain("dk-print-bbt");
      expect(html).toContain("Bảng xét dấu f'(x)");
    });

    it("renders code blocks with titles and language headers", () => {
      const text = `\`\`\`python:Thuật toán QuickSort
def quicksort(arr):
    pass
\`\`\``;

      const html = renderLatexToHtml(text);
      expect(html).toContain("dk-print-code-box");
      expect(html).toContain("PYTHON");
      expect(html).toContain("Thuật toán QuickSort");
    });

    it("preserves <style> inside <head> in formatHtmlWidgetForPrint", () => {
      const raw = `<!DOCTYPE html>
<html>
<head>
  <style>
    .my-custom-chart { background: #fef3c7; border: 1px solid #f59e0b; }
  </style>
  <script>console.log("unsafe");</script>
</head>
<body>
  <div class="my-custom-chart">Biểu đồ mô phỏng</div>
  <input type="range" min="0" max="100" value="50" />
</body>
</html>`;

      const formatted = formatHtmlWidgetForPrint(raw);
      expect(formatted).toContain(".my-custom-chart");
      expect(formatted).toContain("background: #fef3c7");
      expect(formatted).not.toContain("<script>");
      expect(formatted).toContain("[Thanh trượt tham số]");
    });

    it("formats standalone HTML simulation documents without breaking markup", () => {
      const doc = `<!DOCTYPE html>
<html>
<head><style>.box { color: green; }</style></head>
<body><div class="box">Con lắc lò xo</div></body>
</html>`;

      const html = renderLatexToHtml(doc);
      expect(html).toContain("dk-print-html-widget");
      expect(html).toContain("Con lắc lò xo");
    });

    it("includes 2-column print styles, responsive BBT table, and B&W answer underline", () => {
      const exam: Partial<Exam> = { title: "Đề thi thử", code: "001" };
      const sections: Section[] = [{ id: "s1", examId: "ex1", title: "Phần 1", order: 1, questionCount: 1, enabled: true }];
      const questions: Question[] = [
        {
          id: "q1",
          examId: "ex1",
          points: 1,
          order: 1,
          type: "single_choice",
          text: "Câu hỏi 1",
          options: [{ id: "o1", text: "A" }, { id: "o2", text: "B" }],
          correctOptionIds: ["o1"],
        },
      ];

      const html = generateExamHtmlForPrint(exam, sections, questions, {
        includeAnswers: true,
        layoutMode: "two-cols",
      });

      expect(html).toContain("@media print");
      expect(html).toContain("column-count: 2 !important");
      expect(html).toContain("table-layout: auto !important");
      expect(html).toContain("text-decoration: underline");
    });
  });
});
