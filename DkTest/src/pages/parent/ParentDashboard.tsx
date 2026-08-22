import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  HeartHandshake,
  Users,
  Sparkles,
  FileText,
  Copy,
  Check,
  Plus,
  Send,
  Loader2,
  Clock,
  Award,
  CheckCircle2,
  XCircle,
  Eye,
  ArrowRight,
  Download,
  Printer,
  Upload,
  AlertCircle,
  BookOpen,
  LogOut,
  RefreshCw,
  Edit2,
  Code,
  ShieldCheck,
  ChevronRight,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  CheckSquare,
  HelpCircle,
  GraduationCap,
  Share2,
  Lock,
  Globe,
  Trash2,
  AlertTriangle,
  BarChart2,
} from "lucide-react";
import {
  sendParentLinkRequest,
  getLinkedChildrenForParent,
  getPendingRequestsSentByParent,
  getChildSubmissions,
  autoLinkChildToParent,
  type LinkedChildInfo,
  type ParentLinkRequest,
} from "../../services/parentService";
import { deleteExam } from "../../services/examService";
import {
  subscribeToActiveSessions,
  type ActiveSession,
} from "../../services/realtimeProctoringService";
import {
  saveParentExam,
  getParentCreatedExams,
} from "../../services/parentExamService";
import type { Question, Exam, Submission } from "../../types";
import LatexPreview from "../../features/exam-builder/editor/LatexPreview";
import { useToast } from "../../components/ui/ToastNotification";
import ChatGPTMasterPromptModal from "../../components/ui/ChatGPTMasterPromptModal";
import ConfirmModal from "../../components/ui/ConfirmModal";
import {
  MASTER_SCHEMA_JSON_STRING,
  FULL_DKTEST_JSON_SCHEMA_TEXT,
} from "../../utils/prompt/chatGptMasterPrompt";

