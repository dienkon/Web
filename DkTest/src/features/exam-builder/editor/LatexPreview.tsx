import { useEffect, useRef } from "react";
import katex from "katex";

interface Props {
  content: string;
  className?: string;
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
    } catch (e) {
      console.error("Error parsing LaTeX preview", e);
      if (containerRef.current) {
        containerRef.current.textContent = content;
      }
    }
  }, [content]);

  const defaultColorClass = className.includes("text-") ? "" : "text-slate-800";

  return <div ref={containerRef} className={`latex-preview leading-relaxed ${defaultColorClass} ${className}`} />;
}

/**
 * Normalizes corrupted control characters and raw LaTeX strings before KaTeX parsing.
 */
export function normalizeLatexText(input: string): string {
  if (!input) return "";

  let text = input;

  // Convert literal '\n' and '\r\n' text strings into actual newline characters
  text = text.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n");

  // 1. Fix ASCII control character corruptions caused by single-backslash JSON/JS string parsing:
  // Tab \x09
  text = text.replace(/\x09imes/g, "\\times");
  text = text.replace(/\x09heta/g, "\\theta");
  text = text.replace(/\x09an/g, "\\tan");
  text = text.replace(/\x09ext/g, "\\text");
  text = text.replace(/\x09o\b/g, "\\to");
  text = text.replace(/\x09au/g, "\\tau");
  text = text.replace(/\x09riangle/g, "\\triangle");
  text = text.replace(/\x09ilde/g, "\\tilde");
  text = text.replace(/\x09op/g, "\\top");
  text = text.replace(/\x09frac/g, "\\tfrac");
  text = text.replace(/\\t\s*x\s*(\d+|[a-zA-Z]+|\$)/g, "\\times $1");

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

  // 2. Fix unescaped keywords when backslash was stripped:
  text = text.replace(/(^|[\s=+\-*/(;,:]|[a-zA-Z]\s*=)\s*rac\s*\{/g, "$1\\frac{");
  text = text.replace(/(^|[\s=+\-*/(;,:]|[a-zA-Z]\s*=)\s*sqrt\s*\{/g, "$1\\sqrt{");

  // 3. Fix unescaped math symbol words like "notin A", "times", "2times3"
  text = text.replace(/(^|[\s({[,=+\-*/])\s*notin\b/g, "$1 \\notin ");
  text = text.replace(/(^|[\s({[,=+\-*/])\s*times\b/g, "$1 \\times ");

  return text;
}

/**
 * Safely renders LaTeX mathematical formulas inside any text string to KaTeX HTML.
 */
export function renderLatexInString(textToRender: string): string {
  if (!textToRender) return "";

  let str = textToRender;

  // 1. Block LaTeX environments: \begin{aligned}...\end{aligned}, \begin{cases}...\end{cases}, etc.
  str = str.replace(/\\begin\{(aligned|cases|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|array|tabular)\}([\s\S]*?)\\end\{\1\}/g, (fullMatch) => {
    try {
      const rendered = katex.renderToString(fullMatch.trim(), {
        displayMode: true,
        throwOnError: false,
      });
      return `<div class="my-2 py-1 overflow-x-auto flex justify-center katex-block">${rendered}</div>`;
    } catch {
      return fullMatch;
    }
  });

  // 2. Block math: $$...$$ or \[...\]
  str = str.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
      });
      return `<div class="my-2 py-1 overflow-x-auto flex justify-center katex-block">${rendered}</div>`;
    } catch (e) {
      return `<span class="text-red-500 font-mono text-xs">[Lỗi công thức: ${escapeHtml(math)}]</span>`;
    }
  });

  str = str.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
      });
      return `<div class="my-2 py-1 overflow-x-auto flex justify-center katex-block">${rendered}</div>`;
    } catch (e) {
      return `<span class="text-red-500 font-mono text-xs">[Lỗi công thức: ${escapeHtml(math)}]</span>`;
    }
  });

  // 3. Inline math: \(...\)
  str = str.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => {
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
      });
      return `<span class="inline-katex mx-0.5">${rendered}</span>`;
    } catch (e) {
      return `<span class="text-red-500 font-mono text-xs">$${escapeHtml(math)}$</span>`;
    }
  });

  // 4. Inline math: $...$ (handles exponents $x^2$, fractions $\frac{a}{b}$, subscripts $a_1$, etc.)
  // Matches $...$ on same line or within standard math bounds, skipping escaped \$
  str = str.replace(/(^|[^\\])\$([^\$\n\r]+?)\$/g, (match, prefix, math) => {
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
      });
      return `${prefix}<span class="inline-katex mx-0.5">${rendered}</span>`;
    } catch (e) {
      return `${prefix}<span class="text-red-500 font-mono text-xs">$${escapeHtml(math)}$</span>`;
    }
  });

  // 5. Undelimited mathematical fractions: \frac{...}{...}, \dfrac{...}{...}, y = \frac{...}{...}
  const fracRegex = /((?:[a-zA-Z](?:\([a-zA-Z0-9]+\))?\s*=\s*)?\\(?:d|t)?frac\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\})/g;
  str = str.replace(fracRegex, (fullMatch) => {
    try {
      const rendered = katex.renderToString(fullMatch.trim(), {
        displayMode: false,
        throwOnError: false,
      });
      return `<span class="inline-katex mx-0.5">${rendered}</span>`;
    } catch {
      return fullMatch;
    }
  });

  // 6. Undelimited roots: \sqrt[...]{...} or \sqrt{...}
  const sqrtRegex = /((?:[a-zA-Z]\s*=\s*)?\\sqrt(?:\[[^\]]*\])?\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\})/g;
  str = str.replace(sqrtRegex, (fullMatch) => {
    try {
      const rendered = katex.renderToString(fullMatch.trim(), {
        displayMode: false,
        throwOnError: false,
      });
      return `<span class="inline-katex mx-0.5">${rendered}</span>`;
    } catch {
      return fullMatch;
    }
  });

  // 7. Undelimited common LaTeX symbols and commands
  const commonLatexRegex = /(\\(?:vec|bar|hat|overline|underline)\s*\{[^{}]*\}|\\(?:int|sum|prod|lim)(?:_\{[^{}]*\}|_[\w\d])?(?:\^\{[^{}]*\}|\^[\w\d])?|\\(?:alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|vartheta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega|pm|mp|times|div|cdot|cap|cup|subset|supset|subseteq|supseteq|in|notin|ni|forall|exists|nexists|le|ge|leq|geq|neq|approx|equiv|sim|cong|propto|infty|nabla|partial|degree|perp|parallel|angle|triangle|rightarrow|to|leftarrow|leftrightarrow|Rightarrow|Leftarrow|Leftrightarrow|sin|cos|tan|cot|arcsin|arccos|arctan|log|ln|lg|exp)\b)/g;
  str = str.replace(commonLatexRegex, (fullMatch) => {
    try {
      const rendered = katex.renderToString(fullMatch.trim(), {
        displayMode: false,
        throwOnError: false,
      });
      return `<span class="inline-katex mx-0.5">${rendered}</span>`;
    } catch {
      return fullMatch;
    }
  });

  return str;
}

