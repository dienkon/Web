/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from "react";
import Prism from "prismjs";
// Import language grammars for Prism
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/components/prism-javascript";

interface CodeEditorProps {
  value: string;
  onChange: (val: string) => void;
  language: "html" | "css" | "javascript";
  placeholder?: string;
  minHeight?: string;
}

export default function CodeEditorWithSyntax({
  value,
  onChange,
  language,
  placeholder = "Nhập mã nguồn...",
  minHeight = "400px",
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const preRef = useRef<HTMLPreElement | null>(null);
  const lineNumbersRef = useRef<HTMLDivElement | null>(null);

  const [highlightedCode, setHighlightedCode] = useState<string>("");

  // Map language to Prism grammar
  const prismLang = language === "html" ? "markup" : language === "javascript" ? "javascript" : "css";

  // Re-highlight when value or language changes
  useEffect(() => {
    try {
      const grammar = Prism.languages[prismLang] || Prism.languages.markup;
      const html = Prism.highlight(value || "", grammar, prismLang);
      setHighlightedCode(html);
    } catch {
      setHighlightedCode(value);
    }
  }, [value, prismLang]);

  // Sync scrolling between textarea, pre, and line numbers
  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Handle Tab key indent (insert 2 spaces)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const updated = value.substring(0, start) + "  " + value.substring(end);

      onChange(updated);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  const linesCount = Math.max(1, (value || "").split("\n").length);

  return (
    <div
      className="relative flex w-full border border-slate-800 bg-[#0d1117] rounded-xl overflow-hidden font-mono text-xs sm:text-sm select-text shadow-inner"
      style={{ minHeight, height: "100%" }}
    >
      {/* Line Numbers Column */}
      <div
        ref={lineNumbersRef}
        aria-hidden="true"
        className="w-12 shrink-0 bg-[#090d13] text-slate-500 py-3 px-2 text-right select-none border-r border-slate-800 overflow-hidden leading-relaxed font-mono"
      >
        {Array.from({ length: linesCount }).map((_, i) => (
          <div key={i} className="leading-relaxed opacity-60 hover:opacity-100">
            {i + 1}
          </div>
        ))}
      </div>

      {/* Editor Main Container */}
      <div className="relative flex-1 h-full overflow-hidden">
        {/* Background Highlighted Layer */}
        <pre
          ref={preRef}
          aria-hidden="true"
          className="absolute inset-0 m-0 p-3 overflow-hidden pointer-events-none whitespace-pre-wrap break-words leading-relaxed font-mono bg-transparent z-0"
        >
          <code
            dangerouslySetInnerHTML={{ __html: highlightedCode + (value.endsWith("\n") ? " " : "") }}
            className={`language-${prismLang} text-slate-200`}
          />
        </pre>

        {/* Foreground Transparent Editable Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className="absolute inset-0 w-full h-full p-3 m-0 bg-transparent text-transparent caret-white resize-none outline-hidden whitespace-pre-wrap break-words leading-relaxed font-mono z-10 selection:bg-blue-500/30 selection:text-transparent"
        />
      </div>
    </div>
  );
}
