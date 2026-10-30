# Rà soát toàn bộ đường chọn hiệu ứng kết tủa

Ngày 23/10/2026. Chạy `node node_modules/tsx/dist/cli.mjs scripts/auditPrecipitateCoverage.ts` để tái tạo bảng JSON và Markdown trong `artifacts/science-audit`.

Kết quả: 42 chương trình khai báo kết tủa, 14 chương trình có profile vật lý riêng. 28 chương trình còn thiếu profile riêng, tương ứng 24 công thức khác nhau. Trước sửa đổi, các chương trình thiếu profile thường bị gán danh tính BaSO₄; nay phép tra cứu giữ công thức thật và màu hợp lệ được truyền từ khai báo phản ứng, đồng thời gắn `modelBasis: generic_fallback`.

Không còn sai danh tính không có nghĩa đã đủ mô hình: các hệ số vận chuyển, hình thái mặc định và độ xốp của fallback vẫn kế thừa giá trị chung. Chưa coi các chất này đã được mô phỏng đúng thực nghiệm. Cần bổ sung nguồn và cơ chế riêng cho từng dòng thiếu profile; cả những dòng đã có profile cũng cần hiệu chuẩn tạo mầm, tăng trưởng, kết bông và phân bố kích thước.

Kiểm tra cả 42 khai báo bảo đảm danh tính profile khớp công thức. Kiểm tra cụ thể PbS đen, Cu₂O đỏ và trường hợp không được nhận nhầm chuỗi `CuO2` thành `CuO`. Các ca này không chứng minh màu GPU hoặc hằng số động học.

Đã thử mở Chrome headless với profile riêng và debug trên localhost để kiểm chứng hình ảnh, nhưng hệ thống xét duyệt tự động tiếp tục từ chối `Start-Process` với lý do `blocked by policy`. Không có ảnh WebGL mới, không có kết luận FPS. Vite kiểm thử đã dừng sau lần thử.
