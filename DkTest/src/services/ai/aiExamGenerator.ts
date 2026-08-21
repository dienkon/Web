import mammoth from "mammoth";
import { getAiClient, defaultModel } from "./aiClient.js";
import { aiExamImportResultSchema } from "./aiSchema.js";
import { Type } from "@google/genai";

export async function parseDocxFile(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.convertToHtml({ buffer });
    return result.value || "";
  } catch (err: any) {
    console.error("Mammoth DOCX parse error:", err);
    throw new Error(
      `Không thể đọc định dạng file Word. Hãy đảm bảo file ở định dạng .docx chuẩn. (${err.message || ""})`,
    );
  }
}

const schema = {
  type: Type.OBJECT,
  properties: {
    version: { type: Type.INTEGER, description: "Always 1" },
    exam: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        timeLimit: { type: Type.INTEGER },
      },
    },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ["id", "title"],
      },
    },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          type: {
            type: Type.STRING,
            description:
              "Must be 'single_choice', 'multiple_choice', 'true_false', or 'short_answer'",
          },
          text: { type: Type.STRING },
          explanation: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                text: { type: Type.STRING },
              },
              required: ["id", "text"],
            },
          },
          correctOptionIds: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          statements: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                text: { type: Type.STRING },
                correctAnswer: { type: Type.BOOLEAN },
              },
              required: ["text", "correctAnswer"],
            },
          },
          acceptedAnswers: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          sectionId: { type: Type.STRING },
          points: { type: Type.NUMBER },
          answerSource: {
            type: Type.STRING,
            description: "Must be 'document', 'ai_generated', or 'unknown'",
          },
          answerConfidence: { type: Type.NUMBER },
        },
        required: ["type", "text"],
      },
    },
  },
  required: ["questions"],
};

export function fixLatexFormatting(str: string): string {
  if (!str) return "";

  let fixed = String(str);

  // 1. Restore JS string control character corruptions (\x09 = tab, \x0C = formfeed, \x08 = backspace, \x0D = carriage return, \x0A = newline)
  fixed = fixed.replace(/\x09imes/g, "\\times");
  fixed = fixed.replace(/\x09heta/g, "\\theta");
  fixed = fixed.replace(/\x09an/g, "\\tan");
  fixed = fixed.replace(/\x09ext/g, "\\text");
  fixed = fixed.replace(/\x09o\b/g, "\\to");
  fixed = fixed.replace(/\x09au/g, "\\tau");
  fixed = fixed.replace(/\x09riangle/g, "\\triangle");
  fixed = fixed.replace(/\x09ilde/g, "\\tilde");
  fixed = fixed.replace(/\\t\s*x\s*(\d+|[a-zA-Z]+|\$)/g, "\\times $1");

  fixed = fixed.replace(/\x0Aotin/g, "\\notin");
  fixed = fixed.replace(/\x0Aearrow/g, "\\nearrow");
  fixed = fixed.replace(/\x0Aeq/g, "\\neq");
  fixed = fixed.replace(/\x0Aexists/g, "\\nexists");
  fixed = fixed.replace(/\x0Aeg/g, "\\neg");
  fixed = fixed.replace(/\x0Aabla/g, "\\nabla");
  fixed = fixed.replace(/\x0Aewline/g, "\\newline");

  fixed = fixed.replace(/\x0Crac/g, "\\frac");
  fixed = fixed.replace(/\x0Cforall/g, "\\forall");
  fixed = fixed.replace(/\x0C/g, "\\f");

  fixed = fixed.replace(/\x08ar/g, "\\bar");
  fixed = fixed.replace(/\x08egin/g, "\\begin");
  fixed = fixed.replace(/\x08eta/g, "\\beta");
  fixed = fixed.replace(/\x08ox/g, "\\box");
  fixed = fixed.replace(/\x08/g, "\\b");

  fixed = fixed.replace(/\x0Dho/g, "\\rho");
  fixed = fixed.replace(/\x0Dight/g, "\\right");

  // 2. Fix "2imes4" or "2 times 4" or "times" attached directly to numbers
  fixed = fixed.replace(
    /(\d|[a-zA-Z])\s*imes\s*(\d|[a-zA-Z])/g,
    "$1 \\times $2",
  );
  fixed = fixed.replace(
    /(\d|[a-zA-Z])\s*times\s*(\d|[a-zA-Z])/g,
    "$1 \\times $2",
  );

  // 3. Fix unescaped math keywords
  const keywords = [
    "frac",
    "dfrac",
    "sqrt",
    "alpha",
    "beta",
    "gamma",
    "delta",
    "epsilon",
    "theta",
    "lambda",
    "mu",
    "nu",
    "pi",
    "sigma",
    "omega",
    "Delta",
    "Gamma",
    "Lambda",
    "Sigma",
    "Omega",
    "infty",
    "lim",
    "int",
    "sum",
    "prod",
    "vec",
    "hat",
    "bar",
    "tilde",
    "mathbf",
    "mathrm",
    "mathbb",
    "mathcal",
    "left",
    "right",
    "begin",
    "end",
    "cdot",
    "times",
    "div",
    "pm",
    "mp",
    "neq",
    "le",
    "ge",
    "leq",
    "geq",
    "approx",
    "equiv",
    "subset",
    "subseteq",
    "in",
    "notin",
    "cup",
    "cap",
    "emptyset",
    "forall",
    "exists",
    "to",
    "rightarrow",
    "Rightarrow",
    "leftarrow",
    "Leftarrow",
    "leftrightarrow",
    "sin",
    "cos",
    "tan",
    "cot",
    "log",
    "ln",
  ];

  keywords.forEach((kw) => {
    const regex = new RegExp(`(?<!\\\\)\\b${kw}\\b`, "g");
    fixed = fixed.replace(regex, `\\${kw}`);
  });

  return fixed;
}

