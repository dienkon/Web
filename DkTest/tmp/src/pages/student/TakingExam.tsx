import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Clock,
  AlertTriangle,
  Send,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Loader2,
  ShieldAlert,
  Flag,
  CheckCircle2,
  HelpCircle,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  ListFilter,
  FileText,
  Layers,
  X,
  Pencil,
} from "lucide-react";
import ScratchpadModal from "../../features/student-exam/components/ScratchpadModal";
import CasioCalculator from "../../components/exam/CasioCalculator";
import { getExam } from "../../services/examService";
import { createSubmission } from "../../services/submissionService";
import { buildSubExamAttempt } from "../../features/sub-exam/engine/buildSubExamAttempt";
import { organizeAndShuffleExam } from "../../utils/examShuffler";
import { saveStudentProfile } from "../../services/studentService";
import {
  syncRealtimeSession,
  updateRealtimeSessionMetrics,
  removeRealtimeSession,
  subscribeToSingleSession,
} from "../../services/realtimeProctoringService";
import {
  collection,
  getDocs,
  query,
  orderBy,
  getDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../services/firebase/config";
import {
  saveActiveExamSession,
  updateActiveExamSessionAnswers,
  getActiveExamSession,
  clearActiveExamSession,
} from "../../services/examSessionService";
import type { Exam, Question, Section } from "../../types";
import LatexPreview from "../../features/exam-builder/editor/LatexPreview";
import { useToast } from "../../components/ui/ToastNotification";

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function TakingExam() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { showToast, error: showErrorToast, info: showInfoToast } = useToast();

  const [exam, setExam] = useState<Exam | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const [timeLeft, setTimeLeft] = useState(0);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [warnings, setWarnings] = useState(0);
  const [studentName, setStudentName] = useState("Thí sinh");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // New UI controls: Show/Hide Map & Paging vs Scroll view
  const [showMap, setShowMap] = useState<boolean>(window.innerWidth >= 1024);
  const [displayMode, setDisplayMode] = useState<"paging" | "scroll">(
    window.innerWidth < 1024 ? "scroll" : "paging",
  );
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [showCasio, setShowCasio] = useState(false);

  // Force scroll mode on resize if mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setDisplayMode("scroll");
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const startTimeRef = useRef<number>(Date.now());
  const sessionIdRef = useRef<string>(
    (() => {
      try {
        const sInfo =
          localStorage.getItem("student_info") ||
          localStorage.getItem("current_student_session");
        const u = sInfo ? JSON.parse(sInfo).username : "student";
        return `sess_${u}_${window.location.pathname.split("/")[3] || Date.now()}`;
      } catch (e) {
        return (
          "sess_" +
          Date.now() +
          "_" +
          Math.random().toString(36).substring(2, 7)
        );
      }
    })(),
  );
  const isSessionActiveRef = useRef<boolean>(true);
  const isSubmittingRef = useRef<boolean>(false);
  const isManualScrollingRef = useRef<boolean>(false);
  const hasAutoSubmittedRef = useRef<boolean>(false);
  const subExamConfigUsedRef = useRef<any>(null);
  const isSubExamUsedRef = useRef<boolean>(false);
  const lastSyncTimeRef = useRef<number>(0);

  // Realtime Active Session Sync to Firestore and RTDB
  const syncCurrentSession = async (force: boolean = false) => {
    if (
      !examId ||
      loading ||
      !exam ||
      !isSessionActiveRef.current ||
      isSubmittingRef.current
    )
      return;

    const now = Date.now();
    // Throttle automatic timer updates to once every 5 seconds unless forced
    if (!force && now - lastSyncTimeRef.current < 5000) {
      return;
    }
    lastSyncTimeRef.current = now;

    const studentInfoStr =
      localStorage.getItem("student_info") ||
      localStorage.getItem("current_student_session");
    let studentUsername = "student";
    let studentClass = "Học sinh";
    let currentDisplayName = studentName;
    if (studentInfoStr) {
      try {
        const parsed = JSON.parse(studentInfoStr);
        if (parsed.username) studentUsername = parsed.username;
        if (parsed.studentClass || parsed.class)
          studentClass = parsed.studentClass || parsed.class;
        if (
          parsed.displayName &&
          (!currentDisplayName || currentDisplayName === "Thí sinh")
        ) {
          currentDisplayName = parsed.displayName;
        }
      } catch (e) {}
    }

    const sessId = sessionIdRef.current || `sess_${studentUsername}_${examId}`;

    try {
      await syncRealtimeSession({
        sessionId: sessId,
        examId,
        examTitle: exam.title || "Bài thi",
        studentName: currentDisplayName || studentUsername,
        studentUsername,
        studentId: studentUsername,
        studentClass,
        timeLeft,
        answeredCount: Object.keys(answers).length,
        totalQuestions: questions.length,
        warnings,
        status: warnings > 0 ? "warning" : "taking",
        lastActiveAt: now,
        answers: answers,
        activeQuestionIdx: activeQuestionIdx,
        shuffledQuestions: questions,
        questionOrder: questions.map((q) => q.id),
      });
    } catch (e) {
      console.warn("Realtime session sync error:", e);
    }
  };

  // Cleanup session on unmount
  useEffect(() => {
    return () => {
      isSessionActiveRef.current = false;
      const sessId = sessionIdRef.current;
      if (sessId) {
        try {
          removeRealtimeSession(sessId);
        } catch (e) {}
      }
    };
  }, []);

  // Sync whenever key state changes (immediate force sync on answers, warnings, active question)
  useEffect(() => {
    if (!loading && exam && isSessionActiveRef.current) {
      syncCurrentSession(true);
    }
  }, [answers, warnings, activeQuestionIdx, loading, examId]);

  // Periodic heartbeat sync for timer
  useEffect(() => {
    if (!loading && exam && isSessionActiveRef.current && timeLeft > 0) {
      syncCurrentSession(false);
    }
  }, [timeLeft]);

  // Listen for admin actions (pause, suspend)
  useEffect(() => {
    if (!sessionIdRef.current || loading || !exam) return;

    const unsubscribe = subscribeToSingleSession(
      sessionIdRef.current,
      (liveSession) => {
        if (liveSession) {
          if (liveSession.adminAction === "pause") {
            // Maybe we show a modal overlay in TakingExam
            setIsPaused(true);
            setAdminMessage(
              liveSession.adminMessage ||
                "Bài thi của bạn đang bị tạm dừng bởi Giám thị.",
            );
          } else if (liveSession.adminAction === "suspend" && !isSuspended) {
            setIsSuspended(true);
            setAdminMessage(
              liveSession.adminMessage || "Bạn đã bị đình chỉ thi.",
            );
            // Force submit
            executeSubmit();
          } else {
            setIsPaused(false);
          }
        }
      },
    );

    return () => unsubscribe();
  }, [loading, exam]);

  useEffect(() => {
    const loadExamAndPrepare = async () => {
      if (!examId) return;

      // 1. Enforce Student Login Authentication
      const authRole = localStorage.getItem("auth_role");
      const studentInfoStr = localStorage.getItem("student_info");
      if ((authRole !== "student" && authRole !== "admin") || !studentInfoStr) {
        showErrorToast("Vui lòng đăng nhập tài khoản học sinh để làm bài thi!");
        navigate(
          `/student/login?redirect=${encodeURIComponent(`/student/exam/${examId}`)}`,
          { replace: true },
        );
        return;
      }

      setLoading(true);
      try {
        console.log(`[Firestore] Loading exam for taking: ${examId}`);
        console.log("[Firestore] READ: exams/" + examId);
        const examDoc = await getDoc(doc(db, "exams", examId));
        if (!examDoc.exists()) {
          showErrorToast("Không tìm thấy bài thi!");
          navigate("/", { replace: true });
          return;
        }

        console.log(`[Firestore] Exam loaded with 1 document read: ${examId}`);
        const data = examDoc.data();
        const {
          sections: docSections,
          questions: docQuestions,
          ...meta
        } = data;
        const examData = meta as Exam;

        setExam(examData);

        // Retrieve student session name or profile
        const sessionStr = localStorage.getItem("current_student_session");
        if (sessionStr) {
          try {
            const parsed = JSON.parse(sessionStr);
            if (parsed.name) setStudentName(parsed.name);
          } catch (e) {}
        } else if (studentInfoStr) {
          try {
            const parsed = JSON.parse(studentInfoStr);
            if (parsed.displayName || parsed.username) {
              setStudentName(parsed.displayName || parsed.username);
            }
          } catch (e) {}
        }

        // Fetch questions from document or fallback to subcollection if missing (legacy)
        let rawQuestions: Question[] = Array.isArray(docQuestions)
          ? docQuestions
          : [];
        if (!Array.isArray(docQuestions)) {
          console.log(
            "[Firestore] READ_MANY: exams/" + examId + "/questions (fallback)",
          );
          const qSnap = await getDocs(
            query(collection(db, `exams/${examId}/questions`)),
          );
          rawQuestions = qSnap.docs.map(
            (d) => ({ id: d.id, ...d.data() }) as Question,
          );
        }
        rawQuestions.sort((a, b) => (a.order || 0) - (b.order || 0));

        // Fetch sections from document or fallback to subcollection if missing (legacy)
        let rawSections: Section[] = Array.isArray(docSections)
          ? docSections
          : [];
        if (!Array.isArray(docSections)) {
          console.log(
            "[Firestore] READ_MANY: exams/" + examId + "/sections (fallback)",
          );
          const secSnap = await getDocs(
            query(collection(db, `exams/${examId}/sections`)),
          );
          rawSections = secSnap.docs.map(
            (d) => ({ id: d.id, ...d.data() }) as Section,
          );
        }
        rawSections.sort((a, b) => (a.order || 0) - (b.order || 0));

        if (examData.shuffleSections && rawSections.length > 0) {
          const unpinned = shuffleArray(rawSections.filter((s) => !s.pinOrder));
          let unpinnedIdx = 0;
          rawSections = rawSections.map((sec) =>
            sec.pinOrder ? sec : unpinned[unpinnedIdx++],
          );
        }
        setSections(rawSections);

        // Student Info & Snapshot Storage Key
        const studentInfo = studentInfoStr ? JSON.parse(studentInfoStr) : null;
        const studentIdentifier =
          studentInfo?.username || studentInfo?.displayName || "student";
        sessionIdRef.current = `sess_${studentIdentifier.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${examId}`;
        const snapshotKey = `attemptSnapshot_${examId}_${studentIdentifier}`;

        // Organize and shuffle questions
        let allQuestions: Question[] = [];

        // Check for active Attempt Snapshot
        let activeSnapshot = null;
        try {
          const snapshotStr = localStorage.getItem(snapshotKey);
          if (snapshotStr) activeSnapshot = JSON.parse(snapshotStr);
        } catch (e) {}

        if (
          activeSnapshot &&
          activeSnapshot.shuffledQuestions &&
          activeSnapshot.shuffledQuestions.length > 0
        ) {
          // Full restore with frozen shuffled questions & options
          allQuestions = activeSnapshot.shuffledQuestions;
          isSubExamUsedRef.current = !!activeSnapshot.configSnapshot;
          subExamConfigUsedRef.current = activeSnapshot.configSnapshot || null;
        } else if (activeSnapshot) {
          // Restore question sequence from snapshot
          const questionMap = new Map(rawQuestions.map((q) => [q.id, q]));
          allQuestions = activeSnapshot.selectedQuestionIds
            .map((id: string) => questionMap.get(id))
            .filter(Boolean) as Question[];
          isSubExamUsedRef.current = !!activeSnapshot.configSnapshot;
          subExamConfigUsedRef.current = activeSnapshot.configSnapshot || null;

          allQuestions = allQuestions.map((q) => {
            let processed = { ...q };
            if (
              q.shuffleOptions !== false &&
              examData.shuffleOptions !== false &&
              (q.type === "single_choice" || q.type === "multiple_choice") &&
              q.options
            ) {
              processed.options = shuffleArray(q.options);
            }
            if (
              q.shuffleStatements !== false &&
              examData.shuffleStatements !== false &&
              q.type === "true_false" &&
              q.statements
            ) {
              processed.statements = shuffleArray(q.statements);
            }
            return processed;
          });

          // Update snapshot with frozen questions
          localStorage.setItem(
            snapshotKey,
            JSON.stringify({
              ...activeSnapshot,
              shuffledQuestions: allQuestions,
            }),
          );
        } else {
          // Check for student's custom sub-exam config
          let studentSubExamConfig = null;
          let useSubExam =
            examData.allowSubExam && examData.subExamConfig?.enabled;
          try {
            const storedConfigStr = localStorage.getItem(
              `custom_sub_exam_config_${examId}`,
            );
            if (storedConfigStr) {
              const storedConfig = JSON.parse(storedConfigStr);
              if (storedConfig.useSubExam !== undefined) {
                useSubExam = storedConfig.useSubExam;
                if (useSubExam && storedConfig.config) {
                  studentSubExamConfig = storedConfig.config;
                }
              }
            }
          } catch (e) {}

          // Normal load or build sub-exam
          if (useSubExam && (studentSubExamConfig || examData.subExamConfig)) {
            const finalConfig = studentSubExamConfig || examData.subExamConfig;
            const attempt = buildSubExamAttempt(
              examData,
              rawQuestions,
              rawSections,
              finalConfig,
            );
            allQuestions = attempt.questions;
            isSubExamUsedRef.current = true;
            subExamConfigUsedRef.current = attempt.config || null;
          } else {
            isSubExamUsedRef.current = false;
            subExamConfigUsedRef.current = null;
            const organized = organizeAndShuffleExam(
              examData,
              rawQuestions,
              rawSections,
            );
            allQuestions = organized.orderedQuestions;
          }

          allQuestions = allQuestions.map((q) => {
            let processed = { ...q };
            if (
              q.shuffleOptions !== false &&
              examData.shuffleOptions !== false &&
              (q.type === "single_choice" || q.type === "multiple_choice") &&
              q.options
            ) {
              processed.options = shuffleArray(q.options);
            }
            if (
              q.shuffleStatements !== false &&
              examData.shuffleStatements !== false &&
              q.type === "true_false" &&
              q.statements
            ) {
              processed.statements = shuffleArray(q.statements);
            }
            return processed;
          });

          // Save snapshot with frozen questions & options
          const newSnapshot = {
            examId,
            attemptId: sessionIdRef.current,
            selectedQuestionIds: allQuestions.map((q) => q.id),
            questionOrder: allQuestions.map((q) => q.id),
            shuffledQuestions: allQuestions,
            configSnapshot: subExamConfigUsedRef.current,
            createdAt: Date.now(),
          };
          localStorage.setItem(snapshotKey, JSON.stringify(newSnapshot));
        }

        setQuestions(allQuestions);

        // Active Exam Session & Timer Logic
        const activeSession = getActiveExamSession(examId);
        let startTime = Date.now();
        const durationMinutes = examData.timeLimit || 45;

        if (activeSession && activeSession.status === "in-progress") {
          // Restore in-progress answers and proctoring info
          if (
            activeSession.answers &&
            Object.keys(activeSession.answers).length > 0
          ) {
            setAnswers(activeSession.answers);
          }
          if (activeSession.flagged) {
            setFlagged(activeSession.flagged);
          }
          if (typeof activeSession.activeQuestionIdx === "number") {
            setActiveQuestionIdx(activeSession.activeQuestionIdx);
          }
          if (typeof activeSession.warnings === "number") {
            setWarnings(activeSession.warnings);
          }

          startTime = activeSession.startTime;
          startTimeRef.current = startTime;
          const remainingMs = activeSession.endTime - Date.now();

          if (remainingMs <= 0) {
            setTimeLeft(0);
          } else {
            setTimeLeft(Math.floor(remainingMs / 1000));
            showInfoToast(
              "Đã khôi phục bài làm dở và thời gian làm bài của bạn!",
            );
          }
        } else {
          // New Attempt Session
          const storageKey = `exam_startTime_${examId}_${studentIdentifier}`;
          const storedStart = localStorage.getItem(storageKey);
          if (storedStart) {
            startTime = parseInt(storedStart, 10);
          } else {
            localStorage.setItem(storageKey, startTime.toString());
          }
          startTimeRef.current = startTime;

          const limitMs = durationMinutes * 60 * 1000;
          const elapsedMs = Date.now() - startTime;
          const remainingMs = limitMs - elapsedMs;

          if (remainingMs <= 0) {
            setTimeLeft(0);
          } else {
            setTimeLeft(Math.floor(remainingMs / 1000));
          }

          saveActiveExamSession({
            examId,
            examTitle: examData.title,
            examCode: examData.code,
            studentUsername: studentIdentifier,
            studentName: studentName || "Thí sinh",
            startTime,
            durationMinutes,
            answers: {},
            flagged: {},
            activeQuestionIdx: 0,
            warnings: 0,
          });
        }
      } catch (err) {
        console.error("Lỗi khi chuẩn bị phòng thi:", err);
      } finally {
        setLoading(false);
      }
    };

    loadExamAndPrepare();
  }, [examId, navigate]);

  // Timer countdown & auto-submit when remaining time expires
  useEffect(() => {
    if (loading || !exam || isPaused) return;

    // If timer is already at 0, trigger auto submit immediately
    if (timeLeft <= 0) {
      if (
        !hasAutoSubmittedRef.current &&
        !isSubmittingRef.current &&
        !submitting
      ) {
        hasAutoSubmittedRef.current = true;
        handleAutoSubmit();
      }
      return;
    }

    const timer = setInterval(() => {
      const studentInfoStr = localStorage.getItem("student_info");
      const studentInfo = studentInfoStr ? JSON.parse(studentInfoStr) : null;
      const studentIdentifier =
        studentInfo?.username || studentInfo?.displayName || "unknown";
      const storageKey = `exam_startTime_${examId}_${studentIdentifier}`;

      const storedStart = localStorage.getItem(storageKey);
      let startTime = startTimeRef.current;
      if (storedStart) {
        startTime = parseInt(storedStart, 10);
      }

      const limitMs = (exam?.timeLimit || 45) * 60 * 1000;
      const elapsedMs = Date.now() - startTime;
      const remainingMs = limitMs - elapsedMs;

      if (remainingMs <= 0) {
        clearInterval(timer);
        setTimeLeft(0);
        if (
          !hasAutoSubmittedRef.current &&
          !isSubmittingRef.current &&
          !submitting
        ) {
          hasAutoSubmittedRef.current = true;
          handleAutoSubmit();
        }
      } else {
        setTimeLeft(Math.floor(remainingMs / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, timeLeft, exam, examId, submitting]);

  // Guaranteed safeguard auto-submit when timeLeft is 0
  useEffect(() => {
    if (
      !loading &&
      exam &&
      timeLeft <= 0 &&
      !hasAutoSubmittedRef.current &&
      !isSubmittingRef.current &&
      !submitting
    ) {
      hasAutoSubmittedRef.current = true;
      handleAutoSubmit();
    }
  }, [loading, exam, timeLeft, submitting]);

  // Continuously sync in-progress answers & state to localStorage
  useEffect(() => {
    if (
      !loading &&
      exam &&
      examId &&
      !submitting &&
      isSessionActiveRef.current
    ) {
      updateActiveExamSessionAnswers(examId, answers, {
        flagged,
        activeQuestionIdx,
        warnings,
      });
    }
  }, [
    answers,
    flagged,
    activeQuestionIdx,
    warnings,
    loading,
    exam,
    examId,
    submitting,
  ]);

  // Anti-cheat detection: visibilitychange & window blur
  useEffect(() => {
    if (!exam || !exam.antiCheatEnabled) return;

    const handleVisibility = () => {
      if (document.hidden) {
        setWarnings((w) => w + 1);
      }
    };

    const handleBlur = () => {
      setWarnings((w) => w + 1);
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
    };
  }, [exam]);

  // ScrollSpy for Active Question Tracking in Scroll Mode
  useEffect(() => {
    if (
      displayMode === "paging" ||
      questions.length === 0 ||
      loading ||
      submitting
    )
      return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isManualScrollingRef.current) return; // Prevent overwriting active index during click-scroll

        // Find the most visible question card
        let maxRatio = 0;
        let mostVisibleIdx = -1;

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            const idParts = entry.target.id.split("-");
            const idx = parseInt(idParts[idParts.length - 1], 10);
            if (!isNaN(idx)) {
              mostVisibleIdx = idx;
            }
          }
        });

        if (mostVisibleIdx !== -1) {
          setActiveQuestionIdx(mostVisibleIdx);
        }
      },
      {
        root: null,
        rootMargin: "-20% 0px -40% 0px", // Trigger active when it passes the top 20%
        threshold: [0.1, 0.5, 0.9],
      },
    );

    questions.forEach((_, idx) => {
      const el = document.getElementById(`q-card-${idx}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [displayMode === "paging", questions.length, loading, submitting]);

  // System Point Calculation: Total max score is 10.0 points.
  // Each question counts as (10 / totalQuestions) points.
  // For true/false, each statement counts as (pointPerQuestion / statements.length).
  const calculateScore = () => {
    const totalQ = questions.length;
    if (totalQ === 0) {
      return {
        rawScore: 0,
        score: 0,
        correctCount: 0,
        maxScore: 10,
        totalCount: 0,
      };
    }

    const pointPerQuestion = 10 / totalQ;
    let totalEarnedPoints = 0;
    let correctCount = 0;

    questions.forEach((q) => {
      const ans = answers[q.id];
      if (!ans) return;

      if (q.type === "single_choice") {
        const isCorrect = q.correctOptionIds?.includes(ans as string);
        if (isCorrect) {
          totalEarnedPoints += pointPerQuestion;
          correctCount++;
        }
      } else if (q.type === "multiple_choice") {
        const correctSet = new Set<string>(q.correctOptionIds || []);
        const ansSet = new Set<string>((ans as string[]) || []);
        const isCorrect =
          correctSet.size > 0 &&
          correctSet.size === ansSet.size &&
          [...correctSet].every((id: string) => ansSet.has(id));
        if (isCorrect) {
          totalEarnedPoints += pointPerQuestion;
          correctCount++;
        }
      } else if (q.type === "true_false") {
        const stmts = q.statements || [];
        if (stmts.length > 0) {
          const pointPerStatement = pointPerQuestion / stmts.length;
          let correctInThisQ = 0;
          stmts.forEach((s) => {
            // ans for true_false is an object { [statementId]: boolean }
            if (ans[s.id] === s.correctAnswer) {
              correctInThisQ++;
              totalEarnedPoints += pointPerStatement;
            }
          });
          if (correctInThisQ === stmts.length) {
            correctCount++;
          }
        }
      } else if (q.type === "short_answer") {
        const accepted =
          q.acceptedAnswers?.map((a) => a.trim().toLowerCase()) || [];
        const isCorrect = accepted.includes(String(ans).trim().toLowerCase());
        if (isCorrect) {
          totalEarnedPoints += pointPerQuestion;
          correctCount++;
        }
      }
    });

    const finalScore = Math.min(10, Math.round(totalEarnedPoints * 100) / 100);

    return {
      rawScore: totalEarnedPoints,
      score: finalScore,
      correctCount,
      maxScore: 10,
      totalCount: totalQ,
    };
  };

  const handleAutoSubmit = async () => {
    showInfoToast(
      "Thời gian làm bài đã kết thúc! Hệ thống đang tự động nộp bài thi của bạn.",
    );
    await executeSubmit();
  };

  const executeSubmit = async () => {
    if (!exam || !examId) return;
    isSessionActiveRef.current = false;
    isSubmittingRef.current = true;
    setSubmitting(true);
    try {
      const { score, correctCount, maxScore, totalCount } = calculateScore();
      const timeSpent = Math.max(
        1,
        Math.floor((Date.now() - startTimeRef.current) / 1000),
      );

      const studentInfoStr =
        localStorage.getItem("student_info") ||
        localStorage.getItem("current_student_session");
      let studentUsername = "student";
      let studentClassSnapshot = "Học sinh";
      if (studentInfoStr) {
        try {
          const parsed = JSON.parse(studentInfoStr);
          if (parsed.username) studentUsername = parsed.username;
          if (parsed.studentClass || parsed.class)
            studentClassSnapshot = parsed.studentClass || parsed.class;
        } catch (e) {}
      }

      const sub = await createSubmission({
        examId,
        examTitleSnapshot: exam.title,
        examCodeSnapshot: exam.code || "",
        studentId: studentUsername,
        studentNameSnapshot: studentName,
        studentUsername,
        studentClassSnapshot,
        score,
        maxScore,
        correctCount,
        totalCount,
        timeSpent,
        cheatViolations: warnings,
        answers,
        shuffledQuestionsSnapshot: questions,
        subExam: isSubExamUsedRef.current,
        subExamConfigSnapshot:
          subExamConfigUsedRef.current ||
          (exam.allowSubExam && exam.subExamConfig ? exam.subExamConfig : null),
      });

      // Save or update student profile in Firestore
      try {
        await saveStudentProfile({
          name: studentName,
          username: studentUsername,
          studentClass: studentClassSnapshot,
        });
      } catch (profileErr) {
        console.warn("Could not save student profile:", profileErr);
      }

      // Clean up active session from real-time monitoring upon submission immediately
      try {
        const sessId =
          sessionIdRef.current || `sess_${studentUsername}_${examId}`;
        await removeRealtimeSession(sessId);
      } catch (sessErr) {
        console.warn("Could not remove active session:", sessErr);
      }

      clearActiveExamSession(examId);

      // Save submission ID to local submission history
      try {
        const historyStr = localStorage.getItem("student_submission_history");
        const historyArr: string[] = historyStr ? JSON.parse(historyStr) : [];
        if (!historyArr.includes(sub.id)) {
          historyArr.unshift(sub.id);
          localStorage.setItem(
            "student_submission_history",
            JSON.stringify(historyArr.slice(0, 100)),
          );
        }
      } catch (histErr) {
        console.warn("Could not save local submission history", histErr);
      }

      navigate(`/student/exam/${examId}/result/${sub.id}`, { replace: true });
    } catch (err) {
      console.error("Lỗi khi nộp bài:", err);
      showErrorToast("Đã xảy ra lỗi khi nộp bài. Vui lòng thử lại!");
      setSubmitting(false);
      isSubmittingRef.current = false;
      isSessionActiveRef.current = true;
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleQuestionSelectInMap = (index: number) => {
    setActiveQuestionIdx(index);
    if (displayMode === "scroll") {
      isManualScrollingRef.current = true;
      const el = document.getElementById(`q-card-${index}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.classList.add(
          "ring-4",
          "ring-blue-400",
          "ring-offset-2",
          "transition-all",
          "duration-300",
        );
        setTimeout(() => {
          el.classList.remove("ring-4", "ring-blue-400", "ring-offset-2");
        }, 1800);
        setTimeout(() => {
          isManualScrollingRef.current = false;
        }, 1000); // Re-enable observer after smooth scroll finishes
      } else {
        isManualScrollingRef.current = false;
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">
            Đang tải và chuẩn bị đề thi...
          </p>
        </div>
      </div>
    );
  }

  const currentQ = questions[activeQuestionIdx];
  const answeredCount = Object.keys(answers).filter((k) => {
    const v = answers[k];
    if (v === undefined || v === null || v === "") return false;
    if (Array.isArray(v) && v.length === 0) return false;
    if (typeof v === "object" && Object.keys(v).length === 0) return false;
    return true;
  }).length;

  // Single Question Card Component Render
  const renderQuestionCard = (q: Question, qIdx: number) => {
    const qSection = q.sectionId
      ? sections.find((s) => s.id === q.sectionId)
      : null;

    return (
      <div
        id={`q-card-${qIdx}`}
        key={q.id}
        className="bg-white border border-slate-200 rounded-3xl p-5 lg:p-8 shadow-2xs space-y-6 scroll-mt-20"
      >
        {/* Question Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 bg-blue-600 text-white font-bold text-xs rounded-lg">
              Câu {qIdx + 1}
            </span>
            {qSection && (
              <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold truncate max-w-[220px]">
                {qSection.title}
              </span>
            )}
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {q.type === "single_choice" && "Trắc nghiệm 1 đáp án"}
              {q.type === "multiple_choice" && "Trắc nghiệm nhiều đáp án"}
              {q.type === "true_false" && "Đúng / Sai theo ý"}
              {q.type === "short_answer" && "Điền câu trả lời ngắn"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setFlagged((prev) => ({
                  ...prev,
                  [q.id]: !prev[q.id],
                }))
              }
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                flagged[q.id]
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Flag
                className={`w-3.5 h-3.5 ${flagged[q.id] ? "fill-amber-600 text-amber-600" : ""}`}
              />
              {flagged[q.id] ? "Đã đánh dấu" : "Đánh dấu xem lại"}
            </button>
          </div>
        </div>

        {/* Question Prompt */}
        <div className="text-slate-900 text-base lg:text-lg font-medium leading-relaxed">
          <LatexPreview content={q.text} />
        </div>

        {/* Answer Options */}
        <div className="pt-2">
          {/* 1. Single Choice */}
          {q.type === "single_choice" && (
            <div className="space-y-2.5">
              {q.options?.map((opt, optIdx) => {
                const letter = String.fromCharCode(65 + optIdx);
                const isSelected = answers[q.id] === opt.id;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      setAnswers((prev) => ({
                        ...prev,
                        [q.id]: opt.id,
                      }))
                    }
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? "bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 text-blue-950 font-semibold"
                        : "bg-slate-50/70 border-slate-200 hover:bg-slate-100/70 text-slate-800"
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-white text-slate-600 border border-slate-200"
                      }`}
                    >
                      {letter}
                    </span>
                    <div className="flex-1 text-sm pt-0.5">
                      <LatexPreview content={opt.text} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* 2. Multiple Choice */}
          {q.type === "multiple_choice" && (
            <div className="space-y-2.5">
              {q.options?.map((opt, optIdx) => {
                const letter = String.fromCharCode(65 + optIdx);
                const currentSelectedArr: string[] = answers[q.id] || [];
                const isSelected = currentSelectedArr.includes(opt.id);

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setAnswers((prev) => {
                        const existing = (prev[q.id] as string[]) || [];
                        const updated = existing.includes(opt.id)
                          ? existing.filter((id) => id !== opt.id)
                          : [...existing, opt.id];
                        return { ...prev, [q.id]: updated };
                      });
                    }}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? "bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 text-blue-950 font-semibold"
                        : "bg-slate-50/70 border-slate-200 hover:bg-slate-100/70 text-slate-800"
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-white text-slate-600 border border-slate-200"
                      }`}
                    >
                      {letter}
                    </span>
                    <div className="flex-1 text-sm pt-0.5">
                      <LatexPreview content={opt.text} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* 3. True / False */}
          {q.type === "true_false" && (
            <div className="space-y-3">
              {q.statements?.map((stmt, sIdx) => {
                const letter = String.fromCharCode(97 + sIdx);
                const currentStmtAns = answers[q.id]?.[stmt.id];

                return (
                  <div
                    key={stmt.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5 flex-1">
                      <span className="font-bold text-xs bg-white text-blue-700 px-2 py-0.5 rounded-md border border-slate-200 shrink-0 mt-0.5">
                        {letter})
                      </span>
                      <div className="text-sm text-slate-800 font-medium">
                        <LatexPreview content={stmt.text} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => {
                          setAnswers((prev) => ({
                            ...prev,
                            [q.id]: {
                              ...(prev[q.id] || {}),
                              [stmt.id]: true,
                            },
                          }));
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          currentStmtAns === true
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        Đúng
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAnswers((prev) => ({
                            ...prev,
                            [q.id]: {
                              ...(prev[q.id] || {}),
                              [stmt.id]: false,
                            },
                          }));
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          currentStmtAns === false
                            ? "bg-red-600 text-white border-red-600 shadow-2xs"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        Sai
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 4. Short Answer */}
          {q.type === "short_answer" && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                Nhập câu trả lời của bạn:
              </label>
              <input
                type="text"
                placeholder="Nhập đáp án ngắn vào đây..."
                value={answers[q.id] || ""}
                onChange={(e) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [q.id]: e.target.value,
                  }))
                }
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-none pt-16">
      {/* Admin Action Overlays */}
      {isPaused && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center border-t-4 border-amber-500">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Bài thi bị tạm dừng
            </h2>
            <p className="text-slate-600 mb-6">{adminMessage}</p>
            <div className="animate-pulse flex gap-2 justify-center text-sm font-medium text-amber-600">
              <div className="w-2 h-2 bg-amber-500 rounded-full" />
              <div className="w-2 h-2 bg-amber-500 rounded-full" />
              <div className="w-2 h-2 bg-amber-500 rounded-full" />
            </div>
          </div>
        </div>
      )}
      {isSuspended && (
        <div className="fixed inset-0 z-[100] bg-red-900/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center border-t-4 border-red-600">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Đình chỉ thi
            </h2>
            <p className="text-slate-600 font-medium">{adminMessage}</p>
            <p className="text-red-500 text-sm mt-4 font-bold uppercase tracking-wide">
              Hệ thống đã tự động nộp bài
            </p>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between fixed top-0 left-0 right-0 z-50 shadow-2xs">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
            Dk
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              {exam?.title}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium truncate">
              Thí sinh:{" "}
              <strong className="text-slate-800">{studentName}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* View Mode Toggle: Paging vs Scroll */}
          <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setDisplayMode("paging")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                displayMode === "paging"
                  ? "bg-white text-blue-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Từng câu
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode("scroll")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                displayMode === "scroll"
                  ? "bg-white text-blue-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Lướt xuống
            </button>
          </div>

          {/* Scratchpad Note Button */}
          <button
            type="button"
            onClick={() => setShowScratchpad(true)}
            className="px-3 py-2 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs animate-pulse hover:animate-none"
            title="Mở bảng vẽ nháp cho câu hỏi đang chọn"
          >
            <Pencil className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">Bảng nháp</span>
          </button>

          {/* Casio fx-580 VN X Toggle Button */}
          <button
            type="button"
            onClick={() => setShowCasio(!showCasio)}
            className={`px-3 py-2 border rounded-xl transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              showCasio
                ? "bg-amber-100 border-amber-300 text-amber-900 ring-2 ring-amber-500/20"
                : "bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800"
            }`}
            title="Mở giả lập máy tính CASIO fx-580 VN X"
          >
            <span className="font-extrabold text-[10px] tracking-tighter px-1 py-0.5 bg-amber-800 text-white rounded">
              casio
            </span>
          </button>

          {/* Toggle Map Sidebar */}
          <button
            type="button"
            onClick={() => setShowMap(!showMap)}
            className="p-2 text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
            title={showMap ? "Ẩn sơ đồ câu hỏi" : "Hiện sơ đồ câu hỏi"}
          >
            {showMap ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            <span className="hidden md:inline">
              {showMap ? "Ẩn sơ đồ" : "Hiện sơ đồ"}
            </span>
          </button>

          {warnings > 0 && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{warnings} cảnh báo</span>
            </div>
          )}

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-sm sm:text-base border ${
              timeLeft < 300
                ? "bg-red-50 text-red-600 border-red-200 animate-bounce"
                : "bg-blue-50 text-blue-700 border-blue-200"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{formatTime(timeLeft)}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowSubmitConfirm(true)}
            disabled={submitting}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-4 gap-4 items-start">
        {/* Left Side: Questions Container */}
        <div className="flex-1 w-full space-y-4">
          {displayMode === "paging" ? (
            currentQ ? (
              <div className="space-y-4">
                {(() => {
                  const currentSection = currentQ.sectionId
                    ? sections.find((s) => s.id === currentQ.sectionId)
                    : null;
                  const secIndex = currentSection
                    ? sections.findIndex((s) => s.id === currentSection.id)
                    : -1;

                  if (currentSection) {
                    return (
                      <div className="bg-slate-50/50 border-2 border-slate-300 rounded-3xl p-4 sm:p-6 shadow-xs space-y-5">
                        <div className="space-y-3 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
                          <div className="flex items-center gap-2.5 flex-wrap border-b border-slate-100 pb-3">
                            <h3 className="font-extrabold text-base sm:text-lg text-slate-900">
                              {currentSection.title}
                            </h3>
                          </div>
                          {currentSection.description && (
                            <div className="text-sm sm:text-base text-slate-800 font-medium leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-4">
                              <LatexPreview
                                content={currentSection.description}
                              />
                            </div>
                          )}
                        </div>
                        {renderQuestionCard(currentQ, activeQuestionIdx)}
                      </div>
                    );
                  }

                  return renderQuestionCard(currentQ, activeQuestionIdx);
                })()}

                {/* Navigation Controls in Paging mode */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveQuestionIdx((prev) => Math.max(0, prev - 1))
                    }
                    disabled={activeQuestionIdx === 0}
                    className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" /> Câu trước
                  </button>

                  <span className="text-xs font-bold text-slate-500">
                    Câu {activeQuestionIdx + 1} / {questions.length}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveQuestionIdx((prev) =>
                        Math.min(questions.length - 1, prev + 1),
                      )
                    }
                    disabled={activeQuestionIdx === questions.length - 1}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    Câu tiếp theo <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
                Chưa có câu hỏi nào.
              </div>
            )
          ) : (
            /* Scroll All Questions Mode */
            <div className="space-y-6 pb-12">
              {(() => {
                const groups: {
                  sectionId: string | null;
                  section: Section | null;
                  items: { question: Question; index: number }[];
                }[] = [];

                questions.forEach((q, idx) => {
                  const secId = q.sectionId || null;
                  const lastGroup = groups[groups.length - 1];
                  if (lastGroup && lastGroup.sectionId === secId) {
                    lastGroup.items.push({ question: q, index: idx });
                  } else {
                    const sec = secId
                      ? sections.find((s) => s.id === secId) || null
                      : null;
                    groups.push({
                      sectionId: secId,
                      section: sec,
                      items: [{ question: q, index: idx }],
                    });
                  }
                });

                return groups.map((group, gIdx) => {
                  if (group.section) {
                    const secIndex = sections.findIndex(
                      (s) => s.id === group.section?.id,
                    );
                    return (
                      <div
                        key={`take-sec-${group.section.id}-${gIdx}`}
                        className="bg-slate-50/50 border-2 border-slate-300 rounded-3xl p-4 sm:p-6 shadow-xs space-y-5"
                      >
                        {/* Section Header */}
                        <div className="space-y-3 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
                          <div className="flex items-center gap-2.5 flex-wrap border-b border-slate-100 pb-3">
                            <h3 className="font-extrabold text-base sm:text-lg text-slate-900">
                              {group.section.title}
                            </h3>
                          </div>
                          {group.section.description && (
                            <div className="text-sm sm:text-base text-slate-800 font-medium leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-4">
                              <LatexPreview
                                content={group.section.description}
                              />
                            </div>
                          )}
                        </div>

                        {/* Enclosed Child Questions */}
                        <div className="space-y-4">
                          {group.items.map(({ question: q, index: qIdx }) =>
                            renderQuestionCard(q, qIdx),
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={`take-outside-${gIdx}`} className="space-y-4">
                      {group.items.map(({ question: q, index: qIdx }) =>
                        renderQuestionCard(q, qIdx),
                      )}
                    </div>
                  );
                });
              })()}

              <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center space-y-3">
                <p className="text-xs font-bold text-slate-600">
                  Bạn đã xem qua tất cả {questions.length} câu hỏi.
                </p>
                <button
                  type="button"
                  onClick={() => setShowSubmitConfirm(true)}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-xs transition-colors"
                >
                  Hoàn tất & Nộp bài thi ngay
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Question Matrix Map (Collapsible) */}
        {showMap && (
          <>
            {/* Mobile Overlay */}
            <div
              className="lg:hidden fixed inset-0 bg-slate-900/50 z-40 backdrop-blur-sm"
              onClick={() => setShowMap(false)}
            />
            {/* Map Container */}
            <div className="fixed inset-y-0 right-0 z-50 lg:static lg:z-auto w-72 lg:w-80 bg-white border-l lg:border border-slate-200 lg:rounded-3xl p-5 shadow-2xl lg:shadow-2xs space-y-4 shrink-0 flex flex-col h-full lg:max-h-[calc(100vh-100px)] lg:sticky lg:top-20 animate-in slide-in-from-right lg:animate-none">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-slate-700">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  Sơ đồ câu hỏi ({answeredCount}/{questions.length})
                </div>
                {/* Close Button for Mobile */}
                <button
                  onClick={() => setShowMap(false)}
                  className="lg:hidden p-1 text-slate-400 hover:text-slate-600 rounded-lg bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                {(() => {
                  const orderedGroups: {
                    section: Section | null;
                    items: { q: Question; originalIndex: number }[];
                  }[] = [];

                  questions.forEach((q, idx) => {
                    const secId = q.sectionId;
                    const sec = secId
                      ? sections.find((s) => s.id === secId) || null
                      : null;
                    const lastGroup = orderedGroups[orderedGroups.length - 1];
                    if (
                      lastGroup &&
                      lastGroup.section?.id === (sec?.id || null)
                    ) {
                      lastGroup.items.push({ q, originalIndex: idx });
                    } else {
                      orderedGroups.push({
                        section: sec,
                        items: [{ q, originalIndex: idx }],
                      });
                    }
                  });

                  return orderedGroups.map((group, groupIdx) => {
                    const secQuestions = group.items;
                    const sec = group.section;

                    const secAnswered = secQuestions.filter((item) => {
                      const v = answers[item.q.id];
                      if (v === undefined || v === null || v === "")
                        return false;
                      if (Array.isArray(v) && v.length === 0) return false;
                      if (typeof v === "object" && Object.keys(v).length === 0)
                        return false;
                      return true;
                    }).length;

                    return (
                      <div
                        key={sec ? sec.id : `no-sec-map-${groupIdx}`}
                        className="space-y-2 bg-slate-50/80 rounded-2xl p-3 border border-slate-200/80"
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span className="truncate pr-2">
                            {sec ? sec.title : "Câu hỏi khác"}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-400 shrink-0">
                            {secAnswered}/{secQuestions.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                          {secQuestions.map(({ q, originalIndex: i }) => {
                            const ans = answers[q.id];
                            const isAnswered =
                              ans !== undefined &&
                              ans !== null &&
                              ans !== "" &&
                              (!Array.isArray(ans) || ans.length > 0) &&
                              (typeof ans !== "object" ||
                                Object.keys(ans).length > 0);
                            const isFlag = flagged[q.id];
                            const isActive = i === activeQuestionIdx;

                            let btnStyle =
                              "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs";
                            if (isActive) {
                              btnStyle =
                                "bg-blue-600 text-white font-bold ring-2 ring-blue-600/30";
                            } else if (isFlag) {
                              btnStyle =
                                "bg-amber-100 border-amber-300 text-amber-900 font-bold";
                            } else if (isAnswered) {
                              btnStyle =
                                "bg-emerald-50 border-emerald-300 text-emerald-800 font-bold";
                            }

                            return (
                              <button
                                key={q.id}
                                type="button"
                                onClick={() => {
                                  handleQuestionSelectInMap(i);
                                  if (window.innerWidth < 1024)
                                    setShowMap(false);
                                }}
                                className={`aspect-square rounded-xl text-xs flex items-center justify-center border transition-all cursor-pointer ${btnStyle}`}
                              >
                                {i + 1}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Legend */}
              <div className="border-t border-slate-100 pt-3 space-y-1.5 text-[11px] text-slate-500 font-medium pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded bg-emerald-50 border border-emerald-300 inline-block shrink-0" />
                  <span>Đã làm ({answeredCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-300 inline-block shrink-0" />
                  <span>
                    Đã đánh dấu ({Object.values(flagged).filter(Boolean).length}
                    )
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded bg-slate-50 border border-slate-200 inline-block shrink-0" />
                  <span>Chưa làm ({questions.length - answeredCount})</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowMap(false);
                  setShowSubmitConfirm(true);
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer mt-auto"
              >
                Hoàn tất & Nộp bài
              </button>
            </div>
          </>
        )}
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Xác nhận nộp bài thi?
            </h3>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Số câu đã hoàn thành:</span>
                <strong className="text-emerald-700 font-bold">
                  {answeredCount} / {questions.length}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Số câu chưa làm:</span>
                <strong className="text-red-600 font-bold">
                  {questions.length - answeredCount}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Thời gian còn lại:</span>
                <strong className="text-blue-600 font-bold">
                  {formatTime(timeLeft)}
                </strong>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Sau khi nộp bài, bạn sẽ không thể chỉnh sửa câu trả lời. Hệ thống
              sẽ tiến hành chấm điểm tự động.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Tiếp tục làm bài
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSubmitConfirm(false);
                  executeSubmit();
                }}
                disabled={submitting}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Xác nhận nộp bài
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Student Scratchpad Modal Drawing Board */}
      <ScratchpadModal
        isOpen={showScratchpad}
        onClose={() => setShowScratchpad(false)}
        questions={questions}
        activeQuestionIdx={activeQuestionIdx}
        onSelectQuestion={(idx) => setActiveQuestionIdx(idx)}
        answers={answers}
        onAnswerChange={(qId, val) =>
          setAnswers((prev) => ({ ...prev, [qId]: val }))
        }
        timeLeft={timeLeft}
        onSubmitExam={() => setShowSubmitConfirm(true)}
        onScratchpadUpdate={(dataUrl) => {
          if (isSessionActiveRef.current && sessionIdRef.current) {
            updateRealtimeSessionMetrics(sessionIdRef.current, {
              scratchpadImage: dataUrl,
            });
          }
        }}
      />

      {/* Floating Draggable Casio fx-580 Calculator */}
      <CasioCalculator
        isOpen={showCasio}
        onClose={() => setShowCasio(false)}
        onSendToScratchpad={(val) => {
          navigator.clipboard.writeText(val);
          showInfoToast(`Đã sao chép kết quả ${val} vào bộ nhớ để nháp!`);
        }}
      />
    </div>
  );
}
