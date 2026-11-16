# Dấu chân người lính

Website tĩnh, không cần cài package. Mở trực tiếp `on-bai.html` (hoặc `index.html`) bằng trình duyệt để sử dụng, không cần chạy server. Hai trang còn lại mở bằng `o-chu.html` và `luyen-tap.html`.

Nếu muốn dùng HTTP, chạy tại thư mục dự án:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

- Ôn bài: http://127.0.0.1:4173/on-bai.html (hoặc trang gốc)
- Ô chữ: http://127.0.0.1:4173/o-chu.html
- Luyện tập: http://127.0.0.1:4173/luyen-tap.html

Ba URL độc lập, không có thanh tab. Ôn bài và luyện tập có bộ 5 câu hỏi riêng; trang ô chữ có trò chơi Mật mã rừng xanh. URL không phải cơ chế bảo mật.

Giữ thứ tự 5 câu hỏi theo đề gốc. Chỉ xáo trộn nội dung các lựa chọn A–D khi mở trang và khi bấm Ôn tập lại; vị trí đáp án đúng tự cập nhật theo lựa chọn sau khi đảo.

Trang thử yêu cầu fullscreen khi mở và thử lại ở tương tác đầu tiên. Trình duyệt có thể yêu cầu người dùng bấm nút Toàn màn hình hoặc F11; web không thể ép vượt chính sách này. Âm thanh phát khi chọn đáp án. Dùng A–D hoặc chuột để trả lời. Chọn sai không lộ đáp án và được chọn lại sau hiệu ứng; chỉ chọn đúng mới được bấm Enter hoặc nút tiếp tục. Điểm là số câu đã giải đúng, kể cả sau nhiều lần thử.

Sau khi trả lời đúng câu luyện tập thứ 5, trang tự chạy hiệu ứng xe tăng và vụ nổ trong khoảng 2,6 giây rồi mở câu tự luận toàn màn hình: “Nghệ thuật quân sự của lực lượng vũ trang địa phương được thể hiện ở những nội dung cơ bản nào?” Không có đáp án hoặc ô nhập bài tự luận. Nhấn Enter hoặc nút tiếp tục để chuyển sang màn mời các bạn đặt câu hỏi cho nhóm. Màn mời giữ nguyên cho tới khi chọn Luyện tập lại. Khi bật giảm chuyển động, câu tự luận hiện ngay, bỏ qua phần hoạt họa.

## Cấu trúc

- `src/questions.mjs`: toàn bộ đề, lựa chọn và đáp án đúng (chỉ số 0–3).
- `src/practice-questions.mjs`: 5 câu luyện tập về nghệ thuật quân sự địa phương và trách nhiệm học sinh, tách biệt với bộ câu hỏi ôn bài.
- `src/practice-finale.mjs`, `src/practice-finale.css`: hiệu ứng kết thúc luyện tập, câu tự luận và màn giao lưu câu hỏi.
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

## Trò chơi ô chữ

Mở `o-chu.html`. Chọn số hàng ngang để mở câu hỏi. Cột vàng ghép thành **DUKICH**, đọc từ trên xuống. Có thể đoán từ khóa bất cứ lúc nào; đoán sai không lộ đáp án. Trả lời đúng hàng ngang mới mở chữ; chấp nhận tiếng Việt có dấu, không dấu và khoảng trắng. Sau khi giải từ khóa, toàn bộ bảng được mở; nút Chơi lại đặt lại lượt chơi.

| Hàng | Đáp án | Kiểu câu hỏi | Chữ cột dọc |
| --- | --- | --- | --- |
| 1 | Địa đạo | Nhìn hình đoán chữ | D |
| 2 | Hậu cần | Trắc nghiệm | U |
| 3 | Đoàn kết | Trắc nghiệm | K |
| 4 | Trinh sát | Một bạn diễn trực tiếp | I |
| 5 | Cứu hộ | Một bạn diễn trực tiếp | C |
| 6 | Hành quân | Nhìn hình bắt chữ: hành + quân cờ | H |

Các cửa sổ câu hỏi phủ toàn màn hình trình duyệt. Câu hỏi và lựa chọn dùng chữ lớn theo màn hình; ảnh và vùng trả lời nằm cạnh nhau trên màn hình rộng, xếp dọc trên màn hình nhỏ. Các hướng dẫn và nhãn lặp đã được bỏ để dành chỗ cho nội dung. Dùng nút × hoặc Escape để về bảng.

Trước hai lượt diễn, người dẫn cho bạn diễn xem riêng **Thẻ người diễn**, rồi đóng thẻ trước khi chiếu cho lớp. Nút Bắt đầu diễn đóng thẻ và đếm 45 giây. Hết giờ không tự lộ đáp án; lớp vẫn có thể trả lời. Không cần video.

- `src/crossword-data.mjs`: đề, ảnh, gợi ý, thẻ người diễn và vị trí chữ cột dọc.
- `src/crossword-session.mjs`: chấm từ, theo dõi hàng đã mở và kiểm tra từ khóa.
- `src/crossword.mjs`, `src/crossword.css`: bảng ô chữ, cửa sổ câu hỏi, đồng hồ và tổng kết.
- `assets/crossword-dia-dao.png`: ImageGen tích hợp; prompt: rừng tre Việt Nam, lát cắt lối đi dưới lòng đất, người đi khom, tranh hiện thực tông ô liu và vàng, không chữ hoặc nhãn.
- `assets/crossword-hanh-quan.png`: ImageGen tích hợp; prompt: người lính trưởng thành mặc quân phục xanh, mang ba lô đi hàng dọc trên đường rừng nắng sớm, không chiến đấu, không chữ.
- `assets/rebus-hanh.png`: ImageGen tích hợp; prompt: bó hành lá tươi có gốc trắng và rễ, tĩnh vật minh họa hiện thực, nền ngà, chủ thể lớn, không chữ.
- `assets/rebus-quan-co.png`: ImageGen tích hợp; prompt: quân vua, mã và ba quân tốt bằng gỗ, tĩnh vật minh họa hiện thực trên nền ngà đồng bộ, không chữ hoặc số. Hai hình được ghép bằng dấu +, đọc từ trái sang phải thành HÀNH QUÂN.

Prompt ảnh nền: “Vietnamese tropical jungle, bamboo groves, limestone hills and a discreet earth footpath, dawn mist, deep olive and forest green, muted golden sunlight, realistic painterly environment, quiet dark center for question panels, no text or UI.”

Kiểm tra bằng `node --test tests/*.test.mjs`. Không cần internet khi sử dụng; hỗ trợ cả mở file trực tiếp và HTTP.

Tài liệu Word cho người dẫn: `output/Cau_hoi_va_dap_an_o_chu_DUKICH.docx`, gồm đầy đủ câu hỏi ô chữ, hình ảnh, gợi ý, thẻ người diễn và key. Dựng từ dữ liệu hiện tại bằng `scripts/build-crossword-docx.py` với Python và Node trong Codex primary runtime. File đã kiểm tra nội dung và cấu trúc; chưa render kiểm tra bố cục do môi trường thiếu bộ chuyển Word, người dùng đã chấp nhận nhận bản chưa kiểm tra bố cục.
