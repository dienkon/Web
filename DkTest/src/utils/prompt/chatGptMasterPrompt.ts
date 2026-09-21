export interface CognitiveLevelDistribution {
  recognition: number; // Nhận biết (%)
  comprehension: number; // Thông hiểu (%)
  application: number; // Vận dụng (%)
  advanced: number; // Vận dụng cao (%)
}

export interface PromptCustomConfig {
  subject: string;
  grade: string;
  topic: string;
  audience: string;
  timeLimit: number;
  questionCount: number;
  difficulty: string;
  additionalInfo?: string;
  questionTypes?: ("single_choice" | "multiple_choice" | "true_false" | "short_answer" | "ordering" | "fill_blank")[];
  hasAudio?: boolean;
  hasAttachments?: boolean;
  allowSubExam?: boolean;

  // Enhanced detailed settings:
  examStructure?: "bogiaoduc_3parts" | "by_topic" | "single_section";
  scoreScale?: 10 | 100;
  cognitiveLevels?: CognitiveLevelDistribution;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  showResultsImmediately?: boolean;
  showExplanationsImmediately?: boolean;
  maxAttempts?: number; // 0 = unlimited
  subExamQuestionCount?: number;
  programmingLanguage?: "all" | "python" | "cpp" | "pascal" | "none";
  pedagogyStyle?: "detailed_steps" | "quick_tips" | "standard";
}

export interface MasterPromptPreset {
  id: string;
  name: string;
  iconName: string;
  desc: string;
  config: Partial<PromptCustomConfig>;
}

export const DEFAULT_PROMPT_CONFIG: PromptCustomConfig = {
  subject: "Toán học & Ngoại ngữ",
  grade: "Lớp 12",
  topic: "Khảo sát hàm số & Kỹ năng Đọc hiểu / Nghe Tiếng Anh THPT",
  audience: "Học sinh ôn thi tốt nghiệp THPT Quốc gia & Đánh giá năng lực (HSA/V-SAT)",
  timeLimit: 50,
  questionCount: 25,
  difficulty: "40% Nhận biết, 30% Thông hiểu, 20% Vận dụng, 10% Vận dụng cao",
  additionalInfo: "Bao gồm trắc nghiệm 1 đáp án, nhiều đáp án, đúng/sai 4 ý, trả lời ngắn, sắp xếp thứ tự và điền khuyết.",
  questionTypes: ["single_choice", "multiple_choice", "true_false", "short_answer", "ordering", "fill_blank"],
  hasAudio: true,
  hasAttachments: true,
  allowSubExam: false,
  examStructure: "bogiaoduc_3parts",
  scoreScale: 10,
  cognitiveLevels: {
    recognition: 40,
    comprehension: 30,
    application: 20,
    advanced: 10,
  },
  shuffleQuestions: false,
  shuffleOptions: false,
  showResultsImmediately: true,
  showExplanationsImmediately: true,
  maxAttempts: 0,
  subExamQuestionCount: 20,
  programmingLanguage: "all",
  pedagogyStyle: "detailed_steps",
};

