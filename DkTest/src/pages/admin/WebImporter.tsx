import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Globe,
  Code2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Download,
  RotateCw,
  Trash2,
  ExternalLink,
  HelpCircle,
  FileSpreadsheet,
  Check,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Eye,
  Layers,
  Image as ImageIcon,
  FolderPlus,
  BookOpen,
} from "lucide-react";
import { useToast } from "../../components/ui/ToastNotification";
import {
  extractExamFromUrl,
  extractExamsFromBatchUrls,
  extractExamFromRawHtml,
  downloadJsonFile,
  copyJsonToClipboard,
  type ExtractBatchItem,
} from "../../services/webImporterService";
import { importJsonToFirestore } from "../../services/jsonImportService";
import { FullExportSchemaV3, type ExportV3 } from "../../utils/json/schema";

const SAMPLE_URL =
  "https://sieugioi.com/docs/threads/de-so-1-giai-15-bai-tap-tinh-don-dieu-va-cuc-tri-cua-ham-so.1743/";

type PipelineStage =
  | "idle"
  | "connecting"
  | "downloading_html"
  | "identifying_content"
  | "finding_questions"
  | "detecting_answers"
  | "processing_math_images"
  | "validating_schema"
  | "completed"
  | "error";

const PIPELINE_STEPS: Array<{ key: PipelineStage; label: string }> = [
  { key: "connecting", label: "Đang kết nối đến website" },
  { key: "downloading_html", label: "Đang tải dữ liệu HTML" },
  { key: "identifying_content", label: "Đang nhận diện nội dung chính" },
  { key: "finding_questions", label: "Đang tìm câu hỏi & phương án" },
  { key: "detecting_answers", label: "Đang phát hiện đáp án & lời giải" },
  { key: "processing_math_images", label: "Đang xử lý công thức & hình ảnh" },
  { key: "validating_schema", label: "Đang kiểm tra schema DkTEST v3" },
  { key: "completed", label: "Hoàn tất trích xuất" },
];

