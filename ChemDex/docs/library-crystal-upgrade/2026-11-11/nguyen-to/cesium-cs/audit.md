# Cesium (Cs) — kiểm duyệt mạng tinh thể và ảnh

- File: `data/elements/055_Cs.json`.
- Sơ suất trước: mô hình hình thái chỉ là hình học gần đúng; chưa có thông số ô mạng, tọa độ nguyên tử, phép đối xứng và trích dẫn mẫu cụ thể.
- Xử lý: giữ nhãn minh họa hình thái; bổ sung mô hình nguyên tử riêng khi có dữ liệu công bố phù hợp.
- Không sửa phương trình trong đợt này; đối chiếu phương trình và từng đoạn DOCX xem audit gốc.

## Đơn chất

- AMCSD 0011211; Cesium; nhóm không gian I m 3 m.
- Ô mạng: {'a': 6.067, 'b': 6.067, 'c': 6.067, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}; V = 223.317103 Å³.
- Bản ghi đo ở 78 K; ô mạng này không phải phép đo ở nhiệt độ phòng.
- Điều kiện và ghi chú bản gốc: Second edition. Interscience Publishers, New York, New York  Sample at T = 78 K  Body centered cubic, bcc, structure.

## Khoáng vật / quặng

- Quan hệ với nguyên tố: Khoáng vật hoặc mẫu tự sinh đại diện có liên quan tới nguồn gốc tự nhiên của nguyên tố.
- Pollucite: AMCSD 0000159, công thức mẫu `(Cs.7 Na.3) (Al.99 Si2.01) O6`, 160 vị trí/ô, 64 vị trí hỗn hợp.
  - Lưu ý: Bản ghi không định vị H của nước; không tự thêm các nguyên tử H vào mô hình.
  - Giới hạn: Không thêm vị trí nguyên tử ngoài bản ghi đã công bố.
  - Bài gốc: ['Newnham R E'], 1967, Crystal structure and optical properties of pollucite.

## Ảnh trạng thái tự nhiên

- Trạng thái: downloaded; [trang nguồn](https://commons.wikimedia.org/wiki/File:Pollucite-193819.jpg).
- Tác giả: Robert M. Lavinsky; giấy phép: CC BY-SA 3.0.
- Mô tả nguồn: Pollucite Locality: Paprok, Nuristan Province (Nurestan; Nooristan) , Afghanistan ( Locality at mindat.org ) Size: 2.7 x 2.4 x 1.2 cm. Pollucite is a rare zeolite group mineral. This sharp, euhedral, tabular crystal is colorless, translucent and lustrous and has frosted crystal faces. Sharp, pretty, and well-formed.
- Không gọi ảnh tổng hợp/ảnh mẫu thí nghiệm là ảnh quặng tự nhiên nếu mô tả nguồn không xác nhận.

## Kiểm tra và giới hạn

- Đối chiếu metric đủ sáu thông số, thể tích, phép đối xứng, độ chiếm chỗ và vị trí tương đương; kết quả toàn bộ xem crystal-validation.json.
- GLB và ảnh preview sinh từ cùng tọa độ với trình xem. Màu/bán kính là quy ước; không giả lập ellipsoid nhiệt, liên kết hay ảnh chụp bề mặt.
- CIF xuất lại từ dữ liệu Larixite có lượng tử hóa tọa độ phân số 1/4.000.000; không khôi phục độ bất định đã mất.