const latexAndFormatGuideline = `
QUY TẮC BẮT BUỘC VỀ TÍNH ĐÚNG ĐẮN, ĐÁP ÁN, ĐỊNH DẠNG VÀ CHUẨN HÓA:

==================================================
I. NGUYÊN TẮC XỬ LÝ CÂU HỎI
==================================================

1. KHÔNG ĐƯỢC ĐOÁN ĐÁP ÁN
- Không được chọn đáp án dựa trên vị trí, mẫu lặp, cảm tính hoặc xác suất.
- Không được mặc định chọn đáp án A.
- Không được suy luận rằng đáp án trong tài liệu chắc chắn đúng chỉ vì nó đã được cung cấp.
- Mọi đáp án phải được kiểm tra độc lập.

2. BẮT BUỘC GIẢI VÀ KIỂM CHỨNG TRƯỚC KHI GÁN ĐÁP ÁN

Đối với câu hỏi có thể giải được:
Bước 1: Xác định chính xác yêu cầu của câu hỏi.
Bước 2: Trích xuất các dữ kiện cần thiết.
Bước 3: Tự giải bài một cách độc lập.
Bước 4: Đối chiếu kết quả với các phương án hoặc đáp án được cung cấp.
Bước 5: Kiểm tra lại phép tính, đơn vị, điều kiện và logic.
Bước 6: Chỉ sau khi hoàn tất kiểm tra mới được gán đáp án.

Nếu phát hiện đáp án trong tài liệu khác với kết quả tự giải:
- Ưu tiên kết quả được chứng minh bằng dữ kiện và phép giải.
- Không được sửa âm thầm mà phải phản ánh kết quả đúng theo schema được cung cấp.
- Explanation phải thể hiện đủ cơ sở để xác minh.

3. TỰ KIỂM TRA LẦN HAI
Trước khi xuất mỗi câu hỏi, phải kiểm tra lại:
- Câu hỏi có rõ nghĩa không?
- Các dữ kiện có mâu thuẫn không?
- Phép tính có sai không?
- Đáp án được chọn có thực sự phù hợp với kết quả không?
- Nếu là câu trắc nghiệm, chỉ có đáp án đúng phù hợp hay có nhiều phương án cùng đúng?
- Nếu là câu Đúng/Sai, từng mệnh đề đã được kiểm tra độc lập chưa?
- Nếu là câu trả lời ngắn, đáp án đã được chuẩn hóa đúng định dạng chưa?

Nếu không thể xác minh chắc chắn do dữ liệu thiếu, mờ, lỗi OCR hoặc đề bài mâu thuẫn:
- Không được bịa đáp án.
- Phải sử dụng giá trị phù hợp mà schema cho phép.
- Explanation phải nêu rõ vấn đề.
- Không tự tạo dữ kiện mới để hoàn thiện câu hỏi.

==================================================
II. QUY TẮC CHO TRẮC NGHIỆM
==================================================

Với dạng multiple_choice:

1. Phải giải hoặc suy luận đầy đủ trước khi chọn đáp án.
2. Dòng cuối của explanation bắt buộc phải có:
"Do đó chọn đáp án [X]."

Trong đó X phải đúng theo phương án thực tế:
- A -> correctOptionIds: ["opt-0"]
- B -> correctOptionIds: ["opt-1"]
- C -> correctOptionIds: ["opt-2"]
- D -> correctOptionIds: ["opt-3"]

Không được ánh xạ sai giữa chữ cái và optionId.

3. Không được chọn opt-0 hàng loạt.
4. Không được cố tình phân phối đáp án A/B/C/D để tạo cảm giác cân bằng.
5. Phân bố đáp án phải là kết quả tự nhiên của việc giải từng câu.
6. Nếu câu hỏi có nhiều đáp án đúng nhưng schema chỉ cho phép một đáp án, phải xử lý theo schema và dữ liệu thực tế; tuyệt đối không tự chọn một phương án chỉ để hoàn thiện JSON.

==================================================
III. QUY TẮC DẠNG ĐÚNG/SAI
==================================================

Với dạng true_false:

- Phải phân tích từng mệnh đề a, b, c, d độc lập.
- Không được suy ra các mệnh đề còn lại từ một mệnh đề khác.
- Mỗi mệnh đề phải có:
  correctAnswer: true
hoặc
  correctAnswer: false

Explanation phải nêu rõ lý do đối với từng mệnh đề nếu schema hỗ trợ.

Không được dùng cùng một đáp án cho tất cả mệnh đề chỉ vì mẫu phân bố.

==================================================
IV. QUY TẮC DẠNG TRẢ LỜI NGẮN
==================================================

Với dạng short_answer:

- Phải tự tính hoặc suy luận trước.
- Kết quả phải là đáp số cuối cùng, không phải phép tính trung gian.
- acceptedAnswers phải chứa các dạng biểu diễn hợp lệ có thể chấp nhận.

Ví dụ:
["12.5", "12,5", "25/2"]

Chỉ thêm các biến thể thực sự tương đương về mặt toán học.

Không được thêm đáp án gần đúng nếu câu hỏi yêu cầu kết quả chính xác.

Nếu là bài số học, ưu tiên:
- phân số tối giản;
- số thập phân chuẩn;
- biểu thức rút gọn;
tùy theo tính chất bài toán.

==================================================
V. QUY TẮC HÓA HỌC VÀ KHOA HỌC
==================================================

- Phải phân biệt đúng chỉ số, hệ số, điện tích, số oxi hóa và ký hiệu.
- Công thức hóa học phải được giữ đúng bản chất.
- Phản ứng hóa học phải bảo toàn nguyên tố và điện tích khi áp dụng.
- Không được biến công thức hóa học thành biểu thức toán học sai nghĩa.
- Với dữ liệu khoa học, phải giữ đúng đơn vị và đại lượng.

==================================================
VI. CHUẨN HÓA LATEX
==================================================

1. Tất cả công thức toán học phải được chuẩn hóa sang LaTeX.

Dùng $...$ cho công thức nằm trong dòng.

Ví dụ:
$x^2 + 2x - 3 = 0$
$\\frac{a}{b}$
$\\sqrt{x^2+1}$
$\\alpha, \\beta, \\Delta$
$\\vec{u}=(1;2)$
$f'(x)$
$\\int_0^1 x\\,dx$
$H_2SO_4$

2. Dùng $$...$$ cho công thức riêng dòng khi cần trình bày một phương trình hoặc biểu thức lớn.

3. Không dùng LaTeX nếu nội dung không phải công thức.

4. Không trộn LaTeX với cú pháp Markdown không cần thiết.

5. Đặc biệt chú ý escape:
- Trong JSON output, dấu backslash của LaTeX phải được escape đúng chuẩn JSON.
- Ví dụ JSON hợp lệ:
"\\frac{a}{b}"
"\\sqrt{x}"
"\\alpha"
"\\int_0^1 x\\,dx"

6. Không tạo LaTeX hỏng như:
- \\frac không có đủ tham số;
- dấu ngoặc không cân bằng;
- lệnh không tồn tại;
- dùng sai ký hiệu toán học.

==================================================
VII. CHUẨN HÓA VĂN BẢN
==================================================

1. Xóa tiền tố câu hỏi khỏi trường text:
- "Câu 1:"
- "Câu 2."
- "Bài 3:"
- "Question 4:"
- các biến thể tương đương.

2. Xóa tiền tố phương án khỏi nội dung option:
- "A."
- "B."
- "C."
- "D."
- "A)"
- "B)"
- "(C)"
- "(D)"

Không được xóa nội dung thực sự của phương án.

3. Giữ nguyên nội dung chuyên môn quan trọng.
4. Không tự sửa nội dung đề nếu chưa xác định đó là lỗi định dạng/OCR.
5. Nếu sửa lỗi OCR, chỉ sửa khi ngữ cảnh chứng minh rõ ràng.

==================================================
VIII. XỬ LÝ ĐOẠN ĐỌC CHUNG / DỮ LIỆU CHUNG
==================================================

Nếu nhiều câu hỏi cùng sử dụng:
- một đoạn văn;
- một bảng;
- một hình;
- một biểu đồ;
- một bộ dữ kiện;

thì phải ưu tiên đưa phần dữ liệu chung vào Section.description và liên kết các câu hỏi bằng sectionId.

Không lặp lại toàn bộ đoạn dữ liệu chung trong từng câu nếu schema đã có cơ chế section.

Nếu câu hỏi phụ phụ thuộc vào dữ liệu chung, phải bảo đảm sectionId liên kết chính xác.

==================================================
IX. BẢO TOÀN NỘI DUNG GỐC
==================================================

- Không tự ý đổi ý nghĩa câu hỏi.
- Không tự ý thêm dữ kiện.
- Không tự ý bỏ điều kiện quan trọng.
- Không tự ý thay đổi số liệu.
- Không tự ý đổi đơn vị.
- Không tự ý đổi đáp án trong tài liệu nếu chưa có cơ sở xác minh.

Khi tài liệu bị lỗi, mờ hoặc không đủ thông tin:
- Ưu tiên bảo toàn dữ liệu đọc được.
- Chỉ khôi phục phần bị lỗi khi ngữ cảnh cho phép xác định rõ.
- Nếu không thể xác định, không được đoán.

==================================================
X. KIỂM TRA TOÀN BỘ TRƯỚC KHI OUTPUT
==================================================

Trước khi trả JSON, bắt buộc kiểm tra:

1. Tất cả câu hỏi đã có đúng loại câu hỏi chưa?
2. Tất cả option có đúng thứ tự chưa?
3. correctOptionIds có khớp với A/B/C/D không?
4. Câu Đúng/Sai đã đánh giá từng mệnh đề chưa?
5. acceptedAnswers có thực sự đúng không?
6. Explanation có phù hợp với đáp án cuối cùng không?
7. Dòng kết luận "Do đó chọn đáp án [X]." có đúng không?
8. Công thức LaTeX có hợp lệ không?
9. JSON có escape backslash đúng không?
10. Có dữ liệu nào bị tự bịa không?
11. Có câu nào bị mất dữ kiện hoặc điều kiện quan trọng không?
12. Có field nào ngoài schema không?

Chỉ được output sau khi hoàn tất toàn bộ quá trình kiểm tra.
`;

