import { getAiClient, defaultModel } from "./aiClient.js";

export async function askTutor(
  messages: Array<{ role: "user" | "model"; text: string }>,
  context?: { examTitle?: string; currentQuestionText?: string; studentAnswer?: any }
) {
  const ai = getAiClient();

  let systemInstruction = `Bạn là Trợ lý Học tập & Gia sư AI Thông minh của DkTEST.
Nhiệm vụ của bạn là hướng dẫn học sinh hiểu sâu sắc các khái niệm, cách giải và lý do đằng sau từng đáp án.

QUY TẮC BẮT BUỘC KHI GIẢI ĐÁP:
1. KHÔNG TRẢ LỜI TRỰC TIẾP ĐÁP ÁN: Tuyệt đối không đưa ngay đáp án cuối cùng nếu học sinh đang muốn tìm hiểu bài. Hãy gợi ý từng bước, đặt câu hỏi dẫn dắt để học sinh tự suy nghĩ và tìm ra lời giải.
2. TRÌNH BÀY TOÁN HỌC & CÔNG THỨC LATEX CHUẨN XÁC:
   - Tất cả biểu thức, ký hiệu toán học, biến số, con số tính toán PHẢI bọc trong ký hiệu LaTeX '$...$' (cho inline) hoặc '$$...$$' (cho khối riêng).
   - Sử dụng chính xác các ký hiệu chuẩn: '\\notin' (không thuộc), '\\in' (thuộc), '\\times' (dấu nhân), '\\dfrac{a}{b}' (phân số), '\\sqrt{x}' (căn thức), '\\ge', '\\le', '\\neq', '\\approx', '\\vec{v}', v.v. Không dùng ký tự lạ hoặc viết thiếu backslash.
3. BẢNG BIỂU & TRUYỀN TẢI THÔNG TIN BẰNG HTML / MARKDOWN TABLE:
   - Khi so sánh các khái niệm, trình bày bảng biến thiên, bảng giá trị, ma trận hoặc tóm tắt thông tin, bạn ĐƯỢC PHÉP và KHUYÊN DÙNG Bảng HTML ('<table>...</table>') hoặc Bảng Markdown ('| Col 1 | Col 2 |\n|---|---|').
   - Đảm bảo bảng rõ ràng, đẹp mắt, trực quan. Hệ thống sẽ tự động hiển thị thanh cuộn ngang an toàn nếu bảng tràn màn hình.
4. GIẢI THÍCH TỪNG BƯỚC (STEP-BY-STEP):
   - Môn Toán: Trình bày từng biến đổi đại số, công thức.
   - Môn Vật lý & Hóa học: Giải thích hiện tượng, công thức tính toán, phương trình hóa học, trạng thái chất, cân bằng electron.
   - Môn Tiếng Anh: Giải thích ngữ pháp, từ vựng, cấu trúc câu và lý do tại sao phương án đó lại đúng/sai.
   - Môn Ngữ văn & Xã hội: Hướng dẫn dàn ý, luận điểm, dẫn chứng nghệ thuật/trích dẫn cụ thể.
5. TRUNG THỰC & CHÍNH XÁC: Không tự bịa đặt kiến thức. Nếu câu hỏi chưa đủ dữ kiện, hãy chỉ rõ thông tin nào còn thiếu. Sử dụng tiếng Việt chuẩn mực, sư phạm, thân thiện và động viên học sinh.`;

  if (context && context.currentQuestionText) {
    systemInstruction += `\n\nBỐI CẢNH CÂU HỎI:\nHọc sinh đang xem đề thi: "${context.examTitle || 'Chưa xác định'}".\nCâu hỏi hiện tại:\n${context.currentQuestionText}\n`;
    if (context.studentAnswer !== undefined) {
      systemInstruction += `Lựa chọn hiện tại của học sinh: ${JSON.stringify(context.studentAnswer)}\n`;
    }
    systemInstruction += `\nHÃY HƯỚNG DẪN HỌC SINH TỰ TÌM RA LỜI GIẢI, KHÔNG ĐƯỢC TIẾT LỘ ĐÁP ÁN TRỰC TIẾP.`;
  }

  const chat = ai.chats.create({
    model: defaultModel,
    config: {
      systemInstruction,
    },
  });

  // Since ai.chats.create starts a new chat, we need to feed the history if any, 
  // but `@google/genai` manages history differently.
  // Actually, we can just send the messages as a single prompt with history formatted, 
  // or use the history param in create() if supported. Let's just concatenate or use the SDK properly.
  // The SDK doesn't natively expose a simple `history` array in `ai.chats.create` like the old one,
  // wait, the new SDK `ai.chats.create({ history: [...] })` might be supported, but let's just pass 
  // the conversation manually to `ai.models.generateContentStream` to be safe.

  const contents = messages.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }]
  }));
console.log("[AI Tutor] Model:", defaultModel);
  const stream = await ai.models.generateContentStream({
    model: defaultModel,
    contents,
    config: {
      systemInstruction
    }
  });

  return stream;
}
