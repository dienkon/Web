/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Ngân hàng câu hỏi & Bộ tạo câu hỏi động Hành Trình Học Tập Lớp 12
 * Chuẩn hóa 50 Màn Chơi theo Tuần Chuyên Đề GDPT 2018 / 2025:
 * - TOÁN HỌC (50 Màn): Ứng dụng đạo hàm, cực trị, GTLN-GTNN, tiệm cận, đồ thị, tiếp tuyến, bài toán tối ưu thực tế, hàm hợp.
 * - VẬT LÝ (50 Màn): Vật lý nhiệt, thang nhiệt độ, nội năng, Định luật I NĐLH, nhiệt dung riêng Q=mcΔT, nóng chảy/hóa hơi, khí lý tưởng (Boyle, Charles, Clapeyron - Mendeleev).
 * - HÓA HỌC (50 Màn): Este - Lipit - Xà phòng hóa, đồng phân, danh pháp, tính chất, phản ứng tráng bạc/kiềm/axit, chất béo, xà phòng & chất giặt rửa, bài toán cháy/muối.
 *
 * Tính năng nâng cao:
 * - Tự động đổi số (Parameter & Number Shifting): Thay đổi tham số hệ số, số liệu vật lý, khối lượng, số mol để câu hỏi luôn mới.
 * - Đảo vị trí đáp án ngẫu nhiên (Randomized Option Shuffling): Không cố định A, B, C, D qua các lần chơi.
 * - Sinh câu hỏi chuẩn theo tên chuyên đề từng màn chơi (Màn 1 -> 50).
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

export interface QuestionGeneratorContext {
  level: number;
  qIdx: number;
  seed?: number;
  randomize?: boolean;
}

// =========================================================================
// 1. DANH MỤC 50 CHUYÊN ĐỀ MÀN CHƠI THEO CHUẨN GDPT 2025
// =========================================================================

