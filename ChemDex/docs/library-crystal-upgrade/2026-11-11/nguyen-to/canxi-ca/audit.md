# Canxi (Ca) — kiểm duyệt mạng tinh thể và ảnh

- File: `data/elements/020_Ca.json`.
- Sơ suất trước: mô hình hình thái chỉ là hình học gần đúng; chưa có thông số ô mạng, tọa độ nguyên tử, phép đối xứng và trích dẫn mẫu cụ thể.
- Xử lý: giữ nhãn minh họa hình thái; bổ sung mô hình nguyên tử riêng khi có dữ liệu công bố phù hợp.
- Không sửa phương trình trong đợt này; đối chiếu phương trình và từng đoạn DOCX xem audit gốc.

## Đơn chất

- AMCSD 0013147; Calcium; nhóm không gian F m 3 m.
- Ô mạng: {'a': 5.601, 'b': 5.601, 'c': 5.601, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}; V = 175.710097 Å³.
- Giữ nguyên dạng cấu trúc của mẫu trong nguồn.
- Điều kiện và ghi chú bản gốc: The calcium-strontium metal phase system  Sample: at T = 25 C.

## Khoáng vật / quặng

- Quan hệ với nguyên tố: Khoáng vật hoặc mẫu tự sinh đại diện có liên quan tới nguồn gốc tự nhiên của nguyên tố.
- Calcite: AMCSD 0000984, công thức mẫu `Ca C O3`, 30 vị trí/ô, 0 vị trí hỗn hợp.
  - Lưu ý: Không khẳng định mẫu đo là cùng mẫu ảnh; không mô phỏng hình dạng bề mặt quặng từ tọa độ ô mạng.
  - Giới hạn: Không thêm vị trí nguyên tử ngoài bản ghi đã công bố.
  - Bài gốc: ['Reeder R J', 'Markgraf S A'], 1985, High-temperature structure refinements of calcite and magnesite  Sample: T = 24 C.

## Ảnh trạng thái tự nhiên

- Trạng thái: downloaded; [trang nguồn](https://commons.wikimedia.org/wiki/File:Calcite_Variation.png).
- Tác giả: PaleoNeolitic (montage creator); giấy phép: CC BY 4.0.
- Mô tả nguồn: Montage featuring the high variation of crystal habits of the carbonate mineral calcite (CaCO3). Clockwise from top left: scalenohedral, rhomboedral, stalactitic, and botryoidal calcite crystals. These files are already on Commons with their respective licenses. This montage was made for the article Calcite on Wikipedia. File:Calcite-Maroc-UV.jpg File:NM Epidote Calcite2.jpg File:Vallina Estalactitas banderolas helictitas.JPG File:Calcite (Cave-in-Rock Mining District, Illinois, USA) 3 (42590140555).jpg
- Không gọi ảnh tổng hợp/ảnh mẫu thí nghiệm là ảnh quặng tự nhiên nếu mô tả nguồn không xác nhận.

## Kiểm tra và giới hạn

- Đối chiếu metric đủ sáu thông số, thể tích, phép đối xứng, độ chiếm chỗ và vị trí tương đương; kết quả toàn bộ xem crystal-validation.json.
- GLB và ảnh preview sinh từ cùng tọa độ với trình xem. Màu/bán kính là quy ước; không giả lập ellipsoid nhiệt, liên kết hay ảnh chụp bề mặt.
- CIF xuất lại từ dữ liệu Larixite có lượng tử hóa tọa độ phân số 1/4.000.000; không khôi phục độ bất định đã mất.
