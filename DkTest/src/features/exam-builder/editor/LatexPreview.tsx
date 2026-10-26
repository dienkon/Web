import { useEffect, useRef } from "react";
import katex from "katex";
import { renderDiscordCodeBlock } from "../../../utils/codeHighlighter";
import { renderBBTToHtml } from "../../math-draw/bbtRenderer";
import { renderGraphToSvg } from "../../math-draw/graphRenderer";
import { executeLiveCanvasCode, decodeHtmlEntities } from "../../math-draw/liveCanvasRunner";

export { decodeHtmlEntities };

interface Props {
  content: string;
  className?: string;
}

export function safeDecode(encoded: string): string {
  if (!encoded) return "";
  try {
    return decodeURIComponent(encoded);
  } catch {
    try {
      return decodeURIComponent(encoded.replace(/%(?![0-9a-fA-F]{2})/g, "%25"));
    } catch {
      return encoded;
    }
  }
}

export function safeEncode(val: string): string {
  try {
    return encodeURIComponent(val);
  } catch {
    return encodeURI(val);
  }
}

export default function LatexPreview({ content, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!content) {
      containerRef.current.innerHTML = "";
      return;
    }

    try {
      const renderedHtml = renderMarkdownWithLatex(content);
      containerRef.current.innerHTML = renderedHtml;

      // Initialize all live canvas code runners
      const canvases = containerRef.current.querySelectorAll("canvas.dk-live-canvas");
      canvases.forEach((canvasEl) => {
        const canvas = canvasEl as HTMLCanvasElement;
        const rawEncoded = canvas.getAttribute("data-code");
        if (!rawEncoded) return;
        const code = decodeHtmlEntities(safeDecode(rawEncoded));
        const w = parseInt(canvas.getAttribute("data-width") || "500", 10);
        const h = parseInt(canvas.getAttribute("data-height") || "340", 10);
        executeLiveCanvasCode(canvas, code, w, h);
      });

      // Mount all interactive sandboxed HTML widgets (CSS + JS + Canvas + Simulations)
      mountHtmlWidgets(containerRef.current);
    } catch (e) {
      console.error("Error parsing LaTeX preview", e);
      if (containerRef.current) {
        try {
          containerRef.current.innerHTML = sanitizeHarmfulHtml(content.replace(/\n/g, "<br/>"));
        } catch {
          containerRef.current.textContent = content;
        }
      }
    }
  }, [content]);

  // Window message listener for auto-resizing sandboxed iframe HTML widgets
  useEffect(() => {
    const handleWidgetResize = (e: MessageEvent) => {
      if (e.data?.type === "dk-widget-resize" && e.data?.id && typeof e.data?.height === "number") {
        const targetIframe = containerRef.current?.querySelector(
          `iframe[data-widget-target-id="${e.data.id}"]`
        ) as HTMLIFrameElement | null;
        if (targetIframe) {
          const newHeight = Math.max(160, Math.min(1400, e.data.height + 16));
          targetIframe.style.height = `${newHeight}px`;
          const container = targetIframe.closest(".dk-widget-iframe-container") as HTMLElement | null;
          if (container) {
            container.style.minHeight = `${newHeight}px`;
          }
        }
      }
    };
    window.addEventListener("message", handleWidgetResize);
    return () => window.removeEventListener("message", handleWidgetResize);
  }, []);

  // Click delegation for Discord code block copy buttons, Live Canvas actions & HTML Widgets
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleCopy = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // 1. Copy code button in Discord code block & HTML widget
      const btn = target.closest(".dk-copy-code-btn") as HTMLButtonElement | null;
      if (btn) {
        const rawEncoded = btn.getAttribute("data-code");
        if (!rawEncoded) return;

        const rawCode = safeDecode(rawEncoded);
        navigator.clipboard
          .writeText(rawCode)
          .then(() => {
            const label = btn.querySelector(".dk-copy-label");
            const originalText = label ? label.textContent : "Sao chép";
            if (label) label.textContent = "Đã sao chép! ✓";
            btn.classList.add("copied");

            setTimeout(() => {
              if (label) label.textContent = originalText;
              btn.classList.remove("copied");
            }, 2000);
          })
          .catch((err) => {
            console.error("Clipboard copy failed:", err);
          });
        return;
      }

      // 2. View/Hide code button in Live Canvas block
      const codeBtn = target.closest(".dk-canvas-btn-code") as HTMLButtonElement | null;
      if (codeBtn) {
        const block = codeBtn.closest(".dk-live-canvas-block");
        const codeView = block?.querySelector(".dk-live-code-view");
        if (codeView) {
          codeView.classList.toggle("hidden");
          codeBtn.textContent = codeView.classList.contains("hidden") ? "Xem code" : "Ẩn code";
        }
        return;
      }

      // 3. Rerun button in Live Canvas block
      const rerunBtn = target.closest(".dk-canvas-btn-rerun") as HTMLButtonElement | null;
      if (rerunBtn) {
        const block = rerunBtn.closest(".dk-live-canvas-block");
        const canvas = block?.querySelector("canvas.dk-live-canvas") as HTMLCanvasElement | null;
        if (canvas) {
          const rawEncoded = canvas.getAttribute("data-code");
          if (rawEncoded) {
            const code = decodeHtmlEntities(safeDecode(rawEncoded));
            const w = parseInt(canvas.getAttribute("data-width") || "500", 10);
            const h = parseInt(canvas.getAttribute("data-height") || "340", 10);
            executeLiveCanvasCode(canvas, code, w, h);
          }
        }
        return;
      }

      // 4. Download image button in Live Canvas block
      const downloadBtn = target.closest(".dk-canvas-btn-download") as HTMLButtonElement | null;
      if (downloadBtn) {
        const block = downloadBtn.closest(".dk-live-canvas-block");
        const canvas = block?.querySelector("canvas.dk-live-canvas") as HTMLCanvasElement | null;
        if (canvas) {
          const url = canvas.toDataURL("image/png");
          const a = document.createElement("a");
          a.href = url;
          a.download = `canvas-drawing-${Date.now()}.png`;
          a.click();
        }
        return;
      }

      // 5. View/Hide code button in HTML Widget block
      const widgetCodeBtn = target.closest(".dk-widget-btn-code") as HTMLButtonElement | null;
      if (widgetCodeBtn) {
        const block = widgetCodeBtn.closest(".dk-html-widget-block");
        const codeView = block?.querySelector(".dk-widget-code-view");
        if (codeView) {
          codeView.classList.toggle("hidden");
          widgetCodeBtn.textContent = codeView.classList.contains("hidden") ? "Xem code" : "Ẩn code";
        }
        return;
      }

      // 6. Reload button in HTML Widget block
      const widgetReloadBtn = target.closest(".dk-widget-btn-reload") as HTMLButtonElement | null;
      if (widgetReloadBtn) {
        const block = widgetReloadBtn.closest(".dk-html-widget-block");
        const iframe = block?.querySelector("iframe") as HTMLIFrameElement | null;
        if (iframe && iframe.srcdoc) {
          const savedSrcDoc = iframe.srcdoc;
          iframe.srcdoc = "";
          setTimeout(() => {
            iframe.srcdoc = savedSrcDoc;
          }, 60);
        }
        return;
      }

      // 7. Fullscreen button in HTML Widget block
      const widgetFsBtn = target.closest(".dk-widget-btn-fullscreen") as HTMLButtonElement | null;
      if (widgetFsBtn) {
        const block = widgetFsBtn.closest(".dk-html-widget-block");
        const frameContainer = block?.querySelector(".dk-widget-iframe-container") as HTMLElement | null;
        if (frameContainer) {
          if (!document.fullscreenElement) {
            frameContainer.requestFullscreen?.().catch(() => {});
          } else {
            document.exitFullscreen?.().catch(() => {});
          }
        }
        return;
      }
    };

    container.addEventListener("click", handleCopy);
    return () => {
      container.removeEventListener("click", handleCopy);
    };
  }, [content]);

  const defaultColorClass = className.includes("text-") ? "" : "text-slate-800";

  return <div ref={containerRef} className={`latex-preview leading-relaxed ${defaultColorClass} ${className}`} />;
}

