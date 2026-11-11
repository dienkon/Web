# Natri (Na) — kiểm duyệt mạng tinh thể và ảnh

- File: `data/elements/011_Na.json`.
- Sơ suất trước: mô hình hình thái chỉ là hình học gần đúng; chưa có thông số ô mạng, tọa độ nguyên tử, phép đối xứng và trích dẫn mẫu cụ thể.
- Xử lý: giữ nhãn minh họa hình thái; bổ sung mô hình nguyên tử riêng khi có dữ liệu công bố phù hợp.
- Không sửa phương trình trong đợt này; đối chiếu phương trình và từng đoạn DOCX xem audit gốc.

## Đơn chất

- AMCSD 0011223; Sodium; nhóm không gian I m 3 m.
- Ô mạng: {'a': 4.2906, 'b': 4.2906, 'c': 4.2906, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}; V = 78.986721 Å³.
- Giữ nguyên dạng cấu trúc của mẫu trong nguồn.
- Điều kiện và ghi chú bản gốc: Second edition. Interscience Publishers, New York, New York  Sample at T = 293 K  Body centered cubic, bcc, structure.

## Khoáng vật / quặng

- Quan hệ với nguyên tố: Khoáng vật hoặc mẫu tự sinh đại diện có liên quan tới nguồn gốc tự nhiên của nguyên tố.
- Halite: AMCSD 0003397, công thức mẫu `Na Cl`, 8 vị trí/ô, 0 vị trí hỗn hợp.
  - Lưu ý: Không khẳng định mẫu đo là cùng mẫu ảnh; không mô phỏng hình dạng bề mặt quặng từ tọa độ ô mạng.
  - Giới hạn: Không thêm vị trí nguyên tử ngoài bản ghi đã công bố.
  - Bài gốc: ['Walker D', 'Clark S M', 'Verma P K', 'Cranswick L M D', 'Jones R L', 'Buhre S'], 2004, Halite-sylvite thermoelasticity  Sample: msl416031, T = 25 C, P = 0.0 kbar, cell volume = 179.42 ang**3.

## Ảnh trạng thái tự nhiên

- Trạng thái: downloaded; [trang nguồn](https://commons.wikimedia.org/wiki/File:Halit_(NaCl)_-_Kopalnia_soli_Wieliczka,_Polska.jpg).
- Tác giả: Lech Darski; giấy phép: CC BY-SA 4.0.
- Mô tả nguồn: Halit (NaCl) - Kopalnia soli Wieliczka, Polska.
- Không gọi ảnh tổng hợp/ảnh mẫu thí nghiệm là ảnh quặng tự nhiên nếu mô tả nguồn không xác nhận.

## Kiểm tra và giới hạn

- Đối chiếu metric đủ sáu thông số, thể tích, phép đối xứng, độ chiếm chỗ và vị trí tương đương; kết quả toàn bộ xem crystal-validation.json.
- GLB và ảnh preview sinh từ cùng tọa độ với trình xem. Màu/bán kính là quy ước; không giả lập ellipsoid nhiệt, liên kết hay ảnh chụp bề mặt.
- CIF xuất lại từ dữ liệu Larixite có lượng tử hóa tọa độ phân số 1/4.000.000; không khôi phục độ bất định đã mất.
