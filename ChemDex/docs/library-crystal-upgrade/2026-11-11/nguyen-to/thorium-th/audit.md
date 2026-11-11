# Thorium (Th) — kiểm duyệt mạng tinh thể và ảnh

- File: `data/elements/090_Th.json`.
- Sơ suất trước: mô hình hình thái chỉ là hình học gần đúng; chưa có thông số ô mạng, tọa độ nguyên tử, phép đối xứng và trích dẫn mẫu cụ thể.
- Xử lý: giữ nhãn minh họa hình thái; bổ sung mô hình nguyên tử riêng khi có dữ liệu công bố phù hợp.
- Không sửa phương trình trong đợt này; đối chiếu phương trình và từng đoạn DOCX xem audit gốc.

## Đơn chất

- AMCSD 0011162; Thorium; nhóm không gian F m 3 m.
- Ô mạng: {'a': 5.0843, 'b': 5.0843, 'c': 5.0843, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}; V = 131.429696 Å³.
- Giữ nguyên dạng cấu trúc của mẫu trong nguồn.
- Điều kiện và ghi chú bản gốc: Second edition. Interscience Publishers, New York, New York  Cubic closest packed, ccp, structure.

## Khoáng vật / quặng

- Quan hệ với nguyên tố: Khoáng vật hoặc mẫu tự sinh đại diện có liên quan tới nguồn gốc tự nhiên của nguyên tố.
- Thorite: AMCSD 0009633, công thức mẫu `Th Si O4`, 24 vị trí/ô, 0 vị trí hỗn hợp.
  - Lưu ý: Không khẳng định mẫu đo là cùng mẫu ảnh; không mô phỏng hình dạng bề mặt quặng từ tọa độ ô mạng.
  - Giới hạn: Không thêm vị trí nguyên tử ngoài bản ghi đã công bố.
  - Bài gốc: ['Ewing R C', 'Taylor M'], 1978, The crystal structure of the ThSiO4 polymorphs: huttonite and thorite.

## Ảnh trạng thái tự nhiên

- Trạng thái: downloaded; [trang nguồn](https://commons.wikimedia.org/wiki/File:Thorite-288916.jpg).
- Tác giả: Robert M. Lavinsky; giấy phép: CC BY-SA 3.0.
- Mô tả nguồn: Thorite Locality: Kemp prospect (Kemp property; Kemp uranium mine), Cardiff Township, Haliburton County , Ontario , Canada ( Locality at mindat.org ) Size: 2.2 x 2.2 x 1.6 cm. A sharp, euhedral, pristine, rust-brown thorite crystal from the less well-known Kemp Uranium Mine in Cheddar, Ontario, Canada. This floater is remarkable for the size. It dates to the 1950s. Good thorite specimens are nearly impossible to obtain today, and specimens from Cheddar rank among the best ever found. Ex. George Elling Collection.
- Không gọi ảnh tổng hợp/ảnh mẫu thí nghiệm là ảnh quặng tự nhiên nếu mô tả nguồn không xác nhận.

## Kiểm tra và giới hạn

- Đối chiếu metric đủ sáu thông số, thể tích, phép đối xứng, độ chiếm chỗ và vị trí tương đương; kết quả toàn bộ xem crystal-validation.json.
- GLB và ảnh preview sinh từ cùng tọa độ với trình xem. Màu/bán kính là quy ước; không giả lập ellipsoid nhiệt, liên kết hay ảnh chụp bề mặt.
- CIF xuất lại từ dữ liệu Larixite có lượng tử hóa tọa độ phân số 1/4.000.000; không khôi phục độ bất định đã mất.
