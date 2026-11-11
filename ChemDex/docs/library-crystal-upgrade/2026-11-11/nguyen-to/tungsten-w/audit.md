# Tungsten (W) — kiểm duyệt mạng tinh thể và ảnh

- File: `data/elements/074_W.json`.
- Sơ suất trước: mô hình hình thái chỉ là hình học gần đúng; chưa có thông số ô mạng, tọa độ nguyên tử, phép đối xứng và trích dẫn mẫu cụ thể.
- Xử lý: giữ nhãn minh họa hình thái; bổ sung mô hình nguyên tử riêng khi có dữ liệu công bố phù hợp.
- Không sửa phương trình trong đợt này; đối chiếu phương trình và từng đoạn DOCX xem audit gốc.

## Đơn chất

- AMCSD 0008068; Tungsten; nhóm không gian I m 3 m.
- Ô mạng: {'a': 3.1648, 'b': 3.1648, 'c': 3.1648, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}; V = 31.698507 Å³.
- Giữ nguyên dạng cấu trúc của mẫu trong nguồn.
- Điều kiện và ghi chú bản gốc: Thermal expansion of periclase (MgO) and tungsten (W)  to melting temperatures  Sample: T = 298 K.

## Khoáng vật / quặng

- Quan hệ với nguyên tố: Khoáng vật hoặc mẫu tự sinh đại diện có liên quan tới nguồn gốc tự nhiên của nguyên tố.
- Scheelite: AMCSD 0013201, công thức mẫu `Ca W O4`, 24 vị trí/ô, 0 vị trí hỗn hợp.
  - Lưu ý: Không khẳng định mẫu đo là cùng mẫu ảnh; không mô phỏng hình dạng bề mặt quặng từ tọa độ ô mạng.
  - Giới hạn: Không thêm vị trí nguyên tử ngoài bản ghi đã công bố.
  - Bài gốc: ['Finger L W', 'Hazen R M', 'Mariathasan J W E'], 1985, High-pressure crystal chemistry of scheelite-type tungstates and molybdates  Note: P = 0.0001 GPa, in air.

## Ảnh trạng thái tự nhiên

- Trạng thái: downloaded; [trang nguồn](https://commons.wikimedia.org/wiki/File:Scheelite-224167.jpg).
- Tác giả: Robert M. Lavinsky; giấy phép: CC BY-SA 3.0.
- Mô tả nguồn: Scheelite Locality: Mt Xuebaoding, Pingwu County , Mianyang Prefecture, Sichuan Province , China ( Locality at mindat.org ) Size: 6.2 x 4.4 x 3.3 cm. This well-balanced small cabinet is from a small find on the "other side of the mountain" from the former main adits to the Ping Wu mines, on Mt Xuebaoding in the Panda Preserve of Sichuan Province. The crystals are distinctly distorted into fat triangular shapes more slim in one dimension, than equant and octahedral as we normally expect in scheelite. These crystals are to 2 cm in size, and are incredibly gemmy in the terminations.
- Không gọi ảnh tổng hợp/ảnh mẫu thí nghiệm là ảnh quặng tự nhiên nếu mô tả nguồn không xác nhận.

## Kiểm tra và giới hạn

- Đối chiếu metric đủ sáu thông số, thể tích, phép đối xứng, độ chiếm chỗ và vị trí tương đương; kết quả toàn bộ xem crystal-validation.json.
- GLB và ảnh preview sinh từ cùng tọa độ với trình xem. Màu/bán kính là quy ước; không giả lập ellipsoid nhiệt, liên kết hay ảnh chụp bề mặt.
- CIF xuất lại từ dữ liệu Larixite có lượng tử hóa tọa độ phân số 1/4.000.000; không khôi phục độ bất định đã mất.
