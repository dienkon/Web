export interface PromptCustomConfig {
  subject: string;
  grade: string;
  topic: string;
  audience: string;
  timeLimit: number;
  questionCount: number;
  difficulty: string;
  additionalInfo?: string;
  questionTypes?: ("single_choice" | "multiple_choice" | "true_false" | "short_answer")[];
}

export const DEFAULT_PROMPT_CONFIG: PromptCustomConfig = {
  subject: "Toán học",
  grade: "Lớp 12",
  topic: "Khảo sát hàm số và ứng dụng đạo hàm (Đại số & Giải tích)",
  audience: "Học sinh ôn thi tốt nghiệp THPT Quốc gia & Đánh giá năng lực",
  timeLimit: 45,
  questionCount: 20,
  difficulty: "Từ thông hiểu, vận dụng đến vận dụng cao",
  additionalInfo: "Bao gồm cả trắc nghiệm chọn 1 phương án, trắc nghiệm nhiều phương án đúng, trắc nghiệm Đúng/Sai 4 ý và câu điền kết quả ngắn.",
  questionTypes: ["single_choice", "multiple_choice", "true_false", "short_answer"],
};

export const FULL_DKTEST_JSON_SCHEMA_TEXT = `{
  "version": 3,
  "source": "DkTEST",
  "exportType": "exam",
  "exportedAt": "2026-08-20T00:00:00.000Z",
  "exam": {
    "title": "Tên bài thi (VD: Kiểm tra chuyên đề Toán 12)",
    "subject": "Môn học (Toán, Vật Lý, Hóa Học, Tiếng Anh...)",
    "gradeCategory": "Cấp/Khối (THPT Quốc Gia, THCS...)",
    "timeLimit": 45,
    "shuffleQuestions": false,
    "shuffleOptions": false,
    "showResults": true,
    "showDetails": true,
    "description": "Mô tả chi tiết bài thi..."
  },
  "sections": [
    {
      "id": "sec_1",
      "title": "Phần I. Câu trắc nghiệm một phương án lựa chọn",
      "description": "Thí sinh trả lời từ câu 1 đến câu n. Mỗi câu thí sinh chỉ chọn đúng MỘT phương án.",
      "order": 0
    },
    {
      "id": "sec_2",
      "title": "Phần II. Câu trắc nghiệm nhiều phương án lựa chọn",
      "description": "Thí sinh trả lời từ câu 1 đến câu n. Mỗi câu có thể có một hoặc nhiều phương án đúng.",
      "order": 1
    },
    {
      "id": "sec_3",
      "title": "Phần III. Câu trắc nghiệm Đúng / Sai 4 ý",
      "description": "Thí sinh trả lời từ câu 1 đến câu n. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.",
      "order": 2
    },
    {
      "id": "sec_4",
      "title": "Phần IV. Câu trắc nghiệm trả lời ngắn (Điền số / biểu thức)",
      "description": "Thí sinh điền kết quả (số thực hoặc biểu thức) vào ô trống.",
      "order": 3
    }
  ],
  "questions": [
    {
      "id": "q1",
      "sectionId": "sec_1",
      "type": "single_choice",
      "text": "Cho hàm số $y = x^3 - 3x + 2$. Điểm cực tiểu của hàm số là:",
      "points": 0.25,
      "order": 0,
      "options": [
        { "id": "opt_a", "text": "$x = 1$" },
        { "id": "opt_b", "text": "$x = -1$" },
        { "id": "opt_c", "text": "$x = 2$" },
        { "id": "opt_d", "text": "$x = 0$" }
      ],
      "correctOptionIds": ["opt_a"],
      "explanation": "Đạo hàm: $y' = 3x^2 - 3 = 0 \\\\Leftrightarrow x = \\\\pm 1$. Qua $x = 1$, đạo hàm đổi dấu từ âm sang dương nên $x = 1$ là điểm cực tiểu."
    },
    {
      "id": "q2",
      "sectionId": "sec_2",
      "type": "multiple_choice",
      "text": "Cho hàm số $y = f(x)$ có đồ thị như hình vẽ. Những mệnh đề nào sau đây là ĐÚNG? (Chọn tất cả đáp án đúng)",
      "points": 0.5,
      "order": 1,
      "options": [
        { "id": "opt_a", "text": "Hàm số đồng biến trên khoảng $(0; 2)$" },
        { "id": "opt_b", "text": "Giá trị cực đại của hàm số bằng $4$" },
        { "id": "opt_c", "text": "Hàm số đạt cực tiểu tại $x = -1$" },
        { "id": "opt_d", "text": "Đồ thị hàm số đi qua gốc tọa độ $O(0;0)$" }
      ],
      "correctOptionIds": ["opt_a", "opt_b"],
      "explanation": "Dựa vào bảng biến thiên/đồ thị: Hàm số đồng biến trên $(0;2)$ và giá trị cực đại là $y_{CD} = 4$. Do đó phương án A và B đều đúng."
    },
    {
      "id": "q3",
      "sectionId": "sec_3",
      "type": "true_false",
      "text": "Cho hàm số $f(x) = \\\\frac{2x - 1}{x + 1}$. Xét tính đúng sai của các khẳng định sau:",
      "points": 1.0,
      "order": 2,
      "statements": [
        { "id": "st_a", "text": "Tập xác định của hàm số là $\\\\mathbb{R} \\\\setminus \\\\{-1\\\\}$.", "correctAnswer": true },
        { "id": "st_b", "text": "Đồ thị hàm số có tiệm cận đứng $x = 1$.", "correctAnswer": false },
        { "id": "st_c", "text": "Đồ thị hàm số có tiệm cận ngang $y = 2$.", "correctAnswer": true },
        { "id": "st_d", "text": "Hàm số đồng biến trên từng khoảng xác định.", "correctAnswer": true }
      ],
      "explanation": "a) Đúng: $x \\\\neq -1$. b) Sai: Tiệm cận đứng là $x = -1$. c) Đúng: $\\\\lim_{x \\\\to \\\\infty} y = 2$. d) Đúng: $y' = \\\\frac{3}{(x+1)^2} > 0$."
    },
    {
      "id": "q4",
      "sectionId": "sec_4",
      "type": "short_answer",
      "text": "Tìm giá trị lớn nhất của hàm số $y = -x^2 + 4x + 5$ trên đoạn $[0; 3]$.",
      "points": 0.5,
      "order": 3,
      "acceptedAnswers": ["9"],
      "explanation": "Đỉnh parabol $x = -\\\\frac{b}{2a} = 2 \\\\in [0; 3]$. Tại $x = 2$, $y = -(2)^2 + 4(2) + 5 = 9$. Vậy GTLN là 9."
    }
  ]
}`;

