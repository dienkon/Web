# Quy ước đóng góp

## 1. Mục tiêu khi đóng góp

Mọi thay đổi nên ưu tiên:
- rõ ràng,
- nhất quán,
- dễ review,
- không phá cấu trúc dữ liệu hiện tại.

## 2. Quy ước đặt tên

### File
- HTML: chữ thường, dùng dấu gạch ngang.
- JS module: theo chức năng rõ ràng.
- JSON dữ liệu: `NNN_Symbol.json`.
- Asset ảnh / 3D: đặt theo mã nguyên tố hoặc module liên quan.

### Field dữ liệu
- Dùng key thống nhất giữa các nguyên tố.
- Tránh thêm tên field tùy hứng cho một file duy nhất.
- Nếu bắt buộc thêm field mới, cập nhật tài liệu schema.

## 3. Quy tắc viết dữ liệu hóa học

- Ưu tiên tiếng Việt dễ hiểu, nhưng giữ tên quốc tế khi cần.
- Nội dung nên chia đoạn ngắn.
- Không nên viết một block quá dài nếu có thể tách thành nhiều mục.
- Nếu có số liệu, nên ghi rõ đơn vị.

## 4. Quy tắc viết JavaScript

- Module nào làm việc nấy.
- Tránh đẩy logic dữ liệu vào HTML.
- Hạn chế tạo state rải rác trong `window` nếu có thể.
- Các hàm render nên thuần và dễ test.

## 5. Quy tắc UI/UX

- Giữ tương phản rõ.
- Hạn chế quá nhiều thông tin dồn cùng một lúc.
- Ưu tiên trải nghiệm đọc trên màn hình nhỏ.
- Các nút tương tác nên có trạng thái hover / active / disabled rõ.

## 6. Khi thêm nguyên tố mới

Checklist:
- [ ] Có entry trong manifest
- [ ] Có JSON dữ liệu chi tiết nếu cần
- [ ] Category hợp lệ
- [ ] Ảnh / media đúng path
- [ ] Mở được ở bảng tuần hoàn
- [ ] Mở được ở trang chi tiết
- [ ] Không lỗi chatbot / share / note

## 7. Khi thêm tính năng mới

Nên có:
- mô tả ngắn trong README hoặc docs,
- cập nhật roadmap,
- kiểm tra tương thích với mobile,
- test với ít nhất một nguyên tố có data và một nguyên tố placeholder.
