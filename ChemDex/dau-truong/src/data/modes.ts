// src/data/modes.ts
// Danh mục toàn diện 100% CÁC CHẾ ĐỘ THI ĐẤU HÓA HỌC CHO CHEMDEX ARENA
// Chuyên biệt Hóa học THCS - THPT theo chương trình GDPT 2018 (Không chứa Toán, Lí hay môn khác)

export interface ModeInfo {
  id: string;
  name: string;
  shortName: string;
  category: 'inorganic' | 'organic' | 'physical' | 'experiment' | 'mixed';
  categoryName: string;
  subject: 'chemistry';
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
  // --- NHÓM 1: PHƯƠNG TRÌNH & NGUYÊN TỐ HÓA HỌC ---
  {
    id: 'balance',
    name: 'Cân Bằng PTHH',
    shortName: 'Cân bằng',
    category: 'inorganic',
    categoryName: 'Hóa Vô Cơ',
    subject: 'chemistry',
    subjectName: 'Hóa học',
    gradeText: 'Lớp 8 - 10',
    gradeLevels: [8, 9, 10],
    icon: 'Scale',
    badgeColor: 'from-amber-500 to-orange-500',
    description: 'Điền các hệ số nguyên tối giản để cân bằng phương trình phản ứng hóa học vô cơ và hữu cơ.',
    format: 'Hệ số tỉ lệ (VD: 2 : 1 : 2)',
  },
  {
    id: 'fill_blank',
    name: 'Điền Khuyết PTHH',
    shortName: 'Điền khuyết',
    category: 'inorganic',
    categoryName: 'Hóa Vô Cơ',
    subject: 'chemistry',
    subjectName: 'Hóa học',
    gradeText: 'Lớp 8 - 11',
    gradeLevels: [8, 9, 10, 11],
    icon: 'Edit3',
    badgeColor: 'from-blue-500 to-cyan-500',
    description: 'Dự đoán và điền công thức chất tham gia hoặc sản phẩm còn thiếu tại vị trí trống ___ trong phản ứng.',
    format: 'Công thức hóa học (VD: H2O, CO2)',
  },
  {
    id: 'compound_name',
    name: 'Danh Pháp Hợp Chất',
    shortName: 'Gọi tên',
    category: 'inorganic',
    categoryName: 'Hóa Vô Cơ & Hữu Cơ',
    subject: 'chemistry',
    subjectName: 'Hóa học',
    gradeText: 'Lớp 8 - 12',
    gradeLevels: [8, 9, 10, 11, 12],
    icon: 'BookOpen',
    badgeColor: 'from-emerald-500 to-teal-500',
    description: 'Gọi tên hợp chất theo danh pháp IUPAC quốc tế (GDPT 2018) hoặc tên SGK tiếng Việt truyền thống.',
    format: 'Tên IUPAC / SGK Việt Nam',
  },
  {
    id: 'element_quiz',
    name: 'Đoán Nguyên Tố & Bảng Tuần Hoàn',
    shortName: 'Nguyên tố',
    category: 'inorganic',
    categoryName: 'Cấu tạo & Bảng tuần hoàn',
    subject: 'chemistry',
    subjectName: 'Hóa học',
    gradeText: 'Lớp 8, 10',
    gradeLevels: [8, 10],
    icon: 'Atom',
    badgeColor: 'from-purple-500 to-indigo-500',
    description: 'Xác định ký hiệu hoặc tên nguyên tố dựa vào số hiệu nguyên tử Z, chu kỳ, nhóm và tính chất hóa học.',
    format: 'Ký hiệu / Tên nguyên tố',
  },

  // --- NHÓM 2: HÓA LÝ & TÍNH TOÁN HÓA HỌC ---
  {
    id: 'oxidation_state',
    name: 'Số Oxi Hóa & Cặp Oxi Hóa - Khử',
    shortName: 'Số oxi hóa',
    category: 'physical',
    categoryName: 'Hóa Lý & Oxi hóa khử',
    subject: 'chemistry',
    subjectName: 'Hóa học',
    gradeText: 'Lớp 10, 12',
    gradeLevels: [10, 12],
    icon: 'Zap',
    badgeColor: 'from-rose-500 to-pink-500',
    description: 'Xác định số oxi hóa của nguyên tố trong đơn chất, hợp chất và ion đa nguyên tử (có dấu +/- rõ ràng).',
    format: 'Số có dấu (+/-) hoặc 0',
  },
  {
    id: 'mol_calc',
    name: 'Tính Toán Hóa Học & Nồng Độ',
    shortName: 'Tính mol & dd',
    category: 'physical',
    categoryName: 'Hóa Lý & Tính toán',
    subject: 'chemistry',
    subjectName: 'Hóa học',
    gradeText: 'Lớp 8 - 10',
    gradeLevels: [8, 9, 10],
    icon: 'FlaskConical',
    badgeColor: 'from-cyan-500 to-blue-600',
    description: 'Tính khối lượng mol, số mol, nồng độ C%, CM, thể tích khí (đktc / 25°C 1 bar) và tính theo PTHH.',
    format: 'Nhập số (chấp nhận phẩy/chấm/phân số)',
  },
  {
    id: 'solution_ph',
    name: 'Dung Dịch, Axit - Bazơ & Độ pH',
    shortName: 'Dung dịch & pH',
    category: 'physical',
    categoryName: 'Dung dịch & Điện li',
    subject: 'chemistry',
    subjectName: 'Hóa học',
    gradeText: 'Lớp 8, 11',
    gradeLevels: [8, 11],
    icon: 'Activity',
    badgeColor: 'from-violet-500 to-purple-600',
    description: 'Môi trường axit, bazơ, trung tính, đổi màu chất chỉ thị quỳ tím/phenolphtalein và tính toán độ pH.',
    format: 'Trắc nghiệm 4 lựa chọn (A-D)',
    isNew: true,
  },

