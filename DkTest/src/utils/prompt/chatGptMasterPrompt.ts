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
}

export const DEFAULT_PROMPT_CONFIG: PromptCustomConfig = {
  subject: "Toán học & Ngoại ngữ",
  grade: "Lớp 12",
  topic: "Khảo sát hàm số & Kỹ năng Đọc hiểu / Nghe Tiếng Anh THPT",
  audience: "Học sinh ôn thi tốt nghiệp THPT Quốc gia & Đánh giá năng lực (HSA/V-SAT)",
  timeLimit: 50,
  questionCount: 25,
  difficulty: "Từ nhận biết, thông hiểu, vận dụng đến vận dụng cao",
  additionalInfo: "Bao gồm trắc nghiệm 1 đáp án, nhiều đáp án, đúng/sai 4 ý, trả lời ngắn, sắp xếp thứ tự và điền khuyết.",
  questionTypes: ["single_choice", "multiple_choice", "true_false", "short_answer", "ordering", "fill_blank"],
  hasAudio: true,
  hasAttachments: true,
  allowSubExam: false,
};

export const FULL_DKTEST_JSON_SCHEMA_TEXT = `{
  "version": 3,
  "source": "DkTEST",
  "exportType": "exam",
  "exportedAt": "2026-09-18T00:00:00.000Z",
  "exam": {
    "title": "Tên bài thi (VD: Đề thi thử Tốt nghiệp THPT & Đánh giá năng lực 2026)",
    "subject": "Toán học / Tiếng Anh / Tin học / Vật lý / Hóa học...",
    "gradeCategory": "THPT Quốc Gia / Lớp 12",
    "timeLimit": 50,
    "shuffleQuestions": false,
    "shuffleOptions": false,
    "showResults": true,
    "showDetails": true,
    "maxAttempts": 0,
    "description": "Mô tả chi tiết bài thi (hỗ trợ LaTeX, bảng HTML, khối mã Discord, audio nghe...)",
    "audioConfig": {
      "url": "https://res.cloudinary.com/demo/video/upload/sample_listening.mp3",
      "title": "Audio bài thi (Toàn bộ bài nghe)",
      "maxPlays": 2,
      "allowSeek": true,
      "allowPause": true,
      "autoPlay": false,
      "enabled": true
    },
    "attachments": [
      {
        "name": "Bảng tuần hoàn các nguyên tố hóa học / Công thức bổ trợ.pdf",
        "url": "https://example.com/tai-lieu-bo-tro.pdf",
        "type": "file"
      }
    ],
    "subExamConfig": {
      "enabled": false,
      "numberOfQuestions": 20
    }
  },
  "sections": [
    {
      "id": "sec_1",
      "title": "Phần I. Trắc nghiệm 1 phương án lựa chọn",
      "description": "Thí sinh chỉ chọn đúng DUY NHẤT 1 phương án A, B, C hoặc D.",
      "order": 0,
      "instructions": "Mỗi câu trả lời đúng được 0.25 điểm."
    },
    {
      "id": "sec_2",
      "title": "Phần II. Trắc nghiệm nhiều phương án đúng",
      "description": "Mỗi câu có thể có một hoặc nhiều phương án đúng. Thí sinh chọn tất cả đáp án đúng.",
      "order": 1
    },
    {
      "id": "sec_3",
      "title": "Phần III. Trắc nghiệm Đúng / Sai 4 ý (Chuẩn Bộ GD&ĐT)",
      "description": "Trong mỗi ý a), b), c), d), thí sinh chọn Đúng hoặc Sai.",
      "order": 2
    },
    {
      "id": "sec_4",
      "title": "Phần IV. Trả lời ngắn (Điền số / kết quả)",
      "description": "Thí sinh điền kết quả số thực, phân số hoặc từ khóa vào ô đáp án.",
      "order": 3
    },
    {
      "id": "sec_5",
      "title": "Phần V. Sắp xếp thứ tự quy trình / thuật toán",
      "description": "Thí sinh kéo thả hoặc chọn thứ tự các bước logic từ trước đến sau.",
      "order": 4
    },
    {
      "id": "sec_6",
      "title": "Phần VI. Điền khuyết vào văn bản & Bài nghe Audio",
      "description": "Nghe đoạn âm thanh và điền từ thích hợp vào các chỗ trống [_].",
      "order": 5,
      "audioConfig": {
        "url": "https://res.cloudinary.com/demo/video/upload/section_audio.mp3",
        "maxPlays": 3,
        "allowSeek": false,
        "allowPause": true,
        "enabled": true
      }
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
      "explanation": "Đạo hàm: $y' = 3x^2 - 3 = 0 \\\\Leftrightarrow x = \\\\pm 1$.<br/>Tại $x = 1$, $y = 0$, $y'' = 6x \\\\Rightarrow y''(1) = 6 > 0$ nên $(1; 0)$ là điểm cực tiểu của đồ thị hàm số.<br/>Do đó chọn đáp án A."
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
      "explanation": "Dựa vào bảng xét dấu đạo hàm $f'(x)$:<br/>- $f'(x) > 0$ trên $(-1; 1)$ nên hàm số đồng biến trên $(-1; 1)$ (A đúng).<br/>- Đổi dấu từ âm sang dương qua $x = -1$ nên đạt cực tiểu tại $x = -1$ (B đúng).<br/>- Đổi dấu từ dương sang âm qua $x = 1$ nên đạt cực đại tại $x = 1$ (C đúng).<br/>Do đó chọn các đáp án A, B, C."
    },
    {
      "id": "q3",
      "sectionId": "sec_3",
      "type": "true_false",
      "text": "Cho đoạn mã nguồn Python sau thực hiện giải thuật Euclid tìm ước chung lớn nhất (ƯCLN):\\\\n\`\`\`python\\\\ndef gcd(a, b):\\\\n    while b != 0:\\\\n        a, b = b, a % b\\\\n    return a\\\\n\`\`\`\\\\nXét tính đúng/sai của các khẳng định sau:",
      "points": 1.0,
      "order": 2,
      "statements": [
        { "id": "st_a", "text": "Giá trị của lời gọi hàm \`gcd(24, 36)\` là \`12\`.", "correctAnswer": true },
        { "id": "st_b", "text": "Vòng lặp \`while\` sẽ bị lặp vô tận nếu truyền tham số thỏa mãn $a < b$.", "correctAnswer": false },
        { "id": "st_c", "text": "Giải thuật trên có độ phức tạp thời gian là $O(\\\\log(\\\\min(a, b)))$.", "correctAnswer": true },
        { "id": "st_d", "text": "Nếu truyền vào \`b = 0\` ngay từ đầu, hàm sẽ ném ra ngoại lệ \`ZeroDivisionError\`.", "correctAnswer": false }
      ],
      "explanation": "a) Đúng: $\\\\gcd(24, 36) = 12$.<br/>b) Sai: Khi $a < b$, bước lặp đầu tiên sẽ hoán đổi giá trị $a$ và $b$ an toàn ($a \\\\leftarrow b$, $b \\\\leftarrow a \\\\% b = a$).<br/>c) Đúng: Độ phức tạp thời gian thuật toán Euclid là $O(\\\\log(\\\\min(a, b)))$.<br/>d) Sai: Khi $b = 0$, vòng lặp \`while\` dừng ngay và trả về $a$."
    },
    {
      "id": "q4",
      "sectionId": "sec_4",
      "type": "short_answer",
      "text": "Cho hình chóp $S.ABC$ có đáy $ABC$ là tam giác vuông tại $B$, $AB = 3$, $BC = 4$. Cạnh bên $SA \\\\perp (ABC)$ và $SA = 5$. Thể tích khối chóp $S.ABC$ bằng bao nhiêu?",
      "points": 0.5,
      "order": 3,
      "acceptedAnswers": ["10", "10.0"],
      "explanation": "Diện tích đáy $S_{ABC} = \\\\frac{1}{2} \\\\cdot 3 \\\\cdot 4 = 6$.<br/>Thể tích khối chóp: $V = \\\\frac{1}{3} S_{ABC} \\\\cdot SA = \\\\frac{1}{3} \\\\cdot 6 \\\\cdot 5 = 10$.<br/>Do đó điền đáp án 10."
    },
    {
      "id": "q5",
      "sectionId": "sec_5",
      "type": "ordering",
      "text": "Hãy sắp xếp các bước sau đây theo đúng quy trình thực nghiệm điều chế và thu khí $O_2$ trong phòng thí nghiệm từ $KMnO_4$:",
      "points": 0.5,
      "order": 4,
      "orderingItems": [
        { "id": "step_1", "text": "Lắp ráp ống nghiệm có chứa $KMnO_4$ lên giá thí nghiệm có ống dẫn khí." },
        { "id": "step_2", "text": "Dùng đèn cồn hơ nóng đều ống nghiệm, sau đó tập trung đun đáy ống nghiệm." },
        { "id": "step_3", "text": "Thu khí $O_2$ đẩy nước vào ống đong hoặc lọ thu khí úp ngược." },
        { "id": "step_4", "text": "Tháo ống dẫn khí ra khỏi chậu nước trước khi tắt đèn cồn để tránh nước tràn vào." }
      ],
      "correctOrder": ["step_1", "step_2", "step_3", "step_4"],
      "explanation": "Quy trình thực nghiệm chuẩn: Lắp ráp dụng cụ -> Đun nóng -> Thu khí -> Tháo ống dẫn khí trước khi tắt đèn cồn để chống sốc nhiệt vỡ ống nghiệm."
    },
    {
      "id": "q6",
      "sectionId": "sec_6",
      "type": "fill_blank",
      "text": "Listen to the audio recording and fill in the missing words in the paragraph below:<br/><br/>Artificial Intelligence is revolutionizing modern [_] by providing personalized learning experiences. In addition, machine learning algorithms can analyze student [_] to offer immediate feedback.",
      "points": 0.5,
      "order": 5,
      "audioUrl": "https://res.cloudinary.com/demo/video/upload/listening_q6.mp3",
      "acceptedAnswersPerBlank": {
        "0": ["education", "Education"],
        "1": ["performance", "progress", "data"]
      },
      "explanation": "Dựa vào đoạn audio: Vị trí [0] người nói đọc 'education'. Vị trí [1] người nói đọc 'performance'."
    },
    {
      "id": "q7",
      "sectionId": "sec_1",
      "type": "single_choice",
      "text": "Trong ngôn ngữ đánh dấu siêu văn bản HTML, thẻ nào sau đây được sử dụng để tạo một siêu liên kết (hyperlink)?",
      "points": 0.25,
      "order": 6,
      "options": [
        { "id": "opt_a", "text": "<raw><a></raw>" },
        { "id": "opt_b", "text": "<raw><link></raw>" },
        { "id": "opt_c", "text": "<raw><href></raw>" },
        { "id": "opt_d", "text": "<raw><url></raw>" }
      ],
      "correctOptionIds": ["opt_a"],
      "explanation": "- BẮT BUỘC dùng thẻ \`<raw>...</raw>\` bọc quanh các thẻ HTML như \`<raw><a></raw>\`, \`<raw><link></raw>\` trong các phương án trả lời. Nếu KHÔNG bọc \`<raw>\`, trình duyệt của thí sinh sẽ TỰ ĐỘNG CONVERT thành thẻ DOM thật, khiến chữ của đáp án bị biến mất hoặc hỏng giao diện bài thi.<br/>- Trong HTML, thẻ \`<a>\` (Anchor) kết hợp với thuộc tính \`href\` được dùng để tạo siêu liên kết (A đúng)."
    },
    {
      "id": "q8",
      "sectionId": "sec_1",
      "type": "single_choice",
      "text": "Trong lập trình Web và xử lý dữ liệu, xét đoạn mã HTML sau chứa nút bấm và ô nhập liệu được bảo vệ bằng thẻ <raw>:<br/><raw><div class=\"box-form\"><input type=\"text\" id=\"user_email\" placeholder=\"Nhập email\"/><button class=\"btn-submit\">Gửi</button></div></raw><br/>Đoạn mã Python kiểm tra độ dài dữ liệu nhập như sau:<br/>\`\`\`python<br/>def check_input(text, max_len):<br/>    # Biến \`text\` biểu thị chuỗi nhập vào<br/>    if len(text) <= max_len and len(text) > 0:<br/>        return \"VALID\"<br/>    return \"INVALID\"<br/>\`\`\`<br/>Nếu gọi lệnh \`check_input(text=\"admin@dktest.com\", max_len=20)\`, kết quả trả về là gì?",
      "points": 0.25,
      "order": 7,
      "options": [
        { "id": "opt_a", "text": "\`\"VALID\"\`" },
        { "id": "opt_b", "text": "\`\"INVALID\"\`" },
        { "id": "opt_c", "text": "\`None\`" },
        { "id": "opt_d", "text": "\`Error\`" }
      ],
      "correctOptionIds": ["opt_a"],
      "explanation": "- Đoạn mã HTML trong đề bài được bọc trong thẻ \`<raw>...</raw>\` để ngăn trình duyệt tự động convert thành ô nhập thật hoặc nút bấm thật trên đề thi, bảo toàn nguyên bản cú pháp cho thí sinh quan sát.<br/>- Dùng dấu \` (backtick đơn) bọc tên biến \`text\`, \`max_len\` và lời gọi hàm \`check_input(...)\` trong dòng.<br/>- Dùng khối 3 dấu \`\`\`python ... \`\`\` để hiển thị khung code Discord với màu cú pháp chuyên nghiệp.<br/>- Chuỗi 'admin@dktest.com' có 16 ký tự ($0 < 16 \\\\le 20$), hàm trả về \`\"VALID\"\`.<br/>Do đó chọn đáp án A."
    }
  ]
}`;

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

  const typesText = config.questionTypes && config.questionTypes.length > 0
    ? config.questionTypes.map((t) => typesMap[t] || t).join(", ")
    : Object.values(typesMap).join(", ");

  return `Bạn là chuyên gia giáo dục và biên soạn đề thi chuyên nghiệp theo chuẩn Bộ Giáo Dục & Đào Tạo và hệ thống khảo thí hiện đại DkTEST.

Dựa vào cấu trúc JSON chuẩn của hệ thống DkTEST (phiên bản mới nhất hỗ trợ toàn diện 6 dạng câu hỏi, âm thanh nghe MP3, tệp đính kèm, LaTeX, Bảng biểu HTML, Khối mã Discord, Khối nguyên bản <raw>):

\`\`\`json
${FULL_DKTEST_JSON_SCHEMA_TEXT}
\`\`\`

Dựa vào cấu trúc JSON trên, hãy tạo cho tôi một đề thi hoàn chỉnh:
- Môn học: ${config.subject || "Toán học & Tiếng Anh"}
- Khối lớp: ${config.grade || "Lớp 12"}
- Yêu cầu / Chủ đề: Đây là đề thi "${config.topic || "Đề thi đánh giá năng lực & Tốt nghiệp THPT 2026"}"
- Đối tượng học sinh: Dành cho "${config.audience || "Học sinh ôn thi THPT Quốc gia & Luyện đề chuẩn"}"
- Thời gian làm bài: ${config.timeLimit || 50} phút
- Số lượng câu hỏi: ${config.questionCount || 25} câu
- Mức độ đề: ${config.difficulty || "Phân hóa từ nhận biết, thông hiểu đến vận dụng cao"}
- Các dạng câu hỏi cần có: ${typesText}
${config.hasAudio ? "- Đề thi có tích hợp phần nghe Audio MP3 (Listening Audio) cho câu hỏi hoặc Section tương ứng." : ""}
${config.hasAttachments ? "- Đề thi có đính kèm tệp tài liệu / liên kết tham khảo (attachments)." : ""}
${config.additionalInfo ? `- Ghi chú bổ sung: ${config.additionalInfo}` : ""}

==================================================
QUY TẮC BẮT BUỘC ĐẦU RA VÀ ĐỊNH DẠNG (LATEST DkTEST 2026):
==================================================

1. TRẢ VỀ DUY NHẤT MỘT KHỐI MÃ JSON HỢP LỆ:
   - Bắt buộc bọc trong \`\`\`json ... \`\`\`.
   - Tuyệt đối không thêm bất kỳ văn bản chào hỏi, giải thích hay kết luận nào ngoài khối JSON.

2. ĐẦY ĐỦ 6 DẠNG CÂU HỎI HIỆN ĐẠI:
   - single_choice: Có "options" ("id", "text") và "correctOptionIds": ["id_đúng"] (duy nhất 1 id đúng).
   - multiple_choice: Có "options" và "correctOptionIds" chứa mảng các id đúng (chọn tất cả phương án đúng).
   - true_false: Chuẩn Bộ GD&ĐT 4 ý a, b, c, d; mỗi ý độc lập có "id", "text" và "correctAnswer": true/false.
   - short_answer: Có "acceptedAnswers" chứa danh sách các dạng đáp số tương đương (ví dụ: ["10", "10.0", "10/1"]).
   - ordering: Sắp xếp các mục; có "orderingItems": [{ "id": "item_1", "text": "..." }] và "correctOrder": ["item_2", "item_1", ...].
   - fill_blank: Điền vào chỗ trống; trong "text" dùng ký hiệu "[_]" và cung cấp "acceptedAnswersPerBlank": { "0": ["từ_khóa_1"], "1": ["từ_khóa_2"] }.

3. CÔNG THỨC TOÁN, LÝ, HÓA (LATEX CHUẨN KATE X):
   - Công thức trong dòng bọc trong '$...$'.
   - Công thức khối riêng bọc trong '$$...$$'.
   - BẮT BUỘC escape đúng chuẩn JSON: ví dụ '\\\\frac{a}{b}', '\\\\sqrt{x^2+1}', '\\\\int_0^1', '\\\\alpha, \\\\beta', '\\\\begin{cases} ... \\\\end{cases}'.
   - Không được để công thức bị lỗi cú pháp KaTeX.

4. ÂM THANH NGHE MP3 (LISTENING AUDIO) & ĐÍNH KÈM (ATTACHMENTS):
   - Khi tạo bài thi môn Ngoại ngữ hoặc đề có bài nghe: cấu hình "audioConfig" ở cấp độ đề thi, section, hoặc "audioUrl" trong từng câu hỏi.
   - Các trường audio: "url", "title", "maxPlays", "allowSeek", "allowPause", "enabled".
   - Tệp đính kèm: trường "attachments": [{ "name": "Tên tệp", "url": "https://...", "type": "file" | "link" }].

5. NGUYÊN TẮC BẮT BUỘC: SỬ DỤNG THẺ <raw>...</raw> ĐỂ HỆ THỐNG KHÔNG CONVERT CÚ PHÁP HTML SANG DOM VÀ DẤU HUYỀN BACKTICK (\` VÀ \`\`\`):

   ⚠️ CẢNH BÁO SỐNG CÒN DÀNH CHO AI (VÌ SAO BẮT BUỘC PHẢI DÙNG THẺ <raw>?):
   - Nền tảng DkTEST hiển thị đề thi cho thí sinh bằng trình render Web HTML trực tiếp.
   - NẾU AI viết các thẻ cú pháp HTML (như <a>, <p>, <div>, <input>, <img>, <button>, <form>, <link>, <table>...) trong câu hỏi hoặc trong các phương án trả lời A, B, C, D mà KHÔNG BỌC TRONG <raw>...</raw>:
     -> Trình duyệt của thí sinh sẽ TỰ ĐỘNG CONVERT CHÚNG THÀNH PHẦN TỬ HTML DOM THẬT!
     -> HẬU QUẢ NGHIÊM TRỌNG:
        * Thẻ <a> sẽ bị trình duyệt biến thành link ẩn và làm MẤT CHỮ của phương án trả lời.
        * Thẻ <img> sẽ bị biến thành icon ảnh vỡ hiển thị trên màn hình.
        * Thẻ <button> sẽ bị biến thành nút bấm thật.
        * Thẻ <input> sẽ bị biến thành ô gõ phím thật.
        * Thẻ <p>, <div>, <form> sẽ làm vỡ tan nát bố cục bảng và giao diện câu hỏi.
        -> Thí sinh KHÔNG THỂ ĐỌC ĐƯỢC CÚ PHÁP VÀ BỊ MẤT ĐÁP ÁN!
   - KHI BỌC TRONG <raw>...</raw>: Hệ thống DkTEST sẽ BẢO TOÀN NGUYÊN BẢN CÚ PHÁP (raw text), VÔ HIỆU HÓA HOÀN TOÀN việc convert HTML của trình duyệt, giúp thí sinh nhìn thấy chính xác 100% cú pháp như "<input type=\"text\">" hay "<a>".

   📌 CÁC TRƯỜNG HỢP CỤ THỂ BẮT BUỘC PHẢI DÙNG <raw>...</raw>:
   
   1. CÂU HỎI HOẶC PHƯƠNG ÁN A, B, C, D HỎI VỀ THẺ HTML / XML:
      - Trong câu hỏi: "Thẻ nào trong HTML dùng để tạo liên kết siêu văn bản?"
      - Trong options PHẢI VIẾT:
        * opt_a: "<raw><a></raw>"  (BẮT BUỘC có <raw> để không bị convert mất chữ)
        * opt_b: "<raw><link></raw>"
        * opt_c: "<raw><href></raw>"
        * opt_d: "<raw><url></raw>"
      - Tuyệt đối KHÔNG ĐƯỢC viết trần trụi "<a>" hay "<link>" vì sẽ bị trình duyệt nuốt mất chữ.
      
   2. ĐOẠN MÃ HTML GIAO DIỆN HOẶC THUỘC TÍNH:
      - Ví dụ đề bài: "Xét đoạn mã HTML sau: <raw><img src=\"logo.png\" alt=\"Logo trường\" width=\"200\"/></raw>..."
      - Ví dụ: "Đoạn form: <raw><form action=\"/login\"><input type=\"text\"/><button>Gửi</button></form></raw>"

   3. KÝ TỰ SO SÁNH TRẦN TRỤI (<, >, &&, ||):
      - Ví dụ: "<raw>while (left < right && count > 0)</raw>"
      - Bắt buộc bọc <raw> để ký tự "< right" không bị hiểu nhầm là mở thẻ HTML '&lt;right&gt;'.

   4. KÝ HIỆU ĐÔ-LA $ TRONG VĂN BẢN (CHỐNG LỖI KATEX):
      - Ví dụ: "Một cuốn sách giá <raw>$20</raw> và tiền ship là <raw>$2</raw>."
      - Bắt buộc bọc <raw> để hai dấu $ không bị kích hoạt KaTeX toán học gây lỗi đỏ.

   5. BIỂU THỨC CHÍNH QUY REGEX:
      - Ví dụ: "<raw>^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$</raw>"

   --------------------------------------------------
   QUY TẮC DÙNG DẤU HUYỀN BACKTICK (\` VÀ \`\`\`):
   - 1. DẤU HUYỀN ĐƠN \` (INLINE CODE - 1 DẤU BACKTICK ĐẦU & CUỐI):
     Bắt buộc dùng khi nhắc đến từ khóa lập trình, tên biến, tên hàm, kiểu dữ liệu hoặc biểu thức ngắn ngay trong câu văn:
     - Ví dụ: "Trong ngôn ngữ Python, biến \`total_sum\` được khởi tạo bằng giá trị \`0\`."
     - Ví dụ: "Hàm \`len(my_list)\` trả về số lượng phần tử của danh sách \`my_list\`."
     - Ví dụ: "Câu lệnh \`cin >> n;\` trong C++ tương đương với lệnh \`n = int(input())\` trong Python."
     - Tuyệt đối KHÔNG dùng dấu nháy kép " " hay nháy đơn ' ' khi đề cập đến mã nguồn hoặc biến số trong dòng.
     
   - 2. KHỐI BA DẤU HUYỀN \`\`\` (CODE BLOCK NHIỀU DÒNG - KÈM TÊN NGÔN NGỮ):
     Bắt buộc dùng khi trình bày đoạn mã nguồn từ 2 dòng trở lên. PHẢI ghi rõ định danh ngôn ngữ (python, cpp, c, java, pascal, javascript, sql, html, css):
     Ví dụ:
     \`\`\`python
     def fibonacci(n):
         if n <= 1:
             return n
         return fibonacci(n - 1) + fibonacci(n - 2)
     \`\`\`
     -> Hệ thống DkTEST sẽ tự động kích hoạt khung code phong cách Discord cao cấp (nền tối, tô màu cú pháp theo ngôn ngữ, đánh số thứ tự dòng và có nút Sao chép mã tiện lợi).

6. BẢNG BIỂU HTML & MARKDOWN:
   - Bảng biến thiên, bảng xét dấu, bảng dữ liệu nên dùng HTML: '<table><thead><tr><th>x</th><th>...</th></tr></thead><tbody><tr><td>f'(x)</td><td>...</td></tr></tbody></table>' hoặc bảng Markdown '|---|---|'.
   - Hộp mẹo tư duy: '<div class="p-3 my-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-900">💡 <strong>Mẹo:</strong> ...</div>'.

7. LỜI GIẢI CHI TIẾT (EXPLANATION):
   - Mỗi câu hỏi bắt buộc phải có "explanation" giải thích chi tiết, sư phạm, chứng minh rõ ràng đáp án cuối cùng. Với câu single_choice, kết luận dòng cuối: "Do đó chọn đáp án [A/B/C/D].".`;
}
