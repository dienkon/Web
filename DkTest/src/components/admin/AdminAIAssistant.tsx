import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Maximize2,
  Minimize2,
  Trash2,
  RefreshCw,
  Compass,
  Search,
  CheckCircle2,
  ArrowRight,
  SunMoon,
  PanelLeftClose,
  Activity,
  Copy,
  Check,
  Paperclip,
  Settings,
  Bot,
  User,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  HelpCircle,
  Zap,
  Ticket,
  BookOpen,
  Layers,
  Play,
  RotateCcw,
  CheckCheck,
  Wrench,
  ExternalLink,
  Workflow,
  Tag,
  Users,
  Shield,
  Coins,
  FileText,
} from "lucide-react";
import clsx from "clsx";
import LatexPreview from "../../features/exam-builder/editor/LatexPreview";
import { useToast } from "../ui/ToastNotification";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import {
  scanDataHealth,
  repairDataHealth,
  approveUserAccount,
  suspendUserAccount,
  reactivateUserAccount,
  deleteUserAccount,
  updateSystemSettings,
} from "../../services/adminService";
import {
  createAdminVoucherApi,
  updateAdminVoucherApi,
  deleteAdminVoucherApi,
  getAdminVouchersApi,
  adminDirectEditWalletApi,
  getAdminStudentWalletDetails,
  approveDepositRequest,
  rejectDepositRequest,
  grantOrRevokeExamEntitlement,
  mergeExamsApi,
} from "../../services/walletClientService";
import { createExam, updateExam, deleteExam, getExam } from "../../services/examService";
import { importJsonToFirestore } from "../../services/jsonImportService";
import { createAssignment } from "../../services/assignmentService";
import { api } from "../../services/apiClient";
import {
  AdminAssistantAction,
  AdminAssistantMessage,
  AdminPageContext,
  parseActionsFromAiText,
  interpolateWorkflowParams,
  WorkflowExecutionContext,
} from "../../services/ai/aiAdminAssistant";

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  cleanText?: string;
  actions?: AdminAssistantAction[];
  timestamp: string;
  attachment?: {
    name: string;
    type: string;
    data: string;
    size?: number;
  };
}

const STORAGE_KEY_MESSAGES = "dktest_admin_ai_messages_v1";
const STORAGE_KEY_API_KEY = "dktest_gemini_api_key";
const MODEL_NAME = "gemini-3.5-flash-lite";

// Route name mapping for quick reference
const ROUTE_NAMES: Record<string, string> = {
  "/admin/dashboard": "Tổng quan Dashboard",
  "/admin/exams": "Quản lý Đề thi",
  "/admin/exams/new": "Tạo đề thi mới",
  "/admin/exams/import-word": "Nhập đề từ Word AI",
  "/admin/exams/import-prompt": "Tạo đề bằng AI Prompt",
  "/admin/exams/web-importer": "Web to DkTEST Importer",
  "/admin/students": "Quản lý Học sinh",
  "/admin/parents": "Quản lý Phụ huynh",
  "/admin/classes": "Quản lý Lớp học",
  "/admin/wallet": "Quản lý Ví & Công nợ",
  "/admin/question-bank": "Ngân hàng câu hỏi",
  "/admin/journey-studio": "Xưởng Chiến Dịch Học Tập",
  "/admin/live-proctoring": "Giám sát Phòng thi Trực tiếp",
  "/admin/submissions": "Danh sách Bài nộp",
  "/admin/stats": "Thống kê & Phổ điểm",
  "/admin/data-health": "Kiểm tra Sức khỏe Dữ liệu",
  "/admin/audit-logs": "Nhật ký Hệ thống",
  "/admin/system-health": "System Health",
  "/admin/settings": "Cài đặt Hệ thống",
  "/admin/legal-policy": "Bản quyền & Pháp lý",
};