// Vietnamese vowel & letter lookahead to prevent false word boundary matches
const VN_CHAR_LOOKAHEAD = "(?![a-zA-ZàáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ])";

/**
 * Normalizes corrupted control characters and raw LaTeX strings before KaTeX parsing.
 */
export function normalizeLatexText(input: string): string {
  if (!input) return "";

  let text = input;

  // Convert literal '\n' and '\r\n' text strings into actual newline characters
  text = text.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n");

  // 0. Auto-heal previously corrupted data in database:
  text = text.replace(/\\t\s*\\times/g, "\\times");
  text = text.replace(/(\d)\s*\\t\s*(\d)/g, "$1 \\times $2");
  text = text.replace(/(?<![a-zA-Z\\])\\t\s*(\d)/g, "\\times $1");

  text = text.replace(/\\to(àn|án|át|ại|ang|àng|áng)/gi, (_, suffix) => "to" + suffix);
  text = text.replace(/\$\\to\$(àn|án|át|ại|ang|àng|áng)/gi, (_, suffix) => "to" + suffix);
  text = text.replace(/(?:→|->)(àn|án|át|ại|ang|àng|áng)/gi, (_, suffix) => "to" + suffix);

  text = text.replace(/\\in\s+(ấn|đề|bài|sách|vở|ra|vào)/gi, "in $1");
  text = text.replace(/\$\\in\$\s+(ấn|đề|bài|sách|vở|ra|vào)/gi, "in $1");
  text = text.replace(/\\tan\s+(trong|biến|vỡ|rã)/gi, "tan $1");
  text = text.replace(/(chất|hòa|độ|sự)\s+\\tan/gi, "$1 tan");

  // 1. Fix ASCII control character corruptions caused by single-backslash JSON/JS string parsing:
  // Tab \x09
  text = text.replace(/\x09imes/g, "\\times");
  text = text.replace(/\x09heta/g, "\\theta");
  text = text.replace(/\x09an/g, "\\tan");
  text = text.replace(/\x09ext/g, "\\text");
  text = text.replace(new RegExp(`\\x09o${VN_CHAR_LOOKAHEAD}`, "g"), "\\to");
  text = text.replace(/\x09au/g, "\\tau");
  text = text.replace(/\x09riangle/g, "\\triangle");
  text = text.replace(/\x09ilde/g, "\\tilde");
  text = text.replace(/\x09op/g, "\\top");
  text = text.replace(/\x09frac/g, "\\tfrac");
  text = text.replace(/(?:\\t|\x09)\s*x\s*(\d+|[a-zA-Z]+|\$)/g, "\\times $1");

  // Newline \x0A
  text = text.replace(/\x0Aotin/g, "\\notin");
  text = text.replace(/\x0Aearrow/g, "\\nearrow");
  text = text.replace(/\x0Aeq/g, "\\neq");
  text = text.replace(/\x0Aexists/g, "\\nexists");
  text = text.replace(/\x0Aeg/g, "\\neg");
  text = text.replace(/\x0Aabla/g, "\\nabla");
  text = text.replace(/\x0Aocite/g, "\\nocite");
  text = text.replace(/\x0Aoindent/g, "\\noindent");

  // Formfeed \x0C
  text = text.replace(/\x0Crac/g, "\\frac");
  text = text.replace(/\x0Cforall/g, "\\forall");
  text = text.replace(/\x0Cflat/g, "\\flat");
  text = text.replace(/\x0C/g, "\\f");

  // Backspace \x08
  text = text.replace(/\x08eta/g, "\\beta");
  text = text.replace(/\x08ar/g, "\\bar");
  text = text.replace(/\x08egin/g, "\\begin");
  text = text.replace(/\x08ig/g, "\\big");
  text = text.replace(/\x08ullet/g, "\\bullet");
  text = text.replace(/\x08ox/g, "\\box");
  text = text.replace(/\x08/g, "\\b");

  // Carriage Return \x0D
  text = text.replace(/\x0Dho/g, "\\rho");
  text = text.replace(/\x0Dight/g, "\\right");
  text = text.replace(/\x0Dreal/g, "\\real");

  // Vertical Tab \x0B
  text = text.replace(/\x0Bec/g, "\\vec");
  text = text.replace(/\x0Bspace/g, "\\vspace");
  text = text.replace(/\x0Bdots/g, "\\vdots");

  // Strip invisible / zero-width Unicode characters that break KaTeX
  text = text.replace(/[\u200B-\u200D\uFEFF]/g, "");

  // Fix multiple backslashes before known LaTeX math commands (e.g. \\sqrt -> \sqrt, \\frac -> \frac)
  const mathCommands = [
    "sqrt", "frac", "dfrac", "tfrac", "cfrac",
    "alpha", "beta", "gamma", "delta", "epsilon", "varepsilon", "zeta", "eta", "theta", "vartheta",
    "iota", "kappa", "lambda", "mu", "nu", "xi", "pi", "rho", "sigma", "tau", "upsilon", "phi",
    "varphi", "chi", "psi", "omega", "Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma",
    "Upsilon", "Phi", "Psi", "Omega",
    "int", "iint", "iiint", "oint", "sum", "prod", "coprod", "lim", "infty",
    "vec", "bar", "hat", "tilde", "overline", "underline", "mathbf", "mathrm", "mathbb", "mathcal",
    "pm", "mp", "times", "div", "cdot", "cap", "cup", "subset", "supset", "subseteq", "supseteq",
    "in", "notin", "ni", "forall", "exists", "nexists", "empty", "emptyset",
    "le", "ge", "leq", "geq", "neq", "approx", "equiv", "sim", "cong", "propto",
    "to", "rightarrow", "leftarrow", "leftrightarrow", "Rightarrow", "Leftarrow", "Leftrightarrow",
    "sin", "cos", "tan", "cot", "arcsin", "arccos", "arctan", "log", "ln", "lg", "exp",
    "begin", "end", "left", "right", "text", "quad", "qquad"
  ];
  const mathCmdPattern = new RegExp(`\\\\{2,}(${mathCommands.join("|")})${VN_CHAR_LOOKAHEAD}`, "g");
  text = text.replace(mathCmdPattern, "\\$1");

  // Replace unicode square roots with \sqrt
  text = text.replace(/∛\s*\{([^}]+)\}/g, "\\sqrt[3]{$1}");
  text = text.replace(/∛\s*\(([^)]+)\)/g, "\\sqrt[3]{$1}");
  text = text.replace(/∛\s*(\d+|[a-zA-Z])/g, "\\sqrt[3]{$1}");
  text = text.replace(/∜\s*\{([^}]+)\}/g, "\\sqrt[4]{$1}");
  text = text.replace(/∜\s*\(([^)]+)\)/g, "\\sqrt[4]{$1}");
  text = text.replace(/∜\s*(\d+|[a-zA-Z])/g, "\\sqrt[4]{$1}");
  text = text.replace(/√\s*\{([^}]+)\}/g, "\\sqrt{$1}");
  text = text.replace(/√\s*\(([^)]+)\)/g, "\\sqrt{$1}");
  text = text.replace(/√\s*(\d+|[a-zA-Z])/g, "\\sqrt{$1}");

  // Fix bare sqrt / frac syntax (including when preceded by digits, e.g. 2sqrt{3} or sqrt(2)):
  text = text.replace(/(?<![a-zA-Z\\])sqrt\s*\{/gi, "\\sqrt{");
  text = text.replace(/(?<![a-zA-Z\\])sqrt\s*\(([^)]+)\)/gi, "\\sqrt{$1}");
  text = text.replace(/\\sqrt\s*\(([^)]+)\)/gi, "\\sqrt{$1}");
  text = text.replace(/(?<![a-zA-Z\\])sqrt\s+([0-9a-zA-Z])\b/gi, "\\sqrt{$1}");
  text = text.replace(/\\sqrt\s+([0-9a-zA-Z])\b/gi, "\\sqrt{$1}");
  text = text.replace(/(?<![a-zA-Z\\])rac\s*\{/gi, "\\frac{");
  text = text.replace(/(?<![a-zA-Z\\])frac\s*\{/gi, "\\frac{");

  // 3. Fix unescaped math symbol words like "notin A", "times", "2times3"
  text = text.replace(/(^|[\s({[,=+\-*/])\s*notin\b/g, "$1 \\notin ");
  text = text.replace(/(^|[\s({[,=+\-*/])\s*times\b/g, "$1 \\times ");

  return text;
}

/**
 * Safely renders a LaTeX formula to KaTeX HTML without raw newlines in SVG path attributes.
 */
function safeKatexRender(tex: string, displayMode: boolean): string {
  const rendered = katex.renderToString(tex, {
    displayMode,
    throwOnError: false,
    strict: false,
  });
  // CRITICAL: KaTeX SVG <path d="..."> contains raw newlines (\n).
  // In SVG path syntax, space and newline are equivalent whitespace separators.
  // Replacing \n with space prevents downstream Markdown processors and <br/> replacements
  // from corrupting path d attributes into "M95,702<br/>c-2.7...".
  return rendered.replace(/\r?\n/g, " ");
}

/**
 * Safely renders LaTeX mathematical formulas inside any text string to KaTeX HTML.
 * When placeholderFn is provided, rendered HTML is shielded from downstream markdown/HTML processing.
 */
export function renderLatexInString(textToRender: string, placeholderFn?: (html: string) => string): string {
  if (!textToRender) return "";

  const wrap = (html: string) => (placeholderFn ? placeholderFn(html) : html);

  let str = textToRender;

  // 1. Block LaTeX environments: \begin{aligned}...\end{aligned}, \begin{cases}...\end{cases}, etc.
  str = str.replace(/\\begin\{(aligned|cases|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|array|tabular)\}([\s\S]*?)\\end\{\1\}/g, (fullMatch) => {
    try {
      const rendered = safeKatexRender(fullMatch.trim(), true);
      return wrap(`<div class="my-2 py-1 overflow-x-auto flex justify-center katex-block">${rendered}</div>`);
    } catch {
      return fullMatch;
    }
  });

  // 2. Block math: $$...$$ or \[...\]
  str = str.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    try {
      const rendered = safeKatexRender(math.trim(), true);
      return wrap(`<div class="my-2 py-1 overflow-x-auto flex justify-center katex-block">${rendered}</div>`);
    } catch (e) {
      return `<span class="text-red-500 font-mono text-xs">[Lỗi công thức: ${escapeHtml(math)}]</span>`;
    }
  });

  str = str.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
    try {
      const rendered = safeKatexRender(math.trim(), true);
      return wrap(`<div class="my-2 py-1 overflow-x-auto flex justify-center katex-block">${rendered}</div>`);
    } catch (e) {
      return `<span class="text-red-500 font-mono text-xs">[Lỗi công thức: ${escapeHtml(math)}]</span>`;
    }
  });

  // 3. Inline math: \(...\)
  str = str.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => {
    try {
      const rendered = safeKatexRender(math.trim(), false);
      return wrap(`<span class="inline-katex mx-0.5">${rendered}</span>`);
    } catch (e) {
      return `<span class="text-red-500 font-mono text-xs">$${escapeHtml(math)}$</span>`;
    }
  });

  // 4. Inline math: $...$ (handles exponents $x^2$, fractions $\frac{a}{b}$, subscripts $a_1$, etc.)
  // Matches $...$, skipping escaped \$
  str = str.replace(/(^|[^\\])\$([^\$]+?)\$/g, (match, prefix, math) => {
    try {
      const rendered = safeKatexRender(math.trim(), false);
      return `${prefix}${wrap(`<span class="inline-katex mx-0.5">${rendered}</span>`)}`;
    } catch (e) {
      return `${prefix}<span class="text-red-500 font-mono text-xs">$${escapeHtml(math)}$</span>`;
    }
  });

  // 5. Undelimited mathematical fractions: \frac{...}{...}, \dfrac{...}{...}, y = \frac{...}{...} (deep nested brace support)
  const fracRegex = /((?:[a-zA-Z](?:\([a-zA-Z0-9]+\))?\s*=\s*)?\\(?:d|t|c)?frac\s*\{([^{}]*(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}[^{}]*)*)\}\s*\{([^{}]*(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}[^{}]*)*)\})/g;
  str = str.replace(fracRegex, (fullMatch) => {
    try {
      const rendered = safeKatexRender(fullMatch.trim(), false);
      return wrap(`<span class="inline-katex mx-0.5">${rendered}</span>`);
    } catch {
      return fullMatch;
    }
  });

  // 6. Undelimited roots: \sqrt[...]{...} or \sqrt{...} with coefficients (e.g. 2\sqrt{3}, a\sqrt{2}) & deep nested brace support
  const sqrtRegex = /((?:[-+]?\s*(?:[0-9a-zA-Z]+|[a-zA-Z]\s*=\s*))?\\sqrt(?:\[[^\]]*\])?\{([^{}]*(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}[^{}]*)*)\})/g;
  str = str.replace(sqrtRegex, (fullMatch) => {
    try {
      const rendered = safeKatexRender(fullMatch.trim(), false);
      return wrap(`<span class="inline-katex mx-0.5">${rendered}</span>`);
    } catch {
      return fullMatch;
    }
  });

  // 7. Undelimited common LaTeX symbols and commands
  const commonLatexRegex = /(\\(?:vec|bar|hat|overline|underline)\s*\{[^{}]*\}|\\(?:int|sum|prod|lim)(?:_\{[^{}]*\}|_[\w\d])?(?:\^\{[^{}]*\}|\^[\w\d])?|\\(?:alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|vartheta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega|pm|mp|times|div|cdot|cap|cup|subset|supset|subseteq|supseteq|in|notin|ni|forall|exists|nexists|le|ge|leq|geq|neq|approx|equiv|sim|cong|propto|infty|nabla|partial|degree|perp|parallel|angle|triangle|rightarrow|to|leftarrow|leftrightarrow|Rightarrow|Leftarrow|Leftrightarrow|sin|cos|tan|cot|arcsin|arccos|arctan|log|ln|lg|exp)\b)/g;
  str = str.replace(commonLatexRegex, (fullMatch) => {
    try {
      const rendered = safeKatexRender(fullMatch.trim(), false);
      return wrap(`<span class="inline-katex mx-0.5">${rendered}</span>`);
    } catch {
      return fullMatch;
    }
  });

  return str;
}

