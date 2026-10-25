import React, { useState, useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Subscript,
  Superscript,
  Palette,
  Highlighter,
  Sigma,
  Code,
  CaseSensitive,
  Eraser,
  Copy,
  Check,
  ChevronDown,
  Calculator,
  Quote,
  Sparkles,
  Layers,
  MoreHorizontal,
} from "lucide-react";

interface Props {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (newValue: string) => void;
}

const TEXT_COLORS = [
  { label: "Mặc định", hex: "" },
  { label: "Đỏ", hex: "#dc2626" },
  { label: "Xanh dương", hex: "#2563eb" },
  { label: "Xanh lá", hex: "#16a34a" },
  { label: "Cam hổ phách", hex: "#d97706" },
  { label: "Tím", hex: "#9333ea" },
  { label: "Hồng", hex: "#db2777" },
];

const HIGHLIGHT_COLORS = [
  { label: "Không tô", hex: "" },
  { label: "Vàng nhạt", hex: "#fef08a" },
  { label: "Xanh lá nhạt", hex: "#bbf7d0" },
  { label: "Xanh lam nhạt", hex: "#bae6fd" },
  { label: "Hồng nhạt", hex: "#fbcfe8" },
  { label: "Cam nhạt", hex: "#fed7aa" },
];

// Quick Math Formula Categories
interface MathItem {
  label: string;
  display: string;
  template: (selected: string) => string;
}

