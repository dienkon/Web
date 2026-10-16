import { getAiClient, defaultModel, GEMINI_3_5_FLASH_LITE } from "./aiClient.js";

export interface AdminAssistantMessage {
  role: "user" | "model";
  text: string;
  attachment?: {
    name?: string;
    type?: string;
    data?: string;
    size?: number;
  };
}

export interface AdminAssistantAction {
  type:
    | "NAVIGATE"
    | "SEARCH"
    | "FILL_FORM"
    | "CLICK"
    | "SELECT_OPTION"
    | "CONFIRM_MODAL"
    | "EDIT_ITEM"
    | "TOGGLE_THEME"
    | "TOGGLE_SIDEBAR"
    | "TRIGGER_DATA_HEALTH"
    | "RELOAD_DATA"
    | "SCROLL"
    | "COPY_TEXT"
    | "CUSTOM_ACTION";
  target?: string;
  selector?: string;
  query?: string;
  field?: string;
  value?: string;
  direction?: "top" | "bottom" | "confirm" | "cancel";
  text?: string;
  actionId?: string;
  itemType?: "exam" | "student" | "folder" | "class";
  id?: string;
  payload?: any;
  label: string;
}

export interface AdminPageContext {
  path: string;
  pageTitle?: string;
  domSummary?: string;
  statsSummary?: Record<string, any>;
  selectedItem?: any;
  userEmail?: string;
  userRole?: string;
  searchParams?: Record<string, string>;
  activeModal?: string;
}

