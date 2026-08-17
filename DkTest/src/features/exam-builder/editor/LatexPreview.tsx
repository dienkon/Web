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

  return <div ref={containerRef} className={`latex-preview text-slate-800 leading-relaxed ${className}`} />;
}

export function renderMarkdownWithLatex(rawText: string): string {
  if (!rawText) return "";

  // 1. Placeholder registry for formulas and images to prevent markdown regex collision
  const placeholders: { [key: string]: string } = {};
  let tokenCounter = 0;

  const createPlaceholder = (replacementHtml: string): string => {
    const key = `___LATEX_TOKEN_${tokenCounter++}___`;
    placeholders[key] = replacementHtml;
    return key;
  };

  let text = rawText;

  // 2. Extract block math $$...$$ or \[...\]
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
      });
      return createPlaceholder(`<div class="my-2 py-1 overflow-x-auto flex justify-center">${rendered}</div>`);
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
      return createPlaceholder(`<div class="my-2 py-1 overflow-x-auto flex justify-center">${rendered}</div>`);
    } catch (e) {
      return createPlaceholder(`<span class="text-red-500 font-mono text-xs">[Lỗi công thức: ${escapeHtml(math)}]</span>`);
    }
  });

  // 3. Extract inline math $...$ (ensure not double $ or escaped)
  text = text.replace(/(?<!\\)\$([^\$\n]+?)(?<!\\)\$/g, (_, math) => {
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

  // 4. Extract markdown images ![alt](url)
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    return createPlaceholder(
      `<span class="inline-block my-2 max-w-full"><img src="${escapeHtml(url.trim())}" alt="${escapeHtml(
        alt
      )}" class="max-w-full max-h-96 rounded-lg border border-slate-200 shadow-sm mx-auto object-contain" /></span>`
    );
  });

  // 5. Escape remaining HTML entities for safety
  let safeText = escapeHtml(text);

  // 6. Markdown typography formatting
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

  // 7. Restore placeholders
  for (const [key, replacement] of Object.entries(placeholders)) {
    safeText = safeText.split(key).join(replacement);
  }

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
