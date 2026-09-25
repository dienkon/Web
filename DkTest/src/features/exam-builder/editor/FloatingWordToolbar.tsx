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
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showCaseMenu, setShowCaseMenu] = useState(false);
  const [showMathMenu, setShowMathMenu] = useState(false);
  const [activeMathCategory, setActiveMathCategory] = useState<string>("algebra");
  const [isCopied, setIsCopied] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Monitor text selection on the textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

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

        // Calculate approximate screen position of the selection
        const rect = el.getBoundingClientRect();
        // Position toolbar floating above the textarea
        const toolbarTop = Math.max(10, rect.top - 52);
        const toolbarLeft = Math.max(10, Math.min(window.innerWidth - 460, rect.left + 20));

        setCoords({ top: toolbarTop, left: toolbarLeft });
        setIsVisible(true);
      } else {
        setIsVisible(false);
        setShowColorPicker(false);
        setShowHighlightPicker(false);
        setShowCaseMenu(false);
        setShowMathMenu(false);
      }
    };

    el.addEventListener("select", handleSelectionChange);
    el.addEventListener("mouseup", handleSelectionChange);
    el.addEventListener("keyup", handleSelectionChange);

    return () => {
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
    setShowColorPicker(false);
    if (!hex) {
      clearFormatting();
      return;
    }
    applyFormat(`<span style="color: ${hex};">`, `</span>`);
  };

  // Apply highlight background
  const applyHighlightColor = (hex: string) => {
    setShowHighlightPicker(false);
    if (!hex) {
      clearFormatting();
      return;
    }
    applyFormat(`<mark style="background-color: ${hex}; padding: 2px 4px; border-radius: 4px;">`, `</mark>`);
  };

  // Transform text case
  const applyCaseTransform = (mode: "upper" | "lower" | "title") => {
    setShowCaseMenu(false);
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

  return (
    <div
      ref={toolbarRef}
      onMouseDown={(e) => {
        // Prevent textarea from immediately losing focus / deselecting on toolbar click
        e.preventDefault();
      }}
      className="fixed z-50 flex items-center gap-0.5 bg-slate-900/95 text-white backdrop-blur-md px-2.5 py-1.5 rounded-2xl shadow-2xl border border-slate-700/80 animate-in fade-in zoom-in-95 duration-150 text-xs select-none"
      style={{
        top: `${coords.top}px`,
        left: `${coords.left}px`,
      }}
    >
      {/* 1. Bold */}
      <button
        type="button"
        onClick={() => applyFormat("**")}
        className="p-1.5 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors text-slate-200 hover:text-white"
        title="In đậm (Bold: **chữ**)"
      >
        <Bold className="w-3.5 h-3.5" />
      </button>

      {/* 2. Italic */}
      <button
        type="button"
        onClick={() => applyFormat("*")}
        className="p-1.5 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors text-slate-200 hover:text-white"
        title="In nghiêng (Italic: *chữ*)"
      >
        <Italic className="w-3.5 h-3.5" />
      </button>

      {/* 3. Underline */}
      <button
        type="button"
        onClick={() => applyFormat("__")}
        className="p-1.5 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors text-slate-200 hover:text-white"
        title="Gạch chân (Underline: __chữ__)"
      >
        <Underline className="w-3.5 h-3.5" />
      </button>

      {/* 4. Strikethrough */}
      <button
        type="button"
        onClick={() => applyFormat("~~")}
        className="p-1.5 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors text-slate-200 hover:text-white"
        title="Gạch ngang (Strikethrough: ~~chữ~~)"
      >
        <Strikethrough className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-4 bg-slate-700 mx-0.5" />

      {/* 5. Subscript */}
      <button
        type="button"
        onClick={() => applyFormat("~")}
        className="p-1.5 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors text-slate-200 hover:text-white"
        title="Chỉ số dưới (~x~)"
      >
        <Subscript className="w-3.5 h-3.5" />
      </button>

      {/* 6. Superscript */}
      <button
        type="button"
        onClick={() => applyFormat("^")}
        className="p-1.5 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors text-slate-200 hover:text-white"
        title="Chỉ số trên (^x^)"
      >
        <Superscript className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-4 bg-slate-700 mx-0.5" />

      {/* 7. Text Color Picker */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowColorPicker(!showColorPicker);
            setShowHighlightPicker(false);
            setShowCaseMenu(false);
            setShowMathMenu(false);
          }}
          className="p-1.5 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors flex items-center gap-0.5 text-slate-200 hover:text-white"
          title="Màu chữ"
        >
          <Palette className="w-3.5 h-3.5 text-red-400" />
          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
        </button>

        {showColorPicker && (
          <div className="absolute left-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-xl p-2 shadow-2xl z-50 w-36 space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Màu chữ</div>
            {TEXT_COLORS.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => applyTextColor(c.hex)}
                className="w-full flex items-center gap-2 px-2 py-1 hover:bg-slate-800 rounded-lg text-left text-xs transition-colors"
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-slate-600 shrink-0"
                  style={{ backgroundColor: c.hex || "#ffffff" }}
                />
                <span className="truncate">{c.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 8. Highlighter Background Picker */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowHighlightPicker(!showHighlightPicker);
            setShowColorPicker(false);
            setShowCaseMenu(false);
            setShowMathMenu(false);
          }}
          className="p-1.5 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors flex items-center gap-0.5 text-slate-200 hover:text-white"
          title="Tô màu nền (Highlight)"
        >
          <Highlighter className="w-3.5 h-3.5 text-yellow-400" />
          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
        </button>

        {showHighlightPicker && (
          <div className="absolute left-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-xl p-2 shadow-2xl z-50 w-36 space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Màu nền</div>
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => applyHighlightColor(c.hex)}
                className="w-full flex items-center gap-2 px-2 py-1 hover:bg-slate-800 rounded-lg text-left text-xs transition-colors"
              >
                <span
                  className="w-3.5 h-3.5 rounded-md border border-slate-600 shrink-0"
                  style={{ backgroundColor: c.hex || "transparent" }}
                />
                <span className="truncate">{c.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-4 bg-slate-700 mx-0.5" />

      {/* 9. Direct Math Wrap ($...$) */}
      <button
        type="button"
        onClick={() => applyFormat("$")}
        className="px-2 py-1 hover:bg-blue-600/30 bg-blue-500/20 text-blue-300 hover:text-blue-100 rounded-lg transition-all text-xs font-bold flex items-center gap-1 border border-blue-500/40"
        title="Bọc công thức toán LaTeX inline ($...$)"
      >
        <Sigma className="w-3.5 h-3.5 text-blue-400" />
        <span>$CT$</span>
      </button>

      {/* 10. Direct Display Math Wrap ($$...$$) */}
      <button
        type="button"
        onClick={() => applyFormat("$$")}
        className="px-1.5 py-1 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors text-slate-300 hover:text-white font-mono text-[11px] font-bold"
        title="Công thức toán dòng riêng ($$...$$)"
      >
        $$
      </button>

      {/* 11. Rich Quick Math Formulas & Symbols Popover */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowMathMenu(!showMathMenu);
            setShowColorPicker(false);
            setShowHighlightPicker(false);
            setShowCaseMenu(false);
          }}
          className={`px-2 py-1 rounded-lg transition-all text-xs font-bold flex items-center gap-1 border cursor-pointer ${
            showMathMenu
              ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
              : "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-600/30 border-indigo-500/40"
          }`}
          title="Chèn nhanh công thức toán học & ký hiệu (Phân số, Căn, Luỹ thừa, Vectơ, Góc...)"
        >
          <Calculator className="w-3.5 h-3.5 text-indigo-300" />
          <span>Công thức</span>
          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
        </button>

        {showMathMenu && (
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl z-50 w-80 sm:w-96 p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
            {/* Header / Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Chèn nhanh công thức Toán</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {selectedText ? `Chọn: "${selectedText.slice(0, 12)}..."` : "Không chọn chữ"}
              </span>
            </div>

            {/* Category Switcher Tabs */}
            <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-800/80 rounded-xl text-[10px] font-bold text-center">
              {FORMULA_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveMathCategory(cat.id)}
                  className={`py-1 px-1.5 rounded-lg transition-all truncate cursor-pointer ${
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

      {/* 12. Inline Code */}
      <button
        type="button"
        onClick={() => applyFormat("`")}
        className="p-1.5 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors text-slate-200 hover:text-white"
        title="Mã nguồn inline (`code`)"
      >
        <Code className="w-3.5 h-3.5 text-emerald-400" />
      </button>

      <div className="w-px h-4 bg-slate-700 mx-0.5" />

      {/* 13. Case Transform Menu */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowCaseMenu(!showCaseMenu);
            setShowColorPicker(false);
            setShowHighlightPicker(false);
            setShowMathMenu(false);
          }}
          className="p-1.5 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors flex items-center gap-0.5 text-slate-200 hover:text-white"
          title="Chuyển đổi hoa / thường"
        >
          <CaseSensitive className="w-3.5 h-3.5" />
          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
        </button>

        {showCaseMenu && (
          <div className="absolute right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-xl p-2 shadow-2xl z-50 w-36 space-y-1">
            <button
              type="button"
              onClick={() => applyCaseTransform("upper")}
              className="w-full text-left px-2.5 py-1 hover:bg-slate-800 rounded-lg text-xs"
            >
              IN HOA (ABC)
            </button>
            <button
              type="button"
              onClick={() => applyCaseTransform("lower")}
              className="w-full text-left px-2.5 py-1 hover:bg-slate-800 rounded-lg text-xs"
            >
              in thường (abc)
            </button>
            <button
              type="button"
              onClick={() => applyCaseTransform("title")}
              className="w-full text-left px-2.5 py-1 hover:bg-slate-800 rounded-lg text-xs"
            >
              Viết Hoa Chữ Đầu
            </button>
          </div>
        )}
      </div>

      {/* 14. Clear Formatting */}
      <button
        type="button"
        onClick={clearFormatting}
        className="p-1.5 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
        title="Xóa định dạng"
      >
        <Eraser className="w-3.5 h-3.5" />
      </button>

      {/* 15. Copy Text */}
      <button
        type="button"
        onClick={handleCopy}
        className="p-1.5 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
        title="Sao chép"
      >
        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
