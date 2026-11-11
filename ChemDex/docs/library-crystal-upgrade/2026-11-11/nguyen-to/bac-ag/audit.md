# Bạc (Ag) — kiểm duyệt mạng tinh thể và ảnh

- File: `data/elements/047_Ag.json`.
- Sơ suất trước: mô hình hình thái chỉ là hình học gần đúng; chưa có thông số ô mạng, tọa độ nguyên tử, phép đối xứng và trích dẫn mẫu cụ thể.
- Xử lý: giữ nhãn minh họa hình thái; bổ sung mô hình nguyên tử riêng khi có dữ liệu công bố phù hợp.
- Không sửa phương trình trong đợt này; đối chiếu phương trình và từng đoạn DOCX xem audit gốc.

## Đơn chất

- AMCSD 0013118; Silver; nhóm không gian F m 3 m.
- Ô mạng: {'a': 4.086, 'b': 4.086, 'c': 4.086, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}; V = 68.217388 Å³.
- Giữ nguyên dạng cấu trúc của mẫu trong nguồn.
- Điều kiện và ghi chú bản gốc: High-temperature thermal expansion of six metallic elements measured  by dilatation method and X-ray diffraction  Sample: at T = 293 K.

## Khoáng vật / quặng

- Quan hệ với nguyên tố: Khoáng vật hoặc mẫu tự sinh đại diện có liên quan tới nguồn gốc tự nhiên của nguyên tố.
- Acanthite: AMCSD 0010584, công thức mẫu `Ag2 S`, 12 vị trí/ô, 0 vị trí hỗn hợp.
  - Lưu ý: Không khẳng định mẫu đo là cùng mẫu ảnh; không mô phỏng hình dạng bề mặt quặng từ tọa độ ô mạng.
  - Giới hạn: Không thêm vị trí nguyên tử ngoài bản ghi đã công bố.
  - Bài gốc: ['Frueh A J'], 1958, The crystallography of silver sulfide, Ag2S.

## Ảnh trạng thái tự nhiên

- Trạng thái: downloaded; [trang nguồn](https://commons.wikimedia.org/wiki/File:Acanthite_-_Imiter_mine,_Jbel_Saghro,_Tinghir,_Dr%C3%A2a-Tafilalet,_Morocco.jpg).
- Tác giả: Ivar Leidus; giấy phép: CC BY-SA 4.0.
- Mô tả nguồn: Crystallized acanthite (4.0 × 2.5 × 1.5 cm) from Imiter mine, Jbel Saghro mountain range, Tinghir Province, Drâa-Tafilalet region, Morocco
- Không gọi ảnh tổng hợp/ảnh mẫu thí nghiệm là ảnh quặng tự nhiên nếu mô tả nguồn không xác nhận.

## Kiểm tra và giới hạn

- Đối chiếu metric đủ sáu thông số, thể tích, phép đối xứng, độ chiếm chỗ và vị trí tương đương; kết quả toàn bộ xem crystal-validation.json.
- GLB và ảnh preview sinh từ cùng tọa độ với trình xem. Màu/bán kính là quy ước; không giả lập ellipsoid nhiệt, liên kết hay ảnh chụp bề mặt.
- CIF xuất lại từ dữ liệu Larixite có lượng tử hóa tọa độ phân số 1/4.000.000; không khôi phục độ bất định đã mất.
