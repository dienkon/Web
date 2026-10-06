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
  Link as LinkIcon,
  Plus,
  Trash2,
  ExternalLink,
  Info,
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
import {
  createAggregatedReviewExam,
  filterQuestionsBySubmission,
  getExamQuestionsSafe,
} from "../../services/reviewExamService";
import { getMasteredQuestionsForExam } from "../../services/reviewMasteryService";
import { useToast } from "../../components/ui/ToastNotification";
import CustomReviewConfigurator from "../../features/review/components/CustomReviewConfigurator";
import {
  parseExamReferences,
  resolveExamReferences,
} from "../../features/review/reviewLinkResolver";
import type { ReviewSourceExam } from "../../features/review/types";

const IMPORTED_STORAGE_KEY = "dktest_imported_review_refs";

export default function OldExamsReviewTab() {
  const navigate = useNavigate();
  const { error: showErrorToast, success: showSuccessToast, info: showInfoToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [examItems, setExamItems] = useState<ReviewSourceExam[]>([]);
  const [importedItems, setImportedItems] = useState<ReviewSourceExam[]>([]);
  const [selectedExamIds, setSelectedExamIds] = useState<Set<string>>(new Set());

  // Link/Code Import State
  const [importInput, setImportInput] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [showImportBox, setShowImportBox] = useState(false);

  // Pagination & Read-optimization: Load 1 exam first, then +5 on "Load more"
  const [allCandidates, setAllCandidates] = useState<Array<[string, Submission]>>([]);
  const [studentUser, setStudentUser] = useState<string>("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [userSubmissionsMap, setUserSubmissionsMap] = useState<Map<string, Submission>>(new Map());

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [onlyWithErrors, setOnlyWithErrors] = useState(false);

  // Review Mode & Configuration
  const [reviewMode, setReviewMode] = useState<"all" | "wrong" | "correct" | "custom">("wrong");
  const [durationMode, setDurationMode] = useState<"unlimited" | "auto">("unlimited");
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isCustomConfigOpen, setIsCustomConfigOpen] = useState(false);

  useEffect(() => {
    loadUserExamHistory();
  }, []);

  const loadUserExamHistory = async () => {
    setLoading(true);
    try {
      const infoStr =
        localStorage.getItem("student_info") ||
        localStorage.getItem("current_student_session");
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
        console.warn(
          `[Firestore] READ_MANY (${snap.size} docs): submissions (loadUserExamHistory for student ${studentUsername})`
        );
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

      // Filter out all retake and review submissions
      const validOriginalSubs = fetchedSubs.filter((sub) => {
        if ((sub as any).isRetake || (sub as any).isAggregatedReview) return false;
        const title = sub.examTitleSnapshot || "";
        if (title.startsWith("[Làm lại") || title.startsWith("[Ôn tập")) return false;
        return true;
      });

      // Group submissions by examId, keeping ONLY the single latest submission for each exam
      const latestSubByExam = new Map<string, Submission>();
      for (const sub of validOriginalSubs) {
        const eId = sub.examId;
        if (!eId) continue;
        if (!latestSubByExam.has(eId)) {
          latestSubByExam.set(eId, sub);
        }
      }

      setUserSubmissionsMap(latestSubByExam);

      const allCandidatesList = Array.from(latestSubByExam.entries());
      setAllCandidates(allCandidatesList);
      setStudentUser(studentUsername);

      // Directive: Initial load only fetches 1 most recent exam to conserve Firestore reads
      const initialCandidate = allCandidatesList.slice(0, 1);
      const items: ReviewSourceExam[] = [];

      for (const [examId, sub] of initialCandidate) {
        const item = await fetchSingleExamReviewItem(examId, sub, studentUsername, "history");
        if (item) items.push(item);
      }

      setExamItems(items);

      // Load saved imported references from localStorage
      await restoreImportedExams(latestSubByExam, studentUsername);
    } catch (err) {
      console.error("Lỗi khi tải lịch sử ôn tập:", err);
      showErrorToast("Không thể tải lịch sử làm bài.");
    } finally {
      setLoading(false);
    }
  };

  // Restore imported exams from localStorage
  const restoreImportedExams = async (
    subMap: Map<string, Submission>,
    studentUsername: string
  ) => {
    try {
      const savedRefsRaw = localStorage.getItem(IMPORTED_STORAGE_KEY);
      if (!savedRefsRaw) return;
      const savedRefs: string[] = JSON.parse(savedRefsRaw);
      if (!Array.isArray(savedRefs) || savedRefs.length === 0) return;

      const { resolved } = await resolveExamReferences(savedRefs);
      const restoredItems: ReviewSourceExam[] = [];

      for (const res of resolved) {
        const sub = subMap.get(res.exam.id);
        const item = await buildSourceExamFromResolved(
          res.exam,
          sub,
          studentUsername,
          res.resolvedBy === "code" ? "imported_code" : "imported_link"
        );
        if (item) restoredItems.push(item);
      }

      setImportedItems(restoredItems);
    } catch (err) {
      console.warn("Could not restore imported exams:", err);
    }
  };

  // Helper to fetch details and mastery for a single history exam item
  const fetchSingleExamReviewItem = async (
    examId: string,
    sub: Submission,
    username: string,
    sourceType: "history" | "imported_link" | "imported_code" = "history"
  ): Promise<ReviewSourceExam | null> => {
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

      // Exclude if exam itself is a retake or review exam
      if (
        examData.isRetake ||
        examData.isAggregatedReview ||
        examData.title?.startsWith("[Làm lại") ||
        examData.title?.startsWith("[Ôn tập")
      ) {
        return null;
      }

      return await buildSourceExamFromResolved(examData, sub, username, sourceType);
    } catch (itemErr) {
      console.warn("Could not process exam history item", examId, itemErr);
      return null;
    }
  };

  // Builds a ReviewSourceExam from an Exam and optional Submission
  const buildSourceExamFromResolved = async (
    examData: Exam,
    sub: Submission | undefined,
    username: string,
    sourceType: "history" | "imported_link" | "imported_code"
  ): Promise<ReviewSourceExam> => {
    const examId = examData.id;

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

    if (!sub) {
      // Unattempted exam: no submission exists, fetch full master questions
      const masterQuestions = await getExamQuestionsSafe(examId, examData.questions);
      const total =
        masterQuestions.length ||
        examData.totalQuestions ||
        examData.questionCount ||
        10;

      return {
        examId,
        examTitle: examData.title || "Bài kiểm tra",
        examCode: examData.code,
        subject: examData.subject || category,
        category,
        sourceType,
        hasAttempt: false,
        totalCount: total,
        correctCount: 0,
        wrongCount: 0,
        unansweredCount: total,
        exam: examData,
        questions: masterQuestions,
      };
    }

    // Has submission: calculate mastery and wrong/correct questions
    const masteredSet = await getMasteredQuestionsForExam(username, examId);

    // Always load the most complete question set from master exam doc/subcollection
    const examQuestions = await getExamQuestionsSafe(
      examId,
      examData.questions && examData.questions.length > 0
        ? examData.questions
        : sub.shuffledQuestionsSnapshot
    );

    const rawWrongQuestions = filterQuestionsBySubmission(examQuestions, sub, "wrong");
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

    return {
      examId,
      examTitle: examData.title || sub.examTitleSnapshot || "Bài kiểm tra",
      examCode: examData.code || sub.examCodeSnapshot,
      subject: examData.subject || category,
      category,
      sourceType,
      hasAttempt: true,
      latestScore: effectiveScore,
      maxScore: sub.maxScore || 10,
      correctCount: effectiveCorrectCount,
      totalCount: total,
      wrongCount: effectiveWrongCount,
      unansweredCount: Math.max(0, total - effectiveCorrectCount - effectiveWrongCount),
      submittedAt: sub.submittedAt,
      submission: sub,
      exam: examData,
      questions: examQuestions,
      stillWrongQuestions,
      correctedInReviewCount: correctedCount,
    };
  };

  // Handler: Load 5 more exams on user request
  const handleLoadMoreExams = async () => {
    if (isLoadingMore || examItems.length >= allCandidates.length) return;
    setIsLoadingMore(true);
    try {
      const nextCandidates = allCandidates.slice(examItems.length, examItems.length + 5);
      const newItems: ReviewSourceExam[] = [];

      for (const [examId, sub] of nextCandidates) {
        const item = await fetchSingleExamReviewItem(examId, sub, studentUser, "history");
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

  // Handler: Import exams by links or codes
  const handleImportReferences = async () => {
    if (!importInput.trim()) {
      showErrorToast("Vui lòng dán ít nhất một link bài thi hoặc mã đề!");
      return;
    }

    const parsedRefs = parseExamReferences(importInput);
    if (parsedRefs.length === 0) {
      showErrorToast("Không nhận diện được link hoặc mã đề hợp lệ. Vui lòng kiểm tra lại!");
      return;
    }

    setIsImporting(true);
    try {
      const { resolved, failed } = await resolveExamReferences(parsedRefs);

      if (resolved.length === 0) {
        showErrorToast("Không tìm thấy bài thi nào tương ứng với các link/mã đề đã nhập.");
        setIsImporting(false);
        return;
      }

      const existingIds = new Set([
        ...examItems.map((i) => i.examId),
        ...importedItems.map((i) => i.examId),
      ]);

      const newlyImported: ReviewSourceExam[] = [];
      const newIdsToSelect: string[] = [];

      for (const res of resolved) {
        if (!existingIds.has(res.exam.id)) {
          const sub = userSubmissionsMap.get(res.exam.id);
          const item = await buildSourceExamFromResolved(
            res.exam,
            sub,
            studentUser,
            res.resolvedBy === "code" ? "imported_code" : "imported_link"
          );
          if (item) {
            newlyImported.push(item);
            existingIds.add(res.exam.id);
            newIdsToSelect.push(item.examId);
          }
        } else {
          newIdsToSelect.push(res.exam.id);
        }
      }

      const updatedImported = [...importedItems, ...newlyImported];
      setImportedItems(updatedImported);

      // Save imported references into localStorage
      const savedRefs = updatedImported.map((i) => i.examCode || i.examId);
      localStorage.setItem(IMPORTED_STORAGE_KEY, JSON.stringify(savedRefs));

      // Auto-select newly added exams
      setSelectedExamIds((prev) => {
        const next = new Set(prev);
        newIdsToSelect.forEach((id) => next.add(id));
        return next;
      });

      setImportInput("");
      showSuccessToast(
        `Đã thêm thành công ${resolved.length} bài thi vào danh sách ôn tập!${
          failed.length > 0 ? ` (${failed.length} link/mã không tìm thấy)` : ""
        }`
      );
    } catch (err: any) {
      console.error("Error importing exam references:", err);
      showErrorToast(err?.message || "Không thể tải bài thi từ link/mã đề.");
    } finally {
      setIsImporting(false);
    }
  };

  // Remove an imported exam
  const handleRemoveImportedItem = (examId: string) => {
    const nextImported = importedItems.filter((i) => i.examId !== examId);
    setImportedItems(nextImported);

    const savedRefs = nextImported.map((i) => i.examCode || i.examId);
    localStorage.setItem(IMPORTED_STORAGE_KEY, JSON.stringify(savedRefs));

    setSelectedExamIds((prev) => {
      const next = new Set(prev);
      next.delete(examId);
      return next;
    });

    showInfoToast("Đã xóa bài thi khỏi danh sách đã thêm.");
  };

  // Combined list of history exams + imported exams
  const combinedItems = useMemo(() => {
    const list: ReviewSourceExam[] = [...examItems];
    const historyIds = new Set(examItems.map((i) => i.examId));

    for (const imp of importedItems) {
      if (!historyIds.has(imp.examId)) {
        list.push(imp);
      }
    }
    return list;
  }, [examItems, importedItems]);

  // Distinct categories available in items
  const categories = useMemo(() => {
    const set = new Set<string>();
    combinedItems.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set);
  }, [combinedItems]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return combinedItems.filter((item) => {
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
  }, [combinedItems, selectedCategory, onlyWithErrors, searchQuery]);

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
    return combinedItems.filter((i) => selectedExamIds.has(i.examId));
  }, [combinedItems, selectedExamIds]);

  const totalQuestionsInSelection = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + item.totalCount, 0);
  }, [selectedItems]);

  const totalWrongInSelection = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + item.wrongCount, 0);
  }, [selectedItems]);

  const totalCorrectInSelection = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + item.correctCount, 0);
  }, [selectedItems]);

  const hasUnattemptedInSelection = useMemo(() => {
    return selectedItems.some((i) => !i.hasAttempt);
  }, [selectedItems]);

  // Start Review Exam
  const handleStartReviewExam = async () => {
    if (selectedItems.length === 0) {
      showErrorToast("Vui lòng chọn ít nhất một bài thi để bắt đầu ôn tập!");
      return;
    }

    if (reviewMode === "custom") {
      setIsCustomConfigOpen(true);
      return;
    }

    if (reviewMode === "wrong") {
      if (totalWrongInSelection === 0) {
        showErrorToast(
          hasUnattemptedInSelection
            ? "Các bài thi bạn chọn có đề chưa làm hoặc không có câu sai! Vui lòng chọn 'Làm lại tất cả' hoặc 'Yêu cầu riêng'."
            : "Các bài thi bạn chọn không có câu sai nào! Vui lòng chọn chế độ 'Làm lại tất cả'."
        );
        return;
      }
    }

    setIsStarting(true);
    try {
      const aggregatePayload = selectedItems.map((item) => ({
        exam: item.exam,
        submission: item.submission,
        questions:
          reviewMode === "wrong"
            ? item.stillWrongQuestions || []
            : reviewMode === "correct"
            ? (item.questions || []).filter((q) => {
                const ans = item.submission?.answers?.[q.id];
                return ans !== undefined && ans !== null && ans !== "";
              })
            : item.submission?.shuffledQuestionsSnapshot ||
              item.exam.questions ||
              item.questions,
      }));

      const result = await createAggregatedReviewExam({
        items: aggregatePayload,
        mode: reviewMode === "wrong" ? "wrong" : "all",
        durationMode,
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
            Ôn bài cũ & Luyện đề đa nguồn
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
            Hỗ trợ 3 nguồn bài linh hoạt: lịch sử bài đã làm, bài thêm bằng link/mã đề, và tổng hợp
            nhiều bài song song. Tùy biến dạng câu, độ khó hoặc nhờ Gemini AI tuyển chọn đề riêng.
          </p>
        </div>

        {/* Quick counters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto shrink-0">
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-center">
            <span className="text-[11px] font-semibold text-slate-400 block">Đề khả dụng</span>
            <span className="text-lg sm:text-xl font-black text-slate-800">
              {combinedItems.length} đề
            </span>
          </div>
          <div className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-2xl text-center">
            <span className="text-[11px] font-semibold text-rose-500 block">Câu cần khắc phục</span>
            <span className="text-lg sm:text-xl font-black text-rose-700">
              {combinedItems.reduce((acc, i) => acc + i.wrongCount, 0)} câu
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

      {/* Section: Thêm bài thi bằng Link / Mã đề */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/70 flex items-center justify-center text-indigo-600">
              <LinkIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Thêm bài thi bằng Link hoặc Mã đề
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Dán một hoặc nhiều link bài thi (ví dụ: https://.../student/exam/ID) hoặc mã đề để ôn tập cùng lúc.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowImportBox(!showImportBox)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
          >
            {showImportBox ? "Thu gọn" : "➕ Dán link / mã"}
          </button>
        </div>

        {showImportBox && (
          <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in">
            <textarea
              rows={3}
              value={importInput}
              onChange={(e) => setImportInput(e.target.value)}
              placeholder="Dán link bài thi hoặc mã đề vào đây...&#10;Ví dụ: https://dk-test-v3.vercel.app/student/exam/EXAM_ID&#10;Hoặc mã đề: TOAN12_001 (hỗ trợ nhiều dòng)"
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
            />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Hỗ trợ URL đầy đủ, đường dẫn tương đối, hoặc mã đề trực tiếp.</span>
              </div>

              <button
                type="button"
                onClick={handleImportReferences}
                disabled={isImporting || !importInput.trim()}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang tìm & thêm bài thi...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm vào danh sách ôn</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Imported Items Badges */}
        {importedItems.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Đề thi đã thêm thủ công ({importedItems.length}):
            </span>
            <div className="flex flex-wrap gap-2">
              {importedItems.map((item) => {
                const isSelected = selectedExamIds.has(item.examId);
                return (
                  <div
                    key={item.examId}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      isSelected
                        ? "bg-indigo-50 border-indigo-300 text-indigo-900 shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSelectExam(item.examId)}
                      className="cursor-pointer hover:underline truncate max-w-[200px]"
                    >
                      {item.examTitle}
                    </button>

                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                        item.hasAttempt
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {item.hasAttempt ? "Đã làm" : "Chưa làm"}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemoveImportedItem(item.examId)}
                      className="text-slate-400 hover:text-rose-600 p-0.5 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Xóa bài thi này"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
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
              Tất cả ({combinedItems.length})
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
                {cat} ({combinedItems.filter((i) => i.category === cat).length})
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
            <span>
              Chỉ hiện bài có câu sai ({combinedItems.filter((i) => i.wrongCount > 0).length})
            </span>
          </label>
        </div>
      </div>

      {/* List of Exams */}
      {loading ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl space-y-3">
          <Loader2 className="w-7 h-7 text-blue-600 animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">
            Đang tải danh sách bài thi và phân tích ôn tập...
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl space-y-3">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700">Không tìm thấy bài thi nào</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery || selectedCategory !== "all" || onlyWithErrors
              ? "Không có bài thi nào phù hợp với bộ lọc hiện tại. Vui lòng thử lại tiêu chí khác."
              : "Bạn có thể dán link bài thi hoặc mã đề ở trên để bắt đầu ôn tập ngay!"}
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

                        {/* Source Badges */}
                        {item.sourceType === "imported_link" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Link bài thi
                          </span>
                        )}
                        {item.sourceType === "imported_code" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                            Mã đề
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 text-xs text-slate-400 font-medium flex-wrap pt-0.5">
                        {item.hasAttempt ? (
                          <>
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
                            {item.correctedInReviewCount && item.correctedInReviewCount > 0 ? (
                              <span className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                                Đã sửa đúng {item.correctedInReviewCount} câu
                              </span>
                            ) : null}
                            {item.submittedAt && (
                              <span className="flex items-center gap-1 text-slate-400">
                                <Calendar className="w-3.5 h-3.5" />
                                {formatDate(item.submittedAt)}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="flex items-center gap-1 text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            <BookOpen className="w-3.5 h-3.5" />
                            Chưa từng làm đề này • Sẵn sàng ôn tập
                          </span>
                        )}
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

          {/* Load More (+5 Exams) Button */}
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
                Đang hiển thị {examItems.length} / {allCandidates.length} bài thi từ lịch sử
              </span>
            </div>
          )}
        </div>
      )}

      {/* Floating Bottom Action Bar */}
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
                  Tổng số ~{totalQuestionsInSelection} câu hỏi
                  {totalWrongInSelection > 0 && ` • ${totalWrongInSelection} câu sai`}
                  {totalCorrectInSelection > 0 && ` • ${totalCorrectInSelection} câu đúng`}
                  {hasUnattemptedInSelection && ` • Có đề chưa làm`}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Hệ thống sẽ tổng hợp đầy đủ các câu hỏi từ các đề thi đã chọn.
              </p>
            </div>

            {/* Mode Selector & Start CTA */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              {/* Mode Switcher */}
              <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0 flex-wrap sm:flex-nowrap">
                <button
                  type="button"
                  onClick={() => setReviewMode("wrong")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    reviewMode === "wrong"
                      ? "bg-white text-rose-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span>Câu sai ({totalWrongInSelection})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReviewMode("all")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    reviewMode === "all"
                      ? "bg-white text-blue-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-blue-500" />
                  <span>Tất cả</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReviewMode("correct")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    reviewMode === "correct"
                      ? "bg-white text-emerald-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Câu đúng ({totalCorrectInSelection})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReviewMode("custom");
                    setIsCustomConfigOpen(true);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    reviewMode === "custom"
                      ? "bg-linear-to-r from-indigo-600 to-purple-600 text-white shadow-2xs"
                      : "text-indigo-600 hover:text-indigo-900 hover:bg-white/60"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>✨ Yêu cầu riêng</span>
                </button>
              </div>

              {/* Duration Switcher (When not in custom mode) */}
              {reviewMode !== "custom" && (
                <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDurationMode("unlimited")}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      durationMode === "unlimited"
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    title="Làm bài không giới hạn thời gian (Vô hạn)"
                  >
                    <span>♾️ Vô hạn time</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDurationMode("auto")}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      durationMode === "auto"
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    title="Thời gian làm bài tính 1.5 phút/câu"
                  >
                    <span>⏱️ 1.5p/câu</span>
                  </button>
                </div>
              )}

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
                    <span>Đang chuẩn bị đề thi...</span>
                  </>
                ) : reviewMode === "custom" ? (
                  <>
                    <span>Mở bộ cấu hình</span>
                    <Sparkles className="w-4 h-4" />
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

      {/* Custom Review Configurator Modal */}
      {isCustomConfigOpen && (
        <CustomReviewConfigurator
          isOpen={isCustomConfigOpen}
          onClose={() => setIsCustomConfigOpen(false)}
          sources={selectedItems}
        />
      )}
    </div>
  );
}
