# Inkulator 2.4.3

- Zoom có các nút bấm trực tiếp −, + và vừa chiều rộng; ô phần trăm vẫn mở menu nhập zoom. Không tự đổi zoom khi mở bảng công cụ.
- Chụp để chừa chỗ giải giữ tọa độ màn hình của vùng nguồn, kể cả khi đang xem trang khác trong luồng cuộn. Thêm trang trắng giữ mức zoom và vị trí ngang, đưa đầu trang mới vào vùng nhìn.
- Bản web có nút **Web**: lưu tệp hiện tại, Lưu thành, sao lưu tất cả kèm PDF gốc từ IndexedDB, khôi phục JSON, thống kê dung lượng và yêu cầu lưu lâu dài. Trình duyệt hỗ trợ File System Access dùng lại tệp trong phiên; trình duyệt khác tải bản JSON. Không tự ghi đè tệp trên máy trong nền. Khi thiếu PDF gốc, xuất bản sao sẽ báo lỗi thay vì tạo gói thiếu tài nguyên.
- Chính sách ở Menu → Chính sách tải và sử dụng; trang tải hiển thị nội dung trước liên kết tải. Bộ cài Windows hiển thị cùng văn bản. Xem [chính sách đầy đủ](../policies/USAGE.txt).
- Gói web chỉ chứa tài nguyên chạy, giấy phép và ví dụ; bỏ source upstream, Node modules, EXE giả lập và cấu hình khóa mặc định Windows. Không thêm thư viện frontend hoặc dịch vụ máy chủ. Bộ ZIP dùng ghi luồng để tránh giữ toàn bộ gói trong RAM khi đóng gói.

Kiểm tra tập trung: nút zoom thực tế, giữ vị trí câu hỏi ở trang kế, bản sao chứa PDF từ IndexedDB, đường lưu File System Access giả lập và trang chính sách. Không tuyên bố kiểm tra mọi trình duyệt hoặc benchmark PDF 400 MB.
