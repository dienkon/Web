# Runtime và điều khiển mobile — 15/11/2026

- Biển báo dùng một danh mục chứa đường dẫn đầy đủ. Trước đây bộ chuyển tên hóa chất sửa đoạn `chat-oxy-hoa` thành `chat-oxygen-hoa`, làm bảng GHS 3D và bài tập SVG tải ảnh không tồn tại. Danh mục mới giữ đường dẫn như một định danh, đồng thời vẫn chuyển tên hiển thị.
- R3F 9 còn tạo `THREE.Clock`. Alias chính xác của module `three` cung cấp giao diện Clock bằng `THREE.Timer`, dùng chung cho ứng dụng và các dependency được Vite tối ưu. Các export khác vẫn dùng Three gốc. Adapter giữ start/stop/elapsedTime và bỏ thời gian tab bị ẩn; không lọc hay tắt cảnh báo console. Có thể bỏ adapter khi nâng R3F sang bản hỗ trợ Timer ổn định.
- Sidebar ChemDex được platform chèn khi build. Trang lab-safety ghi marker riêng và dùng CSS/bridge giới hạn theo marker để thu thành nút 44px. Menu mở khóa pointer-lock, chặn điều khiển cảnh, giữ focus và dừng thời gian Academy. Các trang ChemDex khác không bị sửa.
- Di chuyển tích phân vận tốc theo thời gian, giữ độ kéo analog, có bước con tối đa 1/60 giây và trượt theo tiếp tuyến khi va ghế. Đầu người chơi giảm rung dần khi dừng. Chế độ thấp dùng nhịp 30 FPS thay cho 40 FPS không đều trên màn hình 60 Hz.
- Tay dùng cùng trục cổ tay/ngón tay, phân biệt đúng trái/phải ở góc nhìn FPS và avatar trong gương. Điểm cầm dụng cụ giữ vị trí; recoil dùng damping mũ, tránh vượt mục tiêu khi frame dài.
- Mobile auto bắt đầu DPR 1, có khử răng cưa và tăng tối đa 1.25 nếu đủ nhanh; máy yếu vẫn giảm tự động. DPR hiện tại đồng bộ với Canvas để không bị đặt lại khi đổi menu/cài đặt.
- Batching giữ hình học, màu tuyến tính và các thuộc tính vật liệu; ngăn kéo và ghế gộp riêng theo hệ tọa độ của chính vật thể để vẫn chuyển động được. Nhãn và mặt kính không bị gộp sai.

## Kiểm chứng

`npm run lint`, `npm run build`, `npm test`, `npm run test:practical`, `npm run test:runtime`, `npm run test:assets:browser`, `npm run test:navigation:browser`.

Các script kiểm tra browser có sẵn dùng CDP cần Chrome có remote debugging và Vite đang chạy; dùng `P0_CDP_ORIGIN` để chọn browser riêng:

- `scripts/test-mobile-controls-browser.mjs`: hai ngón, di chuyển thật, release/cancel/blur/modal.
- `scripts/test-hand-orientation-browser.mjs`: tay trần/có găng × 4 trạng thái dụng cụ, gương, grip, frame 8–200 ms.
- `scripts/test-static-batching-browser.mjs`: số lệnh vẽ, màu, picking, chuyển động và giải phóng tài nguyên; số đo trong `docs/movement-batching/`.
- `scripts/test-adaptive-quality-browser.mjs`: DPR và khử răng cưa mobile, hạ độ phân giải khi chậm, giữ DPR qua render lại, chuyển preset và kích thước HUD không đổi.

Browser assets chạy bản production dưới cả `/lab-safety/` và `/nested/lab-safety/`, giải mã đủ 11 ảnh và kiểm tra console/runtime. Navigation được thử ở 1366×768, 844×390 và 568×320, dùng đúng sidebar platform được chèn, kể cả đường dự phòng mobile không hỗ trợ fullscreen.

Ở vị trí camera `[0, 1.62, 4.5]` nhìn vào phòng, DPR 0.85: draw calls giảm 963 → 454 (khoảng 53%). Ngăn kéo giảm 200 → 20 mesh đang vẽ, ghế giảm 176 → 128. Mặt đổi lại: batch lớn làm culling kém chi tiết hơn nên có thể tăng số tam giác gửi tới GPU. Kiểm tra lifecycle xác nhận nguồn picking vẫn hoạt động, vật liệu khác nhau không bị gộp và tài nguyên sở hữu được giải phóng đúng một lần.

Không thấy mã ứng dụng gọi Chrome extension runtime và không tái hiện `runtime.lastError: Receiving end does not exist` trong profile kiểm thử sạch. Nếu thông báo còn xuất hiện ở profile thường, cần xác định extension/content script phát ra thông báo. Không thêm mã che lỗi console.

Kiểm thử mobile là giả lập trình duyệt desktop; số lệnh vẽ chứng minh giảm tải render, không phải cam kết FPS trên mọi điện thoại. Các chunk Three/game lớn vẫn có cảnh báo kích thước khi build.