/**
 * Safely escapes bare '<' and '>' characters that are not valid HTML tags
 * to prevent math comparisons like 'x < 5' or 'a > b' from corrupting HTML,
 * while fully preserving all valid HTML5 elements, attributes, tables, and formatting.
 */
function escapeUnmatchedAngleBrackets(text: string): string {
  if (!text) return "";
  const validTagNames = [
    "div", "span", "p", "br", "hr", "strong", "b", "em", "i", "u", "del", "s", "strike",
    "code", "pre", "blockquote", "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "dl", "dt", "dd",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
    "details", "summary", "mark", "a", "img", "svg", "path", "circle", "rect", "line",
    "polyline", "polygon", "text", "g", "defs", "clippath", "sub", "sup", "small", "big",
    "font", "center", "kbd", "var", "samp", "abbr", "section", "article", "aside",
    "figure", "figcaption", "header", "footer", "nav", "main", "video", "audio", "source", "canvas",
    "graph", "bbt", "live-canvas"
  ];
  const tagPattern = new RegExp(`<\\/?(${validTagNames.join("|")})\\b(?:[^<>"']|"[^"]*"|'[^']*')*\\/?>`, "gi");

  const tags: string[] = [];
  const protectedText = text.replace(tagPattern, (match) => {
    tags.push(match);
    return `\uE002TAG${tags.length - 1}\uE003`;
  });

  let escaped = protectedText
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped.replace(/\uE002TAG(\d+)\uE003/g, (_, idx) => tags[parseInt(idx, 10)]);
}

