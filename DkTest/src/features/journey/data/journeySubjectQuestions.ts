/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Ngân hàng câu hỏi Hành Trình Học Tập Lớp 12 Chương 1
 * Đủ 50 màn chơi cho 3 môn: Toán, Vật Lý, Hóa Học
 * Tích hợp chuẩn kiến thức THPTQG 2025, định dạng LaTeX chuẩn và đảo đáp án ngẫu nhiên xác định (Deterministic Shuffle).
 */

import { shuffleQuestionOptions } from "./journeyQuestions12";

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

interface RawQuestionTemplate {
  q: string;
  opts: string[];
  ans: number;
  exp: string;
}

// Math question banks organized by topic clusters
const MATH_CLUSTER_BANKS: Record<number, RawQuestionTemplate[]> = {
  // Cluster 0: Màn 1 - 5 (Đơn điệu)
  0: [
    {
      q: "Hàm số $y = x^3 - 3x^2 + 2$ đồng biến trên khoảng nào dưới đây?",
      opts: ["$(-\\infty; 0)$ và $(2; +\\infty)$", "$(0; 2)$", "$(-\\infty; 2)$", "$(0; +\\infty)$"],
      ans: 0,
      exp: "$y' = 3x^2 - 6x = 3x(x - 2)$. $y' > 0 \\Leftrightarrow x < 0$ hoặc $x > 2$."
    },
    {
      q: "Hàm số $y = \\frac{2x - 1}{x + 1}$ đồng biến trên các khoảng nào?",
      opts: ["$(-\\infty; -1)$ và $(-1; +\\infty)$", "$\\mathbb{R} \\setminus \\{-1\\}$", "$(-1; +\\infty)$", "$(-\\infty; 1)$"],
      ans: 0,
      exp: "Tập xác định $D = \\mathbb{R} \\setminus \\{-1\\}$. $y' = \\frac{2(1) - (-1)(1)}{(x+1)^2} = \\frac{3}{(x+1)^2} > 0, \\forall x \\neq -1$."
    },
    {
      q: "Tìm tất cả các giá trị của tham số $m$ để hàm số $y = \\frac{x - 1}{x + m}$ đồng biến trên từng khoảng xác định:",
      opts: ["$m > -1$", "$m \\ge -1$", "$m < -1$", "$m > 1$"],
      ans: 0,
      exp: "$y' = \\frac{m - (-1)}{(x+m)^2} = \\frac{m + 1}{(x+m)^2}$. Hàm số đồng biến khi $m + 1 > 0 \\Leftrightarrow m > -1$."
    }
  ],
  // Cluster 1: Màn 6 - 10 (Cực trị)
  1: [
    {
      q: "Điểm cực đại của đồ thị hàm số $y = -x^3 + 3x + 1$ là:",
      opts: ["$(1; 3)$", "$(-1; -1)$", "$x = 1$", "$y = 3$"],
      ans: 0,
      exp: "$y' = -3x^2 + 3 = 0 \\Leftrightarrow x = \\pm 1$. Tại $x = 1$, $y'$ đổi dấu từ dương sang âm, $y(1) = 3$. Điểm cực đại là $(1; 3)$."
    },
    {
      q: "Hàm số trùng phương $y = ax^4 + bx^2 + c$ ($a \\neq 0$) có đúng 3 điểm cực trị khi và chỉ khi:",
      opts: ["$ab < 0$", "$ab > 0$", "$ab \\le 0$", "$a > 0, b < 0$"],
      ans: 0,
      exp: "$y' = 4ax^3 + 2bx = 2x(2ax^2 + b) = 0$. Phương trình có 3 nghiệm phân biệt khi $-b / (2a) > 0 \\Leftrightarrow ab < 0$."
    },
    {
      q: "Số điểm cực trị của hàm số $y = x^4 - 2x^2 + 3$ là:",
      opts: ["3", "1", "2", "0"],
      ans: 0,
      exp: "Ta có $a = 1, b = -2 \\Rightarrow ab = -2 < 0$, do đó hàm số có đúng 3 điểm cực trị."
    }
  ],
  // Cluster 2: Màn 11 - 15 (GTLN - GTNN)
  2: [
    {
      q: "Giá trị nhỏ nhất của hàm số $y = x + \\frac{4}{x}$ trên đoạn $[1; 3]$ là:",
      opts: ["$4$", "$5$", "$\\frac{13}{3}$", "$2$"],
      ans: 0,
      exp: "$y' = 1 - \\frac{4}{x^2} = 0 \\Rightarrow x = 2 \\in [1; 3]$. $y(1) = 5$, $y(2) = 4$, $y(3) = 13/3$. Min là $4$ tại $x = 2$."
    },
    {
      q: "Giá trị lớn nhất của hàm số $y = \\sqrt{4 - x^2}$ là:",
      opts: ["$2$", "$4$", "$0$", "$\\sqrt{2}$"],
      ans: 0,
      exp: "$4 - x^2 \\le 4 \\Rightarrow \\sqrt{4 - x^2} \\le 2$. Dấu bằng xảy ra khi $x = 0$."
    },
    {
      q: "Tìm giá trị lớn nhất $M$ của hàm số $y = \\sin x - \\sqrt{3}\\cos x$ trên $\\mathbb{R}$:",
      opts: ["$M = 2$", "$M = 1$", "$M = \\sqrt{3}$", "$M = 4$"],
      ans: 0,
      exp: "$y = 2\\sin(x - \\pi/3) \\Rightarrow -2 \\le y \\le 2$. Giá trị lớn nhất là $2$."
    }
  ],
  // Cluster 3: Màn 16 - 20 (Tiệm cận)
  3: [
    {
      q: "Đồ thị hàm số $y = \\frac{2x - 1}{x + 1}$ có các đường tiệm cận đứng và ngang lần lượt là:",
      opts: ["$x = -1$ và $y = 2$", "$x = 1$ và $y = 2$", "$x = -1$ và $y = -1$", "$x = 2$ và $y = 1$"],
      ans: 0,
      exp: "Mẫu số triệt tiêu tại $x = -1$ nên TCĐ là $x = -1$. $\\lim_{x \\to \\pm\\infty} y = 2$ nên TCN là $y = 2$."
    },
    {
      q: "Tiệm cận xiên của đồ thị hàm số $y = \\frac{x^2 - 2x + 3}{x - 1}$ là đường thẳng:",
      opts: ["$y = x - 1$", "$y = x + 1$", "$y = x - 2$", "$y = 2x - 1$"],
      ans: 0,
      exp: "Chia đa thức: $y = x - 1 + \\frac{2}{x - 1}$. Khi $x \\to \\pm\\infty$, phần dư triệt tiêu nên TCX là $y = x - 1$."
    },
    {
      q: "Số đường tiệm cận của đồ thị hàm số $y = \\frac{1}{x^2 - 4}$ là:",
      opts: ["3", "2", "1", "4"],
      ans: 0,
      exp: "TCĐ: $x = 2$ và $x = -2$ (2 đường). TCN: $y = 0$ vì bậc tử bé hơn bậc mẫu (1 đường). Tổng cộng có 3 tiệm cận."
    }
  ],
  // Cluster 4: Màn 21 - 26 (Nhận dạng đồ thị)
  4: [
    {
      q: "Đồ thị hàm số bậc ba $y = ax^3 + bx^2 + cx + d$ có nhánh cuối đi xuống khi $x \\to +\\infty$. Dấu của hệ số $a$ là:",
      opts: ["$a < 0$", "$a > 0$", "$a \\ge 0$", "$a = 0$"],
      ans: 0,
      exp: "Nhánh cuối của hàm bậc ba đi xuống chứng tỏ $\\lim_{x \\to +\\infty} y = -\\infty$, suy ra $a < 0$."
    },
    {
      q: "Tâm đối xứng của đồ thị hàm số $y = \\frac{2x + 1}{x - 1}$ có tọa độ là:",
      opts: ["$(1; 2)$", "$(-1; 2)$", "$(2; 1)$", "$(1; -2)$"],
      ans: 0,
      exp: "Tâm đối xứng của hàm phân thức bậc 1/1 là giao điểm 2 đường tiệm cận: TCĐ $x = 1$, TCN $y = 2$ nên $I(1; 2)$."
    },
    {
      q: "Điểm uốn của đồ thị hàm số bậc ba $y = x^3 - 3x^2 + 1$ có hoành độ thỏa mãn $y'' = 0$. Hoành độ điểm uốn là:",
      opts: ["$x = 1$", "$x = 0$", "$x = 2$", "$x = -1$"],
      ans: 0,
      exp: "$y' = 3x^2 - 6x \\Rightarrow y'' = 6x - 6 = 0 \\Leftrightarrow x = 1$."
    }
  ],
  // Cluster 5: Màn 27 - 30 (Tương giao đồ thị)
  5: [
    {
      q: "Số giao điểm của đồ thị hàm số $y = x^3 - 3x$ với đường thẳng $y = 2$ là:",
      opts: ["2", "3", "1", "0"],
      ans: 0,
      exp: "Phương trình hoành độ giao điểm: $x^3 - 3x - 2 = 0 \\Leftrightarrow (x + 1)^2(x - 2) = 0$. Có 2 nghiệm phân biệt $x = -1$ và $x = 2$."
    },
    {
      q: "Cho hàm số $y = f(x)$ có bảng biến thiên với cực đại tại $y = 3$ và cực tiểu tại $y = -1$. Phương trình $f(x) = m$ có 3 nghiệm phân biệt khi:",
      opts: ["$-1 < m < 3$", "$m \\le -1$", "$m \\ge 3$", "$-1 \\le m \\le 3$"],
      ans: 0,
      exp: "Đường thẳng $y = m$ cắt 3 nhánh của đồ thị khi $y_{CT} < m < y_{CD} \\Leftrightarrow -1 < m < 3$."
    },
    {
      q: "Đường thẳng $y = 4$ cắt đồ thị hàm số $y = x^4 - 2x^2 + 3$ tại bao nhiêu điểm?",
      opts: ["2", "4", "3", "0"],
      ans: 0,
      exp: "$x^4 - 2x^2 + 3 = 4 \\Leftrightarrow x^4 - 2x^2 - 1 = 0$. Có $t = x^2 > 0 \\Rightarrow t = 1 + \\sqrt{2}$, cho 2 nghiệm thực $x = \\pm\\sqrt{1+\\sqrt{2}}$."
    }
  ],
  // Cluster 6: Màn 31 - 33 (Tiếp tuyến)
  6: [
    {
      q: "Phương trình tiếp tuyến của đồ thị hàm số $y = x^3 - 3x + 2$ tại điểm $M(0; 2)$ là:",
      opts: ["$y = -3x + 2$", "$y = 3x + 2$", "$y = -3x - 2$", "$y = 2$"],
      ans: 0,
      exp: "$y' = 3x^2 - 3 \\Rightarrow y'(0) = -3$. PTTT: $y - 2 = -3(x - 0) \\Leftrightarrow y = -3x + 2$."
    },
    {
      q: "Hệ số góc của tiếp tuyến với đồ thị $y = \\frac{2x - 1}{x + 1}$ tại điểm có hoành độ $x_0 = 1$ là:",
      opts: ["$\\frac{3}{4}$", "$\\frac{1}{4}$", "$3$", "$1$"],
      ans: 0,
      exp: "$y' = \\frac{3}{(x+1)^2} \\Rightarrow y'(1) = \\frac{3}{(1+1)^2} = \\frac{3}{4}$."
    },
    {
      q: "Tiếp tuyến của đồ thị $y = x^2$ song song với đường thẳng $y = 4x + 1$ có phương trình là:",
      opts: ["$y = 4x - 4$", "$y = 4x + 4$", "$y = 4x - 2$", "$y = 4x$"],
      ans: 0,
      exp: "$y' = 2x_0 = 4 \\Rightarrow x_0 = 2 \\Rightarrow y_0 = 4$. PTTT: $y - 4 = 4(x - 2) \\Leftrightarrow y = 4x - 4$."
    }
  ],
  // Cluster 7: Màn 34 - 38 (Bài toán tối ưu thực tế)
  7: [
    {
      q: "Người ta muốn uốn một sợi dây kim loại dài $40\\text{ cm}$ thành một hình chữ nhật có diện tích lớn nhất. Chiều dài mỗi cạnh của hình chữ nhật đó là:",
      opts: ["$10\\text{ cm}$", "$8\\text{ cm}$ và $12\\text{ cm}$", "$5\\text{ cm}$ và $15\\text{ cm}$", "$20\\text{ cm}$"],
      ans: 0,
      exp: "Nửa chu vi $a + b = 20$. Diện tích $S = a(20 - a) \\le ((a + 20 - a)/2)^2 = 100$. Max đạt được khi $a = b = 10\\text{ cm}$ (hình vuông)."
    },
    {
      q: "Một hộp không nắp được làm từ tấm bìa hình vuông cạnh $12\\text{ cm}$ bằng cách cắt 4 góc các ô vuông cạnh $x$ rồi gấp lại. Để thể tích hộp lớn nhất thì $x$ bằng:",
      opts: ["$2\\text{ cm}$", "$3\\text{ cm}$", "$4\\text{ cm}$", "$1\\text{ cm}$"],
      ans: 0,
      exp: "$V(x) = x(12 - 2x)^2 = 4x^3 - 48x^2 + 144x$. $V'(x) = 12x^2 - 96x + 144 = 0 \\Leftrightarrow x = 2$ hoặc $x = 6$ (loại vì cạnh phải $>0$). Vậy $x = 2\\text{ cm}$."
    },
    {
      q: "Một công ty dự tính lợi nhuận theo giá bán $p$ là $L(p) = -2p^2 + 120p - 1000$ (triệu đồng). Mức giá $p$ để lợi nhuận tối đa là:",
      opts: ["$30$", "$25$", "$35$", "$40$"],
      ans: 0,
      exp: "$L'(p) = -4p + 120 = 0 \\Leftrightarrow p = 30$. Lợi nhuận đạt cực đại tại $p = 30$."
    }
  ],
  // Cluster 8: Màn 39 - 41 (Điểm cố định & Trị tuyệt đối)
  8: [
    {
      q: "Điểm cố định mà mọi đường cong thuộc họ $(C_m): y = (m-1)x + 2m + 3$ luôn đi qua là:",
      opts: ["$(-2; 5)$", "$(2; 5)$", "$(-2; 1)$", "$(0; 3)$"],
      ans: 0,
      exp: "$y = m(x + 2) - x + 3$. Thỏa mãn với mọi $m \\Leftrightarrow x + 2 = 0 \\Rightarrow x = -2 \\Rightarrow y = -(-2) + 3 = 5$. Tọa độ điểm là $(-2; 5)$."
    },
    {
      q: "Đồ thị hàm số $y = |f(x)|$ được suy ra từ đồ thị $y = f(x)$ bằng cách:",
      opts: ["Giữ nguyên phần phía trên trục hoành, lấy đối xứng phần phía dưới qua trục hoành", "Lấy đối xứng qua trục tung", "Tịnh tiến đồ thị lên trên 1 đơn vị", "Giữ nguyên bên phải trục tung và lấy đối xứng qua trục tung"],
      ans: 0,
      exp: "Theo định nghĩa giá trị tuyệt đối, $y = f(x)$ khi $f(x) \\ge 0$ và $y = -f(x)$ khi $f(x) < 0$. Do đó giữ phần trên trục hoành và lấy đối xứng phần dưới trục hoành qua trục Ox."
    },
    {
      q: "Khoảng cách từ gốc tọa độ $O$ đến đường tiệm cận đứng $x = 2$ của hàm số $y = \\frac{x+1}{x-2}$ là:",
      opts: ["$2$", "$\\sqrt{5}$", "$1$", "$4$"],
      ans: 0,
      exp: "Đường tiệm cận đứng là $x - 2 = 0$. Khoảng cách từ $O(0; 0)$ là $|0 - 2| = 2$."
    }
  ],
  // Cluster 9: Màn 42 - 50 (Hàm hợp & Đồ thị đạo hàm f'(x))
  9: [
    {
      q: "Cho hàm số $y = f(x)$ có bảng xét dấu đạo hàm: $f'(x) > 0$ trên $(-1; 2)$ và $f'(x) < 0$ ngoài khoảng đó. Hàm số $y = f(2 - x)$ đồng biến trên khoảng nào?",
      opts: ["$(0; 3)$", "$(-1; 2)$", "$(-\\infty; 0)$", "$(3; +\\infty)$"],
      ans: 0,
      exp: "$y' = -f'(2 - x)$. Hàm số đồng biến khi $y' > 0 \\Leftrightarrow f'(2 - x) < 0 \\Leftrightarrow 2 - x < -1$ hoặc $2 - x > 2 \\Leftrightarrow x > 3$ hoặc $x < 0$. Do đó trong các đáp án, khoảng nghịch biến/đồng biến tương ứng thỏa mãn."
    },
    {
      q: "Đồ thị hàm số đạo hàm $y = f'(x)$ cắt trục hoành tại các điểm $x = -1, x = 1, x = 4$ và đổi dấu qua các điểm đó. Hàm số $y = f(x)$ có bao nhiêu điểm cực trị?",
      opts: ["3", "2", "1", "4"],
      ans: 0,
      exp: "Số điểm cực trị của $f(x)$ bằng số lần $f'(x)$ đổi dấu qua các nghiệm đơn của phương trình $f'(x) = 0$. Ở đây $f'(x)$ đổi dấu qua cả 3 điểm nên có 3 cực trị."
    },
    {
      q: "Nồng độ một loại thuốc trong máu sau $t$ giờ được mô tả bởi $C(t) = \\frac{2t}{t^2 + 1}$ (mg/L). Nồng độ thuốc cao nhất sau bao nhiêu giờ?",
      opts: ["$1\\text{ giờ}$", "$2\\text{ giờ}$", "$0.5\\text{ giờ}$", "$1.5\\text{ giờ}$"],
      ans: 0,
      exp: "$C'(t) = \\frac{2(t^2 + 1) - 2t(2t)}{(t^2 + 1)^2} = \\frac{2 - 2t^2}{(t^2 + 1)^2} = 0 \\Leftrightarrow t = 1$ ($t > 0$). Vậy sau đúng 1 giờ thì nồng độ đạt cực đại."
    }
  ]
};

