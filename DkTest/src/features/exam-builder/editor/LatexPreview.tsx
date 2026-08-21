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

  let text = String(input);

  // =========================================================
  // 0. Normalize line breaks
  // =========================================================
  text = text
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  // =========================================================
  // 1. Restore ASCII control-character corruption
  //    caused by malformed JS / JSON escaping
  // =========================================================

  // Tab (\t) corruption
  text = text
    .replace(/\x09imes/g, "\\times")
    .replace(/\x09heta/g, "\\theta")
    .replace(/\x09an/g, "\\tan")
    .replace(/\x09ext/g, "\\text")
    .replace(/\x09o\b/g, "\\to")
    .replace(/\x09au/g, "\\tau")
    .replace(/\x09riangle/g, "\\triangle")
    .replace(/\x09ilde/g, "\\tilde")
    .replace(/\x09op/g, "\\top")
    .replace(/\x09frac/g, "\\tfrac")
    .replace(/\x09imes/g, "\\times");

  // Newline (\n) corruption
  text = text
    .replace(/\x0Aotin/g, "\\notin")
    .replace(/\x0Aearrow/g, "\\nearrow")
    .replace(/\x0Aeq/g, "\\neq")
    .replace(/\x0Aexists/g, "\\nexists")
    .replace(/\x0Aeg/g, "\\neg")
    .replace(/\x0Aabla/g, "\\nabla")
    .replace(/\x0Aocite/g, "\\nocite")
    .replace(/\x0Aoindent/g, "\\noindent")
    .replace(/\x0Aeqslant/g, "\\neqslant")
    .replace(/\x0Aot/g, "\\not");

  // Form feed (\f)
  text = text
    .replace(/\x0Crac/g, "\\frac")
    .replace(/\x0Cforall/g, "\\forall")
    .replace(/\x0Cflat/g, "\\flat")
    .replace(/\x0Cgamma/g, "\\fgamma")
    .replace(/\x0C/g, "\\f");

  // Backspace (\b)
  text = text
    .replace(/\x08eta/g, "\\beta")
    .replace(/\x08ar/g, "\\bar")
    .replace(/\x08egin/g, "\\begin")
    .replace(/\x08ig/g, "\\big")
    .replace(/\x08ullet/g, "\\bullet")
    .replace(/\x08ox/g, "\\box")
    .replace(/\x08frown/g, "\\frown")
    .replace(/\x08/g, "\\b");

  // Carriage return (\r)
  text = text
    .replace(/\x0Dho/g, "\\rho")
    .replace(/\x0Dight/g, "\\right")
    .replace(/\x0Dreal/g, "\\real")
    .replace(/\x0Dangle/g, "\\rangle");

  // Vertical tab (\v)
  text = text
    .replace(/\x0Bec/g, "\\vec")
    .replace(/\x0Bspace/g, "\\vspace")
    .replace(/\x0Bdots/g, "\\vdots")
    .replace(/\x0Bdash/g, "\\vDash");

  // =========================================================
  // 2. Common backslash-stripped LaTeX commands
  // =========================================================

  const commands = [
    // Fractions / roots
    "frac",
    "dfrac",
    "tfrac",
    "cfrac",
    "sqrt",

    // Superscript / delimiters
    "left",
    "right",
    "middle",

    // Text
    "text",
    "mathrm",
    "mathbf",
    "mathit",
    "mathsf",
    "mathtt",
    "mathbb",
    "mathcal",
    "mathscr",
    "boldsymbol",

    // Greek
    "alpha",
    "beta",
    "gamma",
    "delta",
    "epsilon",
    "varepsilon",
    "zeta",
    "eta",
    "theta",
    "vartheta",
    "iota",
    "kappa",
    "lambda",
    "mu",
    "nu",
    "xi",
    "pi",
    "varpi",
    "rho",
    "varrho",
    "sigma",
    "varsigma",
    "tau",
    "upsilon",
    "phi",
    "varphi",
    "chi",
    "psi",
    "omega",

    "Gamma",
    "Delta",
    "Theta",
    "Lambda",
    "Xi",
    "Pi",
    "Sigma",
    "Upsilon",
    "Phi",
    "Psi",
    "Omega",

    // Arithmetic
    "times",
    "cdot",
    "div",
    "pm",
    "mp",
    "ast",
    "star",
    "circ",
    "bullet",

    // Relations
    "neq",
    "ne",
    "le",
    "leq",
    "ge",
    "geq",
    "ll",
    "gg",
    "approx",
    "sim",
    "simeq",
    "cong",
    "equiv",
    "propto",
    "parallel",
    "perp",
    "mid",
    "nmid",

    // Sets
    "in",
    "notin",
    "ni",
    "subset",
    "subseteq",
    "supset",
    "supseteq",
    "subsetneq",
    "supsetneq",
    "cup",
    "cap",
    "setminus",
    "emptyset",
    "varnothing",

    // Logic
    "forall",
    "exists",
    "nexists",
    "neg",
    "land",
    "lor",
    "wedge",
    "vee",
    "implies",
    "iff",

    // Arrows
    "to",
    "rightarrow",
    "leftarrow",
    "leftrightarrow",
    "Rightarrow",
    "Leftarrow",
    "Leftrightarrow",
    "mapsto",
    "longrightarrow",
    "longleftarrow",
    "longleftrightarrow",
    "uparrow",
    "downarrow",
    "updownarrow",
    "Uparrow",
    "Downarrow",
    "Updownarrow",
    "nearrow",
    "searrow",
    "swarrow",
    "nwarrow",

    // Calculus
    "sum",
    "prod",
    "coprod",
    "int",
    "iint",
    "iiint",
    "oint",
    "lim",
    "inf",
    "sup",
    "max",
    "min",
    "argmax",
    "argmin",
    "partial",
    "nabla",

    // Trigonometry
    "sin",
    "cos",
    "tan",
    "cot",
    "sec",
    "csc",
    "arcsin",
    "arccos",
    "arctan",
    "sinh",
    "cosh",
    "tanh",
    "coth",

    // Logs / exponentials
    "log",
    "ln",
    "lg",
    "exp",

    // Vectors / accents
    "vec",
    "overrightarrow",
    "overleftarrow",
    "overline",
    "underline",
    "bar",
    "hat",
    "widehat",
    "tilde",
    "widetilde",
    "dot",
    "ddot",
    "breve",
    "check",
    "acute",
    "grave",

    // Brackets / symbols
    "langle",
    "rangle",
    "lfloor",
    "rfloor",
    "lceil",
    "rceil",
    "lvert",
    "rvert",
    "Vert",
    "vert",

    // Misc mathematical symbols
    "infty",
    "partial",
    "degree",
    "prime",
    "angle",
    "triangle",
    "square",
    "diamond",
    "parallel",
    "perp",
    "top",
    "bot",
    "aleph",
    "Re",
    "Im",

    // Ellipsis
    "cdots",
    "ldots",
    "vdots",
    "ddots",

    // Matrix
    "begin",
    "end",

    // Spacing
    "quad",
    "qquad",
    "hspace",
    "vspace",
    "!",
    ",",
    ":",
    ";",
    " ",
  ];

  for (const command of commands) {
    const escaped = command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Only restore when it looks like a standalone command.
    const regex = new RegExp(
      `(^|[\\s({[=+\\-*/,:;<>|])${escaped}(?=\\b|\\s|\\{|\\[|\\(|\\^|_)`,
      "g"
    );

    text = text.replace(regex, `$1\\${command}`);
  }

  // =========================================================
  // 3. Explicit high-priority fixes
  // =========================================================

  text = text
    .replace(/(^|[\s=+\-*/(;,:])\s*rac\s*\{/g, "$1\\frac{")
    .replace(/(^|[\s=+\-*/(;,:])\s*dfrac\s*\{/g, "$1\\dfrac{")
    .replace(/(^|[\s=+\-*/(;,:])\s*tfrac\s*\{/g, "$1\\tfrac{")
    .replace(/(^|[\s=+\-*/(;,:])\s*cfrac\s*\{/g, "$1\\cfrac{")
    .replace(/(^|[\s=+\-*/(;,:])\s*sqrt\s*\{/g, "$1\\sqrt{");

  // =========================================================
  // 4. Fix common "2times3", "3cdot4", etc.
  // =========================================================

  text = text
    .replace(/(\d)\s*times\s*(\d|[a-zA-Z])/g, "$1\\times $2")
    .replace(/(\d)\s*cdot\s*(\d|[a-zA-Z])/g, "$1\\cdot $2")
    .replace(/([a-zA-Z])\s*times\s*(\d|[a-zA-Z])/g, "$1\\times $2")
    .replace(/([a-zA-Z])\s*cdot\s*(\d|[a-zA-Z])/g, "$1\\cdot $2");

  // =========================================================
  // 5. Set symbols
  // =========================================================

  text = text
    .replace(
      /(^|[\s({[=+\-*/,:;])\s*notin\b/g,
      "$1 \\notin "
    )
    .replace(
      /(^|[\s({[=+\-*/,:;])\s*in\b/g,
      "$1 \\in "
    )
    .replace(
      /(^|[\s({[=+\-*/,:;])\s*subseteq\b/g,
      "$1 \\subseteq "
    )
    .replace(
      /(^|[\s({[=+\-*/,:;])\s*subset\b/g,
      "$1 \\subset "
    )
    .replace(
      /(^|[\s({[=+\-*/,:;])\s*supseteq\b/g,
      "$1 \\supseteq "
    )
    .replace(
      /(^|[\s({[=+\-*/,:;])\s*supset\b/g,
      "$1 \\supset "
    );

  // =========================================================
  // 6. Relations accidentally typed as plain text
  // =========================================================

  text = text
    .replace(/(^|[\s(])neq(?=[\s),.;:+\-*/]|$)/g, "$1\\neq")
    .replace(/(^|[\s(])leq(?=[\s),.;:+\-*/]|$)/g, "$1\\leq")
    .replace(/(^|[\s(])geq(?=[\s),.;:+\-*/]|$)/g, "$1\\geq")
    .replace(/(^|[\s(])le(?=[\s),.;:+\-*/]|$)/g, "$1\\le")
    .replace(/(^|[\s(])ge(?=[\s),.;:+\-*/]|$)/g, "$1\\ge");

  // =========================================================
  // 7. Common plain-text math aliases
  // =========================================================

  text = text
    .replace(/\bInfinity\b/g, "\\infty")
    .replace(/\binfinity\b/g, "\\infty")
    .replace(/\bpi\b/g, "\\pi")
    .replace(/\btheta\b/g, "\\theta")
    .replace(/\balpha\b/g, "\\alpha")
    .replace(/\bbeta\b/g, "\\beta")
    .replace(/\bgamma\b/g, "\\gamma")
    .replace(/\bdelta\b/g, "\\delta")
    .replace(/\blambda\b/g, "\\lambda")
    .replace(/\bmu\b/g, "\\mu")
    .replace(/\bsigma\b/g, "\\sigma")
    .replace(/\bomega\b/g, "\\omega");

  // =========================================================
  // 8. Common Unicode → LaTeX
  // =========================================================

  const unicodeMap: Record<string, string> = {
    "×": "\\times",
    "÷": "\\div",
    "±": "\\pm",
    "∓": "\\mp",
    "≤": "\\le",
    "≥": "\\ge",
    "≠": "\\neq",
    "≈": "\\approx",
    "≡": "\\equiv",
    "∼": "\\sim",
    "∞": "\\infty",

    "∈": "\\in",
    "∉": "\\notin",
    "∋": "\\ni",
    "⊂": "\\subset",
    "⊆": "\\subseteq",
    "⊃": "\\supset",
    "⊇": "\\supseteq",
    "∅": "\\varnothing",

    "∪": "\\cup",
    "∩": "\\cap",
    "∖": "\\setminus",

    "∀": "\\forall",
    "∃": "\\exists",
    "¬": "\\neg",
    "∧": "\\land",
    "∨": "\\lor",

    "→": "\\rightarrow",
    "←": "\\leftarrow",
    "↔": "\\leftrightarrow",
    "⇒": "\\Rightarrow",
    "⇐": "\\Leftarrow",
    "⇔": "\\Leftrightarrow",

    "∂": "\\partial",
    "∇": "\\nabla",
    "∑": "\\sum",
    "∏": "\\prod",
    "∫": "\\int",

    "√": "\\sqrt",
    "∠": "\\angle",
    "△": "\\triangle",
    "°": "^\\circ",

    "·": "\\cdot",
    "⋅": "\\cdot",

    "α": "\\alpha",
    "β": "\\beta",
    "γ": "\\gamma",
    "δ": "\\delta",
    "ε": "\\epsilon",
    "θ": "\\theta",
    "λ": "\\lambda",
    "μ": "\\mu",
    "π": "\\pi",
    "ρ": "\\rho",
    "σ": "\\sigma",
    "τ": "\\tau",
    "φ": "\\phi",
    "ψ": "\\psi",
    "ω": "\\omega",

    "Γ": "\\Gamma",
    "Δ": "\\Delta",
    "Θ": "\\Theta",
    "Λ": "\\Lambda",
    "Π": "\\Pi",
    "Σ": "\\Sigma",
    "Φ": "\\Phi",
    "Ψ": "\\Psi",
    "Ω": "\\Omega",
  };

  for (const [unicode, latex] of Object.entries(unicodeMap)) {
    text = text.split(unicode).join(latex);
  }

  // =========================================================
  // 9. Normalize spacing around operators
  // =========================================================

  text = text
    .replace(/\\times\s+/g, "\\times ")
    .replace(/\\cdot\s+/g, "\\cdot ")
    .replace(/\s+\{/g, " {")
    .replace(/\{\s+/g, "{")
    .replace(/\s+\}/g, "}")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")");

  // =========================================================
  // 10. Repair accidental double escaping
  // =========================================================

  text = text.replace(/\\\\([a-zA-Z]+)/g, "\\$1");

  // =========================================================
  // 11. Remove unsupported control chars
  //    while preserving \n and \t
  // =========================================================

  text = text.replace(
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,
    ""
  );

  // =========================================================
  // 12. Normalize whitespace
  // =========================================================

  text = text
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();

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

