# Device Matrix

Trạng thái tại P0 (2026-10-13): raw-CDP automation đã chạy trên Chrome headless cho ba viewport; chưa có Playwright hoặc thiết bị thật. Kết quả emulation không thay thế xác nhận iOS Safari/Android Chrome thật.

## Thiết bị và trình duyệt

| Nhóm | Thiết bị tối thiểu | Trình duyệt | Hướng / viewport | Trạng thái | Bằng chứng |
|---|---|---|---|---|---|
| iOS | iPhone có tai thỏ/Dynamic Island | Safari bản mới nhất hỗ trợ máy | Ngang, safe-area thật | CHỜ THIẾT BỊ | — |
| Android tầm trung | Snapdragon 6xx, RAM 4 GB | Chrome bản ổn định | Ngang 812×375 hoặc gần nhất | CHỜ THIẾT BỊ | — |
| Android nhỏ | Máy/emulator 740×360 @2x | Chrome 155 headless/CDP | Ngang | ĐÃ CHẠY BASELINE | `docs/screens/p0-mobile-740x360-2x-*.png` |
| Android emulation | 812×375 @3x touch | Chrome 155 headless/CDP | Ngang | ĐÃ CHẠY BASELINE | `docs/screens/p0-mobile-812x375-3x-*.png` |
| Desktop | Windows | Chrome 155 headless/CDP | 1366×768 | ĐÃ CHẠY BASELINE | `docs/screens/p0-desktop-1366x768-*.png` |

## Checklist thủ công bắt buộc

Ghi ĐẠT/KHÔNG ĐẠT, thiết bị, phiên bản OS/browser, ảnh hoặc trace cho từng mục.

1. Vào game từ Start và tải được cảnh 3D, không màn trắng hoặc lỗi console nghiêm trọng.
2. Di chuyển liên tục bằng bàn phím hoặc joystick; không kẹt, không xuyên vật thể rõ ràng.
3. Nhìn/xoay camera bằng chuột hoặc cảm ứng; đa chạm không làm joystick nhảy.
4. Tương tác với vật thể; một lần bấm chỉ tạo đúng một hành động.
5. Mở, thao tác và đóng quiz; nội dung dài cuộn được trong màn hình ngang.
6. Xoay dọc/ngang giữa chừng; UI và trạng thái game phục hồi đúng, không bị cắt bởi safe-area/thanh trình duyệt.
7. Chuyển app sang nền rồi quay lại; không kẹt phím/ngón, không có bước nhảy lớn ở mô phỏng.
8. Thoát và Tiếp tục từ bản lưu; phase, nhiệm vụ, inventory, vị trí và sự cố được khôi phục đúng.
9. Kiểm tra âm thanh/âm lượng/định vị; không tự phát trước tương tác người dùng và không còn voice sau khi rời cảnh.
10. Chơi/sạc trong 10 phút; ghi FPS, nhiệt độ cảm nhận, mức pin trước/sau và hiện tượng giảm hiệu năng.

## Mẫu kết quả một lượt

| Mục | Kết quả | Ghi chú / lỗi tái hiện | Ảnh / trace |
|---:|---|---|---|
| 1–10 | CHƯA CHẠY | Điền riêng từng mục khi có thiết bị | — |

## Phát hiện từ ảnh baseline tự động

- Ở 740×360, prompt tương tác chữ phóng rất lớn và che phần lớn viewport; minimap/nút tương tác cũng chiếm diện tích đáng kể.
- Ở 812×375 @3x, Start screen bị cắt theo chiều dọc và nút chính nằm sát/ngoài mép dưới.
- Cảnh Phase 2/fire được tạo đúng và có ảnh ở cả ba viewport; đây chỉ xác nhận fixture đo, chưa chứng minh luồng chơi hoàn chỉnh.
