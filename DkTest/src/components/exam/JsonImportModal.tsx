import React, { useState, useRef } from "react";
import { Upload, X, CheckCircle, AlertTriangle, FileJson, Loader2 } from "lucide-react";
import { parseExamFile } from "../../utils/json/importExamJson";
import { ExportV3 } from "../../utils/json/schema";

interface JsonImportModalProps {
  onClose: () => void;
  onImport: (data: ExportV3, mode: "new_exam" | "update_exam" | "question_bank", targetSectionId?: string) => Promise<void>;
  existingSections?: {id: string, title: string}[];
  isQuestionBankOnly?: boolean;
}

export default function JsonImportModal({ onClose, onImport, existingSections, isQuestionBankOnly }: JsonImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<ExportV3 | null>(null);
  
  const [importMode, setImportMode] = useState<"new_exam" | "update_exam" | "question_bank">(isQuestionBankOnly ? "question_bank" : "new_exam");
  const [targetSectionId, setTargetSectionId] = useState<string>(existingSections?.[0]?.id || "");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) await processFile(selectedFile);
  };

  const processFile = async (selectedFile: File) => {
    if (!selectedFile.name.endsWith(".json")) {
      setError("Vui lòng chọn file .json");
      return;
    }
    setFile(selectedFile);
    setLoading(true);
    setError(null);
    setValidationErrors([]);

    const result = await parseExamFile(selectedFile);
    setLoading(false);

    if (result.success && result.data) {
      setPreviewData(result.data);
      if (result.data.exportType === "question_bank" && !isQuestionBankOnly) {
        setImportMode("question_bank");
      }
    } else {
      setValidationErrors(result.errors);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) await processFile(droppedFile);
  };

  const handleImportClick = async () => {
    if (!previewData) return;
    setImporting(true);
    try {
      await onImport(previewData, importMode, importMode === "question_bank" ? targetSectionId : undefined);
    } catch (err: any) {
      setError(err.message || "Lỗi khi import");
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-semibold text-slate-800 flex items-center">
            <FileJson className="w-5 h-5 mr-2 text-blue-600" /> Import JSON
          </h2>
          <button onClick={onClose} disabled={importing} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {!previewData && !validationErrors.length && (
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                isDragging ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-slate-400"
              }`}
            >
              <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
              <Upload className="w-10 h-10 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 mb-2">Kéo JSON vào đây hoặc</p>
              <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                Chọn file
              </button>
              {error && <p className="text-red-500 mt-4 text-sm">{error}</p>}
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
              <p className="text-slate-600">Đang đọc file...</p>
            </div>
          )}

          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center text-red-700 font-semibold mb-2">
                <AlertTriangle className="w-5 h-5 mr-2" /> Import thất bại
              </div>
              <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                {validationErrors.slice(0, 10).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {validationErrors.length > 10 && (
                  <li>...và {validationErrors.length - 10} lỗi khác</li>
                )}
              </ul>
              <button onClick={() => { setValidationErrors([]); setFile(null); }} className="mt-4 px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded text-sm hover:bg-red-50">
                Thử lại
              </button>
            </div>
          )}

          {previewData && !importing && (
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-800 mb-4">JSON Import Preview</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-slate-500">Loại Export:</span> <span className="font-medium text-slate-900 capitalize">{previewData.exportType.replace('_', ' ')}</span></div>
                  <div><span className="text-slate-500">Version:</span> <span className="font-medium text-slate-900">{previewData.version}</span></div>
                  
                  {previewData.exportType === "exam" && previewData.exam && (
                    <>
                      <div className="col-span-2"><span className="text-slate-500">Tên bài:</span> <span className="font-medium text-slate-900">{previewData.exam.title}</span></div>
                      <div><span className="text-slate-500">Thời gian:</span> <span className="font-medium text-slate-900">{previewData.exam.timeLimit} phút</span></div>
                    </>
                  )}
                  
                  <div><span className="text-slate-500">Số câu:</span> <span className="font-medium text-slate-900">{previewData.questions.length}</span></div>
                  <div><span className="text-slate-500">Sections:</span> <span className="font-medium text-slate-900">{previewData.sections?.length || 0}</span></div>
                </div>
              </div>

              {!isQuestionBankOnly && (
                <div className="space-y-3">
                  <h4 className="font-medium text-slate-800">Import mode:</h4>
                  
                  {previewData.exportType === "exam" && (
                    <>
                      <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                        <input type="radio" checked={importMode === "new_exam"} onChange={() => setImportMode("new_exam")} className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-slate-700">Tạo bài thi mới</span>
                      </label>
                    </>
                  )}
                  
                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input type="radio" checked={importMode === "question_bank"} onChange={() => setImportMode("question_bank")} className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-slate-700">Chỉ thêm câu hỏi vào Question Bank (Section)</span>
                  </label>
                </div>
              )}

              {importMode === "question_bank" && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Thêm vào section:</label>
                  <select 
                    value={targetSectionId} 
                    onChange={e => setTargetSectionId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Chọn Section --</option>
                    <option value="NEW_SECTION">+ Tạo Section mới</option>
                    {existingSections?.map(s => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {importing && (
            <div className="py-12 text-center space-y-4">
               <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
               <h3 className="text-lg font-medium text-slate-800">Đang import...</h3>
               <p className="text-sm text-slate-500">Vui lòng không đóng cửa sổ này</p>
            </div>
          )}

        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
          <button onClick={onClose} disabled={importing} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-100 transition-colors">
            Hủy
          </button>
          {previewData && !importing && (
            <button onClick={handleImportClick} disabled={importMode === "question_bank" && !targetSectionId} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
              Import
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
