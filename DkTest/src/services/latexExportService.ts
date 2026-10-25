import katex from "katex";
import type { Exam, Question, Section } from "../types";
import { fixLatexFormatting } from "../utils/latexFormatter.js";
import {
  extractRawBlocks,
  renderRawBlockContent,
  safeEncode,
  safeDecode,
} from "../features/exam-builder/editor/LatexPreview";
import { renderGraphToSvg } from "../features/math-draw/graphRenderer";
import { renderBBTToHtml } from "../features/math-draw/bbtRenderer";
import { executeLiveCanvasCode, detectContentBounds } from "../features/math-draw/liveCanvasRunner";

export interface ExportExamOptions {
  includeAnswers: boolean;
  includeExplanation?: boolean;
  schoolName?: string;
  examCode?: string;
  subjectName?: string;
  gradeName?: string;
  // Page budget & Layout configuration
  maxPages?: number; // 0 or undefined = unlimited / auto; 1, 2, 3, 4, etc.
  autoFitPageBudget?: boolean; // automatically adjust layout & scale to fit maxPages (default: true)
  layoutMode?: "one-col" | "two-cols"; // 1 column or 2 columns
  fontSizePreset?: "compact" | "normal" | "large"; // 10.5pt, 12pt, 13.5pt
  spacingPreset?: "tight" | "normal" | "relaxed"; // 8mm, 12mm, 16mm margins
  diagramScalePreset?: "small" | "normal" | "large"; // 70%, 85%, 100%
  showPaperHeader?: boolean; // default: true
  showStudentInfo?: boolean; // default: true
}

export interface PageBudgetEstimate {
  estimatedPages: number;
  totalHeightPx: number;
  usableHeightPerPagePx: number;
  fitsWithinTarget: boolean;
  recommendedLayout: "one-col" | "two-cols";
  recommendedFontSize: "compact" | "normal" | "large";
  recommendedSpacing: "tight" | "normal" | "relaxed";
  recommendedDiagramScale: "small" | "normal" | "large";
}

// Vietnamese vowel & letter lookahead to prevent false word boundary matches
const VN_CHAR_LOOKAHEAD = "(?![a-zA-ZàáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ])";

const getCommonLatexRegex = () =>
  new RegExp(
    `(\\\\(?:vec|bar|hat|overline|underline)\\s*\\{[^{}]*\\}|\\\\(?:int|sum|prod|lim)(?:_\\{[^{}]*\\}|_[\\w\\d])?(?:\\^\\{[^{}]*\\}|\\^[\\w\\d])?|\\\\(?:alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|vartheta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega|pm|mp|times|div|cdot|cap|cup|subset|supset|subseteq|supseteq|in|notin|ni|forall|exists|nexists|le|ge|leq|geq|neq|approx|equiv|sim|cong|propto|infty|nabla|partial|degree|perp|parallel|angle|triangle|rightarrow|to|leftarrow|leftrightarrow|Rightarrow|Leftarrow|Leftrightarrow|sin|cos|tan|cot|arcsin|arccos|arctan|log|ln|lg|exp)${VN_CHAR_LOOKAHEAD})`,
    "g"
  );

/**
 * Safely renders LaTeX with KaTeX, removing internal newlines so subsequent
 * newline to <br/> replacement does not corrupt SVG path attributes or HTML layout.
 */
function safeKatexRender(math: string, displayMode: boolean): string {
  try {
    const rendered = katex.renderToString(math.trim(), {
      displayMode,
      throwOnError: false,
      strict: false,
    });
    return rendered.replace(/[\r\n]+/g, " ");
  } catch {
    return `<code>${math}</code>`;
  }
}

/**
 * Escapes LaTeX special characters in plain text, but preserves math expressions wrapped in $...$ or $$...$$.
 * Strips HTML-specific diagram tags for standard LaTeX source (.tex) output.
 */
