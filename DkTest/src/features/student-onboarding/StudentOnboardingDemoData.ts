/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  Exam,
  Question,
  Section,
  StructuredAiAnalysis,
  Submission,
} from "../../types";

export const DEMO_EXAM_ID = "__dktest_student_tutorial_exam__";

export const DEMO_QUESTIONS: Question[] = [
  // 1. Single Choice
  {
    id: "demo_q1",
    examId: DEMO_EXAM_ID,
    type: "single_choice",
    text: "Cho phương trình bậc nhất $2x + 4 = 10$. Nghiệm $x$ của phương trình là bao nhiêu?",
    options: [
      { id: "opt_1a", text: "$x = 2$" },
      { id: "opt_1b", text: "$x = 3$" },
      { id: "opt_1c", text: "$x = 4$" },
      { id: "opt_1d", text: "$x = 5$" },
    ],
    correctOptionIds: ["opt_1b"],
    points: 1.43,
    order: 0,
    explanation: "Giải phương trình:\n$$2x + 4 = 10 \\Leftrightarrow 2x = 6 \\Leftrightarrow x = 3$$\nVậy phương trình có nghiệm duy nhất là $x = 3$.",
  },

  // 2. Multiple Choice
  {
    id: "demo_q2",
    examId: DEMO_EXAM_ID,
    type: "multiple_choice",
    text: "Trong các số dưới đây, những số nào là số nguyên tố? *(Hãy chọn tất cả các đáp án đúng)*",
    options: [
      { id: "opt_2a", text: "$2$" },
      { id: "opt_2b", text: "$3$" },
      { id: "opt_2c", text: "$4$" },
      { id: "opt_2d", text: "$9$" },
    ],
    correctOptionIds: ["opt_2a", "opt_2b"],
    points: 1.43,
    order: 1,
    explanation: "Số nguyên tố là số tự nhiên lớn hơn 1 chỉ có hai ước dương là 1 và chính nó.\n- $2$ và $3$ là số nguyên tố.\n- $4$ chia hết cho 2 và $9$ chia hết cho 3 nên là hợp số.",
  },

  // 3. True / False
  {
    id: "demo_q3",
    examId: DEMO_EXAM_ID,
    type: "true_false",
    text: "Đánh giá tính Đúng hoặc Sai cho từng khẳng định hình học dưới đây:",
    statements: [
      {
        id: "stmt_3a",
        text: "Tam giác đều có 3 cạnh bằng nhau và 3 góc bằng nhau ($60^\\circ$)",
        correctAnswer: true,
      },
      {
        id: "stmt_3b",
        text: "Mọi hình thoi đều có 4 góc vuông",
        correctAnswer: false,
      },
      {
        id: "stmt_3c",
        text: "Tổng số đo ba góc trong một tam giác phẳng luôn bằng $180^\\circ$",
        correctAnswer: true,
      },
    ],
    points: 1.43,
    order: 2,
    explanation: "- Ý a: Đúng theo định nghĩa tam giác đều.\n- Ý b: Sai, hình thoi chỉ có 4 góc vuông khi nó là hình vuông.\n- Ý c: Đúng theo định lý tổng các góc trong tam giác phẳng.",
  },

  // 4. Short Answer
  {
    id: "demo_q4",
    examId: DEMO_EXAM_ID,
    type: "short_answer",
    text: "Tính giá trị của biểu thức số học: $P = \\sqrt{64} + 12$. Hãy nhập kết quả:",
    acceptedAnswers: ["20"],
    points: 1.43,
    order: 3,
    explanation: "Ta có $\\sqrt{64} = 8$. Do đó $P = 8 + 12 = 20$.",
  },

  // 5. Ordering
  {
    id: "demo_q5",
    examId: DEMO_EXAM_ID,
    type: "ordering",
    text: "Sắp xếp theo thứ tự đúng 4 bước cơ bản để giải bài toán bằng cách lập phương trình:",
    orderingItems: [
      { id: "ord_1", text: "Bước 1: Chọn ẩn số và đặt điều kiện thích hợp cho ẩn" },
      { id: "ord_2", text: "Bước 2: Biểu diễn các đại lượng chưa biết theo ẩn và các đại lượng đã biết" },
      { id: "ord_3", text: "Bước 3: Lập phương trình biểu thị mối quan hệ giữa các đại lượng" },
      { id: "ord_4", text: "Bước 4: Giải phương trình và đối chiếu điều kiện để kết luận" },
    ],
    correctOrder: ["ord_1", "ord_2", "ord_3", "ord_4"],
    points: 1.43,
    order: 4,
    explanation: "Trình tự chuẩn của phương pháp lập phương trình gồm 4 bước liên tiếp từ chọn ẩn đến kết luận.",
  },

  // 6. Fill in Blank
  {
    id: "demo_q6",
    examId: DEMO_EXAM_ID,
    type: "fill_blank",
    text: "Ở điều kiện chuẩn, nước tinh khiết sôi ở nhiệt độ [_] độ C và đông đặc ở [_] độ C.",
    acceptedAnswersPerBlank: {
      0: ["100"],
      1: ["0"],
    },
    points: 1.43,
    order: 5,
    explanation: "Theo thang đo nhiệt độ Celsius tiêu chuẩn, điểm sôi của nước là 100°C và điểm đóng băng là 0°C.",
  },

  // 7. Matching
  {
    id: "demo_q7",
    examId: DEMO_EXAM_ID,
    type: "matching",
    text: "Nối mỗi biểu thức ở Cột 1 với kết quả giá trị tương ứng ở Cột 2:",
    matchingLeft: [
      { id: "left_1", label: "1", text: "$2^3$" },
      { id: "left_2", label: "2", text: "$\\sqrt{49}$" },
      { id: "left_3", label: "3", text: "$5 \\times 6$" },
    ],
    matchingRight: [
      { id: "right_a", label: "a", text: "$7$" },
      { id: "right_b", label: "b", text: "$8$" },
      { id: "right_c", label: "c", text: "$30$" },
    ],
    correctMatches: {
      left_1: "right_b",
      left_2: "right_a",
      left_3: "right_c",
    },
    points: 1.43,
    order: 6,
    explanation: "Tính toán từng mục:\n- $2^3 = 8$ (1 nối b)\n- $\\sqrt{49} = 7$ (2 nối a)\n- $5 \\times 6 = 30$ (3 nối c)",
  },
];