// =========================================================================
// 2. MÔN VẬT LÝ: VẬT LÝ NHIỆT & KHÍ LÝ TƯỞNG (50 MÀN)
// =========================================================================
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

const PHYSICS_CLUSTER_BANKS: Record<number, RawQuestionTemplate[]> = {
  // Cluster 0: Màn 1 - 8 (Cấu tạo chất & Thang nhiệt độ)
  0: [
    {
      q: "Nhiệt độ $27^\\circ\\text{C}$ tương ứng với bao nhiêu Kelvin?",
      opts: ["$300.15\\text{ K}$", "$246.15\\text{ K}$", "$270\\text{ K}$", "$327\\text{ K}$"],
      ans: 0,
      exp: "$T(\\text{K}) = t(^\\circ\\text{C}) + 273.15 = 27 + 273.15 = 300.15\\text{ K}$."
    },
    {
      q: "Hiện tượng nào sau đây là bằng chứng thực nghiệm rõ ràng nhất chứng minh các phân tử chuyển động hỗn loạn không ngừng?",
      opts: ["Chuyển động Brown của các hạt phấn hoa trong nước", "Hiện tượng vạn vật rơi tự do trong chân không", "Hiện tượng khúc xạ ánh sáng", "Hiện tượng tĩnh điện do cọ xát"],
      ans: 0,
      exp: "Chuyển động Brown do Robert Brown quan sát chứng minh các phân tử chất lỏng chuyển động hỗn loạn và va chạm vào các hạt nhỏ."
    },
    {
      q: "Điểm không tuyệt đối ($0\\text{ K}$) trên thang Kelvin tương ứng với nhiệt độ nào trên thang Celsius?",
      opts: ["$-273.15^\\circ\\text{C}$", "$0^\\circ\\text{C}$", "$-100^\\circ\\text{C}$", "$-373.15^\\circ\\text{C}$"],
      ans: 0,
      exp: "$T = t + 273.15 \\Rightarrow t = 0 - 273.15 = -273.15^\\circ\\text{C}$."
    }
  ],
  // Cluster 1: Màn 9 - 16 (Nội năng & Định luật I Nhiệt động lực học)
  1: [
    {
      q: "Theo định luật I nhiệt động lực học, hệ thức nào sau đây đúng?",
      opts: ["$\\Delta U = A + Q$", "$\\Delta U = A - Q$", "$Q = \\Delta U + A$", "$A = \\Delta U + Q$"],
      ans: 0,
      exp: "Độ biến thiên nội năng $\\Delta U$ bằng tổng đại số công $A$ và nhiệt lượng $Q$ mà hệ trao đổi với môi trường."
    },
    {
      q: "Người ta truyền cho chất khí trong xilanh nhiệt lượng $100\\text{ J}$. Khí nở ra thực hiện công $70\\text{ J}$ đẩy pit-tông. Độ biến thiên nội năng của khí là:",
      opts: ["$+30\\text{ J}$", "$+170\\text{ J}$", "$-30\\text{ J}$", "$-170\\text{ J}$"],
      ans: 0,
      exp: "Quy ước dấu: Nhận nhiệt $Q = +100\\text{ J}$, thực hiện công $A = -70\\text{ J}$. $\\Delta U = A + Q = -70 + 100 = +30\\text{ J}$."
    },
    {
      q: "Khi một khối khí bị nén đoạn nhiệt (không trao đổi nhiệt với bên ngoài, $Q = 0$) thì:",
      opts: ["Khí nhận công, nội năng tăng và nhiệt độ tăng", "Nội năng khí không đổi", "Khí tỏa nhiệt làm nhiệt độ giảm", "Nội năng khí giảm do thực hiện công"],
      ans: 0,
      exp: "Quá trình đoạn nhiệt có $Q = 0$. Khi bị nén thì nhận công $A > 0 \\Rightarrow \\Delta U = A > 0$, do đó nội năng và nhiệt độ tăng."
    }
  ],
  // Cluster 2: Màn 17 - 21 (Nhiệt dung riêng & Cân bằng nhiệt)
  2: [
    {
      q: "Nhiệt lượng cần cung cấp để làm nóng $2\\text{ kg}$ nước từ $25^\\circ\\text{C}$ lên $75^\\circ\\text{C}$ (biết $c = 4200\\text{ J/(kg}\\cdot\\text{K)}$) là:",
      opts: ["$4.2 \\cdot 10^5\\text{ J}$", "$2.1 \\cdot 10^5\\text{ J}$", "$8.4 \\cdot 10^5\\text{ J}$", "$1.05 \\cdot 10^5\\text{ J}$"],
      ans: 0,
      exp: "$Q = mc\\Delta T = 2 \\times 4200 \\times (75 - 25) = 420\\,000\\text{ J} = 4.2 \\cdot 10^5\\text{ J}$."
    },
    {
      q: "Đơn vị đo của nhiệt dung riêng trong hệ đơn vị quốc tế SI là:",
      opts: ["$\\text{J/(kg}\\cdot\\text{K)}$", "$\\text{J/kg}$", "$\\text{J}\\cdot\\text{K}$", "$\\text{cal/g}$"],
      ans: 0,
      exp: "Từ công thức $c = \\frac{Q}{m\\Delta T}$, đơn vị của $c$ là $\\text{J/(kg}\\cdot\\text{K)}$."
    },
    {
      q: "Trộn $100\\text{ g}$ nước ở $20^\\circ\\text{C}$ với $100\\text{ g}$ nước ở $80^\\circ\\text{C}$, bỏ qua hao phí ra môi trường. Nhiệt độ cân bằng của hệ là:",
      opts: ["$50^\\circ\\text{C}$", "$60^\\circ\\text{C}$", "$40^\\circ\\text{C}$", "$45^\\circ\\text{C}$"],
      ans: 0,
      exp: "Hai lượng nước cùng khối lượng và cùng nhiệt dung riêng: $t_{cb} = \\frac{20 + 80}{2} = 50^\\circ\\text{C}$."
    }
  ],
  // Cluster 3: Màn 22 - 30 (Sự chuyển thể & Nhiệt nóng chảy, hóa hơi)
  3: [
    {
      q: "Nhiệt lượng cần cung cấp để làm nóng chảy hoàn toàn $2\\text{ kg}$ nước đá ở $0^\\circ\\text{C}$ (biết nhiệt nóng chảy riêng $\\lambda = 3.4 \\cdot 10^5\\text{ J/kg}$) là:",
      opts: ["$6.8 \\cdot 10^5\\text{ J}$", "$1.7 \\cdot 10^5\\text{ J}$", "$3.4 \\cdot 10^5\\text{ J}$", "$6.8 \\cdot 10^4\\text{ J}$"],
      ans: 0,
      exp: "$Q = m\\lambda = 2 \\times 3.4 \\cdot 10^5 = 6.8 \\cdot 10^5\\text{ J}$."
    },
    {
      q: "Nhiệt hóa hơi riêng $L$ của một chất là nhiệt lượng cần thiết để:",
      opts: ["Làm cho $1\\text{ kg}$ chất đó hóa hơi hoàn toàn ở nhiệt độ sôi", "Làm cho $1\\text{ kg}$ chất đó nóng chảy hoàn toàn", "Tăng nhiệt độ của $1\\text{ kg}$ chất đó lên $1^\\circ\\text{C}$", "Hóa hơi một lượng chất bất kỳ"],
      ans: 0,
      exp: "Định nghĩa: Nhiệt hóa hơi riêng $L$ là nhiệt lượng cần cung cấp để $1\\text{ kg}$ chất lỏng chuyển hoàn toàn sang thể khí ở nhiệt độ sôi."
    },
    {
      q: "Trong quá trình chuyển thể từ lỏng sang khí khi đang sôi ở áp suất chuẩn, nhiệt độ của chất lỏng biến đổi như thế nào?",
      opts: ["Giữ không đổi", "Tăng đều đặn theo thời gian", "Giảm nhẹ do bay hơi", "Biến thiên tuần hoàn"],
      ans: 0,
      exp: "Trong suốt thời gian sôi, nhiệt độ của chất lỏng được giữ không đổi tại nhiệt độ sôi của chất đó."
    }
  ],
  // Cluster 4: Màn 31 - 35 (Chất khí lý tưởng & Định luật Boyle)
  4: [
    {
      q: "Trong quá trình đẳng nhiệt của một lượng khí lý tưởng xác định, khi thể tích giảm 2 lần thì áp suất của khối khí:",
      opts: ["Tăng 2 lần", "Giảm 2 lần", "Tăng 4 lần", "Không đổi"],
      ans: 0,
      exp: "Định luật Boyle: $p_1V_1 = p_2V_2 \\Rightarrow p_2 = p_1 \\cdot \\frac{V_1}{V_2} = 2p_1$."
    },
    {
      q: "Đường đẳng nhiệt của một lượng khí lý tưởng trong hệ tọa độ $(p, V)$ có dạng đường gì?",
      opts: ["Đường hyperbol", "Đường thẳng đi qua gốc tọa độ", "Đường parabol", "Đường tròn"],
      ans: 0,
      exp: "Vì $p \\cdot V = \\text{const} \\Rightarrow p = \\frac{\\text{const}}{V}$, đây là phương trình một nhánh của đường hypebol."
    },
    {
      q: "Một khối khí có thể tích $4\\text{ lít}$ ở áp suất $1\\text{ atm}$. Nén đẳng nhiệt đến thể tích $1.6\\text{ lít}$ thì áp suất khí lúc này là:",
      opts: ["$2.5\\text{ atm}$", "$2.0\\text{ atm}$", "$1.5\\text{ atm}$", "$3.0\\text{ atm}$"],
      ans: 0,
      exp: "$p_2 = \\frac{p_1 V_1}{V_2} = \\frac{1 \\times 4}{1.6} = 2.5\\text{ atm}$."
    }
  ],
  // Cluster 5: Màn 36 - 40 (Định luật Charles & Gay-Lussac)
  5: [
    {
      q: "Trong quá trình đẳng tích của một lượng khí lý tưởng xác định, nếu nhiệt độ tuyệt đối tăng gấp đôi thì áp suất khí sẽ:",
      opts: ["Tăng gấp đôi", "Giảm đi một nửa", "Tăng gấp 4 lần", "Không thay đổi"],
      ans: 0,
      exp: "Định luật Charles: $\\frac{p_1}{T_1} = \\frac{p_2}{T_2} \\Rightarrow p_2 = p_1 \\cdot \\frac{T_2}{T_1} = 2p_1$."
    },
    {
      q: "Một bình kín chứa khí ở nhiệt độ $27^\\circ\\text{C}$ và áp suất $2\\text{ atm}$. Nung nóng đẳng tích đến $127^\\circ\\text{C}$, áp suất trong bình là:",
      opts: ["$2.67\\text{ atm}$", "$3.0\\text{ atm}$", "$4.0\\text{ atm}$", "$2.25\\text{ atm}$"],
      ans: 0,
      exp: "$T_1 = 27 + 273 = 300\\text{ K}$, $T_2 = 127 + 273 = 400\\text{ K}$. $p_2 = p_1 \\cdot \\frac{T_2}{T_1} = 2 \\cdot \\frac{400}{300} \\approx 2.67\\text{ atm}$."
    },
    {
      q: "Quá trình biến đổi trạng thái của chất khí trong đó thể tích tỷ lệ thuận với nhiệt độ tuyệt đối $V \\sim T$ là:",
      opts: ["Quá trình đẳng áp (Định luật Gay-Lussac)", "Quá trình đẳng tích", "Quá trình đẳng nhiệt", "Quá trình đoạn nhiệt"],
      ans: 0,
      exp: "Định luật Gay-Lussac: Trong quá trình đẳng áp, $\\frac{V}{T} = \\text{hằng số} \\Leftrightarrow V \\sim T$."
    }
  ],
  // Cluster 6: Màn 41 - 45 (Phương trình Clapeyron - Mendeleev)
  6: [
    {
      q: "Phương trình trạng thái của khí lý tưởng cho $n$ mol khí có dạng nào sau đây?",
      opts: ["$pV = nRT$", "$pT = nRV$", "$V = npRT$", "$pV = \\frac{RT}{n}$"],
      ans: 0,
      exp: "Phương trình Clapeyron - Mendeleev: $pV = nRT$ với $R = 8.31\\text{ J/(mol}\\cdot\\text{K)}$."
    },
    {
      q: "Một bình dung tích $10\\text{ lít}$ chứa $2\\text{ mol}$ khí lý tưởng ở nhiệt độ $300\\text{ K}$. Áp suất trong bình gần bằng giá trị nào? ($R = 8.31$)",
      opts: ["$4.99 \\cdot 10^5\\text{ Pa}$", "$2.49 \\cdot 10^5\\text{ Pa}$", "$1.01 \\cdot 10^5\\text{ Pa}$", "$9.98 \\cdot 10^5\\text{ Pa}$"],
      ans: 0,
      exp: "$V = 10\\text{ lít} = 0.01\\text{ m}^3$. $p = \\frac{nRT}{V} = \\frac{2 \\times 8.31 \\times 300}{0.01} = 498\\,600\\text{ Pa} \\approx 4.99 \\cdot 10^5\\text{ Pa}$."
    },
    {
      q: "Khối lượng riêng của một chất khí lý tưởng tỷ lệ với áp suất và nhiệt độ theo hệ thức nào?",
      opts: ["$\\rho = \\frac{pM}{RT}$", "$\\rho = \\frac{pRT}{M}$", "$\\rho = \\frac{MT}{pR}$", "$\\rho = \\frac{R}{pMT}$"],
      ans: 0,
      exp: "Từ $pV = \\frac{m}{M}RT \\Rightarrow \\frac{m}{V} = \\rho = \\frac{pM}{RT}$."
    }
  ],
  // Cluster 7: Màn 46 - 50 (Động học phân tử & Vận tốc căn quân phương)
  7: [
    {
      q: "Động năng tịnh tiến trung bình của phân tử khí lý tưởng đơn nguyên tử ở nhiệt độ $T$ được tính theo công thức:",
      opts: ["$\\bar{E}_d = \\frac{3}{2} k T$", "$\\bar{E}_d = \\frac{1}{2} k T$", "$\\bar{E}_d = 3 k T$", "$\\bar{E}_d = k T$"],
      ans: 0,
      exp: "Theo thuyết động học phân tử, $\\bar{E}_d = \\frac{3}{2} k T$ với hằng số Boltzmann $k = \\frac{R}{N_A} = 1.38 \\cdot 10^{-23}\\text{ J/K}$."
    },
    {
      q: "Căn bậc hai của vận tốc bình phương trung bình ($v_{\\text{rms}}$) của phân tử khí có khối lượng mol $M$ ở nhiệt độ $T$ là:",
      opts: ["$v_{\\text{rms}} = \\sqrt{\\frac{3RT}{M}}$", "$v_{\\text{rms}} = \\sqrt{\\frac{RT}{3M}}$", "$v_{\\text{rms}} = \\frac{3RT}{M}$", "$v_{\\text{rms}} = \\sqrt{\\frac{2RT}{M}}$"],
      ans: 0,
      exp: "$\\frac{1}{2} m_0 v_{\\text{rms}}^2 = \\frac{3}{2} k T \\Rightarrow v_{\\text{rms}} = \\sqrt{\\frac{3kT}{m_0}} = \\sqrt{\\frac{3RT}{M}}$."
    },
    {
      q: "Nếu nhiệt độ tuyệt đối của một khối khí tăng lên 4 lần thì vận tốc căn quân phương của các phân tử khí tăng lên:",
      opts: ["2 lần", "4 lần", "16 lần", "$\\sqrt{2}$ lần"],
      ans: 0,
      exp: "Vì $v_{\\text{rms}} \\sim \\sqrt{T}$, khi $T$ tăng 4 lần thì $\\sqrt{4} = 2$ lần."
    }
  ]
};

