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
} from "lucide-react";
import {
  sendParentLinkRequest,
  getLinkedChildrenForParent,
  getPendingRequestsSentByParent,
  type LinkedChildInfo,
  type ParentLinkRequest,
} from "../../services/parentService";
import {
  subscribeToActiveSessions,
  type ActiveSession,
} from "../../services/realtimeProctoringService";
import {
  saveParentExam,
  getParentCreatedExams,
} from "../../services/parentExamService";
import type { Question, Exam } from "../../types";
import LatexPreview from "../../features/exam-builder/editor/LatexPreview";
import { useToast } from "../../components/ui/ToastNotification";
import ChatGPTMasterPromptModal from "../../components/ui/ChatGPTMasterPromptModal";
import {
  MASTER_SCHEMA_JSON_STRING,
  FULL_DKTEST_JSON_SCHEMA_TEXT,
} from "../../utils/prompt/chatGptMasterPrompt";

export default function ParentDashboard() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [parentInfo, setParentInfo] = useState<{ username: string; displayName: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"monitor" | "create" | "guide">("monitor");

  // Monitoring State
  const [linkedChildren, setLinkedChildren] = useState<LinkedChildInfo[]>([]);
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

  // Created Exam Data (Azota preview & direct edit)
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

  useEffect(() => {
    const role = localStorage.getItem("auth_role");
    const pStr = localStorage.getItem("parent_info");
    if (role !== "parent" && !pStr) {
      navigate("/parent/login", { replace: true });
      return;
    }

    if (pStr) {
      try {
        const parsed = JSON.parse(pStr);
        setParentInfo(parsed);
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

  // Direct toggle question option in Azota view
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
              <Link
                to="/admin/dashboard"
                className="px-2.5 py-1 hover:text-blue-700 rounded-lg transition-colors flex items-center gap-1"
                title="Chuyển sang Quản trị Giáo viên"
              >
                <span>👨‍🏫 Giáo viên</span>
              </Link>
              <Link
                to="/"
                className="px-2.5 py-1 hover:text-slate-900 rounded-lg transition-colors hidden sm:flex items-center gap-1"
                title="Về Cổng Thí sinh / Trang chủ"
              >
                <span>🎓 Học sinh</span>
              </Link>
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
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-2 border-t border-slate-100 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("monitor")}
            className={`py-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "monitor"
                ? "border-indigo-600 text-indigo-700 bg-indigo-50/50"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Giám sát việc học của con</span>
            {linkedChildren.length > 0 && (
              <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 text-[10px] rounded-full">
                {linkedChildren.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("create")}
            className={`py-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "create"
                ? "border-indigo-600 text-indigo-700 bg-indigo-50/50"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Edit2 className="w-4 h-4" />
            <span>Tạo đề & Sửa Azota (Nạp JSON / Prompt)</span>
            {questions.length > 0 && (
              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] rounded-full">
                {questions.length} câu
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("guide")}
            className={`py-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "guide"
                ? "border-indigo-600 text-indigo-700 bg-indigo-50/50"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Hướng dẫn tạo đề bằng ChatGPT & Mã Code</span>
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

                      {/* Live Session Pill */}
                      {child.activeSession ? (
                        <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl text-xs font-bold shadow-2xs">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                          <span>🟢 Đang làm bài trực tiếp</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl text-xs font-semibold">
                          <span>Trạng thái: Đã nộp bài gần nhất</span>
                        </div>
                      )}
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
                            <span className="text-xs font-bold text-emerald-800 bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-200">
                              Đang diễn ra
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div className="bg-white/80 backdrop-blur-xs p-3 rounded-xl border border-emerald-100 flex items-center justify-between">
                            <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-blue-600" /> Còn lại:
                            </span>
                            <span className="font-mono font-black text-blue-700 text-sm">
                              {Math.floor((child.activeSession.timeLeft || 0) / 60)}:
                              {((child.activeSession.timeLeft || 0) % 60).toString().padStart(2, "0")}
                            </span>
                          </div>

                          <div className="bg-white/80 backdrop-blur-xs p-3 rounded-xl border border-emerald-100 flex items-center justify-between">
                            <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Tiến độ:
                            </span>
                            <span className="font-bold text-slate-800">
                              {child.activeSession.answeredCount || 0} / {child.activeSession.totalQuestions || "?"} câu
                            </span>
                          </div>

                          <div className="bg-white/80 backdrop-blur-xs p-3 rounded-xl border border-emerald-100 flex items-center justify-between">
                            <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                              <AlertTriangle className={`w-4 h-4 ${(child.activeSession.warnings || 0) > 0 ? "text-amber-500" : "text-slate-400"}`} />
                              Rời tab:
                            </span>
                            <span className={`font-bold ${(child.activeSession.warnings || 0) > 0 ? "text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md" : "text-slate-500"}`}>
                              {child.activeSession.warnings || 0} lần
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
                          {child.recentSubmissions.slice(0, 5).map((sub) => {
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
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Created Exams by Parent Section */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Kho đề thi phụ huynh đã lưu ({myCreatedExams.length} đề)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => parentInfo && loadParentExams(parentInfo.username)}
                  className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingMyExams ? "animate-spin" : ""}`} /> Làm mới
                </button>
              </div>

              {myCreatedExams.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">
                  Phụ huynh chưa lưu đề thi nào. Hãy sang tab "Tạo đề & Sửa Azota" để nạp JSON và lưu đề gửi cho con!
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {myCreatedExams.map((ex) => {
                    const shareUrl = `${window.location.origin}/student/exam/${ex.id}`;
                    return (
                      <div
                        key={ex.id}
                        className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 flex flex-col justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md border border-amber-200 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> Không công khai (Chỉ ai có link)
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-500">{ex.timeLimit || 45}p</span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm truncate">{ex.title}</h4>
                          <p className="text-xs text-slate-500">{ex.questionCount || 0} câu hỏi</p>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(shareUrl);
                              showToast(`Đã sao chép link đề "${ex.title}"!`, "success");
                            }}
                            className="flex-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                          >
                            <Share2 className="w-3.5 h-3.5" /> Sao chép link gửi con
                          </button>
                          <Link
                            to={`/student/exam/${ex.id}`}
                            className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold"
                            title="Xem trang làm bài"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================== TAB 2: TẠO ĐỀ & SỬA AZOTA (JSON / PROMPT) =================== */}
        {activeTab === "create" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Input Switcher & Master Prompt Action */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Edit2 className="w-5 h-5 text-indigo-600" />
                    Tạo đề & Chỉnh sửa giao diện Azota
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Phụ huynh có thể nạp nhanh đề qua mã JSON hoặc sinh đề tự động bằng AI, sau đó chỉnh sửa và xuất đề.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowGptModal(true)}
                    className="px-3.5 py-1.5 bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Tạo Prompt ChatGPT (Full Schema v3)</span>
                  </button>

                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setCreateMode("json")}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        createMode === "json"
                          ? "bg-white text-indigo-700 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Code className="w-3.5 h-3.5" />
                      <span>Nạp JSON</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateMode("prompt")}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        createMode === "prompt"
                          ? "bg-white text-indigo-700 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Tạo bằng AI Prompt</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Sample Prompt Presets Chips */}
              <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" /> Mẫu prompt ChatGPT chuẩn cấu trúc (Click để nạp nhanh):
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowGptModal(true)}
                    className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Tùy biến chi tiết ➔
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  {SAMPLE_PROMPT_PRESETS.map((preset, pIdx) => (
                    <button
                      key={`preset-${pIdx}`}
                      type="button"
                      onClick={() => {
                        setPromptInput(preset.prompt);
                        setCreateMode("prompt");
                        navigator.clipboard.writeText(
                          `\`json\n${MASTER_SCHEMA_JSON_STRING}\n\`\n\n${preset.prompt}`
                        );
                        showToast(`Đã nạp prompt và copy vào Clipboard: "${preset.label}"!`, "success");
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                      title="Click để chọn và copy prompt đầy đủ"
                    >
                      <span>📌 {preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode A: JSON input */}
              {createMode === "json" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Dán nội dung JSON vào đây (hoặc tải tệp .json):</span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" /> Tải tệp JSON từ máy
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".json"
                      className="hidden"
                    />
                  </div>

                  <textarea
                    rows={6}
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder='{"title": "Đề ôn tập", "questions": [...]}'
                    className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />

                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setShowGptModal(true)}
                      className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Xem prompt mẫu cho ChatGPT để lấy JSON
                    </button>

                    <button
                      type="button"
                      onClick={() => handleParseJson(jsonInput)}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Nạp đề & Mở xem trước Azota</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Mode B: Prompt input */
                <form onSubmit={handleGenerateAiPrompt} className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700">
                    Nhập yêu cầu đề thi cho AI (Ví dụ: "Tạo 5 câu trắc nghiệm Toán 9 Hình học đường tròn có lời giải"):
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    placeholder="Nhập nội dung hoặc dán bài tập SGK tại đây..."
                    className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setShowGptModal(true)}
                      className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Mở bảng tùy biến prompt nâng cao
                    </button>

                    <button
                      type="submit"
                      disabled={isGeneratingAi}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isGeneratingAi ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>AI đang tạo đề...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>Tạo đề ngay với AI</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* AZOTA-STYLE VISUAL PREVIEW & DIRECT EDITOR FOR PARENT (SPLIT-VIEW) */}
            {questions.length > 0 && (
              <div className="space-y-4">
                {/* Action bar for Parent: Save/Publish & Copy Link & Export */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsMatrixOpen(!isMatrixOpen)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                        isMatrixOpen
                          ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                          : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 shadow-2xs"
                      }`}
                      title={isMatrixOpen ? "Ẩn ma trận đáp án" : "Hiện ma trận đáp án"}
                    >
                      {isMatrixOpen ? (
                        <>
                          <PanelLeftClose className="w-3.5 h-3.5" />
                          <span>Ẩn ma trận</span>
                        </>
                      ) : (
                        <>
                          <PanelLeftOpen className="w-3.5 h-3.5" />
                          <span>Hiện ma trận</span>
                        </>
                      )}
                    </button>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-lg">
                          Xem trước Azota
                        </span>
                        <h3 className="font-extrabold text-slate-900 text-sm sm:text-base truncate max-w-xs sm:max-w-md">
                          {examTitle}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400">
                        {questions.length} câu • Click đáp án/sửa trực tiếp từng câu • Lưu đề lấy link gửi con
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span className="hidden sm:inline">In / Xuất PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportJson}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">Xuất JSON</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveAndPublishExam}
                      disabled={isSavingExam}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSavingExam ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Share2 className="w-4 h-4" />
                      )}
                      <span>Lưu đề & Lấy link gửi con</span>
                    </button>
                  </div>
                </div>

                {/* Exam Title & Time editor inline */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-slate-200 text-xs">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="font-bold text-slate-600">Tiêu đề đề thi:</label>
                    <input
                      type="text"
                      value={examTitle}
                      onChange={(e) => setExamTitle(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Thời gian (phút):</label>
                    <input
                      type="number"
                      value={examTimeLimit}
                      onChange={(e) => setExamTimeLimit(parseInt(e.target.value) || 45)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* 2-Column Split Workspace with Independent Scrollbars */}
                <div className="h-[780px] max-h-[82vh] flex flex-col lg:flex-row overflow-hidden rounded-3xl border border-slate-200 bg-slate-100/70 p-3 sm:p-4 gap-4">
                  {/* Left Column: Ma trận đáp án Azota with independent scrolling */}
                  {isMatrixOpen && (
                    <aside className="w-full lg:w-72 h-48 lg:h-full flex flex-col bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm shrink-0 overflow-hidden space-y-3 animate-in fade-in slide-in-from-left-2 duration-200">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                          <h4 className="font-extrabold text-xs uppercase tracking-wide text-slate-900">
                            Ma trận đáp án
                          </h4>
                        </div>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                          {questions.length} câu
                        </span>
                      </div>

                      {/* Search */}
                      <div className="relative shrink-0">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Tìm câu số..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-7 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Scrollable Questions Matrix Grid */}
                      <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin min-h-0">
                        <div className="grid grid-cols-2 gap-1.5">
                          {questions.map((q, idx) => {
                            const filtered = searchTerm
                              ? `câu ${idx + 1}`.includes(searchTerm.toLowerCase()) || `${idx + 1}`.includes(searchTerm)
                              : true;
                            if (!filtered) return null;

                            const summary = getQuestionSummary(q);
                            const isUnanswered = summary === "?";
                            const isCurrentlyEditing = editingQuestionId === q.id;

                            return (
                              <button
                                key={`parent-side-q-${q.id}`}
                                type="button"
                                onClick={() => scrollToQuestion(idx)}
                                className={`p-2 rounded-xl text-xs border transition-all text-left flex flex-col justify-between cursor-pointer group hover:scale-[1.02] ${
                                  isCurrentlyEditing
                                    ? "bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/30 shadow-xs"
                                    : isUnanswered
                                    ? "bg-red-50 text-red-900 border-red-200 hover:bg-red-100"
                                    : "bg-emerald-50/80 text-emerald-950 border-emerald-300 hover:bg-emerald-100/90 shadow-2xs"
                                }`}
                                title={`Câu ${idx + 1}: Click để nhảy tới câu này`}
                              >
                                <div className="flex items-center justify-between font-bold">
                                  <span className="text-slate-800 font-extrabold text-[11px]">Câu {idx + 1}</span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                                      isCurrentlyEditing
                                        ? "bg-indigo-600 text-white"
                                        : isUnanswered
                                        ? "bg-red-200 text-red-900"
                                        : "bg-emerald-600 text-white"
                                    }`}
                                  >
                                    {summary}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="p-2 bg-indigo-50/70 border border-indigo-100 rounded-xl text-[10px] text-indigo-900 font-medium shrink-0">
                        💡 Click câu hỏi để cuộn nhanh đến câu đó trên trang đề.
                      </div>
                    </aside>
                  )}

                  {/* Right Column: Independent Scrolling Paper Document (Only this area scrolls) */}
                  <div
                    ref={rightPaperRef}
                    className="flex-1 h-full overflow-y-auto bg-white border border-slate-200 rounded-2xl p-5 sm:p-8 shadow-xs space-y-6 min-h-0 scroll-smooth scrollbar-thin"
                  >
                    {/* Exam Header */}
                    <div className="border-b-2 border-slate-800 pb-5 text-center space-y-1.5">
                      <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                        ĐỀ THI TỰ LUYỆN DÀNH CHO CON
                      </div>
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">
                        {examTitle || "BÀI THI CHƯA ĐẶT TÊN"}
                      </h2>
                      <div className="flex items-center justify-center gap-3 text-xs font-semibold text-slate-600 pt-0.5">
                        <span>Thời gian làm bài: <strong>{examTimeLimit} phút</strong></span>
                        <span>•</span>
                        <span>Số câu hỏi: <strong>{questions.length} câu</strong></span>
                      </div>
                    </div>

                    {/* Questions List */}
                    <div className="space-y-6">
                      {questions.map((q, qIdx) => {
                        const isEditing = editingQuestionId === q.id;

                        return (
                          <div
                            id={`parent-preview-q-${qIdx}`}
                            key={q.id}
                            className="bg-slate-50/50 border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3 transition-all"
                          >
                            {/* Question Header */}
                            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5 flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 bg-indigo-600 text-white font-black text-xs rounded-md">
                                  Câu {qIdx + 1}
                                </span>
                                <span className="text-xs font-bold text-slate-500 uppercase">
                                  {q.type === "single_choice" && "Trắc nghiệm 1 đáp án"}
                                  {q.type === "multiple_choice" && "Trắc nghiệm nhiều đáp án"}
                                  {q.type === "true_false" && "Đúng / Sai 4 ý"}
                                  {q.type === "short_answer" && "Điền đáp án ngắn"}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingQuestionId(isEditing ? null : q.id)}
                                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit2 className="w-3 h-3 text-indigo-600" />
                                  <span>{isEditing ? "Đóng sửa" : "Sửa trực tiếp (Đề & Lời giải & Đáp án)"}</span>
                                </button>
                              </div>
                            </div>

                            {/* In-place Comprehensive Edit Form */}
                            {isEditing ? (
                              <div className="space-y-4 bg-white p-4 rounded-xl border border-indigo-200 shadow-2xs">
                                <div>
                                  <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Nội dung câu hỏi (hỗ trợ công thức $...$):
                                  </label>
                                  <textarea
                                    rows={3}
                                    value={q.text}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setQuestions((prev) => {
                                        const next = [...prev];
                                        next[qIdx] = { ...next[qIdx], text: val };
                                        return next;
                                      });
                                    }}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white"
                                  />
                                </div>

                                {/* EDIT OPTIONS FOR SINGLE & MULTIPLE CHOICE */}
                                {(q.type === "single_choice" || q.type === "multiple_choice") && (
                                  <div className="space-y-2 border-t border-slate-100 pt-3">
                                    <div className="flex items-center justify-between">
                                      <label className="text-xs font-bold text-slate-700">
                                        Chỉnh sửa nội dung các phương án & chọn đáp án đúng:
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setQuestions((prev) => {
                                            const next = [...prev];
                                            const targetQ = { ...next[qIdx] };
                                            const newOptId = `opt_${Date.now()}`;
                                            targetQ.options = [
                                              ...(targetQ.options || []),
                                              { id: newOptId, text: `Phương án mới` },
                                            ];
                                            next[qIdx] = targetQ;
                                            return next;
                                          });
                                        }}
                                        className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                                      >
                                        <Plus className="w-3 h-3" /> Thêm phương án
                                      </button>
                                    </div>

                                    <div className="space-y-2">
                                      {q.options?.map((opt, oIdx) => {
                                        const letter = String.fromCharCode(65 + oIdx);
                                        const isCorrect = q.correctOptionIds?.includes(opt.id);

                                        return (
                                          <div
                                            key={opt.id}
                                            className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200"
                                          >
                                            <button
                                              type="button"
                                              onClick={() => handleToggleOption(qIdx, opt.id)}
                                              className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                                                isCorrect
                                                  ? "bg-emerald-600 text-white shadow-2xs"
                                                  : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                                              }`}
                                              title={isCorrect ? "Đáp án ĐÚNG (Click để bỏ)" : "Click để đặt làm đáp án ĐÚNG"}
                                            >
                                              {letter}
                                            </button>

                                            <input
                                              type="text"
                                              value={opt.text}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                setQuestions((prev) => {
                                                  const next = [...prev];
                                                  const targetQ = { ...next[qIdx] };
                                                  targetQ.options = (targetQ.options || []).map((o) =>
                                                    o.id === opt.id ? { ...o, text: val } : o
                                                  );
                                                  next[qIdx] = targetQ;
                                                  return next;
                                                });
                                              }}
                                              className="flex-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                                              placeholder={`Nội dung đáp án ${letter}...`}
                                            />

                                            <button
                                              type="button"
                                              onClick={() => {
                                                setQuestions((prev) => {
                                                  const next = [...prev];
                                                  const targetQ = { ...next[qIdx] };
                                                  targetQ.options = (targetQ.options || []).filter((o) => o.id !== opt.id);
                                                  targetQ.correctOptionIds = (targetQ.correctOptionIds || []).filter(
                                                    (id) => id !== opt.id
                                                  );
                                                  next[qIdx] = targetQ;
                                                  return next;
                                                });
                                              }}
                                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                              title="Xóa phương án"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* EDIT STATEMENTS FOR TRUE/FALSE */}
                                {q.type === "true_false" && (
                                  <div className="space-y-2 border-t border-slate-100 pt-3">
                                    <label className="text-xs font-bold text-slate-700">
                                      Chỉnh sửa nội dung từng ý và chọn Đúng/Sai:
                                    </label>
                                    <div className="space-y-2">
                                      {q.statements?.map((stmt, sIdx) => {
                                        const letter = String.fromCharCode(97 + sIdx);
                                        return (
                                          <div
                                            key={stmt.id}
                                            className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200"
                                          >
                                            <span className="font-bold text-indigo-700 text-xs px-2 py-1 bg-white rounded-lg border border-slate-200 shrink-0">
                                              {letter})
                                            </span>

                                            <input
                                              type="text"
                                              value={stmt.text}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                setQuestions((prev) => {
                                                  const next = [...prev];
                                                  const targetQ = { ...next[qIdx] };
                                                  targetQ.statements = (targetQ.statements || []).map((s) =>
                                                    s.id === stmt.id ? { ...s, text: val } : s
                                                  );
                                                  next[qIdx] = targetQ;
                                                  return next;
                                                });
                                              }}
                                              className="flex-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                                            />

                                            <div className="flex items-center gap-1 shrink-0">
                                              <button
                                                type="button"
                                                onClick={() => handleToggleStatement(qIdx, stmt.id, true)}
                                                className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                                                  stmt.correctAnswer === true
                                                    ? "bg-emerald-600 text-white border-emerald-600"
                                                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                                                }`}
                                              >
                                                Đúng
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleToggleStatement(qIdx, stmt.id, false)}
                                                className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                                                  stmt.correctAnswer === false
                                                    ? "bg-red-600 text-white border-red-600"
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
                                  </div>
                                )}

                                {/* EDIT ACCEPTED ANSWERS FOR SHORT ANSWER */}
                                {q.type === "short_answer" && (
                                  <div className="space-y-1.5 border-t border-slate-100 pt-3">
                                    <label className="text-xs font-bold text-slate-700">
                                      Các đáp án chấp nhận (ngăn cách bởi dấu phẩy):
                                    </label>
                                    <input
                                      type="text"
                                      value={(q.acceptedAnswers || []).join(", ")}
                                      onChange={(e) => {
                                        const parts = e.target.value
                                          .split(",")
                                          .map((p) => p.trim())
                                          .filter(Boolean);
                                        setQuestions((prev) => {
                                          const next = [...prev];
                                          next[qIdx] = { ...next[qIdx], acceptedAnswers: parts };
                                          return next;
                                        });
                                      }}
                                      placeholder="Ví dụ: 9, 9.0, 9.00"
                                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                                    />
                                  </div>
                                )}

                                <div className="border-t border-slate-100 pt-3">
                                  <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Lời giải chi tiết & hướng dẫn chấm:
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={q.explanation || ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setQuestions((prev) => {
                                        const next = [...prev];
                                        next[qIdx] = { ...next[qIdx], explanation: val };
                                        return next;
                                      });
                                    }}
                                    placeholder="Hướng dẫn giải từng bước..."
                                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white"
                                  />
                                </div>
                              </div>
                            ) : (
                              /* Question Text Preview */
                              <div className="text-slate-900 text-sm sm:text-base font-semibold leading-relaxed">
                                <LatexPreview content={q.text} />
                              </div>
                            )}

                            {/* Options / Statements selector (Azota click to pick correct) */}
                            {!isEditing && (
                              <div className="space-y-2 pt-1">
                                {(q.type === "single_choice" || q.type === "multiple_choice") && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {q.options?.map((opt, optIdx) => {
                                      const letter = String.fromCharCode(65 + optIdx);
                                      const isCorrect = q.correctOptionIds?.includes(opt.id);

                                      return (
                                        <button
                                          key={opt.id}
                                          type="button"
                                          onClick={() => handleToggleOption(qIdx, opt.id)}
                                          className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                                            isCorrect
                                              ? "bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-2xs"
                                              : "bg-white border-slate-200 hover:bg-slate-100 text-slate-800"
                                          }`}
                                        >
                                          <span
                                            className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                                              isCorrect ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 border"
                                            }`}
                                          >
                                            {letter}
                                          </span>
                                          <div className="flex-1 text-xs sm:text-sm pt-0.5">
                                            <LatexPreview content={opt.text} />
                                          </div>
                                          {isCorrect && (
                                            <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded shrink-0 self-center">
                                              ĐÚNG
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}

                                {q.type === "true_false" && (
                                  <div className="space-y-2">
                                    {q.statements?.map((stmt, sIdx) => {
                                      const letter = String.fromCharCode(97 + sIdx);
                                      return (
                                        <div
                                          key={stmt.id}
                                          className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                                        >
                                          <div className="flex items-start gap-2 flex-1">
                                            <span className="font-bold text-indigo-700 bg-slate-100 px-1.5 py-0.5 rounded border">
                                              {letter})
                                            </span>
                                            <div className="text-slate-800 font-medium">
                                              <LatexPreview content={stmt.text} />
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                              type="button"
                                              onClick={() => handleToggleStatement(qIdx, stmt.id, true)}
                                              className={`px-2.5 py-1 rounded-lg font-bold border transition-colors cursor-pointer ${
                                                stmt.correctAnswer === true
                                                  ? "bg-emerald-600 text-white border-emerald-600"
                                                  : "bg-white text-slate-700 border-slate-300"
                                              }`}
                                            >
                                              Đúng
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleToggleStatement(qIdx, stmt.id, false)}
                                              className={`px-2.5 py-1 rounded-lg font-bold border transition-colors cursor-pointer ${
                                                stmt.correctAnswer === false
                                                  ? "bg-red-600 text-white border-red-600"
                                                  : "bg-white text-slate-700 border-slate-300"
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

                                {q.type === "short_answer" && (
                                  <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-xs space-y-1">
                                    <span className="font-bold text-amber-900">Đáp án chấp nhận:</span>
                                    <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-amber-300 ml-2">
                                      {(q.acceptedAnswers || []).join(", ") || "Chưa thiết lập"}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Explanation section */}
                            {q.explanation && !isEditing && (
                              <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs space-y-1 text-slate-800">
                                <span className="font-bold text-indigo-900 block">Lời giải chi tiết:</span>
                                <LatexPreview content={q.explanation} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================== TAB 3: HƯỚNG DẪN TẠO ĐỀ CHATGPT =================== */}
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
                    Copy khối mã JSON mà ChatGPT phản hồi, sang tab <strong>"Tạo đề & Sửa Azota"</strong> để nạp đề tức thì và lấy link gửi con!
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
    </div>
  );
}