export function escapeLatexText(text: string): string {
  if (!text) return "";

  // Strip custom HTML diagram tags and fenced diagram blocks when generating standard LaTeX source
  let sanitized = text
    .replace(/<graph\b[^>]*>[\s\S]*?<\/graph>/gi, "\n% [Đồ thị hàm số]\n")
    .replace(/<bbt\b[^>]*>[\s\S]*?<\/bbt>/gi, "\n% [Bảng biến thiên]\n")
    .replace(/<live-canvas\b[^>]*>[\s\S]*?<\/live-canvas>/gi, "\n% [Khối vẽ Canvas]\n")
    .replace(/<(?:html-widget|widget|live-html)\b[^>]*>[\s\S]*?<\/(?:html-widget|widget|live-html)>/gi, "\n% [Khối mô phỏng HTML5]\n")
    .replace(/(?:```|~~~)(?:graph|bbt|canvas|live-canvas|simulation|widget)[^\n]*\n[\s\S]*?(?:```|~~~)/gi, (m) => {
      const type = m.match(/(?:```|~~~)(\w+)/)?.[1] || "diagram";
      return `\n% [Khối ${type.toUpperCase()}]\n`;
    });

  sanitized = fixLatexFormatting(sanitized);

  const fracRegex = /((?:[a-zA-Z](?:\([a-zA-Z0-9]+\))?\s*=\s*)?\\(?:d|t)?frac\s*\{[^{}]*\}\s*\{[^{}]*\})/g;
  const sqrtRegex = /((?:[-+]?\s*(?:[0-9a-zA-Z]+|[a-zA-Z]\s*=\s*))?\\sqrt(?:\[[^\]]*\])?\{([^{}]*(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}[^{}]*)*)\})/g;
  const commonLatexRegex = getCommonLatexRegex();

  // Protect existing math mode blocks FIRST so we never double-wrap $...$
  const parts = sanitized.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\\[a-zA-Z]+\{[^}]*\}|\\begin\{(?:cases|aligned|matrix|pmatrix|bmatrix|array|equation\*?)\}[\s\S]*?\\end\{(?:cases|aligned|matrix|pmatrix|bmatrix|array|equation\*?)\})/g);

  return parts
    .map((part) => {
      if (!part) return "";
      if (
        (part.startsWith("$") && part.endsWith("$")) ||
        (part.startsWith("\\[") && part.endsWith("\\]")) ||
        (part.startsWith("\\(") && part.endsWith("\\)")) ||
        part.startsWith("\\begin{")
      ) {
        // Math content: preserve as is
        return part;
      }
      // Text content: only wrap un-delimited LaTeX commands in plain text
      let processedText = part;
      processedText = processedText.replace(fracRegex, (m) => `$${m}$`);
      processedText = processedText.replace(sqrtRegex, (m) => `$${m}$`);
      processedText = processedText.replace(commonLatexRegex, (cmd) => `$${cmd}$`);

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
 * Sanitizes and formats interactive HTML widgets for static print and PDF export.
 * Preserves CSS stylesheets, markup, SVGs, headings, and styled containers while safely stripping executable scripts.
 */
export function formatHtmlWidgetForPrint(rawContent: string): string {
  if (!rawContent || !rawContent.trim()) return "";

  // Extract all <style> tags so widget styles are not lost
  const styleBlocks = rawContent.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) || [];
  const styles = styleBlocks.join("\n");

  // Extract body content if it's a full HTML page
  let content = rawContent;
  const bodyMatch = content.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    content = bodyMatch[1];
  } else {
    content = content
      .replace(/<!DOCTYPE\s+html[^>]*>/gi, "")
      .replace(/<\/?(?:html|head)\b[^>]*>/gi, "")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  }

  // Strip script tags for print/PDF safety
  content = content.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");

  // Transform interactive buttons into clean printable badges
  content = content.replace(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi, (_, _attrs, text) => {
    return `<span style="display: inline-block; padding: 2px 8px; margin: 2px 4px; background: #e2e8f0; border: 1px solid #94a3b8; border-radius: 4px; font-weight: bold; font-size: 8.5pt; color: #1e293b;">[Nút: ${text.trim()}]</span>`;
  });

  // Transform range inputs into printable indicator
  content = content.replace(/<input\b[^>]*type=["']range["'][^>]*>/gi, () => {
    return `<span style="display: inline-block; padding: 2px 8px; margin: 2px 4px; background: #f1f5f9; border: 1px dashed #94a3b8; border-radius: 4px; font-size: 8pt; color: #475569;">[Thanh trượt tham số]</span>`;
  });

  const combined = styles ? `${styles}\n${content.trim()}` : content.trim();
  return combined.trim();
}

/**
 * Renders Live Canvas drawing blocks for print and PDF.
 * If in a browser environment with canvas support, renders high-res PNG image data directly.
 * Otherwise provides a structured container ready for DOM execution.
 */
function renderLiveCanvasForPrint(
  code: string,
  width = 500,
  height = 340,
  title?: string
): string {
  const cleanCode = code.trim();
  let dataUrl: string | null = null;
  let finalWidth = width;
  let finalHeight = height;

  // Measure content bounds to compute tight dimensions even if off-screen canvas rendering is unavailable
  const bounds = detectContentBounds(cleanCode, width, height);
  if (bounds && bounds.hasDrawn) {
    if (bounds.maxX > width - 15) {
      const leftMargin = Math.max(16, bounds.minX > 0 ? bounds.minX : 20);
      finalWidth = Math.ceil(bounds.maxX + leftMargin);
    }
    const topPad = Math.max(12, bounds.minY > 0 ? bounds.minY : 16);
    const bottomMargin = Math.max(12, Math.min(32, topPad));
    const contentNeededHeight = Math.ceil(bounds.maxY + bottomMargin);
    if (contentNeededHeight < height - 16) {
      finalHeight = Math.max(50, contentNeededHeight);
    } else if (bounds.maxY > height - 10) {
      finalHeight = Math.ceil(bounds.maxY + bottomMargin);
    }
  }

  if (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    typeof document.createElement === "function"
  ) {
    try {
      const offCanvas = document.createElement("canvas");
      const res = executeLiveCanvasCode(offCanvas, cleanCode, finalWidth, finalHeight);
      if (res.success) {
        if (res.effectiveWidth) finalWidth = res.effectiveWidth;
        if (res.effectiveHeight) finalHeight = res.effectiveHeight;
        if (typeof offCanvas.toDataURL === "function") {
          dataUrl = offCanvas.toDataURL("image/png");
        }
      }
    } catch {
      // Graceful fallback to DOM element for batch conversion
    }
  }

  const titleHeader = title
    ? `<div style="font-weight: bold; font-size: 10pt; color: #1e3a8a; margin-bottom: 4px; text-align: center;">📐 ${escapeLatexText(title)}</div>`
    : "";

  if (dataUrl) {
    return (
      `<div class="dk-print-diagram dk-print-live-canvas" style="margin: 8px auto; text-align: center; page-break-inside: avoid; break-inside: avoid; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px; background: #ffffff; width: fit-content; max-width: 100%; box-sizing: border-box;">` +
        titleHeader +
        `<img src="${dataUrl}" alt="${title || 'Live Canvas'}" class="dk-print-canvas-img" style="max-width: 100%; height: auto; max-height: var(--diagram-max-height, 280px); display: block; margin: 0 auto; border-radius: 4px;" />` +
      `</div>`
    );
  }

  return (
    `<div class="dk-print-diagram dk-print-live-canvas" style="margin: 8px auto; text-align: center; page-break-inside: avoid; break-inside: avoid; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px; background: #ffffff; width: fit-content; max-width: 100%; box-sizing: border-box;">` +
      titleHeader +
      `<canvas class="dk-live-canvas" data-code="${safeEncode(cleanCode)}" data-width="${finalWidth}" data-height="${finalHeight}" style="max-width: 100%; height: auto; border: 1px solid #e2e8f0; border-radius: 4px; background: #fff; display: block; margin: 0 auto;"></canvas>` +
    `</div>`
  );
}

/**
 * Converts inline and block LaTeX ($...$ and $$...$$) to HTML using KaTeX.
 * Also parses and cleanly formats:
 * - <graph> SVG mathematical function graphs
 * - <bbt> publication-grade variation tables
 * - <live-canvas> drawing canvas blocks (high-DPI PNG)
 * - <html-widget> interactive simulations
 * - Fenced code blocks (```python, ```c, etc.) with ink-efficient, border-accented styling
 */
export function renderLatexToHtml(
  text: string,
  renderOptions?: {
    isTwoColDocument?: boolean;
    diagramScale?: number;
  }
): string {
  if (!text) return "";

  // 0. Extract and protect RAW blocks FIRST using tokenizer state machine
  const { text: textWithoutRaw, rawBlocks } = extractRawBlocks(text);

  let sanitized = fixLatexFormatting(textWithoutRaw);

  const placeholders: string[] = [];
  const createPlaceholder = (content: string) => {
    const token = `\uE000PH_${placeholders.length}\uE001`;
    placeholders.push(content);
    return token;
  };

  // 0.1 Custom Math Visualization: <graph>...</graph>
  sanitized = sanitized.replace(/<graph\b([^>]*)>([\s\S]*?)<\/graph>/gi, (_, attrs, graphCode) => {
    try {
      const svg = renderGraphToSvg(graphCode);
      const titleMatch = attrs.match(/title=["']([^"']*)["']/i);
      const titleHeader = titleMatch
        ? `<div style="font-weight: bold; font-size: 10pt; color: #1e3a8a; margin-bottom: 4px; text-align: center;">📈 ${titleMatch[1]}</div>`
        : "";
      return createPlaceholder(
        `<div class="dk-print-diagram dk-print-graph" style="margin: 8px 0; text-align: center; page-break-inside: avoid; break-inside: avoid;">` +
          titleHeader +
          svg +
        `</div>`
      );
    } catch {
      return createPlaceholder(`<div style="color: #dc2626; font-size: 10pt; padding: 4px; text-align: center;">[Đồ thị hàm số]</div>`);
    }
  });

  // 0.2 Bảng biến thiên: <bbt>...</bbt>
  sanitized = sanitized.replace(/<bbt\b([^>]*)>([\s\S]*?)<\/bbt>/gi, (_, attrs, bbtCode) => {
    try {
      const bbtHtml = renderBBTToHtml(bbtCode);
      const titleMatch = attrs.match(/title=["']([^"']*)["']/i);
      const titleHeader = titleMatch
        ? `<div style="font-weight: bold; font-size: 10pt; color: #1e3a8a; margin-bottom: 4px; text-align: center;">📊 ${titleMatch[1]}</div>`
        : "";
      return createPlaceholder(
        `<div class="dk-print-diagram dk-print-bbt" style="margin: 8px 0; page-break-inside: avoid; break-inside: avoid; text-align: center;">` +
          titleHeader +
          bbtHtml +
        `</div>`
      );
    } catch {
      return createPlaceholder(`<div style="color: #dc2626; font-size: 10pt; padding: 4px; text-align: center;">[Bảng biến thiên]</div>`);
    }
  });

  // 0.3 Live Canvas: <live-canvas>...</live-canvas>
  sanitized = sanitized.replace(/<live-canvas\b([^>]*)>([\s\S]*?)<\/live-canvas>/gi, (_, attrs, code) => {
    const widthMatch = attrs.match(/width="?(\d+)"?/i);
    const heightMatch = attrs.match(/height="?(\d+)"?/i);
    const titleMatch = attrs.match(/title="([^"]*)"/i);
    const width = widthMatch ? parseInt(widthMatch[1], 10) : 500;
    const height = heightMatch ? parseInt(heightMatch[1], 10) : 340;
    const title = titleMatch ? titleMatch[1] : undefined;
    return createPlaceholder(renderLiveCanvasForPrint(code, width, height, title));
  });

  // 0.4 Interactive HTML Widget: <html-widget>, <widget>, <live-html>
  sanitized = sanitized.replace(/<(html-widget|widget|live-html)\b([^>]*)>([\s\S]*?)<\/\1>/gi, (_, tag, attrs, content) => {
    const titleMatch = attrs.match(/title=["']([^"']*)["']/i);
    const title = titleMatch ? titleMatch[1] : "Khối mô phỏng HTML5 / JavaScript";
    return createPlaceholder(
      `<div class="dk-print-diagram dk-print-html-widget" style="margin: 8px 0; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; background: #f8fafc; page-break-inside: avoid; break-inside: avoid;">` +
        `<div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">` +
          `<span style="font-weight: bold; font-size: 10pt; color: #1e3a8a;">🔬 ${title}</span>` +
          `<span style="font-size: 8pt; font-weight: bold; color: #64748b; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">MÔ PHỎNG TƯƠNG TÁC</span>` +
        `</div>` +
        `<div class="dk-widget-print-body" style="font-size: 9.5pt; color: #334155; line-height: 1.4; max-height: var(--diagram-max-height, 240px); overflow: hidden;">` +
          formatHtmlWidgetForPrint(content) +
        `</div>` +
      `</div>`
    );
  });

  // 1. Fenced code blocks ```lang ... ``` or ~~~lang ... ~~~
  sanitized = sanitized.replace(/(?:```|~~~)([\s\S]*?)(?:```|~~~)/g, (_, blockContent) => {
    let rawContent = blockContent;
    let lang = "";
    let blockTitle = "";
    const firstNewlineIdx = rawContent.indexOf("\n");
    if (firstNewlineIdx !== -1) {
      const firstLine = rawContent.slice(0, firstNewlineIdx).trim();
      const match = firstLine.match(/^([a-zA-Z0-9_#+.-]+)(?::\s*(.*))?$/);
      if (match) {
        lang = match[1].toUpperCase();
        blockTitle = match[2]?.trim() || "";
        rawContent = rawContent.slice(firstNewlineIdx + 1);
      }
    }
    const clean = rawContent.replace(/\r\n/g, "\n").trim();
    if (lang === "GRAPH") {
      try {
        const titleHeader = blockTitle
          ? `<div style="font-weight: bold; font-size: 10pt; color: #1e3a8a; margin-bottom: 4px; text-align: center;">📈 ${escapeLatexText(blockTitle)}</div>`
          : "";
        return createPlaceholder(
          `<div class="dk-print-diagram dk-print-graph" style="margin: 8px 0; text-align: center; page-break-inside: avoid; break-inside: avoid;">${titleHeader}${renderGraphToSvg(clean)}</div>`
        );
      } catch {
        return createPlaceholder("[Đồ thị]");
      }
    }
    if (lang === "BBT") {
      try {
        const titleHeader = blockTitle
          ? `<div style="font-weight: bold; font-size: 10pt; color: #1e3a8a; margin-bottom: 4px; text-align: center;">📊 ${escapeLatexText(blockTitle)}</div>`
          : "";
        return createPlaceholder(
          `<div class="dk-print-diagram dk-print-bbt" style="margin: 8px 0; text-align: center; page-break-inside: avoid; break-inside: avoid;">${titleHeader}${renderBBTToHtml(clean)}</div>`
        );
      } catch {
        return createPlaceholder("[Bảng biến thiên]");
      }
    }
    if (lang === "CANVAS" || lang === "LIVE-CANVAS" || lang === "LIVE-CODE") {
      return createPlaceholder(renderLiveCanvasForPrint(clean, 500, 340, blockTitle || undefined));
    }
    if ((lang === "HTML" || lang === "WIDGET" || lang === "SIMULATION") && /<script|<style|<!DOCTYPE|<canvas/i.test(clean)) {
      const title = blockTitle || "MÔ PHỎNG HTML5 TƯƠNG TÁC";
      return createPlaceholder(
        `<div class="dk-print-diagram dk-print-html-widget" style="margin: 8px 0; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; background: #f8fafc; page-break-inside: avoid; break-inside: avoid;">` +
          `<div style="font-size: 8.5pt; font-weight: bold; color: #1e3a8a; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px;">🔬 ${escapeLatexText(title)}</div>` +
          `<div class="dk-widget-print-body" style="font-size: 9.5pt; color: #334155; line-height: 1.4; max-height: var(--diagram-max-height, 240px); overflow: hidden;">${formatHtmlWidgetForPrint(clean)}</div>` +
        `</div>`
      );
    }

    const titleSpan = blockTitle
      ? `<span style="font-weight: normal; color: #64748b; font-size: 8.5pt;">${escapeLatexText(blockTitle)}</span>`
      : `<span style="font-weight: normal; color: #94a3b8; font-size: 8pt;">Mã nguồn</span>`;
    const langHeader = lang
      ? `<div style="font-size: 8.5pt; font-weight: bold; color: #475569; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px; display: flex; justify-content: space-between;"><span>${lang}</span>${titleSpan}</div>`
      : "";
    const escaped = clean
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return createPlaceholder(
      `<div class="dk-print-code-box" style="background: #f8fafc; color: #0f172a; font-family: Consolas, 'Courier New', monospace; font-size: 9.5pt; line-height: 1.35; padding: 6px 10px; border-radius: 4px; margin: 6px 0; border: 1px solid #cbd5e1; border-left: 3.5px solid #2563eb; white-space: pre-wrap; word-break: break-word; page-break-inside: avoid; break-inside: avoid;">${langHeader}<code>${escaped}</code></div>`
    );
  });

  // 1.1 Standalone raw HTML simulation blocks (<!DOCTYPE html>... or <html...>...)
  sanitized = sanitized.replace(/(<!DOCTYPE\s+html[\s\S]*?(?:<\/html>|$)|<html\b[\s\S]*?(?:<\/html>|$))/gi, (match) => {
    return createPlaceholder(
      `<div class="dk-print-diagram dk-print-html-widget" style="margin: 8px 0; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; background: #f8fafc; page-break-inside: avoid; break-inside: avoid;">` +
        `<div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">` +
          `<span style="font-weight: bold; font-size: 10pt; color: #1e3a8a;">🔬 Ứng dụng mô phỏng HTML5</span>` +
          `<span style="font-size: 8pt; font-weight: bold; color: #64748b; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">MÔ PHỎNG TƯƠNG TÁC</span>` +
        `</div>` +
        `<div class="dk-widget-print-body" style="font-size: 9.5pt; color: #334155; line-height: 1.4; max-height: var(--diagram-max-height, 240px); overflow: hidden;">` +
          formatHtmlWidgetForPrint(match) +
        `</div>` +
      `</div>`
    );
  });

  // Convert inline code `code`
  sanitized = sanitized.replace(
    /`([^`\n]+)`/g,
    '<code style="background-color: #f1f5f9; color: #db2777; padding: 2px 5px; border-radius: 4px; font-family: Consolas, monospace; font-size: 11px; border: 1px solid #e2e8f0;">$1</code>'
  );

  // Convert markdown image syntax ![alt](url) to styled print image
  sanitized = sanitized.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+|data:image\/[^\s)]+)\)/gi, (_, alt, src) => {
    return createPlaceholder(
      `<div style="text-align: center; margin: 8px 0; page-break-inside: avoid; break-inside: avoid;"><img src="${src}" alt="${alt || 'Hình ảnh'}" style="max-width: 100%; max-height: var(--diagram-max-height, 260px); object-fit: contain; display: inline-block; border-radius: 4px;" crossorigin="anonymous" /></div>`
    );
  });

  // Convert markdown bold **...** and italic *...*
  sanitized = sanitized.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  sanitized = sanitized.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  // Format fill-in-the-blank placeholders [_] or [blank]
  sanitized = sanitized.replace(
    /\[_\]|\[blank\]/gi,
    `<span style="display: inline-block; min-width: 70px; border-bottom: 1.5px solid #334155; margin: 0 4px; vertical-align: bottom;">&nbsp;</span>`
  );

  // Convert display math \[ ... \] to $$ ... $$ and inline math \( ... \) to $ ... $
  sanitized = sanitized.replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `$$${m}$$`);
  sanitized = sanitized.replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$${m}$`);

  // Auto-wrap unwrapped \begin{cases}...\end{cases}, \begin{aligned}, etc. in $$...$$
  sanitized = sanitized.replace(
    /(?<!\$)(?:\\begin\{(?:cases|aligned|matrix|pmatrix|bmatrix|array|equation\*?)\}[\s\S]*?\\end\{(?:cases|aligned|matrix|pmatrix|bmatrix|array|equation\*?)\})(?!\$)/g,
    (m) => `$$${m}$$`
  );

  // Auto-wrap common unwrapped math commands in $...$ (ONLY outside existing $...$ blocks)
  const fracRegex = /((?:[a-zA-Z](?:\([a-zA-Z0-9]+\))?\s*=\s*)?\\(?:d|t)?frac\s*\{[^{}]*\}\s*\{[^{}]*\})/g;
  const sqrtRegex = /((?:[-+]?\s*(?:[0-9a-zA-Z]+|[a-zA-Z]\s*=\s*))?\\sqrt(?:\[[^\]]*\])?\{([^{}]*(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}[^{}]*)*)\})/g;
  const commonLatexRegex = getCommonLatexRegex();

  const parts = sanitized.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);
  sanitized = parts
    .map((part) => {
      if (part.startsWith("$")) return part;
      let textPart = part;
      textPart = textPart.replace(fracRegex, (m) => `$${m}$`);
      textPart = textPart.replace(sqrtRegex, (m) => `$${m}$`);
      textPart = textPart.replace(commonLatexRegex, (cmd) => `$${cmd}$`);
      return textPart;
    })
    .join("");

  // Replace $$...$$ block math using safeKatexRender
  let result = sanitized.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    return safeKatexRender(math, true);
  });

  // Replace $...$ inline math using safeKatexRender
  result = result.replace(/\$([\s\S]*?)\$/g, (_, math) => {
    return safeKatexRender(math, false);
  });

  // Convert line breaks to <br/>
  result = result.replace(/\n/g, "<br/>");

  result = result.replace(
    /<table\b[^>]*>[\s\S]*?<\/table>/gi,
    (match) => `<div class="responsive-table-container">${match}</div>`
  );

  // Restore protected placeholders
  result = result.replace(/\uE000PH_(\d+)\uE001/g, (_, idx) => placeholders[parseInt(idx, 10)] || "");

  // Restore protected RAW blocks directly into the final output
  if (rawBlocks.length > 0) {
    for (const block of rawBlocks) {
      let renderedRaw = renderRawBlockContent(block.content, { forWord: true });
      // Adapt dark theme raw box to ink-efficient light print box
      renderedRaw = renderedRaw.replace(
        /background-color:\s*#1e293b;\s*color:\s*#f8fafc;/gi,
        "background-color: #f8fafc; color: #0f172a; border: 1px solid #cbd5e1; border-left: 3.5px solid #2563eb;"
      );
      result = result.split(block.id).join(renderedRaw);
    }
  }

  return result;
}

