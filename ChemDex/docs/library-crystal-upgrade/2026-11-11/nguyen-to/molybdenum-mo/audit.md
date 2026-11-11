# Molybdenum (Mo) — kiểm duyệt mạng tinh thể và ảnh

- File: `data/elements/042_Mo.json`.
- Sơ suất trước: mô hình hình thái chỉ là hình học gần đúng; chưa có thông số ô mạng, tọa độ nguyên tử, phép đối xứng và trích dẫn mẫu cụ thể.
- Xử lý: giữ nhãn minh họa hình thái; bổ sung mô hình nguyên tử riêng khi có dữ liệu công bố phù hợp.
- Không sửa phương trình trong đợt này; đối chiếu phương trình và từng đoạn DOCX xem audit gốc.

## Đơn chất

- AMCSD 0012937; Molybdenum; nhóm không gian I m 3 m.
- Ô mạng: {'a': 3.141, 'b': 3.141, 'c': 3.141, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}; V = 30.988732 Å³.
- Giữ nguyên dạng cấu trúc của mẫu trong nguồn.
- Điều kiện và ghi chú bản gốc: Precision determination of lattice constants  Sample: at T = 25 C  Note: lattice parameter is average of two samples.

## Khoáng vật / quặng

- Quan hệ với nguyên tố: Khoáng vật hoặc mẫu tự sinh đại diện có liên quan tới nguồn gốc tự nhiên của nguyên tố.
- Molybdenite: AMCSD 0009788, công thức mẫu `Mo S2`, 6 vị trí/ô, 0 vị trí hỗn hợp.
  - Lưu ý: Không khẳng định mẫu đo là cùng mẫu ảnh; không mô phỏng hình dạng bề mặt quặng từ tọa độ ô mạng.
  - Giới hạn: Không thêm vị trí nguyên tử ngoài bản ghi đã công bố.
  - Bài gốc: ['Moss S C', 'Schonfeld B', 'Huang J J'], 1983, Anisotropic mean-square displacements (MSD) in single crystals  of 2H- and 3R-MoS2  Note: 2H polytype, this is the most common in nature.

## Ảnh trạng thái tự nhiên

- Trạng thái: downloaded; [trang nguồn](https://commons.wikimedia.org/wiki/File:Molybdenite_quebec2.jpg).
- Tác giả: Didier Descouens; giấy phép: CC BY 3.0.
- Mô tả nguồn: Molybdenite on quartz Locality : Moly Hill mine, La Motte , Abitibi RCM, Abitibi-Témiscamingue , Québec , Canada Size : 5.5 x 3 x 3 cm)
- Không gọi ảnh tổng hợp/ảnh mẫu thí nghiệm là ảnh quặng tự nhiên nếu mô tả nguồn không xác nhận.

## Kiểm tra và giới hạn

- Đối chiếu metric đủ sáu thông số, thể tích, phép đối xứng, độ chiếm chỗ và vị trí tương đương; kết quả toàn bộ xem crystal-validation.json.
- GLB và ảnh preview sinh từ cùng tọa độ với trình xem. Màu/bán kính là quy ước; không giả lập ellipsoid nhiệt, liên kết hay ảnh chụp bề mặt.
- CIF xuất lại từ dữ liệu Larixite có lượng tử hóa tọa độ phân số 1/4.000.000; không khôi phục độ bất định đã mất.
