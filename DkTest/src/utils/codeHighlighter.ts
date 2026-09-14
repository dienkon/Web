import Prism from "prismjs";

// Import common programming languages for education, competitive programming, and web development
import "prismjs/components/prism-python";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-java";
import "prismjs/components/prism-pascal";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-yaml";

/**
 * Normalizes language name alias to Prism-supported grammar key.
 */
export function normalizeLanguageName(rawLang?: string): { prismLang: string; displayLang: string } {
  if (!rawLang) {
    return { prismLang: "plaintext", displayLang: "CODE" };
  }

  const lang = rawLang.trim().toLowerCase();

  const map: Record<string, { prism: string; display: string }> = {
    py: { prism: "python", display: "PYTHON" },
    python: { prism: "python", display: "PYTHON" },
    python3: { prism: "python", display: "PYTHON" },
    c: { prism: "c", display: "C" },
    cpp: { prism: "cpp", display: "C++" },
    "c++": { prism: "cpp", display: "C++" },
    cs: { prism: "csharp", display: "C#" },
    csharp: { prism: "csharp", display: "C#" },
    "c#": { prism: "csharp", display: "C#" },
    java: { prism: "java", display: "JAVA" },
    pas: { prism: "pascal", display: "PASCAL" },
    pascal: { prism: "pascal", display: "PASCAL" },
    delphi: { prism: "pascal", display: "PASCAL" },
    js: { prism: "javascript", display: "JAVASCRIPT" },
    javascript: { prism: "javascript", display: "JAVASCRIPT" },
    ts: { prism: "typescript", display: "TYPESCRIPT" },
    typescript: { prism: "typescript", display: "TYPESCRIPT" },
    html: { prism: "markup", display: "HTML" },
    xml: { prism: "markup", display: "XML" },
    svg: { prism: "markup", display: "SVG" },
    css: { prism: "css", display: "CSS" },
    sql: { prism: "sql", display: "SQL" },
    mysql: { prism: "sql", display: "SQL" },
    json: { prism: "json", display: "JSON" },
    bash: { prism: "bash", display: "BASH" },
    sh: { prism: "bash", display: "SHELL" },
    zsh: { prism: "bash", display: "SHELL" },
    shell: { prism: "bash", display: "SHELL" },
    yaml: { prism: "yaml", display: "YAML" },
    yml: { prism: "yaml", display: "YAML" },
    md: { prism: "markdown", display: "MARKDOWN" },
    markdown: { prism: "markdown", display: "MARKDOWN" },
    txt: { prism: "plaintext", display: "TEXT" },
    text: { prism: "plaintext", display: "TEXT" },
    plain: { prism: "plaintext", display: "TEXT" },
    plaintext: { prism: "plaintext", display: "TEXT" },
  };

  if (map[lang]) {
    return { prismLang: map[lang].prism, displayLang: map[lang].display };
  }

  // Fallback if grammar exists directly in Prism
  if (Prism.languages[lang]) {
    return { prismLang: lang, displayLang: lang.toUpperCase() };
  }

  return { prismLang: "plaintext", displayLang: rawLang.toUpperCase() };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Renders a full Discord-style code block with:
 * - Top header bar (Discord dark `#1e1f22`), Language badge with code icon, Click-to-copy button
 * - Code container (Discord dark `#2b2d31`)
 * - Line numbers gutter with `user-select: none`
 * - Syntax highlighting using Prism tokens with Discord-tuned palette
 */
export function renderDiscordCodeBlock(rawCode: string, rawLang?: string): string {
  const cleanCode = rawCode.replace(/\r\n/g, "\n").replace(/^\n+|\n+$/g, "");
  const { prismLang, displayLang } = normalizeLanguageName(rawLang);

  // Split lines
  const lines = cleanCode.split("\n");
  const lineCount = lines.length;

  // Highlight each line
  const grammar = Prism.languages[prismLang];

  // Tokenize the whole code first to maintain multiline tokens (like multiline strings or comments)
  let highlightedFull = "";
  if (grammar) {
    try {
      highlightedFull = Prism.highlight(cleanCode, grammar, prismLang);
    } catch {
      highlightedFull = escapeHtml(cleanCode);
    }
  } else {
    highlightedFull = escapeHtml(cleanCode);
  }

  // Split highlighted text into lines
  const highlightedLines = highlightedFull.split("\n");

  // Format code table with non-selectable gutter line numbers
  let linesHtml = "";
  for (let i = 0; i < lineCount; i++) {
    const lineNum = i + 1;
    const content = highlightedLines[i] !== undefined && highlightedLines[i].length > 0 ? highlightedLines[i] : "&nbsp;";
    linesHtml += `<div class="dk-code-row"><span class="dk-line-num">${lineNum}</span><span class="dk-line-content">${content}</span></div>`;
  }

  // Copy button with SVG icon and text
  const encodedRaw = encodeURIComponent(cleanCode);
  const copyBtn = `
    <button type="button" class="dk-copy-code-btn" data-code="${encodedRaw}" title="Sao chép đoạn mã">
      <svg class="dk-copy-icon w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
      </svg>
      <span class="dk-copy-label">Sao chép</span>
    </button>
  `.trim();

  // Language badge with code icon
  const langBadge = `
    <div class="flex items-center gap-2">
      <svg class="w-3.5 h-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
      <span class="text-[11px] font-mono font-bold tracking-wider text-slate-300">${displayLang}</span>
    </div>
  `.trim();

  return `
    <div class="discord-code-block my-4 rounded-xl overflow-hidden border border-[#383a40] bg-[#2b2d31] shadow-lg text-[13px] font-mono leading-relaxed">
      <div class="discord-code-header flex items-center justify-between px-3.5 py-2 bg-[#1e1f22] border-b border-[#383a40] select-none">
        ${langBadge}
        ${copyBtn}
      </div>
      <div class="discord-code-body p-3 overflow-x-auto custom-code-scrollbar bg-[#2b2d31]">
        <div class="dk-code-lines">${linesHtml}</div>
      </div>
    </div>
  `.trim();
}
