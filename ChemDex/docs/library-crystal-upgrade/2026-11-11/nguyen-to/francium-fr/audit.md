# Francium (Fr) — kiểm duyệt mạng tinh thể và ảnh

- File: `data/elements/087_Fr.json`.
- Sơ suất trước: mô hình hình thái chỉ là hình học gần đúng; chưa có thông số ô mạng, tọa độ nguyên tử, phép đối xứng và trích dẫn mẫu cụ thể.
- Xử lý: giữ nhãn minh họa hình thái; bổ sung mô hình nguyên tử riêng khi có dữ liệu công bố phù hợp.
- Không sửa phương trình trong đợt này; đối chiếu phương trình và từng đoạn DOCX xem audit gốc.

## Đơn chất

- Không có bản ghi tọa độ phù hợp đã duyệt. Không lấy tọa độ khoáng vật thay cho mạng của đơn chất, không gán tinh thể cho chất khí/lỏng hoặc nguyên tố chưa đo được.

## Khoáng vật / quặng

- Quan hệ với nguyên tố: Khoáng vật chứa nguyên tố dưới dạng thay thế, tạp chất hoặc sản phẩm phân rã; không phải quặng riêng của nguyên tố.
- Uraninite: AMCSD 0011728, công thức mẫu `U O2`, 12 vị trí/ô, 0 vị trí hỗn hợp.
  - Lưu ý: Pha UO2 tham chiếu theo tài liệu tổng hợp; quặng uraninite tự nhiên có thể không đúng tỉ lượng, chứa tạp chất và tổn thương phóng xạ.
  - Giới hạn: Không thêm vị trí nguyên tử ngoài bản ghi đã công bố.
  - Bài gốc: ['Wyckoff R W G'], 1963, Second edition. Interscience Publishers, New York, New York  Fluorite structure.

## Ảnh trạng thái tự nhiên

- Trạng thái: downloaded; [trang nguồn](https://commons.wikimedia.org/wiki/File:Pitchblende_schlema-alberoda.JPG).
- Tác giả: Geomartin; giấy phép: CC BY-SA 3.0.
- Mô tả nguồn: Pitchblende from Niederschlema-Alberoda deposit, Saxony, Germany .
- Không gọi ảnh tổng hợp/ảnh mẫu thí nghiệm là ảnh quặng tự nhiên nếu mô tả nguồn không xác nhận.

## Kiểm tra và giới hạn

- Đối chiếu metric đủ sáu thông số, thể tích, phép đối xứng, độ chiếm chỗ và vị trí tương đương; kết quả toàn bộ xem crystal-validation.json.
- GLB và ảnh preview sinh từ cùng tọa độ với trình xem. Màu/bán kính là quy ước; không giả lập ellipsoid nhiệt, liên kết hay ảnh chụp bề mặt.
- CIF xuất lại từ dữ liệu Larixite có lượng tử hóa tọa độ phân số 1/4.000.000; không khôi phục độ bất định đã mất.
