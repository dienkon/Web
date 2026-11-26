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
  | "LIST_FOLDERS"
  | "CREATE_FOLDER"
  | "RENAME_FOLDER"
  | "UPDATE_FOLDER"
  | "DELETE_FOLDER"
  | "MOVE_EXAM"
  | "MOVE_EXAMS_TO_FOLDER"
  | "ORGANIZE_EXAMS_INTO_FOLDERS"
  | "organize_exams_into_folders"
  // Full Exam Catalog & Cognitive Level Management:
  | "LIST_EXAMS"
  | "BULK_UPDATE_EXAMS"
  | "SET_EXAM_COGNITIVE_LEVELS"
  // Course & Video Lesson Management:
  | "LIST_COURSES"
  | "GET_COURSE_DETAILS"
  | "CREATE_COURSE"
  | "UPDATE_COURSE"
  | "UPDATE_COURSE_UNLOCK_POLICY"
  | "ADD_COURSE_LESSONS"
  | "ADD_COURSE_LESSON"
  | "CREATE_COURSE_VIDEO"
  | "UPDATE_COURSE_LESSON"
  | "UPDATE_COURSE_VIDEO"
  | "DELETE_COURSE_LESSON"
  | "DELETE_COURSE_VIDEO"
  | "MANAGE_COURSE_CHAPTER"
  | "PROBE_COURSE_DURATIONS"
  // Minigame & Notification Operations:
  | "CREATE_MINIGAME"
  | "BROADCAST_NOTIFICATION";

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
  existingFoldersSummary?: string;
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
- /admin/courses: Quản lý Khóa học & Video bài giảng (tạo khóa, sửa khóa, xem chi tiết học viên đã mua khóa / mua từng video cụ thể theo phân trang tối đa 2 lượt/lần).
- /admin/courses/new: Trình tạo khóa học mới (thông tin, học phí, phân cấp 3 tầng & video bài giảng).
- /admin/courses/:id/edit: Trình chỉnh sửa chi tiết Khóa học (Tab 1: Thông tin & Học phí; Tab 2: Phân cấp Nhóm → Chương → Chuyên đề → Video & Tự đo thời lượng Drive/YouTube/MP4; Tab 3: Cấp/Thu hồi quyền & Xem chi tiết người mua khóa/video).
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

