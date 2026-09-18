import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Search,
  BookOpen,
  ArrowRight,
  Loader2,
  Sparkles,
  Layers,
  Filter,
  CheckSquare,
  Square,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Check,
} from "lucide-react";
import {
  collection,
  getDocs,
  query,
  where,
  limit,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../services/firebase/config";
import type { Submission, Exam, Question } from "../../types";
import { formatDate, getTimestampMillis } from "../../utils/date";
import { createAggregatedReviewExam, filterQuestionsBySubmission, getExamQuestionsSafe } from "../../services/reviewExamService";
import { getMasteredQuestionsForExam } from "../../services/reviewMasteryService";
import { useToast } from "../../components/ui/ToastNotification";

interface ExamReviewItem {
  examId: string;
  examTitle: string;
  examCode?: string;
  subject?: string;
  category?: string;
  latestScore: number;
  maxScore: number;
  correctCount: number;
  totalCount: number;
  wrongCount: number;
  submittedAt: any;
  submission: Submission;
  exam: Exam;
  correctedInReviewCount: number;
  stillWrongQuestions: Question[];
}

export default function OldExamsReviewTab() {
  const navigate = useNavigate();
  const { error: showErrorToast, success: showSuccessToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [examItems, setExamItems] = useState<ExamReviewItem[]>([]);
  const [selectedExamIds, setSelectedExamIds] = useState<Set<string>>(new Set());

  // Pagination & Read-optimization: Load 1 exam first, then +5 on "Load more"
  const [allCandidates, setAllCandidates] = useState<Array<[string, Submission]>>([]);
  const [studentUser, setStudentUser] = useState<string>("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [onlyWithErrors, setOnlyWithErrors] = useState(false);

  // Review Mode & Configuration
  const [reviewMode, setReviewMode] = useState<"all" | "wrong">("wrong");
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    loadUserExamHistory();
  }, []);

  const loadUserExamHistory = async () => {
    setLoading(true);
    try {
      const infoStr = localStorage.getItem("student_info") || localStorage.getItem("current_student_session");
      let studentUsername = "";
      if (infoStr) {
        try {
          const parsed = JSON.parse(infoStr);
          studentUsername = parsed.username || parsed.displayName;
        } catch {}
      }

      const localHistStr = localStorage.getItem("student_submission_history");
      const localIds: string[] = localHistStr ? JSON.parse(localHistStr) : [];

      let fetchedSubs: Submission[] = [];

      if (studentUsername) {
        const q = query(
          collection(db, "submissions"),
          where("studentId", "==", studentUsername)
        );
        const snap = await getDocs(q);
        console.warn(`[Firestore] READ_MANY (${snap.size} docs): submissions (loadUserExamHistory for student ${studentUsername})`);
        fetchedSubs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission));
      }

      for (const id of localIds) {
        if (!fetchedSubs.some((s) => s.id === id)) {
          try {
            const docSnap = await getDoc(doc(db, "submissions", id));
            console.warn(`[Firestore] READ (1 doc): submissions/${id}`);
            if (docSnap.exists()) {
              fetchedSubs.push({ id: docSnap.id, ...docSnap.data() } as Submission);
            }
          } catch {}
        }
      }

      if (fetchedSubs.length === 0 && !studentUsername) {
        const qRecent = query(collection(db, "submissions"), limit(15));
        const snap = await getDocs(qRecent);
        console.warn(`[Firestore] READ_MANY (${snap.size} docs): submissions (recent fallback)`);
        fetchedSubs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission));
      }

      // Sort newest first
      fetchedSubs.sort((a, b) => {
        const timeA = getTimestampMillis(a.submittedAt);
        const timeB = getTimestampMillis(b.submittedAt);
        return timeB - timeA;
      });

      // 1. Filter out all retake and review submissions (they only belong in personal history, not review lobby)
      const validOriginalSubs = fetchedSubs.filter((sub) => {
        if ((sub as any).isRetake || (sub as any).isAggregatedReview) return false;
        const title = sub.examTitleSnapshot || "";
        if (title.startsWith("[Làm lại") || title.startsWith("[Ôn tập")) return false;
        return true;
      });

      // 2. Group submissions by examId, keeping ONLY the single latest submission for each exam
      const latestSubByExam = new Map<string, Submission>();
      for (const sub of validOriginalSubs) {
        const eId = sub.examId;
        if (!eId) continue;
        if (!latestSubByExam.has(eId)) {
          latestSubByExam.set(eId, sub);
        }
      }

      const allCandidatesList = Array.from(latestSubByExam.entries());
      setAllCandidates(allCandidatesList);
      setStudentUser(studentUsername);

      // 3. Directive: Initial load only fetches 1 most recent exam to conserve Firestore reads
      const initialCandidate = allCandidatesList.slice(0, 1);
      const items: ExamReviewItem[] = [];

      for (const [examId, sub] of initialCandidate) {
        const item = await fetchSingleExamReviewItem(examId, sub, studentUsername);
        if (item) items.push(item);
      }

      setExamItems(items);
    } catch (err) {
      console.error("Lỗi khi tải lịch sử ôn tập:", err);
      showErrorToast("Không thể tải lịch sử làm bài.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to fetch details and mastery for a single exam item
  const fetchSingleExamReviewItem = async (
    examId: string,
    sub: Submission,
    username: string
  ): Promise<ExamReviewItem | null> => {
    try {
      let examData: Exam | null = null;
      const eDoc = await getDoc(doc(db, "exams", examId));
      console.warn(`[Firestore] READ (1 doc): exams/${examId} (OldExamsReviewTab)`);
      if (eDoc.exists()) {
        examData = { id: eDoc.id, ...eDoc.data() } as Exam;
      } else {
        examData = {
          id: examId,
          title: sub.examTitleSnapshot || "Đề thi",
          code: sub.examCodeSnapshot || "",
          timeLimit: 45,
          duration: 45,
          questionCount: sub.totalCount || 10,
          totalQuestions: sub.totalCount || 10,
          maxScore: sub.maxScore || 10,
        } as unknown as Exam;
      }

      // Strict filter: Exclude if exam itself is a retake or review exam
      if (
        examData.isRetake ||
        examData.isAggregatedReview ||
        examData.title?.startsWith("[Làm lại") ||
        examData.title?.startsWith("[Ôn tập")
      ) {
        return null;
      }

      // Query review mastery for this exam & student
      const masteredSet = await getMasteredQuestionsForExam(username, examId);

      const examQuestions =
        sub.shuffledQuestionsSnapshot && sub.shuffledQuestionsSnapshot.length > 0
          ? sub.shuffledQuestionsSnapshot
          : examData.questions && examData.questions.length > 0
          ? examData.questions
          : await getExamQuestionsSafe(examId);

      // Get wrong questions from the latest submission
      const rawWrongQuestions = filterQuestionsBySubmission(examQuestions, sub, "wrong");

      // Mastery update: questions that were answered correctly in retakes are now marked correct in review!
      const stillWrongQuestions = rawWrongQuestions.filter((q) => !masteredSet.has(q.id));
      const correctedCount = rawWrongQuestions.length - stillWrongQuestions.length;

      const total =
        sub.totalCount ||
        examData.totalQuestions ||
        examData.questionCount ||
        examQuestions.length ||
        10;
      const effectiveWrongCount = stillWrongQuestions.length;
      const effectiveCorrectCount = Math.min(
        total,
        (sub.correctCount ?? (total - rawWrongQuestions.length)) + correctedCount
      );
      const effectiveScore = Math.min(
        sub.maxScore || 10,
        Math.round(((effectiveCorrectCount / total) * (sub.maxScore || 10)) * 10) / 10
      );

      // Determine Category/Subject tag
      let category = examData.subject || "Khác";
      const titleLower = (examData.title || "").toLowerCase();
      if (titleLower.includes("toán") || titleLower.includes("math")) {
        category = "Toán học";
      } else if (
        titleLower.includes("tiếng anh") ||
        titleLower.includes("english") ||
        titleLower.includes("anh văn")
      ) {
        category = "Tiếng Anh";
      } else if (
        titleLower.includes("lý") ||
        titleLower.includes("hóa") ||
        titleLower.includes("sinh")
      ) {
        category = "KHTN";
      } else if (titleLower.includes("khảo sát") || titleLower.includes("thử")) {
        category = "Thi thử";
      }

      return {
        examId,
        examTitle: examData.title || sub.examTitleSnapshot || "Bài kiểm tra",
        examCode: examData.code || sub.examCodeSnapshot,
        subject: examData.subject || category,
        category,
        latestScore: effectiveScore,
        maxScore: sub.maxScore || 10,
        correctCount: effectiveCorrectCount,
        totalCount: total,
        wrongCount: effectiveWrongCount,
        submittedAt: sub.submittedAt,
        submission: sub,
        exam: examData,
        correctedInReviewCount: correctedCount,
        stillWrongQuestions,
      };
    } catch (itemErr) {
      console.warn("Could not process exam history item", examId, itemErr);
      return null;
    }
  };

  // Handler: Load 5 more exams on user request
  const handleLoadMoreExams = async () => {
    if (isLoadingMore || examItems.length >= allCandidates.length) return;
    setIsLoadingMore(true);
    try {
      const nextCandidates = allCandidates.slice(examItems.length, examItems.length + 5);
      const newItems: ExamReviewItem[] = [];

      for (const [examId, sub] of nextCandidates) {
        const item = await fetchSingleExamReviewItem(examId, sub, studentUser);
        if (item) newItems.push(item);
      }

      setExamItems((prev) => [...prev, ...newItems]);
    } catch (e) {
      console.error("Lỗi khi tải thêm bài thi:", e);
      showErrorToast("Lỗi khi tải thêm bài thi cũ.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Distinct categories available in items
  const categories = useMemo(() => {
    const set = new Set<string>();
    examItems.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set);
  }, [examItems]);

  // Filtered exam items
  const filteredItems = useMemo(() => {
    return examItems.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      if (onlyWithErrors && item.wrongCount === 0) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.examTitle.toLowerCase().includes(q);
        const matchCode = item.examCode?.toLowerCase().includes(q) || false;
        if (!matchTitle && !matchCode) return false;
      }
      return true;
    });
  }, [examItems, selectedCategory, onlyWithErrors, searchQuery]);

  // Handle item selection toggling
  const toggleSelectExam = (examId: string) => {
    setSelectedExamIds((prev) => {
      const next = new Set(prev);
      if (next.has(examId)) {
        next.delete(examId);
      } else {
        next.add(examId);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredItems.map((i) => i.examId);
    setSelectedExamIds(new Set(allFilteredIds));
  };

  const handleClearSelection = () => {
    setSelectedExamIds(new Set());
  };

  // Selected items summary statistics
  const selectedItems = useMemo(() => {
    return examItems.filter((i) => selectedExamIds.has(i.examId));
  }, [examItems, selectedExamIds]);

  const totalQuestionsInSelection = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + item.totalCount, 0);
  }, [selectedItems]);

  const totalWrongInSelection = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + item.wrongCount, 0);
  }, [selectedItems]);

  // Start Aggregated Review Exam
  const handleStartReviewExam = async () => {
    if (selectedItems.length === 0) {
      showErrorToast("Vui lòng chọn ít nhất một bài thi để bắt đầu ôn tập!");
      return;
    }

    if (reviewMode === "wrong" && totalWrongInSelection === 0) {
      showErrorToast("Các bài thi bạn chọn không có câu sai nào! Vui lòng chọn chế độ 'Làm lại tất cả'.");
      return;
    }

    setIsStarting(true);
    try {
      const aggregatePayload = selectedItems.map((item) => ({
        exam: item.exam,
        submission: item.submission,
        questions:
          reviewMode === "wrong"
            ? item.stillWrongQuestions
            : item.submission.shuffledQuestionsSnapshot || item.exam.questions,
      }));

      const result = await createAggregatedReviewExam({
        items: aggregatePayload,
        mode: reviewMode,
        shuffleQuestions,
      });

      showSuccessToast(
        `Đã tạo đề ôn tập thành công với ${result.totalQuestions} câu hỏi!`
      );

      navigate(`/student/exam/${result.examId}/take`);
    } catch (err: any) {
      console.error("Lỗi khi tạo bài ôn tập:", err);
      showErrorToast(err?.message || "Không thể khởi tạo bài ôn tập. Vui lòng thử lại!");
      setIsStarting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Overview Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Ôn tập thông minh & Chinh phục điểm yếu</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Ôn tập bài thi cũ
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
            Chọn một hoặc nhiều đề thi từ lịch sử bài làm của bạn. Hệ thống sẽ tự động tổng hợp,
            khử các câu hỏi trùng lặp và tạo thành một đề kiểm tra hoàn chỉnh để bạn rèn luyện lại.
          </p>
        </div>

        {/* Quick counters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto shrink-0">
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-center">
            <span className="text-[11px] font-semibold text-slate-400 block">Đề đã làm</span>
            <span className="text-lg sm:text-xl font-black text-slate-800">
              {examItems.length} đề
            </span>
          </div>
          <div className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-2xl text-center">
            <span className="text-[11px] font-semibold text-rose-500 block">Câu cần khắc phục</span>
            <span className="text-lg sm:text-xl font-black text-rose-700">
              {examItems.reduce((acc, i) => acc + i.wrongCount, 0)} câu
            </span>
          </div>
          <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-center col-span-2 sm:col-span-1">
            <span className="text-[11px] font-semibold text-blue-500 block">Đang chọn</span>
            <span className="text-lg sm:text-xl font-black text-blue-700">
              {selectedExamIds.size} đề
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Selection Tools */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm bài thi theo tên hoặc mã đề..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Chọn tất cả ({filteredItems.length})</span>
            </button>
            {selectedExamIds.size > 0 && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <span>Bỏ chọn</span>
              </button>
            )}
          </div>
        </div>

        {/* Category filters & Only error checkbox */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedCategory === "all"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Tất cả ({examItems.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat} ({examItems.filter((i) => i.category === cat).length})
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyWithErrors}
              onChange={(e) => setOnlyWithErrors(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
            />
            <span>Chỉ hiện bài có câu sai ({examItems.filter((i) => i.wrongCount > 0).length})</span>
          </label>
        </div>
      </div>

      {/* List of Previous Exams */}
      {loading ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl space-y-3">
          <Loader2 className="w-7 h-7 text-blue-600 animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Đang tải lịch sử bài thi và phân tích ôn tập...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl space-y-3">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700">Không tìm thấy bài thi nào</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery || selectedCategory !== "all" || onlyWithErrors
              ? "Không có bài thi nào phù hợp với bộ lọc hiện tại. Vui lòng thử lại tiêu chí khác."
              : "Bạn chưa hoàn thành bài thi gốc nào để ôn tập. Hãy làm một bài thi để bắt đầu!"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {filteredItems.map((item) => {
            const isSelected = selectedExamIds.has(item.examId);

            return (
              <div
                key={item.examId}
                onClick={() => toggleSelectExam(item.examId)}
                className={`group p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  isSelected
                    ? "bg-blue-50/60 border-blue-300 shadow-xs"
                    : "bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-2xs"
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {/* Custom Checkbox */}
                  <div
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      isSelected
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white border-slate-300 text-transparent"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 leading-snug line-clamp-1">
                        {item.examTitle}
                      </span>
                      {item.examCode && (
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                          {item.examCode}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 text-xs text-slate-400 font-medium flex-wrap pt-0.5">
                      <span className="flex items-center gap-1 text-slate-700 font-bold">
                        Điểm: {item.latestScore}/{item.maxScore}
                      </span>
                      <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {item.correctCount} đúng
                      </span>
                      {item.wrongCount > 0 ? (
                        <span className="flex items-center gap-1 text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                          <XCircle className="w-3.5 h-3.5" />
                          {item.wrongCount} câu sai
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Không còn câu sai
                        </span>
                      )}
                      {item.correctedInReviewCount > 0 && (
                        <span className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          Đã làm đúng lại {item.correctedInReviewCount} câu
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(item.submittedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-600">
                    {item.totalCount} câu
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Load More (+5 Exams) Button to save Firestore Read quota */}
        {allCandidates.length > examItems.length && (
          <div className="flex flex-col items-center justify-center py-6 gap-2 border-t border-slate-100 mt-4">
            <button
              type="button"
              onClick={handleLoadMoreExams}
              disabled={isLoadingMore}
              className="px-6 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-2xl text-xs font-bold transition-all shadow-2xs hover:shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Đang tải thêm 5 bài thi cũ...</span>
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4 text-blue-600" />
                  <span>Tải thêm bài thi cũ (+5 bài)</span>
                </>
              )}
            </button>
            <span className="text-[11px] text-slate-400 font-medium">
              Đang hiển thị {examItems.length} / {allCandidates.length} bài thi cũ
            </span>
          </div>
        )}

        {allCandidates.length > 0 && examItems.length >= allCandidates.length && allCandidates.length > 1 && (
          <div className="text-center py-5 text-xs text-slate-400 font-medium">
            ✓ Đã tải toàn bộ {allCandidates.length} bài thi cũ
          </div>
        )}
      </div>
      )}

      {/* Floating Bottom Action Bar (When 1+ exams selected) */}
      {selectedExamIds.size > 0 && (
        <div className="sticky bottom-6 z-40 bg-white border border-slate-200/90 rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
            {/* Summary Information */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                  Đã chọn {selectedExamIds.size} đề thi
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  Tổng số ~{totalQuestionsInSelection} câu hỏi • Phát hiện {totalWrongInSelection} câu sai
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Các câu hỏi trùng lặp giữa các đề sẽ được hệ thống tự động loại trừ (chỉ giữ lại 1 câu duy nhất).
              </p>
            </div>

            {/* Mode Selector & Start CTA */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              {/* Mode Switcher */}
              <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setReviewMode("wrong")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    reviewMode === "wrong"
                      ? "bg-white text-rose-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span>Làm lại câu sai ({totalWrongInSelection})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReviewMode("all")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    reviewMode === "all"
                      ? "bg-white text-blue-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-blue-500" />
                  <span>Làm lại tất cả</span>
                </button>
              </div>

              {/* Start Button */}
              <button
                type="button"
                onClick={handleStartReviewExam}
                disabled={isStarting}
                className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shrink-0"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang tổng hợp đề thi...</span>
                  </>
                ) : (
                  <>
                    <span>Bắt đầu kiểm tra</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
