# Tellurium (Te) — kiểm duyệt mạng tinh thể và ảnh

- File: `data/elements/052_Te.json`.
- Sơ suất trước: mô hình hình thái chỉ là hình học gần đúng; chưa có thông số ô mạng, tọa độ nguyên tử, phép đối xứng và trích dẫn mẫu cụ thể.
- Xử lý: giữ nhãn minh họa hình thái; bổ sung mô hình nguyên tử riêng khi có dữ liệu công bố phù hợp.
- Không sửa phương trình trong đợt này; đối chiếu phương trình và từng đoạn DOCX xem audit gốc.

## Đơn chất

- AMCSD 0011258; Tellurium; nhóm không gian P 32 2 1.
- Ô mạng: {'a': 4.44693, 'b': 4.44693, 'c': 5.91492, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}; V = 101.297819 Å³.
- Giữ nguyên dạng cấu trúc của mẫu trong nguồn.
- Điều kiện và ghi chú bản gốc: Second edition. Interscience Publishers, New York, New York.

## Khoáng vật / quặng

- Quan hệ với nguyên tố: Khoáng vật hoặc mẫu tự sinh đại diện có liên quan tới nguồn gốc tự nhiên của nguyên tố.
- Calaverite: AMCSD 0009826, công thức mẫu `(Au.9 Ag.1) Te2`, 6 vị trí/ô, 2 vị trí hỗn hợp.
  - Lưu ý: Chỉ biểu diễn cấu trúc trung bình tuần hoàn trong bản ghi CIF; không tái dựng đầy đủ điều biến bất tương xứng của calaverite.
  - Giới hạn: Không thêm vị trí nguyên tử ngoài bản ghi đã công bố.
  - Bài gốc: ['de Boer J L', 'Schutte W J'], 1988, Valence fluctuations in the incommensurately modulated structure of calaverite AuTe2  Sample: T = 298 K.

## Ảnh trạng thái tự nhiên

- Trạng thái: downloaded; [trang nguồn](https://commons.wikimedia.org/wiki/File:Calaverite-214667.jpg).
- Tác giả: Robert M. Lavinsky; giấy phép: CC BY-SA 3.0.
- Mô tả nguồn: Calaverite Locality: Cripple Creek , Cripple Creek District, Teller County , Colorado , USA ( Locality at mindat.org ) Size: 6 x 5 x 3.5 cm. Calaverite is a very rare crystallized gold telluride species, found in good crystals over 1mm in only a relatively few locations. The most classic old US locality for the species is from the silver and gold mines in Cripple Creek, Colorado (late 1800s and early 1900s). Most available specimens come from old collections and museum deaccessions. This is a very rich specimen for sheer quantity of platy calaverite crystals embedded in the matrix, showing brilliant metallic flashes from all sides of the specimen. Many of the embedded crystals reach 1 cm, some clusters more so. This came from Harvard via exchange to Phil Scalisi to George Elling, though no label accompanies the piece.
- Không gọi ảnh tổng hợp/ảnh mẫu thí nghiệm là ảnh quặng tự nhiên nếu mô tả nguồn không xác nhận.

## Kiểm tra và giới hạn

- Đối chiếu metric đủ sáu thông số, thể tích, phép đối xứng, độ chiếm chỗ và vị trí tương đương; kết quả toàn bộ xem crystal-validation.json.
- GLB và ảnh preview sinh từ cùng tọa độ với trình xem. Màu/bán kính là quy ước; không giả lập ellipsoid nhiệt, liên kết hay ảnh chụp bề mặt.
- CIF xuất lại từ dữ liệu Larixite có lượng tử hóa tọa độ phân số 1/4.000.000; không khôi phục độ bất định đã mất.