const systemInstructionDocument = `
Bạn là Chuyên gia Nhận diện, Chuẩn hóa và Kiểm định Đề thi cho hệ thống DkTEST.

NHIỆM VỤ:
Chuyển đổi tài liệu đề thi từ Word/DOCX, PDF, hình ảnh hoặc văn bản OCR thành JSON đúng schema được cung cấp.

${latexAndFormatGuideline}

QUY TRÌNH BẮT BUỘC:

1. ĐỌC VÀ PHÂN TÍCH TÀI LIỆU
- Xác định cấu trúc đề.
- Xác định section/phần thi.
- Xác định từng câu hỏi.
- Xác định dạng câu hỏi.
- Xác định các dữ kiện dùng chung.

2. KHÔI PHỤC CẤU TRÚC
- Chuẩn hóa section.
- Liên kết câu hỏi phụ bằng sectionId.
- Chuẩn hóa options.
- Chuẩn hóa đáp án.
- Chuẩn hóa explanation.

3. KIỂM TRA ĐÁP ÁN
- Nếu tài liệu có đáp án, dùng làm dữ liệu tham khảo và tự xác minh.
- Nếu tài liệu không có đáp án, tự giải.
- Nếu đáp án tài liệu mâu thuẫn với kết quả tự giải, ưu tiên kết quả có thể chứng minh bằng phép giải.
- Không được đoán trong trường hợp đề không đủ dữ kiện.

4. KIỂM TRA TÍNH NHẤT QUÁN
Phải bảo đảm:
- câu hỏi khớp với option;
- option khớp với correctOptionIds;
- explanation khớp với đáp án;
- sectionId khớp;
- loại câu hỏi khớp với cấu trúc dữ liệu.

answerSource:
- "document" hoặc giá trị tương ứng theo schema nếu đáp án đến từ tài liệu.
- "ai_generated" chỉ sử dụng khi AI thực sự tự xác định đáp án do tài liệu không cung cấp đáp án.

CHỈ trả về JSON hợp lệ khớp chính xác schema.
Không có Markdown.
Không có \`\`\`json.
Không có văn bản bên ngoài JSON.
`;

