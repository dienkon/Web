import React, { useState } from "react";
import {
  FileText,
  Download,
  Printer,
  FileCode,
  FileDown,
  CheckCircle2,
  Settings,
  Eye,
  X,
  Sparkles,
  Loader2,
  Sliders,
  Columns,
  Type,
  Maximize2,
  AlertCircle,
  CheckCircle,
  LayoutGrid,
} from "lucide-react";
import type { Exam, Question, Section } from "../../../types";
import {
  exportExamToPdf,
  printExamDocument,
  downloadLatexSource,
  generateExamHtmlForPrint,
  estimateExamPageBudget,
  ExportExamOptions,
} from "../../../services/latexExportService";
import { exportExamToWordFile } from "../../../services/wordExportService";
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

  // Page Budget & Intelligent Scaling State
  const [targetMaxPages, setTargetMaxPages] = useState<number>(0);
  const [isCustomPages, setIsCustomPages] = useState(false);
  const [customPagesInput, setCustomPagesInput] = useState("3");
  const [autoFitPageBudget, setAutoFitPageBudget] = useState(true);
  const [layoutMode, setLayoutMode] = useState<"one-col" | "two-cols">("one-col");
  const [fontSizePreset, setFontSizePreset] = useState<"compact" | "normal" | "large">("normal");
  const [spacingPreset, setSpacingPreset] = useState<"tight" | "normal" | "relaxed">("normal");
  const [diagramScalePreset, setDiagramScalePreset] = useState<"small" | "normal" | "large">("normal");

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  if (!isOpen) return null;

  const effectiveMaxPages = isCustomPages
    ? Math.max(1, parseInt(customPagesInput, 10) || 1)
    : targetMaxPages;

  const currentOptions: ExportExamOptions = {
    includeAnswers: activeTab === "answers",
    includeExplanation,
    schoolName,
    examCode,
    subjectName,
    gradeName,
    maxPages: effectiveMaxPages,
    autoFitPageBudget,
    layoutMode,
    fontSizePreset,
    spacingPreset,
    diagramScalePreset,
  };

  const pageBudget = estimateExamPageBudget(questions, currentOptions);

  const handleApplyBudgetRecommendations = () => {
    setLayoutMode(pageBudget.recommendedLayout);
    setFontSizePreset(pageBudget.recommendedFontSize);
    setSpacingPreset(pageBudget.recommendedSpacing);
    setDiagramScalePreset(pageBudget.recommendedDiagramScale);
    toast.success("Đã tối ưu hóa bố cục và thông số để vừa khít số trang mục tiêu!");
  };

  const handleExportWord = async () => {
    setIsExportingWord(true);
    try {
      await exportExamToWordFile(exam, sections, questions, {
        ...currentOptions,
      });
      toast.success("Đã xuất file Word (.doc) thành công!");
    } catch (err: any) {
      console.error("Word Export error:", err);
      toast.error(`Lỗi xuất file Word: ${err.message || "Vui lòng thử lại"}`);
    } finally {
      setIsExportingWord(false);
    }
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

          {/* PDF Page Budget & Layout Settings */}
          <div className="space-y-4 p-4.5 bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-xl border border-blue-100 shadow-2xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <Sliders className="w-4 h-4 text-blue-600" />
                Cấu hình số trang & Bố cục PDF (Page Budget & Smart Fit)
              </div>
              
              {/* Real-time Page Budget Estimate Badge */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border shadow-2xs ${
                  effectiveMaxPages > 0
                    ? pageBudget.fitsWithinTarget
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                }`}>
                  {effectiveMaxPages > 0 ? (
                    pageBudget.fitsWithinTarget ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    )
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                  )}
                  <span>Dự kiến: ~{pageBudget.estimatedPages} trang A4</span>
                  {effectiveMaxPages > 0 && (
                    <span className="font-normal opacity-90">
                      / tối đa {effectiveMaxPages} trang
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Warning banner when content exceeds user's maxPages with one-click optimize */}
            {effectiveMaxPages > 0 && !pageBudget.fitsWithinTarget && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-3 animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Đề thi hiện chiếm <strong>~{pageBudget.estimatedPages} trang</strong>, vượt quá giới hạn <strong>{effectiveMaxPages} trang</strong> đã đặt.
                    {autoFitPageBudget ? " Chế độ Tự động co giãn sẽ nén tỷ lệ khi xuất file PDF." : ""}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleApplyBudgetRecommendations}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shrink-0 cursor-pointer transition-colors shadow-2xs flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Tối ưu vừa trang
                </button>
              </div>
            )}

            {/* Target Max Pages Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Số trang tối đa mong muốn (Max Pages):
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { label: "Tự động (Không giới hạn)", value: 0 },
                  { label: "1 trang (Đề 15')", value: 1 },
                  { label: "2 trang (1 tờ A4)", value: 2 },
                  { label: "3 trang", value: 3 },
                  { label: "4 trang (Chuẩn THPT)", value: 4 },
                ].map((item) => {
                  const isSelected = !isCustomPages && targetMaxPages === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        setIsCustomPages(false);
                        setTargetMaxPages(item.value);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-2xs font-bold"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setIsCustomPages(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    isCustomPages
                      ? "bg-blue-600 text-white border-blue-600 shadow-2xs font-bold"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Tùy chỉnh số trang...
                </button>
                {isCustomPages && (
                  <div className="flex items-center gap-1.5 ml-1">
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={customPagesInput}
                      onChange={(e) => setCustomPagesInput(e.target.value)}
                      className="w-16 px-2.5 py-1 text-xs bg-white border border-blue-400 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-bold text-center"
                    />
                    <span className="text-xs text-slate-600 font-medium">trang</span>
                  </div>
                )}
              </div>
            </div>

            {/* Layout & Font Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {/* 1. Layout Mode */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Bố cục đề thi
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-white border border-slate-200 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setLayoutMode("one-col")}
                    className={`py-1 px-2 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                      layoutMode === "one-col"
                        ? "bg-blue-100 text-blue-800 font-bold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    1 cột
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayoutMode("two-cols")}
                    className={`py-1 px-2 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                      layoutMode === "two-cols"
                        ? "bg-blue-100 text-blue-800 font-bold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                    title="Tiết kiệm 40% số trang (Chuẩn Bộ GD&ĐT)"
                  >
                    2 cột (Chuẩn)
                  </button>
                </div>
              </div>

              {/* 2. Font Size */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Cỡ chữ nội dung
                </label>
                <select
                  value={fontSizePreset}
                  onChange={(e) => setFontSizePreset(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="compact">Nhỏ gọn (10.5pt - Tiết kiệm)</option>
                  <option value="normal">Tiêu chuẩn (12pt)</option>
                  <option value="large">Lớn (13.5pt - Dễ đọc)</option>
                </select>
              </div>

              {/* 3. Spacing Preset */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Khoảng cách & Lề giấy
                </label>
                <select
                  value={spacingPreset}
                  onChange={(e) => setSpacingPreset(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="tight">Tiết kiệm giấy (Lề 8mm, dòng chặt)</option>
                  <option value="normal">Tiêu chuẩn (Lề 12mm)</option>
                  <option value="relaxed">Thoáng đãng (Lề 16mm)</option>
                </select>
              </div>

              {/* 4. Diagram Scale */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Kích cỡ đồ thị / hình vẽ
                </label>
                <select
                  value={diagramScalePreset}
                  onChange={(e) => setDiagramScalePreset(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="small">Thu nhỏ (Cao tối đa 180px)</option>
                  <option value="normal">Chuẩn (Cao tối đa 250px)</option>
                  <option value="large">Lớn (Cao tối đa 320px)</option>
                </select>
              </div>
            </div>

            {/* Auto-fit toggle */}
            <div className="pt-1 border-t border-blue-100 flex items-center justify-between flex-wrap gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={autoFitPageBudget}
                  onChange={(e) => setAutoFitPageBudget(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500"
                />
                <span className="font-medium">
                  Tự động co giãn thông minh (Auto-fit) để đảm bảo nội dung không tràn sang trang mới ngoài ý muốn
                </span>
              </label>
            </div>
          </div>

          {/* Quick Actions Matrix */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tùy chọn tải về & In ấn
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Export PDF */}
              <button
                onClick={() => handleExportPdf(activeTab === "answers")}
                disabled={isExportingPdf}
                className="flex items-center justify-center gap-2 py-3 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-xs sm:text-sm shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {isExportingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Xuất PDF {activeTab === "answers" ? "Đáp án" : "Đề thi"}</span>
              </button>

              {/* Export Word */}
              <button
                onClick={handleExportWord}
                disabled={isExportingWord}
                className="flex items-center justify-center gap-2 py-3 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-xs sm:text-sm shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {isExportingWord ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4" />
                )}
                <span>Xuất Word (.doc)</span>
              </button>

              {/* Download LaTeX Source */}
              <button
                onClick={() => handleDownloadLatex(activeTab === "answers")}
                className="flex items-center justify-center gap-2 py-3 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-medium text-xs sm:text-sm shadow-2xs transition-all cursor-pointer"
              >
                <FileCode className="w-4 h-4 text-amber-600" />
                <span>Tải mã LaTeX (.tex)</span>
              </button>

              {/* Print Direct */}
              <button
                onClick={() => handlePrint(activeTab === "answers")}
                className="flex items-center justify-center gap-2 py-3 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-medium text-xs sm:text-sm shadow-2xs transition-all cursor-pointer"
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