  // --- NHÓM 3: HÓA HỌC HỮU CƠ, NHẬN BIẾT & THÍ NGHIỆM ---
  {
    id: 'organic_reactions',
    name: 'Hóa Học Hữu Cơ & Polime',
    shortName: 'Hữu cơ',
    category: 'organic',
    categoryName: 'Hóa Hữu Cơ',
    subject: 'chemistry',
    subjectName: 'Hóa học',
    gradeText: 'Lớp 9, 11, 12',
    gradeLevels: [9, 11, 12],
    icon: 'Layers',
    badgeColor: 'from-amber-500 to-emerald-600',
    description: 'Phản ứng đặc trưng của hiđrocacbon, ancol, anđehit, axit axetic, este, chất béo, protein và polime.',
    format: 'Trắc nghiệm 4 lựa chọn (A-D)',
    isNew: true,
  },
  {
    id: 'substance_match',
    name: 'Nhận Biết & Ứng Dụng Hóa Chất',
    shortName: 'Nhận biết chất',
    category: 'experiment',
    categoryName: 'Thực nghiệm & Ứng dụng',
    subject: 'chemistry',
    subjectName: 'Hóa học',
    gradeText: 'Lớp 8 - 12',
    gradeLevels: [8, 9, 10, 11, 12],
    icon: 'CheckSquare',
    badgeColor: 'from-fuchsia-500 to-pink-600',
    description: 'Dùng thuốc thử đặc trưng nhận biết các ion, chất khí và liên hệ ứng dụng hóa chất trong thực tế.',
    format: 'Trắc nghiệm 4 lựa chọn (A-D)',
  },
  {
    id: 'experiment_lab',
    name: 'Thí Nghiệm & An Toàn Phòng Hóa',
    shortName: 'An toàn Lab',
    category: 'experiment',
    categoryName: 'Thực nghiệm & An toàn',
    subject: 'chemistry',
    subjectName: 'Hóa học',
    gradeText: 'Lớp 8 - 12',
    gradeLevels: [8, 9, 10, 11, 12],
    icon: 'RefreshCw',
    badgeColor: 'from-rose-500 to-red-600',
    description: 'Quan sát hiện tượng thí nghiệm, thao tác dụng cụ lab (buret, pipet) và quy tắc an toàn hóa chất.',
    format: 'Trắc nghiệm 4 lựa chọn (A-D)',
    isNew: true,
  },

  // --- NHÓM 4: ĐẤU TRƯỜNG TỔNG HỢP ---
  {
    id: 'mixed',
    name: 'Hỗn Hợp Đấu Trường Hóa Học',
    shortName: 'Trộn Hóa',
    category: 'mixed',
    categoryName: 'Đấu trường Hóa',
    subject: 'chemistry',
    subjectName: 'Hóa học',
    gradeText: 'Lớp 8 - 12',
    gradeLevels: [8, 9, 10, 11, 12],
    icon: 'Shuffle',
    badgeColor: 'from-sky-500 to-blue-600',
    description: 'Luân phiên tất cả các dạng bài Hóa học (cân bằng, điền khuyết, gọi tên, tính mol, nhận biết) qua từng vòng.',
    format: 'Đa dạng theo từng câu',
  },
  {
    id: 'ranked_mixed',
    name: 'Đấu Hạng Hóa Học',
    shortName: 'Đấu Hạng',
    category: 'mixed',
    categoryName: 'Xếp hạng Hóa thủ',
    subject: 'chemistry',
    subjectName: 'Hóa học',
    gradeText: 'Xếp hạng Hóa thủ',
    gradeLevels: [8, 9, 10, 11, 12],
    icon: 'Trophy',
    badgeColor: 'from-amber-400 to-yellow-500',
    description: 'Chế độ xếp hạng tiêu chuẩn dành riêng cho các Hóa thủ: độ khó tăng tiến, kiểm tra năng lực toàn diện.',
    format: 'Chuẩn Rank Hóa Học',
  },
];

export function getModeInfo(modeId: string): ModeInfo {
  return ALL_GAME_MODES.find(m => m.id === modeId) || {
    id: modeId,
    name: modeId,
    shortName: modeId,
    category: 'mixed',
    categoryName: 'Hóa Học Tổng Hợp',
    subject: 'chemistry',
    subjectName: 'Hóa học',
    gradeText: 'Mọi khối lớp',
    gradeLevels: [8, 9, 10, 11, 12],
    icon: 'Sparkles',
    badgeColor: 'from-cyan-500 to-blue-600',
    description: 'Chế độ thi đấu trí tuệ Hóa học chuyên sâu',
    format: 'Hóa Học',
  };
}

export function getModesByCategory(cat: string): ModeInfo[] {
  if (cat === 'all') return ALL_GAME_MODES;
  return ALL_GAME_MODES.filter(m => m.category === cat);
}

export function getModesByGrade(grade: number): ModeInfo[] {
  return ALL_GAME_MODES.filter(m => m.gradeLevels.includes(grade));
}
