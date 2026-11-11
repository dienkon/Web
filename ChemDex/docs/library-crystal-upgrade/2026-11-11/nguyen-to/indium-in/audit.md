# Indium (In) — kiểm duyệt mạng tinh thể và ảnh

- File: `data/elements/049_In.json`.
- Sơ suất trước: mô hình hình thái chỉ là hình học gần đúng; chưa có thông số ô mạng, tọa độ nguyên tử, phép đối xứng và trích dẫn mẫu cụ thể.
- Xử lý: giữ nhãn minh họa hình thái; bổ sung mô hình nguyên tử riêng khi có dữ liệu công bố phù hợp.
- Không sửa phương trình trong đợt này; đối chiếu phương trình và từng đoạn DOCX xem audit gốc.

## Đơn chất

- AMCSD 0014125; Indium; nhóm không gian I 4/m m m.
- Ô mạng: {'a': 3.253, 'b': 3.253, 'c': 4.9455, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}; V = 52.333326 Å³.
- Giữ nguyên dạng cấu trúc của mẫu trong nguồn.
- Điều kiện và ghi chú bản gốc: Anisotropic thermal expansion of indium  Sample: 99.9999% indium  Note: converted from kx units.

## Khoáng vật / quặng

- Quan hệ với nguyên tố: Khoáng vật chứa nguyên tố dưới dạng thay thế, tạp chất hoặc sản phẩm phân rã; không phải quặng riêng của nguyên tố.
- Sphalerite: AMCSD 0000110, công thức mẫu `Zn S`, 8 vị trí/ô, 0 vị trí hỗn hợp.
  - Lưu ý: Không khẳng định mẫu đo là cùng mẫu ảnh; không mô phỏng hình dạng bề mặt quặng từ tọa độ ô mạng.
  - Giới hạn: Không thêm vị trí nguyên tử ngoài bản ghi đã công bố.
  - Bài gốc: ['Skinner B J'], 1961, Unit-cell edges of natural and synthetic sphalerites.

## Ảnh trạng thái tự nhiên

- Trạng thái: downloaded; [trang nguồn](https://commons.wikimedia.org/wiki/File:Sphalerite_-_Creede,_Mineral_County,_Colorado,_USA.jpg).
- Tác giả: Ivar Leidus; giấy phép: CC BY-SA 4.0.
- Mô tả nguồn: Black tetrahedral crystals of sphalerite up to 8 mm in size across this matrix (4.5 × 3.0 × 2.0 cm) with chalcopyrite and calcite. Found from Creede, Mineral County, Colorado, USA.
- Không gọi ảnh tổng hợp/ảnh mẫu thí nghiệm là ảnh quặng tự nhiên nếu mô tả nguồn không xác nhận.

## Kiểm tra và giới hạn

- Đối chiếu metric đủ sáu thông số, thể tích, phép đối xứng, độ chiếm chỗ và vị trí tương đương; kết quả toàn bộ xem crystal-validation.json.
- GLB và ảnh preview sinh từ cùng tọa độ với trình xem. Màu/bán kính là quy ước; không giả lập ellipsoid nhiệt, liên kết hay ảnh chụp bề mặt.
- CIF xuất lại từ dữ liệu Larixite có lượng tử hóa tọa độ phân số 1/4.000.000; không khôi phục độ bất định đã mất.
