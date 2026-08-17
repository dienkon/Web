/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import {
  History,
  Trash2,
  FlaskConical,
  BookOpen,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Award,
  Zap,
  HelpCircle,
  Clock,
  Keyboard,
} from "lucide-react";
import { Header } from "./components/Header";
import { ImageUploader } from "./components/ImageUploader";
import { PipelineResults } from "./components/PipelineResults";
import { runLocalPipeline } from "./utils/pipeline";
import { PipelineResult, HistoryItem } from "./types";
import { translations } from "./utils/translations";

export default function App() {
  const [language, setLanguage] = useState<"vi" | "en">("vi");
  const t = translations[language];

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [rawOCRText, setRawOCRText] = useState<string>("");
  const [currentResults, setCurrentResults] = useState<PipelineResult[]>([]);
  const [selectedEquationIndex, setSelectedEquationIndex] = useState<number>(0);
  const currentResult = currentResults[selectedEquationIndex] || null;
  const [history, setHistory] = useState<HistoryItem[]>([]);
  // Collapse toggles for auxiliary bottom tools
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // AI Connection State
  const [isGeminiConnected, setIsGeminiConnected] = useState<boolean | null>(
    null,
  );
  const [checkingGemini, setCheckingGemini] = useState<boolean>(true);
  const [loadingAI, setLoadingAI] = useState<boolean>(false);

  // 1. Check Gemini connectivity on boot
  useEffect(() => {
    async function checkGemini() {
      try {
        const res = await fetch("/api/health");
        if (res.ok) {
          setIsGeminiConnected(true);
        } else {
          setIsGeminiConnected(false);
        }
      } catch (err) {
        console.warn("Backend or Gemini connectivity check failed:", err);
        setIsGeminiConnected(false);
      } finally {
        setCheckingGemini(false);
      }
    }
    checkGemini();

    // Load history from localStorage if exists
    try {
      const saved = localStorage.getItem("chem_ocr_history");
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (_) {}
  }, []);

  // 2. Trigger local pipeline and optionally query Gemini
  const handleProcessEquation = async (
    ocrText: string,
    ocrConfidence = 85,
    skipAI = false,
  ) => {
    if (!ocrText.trim()) return;

    setLoadingAI(true);
    setSelectedEquationIndex(0);

    // Split input into lines/equations by newline or semicolon
    const lines: string[] = [];
    ocrText.split(/\r?\n/).forEach((line) => {
      const parts = line.split(";");
      parts.forEach((part) => {
        const trimmed = part.trim();
        if (trimmed && /[a-zA-Z0-9]/.test(trimmed)) {
          lines.push(trimmed);
        }
      });
    });

    if (lines.length === 0) {
      setLoadingAI(false);
      return;
    }

    // Step A: Run local pipeline first for all lines (immediate offline results)
    const localResults = lines.map((line) =>
      runLocalPipeline(line, ocrConfidence),
    );
    setCurrentResults(localResults);

    // Create a temporary history item to show local results immediately
    const tempHistoryId = Math.random().toString(36).substring(7);
    const newHistoryItem: HistoryItem = {
      id: tempHistoryId,
      timestamp: new Date().toLocaleTimeString(
        language === "vi" ? "vi-VN" : "en-US",
        { hour: "2-digit", minute: "2-digit" },
      ),
      imagePreview,
      results: localResults,
    };

    setHistory((prev) => {
      const updated = [newHistoryItem, ...prev].slice(0, 10);
      try {
        localStorage.setItem("chem_ocr_history", JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    if (skipAI) {
      setLoadingAI(false);
      return;
    }

    // Step B: Query Gemini for AI-Verification in parallel for all equations
    try {
      const geminiPromises = localResults.map(async (localRes) => {
        try {
          const response = await fetch("/api/gemini/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              rawOCR: localRes.rawOCR,
              repairedText: localRes.repairedText,
              localReactionType: localRes.localReactionType,
              localInferredProducts: localRes.localInferredProducts,
              localBalanced: localRes.localBalanced,
              localInferenceReasoning: localRes.localInferenceReasoning,
              language: language,
            }),
          });

          if (response.ok) {
            const geminiData = await response.json();

            // Merge Gemini data back into the pipeline result
            const mergedResult: PipelineResult = {
              ...localRes,
              geminiVerified: geminiData,
              // Prefer Gemini's balanced equation if valid, else fall back to local
              finalEquation:
                geminiData.balancedEquation ||
                geminiData.correctedEquation ||
                localRes.finalEquation,
              finalReactionType:
                geminiData.reactionType || localRes.finalReactionType,
              finalIsBalanced: !!geminiData.balancedEquation,
              confidence: {
                ...localRes.confidence,
                gemini: Math.min(80, geminiData.confidence || 80),
                overall: Math.min(
                  80,
                  Math.round(
                    (localRes.confidence.overall +
                      Math.min(80, geminiData.confidence || 80)) /
                      2,
                  ),
                ),
              },
              correctionsMade: [
                ...localRes.correctionsMade,
                ...(geminiData.corrections || []).map(
                  (c: string) => `AI: ${c}`,
                ),
              ],
              reasoning: geminiData.reasoning || localRes.reasoning,
            };
            return mergedResult;
          } else {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || "Không kết nối được dịch vụ AI.");
          }
        } catch (err: any) {
          console.warn(
            `AI verification error for ${localRes.rawOCR}. Falling back strictly to local:`,
            err.message,
          );
          return {
            ...localRes,
            geminiError:
              err.message || "Không thể kết nối đến máy chủ Gemini AI.",
          };
        }
      });

      const finalResults = await Promise.all(geminiPromises);
      setCurrentResults(finalResults);

      // Update the history item with the merged results
      setHistory((prev) => {
        const updated = prev.map((item) => {
          if (item.id === tempHistoryId) {
            return { ...item, results: finalResults };
          }
          return item;
        });
        try {
          localStorage.setItem("chem_ocr_history", JSON.stringify(updated));
        } catch (_) {}
        return updated;
      });
    } catch (err: any) {
      console.warn("Critical batch processing error:", err);
    } finally {
      setLoadingAI(false);
    }
  };

  // 3. Handle specific single equation re-analysis from the UI
  const handleReanalyzeEquation = async (index: number) => {
    if (index < 0 || index >= currentResults.length) return;

    setLoadingAI(true);
    const targetRes = currentResults[index];

    try {
      const response = await fetch("/api/gemini/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawOCR: targetRes.rawOCR,
          repairedText: targetRes.repairedText,
          localReactionType: targetRes.localReactionType,
          localInferredProducts: targetRes.localInferredProducts,
          localBalanced: targetRes.localBalanced,
          localInferenceReasoning: targetRes.localInferenceReasoning,
          language: language,
        }),
      });

      if (response.ok) {
        const geminiData = await response.json();

        const geminiConfidence = Math.min(80, geminiData.confidence || 80);
        const overallConfidence = Math.min(
          80,
          Math.round((targetRes.confidence.overall + geminiConfidence) / 2),
        );

        const mergedResult: PipelineResult = {
          ...targetRes,
          geminiVerified: geminiData,
          geminiError: null,
          finalEquation:
            geminiData.balancedEquation ||
            geminiData.correctedEquation ||
            targetRes.finalEquation,
          finalReactionType:
            geminiData.reactionType || targetRes.finalReactionType,
          finalIsBalanced: !!geminiData.balancedEquation,
          confidence: {
            ...targetRes.confidence,
            gemini: geminiConfidence,
            overall: overallConfidence,
          },
          correctionsMade: [
            ...targetRes.correctionsMade,
            ...(geminiData.corrections || []).map((c: string) => `AI: ${c}`),
          ],
          reasoning: geminiData.reasoning || targetRes.reasoning,
        };

        setCurrentResults((prev) => {
          const updated = [...prev];
          updated[index] = mergedResult;

          // Sync changes back into localStorage history log
          setHistory((hPrev) => {
            const hUpdated = hPrev.map((item) => {
              if (
                item.results &&
                item.results.some((r) => r.rawOCR === targetRes.rawOCR)
              ) {
                return {
                  ...item,
                  results: item.results.map((r) =>
                    r.rawOCR === targetRes.rawOCR ? mergedResult : r,
                  ),
                };
              }
              return item;
            });
            try {
              localStorage.setItem(
                "chem_ocr_history",
                JSON.stringify(hUpdated),
              );
            } catch (_) {}
            return hUpdated;
          });

          return updated;
        });
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Không kết nối được dịch vụ AI.");
      }
    } catch (err: any) {
      console.warn(
        `AI verification re-analyze error for ${targetRes.rawOCR}:`,
        err.message,
      );
      setCurrentResults((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...targetRes,
          geminiError:
            err.message || "Không thể kết nối đến máy chủ Gemini AI.",
        };
        return updated;
      });
    } finally {
      setLoadingAI(false);
    }
  };

  // 4. Handle OCR completion from file uploader
  const handleOCRComplete = (text: string, confidence: number) => {
    handleProcessEquation(text, confidence);
  };

  const handleManualAnalyze = (skipAI = false) => {
    handleProcessEquation(rawOCRText, 90, skipAI); // default manual confidence
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem("chem_ocr_history");
    } catch (_) {}
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setImagePreview(item.imagePreview);
    const itemResults = item.results || (item.result ? [item.result] : []);
    const joinedRaw = itemResults.map((r) => r.rawOCR).join("\n");
    setRawOCRText(joinedRaw);
    setCurrentResults(itemResults);
    setSelectedEquationIndex(0);
  };

  // Append symbol helper for keypad
  const appendSymbol = (sym: string) => {
    setRawOCRText((prev) => prev + sym);
  };

  return (
    <div className="min-h-screen animate-gradient-bg text-slate-900 font-sans antialiased pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Header Section with Language Toggle integrated */}
        <Header
          isGeminiConnected={isGeminiConnected}
          checkingGemini={checkingGemini}
          language={language}
          setLanguage={setLanguage}
          t={t}
        />

        {/* 5-ROW STACKED VERTICAL LAYOUT */}
        <div className="flex flex-col gap-6">
          {/* =======================================================
              DÒNG 1: KHUNG ẢNH
              ======================================================= */}
          <section className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2.5 mb-4 border-b border-slate-100 pb-3">
              <FlaskConical className="w-5 h-5 text-blue-500" />
              <div>
                <h2 className="text-xs font-black text-slate-700 uppercase tracking-widest">
                  {t.row1Title}
                </h2>
                <p className="text-[11px] text-slate-450 mt-0.5">
                  {t.row1Subtitle}
                </p>
              </div>
            </div>

            <ImageUploader
              onOCRComplete={handleOCRComplete}
              imagePreview={imagePreview}
              setImagePreview={setImagePreview}
              rawOCRText={rawOCRText}
              setRawOCRText={setRawOCRText}
              t={t}
            />
          </section>

          {/* =======================================================
              DÒNG 2: KHUNG PHƯƠNG TRÌNH ĐẦU VÀO
              ======================================================= */}
          <section className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2.5 mb-4 border-b border-slate-100 pb-3">
              <Keyboard className="w-5 h-5 text-blue-500" />
              <div>
                <h2 className="text-xs font-black text-slate-700 uppercase tracking-widest">
                  {t.row2Title}
                </h2>
                <p className="text-[11px] text-slate-450 mt-0.5">
                  {t.row2Subtitle}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <textarea
                id="raw-ocr-textarea"
                rows={3}
                value={rawOCRText}
                onChange={(e) => setRawOCRText(e.target.value)}
                placeholder={t.row2Placeholder}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/25 transition-all resize-none shadow-inner leading-relaxed"
              />

              {/* Quick Scientific Keyboard Keypad */}
              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200/60">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider px-2 block mr-1">
                  Ký tự nhanh:
                </span>
                {["+", "->", "⇄", "↑", "↓", "t°"].map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => appendSymbol(` ${sym} `)}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-mono text-xs font-bold rounded-lg transition-transform active:scale-95 shadow-sm"
                  >
                    {sym}
                  </button>
                ))}
              </div>

              {rawOCRText.trim() && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    id="btn-manual-analyze"
                    onClick={() => handleManualAnalyze(false)}
                    disabled={loadingAI}
                    className="bg-blue-600 hover:bg-blue-500 text-white py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-blue-500/10 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                  >
                    {loadingAI ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        {t.btnBalancing}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-blue-200" />
                        {language === "vi"
                          ? "Phân tích AI & Cân bằng"
                          : "AI Analyze & Balance"}
                      </>
                    )}
                  </button>

                  <button
                    id="btn-local-balance"
                    onClick={() => handleManualAnalyze(true)}
                    disabled={loadingAI}
                    className="bg-slate-800 hover:bg-slate-700 text-white py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-slate-500/10 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                  >
                    <ArrowRightLeft className="w-4 h-4 text-slate-300" />
                    {language === "vi"
                      ? "Cân bằng thuật toán cục bộ"
                      : "Local Algorithm Balancing"}
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* =======================================================
              DÒNG 3, 4, 5: KẾT QUẢ / PHÂN TÍCH CHUYÊN SÂU / ĐÁNH GIÁ KẾT QUẢ
              ======================================================= */}
          {currentResults.length > 0 ? (
            <PipelineResults
              results={currentResults}
              selectedIndex={selectedEquationIndex}
              onSelectIndex={setSelectedEquationIndex}
              loadingAI={loadingAI}
              t={t}
              language={language}
              onReanalyzeEquation={handleReanalyzeEquation}
            />
          ) : (
            <div className="flex flex-col gap-6">
              {/* Dòng 3 Placeholder */}
              <div className="bg-white border border-slate-100 border-dashed p-6 rounded-2xl text-center flex flex-col items-center justify-center min-h-[120px] select-none text-slate-400">
                <Award className="w-6 h-6 mb-2 text-slate-300 animate-pulse" />
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                  {t.row3Title}
                </h3>
                <p className="text-[10px] mt-1 text-slate-450">
                  {language === "vi"
                    ? "Chưa có dữ liệu phân tích. Hãy hoàn tất Dòng 1 hoặc Dòng 2."
                    : "Waiting for input. Please complete Row 1 or Row 2 first."}
                </p>
              </div>

              {/* Dòng 4 Placeholder */}
              <div className="bg-white border border-slate-100 border-dashed p-6 rounded-2xl text-center flex flex-col items-center justify-center min-h-[140px] select-none text-slate-400">
                <Zap className="w-6 h-6 mb-2 text-slate-300 animate-pulse" />
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                  {t.row4Title}
                </h3>
                <p className="text-[10px] mt-1 text-slate-450">
                  {language === "vi"
                    ? "Chi tiết phản ứng (ion, redox, ứng dụng) sẽ hiển thị tại đây."
                    : "Detailed chemical properties (ionic, redox, theory) will appear here."}
                </p>
              </div>

              {/* Dòng 5 Placeholder */}
              <div className="bg-white border border-slate-100 border-dashed p-6 rounded-2xl text-center flex flex-col items-center justify-center min-h-[120px] select-none text-slate-400">
                <HelpCircle className="w-6 h-6 mb-2 text-slate-300 animate-pulse" />
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                  {t.row5Title}
                </h3>
                <p className="text-[10px] mt-1 text-slate-450">
                  {language === "vi"
                    ? "Độ tin cậy của thuật toán và AI sẽ tự động phân rã chi tiết."
                    : "Heuristics and AI pipeline evaluation metrics will be mapped here."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* EXTRA TOOLS SYSTEM AT THE VERY BOTTOM (COLLAPSIBLE DRAWER FOOTER) */}
        <div className="mt-12 border-t border-slate-200 pt-6 space-y-3">
          {/* Header controllers */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {history.length > 0 && (
              <button
                type="button"
                id="toggle-history-btn"
                onClick={() => {
                  setShowHistory(!showHistory);
                }}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1.5 transition-colors focus:outline-none select-none active:scale-95 shadow-sm"
              >
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                {language === "vi" ? "Lịch Sử Phân Tích" : "Analysis History"} (
                {history.length})
                {showHistory ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>

          {/* Drawer content: Analysis History */}
          {showHistory && history.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                  {language === "vi"
                    ? "Bộ nhớ đệm lịch sử cục bộ"
                    : "Local History Log cache"}
                </span>
                <button
                  type="button"
                  id="btn-clear-history-bottom"
                  onClick={() => {
                    clearHistory();
                    setShowHistory(false);
                  }}
                  className="text-[10px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  {language === "vi" ? "Xóa lịch sử" : "Clear History"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                {history.map((item) => {
                  const itemResults =
                    item.results || (item.result ? [item.result] : []);
                  const firstEq = itemResults[0]?.finalEquation || "";
                  const count = itemResults.length;
                  const displayEquation =
                    count > 1 ? `${firstEq} ... (+${count - 1} PT)` : firstEq;
                  const displayRaw = itemResults
                    .map((r) => r.rawOCR)
                    .join(", ");

                  return (
                    <button
                      key={item.id}
                      id={`history-item-bottom-${item.id}`}
                      onClick={() => {
                        loadHistoryItem(item);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="flex flex-col p-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/60 rounded-xl text-left transition-colors font-sans"
                    >
                      <code className="text-xs font-mono font-bold text-blue-600 truncate w-full">
                        {displayEquation}
                      </code>
                      <span className="text-[10px] text-slate-500 truncate w-full mt-1.5 block">
                        Quét: {displayRaw} ({item.timestamp})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
