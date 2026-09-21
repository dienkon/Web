import mammoth from "mammoth";
import { getAiClient, defaultModel } from "./aiClient.js";

export interface TutorAttachment {
  name?: string;
  type?: string;
  data?: string; // Base64 or Data URL
  size?: number;
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

  let systemInstruction = `Bạn là Trợ lý Học tập & Gia sư AI Thông minh của DkTEST (Nền tảng thi và khảo thí trực tuyến hiện đại).
Nhiệm vụ của bạn là hướng dẫn học sinh hiểu sâu sắc các khái niệm, phương pháp tư duy, cách giải chi tiết và lý do đằng sau từng đáp án.

QUY TẮC BẮT BUỘC KHI TRẢ LỜI & TRÌNH BÀY:
1. ĐỊNH DẠNG HTML & TRÌNH BÀY ĐẸP MẮT:
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
   - Tất cả công thức toán trong bảng đều PHẢI bọc trong '$...$' để hệ thống tự động render KaTeX sắc nét.
   - TRÁNH để các dấu so sánh toán học như '<' hay '>' đứng trơ trọi ngoài LaTeX (ví dụ viết '$x < 5$' thay vì 'x < 5') để tránh bị hiểu nhầm là thẻ HTML.

4. ĐỊNH DẠNG KHỐI MÃ NGUỒN (DISCORD CODE BLOCKS) CHUẨN ĐẸP:
   - Khi hướng dẫn lập trình, giải bài tin học, thuật toán hoặc viết code (Python, C++, Pascal, Java, C#, SQL, JS/TS, HTML, v.v.):
     BẮT BUỘC dùng cú pháp khối mã markdown:
     \`\`\`<tên_ngôn_ngữ>
     <mã_nguồn_ở_đây>
     \`\`\`
   - Hệ thống tự động render khung code phong cách Discord cực đẹp có thanh tiêu đề ngôn ngữ, số dòng và nút sao chép nhanh.

5. PHÂN TÍCH HÌNH ẢNH & TỆP ĐÍNH KÈM (MULTIMODAL VISION & TÀI LIỆU):
   - Khi học sinh gửi kèm hình ảnh (ảnh chụp đề bài, đồ thị hình học, bảng vẽ hình, bài làm viết tay, sơ đồ thí nghiệm) hoặc tệp tài liệu:
     + BƯỚC 1 - NHẬN DIỆN VÀ TRÍCH DẪN ĐỀ BÀI: Hãy quan sát tỉ mỉ toàn bộ hình ảnh hoặc tài liệu. Đọc chính xác từng câu chữ, ký hiệu toán học, số liệu, đồ thị, phương trình và đề bài. Viết lại tóm tắt nội dung đề bài bạn nhận diện được vào một hộp ghi chú ('<div class="p-3 my-2 bg-indigo-50/90 border border-indigo-200 rounded-xl text-indigo-900 font-medium">📋 <strong>Đề bài nhận diện từ ảnh/tệp:</strong> ...</div>') để học sinh đối chiếu.
     + BƯỚC 2 - PHÂN TÍCH PHƯƠNG PHÁP: Nêu rõ các định lý, công thức hoặc hướng tư duy ngắn gọn.
     + BƯỚC 3 - LỜI GIẢI CHI TIẾT & ĐÁP ÁN: Trình bày từng bước giải mẫu mực, tính toán chính xác, công thức KaTeX sắc nét và đưa ra đáp án cuối cùng rõ ràng.
     + Nếu ảnh chụp bị mờ hoặc góc chụp bị khuất một phần, hãy nêu rõ phần đọc được và nhắc nhở học sinh chụp lại phần còn thiếu.

6. PHƯƠNG PHÁP SƯ PHẠM:
   - Nếu học sinh hỏi hướng dẫn giải hoặc gợi ý, hãy đặt câu hỏi gợi mở từng bước.
   - Khi học sinh yêu cầu giải chi tiết, cung cấp lời giải hoàn chỉnh, mẫu mực và dễ hiểu nhất.
   - Thân thiện, tôn trọng, đồng hành tích cực cùng học sinh.`;

  if (context && context.currentQuestionText) {
    systemInstruction += `\n\nBỐI CẢNH CÂU HỎI:\nHọc sinh đang xem đề thi: "${context.examTitle || 'Chưa xác định'}".\nCâu hỏi hiện tại:\n${context.currentQuestionText}\n`;
    if (context.studentAnswer !== undefined) {
      systemInstruction += `Lựa chọn hiện tại của học sinh: ${JSON.stringify(context.studentAnswer)}\n`;
    }
  }

