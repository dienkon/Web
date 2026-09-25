import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Volume2,
  Languages,
  Sparkles,
  VolumeX,
  X,
  BookOpen,
  Loader2,
  Copy,
  Check,
  Bot,
  ExternalLink,
} from "lucide-react";
import { LookupResult } from "../../services/ai/aiLookup";

interface Props {
  containerRef?: React.RefObject<HTMLElement | null>;
  onAskAi: (selectedText: string) => void;
  examContext?: string;
}

export default function StudentReviewSelectionToolbar({
  containerRef,
  onAskAi,
  examContext,
}: Props) {
  const [selectedText, setSelectedText] = useState("");
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Lookup modal state
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [isLoadingLookup, setIsLoadingLookup] = useState(false);
  const [lookupData, setLookupData] = useState<LookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const toolbarRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Monitor text selection within document or container
  useEffect(() => {
    const handleSelection = () => {
      // If modal is open, don't trigger toolbar selection
      if (isLookupOpen) return;

      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        if (!toolbarRef.current?.matches(":hover") && !isSpeaking) {
          setIsVisible(false);
        }
        return;
      }

      const text = sel.toString().trim();
      // Only trigger if text length is reasonable (1 to 2000 chars)
      if (text.length < 1 || text.length > 2000) {
        setIsVisible(false);
        return;
      }

      // Check if selection is within target container if specified
      if (containerRef && containerRef.current) {
        const anchorNode = sel.anchorNode;
        if (anchorNode && !containerRef.current.contains(anchorNode)) {
          setIsVisible(false);
          return;
        }
      }

      // Don't trigger if user is selecting inside an input, textarea, or buttons
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.closest(".interactive-fill-blank-text"))
      ) {
        return;
      }

      try {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        if (rect.width === 0 && rect.height === 0) return;

        // Position toolbar right above the selection (or below if too close to top)
        const top = rect.top > 60 ? rect.top - 50 : rect.bottom + 10;
        const left = Math.max(10, Math.min(window.innerWidth - 320, rect.left + rect.width / 2 - 140));

        setSelectedText(text);
        setCoords({ top, left });
        setIsVisible(true);
      } catch (e) {
        console.warn("Selection rect calculation failed", e);
      }
    };

    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("touchend", handleSelection);

    return () => {
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("touchend", handleSelection);
    };
  }, [containerRef, isLookupOpen, isSpeaking]);

  // Click outside to dismiss toolbar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(e.target as Node) &&
        !modalRef.current?.contains(e.target as Node)
      ) {
        setIsVisible(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Standard high-quality pronunciation using Web Speech API
  const handlePronounce = useCallback(
    (textToSpeak?: string) => {
      const text = textToSpeak || selectedText;
      if (!text) return;

      if (!("speechSynthesis" in window)) {
        alert("Trình duyệt của bạn chưa hỗ trợ tính năng phát âm giọng nói (SpeechSynthesis).");
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // Detect language: if contains Vietnamese accents -> vi-VN, otherwise en-US
      const isVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text);
      utterance.lang = isVietnamese ? "vi-VN" : "en-US";
      utterance.rate = 0.9; // Slightly slower for crisp clarity
      utterance.pitch = 1.0;

      // Select standard voice
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        if (!isVietnamese) {
          // Prefer high quality English voices (Google, Microsoft, Natural)
          const enVoice =
            voices.find(
              (v) =>
                v.lang.startsWith("en") &&
                (v.name.includes("Natural") ||
                  v.name.includes("Google") ||
                  v.name.includes("Samantha") ||
                  v.name.includes("Jenny"))
            ) || voices.find((v) => v.lang.startsWith("en"));
          if (enVoice) utterance.voice = enVoice;
        } else {
          const viVoice = voices.find((v) => v.lang.startsWith("vi"));
          if (viVoice) utterance.voice = viVoice;
        }
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [selectedText]
  );

  const handleStopSpeaking = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // AI Translate & Lookup with gemini-3.5-flash-lite
  const handleOpenLookup = async () => {
    setIsVisible(false);
    setIsLookupOpen(true);
    setIsLoadingLookup(true);
    setLookupError(null);
    setLookupData(null);

    try {
      const customApiKey = localStorage.getItem("dktest_gemini_api_key") || "";
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (customApiKey) headers["x-gemini-api-key"] = customApiKey;

      const res = await fetch("/api/ai/lookup", {
        method: "POST",
        headers,
        body: JSON.stringify({
          text: selectedText,
          context: examContext || "",
          apiKey: customApiKey,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Lỗi máy chủ (${res.status})`);
      }

      const data: LookupResult = await res.json();
      setLookupData(data);
    } catch (err: any) {
      console.error("Lookup error:", err);
      setLookupError(err.message || "Không thể tra cứu từ/cụm từ này.");
    } finally {
      setIsLoadingLookup(false);
    }
  };

  // Ask AI Tutor directly with selected text
  const handleAskTutor = () => {
    setIsVisible(false);
    onAskAi(selectedText);
  };

  const handleCopyText = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
    });
  };

  return (
    <>
      {/* 1. Floating Action Pill on text selection */}
      {isVisible && (
        <div
          ref={toolbarRef}
          className="fixed z-50 flex items-center gap-1 bg-slate-900/95 text-white backdrop-blur-md px-2.5 py-1.5 rounded-2xl shadow-2xl border border-slate-700/80 animate-in fade-in zoom-in-95 duration-150 text-xs select-none"
          style={{
            top: `${coords.top}px`,
            left: `${coords.left}px`,
          }}
        >
          {/* Pronounce / Nghe Button */}
          {isSpeaking ? (
            <button
              type="button"
              onClick={handleStopSpeaking}
              className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs animate-pulse"
              title="Dừng phát âm"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Dừng</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handlePronounce()}
              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="Phát âm chuẩn (Web Speech API)"
            >
              <Volume2 className="w-3.5 h-3.5 text-blue-200" />
              <span>Phát âm</span>
            </button>
          )}

          {/* AI Translate & Dictionary Button */}
          <button
            type="button"
            onClick={handleOpenLookup}
            className="px-2.5 py-1.5 hover:bg-slate-800 text-slate-200 hover:text-white rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Dịch & Tra phiên âm IPA bằng AI (gemini-3.5-flash-lite)"
          >
            <Languages className="w-3.5 h-3.5 text-emerald-400" />
            <span>Dịch & Phiên âm</span>
          </button>

          {/* Ask AI Tutor Button */}
          <button
            type="button"
            onClick={handleAskTutor}
            className="px-2.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="Hỏi trực tiếp Gia sư AI về đoạn văn bản này"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Hỏi AI Tutor</span>
          </button>
        </div>
      )}

      {/* 2. AI Dictionary & Translation Modal */}
      {isLookupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            ref={modalRef}
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-indigo-50 via-blue-50 to-purple-50 border-b border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Tra cứu & Dịch nghĩa AI
                  </h3>
                  <div className="text-[10px] text-indigo-700 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    <span>Được hỗ trợ bởi model gemini-3.5-flash-lite</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsLookupOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Word & Pronunciation Bar */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 leading-snug break-words">
                      {selectedText}
                    </h2>
                    {lookupData?.pronunciation && (
                      <div className="text-sm font-mono font-bold text-indigo-700 mt-0.5">
                        {lookupData.pronunciation}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handlePronounce(selectedText)}
                      className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-2xs transition-all cursor-pointer"
                      title="Phát âm từ này"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyText(selectedText)}
                      className="p-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition-all cursor-pointer"
                      title="Sao chép từ"
                    >
                      {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {lookupData?.partOfSpeech && (
                  <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800">
                    {lookupData.partOfSpeech}
                  </span>
                )}
              </div>

              {/* Loading State */}
              {isLoadingLookup && (
                <div className="p-8 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">
                    Gia sư AI (gemini-3.5-flash-lite) đang phân tích nghĩa & phiên âm...
                  </p>
                </div>
              )}

              {/* Error State */}
              {lookupError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 space-y-2">
                  <p className="font-bold">Đã có lỗi xảy ra:</p>
                  <p>{lookupError}</p>
                  <button
                    type="button"
                    onClick={handleOpenLookup}
                    className="px-3 py-1 bg-red-600 text-white rounded-lg font-bold text-xs hover:bg-red-700 transition-colors"
                  >
                    Thử lại
                  </button>
                </div>
              )}

              {/* Lookup Content */}
              {lookupData && (
                <div className="space-y-3.5 text-xs text-slate-700 leading-relaxed">
                  {/* Vietnamese Translation */}
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1">
                    <span className="font-extrabold text-[11px] text-emerald-800 uppercase tracking-wider block">
                      Nghĩa tiếng Việt:
                    </span>
                    <p className="text-sm font-bold text-emerald-950">
                      {lookupData.translation}
                    </p>
                    {lookupData.definition && (
                      <p className="text-slate-600 text-xs pt-1 border-t border-emerald-100">
                        {lookupData.definition}
                      </p>
                    )}
                  </div>

                  {/* Grammar & Usage Notes */}
                  {lookupData.grammarNotes && (
                    <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-1">
                      <span className="font-extrabold text-[11px] text-amber-800 uppercase tracking-wider block">
                        Ghi chú ngữ pháp & cách dùng:
                      </span>
                      <p className="text-slate-800 font-medium">
                        {lookupData.grammarNotes}
                      </p>
                    </div>
                  )}

                  {/* Examples */}
                  {lookupData.examples && lookupData.examples.length > 0 && (
                    <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-2">
                      <span className="font-extrabold text-[11px] text-slate-500 uppercase tracking-wider block">
                        Ví dụ thực tế:
                      </span>
                      <div className="space-y-2">
                        {lookupData.examples.map((ex, i) => (
                          <div key={i} className="p-2.5 bg-slate-50 rounded-xl space-y-0.5 border border-slate-100">
                            <div className="font-bold text-slate-900 flex items-center justify-between">
                              <span>{ex.en}</span>
                              <button
                                type="button"
                                onClick={() => handlePronounce(ex.en)}
                                className="text-slate-400 hover:text-indigo-600 p-1"
                                title="Phát âm câu ví dụ"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="text-slate-500 text-[11px]">{ex.vi}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer: Ask AI Tutor Button */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                Bạn cần tìm hiểu sâu hơn?
              </span>

              <button
                type="button"
                onClick={() => {
                  setIsLookupOpen(false);
                  handleAskTutor();
                }}
                className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Bot className="w-4 h-4 text-indigo-200" />
                <span>Hỏi chi tiết với Gia sư AI Tutor</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
