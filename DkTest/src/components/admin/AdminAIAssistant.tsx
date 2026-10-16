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
} from "lucide-react";
import clsx from "clsx";
import LatexPreview from "../../features/exam-builder/editor/LatexPreview";
import { useToast } from "../ui/ToastNotification";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { scanDataHealth } from "../../services/adminService";
import {
  AdminAssistantAction,
  AdminAssistantMessage,
  AdminPageContext,
  parseActionsFromAiText,
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
        text: `Chào Quản trị viên! Tôi là **Trợ lý Ảo Admin AI** ⚡ (vận hành bằng mô hình **${MODEL_NAME}**).\n\nTôi đang trực tiếp quan sát trang bạn đang xem. Bạn có thể:\n- **Hỏi bất kỳ dữ liệu nào trên trang hiện tại** (số lượng, bảng biểu, học sinh, đề thi, cảnh báo...)\n- **Kêu tôi làm gì đó hộ** (Chuyển trang, tìm kiếm, điền thông tin, đổi giao diện, quét kiểm tra lỗi...)\n\nHãy thử chọn một gợi ý nhanh bên dưới hoặc gõ yêu cầu của bạn nhé!`,
        cleanText: `Chào Quản trị viên! Tôi là **Trợ lý Ảo Admin AI** ⚡ (vận hành bằng mô hình **${MODEL_NAME}**).\n\nTôi đang trực tiếp quan sát trang bạn đang xem. Bạn có thể:\n- **Hỏi bất kỳ dữ liệu nào trên trang hiện tại** (số lượng, bảng biểu, học sinh, đề thi, cảnh báo...)\n- **Kêu tôi làm gì đó hộ** (Chuyển trang, tìm kiếm, điền thông tin, đổi giao diện, quét kiểm tra lỗi...)\n\nHãy thử chọn một gợi ý nhanh bên dưới hoặc gõ yêu cầu của bạn nhé!`,
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

  // Execute Autonomous Client Action
  const executeAction = useCallback(
    async (action: AdminAssistantAction): Promise<{ success: boolean; message: string }> => {
      try {
        const isOutsideAssistant = (el: Element | null): boolean => {
          return Boolean(el && !el.closest("#admin-ai-assistant-container"));
        };

        switch (action.type) {
          case "NAVIGATE": {
            if (action.target) {
              const target = action.target.trim();
              if (target.startsWith("http://") || target.startsWith("https://")) {
                window.open(target, "_blank");
                toastSuccess(`Đã mở liên kết: ${target}`);
                return { success: true, message: `Đã mở liên kết ngoài` };
              }
              const normalized = target.startsWith("/") ? target : `/admin/${target}`;
              navigate(normalized);
              toastSuccess(`Đã di chuyển tới: ${normalized}`);
              return { success: true, message: `Đã di chuyển tới ${normalized}` };
            }
            break;
          }

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
                return { success: true, message: `Đã tìm kiếm: "${query}"` };
              } else {
                toastError("Không tìm thấy ô tìm kiếm trên trang hiện tại");
              }
            }
            break;
          }

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

              if (!target && allInputs.length > 0) {
                target = allInputs[0];
              }

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
                  return { success: true, message: `Đã chọn giá trị thành công` };
                } else if ((target as HTMLInputElement).type === "checkbox") {
                  const cb = target as HTMLInputElement;
                  const checked = action.value === "true" || action.value === "1" || action.value === "checked";
                  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked");
                  descriptor?.set?.call(cb, checked);
                  cb.dispatchEvent(new Event("change", { bubbles: true }));
                  toastSuccess(`Đã cập nhật trạng thái chọn: ${checked ? "Bật" : "Tắt"}`);
                  return { success: true, message: `Đã đổi trạng thái checkbox` };
                } else {
                  setReactInputValue(target, action.value);
                  toastSuccess(`Đã điền: "${action.value}"`);
                  return { success: true, message: `Đã điền giá trị thành công` };
                }
              } else {
                toastError(`Không tìm thấy ô nhập liệu "${action.field}"`);
              }
            }
            break;
          }

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
                return { success: true, message: `Đã bấm ${clickedLabel}` };
              } else {
                toastError(`Không tìm thấy nút bấm "${labelOrSelector}" trên trang`);
              }
            }
            break;
          }

          case "SELECT_OPTION": {
            if (action.value !== undefined) {
              const fieldName = (action.field || "").toLowerCase();
              const selects = Array.from(document.querySelectorAll("select")).filter(isOutsideAssistant) as HTMLSelectElement[];

              let targetSelect = selects.find((s) => {
                const name = (s.name || s.id || "").toLowerCase();
                const label = (s.labels?.[0]?.textContent || s.parentElement?.textContent || "").toLowerCase();
                return name.includes(fieldName) || label.includes(fieldName);
              });

              if (!targetSelect && selects.length > 0) {
                targetSelect = selects[0];
              }

              if (targetSelect) {
                const valLower = action.value.toLowerCase();
                const matchedOption = Array.from(targetSelect.options).find(
                  (o) => o.value.toLowerCase().includes(valLower) || o.text.toLowerCase().includes(valLower)
                );
                if (matchedOption) {
                  setReactInputValue(targetSelect, matchedOption.value);
                  toastSuccess(`Đã chọn: "${matchedOption.text.trim()}"`);
                  return { success: true, message: `Đã chọn ${matchedOption.text.trim()}` };
                } else {
                  setReactInputValue(targetSelect, action.value);
                  toastSuccess(`Đã chọn: "${action.value}"`);
                  return { success: true, message: `Đã chọn ${action.value}` };
                }
              } else {
                toastError(`Không tìm thấy menu chọn "${action.field}"`);
              }
            }
            break;
          }

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
                return { success: true, message: isConfirm ? "Đã xác nhận modal" : "Đã hủy modal" };
              }
            }
            toastError("Không tìm thấy hộp thoại đang mở trên màn hình");
            break;
          }

          case "EDIT_ITEM": {
            if (action.target) {
              const norm = action.target.startsWith("/") ? action.target : `/admin/${action.target}`;
              navigate(norm);
              toastSuccess(`Đã mở trang chỉnh sửa: ${norm}`);
              return { success: true, message: `Mở chỉnh sửa ${norm}` };
            }
            if (action.itemType === "exam" && action.id) {
              navigate(`/admin/exams/${action.id}/edit`);
              toastSuccess(`Đang mở chỉnh sửa bài thi...`);
              return { success: true, message: `Mở chỉnh sửa bài thi` };
            }
            if (action.itemType === "student" && action.id) {
              navigate(`/admin/users/${action.id}`);
              toastSuccess(`Đang mở hồ sơ học sinh...`);
              return { success: true, message: `Mở hồ sơ học sinh` };
            }
            break;
          }

          case "TOGGLE_THEME": {
            toggleTheme();
            toastSuccess("Đã chuyển đổi giao diện sáng/tối");
            return { success: true, message: "Đã chuyển đổi giao diện" };
          }

          case "TOGGLE_SIDEBAR": {
            const toggleBtn = (
              document.querySelector('button[title*="thanh điều hướng"], button[title*="điều hướng"]') ||
              document.querySelector('aside button, header button.lg\\:hidden')
            ) as HTMLButtonElement | null;
            if (toggleBtn && isOutsideAssistant(toggleBtn)) {
              toggleBtn.click();
              toastSuccess("Đã thu gọn / mở rộng Sidebar");
              return { success: true, message: "Đã thu gọn/mở rộng Sidebar" };
            }
            break;
          }

          case "TRIGGER_DATA_HEALTH": {
            toastSuccess("Đang kích hoạt quét toàn vẹn dữ liệu hệ thống...");
            try {
              const report = await scanDataHealth();
              toastSuccess(`Quét hoàn tất: ${report?.issues?.length || 0} vấn đề phát hiện.`);
              return { success: true, message: `Đã quét dữ liệu: ${report?.issues?.length || 0} vấn đề` };
            } catch (err: any) {
              toastError("Không thể quét dữ liệu: " + (err.message || String(err)));
            }
            break;
          }

          case "SCROLL": {
            const scrollContainer =
              document.querySelector("main .overflow-y-auto") || document.querySelector("main") || window;
            if (action.direction === "top") {
              scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
            } else {
              scrollContainer.scrollTo({ top: 999999, behavior: "smooth" });
            }
            toastSuccess(`Đã cuộn trang về ${action.direction === "top" ? "đầu trang" : "cuối trang"}`);
            return { success: true, message: `Đã cuộn trang` };
          }

          case "COPY_TEXT": {
            if (action.text) {
              await navigator.clipboard.writeText(action.text);
              toastSuccess("Đã sao chép nội dung vào Clipboard");
              return { success: true, message: "Đã sao chép" };
            }
            break;
          }

          case "RELOAD_DATA": {
            window.location.reload();
            return { success: true, message: "Đang tải lại trang..." };
          }
        }
      } catch (e: any) {
        toastError("Lỗi thực thi hành động: " + (e?.message || String(e)));
      }
      return { success: false, message: "Hành động chưa được hỗ trợ" };
    },
    [navigate, toastSuccess, toastError, toggleTheme]
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

      // Auto execute actions if not executed yet
      if (actions.length > 0) {
        for (const action of actions) {
          const actionKey = `${modelMsgId}_${action.type}_${action.target || action.query || action.field || ""}`;
          if (!executedActionIds.has(actionKey)) {
            setExecutedActionIds((prev) => new Set(prev).add(actionKey));
            await executeAction(action);
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
        { label: "📋 Đề thi nào đang có trên trang?", prompt: "Trên trang này hiện có những đề thi nào và trạng thái của chúng ra sao?" },
        { label: "🚀 Di chuyển tạo đề thi mới", prompt: "Di chuyển đến trang tạo đề thi mới giúp tôi" },
        { label: "🔍 Tìm kiếm đề Toán", prompt: "Tìm kiếm các đề thi môn Toán trên trang hiện tại" },
        { label: "🌐 Mở Web Importer", prompt: "Di chuyển tới trang Web Importer" },
      ];
    }
    if (path.startsWith("/admin/students")) {
      return [
        { label: "👥 Có bao nhiêu học sinh?", prompt: "Tổng số lượng học sinh đang hiển thị trên bảng là bao nhiêu?" },
        { label: "🔍 Tìm học sinh vi phạm/bị khóa", prompt: "Trên trang có học sinh nào đang bị khóa hoặc cảnh báo không?" },
        { label: "📂 Chuyển tới Quản lý Lớp học", prompt: "Di chuyển sang trang quản lý lớp học" },
      ];
    }
    if (path.startsWith("/admin/dashboard")) {
      return [
        { label: "📊 Tóm tắt tình hình hệ thống", prompt: "Tóm tắt nhanh toàn bộ các chỉ số thống kê trên bảng điều khiển hôm nay" },
        { label: "👁️ Có ca thi nào đang diễn ra?", prompt: "Hiện có bài thi hoặc ca giám sát nào đang diễn ra không?" },
        { label: "💰 Mở trang Ví & Công nợ", prompt: "Di chuyển sang trang quản lý ví và công nợ" },
        { label: "🛠️ Quét sức khỏe dữ liệu", prompt: "Kích hoạt quét toàn vẹn sức khỏe dữ liệu hệ thống" },
      ];
    }
    if (path.startsWith("/admin/wallet")) {
      return [
        { label: "💵 Tổng số dư và công nợ", prompt: "Đọc và tóm tắt các con số về số dư ví và công nợ đang hiển thị trên màn hình" },
        { label: "⏳ Giao dịch nạp tiền chờ duyệt", prompt: "Có giao dịch nạp tiền nào đang ở trạng thái chờ duyệt không?" },
        { label: "🎁 Quản lý Voucher", prompt: "Tóm tắt danh sách mã giảm giá Voucher" },
      ];
    }
    if (path.startsWith("/admin/live-proctoring") || path.startsWith("/admin/live-monitor")) {
      return [
        { label: "👁️ Tình trạng phòng thi trực tiếp", prompt: "Tóm tắt tình hình các thí sinh đang trong phòng thi trực tiếp" },
        { label: "⚠️ Cảnh báo gian lận gần nhất", prompt: "Có thí sinh nào bị cảnh báo đổi tab hay gian lận không?" },
      ];
    }
    if (path.startsWith("/admin/submissions")) {
      return [
        { label: "📈 Đánh giá điểm số các bài nộp", prompt: "Phân tích điểm số các bài nộp đang hiển thị trên bảng" },
        { label: "🔍 Lọc bài thi điểm dưới trung bình", prompt: "Có bài nộp nào bị điểm dưới trung bình không?" },
      ];
    }
    if (path.startsWith("/admin/data-health")) {
      return [
        { label: "🩺 Quét sức khỏe dữ liệu", prompt: "Hãy kích hoạt quét toàn vẹn dữ liệu hệ thống" },
        { label: "📋 Phân tích các lỗi dữ liệu", prompt: "Đọc và giải thích các cảnh báo hoặc lỗi dữ liệu đang hiển thị" },
      ];
    }
    if (path.startsWith("/admin/settings")) {
      return [
        { label: "🌓 Chuyển giao diện sáng/tối", prompt: "Chuyển giao diện sang chế độ Tối (Dark mode)" },
        { label: "📁 Thu gọn Sidebar", prompt: "Thu gọn thanh điều hướng bên trái lại giúp tôi" },
        { label: "⚙️ Tóm tắt cài đặt hệ thống", prompt: "Tóm tắt các thông số cài đặt hiện tại trên trang" },
      ];
    }
    return [
      { label: "📊 Trang này có dữ liệu gì?", prompt: "Hãy đọc và tóm tắt toàn bộ dữ liệu đang hiển thị trên trang hiện tại" },
      { label: "🚀 Di chuyển tới Quản lý đề thi", prompt: "Di chuyển đến trang quản lý đề thi" },
      { label: "🌓 Bật/Tắt chế độ tối", prompt: "Chuyển đổi giao diện sáng/tối" },
      { label: "🩺 Kiểm tra lỗi hệ thống", prompt: "Di chuyển tới trang kiểm tra sức khỏe dữ liệu" },
    ];
  }, [location.pathname]);

  const clearChat = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện với Trợ lý AI?")) {
      const resetMsg: Message = {
        id: `welcome_${Date.now()}`,
        role: "model",
        text: `Đã làm mới phiên trò chuyện! Bạn đang ở trang **${currentTabName}** (\`${location.pathname}\`).\n\nTôi sẵn sàng hỗ trợ bạn phân tích dữ liệu hoặc thực hiện các thao tác quản trị!`,
        cleanText: `Đã làm mới phiên trò chuyện! Bạn đang ở trang **${currentTabName}** (\`${location.pathname}\`).\n\nTôi sẵn sàng hỗ trợ bạn phân tích dữ liệu hoặc thực hiện các thao tác quản trị!`,
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
            <div className="flex items-center gap-1 shrink-0 text-white/80">
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

                          {/* Render Executed Actions as interactive cards */}
                          {msg.actions && msg.actions.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                              {msg.actions.map((act, actIdx) => (
                                <div
                                  key={actIdx}
                                  className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200"
                                >
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    <div className="overflow-hidden">
                                      <p className="font-bold text-[11px] truncate">{act.label}</p>
                                      <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-mono truncate">
                                        Type: {act.type} {act.target ? `-> ${act.target}` : ""} {act.query ? `("${act.query}")` : ""}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => executeAction(act)}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg shrink-0 transition-colors cursor-pointer"
                                    title="Thực hiện lại thao tác này"
                                  >
                                    Chạy lại
                                  </button>
                                </div>
                              ))}
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