export const DEMO_SECTION: Section = {
  id: "demo_sec_all",
  examId: DEMO_EXAM_ID,
  title: "Phần Tổng Hợp — 7 Dạng Câu Hỏi Toàn Diện DkTEST",
  description: "Trải nghiệm đầy đủ 7 dạng câu hỏi chuẩn khảo thí và toàn bộ công cụ phòng thi DkTEST.",
  order: 0,
  questionCount: 7,
  enabled: true,
};

export const DEMO_EXAM: Exam = {
  id: DEMO_EXAM_ID,
  title: "🎓 BÀI THI TRẢI NGHIỆM PHÒNG THI DkTEST (DEMO)",
  code: "DKTEST-TUTORIAL-7Q",
  description: "Bài thi mẫu được thiết kế để học sinh trải nghiệm toàn bộ tính năng phòng thi, bảng nháp, Casio và màn hình kết quả.",
  timeLimit: 15,
  duration: 15,
  questionCount: 7,
  totalQuestions: 7,
  maxScore: 10,
  shuffleQuestions: false,
  shuffleOptions: false,
  showResults: true,
  showScore: true,
  showDetails: true,
  allowSubExam: false,
  maxAttempts: 0,
  status: "published",
  questions: DEMO_QUESTIONS,
  sections: [DEMO_SECTION],
  createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
  updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
};