export default function WebImporter() {
  const toast = useToast();
  const navigate = useNavigate();

  // Input states
  const [inputMode, setInputMode] = useState<"url" | "rawHtml">("url");
  const [urlInput, setUrlInput] = useState<string>(SAMPLE_URL);
  const [rawHtmlInput, setRawHtmlInput] = useState<string>("");
  const [rawSourceUrl, setRawSourceUrl] = useState<string>("");
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [enableAiRefinement, setEnableAiRefinement] = useState<boolean>(false);

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentStage, setCurrentStage] = useState<PipelineStage>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Result state
  const [extractedData, setExtractedData] = useState<any | null>(null);
  const [jsonText, setJsonText] = useState<string>("");
  const [jsonValidationError, setJsonValidationError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "json" | "batch">("preview");
  const [batchResults, setBatchResults] = useState<ExtractBatchItem[]>([]);
  const [selectedBatchIdx, setSelectedBatchIdx] = useState<number>(0);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [isDirectImporting, setIsDirectImporting] = useState<boolean>(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Record<number, boolean>>({});

  const handleClearAll = () => {
    setUrlInput("");
    setRawHtmlInput("");
    setRawSourceUrl("");
    setExtractedData(null);
    setJsonText("");
    setErrorMessage(null);
    setCurrentStage("idle");
    setBatchResults([]);
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        if (inputMode === "url") {
          setUrlInput(text.trim());
          if (text.includes("\n")) setIsBatchMode(true);
        } else {
          setRawHtmlInput(text);
        }
        toast.success("Đã dán nội dung từ clipboard!");
      }
    } catch {
      toast.error("Không thể đọc clipboard. Vui lòng bấm Ctrl + V vào ô nhập!");
    }
  };

  const handleExtract = async () => {
    setErrorMessage(null);
    setExtractedData(null);
    setJsonText("");
    setBatchResults([]);

    if (inputMode === "rawHtml") {
      if (!rawHtmlInput.trim()) {
        setErrorMessage("Vui lòng dán mã nguồn HTML để phân tích.");
        return;
      }
    } else {
      if (!urlInput.trim()) {
        setErrorMessage("Vui lòng nhập đường dẫn URL của đề thi.");
        return;
      }
    }

    setIsProcessing(true);
    setCurrentStage("connecting");

    try {
      if (inputMode === "rawHtml") {
        setCurrentStage("identifying_content");
        const res = await extractExamFromRawHtml(
          rawHtmlInput,
          rawSourceUrl.trim() || undefined,
          enableAiRefinement
        );
        setCurrentStage("validating_schema");
        if (!res.success || !res.data) {
          throw new Error(res.error || "Không thể trích xuất dữ liệu từ HTML.");
        }
        setCurrentStage("completed");
        setExtractedData(res.data);
        setJsonText(JSON.stringify(res.data.dktestJson, null, 2));
        toast.success(`Trích xuất thành công ${res.data.totalQuestions} câu hỏi từ HTML!`);
      } else {
        const lines = urlInput
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        if (lines.length > 1 || isBatchMode) {
          // Xử lý hàng loạt
          setCurrentStage("downloading_html");
          const batchRes = await extractExamsFromBatchUrls(lines, enableAiRefinement);
          if (!batchRes.success || !batchRes.results) {
            throw new Error(batchRes.error || "Lỗi xử lý hàng loạt URLs.");
          }
          setBatchResults(batchRes.results);
          setActiveTab("batch");
          setCurrentStage("completed");

          // Chọn item thành công đầu tiên
          const firstSuccess = batchRes.results.find((r) => r.success && r.data);
          if (firstSuccess && firstSuccess.data) {
            setExtractedData(firstSuccess.data);
            setJsonText(JSON.stringify(firstSuccess.data.dktestJson, null, 2));
          }
          toast.success(
            `Đã xử lý xong ${batchRes.total} trang (${batchRes.successCount}/${batchRes.total} thành công)!`
          );
        } else {
          // Xử lý một URL đơn
          setCurrentStage("downloading_html");
          const targetUrl = lines[0];
          const res = await extractExamFromUrl(targetUrl, enableAiRefinement);
          setCurrentStage("detecting_answers");
          if (!res.success || !res.data) {
            throw new Error(res.error || "Không thể trích xuất dữ liệu từ URL này.");
          }
          setCurrentStage("validating_schema");
          setExtractedData(res.data);
          setJsonText(JSON.stringify(res.data.dktestJson, null, 2));
          setCurrentStage("completed");
          toast.success(`Trích xuất thành công ${res.data.totalQuestions} câu hỏi từ website!`);
        }
      }
    } catch (err: any) {
      console.error("[WebImporter] Extraction error:", err);
      setCurrentStage("error");
      setErrorMessage(
        err.message ||
          "Không thể trích xuất đề thi. Vui lòng kiểm tra lại URL hoặc thử dán HTML thủ công!"
      );
      toast.error("Quá trình trích xuất thất bại!");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyJson = async () => {
    if (!jsonText) return;
    const ok = await copyJsonToClipboard(jsonText);
    if (ok) {
      setCopiedSuccess(true);
      toast.success("Đã sao chép toàn bộ JSON DkTEST vào clipboard!");
      setTimeout(() => setCopiedSuccess(false), 2500);
    } else {
      toast.error("Không thể tự động sao chép. Vui lòng bôi đen văn bản và bấm Ctrl+C!");
    }
  };

  const handleDownloadJson = () => {
    if (!jsonText) return;
    const fileName = extractedData?.title
      ? `${extractedData.title.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 50)}.json`
      : "dktest_exam.json";
    downloadJsonFile(jsonText, fileName);
    toast.success(`Đã tải xuống file ${fileName}!`);
  };

  const handleValidateJson = () => {
    setJsonValidationError(null);
    try {
      const parsed = JSON.parse(jsonText);
      const res = FullExportSchemaV3.safeParse(parsed);
      if (res.success) {
        toast.success("JSON hoàn toàn hợp lệ theo chuẩn DkTEST v3!");
      } else {
        const issues = res.error.issues.map((i) => `[${i.path.join(".")}] ${i.message}`).join("; ");
        setJsonValidationError(issues);
        toast.error("JSON chưa đúng schema DkTEST v3!");
      }
    } catch (err: any) {
      setJsonValidationError(`Cú pháp JSON không hợp lệ: ${err.message}`);
      toast.error("Lỗi cú pháp JSON!");
    }
  };

  const handleDirectImportToExam = async () => {
    if (!jsonText) return;
    setIsDirectImporting(true);
    try {
      const parsed = JSON.parse(jsonText) as ExportV3;
      await importJsonToFirestore(parsed, "new_exam");
      toast.success("Đã lưu đề thi thành công vào danh sách quản lý!");
      navigate("/admin/exams");
    } catch (err: any) {
      console.error("[WebImporter] Direct import error:", err);
      toast.error(`Không thể lưu đề: ${err.message || "Lỗi không xác định"}`);
    } finally {
      setIsDirectImporting(false);
    }
  };

  const toggleQuestionExpand = (idx: number) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Web-to-DkTEST JSON Importer
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Tự động tải web, trích xuất đề thi, phân tích công thức Toán & chuyển đổi thành JSON DkTEST v3 chuẩn xác.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            to="/admin/exams"
            className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors text-center"
          >
            Quay lại Kho đề
          </Link>
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-6 space-y-4">
        {/* Input Mode Selector */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setInputMode("url")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                inputMode === "url"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              🌐 Nhập đường dẫn URL
            </button>
            <button
              type="button"
              onClick={() => setInputMode("rawHtml")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                inputMode === "rawHtml"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              📄 Dán mã nguồn HTML (Dự phòng)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePasteClipboard}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Dán từ Clipboard</span>
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs font-bold text-slate-400 hover:text-rose-600 flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg hover:bg-rose-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa</span>
            </button>
          </div>
        </div>

        {/* Input Area */}
        {inputMode === "url" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                {isBatchMode
                  ? "Danh sách URL đề thi (mỗi URL một dòng):"
                  : "Nhập đường dẫn URL của đề thi:"}
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={isBatchMode}
                  onChange={(e) => setIsBatchMode(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                />
                <span>Chế độ phân tích hàng loạt</span>
              </label>
            </div>

            <textarea
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                if (e.target.value.includes("\n")) setIsBatchMode(true);
              }}
              rows={isBatchMode ? 5 : 2}
              placeholder="https://sieugioi.com/docs/threads/..."
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />

            {/* Quick sample chips */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-slate-400 font-bold">Mẫu thử nghiệm:</span>
              <button
                type="button"
                onClick={() => {
                  setUrlInput(SAMPLE_URL);
                  setIsBatchMode(false);
                }}
                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>⭐ SieuGioi Toán 12 (15 câu)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                URL nguồn (tùy chọn - để phân giải đúng ảnh & liên kết gốc):
              </label>
              <input
                type="text"
                value={rawSourceUrl}
                onChange={(e) => setRawSourceUrl(e.target.value)}
                placeholder="https://sieugioi.com/docs/..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                Mã nguồn HTML đã lưu (View Source hoặc Inspect Element):
              </label>
              <textarea
                value={rawHtmlInput}
                onChange={(e) => setRawHtmlInput(e.target.value)}
                rows={8}
                placeholder="<!DOCTYPE html><html><body>... Dán HTML ở đây ...</body></html>"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
            </div>
          </div>
        )}

        {/* Google Gemini AI Refinement & Audit Toggle */}
        <div className="p-4 bg-gradient-to-r from-purple-50 via-indigo-50/70 to-blue-50 border border-purple-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5 sm:mt-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-purple-950">
                  Kiểm chứng & Tinh chỉnh chuyên sâu bằng Google Gemini AI
                </span>
                <span className="px-2 py-0.5 text-[9px] font-black bg-purple-200 text-purple-800 rounded-full">
                  AI Verifier
                </span>
              </div>
              <p className="text-[11px] text-purple-800/80 font-medium mt-0.5">
                Tự động đối chiếu lời giải với đáp án, phát hiện mâu thuẫn toán học (như nghiệm bội chẵn đan dấu), kiểm tra đủ phương án A/B/C/D và chuẩn hóa LaTeX.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 self-end sm:self-auto">
            <input
              type="checkbox"
              checked={enableAiRefinement}
              onChange={(e) => setEnableAiRefinement(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>

        {/* Action Button & Pipeline Status */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleExtract}
            disabled={isProcessing}
            className={`px-6 py-3 rounded-2xl font-black text-sm text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all ${
              isProcessing
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg active:scale-98"
            }`}
          >
            {isProcessing ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Đang phân tích dữ liệu...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Phân tích trang web & Tạo JSON</span>
              </>
            )}
          </button>

          {isProcessing && (
            <div className="flex items-center gap-2 text-xs font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-3.5 py-2 rounded-xl">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
              </span>
              <span>
                {PIPELINE_STEPS.find((s) => s.key === currentStage)?.label ||
                  "Đang tiến hành..."}
              </span>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-3 animate-in fade-in">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-extrabold text-rose-900">Không thể trích xuất đề thi:</p>
              <p>{errorMessage}</p>
              <p className="text-[11px] text-rose-600">
                Gợi ý: Nếu trang web từ chối truy cập do bot protection hoặc yêu cầu đăng nhập, hãy mở trang web trên trình duyệt, nhấn Ctrl+U để copy mã nguồn HTML và dùng chế độ "Dán mã nguồn HTML".
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Results Section */}
      {extractedData && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-6 space-y-6 animate-in fade-in">
          {/* Result Header & Overview Cards */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-black uppercase">
                  {extractedData.adapterName || "Adapter"}
                </span>
                <h2 className="text-lg sm:text-xl font-black text-slate-900">
                  {extractedData.title}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <span>Nguồn:</span>
                  <a
                    href={extractedData.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1 font-bold"
                  >
                    <span>{extractedData.domain || extractedData.sourceUrl}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Action Buttons for Result */}
              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                    copiedSuccess
                      ? "bg-emerald-600 text-white border-emerald-700"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {copiedSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Đã sao chép!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Sao chép JSON</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Tải file .json</span>
                </button>

                <button
                  type="button"
                  onClick={handleDirectImportToExam}
                  disabled={isDirectImporting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  {isDirectImporting ? (
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FolderPlus className="w-3.5 h-3.5" />
                  )}
                  <span>Lưu vào Đề thi</span>
                </button>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-2xl text-center space-y-0.5">
                <p className="text-[11px] font-bold text-blue-700">Tổng số câu</p>
                <p className="text-xl font-black text-blue-900">
                  {extractedData.totalQuestions}
                </p>
              </div>
              <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-2xl text-center space-y-0.5">
                <p className="text-[11px] font-bold text-emerald-700">Có phương án</p>
                <p className="text-xl font-black text-emerald-900">
                  {extractedData.questionsWithOptions}
                </p>
              </div>
              <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-2xl text-center space-y-0.5">
                <p className="text-[11px] font-bold text-indigo-700">Có đáp án</p>
                <p className="text-xl font-black text-indigo-900">
                  {extractedData.questionsWithAnswers}
                </p>
              </div>
              <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-2xl text-center space-y-0.5">
                <p className="text-[11px] font-bold text-purple-700">Có lời giải</p>
                <p className="text-xl font-black text-purple-900">
                  {extractedData.questionsWithExplanation}
                </p>
              </div>
              <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-2xl text-center space-y-0.5">
                <p className="text-[11px] font-bold text-amber-700">Chứa hình ảnh</p>
                <p className="text-xl font-black text-amber-900">
                  {extractedData.questionsWithImages}
                </p>
              </div>
              <div
                className={`p-3 rounded-2xl text-center space-y-0.5 border ${
                  extractedData.manualReviewCount > 0
                    ? "bg-rose-50/60 border-rose-200 text-rose-900"
                    : "bg-slate-50 border-slate-200 text-slate-700"
                }`}
              >
                <p className="text-[11px] font-bold">Cần kiểm tra</p>
                <p className="text-xl font-black">
                  {extractedData.manualReviewCount}
                </p>
              </div>
            </div>

            {/* Warnings list */}
            {extractedData.warnings && extractedData.warnings.length > 0 && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Lưu ý & Cảnh báo kiểm tra thủ công ({extractedData.warnings.length}):</span>
                </div>
                <ul className="list-disc list-inside text-xs text-amber-800 space-y-1 font-medium pl-1">
                  {extractedData.warnings.map((w: string, idx: number) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Verification Report */}
            {extractedData.aiVerification && extractedData.aiVerification.performed && (
              <div className="p-4 bg-gradient-to-r from-purple-50 via-indigo-50/70 to-purple-50 border border-purple-200 rounded-2xl space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between gap-2 border-b border-purple-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-black text-purple-950">
                      Báo cáo kiểm định chất lượng bởi Google Gemini AI ({extractedData.aiVerification.model})
                    </span>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-black bg-purple-200 text-purple-800 rounded-full">
                    Đã kiểm chứng {extractedData.aiVerification.verifiedCount} câu
                  </span>
                </div>
                <p className="text-xs text-purple-900/90 font-medium">
                  {extractedData.aiVerification.summary}
                </p>
                {extractedData.aiVerification.findings && extractedData.aiVerification.findings.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-black uppercase tracking-wider text-purple-800 block">
                      Các điểm ghi nhận & cảnh báo đối chiếu ({extractedData.aiVerification.findings.length}):
                    </span>
                    <ul className="space-y-1">
                      {extractedData.aiVerification.findings.map((f: any, fIdx: number) => (
                        <li key={fIdx} className="text-xs text-purple-900 bg-white/80 p-2.5 rounded-xl border border-purple-100 flex items-start gap-2">
                          <span className="px-1.5 py-0.5 text-[10px] font-black bg-purple-100 text-purple-800 rounded shrink-0 mt-0.5">
                            Câu {f.questionOrder}
                          </span>
                          <span className="flex-1 font-medium">{f.message}</span>
                          {f.suggestion && (
                            <span className="text-purple-700 text-[11px] font-bold">Gợi ý: {f.suggestion}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* View Tabs */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === "preview"
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>Xem trước câu hỏi ({extractedData.questions?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("json")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === "json"
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Code2 className="w-4 h-4" />
                <span>Trình soạn thảo JSON DkTEST v3</span>
              </button>

              {batchResults.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab("batch")}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                    activeTab === "batch"
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Danh sách hàng loạt ({batchResults.length})</span>
                </button>
              )}
            </div>

            {/* TAB 1: PREVIEW */}
            {activeTab === "preview" && (
              <div className="space-y-4">
                {extractedData.questions?.map((q: any, idx: number) => {
                  const isExpanded = expandedQuestions[idx] ?? true;
                  const isFlagged = q.needsManualReview;

                  return (
                    <div
                      key={q.id || idx}
                      className={`p-4 rounded-2xl border transition-all ${
                        isFlagged
                          ? "bg-amber-50/20 border-amber-300"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      {/* Question Header */}
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-900 font-black text-xs">
                            Câu {q.order || idx + 1}
                          </span>
                          {q.correctKey && (
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 font-extrabold text-[11px] flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              <span>Đáp án: {q.correctKey}</span>
                            </span>
                          )}
                          {q.isAiVerified && (
                            <span className="px-2 py-0.5 rounded-lg bg-purple-100 text-purple-900 font-extrabold text-[11px] flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-purple-600" />
                              <span>AI Kiểm chứng</span>
                            </span>
                          )}
                          {isFlagged && (
                            <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 font-bold text-[11px] flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>Cần kiểm tra</span>
                            </span>
                          )}
                          {q.images && q.images.length > 0 && (
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px] flex items-center gap-1">
                              <ImageIcon className="w-3 h-3 text-slate-500" />
                              <span>{q.images.length} ảnh</span>
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleQuestionExpand(idx)}
                          className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Question Body */}
                      {isExpanded && (
                        <div className="pt-3 space-y-3">
                          {/* AI Verification Note */}
                          {q.aiVerificationNote && (
                            <div className="p-3 bg-purple-50/90 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-start gap-2.5">
                              <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-black text-purple-950 block mb-0.5">
                                  Ghi chú kiểm định Gemini AI:
                                </span>
                                <span>{q.aiVerificationNote}</span>
                              </div>
                            </div>
                          )}

                          {/* Prompt text/HTML */}
                          <div
                            className="text-xs sm:text-sm text-slate-900 font-medium leading-relaxed"
                            dangerouslySetInnerHTML={{
                              __html: q.promptHtml || q.promptText,
                            }}
                          />

                          {/* Images preview if any */}
                          {q.images && q.images.length > 0 && (
                            <div className="flex items-center gap-3 overflow-x-auto py-1">
                              {q.images.map((imgUrl: string, imgIdx: number) => (
                                <a
                                  key={imgIdx}
                                  href={imgUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block border border-slate-200 rounded-xl overflow-hidden bg-slate-50 hover:opacity-90 shrink-0"
                                >
                                  <img
                                    src={imgUrl}
                                    alt={`Ảnh câu ${q.order}`}
                                    className="max-h-40 object-contain p-1"
                                    loading="lazy"
                                  />
                                </a>
                              ))}
                            </div>
                          )}

                          {/* Options Grid */}
                          {q.options && q.options.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              {q.options.map((opt: any) => {
                                const isCorrect = opt.key === q.correctKey;
                                return (
                                  <div
                                    key={opt.id}
                                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-start gap-2 ${
                                      isCorrect
                                        ? "bg-emerald-50 border-emerald-400 text-emerald-950 font-bold ring-1 ring-emerald-400/30"
                                        : "bg-slate-50 border-slate-200 text-slate-800"
                                    }`}
                                  >
                                    <span
                                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 font-black text-[11px] ${
                                        isCorrect
                                          ? "bg-emerald-600 text-white"
                                          : "bg-slate-200 text-slate-700"
                                      }`}
                                    >
                                      {opt.key}
                                    </span>
                                    <div
                                      className="flex-1"
                                      dangerouslySetInnerHTML={{
                                        __html: opt.html || opt.text,
                                      }}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Explanation */}
                          {q.explanation && (
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                              <p className="font-extrabold text-slate-800 flex items-center gap-1">
                                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                                <span>Lời giải chi tiết:</span>
                              </p>
                              <div
                                className="text-slate-700 font-medium leading-relaxed pl-4"
                                dangerouslySetInnerHTML={{
                                  __html: q.explanationHtml || q.explanation,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 2: JSON EDITOR */}
            {activeTab === "json" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-600">
                    Bạn có thể chỉnh sửa trực tiếp JSON bên dưới trước khi sao chép hoặc tải về:
                  </p>
                  <button
                    type="button"
                    onClick={handleValidateJson}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg hover:bg-blue-50"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Kiểm tra chuẩn DkTEST v3</span>
                  </button>
                </div>

                <textarea
                  value={jsonText}
                  onChange={(e) => {
                    setJsonText(e.target.value);
                    setJsonValidationError(null);
                  }}
                  rows={20}
                  className="w-full p-4 bg-slate-900 text-slate-100 rounded-2xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  spellCheck={false}
                />

                {jsonValidationError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold">
                    {jsonValidationError}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: BATCH RESULTS */}
            {activeTab === "batch" && batchResults.length > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  {batchResults.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedBatchIdx(idx);
                        if (item.data) {
                          setExtractedData(item.data);
                          setJsonText(JSON.stringify(item.data.dktestJson, null, 2));
                        }
                      }}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        selectedBatchIdx === idx
                          ? "bg-blue-50/60 border-blue-500 shadow-2xs"
                          : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <p className="text-xs font-black text-slate-900 truncate max-w-xl">
                          {item.data?.title || item.url}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono truncate max-w-xl">
                          {item.url}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.success && item.data ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold text-xs">
                            {item.data.totalQuestions} câu
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-extrabold text-xs">
                            Thất bại
                          </span>
                        )}
                        {item.data && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadJsonFile(
                                item.data.dktestJson,
                                `${item.data.title || "exam"}.json`
                              );
                            }}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 rounded-lg hover:bg-emerald-50"
                            title="Tải riêng file này"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
