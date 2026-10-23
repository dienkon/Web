# Dấu chân người lính

Website tĩnh, không cần cài package. Mở trực tiếp `on-bai.html` (hoặc `index.html`) bằng trình duyệt để sử dụng, không cần chạy server. Hai trang còn lại mở bằng `o-chu.html` và `luyen-tap.html`.

Nếu muốn dùng HTTP, chạy tại thư mục dự án:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

- Ôn bài: http://127.0.0.1:4173/on-bai.html (hoặc trang gốc)
- Ô chữ: http://127.0.0.1:4173/o-chu.html
- Luyện tập: http://127.0.0.1:4173/luyen-tap.html

Ba URL độc lập, không có thanh tab. Hai trang ô chữ và luyện tập chỉ có sườn chờ nội dung. URL không phải cơ chế bảo mật.

Giữ thứ tự 5 câu hỏi theo đề gốc. Chỉ xáo trộn nội dung các lựa chọn A–D khi mở trang và khi bấm Ôn tập lại; vị trí đáp án đúng tự cập nhật theo lựa chọn sau khi đảo.

Trang thử yêu cầu fullscreen khi mở và thử lại ở tương tác đầu tiên. Trình duyệt có thể yêu cầu người dùng bấm nút Toàn màn hình hoặc F11; web không thể ép vượt chính sách này. Âm thanh phát khi chọn đáp án. Dùng A–D hoặc chuột để trả lời. Chọn sai không lộ đáp án và được chọn lại sau hiệu ứng; chỉ chọn đúng mới được bấm Enter hoặc nút tiếp tục. Điểm là số câu đã giải đúng, kể cả sau nhiều lần thử.

## Cấu trúc

- `src/questions.mjs`: toàn bộ đề, lựa chọn và đáp án đúng (chỉ số 0–3).
- `src/panels.mjs`: khung câu hỏi và khung đáp án, text là DOM riêng, không dính vào ảnh.
- `src/styles.css`: màu sắc, viền góc, nền và kích thước chữ. Câu hỏi 48–56px, đáp án 54–64px; tự xuống dòng và giãn khung theo nội dung. Màn hình hẹp dùng một cột và được cuộn để giữ đủ nội dung.
- `src/session.mjs`: trạng thái, điểm, thử lại khi sai, chỉ chuyển câu khi đúng.
- `src/browser.js`: bản script thường đã được tạo sẵn để mở trực tiếp qua `file://`, không bị giới hạn CORS của ES module. Sau khi sửa các file `.mjs`, chạy `node scripts/build-browser.mjs` để cập nhật bản này; không cần cài thư viện.
- `src/effects.mjs`: pháo hoa khi đúng; khi sai luân phiên drone FPV, bom rơi và lựu đạn rơi, kèm vụ nổ và rung giao diện. Tôn trọng Reduce Motion của hệ điều hành.
- `assets/trld.mp3`, `assets/trlsai.mp3`: âm thanh người dùng cung cấp.
- `assets/reference-panels.png`: ảnh khung gốc người dùng cung cấp.
- `assets/frame-question.png`, `assets/frame-a.png` đến `frame-d.png`: crop trực tiếp từ ảnh gốc, có nền ngoài khung trong suốt. Giữ nguyên hình khung; chữ câu hỏi và nội dung đáp án được đặt bằng HTML riêng. `scripts/crop-panels.py` lưu tọa độ crop, cần Pillow nếu muốn tạo lại các ảnh này.
- Các ảnh `frame-question-crest.png`, `frame-question-body.png`, `frame-badge-*.png`, `frame-answer-body.png` tách riêng huy hiệu và viền từ các khung gốc, giúp phần chứa chữ giãn mà không kéo méo toàn bộ huy hiệu.
- `assets/vietnam-jungle.png`: ảnh nền tạo bằng công cụ ImageGen tích hợp.

Prompt ảnh nền: “Vietnamese tropical jungle, bamboo groves, limestone hills and a discreet earth footpath, dawn mist, deep olive and forest green, muted golden sunlight, realistic painterly environment, quiet dark center for question panels, no text or UI.”

Kiểm tra bằng `node --test tests/*.test.mjs`. Không cần internet khi sử dụng; hỗ trợ cả mở file trực tiếp và HTTP.
