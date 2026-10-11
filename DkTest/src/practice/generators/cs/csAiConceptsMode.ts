/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Practice Generator: Tin Học 12 - Trí tuệ nhân tạo & Xã hội tri thức (GDPT 2018 & Đề thi 2025)
 */

import { PracticeMode, PracticeQuestion, PracticeContext, TrueFalseStatement } from "../../core/types";

export const csAiConceptsMode: PracticeMode = {
  id: "cs_ai_concepts",
  title: "Tin Học 12: Trí tuệ nhân tạo (AI) & Xã hội tri thức",
  description: "Luyện tập các khái niệm AI, Học máy, Thị giác máy tính, Xử lý ngôn ngữ tự nhiên và Đạo đức số theo đề thi THPT 2025.",
  shortTag: "Trí tuệ nhân tạo 12",
  category: "cs",
  gradeRange: [12, 12],
  icon: "Sparkles",
  badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
  gameRule: "standard",
  defaultLength: 10,
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Nhận biết", description: "Khái niệm AI hẹp, các lĩnh vực Machine Learning, NLP, Computer Vision" },
    { id: 2, name: "Thông hiểu", description: "Phân biệt học có giám sát và không giám sát, ứng dụng thực tế của AI" },
    { id: 3, name: "Vận dụng", description: "Đúng/Sai 4 ý, đánh giá tác động đạo đức, bản quyền và an toàn khi sử dụng AI" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    const formatRoll = Math.random();

    // 1. Part II True / False Cluster: AI Applications & Ethics
    if (diff >= 2 && formatRoll < 0.4) {
      const clusterTemplates = [
        {
          prompt: "Trí tuệ nhân tạo (AI) đang phát triển mạnh mẽ và tác động sâu sắc đến mọi lĩnh vực đời sống. Xét tính đúng/sai của các phát biểu sau:",
          statements: [
            {
              id: "a",
              text: "Hệ thống AI hiện nay đa phần thuộc loại Trí tuệ nhân tạo hẹp (Narrow AI), được thiết kế để giải quyết bài toán cụ thể.",
              isCorrect: true,
              explanation: "Hầu hết các mô hình AI hiện nay (nhận diện hình ảnh, dịch máy, gợi ý phim) là Narrow AI, tập trung vào nhiệm vụ xác định.",
            },
            {
              id: "b",
              text: "Học có giám sát (Supervised Learning) là phương pháp huấn luyện mô hình bằng dữ liệu không có nhãn đầu ra.",
              isCorrect: false,
              explanation: "Học có giám sát sử dụng tập dữ liệu đã được gán nhãn (labeled data). Học không giám sát (Unsupervised) mới dùng dữ liệu chưa gán nhãn.",
            },
            {
              id: "c",
              text: "Thị giác máy tính (Computer Vision) giúp máy tính có khả năng trích xuất thông tin có ý nghĩa từ hình ảnh hoặc video số.",
              isCorrect: true,
              explanation: "Định nghĩa chuẩn của Computer Vision là cho phép máy tính thu thập, xử lý và hiểu nội dung từ hình ảnh/video.",
            },
            {
              id: "d",
              text: "Sử dụng các hệ thống AI tạo sinh (Generative AI) không bao giờ tiềm ẩn nguy cơ về bản quyền sở hữu trí tuệ hay tin giả.",
              isCorrect: false,
              explanation: "Generative AI có nguy cơ tạo ra nội dung sai lệch (ảo giác AI - hallucination), vi phạm bản quyền dữ liệu huấn luyện và phát tán tin giả.",
            },
          ],
        },
        {
          prompt: "Về các lĩnh vực nghiên cứu cốt lõi của Trí tuệ nhân tạo và vai trò trong cuộc Cách mạng công nghiệp 4.0. Xét tính đúng/sai của các phát biểu sau:",
          statements: [
            {
              id: "a",
              text: "Xử lý ngôn ngữ tự nhiên (NLP) là cầu nối giúp máy tính có thể đọc hiểu, dịch thuật và sinh văn bản theo ngôn ngữ của con người.",
              isCorrect: true,
              explanation: "NLP (Natural Language Processing) là nhánh của AI tập trung vào tương tác giữa máy tính và ngôn ngữ tự nhiên của người.",
            },
            {
              id: "b",
              text: "Xe tự lái kết hợp cả Thị giác máy tính, Cảm biến và Học máy để nhận diện chướng ngại vật và tự động điều hướng.",
              isCorrect: true,
              explanation: "Hệ thống lái tự động là ứng dụng đa ngành tích hợp cảm biến, Computer Vision và các thuật toán học máy điều khiển.",
            },
            {
              id: "c",
              text: "Máy học (Machine Learning) là một tập con của Trí tuệ nhân tạo, và Học sâu (Deep Learning) là một tập con của Máy học.",
              isCorrect: true,
              explanation: "Phân cấp đúng: AI bao hàm Machine Learning, Machine Learning bao hàm Deep Learning.",
            },
            {
              id: "d",
              text: "Mọi mô hình trí tuệ nhân tạo đều có ý thức và tư duy cảm xúc giống hệt con người.",
              isCorrect: false,
              explanation: "AI hoạt động dựa trên thuật toán xử lý dữ liệu và thống kê, không có ý thức hay cảm xúc tự thân.",
            },
          ],
        },
      ];

      const chosen = clusterTemplates[Math.floor(Math.random() * clusterTemplates.length)];
      return {
        id: `cs_ai_tf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: "true_false_group",
        prompt: chosen.prompt,
        subText: "Tin Học 12 • Phần II: Đúng/Sai",
        difficulty: diff,
        correctAnswer: {
          a: chosen.statements[0].isCorrect,
          b: chosen.statements[1].isCorrect,
          c: chosen.statements[2].isCorrect,
          d: chosen.statements[3].isCorrect,
        },
        trueFalseStatements: chosen.statements,
        hints: [
          "Phân biệt rõ: Học có giám sát (có nhãn) vs Học không giám sát (không nhãn).",
          "AI hiện nay là Narrow AI, chưa đạt tới AGI (trí tuệ tổng quát có ý thức).",
        ],
        misconceptions: [
          "Cho rằng AI ngày nay đã có cảm xúc và ý thức tự chủ.",
          "Nhầm lẫn giữa dữ liệu có nhãn và không nhãn trong huấn luyện học máy.",
        ],
        explanation: chosen.statements.map((s) => `- Ý ${s.id}: ${s.isCorrect ? "Đúng" : "Sai"}. ${s.explanation}`).join("\n"),
      };
    }

    // 2. Part I Single Choice: Core Concepts
    const mcPool = [
      {
        prompt: "Lĩnh vực nào của Trí tuệ nhân tạo nghiên cứu việc giúp máy tính hiểu, thông dịch và tạo ra tiếng nói/văn bản giống con người?",
        options: [
          { id: "A", text: "Xử lý ngôn ngữ tự nhiên (NLP)" },
          { id: "B", text: "Thị giác máy tính (Computer Vision)" },
          { id: "C", text: "Hệ thống chuyên gia (Expert System)" },
          { id: "D", text: "Mạng nơ-ron tích chập (CNN)" },
        ],
        correctAnswer: "A",
        explanation: "Xử lý ngôn ngữ tự nhiên (NLP - Natural Language Processing) chuyên nghiên cứu việc giao tiếp văn bản/tiếng nói giữa máy và người.",
      },
      {
        prompt: "Ứng dụng nào sau đây KHÔNG PHẢI là ứng dụng điển hình của Trí tuệ nhân tạo (AI)?",
        options: [
          { id: "A", text: "Bảng tính điện tử tính tổng các số bằng hàm SUM" },
          { id: "B", text: "Hệ thống nhận diện khuôn mặt điểm danh tự động" },
          { id: "C", text: "Xe ô tô tự hành nhận diện làn đường và biển báo" },
          { id: "D", text: "Chatbot giải đáp thắc mắc dịch vụ khách hàng tự động" },
        ],
        correctAnswer: "A",
        explanation: "Hàm tính toán số học chuẩn trong bảng tính (SUM) là phép toán logic quy tắc xác định, không sử dụng mô hình trí tuệ nhân tạo.",
      },
      {
        prompt: "Thuật ngữ 'Học máy' (Machine Learning) được hiểu chính xác nhất là gì?",
        options: [
          { id: "A", text: "Khả năng máy tính tự học từ dữ liệu kinh nghiệm để cải thiện hiệu suất mà không cần lập trình từng quy tắc cứng" },
          { id: "B", text: "Việc người lập trình viết ra hàng triệu dòng lệnh IF-ELSE cố định" },
          { id: "C", text: "Quy trình lắp ráp linh kiện phần cứng máy tính bằng robot tự động" },
          { id: "D", text: "Hệ thống phần cứng lưu trữ bộ nhớ với tốc độ cực nhanh" },
        ],
        correctAnswer: "A",
        explanation: "Machine Learning là phương pháp cho phép hệ thống học tập các quy luật tiềm ẩn từ tập dữ liệu mẫu để đưa ra dự đoán hoặc quyết định.",
      },
      {
        prompt: "Hệ thống AI gợi ý bài hát yêu thích trên các ứng dụng nghe nhạc trực tuyến hoạt động dựa trên cơ chế nào?",
        options: [
          { id: "A", text: "Phân tích thói quen nghe nhạc, sở thích của người dùng và các người dùng tương đồng (Recommendation System)" },
          { id: "B", text: "Phát bài hát ngẫu nhiên hoàn toàn không theo quy luật nào" },
          { id: "C", text: "Chỉ phát theo danh sách thứ tự chữ cái A-Z của bài hát" },
          { id: "D", text: "Phát bài hát có dung lượng file nặng nhất trong kho lưu trữ" },
        ],
        correctAnswer: "A",
        explanation: "Hệ thống gợi ý (Recommender System) dùng thuật toán học máy phân tích hành vi để đề xuất nội dung phù hợp cho từng cá nhân.",
      },
    ];

    const chosenMC = mcPool[Math.floor(Math.random() * mcPool.length)];
    return {
      id: `cs_ai_mc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: "choice",
      prompt: chosenMC.prompt,
      subText: "Tin Học 12 • Phần I: Trắc nghiệm 4 lựa chọn",
      difficulty: diff,
      options: chosenMC.options,
      correctAnswer: chosenMC.correctAnswer,
      hints: [
        "Đọc kỹ lĩnh vực chuyên môn: NLP xử lý ngôn ngữ, Computer Vision xử lý hình ảnh.",
      ],
      misconceptions: [
        "Nhầm lẫn các phần mềm tính toán thuần túy có công thức cố định với các hệ thống AI có khả năng học từ dữ liệu.",
      ],
      explanation: chosenMC.explanation,
    };
  },

  validateAnswer(question: PracticeQuestion, userAnswer: any) {
    if (question.type === "true_false_group") {
      const stmts = question.trueFalseStatements || [];
      if (!userAnswer || typeof userAnswer !== "object") return false;
      return stmts.every((s) => userAnswer[s.id] === s.isCorrect);
    }
    return String(userAnswer).trim().toUpperCase() === String(question.correctAnswer).trim().toUpperCase();
  },

  calculateScore(question: PracticeQuestion, userAnswer: any, context) {
    const base = context.difficulty * 10;
    return context.isCorrect ? base + Math.min(context.combo * 2, 10) : 0;
  },
};