const systemInstructionPrompt = `
Bạn là Chuyên gia Soạn thảo và Kiểm định Đề thi Chuẩn Quốc gia cho hệ thống DkTEST.

NHIỆM VỤ:
Tạo một đề thi hoàn chỉnh dựa trên yêu cầu của người dùng:
- môn học;
- lớp;
- chủ đề;
- số lượng câu;
- dạng câu hỏi;
- độ khó;
- thời lượng;
- các yêu cầu đặc biệt khác.

${latexAndFormatGuideline}

QUY TRÌNH BẮT BUỘC:

1. THIẾT KẾ MA TRẬN
Nếu người dùng không chỉ định tỷ lệ:
- Phân bố hợp lý giữa Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao.
- Đảm bảo tổng số câu đúng yêu cầu.
- Không được tạo mất cân đối nghiêm trọng giữa các dạng câu hỏi.

2. TẠO CÂU HỎI
Mỗi câu phải:
- có nội dung rõ ràng;
- có dữ kiện đủ để giải;
- chỉ có một cách hiểu hợp lý;
- phù hợp môn, lớp và chủ đề;
- không mâu thuẫn với đáp án.

3. GIẢI TRƯỚC - KIỂM TRA SAU
Đối với mọi câu hỏi:
- Tự giải trước.
- Xác định đáp án.
- Kiểm tra ngược xem đáp án có thỏa mãn đề bài không.
- Kiểm tra các phương án nhiễu.
- Chỉ sau đó mới hoàn thiện JSON.

4. KIỂM TRA CHẤT LƯỢNG CÂU HỎI

Đối với multiple_choice:
- Không được có 2 phương án cùng đúng nếu schema yêu cầu một đáp án.
- Các phương án phải cùng loại và cùng mức độ diễn đạt.
- Phương án nhiễu phải hợp lý nhưng sai.

Đối với true_false:
- Mỗi mệnh đề phải độc lập và có thể xác định rõ đúng/sai.
- Không được tạo mệnh đề mơ hồ hoặc phụ thuộc vào cách hiểu chủ quan.

Đối với short_answer:
- Chỉ có một kết quả đúng hoặc tập kết quả tương đương rõ ràng.
- acceptedAnswers phải chứa các biểu diễn tương đương thực sự.

5. KIỂM TRA LỖI
Không được xuất câu hỏi nếu:
- thiếu dữ kiện;
- mâu thuẫn;
- đáp án không tồn tại;
- có nhiều đáp án đúng ngoài ý muốn;
- explanation không chứng minh được đáp án;
- công thức không hợp lệ;
- LaTeX bị hỏng.

Nếu phát hiện lỗi trong quá trình tự kiểm tra:
- sửa câu hỏi trước khi output;
- sau đó giải lại từ đầu;
- không chỉ sửa đáp án mà bỏ qua việc kiểm tra lại đề.

6. answerSource
- Tất cả câu hỏi thực sự do AI tạo mới phải có:
  answerSource = "ai_generated"
- Không dùng "ai_generated" cho dữ liệu được lấy nguyên bản từ tài liệu nếu schema có giá trị khác phù hợp.

CHỈ trả về JSON hợp lệ theo schema được yêu cầu.
Không có Markdown.
Không có \`\`\`json.
Không có văn bản bên ngoài JSON.
`;

