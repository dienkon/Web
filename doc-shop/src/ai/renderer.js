/**
 * AI Output Formatting, KaTeX Rendering & DOMPurify Sanitizer (Section AV, AW, AX)
 */
import DOMPurify from "dompurify";
import katex from "katex";
import "katex/dist/katex.min.css";

/**
 * Render LaTeX math expressions inside string using KaTeX
 */
export const renderLatexInText = (text) => {
  if (!text || typeof text !== "string") return "";

  let result = text;

  // 1. Render Block Math: $$...$$ or \[...\]
  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (match, expr) => {
    try {
      return `<div class="katex-block-wrapper my-3 text-center overflow-x-auto">${katex.renderToString(expr.trim(), { displayMode: true, throwOnError: false })}</div>`;
    } catch {
      return `<pre class="text-xs text-red-500 font-mono">${expr}</pre>`;
    }
  });

  result = result.replace(/\\\[([\s\S]*?)\\\]/g, (match, expr) => {
    try {
      return `<div class="katex-block-wrapper my-3 text-center overflow-x-auto">${katex.renderToString(expr.trim(), { displayMode: true, throwOnError: false })}</div>`;
    } catch {
      return `<pre class="text-xs text-red-500 font-mono">${expr}</pre>`;
    }
  });

  // 2. Render Inline Math: \(...\) or $...$
  result = result.replace(/\\\(([\s\S]*?)\\\)/g, (match, expr) => {
    try {
      return katex.renderToString(expr.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return `<code class="text-xs text-red-500">${expr}</code>`;
    }
  });

  result = result.replace(/(^|[^\\])\$([^\$]+?)\$/g, (match, prefix, expr) => {
    try {
      return prefix + katex.renderToString(expr.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return prefix + `<code class="text-xs text-red-500">${expr}</code>`;
    }
  });

  return result;
};

/**
 * Sanitize HTML with strict allowed tags (Section AW)
 */
export const sanitizeHtml = (dirtyHtml) => {
  if (!dirtyHtml || typeof dirtyHtml !== "string") return "";

  const clean = DOMPurify.sanitize(dirtyHtml, {
    ALLOWED_TAGS: [
      "p", "strong", "em", "u", "ul", "ol", "li",
      "h1", "h2", "h3", "h4", "blockquote",
      "table", "thead", "tbody", "tr", "th", "td",
      "pre", "code", "br", "hr", "span", "div",
      "annotation", "semantics", "math", "mrow", "mi", "mo", "mn", "msup", "msub", "mfrac", "sqrt" // KaTeX math tags
    ],
    ALLOWED_ATTR: [
      "class", "style", "aria-hidden", "focusable", "xmlns", "display", "mathvariant"
    ],
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
    ALLOW_DATA_ATTR: false,
  });

  return clean;
};

/**
 * Full AI Response Pipeline: Markdown/Raw -> LaTeX -> HTML Sanitize
 */
export const renderAIResponse = (rawText) => {
  if (!rawText) return "";

  // Convert basic markdown headings and lists if not already HTML
  let processed = rawText;

  if (!processed.includes("<p>") && !processed.includes("<h3>")) {
    processed = processed
      .replace(/^### (.*$)/gim, '<h3 class="text-sm font-bold text-gray-900 mt-3 mb-1">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-base font-bold text-gray-900 mt-4 mb-2">$1</h2>')
      .replace(/^\* (.*$)/gim, '<li class="ml-4 list-disc text-xs text-gray-700">$1</li>')
      .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc text-xs text-gray-700">$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p class="text-xs text-gray-700 leading-relaxed mb-2">');

    processed = `<p class="text-xs text-gray-700 leading-relaxed mb-2">${processed}</p>`;
  }

  // 1. Render LaTeX
  const withLatex = renderLatexInText(processed);

  // 2. Sanitize HTML
  const sanitized = sanitizeHtml(withLatex);

  return sanitized;
};

export default {
  renderLatexInText,
  sanitizeHtml,
  renderAIResponse,
};
