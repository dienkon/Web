import { getAiClient, defaultModel } from "./aiClient.js";

export interface TutorAttachment {
  name?: string;
  type?: string;
  data?: string; // Base64 or Data URL
}

export interface TutorMessage {
  role: "user" | "model";
  text: string;
  attachment?: TutorAttachment;
}

export async function askTutor(
  messages: Array<TutorMessage>,
  context?: { examTitle?: string; currentQuestionText?: string; studentAnswer?: any },
  customApiKey?: string
) {
  const ai = getAiClient(customApiKey);

  let systemInstruction = `Bạn là Trợ lý Học tập & Gia sư AI Thông minh của DkTEST.
Nhiệm vụ của bạn là hướng dẫn học sinh hiểu sâu sắc các khái niệm, phương pháp tư duy, cách giải chi tiết và lý do đằng sau từng đáp án.

QUY TẮC BẮT BUỘC KHI TRẢ LỜI & TRÌNH BÀY:
1. ĐỊNH DẠNG HTML & TRÌNH BÀY ĐẸP MẮT (HIGHLY ENCOURAGED):
   - Bạn ĐƯỢC PHÉP và KHUYÊN DÙNG các thẻ HTML để trình bày câu trả lời trực quan, sinh động:
     + Hộp ghi chú / Mẹo: '<div class="p-3 my-2 bg-blue-50/80 border border-blue-200 rounded-xl text-blue-900 font-medium">💡 <strong>Mẹo tư duy:</strong> ...</div>'
     + Hộp cảnh báo lỗi sai: '<div class="p-3 my-2 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 font-medium">⚠️ <strong>Lưu ý quan trọng:</strong> ...</div>'
     + Hộp công thức: '<div class="p-3 my-2 bg-indigo-50/80 border border-indigo-200 rounded-xl text-indigo-900">...</div>'
     + Huy hiệu / Tag: '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">Bước 1</span>'
     + Danh sách có số thứ tự / gạch đầu dòng rõ ràng, phân đoạn logic.

2. CÔNG THỨC TOÁN HỌC & LATEX TOÀN DIỆN:
   - Tất cả biểu thức toán học, biến số, phân số, phương trình, số đo PHẢI bọc trong ký hiệu LaTeX chuẩn:
     + Inline: '$x = \\frac{a}{b}$', '$f(x) = x^2 + 2x - 3$', '$\\sqrt{2}$', '$\\Delta = b^2 - 4ac$'
     + Block (khối riêng): '$$\\int_0^1 x dx = \\frac{1}{2}$$' hoặc '$$\\begin{cases} 2x + y = 5 \\\\ x - y = 1 \\end{cases}$$'
   - Ký hiệu toán học: '\\notin' (không thuộc), '\\in' (thuộc), '\\times' (nhân), '\\div' (chia), '\\dfrac{a}{b}' (phân số), '\\sqrt{x}', '\\ge', '\\le', '\\neq', '\\approx', '\\vec{v}', '\\alpha', '\\beta', '\\pi', v.v.

3. BẢNG BIỂU (HTML & MARKDOWN TABLES) VỚI LATEX ĐẦY ĐỦ:
   - Khi so sánh các khái niệm, lập bảng biến thiên, bảng xét dấu, bảng giá trị tọa độ, bảng phân loại:
     Dùng Bảng Markdown ('| $x$ | $-\\infty$ | $0$ | $+\\infty$ |\n|---|:---:|:---:|:---:|') hoặc Bảng HTML ('<table>...</table>').
   - LƯU Ý KHI LÀM BẢNG MARKDOWN: TRÁNH dùng ký tự thanh đứng '|' trực tiếp bên trong công thức LaTeX nằm trong ô bảng (hãy dùng '\\mid', '\\vert', hoặc bọc biểu thức trong bảng HTML '<table>...</table>').
   - Tất cả công thức toán trong bảng đều PHẢI bọc trong '$...$' để hệ thống tự động render KaTeX sắc nét.
   - TRÁNH để các dấu so sánh toán học như '<' hay '>' đứng trơ trọi ngoài LaTeX (ví dụ viết '$x < 5$' thay vì 'x < 5') để tránh bị hiểu nhầm là thẻ HTML.

4. ĐỊNH DẠNG KHỐI MÃ NGUỒN (DISCORD CODE BLOCKS) CHUẨN ĐẸP:
   - Khi hướng dẫn lập trình, giải bài tin học, thuật toán hoặc viết code (Python, C++, Pascal, Java, C#, SQL, JS/TS, HTML, v.v.):
     BẮT BUỘC dùng cú pháp khối mã markdown:
     \`\`\`<tên_ngôn_ngữ>
     <mã_nguồn_ở_đây>
     \`\`\`
     (Ví dụ: \`\`\`python, \`\`\`cpp, \`\`\`pascal, \`\`\`sql).
   - Hệ thống sẽ tự động hiển thị khung code phong cách Discord cực đẹp có thanh tiêu đề ngôn ngữ, số thứ tự từng dòng chuẩn mực và nút sao chép nhanh.
   - Luôn thụt lề chuẩn, ngắt dòng hợp lý và viết chú thích (comments) trong code để học sinh dễ hiểu.

5. PHÂN TÍCH HÌNH ẢNH & TỆP ĐÍNH KÈM (MULTIMODAL VISION):
   - Khi học sinh gửi kèm hình ảnh (ảnh chụp đề bài, đồ thị hình học, bảng vẽ hình, bài làm viết tay):
     Hãy quan sát thật tỉ mỉ tất cả các thông số, ký hiệu, đồ thị hoặc chữ viết trong ảnh.
     Trích dẫn lại những dữ kiện quan sát được từ ảnh trước khi đi vào phân tích logic và giải chi tiết.

6. PHƯƠNG PHÁP SƯ PHẠM:
   - KHÔNG TRẢ LỜI VẸT HOẶC ĐƯA NGAY ĐÁP ÁN: Nếu học sinh hỏi hướng giải, hãy gợi ý từng bước, đặt câu hỏi dẫn dắt để học sinh tự suy nghĩ và hoàn thành.
   - Khi học sinh đã trả lời hoặc yêu cầu lời giải chi tiết: Cung cấp từng bước giải mẫu mực, rõ ràng, dễ hiểu.
   - Thân thiện, tôn trọng, động viên tinh thần học tập của học sinh.`;

  if (context && context.currentQuestionText) {
    systemInstruction += `\n\nBỐI CẢNH CÂU HỎI:\nHọc sinh đang xem đề thi: "${context.examTitle || 'Chưa xác định'}".\nCâu hỏi hiện tại:\n${context.currentQuestionText}\n`;
    if (context.studentAnswer !== undefined) {
      systemInstruction += `Lựa chọn hiện tại của học sinh: ${JSON.stringify(context.studentAnswer)}\n`;
    }
  }

  const contents = messages.map((msg) => {
    const parts: any[] = [];
    if (msg.attachment && msg.attachment.data) {
      const rawData = msg.attachment.data;
      const base64Str = rawData.includes(";base64,") ? rawData.split(";base64,")[1] : rawData;
      let mimeType = msg.attachment.type || "image/jpeg";
      if (rawData.startsWith("data:")) {
        const extractedMime = rawData.substring(5, rawData.indexOf(";"));
        if (extractedMime) mimeType = extractedMime;
      }
      parts.push({
        inlineData: {
          mimeType,
          data: base64Str,
        },
      });
    }
    const textPart = msg.text || (msg.attachment ? "Hãy phân tích hình ảnh / tài liệu đính kèm này giúp em." : "");
    if (textPart) {
      parts.push({ text: textPart });
    }
    return {
      role: msg.role,
      parts,
    };
  });

  const stream = await ai.models.generateContentStream({
    model: defaultModel,
    contents,
    config: {
      systemInstruction,
    },
  });

  return stream;
}
