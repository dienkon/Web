import React, { useState, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Atom,
  ArrowRight,
  History,
  Sparkles,
  Copy,
  Download,
  Sun,
  Moon,
  RefreshCw,
  AlertTriangle,
  Check,
  FileJson,
  GraduationCap,
  FlaskConical,
  Undo2,
  ChevronRight,
  Info,
} from "lucide-react";

import { ReactionStep, HistoryItem, Theme } from "./types";
import EquationRenderer from "./components/EquationRenderer";
import ResultCard from "./components/ResultCard";
import LoadingState from "./components/LoadingState";
import HistoryDrawer from "./components/HistoryDrawer";
import Toast, { ToastMessage } from "./components/Toast";

const API_URL = "/api/gemini/chain";

const TAB_1_EXAMPLES = [
  "Fe -> FeCl2 -> Fe(OH)2 -> Fe(OH)3 -> Fe2O3",
  "Na -> NaOH -> NaCl -> AgCl",
  "C -> CO2 -> CaCO3 -> CaO -> CaCl2",
  "Al -> Al2O3 -> AlCl3 -> Al(OH)3 -> NaAlO2",
];

const TAB_2_EXAMPLES = [
  {
    start: "S",
    end: "H2SO4",
    minSteps: 3,
    label: "Lưu huỳnh sang Axit Sunfuric (3 bước)",
  },
  {
    start: "CH4",
    end: "PVC",
    minSteps: 4,
    label: "Metan sang Nhựa PVC (4 bước)",
  },
  {
    start: "Cu",
    end: "Cu(OH)2",
    minSteps: 2,
    label: "Đồng sang Đồng(II) Hiđroxit (2 bước)",
  },
  {
    start: "Fe",
    end: "Fe2O3",
    minSteps: 3,
    label: "Sắt sang Sắt(III) Oxit (3 bước)",
  },
];

const cleanFormula = (raw: string): string => {
  let s = String(raw ?? "").trim();

  s = s.replace(/^\d+\s*/, "");

  s = s.replace(/\s*\((r|dd|k|l|g|s|aq|固体|液体|気体|水溶液)\)/gi, "");

  s = s.replace(/\\(downarrow|uparrow|text|ce|solid|gas|aq)/gi, "");
  s = s.replace(/[↓↑\{\}]/g, "");

  const match = s.match(/^[0-9]*\s*([A-Za-z0-9\(\)_\[\]]+)/);

  if (match) {
    return match[1].trim();
  }

  return s.trim();
};

const normalizeFormula = (value: string): string => {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
};

const getReactionChain = (
  steps: ReactionStep[],
  start: string,
  end: string,
): string[] => {
  if (!steps || steps.length === 0) {
    return [start, end].filter(Boolean);
  }

  const chain: string[] = [start.trim()];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    if (!step?.equation) {
      continue;
    }

    const parts = step.equation.split(
      /->|→|\\rightarrow|\\xrightarrow|\\xrightleftharpoons|=/,
    );

    if (parts.length < 2) {
      continue;
    }

    const rhs = parts[1].split("+").map(cleanFormula).filter(Boolean);

    if (i < steps.length - 1) {
      const nextStep = steps[i + 1];

      if (!nextStep?.equation) {
        if (rhs.length > 0) {
          chain.push(rhs[0]);
        }
        continue;
      }

      const nextParts = nextStep.equation.split(
        /->|→|\\rightarrow|\\xrightarrow|\\xrightleftharpoons|=/,
      );

      const nextLhs =
        nextParts.length > 0
          ? nextParts[0].split("+").map(cleanFormula).filter(Boolean)
          : [];

      const nextSubstance = rhs.find((product) =>
        nextLhs.some(
          (reactant) =>
            normalizeFormula(product) === normalizeFormula(reactant),
        ),
      );

      if (nextSubstance) {
        chain.push(nextSubstance);
      } else if (rhs.length > 0) {
        chain.push(rhs[0]);
      }
    } else {
      const normalizedEnd = normalizeFormula(end);

      const lastSubstance =
        rhs.find((product) => normalizeFormula(product) === normalizedEnd) ||
        rhs[0];

      if (lastSubstance) {
        chain.push(lastSubstance);
      }
    }
  }

  const finalEnd = end.trim();

  const uniqueChain = chain.filter(
    (value, index, self) => self.indexOf(value) === index,
  );

  if (uniqueChain.length === 0) {
    return [start.trim(), finalEnd];
  }

  const lastElem = uniqueChain[uniqueChain.length - 1];

  if (normalizeFormula(lastElem) !== normalizeFormula(finalEnd)) {
    uniqueChain.push(finalEnd);
  } else {
    uniqueChain[uniqueChain.length - 1] = finalEnd;
  }

  return uniqueChain;
};

