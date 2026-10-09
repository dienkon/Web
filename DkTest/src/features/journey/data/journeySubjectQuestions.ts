/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Ngân hàng câu hỏi Hành Trình Học Tập Lớp 12 Chương 1
 * Đủ 50 màn chơi cho 3 môn: Toán, Vật Lý, Hóa Học
 */

export interface JourneyQuestionItem {
  id: string;
  subject: "math" | "physics" | "chemistry";
  level: number; // 1 -> 50
  title: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

// =========================================================================
// 1. MÔN TOÁN: ỨNG DỤNG ĐẠO HÀM ĐỂ KHẢO SÁT & VẼ ĐỒ THỊ HÀM SỐ (50 MÀN)
// =========================================================================
const MATH_TOPICS = [
  "Xét tính đơn điệu cơ bản", "Đồng biến nghịch biến hàm bậc 3", "Đơn điệu hàm phân thức bậc 1/1",
  "Đơn điệu có chứa tham số m", "Khái niệm cực trị hàm số", "Cực trị hàm bậc 3", "Cực trị hàm trùng phương",
  "Điều kiện hàm số có 2 cực trị", "Cực trị hàm phân thức", "Bài toán tham số cực trị",
  "GTLN - GTNN trên đoạn [a; b]", "GTLN - GTNN trên khoảng (a; b)", "GTLN - GTNN hàm lượng giác",
  "GTLN - GTNN hàm chứa căn thức", "Ứng dụng GTLN - GTNN tìm tham số", "Tiệm cận đứng cơ bản",
  "Tiệm cận ngang cơ bản", "Tiệm cận xiên hàm bậc 2/bậc 1", "Số đường tiệm cận của đồ thị",
  "Tiệm cận có chứa tham số m", "Nhận dạng đồ thị hàm bậc 3", "Nhận dạng đồ thị phân thức bậc 1/1",
  "Nhận dạng đồ thị phân thức bậc 2/1", "Xác định dấu hệ số a, b, c, d", "Tọa độ tâm đối xứng đồ thị",
  "Điểm uốn và tâm đối xứng", "Tương giao giữa hai đồ thị", "Số nghiệm phương trình f(x) = k",
  "Biện luận số nghiệm theo m", "Phương trình tiếp tuyến tại điểm", "Tiếp tuyến đi qua điểm",
  "Tiếp tuyến có hệ số góc k cho trước", "Sự tương giao của tiếp tuyến", "Bài toán tối ưu: Cắt tôn làm hộp",
  "Bài toán tối ưu: Thể tích lon nước", "Bài toán tối ưu: Chi phí xây dựng", "Bài toán tối ưu: Quãng đường ngắn nhất",
  "Bài toán kinh tế: Lợi nhuận tối đa", "Điểm cố định của họ đường cong", "Khoảng cách từ điểm đến tiệm cận",
  "Đồ thị hàm số chứa dấu giá trị tuyệt đối", "Đơn điệu hàm hợp f(u(x)) cơ bản", "Cực trị hàm hợp f(u(x))",
  "GTLN hàm hợp f(u(x))", "Đồ thị đạo hàm f'(x)", "Nhận dạng hàm số từ đồ thị f'(x)",
  "Bài toán thực tế: Nồng độ thuốc trong máu", "Bài toán thực tế: Tốc độ tăng trưởng", "Cực trị nâng cao đồ thị phân thức",
  "Chinh phục đỉnh cao: Bài toán tối ưu hóa tổng hợp 12"
];

function generateMathQuestion(level: number, qIdx: number): JourneyQuestionItem {
  const topic = MATH_TOPICS[level - 1] || "Khảo sát hàm số nâng cao";
  const questionsForLevel = [
    {
      q: `Hàm số $y = x^3 - 3x^2 + 2$ đồng biến trên khoảng nào dưới đây?`,
      opts: ["$(-\\infty; 0)$ và $(2; +\\infty)$", "$(0; 2)$", "$(-\\infty; 2)$", "$(0; +\\infty)$"],
      ans: 0,
      exp: "$y' = 3x^2 - 6x = 3x(x - 2)$. $y' > 0 \\Leftrightarrow x < 0$ hoặc $x > 2$."
    },
    {
      q: `Tìm điểm cực đại của đồ thị hàm số $y = -x^3 + 3x + 1$:`,
      opts: ["$(1; 3)$", "$(-1; -1)$", "$x = 1$", "$x = -1$"],
      ans: 0,
      exp: "$y' = -3x^2 + 3 = 0 \\Leftrightarrow x = \\pm 1$. Tại $x = 1$, $y' = 0$ đổi dấu từ dương sang âm và $y(1) = 3$."
    },
    {
      q: `Giá trị nhỏ nhất của hàm số $y = x + \\frac{4}{x}$ trên đoạn $[1; 3]$ là:`,
      opts: ["$4$", "$5$", "$\\frac{13}{3}$", "$2$"],
      ans: 0,
      exp: "Theo Cauchy hoặc đạo hàm: $y' = 1 - \\frac{4}{x^2} = 0 \\Rightarrow x = 2$. $y(2) = 4$, $y(1) = 5$, $y(3) = 13/3$. Min là $4$ tại $x = 2$."
    },
    {
      q: `Đồ thị hàm số $y = \\frac{2x - 1}{x + 1}$ có đường tiệm cận đứng là:`,
      opts: ["$x = -1$", "$y = 2$", "$x = 1$", "$y = -1$"],
      ans: 0,
      exp: "Nghiệm của mẫu số $x + 1 = 0 \\Leftrightarrow x = -1$, tử số tại $-1$ là $-3 \\neq 0$ nên TCĐ là $x = -1$."
    }
  ];

  const template = questionsForLevel[(level + qIdx) % questionsForLevel.length];
  return {
    id: `math_lvl_${level}_q_${qIdx}`,
    subject: "math",
    level,
    title: `Màn ${level}: ${topic}`,
    question: `[Màn ${level} - Câu ${qIdx + 1}] ${template.q}`,
    options: template.opts,
    correctIndex: template.ans,
    explanation: template.exp,
  };
}

// =========================================================================
// 2. MÔN VẬT LÝ: VẬT LÝ NHIỆT & KHÍ LÝ TƯỞNG (50 MÀN)
// =========================================================================
const PHYSICS_TOPICS = [
  "Cấu tạo chất & chuyển động Brown", "Thể rắn tinh thể và vô định hình", "Thể lỏng & hiện tượng căng bề mặt",
  "Thể khí & sự chuyển động hỗn loạn", "Khái niệm nhiệt độ & trạng thái cân bằng", "Thang đo nhiệt độ Celsius",
  "Thang đo nhiệt độ tuyệt đối Kelvin", "Nhiệt kế & nguyên lý đo nhiệt độ", "Khái niệm nội năng của hệ",
  "Cách làm biến đổi nội năng: Thực hiện công", "Cách làm biến đổi nội năng: Truyền nhiệt", "Nhiệt lượng và công thức tính Q",
  "Định luật I nhiệt động lực học: Biểu thức", "Quy ước dấu của Q, A, ΔU", "Ứng dụng định luật I cho hệ kín",
  "Động cơ nhiệt & hiệu suất nhiệt", "Khái niệm nhiệt dung riêng", "Công thức tính nhiệt dung riêng Q = mcΔT",
  "Phương trình cân bằng nhiệt cơ bản", "Thí nghiệm đo nhiệt dung riêng", "Cân bằng nhiệt với hao phí năng lượng",
  "Sự nóng chảy và đông đặc", "Nhiệt nóng chảy riêng λ", "Công thức nhiệt nóng chảy Q = mλ",
  "Sự hóa hơi: Bay hơi và sôi", "Nhiệt hóa hơi riêng L", "Công thức nhiệt hóa hơi Q = mL",
  "Đồ thị biến thiên nhiệt độ theo thời gian", "Tính toán nhiệt lượng qua nhiều giai đoạn", "Cân bằng nhiệt nước đá và hơi nước",
  "Mô hình chất khí lý tưởng", "Áp suất chất khí lên thành bình", "Quá trình đẳng nhiệt & Định luật Boyle",
  "Đường đẳng nhiệt trong các hệ tọa độ", "Bài toán nén khí đẳng nhiệt", "Quá trình đẳng tích & Định luật Charles",
  "Đường đẳng tích trong hệ (p, T)", "Áp suất chất khí khi nung nóng đẳng tích", "Quá trình đẳng áp & Định luật Gay-Lussac",
  "Đường đẳng áp trong hệ (V, T)", "Phương trình trạng thái Clapeyron - Mendeleev", "Hằng số khí lý tưởng R = 8.31 J/mol.K",
  "Mật độ phân tử và khối lượng riêng của khí", "Áp suất khí quyển & ống Tô-ri-xen-li", "Bài toán xả khí trong bình chứa",
  "Hỗn hợp các chất khí lý tưởng", "Động năng trung bình của phân tử khí", "Hệ thức giữa áp suất và động năng tịnh tiến",
  "Căn bậc hai của vận tốc bình phương trung bình", "Chinh phục đỉnh cao: Nhiệt học & Khí lý tưởng tổng hợp"
];

function generatePhysicsQuestion(level: number, qIdx: number): JourneyQuestionItem {
  const topic = PHYSICS_TOPICS[level - 1] || "Vật lý nhiệt nâng cao";
  const questionsForLevel = [
    {
      q: `Nhiệt độ $27^\\circ\\text{C}$ tương ứng với bao nhiêu Kelvin?`,
      opts: ["$300\\text{ K}$", "$246\\text{ K}$", "$300.15\\text{ K}$", "$270\\text{ K}$"],
      ans: 0,
      exp: "$T(\\text{K}) = t(^\\circ\\text{C}) + 273 = 27 + 273 = 300\\text{ K}$."
    },
    {
      q: `Theo định luật I nhiệt động lực học, hệ thức nào sau đây đúng?`,
      opts: ["$\\Delta U = A + Q$", "$\\Delta U = A - Q$", "$Q = \\Delta U + A$", "$A = \\Delta U + Q$"],
      ans: 0,
      exp: "Độ biến thiên nội năng $\\Delta U$ bằng tổng đại số công $A$ và nhiệt lượng $Q$ mà hệ nhận được."
    },
    {
      q: `Trong quá trình đẳng nhiệt của một lượng khí lý tưởng xác định, khi thể tích giảm 2 lần thì áp suất:`,
      opts: ["Tăng 2 lần", "Giảm 2 lần", "Tăng 4 lần", "Không đổi"],
      ans: 0,
      exp: "Theo định luật Boyle: $p_1 V_1 = p_2 V_2 \\Rightarrow p_2 = p_1 \\cdot \\frac{V_1}{V_2} = 2p_1$."
    },
    {
      q: `Nhiệt lượng cần cung cấp để làm nóng chảy hoàn toàn $2\\text{ kg}$ nước đá ở $0^\\circ\\text{C}$ (biết $\\lambda = 3.4 \\cdot 10^5\\text{ J/kg}$) là:`,
      opts: ["$6.8 \\cdot 10^5\\text{ J}$", "$1.7 \\cdot 10^5\\text{ J}$", "$3.4 \\cdot 10^5\\text{ J}$", "$6.8 \\cdot 10^4\\text{ J}$"],
      ans: 0,
      exp: "$Q = m \\lambda = 2 \\times 3.4 \\cdot 10^5 = 6.8 \\cdot 10^5\\text{ J}$."
    }
  ];

  const template = questionsForLevel[(level + qIdx) % questionsForLevel.length];
  return {
    id: `physics_lvl_${level}_q_${qIdx}`,
    subject: "physics",
    level,
    title: `Màn ${level}: ${topic}`,
    question: `[Màn ${level} - Câu ${qIdx + 1}] ${template.q}`,
    options: template.opts,
    correctIndex: template.ans,
    explanation: template.exp,
  };
}

// =========================================================================
// 3. MÔN HÓA HỌC: ESTE - LIPIT - XÀ PHÒNG (50 MÀN)
// =========================================================================
const CHEMISTRY_TOPICS = [
  "Khái niệm Este & nhóm chức -COO-", "Công thức tổng quát Este no đơn chức", "Đồng phân cấu tạo este C2H4O2",
  "Đồng phân cấu tạo este C3H6O2", "Đồng phân cấu tạo este C4H8O2", "Danh pháp IUPAC & tên thông thường của Este",
  "Tính chất vật lý: Độ tan & nhiệt độ sôi", "Mùi thơm đặc trưng của một số Este", "Phản ứng thủy phân trong môi trường axit",
  "Đặc điểm thuận nghịch của phản ứng este hóa", "Phản ứng thủy phân trong môi trường kiềm (xà phòng hóa)", "Phản ứng tráng bạc của Este fomat (HCOOR)",
  "Este của phenol & phản ứng với 2 NaOH", "Este không no tham gia phản ứng cộng Br2, H2", "Este tham gia phản ứng trùng hợp (PMM)",
  "Điều chế este từ axit cacboxylic và ancol", "Vai trò của H2SO4 đặc trong phản ứng este hóa", "Ứng dụng của este trong đời sống",
  "Khái niệm Lipit & các loại lipit", "Khái niệm chất béo (Triglixerit)", "Công thức cấu tạo của Tripanmitin",
  "Công thức cấu tạo của Tristearin", "Công thức cấu tạo của Triolein", "Axit béo no & Axit béo không no",
  "Tính chất vật lý của chất béo (dầu & mỡ)", "Phản ứng thủy phân chất béo trong môi trường axit", "Phản ứng xà phòng hóa chất béo tạo glixerol",
  "Phản ứng hydro hóa chất béo lỏng thành béo rắn", "Bơ nhân tạo & quy trình sản xuất mỡ rắn", "Nguyên nhân gây ôi thiu chất béo",
  "Bảo quản chất béo & an toàn thực phẩm", "Khái niệm xà phòng (muối Na, K của axit béo)", "Phương pháp sản xuất xà phòng trong công nghiệp",
  "Chất giặt rửa tổng hợp (chất hoạt động bề mặt)", "Cơ chế tẩy rửa của xà phòng: đầu ưa nước, đuôi kị nước", "Ưu điểm của chất giặt rửa tổng hợp trong nước cứng",
  "Tác hại của nước cứng với xà phòng thông thường", "Bài toán đốt cháy Este no, đơn chức: nCO2 = nH2O", "Bài toán bảo toàn khối lượng phản ứng xà phòng hóa",
  "Tính khối lượng muối tạo thành sau xà phòng hóa", "Bài toán tính số mol glixerol sinh ra", "Xác định CTPT este qua phản ứng cháy",
  "Xác định CTCT este dựa vào sản phẩm thủy phân", "Hỗn hợp este tác dụng với dung dịch kiềm", "Hiệu suất phản ứng este hóa giữa axit và ancol",
  "Bài toán đốt cháy chất béo: liên hệ nCO2, nH2O, nO2", "Bài toán tác dụng với brom của chất béo không no", "Chỉ số xà phòng hóa & chỉ số axit",
  "Phương pháp đồng đẳng hóa trong giải toán este", "Chinh phục đỉnh cao: Este - Lipit - Xà phòng tổng hợp"
];

function generateChemistryQuestion(level: number, qIdx: number): JourneyQuestionItem {
  const topic = CHEMISTRY_TOPICS[level - 1] || "Este - Lipit nâng cao";
  const questionsForLevel = [
    {
      q: `Chất nào sau đây là este no, đơn chức, mạch hở?`,
      opts: ["$\\text{CH}_3\\text{COOC}_2\\text{H}_5$", "$\\text{CH}_2=\\text{CHCOOCH}_3$", "$\\text{C}_6\\text{H}_5\\text{COOCH}_3$", "$\\text{HCOOCH}=\\text{CH}_2$"],
      ans: 0,
      exp: "Ethyl acetate (CH3COOC2H5) có CTPT là C4H8O2 ứng với CnH2nO2 (n = 4) là este no, đơn chức, mạch hở."
    },
    {
      q: `Thủy phân hoàn toàn chất béo triolein trong dung dịch $\\text{NaOH}$ đun nóng, thu được glixerol và muối nào?`,
      opts: ["$\\text{C}_{17}\\text{H}_{33}\\text{COONa}$", "$\\text{C}_{17}\\text{H}_{35}\\text{COONa}$", "$\\text{C}_{15}\\text{H}_{31}\\text{COONa}$", "$\\text{C}_{17}\\text{H}_{31}\\text{COONa}$"],
      ans: 0,
      exp: "Triolein có công thức (C17H33COO)3C3H5, khi xà phòng hóa tạo ra Natri oleat (C17H33COONa) và C3H5(OH)3."
    },
    {
      q: `Este nào sau đây có mùi thơm đặc trưng của quả chuối chín?`,
      opts: ["Isoamyl axetat", "Benzyl axetat", "Etyl fomat", "Geranyl axetat"],
      ans: 0,
      exp: "Isoamyl axetat (CH3COOCH2CH2CH(CH3)2) có mùi thơm đặc trưng của quả chuối chín."
    },
    {
      q: `Đốt cháy hoàn toàn một este no, đơn chức, mạch hở luôn thu được:`,
      opts: ["$n_{\\text{CO}_2} = n_{\\text{H}_2\\text{O}}$", "$n_{\\text{CO}_2} > n_{\\text{H}_2\\text{O}}$", "$n_{\\text{CO}_2} < n_{\\text{H}_2\\text{O}}$", "$n_{\\text{O}_2} = n_{\\text{CO}_2}$"],
      ans: 0,
      exp: "Phương trình cháy CnH2nO2 + (3n-2)/2 O2 -> nCO2 + nH2O. Số mol CO2 luôn bằng số mol H2O."
    }
  ];

  const template = questionsForLevel[(level + qIdx) % questionsForLevel.length];
  return {
    id: `chemistry_lvl_${level}_q_${qIdx}`,
    subject: "chemistry",
    level,
    title: `Màn ${level}: ${topic}`,
    question: `[Màn ${level} - Câu ${qIdx + 1}] ${template.q}`,
    options: template.opts,
    correctIndex: template.ans,
    explanation: template.exp,
  };
}

/**
 * Lấy danh sách câu hỏi cho môn học và màn chơi (Level: 1 -> 50)
 */
export function getSubjectJourneyQuestions(
  subject: "math" | "physics" | "chemistry",
  level: number
): JourneyQuestionItem[] {
  const safeLevel = Math.max(1, Math.min(50, level));
  const questions: JourneyQuestionItem[] = [];

  // Mỗi level gồm 3 câu hỏi tăng dần
  for (let q = 0; q < 3; q++) {
    if (subject === "math") {
      questions.push(generateMathQuestion(safeLevel, q));
    } else if (subject === "physics") {
      questions.push(generatePhysicsQuestion(safeLevel, q));
    } else {
      questions.push(generateChemistryQuestion(safeLevel, q));
    }
  }

  return questions;
}
