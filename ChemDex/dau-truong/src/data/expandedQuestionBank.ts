// src/data/expandedQuestionBank.ts
// Ngân hàng câu hỏi mở rộng bám sát chương trình GDPT 2018 Hóa học Lớp 8 - 12
// Đầy đủ tên IUPAC + Tên tiếng Việt SGK, độ khó, chương học và giải thích chi tiết

export interface ExtendedCurriculumQuestion {
  id: string;
  grade: 8 | 9 | 10 | 11 | 12;
  chapter: string;
  difficulty: 'easy' | 'medium' | 'hard';
  mode: 'balance' | 'fill_blank' | 'compound_name' | 'element_quiz' | 'oxidation_state';
  equation: string;
  formula?: string;
  name?: string;
  acceptedAnswers: string[];
  explanation: string;
  coefficients?: number[];
  oxidationState?: string;
  symbol?: string;
  elementName?: string;
  targetAnswer?: string;
}

export const EXPANDED_QUESTIONS: ExtendedCurriculumQuestion[] = [
  // =========================================================================
  // LỚP 8 / KHTN 8: CHẤT & BIẾN ĐỔI HÓA HỌC, MOL VÀ PHẢN ỨNG HÓA HỌC
  // =========================================================================
  {
    id: 'g8_b_01',
    grade: 8,
    chapter: 'Phản ứng hóa học cơ bản',
    difficulty: 'easy',
    mode: 'balance',
    equation: 'Fe + O2 -> Fe3O4',
    coefficients: [3, 2, 1],
    acceptedAnswers: ['3 : 2 : 1', '3:2:1'],
    explanation: 'Sắt cháy trong khí oxi ở nhiệt độ cao tạo thành oxit sắt từ (Fe3O4). Để cân bằng nguyên tử Fe: đặt hệ số 3 trước Fe. Để cân bằng O: đặt 2 trước O2 (2 * 2 = 4 nguyên tử O).'
  },
  {
    id: 'g8_b_02',
    grade: 8,
    chapter: 'Phản ứng hóa học cơ bản',
    difficulty: 'easy',
    mode: 'balance',
    equation: 'P + O2 -> P2O5',
    coefficients: [4, 5, 2],
    acceptedAnswers: ['4 : 5 : 2', '4:5:2'],
    explanation: 'Photpho cháy sáng tạo khói trắng điphotpho pentaoxit (P2O5). Bội chung nhỏ nhất của O là 10 (5 O2 và 2 P2O5), sau đó cân bằng P cần 4 nguyên tử P.'
  },
  {
    id: 'g8_b_03',
    grade: 8,
    chapter: 'Phản ứng hóa học cơ bản',
    difficulty: 'easy',
    mode: 'balance',
    equation: 'Al + Cl2 -> AlCl3',
    coefficients: [2, 3, 2],
    acceptedAnswers: ['2 : 3 : 2', '2:3:2'],
    explanation: 'Nhôm tác dụng với khí clo tạo muối nhôm clorua (AlCl3). Bội chung nhỏ nhất của Cl là 6 (3 Cl2 và 2 AlCl3), do đó cần 2 nguyên tử Al.'
  },
  {
    id: 'g8_b_04',
    grade: 8,
    chapter: 'Axit và Kim loại',
    difficulty: 'easy',
    mode: 'balance',
    equation: 'Zn + HCl -> ZnCl2 + H2',
    coefficients: [1, 2, 1, 1],
    acceptedAnswers: ['1 : 2 : 1 : 1', '1:2:1:1'],
    explanation: 'Phản ứng điều chế khí hiđro trong phòng thí nghiệm. Kẽm thế chỗ hiđro trong axit clohiđric, cần 2 phân tử HCl để đủ 2 H và 2 Cl.'
  },
  {
    id: 'g8_b_05',
    grade: 8,
    chapter: 'Phản ứng phân hủy',
    difficulty: 'medium',
    mode: 'balance',
    equation: 'KClO3 -> KCl + O2',
    coefficients: [2, 2, 3],
    acceptedAnswers: ['2 : 2 : 3', '2:2:3'],
    explanation: 'Nhiệt phân kali clorat có xúc tác MnO2 để điều chế khí oxi. Bội chung nhỏ nhất của số nguyên tử oxi giữa vế trái (3) và vế phải (2) là 6, nên hệ số là 2 KClO3, 2 KCl và 3 O2.'
  },
  {
    id: 'g8_b_06',
    grade: 8,
    chapter: 'Nhiệt phân muối',
    difficulty: 'medium',
    mode: 'balance',
    equation: 'KMnO4 -> K2MnO4 + MnO2 + O2',
    coefficients: [2, 1, 1, 1],
    acceptedAnswers: ['2 : 1 : 1 : 1', '2:1:1:1'],
    explanation: 'Nhiệt phân thuốc tím (kali pemanganat) tạo kali manganat, mangan đioxit và khí oxi tinh khiết. Cần 2 phân tử KMnO4 để cân bằng K và Mn.'
  },
  {
    id: 'g8_f_01',
    grade: 8,
    chapter: 'Khí Hiđro và Tính Khử',
    difficulty: 'easy',
    mode: 'fill_blank',
    equation: 'CuO + H2 -(t°)-> Cu + ___',
    targetAnswer: 'H2O',
    acceptedAnswers: ['H2O', 'H₂O', 'nước', 'water'],
    explanation: 'Khí hiđro khử oxit đồng(II) màu đen thành đồng kim loại màu đỏ gạch và hơi nước ngưng tụ trên thành ống nghiệm.'
  },
  {
    id: 'g8_f_02',
    grade: 8,
    chapter: 'Axit và Bazơ',
    difficulty: 'easy',
    mode: 'fill_blank',
    equation: 'NaOH + HCl -> NaCl + ___',
    targetAnswer: 'H2O',
    acceptedAnswers: ['H2O', 'H₂O', 'nước', 'water'],
    explanation: 'Phản ứng trung hòa kinh điển giữa dung dịch bazơ mạnh natri hiđroxit và axit mạnh axit clohiđric sinh ra muối ăn và nước.'
  },
  {
    id: 'g8_f_03',
    grade: 8,
    chapter: 'Oxit bazơ tác dụng nước',
    difficulty: 'easy',
    mode: 'fill_blank',
    equation: 'CaO + H2O -> ___',
    targetAnswer: 'Ca(OH)2',
    acceptedAnswers: ['Ca(OH)2', 'Ca(OH)₂', 'canxi hidroxit', 'vôi tôi', 'calcium hydroxide'],
    explanation: 'Hiện tượng tôi vôi: canxi oxit (vôi sống) phản ứng tỏa nhiều nhiệt với nước tạo thành canxi hiđroxit (vôi tôi).'
  },
  {
    id: 'g8_c_01',
    grade: 8,
    chapter: 'Oxit và Tên gọi',
    difficulty: 'easy',
    mode: 'compound_name',
    equation: 'SO2',
    name: 'sulfur dioxide',
    acceptedAnswers: ['sulfur dioxide', 'lưu huỳnh đioxit', 'khí sunfurơ', 'sunfur đioxit', 'luu huynh dioxit'],
    explanation: 'SO2 có tên IUPAC là sulfur dioxide, tên tiếng Việt truyền thống là lưu huỳnh đioxit hoặc khí sunfurơ, có mùi hắc đặc trưng.'
  },
  {
    id: 'g8_c_02',
    grade: 8,
    chapter: 'Muối vô cơ',
    difficulty: 'easy',
    mode: 'compound_name',
    equation: 'CaCO3',
    name: 'calcium carbonate',
    acceptedAnswers: ['calcium carbonate', 'canxi cacbonat', 'đá vôi', 'canxi carbonat', 'calcium carbonat'],
    explanation: 'CaCO3 là thành phần chính của đá vôi, vỏ sò, đá phấn. Tên IUPAC: calcium carbonate, SGK Việt Nam: canxi cacbonat.'
  },

  // =========================================================================
  // LỚP 9 / KHTN 9: CÁC HỢP CHẤT VÔ CƠ, KIM LOẠI, PHI KIM & HÓA HỌC HỮU CƠ
  // =========================================================================
  {
    id: 'g9_b_01',
    grade: 9,
    chapter: 'Tính chất hóa học của Axit sunfuric',
    difficulty: 'medium',
    mode: 'balance',
    equation: 'Fe + H2SO4 -> Fe2(SO4)3 + SO2 + H2O',
    coefficients: [2, 6, 1, 3, 6],
    acceptedAnswers: ['2 : 6 : 1 : 3 : 6', '2:6:1:3:6'],
    explanation: 'Sắt tác dụng với H2SO4 đặc, nóng bị oxi hóa lên mức cao nhất là Fe(III), tạo khí SO2 có mùi hắc. 2 Fe nhường 6e; 3 S(+6) nhận 6e thành 3 S(+4).'
  },
  {
    id: 'g9_b_02',
    grade: 9,
    chapter: 'Kim loại tác dụng Axit',
    difficulty: 'medium',
    mode: 'balance',
    equation: 'Cu + H2SO4 -> CuSO4 + SO2 + H2O',
    coefficients: [1, 2, 1, 1, 2],
    acceptedAnswers: ['1 : 2 : 1 : 1 : 2', '1:2:1:1:2'],
    explanation: 'Đồng không tan trong H2SO4 loãng nhưng tan tốt trong H2SO4 đặc nóng tạo dung dịch màu xanh lam và khí SO2.'
  },
  {
    id: 'g9_b_03',
    grade: 9,
    chapter: 'Cháy của Hydrocacbon',
    difficulty: 'medium',
    mode: 'balance',
    equation: 'C2H2 + O2 -> CO2 + H2O',
    coefficients: [2, 5, 4, 2],
    acceptedAnswers: ['2 : 5 : 4 : 2', '2:5:4:2'],
    explanation: 'Khí axetilen cháy trong oxi tỏa nhiệt độ rất cao (trên 3000°C), ứng dụng làm đèn xì oxi - axetilen để hàn cắt kim loại.'
  },
  {
    id: 'g9_b_04',
    grade: 9,
    chapter: 'Lên men và Cháy rượu',
    difficulty: 'easy',
    mode: 'balance',
    equation: 'C2H5OH + O2 -> CO2 + H2O',
    coefficients: [1, 3, 2, 3],
    acceptedAnswers: ['1 : 3 : 2 : 3', '1:3:2:3'],
    explanation: 'Đốt cháy ancol etylic (cồn): C2H5OH + 3 O2 -> 2 CO2 + 3 H2O. Vế trái có 2 C (tạo 2 CO2), 6 H (tạo 3 H2O), tổng 7 O (3 O2 và 1 O trong cồn).'
  },
  {
    id: 'g9_f_01',
    grade: 9,
    chapter: 'Dãy hoạt động hóa học kim loại',
    difficulty: 'easy',
    mode: 'fill_blank',
    equation: 'Fe + CuSO4 -> FeSO4 + ___',
    targetAnswer: 'Cu',
    acceptedAnswers: ['Cu', 'đồng', 'copper'],
    explanation: 'Sắt đứng trước đồng trong dãy hoạt động hóa học nên đẩy được đồng ra khỏi dung dịch muối đồng(II) sunfat, sinh ra đồng bám ngoài đinh sắt.'
  },
  {
    id: 'g9_f_02',
    grade: 9,
    chapter: 'Nhận biết axit sunfuric',
    difficulty: 'easy',
    mode: 'fill_blank',
    equation: 'BaCl2 + H2SO4 -> ___ + 2 HCl',
    targetAnswer: 'BaSO4',
    acceptedAnswers: ['BaSO4', 'BaSO₄', 'bari sunfat', 'barium sulfate'],
    explanation: 'Phản ứng dùng để nhận biết gốc sunfat (=SO4) thông qua kết tủa trắng bari sunfat (BaSO4) không tan trong axit mạnh.'
  },
  {
    id: 'g9_f_03',
    grade: 9,
    chapter: 'Phản ứng este hóa',
    difficulty: 'medium',
    mode: 'fill_blank',
    equation: 'CH3COOH + C2H5OH -(H2SO4 d, t°)<=> CH3COOC2H5 + ___',
    targetAnswer: 'H2O',
    acceptedAnswers: ['H2O', 'H₂O', 'nước', 'water'],
    explanation: 'Phản ứng este hóa giữa axit axetic và ancol etylic tạo etyl axetat có mùi thơm hoa quả và nước.'
  },
  {
    id: 'g9_c_01',
    grade: 9,
    chapter: 'Hóa học Hữu cơ',
    difficulty: 'easy',
    mode: 'compound_name',
    equation: 'CH3COOH',
    name: 'ethanoic acid',
    acceptedAnswers: ['ethanoic acid', 'acetic acid', 'axit axetic', 'axit etanoic', 'acetic acid'],
    explanation: 'CH3COOH là thành phần chính của giấm ăn (nồng độ 2-5%). Tên IUPAC thay thế: ethanoic acid, tên thông thường: axit axetic.'
  },
  {
    id: 'g9_c_02',
    grade: 9,
    chapter: 'Dẫn xuất kim loại',
    difficulty: 'medium',
    mode: 'compound_name',
    equation: 'Al2O3',
    name: 'aluminium oxide',
    acceptedAnswers: ['aluminium oxide', 'aluminum oxide', 'nhôm oxit', 'oxit nhôm', 'alumina'],
    explanation: 'Al2O3 là quặng boxit dùng để điện phân nóng chảy sản xuất nhôm kim loại. Oxit này có tính chất lưỡng tính.'
  },

  // =========================================================================
  // LỚP 10: CẤU TẠO NGUYÊN TỬ, BẢNG TUẦN HOÀN, LIÊN KẾT HÓA HỌC & OXI HÓA KHỬ
  // =========================================================================
  {
    id: 'g10_b_01',
    grade: 10,
    chapter: 'Phản ứng Oxi hóa - Khử',
    difficulty: 'medium',
    mode: 'balance',
    equation: 'Cu + HNO3 -> Cu(NO3)2 + NO + H2O',
    coefficients: [3, 8, 3, 2, 4],
    acceptedAnswers: ['3 : 8 : 3 : 2 : 4', '3:8:3:2:4'],
    explanation: 'Đồng tác dụng với axit nitric loãng tạo khí NO không màu hóa nâu trong không khí. Quá trình: 3x(Cu -> Cu2+ + 2e), 2x(N+5 + 3e -> N+2).'
  },
  {
    id: 'g10_b_02',
    grade: 10,
    chapter: 'Phản ứng Oxi hóa - Khử',
    difficulty: 'hard',
    mode: 'balance',
    equation: 'Fe3O4 + HNO3 -> Fe(NO3)3 + NO + H2O',
    coefficients: [3, 28, 9, 1, 14],
    acceptedAnswers: ['3 : 28 : 9 : 1 : 14', '3:28:9:1:14'],
    explanation: 'Oxit sắt từ tác dụng với HNO3 loãng: 3 Fe3O4 nhường 1e (từ +8/3 lên +3 cho 3 nguyên tử Fe) -> 3x1 = 3 nhường 3e. N(+5) nhận 3e tạo 1 NO. Cân bằng gốc NO3- cần 9*3 + 1 = 28 HNO3.'
  },
  {
    id: 'g10_b_03',
    grade: 10,
    chapter: 'Nhóm Halogen',
    difficulty: 'medium',
    mode: 'balance',
    equation: 'MnO2 + HCl -> MnCl2 + Cl2 + H2O',
    coefficients: [1, 4, 1, 1, 2],
    acceptedAnswers: ['1 : 4 : 1 : 1 : 2', '1:4:1:1:2'],
    explanation: 'Điều chế khí clo trong phòng thí nghiệm bằng cách cho mangan đioxit tác dụng với axit clohiđric đặc có đun nóng nhẹ.'
  },
  {
    id: 'g10_b_04',
    grade: 10,
    chapter: 'Oxi hóa - Khử tự thân',
    difficulty: 'hard',
    mode: 'balance',
    equation: 'Cl2 + KOH -(t°)-> KCl + KClO3 + H2O',
    coefficients: [3, 6, 5, 1, 3],
    acceptedAnswers: ['3 : 6 : 5 : 1 : 3', '3:6:5:1:3'],
    explanation: 'Phản ứng tự oxi hóa - tự khử của clo trong kiềm nóng: Cl2 vừa bị khử thành Cl(-1) vừa bị oxi hóa lên Cl(+5). Cần 3 Cl2 và 6 KOH.'
  },
  {
    id: 'g10_ox_01',
    grade: 10,
    chapter: 'Số Oxi Hóa',
    difficulty: 'easy',
    mode: 'oxidation_state',
    equation: 'H2SO4 (Số OXH của S)',
    oxidationState: '+6',
    acceptedAnswers: ['+6', '6'],
    explanation: 'Trong H2SO4: H là +1, O là -2. Đặt số oxh của S là x: 2*(+1) + x + 4*(-2) = 0 => x = +6.'
  },
  {
    id: 'g10_ox_02',
    grade: 10,
    chapter: 'Số Oxi Hóa',
    difficulty: 'medium',
    mode: 'oxidation_state',
    equation: 'K2Cr2O7 (Số OXH của Cr)',
    oxidationState: '+6',
    acceptedAnswers: ['+6', '6'],
    explanation: 'Trong kali đicromat: K là +1, O là -2. 2*(+1) + 2x + 7*(-2) = 0 => 2x = 12 => x = +6.'
  },
  {
    id: 'g10_ox_03',
    grade: 10,
    chapter: 'Số Oxi Hóa',
    difficulty: 'hard',
    mode: 'oxidation_state',
    equation: 'FeS2 (Số OXH của S)',
    oxidationState: '-1',
    acceptedAnswers: ['-1'],
    explanation: 'Trong quặng pirit sắt FeS2, sắt ở trạng thái oxi hóa +2 (Fe2+), do đó nhóm đisunfua (S2)2- có số oxi hóa trung bình của mỗi nguyên tử S là -1.'
  },
  {
    id: 'g10_ox_04',
    grade: 10,
    chapter: 'Số Oxi Hóa',
    difficulty: 'hard',
    mode: 'oxidation_state',
    equation: 'OF2 (Số OXH của O)',
    oxidationState: '+2',
    acceptedAnswers: ['+2', '2'],
    explanation: 'Flo là nguyên tố có độ âm điện lớn nhất trong bảng tuần hoàn (luôn là -1 trong hợp chất). Vì vậy trong oxit điflo OF2, oxi có số oxi hóa đặc biệt là +2.'
  },
  {
    id: 'g10_el_01',
    grade: 10,
    chapter: 'Bảng tuần hoàn các nguyên tố',
    difficulty: 'easy',
    mode: 'element_quiz',
    equation: 'Z = 17, chu kì 3, nhóm VIIA, khí màu vàng lục có mùi hắc tẩy màu khi ẩm',
    symbol: 'Cl',
    elementName: 'Chlorine',
    acceptedAnswers: ['Cl', 'Chlorine', 'Clo', 'clo'],
    explanation: 'Chlorine (Clo) có số hiệu nguyên tử Z=17, cấu hình [Ne] 3s2 3p5, là một phi kim halogen hoạt động mạnh.'
  },
  {
    id: 'g10_el_02',
    grade: 10,
    chapter: 'Bảng tuần hoàn các nguyên tố',
    difficulty: 'medium',
    mode: 'element_quiz',
    equation: 'Kim loại chuyển tiếp Z = 26, nhóm VIIIB, thành phần chính của hemoglobin trong máu',
    symbol: 'Fe',
    elementName: 'Iron',
    acceptedAnswers: ['Fe', 'Iron', 'Sắt', 'sat'],
    explanation: 'Sắt (Iron, ký hiệu Fe, Z=26) cấu hình [Ar] 3d6 4s2, đóng vai trò cốt lõi vận chuyển oxi trong cơ thể sinh vật.'
  },

  // =========================================================================
  // LỚP 11: CÂN BẰNG HÓA HỌC, NITƠ - SUNFUR, DẪN XUẤT HYDROCACBON, ANCOL, ANDEHIT
  // =========================================================================
  {
    id: 'g11_b_01',
    grade: 11,
    chapter: 'Hợp chất của Nitơ',
    difficulty: 'hard',
    mode: 'balance',
    equation: 'Fe + HNO3 -> Fe(NO3)3 + N2O + H2O',
    coefficients: [8, 30, 8, 3, 15],
    acceptedAnswers: ['8 : 30 : 8 : 3 : 15', '8:30:8:3:15'],
    explanation: 'Sắt tác dụng với HNO3 rất loãng sinh ra khí cười dinitơ oxit (N2O). Quá trình nhường nhận e: 8x(Fe -> Fe3+ + 3e) và 3x(2 N+5 + 8e -> N2+1). Cần 8*3 + 6 = 30 phân tử HNO3.'
  },
  {
    id: 'g11_b_02',
    grade: 11,
    chapter: 'Tính oxi hóa của Axit sunfuric đặc',
    difficulty: 'hard',
    mode: 'balance',
    equation: 'C + H2SO4 -> CO2 + SO2 + H2O',
    coefficients: [1, 2, 1, 2, 2],
    acceptedAnswers: ['1 : 2 : 1 : 2 : 2', '1:2:1:2:2'],
    explanation: 'Cacbon bị oxi hóa bởi H2SO4 đặc nóng tạo hỗn hợp khí CO2 và SO2. C nhường 4e, 2 S(+6) nhận 4e.'
  },
  {
    id: 'g11_b_03',
    grade: 11,
    chapter: 'Oxi hóa Ancol bằng CuO',
    difficulty: 'medium',
    mode: 'balance',
    equation: 'CH3CH2OH + CuO -(t°)-> CH3CHO + Cu + H2O',
    coefficients: [1, 1, 1, 1, 1],
    acceptedAnswers: ['1 : 1 : 1 : 1 : 1', '1:1:1:1:1'],
    explanation: 'Oxi hóa không hoàn toàn ancol bậc I thành anđehit tương ứng bằng đồng(II) oxit nung nóng.'
  },
  {
    id: 'g11_c_01',
    grade: 11,
    chapter: 'Hợp chất Cacbonyl',
    difficulty: 'medium',
    mode: 'compound_name',
    equation: 'CH3-CH2-CHO',
    name: 'propanal',
    acceptedAnswers: ['propanal', 'propionaldehyde', 'anđehit propionic', 'propan-1-al'],
    explanation: 'Hợp chất có 3 nguyên tử cacbon và nhóm chức -CHO ở đầu mạch, tên thay thế IUPAC là propanal.'
  },
  {
    id: 'g11_c_02',
    grade: 11,
    chapter: 'Axit Cacboxylic',
    difficulty: 'hard',
    mode: 'compound_name',
    equation: 'HOOC-COOH',
    name: 'ethanedioic acid',
    acceptedAnswers: ['ethanedioic acid', 'oxalic acid', 'axit oxalic', 'axit etanđioic'],
    explanation: 'Axit đicacboxylic no đơn giản nhất, có trong lá khế, rau bina. Tên IUPAC: ethanedioic acid, tên thông thường: oxalic acid.'
  },
  {
    id: 'g11_c_03',
    grade: 11,
    chapter: 'Aren và Dẫn xuất Benzen',
    difficulty: 'medium',
    mode: 'compound_name',
    equation: 'C6H5-CH3',
    name: 'methylbenzene',
    acceptedAnswers: ['methylbenzene', 'toluene', 'toluen', 'metylbenzen'],
    explanation: 'Hydrocacbon thơm có một nhánh metyl gắn vào vòng benzen, tên hệ thống IUPAC là methylbenzene, tên thông thường là toluene.'
  },

  // =========================================================================
  // LỚP 12: ESTE - LIPIT, CACBOHIDRAT, AMIN - AMINO AXIT, POLIME & KIM LOẠI
  // =========================================================================
  {
    id: 'g12_b_01',
    grade: 12,
    chapter: 'Xà phòng hóa chất béo',
    difficulty: 'medium',
    mode: 'balance',
    equation: '(C17H35COO)3C3H5 + NaOH -> C17H35COONa + C3H5(OH)3',
    coefficients: [1, 3, 3, 1],
    acceptedAnswers: ['1 : 3 : 3 : 1', '1:3:3:1'],
    explanation: 'Phản ứng xà phòng hóa tristearin trong dung dịch NaOH tạo muối natri stearat (thành phần xà phòng bánh) và glixerol.'
  },
  {
    id: 'g12_b_02',
    grade: 12,
    chapter: 'Kim loại Crom và Hợp chất',
    difficulty: 'hard',
    mode: 'balance',
    equation: 'Cr2O3 + Al -(t°)-> Al2O3 + Cr',
    coefficients: [1, 2, 1, 2],
    acceptedAnswers: ['1 : 2 : 1 : 2', '1:2:1:2'],
    explanation: 'Phương pháp nhiệt nhôm để điều chế crom tinh khiết từ oxit crom(III).'
  },
  {
    id: 'g12_b_03',
    grade: 12,
    chapter: 'Hợp chất Sắt(II) với Axit',
    difficulty: 'hard',
    mode: 'balance',
    equation: 'Fe(OH)2 + HNO3 -> Fe(NO3)3 + NO + H2O',
    coefficients: [3, 10, 3, 1, 8],
    acceptedAnswers: ['3 : 10 : 3 : 1 : 8', '3:10:3:1:8'],
    explanation: 'Sắt(II) hiđroxit là chất khử mạnh, tác dụng với HNO3 loãng bị oxi hóa lên sắt(III) và giải phóng khí NO. 3 Fe(+2) nhường 3e; N(+5) nhận 3e tạo 1 NO.'
  },
  {
    id: 'g12_f_01',
    grade: 12,
    chapter: 'Tráng gương của Glucozơ',
    difficulty: 'medium',
    mode: 'fill_blank',
    equation: 'CH2OH(CHOH)4CHO + 2 [Ag(NH3)2]OH -(t°)-> CH2OH(CHOH)4COONH4 + ___ + 3 NH3 + H2O',
    targetAnswer: '2 Ag',
    acceptedAnswers: ['2 Ag', '2Ag', 'Ag', 'bạc', 'silver'],
    explanation: 'Phản ứng tráng bạc đặc trưng của nhóm anđehit trong phân tử glucozơ, 1 mol glucozơ tạo 2 mol kết tủa bạc bám sáng bóng trên thành ống nghiệm.'
  },
  {
    id: 'g12_f_02',
    grade: 12,
    chapter: 'Nhiệt phân muối Amoni',
    difficulty: 'medium',
    mode: 'fill_blank',
    equation: 'NH4NO2 -(t°)-> ___ + 2 H2O',
    targetAnswer: 'N2',
    acceptedAnswers: ['N2', 'N₂', 'nitơ', 'nitrogen'],
    explanation: 'Nhiệt phân muối amoni nitrit bão hòa dùng để điều chế khí nitơ tinh khiết trong phòng thí nghiệm.'
  },
  {
    id: 'g12_c_01',
    grade: 12,
    chapter: 'Este và Mùi thơm',
    difficulty: 'medium',
    mode: 'compound_name',
    equation: 'CH3COOCH2CH2CH(CH3)2',
    name: 'isoamyl acetate',
    acceptedAnswers: ['isoamyl acetate', 'isopentyl acetate', 'isoamyl axetat', 'isopentyl axetat', 'dầu chuối'],
    explanation: 'Este có mùi chuối chín tự nhiên quyến rũ, dùng làm hương liệu thực phẩm và dung môi pha sơn.'
  },
  {
    id: 'g12_c_02',
    grade: 12,
    chapter: 'Amino Axit',
    difficulty: 'medium',
    mode: 'compound_name',
    equation: 'H2N-CH2-COOH',
    name: 'glycine',
    acceptedAnswers: ['glycine', 'glyxin', 'axit 2-aminoetanoic', 'aminoacetic acid'],
    explanation: 'Amino axit no đơn giản nhất trong tự nhiên, phân tử khối 75, không có đồng phân quang học.'
  },
  {
    id: 'g12_c_03',
    grade: 12,
    chapter: 'Amino Axit thiết yếu',
    difficulty: 'hard',
    mode: 'compound_name',
    equation: 'HOOC-CH2-CH2-CH(NH2)-COOH',
    name: 'glutamic acid',
    acceptedAnswers: ['glutamic acid', 'axit glutamic', 'glutamate', 'axit 2-aminopentandioic'],
    explanation: 'Axit glutamic có 2 nhóm -COOH và 1 nhóm -NH2. Muối mononatri glutamat (bột ngọt/mì chính) kích thích vị giác umani.'
  },
  {
    id: 'g12_c_04',
    grade: 12,
    chapter: 'Amin Thơm',
    difficulty: 'easy',
    mode: 'compound_name',
    equation: 'C6H5-NH2',
    name: 'aniline',
    acceptedAnswers: ['aniline', 'anilin', 'benzenamine', 'phenylamine'],
    explanation: 'Amin thơm quan trọng trong công nghiệp nhuộm phẩm màu azo và điều chế paracetamol. Làm quỳ tím không đổi màu.'
  }
];

/**
 * Trả về danh sách câu hỏi theo bộ lọc môn, lớp, chương và độ khó
 */
export function getExpandedQuestions(filters?: {
  grade?: number;
  chapter?: string;
  difficulty?: string;
  mode?: string;
}): ExtendedCurriculumQuestion[] {
  let res = [...EXPANDED_QUESTIONS];
  if (filters?.grade) {
    res = res.filter(q => q.grade === filters.grade);
  }
  if (filters?.chapter) {
    res = res.filter(q => q.chapter === filters.chapter);
  }
  if (filters?.difficulty) {
    res = res.filter(q => q.difficulty === filters.difficulty);
  }
  if (filters?.mode) {
    res = res.filter(q => q.mode === filters.mode);
  }
  return res;
}
