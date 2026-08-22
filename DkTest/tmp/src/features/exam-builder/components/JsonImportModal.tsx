import React, { useState, useRef } from "react";
import { X, Upload, FileText, Code2, AlertCircle, CheckCircle2 } from "lucide-react";

interface JsonImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (jsonData: any) => void;
}

export default function JsonImportModal({ isOpen, onClose, onImport }: JsonImportModalProps) {
  const [tab, setTab] = useState<"file" | "paste">("file");
  const [pastedJson, setPastedJson] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      setError("Vui lòng chọn file có định dạng .json!");
      return;
    }

    setSelectedFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        setFileContent(text);
        // Test parse
        JSON.parse(text);
        setError(null);
      } catch (err: any) {
        setError("File JSON không hợp lệ. Vui lòng kiểm tra lại cấu trúc file!");
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      setError("Vui lòng chọn file có định dạng .json!");
      return;
    }

    setSelectedFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        setFileContent(text);
        JSON.parse(text);
        setError(null);
      } catch (err: any) {
        setError("File JSON không hợp lệ. Vui lòng kiểm tra lại cấu trúc file!");
      }
    };
    reader.readAsText(file);
  };

  const handleProcessImport = () => {
    const jsonString = tab === "file" ? fileContent : pastedJson;

    if (!jsonString.trim()) {
      setError(tab === "file" ? "Vui lòng chọn file JSON để tải lên!" : "Vui lòng dán mã JSON vào hộp thoại!");
      return;
    }

    try {
      const parsed = JSON.parse(jsonString);
      setError(null);
      onImport(parsed);
      onClose();
    } catch (err: any) {
      setError("Cấu trúc JSON không đúng định dạng. Vui lòng kiểm tra cú pháp!");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Nhập Đề Thi từ JSON</h3>
              <p className="text-xs text-slate-500">Tải file .json hoặc dán trực tiếp mã JSON đề thi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-4 flex gap-2 border-b border-slate-100">
          <button
            onClick={() => {
              setTab("file");
              setError(null);
            }}
            className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              tab === "file"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <FileText className="w-4 h-4" />
            Tải lên File JSON (.json)
          </button>

          <button
            onClick={() => {
              setTab("paste");
              setError(null);
            }}
            className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              tab === "paste"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Code2 className="w-4 h-4" />
            Dán mã JSON trực tiếp
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {tab === "file" ? (
            <div className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/30 rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-100/80 text-blue-600 flex items-center justify-center shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>

                {selectedFile ? (
                  <div>
                    <div className="flex items-center justify-center gap-2 text-emerald-600 font-semibold text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{selectedFile.name}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Nhấn để thay đổi file
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Kéo thả file .json vào đây</p>
                    <p className="text-xs text-slate-500 mt-1">hoặc nhấn để duyệt file từ máy tính</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Mã JSON cấu trúc đề thi:</label>
              <textarea
                value={pastedJson}
                onChange={(e) => {
                  setPastedJson(e.target.value);
                  setError(null);
                }}
                placeholder='Dán đoạn mã JSON đề thi vào đây, ví dụ: {"exam": {"title": "Đề thi thử..."}, "questions": [...]}'
                rows={10}
                className="w-full p-3 font-mono text-xs bg-slate-900 text-slate-100 rounded-xl border border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleProcessImport}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            Nhập Đề Thi
          </button>
        </div>
      </div>
    </div>
  );
}
