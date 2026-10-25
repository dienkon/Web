import React, { useState, useRef, useEffect } from "react";
import {
  Eye,
  Edit3,
  Image as ImageIcon,
  Sigma,
  Columns,
  Trash2,
  Code,
  TrendingUp,
  Loader2,
  Globe,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import LatexPreview, { safeEncode, safeDecode, escapeHtml } from "./LatexPreview";
import katex from "katex";
import MathLiveModal from "./MathLiveModal";
import ImageUploadModal from "./ImageUploadModal";
import FloatingWordToolbar from "./FloatingWordToolbar";
import MathGraphModal from "../../math-draw/MathGraphModal";
import { handleClipboardImagePaste } from "../../../utils/clipboardImageUpload";

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minHeight?: string;
}

/**
 * Converts markdown/LaTeX/HTML into an interactive, touch-editable HTML surface.
 * Text is directly editable; LaTeX formulas and HTML widgets are preserved as non-editable tokens with real KaTeX rendering.
 */
export function renderTouchEditableHtml(text: string): string {
  if (!text) return "";

  // 1. Mask HTML widgets, graphs, BBT, and standalone HTML documents
  let protectedText = text;
  const widgetMasks: string[] = [];
  protectedText = protectedText.replace(
    /(?:<(?:html-widget|widget|live-html)\b[\s\S]*?<\/(?:html-widget|widget|live-html)>|<!DOCTYPE\s+html[\s\S]*?(?:<\/html>|$)|<html\b[\s\S]*?(?:<\/html>|$)|```(?:html|widget|simulation|canvas-html|live-code|canvas)[\s\S]*?```|<live-canvas\b[\s\S]*?<\/live-canvas>|<graph\b[\s\S]*?<\/graph>|<bbt\b[\s\S]*?<\/bbt>|(?:<style\b[\s\S]*?<\/style>[\s\S]*?<script\b[\s\S]*?<\/script>|<script\b[\s\S]*?<\/script>[\s\S]*?<style\b[\s\S]*?<\/style>|<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>))/gi,
    (m) => {
      widgetMasks.push(m);
      return `\uE00AHW_${widgetMasks.length - 1}\uE00B`;
    }
  );

  // 2. Mask LaTeX formulas ($...$ or $$...$$) into non-editable chips
  const mathMasks: { full: string; latex: string }[] = [];
  protectedText = protectedText.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    mathMasks.push({ full: `$$${math}$$`, latex: math });
    return `\uE008CHIP_${mathMasks.length - 1}\uE009`;
  });
  protectedText = protectedText.replace(/(^|[^\\])\$([^\$]+?)\$/g, (m, prefix, math) => {
    mathMasks.push({ full: `$${math}$`, latex: math });
    return `${prefix}\uE008CHIP_${mathMasks.length - 1}\uE009`;
  });

  // 3. Escape HTML in the text part to prevent arbitrary tag execution in the editable surface
  let safeHtml = escapeHtml(protectedText);

  // 4. Restore LaTeX chips as contenteditable="false" chips with REAL KaTeX rendering!
  safeHtml = safeHtml.replace(/\uE008CHIP_(\d+)\uE009/g, (_, idx) => {
    const item = mathMasks[parseInt(idx, 10)];
    if (!item) return "";
    let renderedKaTeX = "";
    try {
      renderedKaTeX = katex.renderToString(item.latex, {
        throwOnError: false,
        displayMode: item.full.startsWith("$$"),
      });
    } catch {
      renderedKaTeX = escapeHtml(item.full);
    }
    return `<span contenteditable="false" class="inline-latex-chip inline-flex items-center px-1.5 py-0.5 mx-0.5 bg-blue-50/90 text-blue-900 border border-blue-200 rounded font-normal text-sm select-none shadow-2xs" data-raw-latex="${safeEncode(
      item.full
    )}" title="Công thức LaTeX: ${escapeHtml(item.latex)}">${renderedKaTeX}</span>`;
  });

  // 5. Restore HTML widgets, Graph, BBT as contenteditable="false" preview blocks
  safeHtml = safeHtml.replace(/\uE00AHW_(\d+)\uE00B/g, (_, idx) => {
    const widgetCode = widgetMasks[parseInt(idx, 10)];
    if (!widgetCode) return "";
    const isGraph = /^<graph\b/i.test(widgetCode.trim());
    const isBbt = /^<bbt\b/i.test(widgetCode.trim());
    const isLiveCanvas = /^<live-canvas\b/i.test(widgetCode.trim());

    if (isGraph) {
      return `<div contenteditable="false" class="my-2.5 p-3 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 text-cyan-950 rounded-xl text-xs font-mono select-none flex items-center justify-between shadow-2xs" data-raw-widget="${safeEncode(
        widgetCode
      )}"><div class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-cyan-500"></span><div><div class="font-bold text-cyan-900">Khối Đồ Thị Hàm Số SVG &lt;graph&gt;</div><div class="text-[10px] text-cyan-600 font-sans">Khảo sát hàm số & toạ độ cực trị</div></div></div><span class="text-[10px] text-cyan-700 font-bold bg-white px-2 py-1 rounded-lg border border-cyan-200 shadow-2xs">Đồ thị</span></div>`;
    }

    if (isBbt) {
      return `<div contenteditable="false" class="my-2.5 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-950 rounded-xl text-xs font-mono select-none flex items-center justify-between shadow-2xs" data-raw-widget="${safeEncode(
        widgetCode
      )}"><div class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span><div><div class="font-bold text-emerald-900">Bảng Biến Thiên &lt;bbt&gt;</div><div class="text-[10px] text-emerald-600 font-sans">Chuẩn GDPT 2018 (dấu đạo hàm, mũi tên biến thiên)</div></div></div><span class="text-[10px] text-emerald-700 font-bold bg-white px-2 py-1 rounded-lg border border-emerald-200 shadow-2xs">Bảng biến thiên</span></div>`;
    }

    if (isLiveCanvas) {
      return `<div contenteditable="false" class="my-2.5 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 text-purple-950 rounded-xl text-xs font-mono select-none flex items-center justify-between shadow-2xs" data-raw-widget="${safeEncode(
        widgetCode
      )}"><div class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse"></span><div><div class="font-bold text-purple-900">Bản vẽ Canvas Trực Tiếp &lt;live-canvas&gt;</div><div class="text-[10px] text-purple-600 font-sans">Mã JavaScript vẽ hình toạ độ động</div></div></div><span class="text-[10px] text-purple-700 font-bold bg-white px-2 py-1 rounded-lg border border-purple-200 shadow-2xs">Bản vẽ</span></div>`;
    }

    return `<div contenteditable="false" class="my-2.5 p-3 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 text-indigo-950 rounded-xl text-xs font-mono select-none flex items-center justify-between shadow-2xs" data-raw-widget="${safeEncode(
      widgetCode
    )}"><div class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span><div><div class="font-bold text-indigo-900">Khối mô phỏng HTML5 / JavaScript (Tương tác)</div><div class="text-[10px] text-indigo-600 font-sans">Mã nguồn an toàn trong sandbox iframe</div></div></div><span class="text-[10px] text-indigo-700 font-bold bg-white px-2 py-1 rounded-lg border border-indigo-200 shadow-2xs">Đang chạy</span></div>`;
  });

  // 6. Format Markdown bold and italic for visual feedback while editing
  safeHtml = safeHtml.replace(/\*\*([^*\n]+)\*\*/g, '<strong data-raw-md="bold" class="font-bold text-slate-900">$1</strong>');
  safeHtml = safeHtml.replace(/(^|[\s(>])\*([^\s*][^*\n]*?[^\s*]|[^\s*])\*(?=[\s).,!?<:]|$)/g, '$1<em data-raw-md="italic" class="italic text-slate-800">$2</em>');
  safeHtml = safeHtml.replace(/`([^`\n]+)`/g, '<code data-raw-md="code" class="px-1 py-0.5 mx-0.5 bg-slate-100 text-pink-600 font-mono text-xs rounded border border-slate-200">$1</code>');

  // 7. Linebreaks
  safeHtml = safeHtml.replace(/\n/g, "<br/>");
  return safeHtml;
}

/**
 * Extracts raw markdown/LaTeX/HTML back from the touch-editable container DOM.
 */
export function extractTextFromTouchEditable(container: HTMLElement): string {
  let result = "";
  const TEXT_NODE = typeof Node !== "undefined" ? Node.TEXT_NODE : 3;
  const ELEMENT_NODE = typeof Node !== "undefined" ? Node.ELEMENT_NODE : 1;

  function walk(node: Node) {
    if (node.nodeType === TEXT_NODE) {
      result += node.textContent || "";
      return;
    }

    if (node.nodeType === ELEMENT_NODE) {
      const el = node as HTMLElement;

      // LaTeX chip
      if (el.hasAttribute("data-raw-latex")) {
        result += safeDecode(el.getAttribute("data-raw-latex") || "");
        return;
      }

      // HTML widget block
      if (el.hasAttribute("data-raw-widget")) {
        result += safeDecode(el.getAttribute("data-raw-widget") || "");
        return;
      }

      // Markdown Bold
      if (el.getAttribute("data-raw-md") === "bold" || el.tagName === "STRONG" || el.tagName === "B") {
        result += "**" + el.textContent + "**";
        return;
      }

      // Markdown Italic
      if (el.getAttribute("data-raw-md") === "italic" || el.tagName === "EM" || el.tagName === "I") {
        result += "*" + el.textContent + "*";
        return;
      }

      // Markdown Inline Code
      if (el.getAttribute("data-raw-md") === "code" || el.tagName === "CODE") {
        result += "`" + el.textContent + "`";
        return;
      }

      // Line break
      if (el.tagName.toLowerCase() === "br") {
        result += "\n";
        return;
      }

      // Block-level element
      const isBlock = /^(DIV|P|H[1-6]|LI)$/i.test(el.tagName);
      for (let i = 0; i < el.childNodes.length; i++) {
        walk(el.childNodes[i]);
      }
      if (isBlock && el.nextSibling) {
        result += "\n";
      }
    }
  }

  for (let i = 0; i < container.childNodes.length; i++) {
    walk(container.childNodes[i]);
  }

  return result;
}

/**
 * Component for direct touch-editing on the left preview pane.
 */
function TouchEditablePane({
  value,
  onChange,
  minHeight,
}: {
  value: string;
  onChange: (val: string) => void;
  minHeight: string;
}) {
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const isInternalChangeRef = useRef(false);

  useEffect(() => {
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }
    if (contentEditableRef.current) {
      contentEditableRef.current.innerHTML = renderTouchEditableHtml(value);
    }
  }, [value]);

  const handleInput = () => {
    if (!contentEditableRef.current) return;
    isInternalChangeRef.current = true;
    const extracted = extractTextFromTouchEditable(contentEditableRef.current);
    onChange(extracted);
  };

  return (
    <div
      ref={contentEditableRef}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      className="w-full h-full p-3.5 focus:outline-none text-sm font-sans text-slate-800 leading-relaxed overflow-y-auto whitespace-pre-wrap select-text bg-white"
      style={{ minHeight }}
      title="Bạn có thể gõ chữ trực tiếp tại đây; thay đổi sẽ tự động đồng bộ sang mã nguồn bên phải."
    />
  );
}

export default function RichTextEditor({ value, onChange, placeholder, minHeight = "120px" }: Props) {
  const [mode, setMode] = useState<"edit" | "preview" | "split">("edit");
  const [showMathModal, setShowMathModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showMathGraphModal, setShowMathGraphModal] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isCopiedSource, setIsCopiedSource] = useState(false);
  const [touchEditMode, setTouchEditMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Extract images from markdown ![alt](url)
  const imageMatches = Array.from((value || "").matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g));

  const handleDeleteImage = (fullMatch: string) => {
    const updatedValue = (value || "").replace(fullMatch, "").trim();
    onChange(updatedValue);
  };

  const handleInsertText = (insertedText: string) => {
    const el = textareaRef.current;
    if (el) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const text = el.value;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      const newText = before + insertedText + after;
      onChange(newText);

      setTimeout(() => {
        el.selectionStart = el.selectionEnd = start + insertedText.length;
        el.focus();
      }, 0);
    } else {
      onChange((value || "") + insertedText);
    }
  };

  const handleInsertMath = (latex: string) => {
    handleInsertText(" " + latex + " ");
  };

  const handleInsertImage = (markdown: string) => {
    handleInsertText(markdown);
  };

  const handleInsertCodeBlock = () => {
    handleInsertText("\n```python\n# Nhập mã nguồn ở đây\n\n```\n");
  };

  const handleInsertHtmlWidget = () => {
    const widgetTemplate = `\n<html-widget height="380" title="Khối mô phỏng HTML5 tương tác">\n<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <style>\n    body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; text-align: center; }\n    .sim-card { padding: 20px; background: linear-gradient(135deg, #e0e7ff, #ede9fe); border-radius: 14px; border: 1px solid #c7d2fe; }\n    button { padding: 8px 18px; background: #4f46e5; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; transition: all 0.2s; }\n    button:hover { background: #4338ca; transform: scale(1.05); }\n  </style>\n</head>\n<body>\n  <div class="sim-card">\n    <h3>Mô phỏng tương tác HTML5 / JavaScript</h3>\n    <p id="sim-status">Bấm nút để kích hoạt tương tác:</p>\n    <button onclick="document.getElementById('sim-status').innerText = 'JavaScript đã thực thi thành công! ✓'">Thử nghiệm</button>\n  </div>\n</body>\n</html>\n</html-widget>\n`;
    handleInsertText(widgetTemplate);
  };

  const handleCopySource = () => {
    navigator.clipboard.writeText(value || "").then(() => {
      setIsCopiedSource(true);
      setTimeout(() => setIsCopiedSource(false), 1800);
    });
  };

  // Keyboard navigation & Tab indentation inside textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      handleInsertText("  ");
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white flex flex-col focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all relative">
      {/* ================= PRIMARY TOOLBAR ================= */}
      <div className="flex items-center justify-between p-1.5 bg-slate-50 border-b border-slate-200 flex-wrap gap-1">
        {/* Mode Switcher */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
              mode === "edit"
                ? "bg-white text-blue-600 shadow-xs border border-slate-200"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" /> Soạn thảo
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
              mode === "preview"
                ? "bg-white text-blue-600 shadow-xs border border-slate-200"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Eye className="w-3.5 h-3.5" /> Xem trước
          </button>
          <button
            type="button"
            onClick={() => setMode("split")}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
              mode === "split"
                ? "bg-white text-blue-600 shadow-xs border border-slate-200 ring-1 ring-blue-400"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            }`}
            title="Chế độ song song: Bên trái xem trực quan & sửa, bên phải mã nguồn siêu văn bản"
          >
            <Columns className="w-3.5 h-3.5" /> Chia đôi (Trực quan & Mã nguồn)
          </button>
        </div>

        {/* Insert Actions */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => setShowMathGraphModal(true)}
            className="px-2 py-1 text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            title="Thẻ vẽ đồ thị, bảng biến thiên & khối code trực tiếp"
          >
            <TrendingUp className="w-4 h-4 text-blue-600" /> Vẽ đồ thị / BBT
          </button>
          <div className="w-px h-4 bg-slate-300 mx-0.5"></div>
          <button
            type="button"
            onClick={() => setShowMathModal(true)}
            className="px-2 py-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            title="Chèn công thức toán học LaTeX"
          >
            <Sigma className="w-4 h-4 text-blue-600" /> Công thức
          </button>
          <div className="w-px h-4 bg-slate-300 mx-0.5"></div>
          <button
            type="button"
            onClick={handleInsertHtmlWidget}
            className="px-2 py-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            title="Chèn khối mô phỏng HTML/CSS/JS tương tác (Simulation, 3D, Canvas)"
          >
            <Globe className="w-4 h-4 text-indigo-600" /> HTML Widget
          </button>
          <div className="w-px h-4 bg-slate-300 mx-0.5"></div>
          <button
            type="button"
            onClick={handleInsertCodeBlock}
            className="px-2 py-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            title="Chèn khung mã nguồn lập trình (Discord Code Block)"
          >
            <Code className="w-4 h-4 text-indigo-600" /> Khối mã (Code)
          </button>
          <div className="w-px h-4 bg-slate-300 mx-0.5"></div>
          <button
            type="button"
            onClick={() => setShowImageModal(true)}
            className="px-2 py-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            title="Chèn hoặc tải ảnh lên Cloudinary"
          >
            <ImageIcon className="w-4 h-4 text-emerald-600" /> Tải ảnh lên
          </button>
        </div>
      </div>

      {/* ================= EDITOR WORKSPACE ================= */}
      {/* 1. SINGLE EDIT MODE */}
      {mode === "edit" && (
        <div className="relative w-full flex flex-col" style={{ minHeight }}>
          <FloatingWordToolbar textareaRef={textareaRef} value={value || ""} onChange={onChange} />
          {isUploadingImage && (
            <div className="absolute top-2 right-2 z-10 px-2.5 py-1 bg-blue-600/90 backdrop-blur-xs text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-md animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Đang tải ảnh từ clipboard lên Cloudinary...</span>
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={(e) => {
              handleClipboardImagePaste(e, {
                value,
                onChange,
                textareaRef,
                onUploading: setIsUploadingImage,
              });
            }}
            placeholder={
              placeholder ||
              "Nhập nội dung (hỗ trợ dán ảnh trực tiếp Ctrl+V từ bộ nhớ tạm, dán nguyên file HTML, công thức $...$, đồ thị, bảng biến thiên...)"
            }
            className="w-full flex-1 p-3.5 resize-y border-none focus:outline-none focus:ring-0 text-sm font-sans text-slate-800 leading-relaxed bg-white"
            style={{ minHeight }}
          />
        </div>
      )}

      {/* 2. SINGLE PREVIEW MODE */}
      {mode === "preview" && (
        <div className="w-full p-4 overflow-y-auto bg-slate-50/50 text-slate-800 text-sm" style={{ minHeight }}>
          {value ? (
            <LatexPreview content={value} />
          ) : (
            <span className="text-slate-400 italic text-xs">Chưa có nội dung xem trước</span>
          )}
        </div>
      )}

      {/* 3. SPLIT MODE: LEFT = PREVIEW (TOUCH-EDITABLE), RIGHT = HYPERTEXT SOURCE CODE */}
      {mode === "split" && (
        <div
          className="flex-1 flex flex-col md:flex-row min-h-0 w-full divide-y md:divide-y-0 md:divide-x divide-slate-200"
          style={{ minHeight: `${Math.max(parseInt(minHeight) || 300, 340)}px` }}
        >
          {/* ================= LEFT COLUMN: VISUAL PREVIEW & DIRECT TOUCH-EDIT ================= */}
          <div className="flex-1 min-w-0 md:w-1/2 flex flex-col overflow-hidden bg-white">
            {/* Sub-header banner for left column */}
            <div className="px-3 py-1.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                <span>Bản xem trực quan</span>
                <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                  (KaTeX & HTML Widget)
                </span>
              </div>

              {/* Touch-Edit vs Pure View Toggle */}
              <div className="flex items-center gap-1 bg-slate-200/60 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setTouchEditMode(false)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    !touchEditMode
                      ? "bg-white text-blue-700 shadow-2xs font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Xem trước kết quả hoàn chỉnh (chạy HTML Widget, đồ thị, KaTeX...)"
                >
                  <Eye className="w-3 h-3 text-blue-600" />
                  <span>Bản chuẩn</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTouchEditMode(true)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    touchEditMode
                      ? "bg-blue-600 text-white shadow-2xs font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Đút tay gõ chữ sửa trực tiếp ngay trên bản xem trước!"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Đút tay sửa chữ</span>
                </button>
              </div>
            </div>

            {/* Left Column Body */}
            <div className="flex-1 overflow-y-auto p-3.5 min-h-0 bg-slate-50/30">
              {touchEditMode ? (
                <TouchEditablePane value={value} onChange={onChange} minHeight={minHeight} />
              ) : value ? (
                <div
                  onDoubleClick={() => setTouchEditMode(true)}
                  title="Nhấp đúp chuột để đút tay sửa trực tiếp"
                  className="cursor-pointer"
                >
                  <LatexPreview content={value} />
                </div>
              ) : (
                <span className="text-slate-400 italic text-xs">Chưa có nội dung xem trước</span>
              )}
            </div>
          </div>

          {/* ================= RIGHT COLUMN: HYPERTEXT SOURCE CODE EDITOR ================= */}
          <div className="flex-1 min-w-0 md:w-1/2 flex flex-col overflow-hidden bg-slate-50/40 relative">
            <FloatingWordToolbar textareaRef={textareaRef} value={value || ""} onChange={onChange} />

            {/* Sub-header banner for right column */}
            <div className="px-3 py-1.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <Code className="w-3.5 h-3.5 text-indigo-600" />
                <span>Mã nguồn siêu văn bản (Source Code)</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopySource}
                  className="px-2 py-0.5 rounded-lg text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Sao chép toàn bộ mã nguồn"
                >
                  {isCopiedSource ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onChange("")}
                  className="px-2 py-0.5 rounded-lg text-[11px] font-medium text-slate-500 hover:text-red-600 bg-white border border-slate-200 hover:bg-red-50 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Xoá toàn bộ nội dung"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Xoá</span>
                </button>
              </div>
            </div>

            {/* Source Editor Body */}
            <div className="relative flex-1 flex flex-col min-h-0 bg-white">
              {isUploadingImage && (
                <div className="absolute top-2 right-2 z-10 px-2.5 py-1 bg-blue-600/90 backdrop-blur-xs text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-md animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang tải ảnh từ clipboard lên Cloudinary...</span>
                </div>
              )}
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={(e) => {
                  handleClipboardImagePaste(e, {
                    value,
                    onChange,
                    textareaRef,
                    onUploading: setIsUploadingImage,
                  });
                }}
                placeholder={
                  placeholder ||
                  "Dán mã nguồn HTML, công thức LaTeX ($...), markdown, CSS & JavaScript vào đây..."
                }
                className="w-full flex-1 p-3.5 resize-y border-none focus:outline-none focus:ring-0 text-xs sm:text-sm font-mono text-slate-800 leading-relaxed bg-white"
                style={{ minHeight }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Direct Image Preview Bar with Easy Delete Button */}
      {imageMatches.length > 0 && (
        <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
            <span>Hình ảnh đính kèm trong câu hỏi ({imageMatches.length})</span>
          </div>

          <div className="flex flex-wrap gap-3">
            {imageMatches.map((match, idx) => {
              const fullMatch = match[0];
              const alt = match[1] || `Ảnh ${idx + 1}`;
              const url = match[2];

              return (
                <div
                  key={`img-preview-${idx}`}
                  className="relative group bg-white border border-slate-200 rounded-xl p-2 shadow-2xs flex items-center gap-3 pr-8"
                >
                  <img
                    src={url}
                    alt={alt}
                    className="w-12 h-12 rounded-lg object-contain bg-slate-100 border border-slate-200 shrink-0"
                  />
                  <div className="max-w-[180px] truncate">
                    <div className="text-xs font-bold text-slate-800 truncate">{alt}</div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">{url}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteImage(fullMatch)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-colors cursor-pointer"
                    title="Xóa hình ảnh này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showMathModal && (
        <MathLiveModal onInsert={handleInsertMath} onClose={() => setShowMathModal(false)} />
      )}

      {showImageModal && (
        <ImageUploadModal onInsert={handleInsertImage} onClose={() => setShowImageModal(false)} />
      )}

      {showMathGraphModal && (
        <MathGraphModal onInsert={handleInsertText} onClose={() => setShowMathGraphModal(false)} />
      )}
    </div>
  );
}
