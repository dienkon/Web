# Radon (Rn) — kiểm duyệt mạng tinh thể và ảnh

- File: `data/elements/086_Rn.json`.
- Sơ suất trước: mô hình hình thái chỉ là hình học gần đúng; chưa có thông số ô mạng, tọa độ nguyên tử, phép đối xứng và trích dẫn mẫu cụ thể.
- Xử lý: giữ nhãn minh họa hình thái; bổ sung mô hình nguyên tử riêng khi có dữ liệu công bố phù hợp.
- Không sửa phương trình trong đợt này; đối chiếu phương trình và từng đoạn DOCX xem audit gốc.

## Đơn chất

- Không có bản ghi tọa độ phù hợp đã duyệt. Không lấy tọa độ khoáng vật thay cho mạng của đơn chất, không gán tinh thể cho chất khí/lỏng hoặc nguyên tố chưa đo được.

## Khoáng vật / quặng

- Nguồn chủ yếu là khí quyển, nước hoặc nước muối; không có mẫu quặng riêng đại diện.

## Ảnh trạng thái tự nhiên

- Giữ ảnh đơn chất có nguồn hoặc sơ đồ có nhãn; không tạo ảnh giả mẫu tự nhiên cho nguyên tố không có quặng.

## Kiểm tra và giới hạn

- Đối chiếu metric đủ sáu thông số, thể tích, phép đối xứng, độ chiếm chỗ và vị trí tương đương; kết quả toàn bộ xem crystal-validation.json.
- GLB và ảnh preview sinh từ cùng tọa độ với trình xem. Màu/bán kính là quy ước; không giả lập ellipsoid nhiệt, liên kết hay ảnh chụp bề mặt.
- CIF xuất lại từ dữ liệu Larixite có lượng tử hóa tọa độ phân số 1/4.000.000; không khôi phục độ bất định đã mất.