/**
 * Smart Vietnamese Exam ABCD Layout Classifier (Chuẩn đề thi thực tế Bộ GD&ĐT)
 * - Kiểu 1 (four-cols): A  B  C  D trên 1 hàng khi các đáp án đều ngắn và gọn.
 * - Kiểu 2 (two-cols): Hàng 1 (A, B) và Hàng 2 (C, D) khi các đáp án có độ dài trung bình hoặc chứa phân số / biểu thức.
 * - Kiểu 3 (one-col): A, B, C, D mỗi đáp án 1 hàng riêng khi nội dung dài hoặc xuống dòng.
 *
 * If isTwoColDocument is true, the question already occupies half the page width,
 * so 4-column layout is restricted only to ultra-short answers (<= 2 chars).
 */
export function classifyOptionsLayout(
  options: { text: string }[],
  isTwoColDocument = false
): "four-cols" | "two-cols" | "one-col" {
  if (!options || options.length === 0) return "four-cols";

  if (options.length !== 4) {
    const maxL = Math.max(...options.map((o) => (o.text || "").length), 0);
    return maxL > 35 ? "one-col" : "two-cols";
  }

  let hasMultiline = false;
  let hasHeavyMath = false;
  let hasFractionOrSqrt = false;
  const visualLengths: number[] = [];

  for (const opt of options) {
    const raw = opt.text || "";
    if (raw.includes("\n") || raw.includes("<br") || raw.includes("<p>")) {
      hasMultiline = true;
    }
    if (/\\begin|\\matrix|\\pmatrix|\\cases|\\aligned/i.test(raw)) {
      hasHeavyMath = true;
    }
    if (/\\(?:d|t)?frac|\\sqrt/i.test(raw)) {
      hasFractionOrSqrt = true;
    }

    // Estimate visual text length by stripping LaTeX markup commands
    const stripped = raw
      .replace(/\$\$[\s\S]*?\$\$/g, "XXXXX")
      .replace(/\$([^$]+)\$/g, "$1")
      .replace(/\\(?:d|t)?frac\{([^{}]*)\}\{([^{}]*)\}/g, "$1/$2")
      .replace(/\\sqrt(?:\[[^\]]*\])?\{([^{}]*)\}/g, "V$1")
      .replace(/\\[a-zA-Z]+/g, "")
      .replace(/[{}]/g, "")
      .trim();

    visualLengths.push(stripped.length);
  }

  const maxLen = Math.max(...visualLengths, 0);
  const totalLen = visualLengths.reduce((sum, len) => sum + len, 0);

  if (isTwoColDocument) {
    // In a 2-column page layout, each column is ~360px wide
    if (hasMultiline || hasHeavyMath || maxLen > 24) {
      return "one-col";
    }
    if (hasFractionOrSqrt || maxLen > 4 || totalLen > 14) {
      return "two-cols";
    }
    return "four-cols";
  }

  // Kiểu 3: 1 cột nếu có xuống dòng, công thức rất cồng kềnh hoặc đáp án dài > 35 ký tự
  if (hasMultiline || hasHeavyMath || maxLen > 35) {
    return "one-col";
  }

  // Kiểu 2: 2 cột (A B / C D) nếu chứa phân số/căn thức, hoặc maxLen > 18, hoặc tổng độ dài > 50
  if (hasFractionOrSqrt || maxLen > 18 || totalLen > 50) {
    return "two-cols";
  }

  // Kiểu 1: 4 cột trên 1 hàng (A B C D) khi tất cả đều ngắn, không phân số cồng kềnh
  return "four-cols";
}