export default function ParentDashboard() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [parentInfo, setParentInfo] = useState<{ username: string; displayName: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"monitor" | "create" | "guide">("monitor");

  // Exam deletion state for parent
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [isDeletingExam, setIsDeletingExam] = useState(false);

  const handleConfirmDeleteExam = async () => {
    if (!examToDelete) return;
    setIsDeletingExam(true);
    try {
      await deleteExam(examToDelete.id);
      showToast("Đã xóa bài thi thành công!", "success");
      setExamToDelete(null);
      if (parentInfo) loadParentExams(parentInfo.username);
    } catch (err) {
      showToast("Không thể xóa bài thi!", "error");
    } finally {
      setIsDeletingExam(false);
    }
  };

  // Monitoring State
  const [linkedChildren, setLinkedChildren] = useState<LinkedChildInfo[]>([]);

  // Pagination state for child submissions history
  const [childHistoryMap, setChildHistoryMap] = useState<
    Record<string, { cursor: any; hasMore: boolean; loading: boolean }>
  >({});

  const handleFetchMoreChildSubmissions = async (childUsername: string) => {
    const curState = childHistoryMap[childUsername] || { cursor: null, hasMore: true, loading: false };
    if (curState.loading) return;

    setChildHistoryMap((prev) => ({
      ...prev,
      [childUsername]: { ...curState, loading: true },
    }));

    try {
      const res = await getChildSubmissions(childUsername, 10, curState.cursor);
      setLinkedChildren((prev) =>
        prev.map((c) => {
          if (c.username === childUsername) {
            const existing = c.recentSubmissions || [];
            // filter duplicates
            const existingIds = new Set(existing.map((s) => s.id));
            const newSubs = res.submissions.filter((s) => !existingIds.has(s.id));
            return {
              ...c,
              recentSubmissions: [...existing, ...newSubs],
            };
          }
          return c;
        })
      );

      setChildHistoryMap((prev) => ({
        ...prev,
        [childUsername]: {
          cursor: res.nextCursor,
          hasMore: res.hasMore,
          loading: false,
        },
      }));
    } catch (err) {
      console.error("Error loading child history:", err);
      setChildHistoryMap((prev) => ({
        ...prev,
        [childUsername]: { ...curState, loading: false },
      }));
    }
  };
  const [pendingSentRequests, setPendingSentRequests] = useState<ParentLinkRequest[]>([]);
  const [loadingMonitor, setLoadingMonitor] = useState(true);
  const [childUsernameInput, setChildUsernameInput] = useState("");
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [showAddChildModal, setShowAddChildModal] = useState(false);
  
  // Exam Creator State
  const [createMode, setCreateMode] = useState<"json" | "prompt">("json");
  const [jsonInput, setJsonInput] = useState("");
  const [promptInput, setPromptInput] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [showGptModal, setShowGptModal] = useState(false);

  // Created Exam Data ( preview & direct edit)
  const [examTitle, setExamTitle] = useState("Đề thi tự luyện cho con");
  const [examTimeLimit, setExamTimeLimit] = useState(45);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [isMatrixOpen, setIsMatrixOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rightPaperRef = useRef<HTMLDivElement>(null);

  // Save / Publish / Share State for Parent
  const [isSavingExam, setIsSavingExam] = useState(false);
  const [savedShareLink, setSavedShareLink] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [myCreatedExams, setMyCreatedExams] = useState<Exam[]>([]);
  const [loadingMyExams, setLoadingMyExams] = useState(false);

  // Copy state for ChatGPT prompt
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const SAMPLE_PROMPT_PRESETS = [
    {
      label: "Toán 12 - Ôn thi Tốt nghiệp THPT",
      prompt:
        "Dựa vào json trên hãy, tạo cho tôi một đề môn Toán Lớp 12. Đây là một đề ôn tập thi tốt nghiệp THPT Quốc gia 2025 dành cho học sinh khá giỏi. Thời gian làm bài là 90 phút, gồm 12 câu trắc nghiệm 4 lựa chọn, 4 câu đúng sai và 6 câu trả lời ngắn kèm lời giải chi tiết và công thức LaTeX.",
    },
    {
      label: "Tiếng Anh 9 - Luyện thi vào 10",
      prompt:
        "Dựa vào json trên hãy, tạo cho tôi một đề môn Tiếng Anh Lớp 9. Đây là một đề thi thử vào lớp 10 THPT dành cho học sinh THCS. Thời gian làm bài là 60 phút, gồm 30 câu trắc nghiệm phát âm, trọng âm, ngữ pháp, từ vựng và bài đọc hiểu.",
    },
    {
      label: "Vật lý 10 - Động học & Động lực học",
      prompt:
        "Dựa vào json trên hãy, tạo cho tôi một đề môn Vật lý Lớp 10. Đây là một đề kiểm tra giữa kỳ 1 chương Động học chất điểm dành cho học sinh lớp 10. Thời gian làm bài là 45 phút, gồm 18 câu trắc nghiệm và 4 câu tự luận ngắn có lời giải số chi tiết.",
    },
    {
      label: "Hóa học 11 - Cân bằng Hóa học & pH",
      prompt:
        "Dựa vào json trên hãy, tạo cho tôi một đề môn Hóa học Lớp 11. Đây là một đề kiểm tra 1 tiết chương Cân bằng Hóa học và pH dành cho học sinh lớp 11. Thời gian làm bài là 45 phút, gồm 20 câu trắc nghiệm và 4 câu đúng sai.",
    },
  ];

  const getQuestionSummary = (q: Question) => {
    if (q.type === "single_choice" || q.type === "multiple_choice") {
      if (!q.correctOptionIds || q.correctOptionIds.length === 0) return "?";
      const letters = q.correctOptionIds
        .map((optId) => {
          const idx = q.options?.findIndex((o) => o.id === optId) ?? -1;
          return idx >= 0 ? String.fromCharCode(65 + idx) : "";
        })
        .filter(Boolean);
      return letters.join(", ") || "?";
    }
    if (q.type === "true_false") {
      if (!q.statements || q.statements.length === 0) return "?";
      const answered = q.statements.filter((s) => typeof s.correctAnswer === "boolean").length;
      return `${answered}/${q.statements.length}`;
    }
    if (q.type === "short_answer") {
      return q.acceptedAnswers?.[0] || "✓";
    }
    return "✓";
  };

  // Fix: Independent smooth scroll of right preview paper only
  const scrollToQuestion = (idx: number) => {
    const el = document.getElementById(`parent-preview-q-${idx}`);
    if (el && rightPaperRef.current) {
      const container = rightPaperRef.current;
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const targetScrollTop = elRect.top - containerRect.top + container.scrollTop - 20;

      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: "smooth",
      });

      el.classList.add("ring-4", "ring-indigo-500", "ring-offset-2", "transition-all", "duration-300");
      setTimeout(() => {
        el.classList.remove("ring-4", "ring-indigo-500", "ring-offset-2");
      }, 1500);
    }
  };

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("auth_role");
    const adminToken = localStorage.getItem("admin_token");
    setIsAdmin(role === "admin" || !!adminToken);

    const pStr = localStorage.getItem("parent_info");
    if (role !== "parent" && !pStr) {
      navigate("/parent/login", { replace: true });
      return;
    }

    if (pStr) {
      try {
        const parsed = JSON.parse(pStr);
        setParentInfo(parsed);

        // Auto-link existing local student account if present on this device
        const sStr = localStorage.getItem("student_info");
        if (sStr && parsed.username) {
          try {
            const sObj = JSON.parse(sStr);
            if (sObj.username && sObj.username.toLowerCase() !== parsed.username.toLowerCase()) {
              autoLinkChildToParent(parsed.username, parsed.displayName || parsed.username, sObj.username)
                .then(() => loadMonitoringData(parsed.username))
                .catch(() => {});
            }
          } catch (e) {}
        }

        loadMonitoringData(parsed.username);
        loadParentExams(parsed.username);
      } catch (e) {}
    }
  }, [navigate]);

  // Realtime Live Proctoring Listener for Linked Children
  useEffect(() => {
    if (!parentInfo) return;

    const unsubscribe = subscribeToActiveSessions(
      (activeList) => {
        setLinkedChildren((prevChildren) => {
          if (!prevChildren || prevChildren.length === 0) return prevChildren;
          return prevChildren.map((child) => {
            const cleanChild = child.username.trim().toLowerCase();
            const matched = activeList.find((s) => {
              const u = (s.studentUsername || s.studentId || "").trim().toLowerCase();
              return u === cleanChild || s.sessionId.toLowerCase().includes(cleanChild);
            });
            return {
              ...child,
              activeSession: matched || null,
            };
          });
        });
      },
      (err) => {
        console.warn("Parent active sessions subscription warning:", err);
      }
    );

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [parentInfo]);

  const loadMonitoringData = async (pUsername: string) => {
    setLoadingMonitor(true);
    try {
      const [children, sentReqs] = await Promise.all([
        getLinkedChildrenForParent(pUsername),
        getPendingRequestsSentByParent(pUsername),
      ]);
      setLinkedChildren(children);
      setPendingSentRequests(sentReqs);
    } catch (err) {
      console.error("Error loading monitor data:", err);
    } finally {
      setLoadingMonitor(false);
    }
  };

  const loadParentExams = async (pUsername: string) => {
    setLoadingMyExams(true);
    try {
      const list = await getParentCreatedExams(pUsername);
      setMyCreatedExams(list);
    } catch (err) {
      console.error("Error loading parent exams:", err);
    } finally {
      setLoadingMyExams(false);
    }
  };

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childUsernameInput.trim() || !parentInfo) return;

    setIsSendingRequest(true);
    try {
      const res = await sendParentLinkRequest(
        parentInfo.username,
        parentInfo.displayName,
        childUsernameInput.trim()
      );
      if (res.success) {
        showToast(res.message, "success");
        setChildUsernameInput("");
        setShowAddChildModal(false);
        loadMonitoringData(parentInfo.username);
      } else {
        showToast(res.message, "error");
      }
    } catch (err: any) {
      showToast(err.message || "Lỗi khi gửi yêu cầu", "error");
    } finally {
      setIsSendingRequest(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_role");
    localStorage.removeItem("parent_info");
    navigate("/", { replace: true });
  };

  const handleSwitchToStudent = () => {
    // 1. If student_info already exists in localStorage, activate it and go straight to student portal
    const studentInfoStr = localStorage.getItem("student_info");
    if (studentInfoStr) {
      try {
        const parsed = JSON.parse(studentInfoStr);
        if (parsed.username) {
          localStorage.setItem("auth_role", "student");
          navigate("/");
          return;
        }
      } catch (e) {}
    }

    // 2. If parent has linked children, activate the first child
    if (linkedChildren && linkedChildren.length > 0) {
      handleSwitchToChild(linkedChildren[0]);
      return;
    }

    // 3. Otherwise open login / register
    navigate("/student/login?switch=true");
  };

  const handleSwitchToChild = (child: LinkedChildInfo) => {
    localStorage.setItem("auth_role", "student");
    localStorage.setItem(
      "student_info",
      JSON.stringify({
        username: child.username,
        displayName: child.displayName || child.username,
        studentClass: child.studentClass || "",
        avatarUrl: child.avatarUrl || "",
      })
    );
    navigate("/");
  };

  // Parse JSON into Questions
  const handleParseJson = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      let parsedQs: Question[] = [];
      let parsedTitle = "Đề luyện thi cho con";
      let parsedTime = 45;

      if (Array.isArray(parsed)) {
        parsedQs = parsed;
      } else if (parsed && typeof parsed === "object") {
        if (parsed.exam?.title) parsedTitle = parsed.exam.title;
        else if (parsed.title) parsedTitle = parsed.title;

        if (parsed.exam?.timeLimit) parsedTime = parsed.exam.timeLimit;
        else if (parsed.timeLimit) parsedTime = parsed.timeLimit;

        if (Array.isArray(parsed.questions)) {
          parsedQs = parsed.questions;
        }
      }

      if (parsedQs.length === 0) {
        showToast("Không tìm thấy danh sách câu hỏi hợp lệ trong JSON!", "error");
        return;
      }

      // Normalize questions to match data model
      const normalized: Question[] = parsedQs.map((q: any, idx: number) => ({
        id: q.id || `q_${Date.now()}_${idx}`,
        examId: q.examId || "",
        order: idx,
        type: q.type || (q.statements ? "true_false" : q.options ? "single_choice" : "short_answer"),
        text: q.text || `Câu hỏi ${idx + 1}`,
        points: q.points || 1,
        options: q.options || [],
        correctOptionIds: q.correctOptionIds || (q.correctAnswer ? [q.correctAnswer] : []),
        statements: q.statements || [],
        acceptedAnswers: q.acceptedAnswers || [],
        explanation: q.explanation || "",
      }));

      setQuestions(normalized);
      setExamTitle(parsedTitle);
      setExamTimeLimit(parsedTime);
      showToast(`Đã nạp thành công ${normalized.length} câu hỏi!`, "success");
    } catch (err: any) {
      showToast("Lỗi định dạng JSON: " + err.message, "error");
    }
  };

  // Load from uploaded .json file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonInput(content);
      handleParseJson(content);
    };
    reader.readAsText(file);
  };

  // Generate via Gemini AI Prompt
  const handleGenerateAiPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;

    setIsGeneratingAi(true);
    try {
      const response = await fetch("/api/ai/generate-exam-prompt-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptInput.trim() }),
      });

      if (!response.ok) {
        throw new Error(`Lỗi máy chủ: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("Không nhận được luồng dữ liệu từ máy chủ");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let fullText = "";
      let finalResult: any = null;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          const lines = fullText.split("\n\n");
          fullText = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const jsonStr = line.replace("data: ", "").trim();
              if (!jsonStr) continue;
              try {
                const data = JSON.parse(jsonStr);
                if (data.type === "done" && data.result) {
                  finalResult = data.result;
                } else if (data.type === "error") {
                  throw new Error(data.message || "Lỗi tạo đề từ AI");
                }
              } catch (parseErr) {
                // partial JSON or SSE message
              }
            }
          }
        }
      }

      if (finalResult && finalResult.questions && finalResult.questions.length > 0) {
        const title = finalResult.exam?.title || promptInput.trim();
        const timeLimit = finalResult.exam?.timeLimit || 45;
        const normalized: Question[] = finalResult.questions.map((q: any, idx: number) => ({
          id: q.id || `q_${Date.now()}_${idx}`,
          examId: q.examId || "",
          order: idx,
          type: q.type || (q.statements ? "true_false" : q.options ? "single_choice" : "short_answer"),
          text: q.text || `Câu hỏi ${idx + 1}`,
          points: q.points || 1,
          options: q.options || [],
          correctOptionIds: q.correctOptionIds || (q.correctAnswer ? [q.correctAnswer] : []),
          statements: q.statements || [],
          acceptedAnswers: q.acceptedAnswers || [],
          explanation: q.explanation || "",
        }));

        setQuestions(normalized);
        setExamTitle(title);
        setExamTimeLimit(timeLimit);
        setJsonInput(JSON.stringify({ title, timeLimit, questions: normalized }, null, 2));
        showToast(`Đã tạo thành công ${normalized.length} câu hỏi từ AI!`, "success");
      } else {
        throw new Error("Không trích xuất được câu hỏi từ phản hồi AI");
      }
    } catch (err: any) {
      showToast("Lỗi khi tạo đề với AI: " + err.message, "error");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleAddQuestion = (type: "single_choice" | "multiple_choice" | "true_false" | "short_answer" = "single_choice") => {
    const newQ: Question = {
      id: `q_${Date.now()}_${questions.length}`,
      examId: "",
      order: questions.length,
      type,
      text: "Nhập nội dung câu hỏi tại đây...",
      points: 1,
      options:
        type === "single_choice" || type === "multiple_choice"
          ? [
              { id: "opt_1", text: "Phương án A" },
              { id: "opt_2", text: "Phương án B" },
              { id: "opt_3", text: "Phương án C" },
              { id: "opt_4", text: "Phương án D" },
            ]
          : [],
      correctOptionIds: type === "single_choice" ? ["opt_1"] : [],
      statements:
        type === "true_false"
          ? [
              { id: "stmt_1", text: "Mệnh đề a", correctAnswer: true },
              { id: "stmt_2", text: "Mệnh đề b", correctAnswer: false },
              { id: "stmt_3", text: "Mệnh đề c", correctAnswer: true },
              { id: "stmt_4", text: "Mệnh đề d", correctAnswer: false },
            ]
          : [],
      acceptedAnswers: type === "short_answer" ? ["10"] : [],
      explanation: "",
    };
    setQuestions((prev) => [...prev, newQ]);
    showToast("Đã thêm câu hỏi mới!", "success");
    setTimeout(() => {
      scrollToQuestion(questions.length);
    }, 100);
  };

  const handleDeleteQuestion = (idx: number) => {
    setQuestions((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.map((q, i) => ({ ...q, order: i }));
    });
    showToast("Đã xóa câu hỏi!", "success");
  };

  const handleDuplicateQuestion = (idx: number) => {
    const target = questions[idx];
    if (!target) return;
    const cloned: Question = {
      ...target,
      id: `q_${Date.now()}_copy`,
      order: idx + 1,
      text: `${target.text} (Bản sao)`,
    };
    setQuestions((prev) => {
      const next = [...prev.slice(0, idx + 1), cloned, ...prev.slice(idx + 1)];
      return next.map((q, i) => ({ ...q, order: i }));
    });
    showToast("Đã nhân bản câu hỏi!", "success");
  };

  const handleMoveQuestion = (idx: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    setQuestions((prev) => {
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[targetIdx];
      next[targetIdx] = temp;
      return next.map((q, i) => ({ ...q, order: i }));
    });
  };

  const handleUpdateQuestionText = (idx: number, text: string) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], text };
      return next;
    });
  };

  const handleUpdateOptionText = (qIndex: number, optId: string, text: string) => {
    setQuestions((prev) => {
      const next = [...prev];
      const q = { ...next[qIndex] };
      q.options = (q.options || []).map((o) => (o.id === optId ? { ...o, text } : o));
      next[qIndex] = q;
      return next;
    });
  };

  const handleUpdateStatementText = (qIndex: number, stmtId: string, text: string) => {
    setQuestions((prev) => {
      const next = [...prev];
      const q = { ...next[qIndex] };
      q.statements = (q.statements || []).map((s) => (s.id === stmtId ? { ...s, text } : s));
      next[qIndex] = q;
      return next;
    });
  };

  const handleUpdateAcceptedAnswer = (qIndex: number, ans: string) => {
    setQuestions((prev) => {
      const next = [...prev];
      const q = { ...next[qIndex] };
      q.acceptedAnswers = [ans];
      next[qIndex] = q;
      return next;
    });
  };

  const handleUpdateExplanation = (qIndex: number, explanation: string) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[qIndex] = { ...next[qIndex], explanation };
      return next;
    });
  };

  // Direct toggle question option in  view
  const handleToggleOption = (qIndex: number, optId: string) => {
    setQuestions((prev) => {
      const next = [...prev];
      const q = { ...next[qIndex] };
      if (q.type === "single_choice") {
        q.correctOptionIds = [optId];
      } else if (q.type === "multiple_choice") {
        const cur = q.correctOptionIds || [];
        q.correctOptionIds = cur.includes(optId) ? cur.filter((id) => id !== optId) : [...cur, optId];
      }
      next[qIndex] = q;
      return next;
    });
  };

  const handleToggleStatement = (qIndex: number, stmtId: string, val: boolean) => {
    setQuestions((prev) => {
      const next = [...prev];
      const q = { ...next[qIndex] };
      q.statements = (q.statements || []).map((s) => (s.id === stmtId ? { ...s, correctAnswer: val } : s));
      next[qIndex] = q;
      return next;
    });
  };

  // Save / Publish private exam for parent and generate share link
  const handleSaveAndPublishExam = async () => {
    if (!parentInfo) {
      showToast("Vui lòng đăng nhập tài khoản phụ huynh để lưu đề!", "error");
      return;
    }
    if (questions.length === 0) {
      showToast("Đề thi chưa có câu hỏi nào để lưu!", "error");
      return;
    }

    setIsSavingExam(true);
    try {
      const result = await saveParentExam({
        parentUsername: parentInfo.username,
        parentDisplayName: parentInfo.displayName,
        title: examTitle,
        timeLimit: examTimeLimit,
        questions,
      });

      setSavedShareLink(result.shareLink);
      setShowShareModal(true);
      showToast("Đã lưu đề thi thành công ở chế độ Không Công Khai (Chỉ ai có link mới xem được)!", "success");
      loadParentExams(parentInfo.username);
    } catch (err: any) {
      showToast("Lỗi khi lưu đề thi: " + (err.message || "Không xác định"), "error");
    } finally {
      setIsSavingExam(false);
    }
  };

  const handleExportJson = () => {
    const data = {
      title: examTitle,
      timeLimit: examTimeLimit,
      questionCount: questions.length,
      createdAt: new Date().toISOString(),
      questions,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${examTitle.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Đã xuất file JSON thành công!", "success");
  };

  const handlePrint = () => {
    window.print();
  };

  // Standard Template Prompt for Guide
  const GUIDE_PROMPT_TEMPLATE = `\`json
${FULL_DKTEST_JSON_SCHEMA_TEXT}
\`

Dựa vào json trên hãy, tạo cho tôi một đề môn [Tên môn - Ví dụ: Toán học] Lớp [Khối lớp - Ví dụ: 12]. Đây là một đề [Mô tả chi tiết - Ví dụ: Ôn tập thi tốt nghiệp THPT Quốc gia 2025, gồm các dạng khảo sát hàm số và logarit] dành cho [Đối tượng - Ví dụ: Học sinh ôn thi đại học]. Thời gian làm bài là [Thời gian - Ví dụ: 45] phút, số lượng [Số lượng - Ví dụ: 20] câu gồm cả trắc nghiệm 1 đáp án, trắc nghiệm nhiều đáp án, đúng sai 4 ý và trả lời ngắn kèm lời giải chi tiết và công thức chuẩn LaTeX.`;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-16">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-xl font-black text-indigo-600 tracking-tight">DkTEST</span>
              <span className="text-xs font-extrabold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-xl border border-indigo-100 flex items-center gap-1">
                <HeartHandshake className="w-3.5 h-3.5" /> Cổng Phụ Huynh
              </span>
            </Link>
          </div>

          {/* Quick Role Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
              <span className="px-2.5 py-1 bg-white text-indigo-700 rounded-lg shadow-2xs flex items-center gap-1">
                <span>👨‍👩‍👧 Phụ huynh</span>
              </span>
              {isAdmin && (
                <Link
                  to="/admin/dashboard"
                  className="px-2.5 py-1 hover:text-blue-700 rounded-lg transition-colors flex items-center gap-1"
                  title="Chuyển sang Quản trị Giáo viên"
                >
                  <span>👨‍🏫 Giáo viên</span>
                </Link>
              )}
              <button
                type="button"
                onClick={handleSwitchToStudent}
                className="px-2.5 py-1 hover:text-slate-900 rounded-lg transition-colors hidden sm:flex items-center gap-1 cursor-pointer"
                title="Chuyển sang Cổng Thí sinh / Học sinh"
              >
                <span>🎓 Học sinh</span>
              </button>
            </div>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 hidden md:inline">
                {parentInfo?.displayName || "Phụ huynh"}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 sm:gap-2 border-t border-slate-100 overflow-x-auto scrollbar-none py-1">
          <button
            type="button"
            onClick={() => setActiveTab("monitor")}
            className={`py-2 px-3 sm:py-3 sm:px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer rounded-t-lg ${
              activeTab === "monitor"
                ? "border-indigo-600 text-indigo-700 bg-indigo-50/60"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Giám sát việc học của con</span>
            <span className="sm:hidden">Giám sát con</span>
            {linkedChildren.length > 0 && (
              <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 text-[10px] rounded-full">
                {linkedChildren.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("create")}
            className={`py-2 px-3 sm:py-3 sm:px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer rounded-t-lg ${
              activeTab === "create"
                ? "border-indigo-600 text-indigo-700 bg-indigo-50/60"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
            <span className="hidden sm:inline">Tạo đề thi & Soạn đề (AI / JSON / Word)</span>
            <span className="sm:hidden">Tạo đề thi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("guide")}
            className={`py-2 px-3 sm:py-3 sm:px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer rounded-t-lg ${
              activeTab === "guide"
                ? "border-indigo-600 text-indigo-700 bg-indigo-50/60"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
            <span className="hidden sm:inline">Hướng dẫn tạo đề bằng ChatGPT & Mã Code</span>
            <span className="sm:hidden">ChatGPT Prompt</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* =================== TAB 1: MONITORING CON EM =================== */}
        {activeTab === "monitor" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-2xs">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Danh sách con em đang liên kết
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Xem trực tiếp con đang làm đề nào, theo dõi điểm số và xem chi tiết bài làm.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => parentInfo && loadMonitoringData(parentInfo.username)}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  title="Làm mới dữ liệu"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingMonitor ? "animate-spin" : ""}`} />
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddChildModal(true)}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Liên kết tài khoản con</span>
                </button>
              </div>
            </div>

            {/* Pending Requests Notice */}
            {pendingSentRequests.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 text-xs font-bold">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Đang chờ con xác nhận ({pendingSentRequests.length} yêu cầu)</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {pendingSentRequests.map((req) => (
                    <span
                      key={req.id}
                      className="px-3 py-1 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-amber-900"
                    >
                      @{req.childUsername}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* List of Children */}
            {loadingMonitor ? (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-3 bg-white border border-slate-200 rounded-3xl">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <span className="text-xs font-semibold text-slate-600">Đang tải thông tin học tập của con...</span>
              </div>
            ) : linkedChildren.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-4 shadow-xs">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
                  <HeartHandshake className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Chưa có tài khoản con nào được liên kết</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Nhập mã username tài khoản học sinh của con để gửi yêu cầu. Khi con đăng nhập và bấm xác nhận, bạn sẽ xem được toàn bộ tiến độ làm bài thi.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddChildModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Liên kết ngay
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {linkedChildren.map((child) => (
                  <div
                    key={child.username}
                    className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-5"
                  >
                    {/* Child Header & Live Status */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg overflow-hidden shrink-0 shadow-2xs">
                          {child.avatarUrl ? (
                            <img src={child.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            child.displayName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-extrabold text-slate-900">{child.displayName}</h3>
                            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                              @{child.username}
                            </span>
                            {child.studentClass && (
                              <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                                {child.studentClass}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">
                            Tổng số bài đã làm: <strong>{child.recentSubmissions?.length || 0} bài</strong>
                          </p>
                        </div>
                      </div>

                      {/* Actions & Live Session Pill */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleSwitchToChild(child)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all border border-indigo-200 cursor-pointer shadow-2xs"
                          title={`Chuyển sang tài khoản học sinh @${child.username} để làm bài thi`}
                        >
                          <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Vào thi với tài khoản này</span>
                        </button>

                        {child.activeSession ? (
                          <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl text-xs font-bold shadow-2xs">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                            <span>🟢 Đang làm bài trực tiếp</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl text-xs font-semibold">
                            <span>Trạng thái: Đã nộp bài</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Active Live Session Highlight Card for Parent */}
                    {child.activeSession && (
                      <div className="bg-gradient-to-br from-emerald-50 via-teal-50/60 to-blue-50 border-2 border-emerald-300 rounded-2xl p-4.5 space-y-3.5 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/70 pb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-3 w-3 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                            <h4 className="font-extrabold text-slate-900 text-sm">
                              {child.activeSession.examTitle || "Khảo thí trực tuyến"}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/live-monitor/${child.activeSession?.sessionId}`)}
                              className="w-full sm:w-auto px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer animate-pulse"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Xem màn hình & nháp trực tiếp</span>
                            </button>
                          </div>
                        </div>

                        <div
                          onClick={() => navigate(`/admin/live-monitor/${child.activeSession?.sessionId}`)}
                          className="grid grid-cols-3 gap-1.5 sm:gap-3 text-[11px] sm:text-xs cursor-pointer"
                        >
                          <div className="bg-white/90 backdrop-blur-xs p-2 sm:p-3 rounded-xl border border-emerald-100 flex flex-col sm:flex-row items-center justify-between text-center sm:text-left hover:bg-white transition-colors">
                            <span className="font-semibold text-slate-500 flex items-center gap-1 text-[10px] sm:text-xs">
                              <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" /> <span className="hidden sm:inline">Còn lại:</span>
                            </span>
                            <span className="font-mono font-black text-blue-700 text-xs sm:text-sm mt-0.5 sm:mt-0">
                              {Math.floor((child.activeSession.timeLeft || 0) / 60)}:
                              {((child.activeSession.timeLeft || 0) % 60).toString().padStart(2, "0")}
                            </span>
                          </div>

                          <div className="bg-white/90 backdrop-blur-xs p-2 sm:p-3 rounded-xl border border-emerald-100 flex flex-col sm:flex-row items-center justify-between text-center sm:text-left hover:bg-white transition-colors">
                            <span className="font-semibold text-slate-500 flex items-center gap-1 text-[10px] sm:text-xs">
                              <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600" /> <span className="hidden sm:inline">Tiến độ:</span>
                            </span>
                            <span className="font-bold text-slate-800 text-xs sm:text-sm mt-0.5 sm:mt-0">
                              {child.activeSession.answeredCount || 0}/{child.activeSession.totalQuestions || "?"}
                            </span>
                          </div>

                          <div className="bg-white/90 backdrop-blur-xs p-2 sm:p-3 rounded-xl border border-emerald-100 flex flex-col sm:flex-row items-center justify-between text-center sm:text-left hover:bg-white transition-colors">
                            <span className="font-semibold text-slate-500 flex items-center gap-1 text-[10px] sm:text-xs">
                              <AlertTriangle className={`w-3 h-3 sm:w-4 sm:h-4 ${(child.activeSession.warnings || 0) > 0 ? "text-amber-500" : "text-slate-400"}`} /> <span className="hidden sm:inline">Rời tab:</span>
                            </span>
                            <span className={`font-bold text-xs sm:text-sm mt-0.5 sm:mt-0 ${(child.activeSession.warnings || 0) > 0 ? "text-amber-700 bg-amber-100/70 px-1.5 py-0.2 rounded-md" : "text-slate-500"}`}>
                              {child.activeSession.warnings || 0} <span className="hidden sm:inline">lần</span>
                            </span>
                          </div>
                        </div>

                        {/* Progress bar */}
                        {child.activeSession.totalQuestions > 0 && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                              <span>Tiến độ hoàn thành bài</span>
                              <span>
                                {Math.round(
                                  ((child.activeSession.answeredCount || 0) /
                                    Math.max(1, child.activeSession.totalQuestions || 1)) *
                                    100
                                )}
                                %
                              </span>
                            </div>
                            <div className="w-full bg-emerald-100/80 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.round(
                                      ((child.activeSession.answeredCount || 0) /
                                        Math.max(1, child.activeSession.totalQuestions || 1)) *
                                        100
                                    )
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Submissions History for this Child */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                        Lịch sử bài thi gần đây
                      </h4>

                      {!child.recentSubmissions || child.recentSubmissions.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">Con chưa hoàn thành bài thi nào.</p>
                      ) : (
                        <div className="space-y-2.5">
                          {child.recentSubmissions.map((sub) => {
                            const isGood = (sub.score || 0) >= 7.0;
                            return (
                              <div
                                key={sub.id}
                                className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl p-3.5 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div
                                    className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 font-bold ${
                                      isGood ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                                    }`}
                                  >
                                    <span className="text-sm font-black leading-none">{sub.score}</span>
                                    <span className="text-[8px] opacity-75">/{sub.maxScore || 10}</span>
                                  </div>

                                  <div className="min-w-0 space-y-0.5">
                                    <div className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                                      {sub.examTitleSnapshot || "Bài kiểm tra"}
                                    </div>
                                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium flex-wrap">
                                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        {sub.correctCount}/{sub.totalCount} câu đúng
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {Math.floor((sub.timeSpent || 0) / 60)}p {(sub.timeSpent || 0) % 60}s
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                  <Link
                                    to={`/student/exam/${sub.examId}/result/${sub.id}`}
                                    className="p-2 bg-white hover:bg-indigo-600 text-indigo-600 hover:text-white border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center cursor-pointer"
                                    title="Xem chi tiết bài làm của con"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Link>
                                </div>
                              </div>
                            );
                          })}

                          {childHistoryMap[child.username]?.hasMore !== false && (
                            <div className="text-center pt-2">
                              <button
                                type="button"
                                onClick={() => handleFetchMoreChildSubmissions(child.username)}
                                disabled={childHistoryMap[child.username]?.loading}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                              >
                                {childHistoryMap[child.username]?.loading
                                  ? "Đang tải thêm..."
                                  : "Xem thêm lịch sử bài làm của con"}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Created Exams by Parent Section */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Kho đề thi phụ huynh đã lưu ({myCreatedExams.length} đề)
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to="/parent/exams/new"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Soạn đề mới
                  </Link>
                  <button
                    type="button"
                    onClick={() => parentInfo && loadParentExams(parentInfo.username)}
                    className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 p-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingMyExams ? "animate-spin" : ""}`} /> Làm mới
                  </button>
                </div>
              </div>

              {myCreatedExams.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">
                  Phụ huynh chưa lưu đề thi nào. Hãy sang tab "Tạo đề & Sửa " để nạp JSON và lưu đề gửi cho con!
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {myCreatedExams.map((ex) => {
                    const shareUrl = `${window.location.origin}/student/exam/${ex.id}`;
                    return (
                      <div
                        key={ex.id}
                        className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md border border-amber-200 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> Không công khai
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-500">{ex.timeLimit || 45} phút</span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm truncate">{ex.title}</h4>
                          <p className="text-xs text-slate-500">{ex.questionCount || 0} câu hỏi</p>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-slate-200/60">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(shareUrl);
                              showToast(`Đã sao chép link đề "${ex.title}"!`, "success");
                            }}
                            className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                          >
                            <Share2 className="w-3.5 h-3.5" /> Sao chép link gửi con
                          </button>

                          <div className="flex items-center gap-1.5 justify-between bg-white p-1 rounded-xl border border-slate-200">
                            <Link
                              to={`/student/exam/${ex.id}`}
                              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                              title="Xem trang làm bài thử"
                            >
                              <Eye className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Làm thử</span>
                            </Link>
                            <Link
                              to={`/parent/exams/${ex.id}/edit`}
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                              title="Sửa đề thi (Thêm/Sửa/Xóa câu hỏi)"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Sửa câu</span>
                            </Link>
                            <Link
                              to={`/parent/exams/${ex.id}/submissions`}
                              className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                              title="Bài nộp & Chấm lại"
                            >
                              <GraduationCap className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Bài nộp</span>
                            </Link>
                            <Link
                              to={`/parent/exams/${ex.id}/stats`}
                              className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                              title="Thống kê kết quả"
                            >
                              <BarChart2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Thống kê</span>
                            </Link>
                            <button
                              type="button"
                              onClick={() => setExamToDelete(ex)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Xóa đề thi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================== TAB 2: TẠO ĐỀ & SOẠN ĐỀ (AI / JSON / WORD) =================== */}
        {activeTab === "create" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Top Toolbar & Methods */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    Tạo đề & Soạn đề thi cho con
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Tạo đề nhanh bằng Prompt AI, dán mã JSON từ ChatGPT, nạp file Word hoặc soạn trực tiếp.
                  </p>
                </div>

                {/* External Tools / Special Modes */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => navigate("/parent/exams/import-word")}
                    className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all border border-indigo-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Nhập đề từ file Microsoft Word (.docx)"
                  >
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <span>AI Nhập file Word</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/parent/exams/import-prompt")}
                    className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold transition-all border border-purple-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="AI Studio tạo đề từ Prompt tự do"
                  >
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span>AI Prompt Studio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/parent/exams/new")}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all border border-slate-200 flex items-center gap-1.5 cursor-pointer"
                    title="Soạn đề chuyên sâu toàn màn hình"
                  >
                    <Edit2 className="w-4 h-4 text-slate-600" />
                    <span className="hidden sm:inline">Soạn đề chuyên sâu</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowGptModal(true)}
                    className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold transition-all border border-amber-200 flex items-center gap-1.5 cursor-pointer"
                    title="Mở bảng tùy biến Prompt mẫu ChatGPT (Schema v3)"
                  >
                    <Code className="w-4 h-4 text-amber-600" />
                    <span className="hidden sm:inline">Mẫu ChatGPT</span>
                  </button>
                </div>
              </div>

              {/* Mode Selector */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                <button
                  type="button"
                  onClick={() => setCreateMode("prompt")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    createMode === "prompt"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>1. Nhập Prompt AI trực tiếp</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCreateMode("json")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    createMode === "json"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>2. Dán mã JSON (từ ChatGPT)</span>
                </button>
              </div>

              {/* MODE 1: PROMPT INPUT */}
              {createMode === "prompt" && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Nhập yêu cầu đề thi cho AI (Môn, lớp, số lượng câu, chủ đề...):
                    </label>
                    <textarea
                      rows={4}
                      value={promptInput}
                      onChange={(e) => setPromptInput(e.target.value)}
                      placeholder="Ví dụ: Tạo cho tôi đề kiểm tra 15 phút Toán lớp 12 phần Khảo sát hàm số gồm 10 câu trắc nghiệm 1 đáp án và 2 câu đúng sai có lời giải chi tiết..."
                      className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition leading-relaxed"
                    />
                  </div>

                  {/* Preset prompt pills */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500">Gợi ý chủ đề nhanh:</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {SAMPLE_PROMPT_PRESETS.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPromptInput(p.prompt)}
                          className="px-3 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 rounded-xl text-[11px] font-semibold transition cursor-pointer"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <p className="text-[11px] text-slate-400">
                      AI sẽ tự động nhận diện công thức LaTeX, phân loại dạng câu và sinh lời giải chi tiết.
                    </p>

                    <button
                      type="button"
                      disabled={isGeneratingAi || !promptInput.trim()}
                      onClick={handleGenerateAiPrompt}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isGeneratingAi ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>AI đang tạo câu hỏi...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>AI Tạo đề ngay</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* MODE 2: JSON INPUT */}
              {createMode === "json" && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Dán mã JSON đề thi:
                      </label>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" /> Nạp từ file .json
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                    <textarea
                      rows={6}
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                      placeholder={`{\n  "title": "Đề kiểm tra Toán 12",\n  "timeLimit": 45,\n  "questions": [...]\n}`}
                      className="w-full p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed scrollbar-thin"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const sampleData = {
                          title: "Đề kiểm tra ôn tập Toán 12",
                          timeLimit: 45,
                          questions: [
                            {
                              id: `q_sample_1`,
                              order: 0,
                              type: "single_choice",
                              text: "Cho hàm số $y = f(x)$ có bảng biến thiên như hình vẽ. Hàm số đồng biến trên khoảng nào dưới đây?",
                              points: 1,
                              options: [
                                { id: "a", text: "$(-\\infty; -1)$" },
                                { id: "b", text: "$(-1; 1)$" },
                                { id: "c", text: "$(1; +\\infty)$" },
                                { id: "d", text: "$(0; 2)$" },
                              ],
                              correctOptionIds: ["a"],
                              explanation: "Dựa vào bảng biến thiên, đạo hàm mang dấu dương trên khoảng $(-\\infty; -1)$.",
                            },
                            {
                              id: `q_sample_2`,
                              order: 1,
                              type: "true_false",
                              text: "Cho hình chóp $S.ABCD$ có đáy $ABCD$ là hình vuông cạnh $a$, $SA \\perp (ABCD)$ và $SA = a\\sqrt{2}$.",
                              points: 1,
                              statements: [
                                { id: "s1", text: "$BD \\perp (SAC)$", correctAnswer: true },
                                { id: "s2", text: "Góc giữa $(SBD)$ và $(ABCD)$ là $45^\\circ$", correctAnswer: false },
                                { id: "s3", text: "Thể tích khối chóp là $V = \\frac{a^3\\sqrt{2}}{3}$", correctAnswer: true },
                                { id: "s4", text: "Khoảng cách từ $A$ đến $(SBD)$ bằng $\\frac{a}{\\sqrt{3}}$", correctAnswer: false },
                              ],
                              explanation: "Lời giải chi tiết từng ý a, b, c, d hình học không gian.",
                            },
                          ],
                        };
                        const str = JSON.stringify(sampleData, null, 2);
                        setJsonInput(str);
                        handleParseJson(str);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                      Dán mẫu đề ví dụ
                    </button>

                    <button
                      type="button"
                      disabled={!jsonInput.trim()}
                      onClick={() => handleParseJson(jsonInput)}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>Nạp JSON & Phân tích câu hỏi</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Exam Meta & Security Guarantee */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Tiêu đề đề thi:
                  </label>
                  <input
                    type="text"
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
                    placeholder="Nhập tên đề thi..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Thời gian làm bài (Phút):
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={300}
                    value={examTimeLimit}
                    onChange={(e) => setExamTimeLimit(parseInt(e.target.value) || 45)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Security & Folder Path Badge */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-900 font-medium">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold">Đảm bảo bảo mật: </span>
                  Bài thi được lưu ở chế độ <strong className="text-emerald-950 font-black">Không công khai (Private)</strong> và tự động gom vào thư mục ảo:{" "}
                  <code className="px-2 py-0.5 bg-emerald-100/80 rounded-md font-mono text-emerald-900 font-bold">
                    Drive gốc/Phụ huynh/{parentInfo?.displayName || "Tên phụ huynh"}
                  </code>
                </div>
              </div>
            </div>

            {/* Questions Management & Live Exam Paper */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 bg-indigo-100 text-indigo-800 font-black text-xs rounded-xl">
                    {questions.length} câu hỏi
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    Click vào phương án để đổi đáp án đúng. Công thức Toán $...$ hiển thị trực tiếp.
                  </span>
                </div>

                {/* Quick Add Question buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleAddQuestion("single_choice")}
                    className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> 1 Đáp án
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion("multiple_choice")}
                    className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nhiều đáp án
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion("true_false")}
                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Đúng/Sai 4 ý
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion("short_answer")}
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Trả lời ngắn
                  </button>
                </div>
              </div>

              {/* Question Number Matrix Bar */}
              {questions.length > 0 && (
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-2 overflow-x-auto scrollbar-thin">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
                    Mục lục câu:
                  </span>
                  {questions.map((q, idx) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => scrollToQuestion(idx)}
                      className="px-2.5 py-1 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      <span>C{idx + 1}</span>
                      <span className="text-[9px] opacity-70">({getQuestionSummary(q)})</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Questions Paper Preview */}
              {questions.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Chưa có câu hỏi nào trong đề</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    Hãy nhập Prompt AI, dán mã JSON hoặc bấm các nút "+ Thêm câu hỏi" ở trên để bắt đầu soạn đề.
                  </p>
                </div>
              ) : (
                <div
                  ref={rightPaperRef}
                  className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 scrollbar-thin"
                >
                  {questions.map((q, idx) => (
                    <div
                      id={`parent-preview-q-${idx}`}
                      key={q.id}
                      className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4 transition hover:border-indigo-200"
                    >
                      {/* Question Top Header */}
                      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-2xs">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            {q.type === "single_choice"
                              ? "Trắc nghiệm 1 đáp án"
                              : q.type === "multiple_choice"
                              ? "Trắc nghiệm nhiều đáp án"
                              : q.type === "true_false"
                              ? "Đúng / Sai 4 ý"
                              : "Điền đáp án ngắn"}
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveQuestion(idx, "up")}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                            title="Di chuyển lên"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={idx === questions.length - 1}
                            onClick={() => handleMoveQuestion(idx, "down")}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                            title="Di chuyển xuống"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateQuestion(idx)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 cursor-pointer"
                            title="Nhân bản câu hỏi"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                            title="Xóa câu hỏi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Question Text */}
                      <div className="space-y-2">
                        <textarea
                          rows={2}
                          value={q.text}
                          onChange={(e) => handleUpdateQuestionText(idx, e.target.value)}
                          placeholder="Nội dung câu hỏi..."
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                        />
                        {/* Rendered Preview */}
                        <div className="p-3 bg-slate-50/50 rounded-xl text-xs font-medium text-slate-800 leading-relaxed border border-slate-100">
                          <LatexPreview content={q.text} />
                        </div>
                      </div>

                      {/* Question Options (Single / Multiple Choice) */}
                      {(q.type === "single_choice" || q.type === "multiple_choice") && q.options && (
                        <div className="space-y-2.5">
                          <span className="text-[11px] font-bold text-slate-400 uppercase">
                            Phương án lựa chọn (Click chọn đáp án đúng):
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {q.options.map((opt, oIdx) => {
                              const letter = String.fromCharCode(65 + oIdx);
                              const isSelected = q.correctOptionIds?.includes(opt.id);
                              return (
                                <div
                                  key={opt.id}
                                  className={`p-3 rounded-2xl border transition flex items-start gap-2.5 ${
                                    isSelected
                                      ? "bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-200"
                                      : "bg-white border-slate-200 hover:border-slate-300"
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleToggleOption(idx, opt.id)}
                                    className={`w-7 h-7 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 transition cursor-pointer ${
                                      isSelected
                                        ? "bg-emerald-600 text-white shadow-2xs"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                  >
                                    {letter}
                                  </button>

                                  <div className="flex-1 min-w-0 space-y-1">
                                    <input
                                      type="text"
                                      value={opt.text}
                                      onChange={(e) => handleUpdateOptionText(idx, opt.id, e.target.value)}
                                      className="w-full text-xs font-medium text-slate-900 bg-transparent border-b border-transparent focus:border-indigo-400 focus:outline-none"
                                    />
                                    <div className="text-[11px] text-slate-700">
                                      <LatexPreview content={opt.text} />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Question Statements (True / False 4 items) */}
                      {q.type === "true_false" && q.statements && (
                        <div className="space-y-2.5">
                          <span className="text-[11px] font-bold text-slate-400 uppercase">
                            Mệnh đề Đúng / Sai 4 ý:
                          </span>
                          <div className="space-y-2">
                            {q.statements.map((st, sIdx) => {
                              const letter = String.fromCharCode(97 + sIdx);
                              return (
                                <div
                                  key={st.id}
                                  className="p-3 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                >
                                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                    <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                                      {letter})
                                    </span>
                                    <div className="flex-1 space-y-1">
                                      <input
                                        type="text"
                                        value={st.text}
                                        onChange={(e) => handleUpdateStatementText(idx, st.id, e.target.value)}
                                        className="w-full text-xs font-medium text-slate-900 bg-transparent border-b border-transparent focus:border-indigo-400 focus:outline-none"
                                      />
                                      <div className="text-[11px] text-slate-700">
                                        <LatexPreview content={st.text} />
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleStatement(idx, st.id, true)}
                                      className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                                        st.correctAnswer === true
                                          ? "bg-emerald-600 text-white shadow-2xs"
                                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                      }`}
                                    >
                                      Đúng
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleStatement(idx, st.id, false)}
                                      className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                                        st.correctAnswer === false
                                          ? "bg-red-600 text-white shadow-2xs"
                                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                      }`}
                                    >
                                      Sai
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Question Short Answer */}
                      {q.type === "short_answer" && (
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold text-slate-400 uppercase">
                            Đáp án chấp nhận (Số hoặc biểu thức ngắn):
                          </label>
                          <input
                            type="text"
                            value={q.acceptedAnswers?.[0] || ""}
                            onChange={(e) => handleUpdateAcceptedAnswer(idx, e.target.value)}
                            placeholder="Ví dụ: 12.5 hoặc -3"
                            className="w-full max-w-sm px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      )}

                      {/* Explanation */}
                      <div className="space-y-1.5 pt-1">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase">
                          Lời giải chi tiết:
                        </label>
                        <textarea
                          rows={2}
                          value={q.explanation || ""}
                          onChange={(e) => handleUpdateExplanation(idx, e.target.value)}
                          placeholder="Lời giải chi tiết cho câu hỏi này..."
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                        />
                        {q.explanation && (
                          <div className="p-2.5 bg-amber-50/50 rounded-xl text-[11px] text-amber-900 leading-relaxed border border-amber-100">
                            <LatexPreview content={q.explanation} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Bottom Action Buttons */}
              {questions.length > 0 && (
                <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-4 z-20">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportJson}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4" /> Xuất JSON
                    </button>
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Printer className="w-4 h-4" /> In / PDF
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={isSavingExam}
                    onClick={handleSaveAndPublishExam}
                    className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingExam ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang lưu đề thi & tạo thư mục...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-amber-300" />
                        <span>Lưu đề thi (Không công khai - Lấy link gửi con)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================== TAB 3: HƯỚNG DẪN CHATGPT & MÃ CODE =================== */}
        {activeTab === "guide" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Guide Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900">
                      Hướng dẫn tạo đề chi tiết cho Phụ huynh qua mã Code & Prompt mẫu
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Cách nhanh nhất để tạo một bộ đề kiểm tra hoàn chỉnh chuẩn 100% định dạng DkTEST.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowGptModal(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Mở bảng tùy biến Prompt (Schema v3)</span>
                </button>
              </div>

              {/* 3 Steps Blueprint */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                      1
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-sm">Copy Prompt & Schema</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Bấm nút <strong>"Copy Prompt Mẫu kèm Schema"</strong> ở khung bên dưới. Khối mã chứa đầy đủ quy chuẩn 4 dạng câu hỏi trắc nghiệm.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                      2
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-sm">Dán vào ChatGPT / AI</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Mở ChatGPT, Claude hoặc Gemini, dán prompt vào và thay đổi thông tin môn học, lớp, hoặc chụp ảnh bài tập SGK gửi kèm.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                      3
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-sm">Dán JSON & Lưu đề</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Copy khối mã JSON mà ChatGPT phản hồi, sang tab <strong>"Tạo đề & Sửa "</strong> để nạp đề tức thì và lấy link gửi con!
                  </p>
                </div>
              </div>

              {/* Master Prompt Template Card */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      Mẫu câu lệnh Prompt chuẩn gửi cho ChatGPT (Code template):
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(GUIDE_PROMPT_TEMPLATE);
                      setCopiedPrompt(true);
                      setTimeout(() => setCopiedPrompt(false), 2000);
                      showToast("Đã sao chép prompt mẫu kèm Schema vào bộ nhớ tạm!", "success");
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedPrompt ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedPrompt ? "Đã copy!" : "Copy Prompt Mẫu kèm Schema"}</span>
                  </button>
                </div>

                <pre className="p-4 bg-slate-900 text-slate-100 rounded-2xl text-xs font-mono overflow-x-auto max-h-96 leading-relaxed scrollbar-thin whitespace-pre-wrap">
                  {GUIDE_PROMPT_TEMPLATE}
                </pre>
              </div>

              {/* Supported Features Checklist */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-5 space-y-3">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Đầy đủ 4 dạng câu hỏi được hỗ trợ trong hệ thống DkTEST:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700 font-medium">
                  <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-indigo-100">
                    <span className="font-bold text-indigo-600 shrink-0">1. single_choice:</span>
                    <span>Trắc nghiệm 1 đáp án đúng (A, B, C, D)</span>
                  </div>
                  <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-indigo-100">
                    <span className="font-bold text-indigo-600 shrink-0">2. multiple_choice:</span>
                    <span>Trắc nghiệm nhiều đáp án đúng (chọn nhiều đáp án)</span>
                  </div>
                  <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-indigo-100">
                    <span className="font-bold text-indigo-600 shrink-0">3. true_false:</span>
                    <span>Trắc nghiệm Đúng / Sai 4 ý a, b, c, d (chuẩn thi tốt nghiệp mới)</span>
                  </div>
                  <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-indigo-100">
                    <span className="font-bold text-indigo-600 shrink-0">4. short_answer:</span>
                    <span>Điền đáp án số hoặc biểu thức ngắn</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: Thêm liên kết tài khoản con */}
      {showAddChildModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5 border border-slate-200 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-indigo-600" />
                Liên kết tài khoản con
              </h3>
              <button
                type="button"
                onClick={() => setShowAddChildModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendLink} className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Nhập <strong>tên đăng nhập (username)</strong> của con trên hệ thống DkTEST. Hệ thống sẽ gửi thông báo tới con để yêu cầu xác nhận.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Username của con <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={childUsernameInput}
                  onChange={(e) => setChildUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  placeholder="Ví dụ: hs123456"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddChildModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSendingRequest}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSendingRequest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Gửi yêu cầu liên kết</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Chia sẻ link bài thi cho con */}
      {showShareModal && savedShareLink && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-7 space-y-5 border border-slate-200 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Đã lưu đề thi thành công!
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-1 text-amber-900">
                <div className="font-extrabold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Chế độ: Không công khai (Chỉ ai có link mới xem được)
                </div>
                <p className="text-amber-800/90 leading-relaxed">
                  Đề thi này không xuất hiện trên trang chủ công khai của học sinh khác. Phụ huynh chỉ cần copy link dưới đây gửi cho con để làm bài.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Đường link làm bài thi:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={savedShareLink}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(savedShareLink);
                      setCopiedShareLink(true);
                      setTimeout(() => setCopiedShareLink(false), 2000);
                      showToast("Đã sao chép link đề thi vào Clipboard!", "success");
                    }}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {copiedShareLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedShareLink ? "Đã copy!" : "Copy link"}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ChatGPT Master Prompt Generator Modal */}
      <ChatGPTMasterPromptModal
        isOpen={showGptModal}
        onClose={() => setShowGptModal(false)}
      />

      {/* Delete Exam Confirm Modal */}
      <ConfirmModal
        isOpen={!!examToDelete}
        onClose={() => setExamToDelete(null)}
        onConfirm={handleConfirmDeleteExam}
        isLoading={isDeletingExam}
        title="Xác nhận xóa đề thi"
        message={
          examToDelete ? (
            <div>
              Bạn có chắc chắn muốn xóa bài thi <strong>"{examToDelete.title}"</strong>?
              <p className="text-red-600 font-semibold text-xs mt-2">
                ⚠️ Cảnh báo: Thao tác này sẽ xóa vĩnh viễn toàn bộ cấu trúc câu hỏi và tất cả bài nộp của bài thi này.
              </p>
            </div>
          ) : (
            ""
          )
        }
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        variant="danger"
      />
    </div>
  );
}
