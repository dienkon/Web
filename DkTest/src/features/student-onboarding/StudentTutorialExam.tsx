/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  Send,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Flag,
  CheckCircle2,
  HelpCircle,
  Eye,
  EyeOff,
  Pencil,
  ArrowUp,
  ArrowDown,
  X,
  Sparkles,
} from "lucide-react";
import ScratchpadModal from "../student-exam/components/ScratchpadModal";
import CasioCalculator from "../../components/exam/CasioCalculator";
import LatexPreview from "../exam-builder/editor/LatexPreview";
import InteractiveFillBlankText from "../../components/exam/InteractiveFillBlankText";
import InteractiveMatchingBoard from "../../components/exam/InteractiveMatchingBoard";
import { DEMO_EXAM, DEMO_QUESTIONS, DEMO_SECTION } from "./StudentOnboardingDemoData";
import { useStudentOnboarding } from "./StudentOnboardingContext";
import { TOUR_DATA_IDS } from "./StudentOnboardingTypes";
import { useAuth } from "../../context/AuthContext";

export default function StudentTutorialExam() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { answersDraft, updateDemoAnswer, triggerAction, currentStepId } = useStudentOnboarding();

  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [displayMode, setDisplayMode] = useState<"paging" | "scroll">("scroll");
  const [showMap, setShowMap] = useState<boolean>(window.innerWidth >= 1024);
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [showCasio, setShowCasio] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  const studentName =
    userProfile?.displayName || userProfile?.fullName || "Bạn (Học sinh trải nghiệm)";

  // Local sandbox timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const answeredCount = Object.keys(answersDraft).filter((k) => {
    const v = answersDraft[k];
    if (v === undefined || v === null || v === "") return false;
    if (Array.isArray(v) && v.length === 0) return false;
    if (typeof v === "object" && Object.keys(v).length === 0) return false;
    return true;
  }).length;

  const currentQ = DEMO_QUESTIONS[activeQuestionIdx];

  const handleSelectQuestion = (idx: number) => {
    setActiveQuestionIdx(idx);
    triggerAction("toggle_map");
    if (displayMode === "scroll") {
      const el = document.getElementById(`demo-q-card-${idx}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const renderQuestionCard = (q: typeof DEMO_QUESTIONS[0], qIdx: number) => {
    return (
      <div
        id={`demo-q-card-${qIdx}`}
        key={`demo_${q.id}_${qIdx}`}
        data-tour-id={TOUR_DATA_IDS.EXAM_QUESTION_CARD}
        className="bg-white border border-slate-200 rounded-3xl p-5 lg:p-8 shadow-2xs space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 bg-blue-600 text-white font-bold text-xs rounded-lg">
              Câu {qIdx + 1}
            </span>
            <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold truncate max-w-[240px]">
              {DEMO_SECTION.title}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {q.type === "single_choice" && "Trắc nghiệm 1 đáp án"}
              {q.type === "multiple_choice" && "Trắc nghiệm nhiều đáp án"}
              {q.type === "true_false" && "Đúng / Sai theo ý"}
              {q.type === "short_answer" && "Điền câu trả lời ngắn"}
              {q.type === "ordering" && "Sắp xếp thứ tự"}
              {q.type === "fill_blank" && "Điền vào chỗ trống"}
              {q.type === "matching" && "Nối bảng (2 cột)"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              data-tour-id={TOUR_DATA_IDS.EXAM_FLAG}
              onClick={() => {
                setFlagged((prev) => ({ ...prev, [q.id]: !prev[q.id] }));
                triggerAction("toggle_flag");
              }}
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

        {/* Prompt */}
        <div className="text-slate-900 text-base lg:text-lg font-medium leading-relaxed">
          {q.type === "fill_blank" ? (
            <InteractiveFillBlankText
              content={q.text}
              answers={typeof answersDraft[q.id] === "object" && answersDraft[q.id] ? answersDraft[q.id] : {}}
              onAnswerChange={(bIdx, val) => {
                updateDemoAnswer(q.id, (prev: any = {}) => ({ ...prev, [bIdx]: val }));
                triggerAction("answer_q6");
              }}
            />
          ) : (
            <LatexPreview content={q.text} />
          )}
        </div>

        {/* Answer interactive region */}
        <div className="pt-2">
          {/* 1. Single Choice */}
          {q.type === "single_choice" && (
            <div data-tour-id={TOUR_DATA_IDS.EXAM_SINGLE_OPTIONS} className="space-y-2.5">
              {q.options?.map((opt, optIdx) => {
                const letter = String.fromCharCode(65 + optIdx);
                const isSelected = answersDraft[q.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      updateDemoAnswer(q.id, opt.id);
                      triggerAction("answer_q1");
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

          {/* 2. Multiple Choice */}
          {q.type === "multiple_choice" && (
            <div data-tour-id={TOUR_DATA_IDS.EXAM_MULTI_OPTIONS} className="space-y-2.5">
              {q.options?.map((opt, optIdx) => {
                const letter = String.fromCharCode(65 + optIdx);
                const selectedArr: string[] = answersDraft[q.id] || [];
                const isSelected = selectedArr.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      updateDemoAnswer(q.id, (prev: string[] = []) => {
                        const existing = Array.isArray(prev) ? prev : [];
                        const next = existing.includes(opt.id)
                          ? existing.filter((id) => id !== opt.id)
                          : [...existing, opt.id];
                        return next;
                      });
                      triggerAction("answer_q2");
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
            <div data-tour-id={TOUR_DATA_IDS.EXAM_TRUEFALSE_GROUP} className="space-y-3">
              {q.statements?.map((stmt, sIdx) => {
                const letter = String.fromCharCode(97 + sIdx);
                const currentAns = answersDraft[q.id]?.[stmt.id];
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
                          updateDemoAnswer(q.id, (prev: any = {}) => ({ ...prev, [stmt.id]: true }));
                          triggerAction("answer_q3");
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          currentAns === true
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        Đúng
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateDemoAnswer(q.id, (prev: any = {}) => ({ ...prev, [stmt.id]: false }));
                          triggerAction("answer_q3");
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          currentAns === false
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
            <div data-tour-id={TOUR_DATA_IDS.EXAM_SHORT_INPUT}>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                Nhập câu trả lời của bạn:
              </label>
              <input
                type="text"
                placeholder="Nhập đáp án ngắn vào đây..."
                value={answersDraft[q.id] || ""}
                onChange={(e) => {
                  updateDemoAnswer(q.id, e.target.value);
                  if (e.target.value.trim().length > 0) triggerAction("answer_q4");
                }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* 5. Ordering */}
          {q.type === "ordering" && (
            <div data-tour-id={TOUR_DATA_IDS.EXAM_ORDERING_ITEMS} className="space-y-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Dùng mũi tên lên/xuống để sắp xếp các mục theo đúng thứ tự logic:
              </label>
              {(() => {
                const items = q.orderingItems || [];
                const currentOrder: string[] =
                  Array.isArray(answersDraft[q.id]) && answersDraft[q.id].length === items.length
                    ? answersDraft[q.id]
                    : items.map((it) => it.id);

                const handleMove = (index: number, direction: "up" | "down") => {
                  const targetIndex = direction === "up" ? index - 1 : index + 1;
                  if (targetIndex < 0 || targetIndex >= currentOrder.length) return;
                  const newOrder = [...currentOrder];
                  const temp = newOrder[index];
                  newOrder[index] = newOrder[targetIndex];
                  newOrder[targetIndex] = temp;
                  updateDemoAnswer(q.id, newOrder);
                  triggerAction("answer_q5");
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

          {/* 6. Fill in Blank inputs list */}
          {q.type === "fill_blank" && (
            <div data-tour-id={TOUR_DATA_IDS.EXAM_FILLBLANK_INPUTS} className="space-y-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Điền từ/số thích hợp vào các ô trống bên dưới:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[0, 1].map((bIdx) => (
                  <div key={bIdx} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                    <div className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-extrabold flex items-center justify-center">
                        #{bIdx + 1}
                      </span>
                      <span>Vị trí ô trống [{bIdx + 1}]</span>
                    </div>
                    <input
                      type="text"
                      placeholder={`Nhập giá trị ô [${bIdx + 1}]...`}
                      value={answersDraft[q.id]?.[bIdx] || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateDemoAnswer(q.id, (prev: any = {}) => ({ ...prev, [bIdx]: val }));
                        triggerAction("answer_q6");
                      }}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. Matching Table */}
          {q.type === "matching" && (
            <div data-tour-id={TOUR_DATA_IDS.EXAM_MATCHING_BOARD} className="space-y-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Nối các mục tương ứng giữa Cột 1 và Cột 2 bên dưới:
              </label>
              <InteractiveMatchingBoard
                leftItems={q.matchingLeft || []}
                rightItems={q.matchingRight || []}
                matches={typeof answersDraft[q.id] === "object" && answersDraft[q.id] ? answersDraft[q.id] : {}}
                onChange={(newMatches) => {
                  updateDemoAnswer(q.id, newMatches);
                  triggerAction("answer_q7");
                }}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-none pt-16">
      {/* Header Bar */}
      <header
        data-tour-id={TOUR_DATA_IDS.EXAM_HEADER}
        className="h-16 bg-white border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between fixed top-0 left-0 right-0 z-50 shadow-2xs"
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
            Dk
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              {DEMO_EXAM.title}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium truncate">
              Thí sinh: <strong className="text-slate-800">{studentName}</strong> • (CHẾ ĐỘ HƯỚNG DẪN DEMO)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Display Mode Toggle */}
          <div
            data-tour-id={TOUR_DATA_IDS.EXAM_MODE_TOGGLE}
            className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl"
          >
            <button
              type="button"
              onClick={() => {
                setDisplayMode("paging");
                triggerAction("toggle_display_mode");
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                displayMode === "paging" ? "bg-white text-blue-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Từng câu
            </button>
            <button
              type="button"
              onClick={() => {
                setDisplayMode("scroll");
                triggerAction("toggle_display_mode");
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                displayMode === "scroll" ? "bg-white text-blue-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Lướt xuống
            </button>
          </div>

          {/* Scratchpad Button */}
          <button
            type="button"
            data-tour-id={TOUR_DATA_IDS.EXAM_SCRATCHPAD}
            onClick={() => {
              setShowScratchpad(true);
              triggerAction("open_scratchpad");
            }}
            className="px-3 py-2 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Mở bảng vẽ nháp"
          >
            <Pencil className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">Bảng nháp</span>
          </button>

          {/* Casio fx-580 VN X Calculator Button */}
          <button
            type="button"
            data-tour-id={TOUR_DATA_IDS.EXAM_CASIO}
            onClick={() => {
              setShowCasio(!showCasio);
              triggerAction("toggle_casio");
            }}
            className={`px-3 py-2 border rounded-xl transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              showCasio
                ? "bg-amber-100 border-amber-300 text-amber-900 ring-2 ring-amber-500/20"
                : "bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800"
            }`}
            title="Mở máy tính CASIO fx-580 VN X"
          >
            <span className="font-extrabold text-[10px] tracking-tighter px-1 py-0.5 bg-amber-800 text-white rounded">
              casio
            </span>
          </button>

          {/* Question Map Button */}
          <button
            type="button"
            data-tour-id={TOUR_DATA_IDS.EXAM_QUESTION_MAP}
            onClick={() => {
              setShowMap(!showMap);
              triggerAction("toggle_map");
            }}
            className="p-2 text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
            title={showMap ? "Ẩn sơ đồ câu hỏi" : "Hiện sơ đồ câu hỏi"}
          >
            {showMap ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="hidden md:inline">{showMap ? "Ẩn sơ đồ" : "Sơ đồ"}</span>
          </button>

          {/* Timer Display */}
          <div
            data-tour-id={TOUR_DATA_IDS.EXAM_TIMER}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-xs sm:text-sm border bg-blue-50 text-blue-700 border-blue-200"
          >
            <Clock className="w-4 h-4" />
            <span>{formatTime(timeLeft)}</span>
          </div>

          {/* Submit Button */}
          <button
            type="button"
            data-tour-id={TOUR_DATA_IDS.EXAM_SUBMIT}
            onClick={() => {
              setShowSubmitConfirm(true);
              triggerAction("open_submit_confirm");
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nộp bài</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-4 gap-4 items-start">
        {/* Left Side: Question List */}
        <div className="flex-1 w-full space-y-4">
          {displayMode === "paging" ? (
            <div className="space-y-4">
              {renderQuestionCard(currentQ, activeQuestionIdx)}

              {/* Navigation Bar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleSelectQuestion(Math.max(0, activeQuestionIdx - 1))}
                  disabled={activeQuestionIdx === 0}
                  className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Câu trước
                </button>

                <span className="text-xs font-bold text-slate-500">
                  Câu {activeQuestionIdx + 1} / {DEMO_QUESTIONS.length}
                </span>

                <button
                  type="button"
                  onClick={() => handleSelectQuestion(Math.min(DEMO_QUESTIONS.length - 1, activeQuestionIdx + 1))}
                  disabled={activeQuestionIdx === DEMO_QUESTIONS.length - 1}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                >
                  Câu tiếp theo <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 pb-12">
              {DEMO_QUESTIONS.map((q, idx) => renderQuestionCard(q, idx))}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center space-y-3">
                <p className="text-xs font-bold text-slate-600">
                  Bạn đã xem qua tất cả {DEMO_QUESTIONS.length} câu hỏi.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowSubmitConfirm(true);
                    triggerAction("open_submit_confirm");
                  }}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Hoàn tất & Nộp bài thi trải nghiệm
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Question Matrix Map */}
        {showMap && (
          <>
            <div
              className="lg:hidden fixed inset-0 bg-slate-900/50 z-40 backdrop-blur-sm"
              onClick={() => setShowMap(false)}
            />
            <div className="fixed inset-y-0 right-0 z-50 lg:static lg:z-auto w-72 lg:w-80 bg-white border-l lg:border border-slate-200 lg:rounded-3xl p-5 shadow-2xl lg:shadow-2xs space-y-4 shrink-0 flex flex-col h-full lg:max-h-[calc(100vh-100px)] lg:sticky lg:top-20 animate-in slide-in-from-right lg:animate-none">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-slate-700">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  Sơ đồ câu hỏi ({answeredCount}/{DEMO_QUESTIONS.length})
                </div>
                <button
                  onClick={() => setShowMap(false)}
                  className="lg:hidden p-1 text-slate-400 hover:text-slate-600 rounded-lg bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                <div className="space-y-2 bg-slate-50/80 rounded-2xl p-3 border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="truncate pr-2">Danh sách 7 câu</span>
                    <span className="text-[11px] font-semibold text-slate-400 shrink-0">
                      {answeredCount}/{DEMO_QUESTIONS.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {DEMO_QUESTIONS.map((q, i) => {
                      const ans = answersDraft[q.id];
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
                          key={`demo_map_${q.id}`}
                          type="button"
                          onClick={() => {
                            handleSelectQuestion(i);
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
              </div>

              {/* Map Legend */}
              <div className="border-t border-slate-100 pt-3 space-y-1.5 text-[11px] text-slate-500 font-medium pb-2">
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
                  <span>Chưa làm ({DEMO_QUESTIONS.length - answeredCount})</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowMap(false);
                  setShowSubmitConfirm(true);
                  triggerAction("open_submit_confirm");
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
          <div
            data-tour-id={TOUR_DATA_IDS.EXAM_CONFIRM_MODAL}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95"
          >
            <h3 className="text-lg font-bold text-slate-900">Xác nhận nộp bài thi?</h3>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Số câu đã hoàn thành:</span>
                <strong className="text-emerald-700 font-bold">
                  {answeredCount} / {DEMO_QUESTIONS.length}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Số câu chưa làm:</span>
                <strong className="text-red-600 font-bold">
                  {DEMO_QUESTIONS.length - answeredCount}
                </strong>
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
                  triggerAction("execute_demo_submit");
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                Xác nhận nộp bài
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real Scratchpad Drawing Modal */}
      <ScratchpadModal
        isOpen={showScratchpad}
        onClose={() => {
          setShowScratchpad(false);
          triggerAction("close_scratchpad");
        }}
        questions={DEMO_QUESTIONS}
        activeQuestionIdx={activeQuestionIdx}
        onSelectQuestion={(idx) => setActiveQuestionIdx(idx)}
        answers={answersDraft}
        onAnswerChange={(qId, val) => updateDemoAnswer(qId, val)}
        timeLeft={timeLeft}
        onSubmitExam={() => setShowSubmitConfirm(true)}
      />

      {/* Floating Draggable Casio fx-580 Calculator */}
      <CasioCalculator
        isOpen={showCasio}
        onClose={() => {
          setShowCasio(false);
          triggerAction("toggle_casio");
        }}
        onSendToScratchpad={() => {}}
      />
    </div>
  );
}