export const MASTER_PROMPT_PRESETS: MasterPromptPreset[] = [
  {
    id: "thpt_2026",
    name: "Chuẩn Đề TN THPT 2025/2026 (Bộ GD&ĐT)",
    iconName: "GraduationCap",
    desc: "Cấu trúc 3 phần: Trắc nghiệm 1 ĐA, Đúng/Sai 4 ý, Trả lời ngắn",
    config: {
      subject: "Toán học",
      grade: "Lớp 12",
      topic: "Đề thi thử Tốt nghiệp THPT 2026 chuyên đề Hàm số, Tọa độ Oxyz & Xác suất",
      audience: "Học sinh lớp 12 ôn thi tốt nghiệp THPT Quốc gia",
      timeLimit: 90,
      questionCount: 22,
      scoreScale: 10,
      examStructure: "bogiaoduc_3parts",
      questionTypes: ["single_choice", "true_false", "short_answer"],
      cognitiveLevels: { recognition: 40, comprehension: 30, application: 20, advanced: 10 },
      difficulty: "40% Nhận biết, 30% Thông hiểu, 20% Vận dụng, 10% Vận dụng cao",
      shuffleQuestions: false,
      shuffleOptions: false,
      hasAudio: false,
      hasAttachments: true,
      pedagogyStyle: "detailed_steps",
    },
  },
  {
    id: "hsa_dgnl",
    name: "Đánh Giá Năng Lực (HSA / V-SAT)",
    iconName: "Sparkles",
    desc: "Đề thi tư duy định lượng & định tính, đa dạng câu hỏi có điền số ngắn",
    config: {
      subject: "Toán học & Khoa học Tự nhiên",
      grade: "Lớp 12 / Ôn thi ĐGNL",
      topic: "Tư duy Định lượng và Giải quyết vấn đề thực tế (ĐGNL HSA 2026)",
      audience: "Thí sinh thi Đánh giá năng lực ĐHQGHN (HSA) và ĐHQG-HCM",
      timeLimit: 75,
      questionCount: 50,
      scoreScale: 10,
      examStructure: "by_topic",
      questionTypes: ["single_choice", "short_answer", "ordering"],
      cognitiveLevels: { recognition: 30, comprehension: 40, application: 20, advanced: 10 },
      difficulty: "30% Nhận biết, 40% Thông hiểu, 20% Vận dụng, 10% Vận dụng cao",
      shuffleQuestions: true,
      shuffleOptions: true,
      hasAudio: false,
      hasAttachments: false,
      pedagogyStyle: "quick_tips",
    },
  },
  {
    id: "tin_hoc_code",
    name: "Tin Học THPTQG & Lập Trình",
    iconName: "FileCode",
    desc: "Khối mã Python & C++ phong cách Discord, bọc <raw>, thuật toán & ordering",
    config: {
      subject: "Tin học",
      grade: "Lớp 11 - 12",
      topic: "Cấu trúc Dữ liệu, Giải thuật, Vòng lặp, Đệ quy & Đọc hiểu mã nguồn",
      audience: "Học sinh ôn thi THPT Quốc gia môn Tin học & Đội tuyển HSG",
      timeLimit: 45,
      questionCount: 15,
      scoreScale: 10,
      examStructure: "by_topic",
      questionTypes: ["single_choice", "true_false", "short_answer", "ordering"],
      programmingLanguage: "all",
      cognitiveLevels: { recognition: 30, comprehension: 40, application: 20, advanced: 10 },
      difficulty: "30% Nhận biết, 40% Thông hiểu, 20% Vận dụng, 10% Vận dụng cao",
      hasAudio: false,
      hasAttachments: true,
      additionalInfo: "Bắt buộc có đoạn mã Python & C++ phong cách Discord, sử dụng thẻ <raw>...</raw> cho các thẻ HTML hoặc ký tự so sánh < >.",
      pedagogyStyle: "detailed_steps",
    },
  },
  {
    id: "english_listening",
    name: "Tiếng Anh THPT Kèm Bài Nghe Audio",
    iconName: "Headphones",
    desc: "Tích hợp Audio MP3 Listening, điền khuyết [_] & trắc nghiệm đọc hiểu",
    config: {
      subject: "Tiếng Anh",
      grade: "Lớp 12",
      topic: "Đề kiểm tra Tiếng Anh THPT toàn diện: Listening, Grammar, Reading Comprehension",
      audience: "Học sinh ôn thi tốt nghiệp THPT và chứng chỉ B1/B2/IELTS",
      timeLimit: 50,
      questionCount: 40,
      scoreScale: 10,
      examStructure: "by_topic",
      questionTypes: ["single_choice", "fill_blank"],
      hasAudio: true,
      hasAttachments: false,
      cognitiveLevels: { recognition: 40, comprehension: 40, application: 15, advanced: 5 },
      difficulty: "40% Nhận biết, 40% Thông hiểu, 15% Vận dụng, 5% Vận dụng cao",
      additionalInfo: "Cung cấp audioConfig với url bài nghe MP3, lời thoại transcripts (bài đọc) và các câu hỏi dạng điền khuyết [_].",
      pedagogyStyle: "detailed_steps",
    },
  },
  {
    id: "quick_test_15m",
    name: "Kiểm Tra Nhanh 15 Phút / 1 Tiết",
    iconName: "Clock",
    desc: "10 câu hỏi ngắn gọn, kiểm tra mức độ ghi nhớ và thông hiểu",
    config: {
      subject: "Toán học",
      grade: "Lớp 10",
      topic: "Kiểm tra 15 phút đầu giờ: Khái niệm & Công thức trọng tâm",
      audience: "Học sinh kiểm tra nhanh trên lớp",
      timeLimit: 15,
      questionCount: 10,
      scoreScale: 10,
      examStructure: "single_section",
      questionTypes: ["single_choice", "short_answer"],
      cognitiveLevels: { recognition: 60, comprehension: 40, application: 0, advanced: 0 },
      difficulty: "60% Nhận biết, 40% Thông hiểu",
      shuffleQuestions: true,
      shuffleOptions: true,
      hasAudio: false,
      hasAttachments: false,
      pedagogyStyle: "standard",
    },
  },
];

