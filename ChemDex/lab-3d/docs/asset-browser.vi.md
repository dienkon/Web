# Thư viện Asset 3D

Mở **Asset 3D** trên thanh điều hướng phòng lab hoặc thêm `?view=assets` vào URL Lab 3D. Có thể chia sẻ một mẫu cụ thể bằng `?view=assets&asset=flask`.

Thư viện lấy 34 dụng cụ và các mẫu hóa chất trực tiếp từ catalog hiện tại. Mẫu rắn dùng bộ dựng hình thái gốc; mẫu lỏng dùng chai và nhãn hóa chất của phòng lab. Đây là trình xem mô hình, không chạy thí nghiệm hay mô phỏng phản ứng.

- Tìm tên tiếng Việt có hoặc không dấu, tên tiếng Anh và công thức; lọc theo nhóm.
- Xoay bằng chuột trái hoặc một ngón tay. Zoom bằng con lăn hoặc chụm hai ngón. Di chuyển bằng chuột phải hoặc hai ngón tay.
- Chọn góc phối cảnh, trước, sau, bên, trên hoặc cận cảnh. `R` đặt lại góc nhìn, `Space` bật/tắt tự xoay, `+`/`−` zoom, `←`/`→` chuyển mẫu.
- Điều chỉnh phông nền, ánh sáng, lưới không gian, khung lưới mô hình và độ phân giải. Tải ảnh PNG hoặc xem toàn màn hình.
- Trên mobile, mở các bảng **Thư viện** và **Chi tiết** bằng thanh phía trên.

Chỉ có một WebGL canvas và một asset đang được dựng. Chuyển mẫu giữ nguyên canvas; khi tắt tự xoay, canvas chỉ dựng lại khi có thay đổi hoặc camera đang chuyển động. Vật liệu và hình học dùng chung được giữ lại. Preview dùng trạng thái tạm bằng `setState`, khôi phục khi rời mẫu, không gọi các thao tác lưu hoặc ghi lịch sử phòng lab.

Kiểm tra trình duyệt: chạy Vite tại cổng 6774 rồi chạy `node scripts/testAssetBrowser.mjs`. Có thể đổi URL bằng biến môi trường `ASSET_BROWSER_ORIGIN`. Ảnh desktop/mobile và báo cáo nằm trong `artifacts/asset-browser/`.
