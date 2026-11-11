# Gali (Ga) — kiểm duyệt mạng tinh thể và ảnh

- File: `data/elements/031_Ga.json`.
- Sơ suất trước: mô hình hình thái chỉ là hình học gần đúng; chưa có thông số ô mạng, tọa độ nguyên tử, phép đối xứng và trích dẫn mẫu cụ thể.
- Xử lý: giữ nhãn minh họa hình thái; bổ sung mô hình nguyên tử riêng khi có dữ liệu công bố phù hợp.
- Không sửa phương trình trong đợt này; đối chiếu phương trình và từng đoạn DOCX xem audit gốc.

## Đơn chất

- AMCSD 0010597; Gallium; nhóm không gian C m c a.
- Ô mạng: {'a': 4.523, 'b': 7.661, 'c': 4.524, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}; V = 156.759780 Å³.
- Giữ nguyên dạng cấu trúc của mẫu trong nguồn.
- Điều kiện và ghi chú bản gốc: A refinement of the crystal structure of gallium.

## Khoáng vật / quặng

- Bauxite là hỗn hợp đá/quặng. Ba mô hình gibbsite, boehmite và diaspore là các pha riêng, không phải một ô mạng chung của bauxite.
- Quan hệ với nguyên tố: Khoáng vật chứa nguyên tố dưới dạng thay thế, tạp chất hoặc sản phẩm phân rã; không phải quặng riêng của nguyên tố.
- Gibbsite: AMCSD 0010761, công thức mẫu `Al O3 H3`, 56 vị trí/ô, 0 vị trí hỗn hợp.
  - Lưu ý: Không khẳng định mẫu đo là cùng mẫu ảnh; không mô phỏng hình dạng bề mặt quặng từ tọa độ ô mạng.
  - Giới hạn: Không thêm vị trí nguyên tử ngoài bản ghi đã công bố.
  - Bài gốc: ['Saalfeld H', 'Wedde M'], 1974, Refinement of the crystal structure of gibbsite, Al(OH)3.
- Bohmite: AMCSD 0019146, công thức mẫu `Al O2 H.08`, 20 vị trí/ô, 0 vị trí hỗn hợp.
  - Lưu ý: Độ chiếm chỗ H theo bản ghi là 0,04; đây là mô hình tinh chỉnh được công bố, không bổ sung các vị trí H chưa được xác định.
  - Giới hạn: Không thêm vị trí nguyên tử ngoài bản ghi đã công bố.
  - Bài gốc: ['Hill R J'], 1981, Hydrogen atoms in boehmite: A single crystal X-ray diffraction and  molecular orbital study.
- Diaspore: AMCSD 0007340, công thức mẫu `Al O2 H`, 16 vị trí/ô, 0 vị trí hỗn hợp.
  - Lưu ý: Không khẳng định mẫu đo là cùng mẫu ảnh; không mô phỏng hình dạng bề mặt quặng từ tọa độ ô mạng.
  - Giới hạn: Không thêm vị trí nguyên tử ngoài bản ghi đã công bố.
  - Bài gốc: ['Hill R J'], 1979, Crystal structure refinement and electron density distribution in diaspore  Sample: Neutral atom refinement.

## Ảnh trạng thái tự nhiên

- Trạng thái: downloaded; [trang nguồn](https://commons.wikimedia.org/wiki/File:Bauxite_h%C3%A9rault.JPG).
- Tác giả: saphon; giấy phép: CC BY-SA 1.0.
- Mô tả nguồn: bauxite (hérault)
- Không gọi ảnh tổng hợp/ảnh mẫu thí nghiệm là ảnh quặng tự nhiên nếu mô tả nguồn không xác nhận.

## Kiểm tra và giới hạn

- Đối chiếu metric đủ sáu thông số, thể tích, phép đối xứng, độ chiếm chỗ và vị trí tương đương; kết quả toàn bộ xem crystal-validation.json.
- GLB và ảnh preview sinh từ cùng tọa độ với trình xem. Màu/bán kính là quy ước; không giả lập ellipsoid nhiệt, liên kết hay ảnh chụp bề mặt.
- CIF xuất lại từ dữ liệu Larixite có lượng tử hóa tọa độ phân số 1/4.000.000; không khôi phục độ bất định đã mất.
