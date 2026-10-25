/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useExamEditorContext } from "../context/ExamEditorContext";
import LatexPreview from "../editor/LatexPreview";
import RichTextEditor from "../editor/RichTextEditor";
import AudioConfigEditor from "../../../components/exam/AudioConfigEditor";
import InteractiveMatchingBoard from "../../../components/exam/InteractiveMatchingBoard";
import ConfirmModal from "../../../components/ui/ConfirmModal";
import ExamExportModal from "./ExamExportModal";
import { useToast } from "../../../components/ui/ToastNotification";
import { Question, QuestionType, Section, MatchingItem, OrderingItem, TrueFalseStatement } from "../../../types";
import { v4 as uuidv4 } from "uuid";
import { extractBlanksCount } from "../questions/FillBlankEditor";
import {
  Check,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileText,
  Save,
  Download,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  CheckSquare,
  Zap,
  List,
  Layers,
  Search,
  CheckCheck,
  RotateCcw,
  Headphones,
  Image as ImageIcon,
  Copy,
  ArrowUp,
  ArrowDown,
  Pin,
  Shuffle,
  Grid3X3,
  X,
  Sigma,
  TrendingUp,
  Columns,
  SplitSquareHorizontal,
  Folder,
  Bot,
  UserCheck,
  Table2,
  ListOrdered,
  Type,
  AlertCircle,
} from "lucide-react";

interface Props {
  onSwitchToQuestionEditor?: (questionId: string) => void;
}

export function formatFillBlankForPreview(
  text: string,
  answersMap: Record<number, string[]> | undefined,
  showAnswers: boolean
): string {
  if (!text) return "";
  let blankCounter = 0;
  return text.replace(/\[_\]|\[blank\]/gi, () => {
    const idx = blankCounter++;
    const answers = answersMap?.[idx];
    const firstAns = Array.isArray(answers) && answers.length > 0 ? answers[0] : "";
    if (showAnswers && firstAns) {
      return `**[(${idx + 1}) ${firstAns}]**`;
    }
    return `[(${idx + 1}) ....................]`;
  });
}