export function generateDynamicJsonSchemaExample(config: PromptCustomConfig): string {
  const timeLimit = config.timeLimit || 50;
  const shuffleQ = config.shuffleQuestions ?? false;
  const shuffleOpt = config.shuffleOptions ?? false;
  const showRes = config.showResultsImmediately ?? true;
  const showDet = config.showExplanationsImmediately ?? true;
  const maxAtt = config.maxAttempts ?? 0;
  const subEnabled = config.allowSubExam ?? false;
  const subCount = config.subExamQuestionCount || 20;

  return `{
  "version": 3,
  "source": "DkTEST",
  "exportType": "exam",
  "exportedAt": "2026-09-21T00:00:00.000Z",
  "exam": {
    "title": "${config.topic || "Đề kiểm tra chuẩn DkTEST 2026"}",
    "subject": "${config.subject || "Toán học"}",
    "gradeCategory": "${config.grade || "Lớp 12"}",
    "timeLimit": ${timeLimit},
    "shuffleQuestions": ${shuffleQ},
    "shuffleOptions": ${shuffleOpt},
    "showResults": ${showRes},
    "showDetails": ${showDet},
    "maxAttempts": ${maxAtt},
    "description": "Mô tả chi tiết đề thi (hỗ trợ công thức LaTeX $...$, bảng biểu HTML, code Discord, audio nghe...)",
    ${
      config.hasAudio
        ? `"audioConfig": {
      "url": "https://res.cloudinary.com/demo/video/upload/sample_listening.mp3",
      "title": "Audio bài thi (Toàn bộ bài nghe)",
      "maxPlays": 2,
      "allowSeek": true,
      "allowPause": true,
      "autoPlay": false,
      "enabled": true
    },`
        : ""
    }
    ${
      config.hasAttachments
        ? `"attachments": [
      {
        "name": "Tài liệu bảng tra cứu / Công thức bổ trợ.pdf",
        "url": "https://example.com/tai-lieu-bo-tro.pdf",
        "type": "file"
      }
    ],`
        : ""
    }
    "subExamConfig": {
      "enabled": ${subEnabled},
      "numberOfQuestions": ${subCount}
    }
  },
  "sections": [
    ${
      config.examStructure === "bogiaoduc_3parts"
        ? `{
      "id": "sec_1",
      "title": "Phần I. Câu trắc nghiệm nhiều phương án lựa chọn",
      "description": "Thí sinh chỉ chọn đúng duy nhất 1 phương án (A, B, C hoặc D).",
      "order": 0
    },
    {
      "id": "sec_2",
      "title": "Phần II. Câu trắc nghiệm Đúng / Sai (Chuẩn Bộ GD&ĐT 4 ý a, b, c, d)",
      "description": "Trong mỗi ý a), b), c), d), thí sinh chọn Đúng hoặc Sai.",
      "order": 1
    },
    {
      "id": "sec_3",
      "title": "Phần III. Câu trắc nghiệm trả lời ngắn",
      "description": "Thí sinh điền kết quả số thực, phân số hoặc đáp số ngắn.",
      "order": 2
    }`
        : `{
      "id": "sec_1",
      "title": "Phần thi chính: ${config.topic || "Nội dung kiểm tra"}",
      "description": "Thí sinh đọc kỹ từng câu hỏi và làm bài theo thời gian quy định.",
      "order": 0
    }`
    }
  ],
  "questions": [
    {
      "id": "q1",
      "sectionId": "sec_1",
      "type": "single_choice",
      "text": "Cho hàm số $y = x^3 - 3x + 2$. Điểm cực tiểu của đồ thị hàm số là:",
      "points": 0.25,
      "order": 0,
      "options": [
        { "id": "opt_a", "text": "$(1; 0)$" },
        { "id": "opt_b", "text": "$(-1; 4)$" },
        { "id": "opt_c", "text": "$(2; 4)$" },
        { "id": "opt_d", "text": "$(0; 2)$" }
      ],
      "correctOptionIds": ["opt_a"],
      "explanation": "Đạo hàm: $y' = 3x^2 - 3 = 0 \\\\Leftrightarrow x = \\\\pm 1$. Tại $x = 1$, $y = 0$, $y''(1) = 6 > 0$ nên $(1; 0)$ là điểm cực tiểu.<br/>Do đó chọn đáp án A."
    },
    {
      "id": "q2",
      "sectionId": "sec_1",
      "type": "true_false",
      "text": "Cho hình chóp $S.ABC$ có đáy $ABC$ là tam giác vuông cân tại $B$, $SA \\\\perp (ABC)$. Xét tính đúng/sai của các mệnh đề sau:",
      "points": 1.0,
      "order": 1,
      "statements": [
        { "id": "s_a", "text": "$BC \\\\perp (SAB)$", "correctAnswer": true },
        { "id": "s_b", "text": "$AC \\\\perp SB$", "correctAnswer": false },
        { "id": "s_c", "text": "Tam giác $SBC$ vuông tại $B$", "correctAnswer": true },
        { "id": "s_d", "text": "Góc giữa $SC$ và $(ABC)$ là góc $\\\\widehat{SCA}$", "correctAnswer": true }
      ],
      "explanation": "a) Đúng: $BC \\\\perp AB$ và $BC \\\\perp SA \\\\Rightarrow BC \\\\perp (SAB)$.<br/>b) Sai.<br/>c) Đúng: vì $BC \\\\perp (SAB)$ nên $BC \\\\perp SB$.<br/>d) Đúng: $SA \\\\perp (ABC)$ nên góc là $\\\\widehat{SCA}$."
    },
    {
      "id": "q3",
      "sectionId": "sec_1",
      "type": "short_answer",
      "text": "Tìm số nghiệm nguyên của bất phương trình $\\\\log_2(x^2 - 4) \\\\le 3$:",
      "points": 0.5,
      "order": 2,
      "acceptedAnswers": ["4", "4.0"],
      "explanation": "Điều kiện: $x^2 - 4 > 0 \\\\Leftrightarrow x > 2$ hoặc $x < -2$.<br/>$\\\\log_2(x^2 - 4) \\\\le 3 \\\\Leftrightarrow x^2 - 4 \\\\le 8 \\\\Leftrightarrow x^2 \\\\le 12$.<br/>Nghiệm nguyên thỏa mãn: $x \\\\in \\\\{-3, 3\\}$... Có 4 nghiệm nguyên: -3, 3 (cùng kiểm tra).<br/>Đáp số: 4."
    }
  ]
}`;
}