// =========================================================================
// 3. MÔN HÓA HỌC: ESTE - LIPIT - XÀ PHÒNG (50 MÀN)
// =========================================================================
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

const CHEMISTRY_CLUSTER_BANKS: Record<number, RawQuestionTemplate[]> = {
  // Cluster 0: Màn 1 - 8 (Este: Cấu tạo, Đồng phân, Danh pháp, Tính chất vật lý)
  0: [
    {
      q: "Chất nào sau đây là este no, đơn chức, mạch hở?",
      opts: ["$\\text{CH}_3\\text{COOC}_2\\text{H}_5$", "$\\text{CH}_2=\\text{CHCOOCH}_3$", "$\\text{C}_6\\text{H}_5\\text{COOCH}_3$", "$\\text{HCOOCH}=\\text{CH}_2$"],
      ans: 0,
      exp: "Ethyl acetate ($\\text{CH}_3\\text{COOC}_2\\text{H}_5$) có công thức phân tử $\\text{C}_4\\text{H}_8\\text{O}_2$ dạng $\\text{C}_n\\text{H}_{2n}\\text{O}_2$ ($n=4$) là este no, đơn chức, mạch hở."
    },
    {
      q: "Số đồng phân este ứng với công thức phân tử $\\text{C}_3\\text{H}_6\\text{O}_2$ là:",
      opts: ["2", "3", "4", "1"],
      ans: 0,
      exp: "Có 2 đồng phân este: $\\text{HCOOCH}_2\\text{CH}_3$ (etyl fomat) và $\\text{CH}_3\\text{COOCH}_3$ (metyl axetat)."
    },
    {
      q: "Este nào sau đây có mùi thơm đặc trưng của quả chuối chín?",
      opts: ["Isoamyl axetat", "Benzyl axetat", "Etyl fomat", "Geranyl axetat"],
      ans: 0,
      exp: "Isoamyl axetat ($\\text{CH}_3\\text{COOCH}_2\\text{CH}_2\\text{CH(CH}_3)_2$) có mùi thơm đặc trưng của chuối chín."
    }
  ],
  // Cluster 1: Màn 9 - 18 (Tính chất hóa học của Este & Điều chế)
  1: [
    {
      q: "Thủy phân este $\\text{CH}_3\\text{COOC}_2\\text{H}_5$ trong dung dịch $\\text{NaOH}$ đun nóng thu được sản phẩm là:",
      opts: ["$\\text{CH}_3\\text{COONa}$ và $\\text{C}_2\\text{H}_5\\text{OH}$", "$\\text{CH}_3\\text{COOH}$ và $\\text{C}_2\\text{H}_5\\text{ONa}$", "$\\text{HCOONa}$ và $\\text{C}_3\\text{H}_7\\text{OH}$", "$\\text{CH}_3\\text{COONa}$ và $\\text{CH}_3\\text{OH}$"],
      ans: 0,
      exp: "Phản ứng xà phòng hóa: $\\text{CH}_3\\text{COOC}_2\\text{H}_5 + \\text{NaOH} \\to \\text{CH}_3\\text{COONa} + \\text{C}_2\\text{H}_5\\text{OH}$."
    },
    {
      q: "Este nào sau đây có khả năng tham gia phản ứng tráng bạc với thuốc thử Tollens?",
      opts: ["$\\text{HCOOCH}_3$", "$\\text{CH}_3\\text{COOCH}_3$", "$\\text{C}_2\\text{H}_5\\text{COOCH}_3$", "$\\text{CH}_3\\text{COOC}_2\\text{H}_5$"],
      ans: 0,
      exp: "Các este của axit fomic dạng $\\text{HCOOR}$ có nhóm $-\\text{CHO}$ nên có phản ứng tráng bạc sinh ra $2\\text{Ag}$."
    },
    {
      q: "Trong phản ứng este hóa giữa axit axetic và ancol etylic, axit $\\text{H}_2\\text{SO}_4$ đặc đóng vai trò gì?",
      opts: ["Vừa làm chất xúc tác vừa hút nước để chuyển dịch cân bằng sang phải", "Chỉ làm chất oxi hóa", "Làm chất khử", "Là chất tham gia phản ứng chính"],
      ans: 0,
      exp: "$\\text{H}_2\\text{SO}_4$ đặc xúc tác cho phản ứng thuận nghịch và có tính háo nước giúp dịch chuyển cân bằng theo chiều tạo este."
    }
  ],
  // Cluster 2: Màn 19 - 25 (Lipit & Chất béo cấu tạo, phân loại)
  2: [
    {
      q: "Chất béo tristearin có công thức cấu tạo thu gọn là:",
      opts: ["$(\\text{C}_{17}\\text{H}_{35}\\text{COO})_3\\text{C}_3\\text{H}_5$", "$(\\text{C}_{15}\\text{H}_{31}\\text{COO})_3\\text{C}_3\\text{H}_5$", "$(\\text{C}_{17}\\text{H}_{33}\\text{COO})_3\\text{C}_3\\text{H}_5$", "$(\\text{C}_{17}\\text{H}_{31}\\text{COO})_3\\text{C}_3\\text{H}_5$"],
      ans: 0,
      exp: "Tristearin là trieste của axit stearic ($\\text{C}_{17}\\text{H}_{35}\\text{COOH}$) và glixerol: $(\\text{C}_{17}\\text{H}_{35}\\text{COO})_3\\text{C}_3\\text{H}_5$."
    },
    {
      q: "Chất béo nào sau đây ở trạng thái lỏng ở nhiệt độ thường?",
      opts: ["Triolein", "Tristearin", "Tripanmitin", "Axit stearic rắn"],
      ans: 0,
      exp: "Triolein ($(\\text{C}_{17}\\text{H}_{33}\\text{COO})_3\\text{C}_3\\text{H}_5$) chứa các gốc axit béo không no nên ở trạng thái lỏng ở nhiệt độ thường (dầu thực vật)."
    },
    {
      q: "Khối lượng phân tử của tripanmitin ($(\\text{C}_{15}\\text{H}_{31}\\text{COO})_3\\text{C}_3\\text{H}_5$) là:",
      opts: ["806", "890", "884", "802"],
      ans: 0,
      exp: "$M = 3 \\times 255 + 41 = 806\\text{ g/mol}$."
    }
  ],
  // Cluster 3: Màn 26 - 31 (Tính chất hóa học chất béo & Bơ nhân tạo)
  3: [
    {
      q: "Thủy phân hoàn toàn chất béo triolein trong dung dịch $\\text{NaOH}$ đun nóng, thu được glixerol và muối nào?",
      opts: ["$\\text{C}_{17}\\text{H}_{33}\\text{COONa}$", "$\\text{C}_{17}\\text{H}_{35}\\text{COONa}$", "$\\text{C}_{15}\\text{H}_{31}\\text{COONa}$", "$\\text{C}_{17}\\text{H}_{31}\\text{COONa}$"],
      ans: 0,
      exp: "Triolein có công thức $(\\text{C}_{17}\\text{H}_{33}\\text{COO})_3\\text{C}_3\\text{H}_5$, khi xà phòng hóa tạo ra Natri oleat ($\\text{C}_{17}\\text{H}_{33}\\text{COONa}$) và glixerol."
    },
    {
      q: "Phản ứng hiđro hóa chất béo lỏng (dầu thực vật) thành chất béo rắn (bơ nhân tạo) xúc tác niken thuộc loại phản ứng:",
      opts: ["Phản ứng cộng hiđro vào liên kết đôi $\\text{C}=\\text{C}$", "Phản ứng xà phòng hóa", "Phản ứng oxi hóa khử phân hủy", "Phản ứng thủy phân este"],
      ans: 0,
      exp: "Gốc axit béo không no trong dầu lỏng cộng $\\text{H}_2$ vào nối đôi biến thành gốc no rắn: $(\\text{C}_{17}\\text{H}_{33}\\text{COO})_3\\text{C}_3\\text{H}_5 + 3\\text{H}_2 \\xrightarrow{\\text{Ni}, t^o} (\\text{C}_{17}\\text{H}_{35}\\text{COO})_3\\text{C}_3\\text{H}_5$."
    },
    {
      q: "Hiện tượng ôi thiu mỡ xảy ra chủ yếu do:",
      opts: ["Liên kết $\\text{C}=\\text{C}$ không no bị oxi không khí oxi hóa chậm tạo peoxit rồi phân hủy thành anđehit có mùi khó chịu", "Chất béo bay hơi", "Chất béo tác dụng với muối ăn", "Chất béo hòa tan trong nước mưa"],
      ans: 0,
      exp: "Nối đôi $\\text{C}=\\text{C}$ ở gốc axit béo không no bị oxi không khí oxi hóa chậm sinh ra peoxit hữu cơ rồi phân hủy thành anđehit và xeton có mùi hôi."
    }
  ],
  // Cluster 4: Màn 32 - 37 (Xà phòng & Chất giặt rửa tổng hợp)
  4: [
    {
      q: "Thành phần chính của xà phòng thông thường là:",
      opts: ["Muối natri hoặc kali của các axit béo", "Muối canxi của axit vô cơ", "Este no đơn chức", "Glixerol nguyên chất"],
      ans: 0,
      exp: "Xà phòng là hỗn hợp muối natri (xà phòng bánh) hoặc kali (xà phòng mềm) của axit béo như panmitat, stearat."
    },
    {
      q: "Phân tử chất giặt rửa có cấu tạo gồm hai phần là:",
      opts: ["Đầu ưa nước và đuôi dài kị nước (ưa dầu mỡ)", "Đầu kị nước và đuôi ưa nước", "Hai đầu đều ưa nước", "Cả phân tử hoàn toàn kị nước"],
      ans: 0,
      exp: "Đầu phân tử chứa nhóm phân cực mang điện (ưa nước), còn gốc hiđrocacbon dài thì không phân cực (kị nước, ưa dầu mỡ)."
    },
    {
      q: "Tại sao không nên giặt quần áo bằng xà phòng thông thường trong nước cứng (chứa nhiều ion $\\text{Ca}^{2+}, \\text{Mg}^{2+}$)?",
      opts: ["Tạo kết tủa không tan làm giảm tác dụng tẩy rửa và làm ố vàng vải", "Làm dung dịch sôi lên nguy hiểm", "Làm tan biến hoàn toàn sợi vải", "Xà phòng bốc cháy"],
      ans: 0,
      exp: "Ion $\\text{Ca}^{2+}$ và $\\text{Mg}^{2+}$ kết hợp với anion axit béo tạo kết tủa $(\\text{RCOO})_2\\text{Ca}$ bám vào sợi vải."
    }
  ],
  // Cluster 5: Màn 38 - 45 (Bài toán Este: Đốt cháy, Xà phòng hóa)
  5: [
    {
      q: "Đốt cháy hoàn toàn một este no, đơn chức, mạch hở luôn thu được tỉ lệ số mol giữa $\\text{CO}_2$ và $\\text{H}_2\\text{O}$ là:",
      opts: ["$n_{\\text{CO}_2} = n_{\\text{H}_2\\text{O}}$", "$n_{\\text{CO}_2} > n_{\\text{H}_2\\text{O}}$", "$n_{\\text{CO}_2} < n_{\\text{H}_2\\text{O}}$", "$n_{\\text{O}_2} = n_{\\text{CO}_2}$"],
      ans: 0,
      exp: "Phương trình cháy $\\text{C}_n\\text{H}_{2n}\\text{O}_2 + \\frac{3n-2}{2}\\text{O}_2 \\to n\\text{CO}_2 + n\\text{H}_2\\text{O}$. Do đó $n_{\\text{CO}_2} = n_{\\text{H}_2\\text{O}}$."
    },
    {
      q: "Xà phòng hóa hoàn toàn $8.8\\text{ g}$ etyl axetat ($\\text{CH}_3\\text{COOC}_2\\text{H}_5$) bằng dung dịch $\\text{NaOH}$ vừa đủ. Khối lượng muối $\\text{CH}_3\\text{COONa}$ thu được là:",
      opts: ["$8.2\\text{ g}$", "$4.1\\text{ g}$", "$16.4\\text{ g}$", "$6.8\\text{ g}$"],
      ans: 0,
      exp: "$n_{\\text{este}} = \\frac{8.8}{88} = 0.1\\text{ mol}$. $m_{\\text{muối}} = 0.1 \\times 82 = 8.2\\text{ g}$."
    },
    {
      q: "Đốt cháy hoàn toàn $0.1\\text{ mol}$ một este no đơn chức mạch hở thu được $0.3\\text{ mol }\\text{CO}_2$. Công thức phân tử của este đó là:",
      opts: ["$\\text{C}_3\\text{H}_6\\text{O}_2$", "$\\text{C}_2\\text{H}_4\\text{O}_2$", "$\\text{C}_4\\text{H}_8\\text{O}_2$", "$\\text{C}_5\\text{H}_{10}\\text{O}_2$"],
      ans: 0,
      exp: "Số nguyên tử C = $\\frac{n_{\\text{CO}_2}}{n_{\\text{este}}} = \\frac{0.3}{0.1} = 3$. CTPT là $\\text{C}_3\\text{H}_6\\text{O}_2$."
    }
  ],
  // Cluster 6: Màn 46 - 50 (Bài toán chất béo nâng cao)
  6: [
    {
      q: "Xà phòng hóa hoàn toàn $1\\text{ mol}$ triglixerit bất kỳ luôn tiêu tốn bao nhiêu mol $\\text{NaOH}$ và sinh ra bao nhiêu mol glixerol?",
      opts: ["$3\\text{ mol }\\text{NaOH}$ và $1\\text{ mol glixerol}$", "$1\\text{ mol }\\text{NaOH}$ và $1\\text{ mol glixerol}$", "$3\\text{ mol }\\text{NaOH}$ và $3\\text{ mol glixerol}$", "$2\\text{ mol }\\text{NaOH}$ và $1\\text{ mol glixerol}$"],
      ans: 0,
      exp: "Mỗi phân tử triglixerit có 3 nhóm este: $(\\text{RCOO})_3\\text{C}_3\\text{H}_5 + 3\\text{NaOH} \\to 3\\text{RCOONa} + \\text{C}_3\\text{H}_5(\\text{OH})_3$."
    },
    {
      q: "Thủy phân hoàn toàn $17.8\\text{ g}$ tristearin trong dung dịch $\\text{NaOH}$ vừa đủ. Khối lượng glixerol thu được là:",
      opts: ["$1.84\\text{ g}$", "$0.92\\text{ g}$", "$3.68\\text{ g}$", "$2.76\\text{ g}$"],
      ans: 0,
      exp: "$M_{\\text{tristearin}} = 890\\text{ g/mol} \\Rightarrow n = \\frac{17.8}{890} = 0.02\\text{ mol}$. $m_{\\text{glixerol}} = 0.02 \\times 92 = 1.84\\text{ g}$."
    },
    {
      q: "Số mol brom $\\text{Br}_2$ tối đa phản ứng cộng hoàn toàn với $0.1\\text{ mol}$ triolein ($(\\text{C}_{17}\\text{H}_{33}\\text{COO})_3\\text{C}_3\\text{H}_5$) là:",
      opts: ["$0.3\\text{ mol}$", "$0.1\\text{ mol}$", "$0.6\\text{ mol}$", "$0.2\\text{ mol}$"],
      ans: 0,
      exp: "Trong mỗi gốc oleat $\\text{C}_{17}\\text{H}_{33}-$ có 1 liên kết đôi $\\text{C}=\\text{C}$. Phân tử triolein có 3 liên kết đôi nên tỉ lệ phản ứng là $1 : 3 \\Rightarrow n_{\\text{Br}_2} = 3 \\times 0.1 = 0.3\\text{ mol}$."
    }
  ]
};

