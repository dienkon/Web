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

  // 1. Fix control characters caused by single-backslash JSON or string escapes:
  // \x0c (form feed \f) -> \f (e.g. \x0crac -> \frac, \x0c -> \f)
  text = text.replace(/\x0c/g, "\\f");
  // \x08 (backspace \b) -> \b (e.g. \x08eta -> \beta, \x08ar -> \bar)
  text = text.replace(/\x08/g, "\\b");
  // \x0b (vertical tab \v) -> \v (e.g. \x0bec -> \vec)
  text = text.replace(/\x0b/g, "\\v");

  // 2. Fix cases where backslash was stripped before common commands:
  // e.g. " rac{2x-1}{x+1}" -> "\frac{2x-1}{x+1}"
  text = text.replace(/(^|[\s=+\-*/(;,:]|[a-zA-Z]\s*=)\s*rac\s*\{/g, "$1\\frac{");
  text = text.replace(/(^|[\s=+\-*/(;,:]|[a-zA-Z]\s*=)\s*sqrt\s*\{/g, "$1\\sqrt{");

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

  // 2. Extract block math $$...$$ or \[...\]
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

  // 3. Extract inline math \(...\)
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

  // 4. Extract inline math $...$ (ignoring escaped \$)
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

  // 5. Extract un-delimited LaTeX mathematical fractions: \frac{...}{...}, \dfrac{...}{...}, y = \frac{...}{...}
  // Matches: optional variable assignment prefix (e.g. y = , f(x) = ) + \frac{numerator}{denominator}
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

  // 6. Extract un-delimited roots: \sqrt[...]{...} or \sqrt{...}
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

  // 7. Extract un-delimited common LaTeX symbols and commands like \vec{u}, \alpha, \Delta, \pm, \int, \sum, \lim
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

  // 8. Extract markdown images ![alt](url)
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    return createPlaceholder(
      `<span class="inline-block my-2 max-w-full"><img src="${escapeHtml(url.trim())}" alt="${escapeHtml(
        alt
      )}" class="max-w-full max-h-96 rounded-lg border border-slate-200 shadow-sm mx-auto object-contain" /></span>`
    );
  });

  // 9. Escape remaining HTML entities for safety
  let safeText = escapeHtml(text);

  // 10. Markdown typography formatting
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

  // 11. Restore all placeholders safely
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