/**
 * Calculates page budget estimation for an exam based on questions, diagrams, and export options.
 * Provides smart layout recommendations (1-col vs 2-cols, font size, margins) to fit within maxPages.
 */
export function estimateExamPageBudget(
  questions: Question[],
  options: ExportExamOptions
): PageBudgetEstimate {
  const spacing = options.spacingPreset || "normal";
  const marginMm = spacing === "tight" ? 8 : spacing === "relaxed" ? 16 : 12;
  const marginPx = marginMm * 2 * (96 / 25.4);
  const usableHeightPerPagePx = Math.max(800, 1122.5 - marginPx);

  const fontSizePreset = options.fontSizePreset || "normal";
  const fontMultiplier =
    fontSizePreset === "compact" ? 0.88 : fontSizePreset === "large" ? 1.15 : 1.0;

  // Header & student info
  let totalHeight = 0;
  if (options.showPaperHeader !== false) totalHeight += 85;
  if (options.showStudentInfo !== false) totalHeight += 65;

  // Answer matrix if includeAnswers
  if (options.includeAnswers) {
    totalHeight += 50; // title
    const choiceCount = questions.filter(
      (q) => q.type === "single_choice" || q.type === "multiple_choice"
    ).length;
    const tfCount = questions.filter((q) => q.type === "true_false").length;
    const saCount = questions.filter((q) => q.type === "short_answer").length;
    if (choiceCount > 0) totalHeight += 25 + Math.ceil(choiceCount / 10) * 32;
    if (tfCount > 0) totalHeight += 25 + tfCount * 24;
    if (saCount > 0) totalHeight += 25 + saCount * 22;
  }

  // Diagram scaling height
  const diagramScale = options.diagramScalePreset || "normal";
  const diagramHeight =
    diagramScale === "small" ? 160 : diagramScale === "large" ? 280 : 210;

  // Question heights
  let totalQuestionsHeight = 0;
  for (const q of questions) {
    let qH = 0;
    // Text lines: ~85 chars per line in 1-col, ~42 in 2-col
    const textLen = (q.text || "").length;
    const textLines = Math.max(
      1,
      Math.ceil(textLen / (options.layoutMode === "two-cols" ? 42 : 85))
    );
    qH += textLines * 19 * fontMultiplier;

    // Has image or diagram tags
    const hasDiagram = Boolean(
      q.imageUrl ||
        /<(?:graph|bbt|live-canvas|html-widget|widget)\b/i.test(q.text || "") ||
        /```(?:graph|bbt|canvas|live-code|simulation)/i.test(q.text || "")
    );
    if (hasDiagram) {
      qH += diagramHeight;
    }

    // Question options
    if (q.type === "single_choice" || q.type === "multiple_choice") {
      const opts = q.options || [];
      const colClass = classifyOptionsLayout(opts, options.layoutMode === "two-cols");
      if (colClass === "four-cols") qH += 26 * fontMultiplier;
      else if (colClass === "two-cols") qH += 50 * fontMultiplier;
      else qH += opts.length * 24 * fontMultiplier;
    } else if (q.type === "true_false") {
      qH += (q.statements?.length || 4) * 22 * fontMultiplier;
    } else if (q.type === "short_answer") {
      qH += 30 * fontMultiplier;
    } else if (q.type === "matching") {
      qH += 100 * fontMultiplier;
    } else if (q.type === "ordering") {
      qH += ((q.orderingItems?.length || 3) * 20 + 25) * fontMultiplier;
    } else if (q.type === "fill_blank") {
      qH += 35 * fontMultiplier;
    }

    // Explanation
    if (options.includeAnswers && options.includeExplanation !== false && q.explanation) {
      const expLines = Math.max(1, Math.ceil(q.explanation.length / 85));
      qH += expLines * 18 * fontMultiplier + 12;
    }

    // Question gap
    qH += spacing === "tight" ? 8 : spacing === "relaxed" ? 16 : 12;
    totalQuestionsHeight += qH;
  }

  // Layout adjustment
  if (options.layoutMode === "two-cols") {
    totalHeight += (totalQuestionsHeight / 2) * 1.08;
  } else {
    totalHeight += totalQuestionsHeight;
  }

  // End marker
  totalHeight += 40;

  const estimatedPages = Math.max(1, Math.ceil(totalHeight / usableHeightPerPagePx));
  const maxPages = options.maxPages && options.maxPages > 0 ? options.maxPages : undefined;
  const fitsWithinTarget = !maxPages || estimatedPages <= maxPages;

  // Determine recommendations if it exceeds target
  let recommendedLayout: "one-col" | "two-cols" = "one-col";
  let recommendedFontSize: "compact" | "normal" | "large" = "normal";
  let recommendedSpacing: "tight" | "normal" | "relaxed" = "normal";
  let recommendedDiagramScale: "small" | "normal" | "large" = "normal";

  if (maxPages && estimatedPages > maxPages) {
    recommendedLayout = "two-cols";
    if (estimatedPages > maxPages + 1) {
      recommendedFontSize = "compact";
      recommendedSpacing = "tight";
      recommendedDiagramScale = "small";
    } else {
      recommendedFontSize = "compact";
      recommendedSpacing = "tight";
      recommendedDiagramScale = "normal";
    }
  }

  return {
    estimatedPages,
    totalHeightPx: Math.round(totalHeight),
    usableHeightPerPagePx: Math.round(usableHeightPerPagePx),
    fitsWithinTarget,
    recommendedLayout,
    recommendedFontSize,
    recommendedSpacing,
    recommendedDiagramScale,
  };
}

/**
 * Generates raw, standard LaTeX source code (.tex) ready to compile with pdflatex or XeLaTeX.
 */
export function generateExamLatex(
  exam: Partial<Exam>,
  sections: Section[],
  questions: Question[],
  options: ExportExamOptions
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
      (q) => q.type === "single_choice" || q.type === "multiple_choice"
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
      const layoutType = classifyOptionsLayout(opts);
      let numCols = 4;
      if (layoutType === "one-col") numCols = 1;
      else if (layoutType === "two-cols") numCols = 2;

      tex += `\\begin{tasks}(${numCols})\n`;
      opts.forEach((opt) => {
        const isCorrect = q.correctOptionIds?.includes(opt.id);
        const prefix = includeAnswers && isCorrect ? "\\textbf{\\color{blue}" : "";
        const suffix = includeAnswers && isCorrect ? "}" : "";
        tex += `  \\task ${prefix}${escapeLatexText(opt.text)}${suffix}\n`;
      });
      tex += `\\end{tasks}\n`;
    } else if (q.type === "true_false") {
      const stmts = q.statements || [];
      tex += `\\begin{enumerate}[label=\\textbf{\\alph*)}, leftmargin=20pt, itemsep=2pt]\n`;
      stmts.forEach((stmt) => {
        const ansTag = includeAnswers ? ` \\textbf{[${stmt.correctAnswer ? "ĐÚNG" : "SAI"}]}` : "";
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
 * Supports configurable page budget limits, intelligent auto-fit, 1-col vs 2-col layouts,
 * and sharp, responsive diagrams (graphs, variation tables, live canvas, widgets).
 */
export function generateExamHtmlForPrint(
  exam: Partial<Exam>,
  sections: Section[],
  questions: Question[],
  options: ExportExamOptions
): string {
  const {
    includeAnswers,
    includeExplanation = true,
    schoolName = "TRƯỜNG THPT CHUYÊN .....................",
    examCode = exam.code || "101",
    subjectName = "TOÁN HỌC",
    gradeName = "LỚP 12",
    layoutMode = "one-col",
    fontSizePreset = "normal",
    spacingPreset = "normal",
    diagramScalePreset = "normal",
    showPaperHeader = true,
    showStudentInfo = true,
  } = options;

  const docTitle = exam.title || "ĐỀ KIỂM TRA ĐỊNH KỲ";
  const timeLimit = exam.timeLimit || 45;

  const choiceQuestions = questions.filter(
    (q) => q.type === "single_choice" || q.type === "multiple_choice"
  );
  const tfQuestions = questions.filter((q) => q.type === "true_false");
  const saQuestions = questions.filter((q) => q.type === "short_answer");

  const fontSizePt = fontSizePreset === "compact" ? 10.5 : fontSizePreset === "large" ? 13.5 : 12;
  const lineHeight = fontSizePreset === "compact" ? 1.3 : fontSizePreset === "large" ? 1.5 : 1.4;
  const marginMm = spacingPreset === "tight" ? 8 : spacingPreset === "relaxed" ? 16 : 12;
  const diagramMaxHeight =
    diagramScalePreset === "small" ? 180 : diagramScalePreset === "large" ? 320 : 250;
  const questionGapPx = spacingPreset === "tight" ? 8 : spacingPreset === "relaxed" ? 16 : 12;

  const isTwoCol = layoutMode === "two-cols";

  let html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${includeAnswers ? "Đáp án & Lời giải" : "Đề thi"} - ${docTitle}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <style>
    :root {
      --exam-font-size: ${fontSizePt}pt;
      --exam-line-height: ${lineHeight};
      --exam-margin: ${marginMm}mm;
      --diagram-max-height: ${diagramMaxHeight}px;
      --question-gap: ${questionGapPx}px;
    }
    @page {
      size: A4;
      margin: var(--exam-margin, 12mm);
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: var(--exam-font-size, 12pt);
      line-height: var(--exam-line-height, 1.4);
      color: #111827;
      background: #fff;
      margin: 0;
      padding: 0;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
    }
    .header-table td {
      vertical-align: top;
      padding: 2px 4px;
    }
    .title-banner {
      text-align: center;
      margin: 8px 0 12px 0;
    }
    .title-banner h1 {
      font-size: calc(var(--exam-font-size, 12pt) * 1.25);
      font-weight: bold;
      margin: 0 0 4px 0;
      text-transform: uppercase;
    }
    .code-badge {
      display: inline-block;
      border: 1.5px solid #111827;
      padding: 2px 12px;
      font-weight: bold;
      font-size: calc(var(--exam-font-size, 12pt) * 0.95);
      border-radius: 4px;
      margin-top: 3px;
    }
    .student-info {
      width: 100%;
      margin-bottom: 12px;
      font-size: calc(var(--exam-font-size, 12pt) * 0.95);
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
      margin: 8px 0 12px 0;
    }
    /* Matrix Summary Table */
    .answer-matrix-box {
      border: 2px solid #1e3a8a;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 18px;
      background-color: #f8fafc;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .matrix-title {
      font-size: calc(var(--exam-font-size, 12pt) * 1.1);
      font-weight: bold;
      color: #1e3a8a;
      text-align: center;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    .answer-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: calc(var(--exam-font-size, 12pt) * 0.88);
      text-align: center;
    }
    .answer-table th, .answer-table td {
      border: 1px solid #475569;
      padding: 3px 2px;
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
    /* Questions Layout Grid */
    .questions-container {
      display: block;
    }
    .questions-container.two-cols {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 16px;
      row-gap: var(--question-gap, 12px);
    }
    .span-full-width {
      grid-column: 1 / -1;
    }
    .section-header {
      font-size: calc(var(--exam-font-size, 12pt) * 1.05);
      font-weight: bold;
      margin: 14px 0 6px 0;
      text-transform: uppercase;
      color: #0f172a;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 2px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .question-item {
      margin-bottom: var(--question-gap, 12px);
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .two-cols .question-item {
      margin-bottom: 0;
    }
    .question-text {
      font-weight: normal;
      margin-bottom: 4px;
      word-break: break-word;
    }
    .question-label {
      font-weight: bold;
    }
    .options-grid {
      display: grid;
      column-gap: 12px;
      row-gap: 4px;
      margin-left: 10px;
      margin-top: 3px;
      margin-bottom: 4px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .options-grid.four-cols {
      grid-template-columns: repeat(4, 1fr);
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
      page-break-inside: avoid;
      break-inside: avoid;
      min-width: 0;
    }
    .opt-letter {
      font-weight: bold;
      flex-shrink: 0;
      white-space: nowrap;
      min-width: 16px;
    }
    .opt-content {
      flex: 1;
      min-width: 0;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .opt-correct {
      font-weight: bold;
      color: #1d4ed8;
    }
    .opt-correct .opt-letter {
      font-weight: 900;
      text-decoration: underline;
      color: #1d4ed8;
    }
    .explanation-box {
      margin-top: 5px;
      padding: 5px 8px;
      background-color: #f1f5f9;
      border-left: 3px solid #3b82f6;
      border-radius: 3px;
      font-size: calc(var(--exam-font-size, 12pt) * 0.9);
      color: #334155;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .tf-table {
      width: 100%;
      border-collapse: collapse;
      margin-left: 10px;
      margin-bottom: 4px;
      font-size: calc(var(--exam-font-size, 12pt) * 0.95);
    }
    .tf-table td {
      padding: 2px 0;
    }
    /* Diagram & Code Block Print Styles */
    .dk-print-diagram {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      max-width: 100%;
    }
    .dk-print-graph, .dk-graph-container {
      text-align: center;
      margin: 6px auto;
    }
    .dk-graph-container, .dk-graph-container > div {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
      overflow: visible !important;
    }
    .dk-print-graph svg, .dk-graph-container svg {
      width: auto !important;
      height: auto !important;
      max-width: 100% !important;
      max-height: var(--diagram-max-height, 250px) !important;
      display: inline-block;
    }
    .dk-print-bbt, .dk-bbt-container {
      margin: 6px auto;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #ffffff;
      max-width: 100% !important;
      overflow: visible !important;
    }
    .dk-bbt-container table {
      min-width: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      border-collapse: collapse;
      table-layout: auto !important;
    }
    .dk-bbt-container td, .dk-bbt-container th {
      border: 1px solid #cbd5e1;
      padding: 2px 3px !important;
      text-align: center;
      font-size: calc(var(--exam-font-size, 12pt) * 0.85);
    }
    .dk-bbt-container svg {
      max-width: 100% !important;
      height: auto !important;
    }
    .dk-print-live-canvas {
      text-align: center;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #ffffff;
      padding: 6px;
      margin: 6px auto;
      width: fit-content;
      max-width: 100%;
      box-sizing: border-box;
    }
    .dk-print-canvas-img {
      max-width: 100% !important;
      height: auto !important;
      max-height: var(--diagram-max-height, 250px) !important;
      display: block;
      margin: 0 auto;
      border-radius: 4px;
    }
    .dk-print-code-box {
      background: #f8fafc;
      color: #0f172a;
      font-family: Consolas, 'Courier New', monospace;
      font-size: calc(var(--exam-font-size, 12pt) * 0.82);
      line-height: 1.35;
      padding: 6px 10px;
      border-radius: 4px;
      margin: 6px 0;
      border: 1px solid #cbd5e1;
      border-left: 3.5px solid #2563eb;
      white-space: pre-wrap;
      word-break: break-word;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .dk-print-html-widget {
      margin: 6px 0;
      border: 1.5px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 10px;
      background: #f8fafc;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .end-marker {
      text-align: center;
      font-weight: bold;
      margin: 20px 0;
      letter-spacing: 2px;
      grid-column: 1 / -1;
    }
    /* KaTeX adjustments for clean print sizing */
    .katex-display {
      margin: 4px 0 !important;
    }
    .katex {
      font-size: 1.05em !important;
    }
    @media print {
      @page {
        size: A4;
        margin: var(--exam-margin, 12mm);
      }
      .questions-container.two-cols {
        display: block !important;
        column-count: 2 !important;
        column-gap: 16px !important;
      }
      .questions-container.two-cols .span-full-width {
        column-span: all !important;
      }
      .questions-container.two-cols .question-item {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        margin-bottom: var(--question-gap, 12px) !important;
      }
    }
  </style>
</head>
<body>
`;

  // --- HEADER BLOCK ---
  if (showPaperHeader) {
    html += `
  <table class="header-table">
    <tr>
      <td style="width: 48%; text-align: center;">
        <div style="font-weight: bold;">${renderLatexToHtml(schoolName)}</div>
        <div style="font-size: 10.5pt;">TỔ CHUYÊN MÔN: ${renderLatexToHtml(subjectName)}</div>
        <div style="font-size: 10.5pt; font-style: italic;">(Đề thi gồm ${questions.length} câu)</div>
      </td>
      <td style="width: 4%;"></td>
      <td style="width: 48%; text-align: center;">
        <div style="font-weight: bold; font-size: 12.5pt;">${includeAnswers ? "HƯỚNG DẪN CHẤM & ĐÁP ÁN CHI TIẾT" : "ĐỀ THI CHÍNH THỨC"}</div>
        <div style="font-weight: bold;">MÔN: ${renderLatexToHtml(subjectName)} - ${renderLatexToHtml(gradeName)}</div>
        <div style="font-size: 10.5pt; font-style: italic;">Thời gian: ${timeLimit} phút (không kể phát đề)</div>
      </td>
    </tr>
  </table>

  <div class="divider"></div>

  <div class="title-banner">
    <h1>${renderLatexToHtml(docTitle)}</h1>
    <div><span class="code-badge">MÃ ĐỀ THI: ${examCode}</span></div>
  </div>
`;
  }

  // --- STUDENT INFO BLOCK ---
  if (showStudentInfo) {
    html += `
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
  }

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
  <div style="text-align: center; font-weight: bold; font-size: 13pt; margin: 16px 0; text-transform: uppercase; color: #1e3a8a;">
    HƯỚNG DẪN GIẢI VÀ LỜI GIẢI CHI TIẾT TỪNG CÂU
  </div>
`;
  }

  // --- RENDER QUESTIONS CONTAINER ---
  html += `<div class="questions-container ${isTwoCol ? "two-cols" : "one-col"}">`;

  let currentSecId: string | null | undefined = undefined;
  const sectionMap = new Map(sections.map((s) => [s.id, s]));

  questions.forEach((q, qIndex) => {
    if (q.sectionId !== currentSecId) {
      currentSecId = q.sectionId;
      if (currentSecId && sectionMap.has(currentSecId)) {
        const sec = sectionMap.get(currentSecId)!;
        html += `<div class="section-header span-full-width">${renderLatexToHtml(sec.title)}</div>`;
        if (sec.description) {
          html += `<div class="span-full-width" style="font-style: italic; margin-bottom: 6px; font-size: 10.5pt; color: #475569;">${renderLatexToHtml(sec.description)}</div>`;
        }
      }
    }

    const questionNumber = qIndex + 1;

    html += `
  <div class="question-item">
    <div class="question-text">
      <span class="question-label">Câu ${questionNumber}:</span> ${renderLatexToHtml(q.text, { isTwoColDocument: isTwoCol })}
    </div>
`;

    if (q.imageUrl) {
      html += `
    <div style="text-align: center; margin: 6px 0; page-break-inside: avoid; break-inside: avoid;">
      <img src="${q.imageUrl}" alt="Hình câu ${questionNumber}" style="max-width: 100%; max-height: var(--diagram-max-height, 250px); object-fit: contain; display: inline-block; border-radius: 4px;" crossorigin="anonymous" />
    </div>
`;
    }

    if (q.type === "single_choice" || q.type === "multiple_choice") {
      const opts = q.options || [];
      const colClass = classifyOptionsLayout(opts, isTwoCol);

      html += `<div class="options-grid ${colClass}">`;
      opts.forEach((opt, oIdx) => {
        const isCorrect = q.correctOptionIds?.includes(opt.id);
        const letter = String.fromCharCode(65 + oIdx);
        html += `
        <div class="opt-item ${includeAnswers && isCorrect ? "opt-correct" : ""}">
          <span class="opt-letter">${letter}.</span>
          <span class="opt-content">${renderLatexToHtml(opt.text, { isTwoColDocument: isTwoCol })}</span>
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
          <td style="width: 24px; font-weight: bold; vertical-align: top;">${letter})</td>
          <td>${renderLatexToHtml(stmt.text, { isTwoColDocument: isTwoCol })} ${ansTag}</td>
        </tr>
`;
      });
      html += `</table>`;
    } else if (q.type === "short_answer") {
      if (includeAnswers) {
        html += `<div style="margin-left: 10px; font-weight: bold; color: #1e3a8a;">Đáp số: ${escapeLatexText(q.acceptedAnswers?.join(", ") || "")}</div>`;
      } else {
        html += `<div style="margin: 8px 0 8px 10px; font-style: italic;">Đáp số: .................................................................................</div>`;
      }
    } else if (q.type === "ordering") {
      const items = q.orderingItems || [];
      const correctOrder = q.correctOrder || items.map((it) => it.id);
      html += `<div style="margin-left: 10px; margin-bottom: 6px;">`;
      html += `<div style="font-style: italic; margin-bottom: 3px; font-size: 10pt; color: #475569;">Các mục cần sắp xếp:</div>`;
      items.forEach((item, itIdx) => {
        html += `<div style="margin-bottom: 2px;"><strong>(${itIdx + 1})</strong> ${renderLatexToHtml(item.text, { isTwoColDocument: isTwoCol })}</div>`;
      });
      if (includeAnswers) {
        const orderLabels = correctOrder.map((cid) => {
          const itemIdx = items.findIndex((it) => it.id === cid);
          return itemIdx !== -1 ? `(${itemIdx + 1})` : cid;
        });
        html += `<div style="margin-top: 4px; font-weight: bold; color: #1d4ed8;">Thứ tự đúng: ${orderLabels.join(" → ")}</div>`;
      } else {
        html += `<div style="margin-top: 4px; font-style: italic;">Thứ tự sắp xếp: ................................................................</div>`;
      }
      html += `</div>`;
    } else if (q.type === "fill_blank") {
      if (includeAnswers) {
        const acceptedMap = q.acceptedAnswersPerBlank || {};
        const blanksSummary = Object.entries(acceptedMap)
          .map(([k, ansList]) => `[Ô ${Number(k) + 1}]: ${(ansList as string[]).join(" hoặc ")}`)
          .join(" | ");
        html += `<div style="margin-left: 10px; font-weight: bold; color: #1e3a8a;">Đáp án điền từ: ${escapeLatexText(blanksSummary || "")}</div>`;
      }
    } else if (q.type === "matching") {
      const leftItems = q.matchingLeft || [];
      const rightItems = q.matchingRight || [];
      const maxRows = Math.max(leftItems.length, rightItems.length);
      html += `<table style="width: 100%; border-collapse: collapse; margin: 6px 0 8px 10px;">`;
      html += `<tr><th style="width: 50%; border: 1px solid #cbd5e1; padding: 3px 6px; background: #f8fafc; font-weight: bold; text-align: left;">Cột 1</th><th style="width: 50%; border: 1px solid #cbd5e1; padding: 3px 6px; background: #f8fafc; font-weight: bold; text-align: left;">Cột 2</th></tr>`;
      for (let r = 0; r < maxRows; r++) {
        const l = leftItems[r];
        const rt = rightItems[r];
        html += `<tr>`;
        html += `<td style="border: 1px solid #cbd5e1; padding: 3px 6px;">${l ? `<b>${l.label || r + 1}.</b> ${renderLatexToHtml(l.text, { isTwoColDocument: isTwoCol })}` : ""}</td>`;
        html += `<td style="border: 1px solid #cbd5e1; padding: 3px 6px;">${rt ? `<b>${rt.label || String.fromCharCode(97 + r)}.</b> ${renderLatexToHtml(rt.text, { isTwoColDocument: isTwoCol })}` : ""}</td>`;
        html += `</tr>`;
      }
      html += `</table>`;
      if (includeAnswers && q.correctMatches) {
        const matchesSummary = Object.entries(q.correctMatches)
          .map(([lKey, rVal]) => `${lKey} → ${rVal}`)
          .join(", ");
        html += `<div style="margin-left: 10px; font-weight: bold; color: #1e3a8a;">Đáp án nối: ${matchesSummary}</div>`;
      }
    }

    // Explanation
    if (includeAnswers && includeExplanation && q.explanation) {
      html += `
    <div class="explanation-box">
      <strong>Lời giải:</strong> ${renderLatexToHtml(q.explanation, { isTwoColDocument: isTwoCol })}
    </div>
`;
    }

    html += `</div>`;
  });

  html += `
    <div class="end-marker span-full-width">--------- HẾT ---------</div>
  </div>
</body>
</html>
`;

  return html;
}

/**
 * Exports directly to PDF using html2pdf.js.
 * Features:
 * 1. Automatic page-budget calculation & content scaling to fit admin's desired maxPages.
 * 2. Automatic conversion of interactive Live Canvases into crisp, high-res static PNG images.
 * 3. Pagebreak rules ensuring questions and diagrams are never cut across page boundaries.
 */
export async function exportExamToPdf(
  exam: Partial<Exam>,
  sections: Section[],
  questions: Question[],
  options: ExportExamOptions,
  filename?: string
): Promise<void> {
  // 1. If autoFitPageBudget is enabled and maxPages is set, tune presets to best fit target budget
  let effectiveOptions = { ...options };
  if (
    effectiveOptions.maxPages &&
    effectiveOptions.maxPages > 0 &&
    effectiveOptions.autoFitPageBudget !== false
  ) {
    const budget = estimateExamPageBudget(questions, effectiveOptions);
    if (budget.estimatedPages > effectiveOptions.maxPages) {
      effectiveOptions.layoutMode = budget.recommendedLayout;
      effectiveOptions.fontSizePreset = budget.recommendedFontSize;
      effectiveOptions.spacingPreset = budget.recommendedSpacing;
      effectiveOptions.diagramScalePreset = budget.recommendedDiagramScale;
    }
  }

  const html = generateExamHtmlForPrint(exam, sections, questions, effectiveOptions);

  const prevScrollY = window.scrollY;
  window.scrollTo(0, 0);

  const defaultName = effectiveOptions.includeAnswers
    ? `${exam.title || "De_Thi"}_Dap_An_Chi_Tiet.pdf`
    : `${exam.title || "De_Thi"}_De_Thi.pdf`;

  const finalFileName = (filename || defaultName).replace(/[\/\\:*?"<>|]/g, "_");

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
  container.style.opacity = "1";
  container.style.pointerEvents = "none";

  // Parse HTML string and extract style tags and body content
  const parser = new DOMParser();
  const parsedDoc = parser.parseFromString(html, "text/html");

  const styleElements: string[] = [];
  parsedDoc.querySelectorAll("style").forEach((s) => {
    styleElements.push(s.outerHTML);
  });

  const katexCssLink = `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">`;
  const bodyInner = parsedDoc.body ? parsedDoc.body.innerHTML : html;

  const contentDiv = document.createElement("div");
  contentDiv.style.background = "#ffffff";
  contentDiv.style.color = "#111827";
  contentDiv.style.padding = "0";
  contentDiv.style.fontFamily = "'Times New Roman', Times, serif";
  contentDiv.style.fontSize = "var(--exam-font-size, 12pt)";
  contentDiv.style.lineHeight = "var(--exam-line-height, 1.4)";
  contentDiv.style.width = "100%";
  contentDiv.style.boxSizing = "border-box";
  contentDiv.innerHTML = `
    ${katexCssLink}
    ${styleElements.join("\n")}
    ${bodyInner}
  `;

  container.appendChild(contentDiv);
  document.body.appendChild(container);

  // 2. Convert any unrendered <canvas class="dk-live-canvas"> to high-res PNG images
  const liveCanvases = contentDiv.querySelectorAll<HTMLCanvasElement>("canvas.dk-live-canvas");
  liveCanvases.forEach((canvas) => {
    try {
      const codeEncoded = canvas.getAttribute("data-code");
      if (!codeEncoded) return;
      const code = safeDecode(codeEncoded);
      const width = parseInt(canvas.getAttribute("data-width") || "500", 10);
      const height = parseInt(canvas.getAttribute("data-height") || "340", 10);
      executeLiveCanvasCode(canvas, code, width, height);
      if (typeof canvas.toDataURL === "function") {
        const dataUrl = canvas.toDataURL("image/png");
        const img = document.createElement("img");
        img.src = dataUrl;
        img.className = "dk-print-canvas-img";
        img.style.maxWidth = "100%";
        img.style.height = "auto";
        img.style.maxHeight = "var(--diagram-max-height, 250px)";
        img.style.display = "block";
        img.style.margin = "0 auto";
        img.style.borderRadius = "4px";
        canvas.parentNode?.replaceChild(img, canvas);
      }
    } catch (err) {
      console.warn("Live canvas to image conversion error:", err);
    }
  });

  // Wait 900ms for KaTeX CSS, web fonts, and SVGs to fully layout
  await new Promise((resolve) => setTimeout(resolve, 900));

  // 3. Page Budget Scale Fine-tuning
  if (
    effectiveOptions.maxPages &&
    effectiveOptions.maxPages > 0 &&
    effectiveOptions.autoFitPageBudget !== false
  ) {
    const targetMaxPages = effectiveOptions.maxPages;
    const marginMm =
      effectiveOptions.spacingPreset === "tight"
        ? 8
        : effectiveOptions.spacingPreset === "relaxed"
        ? 16
        : 12;
    const marginPx = marginMm * 2 * (96 / 25.4);
    const usableHeightPerPage = Math.max(800, 1122.5 - marginPx);
    const maxAllowedHeight = targetMaxPages * usableHeightPerPage;

    const currentHeight = contentDiv.scrollHeight;
    if (currentHeight > maxAllowedHeight) {
      const scale = Math.max(0.68, Math.min(1.0, maxAllowedHeight / currentHeight));
      if (scale < 0.98) {
        const basePt =
          effectiveOptions.fontSizePreset === "compact"
            ? 10.5
            : effectiveOptions.fontSizePreset === "large"
            ? 13.5
            : 12;
        contentDiv.style.setProperty("--exam-font-size", `${(basePt * scale).toFixed(1)}pt`);
        contentDiv.style.setProperty(
          "--exam-line-height",
          `${(1.35 * Math.max(0.85, scale)).toFixed(2)}`
        );
        contentDiv.style.setProperty("--diagram-max-height", `${Math.round(250 * scale)}px`);
        contentDiv.style.setProperty("--question-gap", `${Math.round(12 * scale)}px`);
        await new Promise((r) => setTimeout(r, 80));
      }
    }
  }

  const marginVal =
    effectiveOptions.spacingPreset === "tight"
      ? 8
      : effectiveOptions.spacingPreset === "relaxed"
      ? 16
      : 12;

  try {
    const html2pdfModule = await import("html2pdf.js");
    const html2pdf: any = (html2pdfModule as any).default || html2pdfModule;

    const opt = {
      margin: [marginVal, marginVal, marginVal, marginVal] as [number, number, number, number],
      filename: finalFileName,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        logging: false,
      },
      jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    };

    await html2pdf().set(opt).from(contentDiv).save();
  } catch (err) {
    console.warn("html2pdf failed, invoking browser print fallback", err);
    printExamDocument(exam, sections, questions, effectiveOptions);
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
  options: ExportExamOptions
) {
  let effectiveOptions = { ...options };
  if (
    effectiveOptions.maxPages &&
    effectiveOptions.maxPages > 0 &&
    effectiveOptions.autoFitPageBudget !== false
  ) {
    const budget = estimateExamPageBudget(questions, effectiveOptions);
    if (budget.estimatedPages > effectiveOptions.maxPages) {
      effectiveOptions.layoutMode = budget.recommendedLayout;
      effectiveOptions.fontSizePreset = budget.recommendedFontSize;
      effectiveOptions.spacingPreset = budget.recommendedSpacing;
      effectiveOptions.diagramScalePreset = budget.recommendedDiagramScale;
    }
  }

  const html = generateExamHtmlForPrint(exam, sections, questions, effectiveOptions);

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

    // Convert any unrendered live canvases to images inside the iframe
    const canvases = doc.querySelectorAll<HTMLCanvasElement>("canvas.dk-live-canvas");
    canvases.forEach((canvas) => {
      try {
        const codeEncoded = canvas.getAttribute("data-code");
        if (!codeEncoded) return;
        const code = safeDecode(codeEncoded);
        const width = parseInt(canvas.getAttribute("data-width") || "500", 10);
        const height = parseInt(canvas.getAttribute("data-height") || "340", 10);
        executeLiveCanvasCode(canvas, code, width, height);
        if (typeof canvas.toDataURL === "function") {
          const dataUrl = canvas.toDataURL("image/png");
          const img = doc.createElement("img");
          img.src = dataUrl;
          img.className = "dk-print-canvas-img";
          img.style.maxWidth = "100%";
          img.style.height = "auto";
          img.style.maxHeight = "var(--diagram-max-height, 250px)";
          img.style.display = "block";
          img.style.margin = "0 auto";
          canvas.parentNode?.replaceChild(img, canvas);
        }
      } catch (err) {
        console.warn("Print live canvas conversion error:", err);
      }
    });

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
  options: ExportExamOptions
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
