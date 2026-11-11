# Iridium (Ir) — kiểm duyệt mạng tinh thể và ảnh

- File: `data/elements/077_Ir.json`.
- Sơ suất trước: mô hình hình thái chỉ là hình học gần đúng; chưa có thông số ô mạng, tọa độ nguyên tử, phép đối xứng và trích dẫn mẫu cụ thể.
- Xử lý: giữ nhãn minh họa hình thái; bổ sung mô hình nguyên tử riêng khi có dữ liệu công bố phù hợp.
- Không sửa phương trình trong đợt này; đối chiếu phương trình và từng đoạn DOCX xem audit gốc.

## Đơn chất

- AMCSD 0014950; Iridium; nhóm không gian F m 3 m.
- Ô mạng: {'a': 3.8312, 'b': 3.8312, 'c': 3.8312, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}; V = 56.234712 Å³.
- Giữ nguyên dạng cấu trúc của mẫu trong nguồn.
- Điều kiện và ghi chú bản gốc: Precision measurements of crystal parameters  Sample: at T = 18C  Note: lattice parameter is mean value of 3 radiation types.

## Khoáng vật / quặng

- Quan hệ với nguyên tố: Khoáng vật chứa nguyên tố dưới dạng thay thế, tạp chất hoặc sản phẩm phân rã; không phải quặng riêng của nguyên tố.
- Platinum: AMCSD 0014947, công thức mẫu `Pt`, 4 vị trí/ô, 0 vị trí hỗn hợp.
  - Lưu ý: Pha Pt tham chiếu; không mô phỏng hợp kim hoặc vị trí nguyên tố vết trong platinum tự sinh.
  - Giới hạn: Không thêm vị trí nguyên tử ngoài bản ghi đã công bố.
  - Bài gốc: ['Owen E A', 'Yates E L'], 1933, Precision measurements of crystal parameters  Sample: at T = 18 C  Note: lattice parameter is mean value of 5 radiation types.

## Ảnh trạng thái tự nhiên

- Trạng thái: downloaded; [trang nguồn](https://commons.wikimedia.org/wiki/File:Platinum-274992.jpg).
- Tác giả: Robert M. Lavinsky; giấy phép: CC BY-SA 3.0.
- Mô tả nguồn: Platinum Locality: Fox Gulch, Salmon River - Red Mountain District, Goodnews Bay , Bethel Borough, Alaska , USA ( Locality at mindat.org ) Size: 1.4 x 0.8 x 0.8 cm. A very rare and excellent native platinum nugget from an uncommon Alaskan locality - Fox Gulch, Goodnews Bay. The lustrous, very lightly rounded, 3-dimensional, sculptural nugget is composed of a multitude of tiny, hoppered, crudely cubic platinum crystals. This piece looks like a tiny, 3-sided, platinum Christmas tree with ornaments and a bent trunk. Rarely availableon the market. Weighs 15.76 carats or just over 3 grams.
- Không gọi ảnh tổng hợp/ảnh mẫu thí nghiệm là ảnh quặng tự nhiên nếu mô tả nguồn không xác nhận.

## Kiểm tra và giới hạn

- Đối chiếu metric đủ sáu thông số, thể tích, phép đối xứng, độ chiếm chỗ và vị trí tương đương; kết quả toàn bộ xem crystal-validation.json.
- GLB và ảnh preview sinh từ cùng tọa độ với trình xem. Màu/bán kính là quy ước; không giả lập ellipsoid nhiệt, liên kết hay ảnh chụp bề mặt.
- CIF xuất lại từ dữ liệu Larixite có lượng tử hóa tọa độ phân số 1/4.000.000; không khôi phục độ bất định đã mất.
