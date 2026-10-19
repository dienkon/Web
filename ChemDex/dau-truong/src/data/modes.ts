// src/data/modes.ts
// Danh mục cấu hình toàn bộ các chế độ chơi trong Đấu Trường Hóa Học & KHTN

export interface ModeInfo {
  id: string;
  name: string;
  shortName: string;
  subject: 'chemistry' | 'math' | 'physics' | 'science' | 'mixed';
  subjectName: string;
  gradeText: string;
  gradeLevels: number[];
  icon: string;
  badgeColor: string;
  description: string;
  format: string;
  isNew?: boolean;
}

export const ALL_GAME_MODES: ModeInfo[] = [
  // --- 5 CHẾ ĐỘ HÓA HỌC CỔ ĐIỂN ---
  {
    id: 'balance',
    name: 'Cân Bằng PTHH',
    shortName: 'Cân bằng',
    subject: 'chemistry',
    subjectName: 'Hóa học',
    gradeText: 'Lớp 8 - 10',
    gradeLevels: [8, 9, 10],
    icon: 'Scale',
    badgeColor: 'from-amber-500 to-orange-500',
    description: 'Điền các hệ số nguyên tối giản để cân bằng phương trình phản ứng hóa học.',
    format: 'Hệ số tỉ lệ',
  },
  {
    id: 'fill_blank',
    name: 'Điền Khuyết PTHH',
    shortName: 'Điền khuyết',
    subject: 'chemistry',
    subjectName: 'Hóa học',
    gradeText: 'Lớp 8 - 11',
    gradeLevels: [8, 9, 10, 11],
    icon: 'Edit3',
    badgeColor: 'from-blue-500 to-cyan-500',
    description: 'Dự đoán và điền công thức chất còn thiếu tại vị trí trống ___ trong phản ứng.',
    format: 'Công thức hóa học',
  },
  {
    id: 'compound_name',
    name: 'Danh Pháp Hợp Chất',
    shortName: 'Gọi tên',
    subject: 'chemistry',
    subjectName: 'Hóa học',
    gradeText: 'Lớp 8 - 12',
    gradeLevels: [8, 9, 10, 11, 12],
    icon: 'BookOpen',
    badgeColor: 'from-emerald-500 to-teal-500',
    description: 'Gọi tên hợp chất theo IUPAC quốc tế hoặc tên danh pháp SGK tiếng Việt.',
    format: 'Tên IUPAC / SGK VN',
  },
  {
    id: 'element_quiz',
    name: 'Đoán Nguyên Tố',
    shortName: 'Nguyên tố',
    subject: 'chemistry',
    subjectName: 'Hóa học',
    gradeText: 'Lớp 8, 10',
    gradeLevels: [8, 10],
    icon: 'Atom',
    badgeColor: 'from-purple-500 to-indigo-500',
    description: 'Đoán ký hiệu hoặc tên nguyên tố dựa vào số hiệu Z, chu kỳ, nhóm và tính chất.',
    format: 'Ký hiệu / Tên nguyên tố',
  },
  {
    id: 'oxidation_state',
    name: 'Số Oxi Hóa',
    shortName: 'Số oxi hóa',
    subject: 'chemistry',
    subjectName: 'Hóa học',
    gradeText: 'Lớp 10',
    gradeLevels: [10],
    icon: 'Zap',
    badgeColor: 'from-rose-500 to-pink-500',
    description: 'Xác định số oxi hóa của nguyên tố trong hợp chất, có dấu +/- rõ ràng (hoặc 0).',
    format: 'Số có dấu (+/-)',
  },

  // --- 6 CHẾ ĐỘ MỚI THCS - THPT & KHTN ---
  {
    id: 'mol_calc',
    name: 'Tính Toán Hóa Học',
    shortName: 'Tính mol',
    subject: 'chemistry',
    subjectName: 'Hóa học',
    gradeText: 'Lớp 8 - 10',
    gradeLevels: [8, 9, 10],
    icon: 'FlaskConical',
    badgeColor: 'from-cyan-500 to-blue-600',
    description: 'Tính khối lượng mol, số mol, thể tích khí đktc, nồng độ C%, CM, tính theo PTHH.',
    format: 'Nhập số (chấp nhận phẩy/chấm/phân số)',
    isNew: true,
  },
  {
    id: 'math_algebra',
    name: 'Toán Nhanh & Đại Số',
    shortName: 'Toán nhanh',
    subject: 'math',
    subjectName: 'Toán học',
    gradeText: 'Lớp 6 - 9',
    gradeLevels: [6, 7, 8, 9],
    icon: 'Binary',
    badgeColor: 'from-indigo-500 to-violet-600',
    description: 'Tính nhẩm nhanh, phần trăm, giảm giá, phương trình bậc nhất, Pytago, hệ phương trình.',
    format: 'Nhập số',
    isNew: true,
  },
  {
    id: 'physics_calc',
    name: 'Vật Lí Ứng Dụng',
    shortName: 'Vật lí',
    subject: 'physics',
    subjectName: 'Vật lí',
    gradeText: 'Lớp 8 - 10',
    gradeLevels: [8, 9, 10],
    icon: 'Activity',
    badgeColor: 'from-amber-500 to-yellow-600',
    description: 'Tính vận tốc, khối lượng riêng, áp suất, công suất, định luật Ôm, nhiệt lượng Q = mcΔt.',
    format: 'Nhập số',
    isNew: true,
  },
  {
    id: 'unit_convert',
    name: 'Đổi Đơn Vị KHTN',
    shortName: 'Đổi đơn vị',
    subject: 'science',
    subjectName: 'KHTN',
    gradeText: 'Lớp 6 - 9',
    gradeLevels: [6, 7, 8, 9],
    icon: 'RefreshCw',
    badgeColor: 'from-teal-500 to-emerald-600',
    description: 'Chuyển đổi km/h ↔ m/s, g/cm³ ↔ kg/m³, ha ↔ m², °C ↔ K, kWh ↔ kJ, mol ↔ mmol.',
    format: 'Nhập số',
    isNew: true,
  },
  {
    id: 'science_mcq',
    name: 'Trắc Nghiệm KHTN',
    shortName: 'Trắc nghiệm',
    subject: 'science',
    subjectName: 'KHTN',
    gradeText: 'Lớp 6 - 9',
    gradeLevels: [6, 7, 8, 9],
    icon: 'CheckSquare',
    badgeColor: 'from-rose-500 to-red-600',
    description: 'Trắc nghiệm 4 đáp án về tế bào, quang hợp, ADN, quang học, điện học, an toàn lab.',
    format: 'Chọn 1 trong 4 (phím 1-4/A-D)',
    isNew: true,
  },
  {
    id: 'substance_match',
    name: 'Ghép Chất & Ứng Dụng',
    shortName: 'Ứng dụng',
    subject: 'chemistry',
    subjectName: 'Hóa học',
    gradeText: 'Lớp 8, 9, 11',
    gradeLevels: [8, 9, 11],
    icon: 'Layers',
    badgeColor: 'from-fuchsia-500 to-pink-600',
    description: 'Kết nối các hóa chất quen thuộc với ứng dụng thực tế trong công nghiệp và đời sống.',
    format: 'Trắc nghiệm ứng dụng',
    isNew: true,
  },

  // --- CÁC CHẾ ĐỘ TỔNG HỢP ---
  {
    id: 'mixed',
    name: 'Hỗn Hợp Hóa Học',
    shortName: 'Trộn Hóa',
    subject: 'mixed',
    subjectName: 'Hỗn hợp',
    gradeText: 'Lớp 8 - 12',
    gradeLevels: [8, 9, 10, 11, 12],
    icon: 'Shuffle',
    badgeColor: 'from-sky-500 to-blue-600',
    description: 'Luân phiên 5 chế độ Hóa học cổ điển trong từng vòng đấu của trận.',
    format: 'Đa dạng theo từng câu',
  },
  {
    id: 'ranked_mixed',
    name: 'Đấu Hạng Hóa Học',
    shortName: 'Đấu Hạng',
    subject: 'mixed',
    subjectName: 'Đấu Hạng',
    gradeText: 'Xếp hạng',
    gradeLevels: [8, 9, 10, 11, 12],
    icon: 'Trophy',
    badgeColor: 'from-amber-400 to-yellow-500',
    description: 'Chế độ xếp hạng tiêu chuẩn: thi đấu ngẫu nhiên với độ khó tăng dần để leo rank.',
    format: 'Chuẩn Rank',
  },
  {
    id: 'stem_mixed',
    name: 'Hỗn Hợp KHTN - STEM',
    shortName: 'STEM Toàn Diện',
    subject: 'mixed',
    subjectName: 'KHTN / STEM',
    gradeText: 'Lớp 6 - 12',
    gradeLevels: [6, 7, 8, 9, 10, 11, 12],
    icon: 'Sparkles',
    badgeColor: 'from-emerald-400 to-cyan-500',
    description: 'Trận đấu toàn diện luân chuyển giữa Hóa, Toán, Lí và KHTN thực tế.',
    format: 'STEM Tổng hợp',
    isNew: true,
  },
];

export function getModeInfo(modeId: string): ModeInfo {
  return ALL_GAME_MODES.find(m => m.id === modeId) || {
    id: modeId,
    name: modeId,
    shortName: modeId,
    subject: 'mixed',
    subjectName: 'Tổng hợp',
    gradeText: 'Mọi khối',
    gradeLevels: [],
    icon: 'HelpCircle',
    badgeColor: 'from-slate-500 to-slate-700',
    description: 'Chế độ thi đấu trí tuệ',
    format: 'Tự do',
  };
}

export function getModesBySubject(subject: string): ModeInfo[] {
  if (subject === 'all') return ALL_GAME_MODES;
  return ALL_GAME_MODES.filter(m => m.subject === subject);
}

export function getModesByGrade(grade: number): ModeInfo[] {
  return ALL_GAME_MODES.filter(m => m.gradeLevels.includes(grade));
}
