# Đặc Tả Giao Diện Lập Trình Dịch Vụ (Service APIs) - DkDocShop 2.0

DkDocShop 2.0 đóng gói toàn bộ nghiệp vụ trong tầng Service Layer (`src/services/`). Dưới đây là đặc tả các hàm API chính phục vụ bảo trì và mở rộng hệ thống.

---

## 1. `PurchaseService` (`src/services/purchase.service.js`)

### `purchaseDocument(docId, couponCode = "")`
* **Mục đích**: Thực hiện giao dịch mua tài liệu có phí hoặc nhận tài liệu miễn phí.
* **Tham số**:
  - `docId` (`string`): ID tài liệu cần mua.
  - `couponCode` (`string`, tùy chọn): Mã giảm giá coupon nếu có.
* **Quy trình**:
  1. Kiểm tra tài khoản đã đăng nhập.
  2. Kiểm tra tài liệu đã mua chưa (chặn mua trùng lặp).
  3. Áp dụng mã coupon tính toán giá thực tế `effectivePrice`.
  4. Kiểm tra số dư ví `>= effectivePrice`.
  5. Trừ tiền ví và tạo bản ghi giao dịch `transactions`.
  6. Tự động phân bổ key nếu tài liệu gắn `keyPoolId`.
  7. Lưu bản ghi đơn hàng `purchases`.
  8. Cộng điểm kinh nghiệm XP qua `gamificationService`.
  9. Gửi webhook thông báo Discord.
* **Trả về**: `Promise<object>` chứa thông tin đơn hàng đã tạo.

---

## 2. `QuizService` (`src/services/quiz.service.js`)

### `submitAttempt(quizId, answers, timeSpentSeconds)`
* **Mục đích**: Chấm điểm bài thi trắc nghiệm và lưu kết quả.
* **Tham số**:
  - `quizId` (`string`): ID bài thi.
  - `answers` (`object`): Bản đồ `{ [questionId]: selectedOptionIndex }`.
  - `timeSpentSeconds` (`number`): Thời gian học sinh đã làm bài.
* **Trả về**: `object` chứa điểm số %, số câu đúng/tổng số câu, lời giải chi tiết từng câu và điểm XP được cộng.

---

## 3. `FlashcardService` (`src/services/flashcard.service.js`)

### `rateCard(deckId, cardId, rating)`
* **Mục đích**: Chấm điểm mức độ thuộc bài theo thuật toán Spaced Repetition (SRS).
* **Tham số**:
  - `deckId` (`string`): ID bộ thẻ.
  - `cardId` (`string`): ID thẻ.
  - `rating` (`'again' | 'hard' | 'good' | 'easy'`): Mức độ ghi nhớ.

---

## 4. `AIService` (`src/services/ai.service.js`)

### `askAI({ prompt, mode, subject, docContext })`
* **Mục đích**: Gửi yêu cầu học tập tới trợ lý AI theo chế độ chuyên biệt.
* **Chế độ hỗ trợ**:
  - `tutor`: Gia sư giải thích khái niệm.
  - `solve`: Hướng dẫn giải bài tập từng bước.
  - `exam`: Chiến thuật và trọng tâm đề thi.
  - `summary`: Tóm tắt tài liệu trọng tâm.
  - `flashcard`: Tạo bộ thẻ Flashcard từ nội dung.
  - `quiz`: Tạo câu hỏi trắc nghiệm tự luyện.

---

## 5. `NotesService` (`src/services/notes.service.js`)

### `saveNote({ id, title, text, docId, page, color, tags })`
* **Mục đích**: Tạo mới hoặc cập nhật ghi chú học tập kèm đính kèm tài liệu và số trang.
