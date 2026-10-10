import React, { useState, useMemo } from "react";
import {
  Layers,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Sparkles,
  Shuffle,
  ShieldAlert,
  Loader2,
  X,
  ExternalLink,
  FolderTree,
  CornerDownRight,
} from "lucide-react";
import type { Exam } from "../../types";
import { mergeExamsApi } from "../../services/walletClientService";
import { useToast } from "../ui/ToastNotification";

interface ExamMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedExamIds: string[];
  exams: Exam[];
  onMergeSuccess?: (newExamId: string) => void;
}

export default function ExamMergeModal({
  isOpen,
  onClose,
  selectedExamIds,
  exams,
  onMergeSuccess,
}: ExamMergeModalProps) {
  const { error: showErrorToast, success: showSuccessToast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Selected Exam Objects
  const sourceExams = useMemo(() => {
    return exams.filter((e) => selectedExamIds.includes(e.id));
  }, [exams, selectedExamIds]);

  // Total questions & estimated duration from sources
  const totalSourceQuestions = useMemo(() => {
    return sourceExams.reduce((acc, curr) => acc + (curr.questionCount || 0), 0);
  }, [sourceExams]);

  const defaultDuration = useMemo(() => {
    const sumMinutes = sourceExams.reduce((acc, curr) => acc + (curr.timeLimit || 45), 0);
    return Math.min(180, Math.max(15, sumMinutes));
  }, [sourceExams]);

  // Form State
  const [newTitle, setNewTitle] = useState(() => {
    return `Đề Gộp Tổng Hợp: ${sourceExams.map((e) => e.title).slice(0, 2).join(" + ")}${
      sourceExams.length > 2 ? ` (+${sourceExams.length - 2})` : ""
    }`;
  });
  const [newCode, setNewCode] = useState(() => `MERGE_${Date.now().toString().slice(-6)}`);
  const [newDescription, setNewDescription] = useState(
    `Bài thi được gộp tự động từ ${sourceExams.length} đề thi nguồn: ${sourceExams
      .map((e) => `[${e.code}] ${e.title}`)
      .join(", ")}.`
  );
  const [newSubject, setNewSubject] = useState(sourceExams[0]?.subject || "Tổng Hợp");
  const [newGradeCategory, setNewGradeCategory] = useState(sourceExams[0]?.gradeCategory || "Khác");
  const [timeLimit, setTimeLimit] = useState(defaultDuration);
  const [organizeMode, setOrganizeMode] = useState<"by_source_exam" | "flatten">("by_source_exam");
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);

  // Submission / Loading state
  const [isMerging, setIsMerging] = useState(false);
  const [mergeResult, setMergeResult] = useState<{
    newExamId: string;
    totalSections: number;
    totalQuestions: number;
    totalPoints: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleExecuteMerge = async () => {
    if (!newTitle.trim()) {
      showErrorToast("Vui lòng nhập tên đề thi mới");
      setStep(2);
      return;
    }

    try {
      setIsMerging(true);
      const res = await mergeExamsApi({
        title: newTitle.trim(),
        code: newCode.trim() || undefined,
        description: newDescription.trim() || undefined,
        subject: newSubject,
        gradeCategory: newGradeCategory,
        timeLimit: timeLimit,
        sourceExamIds: selectedExamIds,
        organizeMode: organizeMode,
        shuffleQuestions: shuffleQuestions,
        shuffleOptions: shuffleOptions,
      });

      setMergeResult(res);
      setStep(4);
      showSuccessToast("Đã gộp đề thi thành công!");
      if (onMergeSuccess) {
        onMergeSuccess(res.newExamId);
      }
    } catch (err: any) {
      console.error("Merge exams failed:", err);
      showErrorToast(err.message || "Quá trình gộp đề thất bại");
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-50 text-purple-700 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Gộp Nhiều Bài Thi Thành Bài Thi Mới
              </h3>
              <p className="text-xs text-slate-500">
                Bước {step}/4:{" "}
                {step === 1
                  ? "Kiểm tra đề nguồn"
                  : step === 2
                  ? "Cấu hình đề mới"
                  : step === 3
                  ? "Xem trước cấu trúc"
                  : "Hoàn tất"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-colors ${
                    step === s
                      ? "bg-purple-600 text-white shadow-xs"
                      : step > s
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
                </div>
                <span
                  className={`text-xs font-bold hidden sm:inline ${
                    step === s ? "text-purple-700" : "text-slate-500"
                  }`}
                >
                  {s === 1 ? "Nguồn" : s === 2 ? "Cài đặt" : s === 3 ? "Xem trước" : "Xong"}
                </span>
                {s < 4 && <div className="w-6 sm:w-12 h-0.5 bg-slate-200 mx-1" />}
              </div>
            ))}
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 scrollbar-thin text-xs">
          {/* STEP 1: INSPECT SOURCE EXAMS */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-purple-900 flex items-center justify-between">
                <div>
                  <span className="font-black text-sm">
                    {sourceExams.length} bài thi được chọn để gộp
                  </span>
                  <p className="text-[11px] text-purple-700 mt-0.5">
                    Dự kiến tổng cộng khoảng {totalSourceQuestions} câu hỏi. Tất cả dữ liệu đề gốc được giữ nguyên 100%.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-extrabold uppercase tracking-wider text-slate-400 text-[10px]">
                  Danh sách đề nguồn
                </span>
                <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
                  {sourceExams.map((e, idx) => (
                    <div key={e.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-black flex items-center justify-center text-[11px]">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-black text-slate-900">{e.title}</div>
                          <div className="text-[11px] text-slate-400">
                            Mã: <span className="font-mono text-blue-600">{e.code}</span> • Môn:{" "}
                            {e.subject || "Khác"} • {e.questionCount || 0} câu • {e.timeLimit || 45} phút
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                        {e.status === "published" ? "Công khai" : "Nháp"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CONFIGURE MERGED EXAM */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên bài thi gộp mới *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã đề (Code)</label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thời gian làm bài (Phút)</label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Math.max(5, parseInt(e.target.value || "45", 10)))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Môn học</label>
                  <input
                    type="text"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Khối lớp / Cấp thi</label>
                  <input
                    type="text"
                    value={newGradeCategory}
                    onChange={(e) => setNewGradeCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô tả bài thi gộp</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Chế độ phân bổ phần thi (Sections)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div
                    onClick={() => setOrganizeMode("by_source_exam")}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      organizeMode === "by_source_exam"
                        ? "bg-purple-50 border-purple-400 text-purple-900 shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <div className="font-black text-xs text-purple-700 flex items-center gap-1.5">
                      <span>Phân cấp Section lồng Section</span>
                      <span className="text-[9px] bg-purple-600 text-white px-1.5 py-0.2 rounded-full font-bold">Tối ưu nhất</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Mỗi đề thi nguồn sẽ tạo thành một <strong>Phần thi Cha</strong>, giữ nguyên các <strong>Phần thi Con</strong> và câu hỏi bên trong để phân loại cực kỳ rõ ràng, dễ nhìn.
                    </div>
                  </div>

                  <div
                    onClick={() => setOrganizeMode("flatten")}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      organizeMode === "flatten"
                        ? "bg-purple-50 border-purple-400 text-purple-900 shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <div className="font-black text-xs">Gom phẳng thành 1 Phần duy nhất</div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Toàn bộ câu hỏi của các đề nguồn được đưa chung vào một Phần thi tổng hợp duy nhất.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW & SHUFFLE OPTIONS */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <span className="font-extrabold text-slate-700 text-xs">Tóm tắt cấu hình gộp:</span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    Tên đề: <strong>{newTitle}</strong>
                  </div>
                  <div>
                    Mã đề: <strong>{newCode}</strong>
                  </div>
                  <div>
                    Thời gian: <strong>{timeLimit} phút</strong>
                  </div>
                  <div>
                    Cấu trúc:{" "}
                    <strong>
                      {organizeMode === "by_source_exam"
                        ? `${sourceExams.length} phần cha (lồng section con)`
                        : "Gom phẳng 1 phần"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Hierarchical Tree Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-700 text-xs flex items-center gap-1.5">
                    <FolderTree className="w-3.5 h-3.5 text-purple-600" />
                    Xem trước cấu trúc cây phân cấp (Nested Section Tree)
                  </span>
                  <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                    {organizeMode === "by_source_exam" ? "Phân cấp Cha ➔ Con" : "Gom phẳng"}
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 max-h-56 overflow-y-auto space-y-2 text-xs">
                  {organizeMode === "by_source_exam" ? (
                    sourceExams.map((src, sIdx) => {
                      const srcSections = src.sections || [];
                      return (
                        <div key={src.id} className="bg-white rounded-xl border border-slate-200/80 p-2.5 space-y-1.5 shadow-2xs">
                          <div className="flex items-center justify-between font-bold text-slate-800">
                            <span className="flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-md bg-purple-100 text-purple-700 text-[10px] flex items-center justify-center font-black shrink-0">
                                {sIdx + 1}
                              </span>
                              <span className="truncate">📁 Phần {sIdx + 1}: {src.title}</span>
                            </span>
                            <span className="text-[10px] bg-purple-50 text-purple-700 font-mono font-bold px-1.5 py-0.5 rounded shrink-0">
                              {src.questionCount || 0} câu
                            </span>
                          </div>

                          {/* Subsections */}
                          <div className="pl-6 space-y-1 border-l-2 border-purple-100 ml-2.5">
                            {srcSections.length > 0 ? (
                              srcSections.map((childSec, cIdx) => (
                                <div key={childSec.id || cIdx} className="flex items-center justify-between text-slate-600 text-[11px] py-0.5">
                                  <span className="flex items-center gap-1.5 truncate">
                                    <CornerDownRight className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="truncate">{childSec.title || `Chủ đề ${cIdx + 1}`}</span>
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                    {childSec.questionCount ?? "~"} câu
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="flex items-center justify-between text-slate-500 text-[11px] py-0.5 italic">
                                <span className="flex items-center gap-1.5">
                                  <CornerDownRight className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{src.subject ? `Môn ${src.subject}` : "Toàn bộ câu hỏi nguồn"}</span>
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  {src.questionCount || 0} câu
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="bg-white rounded-xl border border-slate-200/80 p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 text-[10px] flex items-center justify-center font-black">
                          1
                        </span>
                        <span className="font-bold text-slate-800">Phần thi chung (Gom phẳng tất cả câu hỏi)</span>
                      </div>
                      <span className="text-[10px] bg-slate-100 text-slate-700 font-mono font-bold px-1.5 py-0.5 rounded">
                        {totalSourceQuestions} câu
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-extrabold text-slate-700 text-xs">Tùy chọn xáo trộn</span>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={shuffleQuestions}
                      onChange={(e) => setShuffleQuestions(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-slate-800">Xáo trộn thứ tự câu hỏi khi gộp</span>
                      <p className="text-[10px] text-slate-400">
                        Các câu hỏi sẽ được đổi vị trí ngẫu nhiên trong từng phần thi.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={shuffleOptions}
                      onChange={(e) => setShuffleOptions(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-slate-800">Xáo trộn phương án trả lời (A, B, C, D)</span>
                      <p className="text-[10px] text-slate-400">
                        Đổi ngẫu nhiên vị trí các lựa chọn đáp án của câu hỏi trắc nghiệm.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Thao tác gộp sử dụng batch writes chia nhỏ &lt; 400 operations để đảm bảo an toàn tuyệt đối, không làm ảnh hưởng đến các đề thi gốc.
                </span>
              </div>
            </div>
          )}

          {/* STEP 4: MERGE RESULTS */}
          {step === 4 && mergeResult && (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-lg font-black text-slate-900">Gộp Bài Thi Thành Công!</h4>
                <p className="text-slate-500 text-xs mt-1">
                  Đề thi mới đã được tạo và lưu vào hệ thống cơ sở dữ liệu.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-w-sm mx-auto text-left text-xs space-y-1.5 font-medium">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã bài thi mới:</span>
                  <strong className="font-mono text-purple-700">{mergeResult.newExamId}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tổng số phần thi:</span>
                  <strong className="text-slate-900">{mergeResult.totalSections} phần</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tổng số câu hỏi:</span>
                  <strong className="text-slate-900">{mergeResult.totalQuestions} câu</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Thang điểm tối đa:</span>
                  <strong className="text-slate-900">{mergeResult.totalPoints} điểm</strong>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href={`/admin/exams/${mergeResult.newExamId}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                >
                  <span>Mở xem đề thi vừa gộp</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          {step > 1 && step < 4 ? (
            <button
              type="button"
              disabled={isMerging}
              onClick={() => setStep((prev) => (prev - 1) as any)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại</span>
            </button>
          ) : (
            <div />
          )}

          {step < 3 && (
            <button
              type="button"
              onClick={() => setStep((prev) => (prev + 1) as any)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Tiếp tục</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {step === 3 && (
            <button
              type="button"
              disabled={isMerging}
              onClick={handleExecuteMerge}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {isMerging ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang gộp bài thi...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Bắt đầu gộp bài thi</span>
                </>
              )}
            </button>
          )}

          {step === 4 && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Đóng cửa sổ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