  const contents = await Promise.all(
    messages.map(async (msg) => {
      const parts: any[] = [];
      let extraTextFromAttachment = "";

      if (msg.attachment && msg.attachment.data) {
        const rawData = msg.attachment.data;
        const base64Str = rawData.includes(";base64,") ? rawData.split(";base64,")[1] : rawData;
        let mimeType = msg.attachment.type || "image/jpeg";
        if (rawData.startsWith("data:")) {
          const extractedMime = rawData.substring(5, rawData.indexOf(";"));
          if (extractedMime) mimeType = extractedMime;
        }

        const fileName = (msg.attachment.name || "").toLowerCase();

        // 1. Word document (.docx / .doc) -> Extract text via mammoth
        if (
          mimeType.includes("word") ||
          mimeType.includes("officedocument") ||
          fileName.endsWith(".docx") ||
          fileName.endsWith(".doc")
        ) {
          try {
            const buffer = Buffer.from(base64Str, "base64");
            const docxResult = await mammoth.extractRawText({ buffer });
            const docxText = docxResult.value?.trim();
            if (docxText) {
              extraTextFromAttachment = `\n\n[Nội dung tài liệu Word đính kèm "${msg.attachment.name || 'document.docx'}":]\n${docxText}\n`;
            }
          } catch (e: any) {
            console.error("[askTutor] Lỗi trích xuất văn bản từ tệp Word:", e);
          }
        }
        // 2. Text / Code files (.txt, .csv, .md, .json, .py, .js, .ts, etc.) -> Decode UTF-8 text
        else if (
          mimeType.startsWith("text/") ||
          fileName.endsWith(".txt") ||
          fileName.endsWith(".md") ||
          fileName.endsWith(".csv") ||
          fileName.endsWith(".json") ||
          fileName.endsWith(".py") ||
          fileName.endsWith(".js") ||
          fileName.endsWith(".ts")
        ) {
          try {
            const textContent = Buffer.from(base64Str, "base64").toString("utf-8");
            extraTextFromAttachment = `\n\n[Nội dung tệp văn bản đính kèm "${msg.attachment.name || 'file.txt'}":]\n\`\`\`\n${textContent}\n\`\`\`\n`;
          } catch (e) {
            console.error("[askTutor] Lỗi giải mã tệp văn bản:", e);
          }
        }
        // 3. Native Multimodal inlineData: Images and PDF documents
        else {
          let normalizedMime = mimeType;
          if (normalizedMime.includes("pdf") || fileName.endsWith(".pdf")) {
            normalizedMime = "application/pdf";
          } else if (normalizedMime.includes("png") || fileName.endsWith(".png")) {
            normalizedMime = "image/png";
          } else if (normalizedMime.includes("webp") || fileName.endsWith(".webp")) {
            normalizedMime = "image/webp";
          } else if (normalizedMime.includes("gif") || fileName.endsWith(".gif")) {
            normalizedMime = "image/gif";
          } else if (normalizedMime.includes("heic") || fileName.endsWith(".heic")) {
            normalizedMime = "image/heic";
          } else {
            normalizedMime = "image/jpeg";
          }

          parts.push({
            inlineData: {
              mimeType: normalizedMime,
              data: base64Str,
            },
          });
        }
      }

      let textPart = msg.text || "";
      if (extraTextFromAttachment) {
        textPart = (textPart ? `${textPart}\n` : "") + extraTextFromAttachment;
      }
      if (!textPart && msg.attachment) {
        textPart = "Em gửi hình ảnh / tệp bài tập này, Gia sư AI hãy quan sát, đọc kĩ đề bài và hướng dẫn giải chi tiết giúp em nhé!";
      }

      if (textPart) {
        parts.push({ text: textPart });
      }

      return {
        role: msg.role,
        parts,
      };
    })
  );

  // Model fallback list to ensure high availability
  const candidateModels = [
    defaultModel,
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ].filter((m, idx, arr) => Boolean(m) && arr.indexOf(m) === idx);

  let lastError: any = null;
  for (const model of candidateModels) {
    try {
      const stream = await ai.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction,
        },
      });
      return stream;
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      if (
        errMsg.includes("not found") ||
        errMsg.includes("404") ||
        errMsg.includes("unsupported") ||
        errMsg.includes("is not found")
      ) {
        console.warn(`[AI Tutor] Model ${model} unavailable, trying next candidate...`);
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}
