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
  ArrowUp,
  ArrowDown,
  GripVertical,
  Monitor,
} from "lucide-react";
import ScratchpadModal from "../../features/student-exam/components/ScratchpadModal";
import CasioCalculator from "../../components/exam/CasioCalculator";
import ExamAudioPlayer from "../../components/exam/ExamAudioPlayer";
import { getExam } from "../../services/examService";
import { createSubmission } from "../../services/submissionService";
import { buildSubExamAttempt } from "../../features/sub-exam/engine/buildSubExamAttempt";
import { organizeAndShuffleExam } from "../../utils/examShuffler";
import { saveStudentProfile } from "../../services/studentService";
import { recordQuestionMastery } from "../../services/reviewMasteryService";
import {
  syncRealtimeSession,
  updateRealtimeSessionMetrics,
  removeRealtimeSession,
  markRealtimeSessionSubmitted,
  updateRealtimeAnswerDelta,
  subscribeToSingleSession,
  sanitizeSessionId,
} from "../../services/realtimeProctoringService";
import { collection, getDocs, query, orderBy, getDoc, doc, where } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import {
  saveActiveExamSession,
  updateActiveExamSessionAnswers,
  updateActiveExamSessionStatus,
  getActiveExamSession,
  clearActiveExamSession,
} from "../../services/examSessionService";
import {
  ExamSessionStatus,
  canTransition,
  calculateRemainingSeconds,
} from "../../services/examSessionStateMachine";
import { calculateExamScore } from "../../services/gradingService";
import { STORAGE_KEYS, getStoredItem, setStoredItem } from "../../utils/storage";
import type { Exam, Question, Section, QuestionTiming } from "../../types";
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
  const [answers, setAnswers] = useState<Record<string, any>>(() => {
    try {
      const eid = window.location.pathname.split("/")[3] || "";
      if (!eid) return {};
      const sInfo = localStorage.getItem("student_info") || localStorage.getItem("current_student_session");
      const u = sInfo ? (JSON.parse(sInfo).username || JSON.parse(sInfo).displayName || "student") : "student";
      const specific = localStorage.getItem(`dktest_temp_answers_${eid}_${u}`);
      if (specific) return JSON.parse(specific);
      const fallback = localStorage.getItem(`dktest_temp_answers_${eid}`);
      if (fallback) return JSON.parse(fallback);
      return {};
    } catch {
      return {};
    }
  });
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(true);
  const [sessionStatus, setSessionStatus] = useState<ExamSessionStatus>("idle");
  const [isPaused, setIsPaused] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isBlockedByOtherTab, setIsBlockedByOtherTab] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const [timeLeft, setTimeLeft] = useState(0);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [warnings, setWarnings] = useState(0);
  const [studentName, setStudentName] = useState("Thí sinh");
  const [studentUsername] = useState<string>(() => {
    try {
      const sInfo = localStorage.getItem("student_info") || localStorage.getItem("current_student_session");
      if (sInfo) {
        const parsed = JSON.parse(sInfo);
        return parsed.username || parsed.displayName || "student";
      }
    } catch {}
    return "student";
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Authoritative Pause duration tracking
  const totalPausedDurationMsRef = useRef<number>(0);
  const pauseStartedAtRef = useRef<number | null>(null);
  const lastViolationTimeRef = useRef<number>(0);

  // New UI controls: Show/Hide Map & Paging vs Scroll view
  const [showMap, setShowMap] = useState<boolean>(window.innerWidth >= 1024);
  const [displayMode, setDisplayMode] = useState<"paging" | "scroll">(
    window.innerWidth < 1024 ? "scroll" : "paging"
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
  const sessionIdRef = useRef<string>((() => {
    try {
      const sInfo = localStorage.getItem("student_info") || localStorage.getItem("current_student_session");
      const u = sInfo ? (JSON.parse(sInfo).username || JSON.parse(sInfo).displayName || "student") : "student";
      const cleanU = sanitizeSessionId(u);
      const eid = sanitizeSessionId(window.location.pathname.split("/")[3] || "exam");
      return `sess_${cleanU}_${eid}`;
    } catch (e) {
      return "sess_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    }
  })());
  const isSessionActiveRef = useRef<boolean>(true);
  const isSubmittingRef = useRef<boolean>(false);
  const isManualScrollingRef = useRef<boolean>(false);
  const hasAutoSubmittedRef = useRef<boolean>(false);
  const subExamConfigUsedRef = useRef<any>(null);
  const isSubExamUsedRef = useRef<boolean>(false);
  const lastSyncTimeRef = useRef<number>(0);
  const questionTimingRef = useRef<Record<string, QuestionTiming>>({});
  const currentActiveQuestionIdRef = useRef<string | null>(null);
  const prevAnswersRef = useRef<Record<string, any>>({});

  // Real Screen Share States & Refs
  const [showScreenSharePrompt, setShowScreenSharePrompt] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenIntervalRef = useRef<any>(null);
  const offscreenVideoRef = useRef<HTMLVideoElement | null>(null);

  const stopRealScreenShare = () => {
    if (screenIntervalRef.current) {
      clearInterval(screenIntervalRef.current);
      screenIntervalRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (offscreenVideoRef.current) {
      offscreenVideoRef.current.srcObject = null;
      offscreenVideoRef.current = null;
    }
    setIsScreenSharing(false);
    setShowScreenSharePrompt(false);

    if (sessionIdRef.current) {
      updateRealtimeSessionMetrics(sessionIdRef.current, {
        screenShareActive: false,
        screenShareRequest: "stopped",
        screenShareFrame: null,
      }).catch(() => {});
    }
  };

  const handleDeclineScreenShare = () => {
    setShowScreenSharePrompt(false);
    if (sessionIdRef.current) {
      updateRealtimeSessionMetrics(sessionIdRef.current, {
        screenShareRequest: "rejected",
        screenShareActive: false,
      }).catch(() => {});
    }
    showInfoToast("Bạn đã từ chối yêu cầu chia sẻ màn hình.");
  };

  const handleAcceptScreenShare = async () => {
    setShowScreenSharePrompt(false);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        showErrorToast("Trình duyệt của bạn không hỗ trợ tính năng chia sẻ màn hình.");
        handleDeclineScreenShare();
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor",
        } as any,
        audio: false,
      });

      screenStreamRef.current = stream;
      setIsScreenSharing(true);

      const video = document.createElement("video");
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      await video.play().catch(() => {});
      offscreenVideoRef.current = video;

      if (sessionIdRef.current) {
        await updateRealtimeSessionMetrics(sessionIdRef.current, {
          screenShareRequest: "accepted",
          screenShareActive: true,
        });
      }

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Capture frame every 1200ms
      screenIntervalRef.current = setInterval(() => {
        if (!video.videoWidth || !video.videoHeight || !ctx || !sessionIdRef.current) return;
        const maxWidth = 960;
        const scale = Math.min(1, maxWidth / video.videoWidth);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.45);

        updateRealtimeSessionMetrics(sessionIdRef.current, {
          screenShareFrame: dataUrl,
          screenShareActive: true,
        }).catch(() => {});
      }, 1200);

      stream.getVideoTracks()[0].onended = () => {
        stopRealScreenShare();
        showInfoToast("Đã dừng chia sẻ màn hình.");
      };

      showInfoToast("Đang chia sẻ màn hình trực tiếp với Giám thị.");
    } catch (err) {
      console.warn("Screen share permission cancelled or failed:", err);
      handleDeclineScreenShare();
    }
  };

  // Realtime Active Session Sync to Firestore and RTDB
  const syncCurrentSession = async (force: boolean = false) => {
    if (!examId || loading || !exam || !isSessionActiveRef.current || isSubmittingRef.current) return;

    const now = Date.now();
    // Throttle automatic timer updates to once every 5 seconds unless forced
    if (!force && now - lastSyncTimeRef.current < 5000) {
      return;
    }
    lastSyncTimeRef.current = now;

    const studentInfoStr = localStorage.getItem("student_info") || localStorage.getItem("current_student_session");
    let studentUsername = "student";
    let studentClass = "Học sinh";
    let currentDisplayName = studentName;
    if (studentInfoStr) {
      try {
        const parsed = JSON.parse(studentInfoStr);
        if (parsed.username) studentUsername = parsed.username;
        if (parsed.studentClass || parsed.class) studentClass = parsed.studentClass || parsed.class;
        if (parsed.displayName && (!currentDisplayName || currentDisplayName === "Thí sinh")) {
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
        startTime: startTimeRef.current || now,
        durationMinutes: exam.timeLimit || 45,
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

  // Multi-tab protection (Directive 24)
  useEffect(() => {
    if (!examId) return;
    const tabId = Math.random().toString(36).substring(2, 9);
    const channelName = `dktest_exam_tab_channel_${examId}`;
    let channel: BroadcastChannel | null = null;

    try {
      channel = new BroadcastChannel(channelName);
      channel.postMessage({ type: "CLAIM_TAB", tabId });

      channel.onmessage = (event) => {
        if (event.data?.type === "CLAIM_TAB" && event.data.tabId !== tabId) {
          // Another tab is claiming the exam
          setIsBlockedByOtherTab(true);
        } else if (event.data?.type === "EXISTING_TAB" && event.data.tabId !== tabId) {
          setIsBlockedByOtherTab(true);
        }
      };

      // Respond to queries from other tabs
      const handleStorage = (e: StorageEvent) => {
        if (e.key === `dktest_tab_active_${examId}` && e.newValue && e.newValue !== tabId) {
          setIsBlockedByOtherTab(true);
        }
      };
      window.addEventListener("storage", handleStorage);
      localStorage.setItem(`dktest_tab_active_${examId}`, tabId);

      return () => {
        channel?.close();
        window.removeEventListener("storage", handleStorage);
        if (localStorage.getItem(`dktest_tab_active_${examId}`) === tabId) {
          localStorage.removeItem(`dktest_tab_active_${examId}`);
        }
      };
    } catch {
      return () => {};
    }
  }, [examId]);

  // Clean unmount (Directive 19: Do NOT delete RTDB session on unmount)
  useEffect(() => {
    return () => {
      isSessionActiveRef.current = false;
      if (screenIntervalRef.current) clearInterval(screenIntervalRef.current);
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Instant position sync to RTDB whenever active question changes
  useEffect(() => {
    if (!sessionIdRef.current || !isSessionActiveRef.current || loading) return;
    updateRealtimeSessionMetrics(sessionIdRef.current, {
      activeQuestionIdx,
    }).catch(() => {});
  }, [activeQuestionIdx, loading]);

  // Sync whenever key state changes (immediate force sync on answers, warnings, active question)
  useEffect(() => {
    if (!loading && exam && isSessionActiveRef.current) {
      syncCurrentSession(true);
    }
  }, [answers, warnings, activeQuestionIdx, loading, examId, exam]);

  // Periodic heartbeat sync for timer
  useEffect(() => {
    if (!loading && exam && isSessionActiveRef.current && timeLeft > 0) {
      syncCurrentSession(false);
    }
  }, [timeLeft]);

  // Listen for admin actions (pause, resume, suspend, screen share) (Directives 12 & 13)
  useEffect(() => {
    if (!sessionIdRef.current || loading || !exam) return;
    
    const unsubscribe = subscribeToSingleSession(sessionIdRef.current, (liveSession) => {
      if (liveSession) {
        // Screen share signaling
        if (liveSession.screenShareRequest === "requested") {
          if (!isScreenSharing && !screenStreamRef.current) {
            setShowScreenSharePrompt(true);
          }
        } else if (liveSession.screenShareRequest === "stopped") {
          if (isScreenSharing || screenStreamRef.current) {
            stopRealScreenShare();
          }
        }

        if (liveSession.adminAction === "pause") {
          if (!isPaused) {
            setIsPaused(true);
            setSessionStatus("paused");
            pauseStartedAtRef.current = Date.now();
            setAdminMessage(liveSession.adminMessage || "Bài thi của bạn đang bị tạm dừng bởi Giám thị.");
          }
        } else if (liveSession.adminAction === "suspend" && !isSuspended) {
          setIsSuspended(true);
          setSessionStatus("suspended");
          setAdminMessage(liveSession.adminMessage || "Bạn đã bị đình chỉ thi.");
          // Force submit with suspended reason
          executeSubmit("suspended");
        } else {
          // Resume action if previously paused
          if (isPaused) {
            setIsPaused(false);
            setSessionStatus("taking");
            if (pauseStartedAtRef.current) {
              const pausedDelta = Date.now() - pauseStartedAtRef.current;
              totalPausedDurationMsRef.current += pausedDelta;
              pauseStartedAtRef.current = null;
            }
          }
        }
      }
    });

    return () => unsubscribe();
  }, [loading, exam, isPaused, isSuspended, isScreenSharing]);

  useEffect(() => {
    const loadExamAndPrepare = async () => {
      if (!examId) return;

      // 1. Enforce Student Login Authentication
      const authRole = localStorage.getItem("auth_role");
      const studentInfoStr = localStorage.getItem("student_info");
      if ((authRole !== "student" && authRole !== "admin") || !studentInfoStr) {
        showErrorToast("Vui lòng đăng nhập tài khoản học sinh để làm bài thi!");
        navigate(`/student/login?redirect=${encodeURIComponent(`/student/exam/${examId}`)}`, { replace: true });
        return;
      }

      setLoading(true);
      try {
        console.log(`[Firestore] Loading exam for taking: ${examId}`);
        console.log("[Firestore] READ: exams/" + examId); const examDoc = await getDoc(doc(db, "exams", examId));
        if (!examDoc.exists()) {
          showErrorToast("Không tìm thấy bài thi!");
          navigate("/", { replace: true });
          return;
        }
        
        console.log(`[Firestore] Exam loaded with 1 document read: ${examId}`);
        const data = examDoc.data();
        const { sections: docSections, questions: docQuestions, ...meta } = data;
        const examData = meta as Exam;

        // Ensure audioConfig is thoroughly resolved from root doc or examMeta
        const resolvedAudioConfig = data.audioConfig || (data as any)?.examMeta?.audioConfig || examData.audioConfig;
        if (resolvedAudioConfig && !examData.audioConfig) {
          examData.audioConfig = resolvedAudioConfig;
        }

        // Also check if any post-submission attachment has audio URL and use as fallback if needed
        const audioAtt = (examData.attachments || []).find((a: any) =>
          a.url?.match(/\.(mp3|wav|m4a|aac|ogg)($|\?)/i) || a.fileName?.match(/\.(mp3|wav|m4a|aac|ogg)$/i)
        );
        if (audioAtt && (!examData.audioConfig || !examData.audioConfig.url)) {
          examData.audioConfig = {
            enabled: true,
            url: audioAtt.url,
            fileName: audioAtt.fileName,
            title: audioAtt.label || audioAtt.fileName || "File nghe Audio",
            maxPlays: 0,
            allowSeek: true,
            allowPause: true,
          };
        }
        
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
        let rawQuestions: Question[] = Array.isArray(docQuestions) ? docQuestions : [];
        if (!Array.isArray(docQuestions)) {
          console.log("[Firestore] READ_MANY: exams/" + examId + "/questions (fallback)"); const qSnap = await getDocs(query(collection(db, `exams/${examId}/questions`)));
          rawQuestions = qSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Question));
        }
        rawQuestions.sort((a,b) => (a.order || 0) - (b.order || 0));

        // Fetch sections from document or fallback to subcollection if missing (legacy)
        let rawSections: Section[] = Array.isArray(docSections) ? docSections : [];
        if (!Array.isArray(docSections)) {
          console.log("[Firestore] READ_MANY: exams/" + examId + "/sections (fallback)"); const secSnap = await getDocs(query(collection(db, `exams/${examId}/sections`)));
          rawSections = secSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Section));
        }
        rawSections.sort((a,b) => (a.order || 0) - (b.order || 0));

        if (examData.shuffleSections && rawSections.length > 0) {
          const unpinned = shuffleArray(rawSections.filter((s) => !s.pinOrder));
          let unpinnedIdx = 0;
          rawSections = rawSections.map((sec) => (sec.pinOrder ? sec : unpinned[unpinnedIdx++]));
        }
        setSections(rawSections);

        // Student Info & Snapshot Storage Key
        const studentInfo = studentInfoStr ? JSON.parse(studentInfoStr) : null;
        const studentIdentifier = studentInfo?.username || studentInfo?.displayName || "student";
        sessionIdRef.current = `sess_${sanitizeSessionId(studentIdentifier)}_${sanitizeSessionId(examId)}`;
        const snapshotKey = `attemptSnapshot_${examId}_${studentIdentifier}`;

        // Check schedule: openTime and closeTime
        if (examData.openTime && new Date(examData.openTime).getTime() > Date.now()) {
          showErrorToast("Bài thi chưa đến thời gian mở đề!");
          navigate(`/student/exam/${examId}`, { replace: true });
          return;
        }

        if (examData.closeTime && new Date(examData.closeTime).getTime() <= Date.now()) {
          showErrorToast("Bài thi đã kết thúc thời gian làm bài (đã đóng đề)!");
          navigate(`/student/exam/${examId}`, { replace: true });
          return;
        }

        // Check max attempts
        const activeExistingSession = getActiveExamSession(examId);
        if (examData.maxAttempts && examData.maxAttempts > 0 && !activeExistingSession) {
          try {
            const subsRef = collection(db, "submissions");
            const qAttempts = query(
              subsRef,
              where("examId", "==", examId),
              where("studentUsername", "==", studentIdentifier)
            );
            const subsSnap = await getDocs(qAttempts);
            if (subsSnap.size >= examData.maxAttempts) {
              showErrorToast(`Bạn đã sử dụng hết số lần làm bài quy định (${subsSnap.size}/${examData.maxAttempts} lần)!`);
              navigate(`/student/exam/${examId}`, { replace: true });
              return;
            }
          } catch (attErr) {
            console.warn("Could not check attempts limit:", attErr);
          }
        }

        // Organize and shuffle questions
        let allQuestions: Question[] = [];

        // Check for active Attempt Snapshot
        let activeSnapshot = null;
        try {
          const snapshotStr = localStorage.getItem(snapshotKey);
          if (snapshotStr) activeSnapshot = JSON.parse(snapshotStr);
        } catch (e) {}

        if (activeSnapshot && activeSnapshot.shuffledQuestions && activeSnapshot.shuffledQuestions.length > 0) {
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
          localStorage.setItem(snapshotKey, JSON.stringify({
            ...activeSnapshot,
            shuffledQuestions: allQuestions,
          }));
        } else {
          // Check for student's custom sub-exam config
          let studentSubExamConfig = null;
          let useSubExam = examData.allowSubExam && examData.subExamConfig?.enabled;
          try {
            const storedConfigStr = localStorage.getItem(`custom_sub_exam_config_${examId}`);
            if (storedConfigStr) {
              const storedConfig = JSON.parse(storedConfigStr);
              if (storedConfig.useSubExam !== undefined) {
                useSubExam = storedConfig.useSubExam;
                if (useSubExam && storedConfig.config) {
                   studentSubExamConfig = storedConfig.config;
                }
              }
            }
          } catch(e) {}

          // Normal load or build sub-exam
          if (useSubExam && (studentSubExamConfig || examData.subExamConfig)) {
            const finalConfig = studentSubExamConfig || examData.subExamConfig;
            const attempt = buildSubExamAttempt(examData, rawQuestions, rawSections, finalConfig);
            allQuestions = attempt.questions;
            isSubExamUsedRef.current = true;
            subExamConfigUsedRef.current = attempt.config || null;
          } else {
            isSubExamUsedRef.current = false;
            subExamConfigUsedRef.current = null;
            const organized = organizeAndShuffleExam(examData, rawQuestions, rawSections);
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
            selectedQuestionIds: allQuestions.map(q => q.id),
            questionOrder: allQuestions.map(q => q.id),
            shuffledQuestions: allQuestions,
            configSnapshot: subExamConfigUsedRef.current,
            createdAt: Date.now()
          };
          localStorage.setItem(snapshotKey, JSON.stringify(newSnapshot));
        }

        setQuestions(allQuestions);
        
        // Active Exam Session & Timer Logic
        const activeSession = getActiveExamSession(examId);
        let startTime = Date.now();
        const durationMinutes = examData.timeLimit || 45;
        let initialRemainingSec = 0;

        // Restore local temporary answers (resilient against accidental page refresh)
        let localAnswers: Record<string, any> = {};
        try {
          const userSpecificKey = `dktest_temp_answers_${examId}_${studentIdentifier}`;
          const fallbackKey = `dktest_temp_answers_${examId}`;
          const savedStr = localStorage.getItem(userSpecificKey) || localStorage.getItem(fallbackKey);
          if (savedStr) {
            localAnswers = JSON.parse(savedStr);
          }
        } catch (e) {}

        const finalRestoredAnswers = (localAnswers && Object.keys(localAnswers).length > 0)
          ? localAnswers
          : (activeSession?.answers && Object.keys(activeSession.answers).length > 0)
            ? activeSession.answers
            : (activeSnapshot?.answers && Object.keys(activeSnapshot.answers).length > 0)
              ? activeSnapshot.answers
              : {};

        if (Object.keys(finalRestoredAnswers).length > 0) {
          setAnswers(finalRestoredAnswers);
        }

        if (activeSession && (activeSession.status === "in-progress" || (activeSession as any).status === "taking" || (activeSession as any).status === "paused")) {
          // Restore in-progress session info
          if (activeSession.flagged) {
            setFlagged(activeSession.flagged);
          }
          if (typeof activeSession.activeQuestionIdx === "number") {
            setActiveQuestionIdx(activeSession.activeQuestionIdx);
          }
          if (typeof activeSession.warnings === "number") {
            setWarnings(activeSession.warnings);
          }
          if (activeSession.questionTiming && typeof activeSession.questionTiming === "object") {
            questionTimingRef.current = { ...activeSession.questionTiming };
          }
          if (typeof (activeSession as any).totalPausedDurationMs === "number") {
            totalPausedDurationMsRef.current = (activeSession as any).totalPausedDurationMs;
          }
          if ((activeSession as any).isPaused) {
            setIsPaused(true);
            setSessionStatus("paused");
          } else {
            setSessionStatus("taking");
          }

          startTime = activeSession.startTime;
          startTimeRef.current = startTime;
          let remainingSec = calculateRemainingSeconds({
            startTime,
            durationMinutes,
            totalPausedDurationMs: totalPausedDurationMsRef.current,
            isPaused: !!(activeSession as any).isPaused,
            pauseStartedAt: (activeSession as any).pauseStartedAt,
          });

          // Cap remaining time if exam closeTime is scheduled
          if (examData.closeTime) {
            const msUntilClose = new Date(examData.closeTime).getTime() - Date.now();
            const secUntilClose = Math.max(0, Math.floor(msUntilClose / 1000));
            if (remainingSec > secUntilClose) {
              remainingSec = secUntilClose;
            }
          }

          if (remainingSec <= 0) {
            setTimeLeft(0);
            initialRemainingSec = 0;
          } else {
            setTimeLeft(remainingSec);
            initialRemainingSec = remainingSec;
            showInfoToast("Đã khôi phục bài làm và thời gian làm bài của bạn!");
          }
        } else {
          // New Attempt Session or restore answers from snapshot
          const storageKey = `exam_startTime_${examId}_${studentIdentifier}`;
          const storedStart = localStorage.getItem(storageKey);
          if (storedStart) {
            startTime = parseInt(storedStart, 10);
          } else {
            localStorage.setItem(storageKey, startTime.toString());
          }
          startTimeRef.current = startTime;
          setSessionStatus("taking");

          let remainingSec = calculateRemainingSeconds({
            startTime,
            durationMinutes,
            totalPausedDurationMs: 0,
            isPaused: false,
          });

          // Cap remaining time if exam closeTime is scheduled
          if (examData.closeTime) {
            const msUntilClose = new Date(examData.closeTime).getTime() - Date.now();
            const secUntilClose = Math.max(0, Math.floor(msUntilClose / 1000));
            if (remainingSec > secUntilClose) {
              remainingSec = secUntilClose;
            }
          }

          if (remainingSec <= 0) {
            setTimeLeft(0);
            initialRemainingSec = 0;
          } else {
            setTimeLeft(remainingSec);
            initialRemainingSec = remainingSec;
          }

          saveActiveExamSession({
            examId,
            examTitle: examData.title,
            examCode: examData.code,
            studentUsername: studentIdentifier,
            studentName: studentName || "Thí sinh",
            startTime,
            durationMinutes,
            answers: finalRestoredAnswers,
            flagged: {},
            activeQuestionIdx: 0,
            warnings: 0,
          });
        }

        // Immediate authoritative sync to RTDB so examinee appears instantly on Live Proctoring
        try {
          const freshSessId = sessionIdRef.current || `sess_${studentIdentifier}_${examId}`;
          await syncRealtimeSession({
            sessionId: freshSessId,
            attemptId: freshSessId,
            examId: examId || "",
            examTitle: examData.title || "Bài thi",
            studentName: studentName || studentIdentifier || "Thí sinh",
            studentUsername: studentIdentifier,
            studentId: studentIdentifier,
            studentClass: studentInfo?.studentClass || studentInfo?.class || "Học sinh",
            startTime: startTimeRef.current || startTime,
            durationMinutes: examData.timeLimit || 45,
            timeLeft: initialRemainingSec > 0 ? initialRemainingSec : 0,
            answeredCount: Object.keys(finalRestoredAnswers).length,
            totalQuestions: allQuestions.length,
            warnings: 0,
            status: "taking",
            lastActiveAt: Date.now(),
            answers: finalRestoredAnswers,
            activeQuestionIdx: 0,
            shuffledQuestions: allQuestions,
            questionOrder: allQuestions.map((q) => q.id),
          });
        } catch (sErr) {
          console.warn("Initial syncRealtimeSession warning:", sErr);
        }

      } catch (err) {
        console.error("Lỗi khi chuẩn bị phòng thi:", err);
      } finally {
        setLoading(false);
        setTimeout(() => {
          syncCurrentSession(true);
        }, 100);
      }
    };

    loadExamAndPrepare();
  }, [examId, navigate]);

  // Authoritative timer countdown & auto-submit when remaining time expires (Directive 9 & 10)
  useEffect(() => {
    if (loading || !exam || isPaused || sessionStatus !== "taking" || submitting) return;
    
    // If timer is already at 0, trigger auto submit immediately
    if (timeLeft <= 0) {
      if (!hasAutoSubmittedRef.current && !isSubmittingRef.current && !submitting) {
        hasAutoSubmittedRef.current = true;
        handleAutoSubmit("timeout");
      }
      return;
    }
    
    const timer = setInterval(() => {
      let remainingSec = calculateRemainingSeconds({
        startTime: startTimeRef.current,
        durationMinutes: exam.timeLimit || 45,
        totalPausedDurationMs: totalPausedDurationMsRef.current,
        isPaused: false,
      });

      // Cap with closeTime if configured
      if (exam.closeTime) {
        const msUntilClose = new Date(exam.closeTime).getTime() - Date.now();
        const secUntilClose = Math.max(0, Math.floor(msUntilClose / 1000));
        if (remainingSec > secUntilClose) {
          remainingSec = secUntilClose;
        }
      }
      
      if (remainingSec <= 0) {
        clearInterval(timer);
        setTimeLeft(0);
        if (!hasAutoSubmittedRef.current && !isSubmittingRef.current && !submitting) {
          hasAutoSubmittedRef.current = true;
          handleAutoSubmit("timeout");
        }
      } else {
        setTimeLeft(remainingSec);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, timeLeft, exam, isPaused, sessionStatus, submitting]);

  // Guaranteed safeguard auto-submit when timeLeft is 0
  useEffect(() => {
    if (!loading && exam && timeLeft <= 0 && !hasAutoSubmittedRef.current && !isSubmittingRef.current && !submitting) {
      hasAutoSubmittedRef.current = true;
      handleAutoSubmit();
    }
  }, [loading, exam, timeLeft, submitting]);

  // Continuously sync in-progress answers & state to localStorage (guaranteeing zero loss on refresh)
  useEffect(() => {
    if (!loading && exam && examId && !submitting && isSessionActiveRef.current) {
      updateActiveExamSessionAnswers(examId, answers, {
        flagged,
        activeQuestionIdx,
        warnings,
        questionTiming: questionTimingRef.current,
      });

      // Also persist answers into attemptSnapshot
      try {
        const studentInfoStr = localStorage.getItem("student_info");
        const studentInfo = studentInfoStr ? JSON.parse(studentInfoStr) : null;
        const studentIdentifier = studentInfo?.username || studentInfo?.displayName || "student";
        const snapshotKey = `attemptSnapshot_${examId}_${studentIdentifier}`;
        const snapStr = localStorage.getItem(snapshotKey);
        if (snapStr) {
          const parsedSnap = JSON.parse(snapStr);
          parsedSnap.answers = answers;
          parsedSnap.flagged = flagged;
          parsedSnap.activeQuestionIdx = activeQuestionIdx;
          localStorage.setItem(snapshotKey, JSON.stringify(parsedSnap));
        }
      } catch (e) {}
    }
  }, [answers, flagged, activeQuestionIdx, warnings, loading, exam, examId, submitting]);

  // 1. Track active question visit & switch
  useEffect(() => {
    if (loading || questions.length === 0) return;
    const currentQ = questions[activeQuestionIdx];
    if (!currentQ) return;
    const qId = currentQ.id;

    if (!questionTimingRef.current[qId]) {
      questionTimingRef.current[qId] = {
        questionId: qId,
        questionIndex: activeQuestionIdx,
        timeSpentSeconds: 0,
        visits: 1,
        answerChanges: 0,
        firstOpenedAt: Date.now(),
        lastInteractionAt: Date.now(),
      };
    } else {
      if (currentActiveQuestionIdRef.current && currentActiveQuestionIdRef.current !== qId) {
        questionTimingRef.current[qId].visits = (questionTimingRef.current[qId].visits || 0) + 1;
        questionTimingRef.current[qId].lastInteractionAt = Date.now();
      }
    }
    currentActiveQuestionIdRef.current = qId;
  }, [activeQuestionIdx, questions, loading]);

  // 2. High-precision cumulative time ticker for current active question
  useEffect(() => {
    if (loading || submitting || isPaused || isSuspended || questions.length === 0) return;
    const currentQ = questions[activeQuestionIdx];
    if (!currentQ) return;
    const qId = currentQ.id;

    const interval = setInterval(() => {
      if (!questionTimingRef.current[qId]) {
        questionTimingRef.current[qId] = {
          questionId: qId,
          questionIndex: activeQuestionIdx,
          timeSpentSeconds: 0,
          visits: 1,
          answerChanges: 0,
          firstOpenedAt: Date.now(),
          lastInteractionAt: Date.now(),
        };
      }
      questionTimingRef.current[qId].timeSpentSeconds = (questionTimingRef.current[qId].timeSpentSeconds || 0) + 1;
    }, 1000);

    return () => clearInterval(interval);
  }, [activeQuestionIdx, questions, loading, submitting, isPaused, isSuspended]);

  // 3. Track answer modifications
  useEffect(() => {
    if (loading || questions.length === 0) return;
    const prev = prevAnswersRef.current;
    
    // Only detect changes if we already had a baseline
    if (Object.keys(prev).length > 0 || Object.keys(answers).length > 0) {
      for (const qId of Object.keys(answers)) {
        if (JSON.stringify(answers[qId]) !== JSON.stringify(prev[qId])) {
          const now = Date.now();
          if (!questionTimingRef.current[qId]) {
            const qIdx = questions.findIndex((q) => q.id === qId);
            questionTimingRef.current[qId] = {
              questionId: qId,
              questionIndex: qIdx >= 0 ? qIdx : 0,
              timeSpentSeconds: 0,
              visits: 1,
              answerChanges: 1,
              firstOpenedAt: now,
              lastInteractionAt: now,
            };
          } else {
            questionTimingRef.current[qId].answerChanges = (questionTimingRef.current[qId].answerChanges || 0) + 1;
            questionTimingRef.current[qId].lastInteractionAt = now;
          }
        }
      }
    }
    prevAnswersRef.current = { ...answers };
  }, [answers, loading, questions.length]);

  // Anti-cheat detection: visibilitychange & window blur (Directives 49 & 50)
  useEffect(() => {
    if (!exam || !exam.antiCheatEnabled || submitting || sessionStatus !== "taking") return;

    const recordViolation = () => {
      const now = Date.now();
      // 1000ms cooldown to avoid double counting blur and visibilitychange
      if (now - lastViolationTimeRef.current < 1000) return;
      lastViolationTimeRef.current = now;

      setWarnings((prev) => {
        const next = prev + 1;
        const maxLimit = exam.maxWarnings || 3;

        if (exam.autoSubmitOnViolation && next >= maxLimit) {
          showErrorToast(`Đã vượt quá số lần cảnh báo cho phép (${maxLimit}). Hệ thống đang tự động nộp bài.`);
          handleAutoSubmit("suspended");
        } else {
          showErrorToast(`Cảnh báo vi phạm (${next}/${maxLimit}): Vui lòng không chuyển tab hoặc thoát khỏi giao diện thi!`);
        }

        return next;
      });
    };

    const handleVisibility = () => {
      if (document.hidden) {
        recordViolation();
      }
    };

    const handleBlur = () => {
      recordViolation();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
    };
  }, [exam, submitting, sessionStatus]);

  // ScrollSpy for Active Question Tracking in Scroll Mode
  useEffect(() => {
    if (displayMode === "paging" || questions.length === 0 || loading || submitting) return;

    const handleScroll = () => {
      if (isManualScrollingRef.current) return;
      let minDistance = Infinity;
      let closestIdx = -1;
      questions.forEach((_, idx) => {
        const el = document.getElementById(`q-card-${idx}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          const dist = Math.abs(rect.top - 120);
          if (rect.bottom > 120 && dist < minDistance) {
            minDistance = dist;
            closestIdx = idx;
          }
        }
      });
      if (closestIdx !== -1) {
        setActiveQuestionIdx((prev) => (prev !== closestIdx ? closestIdx : prev));
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    const observer = new IntersectionObserver(
      (entries) => {
        if (isManualScrollingRef.current) return;
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
        rootMargin: "-10% 0px -30% 0px",
        threshold: [0.1, 0.5, 0.9],
      }
    );

    questions.forEach((_, idx) => {
      const el = document.getElementById(`q-card-${idx}`);
      if (el) observer.observe(el);
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, [displayMode, questions.length, loading, submitting]);

  // Centralized Point Calculation (Directives 28 & 7)
  const calculateScore = () => {
    return calculateExamScore(questions, answers);
  };

  const handleAutoSubmit = async (reason: "timeout" | "suspended" = "timeout") => {
    if (reason === "timeout") {
      showInfoToast("Thời gian làm bài đã kết thúc! Hệ thống đang tự động nộp bài thi của bạn.");
    }
    await executeSubmit(reason);
  };

  const executeSubmit = async (reason: "manual" | "timeout" | "admin_force" | "suspended" = "manual") => {
    if (!exam || !examId) return;

    // Transition immediately to submitting (P0 submission lock, Directives 5 & 10)
    setSessionStatus("submitting");
    setSubmitting(true);
    setSubmissionError(null);
    isSubmittingRef.current = true;
    isSessionActiveRef.current = false;

    // Freeze timer at current value
    const finalCapturedTimeLeft = timeLeft;

    try {
      const { score, correctCount, maxScore, totalCount, correctQuestionIds } = calculateScore();
      const timeSpent = Math.max(1, Math.floor((Date.now() - startTimeRef.current - totalPausedDurationMsRef.current) / 1000));

      const studentInfoStr = localStorage.getItem("student_info") || localStorage.getItem("current_student_session");
      let studentUsername = "student";
      let studentClassSnapshot = "Học sinh";
      if (studentInfoStr) {
        try {
          const parsed = JSON.parse(studentInfoStr);
          if (parsed.username) studentUsername = parsed.username;
          if (parsed.studentClass || parsed.class) studentClassSnapshot = parsed.studentClass || parsed.class;
        } catch (e) {}
      }

      // Stable attempt & submission ID (Directive 6)
      const attemptId = sessionIdRef.current || `sess_${studentUsername}_${examId}`;
      const submissionId = `sub_${attemptId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

      // Ensure every question has an entry in questionTiming
      questions.forEach((q, idx) => {
        if (!questionTimingRef.current[q.id]) {
          questionTimingRef.current[q.id] = {
            questionId: q.id,
            questionIndex: idx,
            timeSpentSeconds: 0,
            visits: 0,
            answerChanges: 0,
          };
        }
      });

      const sub = await createSubmission(
        {
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
          questionTiming: questionTimingRef.current,
          shuffledQuestionsSnapshot: questions,
          subExam: isSubExamUsedRef.current,
          subExamConfigSnapshot: subExamConfigUsedRef.current || (exam.allowSubExam && exam.subExamConfig ? exam.subExamConfig : null),
          isRetake: !!exam.isRetake,
          isAggregatedReview: !!exam.isAggregatedReview,
          originalExamId: exam.originalExamId || null,
          attemptId,
          submissionReason: reason,
        },
        submissionId
      );

      // Record mastery if retake
      if ((exam.isRetake || exam.isAggregatedReview) && correctQuestionIds && correctQuestionIds.length > 0) {
        try {
          const masteryItems: { questionId: string; originalExamId: string }[] = [];
          correctQuestionIds.forEach((qId) => {
            const qObj = questions.find((it) => it.id === qId);
            const targetExamId = (qObj as any)?.originalExamId || (qObj as any)?.examId || exam.originalExamId;
            const targetQuestionId = (qObj as any)?.originalQuestionId || qId;
            if (targetExamId && targetExamId !== examId) {
              masteryItems.push({ questionId: targetQuestionId, originalExamId: targetExamId });
            } else if (exam.originalExamId) {
              masteryItems.push({ questionId: targetQuestionId, originalExamId: exam.originalExamId });
            }
          });
          if (masteryItems.length > 0) {
            await recordQuestionMastery(studentUsername, masteryItems);
          }
        } catch (mErr) {
          console.warn("Could not record question review mastery:", mErr);
        }
      }

      // Save student profile
      try {
        await saveStudentProfile({ name: studentName, username: studentUsername, studentClass: studentClassSnapshot });
      } catch (profileErr) {
        console.warn("Could not save student profile:", profileErr);
      }

      // Khi thí sinh đã nộp bài, lập tức giải phóng và xóa phiên thi khỏi Live RTDB & Firestore
      try {
        const liveSessId = sessionIdRef.current || attemptId || `sess_${studentUsername}_${examId}`;
        await removeRealtimeSession(liveSessId);
        if (attemptId && attemptId !== liveSessId) {
          await removeRealtimeSession(attemptId);
        }
      } catch (sessErr) {
        console.warn("Could not remove session from RTDB on submit:", sessErr);
      }

      clearActiveExamSession(examId);
      try {
        localStorage.removeItem(`dktest_temp_answers_${examId}_${studentUsername}`);
        localStorage.removeItem(`dktest_temp_answers_${examId}`);
      } catch (e) {}
      setSessionStatus("submitted");

      // Save submission ID to local submission history
      try {
        const historyStr = localStorage.getItem("student_submission_history");
        const historyArr: string[] = historyStr ? JSON.parse(historyStr) : [];
        if (!historyArr.includes(sub.id)) {
          historyArr.unshift(sub.id);
          localStorage.setItem("student_submission_history", JSON.stringify(historyArr.slice(0, 100)));
        }
      } catch (histErr) {
        console.warn("Could not save local submission history", histErr);
      }

      navigate(`/student/exam/${examId}/result/${sub.id}`, { replace: true });
    } catch (err: any) {
      console.error("Lỗi khi nộp bài:", err);
      const errMsg = err?.message || "Không thể hoàn tất nộp bài. Bài làm của bạn vẫn được bảo toàn.";
      setSubmissionError(errMsg);
      showErrorToast(errMsg);
      // Directive 8: Remain locked on failure, timer frozen, do not reopen automatically
      setSubmitting(false);
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
        el.classList.add("ring-4", "ring-blue-400", "ring-offset-2", "transition-all", "duration-300");
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
          <p className="text-sm font-semibold text-slate-700">Đang tải và chuẩn bị đề thi...</p>
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

  // Dedicated Instant Local Storage Sync on Every Answer Change (User Directive)
  const updateAnswer = (qId: string, valOrUpdater: any) => {
    setAnswers((prev) => {
      const nextVal = typeof valOrUpdater === "function" ? valOrUpdater(prev[qId]) : valOrUpdater;
      const next = { ...prev, [qId]: nextVal };
      try {
        if (examId) {
          const sInfo = localStorage.getItem("student_info") || localStorage.getItem("current_student_session");
          const u = sInfo ? (JSON.parse(sInfo).username || JSON.parse(sInfo).displayName || "student") : "student";
          localStorage.setItem(`dktest_temp_answers_${examId}_${u}`, JSON.stringify(next));
          localStorage.setItem(`dktest_temp_answers_${examId}`, JSON.stringify(next));
        }
      } catch (e) {}
      return next;
    });
  };

  // Single Question Card Component Render
  const renderQuestionCard = (q: Question, qIdx: number) => {
    const qSection = q.sectionId ? sections.find((s) => s.id === q.sectionId) : null;

    return (
      <div
        id={`q-card-${qIdx}`}
        key={`${q.id || "q"}_${qIdx}`}
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
              {q.type === "ordering" && "Sắp xếp thứ tự"}
              {q.type === "fill_blank" && "Điền vào chỗ trống"}
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
              <Flag className={`w-3.5 h-3.5 ${flagged[q.id] ? "fill-amber-600 text-amber-600" : ""}`} />
              {flagged[q.id] ? "Đã đánh dấu" : "Đánh dấu xem lại"}
            </button>
          </div>
        </div>

        {/* Question Prompt */}
        <div className="text-slate-900 text-base lg:text-lg font-medium leading-relaxed">
          <LatexPreview content={q.text} />
        </div>

        {/* Embedded Question Audio (Listening MP3) */}
        {Boolean(q.audioConfig?.url || q.audioUrl) && (
          <div className="pt-2">
            <ExamAudioPlayer
              config={{
                enabled: true,
                url: q.audioConfig?.url || q.audioUrl || "",
                title: q.audioConfig?.title || `Audio Câu ${qIdx + 1}`,
                maxPlays: q.audioConfig?.maxPlays ?? 0,
                allowSeek: q.audioConfig?.allowSeek ?? true,
                allowPause: q.audioConfig?.allowPause ?? true,
                autoPlay: q.audioConfig?.autoPlay ?? false,
                ...q.audioConfig,
              }}
              examId={`${examId || "exam"}_q_${q.id}`}
              studentUsername={studentUsername}
            />
          </div>
        )}

        {/* Answer Options (Locked when submitting, paused, suspended or blocked - Directive 5) */}
        <div className={`pt-2 ${submitting || isPaused || isSuspended || sessionStatus !== "taking" ? "pointer-events-none opacity-60" : ""}`}>
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
                    onClick={() => updateAnswer(q.id, opt.id)}
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
                      updateAnswer(q.id, (prevVal: string[] = []) => {
                        const existing = Array.isArray(prevVal) ? prevVal : [];
                        return existing.includes(opt.id)
                          ? existing.filter((id) => id !== opt.id)
                          : [...existing, opt.id];
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
                          updateAnswer(q.id, (prevMap: any = {}) => ({
                            ...(prevMap || {}),
                            [stmt.id]: true,
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
                          updateAnswer(q.id, (prevMap: any = {}) => ({
                            ...(prevMap || {}),
                            [stmt.id]: false,
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
                onChange={(e) => updateAnswer(q.id, e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* 5. Ordering (Sắp xếp thứ tự) */}
          {q.type === "ordering" && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Dùng mũi tên lên/xuống để sắp xếp các mục theo đúng thứ tự logic:
              </label>
              {(() => {
                const items = q.orderingItems || [];
                const currentOrder: string[] = Array.isArray(answers[q.id]) && answers[q.id].length === items.length
                  ? answers[q.id]
                  : items.map((it) => it.id);

                const handleMove = (index: number, direction: "up" | "down") => {
                  const targetIndex = direction === "up" ? index - 1 : index + 1;
                  if (targetIndex < 0 || targetIndex >= currentOrder.length) return;
                  const newOrder = [...currentOrder];
                  const temp = newOrder[index];
                  newOrder[index] = newOrder[targetIndex];
                  newOrder[targetIndex] = temp;
                  updateAnswer(q.id, newOrder);
                };

                return (
                  <div className="space-y-2">
                    {currentOrder.map((itemId, idx) => {
                      const item = items.find((it) => it.id === itemId);
                      return (
                        <div
                          key={itemId}
                          className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 hover:border-blue-300 transition-all"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="w-7 h-7 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="text-sm font-medium text-slate-800 flex-1">
                              <LatexPreview content={item?.text || ""} />
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMove(idx, "up")}
                              disabled={idx === 0}
                              className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 disabled:opacity-30 cursor-pointer"
                              title="Di chuyển lên"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMove(idx, "down")}
                              disabled={idx === currentOrder.length - 1}
                              className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 disabled:opacity-30 cursor-pointer"
                              title="Di chuyển xuống"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* 6. Fill in Blank (Điền lỗ) */}
          {q.type === "fill_blank" && (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Điền từ/số thích hợp vào các ô trống bên dưới:
              </label>
              {(() => {
                const totalBlanks = Math.max(
                  Object.keys(q.acceptedAnswersPerBlank || {}).length,
                  (q.text?.match(/\[_\]|\[blank\]/gi) || []).length
                );
                const currentAnsMap = typeof answers[q.id] === "object" && answers[q.id] ? answers[q.id] : {};

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Array.from({ length: totalBlanks || 1 }).map((_, bIdx) => (
                      <div
                        key={bIdx}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5"
                      >
                        <div className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-extrabold flex items-center justify-center">
                            #{bIdx + 1}
                          </span>
                          <span>Vị trí ô trống [{bIdx + 1}]</span>
                        </div>
                        <input
                          type="text"
                          placeholder={`Nhập từ điền vào ô [${bIdx + 1}]...`}
                          value={currentAnsMap[bIdx] || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateAnswer(q.id, (prevMap: any = {}) => ({
                              ...(typeof prevMap === "object" && prevMap ? prevMap : {}),
                              [bIdx]: val,
                            }));
                          }}
                          className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-none pt-16">
      {/* Multi-Tab Protection Overlay (Directive 24) */}
      {isBlockedByOtherTab && (
        <div className="fixed inset-0 z-[120] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center border-t-4 border-rose-600 space-y-4">
            <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto text-rose-600">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Phát hiện mở nhiều tab</h2>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Bài thi này đang được mở ở một tab khác trên trình duyệt. Vui lòng đóng tab này và quay lại tab đang làm bài để tránh mất dữ liệu.
            </p>
          </div>
        </div>
      )}

      {/* Submission Failure Retry Overlay (Directive 8) */}
      {submissionError && (
        <div className="fixed inset-0 z-[110] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center border-t-4 border-red-500 space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto text-red-600">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Không thể hoàn tất nộp bài</h2>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {submissionError}
            </p>
            <p className="text-xs text-emerald-700 font-bold bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
              Bài làm của bạn vẫn được bảo toàn. Hãy kiểm tra kết nối mạng và bấm thử lại.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => executeSubmit("manual")}
                disabled={submitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Thử lại nộp bài
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submitting Blocking Indicator (Directive 5 & 10) */}
      {submitting && !submissionError && (
        <div className="fixed inset-0 z-[105] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-3 shadow-2xl">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
            <h3 className="text-base font-bold text-slate-900">Đang nộp bài...</h3>
            <p className="text-xs text-slate-500">Hệ thống đang niêm phong bài làm và chấm điểm tự động.</p>
          </div>
        </div>
      )}

      {/* Admin Action Overlays (Directives 12 & 13) */}
      {isPaused && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center border-t-4 border-amber-500 space-y-4">
            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto text-amber-600">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">BÀI THI ĐANG TẠM DỪNG</h2>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 text-left space-y-1">
              <div className="font-bold text-slate-500">Lý do:</div>
              <div>{adminMessage}</div>
            </div>
            <p className="text-xs text-amber-700 font-semibold">
              Thời gian đang được bảo lưu. Vui lòng chờ giám thị tiếp tục bài thi.
            </p>
            <div className="animate-pulse flex gap-2 justify-center text-sm font-medium text-amber-600 pt-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full" />
              <div className="w-2 h-2 bg-amber-500 rounded-full" />
              <div className="w-2 h-2 bg-amber-500 rounded-full" />
            </div>
          </div>
        </div>
      )}

      {isSuspended && (
        <div className="fixed inset-0 z-[100] bg-red-900/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center border-t-4 border-red-600 space-y-3">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto text-red-600">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Đình chỉ thi</h2>
            <p className="text-slate-600 font-medium text-xs">{adminMessage}</p>
            <p className="text-red-600 text-xs font-bold uppercase tracking-wide bg-red-50 p-2 rounded-xl border border-red-200">
              Hệ thống đã tự động niêm phong & nộp bài
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
              Thí sinh: <strong className="text-slate-800">{studentName}</strong>
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
            <span className="font-extrabold text-[10px] tracking-tighter px-1 py-0.5 bg-amber-800 text-white rounded">casio</span>
          </button>

          {/* Toggle Map Sidebar */}
          <button
            type="button"
            onClick={() => setShowMap(!showMap)}
            className="p-2 text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
            title={showMap ? "Ẩn sơ đồ câu hỏi" : "Hiện sơ đồ câu hỏi"}
          >
            {showMap ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="hidden md:inline">{showMap ? "Ẩn sơ đồ" : "Hiện sơ đồ"}</span>
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
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-4 gap-4 items-start">
        {/* Left Side: Questions Container */}
        <div className="flex-1 w-full space-y-4">
          {/* Exam Audio Player (Listening Test) */}
          {(exam?.audioConfig?.url || (exam as any)?.audioUrl) && (
            <div className="w-full">
              <ExamAudioPlayer
                config={{
                  enabled: true,
                  url: exam.audioConfig?.url || (exam as any).audioUrl || "",
                  title: exam.audioConfig?.title || "Bài nghe Audio của đề thi",
                  maxPlays: exam.audioConfig?.maxPlays ?? 0,
                  allowSeek: exam.audioConfig?.allowSeek ?? true,
                  allowPause: exam.audioConfig?.allowPause ?? true,
                  autoPlay: exam.audioConfig?.autoPlay ?? false,
                  ...exam.audioConfig,
                }}
                examId={exam.id || examId || "exam"}
                studentUsername={studentUsername}
              />
            </div>
          )}

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
                              <LatexPreview content={currentSection.description} />
                            </div>
                          )}

                          {/* Section Audio Player (Paging View) */}
                          {(currentSection.audioConfig?.url || (currentSection as any).audioUrl) && (
                            <div className="pt-1">
                              <ExamAudioPlayer
                                config={{
                                  enabled: true,
                                  url: currentSection.audioConfig?.url || (currentSection as any).audioUrl || "",
                                  title: currentSection.audioConfig?.title || `Bài nghe: ${currentSection.title}`,
                                  maxPlays: currentSection.audioConfig?.maxPlays ?? 0,
                                  allowSeek: currentSection.audioConfig?.allowSeek ?? true,
                                  allowPause: currentSection.audioConfig?.allowPause ?? true,
                                  autoPlay: currentSection.audioConfig?.autoPlay ?? false,
                                  ...currentSection.audioConfig,
                                }}
                                examId={`${examId || "exam"}_sec_${currentSection.id}`}
                                studentUsername={studentUsername}
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
                    onClick={() => setActiveQuestionIdx((prev) => Math.max(0, prev - 1))}
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
                      setActiveQuestionIdx((prev) => Math.min(questions.length - 1, prev + 1))
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
                    const sec = secId ? sections.find((s) => s.id === secId) || null : null;
                    groups.push({
                      sectionId: secId,
                      section: sec,
                      items: [{ question: q, index: idx }],
                    });
                  }
                });

                return groups.map((group, gIdx) => {
                  if (group.section) {
                    const secIndex = sections.findIndex((s) => s.id === group.section?.id);
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
                              <LatexPreview content={group.section.description} />
                            </div>
                          )}

                          {/* Section Audio Player (Scroll View) */}
                          {(group.section.audioConfig?.url || (group.section as any).audioUrl) && (
                            <div className="pt-1">
                              <ExamAudioPlayer
                                config={{
                                  enabled: true,
                                  url: group.section.audioConfig?.url || (group.section as any).audioUrl || "",
                                  title: group.section.audioConfig?.title || `Bài nghe: ${group.section.title}`,
                                  maxPlays: group.section.audioConfig?.maxPlays ?? 0,
                                  allowSeek: group.section.audioConfig?.allowSeek ?? true,
                                  allowPause: group.section.audioConfig?.allowPause ?? true,
                                  autoPlay: group.section.audioConfig?.autoPlay ?? false,
                                  ...group.section.audioConfig,
                                }}
                                examId={`${examId || "exam"}_sec_${group.section.id}`}
                                studentUsername={studentUsername}
                              />
                            </div>
                          )}
                        </div>

                        {/* Enclosed Child Questions */}
                        <div className="space-y-4">
                          {group.items.map(({ question: q, index: qIdx }) => renderQuestionCard(q, qIdx))}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={`take-outside-${gIdx}`} className="space-y-4">
                      {group.items.map(({ question: q, index: qIdx }) => renderQuestionCard(q, qIdx))}
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
                    const sec = secId ? sections.find((s) => s.id === secId) || null : null;
                    const lastGroup = orderedGroups[orderedGroups.length - 1];
                    const lastSecId = lastGroup?.section ? lastGroup.section.id : null;
                    const currentSecId = sec ? sec.id : null;
                    if (lastGroup && lastSecId === currentSecId) {
                      lastGroup.items.push({ q, originalIndex: idx });
                    } else {
                      orderedGroups.push({
                        section: sec,
                        items: [{ q, originalIndex: idx }]
                      });
                    }
                  });

                  return orderedGroups.map((group, groupIdx) => {
                    const secQuestions = group.items;
                    const sec = group.section;

                    const secAnswered = secQuestions.filter((item) => {
                      const v = answers[item.q.id];
                      if (v === undefined || v === null || v === "") return false;
                      if (Array.isArray(v) && v.length === 0) return false;
                      if (typeof v === "object" && Object.keys(v).length === 0) return false;
                      return true;
                    }).length;

                    const groupTitle = sec
                      ? sec.title
                      : (sections && sections.length > 0 ? "Câu hỏi khác" : "Danh sách câu hỏi");

                    return (
                      <div key={sec ? sec.id : `no-sec-map-${groupIdx}`} className="space-y-2 bg-slate-50/80 rounded-2xl p-3 border border-slate-200/80">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span className="truncate pr-2">{groupTitle}</span>
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
                              (typeof ans !== "object" || Object.keys(ans).length > 0);
                            const isFlag = flagged[q.id];
                            const isActive = i === activeQuestionIdx;

                            let btnStyle = "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs";
                            if (isActive) {
                              btnStyle = "bg-blue-600 text-white font-bold ring-2 ring-blue-600/30";
                            } else if (isFlag) {
                              btnStyle = "bg-amber-100 border-amber-300 text-amber-900 font-bold";
                            } else if (isAnswered) {
                              btnStyle = "bg-emerald-50 border-emerald-300 text-emerald-800 font-bold";
                            }

                            return (
                              <button
                                key={`${q.id || "q"}_nav_${i}`}
                                type="button"
                                onClick={() => {
                                  handleQuestionSelectInMap(i);
                                  if (window.innerWidth < 1024) setShowMap(false);
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
                  <span>Đã đánh dấu ({Object.values(flagged).filter(Boolean).length})</span>
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
        <div className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Xác nhận nộp bài thi?</h3>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Số câu đã hoàn thành:</span>
                <strong className="text-emerald-700 font-bold">{answeredCount} / {questions.length}</strong>
              </div>
              <div className="flex justify-between">
                <span>Số câu chưa làm:</span>
                <strong className="text-red-600 font-bold">{questions.length - answeredCount}</strong>
              </div>
              <div className="flex justify-between">
                <span>Thời gian còn lại:</span>
                <strong className="text-blue-600 font-bold">{formatTime(timeLeft)}</strong>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Sau khi nộp bài, bạn sẽ không thể chỉnh sửa câu trả lời. Hệ thống sẽ tiến hành chấm điểm tự động.
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
        onAnswerChange={(qId, val) => updateAnswer(qId, val)}
        timeLeft={timeLeft}
        onSubmitExam={() => setShowSubmitConfirm(true)}
        onScratchpadUpdate={(dataUrl) => {
          if (isSessionActiveRef.current && sessionIdRef.current) {
            updateRealtimeSessionMetrics(sessionIdRef.current, { scratchpadImage: dataUrl });
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

      {/* Screen Share Proctoring Request Prompt Modal */}
      {showScreenSharePrompt && (
        <div className="fixed inset-0 z-[120] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 text-indigo-600">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0">
                <Monitor className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Yêu cầu chia sẻ màn hình</h3>
                <p className="text-xs text-slate-500">Từ: Giám thị coi thi</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-2">
              <p>
                Giám thị đang yêu cầu xem màn hình thiết bị của bạn để trực tiếp quan sát và giám sát quá trình làm bài thi thực tế.
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                * Bạn có quyền <strong className="text-slate-700">Đồng ý</strong> hoặc <strong className="text-slate-700">Từ chối</strong> yêu cầu này. Nếu đồng ý, trình duyệt sẽ mở hộp thoại để bạn chọn chia sẻ màn hình.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleDeclineScreenShare}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Từ chối
              </button>
              <button
                type="button"
                onClick={handleAcceptScreenShare}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Monitor className="w-4 h-4" /> Đồng ý chia sẻ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Active Screen Share Badge */}
      {isScreenSharing && (
        <div className="fixed bottom-4 left-4 z-[90] bg-slate-900/90 backdrop-blur-md text-white px-3.5 py-2 rounded-2xl shadow-xl border border-white/10 flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span>Đang chia sẻ màn hình với Giám thị</span>
          </div>
          <button
            type="button"
            onClick={stopRealScreenShare}
            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
          >
            Dừng chia sẻ
          </button>
        </div>
      )}
    </div>
  );
}
