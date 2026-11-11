# Magie (Mg) — kiểm duyệt mạng tinh thể và ảnh

- File: `data/elements/012_Mg.json`.
- Sơ suất trước: mô hình hình thái chỉ là hình học gần đúng; chưa có thông số ô mạng, tọa độ nguyên tử, phép đối xứng và trích dẫn mẫu cụ thể.
- Xử lý: giữ nhãn minh họa hình thái; bổ sung mô hình nguyên tử riêng khi có dữ liệu công bố phù hợp.
- Không sửa phương trình trong đợt này; đối chiếu phương trình và từng đoạn DOCX xem audit gốc.

## Đơn chất

- AMCSD 0012871; Magnesium; nhóm không gian P 63/m m c.
- Ô mạng: {'a': 3.2093, 'b': 3.2093, 'c': 5.2103, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}; V = 46.474422 Å³.
- Giữ nguyên dạng cấu trúc của mẫu trong nguồn.
- Điều kiện và ghi chú bản gốc: The precision determination of lattice constants by the powder and rotation  crystal methods and applications  Sample: at T = 25 C.

## Khoáng vật / quặng

- Quan hệ với nguyên tố: Khoáng vật hoặc mẫu tự sinh đại diện có liên quan tới nguồn gốc tự nhiên của nguyên tố.
- Magnesite: AMCSD 0000990, công thức mẫu `Mg C O3`, 30 vị trí/ô, 0 vị trí hỗn hợp.
  - Lưu ý: Không khẳng định mẫu đo là cùng mẫu ảnh; không mô phỏng hình dạng bề mặt quặng từ tọa độ ô mạng.
  - Giới hạn: Không thêm vị trí nguyên tử ngoài bản ghi đã công bố.
  - Bài gốc: ['Reeder R J', 'Markgraf S A'], 1985, High-temperature structure refinements of calcite and magnesite  Sample: T = 24 C.

## Ảnh trạng thái tự nhiên

- Trạng thái: downloaded; [trang nguồn](https://commons.wikimedia.org/wiki/File:Magnesite-121892.jpg).
- Tác giả: Robert M. Lavinsky; giấy phép: CC BY-SA 3.0.
- Mô tả nguồn: Magnesite Locality: Serra das Éguas, Brumado (Bom Jesus dos Meiras) , Bahia , Northeast Region, Brazil ( Locality at mindat.org ) Size: 11.4 x 9.2 x 3.6 cm. Magnesite is usually seen in small crystals as an "accessory" mineral - when from this locality, particularly, with uvites. But this specimen is a superb specimen in and of itself, with large, lustrous, transparent rhombs of magnesite to over 2 cm, sticking up amongst smaller crystals. The magnesites are razor-sharp. There actually ARE a few little uvites to be seen here, too!
- Không gọi ảnh tổng hợp/ảnh mẫu thí nghiệm là ảnh quặng tự nhiên nếu mô tả nguồn không xác nhận.

## Kiểm tra và giới hạn

- Đối chiếu metric đủ sáu thông số, thể tích, phép đối xứng, độ chiếm chỗ và vị trí tương đương; kết quả toàn bộ xem crystal-validation.json.
- GLB và ảnh preview sinh từ cùng tọa độ với trình xem. Màu/bán kính là quy ước; không giả lập ellipsoid nhiệt, liên kết hay ảnh chụp bề mặt.
- CIF xuất lại từ dữ liệu Larixite có lượng tử hóa tọa độ phân số 1/4.000.000; không khôi phục độ bất định đã mất.