export default function App() {
  // =========================================================
  // TAB
  // =========================================================

  const [activeTab, setActiveTab] = useState<"analyze" | "generate">("analyze");

  // =========================================================
  // INPUT STATES
  // =========================================================

  const [chainInput, setChainInput] = useState("");
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [minStepsInput, setMinStepsInput] = useState(3);

  // =========================================================
  // RESULT STATES
  // =========================================================

  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<ReactionStep[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  // =========================================================
  // UI STATES
  // =========================================================

  const [theme, setTheme] = useState<Theme>("light");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [jsonCopied, setJsonCopied] = useState(false);

  // =========================================================
  // LOAD THEME + HISTORY
  // =========================================================

  useEffect(() => {
    const savedTheme = localStorage.getItem("chem-theme") as Theme | null;

    if (savedTheme === "dark") {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
    }

    const savedHistory = localStorage.getItem("chem-history");

    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);

        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      } catch (error) {
        console.error("Failed to parse history:", error);

        localStorage.removeItem("chem-history");
      }
    }
  }, []);

  // =========================================================
  // TOAST
  // =========================================================

  const addToast = (type: "success" | "error" | "info", text: string) => {
    const newToast: ToastMessage = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      text,
    };

    setToasts((prev) => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // =========================================================
  // THEME
  // =========================================================

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";

    setTheme(newTheme);

    localStorage.setItem("chem-theme", newTheme);

    document.documentElement.classList.toggle("dark", newTheme === "dark");

    addToast(
      "info",
      `Đã chuyển sang chế độ ${newTheme === "light" ? "sáng" : "tối"}`,
    );
  };

  // =========================================================
  // HISTORY
  // =========================================================

  const saveToHistory = (
    type: "analyze" | "generate",
    input: string,
    resultSteps: ReactionStep[],
    extra?: {
      start?: string;
      end?: string;
      minSteps?: number;
    },
  ) => {
    /*
     * Chỉ lưu dữ liệu JSON thuần.
     *
     * Tuyệt đối không lưu:
     * - Event
     * - DOM element
     * - React state setter
     * - ref
     * - component
     *
     * để tránh:
     * "Converting circular structure to JSON"
     */

    const safeSteps = Array.isArray(resultSteps)
      ? resultSteps.map((step) => ({
          equation: String(step.equation ?? ""),
          latex: String(step.latex ?? ""),
          latexWithCondition: String(step.latexWithCondition ?? ""),
          condition: String(step.condition ?? ""),
          explanation: String(step.explanation ?? ""),
        }))
      : [];

    const newItem: HistoryItem = {
      id: Math.random().toString(36).substring(2, 9),

      type,

      input: String(input),

      start: extra?.start !== undefined ? String(extra.start) : undefined,

      end: extra?.end !== undefined ? String(extra.end) : undefined,

      minSteps:
        extra?.minSteps !== undefined ? Number(extra.minSteps) : undefined,

      steps: safeSteps,

      timestamp: Date.now(),
    };

    const updatedHistory = [
      newItem,
      ...history.filter((item) => item.input !== input),
    ].slice(0, 10);

    setHistory(updatedHistory);

    try {
      localStorage.setItem("chem-history", JSON.stringify(updatedHistory));
    } catch (error) {
      console.error("Failed to save history:", error);
    }
  };

  const deleteHistoryItem = (id: string) => {
    const updated = history.filter((item) => item.id !== id);

    setHistory(updated);

    localStorage.setItem("chem-history", JSON.stringify(updated));

    addToast("success", "Đã xóa một mục khỏi lịch sử");
  };

  const clearAllHistory = () => {
    setHistory([]);

    localStorage.removeItem("chem-history");

    addToast("success", "Đã xóa toàn bộ lịch sử tra cứu");
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setActiveTab(item.type);
    setSteps(Array.isArray(item.steps) ? item.steps : []);
    setApiError(null);

    if (item.type === "analyze") {
      setChainInput(item.input || "");
    } else {
      setStartInput(item.start || "");
      setEndInput(item.end || "");
      setMinStepsInput(Number(item.minSteps) || 3);
    }

    addToast(
      "success",
      `Đã khôi phục kết quả: ${
        item.type === "analyze" ? "Phân tích" : "Tạo chuỗi"
      }`,
    );
  };

  // =========================================================
  // API RESPONSE PARSER
  // =========================================================

  const parseApiResponse = async (response: Response) => {
    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      const text = await response.text();

      throw new Error(text || `Server trả về HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || `API lỗi HTTP ${response.status}`);
    }

    return data;
  };

  // =========================================================
  // TAB 1 — ANALYZE
  // =========================================================

  const handleAnalyzeSubmit = async (e?: FormEvent, customInput?: string) => {
    if (e) {
      e.preventDefault();
    }

    /*
     * QUAN TRỌNG:
     *
     * customInput và chainInput đều phải là string.
     *
     * Không bao giờ lấy:
     * e
     * e.target
     * textarea
     * HTMLTextAreaElement
     *
     * đưa thẳng vào JSON.stringify().
     */

    const targetInput = String(customInput ?? chainInput).trim();

    if (!targetInput) {
      addToast("error", "Vui lòng nhập chuỗi phản ứng!");
      return;
    }

    setLoading(true);
    setApiError(null);
    setSteps([]);

    const requestBody = {
      action: "analyze" as const,
      chain: targetInput,
    };

    try {
      const res = await fetch(API_URL, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },

        body: JSON.stringify(requestBody),
      });

      const data = await parseApiResponse(res);

      if (data?.error) {
        setApiError(String(data.error));

        addToast("error", String(data.error));

        return;
      }

      if (Array.isArray(data?.steps) && data.steps.length > 0) {
        setSteps(data.steps);

        saveToHistory("analyze", targetInput, data.steps);

        addToast("success", "Phân tích chuỗi phản ứng thành công!");

        return;
      }

      throw new Error("Dữ liệu trả về trống hoặc lỗi cấu trúc.");
    } catch (error: any) {
      console.error("Analyze Error:", error);

      /*
       * Retry đúng 1 lần.
       */

      addToast("info", "Hệ thống đang thử phân tích lại một lần nữa...");

      try {
        const retryBody = {
          action: "analyze" as const,
          chain: targetInput,
        };

        const resRetry = await fetch(API_URL, {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },

          body: JSON.stringify(retryBody),
        });

        const dataRetry = await parseApiResponse(resRetry);

        if (dataRetry?.error) {
          setApiError(String(dataRetry.error));

          addToast("error", String(dataRetry.error));

          return;
        }

        if (Array.isArray(dataRetry?.steps) && dataRetry.steps.length > 0) {
          setSteps(dataRetry.steps);

          saveToHistory("analyze", targetInput, dataRetry.steps);

          addToast(
            "success",
            "Phân tích chuỗi phản ứng thành công ở lần thử thứ hai!",
          );

          return;
        }

        throw new Error("API không trả về steps hợp lệ.");
      } catch (retryError: any) {
        const message =
          retryError?.message ||
          error?.message ||
          "Đã xảy ra lỗi hệ thống sau 2 lần thử.";

        setApiError(message);

        addToast("error", "Thất bại khi liên hệ với trợ lý AI.");
      }
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // TAB 2 — GENERATE
  // =========================================================

  const handleGenerateSubmit = async (
    e?: FormEvent,
    customParams?: {
      start: string;
      end: string;
      minSteps: number;
    },
  ) => {
    if (e) {
      e.preventDefault();
    }

    const start = String(customParams ? customParams.start : startInput).trim();

    const end = String(customParams ? customParams.end : endInput).trim();

    const minSteps = Number(
      customParams ? customParams.minSteps : minStepsInput,
    );

    if (!start) {
      addToast("error", "Chất đầu không được để trống!");
      return;
    }

    if (!end) {
      addToast("error", "Chất cuối không được để trống!");
      return;
    }

    if (!Number.isInteger(minSteps) || minSteps < 1) {
      addToast("error", "Số phương trình trung gian tối thiểu là 1!");
      return;
    }

    setLoading(true);
    setApiError(null);
    setSteps([]);

    const summaryInput = `${start} -> ... -> ${end} (≥${minSteps} pđ)`;

    const requestBody = {
      action: "generate" as const,
      start,
      end,
      minSteps,
    };

    try {
      /*
       * QUAN TRỌNG:
       * phải có await ở đây.
       *
       * Code cũ:
       * const res = fetch(...)
       *
       * là Promise<Response>, không phải Response.
       */

      const res = await fetch(API_URL, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },

        body: JSON.stringify(requestBody),
      });

      const data = await parseApiResponse(res);

      if (data?.error) {
        setApiError(String(data.error));

        addToast("error", "Không thể tạo chuỗi phản ứng hợp lệ.");

        return;
      }

      if (Array.isArray(data?.steps) && data.steps.length > 0) {
        setSteps(data.steps);

        saveToHistory("generate", summaryInput, data.steps, {
          start,
          end,
          minSteps,
        });

        addToast(
          "success",
          "Đã tạo chuỗi phản ứng hóa học khép kín thành công!",
        );

        return;
      }

      throw new Error("Đã xảy ra lỗi xử lý dữ liệu.");
    } catch (error: any) {
      console.error("Generate Error:", error);

      addToast("info", "Đang thiết lập lại thông số chuỗi phản ứng hóa học...");

      try {
        const retryBody = {
          action: "generate" as const,
          start,
          end,
          minSteps,
        };

        const resRetry = await fetch(API_URL, {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },

          body: JSON.stringify(retryBody),
        });

        const dataRetry = await parseApiResponse(resRetry);

        if (dataRetry?.error) {
          setApiError(String(dataRetry.error));

          addToast("error", String(dataRetry.error));

          return;
        }

        if (Array.isArray(dataRetry?.steps) && dataRetry.steps.length > 0) {
          setSteps(dataRetry.steps);

          saveToHistory("generate", summaryInput, dataRetry.steps, {
            start,
            end,
            minSteps,
          });

          addToast(
            "success",
            "Đã tạo chuỗi phản ứng thành công ở lượt thử lại!",
          );

          return;
        }

        throw new Error("Không tìm thấy chuỗi phản ứng khả thi.");
      } catch (retryError: any) {
        const message =
          retryError?.message ||
          error?.message ||
          "Không tìm thấy chuỗi phản ứng khả thi.";

        setApiError(message);

        addToast("error", "Lỗi liên kết hóa học.");
      }
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // EXAMPLES
  // =========================================================

  const handleSelectExampleTab1 = (example: string) => {
    setChainInput(example);

    handleAnalyzeSubmit(undefined, example);
  };

  const handleSelectExampleTab2 = (ex: (typeof TAB_2_EXAMPLES)[0]) => {
    setStartInput(ex.start);
    setEndInput(ex.end);
    setMinStepsInput(ex.minSteps);

    handleGenerateSubmit(undefined, ex);
  };

  // =========================================================
  // COPY JSON
  // =========================================================

  const copyFullJson = async () => {
    if (steps.length === 0) {
      return;
    }

    try {
      const safeSteps = steps.map((step) => ({
        equation: String(step.equation ?? ""),
        latex: String(step.latex ?? ""),
        latexWithCondition: String(step.latexWithCondition ?? ""),
        condition: String(step.condition ?? ""),
        explanation: String(step.explanation ?? ""),
      }));

      const fullJsonString = JSON.stringify({ steps: safeSteps }, null, 2);

      await navigator.clipboard.writeText(fullJsonString);

      setJsonCopied(true);

      addToast(
        "success",
        "Đã sao chép toàn bộ dữ liệu phản ứng dưới dạng JSON!",
      );

      setTimeout(() => setJsonCopied(false), 2000);
    } catch (error) {
      console.error("Copy JSON error:", error);

      addToast("error", "Không thể sao chép dữ liệu.");
    }
  };

  // =========================================================
  // EXPORT JSON
  // =========================================================

  const exportJsonFile = () => {
    if (steps.length === 0) {
      return;
    }

    try {
      const safeSteps = steps.map((step) => ({
        equation: String(step.equation ?? ""),
        latex: String(step.latex ?? ""),
        latexWithCondition: String(step.latexWithCondition ?? ""),
        condition: String(step.condition ?? ""),
        explanation: String(step.explanation ?? ""),
      }));

      const fullJsonString = JSON.stringify({ steps: safeSteps }, null, 2);

      const blob = new Blob([fullJsonString], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;

      link.download = `chuoi_phan_ung_${
        activeTab === "analyze" ? "phan_tich" : "tu_tao"
      }_${Date.now()}.json`;

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      addToast("success", "Đã tải xuống file JSON thành công!");
    } catch (error) {
      console.error("Export JSON error:", error);

      addToast("error", "Không thể xuất file JSON.");
    }
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-200 flex flex-col justify-between">
      <div>
        {/* ===================================================
            HEADER
        =================================================== */}

        <header className="border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30 transition-colors shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a
                href="../index.html"
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-450 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer mr-1.5 flex items-center gap-1.5"
                title="Quay lại danh mục"
              >
                <Undo2 className="w-4 h-4" />
              </a>

              <div className="w-10 h-10 rounded-xl bg-indigo-600/10 dark:bg-indigo-400/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60 shadow-inner">
                <FlaskConical className="w-5.5 h-5.5" />
              </div>

              <div>
                <h1 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  Chuỗi phản ứng
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setHistoryOpen(true)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors relative cursor-pointer"
                title="Lịch sử tra cứu"
              >
                <History className="w-4 h-4" />

                {history.length > 0 && (
                  <span className="w-4 h-4 bg-indigo-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                    {history.length}
                  </span>
                )}
              </button>

              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Chuyển đổi giao diện"
              >
                {theme === "light" ? (
                  <Moon className="w-4 h-4" />
                ) : (
                  <Sun className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* ===================================================
            MAIN
        =================================================== */}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12">
          {/* =================================================
              LEFT PANEL
          ================================================= */}

          <section className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 shadow-sm space-y-6 transition-colors">
              {/* TAB SELECTOR */}

              <div className="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-150 dark:border-slate-850">
                <button
                  onClick={() => {
                    setActiveTab("analyze");
                    setApiError(null);
                    setSteps([]);
                  }}
                  className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === "analyze"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-500 dark:text-slate-450 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <FlaskConical className="w-4 h-4" />
                  Phân tích chuỗi
                </button>

                <button
                  onClick={() => {
                    setActiveTab("generate");
                    setApiError(null);
                    setSteps([]);
                  }}
                  className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === "generate"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-500 dark:text-slate-450 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Tạo chuỗi mới
                </button>
              </div>

              {/* DESCRIPTION */}

              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-950 text-xs text-indigo-950 dark:text-indigo-300 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />

                <div className="space-y-1 font-medium">
                  <p>
                    {activeTab === "analyze"
                      ? "Nhập các chất hóa học nối nhau bằng dấu mũi tên. Hệ thống sẽ tự động phân tích chi tiết từng giai đoạn chuyển hóa với đầy đủ điều kiện lý thuyết."
                      : "Nhập chất ban đầu và chất kết thúc mong muốn cùng số phản ứng tối thiểu. Hệ thống sẽ tự động thiết lập con đường phản ứng tối ưu nhất."}
                  </p>

                  <p className="text-slate-450 text-[10px]">
                    Hệ thống có thể mắc lỗi, hãy kiểm tra kĩ!!!
                  </p>
                </div>
              </div>

              {/* =================================================
                  ANALYZE FORM
              ================================================= */}

              {activeTab === "analyze" && (
                <form onSubmit={handleAnalyzeSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="chain"
                      className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
                    >
                      Chuỗi phản ứng cần phân tích
                    </label>

                    <textarea
                      id="chain"
                      value={chainInput}
                      onChange={(e) => setChainInput(e.target.value)}
                      placeholder="Ví dụ: Fe -> FeCl2 -> Fe(OH)2 -> FeO"
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg font-medium transition-all duration-200 resize-none outline-none text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex gap-2.5">
                    <button
                      type="submit"
                      disabled={loading || !chainInput.trim()}
                      className="flex-1 py-3.5 px-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2 cursor-pointer text-sm"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Đang giải mã...</span>
                        </>
                      ) : (
                        <>
                          <FlaskConical className="w-4 h-4" />
                          <span>Phân tích ngay</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setChainInput("");
                        setSteps([]);
                        setApiError(null);
                      }}
                      className="px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-500 dark:text-slate-400 cursor-pointer text-sm"
                    >
                      Xóa
                    </button>
                  </div>
                </form>
              )}

              {/* =================================================
                  GENERATE FORM
              ================================================= */}

              {activeTab === "generate" && (
                <form onSubmit={handleGenerateSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="start"
                        className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
                      >
                        Chất đầu
                      </label>

                      <input
                        id="start"
                        type="text"
                        value={startInput}
                        onChange={(e) => setStartInput(e.target.value)}
                        placeholder="Ví dụ: Fe"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-semibold text-slate-900 dark:text-white transition-all outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="end"
                        className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
                      >
                        Chất cuối
                      </label>

                      <input
                        id="end"
                        type="text"
                        value={endInput}
                        onChange={(e) => setEndInput(e.target.value)}
                        placeholder="Ví dụ: Fe2O3"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-semibold text-slate-900 dark:text-white transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label
                        htmlFor="minSteps"
                        className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
                      >
                        Số phản ứng tối thiểu
                      </label>

                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {minStepsInput} bước
                      </span>
                    </div>

                    <div className="px-1">
                      <input
                        id="minSteps"
                        type="range"
                        min="1"
                        max="6"
                        value={minStepsInput}
                        onChange={(e) =>
                          setMinStepsInput(parseInt(e.target.value, 10))
                        }
                        className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 outline-none"
                      />
                    </div>

                    <div className="relative w-full h-6 mt-1">
                      {[1, 2, 3, 4, 5, 6].map((num) => {
                        const leftPct = ((num - 1) / 5) * 100;

                        return (
                          <span
                            key={num}
                            style={{
                              left: `${leftPct}%`,
                              transform: "translateX(-50%)",
                            }}
                            className={`absolute text-[10px] font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${
                              minStepsInput === num
                                ? "text-indigo-600 dark:text-indigo-400 scale-105 font-extrabold"
                                : "text-slate-400 dark:text-slate-500"
                            }`}
                            onClick={() => setMinStepsInput(num)}
                          >
                            {num === 1
                              ? "1 bước"
                              : num === 3
                                ? "3 bước"
                                : num === 6
                                  ? "6 bước"
                                  : num}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-2.5">
                    <button
                      type="submit"
                      disabled={
                        loading || !startInput.trim() || !endInput.trim()
                      }
                      className="flex-1 py-3.5 px-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2 cursor-pointer text-sm"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />

                          <span>Đang cấu trúc...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />

                          <span>Tự động tạo chuỗi</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setStartInput("");
                        setEndInput("");
                        setSteps([]);
                        setApiError(null);
                      }}
                      className="px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-500 dark:text-slate-400 cursor-pointer text-sm"
                    >
                      Xóa
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* =================================================
                EXAMPLES
            ================================================= */}

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 shadow-sm space-y-4 transition-colors">
              <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                <GraduationCap className="w-4 h-4 text-indigo-500" />

                <span>Gợi ý mẫu thực hành</span>
              </div>

              {activeTab === "analyze" ? (
                <div className="space-y-2">
                  {TAB_1_EXAMPLES.map((example) => (
                    <button
                      key={example}
                      onClick={() => handleSelectExampleTab1(example)}
                      disabled={loading}
                      className="w-full p-2.5 rounded-xl border border-slate-100 hover:border-indigo-150 dark:border-slate-850 dark:hover:border-indigo-900 bg-slate-50/50 dark:bg-slate-950/20 text-left font-mono text-xs hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 text-slate-700 dark:text-slate-300 transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <span className="truncate">{example}</span>

                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {TAB_2_EXAMPLES.map((ex, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectExampleTab2(ex)}
                      disabled={loading}
                      className="w-full p-2.5 rounded-xl border border-slate-100 hover:border-indigo-150 dark:border-slate-850 dark:hover:border-indigo-900 bg-slate-50/50 dark:bg-slate-950/20 text-left text-xs font-semibold hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 text-slate-700 dark:text-slate-300 transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                          {ex.start}
                        </span>

                        <ArrowRight className="w-3 h-3 text-slate-400" />

                        <span className="text-indigo-600 dark:text-indigo-400 font-bold font-mono">
                          {ex.end}
                        </span>

                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                          ({ex.minSteps} bước)
                        </span>
                      </div>

                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* =================================================
              RIGHT OUTPUT
          ================================================= */}

          <section className="lg:col-span-7 flex flex-col h-full min-h-[450px]">
            <div className="flex-1 p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 shadow-sm flex flex-col transition-colors">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-450">
                    Kết quả phân tích
                  </h3>
                </div>

                {steps.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={copyFullJson}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 transition-colors"
                      title="Sao chép JSON"
                    >
                      {jsonCopied ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={exportJsonFile}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 transition-colors"
                      title="Tải JSON"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col justify-center">
                {loading ? (
                  <LoadingState />
                ) : apiError ? (
                  <motion.div
                    initial={{
                      opacity: 0,
                      scale: 0.98,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                    }}
                    className="p-6 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-950 max-w-lg mx-auto text-center space-y-4"
                  >
                    <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto">
                      <AlertTriangle className="w-6 h-6" />
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="font-extrabold text-rose-900 dark:text-rose-300 text-sm md:text-base">
                        Không thể hoàn thành chuỗi phản ứng
                      </h4>

                      <p className="text-xs md:text-sm text-rose-700/95 dark:text-rose-450 leading-relaxed font-medium">
                        {apiError}
                      </p>
                    </div>

                    <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                      Hãy kiểm tra lại hóa trị của các nguyên tố hoặc sử dụng
                      các chất có phản ứng trong thực tế.
                    </div>
                  </motion.div>
                ) : steps.length > 0 ? (
                  <div className="space-y-6">
                    <div className="p-4 rounded-2xl bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/40 flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <Check className="w-4.5 h-4.5" />
                      </span>

                      <div>
                        <p className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                          Tìm thấy {steps.length} phản ứng hóa học liên tiếp
                          thành công!
                        </p>

                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          Tất cả các phương trình phản ứng đều được kiểm nghiệm
                          cân bằng chính xác.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      {steps.map((step, index) => (
                        <ResultCard
                          key={index}
                          step={step}
                          index={index}
                          totalSteps={steps.length}
                        />
                      ))}
                    </div>

                    {activeTab === "generate" && (
                      <motion.div
                        initial={{
                          opacity: 0,
                          y: 15,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        transition={{
                          duration: 0.4,
                          ease: "easeOut",
                        }}
                        className="mt-8 p-5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/60 dark:border-indigo-900/40 space-y-3"
                      >
                        <div className="text-xs font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                          Chuỗi phản ứng hoàn chỉnh
                        </div>

                        <div className="flex flex-wrap items-center gap-y-3 gap-x-2 text-sm font-bold font-mono text-slate-800 dark:text-white bg-white dark:bg-slate-900 p-4 rounded-xl border border-indigo-100/30 dark:border-indigo-950 shadow-inner">
                          {getReactionChain(steps, startInput, endInput).map(
                            (substance, idx, arr) => (
                              <React.Fragment key={`${substance}-${idx}`}>
                                <span className="px-3 py-1 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-lg border border-indigo-100/30 font-extrabold shadow-2xs">
                                  {substance}
                                </span>

                                {idx < arr.length - 1 && (
                                  <ArrowRight className="w-4 h-4 text-indigo-500 shrink-0 mx-1" />
                                )}
                              </React.Fragment>
                            ),
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center max-w-sm mx-auto space-y-4 text-slate-400 dark:text-slate-500">
                    <div className="w-16 h-16 rounded-3xl bg-slate-50 dark:bg-slate-950/80 flex items-center justify-center text-slate-350 dark:text-slate-700 border border-slate-100 dark:border-slate-850 shadow-inner">
                      <Atom className="w-8 h-8 animate-pulse text-indigo-500/80" />
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="text-slate-800 dark:text-slate-200 font-bold text-sm md:text-base">
                        Sẵn sàng phân tích và tạo chuỗi
                      </h4>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="px-8 py-4 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 transition-colors mt-auto"></footer>

      {/* =====================================================
          HISTORY DRAWER
      ===================================================== */}

      <HistoryDrawer
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={history}
        onSelect={loadHistoryItem}
        onDelete={deleteHistoryItem}
        onClearAll={clearAllHistory}
      />

      {/* =====================================================
          TOAST
      ===================================================== */}

      <Toast toasts={toasts} onClose={removeToast} />
    </div>
  );
}
