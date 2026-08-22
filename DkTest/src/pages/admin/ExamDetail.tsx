import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Edit2,
  Share2,
  Trash2,
  GraduationCap,
  BarChart2,
  Play,
  Check,
  FileText,
  Clock,
  Shuffle,
  ShieldCheck,
  Copy,
  ExternalLink,
  Layers,
  Sparkles,
} from "lucide-react";
import { getExam, deleteExam } from "../../services/examService";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import type { Exam, Section, Question } from "../../types";
import LatexPreview from "../../features/exam-builder/editor/LatexPreview";
import ExamPreviewModal from "../../features/exam-builder/components/ExamPreviewModal";
import ExamExportModal from "../../features/exam-builder/components/ExamExportModal";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { useToast } from "../../components/ui/ToastNotification";
import ExamLeaderboard from "../../components/exam/ExamLeaderboard";

export default function ExamDetail() {
  const location = useLocation();
  const isParentMode = location.pathname.startsWith('/parent/');

  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [exam, setExam] = useState<Exam | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!examId) return;

    const loadFullExam = async () => {
      setLoading(true);
      try {
        console.log(`[Firestore] Loading exam detail: ${examId}`);
        const examDoc = await getExam(examId);
        if (!examDoc) {
          toast.error("Không tìm thấy bài thi này!");
          navigate("/admin/exams", { replace: true });
          return;
        }
        setExam(examDoc);

        // Fetch sections
        let secList: Section[] = Array.isArray((examDoc as any).sections) ? (examDoc as any).sections : [];
        if (!Array.isArray((examDoc as any).sections)) {
           console.log("[Firestore] READ_MANY: fallback sections query"); const secSnap = await getDocs(
             query(collection(db, `exams/${examId}/sections`), orderBy("order", "asc"))
           );
           secList = secSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Section));
        }
        secList.sort((a,b) => (a.order || 0) - (b.order || 0));
        setSections(secList);

        // Fetch questions
        let qList: Question[] = Array.isArray((examDoc as any).questions) ? (examDoc as any).questions : [];
        if (!Array.isArray((examDoc as any).questions)) {
           console.log("[Firestore] READ_MANY: fallback questions query"); const qSnap = await getDocs(
             query(collection(db, `exams/${examId}/questions`), orderBy("order", "asc"))
           );
           qList = qSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Question));
        }
        qList.sort((a,b) => (a.order || 0) - (b.order || 0));
        setQuestions(qList);
      } catch (err) {
        console.error("Lỗi khi tải chi tiết bài thi:", err);
      } finally {
        setLoading(false);
      }
    };

    loadFullExam();
  }, [examId, navigate]);

  const handleCopyLink = () => {
    if (!examId) return;
    const url = `${window.location.origin}/student/exam/${examId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleConfirmDelete = async () => {
    if (!examId || !exam) return;
    setIsDeleting(true);
    try {
      await deleteExam(examId);
      toast.success("Đã xóa vĩnh viễn bài thi thành công!");
      setShowDeleteModal(false);
      navigate("/admin/exams", { replace: true });
    } catch (e) {
      console.error(e);
      toast.error("Không thể xóa bài thi. Vui lòng thử lại!");
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 font-medium">
        Đang tải thông tin chi tiết bài thi...
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="p-12 text-center text-slate-500">
        Không tìm thấy bài thi.
      </div>
    );
  }

  const studentLink = `${window.location.origin}/student/exam/${exam.id}`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top navigation */}
      <div className="flex items-center justify-between">
        <Link
          to={isParentMode ? "/parent/exams" : "/admin/exams"}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Danh sách bài thi
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExportModal(true)}
            className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            title="Xuất đề thi dạng PDF & LaTeX"
          >
            <FileText className="w-3.5 h-3.5" />
            Xuất PDF / LaTeX
          </button>

          <button
            onClick={() => setShowPreview(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
            Xem trước & Thử nghiệm
          </button>

          <Link
            to={`/${isParentMode ? "parent" : "admin"}/exams/${exam.id}/edit`}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-xs font-semibold flex items-center gap-1.5 shadow-xs"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Chỉnh sửa đề thi
          </Link>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
            title="Xóa bài thi này"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero Exam Summary Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                  exam.status === "published"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : exam.status === "unlisted"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-slate-100 text-slate-700 border border-slate-200"
                }`}
              >
                {exam.status === "published"
                  ? "Công khai"
                  : exam.status === "unlisted"
                  ? "Không công khai"
                  : "Bản nháp"}
              </span>
              <code className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono font-bold text-slate-700 border border-slate-200">
                {exam.code}
              </code>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{exam.title}</h1>
            {exam.description && (
              <p className="text-sm text-slate-600 mt-1.5 max-w-2xl leading-relaxed">
                {exam.description}
              </p>
            )}
          </div>

          {/* Quick link to stats & submissions */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Link
              to={`/${isParentMode ? "parent" : "admin"}/exams/${exam.id}/submissions`}
              className="flex-1 md:flex-none px-4 py-2.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100/70 text-emerald-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <GraduationCap className="w-4 h-4" />
              Xem bài nộp
            </Link>
            <Link
              to={`/${isParentMode ? "parent" : "admin"}/exams/${exam.id}/stats`}
              className="flex-1 md:flex-none px-4 py-2.5 bg-purple-50 border border-purple-200 hover:bg-purple-100/70 text-purple-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <BarChart2 className="w-4 h-4" />
              Thống kê điểm
            </Link>
          </div>
        </div>

        {/* Exam metadata grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs text-slate-500 font-medium block mb-1">Thời gian làm bài</span>
            <span className="text-lg font-bold text-slate-800">{exam.timeLimit || 45} phút</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs text-slate-500 font-medium block mb-1">Tổng số câu hỏi</span>
            <span className="text-lg font-bold text-slate-800">{questions.length} câu</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs text-slate-500 font-medium block mb-1">Số phần thi</span>
            <span className="text-lg font-bold text-slate-800">{sections.length} phần</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs text-slate-500 font-medium block mb-1">Cấu hình xáo đề</span>
            <span className="text-sm font-bold text-blue-700 block mt-1">
              {exam.shuffleQuestions ? "Bật xáo trộn" : "Cố định thứ tự"}
            </span>
          </div>
        </div>

        {/* Student Sharing Banner */}
        <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-900">Liên kết làm bài trực tuyến cho học sinh</p>
              <p className="text-xs text-blue-700 font-mono select-all truncate max-w-sm sm:max-w-md">
                {studentLink}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={handleCopyLink}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-white border border-blue-300 text-blue-800 hover:bg-blue-100 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? "Đã chép link" : "Sao chép link"}
            </button>
            <a
              href={studentLink}
              target="_blank"
              rel="noreferrer"
              className="p-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-colors"
              title="Mở tab làm bài"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Exam Leaderboard Top 10 */}
      <ExamLeaderboard examId={exam.id} maxItems={10} />

      {/* Sections and Questions List */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-600" />
          Nội dung chi tiết đề thi ({questions.length} câu hỏi)
        </h2>

        {sections.length > 0 ? (
          sections.map((sec, secIdx) => {
            const secQuestions = questions.filter((q) => q.sectionId === sec.id);
            return (
              <div
                key={sec.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs space-y-4 p-5"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">
                      {sec.title || `Phần ${secIdx + 1}`}
                    </h3>
                    {sec.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{sec.description}</p>
                    )}
                  </div>
                  <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                    {secQuestions.length} câu
                  </span>
                </div>

                <div className="space-y-4">
                  {secQuestions.map((q) => {
                    const globalIdx = questions.findIndex((item) => item.id === q.id);
                    return (
                      <QuestionDetailCard
                        key={q.id}
                        question={q}
                        index={globalIdx !== -1 ? globalIdx + 1 : 1}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            {questions.map((q, qIdx) => (
              <QuestionDetailCard key={q.id} question={q} index={qIdx + 1} />
            ))}
          </div>
        )}
      </div>

      {showPreview && (
        <ExamPreviewModal
          exam={exam}
          sections={sections}
          questions={questions}
          onClose={() => setShowPreview(false)}
        />
      )}

      {showExportModal && exam && (
        <ExamExportModal
          isOpen={showExportModal}
          exam={exam}
          sections={sections}
          questions={questions}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Delete Exam Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title="Xác nhận xóa bài thi"
        message={
          <div>
            Bạn có chắc chắn muốn xóa bài thi <strong>"{exam.title}"</strong> (Mã:{" "}
            <span className="font-mono text-blue-600">{exam.code}</span>)?
            <p className="text-red-600 font-semibold text-xs mt-2">
              ⚠️ Thao tác này sẽ xóa vĩnh viễn toàn bộ phần thi, câu hỏi và tất cả bài nộp của học sinh.
            </p>
          </div>
        }
        confirmText="Xóa bài thi"
        cancelText="Hủy bỏ"
        variant="danger"
      />
    </div>
  );
}

function QuestionDetailCard({ question, index }: { question: Question; index: number }) {
  return (
    <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs bg-blue-600 text-white px-2 py-0.5 rounded-md">
            Câu {index}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {question.type === "single_choice" && "Trắc nghiệm 1 đáp án"}
            {question.type === "multiple_choice" && "Trắc nghiệm nhiều đáp án"}
            {question.type === "true_false" && "Đúng / Sai"}
            {question.type === "short_answer" && "Trả lời ngắn"}
          </span>
        </div>
        <span className="text-xs font-semibold text-slate-600">
          {question.points || 1} điểm
        </span>
      </div>

      <div className="text-sm font-medium text-slate-900 leading-relaxed">
        <LatexPreview content={question.text} />
      </div>

      {/* Options */}
      {(question.type === "single_choice" || question.type === "multiple_choice") && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {question.options?.map((opt, optIdx) => {
            const letter = String.fromCharCode(65 + optIdx);
            const isCorrect = question.correctOptionIds?.includes(opt.id);

            return (
              <div
                key={opt.id}
                className={`p-2.5 rounded-xl border text-sm flex items-start gap-2 ${
                  isCorrect
                    ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold"
                    : "bg-white border-slate-200 text-slate-700"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-md text-xs font-bold flex items-center justify-center shrink-0 ${
                    isCorrect ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {letter}
                </span>
                <div className="flex-1 text-xs">
                  <LatexPreview content={opt.text} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {question.type === "true_false" && (
        <div className="space-y-1.5 pt-1">
          {question.statements?.map((stmt, sIdx) => {
            const letter = String.fromCharCode(97 + sIdx);
            return (
              <div
                key={stmt.id}
                className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-blue-700">{letter})</span>
                  <LatexPreview content={stmt.text} />
                </div>
                <span
                  className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                    stmt.correctAnswer
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {stmt.correctAnswer ? "ĐÚNG" : "SAI"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {question.type === "short_answer" && (
        <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs">
          <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Đáp án chuẩn:
          </span>
          <div className="flex flex-wrap gap-1">
            {question.acceptedAnswers?.map((ans, aIdx) => (
              <span
                key={aIdx}
                className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold rounded"
              >
                {ans}
              </span>
            ))}
          </div>
        </div>
      )}

      {question.explanation && (
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-amber-950 text-xs space-y-1">
          <span className="font-bold text-amber-800 uppercase tracking-wider block">
            Lời giải chi tiết:
          </span>
          <LatexPreview content={question.explanation} />
        </div>
      )}
    </div>
  );
}
