# Đồng (Cu) — kiểm duyệt mạng tinh thể và ảnh

- File: `data/elements/029_Cu.json`.
- Sơ suất trước: mô hình hình thái chỉ là hình học gần đúng; chưa có thông số ô mạng, tọa độ nguyên tử, phép đối xứng và trích dẫn mẫu cụ thể.
- Xử lý: giữ nhãn minh họa hình thái; bổ sung mô hình nguyên tử riêng khi có dữ liệu công bố phù hợp.
- Không sửa phương trình trong đợt này; đối chiếu phương trình và từng đoạn DOCX xem audit gốc.

## Đơn chất

- AMCSD 0013087; Copper; nhóm không gian F m 3 m.
- Ô mạng: {'a': 3.613, 'b': 3.613, 'c': 3.613, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}; V = 47.163267 Å³.
- Giữ nguyên dạng cấu trúc của mẫu trong nguồn.
- Điều kiện và ghi chú bản gốc: High-temperature thermal expansion of six metallic elements measured  by dilatation method and X-ray diffraction  Sample: at T = 293 K.

## Khoáng vật / quặng

- Quan hệ với nguyên tố: Khoáng vật hoặc mẫu tự sinh đại diện có liên quan tới nguồn gốc tự nhiên của nguyên tố.
- Chalcopyrite: AMCSD 0009476, công thức mẫu `Cu Fe S2`, 16 vị trí/ô, 0 vị trí hỗn hợp.
  - Lưu ý: Không khẳng định mẫu đo là cùng mẫu ảnh; không mô phỏng hình dạng bề mặt quặng từ tọa độ ô mạng.
  - Giới hạn: Không thêm vị trí nguyên tử ngoài bản ghi đã công bố.
  - Bài gốc: ['Stewart J M', 'Hall S R'], 1973, The crystal structure refinement of chalcopyrite, CuFeS2.

## Ảnh trạng thái tự nhiên

- Trạng thái: downloaded; [trang nguồn](https://commons.wikimedia.org/wiki/File:Chalcopyrite-199453.jpg).
- Tác giả: Robert M. Lavinsky; giấy phép: CC BY-SA 3.0.
- Mô tả nguồn: Chalcopyrite Locality: Ballard Mine, Baxter Springs , Picher Field, Tri-State District, Cherokee County, Kansas , USA ( Locality at mindat.org ) Size: 6.9 x 4.8 x 2.8 cm. An old Treece chalcopyrite specimen out of the Feist Collection, with very sharp, bright brassy crystals to one centimeter. In one place is a beautiful complex cluster of interpenetrating crystals. The crystals are nicely isolated on the matrix. Probably collected prior to the 1960s.
- Không gọi ảnh tổng hợp/ảnh mẫu thí nghiệm là ảnh quặng tự nhiên nếu mô tả nguồn không xác nhận.

## Kiểm tra và giới hạn

- Đối chiếu metric đủ sáu thông số, thể tích, phép đối xứng, độ chiếm chỗ và vị trí tương đương; kết quả toàn bộ xem crystal-validation.json.
- GLB và ảnh preview sinh từ cùng tọa độ với trình xem. Màu/bán kính là quy ước; không giả lập ellipsoid nhiệt, liên kết hay ảnh chụp bề mặt.
- CIF xuất lại từ dữ liệu Larixite có lượng tử hóa tọa độ phân số 1/4.000.000; không khôi phục độ bất định đã mất.