export default function ExamVisualPreviewEditor({ onSwitchToQuestionEditor }: Props) {
  const { state, actions } = useExamEditorContext();
  const { examMeta, sections, questions, activeQuestionId } = state;
  const { success: showSuccessToast, info: showInfoToast } = useToast();

  // Preview & View Options
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(true);
  const [showAllExplanations, setShowAllExplanations] = useState(false);
  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, boolean>>({});
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showMatrixModal, setShowMatrixModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);

  // New question type selector dropdown open state
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Panel Refs
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const leftEditorScrollRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const workspaceContainerRef = useRef<HTMLDivElement>(null);
  const isAutoScrollingRight = useRef(false);
  const clickedFromRightRef = useRef(false);

  // Split layout resizable width and collapsible state
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("dk_exam_editor_left_width");
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 20 && parsed <= 80) return parsed;
      }
    } catch {}
    return 50;
  });
  const [isLeftCollapsed, setIsLeftCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("dk_exam_editor_left_collapsed") === "true";
    } catch {}
    return false;
  });
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    return typeof window !== "undefined" ? window.innerWidth >= 1024 : true;
  });

  // Track responsive screen size for side-by-side vs stacked layout
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Sync layout preferences to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("dk_exam_editor_left_width", leftPanelWidth.toString());
    } catch {}
  }, [leftPanelWidth]);

  useEffect(() => {
    try {
      localStorage.setItem("dk_exam_editor_left_collapsed", isLeftCollapsed.toString());
    } catch {}
  }, [isLeftCollapsed]);

  // Handle divider drag to resize left panel
  const handleDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingDivider(true);
    const container = workspaceContainerRef.current;
    if (!container) return;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      if (!rect.width) return;
      const newWidthPercent = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(20, Math.min(80, newWidthPercent));
      setLeftPanelWidth(clamped);
    };

    const handleMouseUp = () => {
      setIsDraggingDivider(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Ensure an active question is always selected
  const activeQuestion = useMemo(() => {
    if (!questions || questions.length === 0) return null;
    if (activeQuestionId) {
      const found = questions.find((q) => q.id === activeQuestionId);
      if (found) return found;
    }
    return questions[0];
  }, [questions, activeQuestionId]);

  const activeIndex = useMemo(() => {
    if (!activeQuestion || !questions) return -1;
    return questions.findIndex((q) => q.id === activeQuestion.id);
  }, [questions, activeQuestion]);

  // Initial selection of question 1 if none active
  useEffect(() => {
    if (!activeQuestionId && questions.length > 0) {
      actions.setActiveQuestion(questions[0].id);
    }
  }, [activeQuestionId, questions, actions]);

  // Calculate sum of raw points to compute system score scaling (10-point scale)
  const totalRawPoints = useMemo(() => {
    return questions.reduce((sum, q) => sum + (q.points ?? 1), 0) || 1;
  }, [questions]);
  const targetSystemTotal = 10;

  // Compute scaled system points for a question
  const getSystemScaledPoint = (rawPoints: number) => {
    if (!totalRawPoints || totalRawPoints <= 0) return "0";
    const scaled = (rawPoints / totalRawPoints) * targetSystemTotal;
    if (isNaN(scaled) || !isFinite(scaled)) return "0";
    return scaled % 1 === 0 ? scaled.toFixed(0) : scaled.toFixed(2);
  };

  // Group questions by section for paper preview
  const questionGroups = useMemo(() => {
    const groups: {
      sectionId: string | null;
      title?: string;
      description?: string;
      items: { q: Question; globalIndex: number }[];
    }[] = [];

    questions.forEach((q, idx) => {
      const secId = q.sectionId || null;
      const lastGroup = groups[groups.length - 1];

      if (lastGroup && lastGroup.sectionId === secId) {
        lastGroup.items.push({ q, globalIndex: idx });
      } else {
        const sec = secId ? sections.find((s) => s.id === secId) : null;
        groups.push({
          sectionId: secId,
          title: sec?.title,
          description: sec?.description,
          items: [{ q, globalIndex: idx }],
        });
      }
    });

    return groups;
  }, [questions, sections]);

  // AUTO-FOLLOW: Smoothly scroll the RIGHT PAPER PREVIEW strictly to the active question
  useEffect(() => {
    if (!activeQuestion) return;

    // If the question was selected directly by clicking on the right preview card,
    // don't jar the user's scroll position, just apply the transient focus ring.
    if (clickedFromRightRef.current) {
      clickedFromRightRef.current = false;
      const el = document.getElementById(`preview-q-${activeQuestion.id}`);
      if (el) {
        el.classList.add("ring-4", "ring-blue-500", "ring-offset-2", "transition-all", "duration-500");
        const timer = setTimeout(() => {
          el.classList.remove("ring-4", "ring-blue-500", "ring-offset-2");
        }, 800);
        return () => clearTimeout(timer);
      }
      return;
    }

    if (isAutoScrollingRight.current) return;

    const el = document.getElementById(`preview-q-${activeQuestion.id}`);
    if (el && rightPanelRef.current) {
      isAutoScrollingRight.current = true;
      const zoomScale = (zoomLevel || 100) / 100;
      const containerRect = rightPanelRef.current.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();

      // Zoom-compensated scroll target calculation
      const relativeTop = (elRect.top - containerRect.top) / zoomScale;
      const targetScrollTop = Math.round(rightPanelRef.current.scrollTop + relativeTop - 24);

      rightPanelRef.current.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: "smooth",
      });

      // Transient focus highlight
      el.classList.add("ring-4", "ring-blue-500", "ring-offset-2", "transition-all", "duration-500");
      const timer = setTimeout(() => {
        el.classList.remove("ring-4", "ring-blue-500", "ring-offset-2");
        isAutoScrollingRight.current = false;
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [activeQuestion?.id, zoomLevel]);

  // AUTO-FOLLOW: Scroll the horizontal CAROUSEL pill into view and reset left editor scroll
  useEffect(() => {
    if (!activeQuestion) return;
    if (carouselRef.current) {
      const activePill = carouselRef.current.querySelector(
        `[data-pill-id="${activeQuestion.id}"]`
      ) as HTMLElement | null;
      if (activePill) {
        activePill.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
    // Always smoothly reset left editor scroll to top so teacher sees question prompt immediately
    leftEditorScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeQuestion?.id]);

  // Keyboard navigation shortcuts: Alt + ArrowLeft (Prev), Alt + ArrowRight (Next), Alt + [ (Toggle Collapse)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevQuestion();
      } else if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        handleNextQuestion();
      } else if (e.altKey && (e.key === "[" || e.key === "{")) {
        e.preventDefault();
        setIsLeftCollapsed((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, questions.length]);

  // Navigation handlers
  const handleSelectQuestion = (qId: string) => {
    clickedFromRightRef.current = false;
    actions.setActiveQuestion(qId);
  };

  const handleSelectQuestionFromRight = (qId: string) => {
    clickedFromRightRef.current = true;
    actions.setActiveQuestion(qId);
  };

  const handleNextQuestion = () => {
    if (activeIndex >= 0 && activeIndex < questions.length - 1) {
      clickedFromRightRef.current = false;
      actions.setActiveQuestion(questions[activeIndex + 1].id);
    }
  };

  const handlePrevQuestion = () => {
    if (activeIndex > 0) {
      clickedFromRightRef.current = false;
      actions.setActiveQuestion(questions[activeIndex - 1].id);
    }
  };

  // Add question helper
  const handleAddQuestionWithType = (type: QuestionType) => {
    const currentSecId = activeQuestion?.sectionId || (sections[0]?.id ?? null);
    actions.addQuestion(type, currentSecId);
    setShowAddMenu(false);
    showSuccessToast("Đã thêm câu hỏi mới!");
  };

  // Safe question type switcher that preserves prompt/points and populates required schema structures
  const handleQuestionTypeChange = (q: Question, newType: QuestionType) => {
    const updates: Partial<Question> = { type: newType };

    if (newType === "single_choice") {
      if (!q.options || q.options.length < 2) {
        const idA = `opt_${Date.now()}_1`;
        const idB = `opt_${Date.now()}_2`;
        const idC = `opt_${Date.now()}_3`;
        const idD = `opt_${Date.now()}_4`;
        updates.options = [
          { id: idA, text: "Lựa chọn A" },
          { id: idB, text: "Lựa chọn B" },
          { id: idC, text: "Lựa chọn C" },
          { id: idD, text: "Lựa chọn D" },
        ];
        updates.correctOptionIds = [idA];
      } else if (!q.correctOptionIds || q.correctOptionIds.length === 0) {
        updates.correctOptionIds = [q.options[0].id];
      } else if (q.correctOptionIds.length > 1) {
        updates.correctOptionIds = [q.correctOptionIds[0]];
      }
    } else if (newType === "multiple_choice") {
      if (!q.options || q.options.length < 2) {
        const idA = `opt_${Date.now()}_1`;
        const idB = `opt_${Date.now()}_2`;
        const idC = `opt_${Date.now()}_3`;
        const idD = `opt_${Date.now()}_4`;
        updates.options = [
          { id: idA, text: "Lựa chọn A" },
          { id: idB, text: "Lựa chọn B" },
          { id: idC, text: "Lựa chọn C" },
          { id: idD, text: "Lựa chọn D" },
        ];
        updates.correctOptionIds = [idA, idB];
      }
    } else if (newType === "true_false") {
      if (!q.statements || q.statements.length === 0) {
        updates.statements = [
          { id: `stmt_${Date.now()}_a`, text: "Mệnh đề a", correctAnswer: true },
          { id: `stmt_${Date.now()}_b`, text: "Mệnh đề b", correctAnswer: false },
          { id: `stmt_${Date.now()}_c`, text: "Mệnh đề c", correctAnswer: true },
          { id: `stmt_${Date.now()}_d`, text: "Mệnh đề d", correctAnswer: false },
        ];
      }
    } else if (newType === "short_answer") {
      if (!q.acceptedAnswers || q.acceptedAnswers.length === 0) {
        updates.acceptedAnswers = [""];
      }
    } else if (newType === "matching") {
      if (!q.matchingLeft || q.matchingLeft.length === 0) {
        updates.matchingLeft = [
          { id: `l_${Date.now()}_1`, label: "1", text: "Khái niệm hoặc câu hỏi 1" },
          { id: `l_${Date.now()}_2`, label: "2", text: "Khái niệm hoặc câu hỏi 2" },
          { id: `l_${Date.now()}_3`, label: "3", text: "Khái niệm hoặc câu hỏi 3" },
        ];
      }
      if (!q.matchingRight || q.matchingRight.length === 0) {
        updates.matchingRight = [
          { id: `r_${Date.now()}_a`, label: "a", text: "Định nghĩa hoặc câu trả lời A" },
          { id: `r_${Date.now()}_b`, label: "b", text: "Định nghĩa hoặc câu trả lời B" },
          { id: `r_${Date.now()}_c`, label: "c", text: "Định nghĩa hoặc câu trả lời C" },
        ];
      }
      if (!q.correctMatches || Object.keys(q.correctMatches).length === 0) {
        updates.correctMatches = { "1": "a", "2": "b", "3": "c" };
      }
    } else if (newType === "fill_blank") {
      if (!q.acceptedAnswersPerBlank || Object.keys(q.acceptedAnswersPerBlank).length === 0) {
        updates.acceptedAnswersPerBlank = { 0: ["Đáp án đúng"] };
      }
      if (!q.text.includes("[_]")) {
        updates.text = (q.text ? `${q.text} ` : "") + "Điền vào chỗ trống [_].";
      }
    } else if (newType === "ordering") {
      if (!q.orderingItems || q.orderingItems.length === 0) {
        const id1 = `ord_${Date.now()}_1`;
        const id2 = `ord_${Date.now()}_2`;
        const id3 = `ord_${Date.now()}_3`;
        updates.orderingItems = [
          { id: id1, text: "Bước 1" },
          { id: id2, text: "Bước 2" },
          { id: id3, text: "Bước 3" },
        ];
        updates.correctOrder = [id1, id2, id3];
      }
    } else if (newType === "essay") {
      if (!q.essayRubric) {
        updates.essayRubric = "Tiêu chí 1: Đạt yêu cầu nội dung cơ bản (1.0đ)\nTiêu chí 2: Lập luận mạch lạc, sáng tạo (1.0đ)";
      }
      if (!q.essayGradingMode) {
        updates.essayGradingMode = "ai";
      }
    }

    actions.updateQuestion(q.id, updates);
  };

  // Single / Multiple Choice Helpers
  const handleToggleOption = (q: Question, optionId: string) => {
    if (q.type === "single_choice" || !q.type) {
      actions.updateQuestion(q.id, { correctOptionIds: [optionId] });
    } else if (q.type === "multiple_choice") {
      const current = q.correctOptionIds || [];
      const updated = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      actions.updateQuestion(q.id, { correctOptionIds: updated });
    }
  };

  const handleUpdateOptionText = (q: Question, optId: string, text: string) => {
    const updated = (q.options || []).map((o) => (o.id === optId ? { ...o, text } : o));
    actions.updateQuestion(q.id, { options: updated });
  };

  const handleAddOption = (q: Question) => {
    const current = q.options || [];
    const newId = `opt_${Date.now()}_${current.length + 1}`;
    const letter = String.fromCharCode(65 + current.length);
    const updated = [...current, { id: newId, text: `Lựa chọn ${letter}` }];
    actions.updateQuestion(q.id, { options: updated });
  };

  const handleRemoveOption = (q: Question, optId: string) => {
    if ((q.options || []).length <= 2) {
      showInfoToast("Câu trắc nghiệm cần tối thiểu 2 lựa chọn");
      return;
    }
    const updated = (q.options || []).filter((o) => o.id !== optId);
    const updatedCorrect = (q.correctOptionIds || []).filter((id) => id !== optId);
    actions.updateQuestion(q.id, { options: updated, correctOptionIds: updatedCorrect });
  };

  // True / False Helpers
  const handleToggleStatementAnswer = (q: Question, statementId: string, val: boolean) => {
    const updatedStatements = (q.statements || []).map((stmt) =>
      stmt.id === statementId ? { ...stmt, correctAnswer: val } : stmt
    );
    actions.updateQuestion(q.id, { statements: updatedStatements });
  };

  const handleUpdateStatementText = (q: Question, stmtId: string, text: string) => {
    const updated = (q.statements || []).map((s) => (s.id === stmtId ? { ...s, text } : s));
    actions.updateQuestion(q.id, { statements: updated });
  };

  const handleAddStatement = (q: Question) => {
    const current = q.statements || [];
    const newId = `stmt_${Date.now()}_${current.length + 1}`;
    const letter = String.fromCharCode(97 + current.length);
    const updated = [
      ...current,
      { id: newId, text: `Mệnh đề ${letter}`, correctAnswer: true },
    ];
    actions.updateQuestion(q.id, { statements: updated });
  };

  const handleRemoveStatement = (q: Question, stmtId: string) => {
    if ((q.statements || []).length <= 1) {
      showInfoToast("Cần tối thiểu 1 mệnh đề");
      return;
    }
    const updated = (q.statements || []).filter((s) => s.id !== stmtId);
    actions.updateQuestion(q.id, { statements: updated });
  };

  // Short Answer Helper
  const handleUpdateShortAnswer = (q: Question, textValue: string) => {
    const answersList = textValue
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    actions.updateQuestion(q.id, { acceptedAnswers: answersList });
  };

  // Matching Helpers
  const handleAddMatchingLeft = (q: Question) => {
    const current = q.matchingLeft || [];
    const nextIdx = current.length + 1;
    const newItem: MatchingItem = {
      id: uuidv4(),
      label: `${nextIdx}`,
      text: `Nội dung mục ${nextIdx}`,
    };
    actions.updateQuestion(q.id, { matchingLeft: [...current, newItem] });
  };

  const handleRemoveMatchingLeft = (q: Question, idx: number) => {
    const current = q.matchingLeft || [];
    if (current.length <= 1) return;
    const itemToRemove = current[idx];
    const filtered = current.filter((_, i) => i !== idx);
    const relabeled = filtered.map((it, i) => ({ ...it, label: `${i + 1}` }));
    const newMatches = { ...(q.correctMatches || {}) };
    delete newMatches[itemToRemove.label || `${idx + 1}`];
    actions.updateQuestion(q.id, { matchingLeft: relabeled, correctMatches: newMatches });
  };

  const handleUpdateMatchingLeftText = (q: Question, idx: number, text: string) => {
    const current = q.matchingLeft || [];
    const updated = current.map((it, i) => (i === idx ? { ...it, text } : it));
    actions.updateQuestion(q.id, { matchingLeft: updated });
  };

  const handleAddMatchingRight = (q: Question) => {
    const current = q.matchingRight || [];
    const nextLabel = String.fromCharCode(97 + current.length);
    const newItem: MatchingItem = {
      id: uuidv4(),
      label: nextLabel,
      text: `Nội dung mục ${nextLabel.toUpperCase()}`,
    };
    actions.updateQuestion(q.id, { matchingRight: [...current, newItem] });
  };

  const handleRemoveMatchingRight = (q: Question, idx: number) => {
    const current = q.matchingRight || [];
    if (current.length <= 1) return;
    const itemToRemove = current[idx];
    const filtered = current.filter((_, i) => i !== idx);
    const relabeled = filtered.map((it, i) => ({ ...it, label: String.fromCharCode(97 + i) }));
    const targetLabel = itemToRemove.label || String.fromCharCode(97 + idx);
    const newMatches: Record<string, string> = {};
    Object.entries(q.correctMatches || {}).forEach(([k, v]) => {
      if (v !== targetLabel) newMatches[k] = v;
    });
    actions.updateQuestion(q.id, { matchingRight: relabeled, correctMatches: newMatches });
  };

  const handleUpdateMatchingRightText = (q: Question, idx: number, text: string) => {
    const current = q.matchingRight || [];
    const updated = current.map((it, i) => (i === idx ? { ...it, text } : it));
    actions.updateQuestion(q.id, { matchingRight: updated });
  };

  const handleSetMatchPair = (q: Question, leftLabel: string, rightLabel: string) => {
    const updated = { ...(q.correctMatches || {}), [leftLabel]: rightLabel };
    actions.updateQuestion(q.id, { correctMatches: updated });
  };

  // Fill in the Blank Helper
  const handleInsertBlankPlaceholder = (q: Question) => {
    const newText = q.text ? `${q.text} [_]` : "[_]";
    actions.updateQuestion(q.id, { text: newText });
  };

  const handleUpdateBlankAnswer = (q: Question, bIdx: number, rawInput: string) => {
    const answers = rawInput
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const updated = { ...(q.acceptedAnswersPerBlank || {}) };
    updated[bIdx] = answers.length > 0 ? answers : [rawInput.trim()];
    actions.updateQuestion(q.id, { acceptedAnswersPerBlank: updated });
  };

  // Ordering Helpers
  const handleAddOrderingItem = (q: Question) => {
    const current = q.orderingItems || [];
    const newItem: OrderingItem = {
      id: uuidv4(),
      text: `Bước ${current.length + 1}`,
    };
    const nextItems = [...current, newItem];
    const nextOrder = [...(q.correctOrder || current.map((it) => it.id)), newItem.id];
    actions.updateQuestion(q.id, { orderingItems: nextItems, correctOrder: nextOrder });
  };

  const handleRemoveOrderingItem = (q: Question, id: string) => {
    const current = q.orderingItems || [];
    if (current.length <= 2) {
      showInfoToast("Câu hỏi sắp xếp cần tối thiểu 2 bước.");
      return;
    }
    const nextItems = current.filter((it) => it.id !== id);
    const nextOrder = (q.correctOrder || current.map((it) => it.id)).filter((k) => k !== id);
    actions.updateQuestion(q.id, { orderingItems: nextItems, correctOrder: nextOrder });
  };

  const handleMoveOrderingItem = (q: Question, index: number, direction: "up" | "down") => {
    const current = q.orderingItems || [];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= current.length) return;

    const nextItems = [...current];
    const temp = nextItems[index];
    nextItems[index] = nextItems[targetIndex];
    nextItems[targetIndex] = temp;

    const nextOrder = nextItems.map((it) => it.id);
    actions.updateQuestion(q.id, { orderingItems: nextItems, correctOrder: nextOrder });
  };

  // Get question summary for matrix and carousel pill
  const getQuestionSummary = (q: Question) => {
    if (q.type === "single_choice" || q.type === "multiple_choice" || !q.type) {
      if (!q.correctOptionIds || q.correctOptionIds.length === 0) return "?";
      if (!q.options || q.options.length === 0) return "?";
      const letters = q.correctOptionIds
        .map((id) => {
          const idx = q.options?.findIndex((o) => o.id === id);
          return idx !== undefined && idx >= 0 ? String.fromCharCode(65 + idx) : "";
        })
        .filter(Boolean);
      return letters.length > 0 ? letters.join(",") : "?";
    }

    if (q.type === "true_false") {
      if (!q.statements || q.statements.length === 0) return "?";
      const answeredCount = q.statements.filter((s) => typeof s.correctAnswer === "boolean").length;
      return answeredCount > 0 ? `${answeredCount}/${q.statements.length}` : "?";
    }

    if (q.type === "short_answer") {
      if (!q.acceptedAnswers || q.acceptedAnswers.length === 0 || !q.acceptedAnswers[0]?.trim()) return "?";
      return q.acceptedAnswers[0] || "✓";
    }

    if (q.type === "matching") {
      const matchCount = Object.keys(q.correctMatches || {}).length;
      return matchCount > 0 ? `${matchCount} cặp` : "?";
    }

    if (q.type === "fill_blank") {
      const blanksCount = extractBlanksCount(q.text || "");
      const configuredCount = Object.keys(q.acceptedAnswersPerBlank || {}).length;
      const count = blanksCount > 0 ? blanksCount : configuredCount;
      return count > 0 ? `${configuredCount}/${count} ô` : "?";
    }

    if (q.type === "ordering") {
      const itemCount = (q.orderingItems || []).length;
      return itemCount > 0 ? `${itemCount} bước` : "?";
    }

    if (q.type === "essay") {
      return q.essayRubric?.trim() ? "Barem" : "?";
    }

    return "✓";
  };

  // Human readable question type name
  const getQuestionTypeName = (type: QuestionType) => {
    switch (type) {
      case "single_choice":
        return "Trắc nghiệm 1 đáp án";
      case "multiple_choice":
        return "Trắc nghiệm nhiều đáp án";
      case "true_false":
        return "Đúng / Sai";
      case "short_answer":
        return "Điền đáp án ngắn";
      case "ordering":
        return "Sắp xếp thứ tự";
      case "fill_blank":
        return "Điền vào chỗ trống";
      case "matching":
        return "Nối bảng 2 cột";
      case "essay":
        return "Tự luận";
      default:
        return "Trắc nghiệm";
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-100/80 font-sans">
      {/* ================= TOP GLOBAL WORKSPACE CONTROLS ================= */}
      <header className="flex items-center justify-between bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 shrink-0 z-20 shadow-2xs gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-50 text-blue-700 rounded-xl font-bold flex items-center justify-center">
              <SplitSquareHorizontal className="w-4 h-4" />
            </span>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                  Soạn thảo & Xem trước song song
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                  Split Workspace
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Bên trái: Soạn chuẩn chi tiết • Bên phải: Giấy thi xem trước trực tiếp & tự cuộn
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Matrix Modal Button */}
          <button
            type="button"
            onClick={() => setShowMatrixModal(true)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 shadow-2xs"
            title="Mở ma trận 10 điểm và bảng đáp án"
          >
            <Grid3X3 className="w-3.5 h-3.5 text-blue-600" />
            <span>Ma trận điểm ({questions.length} câu)</span>
          </button>

          {/* Export & Print Button */}
          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-indigo-200 shadow-2xs"
            title="Xuất file Word (.doc), PDF A4 với phân bổ trang thông minh, LaTeX (.tex) hoặc In trực tiếp"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>Xuất file / In</span>
          </button>

          {/* Toggle Show Correct Answers */}
          <button
            type="button"
            onClick={() => setShowCorrectAnswers(!showCorrectAnswers)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
              showCorrectAnswers
                ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs"
                : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
            }`}
            title="Bật/Tắt hiển thị đáp án đúng trên giấy thi xem trước"
          >
            {showCorrectAnswers ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
            <span className="hidden md:inline">{showCorrectAnswers ? "Hiện đáp án đúng" : "Ẩn đáp án"}</span>
          </button>

          {/* Toggle Show All Explanations */}
          <button
            type="button"
            onClick={() => setShowAllExplanations(!showAllExplanations)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
              showAllExplanations
                ? "bg-purple-50 text-purple-800 border-purple-300 shadow-2xs"
                : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
            }`}
            title="Mở/Thu gọn toàn bộ hướng dẫn giải"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span className="hidden md:inline">{showAllExplanations ? "Mở hết lời giải" : "Lời giải"}</span>
          </button>

          {/* Toggle Left Editor Collapse / Expand */}
          <button
            type="button"
            onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
              isLeftCollapsed
                ? "bg-blue-50 text-blue-700 border-blue-300 shadow-2xs"
                : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
            }`}
            title={isLeftCollapsed ? "Mở lại cột soạn thảo câu hỏi" : "Thu gọn cột soạn thảo để xem toàn trang giấy thi"}
          >
            {isLeftCollapsed ? <SplitSquareHorizontal className="w-3.5 h-3.5 text-blue-600" /> : <Columns className="w-3.5 h-3.5 text-slate-600" />}
            <span className="hidden md:inline">{isLeftCollapsed ? "Hiện cột soạn" : "Thu gọn cột soạn"}</span>
          </button>

          {/* Save Exam Button */}
          <button
            type="button"
            onClick={() => actions.saveExam(false)}
            disabled={state.isSaving}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{state.isSaving ? "Đang lưu..." : "Lưu đề thi"}</span>
          </button>
        </div>
      </header>

      {/* ================= 2-COLUMN SPLIT WORKSPACE ================= */}
      <div
        ref={workspaceContainerRef}
        className={`flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 divide-y lg:divide-y-0 divide-slate-200 ${
          isDraggingDivider ? "select-none" : ""
        }`}
      >
        {/* ================= LEFT COLUMN: FORMATTED QUESTION EDITOR ================= */}
        <div
          className={`flex flex-col h-full overflow-hidden bg-white shrink-0 ${
            isDraggingDivider ? "transition-none select-none" : "transition-[width] duration-75"
          } ${
            isLeftCollapsed ? "hidden" : "w-full lg:w-auto"
          }`}
          style={!isLeftCollapsed && isDesktop ? { width: `clamp(280px, ${leftPanelWidth}%, 85%)` } : undefined}
        >
          {/* 1. Horizontal Question Carousel & Quick Jump Bar */}
          <div className="bg-slate-50/90 border-b border-slate-200 p-2.5 space-y-2 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <List className="w-3.5 h-3.5 text-blue-600" />
                  <span>Danh sách câu ({questions.length})</span>
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:inline">
                  (Alt + ← / → để chuyển câu nhanh)
                </span>
              </div>

              {/* Add Question Button & Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm câu hỏi</span>
                  <ChevronDown className="w-3 h-3 ml-0.5" />
                </button>

                {showAddMenu && (
                  <div className="absolute right-0 top-8 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 w-60 space-y-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      Chọn dạng câu hỏi cần tạo
                    </div>
                    {[
                      { type: "single_choice", label: "Trắc nghiệm 1 đáp án", desc: "A, B, C, D chuẩn" },
                      { type: "multiple_choice", label: "Trắc nghiệm nhiều đáp án", desc: "Nhiều phương án đúng" },
                      { type: "true_false", label: "Câu hỏi Đúng / Sai", desc: "Mệnh đề a, b, c, d" },
                      { type: "short_answer", label: "Điền đáp án ngắn", desc: "Học sinh điền số/từ" },
                      { type: "matching", label: "Nối bảng 2 cột", desc: "Nối Cột 1 với Cột 2" },
                      { type: "fill_blank", label: "Điền vào chỗ trống", desc: "Ký hiệu [_]" },
                      { type: "ordering", label: "Sắp xếp thứ tự", desc: "Quy trình các bước" },
                      { type: "essay", label: "Câu hỏi tự luận", desc: "Barem điểm & lời giải" },
                    ].map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => handleAddQuestionWithType(item.type as QuestionType)}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-blue-50 text-slate-700 hover:text-blue-800 transition-colors flex flex-col cursor-pointer"
                      >
                        <span className="font-bold">{item.label}</span>
                        <span className="text-[10px] text-slate-400">{item.desc}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Horizontal Carousel of Question Pills */}
            <div
              ref={carouselRef}
              className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scroll-smooth"
            >
              {questions.map((q, idx) => {
                const isSelected = activeQuestion?.id === q.id;
                const summary = getQuestionSummary(q);
                const isUnanswered = summary === "?";
                const rawPts = q.points ?? 0.25;

                return (
                  <button
                    key={q.id}
                    data-pill-id={q.id}
                    type="button"
                    onClick={() => handleSelectQuestion(q.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer border ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600 ring-2 ring-blue-300 shadow-sm scale-[1.02]"
                        : isUnanswered
                        ? "bg-red-50/80 text-red-900 border-red-200 hover:bg-red-100"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 shadow-2xs"
                    }`}
                    title={`Câu ${idx + 1}: ${getQuestionTypeName(q.type)} (${rawPts}đ)`}
                  >
                    <span>Câu {idx + 1}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : isUnanswered
                          ? "bg-red-200 text-red-900"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {summary}
                    </span>
                  </button>
                );
              })}

              {questions.length === 0 && (
                <div className="text-xs text-slate-400 italic py-1">Chưa có câu hỏi nào.</div>
              )}
            </div>
          </div>

          {/* 2. Scrollable Question Editor Area */}
          <div
            ref={leftEditorScrollRef}
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 min-h-0 bg-white scrollbar-thin"
          >
            {activeQuestion ? (
              <div className="space-y-6">
                {/* A. Question Meta & Controls Bar */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-1 bg-blue-600 text-white font-black text-xs rounded-xl shadow-2xs">
                        CÂU {activeIndex + 1} / {questions.length}
                      </span>

                      {/* Section Dropdown */}
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
                        <Folder className="w-3 h-3 text-blue-600" />
                        <select
                          value={activeQuestion.sectionId || ""}
                          onChange={(e) =>
                            actions.updateQuestion(activeQuestion.id, {
                              sectionId: e.target.value || null,
                            })
                          }
                          className="bg-transparent font-bold text-slate-700 outline-hidden cursor-pointer"
                        >
                          <option value="">Chưa gán phần thi</option>
                          {sections.map((sec, sIdx) => (
                            <option key={sec.id} value={sec.id}>
                              {sec.title || `Phần ${sIdx + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Question Type Selector with Schema Guard */}
                      <select
                        value={activeQuestion.type || "single_choice"}
                        onChange={(e) =>
                          handleQuestionTypeChange(activeQuestion, e.target.value as QuestionType)
                        }
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-hidden cursor-pointer"
                      >
                        <option value="single_choice">Trắc nghiệm 1 đáp án</option>
                        <option value="multiple_choice">Nhiều đáp án</option>
                        <option value="true_false">Đúng / Sai</option>
                        <option value="short_answer">Điền đáp án ngắn</option>
                        <option value="matching">Nối bảng (2 cột)</option>
                        <option value="fill_blank">Điền vào chỗ trống</option>
                        <option value="ordering">Sắp xếp thứ tự</option>
                        <option value="essay">Tự luận</option>
                      </select>
                    </div>

                    {/* Quick Move & Actions */}
                    <div className="flex items-center gap-1 text-slate-400">
                      <button
                        type="button"
                        onClick={() => actions.reorderQuestion(activeQuestion.id, "up")}
                        disabled={activeIndex === 0}
                        className="p-1.5 hover:text-blue-600 hover:bg-slate-200/70 rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
                        title="Đổi lên trên"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => actions.reorderQuestion(activeQuestion.id, "down")}
                        disabled={activeIndex === questions.length - 1}
                        className="p-1.5 hover:text-blue-600 hover:bg-slate-200/70 rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
                        title="Đổi xuống dưới"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => actions.duplicateQuestion(activeQuestion.id)}
                        className="p-1.5 hover:text-blue-600 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
                        title="Nhân bản câu này"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuestionToDelete(activeQuestion)}
                        className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Xóa câu hỏi này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Cognitive Level & Points Row */}
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200/70 flex-wrap text-xs">
                    {/* Level Pills: NB, TH, VD, VDC */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-semibold">Mức độ:</span>
                      {[
                        { id: "NB", label: "Nhận biết", color: "bg-blue-100 text-blue-800 border-blue-200" },
                        { id: "TH", label: "Thông hiểu", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
                        { id: "VD", label: "Vận dụng", color: "bg-amber-100 text-amber-800 border-amber-200" },
                        { id: "VDC", label: "Vận dụng cao", color: "bg-purple-100 text-purple-800 border-purple-200" },
                      ].map((lvl) => {
                        const isCurrent = (activeQuestion.level || "TH").toUpperCase() === lvl.id;
                        return (
                          <button
                            key={lvl.id}
                            type="button"
                            onClick={() => actions.updateQuestion(activeQuestion.id, { level: lvl.id as any })}
                            className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                              isCurrent
                                ? `${lvl.color} shadow-2xs ring-1 ring-slate-400`
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {lvl.id}
                          </button>
                        );
                      })}
                    </div>

                    {/* Points Input */}
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1 rounded-xl shadow-2xs">
                      <span className="text-slate-500 font-semibold">Điểm câu:</span>
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        value={activeQuestion.points ?? 0.25}
                        onChange={(e) =>
                          actions.updateQuestion(activeQuestion.id, {
                            points: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-14 px-1.5 py-0.5 bg-slate-50 border border-slate-300 rounded font-bold text-slate-900 text-center focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="text-blue-700 font-bold font-mono pl-1 border-l border-slate-200 text-[11px]">
                        (~{getSystemScaledPoint(activeQuestion.points ?? 0.25)}đ / 10đ)
                      </span>
                    </div>
                  </div>

                  {/* Shuffling and Pin checkboxes */}
                  <div className="flex items-center gap-4 pt-2 border-t border-slate-200/70 text-xs flex-wrap">
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={activeQuestion.pinQuestion || false}
                        onChange={(e) => actions.updateQuestion(activeQuestion.id, { pinQuestion: e.target.checked })}
                        className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300"
                      />
                      <Pin className="w-3 h-3 text-blue-600" />
                      <span>Cố định vị trí câu</span>
                    </label>

                    {(activeQuestion.type === "single_choice" || activeQuestion.type === "multiple_choice") && (
                      <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={activeQuestion.shuffleOptions !== false}
                          onChange={(e) => actions.updateQuestion(activeQuestion.id, { shuffleOptions: e.target.checked })}
                          className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300"
                        />
                        <Shuffle className="w-3 h-3 text-emerald-600" />
                        <span>Đảo thứ tự đáp án (A, B, C, D)</span>
                      </label>
                    )}
                  </div>
                </div>

                {/* B. Question Prompt (RichTextEditor with LaTeX, Graph, BBT, Live-Canvas & Image Paste) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                      Nội dung đề câu hỏi
                    </label>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Hỗ trợ dán ảnh (Ctrl+V), LaTeX $...$, đồ thị, bảng biến thiên
                    </span>
                  </div>

                  <RichTextEditor
                    value={activeQuestion.text || ""}
                    onChange={(text) => actions.updateQuestion(activeQuestion.id, { text })}
                    placeholder="Nhập nội dung đề bài (hỗ trợ dán ảnh trực tiếp từ bộ nhớ tạm, công thức $y = ax^2 + bx + c$, đồ thị <graph>...</graph>, bảng biến thiên <bbt>...</bbt>)..."
                    minHeight="110px"
                  />
                </div>

                {/* Optional Image URL Input & Preview */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                      <span>Đường dẫn ảnh minh họa đính kèm (URL):</span>
                    </span>
                    {activeQuestion.imageUrl && (
                      <button
                        type="button"
                        onClick={() => actions.updateQuestion(activeQuestion.id, { imageUrl: null })}
                        className="text-[11px] text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                      >
                        Gỡ bỏ ảnh
                      </button>
                    )}
                  </label>
                  <input
                    type="text"
                    value={activeQuestion.imageUrl || ""}
                    onChange={(e) => actions.updateQuestion(activeQuestion.id, { imageUrl: e.target.value })}
                    placeholder="https://example.com/hinh-anh.png"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-hidden focus:border-blue-500"
                  />
                  {activeQuestion.imageUrl && (
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center max-h-40 overflow-hidden">
                      <img
                        src={activeQuestion.imageUrl}
                        alt="Xem trước ảnh minh họa"
                        className="max-h-36 object-contain rounded-lg"
                      />
                    </div>
                  )}
                </div>

                {/* Embedded Listening Audio (MP3) */}
                <AudioConfigEditor
                  audioConfig={activeQuestion.audioConfig}
                  onChange={(cfg) =>
                    actions.updateQuestion(activeQuestion.id, {
                      audioConfig: cfg,
                      audioUrl: cfg.url,
                    })
                  }
                  onRemove={() =>
                    actions.updateQuestion(activeQuestion.id, {
                      audioConfig: undefined,
                      audioUrl: null,
                    })
                  }
                  label="Đính kèm bài nghe Audio câu hỏi (MP3)"
                  defaultTitle={`Audio Câu ${activeIndex + 1}`}
                />

                {/* C. Type-Specific Options & Answers Editor */}
                <div className="border-t border-slate-200 pt-4 space-y-4">
                  {/* 1. Single / Multiple Choice Options */}
                  {(activeQuestion.type === "single_choice" ||
                    activeQuestion.type === "multiple_choice" ||
                    !activeQuestion.type) && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                          Các phương án lựa chọn (Click chữ A, B, C... để đổi đáp án ĐÚNG)
                        </label>
                        <button
                          type="button"
                          onClick={() => handleAddOption(activeQuestion)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Thêm lựa chọn</span>
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        {(activeQuestion.options || []).map((opt, oIdx) => {
                          const letter = String.fromCharCode(65 + oIdx);
                          const isCorrect = activeQuestion.correctOptionIds?.includes(opt.id);

                          return (
                            <div
                              key={opt.id}
                              className={`p-2.5 rounded-2xl border transition-all flex items-start gap-2.5 ${
                                isCorrect
                                  ? "bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-400/20 shadow-2xs"
                                  : "bg-slate-50/60 border-slate-200"
                              }`}
                            >
                              {/* Letter Toggle Button */}
                              <button
                                type="button"
                                onClick={() => handleToggleOption(activeQuestion, opt.id)}
                                className={`w-8 h-8 rounded-xl font-black text-xs shrink-0 flex items-center justify-center cursor-pointer transition-all ${
                                  isCorrect
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                                }`}
                                title={isCorrect ? "Đáp án ĐÚNG (click để bỏ)" : "Click để chọn làm đáp án ĐÚNG"}
                              >
                                {letter}
                              </button>

                              {/* Option Input & Math preview */}
                              <div className="flex-1 space-y-1">
                                <input
                                  type="text"
                                  value={opt.text}
                                  onChange={(e) => handleUpdateOptionText(activeQuestion, opt.id, e.target.value)}
                                  placeholder={`Nội dung lựa chọn ${letter}...`}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:border-blue-500"
                                />
                                {opt.text && (opt.text.includes("$") || opt.text.includes("\\")) && (
                                  <div className="text-[11px] text-slate-600 pl-1 pt-0.5">
                                    <LatexPreview content={opt.text} />
                                  </div>
                                )}
                              </div>

                              {/* Delete Option */}
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(activeQuestion, opt.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer mt-0.5"
                                title="Xóa lựa chọn này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 2. True / False Statements */}
                  {activeQuestion.type === "true_false" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                          Các mệnh đề Đúng / Sai
                        </label>
                        <button
                          type="button"
                          onClick={() => handleAddStatement(activeQuestion)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Thêm mệnh đề</span>
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        {(activeQuestion.statements || []).map((stmt, sIdx) => {
                          const letter = String.fromCharCode(97 + sIdx);
                          const isTrue = stmt.correctAnswer === true;
                          const isFalse = stmt.correctAnswer === false;

                          return (
                            <div
                              key={stmt.id}
                              className="p-3 bg-slate-50/80 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-start gap-2 flex-1 w-full sm:w-auto">
                                <span className="w-6 font-extrabold text-blue-700 pt-1 shrink-0">
                                  {letter})
                                </span>
                                <div className="flex-1 space-y-1">
                                  <input
                                    type="text"
                                    value={stmt.text}
                                    onChange={(e) => handleUpdateStatementText(activeQuestion, stmt.id, e.target.value)}
                                    placeholder={`Nội dung mệnh đề ${letter}...`}
                                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:border-blue-500"
                                  />
                                  {stmt.text && (stmt.text.includes("$") || stmt.text.includes("\\")) && (
                                    <div className="text-[11px] text-slate-600 pl-1">
                                      <LatexPreview content={stmt.text} />
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatementAnswer(activeQuestion, stmt.id, true)}
                                  className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
                                    isTrue
                                      ? "bg-emerald-600 text-white shadow-2xs"
                                      : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-100"
                                  }`}
                                >
                                  ĐÚNG
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatementAnswer(activeQuestion, stmt.id, false)}
                                  className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
                                    isFalse
                                      ? "bg-red-600 text-white shadow-2xs"
                                      : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-100"
                                  }`}
                                >
                                  SAI
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStatement(activeQuestion, stmt.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Xóa mệnh đề này"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 3. Short Answer */}
                  {activeQuestion.type === "short_answer" && (
                    <div className="space-y-3 bg-slate-50/70 p-4 border border-slate-200 rounded-2xl">
                      <div className="space-y-1.5">
                        <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                          Các đáp án được chấp nhận (ngăn cách bằng dấu chấm phẩy ;)
                        </label>
                        <input
                          type="text"
                          value={(activeQuestion.acceptedAnswers || []).join("; ")}
                          onChange={(e) => handleUpdateShortAnswer(activeQuestion, e.target.value)}
                          placeholder="Ví dụ: 12.5; 12,5; 25/2"
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:border-blue-500"
                        />
                      </div>

                      {/* Pill preview of accepted answers */}
                      {(activeQuestion.acceptedAnswers || []).length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-[11px] font-bold text-slate-500">Các đáp án hợp lệ:</span>
                          {(activeQuestion.acceptedAnswers || []).map((ans, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold font-mono"
                            >
                              {ans}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-4 pt-2 border-t border-slate-200 text-xs">
                        <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={activeQuestion.trimWhitespace !== false}
                            onChange={(e) =>
                              actions.updateQuestion(activeQuestion.id, { trimWhitespace: e.target.checked })
                            }
                            className="w-3.5 h-3.5 text-blue-600 rounded"
                          />
                          <span>Tự động bỏ khoảng trắng thừa</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={activeQuestion.caseSensitive || false}
                            onChange={(e) =>
                              actions.updateQuestion(activeQuestion.id, { caseSensitive: e.target.checked })
                            }
                            className="w-3.5 h-3.5 text-blue-600 rounded"
                          />
                          <span>Phân biệt chữ hoa / chữ thường</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* 4. Matching: Complete 2-column editor + interactive board */}
                  {activeQuestion.type === "matching" && (
                    <div className="space-y-4">
                      <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-start gap-2.5">
                        <Table2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-indigo-900 leading-relaxed">
                          Chỉnh sửa các mục ở <strong>Cột 1</strong> và <strong>Cột 2</strong> bên dưới. Cấu hình cặp ghép nối đúng bằng menu chọn hoặc kéo chấm tròn ở bảng xem trước!
                        </div>
                      </div>

                      {/* 2 Sub-Columns for item editing */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Column 1 Editor (Left items: 1..n) */}
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                            <span className="text-xs font-black text-slate-800 uppercase flex items-center gap-1">
                              <span>Cột 1 (1 ➔ {(activeQuestion.matchingLeft || []).length})</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddMatchingLeft(activeQuestion)}
                              className="px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" /> Thêm dòng
                            </button>
                          </div>

                          <div className="space-y-2">
                            {(activeQuestion.matchingLeft || []).map((item, idx) => (
                              <div key={item.id} className="flex items-start gap-2 p-2 bg-white border border-slate-200 rounded-xl">
                                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-mono font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                                  {item.label || idx + 1}
                                </span>
                                <input
                                  type="text"
                                  value={item.text}
                                  onChange={(e) => handleUpdateMatchingLeftText(activeQuestion, idx, e.target.value)}
                                  placeholder={`Dòng ${item.label || idx + 1}...`}
                                  className="flex-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                                />
                                {(activeQuestion.matchingLeft || []).length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMatchingLeft(activeQuestion, idx)}
                                    className="p-1 text-slate-400 hover:text-red-600 rounded"
                                    title="Xóa dòng này"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Column 2 Editor (Right items: a..z) */}
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                            <span className="text-xs font-black text-slate-800 uppercase flex items-center gap-1">
                              <span>Cột 2 (a ➔ z)</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddMatchingRight(activeQuestion)}
                              className="px-2 py-0.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" /> Thêm dòng
                            </button>
                          </div>

                          <div className="space-y-2">
                            {(activeQuestion.matchingRight || []).map((item, idx) => (
                              <div key={item.id} className="flex items-start gap-2 p-2 bg-white border border-slate-200 rounded-xl">
                                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-mono font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                                  {item.label || String.fromCharCode(97 + idx)}
                                </span>
                                <input
                                  type="text"
                                  value={item.text}
                                  onChange={(e) => handleUpdateMatchingRightText(activeQuestion, idx, e.target.value)}
                                  placeholder={`Dòng ${item.label || String.fromCharCode(97 + idx)}...`}
                                  className="flex-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                                />
                                {(activeQuestion.matchingRight || []).length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMatchingRight(activeQuestion, idx)}
                                    className="p-1 text-slate-400 hover:text-red-600 rounded"
                                    title="Xóa dòng này"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Pairing Selectors */}
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                        <span className="font-extrabold text-slate-800 uppercase tracking-wide">
                          Khớp cặp đáp án đúng chuẩn:
                        </span>
                        <div className="flex flex-wrap gap-2.5 pt-1">
                          {(activeQuestion.matchingLeft || []).map((lItem, idx) => {
                            const lLabel = lItem.label || `${idx + 1}`;
                            const matchedRight = activeQuestion.correctMatches?.[lLabel] || "";

                            return (
                              <div key={lItem.id} className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-2xs">
                                <span className="font-bold text-blue-700 font-mono">Cột 1 ({lLabel}):</span>
                                <span className="text-slate-400">➔</span>
                                <select
                                  value={matchedRight}
                                  onChange={(e) => handleSetMatchPair(activeQuestion, lLabel, e.target.value)}
                                  className="font-bold text-indigo-700 bg-transparent outline-hidden cursor-pointer"
                                >
                                  <option value="">(Chọn)</option>
                                  {(activeQuestion.matchingRight || []).map((rItem, rIdx) => {
                                    const rLabel = rItem.label || String.fromCharCode(97 + rIdx);
                                    return (
                                      <option key={rItem.id} value={rLabel}>
                                        {rLabel}. {rItem.text.slice(0, 20)}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Interactive Board */}
                      <div className="p-3 bg-white border border-slate-200 rounded-2xl">
                        <InteractiveMatchingBoard
                          isReview={true}
                          readOnly={false}
                          leftItems={activeQuestion.matchingLeft || []}
                          rightItems={activeQuestion.matchingRight || []}
                          matches={activeQuestion.correctMatches || {}}
                          correctMatches={activeQuestion.correctMatches || {}}
                          onChange={(newMatches) => {
                            actions.updateQuestion(activeQuestion.id, { correctMatches: newMatches });
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 5. Fill in the Blank: Detected blanks + Quick Insert */}
                  {activeQuestion.type === "fill_blank" && (
                    <div className="space-y-3 bg-slate-50/70 p-4 border border-slate-200 rounded-2xl">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                          <Type className="w-4 h-4 text-blue-600" />
                          <span>Đáp án các chỗ trống ({extractBlanksCount(activeQuestion.text || "")} vị trí)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleInsertBlankPlaceholder(activeQuestion)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Chèn nhanh [_] vào đề</span>
                        </button>
                      </div>

                      {extractBlanksCount(activeQuestion.text || "") === 0 ? (
                        <div className="p-4 text-center border-2 border-dashed border-slate-200 rounded-xl bg-white text-xs text-slate-500">
                          Chưa có vị trí điền khuyết nào trong đề bài. Hãy bấm nút <strong>"Chèn nhanh [_]"</strong> hoặc gõ <strong>[_]</strong> vào nội dung đề bài ở trên.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {Array.from({ length: extractBlanksCount(activeQuestion.text || "") }).map((_, bIdx) => {
                            const ansList = activeQuestion.acceptedAnswersPerBlank?.[bIdx] || [];
                            const val = Array.isArray(ansList) ? ansList.join("; ") : String(ansList);

                            return (
                              <div key={bIdx} className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1.5 shadow-2xs">
                                <span className="font-extrabold text-blue-700 flex items-center gap-1">
                                  <span>Ô trống #[{bIdx + 1}]:</span>
                                </span>
                                <input
                                  type="text"
                                  value={val}
                                  onChange={(e) => handleUpdateBlankAnswer(activeQuestion, bIdx, e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-mono"
                                  placeholder="Ví dụ: Hà Nội; ha noi"
                                />
                                <span className="text-[10px] text-slate-400 block">
                                  Các đáp án ngăn cách bởi dấu chấm phẩy ;
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 6. Ordering: Step Sequence with Up/Down and Sync */}
                  {activeQuestion.type === "ordering" && (
                    <div className="space-y-3 bg-slate-50/70 p-4 border border-slate-200 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                          <ListOrdered className="w-4 h-4 text-blue-600" />
                          <span>Thứ tự các bước chuẩn (Đáp án đúng)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleAddOrderingItem(activeQuestion)}
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Thêm bước
                        </button>
                      </div>

                      <div className="space-y-2">
                        {(activeQuestion.orderingItems || []).map((item, idx) => (
                          <div key={item.id} className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-xl text-xs">
                            <span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <input
                              type="text"
                              value={item.text}
                              onChange={(e) => {
                                const next = [...(activeQuestion.orderingItems || [])];
                                next[idx] = { ...item, text: e.target.value };
                                actions.updateQuestion(activeQuestion.id, { orderingItems: next });
                              }}
                              className="flex-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                            />
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => handleMoveOrderingItem(activeQuestion, idx, "up")}
                                disabled={idx === 0}
                                className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-30 rounded cursor-pointer"
                                title="Đưa bước lên trên"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveOrderingItem(activeQuestion, idx, "down")}
                                disabled={idx === (activeQuestion.orderingItems || []).length - 1}
                                className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-30 rounded cursor-pointer"
                                title="Đưa bước xuống dưới"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveOrderingItem(activeQuestion, item.id)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                                title="Xóa bước này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 7. Essay Rubric & Grading Mode */}
                  {activeQuestion.type === "essay" && (
                    <div className="space-y-3 bg-slate-50/70 p-4 border border-slate-200 rounded-2xl">
                      {/* Grading Mode Toggle */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                          Phương thức chấm điểm
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => actions.updateQuestion(activeQuestion.id, { essayGradingMode: "ai" })}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                              activeQuestion.essayGradingMode === "ai" || !activeQuestion.essayGradingMode
                                ? "bg-blue-50 border-blue-500 ring-2 ring-blue-300 shadow-2xs"
                                : "bg-white border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <Bot className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            <div>
                              <div className="font-bold text-xs text-slate-900">AI Gemini Chấm Tự Động</div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                AI so sánh bài làm của học sinh với barem điểm để nhận xét và cho điểm.
                              </p>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => actions.updateQuestion(activeQuestion.id, { essayGradingMode: "manual" })}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                              activeQuestion.essayGradingMode === "manual"
                                ? "bg-purple-50 border-purple-500 ring-2 ring-purple-300 shadow-2xs"
                                : "bg-white border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <UserCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                            <div>
                              <div className="font-bold text-xs text-slate-900">Giáo Viên Chấm Thủ Công</div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Thầy cô chấm điểm trực tiếp trong danh sách bài nộp của học sinh.
                              </p>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Rubric Input */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-200">
                        <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                          Barem điểm & Tiêu chí chấm tự luận
                        </label>
                        <textarea
                          rows={3}
                          value={activeQuestion.essayRubric || ""}
                          onChange={(e) => actions.updateQuestion(activeQuestion.id, { essayRubric: e.target.value })}
                          placeholder="Tiêu chí 1: Đạt ý chính (1.0đ)...&#10;Tiêu chí 2: Lập luận chặt chẽ (1.0đ)..."
                          className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-hidden focus:border-blue-500"
                        />
                      </div>

                      {/* Min / Max Words */}
                      <div className="flex items-center gap-3 pt-2 text-xs flex-wrap">
                        <span className="text-slate-500 font-semibold">Giới hạn số từ:</span>
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-xl">
                          <span className="text-slate-400">Tối thiểu:</span>
                          <input
                            type="number"
                            min="0"
                            value={activeQuestion.essayMinWords || ""}
                            onChange={(e) =>
                              actions.updateQuestion(activeQuestion.id, {
                                essayMinWords: parseInt(e.target.value, 10) || undefined,
                              })
                            }
                            className="w-14 px-1 py-0.5 bg-slate-50 border border-slate-200 rounded font-bold text-center"
                            placeholder="0"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-xl">
                          <span className="text-slate-400">Tối đa:</span>
                          <input
                            type="number"
                            min="0"
                            value={activeQuestion.essayMaxWords || ""}
                            onChange={(e) =>
                              actions.updateQuestion(activeQuestion.id, {
                                essayMaxWords: parseInt(e.target.value, 10) || undefined,
                              })
                            }
                            className="w-14 px-1 py-0.5 bg-slate-50 border border-slate-200 rounded font-bold text-center"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* D. Detailed Explanation / Lời giải chi tiết */}
                <div className="border-t border-slate-200 pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-purple-900 uppercase tracking-wide flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span>Hướng dẫn giải chi tiết (Hiển thị cho học sinh sau khi thi)</span>
                    </label>
                  </div>
                  <RichTextEditor
                    value={activeQuestion.explanation || ""}
                    onChange={(text) => actions.updateQuestion(activeQuestion.id, { explanation: text })}
                    placeholder="Nhập phương pháp giải, công thức áp dụng, và kết luận đáp án đúng..."
                    minHeight="90px"
                  />
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                <FileText className="w-12 h-12 text-slate-300" />
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-700 text-sm">Chưa có câu hỏi nào trong bài thi</h3>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Hãy bấm nút "Thêm câu hỏi" ở thanh trên cùng để bắt đầu soạn đề thi.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddQuestionWithType("single_choice")}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm câu hỏi đầu tiên</span>
                </button>
              </div>
            )}
          </div>

          {/* 3. Action Footer for Left Editor */}
          {activeQuestion && (
            <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between shrink-0 gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevQuestion}
                  disabled={activeIndex <= 0}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer disabled:opacity-40"
                  title="Câu trước (Alt + ←)"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Câu trước</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  disabled={activeIndex >= questions.length - 1}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer disabled:opacity-40"
                  title="Câu tiếp (Alt + →)"
                >
                  <span>Câu tiếp</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                Đang sửa <strong>Câu {activeIndex + 1}</strong> • {getQuestionTypeName(activeQuestion.type)}
              </div>

              <div className="flex items-center gap-2">
                {onSwitchToQuestionEditor && (
                  <button
                    type="button"
                    onClick={() => onSwitchToQuestionEditor(activeQuestion.id)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200 flex items-center gap-1 cursor-pointer"
                    title="Mở toàn màn hình trong tab Soạn câu hỏi"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Mở tab soạn</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => actions.saveExam(false)}
                  disabled={state.isSaving}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{state.isSaving ? "Đang lưu..." : "Lưu thay đổi"}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ================= DRAGGABLE RESIZER DIVIDER HANDLE ================= */}
        {!isLeftCollapsed && (
          <div
            onMouseDown={handleDividerMouseDown}
            className={`hidden lg:flex w-2.5 hover:w-3 cursor-col-resize transition-all items-center justify-center shrink-0 z-20 group relative select-none border-x border-slate-200/80 ${
              isDraggingDivider
                ? "bg-blue-500 w-3 shadow-md"
                : "bg-slate-100 hover:bg-blue-100"
            }`}
            title="Kéo sang trái/phải để điều chỉnh độ rộng cột soạn thảo"
          >
            <div className="w-1 h-9 rounded-full bg-slate-300 group-hover:bg-blue-600 transition-colors flex flex-col justify-center items-center gap-0.5">
              <span className="w-0.5 h-0.5 rounded-full bg-slate-600 group-hover:bg-white" />
              <span className="w-0.5 h-0.5 rounded-full bg-slate-600 group-hover:bg-white" />
              <span className="w-0.5 h-0.5 rounded-full bg-slate-600 group-hover:bg-white" />
            </div>

            {/* Quick collapse button on divider */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsLeftCollapsed(true);
              }}
              className="absolute -left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 bg-white border border-slate-300 text-slate-500 hover:text-blue-600 rounded-full shadow-md transition-all cursor-pointer z-30 hover:scale-110"
              title="Thu gọn cột soạn thảo"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* ================= RIGHT COLUMN: LIVE AUTHENTIC EXAM PAPER PREVIEW ================= */}
        <div
          className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100/70 min-w-0 relative"
          style={!isLeftCollapsed && isDesktop ? { width: `calc(100% - clamp(280px, ${leftPanelWidth}%, 85%) - 10px)` } : { width: "100%" }}
        >
          {/* Overlay during divider dragging to prevent preview iframes from swallowing mousemove events */}
          {isDraggingDivider && (
            <div className="fixed inset-0 z-50 cursor-col-resize select-none bg-transparent" />
          )}

          {/* Quick Expand Button when collapsed */}
          {isLeftCollapsed && (
            <div className="absolute left-3 top-12 z-30 animate-in fade-in slide-in-from-left duration-200">
              <button
                type="button"
                onClick={() => setIsLeftCollapsed(false)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105"
                title="Mở lại cột soạn thảo câu hỏi"
              >
                <ChevronRight className="w-4 h-4" />
                <span>Mở cột soạn {activeQuestion ? `(Câu ${activeIndex + 1})` : ""}</span>
              </button>
            </div>
          )}

          {/* Paper Sub-Header Banner */}
          <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shrink-0 text-xs shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-extrabold text-slate-800 uppercase tracking-wide">
                Xem trước trang giấy thi (Live Paper)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium">Thu phóng:</span>
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                {[80, 90, 100, 110, 125].map((zoom) => (
                  <button
                    key={zoom}
                    type="button"
                    onClick={() => setZoomLevel(zoom)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      zoomLevel === zoom ? "bg-white text-blue-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {zoom}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Paper Scroll Area */}
          <div
            ref={rightPanelRef}
            className="flex-1 overflow-y-auto p-4 sm:p-8 min-h-0 scroll-smooth scrollbar-thin"
          >
            <div
              style={{ zoom: `${zoomLevel}%` }}
              className="max-w-3xl mx-auto bg-white border border-slate-300 rounded-3xl p-6 sm:p-10 shadow-sm space-y-8"
            >
              {/* Authentic Vietnamese Exam Header Sheet */}
              <div className="border-b-2 border-slate-900 pb-6 text-center space-y-3">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase border-b border-slate-100 pb-2">
                  <span>BỘ GIÁO DỤC VÀ ĐÀO TẠO</span>
                  <span>ĐỀ THI KIỂM TRA CHUẨN</span>
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight pt-1">
                  {examMeta.title || "BÀI THI CHƯA ĐẶT TÊN"}
                </h1>

                <div className="flex items-center justify-center gap-3 sm:gap-4 text-xs font-semibold text-slate-600 pt-1 flex-wrap">
                  <span>Mã đề: <strong className="font-mono text-slate-900">{examMeta.code || "101"}</strong></span>
                  <span>•</span>
                  <span>Thời gian: <strong>{examMeta.timeLimit || 45} phút</strong></span>
                  <span>•</span>
                  <span>Thang điểm: <strong>{targetSystemTotal} điểm HT</strong></span>
                  <span>•</span>
                  <span>Tổng: <strong>{questions.length} câu</strong></span>
                </div>
              </div>

              {/* Question Sections and Items */}
              <div className="space-y-8">
                {questionGroups.map((group, gIdx) => (
                  <div key={`group-${group.sectionId || "none"}-${gIdx}`} className="space-y-6">
                    {/* Section Header Banner */}
                    {group.title && (
                      <div className="bg-slate-100/90 border-l-4 border-blue-600 p-4 rounded-r-2xl space-y-1">
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase">
                          {group.title}
                        </h3>
                        {group.description && (
                          <div className="text-xs text-slate-700 font-medium leading-relaxed">
                            <LatexPreview content={group.description} />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Question Cards List */}
                    <div className="space-y-6">
                      {group.items.map(({ q, globalIndex: idx }) => {
                        const isTargeted = activeQuestion?.id === q.id;
                        const rawPts = q.points ?? 0.25;
                        const sysPts = getSystemScaledPoint(rawPts);
                        const isExpanded = showAllExplanations || expandedExplanations[q.id];

                        // For fill_blank questions: format prompt text with styled blanks
                        const promptToRender =
                          q.type === "fill_blank"
                            ? formatFillBlankForPreview(q.text || "", q.acceptedAnswersPerBlank, showCorrectAnswers)
                            : q.text || "(Chưa có nội dung câu hỏi)";

                        return (
                          <div
                            key={q.id}
                            id={`preview-q-${q.id}`}
                            onClick={() => handleSelectQuestionFromRight(q.id)}
                            className={`p-5 sm:p-6 rounded-2xl transition-all space-y-4 border cursor-pointer ${
                              isTargeted
                                ? "bg-blue-50/40 border-blue-500 ring-4 ring-blue-500/20 shadow-md"
                                : "bg-slate-50/70 hover:bg-slate-50 border-slate-200"
                            }`}
                          >
                            {/* Question Header Row */}
                            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-3 py-1 font-black text-xs rounded-xl shadow-2xs transition-colors ${
                                    isTargeted ? "bg-blue-600 text-white" : "bg-slate-800 text-white"
                                  }`}
                                >
                                  Câu {idx + 1}
                                </span>

                                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                  {getQuestionTypeName(q.type)}
                                </span>

                                {q.level && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                                    {q.level.toUpperCase()}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-bold text-slate-600 font-mono">
                                  {rawPts} điểm (~{sysPts}đ HT)
                                </span>
                                {isTargeted && (
                                  <span className="px-2 py-0.5 bg-blue-600 text-white rounded-md text-[10px] font-extrabold">
                                    Đang sửa bên trái ✎
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Question Prompt Content with LatexPreview */}
                            <div className="text-slate-900 text-sm sm:text-base font-semibold leading-relaxed">
                              <LatexPreview content={promptToRender} />
                            </div>

                            {/* Question Attached Image */}
                            {q.imageUrl && (
                              <div className="my-2 p-2 bg-white border border-slate-200 rounded-2xl flex flex-col items-center">
                                <img
                                  src={q.imageUrl}
                                  alt={`Hình ảnh câu ${idx + 1}`}
                                  className="max-h-72 rounded-xl object-contain bg-white max-w-full"
                                />
                              </div>
                            )}

                            {/* Audio Player if present */}
                            {(q.audioConfig?.url || q.audioUrl) && (
                              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-center gap-3 my-2">
                                <Headphones className="w-5 h-5 text-blue-600 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-blue-950 truncate">
                                    {q.audioConfig?.title || "Audio bài nghe của câu hỏi"}
                                  </p>
                                  <audio
                                    controls
                                    src={q.audioConfig?.url || q.audioUrl || ""}
                                    className="w-full h-8 mt-1"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Question Answers Presentation for All 8 Types */}
                            <div className="pt-1">
                              {/* 1. Single / Multiple Choice Options */}
                              {(q.type === "single_choice" || q.type === "multiple_choice" || !q.type) && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {(q.options || []).map((opt, optIdx) => {
                                    const letter = String.fromCharCode(65 + optIdx);
                                    const isCorrect = q.correctOptionIds?.includes(opt.id);

                                    return (
                                      <button
                                        key={opt.id}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleOption(q, opt.id);
                                        }}
                                        className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                                          showCorrectAnswers && isCorrect
                                            ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 font-bold shadow-xs"
                                            : "bg-white border-slate-200 hover:bg-slate-50 text-slate-800"
                                        }`}
                                      >
                                        <span
                                          className={`w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center shrink-0 ${
                                            showCorrectAnswers && isCorrect
                                              ? "bg-emerald-600 text-white"
                                              : "bg-slate-100 text-slate-700 border border-slate-200"
                                          }`}
                                        >
                                          {letter}
                                        </span>
                                        <div className="flex-1 text-xs sm:text-sm pt-0.5 leading-relaxed">
                                          <LatexPreview content={opt.text} />
                                        </div>
                                        {showCorrectAnswers && isCorrect && (
                                          <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px] shrink-0 self-center">
                                            ĐÚNG
                                          </span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {/* 2. True / False Statements */}
                              {q.type === "true_false" && (
                                <div className="space-y-2.5">
                                  {(q.statements || []).map((stmt, sIdx) => {
                                    const letter = String.fromCharCode(97 + sIdx);
                                    const isTrue = stmt.correctAnswer === true;
                                    const isFalse = stmt.correctAnswer === false;

                                    return (
                                      <div
                                        key={stmt.id}
                                        className="p-3 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                                      >
                                        <div className="flex items-start gap-2 flex-1">
                                          <span className="font-extrabold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-lg border border-blue-200 shrink-0">
                                            {letter})
                                          </span>
                                          <div className="font-medium text-slate-800 text-sm leading-relaxed">
                                            <LatexPreview content={stmt.text} />
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleToggleStatementAnswer(q, stmt.id, true);
                                            }}
                                            className={`px-3 py-1.5 rounded-xl font-bold border transition-all cursor-pointer ${
                                              showCorrectAnswers && isTrue
                                                ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                                                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                                            }`}
                                          >
                                            ĐÚNG
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleToggleStatementAnswer(q, stmt.id, false);
                                            }}
                                            className={`px-3 py-1.5 rounded-xl font-bold border transition-all cursor-pointer ${
                                              showCorrectAnswers && isFalse
                                                ? "bg-red-600 text-white border-red-600 shadow-2xs"
                                                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                                            }`}
                                          >
                                            SAI
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* 3. Short Answer */}
                              {q.type === "short_answer" && (
                                <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-1.5">
                                  <span className="text-xs font-bold text-slate-700">Đáp án chuẩn:</span>
                                  {showCorrectAnswers ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      {(q.acceptedAnswers || []).map((ans, aIdx) => (
                                        <span
                                          key={aIdx}
                                          className="px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-lg text-xs font-bold font-mono"
                                        >
                                          {ans}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="h-8 border border-dashed border-slate-300 rounded-xl bg-slate-50 flex items-center px-3 text-xs text-slate-400">
                                      (Ô điền kết quả của học sinh: [ .................... ])
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* 4. Matching Board */}
                              {q.type === "matching" && (
                                <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-700 block">Bảng ghép nối 2 cột:</span>
                                    {showCorrectAnswers && (
                                      <div className="flex flex-wrap gap-1 text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                                        <span>Đáp án: </span>
                                        {Object.entries(q.correctMatches || {}).map(([l, r]) => `${l}-${r}`).join(", ")}
                                      </div>
                                    )}
                                  </div>
                                  <InteractiveMatchingBoard
                                    isReview={true}
                                    readOnly={true}
                                    leftItems={q.matchingLeft || []}
                                    rightItems={q.matchingRight || []}
                                    matches={showCorrectAnswers ? q.correctMatches || {} : {}}
                                    correctMatches={q.correctMatches || {}}
                                  />
                                </div>
                              )}

                              {/* 5. Fill in the Blank: Answer Table if showCorrectAnswers */}
                              {q.type === "fill_blank" && (
                                <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-2">
                                  <span className="text-xs font-bold text-slate-700 block">Danh sách từ điền khuyết:</span>
                                  {showCorrectAnswers ? (
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      {Object.entries(q.acceptedAnswersPerBlank || {}).map(([bIdx, ansList]) => (
                                        <div key={bIdx} className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900">
                                          <strong className="text-blue-700">[{parseInt(bIdx, 10) + 1}]:</strong>{" "}
                                          <span className="font-bold font-mono">
                                            {Array.isArray(ansList) ? ansList.join(", ") : String(ansList)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-slate-400 italic">
                                      (Học sinh điền trực tiếp vào các vị trí [(1)], [(2)]... trên đề thi)
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* 6. Ordering */}
                              {q.type === "ordering" && (
                                <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-2 text-xs">
                                  <span className="font-bold text-slate-700 block">
                                    {showCorrectAnswers ? "Thứ tự sắp xếp đúng:" : "Các bước cần sắp xếp:"}
                                  </span>

                                  {showCorrectAnswers ? (
                                    <div className="space-y-1.5">
                                      {((q.correctOrder && q.correctOrder.length > 0)
                                        ? q.correctOrder.map((id) => (q.orderingItems || []).find((it) => it.id === id)).filter(Boolean)
                                        : q.orderingItems || []
                                      ).map((item: any, oIdx: number) => (
                                        <div key={item.id || oIdx} className="flex items-center gap-2 p-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                                          <span className="w-5 h-5 bg-emerald-600 text-white rounded-full font-bold flex items-center justify-center text-[10px]">
                                            {oIdx + 1}
                                          </span>
                                          <div className="flex-1 text-slate-800 font-medium">
                                            <LatexPreview content={item.text} />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="space-y-1.5">
                                      {(q.orderingItems || []).map((item, oIdx) => (
                                        <div key={item.id || oIdx} className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                                          <span className="w-5 h-5 border border-slate-300 rounded font-bold flex items-center justify-center text-[10px] text-slate-400 bg-white">
                                            [ ]
                                          </span>
                                          <div className="flex-1 text-slate-800">
                                            <LatexPreview content={item.text} />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* 7. Essay */}
                              {q.type === "essay" && (
                                <div className="space-y-3 pt-1">
                                  <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-2xl space-y-2">
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                                      <span>Khu vực làm bài tự luận của học sinh</span>
                                    </div>
                                    <div className="space-y-2 py-2">
                                      <div className="border-b border-dashed border-slate-200 h-4"></div>
                                      <div className="border-b border-dashed border-slate-200 h-4"></div>
                                      <div className="border-b border-dashed border-slate-200 h-4"></div>
                                    </div>
                                    {(q.essayMinWords || q.essayMaxWords) && (
                                      <div className="text-[11px] text-slate-400 font-medium">
                                        {q.essayMinWords ? `Tối thiểu: ${q.essayMinWords} từ ` : ""}
                                        {q.essayMaxWords ? `• Tối đa: ${q.essayMaxWords} từ` : ""}
                                      </div>
                                    )}
                                  </div>

                                  {showCorrectAnswers && q.essayRubric && (
                                    <div className="p-4 bg-emerald-50/80 border border-emerald-300 rounded-2xl space-y-2 text-xs">
                                      <div className="font-extrabold text-emerald-900 flex items-center justify-between">
                                        <span className="flex items-center gap-1.5">
                                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                          <span>Barem điểm & Tiêu chí chấm:</span>
                                        </span>
                                        {q.essayGradingMode === "ai" && (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                                            <Bot className="w-3 h-3 text-blue-600" />
                                            <span>Chấm AI Gemini</span>
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-slate-800 font-medium leading-relaxed">
                                        <LatexPreview content={q.essayRubric} />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Detailed Explanation Section */}
                            <div className="border-t border-slate-200/80 pt-3 space-y-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedExplanations((prev) => ({
                                    ...prev,
                                    [q.id]: !prev[q.id],
                                  }));
                                }}
                                className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1.5 cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Hướng dẫn giải chi tiết</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {isExpanded && (
                                <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2 text-xs sm:text-sm text-slate-800 font-medium leading-relaxed animate-in fade-in duration-150">
                                  {q.explanation ? (
                                    <LatexPreview content={q.explanation} />
                                  ) : (
                                    <span className="text-slate-400 italic">Chưa có hướng dẫn giải chi tiết.</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {questions.length === 0 && (
                  <div className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl space-y-2">
                    <p className="font-bold text-sm">Chưa có câu hỏi nào để hiển thị trên giấy thi.</p>
                    <p className="text-xs">Hãy sử dụng thanh công cụ bên trái để bắt đầu tạo câu hỏi!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODAL: 10-POINT EXAM MATRIX OVERVIEW ================= */}
      {showMatrixModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <Grid3X3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 uppercase">
                    Ma trận đáp án & thang điểm 10
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Tổng: {questions.length} câu • {targetSystemTotal} điểm hệ thống
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowMatrixModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative shrink-0">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm số câu (ví dụ: Câu 5 hoặc 5)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            {/* Grid of Matrix Cards */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0 scrollbar-thin">
              {questionGroups.map((group, gIdx) => {
                const filtered = group.items.filter(({ globalIndex }) =>
                  searchTerm
                    ? `câu ${globalIndex + 1}`.includes(searchTerm.toLowerCase()) ||
                      `${globalIndex + 1}`.includes(searchTerm)
                    : true
                );

                if (filtered.length === 0) return null;

                return (
                  <div key={gIdx} className="space-y-2">
                    {group.title && (
                      <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <Layers className="w-3 h-3 text-blue-600" />
                        <span>{group.title}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {filtered.map(({ q, globalIndex: idx }) => {
                        const summary = getQuestionSummary(q);
                        const isUnanswered = summary === "?";
                        const isCurrent = activeQuestion?.id === q.id;
                        const rawPts = q.points ?? 0.25;
                        const sysPts = getSystemScaledPoint(rawPts);

                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => {
                              handleSelectQuestion(q.id);
                              setShowMatrixModal(false);
                            }}
                            className={`p-2.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                              isCurrent
                                ? "bg-blue-50 border-blue-500 ring-2 ring-blue-500/30 shadow-xs"
                                : isUnanswered
                                ? "bg-red-50 text-red-950 border-red-200 hover:bg-red-100"
                                : "bg-emerald-50 text-emerald-950 border-emerald-300 hover:bg-emerald-100"
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold text-xs">
                              <span className="font-extrabold">Câu {idx + 1}</span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  isCurrent
                                    ? "bg-blue-600 text-white"
                                    : isUnanswered
                                    ? "bg-red-200 text-red-900"
                                    : "bg-emerald-600 text-white"
                                }`}
                              >
                                {summary}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium pt-1.5">
                              <span>{rawPts} điểm</span>
                              <span className="font-bold text-blue-700 font-mono">~{sysPts}đ HT</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowMatrixModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Question Confirmation Modal */}
      {questionToDelete && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setQuestionToDelete(null)}
          onConfirm={() => {
            actions.deleteQuestion(questionToDelete.id);
            setQuestionToDelete(null);
            showSuccessToast("Đã xóa câu hỏi khỏi bài thi");
          }}
          title="Xác nhận xóa câu hỏi"
          message={`Bạn có chắc chắn muốn xóa câu hỏi này không? Thao tác này không thể hoàn tác.`}
          confirmText="Xóa câu hỏi"
          cancelText="Hủy"
          variant="danger"
        />
      )}

      {/* Exam Export Modal (Word, PDF, LaTeX, Print) */}
      <ExamExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        exam={examMeta}
        sections={sections}
        questions={questions}
      />
    </div>
  );
}