function renderCellContent(content: string): string {
  if (!content) return "";
  let cell = renderLatexInString(content.trim());
  // Safely escape bare angle brackets (e.g. x < 5 or n > 10) inside table cells so they don't break HTML tags
  cell = escapeUnmatchedAngleBrackets(cell);
  // Inline bold
  cell = cell.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  // Inline italic
  cell = cell.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
  // Inline code
  cell = cell.replace(/`([^`\n]+)`/g, '<code class="px-1.5 py-0.5 mx-0.5 bg-slate-100/90 text-pink-600 font-mono text-[12px] font-semibold rounded-md border border-slate-200/80 shadow-2xs">$1</code>');
  return cell;
}

export interface RawBlockToken {
  id: string;
  content: string;
}

/**
 * Extracts fenced code block into lang and raw content,
 * supporting both multiline ```lang\n...``` and single-line ```lang ...```.
 */
export function parseFencedCodeBlock(blockContent: string): { lang: string; code: string } {
  let rawContent = blockContent;
  let lang = "";

  const firstNewlineIdx = rawContent.indexOf("\n");
  if (firstNewlineIdx !== -1) {
    const firstLine = rawContent.slice(0, firstNewlineIdx).trim();
    if (/^[a-zA-Z0-9_#+.-]{1,25}$/.test(firstLine)) {
      lang = firstLine;
      rawContent = rawContent.slice(firstNewlineIdx + 1);
    }
  } else {
    const parts = rawContent.trim().match(/^([a-zA-Z0-9_#+.-]{1,15})\s+([\s\S]+)$/);
    if (
      parts &&
      /^(py|python|js|javascript|ts|typescript|cpp|c\+\+|cs|c#|csharp|java|pascal|pas|sql|html|css|json|bash|sh|xml|yaml|yml|md|text|txt|latex|tex)$/i.test(
        parts[1]
      )
    ) {
      lang = parts[1];
      rawContent = parts[2];
    }
  }

  return { lang, code: rawContent };
}

/**
 * Robust tokenizer/state machine that extracts <raw>...</raw> blocks
 * before any normalization, Markdown, LaTeX, or HTML parsing occurs.
 */
export function extractRawBlocks(input: string): {
  text: string;
  rawBlocks: RawBlockToken[];
} {
  if (!input) return { text: "", rawBlocks: [] };

  // Support legacy $&raw{...}&$ or &raw{...} syntax by converting to <raw>...</raw>
  let source = input;
  if (source.includes("&raw{")) {
    source = source.replace(/(?:\$)?&raw\{([\s\S]*?)\}(?:\$)?/g, "<raw>$1</raw>");
  }

  const rawBlocks: RawBlockToken[] = [];
  let result = "";
  let i = 0;
  const len = source.length;

  while (i < len) {
    // Check if source starting at i is <raw> (case-insensitive, optional whitespace before '>')
    const rawMatch = source.slice(i).match(/^<raw\s*>/i);
    if (rawMatch) {
      const openTagLen = rawMatch[0].length;
      const contentStart = i + openTagLen;

      // Scan forward for matching </raw\s*>
      // Must ignore </raw> when inside backticks (fenced code or inline code)
      let j = contentStart;
      let matchingCloseStart = -1;
      let matchingCloseEnd = -1;

      while (j < len) {
        // Fenced code block: ``` or ~~~
        if (source.startsWith("```", j) || source.startsWith("~~~", j)) {
          const fence = source.slice(j, j + 3);
          j += 3;
          const closeFenceIdx = source.indexOf(fence, j);
          if (closeFenceIdx !== -1) {
            j = closeFenceIdx + 3;
          } else {
            j = len;
          }
          continue;
        }

        // Inline backtick: `
        if (source[j] === "`") {
          j++;
          const closeTickIdx = source.indexOf("`", j);
          if (closeTickIdx !== -1) {
            j = closeTickIdx + 1;
          } else {
            j = len;
          }
          continue;
        }

        // Closing </raw>
        const closeMatch = source.slice(j).match(/^<\/raw\s*>/i);
        if (closeMatch) {
          matchingCloseStart = j;
          matchingCloseEnd = j + closeMatch[0].length;
          break;
        }

        j++;
      }

      if (matchingCloseStart !== -1) {
        const rawContent = source.slice(contentStart, matchingCloseStart);
        const blockId = `\uE008RAW_${rawBlocks.length}\uE009`;
        rawBlocks.push({ id: blockId, content: rawContent });
        result += blockId;
        i = matchingCloseEnd;
        continue;
      }
    }

    result += source[i];
    i++;
  }

  return { text: result, rawBlocks };
}

/**
 * Dedicated renderer for RAW block content.
 * Disables automatic Markdown/HTML/LaTeX interpretation.
 * Only processes:
 * 1. Fenced code blocks (``` or ~~~)
 * 2. Inline backtick code (`...`)
 * 3. Preserves all other text as literal content (safe from HTML execution / KaTeX transformation).
 */
export function renderRawBlockContent(
  rawContent: string,
  options?: { forWord?: boolean }
): string {
  if (!rawContent) return "";

  let i = 0;
  const len = rawContent.length;
  let htmlResult = "";

  while (i < len) {
    // 1. Check for fenced code block: ``` or ~~~
    if (rawContent.startsWith("```", i) || rawContent.startsWith("~~~", i)) {
      const fence = rawContent.slice(i, i + 3);
      const startFence = i + 3;
      const endFence = rawContent.indexOf(fence, startFence);
      if (endFence !== -1) {
        const blockContent = rawContent.slice(startFence, endFence);
        const { lang, code } = parseFencedCodeBlock(blockContent);

        if (options?.forWord) {
          const clean = code.replace(/\r\n/g, "\n").trim();
          const langHeader = lang
            ? `<div style="font-size: 8pt; font-weight: bold; color: #94a3b8; border-bottom: 1px solid #334155; padding-bottom: 4pt; margin-bottom: 6pt; letter-spacing: 0.5pt;">${lang.toUpperCase()}</div>`
            : "";
          htmlResult += `<div style="background-color: #1e293b; color: #f8fafc; font-family: Consolas, 'Courier New', monospace; font-size: 9pt; padding: 8pt 10pt; border-radius: 6pt; margin: 8pt 0; border: 1px solid #334155; line-height: 1.45; white-space: pre-wrap;">${langHeader}${escapeHtml(clean)}</div>`;
        } else {
          htmlResult += renderDiscordCodeBlock(code, lang);
        }

        i = endFence + 3;
        continue;
      }
    }

    // 2. Check for inline backtick: `
    if (rawContent[i] === "`") {
      const endTick = rawContent.indexOf("`", i + 1);
      if (endTick !== -1) {
        const codeText = rawContent.slice(i + 1, endTick);
        if (options?.forWord) {
          htmlResult += `<code style="background-color: #f1f5f9; color: #db2777; padding: 2pt 4pt; border-radius: 3pt; font-family: Consolas, monospace; font-size: 9pt; border: 1px solid #e2e8f0;">${escapeHtml(codeText)}</code>`;
        } else {
          htmlResult += `<code class="px-1.5 py-0.5 mx-0.5 bg-slate-100/90 text-pink-600 font-mono text-[12px] font-semibold rounded-md border border-slate-200/80 shadow-2xs">${escapeHtml(codeText)}</code>`;
        }
        i = endTick + 1;
        continue;
      }
    }

    // 3. Literal text: scan until next fence or backtick
    let literalEnd = i;
    while (
      literalEnd < len &&
      !rawContent.startsWith("```", literalEnd) &&
      !rawContent.startsWith("~~~", literalEnd) &&
      rawContent[literalEnd] !== "`"
    ) {
      literalEnd++;
    }

    const literalSegment = rawContent.slice(i, literalEnd);
    if (literalSegment) {
      htmlResult += `<span class="dk-raw-text" style="white-space: pre-wrap;">${escapeHtml(literalSegment)}</span>`;
    }
    i = literalEnd;
  }

  return htmlResult;
}

