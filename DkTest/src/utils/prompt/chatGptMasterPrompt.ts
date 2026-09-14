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
  "exportedAt": "2026-09-14T00:00:00.000Z",
  "exam": {
    "title": "Tên bài thi (VD: Kiểm tra chuyên đề Toán & Tin học 12)",
    "subject": "Môn học (Toán, Tin học, Vật Lý, Hóa Học, Tiếng Anh...)",
    "gradeCategory": "Cấp/Khối (THPT Quốc Gia, THCS...)",
    "timeLimit": 45,
    "shuffleQuestions": false,
    "shuffleOptions": false,
    "showResults": true,
    "showDetails": true,
    "description": "Mô tả chi tiết bài thi (hỗ trợ LaTeX, bảng HTML, khối mã Discord...)"
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
      "explanation": "Đạo hàm: $y' = 3x^2 - 3 = 0 \\\\Leftrightarrow x = \\\\pm 1$.<br/>Tại $x = 1$, $y = 0$, $y'' = 6x \\\\Rightarrow y''(1) = 6 > 0$ nên $(1; 0)$ là điểm cực tiểu của đồ thị hàm số."
    },
    {
      "id": "q2",
      "sectionId": "sec_2",
      "type": "multiple_choice",
      "text": "Cho hàm số $y = f(x)$ liên tục trên $\\\\mathbb{R}$ có bảng xét dấu của đạo hàm $f'(x)$ như sau:<br/><table class=\\"my-2 border border-slate-300\\"><thead><tr class=\\"bg-slate-100\\"><th class=\\"p-2 border\\">$x$</th><th class=\\"p-2 border\\">$-\\\\infty$</th><th class=\\"p-2 border\\">$-1$</th><th class=\\"p-2 border\\">$1$</th><th class=\\"p-2 border\\">$+\\\\infty$</th></tr></thead><tbody><tr class=\\"text-center\\"><td class=\\"p-2 border font-bold\\">$f'(x)$</td><td class=\\"p-2 border\\">$-$</td><td class=\\"p-2 border font-bold\\">0</td><td class=\\"p-2 border\\">$+$</td><td class=\\"p-2 border font-bold\\">0</td><td class=\\"p-2 border\\">$-$</td></tr></tbody></table>Những mệnh đề nào sau đây là <strong>ĐÚNG</strong>? (Chọn tất cả đáp án đúng)",
      "points": 0.5,
      "order": 1,
      "options": [
        { "id": "opt_a", "text": "Hàm số đồng biến trên khoảng $(-1; 1)$." },
        { "id": "opt_b", "text": "Hàm số đạt cực tiểu tại điểm $x = -1$." },
        { "id": "opt_c", "text": "Hàm số đạt cực đại tại điểm $x = 1$." },
        { "id": "opt_d", "text": "Hàm số nghịch biến trên khoảng $(-\\infty; 1)$." }
      ],
      "correctOptionIds": ["opt_a", "opt_b", "opt_c"],
      "explanation": "Dựa vào bảng xét dấu của đạo hàm $f'(x)$:<br/>- $f'(x) > 0$ trên $(-1; 1)$ nên hàm số đồng biến trên $(-1; 1)$ (A đúng).<br/>- Đạo hàm đổi dấu từ âm sang dương qua $x = -1$ nên đạt cực tiểu tại $x = -1$ (B đúng).<br/>- Đạo hàm đổi dấu từ dương sang âm qua $x = 1$ nên đạt cực đại tại $x = 1$ (C đúng).<br/>- Do đó các phương án A, B, C đều đúng."
    },
    {
      "id": "q3",
      "sectionId": "sec_3",
      "type": "true_false",
      "text": "Cho đoạn mã nguồn Python sau đây thực hiện thuật toán tìm ước chung lớn nhất (ƯCLN):\\\\n\`\`\`python\\\\ndef gcd(a, b):\\\\n    while b != 0:\\\\n        a, b = b, a % b\\\\n    return a\\\\n\`\`\`\\\\nXét tính đúng/sai của các khẳng định sau:",
      "points": 1.0,
      "order": 2,
      "statements": [
        { "id": "st_a", "text": "Giá trị của lời gọi hàm \`gcd(24, 36)\` là \`12\`.", "correctAnswer": true },
        { "id": "st_b", "text": "Vòng lặp \`while\` sẽ bị lặp vô tận nếu truyền tham số thỏa mãn $a < b$.", "correctAnswer": false },
        { "id": "st_c", "text": "Thuật toán trên cài đặt giải thuật Euclid với độ phức tạp thời gian là $O(\\\\log(\\\\min(a, b)))$.", "correctAnswer": true },
        { "id": "st_d", "text": "Nếu truyền vào \`b = 0\` ngay từ đầu, hàm sẽ ném ra ngoại lệ chia cho 0 (\`ZeroDivisionError\`).", "correctAnswer": false }
      ],
      "explanation": "a) Đúng: $\\\\gcd(24, 36) = 12$.<br/>b) Sai: Khi $a < b$, bước lặp đầu tiên sẽ hoán đổi giá trị $a$ và $b$ an toàn ($a \\\\leftarrow b$, $b \\\\leftarrow a \\\\% b = a$).<br/>c) Đúng: Đây là giải thuật Euclid chuẩn mực với độ phức tạp logarithmic.<br/>d) Sai: Khi $b = 0$, điều kiện vòng lặp \`while b != 0\` không thỏa mãn nên trả về ngay $a$ mà không gọi phép chia \`%\`."
    },
    {
      "id": "q4",
      "sectionId": "sec_4",
      "type": "short_answer",
      "text": "Cho hình chóp $S.ABC$ có đáy $ABC$ là tam giác vuông tại $B$, $AB = 3$, $BC = 4$. Cạnh bên $SA$ vuông góc với mặt phẳng đáy và $SA = 5$. Thể tích khối chóp $S.ABC$ bằng [_].",
      "points": 0.5,
      "order": 3,
      "acceptedAnswers": ["10", "10.0"],
      "explanation": "Diện tích tam giác đáy: $S_{ABC} = \\\\frac{1}{2} AB \\\\cdot BC = \\\\frac{1}{2} \\\\cdot 3 \\\\cdot 4 = 6$.<br/>Thể tích khối chóp: $V = \\\\frac{1}{3} S_{ABC} \\\\cdot SA = \\\\frac{1}{3} \\\\cdot 6 \\\\cdot 5 = 10$."
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

Dựa vào cấu trúc JSON chuẩn của hệ thống DkTEST (phiên bản mới nhất hỗ trợ toàn diện LaTeX, Bảng biểu HTML/Markdown, Khối mã Discord, Điền khuyết và Thẻ định dạng) dưới đây:

\`\`\`json
${FULL_DKTEST_JSON_SCHEMA_TEXT}
\`\`\`

Dựa vào cấu trúc JSON trên, hãy tạo cho tôi một đề thi hoàn chỉnh:
- Môn học: ${config.subject || "Toán học"}
- Khối lớp: ${config.grade || "Lớp 12"}
- Yêu cầu / Chủ đề: Đây là đề thi "${config.topic || "Khảo sát hàm số và ứng dụng đạo hàm"}"
- Đối tượng học sinh: Dành cho "${config.audience || "Học sinh ôn thi THPT Quốc gia & Luyện đề chuẩn"}"
- Thời gian làm bài: ${config.timeLimit || 45} phút
- Số lượng câu hỏi: ${config.questionCount || 20} câu
- Mức độ đề: ${config.difficulty || "Phân hóa từ thông hiểu đến vận dụng cao"}
- Các dạng câu hỏi cần có: ${typesText}
${config.additionalInfo ? `- Ghi chú bổ sung: ${config.additionalInfo}` : ""}

QUY TẮC ĐẦU RA BẮT BUỘC & HƯỚNG DẪN TRÌNH BÀY (LATEST V3+):
1. TRẢ VỀ DUY NHẤT MỘT KHỐI MÃ JSON HỢP LỆ (bọc trong \`\`\`json ... \`\`\`), TUYỆT ĐỐI KHÔNG thêm bất kỳ văn bản chào hỏi, giải thích hay kết bài ngoài khối JSON.
2. CÔNG THỨC TOÁN, LÝ, HÓA (LATEX):
   - Bắt buộc bọc trong '$...$' (cho inline) hoặc '$$...$$' (cho khối riêng).
   - Đảm bảo thoát dấu gạch chéo ngược hợp lệ trong chuỗi JSON: ví dụ '\\\\frac{a}{b}', '\\\\sqrt{x}', '\\\\begin{cases} ... \\\\end{cases}', '\\\\mathbb{R}'.
3. BẢNG BIỂU (HTML & MARKDOWN TABLES) & THẺ HTML TRỰC QUAN:
   - Hệ thống hỗ trợ hiển thị bảng biểu cực đẹp trong câu hỏi và lời giải:
     + Bảng HTML: '<table><thead><tr><th>...</th></tr></thead><tbody><tr><td>...</td></tr></tbody></table>' (rất thích hợp cho bảng biến thiên, bảng xét dấu, bảng số liệu, bảng so sánh).
     + Bảng Markdown: '| col1 | col2 |\\n|---|---|'
     + Hộp ghi chú / mẹo: '<div class="p-3 my-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-900">💡 <strong>Mẹo tư duy:</strong> ...</div>'
     + Thẻ làm nổi bật: '<mark>từ khóa</mark>', '<span class="text-indigo-600 font-bold">...</span>', '<strong>', '<em>', '<b>', '<i>', '<u>', '<sub>', '<sup>', '<details><summary>Xem chi tiết</summary>...</details>'.
4. KHỐI MÃ NGUỒN LẬP TRÌNH (DISCORD CODE BLOCKS):
   - Khi tạo đề môn Tin học, Lập trình hoặc bài toán có thuật toán, BẮT BUỘC dùng cú pháp khối mã:
     \`\`\`<ngôn_ngữ> (ví dụ: \`\`\`python, \`\`\`cpp, \`\`\`pascal, \`\`\`sql)
     <mã_nguồn>
     \`\`\`
     Hệ thống DkTEST sẽ tự động hiển thị khung code phong cách Discord có đánh số dòng, tô màu cú pháp và nút sao chép.
5. HÌNH ẢNH & ĐIỀN KHUYẾT:
   - Dùng '![mô tả](url_ảnh)' hoặc '<img src="..." />' nếu câu hỏi có ảnh minh họa.
   - Dùng '[_]' hoặc '[blank]' khi muốn tạo ô trống điền khuyết trong câu hỏi.
6. CẤU TRÚC 4 DẠNG CÂU HỎI CHUẨN BỘ GD&ĐT:
   - single_choice: Có "options" ("id", "text") và "correctOptionIds": ["id_đúng"] (duy nhất 1 id đúng).
   - multiple_choice: Có "options" và "correctOptionIds" chứa mảng các id đúng (ví dụ: ["opt_a", "opt_b"]).
   - true_false: Có "statements" (mỗi statement có "id", "text", và "correctAnswer": true/false).
   - short_answer: Có "acceptedAnswers" chứa danh sách các chuỗi đáp số chấp nhận được (ví dụ: ["10", "10.0", "10/1"]).
7. LỜI GIẢI CHI TIẾT (EXPLANATION):
   - Mỗi câu hỏi bắt buộc phải có "explanation" giải thích chi tiết từng bước, mẫu mực, sư phạm và chính xác tuyệt đối.`;
}