const FORMULA_CATEGORIES: { id: string; label: string; items: MathItem[] }[] = [
  {
    id: "algebra",
    label: "Đại số & Giải tích",
    items: [
      {
        label: "Phân số",
        display: "a/b",
        template: (sel) => (sel ? `\\frac{${sel}}{b}` : `\\frac{a}{b}`),
      },
      {
        label: "Căn bậc 2",
        display: "√x",
        template: (sel) => `\\sqrt{${sel || "x"}}`,
      },
      {
        label: "Căn bậc n",
        display: "ⁿ√x",
        template: (sel) => `\\sqrt[n]{${sel || "x"}}`,
      },
      {
        label: "Số mũ / Bình phương",
        display: "x²",
        template: (sel) => `${sel || "x"}^{2}`,
      },
      {
        label: "Chỉ số dưới",
        display: "x₁",
        template: (sel) => `${sel || "x"}_{1}`,
      },
      {
        label: "Đạo hàm",
        display: "f'(x)",
        template: (sel) => (sel ? `${sel}'` : `f'(x)`),
      },
      {
        label: "Tích phân",
        display: "∫ f(x)dx",
        template: (sel) => `\\int_{a}^{b} ${sel || "f(x)"}\\,dx`,
      },
      {
        label: "Giới hạn",
        display: "lim x→x₀",
        template: (sel) => `\\lim_{x \\to x_0} ${sel || "f(x)"}`,
      },
      {
        label: "Tổng xích ma",
        display: "∑",
        template: () => `\\sum_{i=1}^{n} a_i`,
      },
      {
        label: "Logarit",
        display: "log_a(b)",
        template: (sel) => `\\log_{a}(${sel || "b"})`,
      },
      {
        label: "Hệ phương trình",
        display: "{ Hệ PT",
        template: () => `\\begin{cases} x + y = 1 \\\\ x - y = 0 \\end{cases}`,
      },
      {
        label: "Ma trận",
        display: "[ Ma trận ]",
        template: () => `\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}`,
      },
    ],
  },
  {
    id: "geometry",
    label: "Hình học & Vectơ",
    items: [
      {
        label: "Vectơ",
        display: "AB⃗",
        template: (sel) => `\\vec{${sel || "AB"}}`,
      },
      {
        label: "Độ dài vectơ",
        display: "|AB⃗|",
        template: (sel) => `|\\vec{${sel || "AB"}}|`,
      },
      {
        label: "Góc",
        display: "ABĈ",
        template: (sel) => `\\widehat{${sel || "ABC"}}`,
      },
      {
        label: "Tam giác",
        display: "Δ ABC",
        template: (sel) => `\\Delta ${sel || "ABC"}`,
      },
      {
        label: "Vuông góc",
        display: "⊥",
        template: (sel) => (sel ? `${sel} \\perp d` : `AB \\perp CD`),
      },
      {
        label: "Song song",
        display: "∥",
        template: (sel) => (sel ? `${sel} \\parallel d` : `AB \\parallel CD`),
      },
      {
        label: "Đồng dạng",
        display: "∽",
        template: () => `\\Delta ABC \\sim \\Delta A'B'C'`,
      },
      {
        label: "Độ (°)",
        display: "°",
        template: (sel) => `${sel || "90"}^\\circ`,
      },
    ],
  },
  {
    id: "symbols",
    label: "Ký hiệu & Tập hợp",
    items: [
      { label: "Cộng trừ", display: "±", template: () => `\\pm` },
      { label: "Nhân", display: "×", template: () => `\\times` },
      { label: "Chia", display: "÷", template: () => `\\div` },
      { label: "Chấm nhân", display: "·", template: () => `\\cdot` },
      { label: "Khác", display: "≠", template: () => `\\neq` },
      { label: "Nhỏ hơn bằng", display: "≤", template: () => `\\le` },
      { label: "Lớn hơn bằng", display: "≥", template: () => `\\ge` },
      { label: "Xấp xỉ", display: "≈", template: () => `\\approx` },
      { label: "Thuộc", display: "∈", template: () => `\\in` },
      { label: "Không thuộc", display: "∉", template: () => `\\notin` },
      { label: "Tập con", display: "⊂", template: () => `\\subset` },
      { label: "Hợp", display: "∪", template: () => `\\cup` },
      { label: "Giao", display: "∩", template: () => `\\cap` },
      { label: "Tập rỗng", display: "∅", template: () => `\\emptyset` },
      { label: "Vô cùng", display: "∞", template: () => `\\infty` },
      { label: "Số Pi", display: "π", template: () => `\\pi` },
      { label: "Suy ra", display: "⇒", template: () => `\\Rightarrow` },
      { label: "Tương đương", display: "⇔", template: () => `\\Leftrightarrow` },
      { label: "Với mọi", display: "∀", template: () => `\\forall` },
      { label: "Tồn tại", display: "∃", template: () => `\\exists` },
    ],
  },
  {
    id: "greek",
    label: "Ký tự Hy Lạp",
    items: [
      { label: "Alpha", display: "α", template: () => `\\alpha` },
      { label: "Beta", display: "β", template: () => `\\beta` },
      { label: "Gamma", display: "γ", template: () => `\\gamma` },
      { label: "Delta", display: "Δ", template: () => `\\Delta` },
      { label: "Theta", display: "θ", template: () => `\\theta` },
      { label: "Lambda", display: "λ", template: () => `\\lambda` },
      { label: "Mu", display: "μ", template: () => `\\mu` },
      { label: "Sigma", display: "σ", template: () => `\\sigma` },
      { label: "Omega", display: "ω", template: () => `\\omega` },
      { label: "Phi", display: "φ", template: () => `\\varphi` },
    ],
  },
];

