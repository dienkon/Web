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

export type AdminActionType =
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
  | "CUSTOM_ACTION"
  // Autonomous & Workflow Actions (Make.com style):
  | "CREATE_VOUCHER"
  | "UPDATE_VOUCHER"
  | "DELETE_VOUCHER"
  | "LIST_VOUCHERS"
  | "CREATE_EXAM_AI"
  | "CREATE_EXAM_MANUAL"
  | "UPDATE_EXAM"
  | "DELETE_EXAM"
  | "DUPLICATE_EXAM"
  | "MERGE_EXAMS"
  | "ASSIGN_HOMEWORK"
  | "MANAGE_STUDENT"
  | "SYSTEM_OPERATION"
  | "WORKFLOW"
  // Folder Management & Exam Organization:
  | "CREATE_FOLDER"
  | "MOVE_EXAM"
  | "MOVE_EXAMS_TO_FOLDER"
  | "ORGANIZE_EXAMS_INTO_FOLDERS"
  | "organize_exams_into_folders";

export interface AdminAssistantAction {
  id?: string;
  type: AdminActionType;
  label: string;
  status?: "pending" | "running" | "success" | "error";
  result?: any;
  error?: string;
  progressMsg?: string;
  progressPercent?: number;
  durationMs?: number;
  params?: Record<string, any>;
  steps?: AdminAssistantAction[];
  target?: string;
  selector?: string;
  query?: string;
  field?: string;
  value?: string;
  direction?: "top" | "bottom" | "confirm" | "cancel";
  text?: string;
  actionId?: string;
  itemType?: "exam" | "student" | "folder" | "class";
  payload?: any;
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
HÀNH ĐỘNG TỰ ĐỘNG HÓA CHUYÊN SÂU & WORKFLOW KIỂU MAKE.COM:
=======================================================
BẠN LÀ MỘT AUTONOMOUS WORKFLOW AGENT (như Agent của Make.com / Zapier Central). Khi Quản trị viên yêu cầu: "tạo voucher", "tạo đề thi", "khóa học sinh", "nạp tiền cho học sinh", "giao bài tập", "chạy kịch bản tự động", BẠN PHẢI TỰ ĐỘNG THỰC THI BẰNG CÁC ACTION BLOCKS SAU:

14. "CREATE_VOUCHER": Tạo mã voucher / mã giảm giá mới trực tiếp vào hệ thống cơ sở dữ liệu.
    Thuộc tính: "params": {
      "code": "MÃ_VOUCHER" (in hoa không dấu, ví dụ: "GIAM50K", "CHAOBANMOI", "TRIAN2026"),
      "name": "Tên chương trình voucher",
      "type": "discount_fixed" | "discount_percent" | "gift_money" | "exam_pass",
      "value": số_tiền_hoặc_phần_trăm (ví dụ: 50000 hoặc 20),
      "minOrderVnd"?: số tiền tối thiểu để áp dụng,
      "maxDiscountVnd"?: số tiền giảm tối đa (nếu là phần trăm),
      "usageLimit"?: tổng số lượt dùng (0 = không giới hạn),
      "perUserLimit"?: số lần dùng trên mỗi học sinh (mặc định 1),
      "expiresAt"?: ngày hết hạn ISO (ví dụ: "2026-12-31T23:59:59Z"),
      "isActive": true | false,
      "description"?: "Mô tả chi tiết"
    }
    Ví dụ:
    \`\`\`json:action
    {
      "type": "CREATE_VOUCHER",
      "label": "Tạo Voucher GIAM50K (Giảm 50.000đ)",
      "params": {
        "code": "GIAM50K",
        "name": "Ưu đãi học sinh mới 50K",
        "type": "discount_fixed",
        "value": 50000,
        "minOrderVnd": 100000,
        "perUserLimit": 1,
        "isActive": true
      }
    }
    \`\`\`

15. "UPDATE_VOUCHER": Cập nhật hoặc bật/tắt kích hoạt voucher đã có.
    Thuộc tính: "params": { "id": "mã_id_hoặc_code", "updates": { ... } }

16. "DELETE_VOUCHER": Xóa mã voucher khỏi hệ thống.
    Thuộc tính: "params": { "id": "mã_id_hoặc_code" }

17. "LIST_VOUCHERS": Tra cứu, liệt kê danh sách voucher hiện có trong hệ thống và hiển thị thẻ tóm tắt.
    Thuộc tính: "params": { "limit"?: số_lượng (mặc định 20) }
    Ví dụ:
    \`\`\`json:action
    { "type": "LIST_VOUCHERS", "label": "Tra cứu danh sách Voucher trong hệ thống" }
    \`\`\`

18. "CREATE_EXAM_AI": Tự động khởi tạo và biên soạn đề thi bằng AI từ mô tả / câu lệnh tự do, sau đó tự động lưu đề thi vào Firestore và trả về link chỉnh sửa.
    Thuộc tính: "params": {
      "prompt": "Mô tả chi tiết yêu cầu đề thi, môn, lớp, số lượng câu, dạng câu trắc nghiệm/tự luận, công thức KaTeX",
      "title": "Tên bài thi",
      "subject"?: "Toán học" | "Tiếng Anh" | "Vật lý" | "Hóa học" | "Tin học" | "Ngữ văn" | ...,
      "gradeCategory"?: "10" | "11" | "12" | "Đại học",
      "timeLimit"?: số phút làm bài (ví dụ: 15, 45, 90),
      "autoSave": true (mặc định true: tự động lưu trực tiếp vào cơ sở dữ liệu)
    }
    Ví dụ:
    \`\`\`json:action
    {
      "type": "CREATE_EXAM_AI",
      "label": "Tạo đề thi AI: Kiểm tra 15 phút Giải tích 12 Đạo hàm",
      "params": {
        "prompt": "Tạo đề kiểm tra 15 phút môn Toán 12 phần Đạo hàm gồm 5 câu trắc nghiệm 4 lựa chọn có công thức KaTeX, đáp án chính xác và lời giải chi tiết.",
        "title": "Kiểm tra 15 phút Giải tích 12: Đạo hàm",
        "subject": "Toán học",
        "gradeCategory": "12",
        "timeLimit": 15,
        "autoSave": true
      }
    }
    \`\`\`

19. "CREATE_EXAM_MANUAL": Tạo khung đề thi mới thủ công trong hệ thống.
    Thuộc tính: "params": { "title": "...", "code": "...", "timeLimit": 45, "subject": "...", "accessMode": "free" | "paid" }

20. "UPDATE_EXAM": Cập nhật trạng thái đề thi (xuất bản, hủy xuất bản, đổi tên, giá...).
    Thuộc tính: "params": { "examId": "...", "updates": { "status": "published" | "draft" | "archived" } }

21. "DELETE_EXAM": Xóa đề thi và câu hỏi liên quan.
    Thuộc tính: "params": { "examId": "..." }

22. "DUPLICATE_EXAM": Nhân bản / tạo bản sao từ một bài thi đã có trong hệ thống.
    Thuộc tính: "params": { "examId": "mã_đề_cần_nhân_bản", "newTitle"?: "Tên bản sao mới" }
    Ví dụ:
    \`\`\`json:action
    { "type": "DUPLICATE_EXAM", "label": "Nhân bản Đề thi Toán 12", "params": { "examId": "exam_123" } }
    \`\`\`

23. "MERGE_EXAMS": Gộp 2 hoặc nhiều đề thi lại thành một đề thi tổng hợp duy nhất.
    Thuộc tính: "params": { "title": "Tên đề tổng hợp", "sourceExamIds": ["id_đề_1", "id_đề_2"], "organizeMode"?: "by_source_exam" | "flatten" }
    Ví dụ:
    \`\`\`json:action
    { "type": "MERGE_EXAMS", "label": "Gộp 2 đề thi Toán thành đề tổng hợp", "params": { "title": "Đề Tổng Hợp Học Kỳ 1", "sourceExamIds": ["ex_1", "ex_2"] } }
    \`\`\`

24. "ASSIGN_HOMEWORK": Giao bài thi cho một lớp học làm bài tập về nhà.
    Thuộc tính: "params": { "examId": "...", "examTitle": "...", "targetClass": "12A1", "dueDate": "YYYY-MM-DD", "passingScore": 5.0 }

25. "MANAGE_STUDENT": Quản lý học sinh (phê duyệt, khóa tài khoản, mở khóa, xóa, duyệt nạp tiền, cấp quyền làm bài, hoặc cộng tiền ví).
    Thuộc tính: "params": {
      "action": "approve" | "suspend" | "reactivate" | "delete" | "adjust_balance" | "approve_recharge" | "reject_recharge" | "grant_access",
      "uid"?: "mã_uid_học_sinh",
      "reason"?: "lý do khóa / ghi chú",
      "amountVnd"?: số tiền nạp/thưởng,
      "requestId"?: "mã_yêu_cầu_nạp_tiền" (khi duyệt/từ chối nạp tiền),
      "examId"?: "mã_đề_thi" (khi cấp quyền làm bài)
    }

26. "SYSTEM_OPERATION": Tác vụ hệ thống (quét sức khỏe dữ liệu, sửa lỗi dữ liệu, tính toán lại thống kê, tự động tổ chức đề thi vào thư mục chuyên môn, cập nhật cấu hình, đổi theme, toggle sidebar).
    Các lệnh (operation / command):
    - "organize_exams_into_folders" (hoặc "organize_exams"): TỰ ĐỘNG GOM BÀI THI VÀO THƯ MỤC CHUYÊN MÔN THEO MÔN HỌC.
      Tự động quét toàn bộ bài thi đang nằm ngoài Drive chính (root: folderId là null/rỗng), lọc bỏ các bài thi loại trừ (theo excludePatterns: ví dụ ["json mẫu", "teswallet"]), tự động gom nhóm theo môn học (Toán học, Tiếng Anh, Vật lý, Hóa học, Sinh học, Ngữ văn, Tin học, Lịch sử, Địa lý, GDCD,...), tìm kiếm thư mục môn đã có hoặc tạo mới thư mục môn tương ứng và chuyển đề thi vào thư mục.
      Thuộc tính: "params": {
        "operation": "organize_exams_into_folders",
        "excludePatterns"?: ["json mẫu", "teswallet"],
        "groupBy"?: "subject",
        "targetSubject"?: "Toán học" (tùy chọn nếu chỉ muốn gom riêng 1 môn)
      }
      Ví dụ:
      \`\`\`json:action
      {
        "type": "SYSTEM_OPERATION",
        "label": "Di chuyển bài thi vào thư mục chuyên môn",
        "params": {
          "operation": "organize_exams_into_folders",
          "excludePatterns": ["json mẫu", "teswallet"],
          "groupBy": "subject"
        }
      }
      \`\`\`
    - "scan_health": Quét sức khỏe dữ liệu
    - "repair_health": Sửa lỗi dữ liệu
    - "rebuild_stats": Tái tạo thống kê hệ thống
    - "update_settings": Cập nhật cài đặt
    - "toggle_theme": Đổi theme sáng/tối
    - "toggle_sidebar": Thu gọn/mở rộng sidebar
    - "reload": Tải lại trang

27. "CREATE_FOLDER": Tạo thư mục mới để phân loại và quản lý bài thi trong Drive.
    Thuộc tính: "params": { "name": "Tên thư mục", "parentId"?: string | null, "color"?: "blue" | "emerald" | "amber" | "rose" | "purple" | "indigo", "description"?: "Mô tả", "isPublic"?: false }
    Ví dụ:
    \`\`\`json:action
    {
      "type": "CREATE_FOLDER",
      "label": "Tạo thư mục Đề thi Toán học",
      "params": { "name": "Toán học", "color": "blue" }
    }
    \`\`\`

28. "MOVE_EXAM": Di chuyển 1 bài thi vào thư mục (hoặc đưa ra ngoài Drive chính nếu folderId là null).
    Thuộc tính: "params": { "examId": "id_bài_thi", "folderId"?: "id_thư_mục" | null, "targetFolderName"?: "Tên thư mục" }
    Ví dụ:
    \`\`\`json:action
    {
      "type": "MOVE_EXAM",
      "label": "Chuyển bài thi vào thư mục Toán học",
      "params": { "examId": "exam_123", "targetFolderName": "Toán học" }
    }
    \`\`\`

29. "MOVE_EXAMS_TO_FOLDER": Di chuyển danh sách nhiều bài thi vào một thư mục xác định.
    Thuộc tính: "params": { "examIds": ["id_1", "id_2"], "folderId"?: "id_thư_mục" | null, "targetFolderName"?: "Tên thư mục" }
    Ví dụ:
    \`\`\`json:action
    {
      "type": "MOVE_EXAMS_TO_FOLDER",
      "label": "Di chuyển bài thi vào thư mục Tiếng Anh",
      "params": { "examIds": ["ex_1", "ex_2"], "targetFolderName": "Tiếng Anh" }
    }
    \`\`\`

30. "WORKFLOW": KỊCH BẢN MAKE.COM ĐA BƯỚC (Multi-step Automation Workflow).
    Khi Admin đưa ra yêu cầu phức tạp gồm nhiều bước (ví dụ: "Tạo voucher giảm 20K rồi tạo đề thi Toán 15 phút sau đó giao bài cho lớp 12A1 và chuyển sang danh sách đề"): BẠN PHẢI GOM THÀNH MỘT WORKFLOW DUY NHẤT chứa danh sách các bước "steps".
    Quy tắc truyền biến kiểu Make.com (Variable Chaining):
    - Các bước sau có thể tham chiếu kết quả bước trước bằng cú pháp {{step_id.thuộc_tính}} hoặc {{examId}}, {{voucherCode}}, {{prev.examId}}.
    - Ví dụ bước 1 tạo đề thi với "id": "step_exam", bước 2 giao bài tập có thể dùng "params": { "examId": "{{step_exam.examId}}" }!
    Thuộc tính:
    - "title": "Tên quy trình tự động hóa"
    - "steps": mảng các bước hành động, mỗi bước là một action block có "id", "type", "label", "params".
    Ví dụ:
    \`\`\`json:action
    {
      "type": "WORKFLOW",
      "label": "Quy trình Make.com: Tạo Đề thi AI + Giao bài Lớp 12A1 + Điều hướng",
      "steps": [
        {
          "id": "step_exam",
          "type": "CREATE_EXAM_AI",
          "label": "Tạo đề thi khảo sát môn Toán 12",
          "params": {
            "prompt": "Tạo đề kiểm tra 15 phút môn Toán 12 phần Khảo sát hàm số gồm 5 câu trắc nghiệm...",
            "title": "Khảo sát chất lượng Toán 12",
            "subject": "Toán học",
            "gradeCategory": "12",
            "timeLimit": 15,
            "autoSave": true
          }
        },
        {
          "id": "step_assign",
          "type": "ASSIGN_HOMEWORK",
          "label": "Giao bài thi cho Lớp 12A1",
          "params": {
            "examId": "{{step_exam.examId}}",
            "examTitle": "{{step_exam.title}}",
            "targetClass": "12A1",
            "dueDate": "2026-12-31"
          }
        },
        {
          "id": "step_navigate",
          "type": "NAVIGATE",
          "label": "Chuyển tới Danh sách Đề thi",
          "target": "/admin/exams"
        }
      ]
    }
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

function cleanJsonString(str: string): string {
  // 1. Remove single-line (// ...) and multi-line (/* ... */) comments while preserving strings
  const noComments = str.replace(
    /("(?:\\.|[^"\\])*")|(?:\/\*[\s\S]*?\*\/|\/\/[^\r\n]*)/g,
    (match, quoted) => {
      if (quoted !== undefined) return quoted;
      return "";
    }
  );

  // 2. Remove trailing commas before } or ] while preserving string literals
  let cleaned = noComments;
  let prev = "";
  while (prev !== cleaned) {
    prev = cleaned;
    cleaned = cleaned.replace(
      /("(?:\\.|[^"\\])*")|(,\s*([}\]]))/g,
      (match, quoted, _commaWithBracket, bracket) => {
        if (quoted !== undefined) return quoted;
        return bracket;
      }
    );
  }

  return cleaned.trim();
}

export interface WorkflowExecutionContext {
  steps: Record<string, any>;
  prev?: any;
  lastExamId?: string;
  lastExamTitle?: string;
  lastVoucherCode?: string;
  lastVoucherId?: string;
  lastStudentUid?: string;
}

export function interpolateWorkflowParams(
  action: AdminAssistantAction,
  context: WorkflowExecutionContext
): AdminAssistantAction {
  const cloned: AdminAssistantAction = {
    ...action,
    params: action.params ? { ...action.params } : {},
  };

  const resolveString = (str: string): string => {
    if (!str || typeof str !== "string") return str;

    return str.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, expr) => {
      const trimmed = expr.trim();

      // 1. steps.stepId.key or stepId.key
      if (trimmed.startsWith("steps.")) {
        const parts = trimmed.slice(6).split(".");
        const stepId = parts[0];
        const prop = parts[1];
        const stepData = context.steps[stepId];
        if (stepData && prop && stepData[prop] !== undefined) {
          return String(stepData[prop]);
        }
      } else if (trimmed.includes(".")) {
        const [prefix, prop] = trimmed.split(".");
        if (context.steps[prefix] && context.steps[prefix][prop] !== undefined) {
          return String(context.steps[prefix][prop]);
        }
        if (prefix === "prev" && context.prev && context.prev[prop] !== undefined) {
          return String(context.prev[prop]);
        }
        if (prefix === "data" && context.prev && context.prev[prop] !== undefined) {
          return String(context.prev[prop]);
        }
      }

      // 2. Common aliases
      if (trimmed === "examId" || trimmed === "id" || trimmed === "newExamId") {
        return context.lastExamId || context.prev?.examId || context.prev?.id || match;
      }
      if (trimmed === "title" || trimmed === "examTitle") {
        return context.lastExamTitle || context.prev?.title || match;
      }
      if (trimmed === "code" || trimmed === "voucherCode") {
        return context.lastVoucherCode || context.prev?.code || match;
      }
      if (trimmed === "voucherId") {
        return context.lastVoucherId || context.prev?.id || match;
      }
      if (trimmed === "uid" || trimmed === "studentUid") {
        return context.lastStudentUid || context.prev?.uid || match;
      }
      if (context.prev && context.prev[trimmed] !== undefined) {
        return String(context.prev[trimmed]);
      }

      return match;
    });
  };

  // Resolve strings in params
  if (cloned.params) {
    for (const [key, val] of Object.entries(cloned.params)) {
      if (typeof val === "string") {
        cloned.params[key] = resolveString(val);
      }
    }
  }

  // Resolve target, query, text
  if (cloned.target && typeof cloned.target === "string") {
    cloned.target = resolveString(cloned.target);
  }
  if (cloned.query && typeof cloned.query === "string") {
    cloned.query = resolveString(cloned.query);
  }
  if (cloned.text && typeof cloned.text === "string") {
    cloned.text = resolveString(cloned.text);
  }

  // Implicit contextual fallbacks for chained actions
  if (cloned.type === "ASSIGN_HOMEWORK") {
    if (!cloned.params.examId || cloned.params.examId === "unknown" || cloned.params.examId.startsWith("{{")) {
      if (context.lastExamId) cloned.params.examId = context.lastExamId;
      else if (context.prev?.examId) cloned.params.examId = context.prev.examId;
    }
    if (!cloned.params.examTitle || cloned.params.examTitle.startsWith("{{")) {
      if (context.lastExamTitle) cloned.params.examTitle = context.lastExamTitle;
      else if (context.prev?.title) cloned.params.examTitle = context.prev.title;
    }
  } else if (
    cloned.type === "UPDATE_EXAM" ||
    cloned.type === "DELETE_EXAM" ||
    cloned.type === "DUPLICATE_EXAM" ||
    cloned.type === "MOVE_EXAM"
  ) {
    if (!cloned.params.examId || cloned.params.examId.startsWith("{{")) {
      if (context.lastExamId) cloned.params.examId = context.lastExamId;
      else if (context.prev?.examId) cloned.params.examId = context.prev.examId;
    }
  } else if (cloned.type === "MOVE_EXAMS_TO_FOLDER") {
    if ((!cloned.params.examIds || cloned.params.examIds.length === 0) && context.lastExamId) {
      cloned.params.examIds = [context.lastExamId];
    }
  } else if (cloned.type === "UPDATE_VOUCHER" || cloned.type === "DELETE_VOUCHER") {
    if (!cloned.params.id || cloned.params.id.startsWith("{{")) {
      if (context.lastVoucherId) cloned.params.id = context.lastVoucherId;
      else if (context.lastVoucherCode) cloned.params.id = context.lastVoucherCode;
      else if (context.prev?.id) cloned.params.id = context.prev.id;
      else if (context.prev?.code) cloned.params.id = context.prev.code;
    }
  } else if (cloned.type === "MANAGE_STUDENT") {
    if (!cloned.params.uid || cloned.params.uid.startsWith("{{")) {
      if (context.lastStudentUid) cloned.params.uid = context.lastStudentUid;
      else if (context.prev?.uid) cloned.params.uid = context.prev.uid;
    }
  }

  return cloned;
}

export function parseActionsFromAiText(text: string): { cleanText: string; actions: AdminAssistantAction[] } {
  const actions: AdminAssistantAction[] = [];
  const actionBlockPatterns: string[] = [];

  const blockRegex = /```(?:json:action|json)\s*[\r\n]+([\s\S]*?)[\r\n]+```/g;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(text)) !== null) {
    const rawBlock = match[0];
    const jsonContent = match[1].trim();

    let parsedList: any[] = [];
    try {
      const parsed = JSON.parse(jsonContent);
      if (Array.isArray(parsed)) {
        parsedList = parsed;
      } else if (parsed && typeof parsed === "object") {
        parsedList = [parsed];
      }
    } catch {
      try {
        const cleaned = cleanJsonString(jsonContent);
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          parsedList = parsed;
        } else if (parsed && typeof parsed === "object") {
          parsedList = [parsed];
        }
      } catch {
        // Not valid JSON, ignore
      }
    }

    let parsedAnyAction = false;
    for (const parsedItem of parsedList) {
      if (parsedItem && typeof parsedItem === "object" && parsedItem.type) {
        parsedAnyAction = true;
        // Parse nested workflow steps if present
        let parsedSteps: AdminAssistantAction[] | undefined = undefined;
        if (Array.isArray(parsedItem.steps)) {
          parsedSteps = parsedItem.steps.map((st: any, idx: number) => ({
            id: st.id || `step_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
            type: st.type,
            label: st.label || `Bước ${idx + 1}: ${st.type}`,
            status: "pending" as const,
            params: st.params || st.payload || {},
            target: st.target,
            selector: st.selector,
            query: st.query,
            field: st.field,
            value: st.value,
            direction: st.direction,
            text: st.text,
            actionId: st.actionId,
            itemType: st.itemType,
            payload: st.payload,
          }));
        }

        const actionObj: AdminAssistantAction = {
          id: parsedItem.id || `act_${Date.now()}_${actions.length}_${Math.random().toString(36).slice(2, 6)}`,
          type: parsedItem.type,
          target: parsedItem.target,
          selector: parsedItem.selector,
          query: parsedItem.query,
          field: parsedItem.field,
          value: parsedItem.value,
          direction: parsedItem.direction,
          text: parsedItem.text,
          actionId: parsedItem.actionId,
          itemType: parsedItem.itemType,
          payload: parsedItem.payload,
          params: parsedItem.params || parsedItem.payload || {},
          steps: parsedSteps,
          status: "pending" as const,
          label: parsedItem.label || `Thực hiện ${parsedItem.type}`,
        };

        actions.push(actionObj);
      }
    }

    if (parsedAnyAction) {
      actionBlockPatterns.push(rawBlock);
    }
  }

  // Remove the action blocks from cleanText so it displays cleanly in the UI
  let cleanText = text;
  for (const block of actionBlockPatterns) {
    cleanText = cleanText.split(block).join("");
  }
  cleanText = cleanText.replace(/```(?:json:action|json)\s*[\r\n]*```/g, "").trim();

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