export const FULL_DKTEST_JSON_SCHEMA_TEXT = generateDynamicJsonSchemaExample(DEFAULT_PROMPT_CONFIG);
export const MASTER_SCHEMA_JSON_STRING = FULL_DKTEST_JSON_SCHEMA_TEXT;

export function buildFullChatGptPrompt(config: PromptCustomConfig = DEFAULT_PROMPT_CONFIG): string {
  const typesMap: Record<string, string> = {
    single_choice: "trắc nghiệm 1 đáp án (single_choice)",
    multiple_choice: "trắc nghiệm nhiều đáp án (multiple_choice)",
    true_false: "trắc nghiệm Đúng/Sai 4 ý chuẩn Bộ GD&ĐT (true_false)",
    short_answer: "điền kết quả ngắn (short_answer)",
    ordering: "sắp xếp thứ tự quy trình/thuật toán (ordering)",
    fill_blank: "điền khuyết vào đoạn văn [_] (fill_blank)",
  };

  const typesText =
    config.questionTypes && config.questionTypes.length > 0
      ? config.questionTypes.map((t) => typesMap[t] || t).join(", ")
      : Object.values(typesMap).join(", ");

  const structureDesc =
    config.examStructure === "bogiaoduc_3parts"
      ? "Chia thành 3 Phần chuẩn Bộ GD&ĐT 2025/2026 (Phần I: Trắc nghiệm 1 đáp án; Phần II: Đúng/Sai 4 ý; Phần III: Điền kết quả ngắn)"
      : config.examStructure === "by_topic"
      ? "Phân chia Sections theo từng chuyên đề / chủ điểm kiến thức cụ thể"
      : "Gộp chung trong 1 Section duy nhất, câu hỏi sắp xếp liền mạch";

  const cog = config.cognitiveLevels || {
    recognition: 40,
    comprehension: 30,
    application: 20,
    advanced: 10,
  };
  const cognitiveDesc = `${cog.recognition}% Nhận biết, ${cog.comprehension}% Thông hiểu, ${cog.application}% Vận dụng, ${cog.advanced}% Vận dụng cao`;

  const dynamicSchema = generateDynamicJsonSchemaExample(config);

  return `Bạn là chuyên gia giáo dục và biên soạn đề thi chuyên nghiệp theo chuẩn Bộ Giáo Dục & Đào Tạo và hệ thống khảo thí hiện đại DkTEST.

Dựa vào cấu trúc JSON chuẩn của hệ thống DkTEST (phiên bản mới nhất hỗ trợ toàn diện 6 dạng câu hỏi, âm thanh nghe MP3, tệp đính kèm, LaTeX, Bảng biểu HTML, Khối mã Discord, Khối nguyên bản <raw>):

\`\`\`json
${dynamicSchema}
\`\`\`

Dựa vào cấu trúc JSON trên, hãy tạo cho tôi một đề thi hoàn chỉnh thỏa mãn CHÍNH XÁC các thông số sau:
- **Môn học**: ${config.subject || "Toán học & Tiếng Anh"}
- **Khối lớp / Đối tượng**: ${config.grade || "Lớp 12"} (Dành cho: ${config.audience || "Học sinh ôn thi THPT Quốc gia & Đánh giá năng lực"})
- **Chủ đề & Nội dung kiểm tra**: "${config.topic || "Đề kiểm tra chất lượng trọng tâm 2026"}"
- **Cấu trúc Phần thi (Sections)**: ${structureDesc}
- **Thời gian làm bài**: ${config.timeLimit || 50} phút
- **Số lượng câu hỏi**: ${config.questionCount || 25} câu
- **Thang điểm**: Thang điểm ${config.scoreScale || 10}
- **Phân bố mức độ nhận thức**: ${cognitiveDesc}
- **Các dạng câu hỏi bắt buộc tạo**: ${typesText}
- **Cài đặt phòng thi**:
  * Đảo câu hỏi: ${config.shuffleQuestions ? "Bật (shuffleQuestions: true)" : "Tắt (shuffleQuestions: false)"}
  * Đảo phương án A, B, C, D: ${config.shuffleOptions ? "Bật (shuffleOptions: true)" : "Tắt (shuffleOptions: false)"}
  * Hiển thị điểm thi sau khi nộp: ${config.showResultsImmediately !== false ? "Bật (showResults: true)" : "Tắt (showResults: false)"}
  * Hiển thị lời giải chi tiết: ${config.showExplanationsImmediately !== false ? "Bật (showDetails: true)" : "Tắt (showDetails: false)"}
  * Số lần làm bài: ${config.maxAttempts && config.maxAttempts > 0 ? `${config.maxAttempts} lần` : "Không giới hạn (maxAttempts: 0)"}
${config.allowSubExam ? `- **Cắt đề ngẫu nhiên Sub-Exam**: Có (Cắt ngẫu nhiên ${config.subExamQuestionCount || 20} câu từ tổng ngân hàng ${config.questionCount} câu).` : ""}
${config.hasAudio ? "- **Bài nghe Audio MP3 (Listening)**: Có tích hợp audioConfig nghe âm thanh MP3 cho câu hỏi hoặc Section tương ứng." : ""}
${config.hasAttachments ? "- **Tệp đính kèm**: Có tệp đính kèm bảng tra cứu / tài liệu tham khảo (attachments)." : ""}
${
  config.programmingLanguage && config.programmingLanguage !== "none"
    ? `- **Môn Tin học / Lập trình**: Khối mã nguồn minh họa ưu tiên ngôn ngữ ${config.programmingLanguage.toUpperCase()} (bọc trong khối Discord \`\`\`${config.programmingLanguage === "all" ? "python hoặc cpp" : config.programmingLanguage} ... \`\`\` và dùng thẻ <raw>...</raw> cho các thẻ HTML hoặc phép so sánh).`
    : ""
}
- **Phong cách lời giải**: ${
    config.pedagogyStyle === "detailed_steps"
      ? "Giải thích chi tiết từng bước, lập luận sư phạm rõ ràng, chỉ rõ công thức và cách suy luận bản chất."
      : config.pedagogyStyle === "quick_tips"
      ? "Kèm theo mẹo tư duy nhanh, kỹ thuật loại trừ phương án nhiễu hoặc hướng dẫn bấm máy tính CASIO fx-580 VN X."
      : "Ngắn gọn, chuẩn xác, kết luận phương án đúng."
  }
${config.additionalInfo ? `- **Yêu cầu bổ sung đặc biệt**: ${config.additionalInfo}` : ""}

==================================================
QUY TẮC BẮT BUỘC ĐẦU RA VÀ ĐỊNH DẠNG (LATEST DkTEST 2026):
==================================================

1. TRẢ VỀ DUY NHẤT MỘT KHỐI MÃ JSON HỢP LỆ:
   - Bắt buộc bọc trong \`\`\`json ... \`\`\`.
   - Tuyệt đối không thêm bất kỳ văn bản chào hỏi, giải thích hay kết luận nào ngoài khối JSON.

2. CÁC DẠNG CÂU HỎI ĐƯỢC CHỈ ĐỊNH:
   ${
     config.questionTypes?.includes("single_choice")
       ? `- single_choice: Có "options" ("id", "text") và "correctOptionIds": ["id_đúng"] (duy nhất 1 id đúng).`
       : ""
   }
   ${
     config.questionTypes?.includes("multiple_choice")
       ? `- multiple_choice: Có "options" và "correctOptionIds" chứa mảng các id đúng (chọn tất cả phương án đúng).`
       : ""
   }
   ${
     config.questionTypes?.includes("true_false")
       ? `- true_false: Chuẩn Bộ GD&ĐT 4 ý a, b, c, d; mỗi ý độc lập có "id", "text" và "correctAnswer": true/false.`
       : ""
   }
   ${
     config.questionTypes?.includes("short_answer")
       ? `- short_answer: Có "acceptedAnswers" chứa danh sách các dạng đáp số tương đương (ví dụ: ["10", "10.0", "10/1"]).`
       : ""
   }
   ${
     config.questionTypes?.includes("ordering")
       ? `- ordering: Sắp xếp các mục; có "orderingItems": [{ "id": "item_1", "text": "..." }] và "correctOrder": ["item_2", "item_1", ...].`
       : ""
   }
   ${
     config.questionTypes?.includes("fill_blank")
       ? `- fill_blank: Điền vào chỗ trống; trong "text" dùng ký hiệu "[_]" và cung cấp "acceptedAnswersPerBlank": { "0": ["từ_khóa_1"], "1": ["từ_khóa_2"] }.`
       : ""
   }

3. CÔNG THỨC TOÁN, LÝ, HÓA (LATEX CHUẨN KATE X):
   - Công thức trong dòng bọc trong '$...$'.
   - Công thức khối riêng bọc trong '$$...$$'.
   - BẮT BUỘC escape đúng chuẩn JSON: ví dụ '\\\\frac{a}{b}', '\\\\sqrt{x^2+1}', '\\\\int_0^1', '\\\\alpha, \\\\beta', '\\\\begin{cases} ... \\\\end{cases}'.
   - Không được để công thức bị lỗi cú pháp KaTeX.

4. NGUYÊN TẮC BẮT BUỘC: SỬ DỤNG THẺ <raw>...</raw> ĐỂ HỆ THỐNG KHÔNG CONVERT CÚ PHÁP HTML SANG DOM VÀ DẤU HUYỀN BACKTICK (\` VÀ \`\`\`):

   ⚠️ CẢNH BÁO SỐNG CÒN DÀNH CHO AI (VÌ SAO BẮT BUỘC PHẢI DÙNG THẺ <raw>?):
   - Nền tảng DkTEST hiển thị đề thi cho thí sinh bằng trình render Web HTML trực tiếp.
   - NẾU AI viết các thẻ cú pháp HTML (như <a>, <p>, <div>, <input>, <img>, <button>, <form>, <link>, <table>...) trong câu hỏi hoặc trong các phương án trả lời A, B, C, D mà KHÔNG BỌC TRONG <raw>...</raw>:
     -> Trình duyệt của thí sinh sẽ TỰ ĐỘNG CONVERT CHÚNG THÀNH PHẦN TỬ HTML DOM THẬT!
     -> Làm mất chữ, mất phương án và vỡ layout đề thi.
   - KHI BỌC TRONG <raw>...</raw>: Hệ thống DkTEST sẽ BẢO TOÀN NGUYÊN BẢN CÚ PHÁP (raw text), vô hiệu hóa việc convert HTML của trình duyệt, giúp thí sinh nhìn thấy chính xác 100% cú pháp.

   📌 CÁC TRƯỜNG HỢP CỤ THỂ BẮT BUỘC PHẢI DÙNG <raw>...</raw>:
   1. CÂU HỎI HOẶC PHƯƠNG ÁN A, B, C, D HỎI VỀ THẺ HTML / XML:
      Ví dụ options: opt_a: "<raw><a></raw>", opt_b: "<raw><link></raw>", opt_c: "<raw><href></raw>"
   2. ĐOẠN MÃ HTML GIAO DIỆN HOẶC THUỘC TÍNH:
      Ví dụ: "<raw><img src=\\"logo.png\\" alt=\\"Logo\\"/></raw>"
   3. KÝ TỰ SO SÁNH TRẦN TRỤI (<, >, &&, ||):
      Ví dụ: "<raw>while (left < right && count > 0)</raw>"
   4. KÝ HIỆU ĐÔ-LA $ TRONG VĂN BẢN (CHỐNG LỖI KATEX):
      Ví dụ: "Một cuốn sách giá <raw>$20</raw>."
   5. BIỂU THỨC CHÍNH QUY REGEX:
      Ví dụ: "<raw>^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\\\.[a-zA-Z]{2,}$</raw>"

   --------------------------------------------------
   QUY TẮC DÙNG DẤU HUYỀN BACKTICK (\` VÀ \`\`\`):
   - 1. DẤU HUYỀN ĐƠN \` (INLINE CODE): Dùng khi nhắc đến từ khóa lập trình, tên biến \`count\`, lệnh \`len(list)\` trong câu văn.
   - 2. KHỐI BA DẤU HUYỀN \`\`\` (CODE BLOCK NHIỀU DÒNG KÈM TÊN NGÔN NGỮ):
     Bắt buộc có định danh ngôn ngữ (python, cpp, c, java, pascal, javascript, sql, html, css):
     \`\`\`python
     def process(n):
         return n * 2
     \`\`\`

5. LỜI GIẢI CHI TIẾT (EXPLANATION):
   - Mỗi câu hỏi bắt buộc phải có "explanation" giải thích chi tiết, sư phạm, chứng minh rõ ràng đáp án cuối cùng. Với câu single_choice, kết luận dòng cuối: "Do đó chọn đáp án [A/B/C/D].".`;
}