export const DEMO_AI_ANALYSIS: StructuredAiAnalysis = {
  summary:
    "Thí sinh đã hoàn thành xuất sắc buổi trải nghiệm DkTEST! Khả năng thao tác trên các định dạng câu hỏi linh hoạt, phân bổ thời gian hợp lý và làm quen nhanh chóng với các công cụ phòng thi.",
  sectionPerformance: [
    {
      sectionId: "demo_sec_1",
      title: "Phần Tổng Hợp — 7 Dạng Câu Hỏi Toàn Diện DkTEST",
      accuracy: 100,
      strength: "Nắm vững lý thuyết toán học cơ bản và phương pháp giải phương trình",
      weakness: "Tiếp tục duy trì sự cẩn thận khi đọc các câu hỏi nhiều lựa chọn",
      stability: "Tâm lý làm bài vững vàng, tốc độ ổn định xuyên suốt 7 câu hỏi",
    },
  ],
  priorities: [
    {
      title: "1. Tận dụng Bảng nháp cho bài toán hình học & đại số phức tạp",
      reason: "Bảng nháp giúp phác thảo hình vẽ và thử nghiệm các bước biến đổi mà không làm bẩn bài thi",
      evidence: "Đã làm quen công cụ bảng nháp trong Câu 1 và Câu 3",
      action: "Hãy vẽ nháp các bước giải trước khi chọn đáp án cuối cùng trong các bài thi chính thức",
    },
    {
      title: "2. Chú ý phân biệt Trắc nghiệm 1 đáp án và Nhiều đáp án",
      reason: "Dạng nhiều đáp án yêu cầu chọn đúng và đủ tất cả các phương án thoả mãn",
      evidence: "Đã thao tác thành công Câu 2 chọn đồng thời 2 đáp án số nguyên tố",
      action: "Đọc kĩ yêu cầu đề bài để không bỏ sót các đáp án hợp lệ",
    },
    {
      title: "3. Thường xuyên đối chiếu Sơ đồ câu hỏi trước khi Nộp bài",
      reason: "Sơ đồ câu hỏi giúp tránh bỏ sót câu chưa làm và kiểm tra lại các câu đã đánh dấu xem lại",
      evidence: "Đã mở sơ đồ kiểm tra 7/7 câu hoàn thành trước khi ấn nộp bài",
      action: "Dành 2-3 phút cuối giờ rà soát toàn bộ màu trạng thái trên sơ đồ",
    },
  ],
  mistakePatterns: [
    {
      pattern: "Thao tác chính xác, không ghi nhận mẫu lỗi đáng kể",
      description: "Thí sinh thực hiện đúng quy trình làm bài thi, không bị mất tập trung.",
      affectedQuestions: [],
      suggestion: "Duy trì phong độ làm bài tập trung và cẩn thận.",
    },
  ],
  progressAnalysis: {
    startPhase: "Đầu bài: Khởi động nhanh nhẹn với dạng Trắc nghiệm đơn và đa lựa chọn",
    middlePhase: "Giữa bài: Phân tích cẩn thận dạng Đúng/Sai và Câu trả lời ngắn",
    endPhase: "Cuối bài: Thao tác chính xác các câu Sắp xếp, Điền lỗ và Nối bảng",
    pacingInsight: "Nhịp độ ổn định, trung bình 20 - 30 giây cho mỗi câu hỏi trải nghiệm.",
  },
  timeAnalysis: {
    overallPacing: "Tốc độ làm bài rất tốt, hoàn thành bài làm trước thời gian quy định.",
    fastestInsight: "Câu 1 và Câu 4 được xử lý nhanh nhất nhờ phản xạ tính toán tốt.",
    slowestInsight: "Câu 5 và Câu 7 tốn nhiều thời gian hơn do đòi hỏi thao tác kéo ghép chi tiết.",
    efficiencyAdvice: "Nên ưu tiên xử lý nhanh các câu trắc nghiệm đơn để dành thời gian cho câu phức tạp.",
  },
  notableQuestions: [
    {
      questionIndex: 1,
      questionId: "demo_q1",
      timeSpentSeconds: 15,
      status: "correct",
      reason: "Phản xạ nhanh và chính xác với phương trình bậc nhất",
      recommendation: "Tiếp tục phát huy",
    },
  ],
  followUpQuestions: [
    "Làm thế nào để phân bổ thời gian hợp lý khi làm đề 50 câu?",
    "Cách dùng máy tính Casio fx-580 VN X kiểm tra nhanh nghiệm phương trình?",
  ],
  disclaimer:
    "Báo cáo phân tích AI mô phỏng được tạo tự động nhằm minh họa trải nghiệm khảo thí thông minh trên DkTEST.",
};

export const DEMO_LEADERBOARD_ENTRIES = [
  {
    id: "sub_demo_top1",
    studentUsername: "hoanglong_k12",
    studentNameSnapshot: "Nguyễn Hoàng Long",
    score: 10.0,
    maxScore: 10.0,
    timeSpent: 135,
    submittedAt: { seconds: Math.floor(Date.now() / 1000) - 3600 } as any,
    studentClassSnapshot: "12A1",
    avatarUrl: "",
    rank: 1,
  },
  {
    id: "sub_demo_top2",
    studentUsername: "minhanh_hsg",
    studentNameSnapshot: "Trần Minh Anh",
    score: 9.5,
    maxScore: 10.0,
    timeSpent: 165,
    submittedAt: { seconds: Math.floor(Date.now() / 1000) - 2400 } as any,
    studentClassSnapshot: "12 Chuyên Toán",
    avatarUrl: "",
    rank: 2,
  },
  {
    id: "sub_demo_user",
    studentUsername: "current_student",
    studentNameSnapshot: "Bạn (Học sinh trải nghiệm)",
    score: 9.0,
    maxScore: 10.0,
    timeSpent: 180,
    submittedAt: { seconds: Math.floor(Date.now() / 1000) } as any,
    studentClassSnapshot: "Lớp học DkTEST",
    avatarUrl: "",
    rank: 3,
    isCurrentStudent: true,
  },
  {
    id: "sub_demo_top4",
    studentUsername: "baotram_math",
    studentNameSnapshot: "Lê Bảo Trâm",
    score: 8.5,
    maxScore: 10.0,
    timeSpent: 210,
    submittedAt: { seconds: Math.floor(Date.now() / 1000) - 7200 } as any,
    studentClassSnapshot: "12A3",
    avatarUrl: "",
    rank: 4,
  },
  {
    id: "sub_demo_top5",
    studentUsername: "ducduy_stem",
    studentNameSnapshot: "Phạm Đức Duy",
    score: 8.0,
    maxScore: 10.0,
    timeSpent: 240,
    submittedAt: { seconds: Math.floor(Date.now() / 1000) - 10800 } as any,
    studentClassSnapshot: "11A2",
    avatarUrl: "",
    rank: 5,
  },
];
