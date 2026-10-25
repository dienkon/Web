import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseBBTContent, renderBBTToHtml, getBBTPreset } from "../src/features/math-draw/bbtRenderer";
import {
  compileMathExpression,
  parseGraphContent,
  renderGraphToSvg,
  getGraphPreset,
} from "../src/features/math-draw/graphRenderer";
import {
  createLiveCanvasHelpers,
  executeLiveCanvasCode,
  LIVE_CANVAS_TEMPLATES,
} from "../src/features/math-draw/liveCanvasRunner";
import { handleClipboardImagePaste } from "../src/utils/clipboardImageUpload";
import { renderMarkdownWithLatex } from "../src/features/exam-builder/editor/LatexPreview";
import { formatTextForWord } from "../src/services/wordExportService";

describe("Bảng Biến Thiên (BBT) Renderer", () => {
  it("parses DSL format with points and intervals", () => {
    const dsl = `title: Bảng biến thiên hàm bậc 3\nx: -oo | -1 | 1 | +oo\ny': | + | 0 | - | 0 | + |\ny: -oo / 2 \\ -2 / +oo`;
    const config = parseBBTContent(dsl);

    expect(config.title).toBe("Bảng biến thiên hàm bậc 3");
    expect(config.points.length).toBe(4);
    expect(config.points[0].x).toBe("-\\infty");
    expect(config.points[1].x).toBe("-1");
    expect(config.points[2].x).toBe("1");
    expect(config.points[3].x).toBe("+\\infty");
    expect(config.intervals.length).toBe(3);
    expect(config.intervals[0].sign).toBe("+");
    expect(config.intervals[1].sign).toBe("-");
    expect(config.intervals[2].sign).toBe("+");
  });

  it("parses vertical asymptote with double bars (||)", () => {
    const dsl = `title: Hàm nhất biến\nx: -oo | 1 | +oo\ny': | - || - |\ny: 2 \\ -oo || +oo \\ 2`;
    const config = parseBBTContent(dsl);

    expect(config.points[1].x).toBe("1");
    expect(config.points[1].isDoubleBar).toBe(true);
  });

  it("renders valid HTML with SVG arrows and KaTeX markup", () => {
    const dsl = `x: -oo | -1 | 1 | +oo\ny': + | 0 | - | 0 | +\ny: -oo -> 3 -> -1 -> +oo`;
    const html = renderBBTToHtml(dsl);

    expect(html).toContain("dk-bbt-container");
    expect(html).toContain("<svg");
    expect(html).toContain("arrow-up");
    expect(html).toContain("arrow-down");
    expect(html).toContain("<table");
  });

  it("renders pure sign table without row 3 when no y row is present", () => {
    const preset = getBBTPreset("xet_dau");
    const html = renderBBTToHtml(preset);

    expect(html).toContain("Bảng xét dấu f'(x)");
    expect(html).toContain("f'(x)");
    // Should NOT contain the 3rd row SVG variation arrows
    expect(html).not.toContain("arrow-up");
    expect(html).not.toContain("arrow-down");
  });
});

