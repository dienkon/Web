# Asen (As) — kiểm duyệt mạng tinh thể và ảnh

- File: `data/elements/033_As.json`.
- Sơ suất trước: mô hình hình thái chỉ là hình học gần đúng; chưa có thông số ô mạng, tọa độ nguyên tử, phép đối xứng và trích dẫn mẫu cụ thể.
- Xử lý: giữ nhãn minh họa hình thái; bổ sung mô hình nguyên tử riêng khi có dữ liệu công bố phù hợp.
- Không sửa phương trình trong đợt này; đối chiếu phương trình và từng đoạn DOCX xem audit gốc.

## Đơn chất

- AMCSD 0012835; Arsenic; nhóm không gian R -3 m.
- Ô mạng: {'a': 3.7598, 'b': 3.7598, 'c': 10.5475, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}; V = 129.124797 Å³.
- Giữ nguyên dạng cấu trúc của mẫu trong nguồn.
- Điều kiện và ghi chú bản gốc: The crystal structure of arsenic at 4.2, 78 and 299 K  Sample: T = 299 K.

## Khoáng vật / quặng

- Quan hệ với nguyên tố: Khoáng vật hoặc mẫu tự sinh đại diện có liên quan tới nguồn gốc tự nhiên của nguyên tố.
- Arsenopyrite: AMCSD 0000112, công thức mẫu `Fe As S`, 12 vị trí/ô, 0 vị trí hỗn hợp.
  - Lưu ý: Không khẳng định mẫu đo là cùng mẫu ảnh; không mô phỏng hình dạng bề mặt quặng từ tọa độ ô mạng.
  - Giới hạn: Không thêm vị trí nguyên tử ngoài bản ghi đã công bố.
  - Bài gốc: ['Morimoto N', 'Clark L A'], 1961, Arsenopyrite crystal-chemical relations  From Freiberg, Germany.

## Ảnh trạng thái tự nhiên

- Trạng thái: downloaded; [trang nguồn](https://commons.wikimedia.org/wiki/File:Arsenopyrite-117874.jpg).
- Tác giả: Robert M. Lavinsky; giấy phép: CC BY-SA 3.0.
- Mô tả nguồn: Arsenopyrite Locality: Hidalgo del Parral , Municipio de Hidalgo del Parral , Chihuahua , Mexico ( Locality at mindat.org ) Size: 5.8 x 3.4 x 2.4 cm. The profusion of arsenos from China has overshadowed good specimens from other countries, which remain quite desirable. This is an old Chihuahua piece out of the collection of Scott Williams -- as you can see, showing superb sharp crystal form and luster!
- Không gọi ảnh tổng hợp/ảnh mẫu thí nghiệm là ảnh quặng tự nhiên nếu mô tả nguồn không xác nhận.

## Kiểm tra và giới hạn

- Đối chiếu metric đủ sáu thông số, thể tích, phép đối xứng, độ chiếm chỗ và vị trí tương đương; kết quả toàn bộ xem crystal-validation.json.
- GLB và ảnh preview sinh từ cùng tọa độ với trình xem. Màu/bán kính là quy ước; không giả lập ellipsoid nhiệt, liên kết hay ảnh chụp bề mặt.
- CIF xuất lại từ dữ liệu Larixite có lượng tử hóa tọa độ phân số 1/4.000.000; không khôi phục độ bất định đã mất.