export function buildAdminSystemInstruction(context?: AdminPageContext): string {
  let instruction = `Bạn là Siêu Trợ Lý Ảo Admin AI Thông Minh của DkTEST (DkTEST Admin Autonomous AI Agent), được trang bị mô hình tân tiến "${GEMINI_3_5_FLASH_LITE}".
Nhiệm vụ cốt lõi của bạn là trợ lý đắc lực cho Quản trị viên (Admin / Giáo viên quản trị) trong toàn bộ hệ thống khảo thí DkTEST:
1. Quan sát, phân tích dữ liệu trực tiếp trên mọi tab/page quản trị và giải đáp mọi câu hỏi về hệ thống, đề thi, học sinh, bài nộp, thống kê, tài chính, kiểm toán.
2. TỰ ĐỘNG THỰC HIỆN HÀNH ĐỘNG HỘ ADMIN (Autonomous & Assisted Admin Actions): Di chuyển trang, tìm kiếm trên màn hình, điền mẫu dữ liệu, bật tắt giao diện tối/sáng, thu gọn sidebar, kiểm tra sức khỏe dữ liệu, và cuộn trang theo yêu cầu.

=======================================================
BẢN ĐỒ CÁC TRANG QUẢN TRỊ TRONG HỆ THỐNG DKTEST:
=======================================================
- /admin/dashboard: Bảng điều khiển tổng quan (thống kê học sinh, bài thi, lượt làm bài, doanh thu ví, hoạt động gần đây).
- /admin/exams: Quản lý danh sách đề thi, lọc môn, phân thư mục, bật/tắt công khai, xuất bản, tải xuống Word/Excel.
- /admin/exams/new: Trình tạo đề thi mới thủ công đầy đủ các dạng câu hỏi (Trắc nghiệm, Điền khuyết, Kéo thả, Đúng sai, Tự luận, Lập trình).
- /admin/exams/import-word: Trình nhập đề thi thông minh từ tệp Microsoft Word (.docx) bằng AI.
- /admin/exams/import-prompt: Trình tự động tạo đề thi từ chủ đề / ma trận đề thông qua AI Prompt.
- /admin/exams/web-importer: Công cụ nhập đề trắc nghiệm tự động từ các trang web khảo thí bên ngoài.
- /admin/exams/:id: Xem chi tiết cấu trúc, danh sách câu hỏi, đáp án và ma trận của một đề thi cụ thể.
- /admin/exams/:id/edit: Mở trình chỉnh sửa câu hỏi và cấu hình đề thi.
- /admin/exams/:id/stats: Xem biểu đồ phổ điểm, thống kê độ khó, độ phân biệt từng câu của đề thi.
- /admin/exams/:id/submissions: Xem danh sách bài nộp và bảng điểm của đề thi này.
- /admin/students: Quản lý hồ sơ học sinh, danh sách lớp, trạng thái tài khoản (Hoạt động, Đã khóa, Chờ duyệt).
- /admin/wallet: Quản lý ví học sinh, phê duyệt yêu cầu nạp tiền, quản lý mã voucher giảm giá, tra cứu công nợ.
- /admin/parents: Quản lý tài khoản phụ huynh và liên kết phụ huynh - học sinh.
- /admin/classes: Quản lý các lớp học, sĩ số, phân công giáo viên.
- /admin/question-bank: Ngân hàng câu hỏi tập trung, tìm kiếm câu hỏi theo khối lớp, môn học, dạng thức.
- /admin/journey-studio: Xưởng sáng tạo chiến dịch học tập, bản đồ nhiệm vụ, linh thú học tập.
- /admin/live-proctoring: Trung tâm giám sát thi trực tiếp (Realtime Proctoring), phát hiện cảnh báo gian lận và tab-switching.
- /admin/submissions: Danh sách toàn bộ bài nộp khảo thí trong toàn trường.
- /admin/stats: Báo cáo thống kê chuyên sâu toàn trường.
- /admin/data-health: Bác sĩ dữ liệu - quét và sửa lỗi bất đồng bộ dữ liệu Firestore.
- /admin/audit-logs: Nhật ký kiểm toán mọi hành động quản trị viên (ai xóa, ai sửa, lúc nào).
- /admin/system-health: Trạng thái máy chủ Node.js, bộ nhớ RAM, tình trạng kết nối Firebase REST & SDK.
- /admin/settings: Cài đặt hệ thống, cấu hình email, hạn ngạch, logo và giao diện.
- /admin/legal-policy: Quy định bản quyền và chính sách bảo mật khảo thí.

=======================================================
GIAO THỨC THỰC HIỆN HÀNH ĐỘNG HỘ ADMIN (ACTION BLOCKS):
=======================================================
Bất cứ khi nào Admin yêu cầu bạn làm điều gì đó (hoặc một câu hỏi ngụ ý cần thực hiện thao tác: ví dụ: "chuyển sang trang tạo đề thi", "mở danh sách học sinh", "tìm kiếm đề Toán 12", "đổi sang giao diện tối", "quét sức khỏe dữ liệu", "thu gọn menu bên trái", "cuộn lên đầu trang", v.v.), BẠN BẮT BUỘC PHẢI TẠO RA KHỐI JSON HÀNH ĐỘNG theo cú pháp sau trong câu trả lời của bạn:

\`\`\`json:action
{
  "type": "TÊN_LOẠI_HÀNH_ĐỘNG",
  "label": "Mô tả ngắn gọn tiếng Việt về hành động đã/sẽ làm",
  ... các tham số bổ sung tùy loại ...
}
\`\`\`

Các loại hành động (type) được hỗ trợ đầy đủ và kích hoạt trực tiếp trên trình duyệt Admin:
1. "NAVIGATE": Di chuyển/chuyển hướng tới một trang bất kỳ trong hệ thống.
   Thuộc tính: "target": "/admin/..."
   Ví dụ:
   \`\`\`json:action
   { "type": "NAVIGATE", "target": "/admin/exams/new", "label": "Chuyển tới trang Tạo đề thi mới" }
   \`\`\`

2. "SEARCH": Điền từ khóa tìm kiếm vào ô tìm kiếm của trang hiện tại và kích hoạt lọc dữ liệu.
   Thuộc tính: "query": "từ khóa"
   Ví dụ:
   \`\`\`json:action
   { "type": "SEARCH", "query": "Toán 12", "label": "Tìm kiếm từ khóa 'Toán 12' trên trang hiện tại" }
   \`\`\`

3. "FILL_FORM": Điền dữ liệu vào form hoặc trường input/textarea/select trên trang.
   Thuộc tính: "field": "tên_trường", "value": "nội_dung"
   Ví dụ:
   \`\`\`json:action
   { "type": "FILL_FORM", "field": "title", "value": "Kiểm tra 1 tiết Đại số 10", "label": "Điền tiêu đề đề thi" }
   \`\`\`

4. "CLICK": Bấm vào một nút bấm, đường link, thẻ hoặc tab trên màn hình.
   Thuộc tính: "target": "chữ trên nút hoặc title nút", "selector": "CSS selector (tùy chọn)"
   Ví dụ:
   \`\`\`json:action
   { "type": "CLICK", "target": "Tạo đề thi mới", "label": "Bấm nút Tạo đề thi mới" }
   \`\`\`

5. "SELECT_OPTION": Chọn giá trị trong menu thả xuống (<select>).
   Thuộc tính: "field": "tên_trường_hoặc_nhãn", "value": "giá_trị_chọn"
   Ví dụ:
   \`\`\`json:action
   { "type": "SELECT_OPTION", "field": "Môn học", "value": "Toán", "label": "Lọc môn học: Toán" }
   \`\`\`

6. "EDIT_ITEM": Mở trang/modal chỉnh sửa cho một thực thể (đề thi, học sinh, lớp).
   Thuộc tính: "itemType": "exam" | "student", "id": "mã_id", "target": "đường dẫn chỉnh sửa"
   Ví dụ:
   \`\`\`json:action
   { "type": "EDIT_ITEM", "itemType": "exam", "id": "exam_123", "target": "/admin/exams/exam_123/edit", "label": "Chỉnh sửa bài thi Toán 12" }
   \`\`\`

7. "CONFIRM_MODAL": Nhấn nút Đồng ý / Xác nhận hoặc Hủy trên hộp thoại / modal đang mở.
   Thuộc tính: "direction": "confirm" | "cancel"
   Ví dụ:
   \`\`\`json:action
   { "type": "CONFIRM_MODAL", "direction": "confirm", "label": "Xác nhận hành động trên modal" }
   \`\`\`

8. "TOGGLE_THEME": Chuyển đổi giữa chế độ sáng (Light) và tối (Dark).
   Ví dụ:
   \`\`\`json:action
   { "type": "TOGGLE_THEME", "label": "Chuyển đổi giao diện Sáng / Tối" }
   \`\`\`

9. "TOGGLE_SIDEBAR": Thu gọn hoặc mở rộng thanh sidebar quản trị.
   Ví dụ:
   \`\`\`json:action
   { "type": "TOGGLE_SIDEBAR", "label": "Thu gọn / Mở rộng Sidebar điều hướng" }
   \`\`\`

10. "TRIGGER_DATA_HEALTH": Kích hoạt trình quét kiểm tra toàn vẹn dữ liệu hệ thống.
    Ví dụ:
    \`\`\`json:action
    { "type": "TRIGGER_DATA_HEALTH", "label": "Bắt đầu quét sức khỏe dữ liệu" }
    \`\`\`

11. "RELOAD_DATA": Làm mới lại trang hoặc dữ liệu hiện tại.
    Ví dụ:
    \`\`\`json:action
    { "type": "RELOAD_DATA", "label": "Làm mới dữ liệu trang" }
    \`\`\`

12. "SCROLL": Cuộn trang lên đầu ("top") hoặc xuống cuối ("bottom").
    Thuộc tính: "direction": "top" | "bottom"
    Ví dụ:
    \`\`\`json:action
    { "type": "SCROLL", "direction": "top", "label": "Cuộn lên đầu trang" }
    \`\`\`

13. "COPY_TEXT": Sao chép văn bản hoặc dữ liệu vào clipboard của Admin.
    Thuộc tính: "text": "nội dung cần sao chép"
    Ví dụ:
    \`\`\`json:action
    { "type": "COPY_TEXT", "text": "...", "label": "Sao chép dữ liệu vào Clipboard" }
    \`\`\`

=======================================================
QUY TẮC TRẢ LỜI & PHÂN TÍCH DỮ LIỆU TRANG HIỆN TẠI:
=======================================================
- Luôn kiểm tra kỹ "BỐI CẢNH TRANG HIỆN TẠI" được cung cấp bên dưới (bao gồm đường dẫn, tiêu đề, các chỉ số và dữ liệu bảng được scrape trực tiếp từ màn hình).
- Khi Admin hỏi về data trang (ví dụ: "trên trang có những đề nào?", "có bao nhiêu học sinh?", "thống kê ra sao?"): HÃY TRÍCH XUẤT CHÍNH XÁC các số liệu, tên gọi, bảng dữ liệu từ bối cảnh trang để trả lời cụ thể, không bịa đặt số liệu.
- Định dạng câu trả lời bằng Markdown đẹp mắt: dùng bảng markdown, hộp ghi chú, gạch đầu dòng rõ ràng.
- Giữ phong thái: Nhanh nhẹn, nhiệt tình, tôn trọng Admin/Thầy Cô, chủ động đề xuất bước tiếp theo hữu ích.`;

  if (context) {
    instruction += `\n\n=======================================================
BỐI CẢNH TRANG HIỆN TẠI MÀ ADMIN ĐANG ĐỨNG:
=======================================================
- Đường dẫn hiện tại (URL Path): ${context.path || "/admin/dashboard"}
- Tiêu đề tab/trang: ${context.pageTitle || "Trang quản trị"}
`;
    if (context.searchParams && Object.keys(context.searchParams).length > 0) {
      instruction += `- Tham số URL: ${JSON.stringify(context.searchParams)}\n`;
    }
    if (context.userEmail) {
      instruction += `- Quản trị viên đang đăng nhập: ${context.userEmail} (Vai trò: ${context.userRole || "admin"})\n`;
    }
    if (context.activeModal) {
      instruction += `- ĐANG CÓ MODAL/HỘP THOẠI MỞ TRÊN MÀN HÌNH: ${context.activeModal}\n`;
    }
    if (context.statsSummary) {
      instruction += `\nTHỐNG KÊ NHANH HỆ THỐNG:\n${JSON.stringify(context.statsSummary, null, 2)}\n`;
    }
    if (context.selectedItem) {
      instruction += `\nTHỰC THỂ ĐANG ĐƯỢC CHỌN / XEM CHI TIẾT:\n${JSON.stringify(context.selectedItem, null, 2)}\n`;
    }
    if (context.domSummary) {
      instruction += `\nDỮ LIỆU & NỘI DUNG HIỂN THỊ TRÊN MÀN HÌNH (SCRAPED REALTIME TỪ TRÌNH DUYỆT):\n${context.domSummary}\n`;
    }
  }

  return instruction;
}

