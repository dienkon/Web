import React, { useState } from "react";
import {
  FileText,
  Download,
  Printer,
  FileCode,
  CheckCircle2,
  Settings,
  Eye,
  X,
  Sparkles,
  Loader2,
} from "lucide-react";
import type { Exam, Question, Section } from "../../../types";
import {
  exportExamToPdf,
  printExamDocument,
  downloadLatexSource,
  generateExamHtmlForPrint,
} from "../../../services/latexExportService";
import { useToast } from "../../../components/ui/ToastNotification";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  exam: Partial<Exam>;
  sections: Section[];
  questions: Question[];
}

export default function ExamExportModal({
  isOpen,
  onClose,
  exam,
  sections,
  questions,
}: Props) {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<"exam" | "answers">("exam");
  const [schoolName, setSchoolName] = useState("TRƯỜNG THPT CHUYÊN .....................");
  const [examCode, setExamCode] = useState(exam.code || "101");
  const [subjectName, setSubjectName] = useState("TOÁN HỌC");
  const [gradeName, setGradeName] = useState("LỚP 12");
  const [includeExplanation, setIncludeExplanation] = useState(true);

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  if (!isOpen) return null;

  const currentOptions = {
    includeAnswers: activeTab === "answers",
    includeExplanation,
    schoolName,
    examCode,
    subjectName,
    gradeName,
  };

  const handleExportPdf = async (includeAns: boolean) => {
    setIsExportingPdf(true);
    try {
      await exportExamToPdf(exam, sections, questions, {
        ...currentOptions,
        includeAnswers: includeAns,
      });
      toast.success(
        includeAns
          ? "Đã xuất PDF Đáp án & Lời giải thành công!"
          : "Đã xuất PDF Đề thi thành công!"
      );
    } catch (err: any) {
      console.error("PDF Export error:", err);
      toast.error(`Lỗi xuất PDF: ${err.message || "Vui lòng thử lại"}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadLatex = (includeAns: boolean) => {
    try {
      downloadLatexSource(exam, sections, questions, {
        ...currentOptions,
        includeAnswers: includeAns,
      });
      toast.success(
        includeAns
          ? "Đã tải mã nguồn LaTeX (.tex) Đáp án & Lời giải!"
          : "Đã tải mã nguồn LaTeX (.tex) Đề thi!"
      );
    } catch (err: any) {
      toast.error("Lỗi khi tải file LaTeX");
    }
  };

  const handlePrint = (includeAns: boolean) => {
    printExamDocument(exam, sections, questions, {
      ...currentOptions,
      includeAnswers: includeAns,
    });
  };

  const handleOpenPreview = (includeAns: boolean) => {
    const html = generateExamHtmlForPrint(exam, sections, questions, {
      ...currentOptions,
      includeAnswers: includeAns,
    });
    setPreviewHtml(html);
    setShowPreviewModal(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Xuất đề thi dạng LaTeX & PDF
              </h2>
              <p className="text-xs text-slate-500">
                Render đề thi theo chuẩn LaTeX và xuất file PDF chất lượng cao (Tách riêng Đề & Đáp án)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Export Mode Tabs */}
          <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab("exam")}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
                activeTab === "exam"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="w-4 h-4" />
              1. File Đề thi (Chỉ câu hỏi)
            </button>
            <button
              onClick={() => setActiveTab("answers")}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
                activeTab === "answers"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              2. File Đáp án & Lời giải (Kèm khung đáp án)
            </button>
          </div>

          {/* Tab Description Banner */}
          {activeTab === "exam" ? (
            <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-xl flex items-start gap-3">
              <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg shrink-0 mt-0.5">
                <FileText className="w-4 h-4" />
              </div>
              <div className="text-xs text-blue-900 leading-relaxed">
                <p className="font-semibold text-sm text-blue-950 mb-1">
                  Định dạng: File Đề thi chính thức
                </p>
                Trang in chuẩn A4 bao gồm tiêu đề trường, thông tin thí sinh, các phần thi và nội dung câu hỏi. Không hiển thị đáp án đúng hay lời giải.
              </div>
            </div>
          ) : (
            <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-start gap-3">
              <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-xs text-emerald-900 leading-relaxed">
                <p className="font-semibold text-sm text-emerald-950 mb-1">
                  Định dạng: File Đáp án & Lời giải chi tiết
                </p>
                Tự động tạo <span className="font-bold underline">Khung đáp án tổng hợp toàn bộ câu hỏi (Matrix Table)</span> ngay đầu trang 1, theo sau là lời giải chi tiết từng câu kèm công thức Toán LaTeX.
              </div>
            </div>
          )}

          {/* Customization Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Settings className="w-4 h-4 text-slate-400" />
              Thông tin tiêu đề trang in
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Tên trường / Trung tâm
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  placeholder="VD: TRƯỜNG THPT CHUYÊN..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Mã đề thi
                </label>
                <input
                  type="text"
                  value={examCode}
                  onChange={(e) => setExamCode(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  placeholder="VD: 101"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Môn thi
                </label>
                <input
                  type="text"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  placeholder="VD: TOÁN HỌC"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Khối / Lớp
                </label>
                <input
                  type="text"
                  value={gradeName}
                  onChange={(e) => setGradeName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  placeholder="VD: LỚP 12"
                />
              </div>
            </div>

            {activeTab === "answers" && (
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={includeExplanation}
                    onChange={(e) => setIncludeExplanation(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500"
                  />
                  <span>Bao gồm phần lời giải & hướng dẫn giải chi tiết cho từng câu</span>
                </label>
              </div>
            )}
          </div>

          {/* Quick Actions Matrix */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tùy chọn tải về & In ấn
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Export PDF */}
              <button
                onClick={() => handleExportPdf(activeTab === "answers")}
                disabled={isExportingPdf}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {isExportingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Xuất PDF {activeTab === "answers" ? "Đáp án" : "Đề thi"}</span>
              </button>

              {/* Download LaTeX Source */}
              <button
                onClick={() => handleDownloadLatex(activeTab === "answers")}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-medium text-sm shadow-2xs transition-all cursor-pointer"
              >
                <FileCode className="w-4 h-4 text-amber-600" />
                <span>Tải mã LaTeX (.tex)</span>
              </button>

              {/* Print Direct */}
              <button
                onClick={() => handlePrint(activeTab === "answers")}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-medium text-sm shadow-2xs transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-emerald-600" />
                <span>In trực tiếp</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <button
            onClick={() => handleOpenPreview(activeTab === "answers")}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            Xem trước trang in (KaTeX Preview)
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Live KaTeX Print Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-100">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-sm text-slate-800">
                  Xem trước bản in (KaTeX Rendered Preview)
                </span>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-white">
              <iframe
                title="Preview"
                srcDoc={previewHtml}
                className="w-full min-h-[600px] border border-slate-200 rounded-lg shadow-inner"
              />
            </div>
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
              <button
                onClick={() => handlePrint(activeTab === "answers")}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg"
              >
                <Printer className="w-4 h-4" /> In ngay
              </button>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium rounded-lg"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