export default function AdminAIAssistant() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast, success: toastSuccess, error: toastError } = useToast();
  const { toggleTheme } = useTheme();
  const { user, userProfile, role } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => localStorage.getItem(STORAGE_KEY_API_KEY) || "");
  const [savedApiKey, setSavedApiKey] = useState(() => localStorage.getItem(STORAGE_KEY_API_KEY) || "");

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY_MESSAGES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return [
      {
        id: "welcome",
        role: "model",
        text: `Chào Quản trị viên! Tôi là **Trợ lý Quản trị Admin AI Agent** ⚡ (vận hành bằng mô hình **${MODEL_NAME}**).\n\nTôi có thể tự động thực thi các tác vụ quản trị hoặc chuỗi quy trình tự động hóa nhiều bước (Make.com Flow):\n- **Tạo Voucher & Quản lý Ví**: Tạo mã giảm giá trực tiếp, nạp/rút tiền ví học sinh\n- **Sinh Đề thi AI & Lưu CSDL**: Tạo đề trắc nghiệm chuẩn cấu trúc và lưu vào Firestore trong 1 chạm\n- **Tự động hóa Quy trình (Workflows)**: Ghép nối các tác vụ thành chuỗi tự động\n- **Điều hướng & Thao tác DOM**: Tìm kiếm, điền form, kiểm tra sức khỏe hệ thống\n\nBạn có thể bật **Auto-pilot** ở thanh tiêu đề để tôi tự động thực thi ngay các tác vụ được chỉ định!`,
        cleanText: `Chào Quản trị viên! Tôi là **Trợ lý Quản trị Admin AI Agent** ⚡ (vận hành bằng mô hình **${MODEL_NAME}**).\n\nTôi có thể tự động thực thi các tác vụ quản trị hoặc chuỗi quy trình tự động hóa nhiều bước (Make.com Flow):\n- **Tạo Voucher & Quản lý Ví**: Tạo mã giảm giá trực tiếp, nạp/rút tiền ví học sinh\n- **Sinh Đề thi AI & Lưu CSDL**: Tạo đề trắc nghiệm chuẩn cấu trúc và lưu vào Firestore trong 1 chạm\n- **Tự động hóa Quy trình (Workflows)**: Ghép nối các tác vụ thành chuỗi tự động\n- **Điều hướng & Thao tác DOM**: Tìm kiếm, điền form, kiểm tra sức khỏe hệ thống\n\nBạn có thể bật **Auto-pilot** ở thanh tiêu đề để tôi tự động thực thi ngay các tác vụ được chỉ định!`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ];
  });

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{
    name: string;
    type: string;
    data: string;
    size?: number;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [executedActionIds, setExecutedActionIds] = useState<Set<string>>(new Set());
  const [autoPilot, setAutoPilot] = useState<boolean>(() => {
    return localStorage.getItem("dktest_admin_ai_autopilot") !== "false";
  });
  const [actionResults, setActionResults] = useState<
    Record<
      string,
      {
        status: "pending" | "running" | "success" | "error";
        message?: string;
        data?: any;
        progressMsg?: string;
        progressPercent?: number;
      }
    >
  >({});

  const toggleAutoPilot = () => {
    setAutoPilot((prev) => {
      const next = !prev;
      localStorage.setItem("dktest_admin_ai_autopilot", String(next));
      if (next) {
        toastSuccess("Đã bật chế độ Tự động chạy (Auto-pilot ON)");
      } else {
        toastSuccess("Đã chuyển sang chế độ Xác nhận từng bước (Supervised Mode)");
      }
      return next;
    });
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Save messages to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  // Scroll to bottom on message change
  useEffect(() => {
    if (isOpen && !isMinimized && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen, isMinimized]);

  // Keyboard shortcut Ctrl + / or Alt + A to toggle assistant
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === "/") || (e.altKey && e.key.toLowerCase() === "a")) {
        e.preventDefault();
        setIsOpen((prev) => {
          const next = !prev;
          if (next) setIsMinimized(false);
          return next;
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Listen for custom trigger event
  useEffect(() => {
    const handleOpenEvent = () => {
      setIsOpen(true);
      setIsMinimized(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    };
    window.addEventListener("admin-open-ai-assistant", handleOpenEvent);
    return () => window.removeEventListener("admin-open-ai-assistant", handleOpenEvent);
  }, []);

  // Current page name
  const currentTabName = useMemo(() => {
    const exact = ROUTE_NAMES[location.pathname];
    if (exact) return exact;
    for (const [route, name] of Object.entries(ROUTE_NAMES)) {
      if (location.pathname.startsWith(route)) return name;
    }
    return "Quản trị DkTEST";
  }, [location.pathname]);

  // Helper to update React controlled inputs/selects/textareas
  const setReactInputValue = (element: HTMLElement, value: string) => {
    element.focus();
    const prototype = Object.getPrototypeOf(element);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    if (descriptor && descriptor.set) {
      descriptor.set.call(element, value);
    } else {
      (element as any).value = value;
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  };

  // Scrape page DOM content for live context
  const scrapeCurrentPageContext = useCallback((): AdminPageContext => {
    try {
      const pageTitle = document.title || currentTabName;
      const rootScope = document.querySelector("main") || document.querySelector("#root") || document.body;

      const isOutsideAssistant = (el: Element | null): boolean => {
        return Boolean(el && !el.closest("#admin-ai-assistant-container"));
      };

      // 1. Headings
      const headings: string[] = [];
      rootScope.querySelectorAll("h1, h2, h3").forEach((el) => {
        if (!isOutsideAssistant(el)) return;
        const text = el.textContent?.trim();
        if (text && text.length > 1 && text.length < 120 && !headings.includes(text)) {
          headings.push(text);
        }
      });

      // 2. Active Modal Dialogs if present
      let activeModalSummary = "";
      const modalOverlay = document.querySelector('[role="dialog"], .fixed.inset-0.z-50, .fixed.inset-0.z-40');
      if (modalOverlay && isOutsideAssistant(modalOverlay)) {
        const modalText = (modalOverlay.textContent || "").replace(/\s+/g, " ").trim();
        if (modalText) {
          activeModalSummary = `[MODAL/HỘP THOẠI ĐANG MỞ]: ${modalText.slice(0, 500)}`;
        }
      }

      // 3. Stat & Metric Cards
      const statCards: string[] = [];
      rootScope.querySelectorAll(".text-2xl, .text-3xl, .text-4xl, .font-bold").forEach((el) => {
        if (!isOutsideAssistant(el)) return;
        const card = el.closest(".rounded-xl, .rounded-2xl, .rounded-3xl, .p-4, .p-5, .p-6, .border");
        if (card && isOutsideAssistant(card)) {
          const text = (card.textContent || "").replace(/\s+/g, " ").trim();
          if (text && text.length > 5 && text.length < 180 && !statCards.includes(text)) {
            statCards.push(text);
          }
        }
      });

      // 4. Tables
      const tableData: string[] = [];
      rootScope.querySelectorAll("table").forEach((table, tIdx) => {
        if (!isOutsideAssistant(table)) return;
        const headers: string[] = [];
        table.querySelectorAll("th").forEach((th) => {
          const text = th.textContent?.replace(/\s+/g, " ").trim();
          if (text) headers.push(text);
        });
        const rows: string[] = [];
        table.querySelectorAll("tbody tr").forEach((tr, rIdx) => {
          if (rIdx < 25) {
            const cells: string[] = [];
            tr.querySelectorAll("td").forEach((td) => {
              const link = td.querySelector("a")?.getAttribute("href") || "";
              const t = td.textContent?.replace(/\s+/g, " ").trim() || "";
              if (link && !t.includes(link)) {
                cells.push(`${t} (link: ${link})`);
              } else if (t) {
                cells.push(t.slice(0, 100));
              }
            });
            if (cells.length > 0) rows.push(cells.join(" | "));
          }
        });
        if (headers.length > 0 || rows.length > 0) {
          tableData.push(`Bảng ${tIdx + 1} [${headers.join(" | ")}]:\n${rows.join("\n")}`);
        }
      });

      // 5. Grid/Card items (For views without tables like Exam Grid, Student cards, Live monitor tiles)
      const cardItems: string[] = [];
      if (tableData.length === 0) {
        rootScope.querySelectorAll('[role="article"], .grid > div, [draggable="true"]').forEach((card, cIdx) => {
          if (!isOutsideAssistant(card) || cIdx >= 20) return;
          const text = (card.textContent || "").replace(/\s+/g, " ").trim();
          const href = card.querySelector("a")?.getAttribute("href") || "";
          if (text && text.length > 10 && text.length < 250) {
            cardItems.push(`- Thẻ ${cIdx + 1}: ${text}${href ? ` (Link: ${href})` : ""}`);
          }
        });
      }

      // 6. Primary Action Buttons / Links on page
      const visibleActions: string[] = [];
      rootScope.querySelectorAll("button, a").forEach((btn) => {
        if (!isOutsideAssistant(btn)) return;
        const text = (btn.textContent || "").replace(/\s+/g, " ").trim();
        const title = btn.getAttribute("title") || btn.getAttribute("aria-label") || "";
        const href = btn.getAttribute("href") || "";
        const label = text || title;
        if (label && label.length > 2 && label.length < 50 && !visibleActions.includes(label)) {
          visibleActions.push(`${label}${href ? ` -> ${href}` : ""}`);
        }
      });

      // 7. Form inputs & Selects
      const inputsInfo: string[] = [];
      rootScope.querySelectorAll("input, select, textarea").forEach((input) => {
        if (!isOutsideAssistant(input)) return;
        const el = input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        const placeholder = (el as HTMLInputElement).placeholder || "";
        const label = el.labels?.[0]?.textContent?.trim() || "";
        const value = el.value || "";
        const name = el.name || el.id || "";
        if (el.tagName.toLowerCase() === "select") {
          const selectEl = el as HTMLSelectElement;
          const options = Array.from(selectEl.options).slice(0, 10).map((o) => o.text.trim()).join(", ");
          inputsInfo.push(`[select] ${label || name}: đang chọn "${value}" (các tùy chọn: ${options})`);
        } else if (name || label || placeholder || value) {
          inputsInfo.push(`[${el.tagName.toLowerCase()}] ${label || placeholder || name}: "${value.slice(0, 80)}"`);
        }
      });

      // 8. General main text sample (up to 4000 characters)
      let mainTextSample = "";
      if (rootScope) {
        const clone = rootScope.cloneNode(true) as HTMLElement;
        const assistantEl = clone.querySelector("#admin-ai-assistant-container");
        if (assistantEl) assistantEl.remove();
        clone.querySelectorAll("script, style, svg").forEach((n) => n.remove());
        mainTextSample = (clone.textContent || "").replace(/\s+/g, " ").trim().slice(0, 4000);
      }

      const domSummaryParts = [
        headings.length ? `Tiêu đề trang: ${headings.join(" > ")}` : "",
        activeModalSummary,
        statCards.length ? `Các chỉ số thống kê trên màn hình:\n${statCards.slice(0, 8).join("\n")}` : "",
        tableData.length ? `Dữ liệu bảng hiển thị trên màn hình:\n${tableData.join("\n\n")}` : "",
        cardItems.length ? `Các thẻ/mục dữ liệu trên màn hình:\n${cardItems.join("\n")}` : "",
        visibleActions.length ? `Các nút/thao tác có sẵn trên màn hình:\n${visibleActions.slice(0, 15).join(" | ")}` : "",
        inputsInfo.length ? `Các trường nhập liệu & bộ lọc:\n${inputsInfo.slice(0, 10).join("\n")}` : "",
        mainTextSample ? `Toàn bộ nội dung văn bản hiển thị: ${mainTextSample}` : "",
      ].filter(Boolean);

      const domSummary = domSummaryParts.join("\n\n");

      return {
        path: location.pathname,
        pageTitle: currentTabName,
        domSummary,
        activeModal: activeModalSummary || undefined,
        userEmail: user?.email || userProfile?.displayName || "Admin",
        userRole: role || "admin",
        searchParams: Object.fromEntries(new URLSearchParams(location.search)),
      };
    } catch (err) {
      return {
        path: location.pathname,
        pageTitle: currentTabName,
        domSummary: "Không thể trích xuất DOM",
        userEmail: user?.email || "Admin",
        userRole: role || "admin",
      };
    }
  }, [location.pathname, location.search, currentTabName, user?.email, userProfile?.displayName, role]);

  // Execute Autonomous Client Action & Make.com Workflows
  const executeAction = useCallback(
    async (
      action: AdminAssistantAction,
      parentMsgId?: string,
      workflowContext?: WorkflowExecutionContext
    ): Promise<{ success: boolean; message: string; data?: any }> => {
      // Resolve templated parameters and contextual references
      const act = workflowContext ? interpolateWorkflowParams(action, workflowContext) : action;
      const actionKey =
        act.id || `${parentMsgId || "root"}_${act.type}_${act.target || act.query || act.field || act.label}`;

      setActionResults((prev) => ({
        ...prev,
        [actionKey]: { status: "running" },
      }));

      try {
        const isOutsideAssistant = (el: Element | null): boolean => {
          return Boolean(el && !el.closest("#admin-ai-assistant-container"));
        };

        let result: { success: boolean; message: string; data?: any } = {
          success: false,
          message: "Hành động chưa được hỗ trợ",
        };

        switch (act.type) {
          // 1. CREATE_VOUCHER (Direct Firestore & REST API execution)
          case "CREATE_VOUCHER": {
            const p = act.params || act.payload || {};
            const rawCode = p.code || p.voucherCode || `DK${Math.floor(1000 + Math.random() * 9000)}`;
            const code = String(rawCode).trim().toUpperCase();
            const rawType = String(p.type || "").toLowerCase();
            let vType: any = "discount_fixed";
            if (rawType.includes("percent")) vType = "discount_percent";
            else if (rawType.includes("gift")) vType = "gift_money";
            else if (rawType.includes("bonus_percent")) vType = "deposit_bonus_percent";
            else if (rawType.includes("bonus")) vType = "deposit_bonus_fixed";

            const val = Math.max(0, Number(p.value !== undefined ? p.value : (vType === "discount_percent" ? 20 : 20000)));

            const voucherPayload = {
              code,
              name: String(p.name || `Ưu đãi ${code}`).trim(),
              type: vType,
              value: val,
              minOrderVnd: p.minOrderVnd ? Number(p.minOrderVnd) : undefined,
              maxDiscountVnd: p.maxDiscountVnd ? Number(p.maxDiscountVnd) : undefined,
              usageLimit: p.usageLimit ? Number(p.usageLimit) : undefined,
              perUserLimit: Number(p.perUserLimit || 1),
              expiresAt: p.expiresAt || null,
              isActive: p.isActive !== undefined ? Boolean(p.isActive) : true,
              description: String(p.description || "Tạo tự động bởi Admin AI").trim(),
            };

            const createdVoucher = await createAdminVoucherApi(voucherPayload);
            toastSuccess(`Đã tạo thành công voucher: ${createdVoucher.code}!`);
            window.dispatchEvent(new CustomEvent("dktest-admin-voucher-created", { detail: createdVoucher }));

            if (workflowContext) {
              workflowContext.lastVoucherCode = createdVoucher.code;
              workflowContext.lastVoucherId = createdVoucher.id;
            }

            result = {
              success: true,
              message: `Đã tạo voucher ${createdVoucher.code} (${createdVoucher.value?.toLocaleString("vi-VN")}${vType === "discount_percent" ? "%" : "đ"})`,
              data: createdVoucher,
            };
            break;
          }

          // 2. UPDATE_VOUCHER
          case "UPDATE_VOUCHER": {
            const p = act.params || act.payload || {};
            const voucherId = p.id || act.id || p.code || workflowContext?.lastVoucherId || workflowContext?.lastVoucherCode;
            if (!voucherId) throw new Error("Thiếu mã ID voucher để cập nhật");
            const updated = await updateAdminVoucherApi(voucherId, p.updates || p);
            toastSuccess(`Đã cập nhật voucher ${updated.code || voucherId}`);
            result = { success: true, message: `Đã cập nhật voucher thành công`, data: updated };
            break;
          }

          // 3. DELETE_VOUCHER
          case "DELETE_VOUCHER": {
            const p = act.params || act.payload || {};
            const voucherId = p.id || act.id || p.code || workflowContext?.lastVoucherId || workflowContext?.lastVoucherCode;
            if (!voucherId) throw new Error("Thiếu mã ID voucher để xóa");
            await deleteAdminVoucherApi(voucherId);
            toastSuccess(`Đã xóa voucher ${voucherId}`);
            result = { success: true, message: `Đã xóa voucher ${voucherId}` };
            break;
          }

          // 4. LIST_VOUCHERS
          case "LIST_VOUCHERS": {
            const vouchers = await getAdminVouchersApi();
            const count = vouchers.length;
            const topCodes = vouchers.slice(0, 5).map((v) => `${v.code} (${v.value?.toLocaleString("vi-VN")}${v.type === "discount_percent" ? "%" : "đ"})`).join(", ");
            toastSuccess(`Đã tải ${count} voucher từ hệ thống`);
            result = {
              success: true,
              message: `Hệ thống hiện có ${count} voucher: ${topCodes}${count > 5 ? ` và ${count - 5} mã khác` : ""}`,
              data: { items: vouchers, count },
            };
            break;
          }

          // 5. CREATE_EXAM_AI (Autonomous AI Exam Generation + Direct Firestore Storage)
          case "CREATE_EXAM_AI": {
            const p = act.params || act.payload || {};
            const promptText = (p.prompt || act.text || p.title || "Tạo đề thi trắc nghiệm môn Toán").trim();
            const examTitle = p.title || "Đề thi tạo bởi AI";

            setActionResults((prev) => ({
              ...prev,
              [actionKey]: { status: "running", progressMsg: "Đang kết nối AI soạn thảo câu hỏi...", progressPercent: 15 },
            }));

            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (savedApiKey) headers["x-gemini-api-key"] = savedApiKey;

            const response = await fetch("/api/ai/generate-exam-prompt-stream", {
              method: "POST",
              headers,
              body: JSON.stringify({ prompt: promptText, apiKey: savedApiKey || undefined }),
            });

            if (!response.ok) throw new Error(`Lỗi máy chủ HTTP ${response.status}`);
            if (!response.body) throw new Error("Không nhận được luồng dữ liệu stream");

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = "";
            let done = false;
            let examData: any = null;

            while (!done) {
              const { value, done: rDone } = await reader.read();
              done = rDone;
              if (value) {
                buffer += decoder.decode(value, { stream: !done });
                const events = buffer.split("\n\n");
                buffer = events.pop() || "";
                for (const ev of events) {
                  for (const line of ev.split("\n")) {
                    if (line.startsWith("data: ")) {
                      const dataStr = line.slice("data: ".length).trim();
                      if (!dataStr) continue;
                      try {
                        const d = JSON.parse(dataStr);
                        if (d.type === "log" || d.type === "progress") {
                          setActionResults((prev) => ({
                            ...prev,
                            [actionKey]: {
                              status: "running",
                              progressMsg: d.message || "Đang tạo nội dung...",
                              progressPercent: d.percent !== undefined ? d.percent : 50,
                            },
                          }));
                        } else if (d.type === "done") {
                          examData = d.result;
                        } else if (d.type === "error") {
                          throw new Error(d.message || "Lỗi tạo đề từ AI");
                        }
                      } catch (_) {}
                    }
                  }
                }
              }
            }

            if (!examData && buffer.trim().startsWith("data: ")) {
              try {
                const d = JSON.parse(buffer.trim().slice("data: ".length));
                if (d.type === "done") examData = d.result;
              } catch (_) {}
            }

            if (!examData) throw new Error("AI không thể tạo cấu trúc đề thi hợp lệ");

            setActionResults((prev) => ({
              ...prev,
              [actionKey]: { status: "running", progressMsg: "Đang lưu đề thi vào Firestore...", progressPercent: 90 },
            }));

            const createdExamId = await importJsonToFirestore(examData, "new_exam");
            const finalTitle = examData.exam?.title || examTitle;
            toastSuccess(`Đã tạo và lưu đề thi "${finalTitle}" thành công!`);

            if (workflowContext) {
              workflowContext.lastExamId = createdExamId;
              workflowContext.lastExamTitle = finalTitle;
            }

            result = {
              success: true,
              message: `Đã tạo đề thi "${finalTitle}" với ${examData.questions?.length || 0} câu hỏi!`,
              data: {
                examId: createdExamId,
                title: finalTitle,
                questionCount: examData.questions?.length || 0,
                timeLimit: examData.exam?.timeLimit || p.timeLimit || 45,
                subject: examData.exam?.subject || p.subject || "",
                editUrl: `/admin/exams/${createdExamId}/edit`,
              },
            };
            break;
          }

          // 6. CREATE_EXAM_MANUAL
          case "CREATE_EXAM_MANUAL": {
            const p = act.params || act.payload || {};
            const newExamData = {
              title: p.title || "Đề thi mới",
              code: p.code || `EX_${Date.now()}`,
              description: p.description || "",
              subject: p.subject || "",
              gradeCategory: p.gradeCategory || "",
              timeLimit: Number(p.timeLimit) || 60,
              priceVnd: Number(p.priceVnd) || 0,
              accessMode: p.accessMode || "free",
              shuffleQuestions: Boolean(p.shuffleQuestions),
              shuffleOptions: Boolean(p.shuffleOptions),
              showResults: true,
              showDetails: true,
              allowSubExam: false,
              maxAttempts: 1,
              status: (p.status as any) || "draft",
              questionCount: 0,
            };

            const created = await createExam(newExamData as any);
            toastSuccess(`Đã tạo đề thi: "${created.title}"`);

            if (workflowContext) {
              workflowContext.lastExamId = created.id;
              workflowContext.lastExamTitle = created.title;
            }

            result = {
              success: true,
              message: `Đã khởi tạo đề thi "${created.title}"`,
              data: { examId: created.id, title: created.title, editUrl: `/admin/exams/${created.id}/edit` },
            };
            break;
          }

          // 7. UPDATE_EXAM
          case "UPDATE_EXAM": {
            const p = act.params || act.payload || {};
            const examId = p.examId || act.id || workflowContext?.lastExamId;
            if (!examId) throw new Error("Thiếu examId để cập nhật");
            await updateExam(examId, p.updates || p);
            toastSuccess(`Đã cập nhật bài thi`);
            result = { success: true, message: `Đã cập nhật bài thi thành công`, data: { examId } };
            break;
          }

          // 8. DELETE_EXAM
          case "DELETE_EXAM": {
            const p = act.params || act.payload || {};
            const examId = p.examId || act.id || workflowContext?.lastExamId;
            if (!examId) throw new Error("Thiếu examId để xóa");
            await deleteExam(examId);
            toastSuccess(`Đã xóa bài thi ${examId}`);
            result = { success: true, message: `Đã xóa bài thi thành công` };
            break;
          }

          // 9. DUPLICATE_EXAM
          case "DUPLICATE_EXAM": {
            const p = act.params || act.payload || {};
            const examId = p.examId || act.id || workflowContext?.lastExamId;
            if (!examId) throw new Error("Thiếu examId để nhân bản");
            const sourceExam = await getExam(examId);
            if (!sourceExam) throw new Error(`Không tìm thấy bài thi nguồn: ${examId}`);

            const clonedTitle = p.newTitle || `[Bản sao] ${sourceExam.title}`;
            const clonedData = {
              ...sourceExam,
              title: clonedTitle,
              code: `EX_${Date.now()}`,
              status: "draft" as const,
            };
            delete (clonedData as any).id;
            delete (clonedData as any).createdAt;
            delete (clonedData as any).updatedAt;

            const cloned = await createExam(clonedData as any);
            toastSuccess(`Đã nhân bản đề thi thành công: "${cloned.title}"!`);

            if (workflowContext) {
              workflowContext.lastExamId = cloned.id;
              workflowContext.lastExamTitle = cloned.title;
            }

            result = {
              success: true,
              message: `Đã tạo bản sao đề thi "${cloned.title}"`,
              data: {
                examId: cloned.id,
                title: cloned.title,
                editUrl: `/admin/exams/${cloned.id}/edit`,
              },
            };
            break;
          }

          // 10. MERGE_EXAMS
          case "MERGE_EXAMS": {
            const p = act.params || act.payload || {};
            const sourceExamIds = p.sourceExamIds || p.examIds || [];
            if (!Array.isArray(sourceExamIds) || sourceExamIds.length < 2) {
              throw new Error("Cần chỉ định ít nhất 2 mã đề thi trong sourceExamIds để gộp đề");
            }
            const mergePayload = {
              title: p.title || "Đề thi tổng hợp",
              sourceExamIds,
              organizeMode: p.organizeMode || "by_source_exam",
              subject: p.subject || "",
              gradeCategory: p.gradeCategory || "",
              timeLimit: Number(p.timeLimit) || 60,
            };
            const mergeRes = await mergeExamsApi(mergePayload);
            toastSuccess(`Đã gộp thành công ${sourceExamIds.length} đề thi thành "${mergePayload.title}"!`);

            if (workflowContext) {
              workflowContext.lastExamId = mergeRes.newExamId;
              workflowContext.lastExamTitle = mergePayload.title;
            }

            result = {
              success: true,
              message: `Đã gộp ${sourceExamIds.length} đề thi thành công (${mergeRes.totalQuestions || 0} câu hỏi)`,
              data: {
                examId: mergeRes.newExamId,
                title: mergePayload.title,
                totalQuestions: mergeRes.totalQuestions,
                editUrl: `/admin/exams/${mergeRes.newExamId}/edit`,
              },
            };
            break;
          }

          // 11. ASSIGN_HOMEWORK
          case "ASSIGN_HOMEWORK": {
            const p = act.params || act.payload || {};
            const targetClass = p.targetClass || "all";
            const examId = p.examId || workflowContext?.lastExamId || "unknown";
            const examTitle = p.examTitle || workflowContext?.lastExamTitle || "Bài kiểm tra";
            const created = await createAssignment({
              examId,
              examTitle,
              examCode: p.examCode || "",
              targetClass,
              dueDate: p.dueDate || new Date().toISOString().split("T")[0],
              passingScore: Number(p.passingScore) || 5.0,
              createdBy: user?.email || "Admin AI",
              status: "open",
            });
            toastSuccess(`Đã giao bài thi cho lớp ${targetClass}`);
            result = { success: true, message: `Đã giao bài tập cho lớp ${targetClass}`, data: created };
            break;
          }

          // 12. MANAGE_STUDENT
          case "MANAGE_STUDENT": {
            const p = act.params || act.payload || {};
            const uid = p.uid || p.requestId || workflowContext?.lastStudentUid;
            const actType = p.action || "adjust_balance";

            if (actType === "approve") {
              if (!uid) throw new Error("Thiếu mã UID học sinh");
              await approveUserAccount(uid);
              toastSuccess(`Đã phê duyệt tài khoản học sinh`);
              result = { success: true, message: `Đã duyệt học sinh ${uid}`, data: { uid } };
            } else if (actType === "suspend") {
              if (!uid) throw new Error("Thiếu mã UID học sinh");
              await suspendUserAccount(uid, p.reason || "Khóa bởi Admin AI");
              toastSuccess(`Đã tạm khóa tài khoản học sinh`);
              result = { success: true, message: `Đã khóa học sinh ${uid}`, data: { uid } };
            } else if (actType === "reactivate") {
              if (!uid) throw new Error("Thiếu mã UID học sinh");
              await reactivateUserAccount(uid);
              toastSuccess(`Đã kích hoạt lại tài khoản học sinh`);
              result = { success: true, message: `Đã mở khóa học sinh ${uid}`, data: { uid } };
            } else if (actType === "delete") {
              if (!uid) throw new Error("Thiếu mã UID học sinh");
              await deleteUserAccount(uid);
              toastSuccess(`Đã xóa tài khoản học sinh ${uid}`);
              result = { success: true, message: `Đã xóa học sinh ${uid}`, data: { uid } };
            } else if (actType === "approve_recharge") {
              const reqId = p.requestId || uid;
              if (!reqId) throw new Error("Thiếu mã yêu cầu nạp tiền requestId");
              const rechargeRes = await approveDepositRequest(reqId, p.note);
              toastSuccess(`Đã duyệt yêu cầu nạp tiền! Số dư mới: ${rechargeRes.newBalanceVnd?.toLocaleString("vi-VN")}đ`);
              result = { success: true, message: `Đã duyệt nạp tiền thành công`, data: rechargeRes };
            } else if (actType === "reject_recharge") {
              const reqId = p.requestId || uid;
              if (!reqId) throw new Error("Thiếu mã yêu cầu nạp tiền requestId");
              const rejectRes = await rejectDepositRequest(reqId, p.reason || "Từ chối bởi Admin AI");
              toastSuccess(`Đã từ chối yêu cầu nạp tiền`);
              result = { success: true, message: `Đã từ chối yêu cầu nạp tiền`, data: rejectRes };
            } else if (actType === "grant_access") {
              if (!uid) throw new Error("Thiếu mã UID học sinh");
              const targetExamId = p.examId || workflowContext?.lastExamId;
              if (!targetExamId) throw new Error("Thiếu examId để cấp quyền");
              const grantRes = await grantOrRevokeExamEntitlement(uid, targetExamId, "grant", p.reason || "Cấp bởi Admin AI");
              toastSuccess(`Đã cấp quyền làm bài thi cho học sinh!`);
              result = { success: true, message: `Đã cấp quyền truy cập đề thi ${targetExamId}`, data: grantRes };
            } else if (actType === "adjust_balance") {
              if (!uid) throw new Error("Thiếu mã UID học sinh");
              const amount = Number(p.amountVnd || p.amount || 0);
              let newBalance = amount;
              if (p.balanceVnd !== undefined) {
                newBalance = Math.max(0, Number(p.balanceVnd));
              } else {
                try {
                  const details = await getAdminStudentWalletDetails(uid);
                  const curBal = Number(details?.wallet?.balanceVnd || 0);
                  newBalance = Math.max(0, curBal + amount);
                } catch {
                  newBalance = Math.max(0, amount);
                }
              }

              const res = await adminDirectEditWalletApi(uid, {
                balanceVnd: newBalance,
                note: p.note || `Admin AI điều chỉnh số dư ví: ${amount >= 0 ? "+" : ""}${amount.toLocaleString("vi-VN")}đ`,
              });
              toastSuccess(`Đã cập nhật số dư ví học sinh: ${newBalance.toLocaleString("vi-VN")}đ`);

              if (workflowContext) {
                workflowContext.lastStudentUid = uid;
              }

              result = {
                success: true,
                message: `Số dư mới: ${res.wallet?.balanceVnd?.toLocaleString("vi-VN")}đ`,
                data: res.wallet,
              };
            }
            break;
          }

          // 13. SYSTEM_OPERATION
          case "SYSTEM_OPERATION": {
            const p = act.params || act.payload || {};
            const op = p.operation || "scan_health";
            if (op === "scan_health") {
              toastSuccess("Đang quét toàn vẹn dữ liệu hệ thống...");
              const report = await scanDataHealth();
              result = { success: true, message: `Quét hoàn tất: ${report?.issues?.length || 0} vấn đề`, data: report };
            } else if (op === "repair_health") {
              toastSuccess("Đang tiến hành sửa chữa lỗi dữ liệu...");
              const res = await repairDataHealth([], false);
              result = { success: true, message: `Đã sửa chữa lỗi dữ liệu`, data: res };
            } else if (op === "rebuild_stats") {
              toastSuccess("Đang tái tạo toàn bộ thống kê hệ thống...");
              const rebuildRes = await api.post<{ success: boolean; message: string }>("/api/admin/stats/rebuild");
              toastSuccess("Đã tái tạo thống kê hệ thống thành công!");
              result = { success: true, message: rebuildRes?.message || "Đã tái tạo thống kê", data: rebuildRes };
            } else if (op === "update_settings") {
              toastSuccess("Đang cập nhật cấu hình hệ thống...");
              const settingsRes = await updateSystemSettings(p.settings || p.updates || {});
              toastSuccess("Đã cập nhật cấu hình hệ thống thành công!");
              result = { success: true, message: "Đã cập nhật cấu hình hệ thống", data: settingsRes };
            } else if (op === "toggle_theme") {
              toggleTheme();
              result = { success: true, message: `Đã chuyển đổi giao diện sáng/tối` };
            } else if (op === "toggle_sidebar") {
              const btn = document.querySelector('button[title*="điều hướng"], aside button') as HTMLButtonElement | null;
              if (btn) btn.click();
              result = { success: true, message: `Đã thu gọn/mở rộng sidebar` };
            } else if (op === "reload") {
              window.location.reload();
              result = { success: true, message: `Đang tải lại trang...` };
            }
            break;
          }

          // 14. WORKFLOW (Make.com Automation Pipeline with Variable Propagation & Safe Halting)
          case "WORKFLOW": {
            const steps = act.steps || [];
            if (steps.length === 0) {
              result = { success: true, message: "Kịch bản trống không có bước nào" };
              break;
            }
            toastSuccess(`Bắt đầu quy trình tự động hóa Make.com (${steps.length} bước)...`);
            const stepResults: any[] = [];
            let allSuccess = true;
            let failedIndex = -1;

            // Make.com execution context for chained variable passing
            const flowCtx: WorkflowExecutionContext = {
              steps: {},
            };

            for (let i = 0; i < steps.length; i++) {
              const rawStep = steps[i];
              // Make sure step has a distinct id
              const stepId = rawStep.id || `step_${Date.now()}_${i}`;
              const stepKey = stepId;

              setActionResults((prev) => ({
                ...prev,
                [stepKey]: {
                  status: "running",
                  progressMsg: `Đang thực hiện bước ${i + 1}/${steps.length}: ${rawStep.label}`,
                },
              }));

              try {
                // Interpolate variables before executing step
                const resolvedStep = interpolateWorkflowParams({ ...rawStep, id: stepId }, flowCtx);
                const stepRes = await executeAction(resolvedStep, parentMsgId, flowCtx);
                stepResults.push(stepRes);

                // Record step output into pipeline context
                if (stepRes.data) {
                  flowCtx.steps[stepId] = stepRes.data;
                  flowCtx.steps[`step_${i + 1}`] = stepRes.data;
                  flowCtx.prev = stepRes.data;

                  if (stepRes.data.examId) {
                    flowCtx.lastExamId = stepRes.data.examId;
                    flowCtx.lastExamTitle = stepRes.data.title;
                  }
                  if (stepRes.data.code) {
                    flowCtx.lastVoucherCode = stepRes.data.code;
                    flowCtx.lastVoucherId = stepRes.data.id;
                  }
                  if (stepRes.data.uid) {
                    flowCtx.lastStudentUid = stepRes.data.uid;
                  }
                }

                setActionResults((prev) => ({
                  ...prev,
                  [stepKey]: {
                    status: stepRes.success ? "success" : "error",
                    message: stepRes.message,
                    data: (stepRes as any).data,
                  },
                }));

                if (!stepRes.success) {
                  allSuccess = false;
                  failedIndex = i;
                  break; // Halt on failure to prevent invalid cascading calls!
                }
              } catch (stepErr: any) {
                allSuccess = false;
                failedIndex = i;
                const errMsg = stepErr.message || String(stepErr);
                stepResults.push({ success: false, message: errMsg });
                setActionResults((prev) => ({
                  ...prev,
                  [stepKey]: { status: "error", message: errMsg },
                }));
                break; // Halt on failure!
              }
            }

            // If pipeline halted on error, mark remaining steps as stopped
            if (!allSuccess && failedIndex >= 0) {
              for (let j = failedIndex + 1; j < steps.length; j++) {
                const remStep = steps[j];
                const remKey = remStep.id || `step_${Date.now()}_${j}`;
                setActionResults((prev) => ({
                  ...prev,
                  [remKey]: {
                    status: "pending",
                    message: `Đã dừng do bước ${failedIndex + 1} (${steps[failedIndex].label}) gặp lỗi`,
                  },
                }));
              }
            }

            const successCount = stepResults.filter((r) => r.success).length;
            if (allSuccess) {
              toastSuccess(`Quy trình Make.com hoàn tất thành công (${successCount}/${steps.length} bước)!`);
            } else {
              toastError(`Quy trình dừng ở bước ${failedIndex + 1}/${steps.length}: ${stepResults[stepResults.length - 1]?.message || "Lỗi thực thi"}`);
            }

            result = {
              success: allSuccess,
              message: allSuccess
                ? `Đã thực thi toàn bộ quy trình (${successCount}/${steps.length} thành công)`
                : `Quy trình dừng tại bước ${failedIndex + 1}/${steps.length} do lỗi`,
              data: stepResults,
            };
            break;
          }

          // 12. NAVIGATE
          case "NAVIGATE": {
            if (action.target) {
              const target = action.target.trim();
              if (target.startsWith("http://") || target.startsWith("https://")) {
                window.open(target, "_blank");
                toastSuccess(`Đã mở liên kết: ${target}`);
                result = { success: true, message: `Đã mở liên kết ngoài` };
              } else {
                const normalized = target.startsWith("/") ? target : `/admin/${target}`;
                navigate(normalized);
                toastSuccess(`Đã di chuyển tới: ${normalized}`);
                result = { success: true, message: `Đã di chuyển tới ${normalized}` };
              }
            }
            break;
          }

          // 13. SEARCH
          case "SEARCH": {
            if (action.query !== undefined) {
              const query = action.query;
              const inputs = Array.from(
                document.querySelectorAll(
                  'input[type="search"], input[placeholder*="Tìm" i], input[placeholder*="search" i], input[aria-label*="search" i], input[name*="search" i], input[type="text"]'
                )
              ).filter(isOutsideAssistant) as HTMLInputElement[];

              const searchInput = inputs[0];
              if (searchInput) {
                setReactInputValue(searchInput, query);
                toastSuccess(`Đã áp dụng tìm kiếm: "${query}"`);
                result = { success: true, message: `Đã tìm kiếm: "${query}"` };
              } else {
                toastError("Không tìm thấy ô tìm kiếm trên trang hiện tại");
              }
            }
            break;
          }

          // 14. FILL_FORM
          case "FILL_FORM": {
            if (action.value !== undefined) {
              const fieldName = (action.field || "").toLowerCase();
              const allInputs = Array.from(
                document.querySelectorAll("input:not([type='hidden']), textarea, select")
              ).filter(isOutsideAssistant) as (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[];

              let target: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null = null;
              target =
                allInputs.find((el) => {
                  const name = (el.name || "").toLowerCase();
                  const id = (el.id || "").toLowerCase();
                  return name.includes(fieldName) || id.includes(fieldName);
                }) || null;

              if (!target) {
                target =
                  allInputs.find((el) => {
                    const ph = ((el as HTMLInputElement).placeholder || "").toLowerCase();
                    const aria = (el.getAttribute("aria-label") || "").toLowerCase();
                    return ph.includes(fieldName) || aria.includes(fieldName);
                  }) || null;
              }

              if (!target) {
                target =
                  allInputs.find((el) => {
                    const labelText = (el.labels?.[0]?.textContent || "").toLowerCase();
                    const parentText = (el.parentElement?.textContent || "").toLowerCase();
                    return labelText.includes(fieldName) || parentText.includes(fieldName);
                  }) || null;
              }

              if (!target && allInputs.length > 0) target = allInputs[0];

              if (target) {
                if (target.tagName.toLowerCase() === "select") {
                  const selectEl = target as HTMLSelectElement;
                  const option = Array.from(selectEl.options).find(
                    (o) =>
                      o.value.toLowerCase().includes(action.value!.toLowerCase()) ||
                      o.text.toLowerCase().includes(action.value!.toLowerCase())
                  );
                  if (option) {
                    setReactInputValue(selectEl, option.value);
                  } else {
                    setReactInputValue(selectEl, action.value);
                  }
                  toastSuccess(`Đã chọn: "${action.value}"`);
                  result = { success: true, message: `Đã chọn giá trị thành công` };
                } else if ((target as HTMLInputElement).type === "checkbox") {
                  const cb = target as HTMLInputElement;
                  const checked = action.value === "true" || action.value === "1" || action.value === "checked";
                  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked");
                  descriptor?.set?.call(cb, checked);
                  cb.dispatchEvent(new Event("change", { bubbles: true }));
                  toastSuccess(`Đã cập nhật trạng thái chọn: ${checked ? "Bật" : "Tắt"}`);
                  result = { success: true, message: `Đã đổi trạng thái checkbox` };
                } else {
                  setReactInputValue(target, action.value);
                  toastSuccess(`Đã điền: "${action.value}"`);
                  result = { success: true, message: `Đã điền giá trị thành công` };
                }
              } else {
                toastError(`Không tìm thấy ô nhập liệu "${action.field}"`);
              }
            }
            break;
          }

          // 15. CLICK
          case "CLICK": {
            const labelOrSelector = (action.target || action.text || action.selector || "").trim();
            if (labelOrSelector) {
              const allClickables = Array.from(
                document.querySelectorAll("button, a, [role='button'], [role='tab'], input[type='checkbox']")
              ).filter(isOutsideAssistant) as HTMLElement[];

              let btnToClick: HTMLElement | null = null;
              if (action.selector) {
                try {
                  const el = document.querySelector(action.selector);
                  if (isOutsideAssistant(el)) btnToClick = el as HTMLElement;
                } catch {}
              }

              if (!btnToClick) {
                const lower = labelOrSelector.toLowerCase();
                btnToClick =
                  allClickables.find((el) => {
                    const text = (el.textContent || "").trim().toLowerCase();
                    const title = (el.getAttribute("title") || "").toLowerCase();
                    const aria = (el.getAttribute("aria-label") || "").toLowerCase();
                    return text.includes(lower) || title.includes(lower) || aria.includes(lower);
                  }) || null;
              }

              if (btnToClick) {
                btnToClick.scrollIntoView({ behavior: "smooth", block: "center" });
                btnToClick.click();
                const clickedLabel = (btnToClick.textContent || btnToClick.getAttribute("title") || labelOrSelector).trim();
                toastSuccess(`Đã bấm: "${clickedLabel.slice(0, 30)}"`);
                result = { success: true, message: `Đã bấm ${clickedLabel}` };
              } else {
                toastError(`Không tìm thấy nút bấm "${labelOrSelector}" trên trang`);
              }
            }
            break;
          }

          // 16. SELECT_OPTION
          case "SELECT_OPTION": {
            if (action.value !== undefined) {
              const fieldName = (action.field || "").toLowerCase();
              const selects = Array.from(document.querySelectorAll("select")).filter(isOutsideAssistant) as HTMLSelectElement[];

              let targetSelect = selects.find((s) => {
                const name = (s.name || s.id || "").toLowerCase();
                const label = (s.labels?.[0]?.textContent || s.parentElement?.textContent || "").toLowerCase();
                return name.includes(fieldName) || label.includes(fieldName);
              });

              if (!targetSelect && selects.length > 0) targetSelect = selects[0];

              if (targetSelect) {
                const valLower = action.value.toLowerCase();
                const matchedOption = Array.from(targetSelect.options).find(
                  (o) => o.value.toLowerCase().includes(valLower) || o.text.toLowerCase().includes(valLower)
                );
                if (matchedOption) {
                  setReactInputValue(targetSelect, matchedOption.value);
                  toastSuccess(`Đã chọn: "${matchedOption.text.trim()}"`);
                  result = { success: true, message: `Đã chọn ${matchedOption.text.trim()}` };
                } else {
                  setReactInputValue(targetSelect, action.value);
                  toastSuccess(`Đã chọn: "${action.value}"`);
                  result = { success: true, message: `Đã chọn ${action.value}` };
                }
              } else {
                toastError(`Không tìm thấy menu chọn "${action.field}"`);
              }
            }
            break;
          }

          // 17. CONFIRM_MODAL
          case "CONFIRM_MODAL": {
            const isConfirm = action.direction !== "cancel";
            const modal = document.querySelector('[role="dialog"], .fixed.inset-0.z-50, .fixed.inset-0.z-40');
            if (modal && isOutsideAssistant(modal)) {
              const buttons = Array.from(modal.querySelectorAll("button")).filter(isOutsideAssistant) as HTMLButtonElement[];
              let targetBtn: HTMLButtonElement | null = null;
              if (isConfirm) {
                targetBtn =
                  buttons.find((b) => {
                    const t = (b.textContent || "").toLowerCase();
                    return (
                      t.includes("xác nhận") ||
                      t.includes("đồng ý") ||
                      t.includes("xóa") ||
                      t.includes("đăng xuất") ||
                      t.includes("lưu") ||
                      t.includes("tiếp tục")
                    );
                  }) ||
                  buttons[buttons.length - 1] ||
                  null;
              } else {
                targetBtn =
                  buttons.find((b) => {
                    const t = (b.textContent || "").toLowerCase();
                    return t.includes("hủy") || t.includes("đóng") || t.includes("quay lại");
                  }) ||
                  buttons[0] ||
                  null;
              }

              if (targetBtn) {
                targetBtn.click();
                toastSuccess(isConfirm ? "Đã xác nhận thao tác trên hộp thoại" : "Đã hủy thao tác trên hộp thoại");
                result = { success: true, message: isConfirm ? "Đã xác nhận modal" : "Đã hủy modal" };
              }
            } else {
              toastError("Không tìm thấy hộp thoại đang mở trên màn hình");
            }
            break;
          }

          // 18. EDIT_ITEM
          case "EDIT_ITEM": {
            if (action.target) {
              const norm = action.target.startsWith("/") ? action.target : `/admin/${action.target}`;
              navigate(norm);
              toastSuccess(`Đã mở trang chỉnh sửa: ${norm}`);
              result = { success: true, message: `Mở chỉnh sửa ${norm}` };
            } else if (action.itemType === "exam" && action.id) {
              navigate(`/admin/exams/${action.id}/edit`);
              toastSuccess(`Đang mở chỉnh sửa bài thi...`);
              result = { success: true, message: `Mở chỉnh sửa bài thi` };
            } else if (action.itemType === "student" && action.id) {
              navigate(`/admin/users/${action.id}`);
              toastSuccess(`Đang mở hồ sơ học sinh...`);
              result = { success: true, message: `Mở hồ sơ học sinh` };
            }
            break;
          }

          // 19. TOGGLE_THEME
          case "TOGGLE_THEME": {
            toggleTheme();
            toastSuccess("Đã chuyển đổi giao diện sáng/tối");
            result = { success: true, message: "Đã chuyển đổi giao diện" };
            break;
          }

          // 20. TOGGLE_SIDEBAR
          case "TOGGLE_SIDEBAR": {
            const toggleBtn = (
              document.querySelector('button[title*="thanh điều hướng"], button[title*="điều hướng"]') ||
              document.querySelector('aside button, header button.lg\\:hidden')
            ) as HTMLButtonElement | null;
            if (toggleBtn && isOutsideAssistant(toggleBtn)) {
              toggleBtn.click();
              toastSuccess("Đã thu gọn / mở rộng Sidebar");
              result = { success: true, message: "Đã thu gọn/mở rộng Sidebar" };
            }
            break;
          }

          // 21. TRIGGER_DATA_HEALTH
          case "TRIGGER_DATA_HEALTH": {
            toastSuccess("Đang kích hoạt quét toàn vẹn dữ liệu hệ thống...");
            const report = await scanDataHealth();
            toastSuccess(`Quét hoàn tất: ${report?.issues?.length || 0} vấn đề phát hiện.`);
            result = { success: true, message: `Đã quét dữ liệu: ${report?.issues?.length || 0} vấn đề`, data: report };
            break;
          }

          // 22. SCROLL
          case "SCROLL": {
            const scrollContainer =
              document.querySelector("main .overflow-y-auto") || document.querySelector("main") || window;
            if (action.direction === "top") {
              scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
            } else {
              scrollContainer.scrollTo({ top: 999999, behavior: "smooth" });
            }
            toastSuccess(`Đã cuộn trang về ${action.direction === "top" ? "đầu trang" : "cuối trang"}`);
            result = { success: true, message: `Đã cuộn trang` };
            break;
          }

          // 23. COPY_TEXT
          case "COPY_TEXT": {
            if (action.text) {
              await navigator.clipboard.writeText(action.text);
              toastSuccess("Đã sao chép nội dung vào Clipboard");
              result = { success: true, message: "Đã sao chép" };
            }
            break;
          }

          // 24. RELOAD_DATA
          case "RELOAD_DATA": {
            window.location.reload();
            result = { success: true, message: "Đang tải lại trang..." };
            break;
          }
        }

        setActionResults((prev) => ({
          ...prev,
          [actionKey]: {
            status: result.success ? "success" : "error",
            message: result.message,
            data: result.data,
          },
        }));
        return result;
      } catch (e: any) {
        const errorMsg = e?.message || String(e);
        toastError("Lỗi thực thi: " + errorMsg);
        setActionResults((prev) => ({
          ...prev,
          [actionKey]: { status: "error", message: errorMsg },
        }));
        return { success: false, message: errorMsg };
      }
    },
    [navigate, toastSuccess, toastError, toggleTheme, user?.email]
  );

  // File processing (images, screenshots)
  const processFile = useCallback((file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      alert("Tệp quá lớn. Vui lòng chọn tệp nhỏ hơn 20MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setPendingAttachment({
        name: file.name,
        type: file.type || "image/jpeg",
        data: e.target?.result as string,
        size: file.size,
      });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // Handle Ctrl+V paste image
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          processFile(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  // Send message to Admin Assistant
  const sendMessage = async (overridePrompt?: string) => {
    const promptToSend = (overridePrompt !== undefined ? overridePrompt : input).trim();
    if ((!promptToSend && !pendingAttachment) || isTyping) return;

    const userMsg: Message = {
      id: `user_${Date.now()}`,
      role: "user",
      text: promptToSend || (pendingAttachment ? "Tôi gửi ảnh chụp màn hình này, hãy phân tích giúp tôi!" : ""),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      attachment: pendingAttachment || undefined,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setPendingAttachment(null);
    setIsTyping(true);

    // Prepare model placeholder
    const modelMsgId = `model_${Date.now()}`;
    const initialModelMsg: Message = {
      id: modelMsgId,
      role: "model",
      text: "",
      cleanText: "",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages([...nextMessages, initialModelMsg]);

    const pageContext = scrapeCurrentPageContext();

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (savedApiKey) headers["x-gemini-api-key"] = savedApiKey;

      const payload = {
        messages: nextMessages.map((m) => ({
          role: m.role,
          text: m.text,
          attachment: m.attachment,
        })),
        context: pageContext,
      };

      const response = await fetch("/api/ai/admin-assistant", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errMsg = "Không thể kết nối đến Trợ lý Admin AI";
        try {
          const errData = await response.json();
          if (errData.error) errMsg = errData.error;
        } catch {}
        throw new Error(errMsg);
      }

      if (!response.body) throw new Error("Không nhận được luồng dữ liệu (ReadableStream)");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let accumulatedText = "";
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              const dataStr = trimmed.slice("data: ".length).trim();
              if (dataStr === "[DONE]") break;
              try {
                const parsedData = JSON.parse(dataStr);
                if (parsedData.text) {
                  accumulatedText += parsedData.text;
                  const { cleanText, actions } = parseActionsFromAiText(accumulatedText);

                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === modelMsgId
                        ? {
                            ...m,
                            text: accumulatedText,
                            cleanText,
                            actions,
                          }
                        : m
                    )
                  );
                }
              } catch {}
            }
          }
        }
      }

      // Finish parsing and auto-execute actions
      const { cleanText, actions } = parseActionsFromAiText(accumulatedText);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === modelMsgId
            ? {
                ...m,
                text: accumulatedText,
                cleanText,
                actions,
              }
            : m
        )
      );

      // Auto execute actions if autoPilot is enabled and not executed yet
      if (actions.length > 0) {
        if (autoPilot) {
          for (const action of actions) {
            const actionKey = action.id || `${modelMsgId}_${action.type}_${action.target || action.query || action.field || action.label}`;
            if (!executedActionIds.has(actionKey)) {
              setExecutedActionIds((prev) => new Set(prev).add(actionKey));
              await executeAction(action, modelMsgId);
            }
          }
        }
      }
    } catch (err: any) {
      console.error("[Admin AI Assistant Error]:", err);
      const errorMsg = `⚠️ **Lỗi kết nối Trợ lý Admin AI:** ${err?.message || "Không thể tải phản hồi"}.\n\n*Gợi ý:* Hãy kiểm tra kết nối mạng hoặc thử cấu hình lại Gemini API Key trong phần Cài đặt của trợ lý.`;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === modelMsgId
            ? {
                ...m,
                text: errorMsg,
                cleanText: errorMsg,
              }
            : m
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  // Quick suggestions based on current route
  const quickSuggestions = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith("/admin/exams")) {
      return [
        { label: "📝 Tạo đề Toán 15p (AI)", prompt: "Hãy tạo đề thi trắc nghiệm môn Toán 10 câu về Hàm số bậc hai, thời gian 15 phút, khối 10 và lưu vào hệ thống" },
        { label: "⚡ Workflow: Đề thi + Giao bài", prompt: "Chạy quy trình tự động: Bước 1 tạo đề thi trắc nghiệm Vật lý 10 câu về Động học chất điểm, Bước 2 giao bài tập này cho Lớp 10A1" },
        { label: "📋 Đề thi nào đang có?", prompt: "Trên trang này hiện có những đề thi nào và trạng thái của chúng ra sao?" },
        { label: "🔍 Tìm kiếm đề Toán", prompt: "Tìm kiếm các đề thi môn Toán trên trang hiện tại" },
        { label: "🌐 Mở Web Importer", prompt: "Di chuyển tới trang Web Importer" },
      ];
    }
    if (path.startsWith("/admin/students")) {
      return [
        { label: "👥 Có bao nhiêu học sinh?", prompt: "Tổng số lượng học sinh đang hiển thị trên bảng là bao nhiêu?" },
        { label: "🔍 Tìm học sinh bị khóa", prompt: "Trên trang có học sinh nào đang bị khóa hoặc cảnh báo không?" },
        { label: "💰 Cộng 50k vào ví học sinh", prompt: "Cộng 50.000đ vào ví của học sinh đầu tiên trên bảng với ghi chú Thưởng học tập xuất sắc" },
        { label: "📂 Chuyển tới Quản lý Lớp", prompt: "Di chuyển sang trang quản lý lớp học" },
      ];
    }
    if (path.startsWith("/admin/dashboard")) {
      return [
        { label: "⚡ Workflow: Voucher + Đề thi", prompt: "Chạy quy trình tự động Make.com: Bước 1 tạo voucher GIAM20K giảm 20.000đ đơn từ 50k, Bước 2 tạo đề thi Toán 15 phút 10 câu về Lũy thừa" },
        { label: "📊 Tóm tắt hệ thống", prompt: "Tóm tắt nhanh toàn bộ các chỉ số thống kê trên bảng điều khiển hôm nay" },
        { label: "🎫 Tạo voucher GIAM50K", prompt: "Tạo voucher giảm giá 50.000đ mã GIAM50K áp dụng cho đơn từ 100.000đ" },
        { label: "🩺 Quét sức khỏe dữ liệu", prompt: "Kích hoạt quét toàn vẹn sức khỏe dữ liệu hệ thống" },
      ];
    }
    if (path.startsWith("/admin/wallet")) {
      return [
        { label: "🎫 Tạo voucher GIAM50K", prompt: "Tạo voucher mã GIAM50K giảm cố định 50.000đ cho đơn từ 100.000đ, hạn dùng 100 lượt" },
        { label: "🎫 Tạo voucher 20%", prompt: "Tạo voucher mã SALE20 giảm 20% tối đa 30.000đ cho đơn hàng từ 50.000đ" },
        { label: "💵 Tổng số dư & công nợ", prompt: "Đọc và tóm tắt các con số về số dư ví và công nợ đang hiển thị trên màn hình" },
        { label: "⏳ Giao dịch chờ duyệt", prompt: "Có giao dịch nạp tiền nào đang ở trạng thái chờ duyệt không?" },
      ];
    }
    if (path.startsWith("/admin/live-proctoring") || path.startsWith("/admin/live-monitor")) {
      return [
        { label: "👁️ Tình trạng phòng thi", prompt: "Tóm tắt tình hình các thí sinh đang trong phòng thi trực tiếp" },
        { label: "⚠️ Cảnh báo gian lận", prompt: "Có thí sinh nào bị cảnh báo đổi tab hay gian lận không?" },
      ];
    }
    if (path.startsWith("/admin/submissions")) {
      return [
        { label: "📈 Đánh giá điểm số", prompt: "Phân tích điểm số các bài nộp đang hiển thị trên bảng" },
        { label: "🔍 Bài điểm dưới trung bình", prompt: "Có bài nộp nào bị điểm dưới trung bình không?" },
      ];
    }
    if (path.startsWith("/admin/data-health")) {
      return [
        { label: "🩺 Quét sức khỏe dữ liệu", prompt: "Hãy kích hoạt quét toàn vẹn dữ liệu hệ thống" },
        { label: "📋 Phân tích các lỗi", prompt: "Đọc và giải thích các cảnh báo hoặc lỗi dữ liệu đang hiển thị" },
      ];
    }
    if (path.startsWith("/admin/settings")) {
      return [
        { label: "🌓 Chuyển giao diện sáng/tối", prompt: "Chuyển giao diện sang chế độ Tối (Dark mode)" },
        { label: "📁 Thu gọn Sidebar", prompt: "Thu gọn thanh điều hướng bên trái lại giúp tôi" },
        { label: "⚙️ Tóm tắt cài đặt", prompt: "Tóm tắt các thông số cài đặt hiện tại trên trang" },
      ];
    }
    return [
      { label: "⚡ Workflow: Voucher + Đề thi", prompt: "Chạy quy trình tự động Make.com: Bước 1 tạo voucher GIAM20K giảm 20.000đ, Bước 2 tạo đề thi Toán 15 phút 10 câu về Lũy thừa" },
      { label: "🎫 Tạo voucher GIAM50K", prompt: "Tạo voucher giảm giá 50.000đ mã GIAM50K áp dụng cho đơn từ 100.000đ" },
      { label: "📝 Tạo đề thi Toán 15p", prompt: "Tạo đề thi trắc nghiệm môn Toán 10 câu về Hàm số bậc hai thời gian 15 phút" },
      { label: "📊 Trang này có dữ liệu gì?", prompt: "Hãy đọc và tóm tắt toàn bộ dữ liệu đang hiển thị trên trang hiện tại" },
    ];
  }, [location.pathname]);

  const clearChat = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện với Trợ lý AI?")) {
      const resetMsg: Message = {
        id: `welcome_${Date.now()}`,
        role: "model",
        text: `Đã làm mới phiên trò chuyện! Bạn đang ở trang **${currentTabName}** (\`${location.pathname}\`).\n\nTôi là **Admin AI Agent**, sẵn sàng tự động hóa mọi tác vụ (tạo voucher, sinh đề thi AI, chạy quy trình Make.com, kiểm tra hệ thống)!`,
        cleanText: `Đã làm mới phiên trò chuyện! Bạn đang ở trang **${currentTabName}** (\`${location.pathname}\`).\n\nTôi là **Admin AI Agent**, sẵn sàng tự động hóa mọi tác vụ (tạo voucher, sinh đề thi AI, chạy quy trình Make.com, kiểm tra hệ thống)!`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages([resetMsg]);
      sessionStorage.removeItem(STORAGE_KEY_MESSAGES);
    }
  };

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveApiKey = () => {
    const trimmed = apiKeyInput.trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY_API_KEY, trimmed);
      setSavedApiKey(trimmed);
      toastSuccess("Đã lưu Gemini API Key riêng thành công!");
    } else {
      localStorage.removeItem(STORAGE_KEY_API_KEY);
      setSavedApiKey("");
      toastSuccess("Đã xóa API Key riêng (Hệ thống sẽ dùng cấu hình máy chủ)");
    }
    setShowSettings(false);
  };

  // Icon helper for action types
  const getActionIcon = (type: string) => {
    switch (type) {
      case "LIST_VOUCHERS":
      case "CREATE_VOUCHER":
      case "UPDATE_VOUCHER":
      case "DELETE_VOUCHER":
        return <Ticket className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case "CREATE_EXAM_AI":
      case "CREATE_EXAM_MANUAL":
      case "UPDATE_EXAM":
      case "DELETE_EXAM":
      case "DUPLICATE_EXAM":
      case "MERGE_EXAMS":
        return <BookOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
      case "ASSIGN_HOMEWORK":
        return <Layers className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
      case "MANAGE_STUDENT":
        return <Users className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
      case "SYSTEM_OPERATION":
      case "TRIGGER_DATA_HEALTH":
        return <Wrench className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
      case "NAVIGATE":
        return <ArrowRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />;
      case "SEARCH":
        return <Search className="w-3.5 h-3.5 text-sky-500 shrink-0" />;
      case "WORKFLOW":
        return <Workflow className="w-3.5 h-3.5 text-violet-500 shrink-0" />;
      case "TOGGLE_THEME":
        return <SunMoon className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case "TOGGLE_SIDEBAR":
        return <PanelLeftClose className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
      default:
        return <Play className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
    }
  };

  // Render parameters chips for actions
  const renderParamsChips = (action: AdminAssistantAction) => {
    const p = action.params || action.payload || {};
    const chips: { label: string; val: string }[] = [];

    if (action.target) chips.push({ label: "Đích", val: action.target });
    if (action.query) chips.push({ label: "Từ khóa", val: `"${action.query}"` });
    if (action.field) chips.push({ label: "Trường", val: `${action.field}: ${action.value || ""}` });

    if (action.type === "CREATE_VOUCHER" || action.type === "UPDATE_VOUCHER") {
      if (p.code) chips.push({ label: "Mã", val: String(p.code) });
      if (p.value !== undefined) {
        chips.push({
          label: "Giảm",
          val: p.type === "discount_percent" ? `${p.value}%` : `${Number(p.value).toLocaleString("vi-VN")}đ`,
        });
      }
      if (p.minOrderVnd) chips.push({ label: "Đơn từ", val: `${Number(p.minOrderVnd).toLocaleString("vi-VN")}đ` });
      if (p.usageLimit) chips.push({ label: "Lượt", val: String(p.usageLimit) });
    } else if (action.type === "DELETE_VOUCHER") {
      if (p.id || p.code) chips.push({ label: "Mã/ID", val: String(p.id || p.code) });
    } else if (action.type === "LIST_VOUCHERS") {
      chips.push({ label: "Tác vụ", val: "Xem toàn bộ mã" });
    } else if (action.type === "CREATE_EXAM_AI" || action.type === "CREATE_EXAM_MANUAL") {
      if (p.title) chips.push({ label: "Đề", val: String(p.title) });
      if (p.questionCount) chips.push({ label: "Số câu", val: `${p.questionCount} câu` });
      if (p.timeLimit) chips.push({ label: "Thời gian", val: `${p.timeLimit}p` });
      if (p.grade || p.gradeCategory) chips.push({ label: "Khối", val: `Lớp ${p.grade || p.gradeCategory}` });
      if (p.subject) chips.push({ label: "Môn", val: String(p.subject) });
    } else if (action.type === "DUPLICATE_EXAM") {
      if (p.examId) chips.push({ label: "Nguồn", val: String(p.examId).slice(0, 8) });
      if (p.newTitle) chips.push({ label: "Bản sao", val: String(p.newTitle) });
    } else if (action.type === "MERGE_EXAMS") {
      const ids = p.sourceExamIds || p.examIds || [];
      chips.push({ label: "Gộp", val: `${ids.length} đề thi` });
      if (p.title) chips.push({ label: "Tên mới", val: String(p.title) });
    } else if (action.type === "DELETE_EXAM" || action.type === "UPDATE_EXAM") {
      if (p.examId || action.id) chips.push({ label: "ID đề", val: String(p.examId || action.id).slice(0, 8) });
    } else if (action.type === "MANAGE_STUDENT") {
      if (p.uid) chips.push({ label: "UID", val: String(p.uid).slice(0, 8) });
      if (p.action) chips.push({ label: "Hành động", val: String(p.action) });
      if (p.amountVnd || p.amount) {
        const amt = Number(p.amountVnd || p.amount);
        chips.push({ label: "Số tiền", val: `${amt >= 0 ? "+" : ""}${amt.toLocaleString("vi-VN")}đ` });
      }
    } else if (action.type === "ASSIGN_HOMEWORK") {
      if (p.targetClass) chips.push({ label: "Lớp", val: String(p.targetClass) });
      if (p.dueDate) chips.push({ label: "Hạn", val: String(p.dueDate) });
      if (p.examId) chips.push({ label: "Mã đề", val: String(p.examId).slice(0, 8) });
    } else if (action.type === "SYSTEM_OPERATION") {
      if (p.operation || action.target) chips.push({ label: "Lệnh", val: String(p.operation || action.target) });
    }

    if (chips.length === 0) return null;

    return (
      <div className="flex flex-wrap items-center gap-1 pt-1">
        {chips.map((c, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-600/60"
          >
            <span className="text-slate-400 font-sans">{c.label}:</span>
            <span className="font-semibold">{c.val}</span>
          </span>
        ))}
      </div>
    );
  };

  // Render dedicated Result Preview Cards (Voucher, Exam, Student, Health)
  const renderResultPreview = (
    action: AdminAssistantAction,
    actionRes?: { status?: string; message?: string; data?: any }
  ) => {
    const isSuccess = actionRes?.status === "success";
    const data = actionRes?.data;

    // 1. Voucher Coupon Result Preview
    if ((action.type === "CREATE_VOUCHER" || action.type === "UPDATE_VOUCHER") && (isSuccess || data)) {
      const v = data || action.params || {};
      const code = v.code || action.params?.code || "DKVOUCHER";
      const isPercent = v.type === "discount_percent" || action.params?.type === "discount_percent";
      const val = v.value ?? action.params?.value ?? 0;
      const minOrder = v.minOrderVnd ?? action.params?.minOrderVnd;

      return (
        <div className="mt-2 p-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border-2 border-dashed border-amber-300 dark:border-amber-700/80 flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Ticket className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-xs text-amber-950 dark:text-amber-200 tracking-wider">
                  {code}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-amber-200 dark:bg-amber-800 text-[9px] font-bold text-amber-900 dark:text-amber-100">
                  {isPercent ? `-${val}%` : `-${Number(val).toLocaleString("vi-VN")}đ`}
                </span>
              </div>
              <p className="text-[10px] text-amber-800/80 dark:text-amber-300/80 truncate">
                {minOrder ? `Đơn từ ${Number(minOrder).toLocaleString("vi-VN")}đ` : "Áp dụng toàn sàn"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(code);
                toastSuccess(`Đã sao chép mã voucher: ${code}`);
              }}
              className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-[10px] font-medium border border-amber-200 dark:border-amber-700 transition-colors cursor-pointer"
              title="Sao chép mã voucher"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/wallet")}
              className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Ví & Voucher</span>
            </button>
          </div>
        </div>
      );
    }

    // 1b. List Vouchers Result Preview
    if (action.type === "LIST_VOUCHERS" && (isSuccess || data)) {
      const items = Array.isArray(data?.items) ? data.items : [];
      const count = data?.count ?? items.length;
      return (
        <div className="mt-2 p-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border border-amber-300 dark:border-amber-700/80 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Ticket className="w-4 h-4" />
              </div>
              <span className="font-bold text-xs text-amber-950 dark:text-amber-100">
                Danh sách Voucher ({count} mã khả dụng)
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate("/admin/wallet")}
              className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Quản lý Ví</span>
            </button>
          </div>
          {items.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1 border-t border-amber-200/60 dark:border-amber-800/60">
              {items.slice(0, 8).map((v: any, idx: number) => {
                const isPercent = v.type === "discount_percent";
                const valStr = isPercent ? `-${v.value}%` : `-${Number(v.value || 0).toLocaleString("vi-VN")}đ`;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(v.code);
                      toastSuccess(`Đã chép mã: ${v.code}`);
                    }}
                    title="Bấm để sao chép mã"
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 text-[10px] font-mono text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer transition-colors"
                  >
                    <span className="font-bold">{v.code}</span>
                    <span className="text-[9px] text-amber-600 dark:text-amber-400 font-sans">({valStr})</span>
                  </button>
                );
              })}
              {items.length > 8 && (
                <span className="text-[10px] text-amber-700 dark:text-amber-300 self-center pl-1 font-sans">
                  +{items.length - 8} mã khác...
                </span>
              )}
            </div>
          )}
        </div>
      );
    }

    // 2. Exam Creation Result Preview
    if ((action.type === "CREATE_EXAM_AI" || action.type === "CREATE_EXAM_MANUAL") && (isSuccess || data)) {
      const examId = data?.examId || action.id;
      const title = data?.title || action.params?.title || "Đề thi mới tạo";
      const qCount = data?.questionCount ?? action.params?.questionCount;
      const timeLimit = data?.timeLimit ?? action.params?.timeLimit;

      return (
        <div className="mt-2 p-2.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800/80 flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-xs text-blue-950 dark:text-blue-100 truncate">
                {title}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-blue-700 dark:text-blue-300">
                {qCount !== undefined && <span>{qCount} câu hỏi</span>}
                {qCount !== undefined && timeLimit && <span>•</span>}
                {timeLimit && <span>{timeLimit} phút</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {examId && (
              <button
                type="button"
                onClick={() => navigate(`/admin/exams/${examId}/edit`)}
                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Mở soạn thảo</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    // 2b. Exam Duplication & Merge Result Preview
    if ((action.type === "DUPLICATE_EXAM" || action.type === "MERGE_EXAMS") && (isSuccess || data)) {
      const examId = data?.examId || action.id;
      const title = data?.title || action.params?.title || (action.type === "MERGE_EXAMS" ? "Đề thi gộp" : "Bản sao đề thi");
      const totalQ = data?.totalQuestions;

      return (
        <div className="mt-2 p-2.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800/80 flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-xs text-blue-950 dark:text-blue-100 truncate">
                {title}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-blue-700 dark:text-blue-300">
                <span>{action.type === "MERGE_EXAMS" ? "Gộp đề hoàn tất" : "Nhân bản thành công"}</span>
                {totalQ !== undefined && (
                  <>
                    <span>•</span>
                    <span>{totalQ} câu hỏi</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {examId && (
              <button
                type="button"
                onClick={() => navigate(`/admin/exams/${examId}/edit`)}
                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Mở đề thi</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    // 3. Student / Wallet Result Preview
    if (action.type === "MANAGE_STUDENT" && (isSuccess || data)) {
      return (
        <div className="mt-2 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-2 text-xs text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2 overflow-hidden">
            <Coins className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium truncate">{actionRes?.message || "Đã cập nhật học sinh thành công"}</span>
          </div>
          <button
            type="button"
            onClick={() => navigate("/admin/students")}
            className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Học sinh</span>
          </button>
        </div>
      );
    }

    // 4. System Health Result Preview
    if ((action.type === "SYSTEM_OPERATION" || action.type === "TRIGGER_DATA_HEALTH") && (isSuccess || data)) {
      return (
        <div className="mt-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs text-slate-800 dark:text-slate-200">
          <div className="flex items-center gap-2 overflow-hidden">
            <Activity className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="font-medium truncate">{actionRes?.message || "Hệ thống hoạt động bình thường"}</span>
          </div>
          <button
            type="button"
            onClick={() => navigate("/admin/data-health")}
            className="px-2 py-0.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Sức khỏe dữ liệu</span>
          </button>
        </div>
      );
    }

    return null;
  };

  // Render Make.com visual pipeline for WORKFLOW actions
  const renderWorkflowPipeline = (act: AdminAssistantAction, actIdx: number, msgId: string) => {
    const actionKey = act.id || `${msgId}_${act.type}_${act.target || act.query || act.field || act.label}`;
    const actionRes = actionResults[actionKey] || (act.id ? actionResults[act.id] : undefined);
    const status = actionRes?.status || act.status || "pending";
    const isRunning = status === "running";
    const isSuccess = status === "success";

    return (
      <div
        key={actIdx}
        className="rounded-2xl border border-indigo-200 dark:border-indigo-900/80 bg-gradient-to-b from-indigo-50/60 to-white dark:from-indigo-950/30 dark:to-slate-900 overflow-hidden shadow-xs"
      >
        {/* Workflow Pipeline Header */}
        <div className="px-3.5 py-2.5 bg-indigo-100/70 dark:bg-indigo-900/40 border-b border-indigo-200/60 dark:border-indigo-800/50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <div
              className={clsx(
                "w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs",
                isRunning ? "bg-amber-500 animate-pulse" : isSuccess ? "bg-emerald-600" : "bg-indigo-600"
              )}
            >
              <Workflow className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-indigo-950 dark:text-indigo-200 truncate">
                  {act.label || "Quy trình Tự Động Hóa (Make.com)"}
                </span>
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-full bg-indigo-200/80 dark:bg-indigo-800/80 text-indigo-800 dark:text-indigo-300 shrink-0">
                  {act.steps?.length || 0} bước
                </span>
              </div>
              {actionRes?.message && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[240px]">
                  {actionRes.message}
                </p>
              )}
            </div>
          </div>

          {/* Workflow run button */}
          <button
            type="button"
            disabled={isRunning}
            onClick={() => executeAction(act, msgId)}
            className={clsx(
              "flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer shrink-0 shadow-2xs",
              isRunning
                ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                : isSuccess
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            )}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Đang chạy...</span>
              </>
            ) : isSuccess ? (
              <>
                <RotateCcw className="w-3 h-3" />
                <span>Chạy lại</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span>Thực thi quy trình</span>
              </>
            )}
          </button>
        </div>

        {/* Pipeline Timeline Steps */}
        <div className="p-3 space-y-2.5 relative">
          {act.steps?.map((step, sIdx) => {
            const stepKey = step.id || `${actionKey}_step_${sIdx}`;
            const stepRes = actionResults[stepKey] || (step.id ? actionResults[step.id] : undefined);
            const sStatus = stepRes?.status || step.status || "pending";
            const sRunning = sStatus === "running";
            const sSuccess = sStatus === "success";
            const sError = sStatus === "error";
            const isHalted = sStatus === "pending" && Boolean(stepRes?.message?.includes("Đã dừng"));

            return (
              <div key={sIdx} className="relative pl-7 group">
                {/* Connecting vertical line to next step */}
                {sIdx < (act.steps?.length || 0) - 1 && (
                  <div
                    className={clsx(
                      "absolute left-3 top-6 bottom-0 w-0.5 -translate-x-1/2 transition-colors",
                      sSuccess ? "bg-emerald-400 dark:bg-emerald-600" : "bg-slate-200 dark:bg-slate-700"
                    )}
                  />
                )}

                {/* Node icon / indicator on timeline */}
                <div
                  className={clsx(
                    "absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shadow-2xs",
                    sRunning
                      ? "bg-amber-500 text-white ring-4 ring-amber-100 dark:ring-amber-950 animate-pulse"
                      : sSuccess
                      ? "bg-emerald-500 text-white"
                      : sError
                      ? "bg-red-500 text-white"
                      : isHalted
                      ? "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 ring-2 ring-amber-400/80"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  )}
                >
                  {sRunning ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : sSuccess ? (
                    <Check className="w-3 h-3 stroke-[3]" />
                  ) : sError ? (
                    <X className="w-3 h-3 stroke-[3]" />
                  ) : isHalted ? (
                    <AlertCircle className="w-3.5 h-3.5" />
                  ) : (
                    <span>{sIdx + 1}</span>
                  )}
                </div>

                {/* Step card content */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      {getActionIcon(step.type)}
                      <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                        {step.label}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 shrink-0">
                      {step.type}
                    </span>
                  </div>

                  {/* Live Progress or Status Message */}
                  {sRunning && stepRes?.progressMsg && (
                    <div className="space-y-1">
                      <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                        <span className="truncate">{stepRes.progressMsg}</span>
                      </div>
                      {stepRes.progressPercent !== undefined && (
                        <div className="w-full bg-amber-100 dark:bg-amber-950 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-amber-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${stepRes.progressPercent}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error Message */}
                  {sError && stepRes?.message && (
                    <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                      ⚠️ {stepRes.message}
                    </p>
                  )}

                  {/* Halted due to previous step error Message */}
                  {isHalted && stepRes?.message && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{stepRes.message}</span>
                    </p>
                  )}

                  {/* Params Chips */}
                  {renderParamsChips(step)}

                  {/* Result Preview Card (Voucher, Exam, etc.) */}
                  {renderResultPreview(step, stepRes)}

                  {/* Individual step run button */}
                  {!sSuccess && !sRunning && (
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => executeAction(step, msgId)}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-[10px] font-medium rounded-md text-slate-700 dark:text-slate-200 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Play className="w-2.5 h-2.5" />
                        {isHalted ? "Chạy lại bước này" : "Chạy riêng bước này"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render individual Action Card
  const renderSingleActionCard = (act: AdminAssistantAction, actIdx: number, msgId: string) => {
    const actionKey = act.id || `${msgId}_${act.type}_${act.target || act.query || act.field || act.label}`;
    const actionRes = actionResults[actionKey] || (act.id ? actionResults[act.id] : undefined);
    const status = actionRes?.status || act.status || "pending";
    const isRunning = status === "running";
    const isSuccess = status === "success";
    const isError = status === "error";

    return (
      <div
        key={actIdx}
        className={clsx(
          "p-2.5 rounded-xl border text-xs transition-all space-y-1.5 shadow-2xs",
          isSuccess
            ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-100"
            : isError
            ? "bg-red-50/60 dark:bg-red-950/30 border-red-200 dark:border-red-800/60 text-red-950 dark:text-red-100"
            : isRunning
            ? "bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100"
            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <div
              className={clsx(
                "w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
                isSuccess ? "bg-emerald-500/15" : isRunning ? "bg-amber-500/15" : "bg-slate-100 dark:bg-slate-700"
              )}
            >
              {isRunning ? (
                <Loader2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-spin" />
              ) : isSuccess ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : isError ? (
                <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
              ) : (
                getActionIcon(act.type)
              )}
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-[11px] truncate">{act.label}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                {act.type} {act.target ? `-> ${act.target}` : ""} {act.query ? `("${act.query}")` : ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isRunning}
            onClick={() => executeAction(act, msgId)}
            className={clsx(
              "px-2.5 py-1 text-[10px] font-bold rounded-lg shrink-0 transition-colors cursor-pointer shadow-2xs flex items-center gap-1",
              isRunning
                ? "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                : isSuccess
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            )}
            title={isSuccess ? "Thực hiện lại thao tác này" : "Bấm để thực thi"}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Đang chạy...</span>
              </>
            ) : isSuccess ? (
              <>
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Chạy lại</span>
              </>
            ) : (
              <>
                <Play className="w-2.5 h-2.5 fill-current" />
                <span>Thực thi</span>
              </>
            )}
          </button>
        </div>

        {/* Running Progress Bar */}
        {isRunning && actionRes?.progressMsg && (
          <div className="space-y-1 pt-1">
            <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin shrink-0" />
              <span className="truncate">{actionRes.progressMsg}</span>
            </div>
            {actionRes.progressPercent !== undefined && (
              <div className="w-full bg-amber-100 dark:bg-amber-950 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${actionRes.progressPercent}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {isError && actionRes?.message && (
          <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
            ⚠️ {actionRes.message}
          </p>
        )}

        {/* Parameter Chips */}
        {renderParamsChips(act)}

        {/* Result Preview Card */}
        {renderResultPreview(act, actionRes)}
      </div>
    );
  };

  return (
    <div id="admin-ai-assistant-container" className="relative z-50">
      {/* 1. Floating Action Trigger Button (FAB) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className={clsx(
            "fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl",
            "bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white font-bold text-xs sm:text-sm shadow-xl",
            "hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 group cursor-pointer border border-white/20"
          )}
          title={`Trợ lý Quản trị Admin AI (${MODEL_NAME}) - Nhấn Ctrl + / để mở nhanh`}
        >
          <div className="relative flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <div className="flex flex-col text-left">
            <span className="flex items-center gap-1 font-bold tracking-tight">
              Admin AI Agent
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-mono font-medium">3.5</span>
            </span>
            <span className="text-[10px] text-blue-100 font-normal truncate max-w-[120px]">
              {currentTabName}
            </span>
          </div>
        </button>
      )}

      {/* 2. Floating / Docked Assistant Drawer Window */}
      {isOpen && (
        <div
          className={clsx(
            "fixed z-50 transition-all duration-300 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden",
            isMinimized
              ? "bottom-6 right-6 w-80 h-14 rounded-2xl"
              : isExpanded
              ? "inset-y-4 right-4 w-[min(720px,calc(100vw-32px))] rounded-3xl"
              : "bottom-6 right-6 w-[min(460px,calc(100vw-24px))] h-[min(650px,calc(100vh-48px))] rounded-3xl"
          )}
        >
          {/* Header Bar */}
          <div className="h-16 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-between shrink-0 select-none shadow-xs">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20 shadow-xs shrink-0">
                <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm tracking-tight truncate">Trợ lý Quản trị Admin AI</h3>
                  <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full text-white shrink-0">
                    {MODEL_NAME}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-blue-100 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                  <span className="truncate">Quan sát: {currentTabName}</span>
                </div>
              </div>
            </div>

            {/* Header Controls */}
            <div className="flex items-center gap-1.5 shrink-0 text-white/80">
              {/* Auto-pilot toggle badge */}
              <button
                type="button"
                onClick={toggleAutoPilot}
                className={clsx(
                  "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border shadow-2xs",
                  autoPilot
                    ? "bg-amber-400 text-slate-900 border-amber-300 hover:bg-amber-300"
                    : "bg-white/10 text-white/70 hover:bg-white/20 border-white/20"
                )}
                title={
                  autoPilot
                    ? "Auto-pilot đang BẬT: Tự động chạy tất cả tác vụ và quy trình Make.com do AI sinh"
                    : "Auto-pilot đang TẮT: Cần người quản trị duyệt và bấm chạy từng bước"
                }
              >
                <Zap className={clsx("w-3 h-3", autoPilot ? "text-slate-900 fill-slate-900" : "text-white/70")} />
                <span className="hidden sm:inline">Auto-pilot:</span>
                <span>{autoPilot ? "BẬT" : "TẮT"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className="p-1.5 rounded-lg hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                title="Cài đặt API Key"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={clearChat}
                className="p-1.5 rounded-lg hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                title="Xóa đoạn chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              {!isMinimized && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 rounded-lg hover:text-white hover:bg-white/15 transition-colors hidden sm:flex cursor-pointer"
                  title={isExpanded ? "Thu nhỏ lại" : "Mở rộng cửa sổ"}
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                title={isMinimized ? "Mở cửa sổ" : "Thu nhỏ xuống"}
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                title="Đóng trợ lý"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Body (if not minimized) */}
          {!isMinimized && (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950">
              {/* Context Awareness Bar */}
              <div className="px-3.5 py-2 bg-blue-50/80 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/50 flex items-center justify-between text-xs text-blue-900 dark:text-blue-200">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                  <span className="font-medium truncate">
                    Bối cảnh: <strong className="font-semibold">{currentTabName}</strong>{" "}
                    <span className="text-[10px] text-blue-600 dark:text-blue-300 font-mono">
                      ({location.pathname})
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const ctx = scrapeCurrentPageContext();
                    toastSuccess(`Đã cập nhật bối cảnh trang (${ctx.domSummary.length} ký tự dữ liệu)`);
                  }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900 text-[11px] font-medium text-blue-700 dark:text-blue-300 shrink-0 transition-colors cursor-pointer"
                  title="Chụp lại nội dung mới nhất trên màn hình"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span className="hidden sm:inline">Quét lại</span>
                </button>
              </div>

              {/* API Key Settings Overlay */}
              {showSettings && (
                <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5 text-blue-600" /> Cấu hình Gemini API Key
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowSettings(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5">
                    Mặc định hệ thống dùng key trên máy chủ. Nếu muốn dùng hạn ngạch riêng của bạn, hãy nhập key bên dưới:
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="AIzaSy... (để trống nếu dùng mặc định)"
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleSaveApiKey}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Lưu
                    </button>
                  </div>
                </div>
              )}

              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={clsx(
                      "flex flex-col gap-1.5 max-w-[90%]",
                      msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    {/* Role Tag & Time */}
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium px-1">
                      {msg.role === "user" ? (
                        <>
                          <span>{msg.timestamp}</span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">Bạn (Admin)</span>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                            <Bot className="w-3 h-3" />
                            <span>Gemini 3.5 Assistant</span>
                          </div>
                          <span>•</span>
                          <span>{msg.timestamp}</span>
                        </>
                      )}
                    </div>

                    {/* Attachment preview if any */}
                    {msg.attachment && (
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 max-w-xs shadow-2xs">
                        {msg.attachment.type.startsWith("image/") ? (
                          <img
                            src={msg.attachment.data}
                            alt="Attachment"
                            className="max-h-40 rounded-lg object-contain"
                          />
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                            <Paperclip className="w-4 h-4 text-slate-400" />
                            <span className="truncate">{msg.attachment.name}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={clsx(
                        "p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed relative group shadow-2xs",
                        msg.role === "user"
                          ? "bg-blue-600 text-white rounded-tr-xs"
                          : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-tl-xs"
                      )}
                    >
                      {msg.role === "user" ? (
                        <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                      ) : (
                        <div>
                          {/* Rich Latex & Markdown formatting */}
                          <LatexPreview content={msg.cleanText || msg.text} />

                          {/* Render Executed Actions as Make.com visual pipeline or interactive cards */}
                          {msg.actions && msg.actions.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                              {msg.actions.map((act, actIdx) =>
                                act.type === "WORKFLOW"
                                  ? renderWorkflowPipeline(act, actIdx, msg.id)
                                  : renderSingleActionCard(act, actIdx, msg.id)
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Copy Message Button */}
                      {msg.role === "model" && (
                        <button
                          type="button"
                          onClick={() => copyMessage(msg.id, msg.cleanText || msg.text)}
                          className="absolute bottom-2 right-2 p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Sao chép nội dung"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-fit text-xs text-slate-500 dark:text-slate-400 shadow-2xs">
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    <span>Gemini 3.5 đang phân tích và thực thi...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Suggestions Chips */}
              <div className="px-3 py-2 bg-slate-100/70 dark:bg-slate-900/70 border-t border-slate-200 dark:border-slate-800 overflow-x-auto flex items-center gap-1.5 scrollbar-thin">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" /> Gợi ý:
                </span>
                {quickSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => sendMessage(item.prompt)}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-300 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer shadow-2xs"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Pending Attachment Preview */}
              {pendingAttachment && (
                <div className="px-4 py-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 truncate">
                    <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                    <span className="truncate">{pendingAttachment.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingAttachment(null)}
                    className="p-1 text-slate-400 hover:text-red-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Input Footer */}
              <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className="flex items-end gap-2"
                >
                  {/* File attach button */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) processFile(file);
                    }}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                    title="Đính kèm ảnh chụp màn hình hoặc dán ảnh (Ctrl + V)"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  {/* Input area */}
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500 border border-slate-200 dark:border-slate-700 transition-all">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      onPaste={handlePaste}
                      placeholder={`Hỏi dữ liệu trang ${currentTabName} hoặc kêu làm gì đó...`}
                      rows={1}
                      className="w-full bg-transparent resize-none outline-hidden text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 max-h-28 overflow-y-auto"
                    />
                  </div>

                  {/* Send button */}
                  <button
                    type="submit"
                    disabled={(!input.trim() && !pendingAttachment) || isTyping}
                    className={clsx(
                      "p-2.5 rounded-xl text-white font-bold transition-all shrink-0 cursor-pointer shadow-xs",
                      (!input.trim() && !pendingAttachment) || isTyping
                        ? "bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-400"
                        : "bg-blue-600 hover:bg-blue-700 active:scale-95"
                    )}
                    title="Gửi yêu cầu (Enter)"
                  >
                    {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