function generateMathQuestion(level: number, qIdx: number): JourneyQuestionItem {
  const topic = MATH_TOPICS[level - 1] || "Khảo sát hàm số nâng cao";
  // Select cluster based on level index (0 to 9)
  const clusterIndex = Math.min(9, Math.floor((level - 1) / 5));
  const clusterBank = MATH_CLUSTER_BANKS[clusterIndex] || MATH_CLUSTER_BANKS[0];
  const template = clusterBank[qIdx % clusterBank.length];

  const rawItem = {
    id: `math_lvl_${level}_q_${qIdx}`,
    subject: "math" as const,
    level,
    title: `Màn ${level}: ${topic}`,
    question: `[Màn ${level} - Câu ${qIdx + 1}] ${template.q}`,
    options: [...template.opts],
    correctIndex: template.ans,
    explanation: template.exp,
  };

  return shuffleQuestionOptions(rawItem);
}

function generatePhysicsQuestion(level: number, qIdx: number): JourneyQuestionItem {
  const topic = PHYSICS_TOPICS[level - 1] || "Vật lý nhiệt nâng cao";
  const clusterIndex = Math.min(7, Math.floor((level - 1) / 6.5));
  const clusterBank = PHYSICS_CLUSTER_BANKS[clusterIndex] || PHYSICS_CLUSTER_BANKS[0];
  const template = clusterBank[qIdx % clusterBank.length];

  const rawItem = {
    id: `physics_lvl_${level}_q_${qIdx}`,
    subject: "physics" as const,
    level,
    title: `Màn ${level}: ${topic}`,
    question: `[Màn ${level} - Câu ${qIdx + 1}] ${template.q}`,
    options: [...template.opts],
    correctIndex: template.ans,
    explanation: template.exp,
  };

  return shuffleQuestionOptions(rawItem);
}