describe("Function Graph Renderer", () => {
  it("compiles standard and edge case mathematical expressions correctly", () => {
    const fn1 = compileMathExpression("x^3 - 3*x + 1");
    expect(fn1(0)).toBe(1);
    expect(fn1(1)).toBe(-1);
    expect(fn1(-1)).toBe(3);

    // Negative leading coefficient with exponentiation (critical ES2016+ unary minus test)
    const fnNeg = compileMathExpression("-x^2 + 2*x + 3");
    expect(fnNeg(0)).toBe(3);
    expect(fnNeg(1)).toBe(4);
    expect(fnNeg(3)).toBe(0);

    const fnNegCubic = compileMathExpression("-x^3 + 3*x");
    expect(fnNegCubic(2)).toBe(-2);

    // Unicode superscripts: x² - 3x + 2
    const fnSup = compileMathExpression("x² - 3x + 2");
    expect(fnSup(2)).toBe(0);
    expect(fnSup(3)).toBe(2);

    // Implicit multiplication: x(x-1) and -(x-1)^2
    const fnParen = compileMathExpression("x(x-1)");
    expect(fnParen(3)).toBe(6);

    const fnNegParen = compileMathExpression("-(x-1)^2");
    expect(fnNegParen(3)).toBe(-4);

    const fn2 = compileMathExpression("2*x + 5");
    expect(fn2(3)).toBe(11);

    const fn3 = compileMathExpression("(2*x + 1)/(x - 1)");
    expect(fn3(2)).toBe(5);
    expect(fn3(0)).toBe(-1);
  });

  it("renders parabola preset with negative quadratic formula correctly", () => {
    const parabolConfig = getGraphPreset("parabol");
    const svg = renderGraphToSvg(parabolConfig);
    expect(svg).toContain("Parabol bậc hai");
    expect(svg).toContain("<path");
    // Verify path does not contain NaN
    expect(svg).not.toContain("NaN");
  });

  it("parses graph DSL and config", () => {
    const dsl = `title: Parabol\nfn: x^2 - 4\nrange: -4, 4\npoint: 0, -4, Đỉnh I(0; -4)`;
    const config = parseGraphContent(dsl);

    expect(config.title).toBe("Parabol");
    expect(config.functions[0].fn).toBe("x^2 - 4");
    expect(config.xRange).toEqual([-4, 4]);
    expect(config.points?.length).toBe(1);
    expect(config.points?.[0].x).toBe(0);
    expect(config.points?.[0].y).toBe(-4);
  });

  it("renders SVG with grid, axes, curves and points", () => {
    const config = getGraphPreset("bac3");
    const svg = renderGraphToSvg(config);

    expect(svg).toContain("dk-graph-container");
    expect(svg).toContain("<svg");
    expect(svg).toContain("<path");
    expect(svg).toContain("grid-lines");
    expect(svg).toContain("axes");
    expect(svg).toContain("CĐ(-1; 3)");
  });

  it("handles rational function discontinuities safely", () => {
    const config = getGraphPreset("phanthuc_1_1");
    const svg = renderGraphToSvg(config);

    expect(svg).toContain("TCĐ: x = 1");
    expect(svg).toContain("TCN: y = 2");
    expect(svg).not.toContain("NaN");
  });
});