/**
 * Generates the HTML container for a Live Canvas block to be initialized in DOM.
 */
export function renderLiveCanvasHtml(
  code: string,
  width = 500,
  height = 340,
  title?: string
): string {
  const cleanCode = decodeHtmlEntities(code).trim();
  const safeTitle = escapeHtml(title || "Khối Code Trực Tiếp (Live Canvas)");
  return `<div class="dk-live-canvas-block my-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs max-w-full overflow-hidden select-none">
  <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 px-1">
    <div class="flex items-center gap-2">
      <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
      <span class="text-xs font-bold text-slate-800">${safeTitle}</span>
    </div>
    <div class="flex items-center gap-1">
      <button type="button" class="dk-canvas-btn-code px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer">Xem code</button>
      <button type="button" class="dk-canvas-btn-rerun px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer">Chạy lại</button>
      <button type="button" class="dk-canvas-btn-download p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer" title="Tải ảnh PNG">
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
      </button>
    </div>
  </div>
  <div class="flex justify-center overflow-x-auto bg-slate-50/50 rounded-xl p-2">
    <canvas class="dk-live-canvas rounded-lg shadow-2xs bg-white" data-code="${safeEncode(cleanCode)}" data-width="${width}" data-height="${height}" style="max-width: 100%; height: auto; display: block; margin: 0 auto;"></canvas>
  </div>
  <div class="dk-live-code-view hidden mt-3 relative rounded-xl bg-slate-900 p-3 text-slate-100 font-mono text-xs">
    <pre class="overflow-x-auto">${escapeHtml(cleanCode)}</pre>
  </div>
</div>`;
}

export interface HtmlWidgetToken {
  id: string;
  code: string;
  height: number;
  title: string;
}

/**
 * Robust extractor for interactive HTML widgets with CSS and JavaScript.
 * Supports:
 * 1. <html-widget>...</html-widget>, <widget>...</widget>, <live-html>...</live-html>
 * 2. <live-canvas>...</live-canvas> when containing HTML/CSS/JS
 * 3. Fenced code blocks ```html, ```widget, ```simulation, ```canvas containing HTML/scripts/styles
 * 4. Raw standalone HTML documents (<!DOCTYPE html>... or <html...>...) even if unclosed
 * 5. Direct raw HTML blocks containing <style> and <script> tags
 */
export function extractHtmlWidgets(input: string): {
  text: string;
  htmlWidgets: HtmlWidgetToken[];
} {
  if (!input) return { text: "", htmlWidgets: [] };

  const htmlWidgets: HtmlWidgetToken[] = [];
  let text = input;

  // 1. Explicit <html-widget>, <widget>, <live-html> tags
  text = text.replace(/<(html-widget|widget|live-html)\b([^>]*)>([\s\S]*?)<\/\1>/gi, (_, tag, attrs, content) => {
    const heightMatch = attrs.match(/height="?(\d+)"?/i);
    const titleMatch = attrs.match(/title="([^"]*)"/i);
    const height = heightMatch ? parseInt(heightMatch[1], 10) : 380;
    const title = titleMatch ? titleMatch[1] : "Khối mô phỏng HTML5 / JavaScript";
    const placeholder = `\uE00AHW_${htmlWidgets.length}\uE00B`;
    htmlWidgets.push({ id: placeholder, code: content.trim(), height, title });
    return placeholder;
  });

  // 2. <live-canvas> tags that actually contain HTML code (CSS, JS, or DOM tags)
  text = text.replace(/<live-canvas\b((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/live-canvas>/gi, (match, attrs, code) => {
    const isHtml = /(?:<!DOCTYPE\s+html|<\/?(?:html|head|body|style|script)\b|<\/(?:div|span|p|button|canvas|svg)>)/i.test(code);
    if (isHtml) {
      const heightMatch = attrs.match(/height=(?:"(\d+)"|'(\d+)'|(\d+))/i);
      const titleMatch = attrs.match(/title=(?:"([^"]*)"|'([^']*)')/i);
      const height = heightMatch ? parseInt(heightMatch[1] || heightMatch[2] || heightMatch[3], 10) : 380;
      const title = titleMatch ? (titleMatch[1] ?? titleMatch[2]) : "Khối mô phỏng HTML5 / JavaScript";
      const placeholder = `\uE00AHW_${htmlWidgets.length}\uE00B`;
      htmlWidgets.push({ id: placeholder, code: code.trim(), height, title });
      return placeholder;
    }
    return match;
  });

  // 3. Fenced code blocks ```html, ```widget, ```simulation, ```canvas-html containing interactive elements
  text = text.replace(/(?:```|~~~)(?:html|widget|simulation|canvas-html)\b([^\n]*)\r?\n([\s\S]*?)(?:```|~~~)/gi, (match, headerAttrs, code) => {
    const isInteractive = /(?:<!DOCTYPE\s+html|<\/?(?:html|head|body|style|script)\b|<\/(?:div|span|p|button|canvas|svg)>)/i.test(code);
    if (isInteractive) {
      const titleMatch = headerAttrs.match(/title="([^"]*)"/i);
      const heightMatch = headerAttrs.match(/height="?(\d+)"?/i);
      const title = titleMatch ? titleMatch[1] : "Khối mô phỏng HTML tương tác";
      const height = heightMatch ? parseInt(heightMatch[1], 10) : 380;
      const placeholder = `\uE00AHW_${htmlWidgets.length}\uE00B`;
      htmlWidgets.push({ id: placeholder, code: code.trim(), height, title });
      return placeholder;
    }
    return match;
  });

  // 4. Raw full HTML documents: <!DOCTYPE html>... or <html...>... (even if unclosed)
  text = text.replace(/(<!DOCTYPE\s+html[\s\S]*?(?:<\/html>|$)|<html\b[\s\S]*?(?:<\/html>|$))/gi, (match) => {
    const placeholder = `\uE00AHW_${htmlWidgets.length}\uE00B`;
    htmlWidgets.push({
      id: placeholder,
      code: match.trim(),
      height: 420,
      title: "Ứng dụng mô phỏng HTML5 / Canvas",
    });
    return placeholder;
  });

  // 5. Directly pasted raw HTML chunks containing <style> and/or <script>
  text = text.replace(/(?:<style\b[\s\S]*?<\/style>[\s\S]*?<script\b[\s\S]*?<\/script>|<script\b[\s\S]*?<\/script>[\s\S]*?<style\b[\s\S]*?<\/style>|<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>)/gi, (match) => {
    const placeholder = `\uE00AHW_${htmlWidgets.length}\uE00B`;
    htmlWidgets.push({
      id: placeholder,
      code: match.trim(),
      height: 380,
      title: "Khối mã mô phỏng trực tiếp",
    });
    return placeholder;
  });

  return { text, htmlWidgets };
}

/**
 * Generates the HTML container for an Interactive HTML Widget block to be initialized in DOM.
 */
