import React, { useEffect, useRef, useCallback } from "react";
import { renderMarkdownWithLatex, escapeHtml } from "../../features/exam-builder/editor/LatexPreview";

interface Props {
  content: string;
  answers?: Record<number, string>;
  onAnswerChange?: (blankIndex: number, value: string) => void;
  isReview?: boolean;
  acceptedAnswersPerBlank?: Record<number, string[]>;
  caseSensitive?: boolean;
  trimWhitespace?: boolean;
  className?: string;
}

export default function InteractiveFillBlankText({
  content,
  answers = {},
  onAnswerChange,
  isReview = false,
  acceptedAnswersPerBlank = {},
  caseSensitive = false,
  trimWhitespace = true,
  className = "",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const onAnswerChangeRef = useRef(onAnswerChange);
  onAnswerChangeRef.current = onAnswerChange;

  // Build rendered HTML string with either interactive inputs or review badges
  const generateHtml = useCallback(() => {
    if (!content) return "";

    let blankCounter = 0;
    // Comprehensive blank patterns: [_], [___], [blank], [blank1], ____, (...), [...]
    const blankRegex = /\[_+\]|\[blank\d*\]|(?<![\w\\])_{3,}|\[\s*\.{3,}\s*\]|\(\s*\.{3,}\s*\)|\(\s*_{2,}\s*\)/gi;
    const tokenized = content.replace(blankRegex, () => {
      const idx = blankCounter++;
      return `\uE007BLANK_TOKEN_${idx}\uE008`;
    });

    let rendered = renderMarkdownWithLatex(tokenized);

    // Now replace the tokens with live interactive inputs or review badges
    for (let i = 0; i < blankCounter; i++) {
      const token = `\uE007BLANK_TOKEN_${i}\uE008`;
      const currentVal = answersRef.current[i] || "";

      if (isReview) {
        const accepted = acceptedAnswersPerBlank[i] || [];
        const userTrimmed = trimWhitespace ? currentVal.trim() : currentVal;
        const compareUser = caseSensitive ? userTrimmed : userTrimmed.toLowerCase();
        const isMatch = accepted.some((opt) => {
          const target = trimWhitespace ? opt.trim() : opt;
          return (caseSensitive ? target : target.toLowerCase()) === compareUser;
        });

        const statusClass = isMatch
          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
          : "bg-red-50 text-red-800 border-red-300";

        const badgeHtml = `
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 mx-1 rounded-lg font-bold text-xs sm:text-sm border shadow-2xs align-middle ${statusClass}">
            <span class="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold mr-0.5">#${i + 1}</span>
            <span class="font-mono font-semibold">${escapeHtml(currentVal) || '<span class="italic font-normal opacity-60">(chưa điền)</span>'}</span>
            <span class="text-xs font-black">${isMatch ? "✓" : "✗"}</span>
            ${
              !isMatch && accepted.length > 0
                ? `<span class="text-[11px] font-medium bg-emerald-100/90 text-emerald-900 border border-emerald-200/80 px-1.5 py-0.5 rounded ml-1 font-sans">Đúng: <b>${escapeHtml(accepted.join(" / "))}</b></span>`
                : ""
            }
          </span>
        `.trim();

        rendered = rendered.split(token).join(badgeHtml);
      } else {
        const inputWidth = Math.max(85, (currentVal.length + 3) * 11);
        const inputHtml = `
          <span class="inline-flex items-center align-middle mx-1 my-1 relative group cursor-text" data-blank-wrapper="${i}">
            <span class="absolute -top-3 left-1 text-[9px] font-black uppercase text-blue-600 tracking-wider bg-white dark:bg-slate-800 px-1 rounded-full shadow-2xs border border-blue-200 dark:border-blue-700 pointer-events-none select-none z-10">
              #${i + 1}
            </span>
            <input
              type="text"
              data-blank-index="${i}"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="none"
              spellcheck="false"
              class="dk-interactive-blank-input font-mono font-bold text-sm sm:text-base text-blue-900 dark:text-blue-100 bg-blue-50/80 hover:bg-blue-50 focus:bg-white dark:bg-slate-800 dark:focus:bg-slate-900 border-b-2 border-blue-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-400 rounded-md px-2.5 py-1 text-center outline-none transition-all shadow-xs placeholder:text-blue-300 dark:placeholder:text-blue-600 placeholder:font-normal cursor-text pointer-events-auto"
              placeholder="_____"
              value="${escapeHtml(currentVal)}"
              style="min-width: 85px; width: ${inputWidth}px; z-index: 20;"
              title="Nhấp trực tiếp vào đây để nhập đáp án ô #${i + 1}"
            />
          </span>
        `.trim();

        rendered = rendered.split(token).join(inputHtml);
      }
    }

    return rendered;
  }, [content, isReview, acceptedAnswersPerBlank, caseSensitive, trimWhitespace]);

  // Initial render of innerHTML when content or review mode changes
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = generateHtml();
  }, [generateHtml]);

  // Synchronize inputs when external answers change without rebuilding entire DOM (preserves focus & cursor)
  useEffect(() => {
    if (isReview || !containerRef.current) return;
    const inputs = containerRef.current.querySelectorAll<HTMLInputElement>(".dk-interactive-blank-input");
    inputs.forEach((inp) => {
      const idx = Number(inp.getAttribute("data-blank-index"));
      const expectedVal = answers[idx] || "";
      if (inp.value !== expectedVal && document.activeElement !== inp) {
        inp.value = expectedVal;
        inp.style.width = `${Math.max(85, (expectedVal.length + 3) * 11)}px`;
      }
    });
  }, [answers, isReview]);

  // Handle live typing & direct click focus via event delegation
  useEffect(() => {
    const container = containerRef.current;
    if (!container || isReview) return;

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement | null;
      if (!target || !target.classList.contains("dk-interactive-blank-input")) return;

      const idx = Number(target.getAttribute("data-blank-index"));
      const val = target.value;

      // Adjust input width to fit content smoothly
      target.style.width = `${Math.max(85, (val.length + 3) * 11)}px`;

      if (onAnswerChangeRef.current) {
        onAnswerChangeRef.current(idx, val);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.classList.contains("dk-interactive-blank-input")) {
        // Prevent outer exam hotkeys (like 1-4, A-D, F, S, C) from firing while typing
        e.stopPropagation();
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const wrapper = target?.closest("[data-blank-wrapper]");
      if (wrapper) {
        const inp = wrapper.querySelector<HTMLInputElement>("input");
        if (inp && document.activeElement !== inp) {
          inp.focus();
        }
      }
    };

    container.addEventListener("input", handleInput);
    container.addEventListener("keydown", handleKeyDown, true);
    container.addEventListener("click", handleClick);

    return () => {
      container.removeEventListener("input", handleInput);
      container.removeEventListener("keydown", handleKeyDown, true);
      container.removeEventListener("click", handleClick);
    };
  }, [isReview]);

  return (
    <div
      ref={containerRef}
      className={`interactive-fill-blank-text latex-preview leading-relaxed text-slate-800 ${className}`}
    />
  );
}
