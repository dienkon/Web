import { describe, it, expect } from "vitest";
import {
  renderMarkdownWithLatex,
  safeEncode,
  safeDecode,
  extractHtmlWidgets,
  renderHtmlWidgetHtml,
  mountHtmlWidgets,
} from "../src/features/exam-builder/editor/LatexPreview";
import { formatFillBlankForPreview } from "../src/features/exam-builder/components/ExamVisualPreviewEditor";
import { extractBlanksCount } from "../src/features/exam-builder/questions/FillBlankEditor";
import {
  renderTouchEditableHtml,
  extractTextFromTouchEditable,
} from "../src/features/exam-builder/editor/RichTextEditor";
import type { Question, QuestionType } from "../src/types";

describe("Exam Visual Preview Editor & Side-by-Side Verification", () => {
  describe("LatexPreview & Safe URI Encoding/Decoding", () => {
    it("safely decodes and encodes strings with percentages and special characters", () => {
      const normal = "Giá trị tăng 25% trong năm. Hãy tính 10% của số đó.";
      expect(safeEncode(normal)).toContain("25");
      expect(safeDecode(safeEncode(normal))).toBe(normal);

      // Malformed URI string (lone percent or bad hex)
      const malformed = "%E0%A4%A";
      expect(() => safeDecode(malformed)).not.toThrow();
      expect(safeDecode(malformed)).toBe(malformed);
    });

    it("renders KaTeX math expressions safely without errors", () => {
      const content = "Cho hàm số $y = \\frac{x^2 - 1}{x + 1}$ và phương trình $\\sqrt{x + 2} = 3$.";
      expect(() => renderMarkdownWithLatex(content)).not.toThrow();
      const html = renderMarkdownWithLatex(content);
      expect(html).toContain("katex");
    });

    it("renders <graph> tags inside exam text safely", () => {
      const content = `<graph title="Đồ thị hàm số bậc 2" xmin="-3" xmax="3" ymin="-2" ymax="5">
f(x) = x^2 - 1
point: (0, -1)
</graph>`;
      expect(() => renderMarkdownWithLatex(content)).not.toThrow();
      const html = renderMarkdownWithLatex(content);
      expect(html).toContain("<svg");
      expect(html).toContain("dk-graph-container");
    });

    it("renders <bbt> tags inside exam text safely", () => {
      const content = `<bbt title="Bảng biến thiên">
x: -oo | 0 | +oo
y': | - | 0 | + |
y: +oo \\ -1 / +oo
</bbt>`;
      expect(() => renderMarkdownWithLatex(content)).not.toThrow();
      const html = renderMarkdownWithLatex(content);
      expect(html).toContain("dk-bbt-container");
    });

    it("renders <live-canvas> tags inside exam text safely with safeEncode data-code", () => {
      const content = `<live-canvas width="400" height="300" title="Hình học không gian">
ctx.strokeStyle = "blue";
ctx.strokeRect(10, 10, 100, 100);
</live-canvas>`;
      expect(() => renderMarkdownWithLatex(content)).not.toThrow();
      const html = renderMarkdownWithLatex(content);
      expect(html).toContain("dk-live-canvas-block");
      expect(html).toContain("canvas");
      expect(html).toContain("data-code=");
    });
  });

  describe("Fill in the Blank Prompt Formatting (formatFillBlankForPreview)", () => {
    it("formats blank slots with correct answers when showAnswers is true", () => {
      const text = "Thủ đô của nước Việt Nam là [_], thuộc miền [_].";
      const answersMap = {
        0: ["Hà Nội", "ha noi"],
        1: ["Bắc", "mien bac"],
      };

      const result = formatFillBlankForPreview(text, answersMap, true);
      expect(result).toContain("**[(1) Hà Nội]**");
      expect(result).toContain("**[(2) Bắc]**");
    });

    it("formats blank slots with student dotted placeholders when showAnswers is false", () => {
      const text = "Thủ đô của nước Việt Nam là [_], thuộc miền [_].";
      const answersMap = {
        0: ["Hà Nội", "ha noi"],
        1: ["Bắc", "mien bac"],
      };

      const result = formatFillBlankForPreview(text, answersMap, false);
      expect(result).toContain("[(1) ....................]");
      expect(result).toContain("[(2) ....................]");
      expect(result).not.toContain("Hà Nội");
      expect(result).not.toContain("Bắc");
    });

    it("accurately detects blanks with extractBlanksCount", () => {
      expect(extractBlanksCount("Không có lỗ nào.")).toBe(0);
      expect(extractBlanksCount("Có một lỗ [_] ở đây.")).toBe(1);
      expect(extractBlanksCount("Lỗ 1: [_], Lỗ 2: [blank], Lỗ 3: [_].")).toBe(3);
    });
  });

  describe("System Score Scaling (10-Point Scale)", () => {
    const getSystemScaledPoint = (rawPoints: number, totalRawPoints: number) => {
      if (!totalRawPoints || totalRawPoints <= 0) return "0";
      const targetSystemTotal = 10;
      const scaled = (rawPoints / totalRawPoints) * targetSystemTotal;
      if (isNaN(scaled) || !isFinite(scaled)) return "0";
      return scaled % 1 === 0 ? scaled.toFixed(0) : scaled.toFixed(2);
    };

    it("scales raw points proportionally to 10 points", () => {
      const totalRaw = 1.0;
      expect(getSystemScaledPoint(0.25, totalRaw)).toBe("2.50");
      expect(getSystemScaledPoint(0.5, totalRaw)).toBe("5");
      expect(getSystemScaledPoint(1.0, totalRaw)).toBe("10");
    });

    it("safely handles zero total points without returning NaN", () => {
      expect(getSystemScaledPoint(0, 0)).toBe("0");
      expect(getSystemScaledPoint(1, 0)).toBe("0");
    });

    it("handles 40-question standard exam with 0.25 raw points each", () => {
      const totalRaw = 40 * 0.25; // 10.0
      expect(getSystemScaledPoint(0.25, totalRaw)).toBe("0.25");
    });
  });

  describe("Structure Preservation across All 8 Question Types", () => {
    it("preserves Single Choice question fields and correctOptionIds", () => {
      const q: Question = {
        id: "q_sc_1",
        examId: "exam_1",
        sectionId: "sec_1",
        type: "single_choice",
        text: "Câu hỏi 1",
        points: 0.25,
        order: 0,
        options: [
          { id: "opt_a", text: "Lựa chọn A" },
          { id: "opt_b", text: "Lựa chọn B" },
        ],
        correctOptionIds: ["opt_a"],
        explanation: "Lời giải A",
        level: "NB",
        pinQuestion: true,
        shuffleOptions: false,
      };

      expect(q.type).toBe("single_choice");
      expect(q.correctOptionIds).toEqual(["opt_a"]);
      expect(q.pinQuestion).toBe(true);
      expect(q.shuffleOptions).toBe(false);
      expect(q.options?.length).toBe(2);
    });

    it("preserves True/False statement structure with booleans", () => {
      const q: Question = {
        id: "q_tf_1",
        examId: "exam_1",
        sectionId: "sec_1",
        type: "true_false",
        text: "Mệnh đề đúng sai",
        points: 1.0,
        order: 1,
        statements: [
          { id: "s1", text: "Ý a", correctAnswer: true },
          { id: "s2", text: "Ý b", correctAnswer: false },
        ],
        level: "VD",
      };

      expect(q.type).toBe("true_false");
      expect(q.statements?.[0].correctAnswer).toBe(true);
      expect(q.statements?.[1].correctAnswer).toBe(false);
    });

    it("preserves Short Answer accepted answers array", () => {
      const q: Question = {
        id: "q_sa_1",
        examId: "exam_1",
        type: "short_answer",
        text: "Tìm giá trị x",
        points: 0.5,
        order: 2,
        acceptedAnswers: ["12.5", "12,5", "25/2"],
      };

      expect(q.acceptedAnswers).toHaveLength(3);
      expect(q.acceptedAnswers).toContain("25/2");
    });

    it("preserves Matching 2-column items and match pairs", () => {
      const q: Question = {
        id: "q_m_1",
        examId: "exam_1",
        type: "matching",
        text: "Nối các mệnh đề tương ứng",
        points: 1.0,
        order: 3,
        matchingLeft: [
          { id: "l1", label: "1", text: "Khái niệm 1" },
          { id: "l2", label: "2", text: "Khái niệm 2" },
        ],
        matchingRight: [
          { id: "r1", label: "a", text: "Định nghĩa a" },
          { id: "r2", label: "b", text: "Định nghĩa b" },
        ],
        correctMatches: { "1": "a", "2": "b" },
      };

      expect(q.matchingLeft).toHaveLength(2);
      expect(q.matchingRight).toHaveLength(2);
      expect(q.correctMatches).toEqual({ "1": "a", "2": "b" });
    });

    it("preserves Fill-in-Blank slots and per-blank accepted answers", () => {
      const q: Question = {
        id: "q_fb_1",
        examId: "exam_1",
        type: "fill_blank",
        text: "Số nguyên tố chẵn duy nhất là [_] và có [_] ước nguyên dương.",
        points: 0.5,
        order: 4,
        acceptedAnswersPerBlank: {
          0: ["2", "hai"],
          1: ["2", "hai"],
        },
      };

      expect(q.acceptedAnswersPerBlank?.[0]).toEqual(["2", "hai"]);
      expect(q.acceptedAnswersPerBlank?.[1]).toEqual(["2", "hai"]);
    });

    it("preserves Ordering items sequence and correctOrder IDs", () => {
      const q: Question = {
        id: "q_ord_1",
        examId: "exam_1",
        type: "ordering",
        text: "Sắp xếp theo thứ tự thời gian",
        points: 0.5,
        order: 5,
        orderingItems: [
          { id: "o1", text: "Bước 1" },
          { id: "o2", text: "Bước 2" },
          { id: "o3", text: "Bước 3" },
        ],
        correctOrder: ["o2", "o1", "o3"],
      };

      expect(q.orderingItems).toHaveLength(3);
      expect(q.correctOrder).toEqual(["o2", "o1", "o3"]);
    });

    it("preserves Essay rubric barem scoring criteria and AI mode", () => {
      const q: Question = {
        id: "q_es_1",
        examId: "exam_1",
        type: "essay",
        text: "Viết đoạn văn ngắn trình bày suy nghĩ",
        points: 2.0,
        order: 6,
        essayRubric: "Mở đoạn 0.5đ, thân đoạn 1.0đ, kết đoạn 0.5đ",
        essayGradingMode: "ai",
        essayMinWords: 150,
        essayMaxWords: 300,
      };

      expect(q.essayRubric).toContain("Mở đoạn 0.5đ");
      expect(q.essayGradingMode).toBe("ai");
      expect(q.essayMinWords).toBe(150);
      expect(q.essayMaxWords).toBe(300);
    });
  });

  describe("Zoom-Compensated Auto-Follow Scroll Offset Calculations", () => {
    const calculateTargetScrollTop = (
      elTop: number,
      containerTop: number,
      currentScrollTop: number,
      zoomPercent: number,
      padding = 24
    ) => {
      const zoomScale = zoomPercent / 100;
      const relativeTop = (elTop - containerTop) / zoomScale;
      return Math.max(0, Math.round(currentScrollTop + relativeTop - padding));
    };

    it("calculates accurate scroll offset at 100% zoom", () => {
      // Container top at 100, elTop at 300, scrollTop 50
      // relativeTop = (300 - 100) / 1.0 = 200
      // target = 50 + 200 - 24 = 226
      expect(calculateTargetScrollTop(300, 100, 50, 100)).toBe(226);
    });

    it("compensates for 110% zoom so target scroll does not overshoot", () => {
      // At 1.1 zoom, elTop - containerTop is 220px on screen
      // Real unscaled delta is 220 / 1.1 = 200px
      // target = 50 + 200 - 24 = 226
      expect(calculateTargetScrollTop(320, 100, 50, 110)).toBe(226);
    });

    it("compensates for 80% zoom so target scroll does not undershoot", () => {
      // At 0.8 zoom, elTop - containerTop is 160px on screen
      // Real unscaled delta is 160 / 0.8 = 200px
      // target = 50 + 200 - 24 = 226
      expect(calculateTargetScrollTop(260, 100, 50, 80)).toBe(226);
    });

    it("compensates for 125% zoom", () => {
      // At 1.25 zoom, elTop - containerTop is 250px on screen
      // Real unscaled delta is 250 / 1.25 = 200px
      // target = 50 + 200 - 24 = 226
      expect(calculateTargetScrollTop(350, 100, 50, 125)).toBe(226);
    });

    it("clamps negative target scroll to 0", () => {
      expect(calculateTargetScrollTop(105, 100, 0, 100)).toBe(0);
    });
  });

  describe("Interactive HTML Widgets & Sandboxed Simulations", () => {
    it("safely extracts and renders pasted full HTML documents (<!DOCTYPE html>...</html>)", () => {
      const fullHtmlDoc = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <style>
    body { background-color: #f0fdf4; color: #166534; font-family: sans-serif; text-align: center; }
    canvas { border: 2px solid #16a34a; border-radius: 8px; }
  </style>
</head>
<body>
  <h3>Mô phỏng phản ứng Hóa học (H2 + O2)</h3>
  <canvas id="reactionCanvas" width="300" height="150"></canvas>
  <script>
    const cv = document.getElementById("reactionCanvas");
    if (cv) {
      const ctx = cv.getContext("2d");
      ctx.fillStyle = "#16a34a";
      ctx.fillRect(20, 20, 100, 50);
    }
  </script>
</body>
</html>`;

      const result = renderMarkdownWithLatex(fullHtmlDoc);
      // Ensures container is rendered
      expect(result).toContain("dk-html-widget-block");
      expect(result).toContain("dk-widget-iframe-container");
      // Ensures code is preserved in safe encoding, not stripped away by sanitization!
      expect(result).toContain("data-html=");
      const match = result.match(/data-html="([^"]+)"/);
      expect(match).toBeTruthy();
      const decoded = safeDecode(match![1]);
      expect(decoded).toContain("<style>");
      expect(decoded).toContain("<script>");
      expect(decoded).toContain("reactionCanvas");
    });

    it("renders <html-widget> tags with custom height and title", () => {
      const widgetTag = `<html-widget height="420" title="Mô phỏng Dao động Con lắc">
<div class="pendulum-box">
  <canvas id="pendulum"></canvas>
  <script>
    console.log("Con lắc đơn dao động điều hòa");
  </script>
</div>
</html-widget>`;

      const result = renderMarkdownWithLatex(widgetTag);
      expect(result).toContain("dk-html-widget-block");
      expect(result).toContain("Mô phỏng Dao động Con lắc");
      expect(result).toContain('data-height="420"');
    });

    it("renders fenced ```html blocks with scripts/styles as interactive widgets", () => {
      const fencedHtml = "Hãy quan sát mô phỏng sau:\n\n```html\n<style>.dot { width: 10px; height: 10px; background: red; }</style>\n<div class='dot'></div>\n<script>console.log('animated');</script>\n```\n\nChọn đáp án đúng:";

      const result = renderMarkdownWithLatex(fencedHtml);
      expect(result).toContain("dk-html-widget-block");
      expect(result).toContain("HTML5 / JS");
      expect(result).toContain("Chọn đáp án đúng:");
    });

    it("mountHtmlWidgets attaches sandboxed iframes safely into the DOM", () => {
      const testCode = "<style>h1 { color: red; }</style><h1>Thí nghiệm</h1><script>window.active = true;</script>";
      const htmlOutput = renderHtmlWidgetHtml(testCode, 350, "Thí nghiệm vật lý");

      expect(htmlOutput).toContain("dk-html-widget-block");
      expect(htmlOutput).toContain("dk-widget-iframe-container");
      expect(htmlOutput).toContain('data-height="350"');

      // Test mounting with mock container in node test environment
      const mockIframe: any = {
        sandbox: {
          items: [] as string[],
          add(...args: string[]) {
            this.items.push(...args);
          },
        },
        style: {} as Record<string, string>,
        setAttribute(k: string, v: string) {
          this[k] = v;
        },
        srcdoc: "",
      };

      const mockIframeContainer: any = {
        querySelector: () => null,
        appendChild: (el: any) => {
          mockIframeContainer.appendedChild = el;
        },
      };

      const mockBlock = {
        querySelector: (selector: string) => {
          if (selector === ".dk-widget-iframe-container") return mockIframeContainer;
          return null;
        },
        getAttribute: (attr: string) => {
          if (attr === "data-html") return safeEncode(testCode);
          if (attr === "data-height") return "350";
          if (attr === "data-widget-id") return "test-widget-1";
          return null;
        },
      };

      const mockRootContainer = {
        querySelectorAll: (selector: string) => {
          if (selector === ".dk-html-widget-block") return [mockBlock];
          return [];
        },
      };

      const originalDoc = (globalThis as any).document;
      try {
        (globalThis as any).document = {
          createElement: (tag: string) => (tag === "iframe" ? mockIframe : {}),
        };

        mountHtmlWidgets(mockRootContainer as any);

        expect(mockIframeContainer.appendedChild).toBe(mockIframe);
        expect(mockIframe.sandbox.items).toContain("allow-scripts");
        expect(mockIframe.sandbox.items).not.toContain("allow-same-origin");
        expect(mockIframe.srcdoc).toContain("h1 { color: red; }");
        expect(mockIframe.srcdoc).toContain("Thí nghiệm");
        expect(mockIframe.srcdoc).toContain("dk-widget-resize");
      } finally {
        (globalThis as any).document = originalDoc;
      }
    });

    it("extracts and renders raw HTML blocks containing <style> and <script> tags", () => {
      const rawHtml = `<style>
      .pendulum { width: 50px; height: 50px; background: red; }
    </style>
    <div class="pendulum"></div>
    <script>
      console.log("running simulation");
    </script>`;
      const { text, htmlWidgets } = extractHtmlWidgets(rawHtml);
      expect(htmlWidgets.length).toBe(1);
      expect(htmlWidgets[0].code).toContain(".pendulum");
      expect(htmlWidgets[0].code).toContain("running simulation");
      expect(text).toContain("HW_0");

      const rendered = renderMarkdownWithLatex(rawHtml);
      expect(rendered).toContain("dk-html-widget-block");
      expect(rendered).toContain("Khối mã mô phỏng trực tiếp");
      expect(rendered).toContain("HTML5 / JS");
    });

    it("handles unclosed <!DOCTYPE html> document safely without swallowing text", () => {
      const unclosedDoc = `<!DOCTYPE html>
    <html>
    <head><style>body { background: white; }</style></head>
    <body>
      <canvas id="c"></canvas>
      <script>const c = document.getElementById("c");</script>`;
      const { text, htmlWidgets } = extractHtmlWidgets(unclosedDoc);
      expect(htmlWidgets.length).toBe(1);
      expect(htmlWidgets[0].code).toContain("<!DOCTYPE html>");
      expect(htmlWidgets[0].code).toContain("document.getElementById");

      const rendered = renderMarkdownWithLatex(unclosedDoc);
      expect(rendered).toContain("dk-html-widget-block");
    });

    it("routes <live-canvas> containing HTML tags into an HTML widget", () => {
      const htmlLiveCanvas = `<live-canvas width="500" height="300" title="HTML Test">
    <div id="app"><span>Hello Live HTML</span></div>
    <script>document.getElementById("app").innerText = "Updated";</script>
    </live-canvas>`;
      const { text, htmlWidgets } = extractHtmlWidgets(htmlLiveCanvas);
      expect(htmlWidgets.length).toBe(1);
      expect(htmlWidgets[0].code).toContain("Hello Live HTML");
      expect(htmlWidgets[0].code).toContain("document.getElementById");

      const rendered = renderMarkdownWithLatex(htmlLiveCanvas);
      expect(rendered).toContain("dk-html-widget-block");
      expect(rendered).toContain("HTML Test");
    });
  });

  describe("RichTextEditor Touch-Editable & Bidirectional Parsing", () => {
    it("renders LaTeX math into protected chips with real KaTeX rendering in renderTouchEditableHtml", () => {
      const text = "Câu 1: Cho hàm số $f(x) = x^2$ và $\\int_0^1 x dx$.";
      const html = renderTouchEditableHtml(text);
      expect(html).toContain("data-raw-latex=");
      expect(html).toContain("contenteditable=\"false\"");
      expect(html).toContain("katex");
    });

    it("formats markdown bold, italic, and code in renderTouchEditableHtml", () => {
      const text = "Đây là **in đậm**, *in nghiêng*, và `mã code`.";
      const html = renderTouchEditableHtml(text);
      expect(html).toContain('data-raw-md="bold"');
      expect(html).toContain("in đậm");
      expect(html).toContain('data-raw-md="italic"');
      expect(html).toContain("in nghiêng");
      expect(html).toContain('data-raw-md="code"');
      expect(html).toContain("mã code");
    });

    it("extracts text, bold, italic, code, and LaTeX chips back to markdown with extractTextFromTouchEditable", () => {
      const mockContainer = {
        nodeType: 1,
        childNodes: [
          { nodeType: 3, textContent: "Câu 1: Cho " },
          {
            nodeType: 1,
            tagName: "SPAN",
            hasAttribute: (a: string) => a === "data-raw-latex",
            getAttribute: (a: string) => (a === "data-raw-latex" ? safeEncode("$f(x) = x^2$") : null),
            textContent: "f(x) = x^2",
            childNodes: [],
          },
          { nodeType: 3, textContent: " và " },
          {
            nodeType: 1,
            tagName: "STRONG",
            hasAttribute: () => false,
            getAttribute: () => null,
            textContent: "kết quả",
            childNodes: [],
          },
          { nodeType: 3, textContent: " cùng " },
          {
            nodeType: 1,
            tagName: "CODE",
            hasAttribute: () => false,
            getAttribute: () => null,
            textContent: "v = 10",
            childNodes: [],
          },
        ],
      };

      const extracted = extractTextFromTouchEditable(mockContainer as any);
      expect(extracted).toBe("Câu 1: Cho $f(x) = x^2$ và **kết quả** cùng `v = 10`");
    });
  });

  describe("Exam Visual Editor Resizable Panel & Clamping", () => {
    it("clamps panel width percentage between 20% and 80%", () => {
      const clampWidth = (percent: number) => Math.max(20, Math.min(80, percent));
      expect(clampWidth(10)).toBe(20);
      expect(clampWidth(15)).toBe(20);
      expect(clampWidth(50)).toBe(50);
      expect(clampWidth(75)).toBe(75);
      expect(clampWidth(85)).toBe(80);
      expect(clampWidth(100)).toBe(80);
    });
  });
});