export function renderHtmlWidgetHtml(
  code: string,
  height = 380,
  title = "Khối mô phỏng HTML5 / JavaScript"
): string {
  const cleanCode = code.trim();
  const safeTitle = escapeHtml(title || "Khối mô phỏng HTML5 / JavaScript");
  const widgetId = "dk-hw-" + Math.random().toString(36).substring(2, 9);

  return `<div class="dk-html-widget-block my-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs max-w-full overflow-hidden select-none" data-widget-id="${widgetId}" data-html="${safeEncode(cleanCode)}" data-height="${height}" data-title="${safeEncode(title)}">
  <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 px-1">
    <div class="flex items-center gap-2">
      <span class="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
      <span class="text-xs font-bold text-slate-800">${safeTitle}</span>
      <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">HTML5 / JS</span>
    </div>
    <div class="flex items-center gap-1">
      <button type="button" class="dk-widget-btn-code px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer">Xem code</button>
      <button type="button" class="dk-widget-btn-reload px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer">Tải lại</button>
      <button type="button" class="dk-widget-btn-fullscreen p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer" title="Toàn màn hình">
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
      </button>
    </div>
  </div>
  <div class="dk-widget-iframe-container relative w-full overflow-hidden rounded-xl border border-slate-100 bg-white" style="min-height: ${height}px;">
    <!-- Sandboxed responsive iframe is mounted dynamically here -->
  </div>
  <div class="dk-widget-code-view hidden mt-3 relative rounded-xl bg-slate-900 p-3 text-slate-100 font-mono text-xs border border-slate-800">
    <div class="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800 text-[10px] text-slate-400">
      <span>MÃ NGUỒN HTML / CSS / JS</span>
      <button type="button" class="dk-copy-code-btn px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors" data-code="${safeEncode(cleanCode)}">
        <span class="dk-copy-label">Sao chép</span>
      </button>
    </div>
    <pre class="overflow-x-auto max-h-60 leading-relaxed">${escapeHtml(cleanCode)}</pre>
  </div>
</div>`;
}

/**
 * Mounts sandboxed responsive iframes into all .dk-html-widget-block elements in container.
 */