export default function FloatingWordToolbar({ textareaRef, value, onChange }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [colorTab, setColorTab] = useState<"text" | "highlight">("text");
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showMathMenu, setShowMathMenu] = useState(false);
  const [activeMathCategory, setActiveMathCategory] = useState<string>("algebra");
  const [isCopied, setIsCopied] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const mouseCoordsRef = useRef<{ x: number; y: number } | null>(null);

  // Monitor text selection on the textarea with mouse-following positioning
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    const handleMouseDown = (e: MouseEvent) => {
      mouseCoordsRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = (e: MouseEvent) => {
      mouseCoordsRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleSelectionChange = () => {
      if (document.activeElement !== el) {
        // If user is clicking within the toolbar, don't hide
        if (toolbarRef.current && toolbarRef.current.contains(document.activeElement)) {
          return;
        }
      }

      const start = el.selectionStart;
      const end = el.selectionEnd;

      if (start !== end && end - start > 0) {
        setSelectedRange({ start, end });

        // Calculate screen position of selection near cursor or top of textarea
        const rect = el.getBoundingClientRect();
        let toolbarTop = rect.top - 46;
        let toolbarLeft = rect.left + 16;

        if (mouseCoordsRef.current && mouseCoordsRef.current.y >= rect.top - 10 && mouseCoordsRef.current.y <= rect.bottom + 10) {
          toolbarTop = mouseCoordsRef.current.y - 48;
          if (toolbarTop < 20) {
            toolbarTop = mouseCoordsRef.current.y + 24;
          }
          toolbarLeft = mouseCoordsRef.current.x - 140;
        }

        // Clamp safely inside viewport boundaries
        const toolbarWidth = 280;
        toolbarTop = Math.max(8, Math.min(window.innerHeight - 54, toolbarTop));
        toolbarLeft = Math.max(8, Math.min(window.innerWidth - toolbarWidth - 10, toolbarLeft));

        setCoords({ top: toolbarTop, left: toolbarLeft });
        setIsVisible(true);
      } else {
        setIsVisible(false);
        setShowColorMenu(false);
        setShowMoreMenu(false);
        setShowMathMenu(false);
      }
    };

    el.addEventListener("mousedown", handleMouseDown);
    el.addEventListener("mouseup", handleMouseUp);
    el.addEventListener("select", handleSelectionChange);
    el.addEventListener("mouseup", handleSelectionChange);
    el.addEventListener("keyup", handleSelectionChange);

    return () => {
      el.removeEventListener("mousedown", handleMouseDown);
      el.removeEventListener("mouseup", handleMouseUp);
      el.removeEventListener("select", handleSelectionChange);
      el.removeEventListener("mouseup", handleSelectionChange);
      el.removeEventListener("keyup", handleSelectionChange);
    };
  }, [textareaRef]);

  // Apply wrapper format
  const applyFormat = (prefix: string, suffix: string = prefix) => {
    const el = textareaRef.current;
    if (!el) return;

    const { start, end } = selectedRange;
    const text = value;
    const selected = text.substring(start, end);

    let newText = "";
    // If already wrapped, toggle off (unwrap)
    if (selected.startsWith(prefix) && selected.endsWith(suffix) && selected.length >= prefix.length + suffix.length) {
      const unwrapped = selected.slice(prefix.length, selected.length - suffix.length);
      newText = text.substring(0, start) + unwrapped + text.substring(end);
      onChange(newText);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start, start + unwrapped.length);
      }, 0);
    } else {
      const wrapped = prefix + selected + suffix;
      newText = text.substring(0, start) + wrapped + text.substring(end);
      onChange(newText);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start, start + wrapped.length);
      }, 0);
    }
  };

  // Insert or wrap with a math template
  const insertMathSnippet = (mathLatex: string, wrapDollar = true) => {
    const el = textareaRef.current;
    if (!el) return;

    const { start, end } = selectedRange;
    const formatted = wrapDollar ? `$${mathLatex}$` : mathLatex;
    const newText = value.substring(0, start) + formatted + value.substring(end);
    onChange(newText);

    setShowMathMenu(false);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start, start + formatted.length);
    }, 0);
  };

  // Apply font color
  const applyTextColor = (hex: string) => {
    setShowColorMenu(false);
    if (!hex) {
      clearFormatting();
      return;
    }
    applyFormat(`<span style="color: ${hex};">`, `</span>`);
  };

  // Apply highlight background
  const applyHighlightColor = (hex: string) => {
    setShowColorMenu(false);
    if (!hex) {
      clearFormatting();
      return;
    }
    applyFormat(`<mark style="background-color: ${hex}; padding: 2px 4px; border-radius: 4px;">`, `</mark>`);
  };

  // Transform text case
  const applyCaseTransform = (mode: "upper" | "lower" | "title") => {
    setShowMoreMenu(false);
    const el = textareaRef.current;
    if (!el) return;

    const { start, end } = selectedRange;
    const text = value;
    const selected = text.substring(start, end);

    let transformed = selected;
    if (mode === "upper") transformed = selected.toUpperCase();
    else if (mode === "lower") transformed = selected.toLowerCase();
    else if (mode === "title") {
      transformed = selected.replace(/\b\w/g, (char) => char.toUpperCase());
    }

    const newText = text.substring(0, start) + transformed + text.substring(end);
    onChange(newText);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start, start + transformed.length);
    }, 0);
  };

  // Clear all formatting from selection
  const clearFormatting = () => {
    const el = textareaRef.current;
    if (!el) return;

    const { start, end } = selectedRange;
    const text = value;
    let selected = text.substring(start, end);

    // Strip html tags
    selected = selected.replace(/<[^>]*>/g, "");
    // Strip markdown formatting symbols: **, *, __, ~~, `, $, ~, ^
    selected = selected
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/~~([^~]+)~~/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\$([^$]+)\$/g, "$1")
      .replace(/~([^~]+)~/g, "$1")
      .replace(/\^([^^]+)\^/g, "$1");

    const newText = text.substring(0, start) + selected + text.substring(end);
    onChange(newText);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start, start + selected.length);
    }, 0);
  };

  // Copy selection to clipboard
  const handleCopy = () => {
    const { start, end } = selectedRange;
    const selected = value.substring(start, end);
    navigator.clipboard.writeText(selected).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
    });
  };

  if (!isVisible) return null;

  const currentCategory =
    FORMULA_CATEGORIES.find((c) => c.id === activeMathCategory) || FORMULA_CATEGORIES[0];
  const selectedText = value.substring(selectedRange.start, selectedRange.end);
  const isNearRight = coords.left > (typeof window !== "undefined" ? window.innerWidth / 2 : 400);

  return (
    <div
      ref={toolbarRef}
      onMouseDown={(e) => {
        // Prevent textarea from immediately losing focus / deselecting on toolbar click
        e.preventDefault();
      }}
      className="fixed z-50 flex items-center gap-1 bg-slate-900/95 text-white backdrop-blur-md px-2.5 py-1 rounded-2xl shadow-2xl border border-slate-700/80 animate-in fade-in zoom-in-95 duration-150 text-xs select-none max-w-[calc(100vw-16px)]"
      style={{
        top: `${coords.top}px`,
        left: `${coords.left}px`,
      }}
    >
      {/* 1. Basic Typography Group */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => applyFormat("**")}
          className="p-1.5 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors text-slate-200 hover:text-white"
          title="In đậm (Bold: **chữ**)"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat("*")}
          className="p-1.5 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors text-slate-200 hover:text-white"
          title="In nghiêng (Italic: *chữ*)"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat("__")}
          className="p-1.5 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors text-slate-200 hover:text-white"
          title="Gạch chân (Underline: __chữ__)"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="w-px h-4 bg-slate-700 mx-0.5" />

      {/* 2. Math Formulas Group */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => applyFormat("$")}
          className="px-2 py-1 bg-blue-500/20 hover:bg-blue-600/30 text-blue-300 hover:text-blue-100 rounded-lg transition-all text-xs font-bold flex items-center gap-1 border border-blue-500/40"
          title="Bọc công thức toán LaTeX inline ($...$)"
        >
          <Sigma className="w-3.5 h-3.5 text-blue-400" />
          <span>$x$</span>
        </button>

        <button
          type="button"
          onClick={() => applyFormat("$$")}
          className="px-1.5 py-1 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors text-slate-300 hover:text-white font-mono text-[11px] font-bold"
          title="Công thức toán dòng riêng ($$...$$)"
        >
          $$
        </button>

        {/* Quick Math Formulas Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowMathMenu(!showMathMenu);
              setShowColorMenu(false);
              setShowMoreMenu(false);
            }}
            className={`px-2 py-1 rounded-lg transition-all text-xs font-bold flex items-center gap-1 border cursor-pointer ${
              showMathMenu
                ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                : "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-600/30 border-indigo-500/40"
            }`}
            title="Chèn nhanh công thức toán học & ký hiệu (Phân số, Căn, Luỹ thừa, Vectơ, Góc...)"
          >
            <Calculator className="w-3.5 h-3.5 text-indigo-300" />
            <span className="hidden sm:inline">Công thức</span>
            <ChevronDown className="w-2.5 h-2.5 opacity-60" />
          </button>

          {showMathMenu && (
            <div
              className={`absolute top-full mt-2 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl z-50 w-72 sm:w-84 p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-150 ${
                isNearRight ? "right-0" : "left-0"
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Chèn nhanh công thức Toán</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {selectedText ? `"${selectedText.slice(0, 10)}..."` : "Chưa chọn chữ"}
                </span>
              </div>

              {/* Category Switcher Tabs */}
              <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-800/80 rounded-xl text-[10px] font-bold text-center">
                {FORMULA_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveMathCategory(cat.id)}
                    className={`py-1 px-1 rounded-lg transition-all truncate cursor-pointer ${
                      activeMathCategory === cat.id
                        ? "bg-indigo-600 text-white shadow-xs font-black"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {cat.label.split(" ")[0]}
                  </button>
                ))}
              </div>

              {/* Category Items Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-slate-700">
                {currentCategory.items.map((item, i) => {
                  const generated = item.template(selectedText);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => insertMathSnippet(generated, true)}
                      className="p-1.5 bg-slate-800/90 hover:bg-indigo-600/80 border border-slate-700 hover:border-indigo-400 rounded-xl flex flex-col items-center justify-center gap-0.5 text-center transition-all cursor-pointer group shadow-2xs"
                      title={`${item.label}: $${generated}$`}
                    >
                      <span className="text-xs font-mono font-bold text-white group-hover:scale-105 transition-transform">
                        {item.display}
                      </span>
                      <span className="text-[9px] text-slate-400 group-hover:text-indigo-200 truncate w-full">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Footer Quick Wrappers */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] gap-1 flex-wrap">
                <span className="text-slate-400 text-[10px]">Đóng ngoặc:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => applyFormat("(", ")")}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-mono text-xs"
                    title="Ngoặc đơn (...)"
                  >
                    ( )
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat("[", "]")}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-mono text-xs"
                    title="Ngoặc vuông [...]"
                  >
                    [ ]
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat("\\{", "\\}")}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-mono text-xs"
                    title="Ngoặc nhọn {...}"
                  >
                    {`{ }`}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat('"', '"')}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-mono text-xs"
                    title='Ngoặc kép "..."'
                  >
                    " "
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="w-px h-4 bg-slate-700 mx-0.5" />

      {/* 3. Combined Color & Highlight Palette */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowColorMenu(!showColorMenu);
            setShowMathMenu(false);
            setShowMoreMenu(false);
          }}
          className="p-1.5 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors flex items-center gap-0.5 text-slate-200 hover:text-white"
          title="Màu chữ & Tô nền Highlight"
        >
          <Palette className="w-3.5 h-3.5 text-yellow-400" />
          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
        </button>

        {showColorMenu && (
          <div
            className={`absolute top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-2xl p-2.5 shadow-2xl z-50 w-48 space-y-2 animate-in fade-in zoom-in-95 duration-100 ${
              isNearRight ? "right-0" : "left-0"
            }`}
          >
            {/* Tabs: Màu chữ / Màu nền */}
            <div className="flex bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setColorTab("text")}
                className={`flex-1 py-1 rounded-md transition-all ${
                  colorTab === "text" ? "bg-slate-700 text-white font-extrabold" : "text-slate-400"
                }`}
              >
                Màu chữ
              </button>
              <button
                type="button"
                onClick={() => setColorTab("highlight")}
                className={`flex-1 py-1 rounded-md transition-all ${
                  colorTab === "highlight" ? "bg-slate-700 text-white font-extrabold" : "text-slate-400"
                }`}
              >
                Tô nền
              </button>
            </div>

            {/* Colors Grid */}
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {(colorTab === "text" ? TEXT_COLORS : HIGHLIGHT_COLORS).map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => {
                    if (colorTab === "text") applyTextColor(c.hex);
                    else applyHighlightColor(c.hex);
                    setShowColorMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1 hover:bg-slate-800 rounded-lg text-left text-xs transition-colors"
                >
                  <span
                    className={`w-3.5 h-3.5 border border-slate-600 shrink-0 ${
                      colorTab === "text" ? "rounded-full" : "rounded-sm"
                    }`}
                    style={{ backgroundColor: c.hex || (colorTab === "text" ? "#ffffff" : "transparent") }}
                  />
                  <span className="truncate">{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. More Formatting Dropdown (Code, Sub, Super, Strike, Case, Eraser) */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowMoreMenu(!showMoreMenu);
            setShowMathMenu(false);
            setShowColorMenu(false);
          }}
          className="p-1.5 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors flex items-center gap-0.5 text-slate-200 hover:text-white"
          title="Thêm công cụ định dạng (Code, Chỉ số trên/dưới, Gạch ngang, Xoá định dạng...)"
        >
          <MoreHorizontal className="w-3.5 h-3.5 text-slate-300" />
          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
        </button>

        {showMoreMenu && (
          <div
            className={`absolute top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl z-50 w-44 space-y-1 animate-in fade-in zoom-in-95 duration-100 ${
              isNearRight ? "right-0" : "left-0"
            }`}
          >
            <button
              type="button"
              onClick={() => {
                applyFormat("`");
                setShowMoreMenu(false);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-800 rounded-lg text-xs transition-colors"
            >
              <Code className="w-3.5 h-3.5 text-emerald-400" />
              <span>Khối mã (`code`)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                applyFormat("~");
                setShowMoreMenu(false);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-800 rounded-lg text-xs transition-colors"
            >
              <Subscript className="w-3.5 h-3.5 text-slate-300" />
              <span>Chỉ số dưới (x₁)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                applyFormat("^");
                setShowMoreMenu(false);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-800 rounded-lg text-xs transition-colors"
            >
              <Superscript className="w-3.5 h-3.5 text-slate-300" />
              <span>Chỉ số trên (x²)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                applyFormat("~~");
                setShowMoreMenu(false);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-800 rounded-lg text-xs transition-colors"
            >
              <Strikethrough className="w-3.5 h-3.5 text-slate-300" />
              <span>Gạch ngang (~~x~~)</span>
            </button>

            <div className="w-full h-px bg-slate-800 my-1" />

            <div className="px-2 py-0.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Hoa / Thường
            </div>

            <button
              type="button"
              onClick={() => {
                applyCaseTransform("upper");
                setShowMoreMenu(false);
              }}
              className="w-full text-left px-2.5 py-1 hover:bg-slate-800 rounded-lg text-xs"
            >
              IN HOA (ABC)
            </button>
            <button
              type="button"
              onClick={() => {
                applyCaseTransform("lower");
                setShowMoreMenu(false);
              }}
              className="w-full text-left px-2.5 py-1 hover:bg-slate-800 rounded-lg text-xs"
            >
              in thường (abc)
            </button>
            <button
              type="button"
              onClick={() => {
                applyCaseTransform("title");
                setShowMoreMenu(false);
              }}
              className="w-full text-left px-2.5 py-1 hover:bg-slate-800 rounded-lg text-xs"
            >
              Viết Hoa Chữ Đầu
            </button>

            <div className="w-full h-px bg-slate-800 my-1" />

            <button
              type="button"
              onClick={() => {
                clearFormatting();
                setShowMoreMenu(false);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-red-500/20 text-red-300 rounded-lg text-xs transition-colors"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Xóa định dạng</span>
            </button>
          </div>
        )}
      </div>

      <div className="w-px h-4 bg-slate-700 mx-0.5" />

      {/* 5. Copy Button */}
      <button
        type="button"
        onClick={handleCopy}
        className="p-1.5 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors text-slate-300 hover:text-white"
        title="Sao chép văn bản đã chọn"
      >
        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