export const MASTER_SCHEMA_JSON_STRING = FULL_DKTEST_JSON_SCHEMA_TEXT;

export function buildFullChatGptPrompt(config: PromptCustomConfig = DEFAULT_PROMPT_CONFIG): string {
  const typesText = config.questionTypes && config.questionTypes.length > 0
    ? config.questionTypes.map((t) => {
        if (t === "single_choice") return "trắc nghiệm 1 đáp án (single_choice)";
        if (t === "multiple_choice") return "trắc nghiệm nhiều đáp án (multiple_choice)";
        if (t === "true_false") return "trắc nghiệm Đúng/Sai 4 ý (true_false)";
        if (t === "short_answer") return "điền đáp án ngắn (short_answer)";
        return t;
      }).join(", ")
    : "trắc nghiệm 1 đáp án (single_choice), trắc nghiệm nhiều đáp án (multiple_choice), đúng/sai 4 ý (true_false) và trả lời ngắn (short_answer)";

  return `Bạn là chuyên gia giáo dục và biên soạn đề thi chuyên nghiệp theo chuẩn Bộ Giáo Dục & Đào Tạo.

Dựa vào cấu trúc JSON chuẩn của hệ thống DkTEST dưới đây:

\`\`\`json
${FULL_DKTEST_JSON_SCHEMA_TEXT}
\`\`\`

Dựa vào cấu trúc JSON trên, hãy tạo cho tôi một đề thi:
- Môn học: ${config.subject || "Toán học"}
- Khối lớp: ${config.grade || "Lớp 12"}
- Yêu cầu / Chủ đề: Đây là đề thi "${config.topic || "Khảo sát hàm số và ứng dụng đạo hàm"}"
- Đối tượng học sinh: Dành cho "${config.audience || "Học sinh ôn thi THPT Quốc gia & Luyện đề chuẩn"}"
- Thời gian làm bài: ${config.timeLimit || 45} phút
- Số lượng câu hỏi: ${config.questionCount || 20} câu
- Mức độ đề: ${config.difficulty || "Phân hóa từ thông hiểu đến vận dụng cao"}
- Các dạng câu hỏi cần có: ${typesText}
${config.additionalInfo ? `- Ghi chú bổ sung: ${config.additionalInfo}` : ""}

QUY TẮC ĐẦU RA BẮT BUỘC (STRICT REQUIREMENTS):
1. TRẢ VỀ DUY NHẤT MỘT KHỐI MÃ JSON HỢP LỆ (bọc trong \`\`\`json ... \`\`\`), TUYỆT ĐỐI KHÔNG thêm bất kỳ văn bản chào hỏi, giải thích ngoài khối JSON.
2. Tất cả công thức Toán, Lý, Hóa phải được định dạng bằng mã LaTeX chuẩn trong cặp dấu $...$ (cho công thức inline) hoặc $$...$$ (cho công thức khối).
3. Đảm bảo 100% đúng cú pháp JSON: không có dấu phẩy thừa, chuỗi có dấu gạch chéo ngược phải được escape hợp lệ (ví dụ: \\\\frac, \\\\sqrt).
4. Mỗi câu hỏi phải có lời giải chi tiết (explanation) từng bước rõ ràng, sư phạm, chính xác tuyệt đối.
5. Cấu trúc câu hỏi phải tương thích hoàn toàn với schema DkTEST:
   - single_choice: Có "options" (mỗi option gồm "id", "text") và "correctOptionIds" chứa duy nhất 1 id đúng.
   - multiple_choice: Có "options" (mỗi option gồm "id", "text") và "correctOptionIds" chứa mảng danh sách các id đúng (ví dụ: ["opt_a", "opt_b"]).
   - true_false: Có "statements" (mỗi statement có "id", "text", và "correctAnswer": true/false).
   - short_answer: Có "acceptedAnswers" chứa danh sách các chuỗi đáp số chấp nhận được (ví dụ: ["9", "9.0"]).`;
}