export function mountHtmlWidgets(container: HTMLElement) {
  const widgetBlocks = container.querySelectorAll(".dk-html-widget-block");
  widgetBlocks.forEach((blockEl) => {
    const block = blockEl as HTMLElement;
    const iframeContainer = block.querySelector(".dk-widget-iframe-container");
    if (!iframeContainer) return;
    if (iframeContainer.querySelector("iframe")) return;

    const rawEncoded = block.getAttribute("data-html");
    if (!rawEncoded) return;
    const rawHtml = safeDecode(rawEncoded);
    const height = parseInt(block.getAttribute("data-height") || "380", 10);
    const widgetId = block.getAttribute("data-widget-id") || ("dk-hw-" + Math.random().toString(36).substring(2, 9));

    let fullHtml = rawHtml;
    const hasDoctypeOrHtml = /<!DOCTYPE\b|<html\b/i.test(rawHtml);
    if (!hasDoctypeOrHtml) {
      fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 12px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; overflow-x: hidden; }
  </style>
</head>
<body>
  ${rawHtml}
</body>
</html>`;
    } else {
      // Ensure UTF-8 meta charset exists for pristine Vietnamese text rendering
      if (!/<meta\s+charset/i.test(fullHtml)) {
        fullHtml = fullHtml.replace(/<head\b[^>]*>/i, (m) => `${m}\n  <meta charset="utf-8">`);
      }
      // Ensure closing html tag if missing
      if (!/<\/html>/i.test(fullHtml)) {
        fullHtml += "\n</html>";
      }
    }

    const autoResizeScript = `
<script>
  (function() {
    function notifyHeight() {
      try {
        var h = Math.max(
          document.body ? document.body.scrollHeight : 0,
          document.documentElement ? document.documentElement.scrollHeight : 0,
          document.body ? document.body.offsetHeight : 0
        );
        if (h > 60 && window.parent) {
          window.parent.postMessage({ type: 'dk-widget-resize', id: '${widgetId}', height: h }, '*');
        }
      } catch(e) {}
    }
    window.addEventListener('load', notifyHeight);
    window.addEventListener('resize', notifyHeight);
    if (window.ResizeObserver && document.body) {
      new ResizeObserver(notifyHeight).observe(document.body);
    }
    setTimeout(notifyHeight, 200);
    setTimeout(notifyHeight, 800);
    setTimeout(notifyHeight, 2500);
  })();
</script>`;

    let finalHtml = fullHtml;
    if (/<\/body>/i.test(finalHtml)) {
      finalHtml = finalHtml.replace(/<\/body>/i, `${autoResizeScript}</body>`);
    } else {
      finalHtml += autoResizeScript;
    }

    const iframe = document.createElement("iframe");
    iframe.sandbox.add("allow-scripts", "allow-modals", "allow-forms", "allow-popups");
    iframe.className = "w-full border-0 block rounded-xl";
    iframe.style.width = "100%";
    iframe.style.height = `${height}px`;
    iframe.style.minHeight = `${Math.min(height, 200)}px`;
    iframe.setAttribute("data-widget-target-id", widgetId);
    iframe.srcdoc = finalHtml;

    iframeContainer.appendChild(iframe);
  });
}

/**
 * Main markdown with LaTeX and rich HTML parser.
 */
export function renderMarkdownWithLatex(rawText: string): string {
  if (!rawText) return "";

  // 0. Extract and protect RAW blocks FIRST using tokenizer state machine
  const { text: textWithoutRaw, rawBlocks } = extractRawBlocks(rawText);

  // 0.05 Extract and protect interactive HTML widgets (keeps them safe from KaTeX, math $, and sanitization!)
  const { text: textWithoutWidgets, htmlWidgets } = extractHtmlWidgets(textWithoutRaw);

  const placeholders: { [key: string]: string } = {};
  let tokenCounter = 0;

  const createPlaceholder = (replacementHtml: string): string => {
    const key = `\uE000PCH${tokenCounter++}\uE001`;
    placeholders[key] = replacementHtml;
    return key;
  };

  let text = textWithoutWidgets;

  // 0.1 Custom Math Visualization Tags (extracted BEFORE normalizeLatexText so code is never mangled): <graph>, <bbt>, <live-canvas>
  text = text.replace(/<graph\b[^>]*>([\s\S]*?)<\/graph>/gi, (_, graphCode) => {
    try {
      const svg = renderGraphToSvg(graphCode);
      return createPlaceholder(svg);
    } catch (e) {
      return createPlaceholder(`<div class="p-2 text-xs text-red-500 font-mono">Lỗi đồ thị: ${escapeHtml(String(e))}</div>`);
    }
  });

  text = text.replace(/<bbt\b[^>]*>([\s\S]*?)<\/bbt>/gi, (_, bbtCode) => {
    try {
      const bbtHtml = renderBBTToHtml(bbtCode);
      return createPlaceholder(bbtHtml);
    } catch (e) {
      return createPlaceholder(`<div class="p-2 text-xs text-red-500 font-mono">Lỗi bảng biến thiên: ${escapeHtml(String(e))}</div>`);
    }
  });

  text = text.replace(/<live-canvas\b((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/live-canvas>/gi, (_, attrs, code) => {
    const widthMatch = attrs.match(/width=(?:"(\d+)"|'(\d+)'|(\d+))/i);
    const heightMatch = attrs.match(/height=(?:"(\d+)"|'(\d+)'|(\d+))/i);
    const titleMatch = attrs.match(/title=(?:"([^"]*)"|'([^']*)')/i);
    const width = widthMatch ? parseInt(widthMatch[1] || widthMatch[2] || widthMatch[3], 10) : 500;
    const height = heightMatch ? parseInt(heightMatch[1] || heightMatch[2] || heightMatch[3], 10) : 340;
    const title = titleMatch ? (titleMatch[1] ?? titleMatch[2]) : undefined;
    return createPlaceholder(renderLiveCanvasHtml(code, width, height, title));
  });

  // 1. Code blocks: ```lang ... ``` or ~~~lang ... ~~~ (Discord style & Math blocks)
  // Extract and protect BEFORE normalizeLatexText so code snippets (JS, Python, C++, Math.sqrt, etc.) are never mangled by LaTeX math replacers!
  text = text.replace(/(?:```|~~~)([\s\S]*?)(?:```|~~~)/g, (_, blockContent) => {
    const { lang, code } = parseFencedCodeBlock(blockContent);
    const l = (lang || "").toLowerCase();
    if (l === "graph") {
      try {
        return createPlaceholder(renderGraphToSvg(code));
      } catch (e) {
        return createPlaceholder(`<div class="p-2 text-xs text-red-500 font-mono">Lỗi đồ thị: ${escapeHtml(String(e))}</div>`);
      }
    }
    if (l === "bbt") {
      try {
        return createPlaceholder(renderBBTToHtml(code));
      } catch (e) {
        return createPlaceholder(`<div class="p-2 text-xs text-red-500 font-mono">Lỗi bảng biến thiên: ${escapeHtml(String(e))}</div>`);
      }
    }
    if (l === "canvas" || l === "live-code" || l === "live-canvas") {
      return createPlaceholder(renderLiveCanvasHtml(code));
    }
    const discordHtml = renderDiscordCodeBlock(code, lang);
    return createPlaceholder(discordHtml);
  });

  // 1.5 Safely normalize LaTeX in the remaining Markdown and mathematical text:
  text = normalizeLatexText(text);

  // 2. Process HTML tables: <table ...>...</table>
  // Auto-close dangling <table> tags if truncated or missing in AI stream
  const openTableMatches = (text.match(/<table\b/gi) || []).length;
  const closeTableMatches = (text.match(/<\/table>/gi) || []).length;
  if (openTableMatches > closeTableMatches) {
    text += "</table>".repeat(openTableMatches - closeTableMatches);
  }

  // Parse any LaTeX and inline formatting inside table cells (th, td, caption)
  text = text.replace(/<table([\s\S]*?)<\/table>/gi, (fullTable) => {
    let processedTable = fullTable.replace(/<(th|td|caption)([\s\S]*?)>([\s\S]*?)<\/\1>/gi, (match, tag, attrs, cellInner) => {
      const safeCellInner = escapeUnmatchedAngleBrackets(cellInner);
      const renderedInner = renderLatexInString(safeCellInner, createPlaceholder);
      let cellAttrs = attrs;
      if (!cellAttrs.includes("class=")) {
        if (tag.toLowerCase() === "th") {
          cellAttrs += ' class="px-3.5 py-2.5 text-left border border-slate-200 bg-slate-100/90 text-slate-900 font-bold text-xs"';
        } else {
          cellAttrs += ' class="px-3.5 py-2 border border-slate-200 text-slate-800 text-xs"';
        }
      }
      return `<${tag}${cellAttrs}>${renderedInner}</${tag}>`;
    });

    if (!processedTable.includes("class=")) {
      processedTable = processedTable.replace(
        /<table/i,
        '<table class="min-w-full divide-y divide-slate-200 text-xs text-slate-800 border-collapse border border-slate-300 rounded-lg overflow-hidden my-1 bg-white"'
      );
    } else {
      processedTable = processedTable.replace(/<table\b([^>]*)class="([^"]*)"/i, (m, pre, cls) => {
        const enhancedCls = cls.includes("min-w-") ? cls : `min-w-full border-collapse ${cls}`;
        return `<table${pre}class="${enhancedCls}"`;
      });
    }

    return createPlaceholder(
      `<div class="table-responsive-wrapper overflow-x-auto my-3 max-w-full shadow-2xs rounded-xl border border-slate-200 bg-white">${processedTable}</div>`
    );
  });

  // 3. Process Markdown tables: | col1 | col2 | ...
  // Protect inline math inside table blocks so '|' inside math expressions ($|x|$) doesn't break columns
  if (!text.endsWith("\n")) {
    text += "\n";
  }
  const mdTableRegex = /((?:^[ \t]*\|[^\n]+\|[ \t]*(?:\r?\n|$)){2,})/gm;
  text = text.replace(mdTableRegex, (mdTable) => {
    // Mask LaTeX math blocks before splitting by '|'
    const tableMathMasks: string[] = [];
    const protectedMdTable = mdTable.replace(/\$(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|[^\$\n\r]+?)\$/g, (m) => {
      tableMathMasks.push(m);
      return `\uE004MATH${tableMathMasks.length - 1}\uE005`;
    });

    const lines = protectedMdTable.trim().split(/\r?\n/).map((l) => l.trim());
    if (lines.length < 2) return mdTable;

    // Alignments from separator
    const alignments: Array<"left" | "center" | "right"> = [];
    if (lines.length >= 2) {
      const sepParts = lines[1].split("|").slice(1, -1).map((s) => s.trim());
      sepParts.forEach((s) => {
        const leftColon = s.startsWith(":");
        const rightColon = s.endsWith(":");
        if (leftColon && rightColon) alignments.push("center");
        else if (rightColon) alignments.push("right");
        else alignments.push("left");
      });
    }

    let tableHtml = '<div class="table-responsive-wrapper overflow-x-auto my-3 max-w-full shadow-2xs rounded-xl border border-slate-200 bg-white"><table class="min-w-full divide-y divide-slate-200 text-xs text-slate-800 border-collapse">';

    const restoreMath = (cellStr: string) =>
      cellStr.replace(/\uE004MATH(\d+)\uE005/g, (_, idx) => tableMathMasks[parseInt(idx, 10)]);

    // Header row
    const headerCols = lines[0].split("|").slice(1, -1).map((c) => restoreMath(c.trim()));
    tableHtml += '<thead class="bg-slate-100/90 font-bold"><tr>';
    headerCols.forEach((col, idx) => {
      const align = alignments[idx] || "left";
      const alignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
      const formattedCol = renderCellContent(col);
      tableHtml += `<th class="px-3.5 py-2.5 ${alignClass} border border-slate-200 text-slate-900 font-bold">${formattedCol}</th>`;
    });
    tableHtml += "</tr></thead><tbody class=\"divide-y divide-slate-100\">";

    // Body rows
    for (let i = 2; i < lines.length; i++) {
      const rowCols = lines[i].split("|").slice(1, -1).map((c) => restoreMath(c.trim()));
      if (rowCols.length === 0 || rowCols.every((c) => !c)) continue;

      const rowBg = (i - 2) % 2 === 0 ? "bg-white" : "bg-slate-50/60";
      tableHtml += `<tr class="${rowBg} hover:bg-indigo-50/30 transition-colors">`;
      rowCols.forEach((col, idx) => {
        const align = alignments[idx] || "left";
        const alignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
        const formattedCol = renderCellContent(col);
        tableHtml += `<td class="px-3.5 py-2 ${alignClass} border border-slate-200 text-slate-700 font-medium">${formattedCol}</td>`;
      });
      tableHtml += "</tr>";
    }
    tableHtml += "</tbody></table></div>";

    return createPlaceholder(tableHtml);
  });

  // 4. Extract and Render all LaTeX expressions safely into placeholders
  text = renderLatexInString(text, createPlaceholder);

  // 5. Extract markdown images ![alt](url)
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    return createPlaceholder(
      `<span class="inline-block my-2 max-w-full"><img src="${escapeHtml(url.trim())}" alt="${escapeHtml(
        alt
      )}" class="max-w-full max-h-96 rounded-xl border border-slate-200 shadow-sm mx-auto object-contain" /></span>`
    );
  });

  // 6. Extract markdown links [title](url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, title, url) => {
    return createPlaceholder(
      `<a href="${escapeHtml(url.trim())}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:text-indigo-800 underline font-semibold transition-colors">${escapeHtml(title)}</a>`
    );
  });

  // 7. Markdown Headings (# h1, ## h2, ### h3, #### h4)
  text = text.replace(/^####[ \t]+([^\n]+)$/gm, '<h5 class="text-xs font-bold text-slate-800 mt-3 mb-1.5">$1</h5>');
  text = text.replace(/^###[ \t]+([^\n]+)$/gm, '<h4 class="text-sm font-bold text-slate-900 mt-3.5 mb-2 flex items-center gap-1.5"><span class="w-1.5 h-3.5 bg-indigo-600 rounded-full inline-block"></span>$1</h4>');
  text = text.replace(/^##[ \t]+([^\n]+)$/gm, '<h3 class="text-base font-extrabold text-slate-900 mt-4 mb-2 pb-1 border-b border-slate-200">$1</h3>');
  text = text.replace(/^#[ \t]+([^\n]+)$/gm, '<h2 class="text-lg font-black text-slate-900 mt-4 mb-2.5 pb-1.5 border-b-2 border-indigo-500">$1</h2>');

  // 8. Markdown Blockquotes: > quote
  text = text.replace(/(?:^>[ \t]*([^\n]*)\n?)+/gm, (match) => {
    const cleanLines = match
      .split("\n")
      .map((l) => l.replace(/^>[ \t]?/, ""))
      .join("<br/>");
    return `<blockquote class="border-l-4 border-indigo-500 pl-3.5 py-2 my-2.5 bg-indigo-50/50 text-slate-700 italic rounded-r-xl text-xs sm:text-sm">${cleanLines}</blockquote>`;
  });

  // 9. Markdown Horizontal rules: --- or ***
  text = text.replace(/^(?:---|\*\*\*|___)[ \t]*$/gm, '<hr class="my-3 border-slate-200" />');

  // 10. Markdown Lists:
  // Bullet lists
  text = text.replace(/(?:^[ \t]*[-*+][ \t]+[^\n]+\n?)+/gm, (match) => {
    const items = match
      .trim()
      .split(/\n/)
      .map((l) => l.replace(/^[ \t]*[-*+][ \t]+/, "").trim())
      .filter(Boolean);
    const lis = items
      .map(
        (it) =>
          `<li class="flex items-start gap-2 text-xs sm:text-sm text-slate-700 my-1"><span class="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0"></span><div>${it}</div></li>`
      )
      .join("");
    return `<ul class="my-2 space-y-1 pl-1">${lis}</ul>`;
  });

  // Numbered lists
  text = text.replace(/(?:^[ \t]*\d+\.[ \t]+[^\n]+\n?)+/gm, (match) => {
    const items = match
      .trim()
      .split(/\n/)
      .map((l) => l.replace(/^[ \t]*\d+\.[ \t]+/, "").trim())
      .filter(Boolean);
    const lis = items
      .map(
        (it, idx) =>
          `<li class="flex items-start gap-2 text-xs sm:text-sm text-slate-700 my-1"><span class="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">${idx + 1}</span><div class="flex-1">${it}</div></li>`
      )
      .join("");
    return `<ol class="my-2 space-y-1.5 pl-0.5">${lis}</ol>`;
  });

  // 11. Markdown inline typography formatting
  // Bold: **text**
  text = text.replace(/\*\*([^*\n]+)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
  // Italic: *text* (requires non-whitespace inside asterisks, avoids consuming arithmetic multiplication like '2 * 3')
  text = text.replace(/(^|[\s(>])\*([^\s*][^*\n]*?[^\s*]|[^\s*])\*(?=[\s).,!?<:]|$)/g, '$1<em class="italic">$2</em>');
  // Underline: __text__
  text = text.replace(/__([^_\n]+)__/g, '<u class="underline underline-offset-2">$1</u>');
  // Strikethrough: ~~text~~
  text = text.replace(/~~([^~\n]+)~~/g, '<del class="line-through text-slate-400">$1</del>');
  // Subscript: ~text~ (single tilde)
  text = text.replace(/(?<!~)(~)([^~\n]+)(~)(?!~)/g, '<sub class="text-[0.8em] text-slate-700 font-medium">$2</sub>');
  // Superscript: ^text^
  text = text.replace(/\^([^\^\n]+)\^/g, '<sup class="text-[0.8em] text-slate-700 font-medium">$1</sup>');
  // Inline Code: `text`
  text = text.replace(/`([^`\n]+)`/g, '<code class="px-1.5 py-0.5 mx-0.5 bg-slate-100/90 text-pink-600 font-mono text-[12px] font-semibold rounded-md border border-slate-200/80 shadow-2xs">$1</code>');

  // Fill in the blank: [_] or [blank]
  text = text.replace(/\[_\]|\[blank\]/gi, '<span class="dk-blank-slot inline-block px-2.5 py-0.5 mx-1 font-mono font-bold text-indigo-600 bg-indigo-50/70 border-b-2 border-indigo-400 rounded min-w-[55px] text-center shadow-2xs select-none tracking-widest align-middle">_____</span>');

  // 12. Escape bare angle brackets (e.g. x < 5) to prevent HTML corruption
  text = escapeUnmatchedAngleBrackets(text);

  // 13. Convert standard linebreaks
  text = text.replace(/\n\n+/g, '<div class="my-2"></div>');
  text = text.replace(/\n/g, "<br/>");

  // 14. Sanitize harmful scripts while preserving safe HTML structure & classes
  text = sanitizeHarmfulHtml(text);

  // 14. Restore all placeholders safely (resolves nested placeholders e.g. math inside table cells)
  let hasPlaceholder = true;
  let iterations = 0;
  while (hasPlaceholder && iterations < 5) {
    hasPlaceholder = false;
    iterations++;
    for (const [key, replacement] of Object.entries(placeholders)) {
      if (text.includes(key)) {
        text = text.split(key).join(replacement);
        hasPlaceholder = true;
      }
    }
  }

  // Restore unescaped dollar signs \$ -> $
  text = text.replace(/\\\$/g, "$");

  // Restore protected RAW blocks directly into the final output.
  // Content inside RAW blocks is never re-processed by KaTeX, Markdown, or HTML parsers.
  if (rawBlocks.length > 0) {
    for (const block of rawBlocks) {
      const renderedRaw = renderRawBlockContent(block.content);
      text = text.split(block.id).join(renderedRaw);
    }
  }

  // Restore protected interactive HTML widgets directly into the final output.
  // Content is sandboxed and ready for iframe execution with CSS & JS.
  if (htmlWidgets.length > 0) {
    for (const widget of htmlWidgets) {
      const renderedWidget = renderHtmlWidgetHtml(widget.code, widget.height, widget.title);
      text = text.split(widget.id).join(renderedWidget);
    }
  }

  return text;
}

/**
 * Removes dangerous tags (<script>, <iframe>, <object>, <embed>) and event handlers (onclick=, onerror=, javascript:),
 * while preserving safe HTML tags (div, span, p, mark, table, thead, tbody, tr, th, td, ul, ol, li, details, summary, hr, br, img, a, strong, em, etc.).
 */
function sanitizeHarmfulHtml(htmlStr: string): string {
  if (!htmlStr) return "";

  let cleaned = htmlStr;

  // Remove dangerous tags completely
  cleaned = cleaned.replace(/<(script|iframe|object|embed|applet|meta|link|style)[\s\S]*?<\/\1>/gi, "");
  cleaned = cleaned.replace(/<(script|iframe|object|embed|applet|meta|link|style)[^>]*\/?>/gi, "");

  // Remove javascript: and vbscript: URIs
  cleaned = cleaned.replace(/href\s*=\s*["']\s*(?:javascript|vbscript):[^"']*["']/gi, 'href="#"');
  cleaned = cleaned.replace(/src\s*=\s*["']\s*(?:javascript|vbscript):[^"']*["']/gi, 'src=""');

  // Remove on* inline event handlers (onclick, onerror, onload, onmouseover, etc.)
  cleaned = cleaned.replace(/\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  return cleaned;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
