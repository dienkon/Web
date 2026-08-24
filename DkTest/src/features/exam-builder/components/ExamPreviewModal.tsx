import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  RotateCcw,
  BookOpen,
  UserCheck,
  Check,
  Send,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Flag,
  Maximize2,
  Minimize2,
  Filter,
  Layers,
  FileText,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Exam, Section, Question } from "../../../types";
import LatexPreview from "../editor/LatexPreview";

interface Props {
  exam: Partial<Exam>;
  sections: Section[];
  questions: Question[];
  onClose: () => void;
}

export default function ExamPreviewModal({ exam, sections, questions, onClose }: Props) {
  // Mode States
  const [viewMode, setViewMode] = useState<"student" | "teacher">("student");
  const [displayMode, setDisplayMode] = useState<"paging" | "scroll">("scroll");
  const [showMap, setShowMap] = useState<boolean>(true);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0);
  const [mapFilter, setMapFilter] = useState<"all" | "answered" | "unanswered" | "flagged">("all");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // User Interactive Answers & Flags
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>((exam.timeLimit || 45) * 60);

  const containerRef = useRef<HTMLDivElement>(null);

  const sortedQuestions = [...questions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const pointPerQuestion = sortedQuestions.length > 0 ? 10 / sortedQuestions.length : 0;

  // Countdown timer for student preview mode
  useEffect(() => {
    if (viewMode !== "student" || submitted) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [viewMode, submitted]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
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

  const handleSelectOption = (qId: string, optId: string, isMultiple = false) => {
    if (submitted) return;
    setUserAnswers((prev) => {
      if (isMultiple) {
        const current = (prev[qId] as string[]) || [];
        const next = current.includes(optId)
          ? current.filter((id) => id !== optId)
          : [...current, optId];
        return { ...prev, [qId]: next };
      }
      return { ...prev, [qId]: optId };
    });
  };

  const handleSelectTrueFalse = (qId: string, stmtId: string, val: boolean) => {
    if (submitted) return;
    setUserAnswers((prev) => {
      const current = prev[qId] || {};
      return { ...prev, [qId]: { ...current, [stmtId]: val } };
    });
  };

  const handleShortAnswer = (qId: string, text: string) => {
    if (submitted) return;
    setUserAnswers((prev) => ({ ...prev, [qId]: text }));
  };

  const toggleFlag = (qId: string) => {
    setFlagged((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  const calculateScore = () => {
    let earned = 0;
    let correctCount = 0;
    const total = 10;

    sortedQuestions.forEach((q) => {
      const qPoints = pointPerQuestion;
      const ans = userAnswers[q.id];

      if (q.type === "single_choice") {
        if (ans && q.correctOptionIds?.includes(ans)) {
          earned += qPoints;
          correctCount++;
        }
      } else if (q.type === "multiple_choice") {
        const correctSet = new Set(q.correctOptionIds || []);
        const ansSet = new Set((ans as string[]) || []);
        if (
          correctSet.size > 0 &&
          correctSet.size === ansSet.size &&
          [...correctSet].every((id) => ansSet.has(id))
        ) {
          earned += qPoints;
          correctCount++;
        }
      } else if (q.type === "true_false") {
        const stmts = q.statements || [];
        if (stmts.length > 0) {
          let count = 0;
          stmts.forEach((s) => {
            if (ans && ans[s.id] === s.correctAnswer) {
              count++;
            }
          });
          earned += (count / stmts.length) * qPoints;
          if (count === stmts.length) correctCount++;
        }
      } else if (q.type === "short_answer") {
        const accepted = q.acceptedAnswers?.map((a) => a.trim().toLowerCase()) || [];
        if (ans && accepted.includes(String(ans).trim().toLowerCase())) {
          earned += qPoints;
          correctCount++;
        }
      }
    });

    return {
      earned: Math.round(earned * 100) / 100,
      total,
      correctCount,
      answeredCount: Object.keys(userAnswers).filter((k) => {
        const v = userAnswers[k];
        return v !== undefined && v !== "" && (!Array.isArray(v) || v.length > 0);
      }).length,
    };
  };

  const result = calculateScore();

  const handleQuestionSelectInMap = (index: number) => {
    setActiveQuestionIdx(index);
    if (displayMode === "scroll") {
      const el = document.getElementById(`preview-q-card-${index}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.classList.add("ring-4", "ring-blue-400", "ring-offset-2", "transition-all", "duration-300");
        setTimeout(() => {
          el.classList.remove("ring-4", "ring-blue-400", "ring-offset-2");
        }, 1800);
      }
    }
  };

  // Build groups for continuous scroll-down
  const groups: {
    sectionId: string | null;
    section: Section | null;
    items: { question: Question; index: number }[];
  }[] = [];

  sortedQuestions.forEach((q, idx) => {
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

  const renderQuestionCard = (q: Question, qIdx: number) => {
    const studentAns = userAnswers[q.id];
    const isAnswered =
      studentAns !== undefined &&
      studentAns !== "" &&
      (!Array.isArray(studentAns) || studentAns.length > 0) &&
      (typeof studentAns !== "object" || Object.keys(studentAns).length > 0);

    let isQuestionCorrect = false;
    if (q.type === "single_choice") {
      isQuestionCorrect = q.correctOptionIds?.includes(studentAns);
    } else if (q.type === "multiple_choice") {
      const correctSet = new Set(q.correctOptionIds || []);
      const ansSet = new Set((studentAns as string[]) || []);
      isQuestionCorrect =
        correctSet.size > 0 &&
        correctSet.size === ansSet.size &&
        [...correctSet].every((id) => ansSet.has(id));
    } else if (q.type === "true_false") {
      const stmts = q.statements || [];
      if (stmts.length > 0 && typeof studentAns === "object" && studentAns !== null) {
        let correctCount = 0;
        stmts.forEach((s) => {
          if (studentAns[s.id] === s.correctAnswer) correctCount++;
        });
        isQuestionCorrect = correctCount === stmts.length;
      }
    } else if (q.type === "short_answer") {
      const accepted = q.acceptedAnswers?.map((a) => a.trim().toLowerCase()) || [];
      isQuestionCorrect = accepted.includes(String(studentAns || "").trim().toLowerCase());
    }

    const showKey = viewMode === "teacher" || submitted;
    const isFlagged = !!flagged[q.id];

    return (
      <div
        key={q.id}
        id={`preview-q-card-${qIdx}`}
        className={`bg-white border rounded-3xl p-5 sm:p-7 space-y-5 transition-all shadow-xs scroll-mt-6 ${
          showKey
            ? isQuestionCorrect
              ? "border-emerald-300 ring-1 ring-emerald-200"
              : isAnswered
              ? "border-red-300 ring-1 ring-red-200"
              : "border-slate-200"
            : isFlagged
            ? "border-amber-300 ring-2 ring-amber-300/30"
            : "border-slate-200 hover:border-slate-300"
        }`}
      >
        {/* Question Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2 flex-wrap">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-3 py-1 bg-blue-600 text-white font-black text-xs rounded-xl shadow-xs">
              Câu {qIdx + 1}
            </span>
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              {q.type === "single_choice" && "Trắc nghiệm 1 đáp án"}
              {q.type === "multiple_choice" && "Trắc nghiệm nhiều đáp án"}
              {q.type === "true_false" && "Đúng / Sai theo ý"}
              {q.type === "short_answer" && "Điền câu trả lời ngắn"}
              {q.type === "ordering" && "Sắp xếp thứ tự"}
              {q.type === "fill_blank" && "Điền vào chỗ trống"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 px-2.5 py-1 bg-slate-100 rounded-lg">
              {Math.round(pointPerQuestion * 100) / 100} điểm
            </span>

            {/* Flag / Bookmark Button */}
            <button
              type="button"
              onClick={() => toggleFlag(q.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                isFlagged
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Flag className={`w-3.5 h-3.5 ${isFlagged ? "fill-amber-600 text-amber-600" : ""}`} />
              <span className="hidden sm:inline">{isFlagged ? "Đã đánh dấu" : "Đánh dấu"}</span>
            </button>

            {showKey && (
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                  isQuestionCorrect
                    ? "bg-emerald-100 text-emerald-800"
                    : isAnswered
                    ? "bg-red-100 text-red-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {isQuestionCorrect ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Đúng
                  </>
                ) : isAnswered ? (
                  <>
                    <XCircle className="w-3.5 h-3.5" /> Sai
                  </>
                ) : (
                  "Chưa làm"
                )}
              </span>
            )}
          </div>
        </div>

        {/* Question Text */}
        <div className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed">
          <LatexPreview content={q.text} />
        </div>

        {/* Single Choice Options */}
        {q.type === "single_choice" && (
          <div className="space-y-2.5">
            {q.options?.map((opt, optIdx) => {
              const letter = String.fromCharCode(65 + optIdx);
              const isSelected = studentAns === opt.id;
              const isCorrect = q.correctOptionIds?.includes(opt.id);

              let optStyle = "bg-white border-slate-200 hover:border-slate-300 text-slate-800";
              let pillStyle = "bg-slate-100 text-slate-700 border-slate-200";

              if (showKey) {
                if (isCorrect) {
                  optStyle = "bg-emerald-50/90 border-emerald-300 text-emerald-950 font-semibold";
                  pillStyle = "bg-emerald-600 text-white border-emerald-600";
                } else if (isSelected) {
                  optStyle = "bg-red-50/90 border-red-300 text-red-950";
                  pillStyle = "bg-red-600 text-white border-red-600";
                }
              } else if (isSelected) {
                optStyle = "bg-blue-50 border-blue-500 text-blue-900 shadow-xs font-semibold";
                pillStyle = "bg-blue-600 text-white border-blue-600";
              }

              return (
                <button
                  key={opt.id}
                  disabled={submitted || viewMode === "teacher"}
                  onClick={() => handleSelectOption(q.id, opt.id, false)}
                  className={`w-full p-3.5 sm:p-4 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${optStyle}`}
                >
                  <span className={`w-7 h-7 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 border ${pillStyle}`}>
                    {letter}
                  </span>
                  <div className="flex-1 text-sm pt-0.5">
                    <LatexPreview content={opt.text} />
                  </div>
                  {showKey && isCorrect && (
                    <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md shrink-0 self-center">
                      Đáp án đúng
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Multiple Choice Options */}
        {q.type === "multiple_choice" && (
          <div className="space-y-2.5">
            {q.options?.map((opt, optIdx) => {
              const letter = String.fromCharCode(65 + optIdx);
              const selectedList = (studentAns as string[]) || [];
              const isSelected = selectedList.includes(opt.id);
              const isCorrect = q.correctOptionIds?.includes(opt.id);

              let optStyle = "bg-white border-slate-200 hover:border-slate-300 text-slate-800";
              let pillStyle = "bg-slate-100 text-slate-700 border-slate-200";

              if (showKey) {
                if (isCorrect) {
                  optStyle = "bg-emerald-50/90 border-emerald-300 text-emerald-950 font-semibold";
                  pillStyle = "bg-emerald-600 text-white border-emerald-600";
                } else if (isSelected) {
                  optStyle = "bg-red-50/90 border-red-300 text-red-950";
                  pillStyle = "bg-red-600 text-white border-red-600";
                }
              } else if (isSelected) {
                optStyle = "bg-blue-50 border-blue-500 text-blue-900 shadow-xs font-semibold";
                pillStyle = "bg-blue-600 text-white border-blue-600";
              }

              return (
                <button
                  key={opt.id}
                  disabled={submitted || viewMode === "teacher"}
                  onClick={() => handleSelectOption(q.id, opt.id, true)}
                  className={`w-full p-3.5 sm:p-4 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${optStyle}`}
                >
                  <span className={`w-7 h-7 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 border ${pillStyle}`}>
                    {letter}
                  </span>
                  <div className="flex-1 text-sm pt-0.5">
                    <LatexPreview content={opt.text} />
                  </div>
                  {showKey && isCorrect && (
                    <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md shrink-0 self-center">
                      Đáp án đúng
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* True / False Statements */}
        {q.type === "true_false" && (
          <div className="space-y-3">
            {q.statements?.map((stmt, sIdx) => {
              const sLetter = String.fromCharCode(97 + sIdx);
              const currentChoice = studentAns?.[stmt.id];

              return (
                <div
                  key={stmt.id}
                  className="p-3.5 sm:p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-2.5"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="font-bold text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg shrink-0 mt-0.5">
                      {sLetter})
                    </span>
                    <div className="flex-1 text-sm text-slate-800 font-medium">
                      <LatexPreview content={stmt.text} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-200/60 pl-7">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={submitted || viewMode === "teacher"}
                        onClick={() => handleSelectTrueFalse(q.id, stmt.id, true)}
                        className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          currentChoice === true
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-white border border-slate-200 text-slate-700 hover:border-emerald-300"
                        }`}
                      >
                        Đúng
                      </button>
                      <button
                        type="button"
                        disabled={submitted || viewMode === "teacher"}
                        onClick={() => handleSelectTrueFalse(q.id, stmt.id, false)}
                        className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          currentChoice === false
                            ? "bg-red-600 text-white shadow-xs"
                            : "bg-white border border-slate-200 text-slate-700 hover:border-red-300"
                        }`}
                      >
                        Sai
                      </button>
                    </div>

                    {showKey && (
                      <span className="text-xs font-bold text-slate-700">
                        Đáp án chuẩn:{" "}
                        <strong className={stmt.correctAnswer ? "text-emerald-700" : "text-red-700"}>
                          {stmt.correctAnswer ? "ĐÚNG" : "SAI"}
                        </strong>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Short Answer Input */}
        {q.type === "short_answer" && (
          <div className="space-y-3">
            <input
              type="text"
              disabled={submitted || viewMode === "teacher"}
              value={studentAns || ""}
              onChange={(e) => handleShortAnswer(q.id, e.target.value)}
              placeholder="Nhập câu trả lời của bạn vào đây..."
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-2xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />

            {showKey && q.acceptedAnswers && q.acceptedAnswers.length > 0 && (
              <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-2xl text-xs space-y-1">
                <span className="font-bold text-emerald-900 uppercase tracking-wider block">
                  Các đáp án được chấp nhận:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {q.acceptedAnswers.map((ans, aIdx) => (
                    <span
                      key={aIdx}
                      className="px-2.5 py-1 bg-white border border-emerald-300 text-emerald-900 font-bold rounded-lg"
                    >
                      {ans}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ordering */}
        {q.type === "ordering" && (
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Dùng mũi tên lên/xuống để sắp xếp các mục theo đúng thứ tự logic:
            </label>
            {(() => {
              const items = q.orderingItems || [];
              const currentOrder: string[] = Array.isArray(userAnswers[q.id]) && userAnswers[q.id].length === items.length
                ? userAnswers[q.id]
                : items.map((it) => it.id);

              const handleMove = (index: number, direction: "up" | "down") => {
                if (submitted || viewMode === "teacher") return;
                const targetIndex = direction === "up" ? index - 1 : index + 1;
                if (targetIndex < 0 || targetIndex >= currentOrder.length) return;
                const newOrder = [...currentOrder];
                const temp = newOrder[index];
                newOrder[index] = newOrder[targetIndex];
                newOrder[targetIndex] = temp;
                setUserAnswers((prev) => ({
                  ...prev,
                  [q.id]: newOrder,
                }));
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
                            disabled={idx === 0 || submitted || viewMode === "teacher"}
                            className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 disabled:opacity-30 cursor-pointer"
                            title="Di chuyển lên"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMove(idx, "down")}
                            disabled={idx === currentOrder.length - 1 || submitted || viewMode === "teacher"}
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

        {/* Fill in the Blank */}
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
              const currentAnsMap = typeof userAnswers[q.id] === "object" && userAnswers[q.id] ? userAnswers[q.id] : {};

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
                        disabled={submitted || viewMode === "teacher"}
                        onChange={(e) => {
                          const val = e.target.value;
                          setUserAnswers((prev) => ({
                            ...prev,
                            [q.id]: {
                              ...(typeof prev[q.id] === "object" && prev[q.id] ? prev[q.id] : {}),
                              [bIdx]: val,
                            },
                          }));
                        }}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      />
                      {/* Teacher view / submitted answer key */}
                      {showKey && q.acceptedAnswersPerBlank && q.acceptedAnswersPerBlank[bIdx] && (
                        <div className="text-[11px] font-bold text-emerald-700 pt-1">
                          Đáp án đúng: {q.acceptedAnswersPerBlank[bIdx].join(" hoặc ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Explanation Box */}
        {showKey && q.explanation && (
          <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-amber-950 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-800 font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Lời giải chi tiết:</span>
            </div>
            <div className="leading-relaxed">
              <LatexPreview content={q.explanation} />
            </div>
          </div>
        )}
      </div>
    );
  };

  // Filtered questions for the question map
  const filteredMapIndices = sortedQuestions
    .map((q, idx) => ({ q, idx }))
    .filter(({ q }) => {
      if (mapFilter === "all") return true;
      const ans = userAnswers[q.id];
      const isAns =
        ans !== undefined &&
        ans !== "" &&
        (!Array.isArray(ans) || ans.length > 0) &&
        (typeof ans !== "object" || Object.keys(ans).length > 0);
      if (mapFilter === "answered") return isAns;
      if (mapFilter === "unanswered") return !isAns;
      if (mapFilter === "flagged") return !!flagged[q.id];
      return true;
    });

  const currentPagingQ = sortedQuestions[activeQuestionIdx];
  const currentPagingSection = currentPagingQ?.sectionId
    ? sections.find((s) => s.id === currentPagingQ.sectionId)
    : null;
  const currentPagingSecIndex = currentPagingSection
    ? sections.findIndex((s) => s.id === currentPagingSection.id)
    : -1;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-0 sm:p-3 md:p-5 overflow-hidden"
    >
      <div className="bg-slate-100 rounded-none sm:rounded-3xl shadow-2xl w-full max-w-7xl h-full sm:max-h-[96vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header & Student-like View Mode Bar */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shrink-0 shadow-2xs z-10 flex-wrap">
          {/* Left Title & Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-xs">
              Dk
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                Xem trước: {exam.title || "Bài thi"}
              </h1>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium truncate">
                <span>Mã đề: <strong className="text-slate-800">{exam.code || "---"}</strong></span>
                <span>•</span>
                <span className="font-semibold text-blue-700">{sortedQuestions.length} câu hỏi</span>
              </div>
            </div>
          </div>

          {/* Right Controls - View Mode Toolbar Identical to Student & Teacher */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Role Switcher: Thí sinh vs Giáo viên */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs font-bold border border-slate-200/80">
              <button
                type="button"
                onClick={() => setViewMode("student")}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === "student"
                    ? "bg-white text-blue-700 shadow-xs ring-1 ring-slate-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Làm thử bài thi như học sinh"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Chế độ Thí sinh</span>
                <span className="md:hidden">Làm thử</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("teacher")}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === "teacher"
                    ? "bg-white text-blue-700 shadow-xs ring-1 ring-slate-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Xem đáp án và lời giải chi tiết"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Đáp án & Lời giải</span>
                <span className="md:hidden">Đáp án</span>
              </button>
            </div>

            {/* Display Mode Toggle: Từng câu (Paging) vs Lướt xuống (Scroll) */}
            <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setDisplayMode("paging")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  displayMode === "paging"
                    ? "bg-white text-blue-700 shadow-xs ring-1 ring-slate-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Xem từng câu hỏi 1 trang"
              >
                Từng câu
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode("scroll")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  displayMode === "scroll"
                    ? "bg-white text-blue-700 shadow-xs ring-1 ring-slate-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Cuộn liên tục toàn bộ đề thi"
              >
                Lướt xuống
              </button>
            </div>

            {/* Toggle Map Sidebar */}
            <button
              type="button"
              onClick={() => setShowMap(!showMap)}
              className={`p-2 rounded-xl transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer border ${
                showMap
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200"
              }`}
              title={showMap ? "Ẩn sơ đồ câu hỏi" : "Hiện sơ đồ câu hỏi"}
            >
              {showMap ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="hidden lg:inline">{showMap ? "Ẩn sơ đồ" : "Hiện sơ đồ"}</span>
            </button>

            {/* Timer Badge (Simulation) */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-xs sm:text-sm border ${
                timeLeft < 300
                  ? "bg-red-50 text-red-600 border-red-200 animate-pulse"
                  : "bg-blue-50 text-blue-700 border-blue-200"
              }`}
              title="Đồng hồ làm thử nghiệm"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTime(timeLeft)}</span>
            </div>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Modal Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Đóng xem trước"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content Body */}
        {sortedQuestions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
            <HelpCircle className="w-12 h-12 text-slate-300 mb-3" />
            <h3 className="text-base font-semibold text-slate-700">Chưa có câu hỏi nào trong đề thi</h3>
            <p className="text-xs text-slate-400 mt-1">Hãy thêm câu hỏi trong trình soạn thảo trước khi xem trước.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Questions Main View Area */}
            <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
              {/* Paper Title Banner */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200/70 rounded-3xl p-5 sm:p-6 space-y-2 text-center shadow-2xs">
                <span className="px-3 py-1 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider inline-block mb-1">
                  Đề thi chuẩn hóa
                </span>
                <h1 className="text-lg sm:text-xl font-black text-slate-900">
                  {exam.title || "BÀI THI TRẮC NGHIỆM"}
                </h1>
                {exam.description && (
                  <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto font-medium">
                    {exam.description}
                  </p>
                )}
                <div className="flex items-center justify-center gap-4 text-xs font-bold text-slate-600 pt-2 border-t border-blue-200/50 flex-wrap">
                  <span>Mã đề: <strong className="text-slate-900">{exam.code || "---"}</strong></span>
                  <span>•</span>
                  <span>Thời gian làm bài: <strong className="text-slate-900">{exam.timeLimit || 45} phút</strong></span>
                  <span>•</span>
                  <span>Tổng số câu: <strong className="text-blue-700">{sortedQuestions.length} câu</strong></span>
                </div>
              </div>

              {/* Submitted Score Banner if submitted in Student Mode */}
              {viewMode === "student" && submitted && (
                <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in zoom-in-95">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-emerald-600 text-white rounded-2xl">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-emerald-950">
                        Kết quả nộp bài thử nghiệm
                      </h3>
                      <p className="text-xs font-semibold text-emerald-800">
                        Đúng {result.correctCount} / {sortedQuestions.length} câu • Tỷ lệ chính xác: {Math.round((result.correctCount / sortedQuestions.length) * 100)}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-center sm:text-right">
                      <span className="text-xs font-bold text-emerald-700 uppercase block">Điểm số</span>
                      <span className="text-2xl sm:text-3xl font-black text-emerald-700">
                        {result.earned} <span className="text-sm font-bold text-emerald-600">/ 10</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSubmitted(false);
                        setUserAnswers({});
                        setTimeLeft((exam.timeLimit || 45) * 60);
                      }}
                      className="px-4 py-2 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Làm lại từ đầu
                    </button>
                  </div>
                </div>
              )}

              {/* Display Mode: 1. Paging Mode (Từng câu) */}
              {displayMode === "paging" ? (
                currentPagingQ ? (
                  <div className="space-y-4">
                    {currentPagingSection && (
                      <div className="bg-slate-50/70 border-2 border-slate-300 rounded-3xl p-4 sm:p-5 shadow-2xs space-y-3">
                        <div className="flex items-center gap-2.5 flex-wrap border-b border-slate-200/80 pb-2.5">
                          <span className="px-3 py-1 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider">
                            Phần {currentPagingSecIndex >= 0 ? currentPagingSecIndex + 1 : ""}
                          </span>
                          <h3 className="font-extrabold text-base text-slate-900">
                            {currentPagingSection.title}
                          </h3>
                        </div>
                        {currentPagingSection.description && (
                          <div className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed bg-white border border-slate-200 rounded-xl p-3.5">
                            <LatexPreview content={currentPagingSection.description} />
                          </div>
                        )}
                      </div>
                    )}

                    {renderQuestionCard(currentPagingQ, activeQuestionIdx)}

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

                      <span className="text-xs font-bold text-slate-600">
                        Câu {activeQuestionIdx + 1} / {sortedQuestions.length}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setActiveQuestionIdx((prev) => Math.min(sortedQuestions.length - 1, prev + 1))
                        }
                        disabled={activeQuestionIdx === sortedQuestions.length - 1}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        Câu tiếp theo <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : null
              ) : (
                /* Display Mode: 2. Continuous Scroll Mode (Lướt xuống) */
                <div className="space-y-6">
                  {groups.map((group, gIdx) => {
                    if (group.section) {
                      const secIndex = sections.findIndex((s) => s.id === group.section?.id);
                      return (
                        <div
                          key={`sec-${group.section.id}-${gIdx}`}
                          className="bg-slate-50/50 border-2 border-slate-300 rounded-3xl p-4 sm:p-6 shadow-xs space-y-5"
                        >
                          {/* Section Header */}
                          <div className="space-y-3 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
                            <div className="flex items-center gap-2.5 flex-wrap border-b border-slate-100 pb-3">
                              <span className="px-3 py-1 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider">
                                Phần {secIndex >= 0 ? secIndex + 1 : ""}
                              </span>
                              <h3 className="font-extrabold text-base sm:text-lg text-slate-900">
                                {group.section.title}
                              </h3>
                            </div>
                            {group.section.description && (
                              <div className="text-sm sm:text-base text-slate-800 font-medium leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-4">
                                <LatexPreview content={group.section.description} />
                              </div>
                            )}
                          </div>

                          {/* Enclosed Child Questions */}
                          <div className="space-y-4">
                            {group.items.map(({ question: q, index: qIdx }) =>
                              renderQuestionCard(q, qIdx)
                            )}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={`outside-${gIdx}`} className="space-y-4">
                        {group.items.map(({ question: q, index: qIdx }) =>
                          renderQuestionCard(q, qIdx)
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bottom Action Footer in Student Mode */}
              {viewMode === "student" && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center space-y-4 shadow-sm">
                  {!submitted ? (
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-600">
                        Đã làm: <strong className="text-blue-700">{result.answeredCount}</strong> / {sortedQuestions.length} câu hỏi
                      </p>
                      <button
                        type="button"
                        onClick={() => setSubmitted(true)}
                        className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
                      >
                        <Send className="w-4 h-4" /> Nộp bài thử nghiệm
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm font-bold text-emerald-800">
                        Đã xem toàn bộ kết quả bài làm thử nghiệm!
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSubmitted(false);
                          setUserAnswers({});
                          setTimeLeft((exam.timeLimit || 45) * 60);
                        }}
                        className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" /> Làm lại từ đầu
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Question Navigation Matrix (Collapsible Map) */}
            {showMap && (
              <div className="w-full lg:w-84 border-t lg:border-t-0 lg:border-l border-slate-200 p-4 sm:p-5 bg-white flex flex-col justify-between shrink-0 shadow-xs">
                <div className="space-y-4">
                  {/* Header & Status */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-blue-600" />
                      Sơ đồ câu hỏi
                    </h4>
                    {viewMode === "student" && (
                      <span className="text-xs font-bold text-blue-700 px-2 py-0.5 bg-blue-50 rounded-lg">
                        {result.answeredCount} / {sortedQuestions.length} đã làm
                      </span>
                    )}
                  </div>

                  {/* Filter Tabs in Question Matrix */}
                  <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl text-[11px] font-bold text-slate-600">
                    <button
                      type="button"
                      onClick={() => setMapFilter("all")}
                      className={`py-1 rounded-lg transition-all ${
                        mapFilter === "all" ? "bg-white text-blue-700 shadow-xs" : "hover:text-slate-900"
                      }`}
                    >
                      Tất cả
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapFilter("answered")}
                      className={`py-1 rounded-lg transition-all ${
                        mapFilter === "answered" ? "bg-white text-blue-700 shadow-xs" : "hover:text-slate-900"
                      }`}
                    >
                      Đã làm
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapFilter("unanswered")}
                      className={`py-1 rounded-lg transition-all ${
                        mapFilter === "unanswered" ? "bg-white text-blue-700 shadow-xs" : "hover:text-slate-900"
                      }`}
                    >
                      Chưa
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapFilter("flagged")}
                      className={`py-1 rounded-lg transition-all ${
                        mapFilter === "flagged" ? "bg-white text-amber-700 shadow-xs" : "hover:text-slate-900"
                      }`}
                    >
                      Đánh dấu
                    </button>
                  </div>

                  {/* Matrix of Question Buttons */}
                  <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2 max-h-72 lg:max-h-[55vh] overflow-y-auto p-1 scrollbar-thin">
                    {filteredMapIndices.map(({ q, idx }) => {
                      const ans = userAnswers[q.id];
                      const isAns =
                        ans !== undefined &&
                        ans !== "" &&
                        (!Array.isArray(ans) || ans.length > 0) &&
                        (typeof ans !== "object" || Object.keys(ans).length > 0);
                      const isFlag = !!flagged[q.id];
                      const isActive = activeQuestionIdx === idx;

                      let btnClass = "bg-slate-50 border border-slate-200 text-slate-700 hover:border-blue-400";

                      if (viewMode === "student") {
                        if (submitted) {
                          let isQCorrect = false;
                          if (q.type === "single_choice") isQCorrect = q.correctOptionIds?.includes(ans);
                          else if (q.type === "multiple_choice") {
                            const cSet = new Set(q.correctOptionIds || []);
                            const aSet = new Set((ans as string[]) || []);
                            isQCorrect = cSet.size > 0 && cSet.size === aSet.size && [...cSet].every((id) => aSet.has(id));
                          } else if (q.type === "true_false") {
                            const stmts = q.statements || [];
                            let cCount = 0;
                            stmts.forEach((s) => {
                              if (ans && ans[s.id] === s.correctAnswer) cCount++;
                            });
                            isQCorrect = cCount === stmts.length;
                          } else if (q.type === "short_answer") {
                            const accepted = q.acceptedAnswers?.map((a) => a.trim().toLowerCase()) || [];
                            isQCorrect = accepted.includes(String(ans || "").trim().toLowerCase());
                          } else if (q.type === "ordering") {
                            const items = q.orderingItems || [];
                            const correctOrder = items.map(it => it.id);
                            const userO = Array.isArray(ans) ? ans : [];
                            isQCorrect = userO.length === correctOrder.length && userO.every((val, i) => val === correctOrder[i]);
                          } else if (q.type === "fill_blank") {
                            let isAllCorrect = true;
                            const totalBlanks = Math.max(Object.keys(q.acceptedAnswersPerBlank || {}).length, (q.text?.match(/\[_\]|\[blank\]/gi) || []).length);
                            const currentAnsMap = typeof ans === "object" && ans ? ans : {};
                            for (let b = 0; b < totalBlanks; b++) {
                              const userA = String(currentAnsMap[b] || "").trim().toLowerCase();
                              const accepted = (q.acceptedAnswersPerBlank?.[b] || []).map(a => a.trim().toLowerCase());
                              if (!accepted.includes(userA)) {
                                isAllCorrect = false;
                                break;
                              }
                            }
                            isQCorrect = isAllCorrect;
                          }

                          if (isQCorrect) btnClass = "bg-emerald-600 text-white font-bold";
                          else if (isAns) btnClass = "bg-red-600 text-white font-bold";
                          else btnClass = "bg-slate-100 text-slate-500 border border-slate-200";
                        } else if (isAns) {
                          btnClass = "bg-blue-600 text-white font-bold shadow-xs";
                        }
                      }

                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => handleQuestionSelectInMap(idx)}
                          className={`h-9 rounded-xl font-extrabold text-xs transition-all relative flex items-center justify-center cursor-pointer ${btnClass} ${
                            isActive ? "ring-2 ring-blue-500 ring-offset-1" : ""
                          }`}
                        >
                          {idx + 1}
                          {isFlag && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Submit Action */}
                {viewMode === "student" && !submitted && (
                  <div className="pt-4 border-t border-slate-200 mt-4">
                    <button
                      type="button"
                      onClick={() => setSubmitted(true)}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-2xl transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="w-4 h-4" /> Nộp bài thử nghiệm
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
