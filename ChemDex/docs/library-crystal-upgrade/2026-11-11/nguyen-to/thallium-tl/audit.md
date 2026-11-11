# Thallium (Tl) — kiểm duyệt mạng tinh thể và ảnh

- File: `data/elements/081_Tl.json`.
- Sơ suất trước: mô hình hình thái chỉ là hình học gần đúng; chưa có thông số ô mạng, tọa độ nguyên tử, phép đối xứng và trích dẫn mẫu cụ thể.
- Xử lý: giữ nhãn minh họa hình thái; bổ sung mô hình nguyên tử riêng khi có dữ liệu công bố phù hợp.
- Không sửa phương trình trong đợt này; đối chiếu phương trình và từng đoạn DOCX xem audit gốc.

## Đơn chất

- AMCSD 0011197; Thallium; nhóm không gian P 63/m m c.
- Ô mạng: {'a': 3.456, 'b': 3.456, 'c': 5.525, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}; V = 57.149230 Å³.
- Giữ nguyên dạng cấu trúc của mẫu trong nguồn.
- Điều kiện và ghi chú bản gốc: Second edition. Interscience Publishers, New York, New York  Sample at T = 297 K  Hexagonal closest packed, hcp, structure.

## Khoáng vật / quặng

- Quan hệ với nguyên tố: Khoáng vật chứa nguyên tố dưới dạng thay thế, tạp chất hoặc sản phẩm phân rã; không phải quặng riêng của nguyên tố.
- Galena: AMCSD 0010046, công thức mẫu `Pb S`, 8 vị trí/ô, 0 vị trí hỗn hợp.
  - Lưu ý: Không khẳng định mẫu đo là cùng mẫu ảnh; không mô phỏng hình dạng bề mặt quặng từ tọa độ ô mạng.
  - Giới hạn: Không thêm vị trí nguyên tử ngoài bản ghi đã công bố.
  - Bài gốc: ['Noda Y', 'Masumoto K', 'Ohba S', 'Saito Y', 'Toriumi K', 'Iwata Y', 'Shibuya I'], 1987, Temperature dependence of atomic thermal parameters of lead chalcogenides, PbS,  PbSe and PbTe  Sample: T = 298 K.

## Ảnh trạng thái tự nhiên

- Trạng thái: downloaded; [trang nguồn](https://commons.wikimedia.org/wiki/File:Galena_-_Huallanca,_Bologesi,_Ancash,_Peru.jpg).
- Tác giả: Ivar Leidus; giấy phép: CC BY-SA 4.0.
- Mô tả nguồn: Galena with some golden colored pyrite (3.5 × 2.5 × 2.0 cm) from Huanzala mine, Huallanca, Bolognesi, Ancash, Peru
- Không gọi ảnh tổng hợp/ảnh mẫu thí nghiệm là ảnh quặng tự nhiên nếu mô tả nguồn không xác nhận.

## Kiểm tra và giới hạn

- Đối chiếu metric đủ sáu thông số, thể tích, phép đối xứng, độ chiếm chỗ và vị trí tương đương; kết quả toàn bộ xem crystal-validation.json.
- GLB và ảnh preview sinh từ cùng tọa độ với trình xem. Màu/bán kính là quy ước; không giả lập ellipsoid nhiệt, liên kết hay ảnh chụp bề mặt.
- CIF xuất lại từ dữ liệu Larixite có lượng tử hóa tọa độ phân số 1/4.000.000; không khôi phục độ bất định đã mất.