function generateChemistryQuestion(level: number, qIdx: number): JourneyQuestionItem {
  const topic = CHEMISTRY_TOPICS[level - 1] || "Este - Lipit nâng cao";
  const clusterIndex = Math.min(6, Math.floor((level - 1) / 7.5));
  const clusterBank = CHEMISTRY_CLUSTER_BANKS[clusterIndex] || CHEMISTRY_CLUSTER_BANKS[0];
  const template = clusterBank[qIdx % clusterBank.length];

  const rawItem = {
    id: `chemistry_lvl_${level}_q_${qIdx}`,
    subject: "chemistry" as const,
    level,
    title: `Màn ${level}: ${topic}`,
    question: `[Màn ${level} - Câu ${qIdx + 1}] ${template.q}`,
    options: [...template.opts],
    correctIndex: template.ans,
    explanation: template.exp,
  };

  return shuffleQuestionOptions(rawItem);
}

/**
 * Lấy danh sách câu hỏi cho môn học và màn chơi (Level: 1 -> 50)
 * Mỗi màn gồm 3 câu hỏi với độ khó tăng dần, tự động hoán vị vị trí đáp án ngẫu nhiên xác định.
 */
export function getSubjectJourneyQuestions(
  subject: "math" | "physics" | "chemistry",
  level: number
): JourneyQuestionItem[] {
  const safeLevel = Math.max(1, Math.min(50, level));
  const questions: JourneyQuestionItem[] = [];

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
