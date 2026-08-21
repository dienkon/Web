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

  // Convert literal '\n' and '\r\n' text strings (two characters '\' and 'n') into actual newline characters
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
  text = text.replace(
    /(^|[\s=+\-*/(;,:]|[a-zA-Z]\s*=)\s*rac\s*\{/g,
    "$1\\frac{",
  );
  text = text.replace(
    /(^|[\s=+\-*/(;,:]|[a-zA-Z]\s*=)\s*sqrt\s*\{/g,
    "$1\\sqrt{",
  );

  // 3. Fix unescaped math symbol words like "notin A", "times", "2times3"
  text = text.replace(/(^|[\s({[,=+\-*/])\s*notin\b/g, "$1 \\notin ");
  text = text.replace(/(^|[\s({[,=+\-*/])\s*times\b/g, "$1 \\times ");

  return text;
}

export function renderMarkdownWithLatex(rawText: string): string {
  if (!rawText) return "";

  // 1. Normalize text and prepare placeholder registry
  const placeholders: { [key: string]: string } = {};
  let tokenCounter = 0;

  const createPlaceholder = (replacementHtml: string): string => {
    const key = `\uE000KATEX${tokenCounter++}\uE001`;
    placeholders[key] = replacementHtml;
    return key;
  };

  let text = normalizeLatexText(rawText);

  // 2. Extract HTML tables <table ...>...</table> and wrap in overflow-x-auto container
  text = text.replace(/<table[\s\S]*?<\/table>/gi, (tableHtml) => {
    // Add default border & padding styles to tables if plain
    let styledTable = tableHtml;
    if (!styledTable.includes("class=")) {
      styledTable = styledTable.replace(
        /<table/i,
        '<table class="min-w-full divide-y divide-slate-200 text-xs text-slate-800 border-collapse border border-slate-300 rounded-lg overflow-hidden my-2 bg-white"'
      );
    }
    return createPlaceholder(`<div class="overflow-x-auto my-3 max-w-full shadow-2xs rounded-xl border border-slate-200">${styledTable}</div>`);
  });

  // 3. Extract Markdown tables | col | col | ...
  const mdTableRegex = /((?:\|[^\n]+\|\r?\n){2,})/g;
  text = text.replace(mdTableRegex, (mdTable) => {
    const lines = mdTable.trim().split(/\r?\n/);
    if (lines.length < 2) return mdTable;

    let tableHtml = '<div class="overflow-x-auto my-3 max-w-full shadow-2xs rounded-xl border border-slate-200"><table class="min-w-full divide-y divide-slate-200 text-xs text-slate-800 border-collapse bg-white">';
    
    // Header
    const headerCols = lines[0].split('|').slice(1, -1).map(c => c.trim());
    tableHtml += '<thead class="bg-slate-100/90 font-bold"><tr>';
    headerCols.forEach(col => {
      tableHtml += `<th class="px-3 py-2 text-left border border-slate-200 text-slate-900">${col}</th>`;
    });
    tableHtml += '</tr></thead><tbody>';

    // Skip separator line (lines[1])
    for (let i = 2; i < lines.length; i++) {
      const rowCols = lines[i].split('|').slice(1, -1).map(c => c.trim());
      tableHtml += `<tr className="${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}">`;
      rowCols.forEach(col => {
        tableHtml += `<td class="px-3 py-2 border border-slate-200 text-slate-700">${col}</td>`;
      });
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table></div>';
    return createPlaceholder(tableHtml);
  });

  // 4. Extract block math $$...$$ or \[...\]
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
      });
      return createPlaceholder(`<div class="my-2 py-1 overflow-x-auto flex justify-center katex-block">${rendered}</div>`);
    } catch (e) {
      return createPlaceholder(`<span class="text-red-500 font-mono text-xs">[Lỗi công thức: ${escapeHtml(math)}]</span>`);
    }
  });

  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
      });
      return createPlaceholder(`<div class="my-2 py-1 overflow-x-auto flex justify-center katex-block">${rendered}</div>`);
    } catch (e) {
      return createPlaceholder(`<span class="text-red-500 font-mono text-xs">[Lỗi công thức: ${escapeHtml(math)}]</span>`);
    }
  });

  // 5. Extract inline math \(...\)
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => {
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
      });
      return createPlaceholder(`<span class="inline-katex mx-0.5">${rendered}</span>`);
    } catch (e) {
      return createPlaceholder(`<span class="text-red-500 font-mono text-xs">$${escapeHtml(math)}$</span>`);
    }
  });

  // 6. Extract inline math $...$ (ignoring escaped \$)
  text = text.replace(/(^|[^\\])\$([^\$\n]+?)\$/g, (match, prefix, math) => {
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
      });
      return `${prefix}${createPlaceholder(`<span class="inline-katex mx-0.5">${rendered}</span>`)}`;
    } catch (e) {
      return `${prefix}${createPlaceholder(`<span class="text-red-500 font-mono text-xs">$${escapeHtml(math)}$</span>`)}`;
    }
  });

  // 7. Extract un-delimited LaTeX mathematical fractions: \frac{...}{...}, \dfrac{...}{...}, y = \frac{...}{...}
  const fracRegex = /((?:[a-zA-Z](?:\([a-zA-Z0-9]+\))?\s*=\s*)?\\(?:d|t)?frac\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\})/g;
  text = text.replace(fracRegex, (fullMatch) => {
    try {
      const rendered = katex.renderToString(fullMatch.trim(), {
        displayMode: false,
        throwOnError: false,
      });
      return createPlaceholder(`<span class="inline-katex mx-0.5">${rendered}</span>`);
    } catch (e) {
      return fullMatch;
    }
  });

  // 8. Extract un-delimited roots: \sqrt[...]{...} or \sqrt{...}
  const sqrtRegex = /((?:[a-zA-Z]\s*=\s*)?\\sqrt(?:\[[^\]]*\])?\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\})/g;
  text = text.replace(sqrtRegex, (fullMatch) => {
    try {
      const rendered = katex.renderToString(fullMatch.trim(), {
        displayMode: false,
        throwOnError: false,
      });
      return createPlaceholder(`<span class="inline-katex mx-0.5">${rendered}</span>`);
    } catch (e) {
      return fullMatch;
    }
  });

  // 9. Extract un-delimited common LaTeX symbols and commands like \vec{u}, \alpha, \Delta, \pm, \int, \sum, \lim, \notin, \times
  const commonLatexRegex = /(\\(?:vec|bar|hat|overline|underline)\s*\{[^{}]*\}|\\(?:int|sum|prod|lim)(?:_\{[^{}]*\}|_[\w\d])?(?:\^\{[^{}]*\}|\^[\w\d])?|\\(?:alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|vartheta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega|pm|mp|times|div|cdot|cap|cup|subset|supset|subseteq|supseteq|in|notin|ni|forall|exists|nexists|le|ge|leq|geq|neq|approx|equiv|sim|cong|propto|infty|nabla|partial|degree|perp|parallel|angle|triangle|rightarrow|to|leftarrow|leftrightarrow|Rightarrow|Leftarrow|Leftrightarrow|sin|cos|tan|cot|arcsin|arccos|arctan|log|ln|lg|exp)\b)/g;
  text = text.replace(commonLatexRegex, (fullMatch) => {
    try {
      const rendered = katex.renderToString(fullMatch.trim(), {
        displayMode: false,
        throwOnError: false,
      });
      return createPlaceholder(`<span class="inline-katex mx-0.5">${rendered}</span>`);
    } catch (e) {
      return fullMatch;
    }
  });

  // 10. Extract markdown images ![alt](url)
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    return createPlaceholder(
      `<span class="inline-block my-2 max-w-full"><img src="${escapeHtml(url.trim())}" alt="${escapeHtml(
        alt
      )}" class="max-w-full max-h-96 rounded-lg border border-slate-200 shadow-sm mx-auto object-contain" /></span>`
    );
  });

  // 11. Escape remaining HTML entities for safety
  let safeText = escapeHtml(text);

  // 12. Markdown typography formatting
  // Bold: **text**
  safeText = safeText.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  // Italic: *text*
  safeText = safeText.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  // Underline: __text__
  safeText = safeText.replace(/__([^_\n]+)__/g, '<u>$1</u>');
  // Code block: `text`
  safeText = safeText.replace(/`([^`\n]+)`/g, '<code class="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono text-pink-600">$1</code>');
  // Linebreaks
  safeText = safeText.replace(/\n/g, '<br/>');

  // 13. Restore all placeholders safely
  for (const [key, replacement] of Object.entries(placeholders)) {
    safeText = safeText.split(key).join(replacement);
  }

  // Restore unescaped dollar signs \$ -> $
  safeText = safeText.replace(/\\\$/g, "$");

  return safeText;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

