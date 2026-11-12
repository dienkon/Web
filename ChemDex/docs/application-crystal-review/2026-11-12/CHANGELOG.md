# Changelog chi tiết — 2026-11-12

## Dữ liệu nguyên tố

1. Đọc lại manifest 118 trang và tất cả 676 mục ứng dụng; giữ nội dung nhập và chỉ bổ sung lớp kiểm duyệt ảnh, tham chiếu tinh thể, nguồn và đường dẫn audit.
2. Thêm `applications[].applicationImage` và `imageReview`, có vai trò `application-context`; ghi rõ ảnh minh họa lĩnh vực. Gộp ảnh cùng chủ đề trong từng trang. Ghi lại mục không gán ảnh thay vì âm thầm dùng ảnh chung không phù hợp.
3. Bổ sung `structure.wikiCrystalReview` cho 118 trang: revision, trường pha, Pearson, hằng số, điều kiện và kết quả so sánh.
4. Bổ sung 11 pha đơn chất Mn/Np/Pu/Am/Tc/Pm/Ra/Pa/Po/Cm/Bk, nâng tổng mô hình đơn chất từ 71 lên 82; giữ 51 pha khoáng vật.
5. Tách bảy prototype lý tưởng khỏi bộ tọa độ công bố; không gán định danh AMCSD cho prototype. Cung cấp JSON/CIF/GLB/PNG cho cả 11 pha mới.
6. Đối chiếu hoán vị trục P/I, pha thay thế P/Ce, điều kiện Cs/Rb, số vị trí α-Mn/DHCP và mâu thuẫn Pearson Ra. Chi tiết từng trang ở thư mục `nguyen-to/`.
7. Giữ nguyên phương trình, điều kiện phản ứng và đồng vị đã kiểm duyệt ở đợt trước; chạy lại kiểm tra bảo toàn, nguồn gốc và nội dung để xác nhận phần bổ sung không làm hỏng dữ liệu.

## Ảnh ứng dụng

1. Tạo danh mục 103 chủ đề; tải 101 file từ nguồn có metadata giấy phép, lưu nguyên byte nguồn, SHA-256 và credits. Hai chủ đề chưa có ảnh đại diện được duyệt giữ liên kết tài liệu.
2. Liên kết 458 mục trên đủ 118 trang; 86 mục chia sẻ chủ đề, 117 mục chưa có ảnh đặc thù và 15 mục chỉ có liên kết nguồn đều có lý do trong `application-image-audit.json`.
3. Sửa phân loại tiếng Việt: từ “hàn” phải khớp từ riêng, không ăn nhầm “hàng” hoặc “thành”. Thêm lựa chọn riêng cho ứng dụng H/He/Si/Cu/Au khi tiêu đề chung dễ gây nhầm.
4. Duyệt bảng ảnh tổng hợp; thay ảnh Wiki dẫn đầu không phù hợp: chân dung Haber → sơ đồ quy trình; ảnh chụp cắt lớp → máy MRI; thiết bị bảo hộ lịch sử → gạch chì; ảnh tổng thể phòng thí nghiệm → thiết bị UNILAC. Dùng sơ đồ từ giảo có chú thích đúng vai trò.
5. Hiển thị đầy đủ tên tác giả, giấy phép, liên kết trang file và giấy phép; nền trắng giữ rõ sơ đồ trong suốt có nét đen.

## Hiển thị và tương tác

1. Ép `.structure-visual-grid` thành một cột ở mọi breakpoint: cấu hình electron ở một hàng, mạng tinh thể ở hàng kế tiếp, cùng chiều rộng.
2. Tăng chiều cao vùng xem theo màn hình; tiêu đề xuống dòng linh hoạt, không tràn ngang tại 390 px. Ghi rõ mô hình lớp electron là sơ đồ, không phải quỹ đạo lượng tử hoặc tỷ lệ thật.
3. Fit camera theo đầy đủ góc hộp bao và cả FOV ngang/dọc; trục Z hướng lên. Render lại 133 poster bằng cùng quy tắc với viewer.
4. Chọn nguyên tử để xem nhãn, nguyên tố, độ chiếm chỗ, tọa độ phân số của ô đang lặp và tọa độ Cartesian Å. Không thêm liên kết hóa học suy đoán.
5. Chế độ “Cầu tiếp xúc” cho ô đơn chất có vị trí đầy: bán kính bằng nửa khoảng cách láng giềng gần nhất trong mạng tuần hoàn. Có ghi chú đây là hình học đóng gói, không phải phép đo mật độ electron. Ô hỗn hợp/khuyết vị trí không được áp dụng chế độ này.
6. Hiển thị pha đã chọn, nguồn, điều kiện mẫu, bảng tọa độ bất đối xứng và phần đối chiếu Wiki; có tải CIF/JSON/GLB. Trang chưa có bộ tọa độ phù hợp hiển thị tình trạng dữ liệu rõ ràng.
7. Thay card ảnh lồng gây cắt credits bằng figure có chú thích riêng; ẩn mục giao diện có mô tả rỗng nhưng giữ bản ghi nguồn/audit.

## Công cụ và kiểm tra

1. Thêm parser infobox nhận biết template lồng nhau, wikilink và trường rỗng; bỏ cách tách bằng regex đơn giản làm nuốt trường tiếp theo.
2. Bổ sung các script lấy nguồn Wiki/Commons, chọn chủ đề, dựng prototype bằng Gemmi, overlay dữ liệu, kiểm tra SHA và chụp giao diện. Replay overlay có tính lặp lại trên cả 118 trang.
3. Mở rộng generator/renderer/auditor để hỗ trợ catalog bổ sung và tách báo cáo đợt này khỏi báo cáo lịch sử.
4. Khắc phục lỗi ghi file tạm thời `UNKNOWN` trên Windows bằng ghi file tạm, đổi tên và retry hữu hạn. Một lần render chưa hoàn tất được chạy lại; kết quả cuối 133/133, không lỗi.
5. Thêm kiểm thử phép đối xứng, số vị trí/nhóm không gian, provenance, metric, camera, khoảng cách tuần hoàn, credits ảnh, parser Wiki và bố cục trên nhiều kích thước màn hình.
6. Điều chỉnh kiểm thử điều hướng thư viện để chọn gợi ý thực tế đang hiển thị; không giả định mục đầu tiên luôn là “Nước” sau khi công việc đồng thời thay thuật toán gợi ý. Giữ kiểm tra URL chuẩn, back và history.
7. Thu hẹp selector bảng tọa độ theo `.crystal-evidence` để không đếm nhầm bảng đối chiếu Wiki vừa thêm.
8. Cập nhật MIME GIF trong preview để giữ nguyên sơ đồ động từ nguồn. Phần phục vụ asset thư viện do công việc khác thêm không được đưa vào commit này.

Không bỏ qua hoặc giả dữ liệu khi nguồn bị chặn: các endpoint 403/timeout được thay bằng nguồn công khai truy cập được, hoặc giữ trạng thái chưa đủ dữ liệu. Không thay đổi kết quả nghiên cứu thành khẳng định thực nghiệm để đạt đủ số mô hình.
