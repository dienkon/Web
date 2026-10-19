// src/pages/ChapterReview.tsx
// LỘ TRÌNH ÔN LUYỆN HÓA HỌC TOÀN DIỆN (CHEMISTRY ROADMAP)
// Bám sát 100% chương trình Hóa học THCS - THPT theo chuẩn GDPT 2018

import React, { useState } from 'react';
import {
  GraduationCap, BookOpen, Atom, Scale, Edit3, Zap, FlaskConical,
  Activity, Layers, ArrowRight, Sparkles, CheckCircle2, Flame, Beaker,
  ShieldCheck, Award, Trophy, Compass
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface ChemistryChapterItem {
  id: string;
  name: string;
  grade: 8 | 9 | 10 | 11 | 12 | 0; // 0: Tổng hợp mọi lớp
  category: 'inorganic' | 'organic' | 'physical' | 'experiment' | 'mixed';
  categoryName: string;
  mode: string;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  questionCount: number;
  icon: string;
  milestone: string;
}

const ICON_MAP: Record<string, React.FC<any>> = {
  Scale,
  Edit3,
  BookOpen,
  Atom,
  Zap,
  FlaskConical,
  Activity,
  Layers,
  Flame,
  Beaker,
  ShieldCheck,
  Award,
  Trophy,
  Sparkles,
};

export const CHEMISTRY_ROADMAP_CHAPTERS: ChemistryChapterItem[] = [
  // =========================================================================
  // LỘ TRÌNH LỚP 8 / KHTN 8 (NỀN TẢNG HÓA HỌC)
  // =========================================================================
  {
    id: 'chem_8_1',
    name: 'Chất, Nguyên Tử & Nguyên Tố Hóa Học',
    grade: 8,
    category: 'inorganic',
    categoryName: 'Hóa Vô Cơ',
    mode: 'element_quiz',
    difficulty: 'easy',
    description: 'Ký hiệu nguyên tố, nguyên tử khối, đơn chất, hợp chất và cấu tạo hạt (p, n, e).',
    questionCount: 100,
    icon: 'Atom',
    milestone: 'Chương 1 - Mở đầu',
  },
  {
    id: 'chem_8_2',
    name: 'Phản Ứng Hóa Học & Bảo Toàn Khối Lượng',
    grade: 8,
    category: 'inorganic',
    categoryName: 'Hóa Vô Cơ',
    mode: 'balance',
    difficulty: 'easy',
    description: 'Quy tắc cân bằng phương trình, quy tắc hóa trị và bảo toàn số nguyên tử.',
    questionCount: 102,
    icon: 'Scale',
    milestone: 'Chương 2 - Phản ứng',
  },
  {
    id: 'chem_8_3',
    name: 'Mol & Các Đại Lượng Tính Toán Hóa Học',
    grade: 8,
    category: 'physical',
    categoryName: 'Hóa Lý & Tính toán',
    mode: 'mol_calc',
    difficulty: 'easy',
    description: 'Khối lượng mol M, số mol n = m/M, thể tích khí ở đktc V = n×22.4 và tỉ khối chất khí.',
    questionCount: 120,
    icon: 'FlaskConical',
    milestone: 'Chương 3 - Mol',
  },
  {
    id: 'chem_8_4',
    name: 'Dung Dịch & Nồng Độ Phần Trăm, Nồng Độ Mol',
    grade: 8,
    category: 'physical',
    categoryName: 'Hóa Lý & Tính toán',
    mode: 'mol_calc',
    difficulty: 'medium',
    description: 'Độ tan, pha chế dung dịch, tính nồng độ C% = (m_ct/m_dd)×100% và CM = n/V.',
    questionCount: 85,
    icon: 'Beaker',
    milestone: 'Chương 4 - Dung dịch',
  },
  {
    id: 'chem_8_5',
    name: 'Oxi - Không Khí & Hiđro - Nước',
    grade: 8,
    category: 'inorganic',
    categoryName: 'Hóa Vô Cơ',
    mode: 'fill_blank',
    difficulty: 'easy',
    description: 'Tính chất oxi hóa của O2, phản ứng khử của H2 với oxit kim loại ở nhiệt độ cao.',
    questionCount: 100,
    icon: 'Flame',
    milestone: 'Chương 5 - Đơn chất khí',
  },
  {
    id: 'chem_8_6',
    name: 'Axit, Bazơ, Muối & Môi Trường pH',
    grade: 8,
    category: 'physical',
    categoryName: 'Dung dịch & pH',
    mode: 'solution_ph',
    difficulty: 'easy',
    description: 'Đổi màu giấy quỳ tím, phân loại axit (HCl, H2SO4), bazơ (NaOH, Ca(OH)2), muối và thang pH.',
    questionCount: 60,
    icon: 'Activity',
    milestone: 'Chương 6 - Các loại hợp chất',
  },

  // =========================================================================
  // LỘ TRÌNH LỚP 9 / KHTN 9 (VÔ CƠ NÂNG CAO & NHẬP MÔN HỮU CƠ)
  // =========================================================================
  {
    id: 'chem_9_1',
    name: 'Tính Chất Hóa Học Của Oxit & Axit',
    grade: 9,
    category: 'inorganic',
    categoryName: 'Hóa Vô Cơ',
    mode: 'fill_blank',
    difficulty: 'medium',
    description: 'Oxit bazơ, oxit axit, axit clohiđric, axit sunfuric loãng và đặc nóng.',
    questionCount: 100,
    icon: 'Edit3',
    milestone: 'Chương 1 - Vô cơ 9',
  },
  {
    id: 'chem_9_2',
    name: 'Bazơ, Muối & Phản Ứng Trao Đổi Trong Dung Dịch',
    grade: 9,
    category: 'inorganic',
    categoryName: 'Hóa Vô Cơ',
    mode: 'balance',
    difficulty: 'medium',
    description: 'Điều kiện xảy ra phản ứng trao đổi (tạo kết tủa hoặc chất khí hoặc nước).',
    questionCount: 106,
    icon: 'Scale',
    milestone: 'Chương 1 - Vô cơ 9',
  },
  {
    id: 'chem_9_3',
    name: 'Kim Loại & Dãy Hoạt Động Hóa Học',
    grade: 9,
    category: 'experiment',
    categoryName: 'Thực nghiệm & Kim loại',
    mode: 'substance_match',
    difficulty: 'medium',
    description: 'Dãy K, Na, Ca, Mg, Al, Zn, Fe, Ni, Sn, Pb, H, Cu, Hg, Ag, Pt, Au và phản ứng đẩy kim loại.',
    questionCount: 80,
    icon: 'ShieldCheck',
    milestone: 'Chương 2 - Kim loại',
  },
  {
    id: 'chem_9_4',
    name: 'Tính Toán Theo Phương Trình & Chất Dư/Hết',
    grade: 9,
    category: 'physical',
    categoryName: 'Hóa Lý & Tính toán',
    mode: 'mol_calc',
    difficulty: 'hard',
    description: 'Xác định chất phản ứng hết/dư, thể tích khí thoát ra, khối lượng kết tủa sau phản ứng.',
    questionCount: 90,
    icon: 'FlaskConical',
    milestone: 'Chương 2 - Bài toán Vô cơ',
  },
  {
    id: 'chem_9_5',
    name: 'Sơ Lược Hóa Hữu Cơ & Hiđrocacbon',
    grade: 9,
    category: 'organic',
    categoryName: 'Hóa Hữu Cơ',
    mode: 'compound_name',
    difficulty: 'medium',
    description: 'Khái niệm hợp chất hữu cơ, cấu tạo và phản ứng cháy/cộng của metan, etilen, axetilen.',
    questionCount: 100,
    icon: 'Layers',
    milestone: 'Chương 4 - Hiđrocacbon',
  },
  {
    id: 'chem_9_6',
    name: 'Rượu Etylic, Axit Axetic & Chất Béo',
    grade: 9,
    category: 'organic',
    categoryName: 'Hóa Hữu Cơ',
    mode: 'organic_reactions',
    difficulty: 'medium',
    description: 'Phản ứng lên men giấm, phản ứng este hóa, phản ứng xà phòng hóa chất béo.',
    questionCount: 75,
    icon: 'Flame',
    milestone: 'Chương 5 - Dẫn xuất hữu cơ',
  },

  // =========================================================================
  // LỘ TRÌNH LỚP 10 (CẤU TẠO CHẤT, LIÊN KẾT & PHẢN ỨNG REDOX)
  // =========================================================================
  {
    id: 'chem_10_1',
    name: 'Cấu Tạo Nguyên Tử & Bảng Tuần Hoàn Hiện Đại',
    grade: 10,
    category: 'inorganic',
    categoryName: 'Cấu tạo & Tuần hoàn',
    mode: 'element_quiz',
    difficulty: 'medium',
    description: 'Lớp và phân lớp electron, cấu hình e, quy luật biến đổi bán kính nguyên tử và độ âm điện.',
    questionCount: 100,
    icon: 'Atom',
    milestone: 'Chương 1 & 2 - Nguyên tử',
  },
  {
    id: 'chem_10_2',
    name: 'Liên Kết Hóa Học & Tên Hợp Chất Chuẩn IUPAC',
    grade: 10,
    category: 'inorganic',
    categoryName: 'Danh pháp & Liên kết',
    mode: 'compound_name',
    difficulty: 'medium',
    description: 'Liên kết ion, liên kết cộng hóa trị, tương tác van der Waals và gọi tên IUPAC quốc tế.',
    questionCount: 100,
    icon: 'BookOpen',
    milestone: 'Chương 3 - Liên kết hóa học',
  },
  {
    id: 'chem_10_3',
    name: 'Xác Định Số Oxi Hóa Trong Hợp Chất & Ion',
    grade: 10,
    category: 'physical',
    categoryName: 'Oxi hóa - Khử',
    mode: 'oxidation_state',
    difficulty: 'medium',
    description: 'Các quy tắc gán số oxi hóa của nguyên tố trong hợp chất, oxit phức và ion đa nguyên tử.',
    questionCount: 110,
    icon: 'Zap',
    milestone: 'Chương 4 - Phản ứng Redox',
  },
  {
    id: 'chem_10_4',
    name: 'Cân Bằng Phản Ứng Oxi Hóa - Khử Phức Tạp',
    grade: 10,
    category: 'inorganic',
    categoryName: 'Oxi hóa - Khử',
    mode: 'balance',
    difficulty: 'hard',
    description: 'Phương pháp thăng bằng electron cho phản ứng môi trường axit (HNO3, H2SO4 đ, KMnO4).',
    questionCount: 100,
    icon: 'Scale',
    milestone: 'Chương 4 - Phản ứng Redox',
  },
  {
    id: 'chem_10_5',
    name: 'Kỹ Năng Thí Nghiệm & An Toàn Hóa Học',
    grade: 10,
    category: 'experiment',
    categoryName: 'Thực nghiệm & An toàn',
    mode: 'experiment_lab',
    difficulty: 'medium',
    description: 'Quy tắc an toàn pha axit, thu khí, nhận biết hiện tượng và xử lý sự cố trong phòng thí nghiệm.',
    questionCount: 65,
    icon: 'ShieldCheck',
    milestone: 'Thực hành & Kỹ năng Lab',
  },
  {
    id: 'chem_10_6',
    name: 'Nhóm Halogen (F, Cl, Br, I) & Tính Oxi Hóa',
    grade: 10,
    category: 'inorganic',
    categoryName: 'Hóa Vô Cơ',
    mode: 'fill_blank',
    difficulty: 'hard',
    description: 'Quy luật tính oxi hóa giảm dần từ F2 đến I2, phản ứng điều chế Cl2, thuốc thử ion halide.',
    questionCount: 100,
    icon: 'Flame',
    milestone: 'Chương 7 - Halogen',
  },

  // =========================================================================
  // LỘ TRÌNH LỚP 11 (CÂN BẰNG HÓA HỌC, PH & HỢP CHẤT HỮU CƠ)
  // =========================================================================
  {
    id: 'chem_11_1',
    name: 'Cân Bằng Hóa Học & Chuyển Dịch Cân Bằng',
    grade: 11,
    category: 'physical',
    categoryName: 'Hóa Lý',
    mode: 'solution_ph',
    difficulty: 'medium',
    description: 'Nguyên lý Le Chatelier, ảnh hưởng của nhiệt độ, áp suất, nồng độ đến cân bằng phản ứng.',
    questionCount: 70,
    icon: 'Scale',
    milestone: 'Chương 1 - Cân bằng',
  },
  {
    id: 'chem_11_2',
    name: 'Cân Bằng Trong Dung Dịch Nước & Tính Độ pH',
    grade: 11,
    category: 'physical',
    categoryName: 'Dung dịch & Điện li',
    mode: 'solution_ph',
    difficulty: 'hard',
    description: 'Thuyết axit-bazơ Brønsted-Lowry, sự điện li, tích số ion của nước Kw và tính pH dung dịch.',
    questionCount: 85,
    icon: 'Activity',
    milestone: 'Chương 1 - Sự điện li',
  },
  {
    id: 'chem_11_3',
    name: 'Hợp Chất Nitrogen & Sulfur (NH3, HNO3, H2SO4)',
    grade: 11,
    category: 'inorganic',
    categoryName: 'Hóa Vô Cơ',
    mode: 'fill_blank',
    difficulty: 'hard',
    description: 'Tính bazơ của NH3, tính oxi hóa mạnh của HNO3 và H2SO4 đặc nóng, mưa axit.',
    questionCount: 100,
    icon: 'Edit3',
    milestone: 'Chương 2 - Nitrogen & Sulfur',
  },
  {
    id: 'chem_11_4',
    name: 'Đại Cương Hữu Cơ & Danh Pháp IUPAC Mới',
    grade: 11,
    category: 'organic',
    categoryName: 'Hóa Hữu Cơ',
    mode: 'compound_name',
    difficulty: 'hard',
    description: 'Quy tắc gọi tên thay thế IUPAC cho ankan, anken, ankin, dẫn xuất halogen, ancol, phenol.',
    questionCount: 100,
    icon: 'BookOpen',
    milestone: 'Chương 3 - Đại cương hữu cơ',
  },
  {
    id: 'chem_11_5',
    name: 'Hydrocarbon (Alkane, Alkene, Alkyne, Arene)',
    grade: 11,
    category: 'organic',
    categoryName: 'Hóa Hữu Cơ',
    mode: 'organic_reactions',
    difficulty: 'medium',
    description: 'Cơ chế thế gốc tự do, quy tắc cộng Markovnikov, phản ứng trùng hợp và ankylbenzen.',
    questionCount: 95,
    icon: 'Layers',
    milestone: 'Chương 4 - Hydrocarbon',
  },
  {
    id: 'chem_11_6',
    name: 'Hợp Chất Carbonyl & Carboxylic Acid',
    grade: 11,
    category: 'organic',
    categoryName: 'Hóa Hữu Cơ',
    mode: 'organic_reactions',
    difficulty: 'hard',
    description: 'Aldehyde, ketone, carboxylic acid: phản ứng tráng bạc, tạo phức đồng, phản ứng este hóa.',
    questionCount: 80,
    icon: 'FlaskConical',
    milestone: 'Chương 5 - Hợp chất chứa oxi',
  },

  // =========================================================================
  // LỘ TRÌNH LỚP 12 (CHUYÊN SÂU HỮU CƠ, KIM LOẠI & LUYỆN THI)
  // =========================================================================
  {
    id: 'chem_12_1',
    name: 'Ester - Lipid, Xà Phòng & Chất Giặt Rửa',
    grade: 12,
    category: 'organic',
    categoryName: 'Hóa Hữu Cơ',
    mode: 'organic_reactions',
    difficulty: 'hard',
    description: 'Cấu tạo este, chất béo no/không no, phản ứng xà phòng hóa và cơ chế tẩy rửa.',
    questionCount: 90,
    icon: 'Layers',
    milestone: 'Chương 1 - Ester - Lipid',
  },
  {
    id: 'chem_12_2',
    name: 'Carbohydrate (Glucose, Fructose, Sucrose, Tinh bột)',
    grade: 12,
    category: 'organic',
    categoryName: 'Hóa Hữu Cơ',
    mode: 'substance_match',
    difficulty: 'hard',
    description: 'Phân loại monosaccarit, đisaccarit, polisaccarit, phản ứng tráng bạc và phản ứng màu iot.',
    questionCount: 85,
    icon: 'Award',
    milestone: 'Chương 2 - Carbohydrate',
  },
  {
    id: 'chem_12_3',
    name: 'Amine, Amino Acid, Peptide & Protein',
    grade: 12,
    category: 'organic',
    categoryName: 'Hóa Hữu Cơ',
    mode: 'compound_name',
    difficulty: 'hard',
    description: 'Tính lưỡng tính của amino axit, liên kết peptit, phản ứng màu biure nhận biết protein.',
    questionCount: 95,
    icon: 'BookOpen',
    milestone: 'Chương 3 - Hợp chất chứa Nitơ',
  },
  {
    id: 'chem_12_4',
    name: 'Polymer & Vật Liệu Polymer Tổng Hợp',
    grade: 12,
    category: 'organic',
    categoryName: 'Hóa Hữu Cơ',
    mode: 'organic_reactions',
    difficulty: 'hard',
    description: 'Phản ứng trùng hợp, trùng ngưng, chất dẻo PE, PVC, tơ nilon-6,6, cao su tự nhiên và nhân tạo.',
    questionCount: 80,
    icon: 'Layers',
    milestone: 'Chương 4 - Polymer',
  },
  {
    id: 'chem_12_5',
    name: 'Đại Cương Kim Loại, Ăn Mòn & Điện Phân',
    grade: 12,
    category: 'inorganic',
    categoryName: 'Kim loại',
    mode: 'oxidation_state',
    difficulty: 'hard',
    description: 'Mạng tinh thể kim loại, ăn mòn hóa học và điện hóa, phương pháp điện phân điều chế kim loại.',
    questionCount: 100,
    icon: 'Zap',
    milestone: 'Chương 5 - Đại cương kim loại',
  },
  {
    id: 'chem_12_6',
    name: 'Sắt, Crom, Đồng & Phức Chất Vô Cơ',
    grade: 12,
    category: 'inorganic',
    categoryName: 'Kim loại chuyển tiếp',
    mode: 'balance',
    difficulty: 'hard',
    description: 'Hợp chất Fe(II)/Fe(III), Cr(III)/Cr(VI), phức chất Cu(II) và cân bằng redox nâng cao.',
    questionCount: 100,
    icon: 'Scale',
    milestone: 'Chương 7 - Kim loại chuyển tiếp',
  },

  // =========================================================================
  // ĐẤU TRƯỜNG TỔNG HỢP & LEO RANK HÓA THỦ
  // =========================================================================
  {
    id: 'chem_arena_mixed',
    name: 'Hỗn Hợp Đấu Trường Hóa Học Toàn Diện',
    grade: 0,
    category: 'mixed',
    categoryName: 'Đấu trường Hóa',
    mode: 'mixed',
    difficulty: 'medium',
    description: 'Luân phiên ngẫu nhiên toàn bộ các dạng bài vô cơ, hữu cơ, danh pháp, tính toán mol.',
    questionCount: 500,
    icon: 'Shuffle',
    milestone: 'Đấu trường tổng hợp',
  },
  {
    id: 'chem_arena_ranked',
    name: 'Đấu Hạng Hóa Học - Leo Rank Thần Hóa',
    grade: 0,
    category: 'mixed',
    categoryName: 'Xếp hạng Hóa thủ',
    mode: 'ranked_mixed',
    difficulty: 'hard',
    description: 'Chế độ xếp hạng tiêu chuẩn dành riêng cho các Hóa thủ thi đấu đỉnh cao để giành danh hiệu.',
    questionCount: 500,
    icon: 'Trophy',
    milestone: 'Chuẩn Rank Đấu Trường',
  },
];

export default function ChapterReview() {
  const navigate = useNavigate();
  const [selectedGrade, setSelectedGrade] = useState<number | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filtered = CHEMISTRY_ROADMAP_CHAPTERS.filter(c => {
    if (selectedGrade !== 'all') {
      if (selectedGrade === 0 && c.grade !== 0) return false;
      if (selectedGrade !== 0 && c.grade !== selectedGrade && c.grade !== 0) return false;
    }
    if (selectedCategory !== 'all' && c.category !== selectedCategory) return false;
    return true;
  });

  const handleStartReview = (chapter: ChemistryChapterItem) => {
    navigate(`/practice?mode=${chapter.mode}&difficulty=${chapter.difficulty}&chapter=${encodeURIComponent(chapter.name)}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-cyan-500/15 via-blue-500/10 to-indigo-500/15 border border-cyan-400/30 dark:border-cyan-800/60 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
              <Compass className="w-4 h-4" />
              <span>Lộ Trình Hóa Học Chuẩn GDPT 2018</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-cyan-500" />
              Lộ Trình Chuyên Hóa Lớp 8 - 12
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Hệ thống hóa toàn bộ kiến thức Hóa học THCS & THPT theo chuẩn sách giáo khoa mới. Phân chia rõ ràng từ Hóa Vô cơ, Hóa Hữu cơ, Hóa Lý đến Thực nghiệm phòng thí nghiệm.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shrink-0">
            <Trophy className="w-8 h-8 text-amber-500" />
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng chuyên đề</div>
              <div className="text-xl font-black text-cyan-600 dark:text-cyan-400">
                {CHEMISTRY_ROADMAP_CHAPTERS.length} Chặng Đường
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grade Selector Tabs */}
      <div className="space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center gap-1.5">
          <GraduationCap className="w-4 h-4 text-cyan-500" />
          <span>Chọn Khối Lớp Ôn Luyện:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'Tất cả khối lớp' },
            { id: 8, label: 'Lớp 8 (KHTN 8)' },
            { id: 9, label: 'Lớp 9 (KHTN 9)' },
            { id: 10, label: 'Lớp 10 (THPT)' },
            { id: 11, label: 'Lớp 11 (THPT)' },
            { id: 12, label: 'Lớp 12 (Luyện thi)' },
            { id: 0, label: 'Đấu Trường Rank' },
          ].map(g => (
            <button
              key={String(g.id)}
              onClick={() => setSelectedGrade(g.id as any)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                selectedGrade === g.id
                  ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
        {[
          { id: 'all', label: 'Tất cả phân môn' },
          { id: 'inorganic', label: 'Hóa Vô Cơ' },
          { id: 'physical', label: 'Hóa Lý & Tính Toán' },
          { id: 'organic', label: 'Hóa Hữu Cơ' },
          { id: 'experiment', label: 'Thực Nghiệm & An Toàn' },
          { id: 'mixed', label: 'Đấu Trường Hỗn Hợp' },
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedCategory === cat.id
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Roadmap Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((chapter) => {
          const IconComp = ICON_MAP[chapter.icon] || FlaskConical;
          return (
            <div
              key={chapter.id}
              className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:border-cyan-500/50 hover:shadow-lg transition-all group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg">
                    {chapter.milestone}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md capitalize ${
                    chapter.difficulty === 'easy' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                    chapter.difficulty === 'medium' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                    'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                  }`}>
                    {chapter.difficulty === 'easy' ? 'Dễ' : chapter.difficulty === 'medium' ? 'Vừa' : 'Khó'}
                  </span>
                </div>

                <div className="flex items-start gap-3 pt-1">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform text-cyan-500">
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug group-hover:text-cyan-500 transition-colors">
                      {chapter.name}
                    </h3>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {chapter.grade === 0 ? 'Mọi khối lớp' : `Hóa học Lớp ${chapter.grade}`} • {chapter.categoryName}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
                  {chapter.description}
                </p>
              </div>

              <div className="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">
                  ~{chapter.questionCount} câu hỏi chuẩn
                </span>
                <button
                  type="button"
                  onClick={() => handleStartReview(chapter)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-cyan-500 hover:text-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 dark:hover:bg-cyan-500 dark:hover:text-white text-xs font-bold transition-all cursor-pointer"
                >
                  <span>Luyện ngay</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
