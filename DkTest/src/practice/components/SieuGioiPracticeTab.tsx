import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Play,
  Layers,
  Sparkles,
  Calculator,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  Box,
  BarChart3,
  Target,
  Image as ImageIcon,
  CheckCircle,
} from "lucide-react";
import {
  SIEUGIOI_LESSONS_METADATA,
  SIEUGIOI_QUESTIONS,
} from "../data/sieugioi/sieugioiQuestions";
import { PracticeRegistry } from "../core/PracticeRegistry";
import type { PracticeMode } from "../core/types";

interface Props {
  onOpenLaunchModal: (mode: PracticeMode) => void;
}

const CHAPTER_FILTERS = [
  { id: "all", label: "Tất cả các chương", icon: Layers },
  { id: "1", label: "Chương 1. Ứng dụng đạo hàm", icon: TrendingUp },
  { id: "2", label: "Chương 2. Vectơ & Tọa độ", icon: Box },
  { id: "3", label: "Chương 3. Thống kê số liệu", icon: BarChart3 },
  { id: "4", label: "Chương 4. Nguyên hàm - Tích phân", icon: Layers },
  { id: "5", label: "Chương 5. Phương pháp tọa độ", icon: Target },
];

export default function SieuGioiPracticeTab({ onOpenLaunchModal }: Props) {
  const navigate = useNavigate();
  const [selectedChapter, setSelectedChapter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedBais, setExpandedBais] = useState<Record<number, boolean>>({});

  const toggleBai = (bai: number) => {
    setExpandedBais((prev) => ({ ...prev, [bai]: !prev[bai] }));
  };

  const expandAll = () => {
    const all: Record<number, boolean> = {};
    for (let i = 1; i <= 17; i++) all[i] = true;
    setExpandedBais(all);
  };

  const collapseAll = () => {
    setExpandedBais({});
  };

  // Convert lessons metadata to sorted array
  const lessons = useMemo(() => {
    return Object.entries(SIEUGIOI_LESSONS_METADATA)
      .map(([baiStr, data]: [string, any]) => ({
        bai: Number(baiStr),
        ...data,
      }))
      .sort((a, b) => a.bai - b.bai);
  }, []);

  // Filter lessons
  const filteredLessons = useMemo(() => {
    return lessons.filter((lesson) => {
      // Chapter filter
      if (selectedChapter !== "all") {
        const chNum = parseInt(selectedChapter, 10);
        if (chNum === 1 && (lesson.bai < 1 || lesson.bai > 5)) return false;
        if (chNum === 2 && (lesson.bai < 6 || lesson.bai > 8)) return false;
        if (chNum === 3 && (lesson.bai < 9 || lesson.bai > 10)) return false;
        if (chNum === 4 && (lesson.bai < 11 || lesson.bai > 13)) return false;
        if (chNum === 5 && (lesson.bai < 14 || lesson.bai > 17)) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inTitle = lesson.baiTitle.toLowerCase().includes(q);
        const inChapter = lesson.chapter.toLowerCase().includes(q);
        const inExams = lesson.exams?.some((ex: any) => ex.title.toLowerCase().includes(q));
        return inTitle || inChapter || inExams;
      }

      return true;
    });
  }, [lessons, selectedChapter, searchQuery]);

  // Launch handlers
  const handleLaunchAll = () => {
    const mode = PracticeRegistry.get("math_sieugioi_all");
    if (mode) onOpenLaunchModal(mode);
  };

  const handleLaunchBai = (baiNumber: number) => {
    const questions = SIEUGIOI_QUESTIONS.filter((q) => q.bai === baiNumber);
    const totalQuestions = questions.length || 15;
    navigate(`/practice/math_sieugioi_bai_${baiNumber}?diff=1&target=${totalQuestions}&fullExam=true`);
  };

  const handleLaunchExam = (examId: string) => {
    const examQuestions = SIEUGIOI_QUESTIONS.filter((q) => q.examId === examId);
    const totalQuestions = examQuestions.length || 15;
    navigate(`/practice/sg_exam_${examId}?diff=1&target=${totalQuestions}&fullExam=true`);
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 text-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-56 h-56 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3 border border-emerald-500/30">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Đã đồng bộ đầy đủ 61 đề thi • 996 câu hỏi • 310 hình vẽ đồ thị</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">
              Kho Bài Tập Trắc Nghiệm Toán 12 SieuGioi
            </h2>
            <p className="mt-2 text-blue-200 text-xs sm:text-sm leading-relaxed">
              Toàn bộ bài tập bám sát chương trình GDPT 2018 từ Bài 1 đến Bài 17. Đầy đủ bảng biến thiên, đồ thị hàm số và hình học không gian Oxyz được lưu trữ cục bộ, sẵn sàng luyện tập tức thì.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleLaunchAll}
              className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Luyện 996 câu ngẫu nhiên</span>
            </button>
          </div>
        </div>
      </div>

      {/* Chapter Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 space-y-4">
        {/* Chapter Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CHAPTER_FILTERS.map((f) => {
            const Icon = f.icon;
            const isSelected = selectedChapter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedChapter(f.id)}
                className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0 ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{f.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm bài học, đề số, dạng toán..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-hidden transition-all"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={expandAll}
              className="text-xs font-semibold text-slate-600 hover:text-blue-600 px-2 py-1 rounded-lg hover:bg-slate-100"
            >
              Mở rộng tất cả
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={collapseAll}
              className="text-xs font-semibold text-slate-600 hover:text-blue-600 px-2 py-1 rounded-lg hover:bg-slate-100"
            >
              Thu gọn
            </button>
          </div>
        </div>
      </div>

      {/* Lesson List (Bài 1 đến Bài 17) */}
      <div className="space-y-4">
        {filteredLessons.map((lesson) => {
          const isExpanded = !!expandedBais[lesson.bai];
          const exams = lesson.exams || [];
          const imagesCount = exams.reduce(
            (acc: number, ex: any) => acc + (ex.questionsWithImages || 0),
            0
          );

          return (
            <div
              key={lesson.bai}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all overflow-hidden"
            >
              {/* Lesson Header */}
              <div
                onClick={() => toggleBai(lesson.bai)}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 font-black text-sm flex items-center justify-center shrink-0 border border-blue-100">
                    B{lesson.bai}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        {lesson.chapter}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-snug">
                      Bài {lesson.bai}. {lesson.baiTitle}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2.5 mt-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>{lesson.examCount} đề thi</span>
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        <Calculator className="w-3.5 h-3.5" />
                        <span>{lesson.questionCount} câu hỏi</span>
                      </span>
                      {imagesCount > 0 && (
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>{imagesCount} hình vẽ</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions & Chevron */}
                <div
                  className="flex items-center gap-2.5 self-end sm:self-center shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => handleLaunchBai(lesson.bai)}
                    className="min-h-[40px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Luyện chuyên đề</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleBai(lesson.bai)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Collapsible Exams List */}
              {isExpanded && (
                <div className="bg-slate-50/70 border-t border-slate-100 p-4 sm:p-5">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Danh sách các đề thi trong Bài {lesson.bai}:
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {exams.map((exam: any, eIdx: number) => (
                      <div
                        key={exam.id}
                        className="bg-white rounded-xl p-3.5 border border-slate-200 hover:border-blue-400 transition-all flex items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                              Đề {eIdx + 1}
                            </span>
                            {exam.questionsWithImages > 0 && (
                              <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-0.5">
                                <ImageIcon className="w-3 h-3" />
                                {exam.questionsWithImages} hình
                              </span>
                            )}
                          </div>
                          <div className="text-xs sm:text-sm font-semibold text-slate-800 truncate" title={exam.title}>
                            {exam.title}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {exam.totalQuestions} câu hỏi trắc nghiệm có lời giải
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleLaunchExam(exam.id)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1"
                        >
                          <span>Luyện</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
