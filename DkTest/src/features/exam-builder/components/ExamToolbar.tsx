import { useExamEditorContext } from "../context/ExamEditorContext";
import {
  ArrowLeft,
  Save,
  Play,
  Download,
  Upload,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Trash2,
  Sparkles,
  FileText,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { exportJson } from "../../../utils/json/exportExamJson";
import { parseExamFile } from "../../../utils/json/importExamJson";
import React, { useRef, useState } from "react";
import ExamPreviewModal from "./ExamPreviewModal";
import ExamExportModal from "./ExamExportModal";
import JsonImportModal from "./JsonImportModal";
import PublishVisibilityModal from "./PublishVisibilityModal";
import { deleteExam } from "../../../services/examService";
import ConfirmModal from "../../../components/ui/ConfirmModal";
import { useToast } from "../../../components/ui/ToastNotification";

export default function ExamToolbar() {
  const { state, actions } = useExamEditorContext();
  const {
    showToast,
    error: showErrorToast,
    success: showSuccessToast,
  } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showJsonImportModal, setShowJsonImportModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  const processImportedJsonData = (data: any) => {
    try {
      const examId = state.examMeta.id || "temp-exam-id";
      const mappedSections = (data.sections || []).map(
        (s: any, idx: number) => ({
          id: s.id || `section_${idx}`,
          examId,
          title: s.title || `Phần ${idx + 1}`,
          description: s.description || "",
          order: s.order ?? idx,
          questionCount: 0,
          enabled: true,
        }),
      );

      const mappedQuestions = (data.questions || []).map(
        (q: any, idx: number) => ({
          id: q.id || `q_${idx}`,
          examId,
          sectionId: q.sectionId || mappedSections[0]?.id || undefined,
          type: q.type || "single_choice",
          text: q.text || "",
          points: q.points ?? 1,
          order: q.order ?? idx,
          explanation: q.explanation || "",
          options: q.options || [],
          correctOptionIds: q.correctOptionIds || [],
          statements: q.statements || [],
          acceptedAnswers: q.acceptedAnswers || [],
        }),
      );

      actions.importExam({
        examMeta: data.exam
          ? { ...state.examMeta, ...data.exam }
          : state.examMeta,
        sections: mappedSections.length > 0 ? mappedSections : state.sections,
        questions:
          mappedQuestions.length > 0 ? mappedQuestions : state.questions,
      });

      showSuccessToast("Nhập dữ liệu đề thi JSON thành công!");
    } catch (err: any) {
      showErrorToast("Lỗi nhập JSON: Cấu trúc file không tương thích!");
    }
  };

  const handlePublishClick = () => {
    // Open visibility choice modal before publishing
    setShowPublishModal(true);
  };

  const handleConfirmPublish = async (isPublic: boolean) => {
    setShowPublishModal(false);
    actions.setExamMeta({
      isPublic,
      visibility: isPublic ? "public" : "private",
    });
    const success = await actions.saveExam(true);
    if (success) {
      showSuccessToast(
        isPublic
          ? "Đã xuất bản bài thi CÔNG KHAI thành công!"
          : "Đã xuất bản bài thi KHÔNG CÔNG KHAI thành công!",
      );
    } else {
      setShowValidationModal(true);
    }
  };

  const handleExport = () => {
    const data = {
      version: 3 as const,
      source: "DkTEST" as const,
      exportedAt: new Date().toISOString(),
      exportType: "exam" as const,
      exam: state.examMeta as any,
      sections: state.sections,
      questions: state.questions,
    };
    exportJson(data, state.examMeta.code || "EXAM");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await parseExamFile(file);
    if (result.success && result.data) {
      const examId = state.examMeta.id || "temp-exam-id";
      const mappedSections = (result.data.sections || []).map((s, idx) => ({
        id: s.id || `section_${idx}`,
        examId,
        title: s.title || `Phần ${idx + 1}`,
        description: s.description || "",
        order: s.order ?? idx,
        questionCount: 0,
        enabled: true,
      }));

      const mappedQuestions = (result.data.questions || []).map((q, idx) => ({
        ...q,
        examId,
        order: q.order ?? idx,
        points: q.points ?? 1,
      }));

      actions.importExam({
        examMeta: result.data.exam,
        sections: mappedSections as any,
        questions: mappedQuestions as any,
      });
      showSuccessToast("Import bài thi thành công!");
    } else {
      showErrorToast(
        "Lỗi import: " + (result.errors?.[0] || "Định dạng file không hợp lệ"),
      );
    }

    e.target.value = "";
  };

  const isParentMode =
    location.pathname.startsWith("/parent/") ||
    localStorage.getItem("auth_role") === "parent";
  const backUrl = isParentMode ? "/parent/dashboard" : "/admin/exams";

  const handleConfirmDelete = async () => {
    if (!state.examMeta.id) return;
    setIsDeleting(true);
    try {
      await deleteExam(state.examMeta.id);
      setShowDeleteModal(false);
      navigate(backUrl, { replace: true });
    } catch (e) {
      console.error(e);
      showErrorToast("Không thể xóa bài thi. Vui lòng thử lại!");
      setIsDeleting(false);
    }
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
          <Link
            to={backUrl}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
            title="Quay lại danh sách đề thi"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="flex flex-col min-w-0">
            <span className="font-bold text-slate-800 text-sm md:text-base truncate max-w-[180px] sm:max-w-xs md:max-w-md">
              {state.examMeta.title || "Chưa đặt tên bài thi"}
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                  state.examMeta.status === "published"
                    ? "bg-emerald-100 text-emerald-700"
                    : state.examMeta.status === "unlisted"
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-slate-100 text-slate-600"
                }`}
              >
                {state.examMeta.status === "published"
                  ? "Công khai"
                  : state.examMeta.status === "unlisted"
                    ? "Không công khai"
                    : "Bản nháp"}
              </span>
              <span className="text-[11px] text-slate-400 font-mono font-medium">
                {state.questions.length} câu • {state.sections.length} phần
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-500 mr-1">
            {state.saveStatus === "saving" && (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> Đang
                lưu...
              </>
            )}
            {state.saveStatus === "saved" && (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Đã lưu
              </>
            )}
            {state.saveStatus === "error" && (
              <>
                <AlertCircle className="w-4 h-4 text-red-600" /> Lỗi lưu
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Xuất đề thi dạng PDF & LaTeX"
          >
            <FileText className="w-4 h-4" /> Xuất PDF / LaTeX
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors hidden sm:flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            title="Xuất JSON đề thi"
          >
            <Download className="w-4 h-4" /> Xuất JSON
          </button>

          <button
            type="button"
            onClick={() => setShowJsonImportModal(true)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors hidden sm:flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            title="Nhập JSON đề thi (Dán hoặc Tải file)"
          >
            <Upload className="w-4 h-4" /> Nhập JSON
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/exams/import-prompt")}
            className="p-2 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors hidden sm:flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="AI tạo đề từ Prompt"
          >
            <Sparkles className="w-4 h-4" /> Tạo từ Prompt
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin/exams/import-word")}
            className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors hidden sm:flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="AI tạo đề từ file Word"
          >
            <Upload className="w-4 h-4" /> Nhập Word
          </button>

          {/* Unified Preview Button */}
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="px-3 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Xem trước bài thi"
          >
            <Play className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
            <span>Xem trước</span>
          </button>

          {state.examMeta.id && (
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors hidden md:block cursor-pointer"
              title="Xóa bài thi này"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <div className="w-px h-6 bg-slate-200 hidden sm:block"></div>

          <button
            type="button"
            onClick={async () => {
              const ok = await actions.saveExam();
              if (ok) {
                showSuccessToast("Đã lưu bài thi thành công!");
              } else {
                setShowValidationModal(true);
              }
            }}
            disabled={state.isSaving}
            className="px-3.5 py-2 border border-slate-200 text-slate-700 bg-white rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Save className="w-4 h-4 text-slate-500" />
            <span>Lưu</span>
          </button>

          <button
            type="button"
            onClick={handlePublishClick}
            disabled={state.isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            Xuất bản
          </button>
        </div>
      </header>

      {showPublishModal && (
        <PublishVisibilityModal
          isOpen={showPublishModal}
          onClose={() => setShowPublishModal(false)}
          onConfirm={handleConfirmPublish}
          initialIsPublic={state.examMeta.isPublic ?? true}
        />
      )}

      {showPreview && (
        <ExamPreviewModal
          exam={state.examMeta}
          sections={state.sections}
          questions={state.questions}
          onClose={() => setShowPreview(false)}
        />
      )}

      {showExportModal && (
        <ExamExportModal
          isOpen={showExportModal}
          exam={state.examMeta}
          sections={state.sections}
          questions={state.questions}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {showJsonImportModal && (
        <JsonImportModal
          isOpen={showJsonImportModal}
          onClose={() => setShowJsonImportModal(false)}
          onImport={processImportedJsonData}
        />
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title="Xác nhận xóa bài thi"
        message={
          <div>
            Bạn có chắc chắn muốn xóa bài thi{" "}
            <strong>"{state.examMeta.title || "Bài thi này"}"</strong>?
            <p className="text-red-600 font-semibold text-xs mt-2">
              ⚠️ Toàn bộ câu hỏi, phần thi và bài làm liên quan sẽ bị xóa vĩnh
              viễn.
            </p>
          </div>
        }
        confirmText="Xóa bài thi"
        cancelText="Hủy"
        variant="danger"
      />

      {showValidationModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2.5 bg-amber-50 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Bài thi chưa đủ điều kiện xuất bản
                </h3>
                <p className="text-xs text-slate-500">
                  Vui lòng kiểm tra và sửa các lỗi bên dưới
                </p>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
              {state.validationIssues.length > 0 ? (
                state.validationIssues.map((issue, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      actions.setActiveQuestion(issue.id);
                      setShowValidationModal(false);
                    }}
                    className="p-2.5 bg-white rounded-lg border border-slate-200 hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between text-xs font-semibold text-slate-700"
                  >
                    <span className="text-red-600 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {issue.message}
                    </span>
                    <span className="text-[10px] text-blue-600 font-bold hover:underline">
                      Đến câu này →
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 text-center py-4">
                  Có lỗi xảy ra trong quá trình kiểm tra. Vui lòng thử lại.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowValidationModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
