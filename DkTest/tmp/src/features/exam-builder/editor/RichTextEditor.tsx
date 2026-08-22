import React, { useState, useRef } from "react";
import { Eye, Edit3, Image as ImageIcon, Sigma, Columns, Trash2 } from "lucide-react";
import LatexPreview from "./LatexPreview";
import MathLiveModal from "./MathLiveModal";
import ImageUploadModal from "./ImageUploadModal";

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export default function RichTextEditor({ value, onChange, placeholder, minHeight = "120px" }: Props) {
  const [mode, setMode] = useState<"edit" | "preview" | "split">("edit");
  const [showMathModal, setShowMathModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
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

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white flex flex-col focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all relative">
      <div className="flex items-center justify-between p-1.5 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
              mode === "edit"
                ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" /> Soạn thảo
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
              mode === "preview"
                ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Eye className="w-3.5 h-3.5" /> Xem trước
          </button>
          <button
            type="button"
            onClick={() => setMode("split")}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg hidden sm:flex items-center gap-1.5 transition-colors ${
              mode === "split"
                ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Columns className="w-3.5 h-3.5" /> Chia đôi
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowMathModal(true)}
            className="px-2 py-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
            title="Chèn công thức toán học LaTeX"
          >
            <Sigma className="w-4 h-4 text-blue-600" /> Công thức
          </button>
          <div className="w-px h-4 bg-slate-300 mx-1"></div>
          <button
            type="button"
            onClick={() => setShowImageModal(true)}
            className="px-2 py-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
            title="Chèn hoặc tải ảnh lên"
          >
            <ImageIcon className="w-4 h-4 text-emerald-600" /> Tải ảnh lên hệ thống
          </button>
        </div>
      </div>

      <div className={`flex ${mode === "split" ? "flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-slate-200" : ""}`} style={{ minHeight }}>
        {(mode === "edit" || mode === "split") && (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || "Nhập nội dung câu hỏi (hỗ trợ $công thức toán$, **chữ đậm**, ảnh...)"}
            className={`w-full p-3.5 resize-y border-none focus:outline-none focus:ring-0 text-sm font-sans text-slate-800 leading-relaxed bg-white ${
              mode === "split" ? "sm:w-1/2" : ""
            }`}
            style={{ minHeight }}
          />
        )}

        {(mode === "preview" || mode === "split") && (
          <div
            className={`w-full p-3.5 overflow-y-auto bg-slate-50/50 text-slate-800 text-sm ${
              mode === "split" ? "sm:w-1/2" : ""
            }`}
            style={{ minHeight }}
          >
            {value ? (
              <LatexPreview content={value} />
            ) : (
              <span className="text-slate-400 italic text-xs">Chưa có nội dung xem trước</span>
            )}
          </div>
        )}
      </div>

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
        <MathLiveModal
          onInsert={handleInsertMath}
          onClose={() => setShowMathModal(false)}
        />
      )}

      {showImageModal && (
        <ImageUploadModal
          onInsert={handleInsertImage}
          onClose={() => setShowImageModal(false)}
        />
      )}
    </div>
  );
}
