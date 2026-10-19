// src/pages/ChapterReview.tsx
// Màn hình Ôn tập theo Lớp học & Chuyên đề SGK (GDPT 2018)

import React, { useState } from 'react';
import { GraduationCap, BookOpen, Atom, Binary, Activity, Layers, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ChapterItem {
  id: string;
  name: string;
  grade: number;
  subject: 'chemistry' | 'math' | 'physics' | 'science';
  subjectName: string;
  mode: string;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  questionCount: number;
  icon: string;
}

export const CURRICULUM_CHAPTERS: ChapterItem[] = [
  // LỚP 8
  {
    id: 'chem_8_1',
    name: 'Mol & Các Đại Lượng Tính Toán',
    grade: 8,
    subject: 'chemistry',
    subjectName: 'Hóa học',
    mode: 'mol_calc',
    difficulty: 'easy',
    description: 'Khối lượng mol, số mol n = m/M, thể tích khí đktc V = n×22.4.',
    questionCount: 50,
    icon: 'FlaskConical',
  },
  {
    id: 'chem_8_2',
    name: 'Cân Bằng PTHH Cơ Bản',
    grade: 8,
    subject: 'chemistry',
    subjectName: 'Hóa học',
    mode: 'balance',
    difficulty: 'easy',
    description: 'Quy tắc hóa trị, bảo toàn nguyên tố kim loại và phi kim.',
    questionCount: 102,
    icon: 'Scale',
  },
  {
    id: 'chem_8_3',
    name: 'Dung Dịch & Nồng Độ C%, CM',
    grade: 8,
    subject: 'chemistry',
    subjectName: 'Hóa học',
    mode: 'mol_calc',
    difficulty: 'medium',
    description: 'Pha chế dung dịch, tính nồng độ phần trăm và nồng độ mol.',
    questionCount: 60,
    icon: 'Beaker',
  },

  // LỚP 9
  {
    id: 'chem_9_1',
    name: 'Tính Chất Hóa Học Kim Loại & Axit',
    grade: 9,
    subject: 'chemistry',
    subjectName: 'Hóa học',
    mode: 'fill_blank',
    difficulty: 'medium',
    description: 'Dãy hoạt động hóa học của kim loại, tác dụng HCl, H2SO4.',
    questionCount: 100,
    icon: 'Flame',
  },
  {
    id: 'chem_9_2',
    name: 'Tính Toán Theo Phương Trình Hóa Học',
    grade: 9,
    subject: 'chemistry',
    subjectName: 'Hóa học',
    mode: 'mol_calc',
    difficulty: 'hard',
    description: 'Xác định lượng chất dư/hết, tính thể tích khí thoát ra.',
    questionCount: 45,
    icon: 'Calculator',
  },
  {
    id: 'chem_9_3',
    name: 'Hiđrocacbon & Nhiên Liệu Khí',
    grade: 9,
    subject: 'chemistry',
    subjectName: 'Hóa học',
    mode: 'compound_name',
    difficulty: 'medium',
    description: 'Metan, etilen, axetilen, phản ứng cháy và phản ứng cộng.',
    questionCount: 80,
    icon: 'Layers',
  },

  // LỚP 10
  {
    id: 'chem_10_1',
    name: 'Cấu Tạo Nguyên Tử & Bảng Tuần Hoàn',
    grade: 10,
    subject: 'chemistry',
    subjectName: 'Hóa học',
    mode: 'element_quiz',
    difficulty: 'medium',
    description: 'Số hiệu nguyên tử Z, chu kỳ, nhóm A, cấu hình electron.',
    questionCount: 100,
    icon: 'Atom',
  },
  {
    id: 'chem_10_2',
    name: 'Xác Định Số Oxi Hóa',
    grade: 10,
    subject: 'chemistry',
    subjectName: 'Hóa học',
    mode: 'oxidation_state',
    difficulty: 'medium',
    description: 'Quy tắc gán số oxi hóa trong đơn chất, hợp chất và ion.',
    questionCount: 110,
    icon: 'Zap',
  },
  {
    id: 'chem_10_3',
    name: 'Phản Ứng Oxi Hóa - Khử Phức Tạp',
    grade: 10,
    subject: 'chemistry',
    subjectName: 'Hóa học',
    mode: 'balance',
    difficulty: 'hard',
    description: 'Cân bằng phản ứng với KMnO4, K2Cr2O7, HNO3 theo phương pháp thăng bằng electron.',
    questionCount: 100,
    icon: 'Scale',
  },

  // TOÁN & VẬT LÍ & KHTN
  {
    id: 'math_thcs',
    name: 'Toán Nhanh & Phương Trình Đại Số',
    grade: 8,
    subject: 'math',
    subjectName: 'Toán học',
    mode: 'math_algebra',
    difficulty: 'medium',
    description: 'Phương trình bậc nhất, Pytago, hệ phương trình, bài toán thực tế.',
    questionCount: 120,
    icon: 'Binary',
  },
  {
    id: 'phys_thcs',
    name: 'Vật Lí Thực Nghiệm & Cơ - Điện',
    grade: 9,
    subject: 'physics',
    subjectName: 'Vật lí',
    mode: 'physics_calc',
    difficulty: 'medium',
    description: 'Vận tốc, công suất, định luật Ôm, nhiệt lượng Q = mcΔt.',
    questionCount: 95,
    icon: 'Activity',
  },
  {
    id: 'khtn_thcs',
    name: 'Trắc Nghiệm KHTN & An Toàn Lab',
    grade: 7,
    subject: 'science',
    subjectName: 'KHTN',
    mode: 'science_mcq',
    difficulty: 'easy',
    description: 'Tế bào, quang hợp, ADN, quang học, sơ cứu bỏng axit trong phòng lab.',
    questionCount: 50,
    icon: 'CheckSquare',
  },
];

export default function ChapterReview() {
  const navigate = useNavigate();
  const [selectedGrade, setSelectedGrade] = useState<number | 'all'>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  const filtered = CURRICULUM_CHAPTERS.filter(c => {
    if (selectedGrade !== 'all' && c.grade !== selectedGrade) return false;
    if (selectedSubject !== 'all' && c.subject !== selectedSubject) return false;
    return true;
  });

  const handleStartReview = (chapter: ChapterItem) => {
    // Điều hướng vào trang Luyện tập với cấu hình chuyên đề đã chọn
    navigate(`/practice?mode=${chapter.mode}&difficulty=${chapter.difficulty}&chapter=${encodeURIComponent(chapter.name)}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-500 mb-1">
          <GraduationCap className="w-4 h-4" />
          <span>Chương trình GDPT Chuẩn Mới 2018</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
          <BookOpen className="w-8 h-8 text-cyan-500" />
          <span>Ôn Tập Theo Chuyên Đề & Khối Lớp</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Lựa chọn khối lớp và chuyên đề trọng tâm để rèn luyện có mục tiêu, lấp đầy lỗ hổng kiến thức trước các kỳ thi.
        </p>
      </div>

      {/* Tabs Bộ lọc Khối Lớp */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {['all', 6, 7, 8, 9, 10, 11, 12].map(g => (
          <button
            key={String(g)}
            onClick={() => setSelectedGrade(g as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
              selectedGrade === g
                ? 'bg-cyan-500 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-cyan-300 dark:hover:border-cyan-700'
            }`}
          >
            {g === 'all' ? 'Tất cả các lớp' : `Lớp ${g}`}
          </button>
        ))}
      </div>

      {/* Tabs Bộ lọc Môn học */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        {[
          { id: 'all', name: 'Tất cả các môn' },
          { id: 'chemistry', name: 'Hóa học' },
          { id: 'math', name: 'Toán học' },
          { id: 'physics', name: 'Vật lí' },
          { id: 'science', name: 'KHTN' },
        ].map(sub => (
          <button
            key={sub.id}
            onClick={() => setSelectedSubject(sub.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedSubject === sub.id
                ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {sub.name}
          </button>
        ))}
      </div>

      {/* Grid danh sách chuyên đề */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(chapter => (
          <div
            key={chapter.id}
            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-cyan-500/50 dark:hover:border-cyan-500/50 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-900/60">
                  Lớp {chapter.grade} • {chapter.subjectName}
                </span>

                <span className="text-[11px] font-semibold text-slate-400">
                  {chapter.questionCount}+ câu
                </span>
              </div>

              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                {chapter.name}
              </h2>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                {chapter.description}
              </p>
            </div>

            <button
              onClick={() => handleStartReview(chapter)}
              className="w-full h-11 rounded-2xl font-bold text-xs bg-slate-100 dark:bg-slate-800 group-hover:bg-cyan-500 group-hover:text-white text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span>Vào Ôn Tập Ngay</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