describe("Live Canvas Code Runner Engine", () => {
  it("provides drawing helpers and executes clean canvas code", () => {
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      rect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      setLineDash: vi.fn(),
      closePath: vi.fn(),
      scale: vi.fn(),
      resetTransform: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    const mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockCtx),
      style: {},
      width: 0,
      height: 0,
    } as unknown as HTMLCanvasElement;

    const code = `
      drawAxes({ xRange: [-3, 3], yRange: [-3, 3] });
      plot("x^2", { color: "#2563eb" });
      drawPoint(0, 0, "O(0; 0)");
      drawArrow(0, 0, 2, 2);
    `;

    const result = executeLiveCanvasCode(mockCanvas, code, 400, 300);
    expect(result.success).toBe(true);
    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();
  });

  it("catches runtime errors gracefully without throwing", () => {
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      fillRect: vi.fn(),
      resetTransform: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    const mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockCtx),
      style: {},
      width: 0,
      height: 0,
    } as unknown as HTMLCanvasElement;

    const brokenCode = `nonExistentVariable.doSomething();`;
    const result = executeLiveCanvasCode(mockCanvas, brokenCode, 400, 300);

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("drawBBT helper executes and draws full variation table with points and signs", () => {
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      scale: vi.fn(),
      resetTransform: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    const mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockCtx),
      style: {},
      width: 0,
      height: 0,
    } as unknown as HTMLCanvasElement;

    const bbtCode = `
      drawBBT("x: -oo | -1 | 1 | +oo\\ny': + | 0 | - | 0 | +\\ny: -oo / 2 \\\\ -2 / +oo");
      plot("-x^2 + 2*x", { color: "#dc2626" });
    `;

    const result = executeLiveCanvasCode(mockCanvas, bbtCode, 500, 340);
    expect(result.success).toBe(true);
    expect(mockCtx.strokeRect).toHaveBeenCalled();
    expect(mockCtx.fillText).toHaveBeenCalled();
  });

  it("safely protects against infinite loops without hanging", () => {
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      fillRect: vi.fn(),
      resetTransform: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    const mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockCtx),
      style: {},
      width: 0,
      height: 0,
    } as unknown as HTMLCanvasElement;

    const infiniteLoopCode = `while (true) {}`;
    const result = executeLiveCanvasCode(mockCanvas, infiniteLoopCode, 400, 300);

    expect(result.success).toBe(false);
    expect(result.error).toContain("giới hạn an toàn");
  });

  it("executes free-form chemistry snippet (triglyceride) with custom functions, IIFE, and auto-adapts wide canvas width", () => {
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      fillRect: vi.fn(),
      resetTransform: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 30 }),
    } as unknown as CanvasRenderingContext2D;

    const mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockCtx),
      style: {} as any,
      width: 0,
      height: 0,
    } as unknown as HTMLCanvasElement;

    const triglycerideCode = `
      // Draw triglyceride structure using Canvas 2D
      (function () {
          ctx.save();
          ctx.strokeStyle = "#111827";
          ctx.fillStyle = "#111827";
          ctx.lineWidth = 2;
          ctx.font = "20px Arial";

          function bond(x1, y1, x2, y2) {
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
          }

          function doubleBond(x1, y1, x2, y2) {
              var dx = x2 - x1;
              var dy = y2 - y1;
              var len = Math.sqrt(dx * dx + dy * dy);
              var nx = -dy / len * 4;
              var ny = dx / len * 4;
              bond(x1 + nx, y1 + ny, x2 + nx, y2 + ny);
              bond(x1 - nx, y1 - ny, x2 - nx, y2 - ny);
          }

          function text(str, x, y) {
              ctx.fillText(str, x, y);
          }

          function chain(points, doubles) {
              for (var i = 0; i < points.length - 1; i++) {
                  var a = points[i];
                  var b = points[i + 1];
                  if (doubles.indexOf(i) !== -1) {
                      doubleBond(a[0], a[1], b[0], b[1]);
                  } else {
                      bond(a[0], a[1], b[0], b[1]);
                  }
              }
          }

          // Glycerol backbone
          text("H2C", 20, 95);
          text("HC", 30, 185);
          text("H2C", 20, 275);

          bond(70, 100, 70, 165);
          bond(70, 190, 70, 255);
          bond(70, 88, 115, 88);
          bond(70, 178, 115, 178);
          bond(70, 268, 115, 268);

          text("O", 120, 95);
          text("O", 120, 185);
          text("O", 120, 275);

          // Ester carbonyls
          bond(145, 88, 180, 88);
          doubleBond(180, 88, 180, 48);
          text("O", 173, 35);

          bond(145, 178, 180, 178);
          doubleBond(180, 178, 180, 138);
          text("O", 173, 125);

          bond(145, 268, 180, 268);
          doubleBond(180, 268, 180, 228);
          text("O", 173, 215);

          // First fatty acid chain up to x=775
          chain([
              [180, 88], [215, 108], [250, 88], [285, 108],
              [320, 88], [355, 108], [390, 88], [425, 108],
              [460, 88], [495, 108], [530, 88], [565, 108],
              [600, 88], [635, 108], [670, 88], [705, 108],
              [740, 88], [775, 108]
          ], []);

          ctx.restore();
      })();
    `;

    // Initial size is 500x340
    const result = executeLiveCanvasCode(mockCanvas, triglycerideCode, 500, 340);

    expect(result.success).toBe(true);
    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.moveTo).toHaveBeenCalled();
    expect(mockCtx.lineTo).toHaveBeenCalled();
    expect(mockCtx.fillText).toHaveBeenCalledWith("H2C", 20, 95);
    // Width should auto-adapt to accommodate x=775 without clipping
    expect(result.effectiveWidth).toBeGreaterThanOrEqual(790);
    expect(mockCanvas.width).toBeGreaterThanOrEqual(790);
    expect(mockCanvas.style.maxWidth).toBe("100%");
  });

  it("snug-fits compact drawings (like BBT table) to eliminate bottom empty whitespace", () => {
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      resetTransform: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 30 }),
    } as unknown as CanvasRenderingContext2D;

    const mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockCtx),
      style: {} as any,
      width: 0,
      height: 0,
    } as unknown as HTMLCanvasElement;

    // A variation table where content ends around y=175
    const bbtTableCode = `
      drawBBT();
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("-∞", 120, 38);
      ctx.fillText("3", 200, 100);
      drawArrow(120, 160, 195, 110);
      ctx.fillText("-1", 320, 175);
    `;

    // Given initial oversized height = 340
    const result = executeLiveCanvasCode(mockCanvas, bbtTableCode, 500, 340);

    expect(result.success).toBe(true);
    // Effective height must be snug-fit around ~190-215px, NOT kept at 340px!
    expect(result.effectiveHeight).toBeLessThan(230);
    expect(result.effectiveHeight).toBeGreaterThanOrEqual(140);
    expect(mockCanvas.height).toBeLessThan(230);
  });

  it("allows shadowing standard canvas variables (const ctx, const canvas) without syntax collision", () => {
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      fillRect: vi.fn(),
      resetTransform: vi.fn(),
      beginPath: vi.fn(),
      stroke: vi.fn(),
      strokeRect: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    const mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockCtx),
      style: {} as any,
      width: 0,
      height: 0,
    } as unknown as HTMLCanvasElement;

    const snippetWithConstDeclarations = `
      const ctx = canvas.getContext("2d");
      const width = 400;
      const height = 200;
      ctx.strokeRect(10, 10, 80, 80);
    `;

    const result = executeLiveCanvasCode(mockCanvas, snippetWithConstDeclarations, 500, 340);
    expect(result.success).toBe(true);
    expect(mockCtx.strokeRect).toHaveBeenCalledWith(10, 10, 80, 80);
  });

  it("exposes direct math global functions (sin, cos, sqrt, PI) without Math. prefix", () => {
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      fillRect: vi.fn(),
      resetTransform: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    const mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockCtx),
      style: {} as any,
      width: 0,
      height: 0,
    } as unknown as HTMLCanvasElement;

    const mathCode = `
      const r = sqrt(100);
      const angle = PI / 4;
      const x = cos(angle) * r;
      const y = sin(angle) * r;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(x, y);
      ctx.stroke();
    `;

    const result = executeLiveCanvasCode(mockCanvas, mathCode, 400, 300);
    expect(result.success).toBe(true);
    expect(mockCtx.lineTo).toHaveBeenCalled();
  });

  it("safely handles comments and strings containing for/while without corrupting syntax", () => {
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      fillRect: vi.fn(),
      resetTransform: vi.fn(),
      fillText: vi.fn(),
      beginPath: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    const mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockCtx),
      style: {} as any,
      width: 0,
      height: 0,
    } as unknown as HTMLCanvasElement;

    const codeWithCommentsAndStrings = `
      // Note: for (var i = 0; i < 5; i++) { sample }
      /* multi-line while (false) { ignored } */
      ctx.fillText("Công thức: for (i = 0; i < n; i++) { a[i] }", 20, 30);
      if (true) for (var k = 0; k < 2; k++) {
        ctx.lineTo(k * 10, k * 10);
      }
    `;

    const result = executeLiveCanvasCode(mockCanvas, codeWithCommentsAndStrings, 500, 340);
    expect(result.success).toBe(true);
    expect(mockCtx.fillText).toHaveBeenCalledWith(
      "Công thức: for (i = 0; i < n; i++) { a[i] }",
      20,
      30
    );
  });

  it("handles modern and math canvas 2D APIs (ellipse, roundRect) without bounds crash", () => {
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      fillRect: vi.fn(),
      resetTransform: vi.fn(),
      beginPath: vi.fn(),
      stroke: vi.fn(),
      ellipse: vi.fn(),
      roundRect: vi.fn(),
      isPointInPath: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    const mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockCtx),
      style: {} as any,
      width: 0,
      height: 0,
    } as unknown as HTMLCanvasElement;

    const codeWithModernApis = `
      ctx.beginPath();
      ctx.ellipse(200, 100, 80, 50, 0, 0, Math.PI * 2);
      ctx.roundRect(50, 50, 120, 60, [8]);
      ctx.isPointInPath(10, 10);
      ctx.createConicGradient?.(0, 0, 0);
      ctx.stroke();
    `;

    const result = executeLiveCanvasCode(mockCanvas, codeWithModernApis, 500, 340);
    expect(result.success).toBe(true);
  });

  it("executes custom functions at top level without requiring an IIFE wrapper", () => {
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      fillRect: vi.fn(),
      resetTransform: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    const mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockCtx),
      style: {} as any,
      width: 0,
      height: 0,
    } as unknown as HTMLCanvasElement;

    const codeWithTopLevelFunctions = `
      function drawSegment(x1, y1, x2, y2) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      function drawDouble(x, y) {
        drawSegment(x, y, x + 50, y);
        drawSegment(x, y + 6, x + 50, y + 6);
      }

      const dist = hypot(30, 40); // 50
      drawDouble(10, 20);
      ctx.fillText("Len: " + dist, 70, 25);
    `;

    const result = executeLiveCanvasCode(mockCanvas, codeWithTopLevelFunctions, 500, 340);
    expect(result.success).toBe(true);
    expect(mockCtx.moveTo).toHaveBeenCalledWith(10, 20);
    expect(mockCtx.fillText).toHaveBeenCalledWith("Len: 50", 70, 25);
  });
});

