# Niobium (Nb) — kiểm duyệt mạng tinh thể và ảnh

- File: `data/elements/041_Nb.json`.
- Sơ suất trước: mô hình hình thái chỉ là hình học gần đúng; chưa có thông số ô mạng, tọa độ nguyên tử, phép đối xứng và trích dẫn mẫu cụ thể.
- Xử lý: giữ nhãn minh họa hình thái; bổ sung mô hình nguyên tử riêng khi có dữ liệu công bố phù hợp.
- Không sửa phương trình trong đợt này; đối chiếu phương trình và từng đoạn DOCX xem audit gốc.

## Đơn chất

- AMCSD 0011224; Niobium; nhóm không gian I m 3 m.
- Ô mạng: {'a': 3.3004, 'b': 3.3004, 'c': 3.3004, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}; V = 35.950070 Å³.
- Giữ nguyên dạng cấu trúc của mẫu trong nguồn.
- Điều kiện và ghi chú bản gốc: Second edition. Interscience Publishers, New York, New York  Body centered cubic, bcc, structure.

## Khoáng vật / quặng

- Quan hệ với nguyên tố: Khoáng vật hoặc mẫu tự sinh đại diện có liên quan tới nguồn gốc tự nhiên của nguyên tố.
- Columbite-(Fe): AMCSD 0001436, công thức mẫu `(Nb.5 Ta.167 Fe.333) O2`, 36 vị trí/ô, 12 vị trí hỗn hợp.
  - Lưu ý: Không khẳng định mẫu đo là cùng mẫu ảnh; không mô phỏng hình dạng bề mặt quặng từ tọa độ ô mạng.
  - Giới hạn: Không thêm vị trí nguyên tử ngoài bản ghi đã công bố.
  - Bài gốc: ['Armbruster T', 'Wenger M', 'Geiger C A'], 1991, Cation distribution in partially ordered columbite from the Kings Mountain  pegmatite, North Carolina  SAMPLE ncp1, T = 293 K.

## Ảnh trạng thái tự nhiên

- Trạng thái: downloaded; [trang nguồn](https://commons.wikimedia.org/wiki/File:Columbite-75444.jpg).
- Tác giả: Robert M. Lavinsky; giấy phép: CC BY-SA 3.0.
- Mô tả nguồn: Columbite Locality: Middletown , Middlesex County, Connecticut , USA ( Locality at mindat.org ) A 3.5 cm crystal of columbite aesthetically perched on a miniature-size pegmatite matrix of muscovite &amp; albite. John Caswell (catalog #1511) acquired this historic specimen from the Newberry collection in 1878; more recently, this specimen was acquired by me in 2001 from Steve Chamberlain, who received it from Ron Bentley in 1980. 5.7 x 4.7 x 3.8 cm
- Không gọi ảnh tổng hợp/ảnh mẫu thí nghiệm là ảnh quặng tự nhiên nếu mô tả nguồn không xác nhận.

## Kiểm tra và giới hạn

- Đối chiếu metric đủ sáu thông số, thể tích, phép đối xứng, độ chiếm chỗ và vị trí tương đương; kết quả toàn bộ xem crystal-validation.json.
- GLB và ảnh preview sinh từ cùng tọa độ với trình xem. Màu/bán kính là quy ước; không giả lập ellipsoid nhiệt, liên kết hay ảnh chụp bề mặt.
- CIF xuất lại từ dữ liệu Larixite có lượng tử hóa tọa độ phân số 1/4.000.000; không khôi phục độ bất định đã mất.
