# Tài Liệu Kỹ Thuật DkAI — Gemini 3.5 Flash Lite

## 1. Mục Tiêu & Sứ Mệnh Sư Phạm Của DkAI

**DkAI** là trợ lý học tập tích hợp chuyên sâu, được thiết kế theo phương pháp sư phạm kiến tạo (Pedagogical Scaffolding). DkAI không chỉ đưa ra đáp số cuối cùng mà đóng vai trò là một gia sư đồng hành:
1. **Phân tích bản chất hiện tượng / định lý**: Giúp học sinh hiểu gốc rễ kiến thức.
2. **Hướng dẫn từng bước có cấu trúc (Step-by-step guidance)**: Giúp học sinh nắm vững phương pháp giải quyết bài toán.
3. **Hiển thị công thức Toán - Lý - Hóa chuẩn LaTeX (KaTeX)**: Trực quan, dễ đọc, chuẩn quốc tế.
4. **Cảnh báo lỗi bẫy thường gặp (Pitfall warnings)**: Giúp học sinh tránh mất điểm oan trong các kỳ thi tốt nghiệp THPT và ĐGNL.

---

## 2. Kiến Trúc Tích Hợp Mô Hình

* **Mô hình chính**: `gemini-3.5-flash-lite` của Google DeepMind / Google AI.
* **Cổng giao tiếp**: REST API `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent`.
* **Cấu hình tham số sinh**:
  - `temperature`: 0.4 (Tập trung, chính xác, giảm thiểu ảo giác trong các bài toán khoa học).
  - `topK`: 40
  - `topP`: 0.95
  - `maxOutputTokens`: 2500
* **Multimodal Support (Đa phương thức)**:
  - Hỗ trợ tải lên ảnh đề bài (`image/png`, `image/jpeg`, `image/webp`) và tài liệu PDF (`application/pdf`) dung lượng tối đa 5MB.
  - Tự động mã hóa Base64 dạng `inlineData` gửi trực tiếp đến Gemini.

---

## 3. Các Chế Độ Học Tập (Operating Modes)

| Mode ID | Tên Chế Độ | System Prompt / Mục Tiêu Sư Phạm | Định Dạng Trả Về |
| :--- | :--- | :--- | :--- |
| `solver` | **Giải bài chi tiết** | Hướng dẫn giải từng bước, công thức LaTeX `$$...$$` và `\(...\)`, phân tích giả thiết, cảnh báo lỗi bẫy | Markdown + KaTeX |
| `tutor` | **Gia sư kiến thức** | Giải thích trực quan định nghĩa, tính chất, ứng dụng thực tiễn của khái niệm | Markdown + KaTeX |
| `summary` | **Tóm tắt bài học** | Tóm tắt tài liệu theo 3 phần: Ý chính, Các dạng bài hay gặp, Lưu ý ghi nhớ | Bullet points Markdown |
| `flashcards`| **Tạo bộ thẻ ghi nhớ** | Tự động sinh danh sách câu hỏi - trả lời ngắn phục vụ ôn tập Spaced Repetition | Structured Cards |
| `qa` | **Hỏi đáp tài liệu** | Giải đáp chuyên sâu dựa trên ngữ cảnh trích đoạn tài liệu | Markdown giải thích |

---

## 4. Pipeline Hiển Thị Kết Quả & KaTeX Rendering

```
Raw AI Output (Markdown + LaTeX)
              │
              ▼
1. Normalize Markdown Headings & Lists
              │
              ▼
2. Parse Block Math: $$...$$ hoặc \[...\]  ──► katex.renderToString(expr, { displayMode: true })
              │
              ▼
3. Parse Inline Math: \(...\) hoặc $...$   ──► katex.renderToString(expr, { displayMode: false })
              │
              ▼
4. DOMPurify Sanitization Pipeline        ──► Lọc sạch mã độc XSS, chỉ giữ lại thẻ an toàn & thẻ KaTeX
              │
              ▼
Rendered Clean HTML in Chat UI
```

---

## 5. Tương Tác Sau Khi Nhận Lời Giải (Post-Response Actions)

Người dùng có thể thực hiện 3 hành động ngay dưới mỗi tin nhắn của DkAI:
1. 📋 **Sao chép lời giải**: Copy toàn bộ nội dung đã định dạng vào bộ nhớ tạm (Clipboard).
2. 📝 **Lưu vào Ghi chú**: Tự động lưu lời giải kèm nhãn môn học và lớp vào Sổ tay ghi chú cá nhân (`notesService`).
3. 🧠 **Tạo thẻ Flashcard**: Chuyển nội dung kiến thức quan trọng thành một bộ thẻ ôn tập ngắt quãng (`flashcardService`).

---

## 6. Bộ Nhớ Đệm (Cache) & Cơ Chế Giới Hạn Tần Suất (Guard)

* **Cache 2 tầng**:
  - Tầng 1: `Map` in-memory cho truy cập cực nhanh.
  - Tầng 2: `localStorage` với khóa `dkdocshop_ai_cache` và thời gian sống (TTL) 24 giờ.
* **Quota Guard**:
  - Theo dõi số lần hỏi trong ngày của từng người dùng (`dailyQuota = 30`).
  - Cooldown tối thiểu 3 giây giữa hai lần gửi liên tiếp để tránh nghẽn luồng.
  - Fallback thông minh: Khi ngoại tuyến hoặc chưa cấu hình API Key, hệ thống tự động kích hoạt bộ sinh sư phạm mẫu có công thức LaTeX để người dùng kiểm thử giao diện trơn tru.