25. "MANAGE_STUDENT": Quản lý học sinh (phê duyệt, khóa tài khoản, mở khóa, xóa, duyệt nạp tiền, cấp/thu hồi quyền làm bài hoặc khóa học/video, hoặc cộng tiền ví).
    Thuộc tính: "params": {
      "action": "approve" | "suspend" | "reactivate" | "delete" | "adjust_balance" | "approve_recharge" | "reject_recharge" | "grant_access" | "revoke_access",
      "uid"?: "mã_uid_học_sinh",
      "reason"?: "lý do khóa / ghi chú",
      "amountVnd"?: số tiền nạp/thưởng,
      "requestId"?: "mã_yêu_cầu_nạp_tiền" (khi duyệt/từ chối nạp tiền),
      "examId"?: "mã_đề_thi" (khi cấp quyền làm bài),
      "courseId"?: "mã_khóa_học" (khi cấp/thu hồi quyền khóa học),
      "lessonId"?: "mã_video" (tùy chọn nếu chỉ cấp/thu hồi riêng 1 video trong khóa)
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

28. "MOVE_EXAM": Di chuyển 1 bài thi vào THƯ MỤC HIỆN CÓ (kể cả thư mục con) hoặc đưa ra Drive gốc nếu folderId là null.
    QUY TẮC QUAN TRỌNG:
    - LUÔN đối chiếu danh sách "CÂY THƯ MỤC HIỆN CÓ TRONG HỆ THỐNG" ở phần bối cảnh để lấy CHÍNH XÁC "folderId" hoặc "targetFolderName" / đường dẫn đầy đủ (VD: "Toán học / Lớp 12") của thư mục ĐÃ TỒN TẠI.
    - Mặc định KHÔNG tự ý tạo thư mục mới khi di chuyển đề thi ("createIfMissing": false) — chỉ đặt "createIfMissing": true khi Admin yêu cầu rõ ràng tạo thư mục mới.
    Thuộc tính: "params": { "examId"?: "id_bài_thi", "examTitle"?: "tên_đề_thi (nếu chưa có id)", "folderId"?: "id_thư_mục" | null, "targetFolderName"?: "Tên hoặc đường dẫn thư mục hiện có", "createIfMissing"?: false }

29. "MOVE_EXAMS_TO_FOLDER": Di chuyển nhiều bài thi (theo danh sách "examIds" hoặc lọc theo "query"/"subject") vào THƯ MỤC HIỆN CÓ (ưu tiên khớp thư mục đã có kể cả thư mục con, KHÔNG tự tạo trùng).
    Thuộc tính: "params": { "examIds"?: ["id_1", "id_2"], "query"?: "từ khóa tên đề", "folderId"?: "id_thư_mục" | null, "targetFolderName"?: "Tên hoặc đường dẫn thư mục hiện có", "createIfMissing"?: false }

29b. "LIST_FOLDERS" / "RENAME_FOLDER" / "UPDATE_FOLDER" / "DELETE_FOLDER":
    - "LIST_FOLDERS": Liệt kê toàn bộ cây thư mục hiện có (kèm ID & đường dẫn phân cấp).
    - "RENAME_FOLDER" / "UPDATE_FOLDER": Đổi tên, đổi màu, bật/tắt công khai hoặc di chuyển thư mục sang thư mục cha khác.
      Thuộc tính: "params": { "folderId"?: "id", "folderName"?: "tên hiện tại", "newName"?: "tên mới", "color"?: "...", "isPublic"?: true | false, "parentId"?: string | null }
    - "DELETE_FOLDER": Xóa thư mục theo ID hoặc tên. Thuộc tính: "params": { "folderId"?: "id", "folderName"?: "tên thư mục" }

29c. "LIST_EXAMS" / "BULK_UPDATE_EXAMS" / "SET_EXAM_COGNITIVE_LEVELS":
    - "LIST_EXAMS": Tìm và liệt kê các đề thi trong hệ thống theo từ khóa / môn / trạng thái / thư mục.
      Thuộc tính: "params": { "query"?: "...", "subject"?: "...", "status"?: "published" | "draft" | "archived", "folderId"?: "...", "limit"?: 30 }
    - "BULK_UPDATE_EXAMS": Cập nhật hàng loạt nhiều đề thi (xuất bản, chuyển nháp, đổi môn, đổi giá, đổi thời gian).
      Thuộc tính: "params": { "examIds": ["id_1", "id_2"], "updates": { "status"?: "published", "subject"?: "...", "priceVnd"?: 0, "timeLimit"?: 45 } }
    - "SET_EXAM_COGNITIVE_LEVELS": Gán hoặc tự động phân bổ mức độ nhận thức (NB — Nhận biết, TH — Thông hiểu, VD — Vận dụng, VDC — Vận dụng cao) cho các câu hỏi trong một đề thi.
      Thuộc tính: "params": { "examId": "id_đề_thi", "assignments"?: [{ "questionNumber": 1, "level": "NB" | "TH" | "VD" | "VDC" }], "autoDistribute"?: { "NB": 40, "TH": 30, "VD": 20, "VDC": 10 } }

29d. "UPDATE_COURSE_UNLOCK_POLICY": Bật/tắt và cấu hình quy tắc tự động mở khóa Tài liệu / Bài thi khi học sinh mở khóa video trong khóa học.
    Thuộc tính: "params": {
      "courseId"?: "id_khóa",
      "courseTitle"?: "tên_khóa",
      "unlockResourcesWithVideo": true | false,
      "unlockMaterialsWithVideo"?: true | false,
      "unlockExamsWithVideo"?: true | false,
      "resourceUnlockScope"?: "any_video_in_topic" | "same_lesson" | "full_topic" | "full_chapter" | "full_course"
    }

29e. "CREATE_MINIGAME": Tạo sự kiện Minigame phúc lợi miễn phí 100% (hỗ trợ cả 8 trò chơi: horse_race, bee_race, tai_xiu, bau_cua, lucky_number, lucky_wheel, treasure_flip, mystery_box; hẹn giờ bắt đầu/kết thúc, bật chat realtime và cấu hình giải thưởng).
    Thuộc tính: "params": {
      "title": "Tên sự kiện",
      "gameType": "horse_race" | "bee_race" | "tai_xiu" | "bau_cua" | "lucky_number" | "lucky_wheel" | "treasure_flip" | "mystery_box",
      "maxParticipants"?: 32,
      "durationMinutes"?: 30,
      "scheduledStartAt"?: "ISO datetime",
      "scheduledEndAt"?: "ISO datetime",
      "chatEnabled"?: true,
      "prizes"?: [{ "rank": 1, "label": "Giải Nhất", "type": "wallet_vnd", "amountVnd": 20000 }]
    }

29f. "BROADCAST_NOTIFICATION": Gửi thông báo đẩy toàn hệ thống tới học sinh trên Web & Android.
    Thuộc tính: "params": { "title": "Tiêu đề thông báo", "message": "Nội dung thông báo", "route"?: "/student/minigame" }

30. "LIST_COURSES" / "GET_COURSE_DETAILS": Liệt kê khóa học trong hệ thống hoặc xem chi tiết cấu trúc chương & danh sách video bài giảng của một khóa học cụ thể.
    Thuộc tính: "params": { "courseId"?: "id_khóa", "courseTitle"?: "tên_khóa", "query"?: "từ khóa tìm kiếm", "includeLessons"?: true }

31. "CREATE_COURSE": Tạo khóa học mới (hỗ trợ tạo sẵn các Chương và danh sách Video bài giảng kèm tự động đo thời lượng từ link Google Drive/YouTube/MP4).
    Kiến thức chuẩn về Khóa học DkTEST:
    - 3 chế độ thu phí ("accessMode"):
      * "free": Miễn phí toàn bộ (0đ).
      * "per_video": Vào khóa miễn phí (priceVnd=0), thu tiền lẻ từng video (trừ freePreviewCount video đầu hoặc bài đặt accessType="free").
      * "paid": Thu phí trọn khóa (priceVnd > 0, kèm tùy chọn freePreviewCount video đầu miễn phí, allowSingleLessonPurchase, unlockFullPolicy: "unlock_all_videos" | "unlock_course_only").
    - Phân cấp 3 tầng: Tầng 1 Nhóm (groupTitle trên chapter hoặc mặc định course.subject) → Tầng 2 Chương (chapters) → Tầng 3 Chuyên đề (topicTitle trên lesson) → Video bài giảng.
    Thuộc tính: "params": {
      "title": "Tên khóa học",
      "code"?: "MÃ_KHÓA",
      "subject"?: "TOÁN HỌC" | "VẬT LÝ" | "HÓA HỌC" | "TIẾNG ANH" | ...,
      "gradeCategory"?: "Lớp 12" | "ĐGNL 2027" | ...,
      "instructorName"?: "Tên giảng viên",
      "description"?: "Mô tả khóa học",
      "status"?: "draft" | "published" | "archived",
      "accessMode"?: "free" | "per_video" | "paid",
      "priceVnd"?: 299000,
      "defaultLessonPriceVnd"?: 25000,
      "freePreviewCount"?: 1,
      "allowSingleLessonPurchase"?: true,
      "chapters"?: [{ "title": "Tên chương", "groupTitle"?: "Nhóm tầng 1" }],
      "lessons"?: [{ "title": "Tên bài", "videoUrl": "https://...", "chapterTitle"?: "Tên chương", "topicTitle"?: "Chuyên đề", "accessType"?: "inherit_first_n" | "free" | "paid", "priceVnd"?: 25000, "durationMinutes"?: 30, "description"?: "...", "linkedExamId"?: "..." }]
    }

32. "UPDATE_COURSE": Cập nhật thông tin, học phí, trạng thái xuất bản, số bài miễn phí đầu khóa của một khóa học (nếu Admin đang mở khóa đó trong trình chỉnh sửa thì có thể bỏ qua courseId).
    Thuộc tính: "params": {
      "courseId"?: "id_khóa",
      "courseTitle"?: "tên_khóa",
      "updates": { "title"?: "...", "status"?: "published" | "draft" | "archived", "accessMode"?: "...", "priceVnd"?: 0, "defaultLessonPriceVnd"?: 25000, "freePreviewCount"?: 2, "subject"?: "...", "gradeCategory"?: "...", "description"?: "...", "salesEnabled"?: true }
    }

33. "ADD_COURSE_LESSONS" (cũng hỗ trợ "ADD_COURSE_LESSON" / "CREATE_COURSE_VIDEO"): Thêm 1 hoặc nhiều video bài giảng mới vào khóa học (tự động nhận diện link Google Drive / YouTube / Cloudinary / MP4, tự tạo Chương nếu chapterTitle chưa tồn tại, và tự động đo thời lượng phút chuẩn nếu không truyền durationMinutes/durationSeconds).
    Thuộc tính: "params": {
      "courseId"?: "id_khóa (bỏ trống nếu đang đứng trong trang sửa khóa học đó)",
      "courseTitle"?: "tên_khóa",
      "chapterId"?: "id_chương",
      "chapterTitle"?: "Tên chương (tự tìm hoặc tạo mới nếu chưa có)",
      "groupTitle"?: "Nhóm tầng 1 nếu tạo chương mới",
      "topicTitle"?: "Tên chuyên đề (Tầng 3)",
      "title"?: "Tiêu đề video (khi thêm 1 bài)",
      "videoUrl"?: "https://drive.google.com/... hoặc https://youtube.com/... hoặc link MP4",
      "videoType"?: "youtube" | "iframe" | "cloudinary" | "mp4",
      "durationMinutes"?: số_phút,
      "durationSeconds"?: số_giây,
      "accessType"?: "inherit_first_n" | "free" | "paid",
      "priceVnd"?: giá_tiền_vnđ,
      "description"?: "Tóm tắt bài học",
      "linkedExamId"?: "ID đề thi đính kèm",
      "materials"?: [{ "label": "Tên tài liệu", "type": "link", "url": "https://..." }],
      "lessons"?: [ ... mảng nhiều bài giảng nếu muốn thêm hàng loạt ... ],
      "autoProbeDuration"?: true
    }
    Ví dụ:
    \`\`\`json:action
    {
      "type": "ADD_COURSE_LESSONS",
      "label": "Thêm video bài giảng mới từ Google Drive vào Chương 1",
      "params": {
        "chapterTitle": "Chương 1: Hàm số",
        "topicTitle": "Cực trị hàm số",
        "title": "Bài 2: Tìm cực trị hàm chứa dấu giá trị tuyệt đối",
        "videoUrl": "https://drive.google.com/file/d/1AbC.../view",
        "accessType": "paid",
        "priceVnd": 30000,
        "autoProbeDuration": true
      }
    }
    \`\`\`

34. "UPDATE_COURSE_LESSON" (cũng hỗ trợ "UPDATE_COURSE_VIDEO"): Chỉnh sửa một video bài giảng đã có trong khóa học (đổi tiêu đề, đổi link video, chuyển chương/chuyên đề, đổi giá tiền, chuyển sang miễn phí/trả phí, chỉnh thời lượng, gắn đề thi, thêm tài liệu, đổi vị trí thứ tự).
    - Có thể định vị bài bằng "lessonId", "lessonNumber" (số thứ tự từ 1: #1, #2, ...), "lessonTitle" (tên bài), hoặc bỏ trống để sửa video ĐANG CHỌN trên màn hình trình biên tập!
    Thuộc tính: "params": {
      "courseId"?: "id_khóa",
      "courseTitle"?: "tên_khóa",
      "lessonId"?: "id_bài_giảng",
      "lessonNumber"?: 2,
      "lessonTitle"?: "tên bài hiện tại",
      "updates": { "title"?: "...", "videoUrl"?: "...", "chapterTitle"?: "...", "topicTitle"?: "...", "durationMinutes"?: 45, "durationSeconds"?: 2700, "accessType"?: "free" | "paid" | "inherit_first_n", "priceVnd"?: 20000, "includedInCourseUnlock"?: true, "description"?: "...", "linkedExamId"?: "...", "order"?: 0, "addMaterials"?: [{ "label": "...", "type": "link", "url": "https://..." }] }
    }

35. "DELETE_COURSE_LESSON" (cũng hỗ trợ "DELETE_COURSE_VIDEO"): Xóa một video bài giảng khỏi khóa học.
    Thuộc tính: "params": { "courseId"?: "...", "courseTitle"?: "...", "lessonId"?: "...", "lessonNumber"?: 3, "lessonTitle"?: "..." }

36. "MANAGE_COURSE_CHAPTER": Thêm, đổi tên, cập nhật Nhóm tầng 1, sắp xếp hoặc xóa Chương trong khóa học.
    Thuộc tính: "params": {
      "courseId"?: "...",
      "courseTitle"?: "...",
      "action": "add" | "rename" | "update" | "delete" | "reorder",
      "chapterId"?: "...",
      "title"?: "Tên chương",
      "newTitle"?: "Tên chương mới",
      "groupTitle"?: "Nhóm tầng 1",
      "order"?: 0
    }

37. "PROBE_COURSE_DURATIONS": Tự động quét và đo lại thời lượng phút/giây chuẩn cho các video (hỗ trợ Google Drive, YouTube, MP4/Cloudinary) trong khóa học.
    Thuộc tính: "params": { "courseId"?: "...", "courseTitle"?: "...", "lessonId"?: "...", "onlyMissing"?: false }

38. "WORKFLOW": KỊCH BẢN MAKE.COM ĐA BƯỚC (Multi-step Automation Workflow).
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
    if (context.existingFoldersSummary) {
      instruction += `\nCÂY THƯ MỤC HIỆN CÓ TRONG HỆ THỐNG (ƯU TIÊN DÙNG ĐÚNG folderId / TÊN CÓ SẴN KHI DI CHUYỂN ĐỀ THI, KHÔNG TẠO TRÙNG):\n${context.existingFoldersSummary}\n`;
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
  lastCourseId?: string;
  lastCourseTitle?: string;
  lastLessonId?: string;
  lastLessonTitle?: string;
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
        return context.lastExamTitle || context.lastCourseTitle || context.prev?.title || match;
      }
      if (trimmed === "courseId" || trimmed === "newCourseId") {
        return context.lastCourseId || context.prev?.courseId || match;
      }
      if (trimmed === "courseTitle") {
        return context.lastCourseTitle || context.prev?.title || match;
      }
      if (trimmed === "lessonId") {
        return context.lastLessonId || context.prev?.lessonId || match;
      }
      if (trimmed === "lessonTitle") {
        return context.lastLessonTitle || context.prev?.lessonTitle || match;
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
  } else if (
    cloned.type === "UPDATE_COURSE" ||
    cloned.type === "ADD_COURSE_LESSONS" ||
    cloned.type === "ADD_COURSE_LESSON" ||
    cloned.type === "CREATE_COURSE_VIDEO" ||
    cloned.type === "UPDATE_COURSE_LESSON" ||
    cloned.type === "UPDATE_COURSE_VIDEO" ||
    cloned.type === "DELETE_COURSE_LESSON" ||
    cloned.type === "DELETE_COURSE_VIDEO" ||
    cloned.type === "MANAGE_COURSE_CHAPTER" ||
    cloned.type === "PROBE_COURSE_DURATIONS"
  ) {
    if (!cloned.params.courseId || String(cloned.params.courseId).startsWith("{{")) {
      if (context.lastCourseId) cloned.params.courseId = context.lastCourseId;
      else if (context.prev?.courseId) cloned.params.courseId = context.prev.courseId;
    }
    if (
      (cloned.type === "UPDATE_COURSE_LESSON" ||
        cloned.type === "UPDATE_COURSE_VIDEO" ||
        cloned.type === "DELETE_COURSE_LESSON" ||
        cloned.type === "DELETE_COURSE_VIDEO") &&
      (!cloned.params.lessonId || String(cloned.params.lessonId).startsWith("{{"))
    ) {
      if (context.lastLessonId && !cloned.params.lessonTitle && cloned.params.lessonNumber === undefined) {
        cloned.params.lessonId = context.lastLessonId;
      } else if (context.prev?.lessonId && !cloned.params.lessonTitle && cloned.params.lessonNumber === undefined) {
        cloned.params.lessonId = context.prev.lessonId;
      }
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