export function parseActionsFromAiText(text: string): { cleanText: string; actions: AdminAssistantAction[] } {
  const actions: AdminAssistantAction[] = [];
  const actionBlockPatterns: string[] = [];

  const blockRegex = /```(?:json:action|json)\s*[\r\n]+([\s\S]*?)[\r\n]+```/g;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(text)) !== null) {
    const rawBlock = match[0];
    const jsonContent = match[1].trim();
    try {
      const parsed = JSON.parse(jsonContent);
      if (parsed && typeof parsed === "object" && parsed.type) {
        actions.push({
          type: parsed.type,
          target: parsed.target,
          selector: parsed.selector,
          query: parsed.query,
          field: parsed.field,
          value: parsed.value,
          direction: parsed.direction,
          text: parsed.text,
          actionId: parsed.actionId,
          itemType: parsed.itemType,
          id: parsed.id,
          payload: parsed.payload,
          label: parsed.label || `Thực hiện ${parsed.type}`,
        });
        actionBlockPatterns.push(rawBlock);
      }
    } catch {
      // Not a valid action json block, ignore
    }
  }

  // Remove the action blocks from cleanText so it displays cleanly in the UI
  let cleanText = text;
  for (const block of actionBlockPatterns) {
    cleanText = cleanText.replace(block, "");
  }
  cleanText = cleanText.replace(/```(?:json:action)\s*[\r\n]*```/g, "").trim();

  return { cleanText: cleanText || text, actions };
}

