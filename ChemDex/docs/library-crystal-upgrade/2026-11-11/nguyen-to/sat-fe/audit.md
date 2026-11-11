# Sắt (Fe) — kiểm duyệt mạng tinh thể và ảnh

- File: `data/elements/026_Fe.json`.
- Sơ suất trước: mô hình hình thái chỉ là hình học gần đúng; chưa có thông số ô mạng, tọa độ nguyên tử, phép đối xứng và trích dẫn mẫu cụ thể.
- Xử lý: giữ nhãn minh họa hình thái; bổ sung mô hình nguyên tử riêng khi có dữ liệu công bố phù hợp.
- Không sửa phương trình trong đợt này; đối chiếu phương trình và từng đoạn DOCX xem audit gốc.

## Đơn chất

- AMCSD 0008169; Iron; nhóm không gian I m 3 m.
- Ô mạng: {'a': 2.8654, 'b': 2.8654, 'c': 2.8654, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}; V = 23.526416 Å³.
- Giữ nguyên dạng cấu trúc của mẫu trong nguồn.
- Điều kiện và ghi chú bản gốc: Thermal equation of iron and Fe0.91Si0.09  Sample: P = 0.0 GPa, T = 298 K, prior to experiment.

## Khoáng vật / quặng

- Quan hệ với nguyên tố: Khoáng vật hoặc mẫu tự sinh đại diện có liên quan tới nguồn gốc tự nhiên của nguyên tố.
- Hematite: AMCSD 0000143, công thức mẫu `Fe2 O3`, 30 vị trí/ô, 0 vị trí hỗn hợp.
  - Lưu ý: Không khẳng định mẫu đo là cùng mẫu ảnh; không mô phỏng hình dạng bề mặt quặng từ tọa độ ô mạng.
  - Giới hạn: Không thêm vị trí nguyên tử ngoài bản ghi đã công bố.
  - Bài gốc: ['Zoltai T', 'Finger L W', 'Blake R L', 'Hessevick R E'], 1966, Refinement of the hematite structure.

## Ảnh trạng thái tự nhiên

- Trạng thái: downloaded; [trang nguồn](https://commons.wikimedia.org/wiki/File:WLA_hmns_Hematite.jpg).
- Tác giả: Wikipedia Loves Art participant " Assignment_Houston_One "; giấy phép: CC BY-SA 2.5.
- Mô tả nguồn: Hematite Trigonal iron oxide Ibitiara, Mina Gerais Brazil HMNS 5440 Wikipedia Loves Art at the Houston Museum of Natural Science This photo of item # 5440 at the Houston Museum of Natural Science was contributed under the team name " Assignment_Houston_One " as part of the Wikipedia Loves Art project in February 2009. Houston Museum of Natural Science The original photograph on Flickr was taken by sulla55 — please add a comment to the original Flickr page whenever a use has been made on Wikipedia or another project. Project galleries on Flickr: this institution , this team
- Không gọi ảnh tổng hợp/ảnh mẫu thí nghiệm là ảnh quặng tự nhiên nếu mô tả nguồn không xác nhận.

## Kiểm tra và giới hạn

- Đối chiếu metric đủ sáu thông số, thể tích, phép đối xứng, độ chiếm chỗ và vị trí tương đương; kết quả toàn bộ xem crystal-validation.json.
- GLB và ảnh preview sinh từ cùng tọa độ với trình xem. Màu/bán kính là quy ước; không giả lập ellipsoid nhiệt, liên kết hay ảnh chụp bề mặt.
- CIF xuất lại từ dữ liệu Larixite có lượng tử hóa tọa độ phân số 1/4.000.000; không khôi phục độ bất định đã mất.
