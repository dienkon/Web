# Selen (Se) — kiểm duyệt mạng tinh thể và ảnh

- File: `data/elements/034_Se.json`.
- Sơ suất trước: mô hình hình thái chỉ là hình học gần đúng; chưa có thông số ô mạng, tọa độ nguyên tử, phép đối xứng và trích dẫn mẫu cụ thể.
- Xử lý: giữ nhãn minh họa hình thái; bổ sung mô hình nguyên tử riêng khi có dữ liệu công bố phù hợp.
- Không sửa phương trình trong đợt này; đối chiếu phương trình và từng đoạn DOCX xem audit gốc.

## Đơn chất

- AMCSD 0012674; Selenium; nhóm không gian P 31 2 1.
- Ô mạng: {'a': 4.3662, 'b': 4.3662, 'c': 4.9536, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}; V = 81.782205 Å³.
- Giữ nguyên dạng cấu trúc của mẫu trong nguồn.
- Điều kiện và ghi chú bản gốc: The crystal structure of trigonal selenium.

## Khoáng vật / quặng

- Quan hệ với nguyên tố: Khoáng vật hoặc mẫu tự sinh đại diện có liên quan tới nguồn gốc tự nhiên của nguyên tố.
- Clausthalite: AMCSD 0010048, công thức mẫu `Pb Se`, 8 vị trí/ô, 0 vị trí hỗn hợp.
  - Lưu ý: Không khẳng định mẫu đo là cùng mẫu ảnh; không mô phỏng hình dạng bề mặt quặng từ tọa độ ô mạng.
  - Giới hạn: Không thêm vị trí nguyên tử ngoài bản ghi đã công bố.
  - Bài gốc: ['Noda Y', 'Masumoto K', 'Ohba S', 'Saito Y', 'Toriumi K', 'Iwata Y', 'Shibuya I'], 1987, Temperature dependence of atomic thermal parameters of lead chalcogenides, PbS,  PbSe and PbTe  Sample: T = 298 K.

## Ảnh trạng thái tự nhiên

- Trạng thái: downloaded; [trang nguồn](https://commons.wikimedia.org/wiki/File:Clausthalite-207330.jpg).
- Tác giả: Robert M. Lavinsky; giấy phép: CC BY-SA 3.0.
- Mô tả nguồn: Clausthalite Locality: Greywacke quarry, Rieder , Gernrode , Harz Mts, Saxony-Anhalt , Germany ( Locality at mindat.org ) Size: 6.5 x 4.8 x 3.5 cm. Clausthalite is a rare lead selenide and this rich specimen hails from near the Type Locality in the Harz Mountains of Germany. Scintillating, metallic clausthalite microcrystals richly cover the front, top and back of this sculptural, mounded carbonate matrix. The carbonate veins at the Greywacke Quarry at Rieder host a variety of rare selenium minerals.
- Không gọi ảnh tổng hợp/ảnh mẫu thí nghiệm là ảnh quặng tự nhiên nếu mô tả nguồn không xác nhận.

## Kiểm tra và giới hạn

- Đối chiếu metric đủ sáu thông số, thể tích, phép đối xứng, độ chiếm chỗ và vị trí tương đương; kết quả toàn bộ xem crystal-validation.json.
- GLB và ảnh preview sinh từ cùng tọa độ với trình xem. Màu/bán kính là quy ước; không giả lập ellipsoid nhiệt, liên kết hay ảnh chụp bề mặt.
- CIF xuất lại từ dữ liệu Larixite có lượng tử hóa tọa độ phân số 1/4.000.000; không khôi phục độ bất định đã mất.