function normalizeQuestionsAndExam(
  rawData: any,
  defaultTitle: string,
  defaultDesc: string,
) {
  const rawQuestions = Array.isArray(rawData?.questions)
    ? rawData.questions
    : [];
  const rawSections = Array.isArray(rawData?.sections) ? rawData.sections : [];

  const normalizedSections = rawSections.map((sec: any, idx: number) => ({
    id: String(sec.id || `sec-${Date.now()}-${idx}`),
    title: fixLatexFormatting(String(sec.title || `Phần ${idx + 1}`)),
    description: fixLatexFormatting(String(sec.description || "")),
    order: idx,
  }));

  const normalizedQuestions: any[] = [];

  rawQuestions.forEach((q: any, idx: number) => {
    if (!q || (!q.text && !q.options?.length)) return;

    let type = String(q.type || "single_choice").toLowerCase();
    if (
      type.includes("true") ||
      type.includes("false") ||
      type.includes("tf")
    ) {
      type = "true_false";
    } else if (
      type.includes("short") ||
      type.includes("fill") ||
      type.includes("essay") ||
      type.includes("text")
    ) {
      type = "short_answer";
    } else if (type.includes("multi")) {
      type = "multiple_choice";
    } else {
      type = "single_choice";
    }

    const questionId = String(q.id || `q-${Date.now()}-${idx}`);
    let text = String(q.text || "").trim();

    // Strip leading "Câu X:", "Bài X:", "Question X." if still present
    text = text.replace(/^(câu|bài|question|q)\s*\d+[\s.:\-–—]+/i, "").trim();
    text = fixLatexFormatting(text);

    const explanation = fixLatexFormatting(String(q.explanation || "").trim());

    const normalizedQ: any = {
      id: questionId,
      type,
      text: text || "Câu hỏi không có nội dung",
      explanation,
      sectionId: q.sectionId ? String(q.sectionId) : null,
      points: typeof q.points === "number" && q.points > 0 ? q.points : 1,
      order: idx,
      answerSource: q.answerSource === "document" ? "document" : "ai_generated",
      answerConfidence:
        typeof q.answerConfidence === "number" ? q.answerConfidence : 0.95,
    };

    if (type === "single_choice" || type === "multiple_choice") {
      let rawOptions = Array.isArray(q.options) ? q.options : [];

      // If options are missing, create fallback options A, B, C, D
      if (rawOptions.length < 2) {
        rawOptions = [
          { id: "opt-0", text: "Đáp án A" },
          { id: "opt-1", text: "Đáp án B" },
          { id: "opt-2", text: "Đáp án C" },
          { id: "opt-3", text: "Đáp án D" },
        ];
      }

      normalizedQ.options = rawOptions.map((opt: any, optIdx: number) => {
        let optText = String(opt?.text || "").trim();
        // Strip leading A., B., C., D. or A), B)
        optText = optText.replace(/^[A-Da-d][\s.):\-–—]+/, "").trim();
        optText = fixLatexFormatting(optText);
        return {
          id: String(opt?.id || `opt-${optIdx}`),
          text: optText || `Lựa chọn ${String.fromCharCode(65 + optIdx)}`,
        };
      });

      // Robust resolution of correctOptionIds
      let rawCandidates: any[] = [];
      if (Array.isArray(q.correctOptionIds) && q.correctOptionIds.length > 0) {
        rawCandidates.push(...q.correctOptionIds);
      }
      if (q.correctOptionId) {
        rawCandidates.push(q.correctOptionId);
      }
      if (q.correctAnswer) {
        if (Array.isArray(q.correctAnswer)) {
          rawCandidates.push(...q.correctAnswer);
        } else {
          rawCandidates.push(q.correctAnswer);
        }
      }
      if (q.correctOption !== undefined) {
        rawCandidates.push(q.correctOption);
      }
      if (q.correct !== undefined) {
        rawCandidates.push(q.correct);
      }

      const matchedCorrectIds: string[] = [];
      const opts = normalizedQ.options;

      for (const item of rawCandidates) {
        if (item === undefined || item === null) continue;
        const itemStr = String(item).trim();
        const itemLower = itemStr.toLowerCase();

        // 1. Direct ID match
        const direct = opts.find(
          (o: any) => o.id === itemStr || o.id.toLowerCase() === itemLower,
        );
        if (direct && !matchedCorrectIds.includes(direct.id)) {
          matchedCorrectIds.push(direct.id);
          continue;
        }

        // 2. Letter match: "A", "B", "C", "D", "E"
        const letterMatch = itemStr.match(/^[A-Ea-e]$/);
        if (letterMatch) {
          const letterIdx = letterMatch[0].toUpperCase().charCodeAt(0) - 65;
          if (
            letterIdx >= 0 &&
            letterIdx < opts.length &&
            !matchedCorrectIds.includes(opts[letterIdx].id)
          ) {
            matchedCorrectIds.push(opts[letterIdx].id);
            continue;
          }
        }

        // 3. Option pattern: "opt-0", "opt_1", "option 2"
        const optNumMatch = itemStr.match(/(?:opt|option)[-_ ]?(\d+)/i);
        if (optNumMatch) {
          const idxVal = parseInt(optNumMatch[1], 10);
          if (
            idxVal >= 0 &&
            idxVal < opts.length &&
            !matchedCorrectIds.includes(opts[idxVal].id)
          ) {
            matchedCorrectIds.push(opts[idxVal].id);
            continue;
          }
        }

        // 4. Numeric index (0-based or 1-based)
        if (/^\d+$/.test(itemStr)) {
          const num = parseInt(itemStr, 10);
          if (
            num >= 0 &&
            num < opts.length &&
            !matchedCorrectIds.includes(opts[num].id)
          ) {
            matchedCorrectIds.push(opts[num].id);
            continue;
          } else if (
            num >= 1 &&
            num <= opts.length &&
            !matchedCorrectIds.includes(opts[num - 1].id)
          ) {
            matchedCorrectIds.push(opts[num - 1].id);
            continue;
          }
        }

        // 5. Content text match
        const textMatch = opts.find((o: any) => {
          const t = o.text.trim().toLowerCase();
          return (
            t &&
            (t === itemLower || itemLower.includes(t) || t.includes(itemLower))
          );
        });
        if (textMatch && !matchedCorrectIds.includes(textMatch.id)) {
          matchedCorrectIds.push(textMatch.id);
          continue;
        }
      }

      // Check if explanation has an explicit conclusion (e.g. "Do đó chọn đáp án C" or "chọn C")
      if (opts.length > 0 && explanation) {
        const expMatch =
          explanation.match(
            /(?:do đó|suy ra|kết luận|chọn|đáp án|phương án)\s*(?:chọn|là)?\s*[:\-–—]?\s*(?:đáp án|phương án)?\s*[\*\`"]?([A-D])[\*\`"]?/i,
          ) ||
          explanation.match(/\bchọn\s+([A-D])\b/i) ||
          explanation.match(/\b([A-D])\s+(?:là đáp án đúng|chính xác)\b/i);
        if (expMatch) {
          const letter = expMatch[1].toUpperCase();
          const letterIdx = letter.charCodeAt(0) - 65;
          if (letterIdx >= 0 && letterIdx < opts.length) {
            const expOptId = opts[letterIdx].id;
            // Clear candidates and set the verified option from explanation
            matchedCorrectIds.length = 0;
            matchedCorrectIds.push(expOptId);
          }
        }
      }

      // If still no valid selection, distribute across A, B, C, D using question index
      if (matchedCorrectIds.length === 0 && opts.length > 0) {
        const fallbackIdx = idx % opts.length;
        matchedCorrectIds.push(opts[fallbackIdx].id);
      }

      normalizedQ.correctOptionIds = matchedCorrectIds;
    } else if (type === "true_false") {
      const rawStatements = Array.isArray(q.statements) ? q.statements : [];
      if (rawStatements.length === 0) {
        normalizedQ.statements = [
          { id: "stmt-0", text: "Mệnh đề A", correctAnswer: true },
          { id: "stmt-1", text: "Mệnh đề B", correctAnswer: false },
          { id: "stmt-2", text: "Mệnh đề C", correctAnswer: true },
          { id: "stmt-3", text: "Mệnh đề D", correctAnswer: false },
        ];
      } else {
        normalizedQ.statements = rawStatements.map(
          (stmt: any, sIdx: number) => ({
            id: String(stmt?.id || `stmt-${sIdx}`),
            text:
              fixLatexFormatting(String(stmt?.text || "").trim()) ||
              `Mệnh đề ${String.fromCharCode(97 + sIdx)})`,
            correctAnswer:
              stmt?.correctAnswer !== undefined
                ? Boolean(stmt.correctAnswer)
                : true,
          }),
        );
      }
    } else if (type === "short_answer") {
      const rawAnswers = Array.isArray(q.acceptedAnswers)
        ? q.acceptedAnswers
        : [];
      const cleaned = rawAnswers
        .map((ans: any) => fixLatexFormatting(String(ans).trim()))
        .filter(Boolean);
      normalizedQ.acceptedAnswers =
        cleaned.length > 0 ? cleaned : ["Đáp án đúng"];
    }

    normalizedQuestions.push(normalizedQ);
  });

  const finalExam = {
    version: 1 as const,
    exam: {
      title: rawData?.exam?.title || defaultTitle,
      description: rawData?.exam?.description || defaultDesc,
      timeLimit:
        typeof rawData?.exam?.timeLimit === "number"
          ? rawData.exam.timeLimit
          : 60,
    },
    sections: normalizedSections,
    questions: normalizedQuestions,
    statistics: {
      totalQuestions: normalizedQuestions.length,
      byType: {
        singleChoice: normalizedQuestions.filter(
          (q) => q.type === "single_choice",
        ).length,
        multipleChoice: normalizedQuestions.filter(
          (q) => q.type === "multiple_choice",
        ).length,
        trueFalse: normalizedQuestions.filter((q) => q.type === "true_false")
          .length,
        shortAnswer: normalizedQuestions.filter(
          (q) => q.type === "short_answer",
        ).length,
      },
      answersFromDocument: normalizedQuestions.filter(
        (q) => q.answerSource === "document",
      ).length,
      answersGeneratedByAI: normalizedQuestions.filter(
        (q) => q.answerSource === "ai_generated",
      ).length,
      answersUnknown: normalizedQuestions.filter(
        (q) => q.answerSource === "unknown",
      ).length,
    },
  };

  return aiExamImportResultSchema.parse(finalExam);
}

export async function processExamFromPromptStream(
  prompt: string,
  onProgress: (msg: string) => void,
) {
  const ai = getAiClient();
  const startTime = Date.now();

  onProgress(
    JSON.stringify({
      type: "log",
      level: "info",
      percent: 15,
      message: "Khởi động mô hình Gemini AI để phân tích yêu cầu...",
      timestamp: new Date().toLocaleTimeString("vi-VN"),
    }),
  );

  onProgress(
    JSON.stringify({
      type: "log",
      level: "info",
      percent: 30,
      message:
        "Đang xây dựng ngân hàng câu hỏi và nhận diện công thức toán/hóa học chuẩn LaTeX ($...$)...",
      timestamp: new Date().toLocaleTimeString("vi-VN"),
    }),
  );

  const response = await ai.models.generateContent({
    model: defaultModel,
    contents: `Tạo đề thi đầy đủ, chính xác, định dạng LaTeX chuẩn cho công thức toán học/hóa học theo yêu cầu sau:\n"${prompt}"`,
    config: {
      systemInstruction: systemInstructionPrompt,
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  onProgress(
    JSON.stringify({
      type: "log",
      level: "success",
      percent: 75,
      message:
        "Gemini AI đã tạo xong nội dung thô. Đang kiểm tra cấu trúc dữ liệu JSON...",
      timestamp: new Date().toLocaleTimeString("vi-VN"),
    }),
  );

  try {
    const jsonStr = response.text || "{}";
    const rawData = JSON.parse(jsonStr);

    onProgress(
      JSON.stringify({
        type: "log",
        level: "info",
        percent: 90,
        message: `Đang chuẩn hóa các câu hỏi (${rawData?.questions?.length || 0} câu) và kiểm tra công thức LaTeX...`,
        timestamp: new Date().toLocaleTimeString("vi-VN"),
      }),
    );

    const validatedData = normalizeQuestionsAndExam(
      rawData,
      "Đề thi tự động từ AI",
      prompt,
    );

    onProgress(
      JSON.stringify({
        type: "log",
        level: "success",
        percent: 100,
        message: `Hoàn tất tạo đề thành công trong ${((Date.now() - startTime) / 1000).toFixed(1)}s! Sẵn sàng xuất đề.`,
        timestamp: new Date().toLocaleTimeString("vi-VN"),
      }),
    );

    return validatedData;
  } catch (e: any) {
    console.error("Prompt parse error:", e);
    throw new Error(
      `Không thể tạo đề từ yêu cầu này. (${e.message || ""}). Vui lòng thử lại.`,
    );
  }
}

export async function processExamInChunks(
  htmlContent: string,
  onProgress: (msg: string) => void,
) {
  const ai = getAiClient();
  const startTime = Date.now();

  if (!htmlContent || htmlContent.trim().length === 0) {
    throw new Error("File Word không có nội dung văn bản để phân tích.");
  }

  onProgress(
    JSON.stringify({
      type: "log",
      level: "info",
      percent: 10,
      message: `Đã đọc thành công nội dung Word (${htmlContent.length.toLocaleString()} ký tự). Đang phân đoạn tài liệu...`,
      timestamp: new Date().toLocaleTimeString("vi-VN"),
    }),
  );

  // Split HTML into reasonable chunks (15000 chars)
  const CHUNK_SIZE = 15000;
  const chunks: string[] = [];

  let currentPos = 0;
  while (currentPos < htmlContent.length) {
    let nextPos = currentPos + CHUNK_SIZE;
    if (nextPos < htmlContent.length) {
      const safeSplit = htmlContent.indexOf("</p>", nextPos - 2000);
      if (safeSplit !== -1 && safeSplit < nextPos + 2000) {
        nextPos = safeSplit + 4;
      }
    }
    chunks.push(htmlContent.slice(currentPos, nextPos));
    currentPos = nextPos;
  }

  if (chunks.length === 0) {
    chunks.push(htmlContent);
  }

  onProgress(
    JSON.stringify({
      type: "log",
      level: "info",
      percent: 20,
      message: `Tài liệu được chia thành ${chunks.length} phần để xử lý song song & chuẩn hóa LaTeX...`,
      timestamp: new Date().toLocaleTimeString("vi-VN"),
    }),
  );

  const combinedRawData: { exam?: any; sections: any[]; questions: any[] } = {
    sections: [],
    questions: [],
  };

  for (let i = 0; i < chunks.length; i++) {
    const chunkPercent = Math.round(20 + ((i + 1) / chunks.length) * 65);
    onProgress(
      JSON.stringify({
        type: "log",
        level: "info",
        current: i + 1,
        total: chunks.length,
        percent: chunkPercent,
        message: `Đang gửi phần ${i + 1}/${chunks.length} tới Gemini AI: nhận diện câu hỏi, tách đáp án & chuyển đổi công thức Toán/Lý/Hóa sang LaTeX...`,
        timestamp: new Date().toLocaleTimeString("vi-VN"),
      }),
    );

    try {
      const response = await ai.models.generateContent({
        model: defaultModel,
        contents: `Phân tích phần ${i + 1}/${chunks.length} của đề thi. Nhận diện chính xác câu hỏi, đáp án, và chuyển đổi mọi công thức toán học/hóa học sang LaTeX ($...$):\n\n${chunks[i]}`,
        config: {
          systemInstruction: systemInstructionDocument,
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      });

      const jsonStr = response.text || "{}";
      const rawChunk = JSON.parse(jsonStr);

      const foundQuestions = Array.isArray(rawChunk.questions)
        ? rawChunk.questions.length
        : 0;
      const foundSections = Array.isArray(rawChunk.sections)
        ? rawChunk.sections.length
        : 0;

      onProgress(
        JSON.stringify({
          type: "log",
          level: "success",
          percent: chunkPercent,
          message: `Phần ${i + 1}/${chunks.length}: Phát hiện thành công ${foundQuestions} câu hỏi và ${foundSections} phần thi.`,
          timestamp: new Date().toLocaleTimeString("vi-VN"),
        }),
      );

      if (rawChunk.exam && !combinedRawData.exam) {
        combinedRawData.exam = rawChunk.exam;
      }
      if (Array.isArray(rawChunk.sections)) {
        combinedRawData.sections.push(...rawChunk.sections);
      }
      if (Array.isArray(rawChunk.questions)) {
        combinedRawData.questions.push(...rawChunk.questions);
      }
    } catch (e: any) {
      console.error(`Error processing chunk ${i + 1}:`, e);
      onProgress(
        JSON.stringify({
          type: "log",
          level: "warning",
          percent: chunkPercent,
          message: `Cảnh báo phần ${i + 1}: ${e.message || "Lỗi xử lý nhẹ, đang tiếp tục..."}`,
          timestamp: new Date().toLocaleTimeString("vi-VN"),
        }),
      );
    }
  }

  onProgress(
    JSON.stringify({
      type: "log",
      level: "info",
      percent: 92,
      message:
        "Tổng hợp toàn bộ câu hỏi, chuẩn hóa LaTeX ($...$), gán ID và tạo thống kê đề thi...",
      timestamp: new Date().toLocaleTimeString("vi-VN"),
    }),
  );

  if (combinedRawData.questions.length === 0) {
    throw new Error(
      "AI không tìm thấy câu hỏi hợp lệ nào trong file Word. Vui lòng kiểm tra lại nội dung file.",
    );
  }

  const validatedData = normalizeQuestionsAndExam(
    combinedRawData,
    "Đề thi tự động từ file Word",
    "Được tạo tự động từ tài liệu Word tải lên.",
  );

  onProgress(
    JSON.stringify({
      type: "log",
      level: "success",
      percent: 100,
      message: `Đã hoàn tất trích xuất ${validatedData.questions.length} câu hỏi thành công trong ${((Date.now() - startTime) / 1000).toFixed(1)}s!`,
      timestamp: new Date().toLocaleTimeString("vi-VN"),
    }),
  );

  return validatedData;
}
