# Flo (F) — kiểm duyệt mạng tinh thể và ảnh

- File: `data/elements/009_F.json`.
- Sơ suất trước: mô hình hình thái chỉ là hình học gần đúng; chưa có thông số ô mạng, tọa độ nguyên tử, phép đối xứng và trích dẫn mẫu cụ thể.
- Xử lý: giữ nhãn minh họa hình thái; bổ sung mô hình nguyên tử riêng khi có dữ liệu công bố phù hợp.
- Không sửa phương trình trong đợt này; đối chiếu phương trình và từng đoạn DOCX xem audit gốc.

## Đơn chất

- Không có bản ghi tọa độ phù hợp đã duyệt. Không lấy tọa độ khoáng vật thay cho mạng của đơn chất, không gán tinh thể cho chất khí/lỏng hoặc nguyên tố chưa đo được.

## Khoáng vật / quặng

- Quan hệ với nguyên tố: Khoáng vật hoặc mẫu tự sinh đại diện có liên quan tới nguồn gốc tự nhiên của nguyên tố.
- Fluorite: AMCSD 0008645, công thức mẫu `Ca F2`, 12 vị trí/ô, 0 vị trí hỗn hợp.
  - Lưu ý: Không khẳng định mẫu đo là cùng mẫu ảnh; không mô phỏng hình dạng bề mặt quặng từ tọa độ ô mạng.
  - Giới hạn: Không thêm vị trí nguyên tử ngoài bản ghi đã công bố.
  - Bài gốc: ['Speziale S', 'Duffy T S'], 2002, Single-crystal elastic constants of fluorite (CaF2) to 9.3 GPa  Sample: P = 0 GPa.

## Ảnh trạng thái tự nhiên

- Trạng thái: downloaded; [trang nguồn](https://commons.wikimedia.org/wiki/File:3192M-fluorite1.jpg).
- Tác giả: CarlesMillan; giấy phép: CC BY-SA 3.0.
- Mô tả nguồn: Deep green isolated fluorite crystal showing cubic {100} and octahedral {111} faces, complete and undamaged, set upon a micaceous matrix. Overall size: 50 mm x 27 mm. Crystal size: 19 mm wide. Weight: 30 g. From Erongo Mountain, Erongo Region, Namibia.
- Không gọi ảnh tổng hợp/ảnh mẫu thí nghiệm là ảnh quặng tự nhiên nếu mô tả nguồn không xác nhận.

## Kiểm tra và giới hạn

- Đối chiếu metric đủ sáu thông số, thể tích, phép đối xứng, độ chiếm chỗ và vị trí tương đương; kết quả toàn bộ xem crystal-validation.json.
- GLB và ảnh preview sinh từ cùng tọa độ với trình xem. Màu/bán kính là quy ước; không giả lập ellipsoid nhiệt, liên kết hay ảnh chụp bề mặt.
- CIF xuất lại từ dữ liệu Larixite có lượng tử hóa tọa độ phân số 1/4.000.000; không khôi phục độ bất định đã mất.