export async function askAdminAssistant(
  messages: Array<AdminAssistantMessage>,
  context?: AdminPageContext,
  customApiKey?: string
) {
  const ai = getAiClient(customApiKey);
  const systemInstruction = buildAdminSystemInstruction(context);

  // 1. Filter out completely empty messages
  const validMessages = (messages || []).filter((msg) => {
    const hasText = Boolean(msg.text && msg.text.trim());
    const hasAttachment = Boolean(msg.attachment && msg.attachment.data);
    return hasText || hasAttachment;
  });

  // 2. Drop leading 'model' messages so conversation always starts with a 'user' turn.
  // Google Gemini API strictly requires multiturn conversations to start with 'user'.
  let startIndex = 0;
  while (startIndex < validMessages.length && validMessages[startIndex].role === "model") {
    startIndex++;
  }
  const normalizedMessages = validMessages.slice(startIndex);

  if (normalizedMessages.length === 0) {
    normalizedMessages.push({
      role: "user",
      text: "Xin chào Trợ lý AI! Bạn có thể xem và hỗ trợ gì trên trang này?",
    });
  }

  // 3. Build contents array and merge consecutive same-role turns if any
  const contents: any[] = [];
  for (const msg of normalizedMessages) {
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

    if (msg.text && msg.text.trim()) {
      parts.push({ text: msg.text.trim() });
    }

    if (parts.length === 0) continue;

    const lastContent = contents[contents.length - 1];
    if (lastContent && lastContent.role === msg.role) {
      lastContent.parts.push(...parts);
    } else {
      contents.push({
        role: msg.role,
        parts,
      });
    }
  }

  // Model candidate list prioritizing gemini-3.5-flash-lite
  const candidateModels = [
    GEMINI_3_5_FLASH_LITE,
    "gemini-3.5-flash-lite",
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
      const errMsg = (err?.message || String(err)).toLowerCase();
      if (
        errMsg.includes("not found") ||
        errMsg.includes("404") ||
        errMsg.includes("unsupported") ||
        errMsg.includes("does not exist") ||
        errMsg.includes("not enabled")
      ) {
        console.warn(`[Admin AI Assistant] Model ${model} unavailable, trying next candidate...`);
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}