/**
 * Safely escapes bare '<' and '>' characters that are not valid HTML tags
 * to prevent math comparisons like 'x < 5' or 'a > b' from corrupting HTML.
 */
function escapeUnmatchedAngleBrackets(text: string): string {
  if (!text) return "";
  const validTagNames = [
    "div", "span", "p", "br", "hr", "strong", "em", "u", "del", "code", "pre",
    "blockquote", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li",
    "table", "thead", "tbody", "tr", "th", "td", "caption",
    "details", "summary", "mark", "a", "img", "svg", "path", "circle", "blockquote"
  ];
  const tagPattern = new RegExp(`<\\/?(${validTagNames.join("|")})\\b[^>]*>`, "gi");

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

/**
 * Parses markdown cell content: renders LaTeX, bold, italic, code, etc.
 */
function renderCellContent(content: string): string {
  let cell = renderLatexInString(content.trim());
  // Inline bold
  cell = cell.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  // Inline italic
  cell = cell.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
  // Inline code
  cell = cell.replace(/`([^`\n]+)`/g, '<code class="px-1 py-0.5 bg-slate-100 rounded text-xs font-mono text-pink-600">$1</code>');
  return cell;
}

/**
 * Main markdown with LaTeX and rich HTML parser.
 */
export function renderMarkdownWithLatex(rawText: string): string {
  if (!rawText) return "";

  const placeholders: { [key: string]: string } = {};
  let tokenCounter = 0;

  const createPlaceholder = (replacementHtml: string): string => {
    const key = `\uE000PCH${tokenCounter++}\uE001`;
    placeholders[key] = replacementHtml;
    return key;
  };

  let text = normalizeLatexText(rawText);

  // 1. Code blocks: ```lang ... ```
  text = text.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const escapedCode = escapeHtml(code.trimEnd());
    const langLabel = lang ? `<div class="px-3 py-1 bg-slate-800 text-slate-400 text-[10px] font-mono border-b border-slate-700 uppercase">${escapeHtml(lang)}</div>` : "";
    return createPlaceholder(
      `<div class="my-3 rounded-xl overflow-hidden bg-slate-900 text-slate-100 text-xs font-mono shadow-xs border border-slate-800">${langLabel}<pre class="p-3.5 overflow-x-auto"><code>${escapedCode}</code></pre></div>`
    );
  });

  // 2. Process HTML tables: <table ...>...</table>
  // Parse any LaTeX and inline formatting inside table cells (th, td, caption)
  text = text.replace(/<table([\s\S]*?)<\/table>/gi, (fullTable) => {
    let processedTable = fullTable.replace(/<(th|td|caption)([\s\S]*?)>([\s\S]*?)<\/\1>/gi, (match, tag, attrs, cellInner) => {
      const renderedInner = renderLatexInString(cellInner);
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
    }

    return createPlaceholder(
      `<div class="overflow-x-auto my-3 max-w-full shadow-2xs rounded-xl border border-slate-200 bg-white">${processedTable}</div>`
    );
  });

  // 3. Process Markdown tables: | col1 | col2 | ...
  // Protect inline math inside table blocks so '|' inside math expressions ($|x|$) doesn't break columns
  const mdTableRegex = /((?:^[ \t]*\|[^\n]+\|[ \t]*\r?\n){2,})/gm;
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

    let tableHtml = '<div class="overflow-x-auto my-3 max-w-full shadow-2xs rounded-xl border border-slate-200 bg-white"><table class="min-w-full divide-y divide-slate-200 text-xs text-slate-800 border-collapse">';

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

  // 4. Extract and Render all LaTeX expressions in remaining text
  text = renderLatexInString(text);

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
  // Italic: *text*
  text = text.replace(/\*([^*\n]+)\*/g, '<em class="italic">$1</em>');
  // Underline: __text__
  text = text.replace(/__([^_\n]+)__/g, '<u class="underline underline-offset-2">$1</u>');
  // Strikethrough: ~~text~~
  text = text.replace(/~~([^~\n]+)~~/g, '<del class="line-through text-slate-400">$1</del>');
  // Inline Code: `text`
  text = text.replace(/`([^`\n]+)`/g, '<code class="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono text-pink-600 font-semibold">$1</code>');

  // 12. Escape bare angle brackets (e.g. x < 5) to prevent HTML corruption
  text = escapeUnmatchedAngleBrackets(text);

  // 13. Convert standard linebreaks
  text = text.replace(/\n\n+/g, '<div class="my-2"></div>');
  text = text.replace(/\n/g, "<br/>");

  // 14. Sanitize harmful scripts while preserving safe HTML structure & classes
  text = sanitizeHarmfulHtml(text);

  // 14. Restore all placeholders safely
  for (const [key, replacement] of Object.entries(placeholders)) {
    text = text.split(key).join(replacement);
  }

  // Restore unescaped dollar signs \$ -> $
  text = text.replace(/\\\$/g, "$");

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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