export const MATH_TOPICS = [
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

export const PHYSICS_TOPICS = [
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

export const CHEMISTRY_TOPICS = [
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

// =========================================================================
// 2. BỘ ĐẢO VỊ TRÍ ĐÁP ÁN (SHUFFLE OPTIONS) VÀ TRỢ THỦ RANDOM
// =========================================================================

/**
 * Trợ thủ sinh số nguyên ngẫu nhiên trong khoảng [min, max]
 */
function randInt(min: number, max: number, seed?: number): number {
  if (seed !== undefined) {
    const s = Math.sin(seed * 9973 + 17) * 10000;
    const r = s - Math.floor(s);
    return Math.floor(r * (max - min + 1)) + min;
  }
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Chọn ngẫu nhiên 1 phần tử trong mảng
 */
function randChoice<T>(arr: T[], seed?: number): T {
  const idx = randInt(0, arr.length - 1, seed);
  return arr[idx];
}

/**
 * Đảo vị trí 4 phương án ngẫu nhiên, tự động cập nhật lại correctIndex chính xác
 */
export function shuffleQuestionOptions<T extends { id: string; options: string[]; correctIndex: number }>(
  q: T,
  forceRandom: boolean = true
): T {
  const indexed = q.options.map((opt, idx) => ({ opt, isCorrect: idx === q.correctIndex }));

  if (forceRandom) {
    // Fisher-Yates shuffle
    for (let i = indexed.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = indexed[i];
      indexed[i] = indexed[j];
      indexed[j] = temp;
    }
  } else {
    // Deterministic shuffle by id hash for regression consistency
    let hash = 0;
    for (let i = 0; i < q.id.length; i++) {
      hash = ((hash << 5) - hash) + q.id.charCodeAt(i);
      hash |= 0;
    }
    const seed = Math.abs(hash);
    for (let i = indexed.length - 1; i > 0; i--) {
      const j = (seed + i * 37) % (i + 1);
      const temp = indexed[i];
      indexed[i] = indexed[j];
      indexed[j] = temp;
    }
  }

  const newOptions = indexed.map((item) => item.opt);
  const newCorrectIndex = indexed.findIndex((item) => item.isCorrect);

  return {
    ...q,
    options: newOptions,
    correctIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0,
  };
}

// =========================================================================
// 3. BỘ SINH CÂU HỎI MÔN TOÁN HỌC (50 MÀN - CHUẨN THEO TÊN MÀN & ĐỔI SỐ)
// =========================================================================

function generateMathLevelQuestion(level: number, qIdx: number, seed?: number): JourneyQuestionItem {
  const topic = MATH_TOPICS[level - 1] || "Khảo sát hàm số nâng cao";
  const effectiveSeed = (seed ?? Date.now()) + level * 101 + qIdx * 17;

  let qText = "";
  let correctOpt = "";
  let distractors: string[] = [];
  let explanation = "";

  // Switch theo từng nhóm chuyên đề của 50 màn
  if (level === 1) {
    // Xét tính đơn điệu cơ bản
    const a = randChoice([1, 2, 3], effectiveSeed);
    const b = randChoice([3, 6, 9], effectiveSeed + 1);
    const k = Math.floor((2 * b) / (3 * a));
    qText = `Hàm số $y = ${a === 1 ? "" : a}x^3 - ${b}x^2 + 5$ đồng biến trên khoảng nào dưới đây?`;
    correctOpt = `$(-\\infty; 0)$ và $(${k}; +\\infty)$`;
    distractors = [
      `$(0; ${k})$`,
      `$(-\\infty; ${k})$`,
      `$(${k}; +\\infty)$`
    ];
    explanation = `Ta có $y' = ${3 * a}x^2 - ${2 * b}x = ${3 * a}x(x - ${k})$. Phương trình $y' = 0 \\Leftrightarrow x = 0$ hoặc $x = ${k}$. Bảng biến thiên cho thấy $y' > 0$ khi $x < 0$ hoặc $x > ${k}$. Vậy hàm số đồng biến trên $(-\\infty; 0)$ và $(${k}; +\\infty)$.`;
  } else if (level === 2) {
    // Đồng biến nghịch biến hàm bậc 3
    const a = randChoice([1, 2], effectiveSeed);
    const b = randChoice([3, 6], effectiveSeed + 1);
    const r = (2 * b) / (3 * a);
    qText = `Hàm số $y = -${a === 1 ? "" : a}x^3 + ${b}x^2 - 1$ nghịch biến trên khoảng nào?`;
    correctOpt = `$(-\\infty; 0)$ và $(${r}; +\\infty)$`;
    distractors = [
      `$(0; ${r})$`,
      `$(-${r}; ${r})$`,
      `$(-\\infty; ${r})$`
    ];
    explanation = `Đạo hàm $y' = -${3 * a}x^2 + ${2 * b}x = -x(${3 * a}x - ${2 * b})$. $y' < 0 \\Leftrightarrow x < 0$ hoặc $x > ${r}$. Vậy hàm số nghịch biến trên $(-\\infty; 0)$ và $(${r}; +\\infty)$.`;
  } else if (level === 3) {
    // Đơn điệu hàm phân thức bậc 1/1
    const a = randChoice([2, 3, 4], effectiveSeed);
    const b = randChoice([1, 3, 5], effectiveSeed + 1);
    const d = randChoice([1, 2], effectiveSeed + 2);
    const ad_bc = a * d - (-b);
    qText = `Hàm số $y = \\frac{${a}x - ${b}}{x + ${d}}$ đồng biến trên các khoảng nào?`;
    correctOpt = `$(-\\infty; -${d})$ và $(-${d}; +\\infty)$`;
    distractors = [
      `$\\mathbb{R} \\setminus \\{-${d}\\}$`,
      `$(-${d}; +\\infty)$`,
      `$(-\\infty; ${b})$`
    ];
    explanation = `Tập xác định $D = \\mathbb{R} \\setminus \\{-${d}\\}$. Ta có $y' = \\frac{${a}(${d}) - (-${b})(1)}{(x+${d})^2} = \\frac{${ad_bc}}{(x+${d})^2} > 0, \\forall x \\neq -${d}$. Do đó hàm số đồng biến trên từng khoảng $(-\\infty; -${d})$ và $(-${d}; +\\infty)$.`;
  } else if (level === 4) {
    // Đơn điệu có chứa tham số m
    const k = randChoice([1, 2, 3], effectiveSeed);
    qText = `Tìm tất cả các giá trị của tham số $m$ để hàm số $y = \\frac{x - ${k}}{x + m}$ đồng biến trên từng khoảng xác định:`;
    correctOpt = `$m > -${k}$`;
    distractors = [
      `$m \\ge -${k}$`,
      `$m < -${k}$`,
      `$m > ${k}$`
    ];
    explanation = `Tập xác định $D = \\mathbb{R} \\setminus \\{-m\\}$. $y' = \\frac{m - (-${k})}{(x+m)^2} = \\frac{m + ${k}}{(x+m)^2}$. Để hàm số đồng biến trên từng khoảng xác định thì $y' > 0 \\Leftrightarrow m + ${k} > 0 \\Leftrightarrow m > -${k}$.`;
  } else if (level === 5 || level === 6) {
    // Cực trị hàm bậc 3
    const a = randChoice([1, 2], effectiveSeed);
    const k = randChoice([1, 2], effectiveSeed + 1);
    const yVal = a * (k ** 3) - 3 * a * (k ** 2) + 2;
    qText = `Điểm cực trị của đồ thị hàm số $y = ${a === 1 ? "" : a}x^3 - ${3 * a * k}x^2 + 2$ là:`;
    correctOpt = `$(0; 2)$ và $(${2 * k}; ${yVal})$`;
    distractors = [
      `$(${k}; 0)$`,
      `$(0; 0)$ và $(${k}; ${yVal})$`,
      `$(-${k}; 2)$`
    ];
    explanation = `$y' = ${3 * a}x^2 - ${6 * a * k}x = 0 \\Leftrightarrow x = 0$ hoặc $x = ${2 * k}$. Điểm cực trị của đồ thị hàm số có tọa độ tương ứng là $(0; 2)$ và $(${2 * k}; ${yVal})$.`;
  } else if (level === 7 || level === 8) {
    // Cực trị hàm trùng phương
    const b = randChoice([2, 4, 6], effectiveSeed);
    qText = `Số điểm cực trị của hàm số $y = x^4 - ${b}x^2 + 1$ là:`;
    correctOpt = `3`;
    distractors = ["1", "2", "0"];
    explanation = `Hàm trùng phương $y = ax^4 + bx^2 + c$ có $a = 1 > 0$ và $b = -${b} < 0$. Vì $ab < 0$ nên hàm số có đúng 3 điểm cực trị.`;
  } else if (level >= 9 && level <= 10) {
    // Cực trị hàm phân thức & bài toán tham số
    const m = randChoice([1, 2, 3], effectiveSeed);
    qText = `Hàm số $y = \\frac{x^2 + ${m}x + 1}{x + 1}$ có bao nhiêu điểm cực trị?`;
    correctOpt = `2`;
    distractors = ["1", "0", "3"];
    explanation = `Chia đa thức: $y = x + ${m - 1} + \\frac{${1 - (m - 1)}}{x + 1}$. Đạo hàm $y' = 1 - \\frac{${2 - m}}{(x+1)^2} = 0$. Phương trình có hai nghiệm phân biệt khác $-1$, do đó hàm số có 2 điểm cực trị.`;
  } else if (level >= 11 && level <= 15) {
    // GTLN - GTNN trên đoạn / khoảng
    const c = randChoice([4, 9, 16], effectiveSeed);
    const sqrtC = Math.sqrt(c);
    const minVal = 2 * sqrtC;
    qText = `Giá trị nhỏ nhất của hàm số $y = x + \\frac{${c}}{x}$ trên khoảng $(0; +\\infty)$ bằng:`;
    correctOpt = `$${minVal}$`;
    distractors = [`$${minVal + 2}$`, `$${minVal - 1}$`, `$${c}$`];
    explanation = `Theo bất đẳng thức Cauchy (AM-GM) cho hai số dương $x$ và $\\frac{${c}}{x}$: $y = x + \\frac{${c}}{x} \\ge 2\\sqrt{x \\cdot \\frac{${c}}{x}} = 2\\sqrt{${c}} = ${minVal}$. Dấu bằng xảy ra khi $x = ${sqrtC} > 0$. Vậy giá trị nhỏ nhất là $${minVal}$.`;
  } else if (level >= 16 && level <= 20) {
    // Tiệm cận đứng, tiệm cận ngang, tiệm cận xiên
    const a = randChoice([2, 3, 5], effectiveSeed);
    const b = randChoice([1, 4], effectiveSeed + 1);
    const c = randChoice([1, 2], effectiveSeed + 2);
    qText = `Phương trình đường tiệm cận đứng và tiệm cận ngang của đồ thị hàm số $y = \\frac{${a}x - 1}{x - ${c}}$ lần lượt là:`;
    correctOpt = `$x = ${c}$ và $y = ${a}$`;
    distractors = [
      `$x = -${c}$ và $y = ${a}$`,
      `$x = ${a}$ và $y = ${c}$`,
      `$x = ${c}$ và $y = 1$`
    ];
    explanation = `Ta có $\\lim_{x \\to ${c}^+} y = \\infty \\Rightarrow$ tiệm cận đứng là đường thẳng $x = ${c}$. Và $\\lim_{x \\to \\pm\\infty} y = ${a} \\Rightarrow$ tiệm cận ngang là đường thẳng $y = ${a}$.`;
  } else if (level >= 21 && level <= 25) {
    // Nhận dạng đồ thị & dấu hệ số
    const k = randChoice([1, 2], effectiveSeed);
    qText = `Đồ thị hàm số $y = \\frac{x + ${k}}{x - 1}$ có tâm đối xứng là điểm $I$ có tọa độ:`;
    correctOpt = `$(1; 1)$`;
    distractors = [
      `$(-1; 1)$`,
      `$(1; -${k})$`,
      `$(0; -${k})$`
    ];
    explanation = `Tâm đối xứng của đồ thị hàm phân thức $y = \\frac{ax+b}{cx+d}$ là giao điểm của hai đường tiệm cận: tiệm cận đứng $x = 1$ và tiệm cận ngang $y = 1$. Tọa độ tâm đối xứng là $I(1; 1)$.`;
  } else if (level >= 26 && level <= 30) {
    // Tương giao & tiếp tuyến
    const x0 = randChoice([1, 2], effectiveSeed);
    const mSlope = 3 * (x0 ** 2) - 3;
    qText = `Hệ số góc của tiếp tuyến của đồ thị hàm số $y = x^3 - 3x + 2$ tại điểm có hoành độ $x_0 = ${x0}$ là:`;
    correctOpt = `$k = ${mSlope}$`;
    distractors = [
      `$k = ${mSlope + 3}$`,
      `$k = ${mSlope - 2}$`,
      `$k = 0$`
    ];
    explanation = `Ta có $y' = 3x^2 - 3$. Hệ số góc tiếp tuyến tại điểm $x_0 = ${x0}$ là $k = y'(${x0}) = 3(${x0})^2 - 3 = ${mSlope}$.`;
  } else if (level >= 31 && level <= 38) {
    // Bài toán tối ưu thực tế: Hộp tôn, thể tích lon nước, chi phí
    const L = randChoice([12, 18, 24], effectiveSeed);
    const xCut = L / 6;
    qText = `Một tấm tôn hình vuông cạnh $a = ${L}\\text{ cm}$. Người ta cắt ở bốn góc bốn hình vuông cạnh $x$ rồi gập lại thành chiếc hộp chữ nhật không nắp. Để thể tích chiếc hộp lớn nhất thì $x$ bằng:`;
    correctOpt = `$${xCut}\\text{ cm}$`;
    distractors = [
      `$${xCut * 2}\\text{ cm}$`,
      `$${xCut - 1}\\text{ cm}$`,
      `$${L / 4}\\text{ cm}$`
    ];
    explanation = `Thể tích hộp là $V(x) = x(${L} - 2x)^2$ với $0 < x < ${L / 2}$. Đạo hàm $V'(x) = (${L} - 2x)(${L} - 6x) = 0 \\Leftrightarrow x = \\frac{${L}}{6} = ${xCut}\\text{ cm}$. Tại đó $V$ đạt giá trị lớn nhất.`;
  } else {
    // Màn 39 - 50: Hàm hợp, đạo hàm f'(x), bài toán thực tế nồng độ thuốc
    const k = randChoice([1, 2, 4], effectiveSeed);
    qText = `Nồng độ một loại thuốc trong máu sau $t$ giờ được mô tả bởi $C(t) = \\frac{${2 * k}t}{t^2 + ${k ** 2}}$ (mg/L). Nồng độ thuốc cao nhất sau bao nhiêu giờ?`;
    correctOpt = `$${k}\\text{ giờ}$`;
    distractors = [
      `$${k * 2}\\text{ giờ}$`,
      `$${k / 2}\\text{ giờ}$`,
      `$3\\text{ giờ}$`
    ];
    explanation = `$C'(t) = \\frac{${2 * k}(t^2 + ${k ** 2}) - 2t(${2 * k}t)}{(t^2 + ${k ** 2})^2} = \\frac{${2 * k}(${k ** 2} - t^2)}{(t^2 + ${k ** 2})^2} = 0 \\Leftrightarrow t = ${k}$ (vì $t > 0$). Vậy sau đúng $${k}$ giờ nồng độ đạt cực đại.`;
  }

  const rawItem = {
    id: `math_lvl_${level}_q_${qIdx}_seed_${effectiveSeed % 1000}`,
    subject: "math" as const,
    level,
    title: `Màn ${level}: ${topic}`,
    question: `[Màn ${level} - Câu ${qIdx + 1}] ${qText}`,
    options: [correctOpt, ...distractors],
    correctIndex: 0,
    explanation,
  };

  return shuffleQuestionOptions(rawItem, true);
}

// =========================================================================
// 4. BỘ SINH CÂU HỎI MÔN VẬT LÝ (50 MÀN - CHUẨN THEO TÊN MÀN & ĐỔI SỐ)
// =========================================================================

function generatePhysicsLevelQuestion(level: number, qIdx: number, seed?: number): JourneyQuestionItem {
  const topic = PHYSICS_TOPICS[level - 1] || "Vật lý nhiệt & Khí lý tưởng";
  const effectiveSeed = (seed ?? Date.now()) + level * 137 + qIdx * 29;

  let qText = "";
  let correctOpt = "";
  let distractors: string[] = [];
  let explanation = "";

  if (level <= 5) {
    // Cấu tạo chất, chuyển động Brown, thể rắn, lỏng, khí
    qText = `Hiện tượng nào sau đây là bằng chứng thực nghiệm trực tiếp chứng minh các phân tử chuyển động hỗn loạn không ngừng?`;
    correctOpt = `Chuyển động Brown của các hạt phấn hoa trong nước`;
    distractors = [
      `Sự rơi tự do của viên bi sắt trong ống chân không`,
      `Hiện tượng phản xạ ánh sáng trên gương phẳng`,
      `Sự nhiễm điện do cọ xát giữa thanh thủy tinh và lụa`
    ];
    explanation = `Chuyển động Brown mô tả sự chuyển động hỗn loạn không ngừng của các hạt siêu nhỏ lơ lửng trong chất lỏng do sự va chạm không đồng đều của các phân tử chất lỏng.`;
  } else if (level === 6 || level === 7) {
    // Thang nhiệt độ Celsius & Kelvin
    const tC = randChoice([25, 27, 30, 37, 45], effectiveSeed);
    const tK = (tC + 273.15).toFixed(2);
    qText = `Nhiệt độ $${tC}^\\circ\\text{C}$ tương ứng với bao nhiêu Kelvin trên thang nhiệt độ tuyệt đối?`;
    correctOpt = `$${tK}\\text{ K}$`;
    distractors = [
      `$${(tC + 200).toFixed(2)}\\text{ K}$`,
      `$${(tC + 300).toFixed(2)}\\text{ K}$`,
      `$${(tC - 273.15).toFixed(2)}\\text{ K}$`
    ];
    explanation = `Công thức chuyển đổi giữa thang nhiệt độ Celsius ($t$) và thang nhiệt độ Kelvin ($T$): $T(\\text{K}) = t(^\\circ\\text{C}) + 273.15 = ${tC} + 273.15 = ${tK}\\text{ K}$.`;
  } else if (level >= 8 && level <= 12) {
    // Nội năng, biến đổi nội năng, công thức nhiệt lượng
    const A = randChoice([50, 100, 150, 200], effectiveSeed);
    const Q = randChoice([30, 80, 120], effectiveSeed + 1);
    const deltaU = A + Q;
    qText = `Một khối khí nhận nhiệt lượng $Q = ${Q}\\text{ J}$ và thực hiện nhận công nén $A = ${A}\\text{ J}$. Độ biến thiên nội năng $\\Delta U$ của khối khí là:`;
    correctOpt = `$${deltaU}\\text{ J}$`;
    distractors = [
      `$${A - Q}\\text{ J}$`,
      `$${Q - A}\\text{ J}$`,
      `$${-(A + Q)}\\text{ J}$`
    ];
    explanation = `Theo Định luật I nhiệt động lực học: $\\Delta U = A + Q$. Vì hệ nhận nhiệt lượng nên $Q = +${Q}\\text{ J}$, hệ nhận công nên $A = +${A}\\text{ J}$. Suy ra $\\Delta U = ${A} + ${Q} = ${deltaU}\\text{ J}$.`;
  } else if (level >= 13 && level <= 16) {
    // Định luật I NĐLH & Động cơ nhiệt
    const Q1 = randChoice([500, 800, 1000], effectiveSeed);
    const Q2 = randChoice([200, 300, 400], effectiveSeed + 1);
    const eta = (((Q1 - Q2) / Q1) * 100).toFixed(1);
    qText = `Một động cơ nhiệt nhận từ nguồn nóng nhiệt lượng $Q_1 = ${Q1}\\text{ J}$ và truyền cho nguồn lạnh nhiệt lượng $Q_2 = ${Q2}\\text{ J}$. Hiệu suất nhiệt của động cơ là:`;
    correctOpt = `$${eta}\\%$`;
    distractors = [
      `$${(((Q2) / Q1) * 100).toFixed(1)}\\%$`,
      `$${(((Q1 - Q2 + 100) / Q1) * 100).toFixed(1)}\\%$`,
      `$50\\%$`
    ];
    explanation = `Hiệu suất nhiệt của động cơ nhiệt: $\\eta = \\frac{A}{Q_1} = \\frac{Q_1 - Q_2}{Q_1} = \\frac{${Q1} - ${Q2}}{${Q1}} = ${eta}\\%$.`;
  } else if (level >= 17 && level <= 21) {
    // Nhiệt dung riêng Q = mcΔT & Phương trình cân bằng nhiệt
    const m = randChoice([0.5, 1, 1.5, 2], effectiveSeed);
    const deltaT = randChoice([10, 20, 30], effectiveSeed + 1);
    const cWater = 4200;
    const QCalc = m * cWater * deltaT;
    qText = `Cần cung cấp nhiệt lượng bao nhiêu để làm nóng $m = ${m}\\text{ kg}$ nước từ $20^\\circ\\text{C}$ tăng thêm $\\Delta t = ${deltaT}^\\circ\\text{C}$? (Biết $c_{\\text{nước}} = 4200\\text{ J/kg.K}$):`;
    correctOpt = `$${QCalc.toLocaleString("vi-VN")}\\text{ J}$`;
    distractors = [
      `$${(QCalc / 2).toLocaleString("vi-VN")}\\text{ J}$`,
      `$${(QCalc * 1.5).toLocaleString("vi-VN")}\\text{ J}$`,
      `$${(QCalc - 5000).toLocaleString("vi-VN")}\\text{ J}$`
    ];
    explanation = `Nhiệt lượng cần cung cấp: $Q = mc\\Delta t = ${m} \\times 4200 \\times ${deltaT} = ${QCalc.toLocaleString("vi-VN")}\\text{ J}$.`;
  } else if (level >= 22 && level <= 30) {
    // Nhiệt nóng chảy Q = mλ & Nhiệt hóa hơi Q = mL
    const m = randChoice([0.2, 0.5, 1.0], effectiveSeed);
    const lambda = 3.34e5; // J/kg
    const QMelting = m * lambda;
    qText = `Nhiệt lượng cần thiết để làm nóng chảy hoàn toàn $m = ${m}\\text{ kg}$ nước đá ở $0^\\circ\\text{C}$ là: (Cho nhiệt nóng chảy riêng $\\lambda = 3.34 \\times 10^5\\text{ J/kg}$)`;
    correctOpt = `$${(QMelting / 1000).toFixed(1)}\\text{ kJ}$`;
    distractors = [
      `$${((QMelting / 1000) * 1.5).toFixed(1)}\\text{ kJ}$`,
      `$${((QMelting / 1000) / 2).toFixed(1)}\\text{ kJ}$`,
      `$334\\text{ kJ}$`
    ];
    explanation = `Công thức tính nhiệt lượng nóng chảy: $Q = m\\lambda = ${m} \\times 3.34 \\times 10^5 = ${QMelting}\\text{ J} = ${(QMelting / 1000).toFixed(1)}\\text{ kJ}$.`;
  } else if (level >= 31 && level <= 35) {
    // Định luật Boyle: p1*V1 = p2*V2 (Đẳng nhiệt)
    const p1 = randChoice([1, 2], effectiveSeed);
    const V1 = randChoice([6, 8, 10], effectiveSeed + 1);
    const V2 = V1 / 2;
    const p2 = (p1 * V1) / V2;
    qText = `Một lượng khí lý tưởng có thể tích ban đầu $V_1 = ${V1}\\text{ lít}$ ở áp suất $p_1 = ${p1}\\text{ atm}$. Nén đẳng nhiệt khối khí đến thể tích $V_2 = ${V2}\\text{ lít}$, áp suất $p_2$ lúc này là:`;
    correctOpt = `$${p2}\\text{ atm}$`;
    distractors = [
      `$${p2 / 2}\\text{ atm}$`,
      `$${p2 + 1}\\text{ atm}$`,
      `$${p1}\\text{ atm}$`
    ];
    explanation = `Theo Định luật Boyle (quá trình đẳng nhiệt $T = \\text{const}$): $p_1 V_1 = p_2 V_2 \\Rightarrow p_2 = \\frac{p_1 V_1}{V_2} = \\frac{${p1} \\times ${V1}}{${V2}} = ${p2}\\text{ atm}$.`;
  } else if (level >= 36 && level <= 40) {
    // Định luật Charles: p1/T1 = p2/T2 (Đẳng tích)
    const p1 = randChoice([1, 2], effectiveSeed);
    const T1 = 300; // K
    const T2 = 600; // K
    const p2 = (p1 * T2) / T1;
    qText = `Nung nóng đẳng tích một lượng khí kín từ nhiệt độ $T_1 = 300\\text{ K}$ lên nhiệt độ $T_2 = 600\\text{ K}$. Biết áp suất ban đầu $p_1 = ${p1}\\text{ atm}$, áp suất $p_2$ sau khi nung là:`;
    correctOpt = `$${p2}\\text{ atm}$`;
    distractors = [
      `$${p2 * 1.5}\\text{ atm}$`,
      `$${p1}\\text{ atm}$`,
      `$${p2 - 0.5}\\text{ atm}$`
    ];
    explanation = `Theo Định luật Charles (quá trình đẳng tích $V = \\text{const}$): $\\frac{p_1}{T_1} = \\frac{p_2}{T_2} \\Rightarrow p_2 = p_1 \\cdot \\frac{T_2}{T_1} = ${p1} \\times \\frac{600}{300} = ${p2}\\text{ atm}$.`;
  } else {
    // Màn 41 - 50: Phương trình Clapeyron - Mendeleev & Động năng phân tử
    const n = randChoice([1, 2], effectiveSeed);
    const T = 300;
    const R = 8.31;
    const pV = Math.round(n * R * T);
    qText = `Cho $n = ${n}\\text{ mol}$ khí lý tưởng ở nhiệt độ $T = 300\\text{ K}$. Tích số $p \\cdot V$ của khối khí bằng: (Cho $R = 8.31\\text{ J/mol.K}$)`;
    correctOpt = `$${pV}\\text{ J}$`;
    distractors = [
      `$${Math.round(pV * 1.5)}\\text{ J}$`,
      `$${Math.round(pV / 2)}\\text{ J}$`,
      `$2493\\text{ J}$`
    ];
    explanation = `Áp dụng phương trình trạng thái Clapeyron - Mendeleev: $pV = nRT = ${n} \\times 8.31 \\times 300 = ${pV}\\text{ J}$.`;
  }

  const rawItem = {
    id: `phys_lvl_${level}_q_${qIdx}_seed_${effectiveSeed % 1000}`,
    subject: "physics" as const,
    level,
    title: `Màn ${level}: ${topic}`,
    question: `[Màn ${level} - Câu ${qIdx + 1}] ${qText}`,
    options: [correctOpt, ...distractors],
    correctIndex: 0,
    explanation,
  };

  return shuffleQuestionOptions(rawItem, true);
}

// =========================================================================
// 5. BỘ SINH CÂU HỎI MÔN HÓA HỌC (50 MÀN - CHUẨN THEO TÊN MÀN & ĐỔI SỐ)
// =========================================================================

function generateChemistryLevelQuestion(level: number, qIdx: number, seed?: number): JourneyQuestionItem {
  const topic = CHEMISTRY_TOPICS[level - 1] || "Este - Lipit - Xà phòng hóa";
  const effectiveSeed = (seed ?? Date.now()) + level * 179 + qIdx * 37;

  let qText = "";
  let correctOpt = "";
  let distractors: string[] = [];
  let explanation = "";

  if (level <= 5) {
    // Khái niệm este & đồng phân cấu tạo
    const cCount = level === 3 ? 2 : level === 4 ? 3 : 4;
    const isomersCount = cCount === 2 ? 1 : cCount === 3 ? 2 : 4;
    qText = `Số lượng đồng phân este ứng với công thức phân tử $\\text{C}_${cCount}\\text{H}_${cCount * 2}\\text{O}_2$ là:`;
    correctOpt = `$${isomersCount}$`;
    distractors = [
      `$${isomersCount + 1}$`,
      `$${Math.max(1, isomersCount - 1)}$`,
      `$${isomersCount + 2}$`
    ];
    explanation = cCount === 2
      ? `Với $\\text{C}_2\\text{H}_4\\text{O}_2$, chỉ có đúng 1 đồng phân este là $\\text{HCOOCH}_3$ (metyl fomat).`
      : cCount === 3
      ? `Với $\\text{C}_3\\text{H}_6\\text{O}_2$, có 2 đồng phân este: $\\text{HCOOCH}_2\\text{CH}_3$ và $\\text{CH}_3\\text{COOCH}_3$.`
      : `Với $\\text{C}_4\\text{H}_8\\text{O}_2$, có 4 đồng phân este: $\\text{HCOOCH}_2\\text{CH}_2\\text{CH}_3$, $\\text{HCOOCH(CH}_3)_2$, $\\text{CH}_3\\text{COOCH}_2\\text{CH}_3$, $\\text{CH}_3\\text{CH}_2\\text{COOCH}_3$.`;
  } else if (level === 6 || level === 7 || level === 8) {
    // Danh pháp & Mùi thơm đặc trưng
    qText = `Este nào sau đây có mùi thơm đặc trưng của quả chuối chín?`;
    correctOpt = `Isoamyl axetat`;
    distractors = [
      `Benzyl axetat (mùi hoa nhài)`,
      `Etyl fomat (mùi đào chín)`,
      `Geranyl axetat (mùi hoa hồng)`
    ];
    explanation = `Isoamyl axetat ($\\text{CH}_3\\text{COOCH}_2\\text{CH}_2\\text{CH(CH}_3)_2$) có mùi thơm đặc trưng của chuối chín và thường được dùng làm hương liệu thực phẩm.`;
  } else if (level >= 9 && level <= 12) {
    // Phản ứng thủy phân axit & kiềm (xà phòng hóa) & tráng bạc este fomat
    const nMol = randChoice([0.1, 0.15, 0.2], effectiveSeed);
    const mAg = (nMol * 2 * 108).toFixed(1);
    qText = `Cho $${nMol}\\text{ mol}$ etyl fomat ($\\text{HCOOC}_2\\text{H}_5$) tham gia phản ứng tráng bạc hoàn toàn với dung dịch $\\text{AgNO}_3/\\text{NH}_3$ dư. Khối lượng kết tủa $\\text{Ag}$ thu được là:`;
    correctOpt = `$${mAg}\\text{ g}$`;
    distractors = [
      `$${(nMol * 108).toFixed(1)}\\text{ g}$`,
      `$${(nMol * 4 * 108).toFixed(1)}\\text{ g}$`,
      `$10.8\\text{ g}$`
    ];
    explanation = `Este của axit fomic có nhóm $-\\text{CHO}$ nên tham gia phản ứng tráng bạc với tỉ lệ $1\\text{ mol } \\text{HCOOR} \\to 2\\text{ mol Ag}$. Số mol $\\text{Ag} = 2 \\times ${nMol} = ${nMol * 2}\\text{ mol}$. Khối lượng $\\text{Ag} = ${nMol * 2} \\times 108 = ${mAg}\\text{ g}$.`;
  } else if (level >= 13 && level <= 18) {
    // Este của phenol & điều chế este
    qText = `Chất nào sau đây khi thủy phân trong dung dịch $\\text{NaOH}$ dư, đun nóng sinh ra 2 muối hữu cơ?`;
    correctOpt = `$\\text{CH}_3\\text{COOC}_6\\text{H}_5$ (phenyl axetat)`;
    distractors = [
      `$\\text{CH}_3\\text{COOCH}_2\\text{C}_6\\text{H}_5$ (benzyl axetat)`,
      `$\\text{CH}_3\\text{COOC}_2\\text{H}_5$ (etyl axetat)`,
      `$\\text{HCOOCH}_3$ (metyl fomat)`
    ];
    explanation = `Phenyl axetat là este của phenol: $\\text{CH}_3\\text{COOC}_6\\text{H}_5 + 2\\text{NaOH} \\to \\text{CH}_3\\text{COONa} + \\text{C}_6\\text{H}_5\\text{ONa} + \\text{H}_2\\text{O}$ sinh ra 2 muối natri axetat và natri phenolat.`;
  } else if (level >= 19 && level <= 25) {
    // Khái niệm chất béo (Triglixerit), Tripanmitin, Tristearin, Triolein
    qText = `Công thức phân tử của Triolein là:`;
    correctOpt = `$(\\text{C}_{17}\\text{H}_{33}\\text{COO})_3\\text{C}_3\\text{H}_5$ (hoặc $\\text{C}_{57}\\text{H}_{104}\\text{O}_6$)`;
    distractors = [
      `$(\\text{C}_{17}\\text{H}_{35}\\text{COO})_3\\text{C}_3\\text{H}_5$ (Tristearin)`,
      `$(\\text{C}_{15}\\text{H}_{31}\\text{COO})_3\\text{C}_3\\text{H}_5$ (Tripanmitin)`,
      `$(\\text{C}_{17}\\text{H}_{31}\\text{COO})_3\\text{C}_3\\text{H}_5$ (Trilinolein)`
    ];
    explanation = `Triolein là triglixerit của axit oleic không no ($\\text{C}_{17}\\text{H}_{33}\\text{COOH}$), có công thức $(\\text{C}_{17}\\text{H}_{33}\\text{COO})_3\\text{C}_3\\text{H}_5$. Ở điều kiện thường Triolein là chất lỏng.`;
  } else if (level >= 26 && level <= 31) {
    // Xà phòng hóa chất béo & hydro hóa
    const nFat = randChoice([0.05, 0.1, 0.2], effectiveSeed);
    const mGlycerol = (nFat * 92).toFixed(2);
    qText = `Thủy phân hoàn toàn $${nFat}\\text{ mol}$ một chất béo bất kỳ trong dung dịch $\\text{NaOH}$ đun nóng. Khối lượng glixerol thu được là:`;
    correctOpt = `$${mGlycerol}\\text{ g}$`;
    distractors = [
      `$${(nFat * 3 * 92).toFixed(2)}\\text{ g}$`,
      `$${(nFat * 46).toFixed(2)}\\text{ g}$`,
      `$9.2\\text{ g}$`
    ];
    explanation = `Cứ 1 mol chất béo xà phòng hóa luôn sinh ra đúng 1 mol glixerol $\\text{C}_3\\text{H}_5(\\text{OH})_3$ ($M = 92\\text{ g/mol}$). Số mol glixerol $= ${nFat}\\text{ mol} \\Rightarrow m = ${nFat} \\times 92 = ${mGlycerol}\\text{ g}$.`;
  } else if (level >= 32 && level <= 37) {
    // Xà phòng & chất giặt rửa tổng hợp
    qText = `Thành phần chính của xà phòng thông thường là:`;
    correctOpt = `Muối natri hoặc kali của các axit béo cao`;
    distractors = [
      `Axit béo tự do mạch dài`,
      `Hỗn hợp este của glixerol`,
      `Muối canxi hoặc magie của axit béo`
    ];
    explanation = `Xà phòng là hỗn hợp muối natri (xà phòng bánh) hoặc kali (xà phòng lỏng) của các axit béo như natri panmitat, natri stearat...`;
  } else {
    // Màn 38 - 50: Bài toán đốt cháy este & bảo toàn khối lượng xà phòng hóa
    const mEste = randChoice([8.8, 17.6], effectiveSeed);
    const mNaOH = (mEste / 88) * 40;
    const mAncol = (mEste / 88) * 46;
    const mMuoi = (mEste + mNaOH - mAncol).toFixed(1);
    qText = `Xà phòng hóa hoàn toàn $${mEste}\\text{ g}$ etyl axetat ($\\text{CH}_3\\text{COOC}_2\\text{H}_5$) bằng một lượng vừa đủ dung dịch $\\text{NaOH}$. Cô cạn dung dịch sau phản ứng thu được lượng muối khan là:`;
    correctOpt = `$${mMuoi}\\text{ g}$`;
    distractors = [
      `$${(parseFloat(mMuoi) + 2.0).toFixed(1)}\\text{ g}$`,
      `$${(parseFloat(mMuoi) - 1.5).toFixed(1)}\\text{ g}$`,
      `$8.2\\text{ g}$`
    ];
    explanation = `Số mol etyl axetat ($M = 88$) là $n = \\frac{${mEste}}{88} = ${mEste / 88}\\text{ mol}$. Phản ứng sinh ra muối $\\text{CH}_3\\text{COONa}$ ($M = 82$). Khối lượng muối $= ${mEste / 88} \\times 82 = ${mMuoi}\\text{ g}$.`;
  }

  const rawItem = {
    id: `chem_lvl_${level}_q_${qIdx}_seed_${effectiveSeed % 1000}`,
    subject: "chemistry" as const,
    level,
    title: `Màn ${level}: ${topic}`,
    question: `[Màn ${level} - Câu ${qIdx + 1}] ${qText}`,
    options: [correctOpt, ...distractors],
    correctIndex: 0,
    explanation,
  };

  return shuffleQuestionOptions(rawItem, true);
}

// =========================================================================
// 6. CỔNG TRUY XUẤT CHÍNH (MAIN EXPORT APIS)
// =========================================================================

/**
 * Sinh danh sách 3 câu hỏi cho một màn chơi của môn học
 * Hỗ trợ tham số seed / randomize để đổi số và đảo vị trí đáp án ngẫu nhiên
 */
export function getSubjectJourneyQuestions(
  subject: "math" | "physics" | "chemistry",
  level: number,
  options?: { randomize?: boolean; seed?: number }
): JourneyQuestionItem[] {
  const safeLevel = Math.max(1, Math.min(50, level));
  const seed = options?.seed ?? (options?.randomize === false ? safeLevel * 100 : Date.now());
  const questions: JourneyQuestionItem[] = [];

  for (let q = 0; q < 3; q++) {
    if (subject === "math") {
      questions.push(generateMathLevelQuestion(safeLevel, q, seed + q * 13));
    } else if (subject === "physics") {
      questions.push(generatePhysicsLevelQuestion(safeLevel, q, seed + q * 13));
    } else {
      questions.push(generateChemistryLevelQuestion(safeLevel, q, seed + q * 13));
    }
  }

  return questions;
}

/**
 * Sinh lại duy nhất một câu hỏi ngẫu nhiên cho màn chơi (khi thí sinh bấm làm lại)
 */
export function getRandomizedJourneyQuestion(
  subject: "math" | "physics" | "chemistry",
  level: number,
  qIdx: number = 0,
  seed?: number
): JourneyQuestionItem {
  const safeLevel = Math.max(1, Math.min(50, level));
  const effectiveSeed = seed ?? (Date.now() + Math.random() * 1000);

  if (subject === "math") {
    return generateMathLevelQuestion(safeLevel, qIdx, effectiveSeed);
  } else if (subject === "physics") {
    return generatePhysicsLevelQuestion(safeLevel, qIdx, effectiveSeed);
  } else {
    return generateChemistryLevelQuestion(safeLevel, qIdx, effectiveSeed);
  }
}