import * as cloudinaryService from "../src/services/cloudinary";

describe("Clipboard Image Paste to Cloudinary", () => {
  it("detects image items, triggers upload and updates content with markdown image", async () => {
    vi.spyOn(cloudinaryService, "uploadFileToCloudinary").mockResolvedValue(
      "https://res.cloudinary.com/demo/image/upload/sample.png"
    );
    vi.spyOn(cloudinaryService, "uploadImageToCloudinary").mockResolvedValue(
      "https://res.cloudinary.com/demo/image/upload/sample.png"
    );

    const mockFile = new File(["dummy content"], "screenshot.png", { type: "image/png" });
    const mockItem = {
      type: "image/png",
      getAsFile: () => mockFile,
    };

    const mockClipboardEvent = {
      clipboardData: {
        items: [mockItem],
      },
      preventDefault: vi.fn(),
    } as unknown as React.ClipboardEvent<HTMLTextAreaElement>;

    let currentVal = "Đề bài:";
    const onChange = vi.fn((newVal: string) => {
      currentVal = newVal;
    });

    const mockTextarea = {
      selectionStart: 7,
      selectionEnd: 7,
    } as HTMLTextAreaElement;

    const isHandled = await handleClipboardImagePaste(mockClipboardEvent, {
      value: currentVal,
      onChange,
      textareaRef: { current: mockTextarea },
    });

    expect(mockClipboardEvent.preventDefault).toHaveBeenCalled();
    expect(isHandled).toBe(true);
    expect(onChange).toHaveBeenCalled();
  });

  it("ignores non-image paste events", async () => {
    const mockTextItem = {
      type: "text/plain",
      getAsFile: () => null,
    };

    const mockClipboardEvent = {
      clipboardData: {
        items: [mockTextItem],
      },
      preventDefault: vi.fn(),
    } as unknown as React.ClipboardEvent<HTMLTextAreaElement>;

    const onChange = vi.fn();
    const isHandled = await handleClipboardImagePaste(mockClipboardEvent, {
      value: "Hello",
      onChange,
    });

    expect(isHandled).toBe(false);
    expect(mockClipboardEvent.preventDefault).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("preserves text typed while image is uploading asynchronously", async () => {
    let resolveUpload: (url: string) => void;
    const uploadPromise = new Promise<string>((resolve) => {
      resolveUpload = resolve;
    });
    vi.spyOn(cloudinaryService, "uploadImageToCloudinary").mockReturnValue(uploadPromise);

    const mockFile = new File(["dummy content"], "photo.png", { type: "image/png" });
    const mockItem = { type: "image/png", getAsFile: () => mockFile };
    const mockClipboardEvent = {
      clipboardData: { items: [mockItem] },
      preventDefault: vi.fn(),
    } as unknown as React.ClipboardEvent<HTMLTextAreaElement>;

    const mockTextarea = {
      value: "Ban đầu: ",
      selectionStart: 9,
      selectionEnd: 9,
      focus: vi.fn(),
    } as unknown as HTMLTextAreaElement;

    let currentValue = "Ban đầu: ";
    const onChange = vi.fn((newVal: string) => {
      currentValue = newVal;
      // In real browser, textarea.value is updated
      (mockTextarea as any).value = newVal;
    });

    const pastePromise = handleClipboardImagePaste(mockClipboardEvent, {
      value: currentValue,
      onChange,
      textareaRef: { current: mockTextarea },
    });

    // While upload is in flight, user types additional text into textarea
    (mockTextarea as any).value = currentValue + " (người dùng vừa gõ thêm)";

    // Resolve upload
    resolveUpload!("https://res.cloudinary.com/demo/image/upload/sample.png");
    await pastePromise;

    // Verify final text contains both the uploaded image and the newly typed text
    expect(currentValue).toContain("https://res.cloudinary.com/demo/image/upload/sample.png");
    expect(currentValue).toContain("(người dùng vừa gõ thêm)");
  });

  it("falls back to e.currentTarget/e.target when textareaRef is omitted", async () => {
    vi.spyOn(cloudinaryService, "uploadImageToCloudinary").mockResolvedValue(
      "https://res.cloudinary.com/demo/image/upload/test.png"
    );

    const mockFile = new File(["content"], "img.png", { type: "image/png" });
    const mockItem = { type: "image/png", getAsFile: () => mockFile };

    const mockTextarea = {
      value: "Nội dung câu",
      selectionStart: 12,
      selectionEnd: 12,
      focus: vi.fn(),
    } as unknown as HTMLTextAreaElement;

    const mockClipboardEvent = {
      clipboardData: { items: [mockItem] },
      preventDefault: vi.fn(),
      currentTarget: mockTextarea,
      target: mockTextarea,
    } as unknown as React.ClipboardEvent<HTMLTextAreaElement>;

    let textVal = "Nội dung câu";
    const onChange = vi.fn((val) => { textVal = val; (mockTextarea as any).value = val; });

    const isHandled = await handleClipboardImagePaste(mockClipboardEvent, {
      value: textVal,
      onChange,
    });

    expect(isHandled).toBe(true);
    expect(textVal).toContain("https://res.cloudinary.com/demo/image/upload/test.png");
  });
});

describe("Markdown & Custom Math Tags Integration in LatexPreview", () => {
  it("renders <graph> tag into SVG markup", () => {
    const text = `Cho đồ thị hàm số:\n<graph>\nfn: x^3 - 3*x\nrange: -3, 3\n</graph>\nHàm số đồng biến trên khoảng nào?`;
    const html = renderMarkdownWithLatex(text);

    expect(html).toContain("dk-graph-container");
    expect(html).toContain("<svg");
    expect(html).toContain("Hàm số đồng biến trên khoảng nào?");
  });

  it("renders <bbt> tag into standard Vietnamese variation table", () => {
    const text = `Cho bảng biến thiên:\n<bbt>\nx: -oo | -1 | 1 | +oo\ny': + | 0 | - | 0 | +\ny: -oo -> 3 -> -1 -> +oo\n</bbt>\nTìm điểm cực đại.`;
    const html = renderMarkdownWithLatex(text);

    expect(html).toContain("dk-bbt-container");
    expect(html).toContain("arrow-up");
    expect(html).toContain("Tìm điểm cực đại.");
  });

  it("renders <live-canvas> tag into interactive executable canvas block", () => {
    const text = `Khối hình vẽ code trực tiếp:\n<live-canvas width="500" height="300" title="Đồ thị hàm số">\nplot("x^2");\n</live-canvas>`;
    const html = renderMarkdownWithLatex(text);

    expect(html).toContain("dk-live-canvas-block");
    expect(html).toContain("dk-live-canvas");
    expect(html).toContain("data-code");
    expect(html).toContain("Đồ thị hàm số");
    expect(html).toContain("Xem code");
    expect(html).toContain("Chạy lại");
  });

  it("renders fenced ```graph and ```bbt code blocks", () => {
    const textGraph = "```graph\nfn: x^2 - 2\nrange: -3, 3\n```";
    const htmlGraph = renderMarkdownWithLatex(textGraph);
    expect(htmlGraph).toContain("dk-graph-container");

    const textBBT = "```bbt\nx: -oo | 0 | +oo\ny': + | 0 | +\ny: -oo -> 0 -> +oo\n```";
    const htmlBBT = renderMarkdownWithLatex(textBBT);
    expect(htmlBBT).toContain("dk-bbt-container");
  });

  it("converts <graph>, <bbt>, and <live-canvas> in Word export", () => {
    const wordInput = `Câu 1: Cho đồ thị\n<graph>\nfn: x^2\n</graph>\nVà bảng biến thiên:\n<bbt>\nx: -oo | 0 | +oo\ny': - | 0 | +\ny: +oo \\ 0 / +oo\n</bbt>`;
    const wordHtml = formatTextForWord(wordInput);

    expect(wordHtml).toContain("dk-graph-container");
    expect(wordHtml).toContain("dk-bbt-container");
  });
});

import MathGraphingStudio, {
  GEOGEBRA_APPS,
  GEOGEBRA_SHORTCUTS,
} from "../src/practice/components/MathGraphingStudio";

describe("Student Practice Math Graphing Studio & GeoGebra Tool Room", () => {
  it("exports a valid React component function for student tool room", () => {
    expect(typeof MathGraphingStudio).toBe("function");
  });

  it("provides comprehensive official GeoGebra embed apps for 2D, Classic, Geometry, and 3D", () => {
    expect(GEOGEBRA_APPS.length).toBeGreaterThanOrEqual(4);

    const appIds = GEOGEBRA_APPS.map((a) => a.id);
    expect(appIds).toContain("calculator");
    expect(appIds).toContain("classic");
    expect(appIds).toContain("geometry");
    expect(appIds).toContain("3d");

    GEOGEBRA_APPS.forEach((app) => {
      expect(app.name).toBeTruthy();
      expect(app.shortName).toBeTruthy();
      expect(app.embedUrl).toMatch(/^https:\/\/www\.geogebra\.org\/[a-z0-9]+\?embed$/);
      expect(app.directUrl).toMatch(/^https:\/\/www\.geogebra\.org\/[a-z0-9]+$/);
    });
  });

  it("provides high school curriculum shortcuts covering variation, asymptotes, derivatives, and Oxyz", () => {
    expect(GEOGEBRA_SHORTCUTS.length).toBeGreaterThanOrEqual(8);

    const commands = GEOGEBRA_SHORTCUTS.map((s) => s.command);
    // Extreme points
    expect(commands.some((c) => c.includes("Extremum"))).toBe(true);
    // Inflection points
    expect(commands.some((c) => c.includes("InflectionPoint"))).toBe(true);
    // Asymptotes
    expect(commands.some((c) => c.includes("Asymptote"))).toBe(true);
    // Derivatives
    expect(commands.some((c) => c.includes("Derivative"))).toBe(true);
    // Intersections
    expect(commands.some((c) => c.includes("Intersect"))).toBe(true);
    // Integrals
    expect(commands.some((c) => c.includes("Integral"))).toBe(true);
    // 3D Oxyz Sphere
    expect(commands.some((c) => c.includes("Sphere"))).toBe(true);
    // 3D Oxyz Line & Distance
    expect(commands.some((c) => c.includes("Line"))).toBe(true);
    expect(commands.some((c) => c.includes("Distance"))).toBe(true);

    GEOGEBRA_SHORTCUTS.forEach((sc) => {
      expect(sc.label).toBeTruthy();
      expect(sc.category).toBeTruthy();
      expect(sc.desc).toBeTruthy();
    });

    const categories = new Set(GEOGEBRA_SHORTCUTS.map((s) => s.category));
    expect(categories.has("Hàm số & Khảo sát")).toBe(true);
    expect(categories.has("Đạo hàm & Tiếp tuyến")).toBe(true);
    expect(categories.has("Tích phân")).toBe(true);
    expect(categories.has("Hình học Oxyz")).toBe(true);
  });

  it("filters GeoGebra shortcuts correctly by category", () => {
    const oxyzShortcuts = GEOGEBRA_SHORTCUTS.filter((s) => s.category === "Hình học Oxyz");
    expect(oxyzShortcuts.length).toBeGreaterThanOrEqual(3);
    expect(oxyzShortcuts.some((s) => s.command.includes("Sphere"))).toBe(true);
    expect(oxyzShortcuts.some((s) => s.command.includes("Plane"))).toBe(true);
    expect(oxyzShortcuts.some((s) => s.command.includes("Line"))).toBe(true);

    const surveyShortcuts = GEOGEBRA_SHORTCUTS.filter((s) => s.category === "Hàm số & Khảo sát");
    expect(surveyShortcuts.some((s) => s.command.includes("Extremum"))).toBe(true);
    expect(surveyShortcuts.some((s) => s.command.includes("InflectionPoint"))).toBe(true);
    expect(surveyShortcuts.some((s) => s.command.includes("Asymptote"))).toBe(true);
  });
});


