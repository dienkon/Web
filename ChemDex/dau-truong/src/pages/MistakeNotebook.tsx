// src/pages/MistakeNotebook.tsx
// Giao diện Sổ tay câu sai & Hệ thống ôn tập theo điểm yếu

import React, { useState, useEffect } from 'react';
import { BookOpen, AlertTriangle, CheckCircle2, Trash2, ArrowLeft, RefreshCw, Sparkles, Filter, ChevronRight, Layers } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ChemText } from '../components/common/ChemText';
import {
  getWrongQuestions,
  WrongQuestionRecord,
  markQuestionAsMastered,
  deleteWrongQuestion,
  clearWrongQuestions,
  analyzeWeakPoints,
} from '../features/learning/wrongQuestionTracker';

export default function MistakeNotebook() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<WrongQuestionRecord[]>([]);
  const [filterGrade, setFilterGrade] = useState<number | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'need_review' | 'mastered'>('all');
  const [selectedQuestion, setSelectedQuestion] = useState<WrongQuestionRecord | null>(null);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = () => {
    const list = getWrongQuestions();
    setQuestions(list);
    if (list.length > 0 && !selectedQuestion) {
      setSelectedQuestion(list[0]);
    }
  };

  const handleMarkMastered = (id: string) => {
    markQuestionAsMastered(id);
    loadQuestions();
  };

  const handleDelete = (id: string) => {
    deleteWrongQuestion(id);
    const updated = questions.filter(q => q.id !== id);
    setQuestions(updated);
    if (selectedQuestion?.id === id) {
      setSelectedQuestion(updated[0] || null);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử trong Sổ tay câu sai không?')) {
      clearWrongQuestions();
      setQuestions([]);
      setSelectedQuestion(null);
    }
  };

  const filtered = questions.filter(q => {
    if (filterGrade !== 'all' && q.grade !== filterGrade) return false;
    if (filterStatus === 'need_review' && q.isMastered) return false;
    if (filterStatus === 'mastered' && !q.isMastered) return false;
    return true;
  });

  const weakPoints = analyzeWeakPoints(questions);
  const masteredCount = questions.filter(q => q.isMastered).length;
  const pendingCount = questions.length - masteredCount;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
              <BookOpen className="w-7 h-7 text-rose-500" />
              <span>Sổ Tay Câu Sai & Điểm Yếu</span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Ghi nhớ và phân tích các câu bạn đã trả lời chưa chính xác để ôn tập có định hướng.
            </p>
          </div>
        </div>

        {questions.length > 0 && (
          <button
            onClick={handleClearAll}
            className="px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl border border-rose-200 dark:border-rose-900/50 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Trash2 className="w-4 h-4" />
            <span>Xóa sạch sổ tay</span>
          </button>
        )}
      </div>

      {/* Thống kê nhanh */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center font-bold text-xl">
            {questions.length}
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Tổng câu đã lưu</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">Toàn bộ câu sai</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center font-bold text-xl">
            {pendingCount}
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Cần ôn luyện lại</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">Lỗ hổng kiến thức</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-500 flex items-center justify-center font-bold text-xl">
            {masteredCount}
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Đã làm chủ</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">Đã khắc phục thành công</div>
          </div>
        </div>
      </div>

      {/* Phân tích điểm yếu hàng đầu */}
      {weakPoints.length > 0 && (
        <div className="p-5 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 dark:from-amber-950/30 dark:to-rose-950/30 rounded-3xl border border-amber-200/80 dark:border-amber-900/40 mb-8">
          <h2 className="text-base font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span>Chẩn đoán điểm yếu kiến thức của bạn</span>
          </h2>
          <div className="flex flex-wrap gap-2.5">
            {weakPoints.slice(0, 4).map((wp, idx) => (
              <div
                key={idx}
                className="px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-amber-200 dark:border-amber-800 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 shadow-xs"
              >
                <span className="w-5 h-5 rounded-md bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold">
                  #{idx + 1}
                </span>
                <span>{wp.chapter}</span>
                <span className="text-amber-600 dark:text-amber-400">({wp.count} lần sai)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bộ lọc */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold uppercase text-slate-400">Bộ lọc:</span>

          <select
            value={filterGrade}
            onChange={e => setFilterGrade(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}
            className="text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-300 outline-none"
          >
            <option value="all">Mọi khối lớp</option>
            <option value={8}>Lớp 8</option>
            <option value={9}>Lớp 9</option>
            <option value={10}>Lớp 10</option>
            <option value={11}>Lớp 11</option>
            <option value={12}>Lớp 12</option>
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-300 outline-none"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="need_review">Cần ôn lại</option>
            <option value="mastered">Đã làm chủ</option>
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Hiển thị <b>{filtered.length}</b> / {questions.length} câu
        </div>
      </div>

      {/* Nội dung danh sách & chi tiết */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 px-4 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-80" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Không có câu sai nào trong mục này!</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-5">
            Khi thi đấu hoặc luyện tập nếu có câu chưa chính xác, hệ thống sẽ tự động lưu vào đây để bạn tra cứu lời giải.
          </p>
          <button
            onClick={() => navigate('/practice')}
            className="px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md hover:from-cyan-600 hover:to-blue-700 transition-all inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Vào Luyện Tập Ngay</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Cột trái: Danh sách câu */}
          <div className="lg:col-span-5 flex flex-col gap-2.5 max-h-[680px] overflow-y-auto pr-1">
            {filtered.map(item => {
              const isSelected = selectedQuestion?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedQuestion(item)}
                  className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-50/60 dark:bg-cyan-950/40 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      Lớp {item.grade} • {item.mode}
                    </span>

                    {item.isMastered ? (
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Đã làm chủ
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Sai {item.failedCount} lần
                      </span>
                    )}
                  </div>

                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
                    <ChemText text={item.equation} />
                  </div>

                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-2 truncate">
                    {item.chapter}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cột phải: Chi tiết câu đang chọn */}
          <div className="lg:col-span-7 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md sticky top-6">
            {selectedQuestion && (
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-lg text-xs font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                      Lớp {selectedQuestion.grade}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {selectedQuestion.chapter}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDelete(selectedQuestion.id)}
                    className="text-xs text-slate-400 hover:text-rose-500 flex items-center gap-1 p-1"
                    title="Xóa câu này khỏi sổ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mb-6">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Đề bài:</div>
                  <div className="text-lg md:text-xl font-bold text-slate-900 dark:text-white leading-relaxed p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                    <ChemText text={selectedQuestion.equation} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40">
                    <div className="text-xs font-bold text-rose-600 dark:text-rose-400 mb-1">Bạn đã trả lời:</div>
                    <div className="text-base font-bold text-rose-900 dark:text-rose-200 truncate">
                      {selectedQuestion.userAnswer || '(Bỏ trống)'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40">
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">Đáp án đúng chuẩn:</div>
                    <div className="text-base font-bold text-emerald-900 dark:text-emerald-200 truncate">
                      {selectedQuestion.correctAnswer}
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Lời giải chi tiết:</div>
                  <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-sm md:text-base text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    <ChemText text={selectedQuestion.explanation} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  {!selectedQuestion.isMastered ? (
                    <button
                      onClick={() => handleMarkMastered(selectedQuestion.id)}
                      className="px-4 py-2.5 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Đánh dấu đã hiểu (Làm chủ)</span>
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
                      <CheckCircle2 className="w-4 h-4" />
                      Bạn đã đánh dấu làm chủ câu này
                    </span>
                  )}

                  <button
                    onClick={() => navigate('/practice')}
                    className="px-4 py-2.5 rounded-xl font-bold text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 ml-auto"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Luyện tập thêm</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
