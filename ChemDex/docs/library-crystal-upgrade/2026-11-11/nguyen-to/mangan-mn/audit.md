# Mangan (Mn) — kiểm duyệt mạng tinh thể và ảnh

- File: `data/elements/025_Mn.json`.
- Sơ suất trước: mô hình hình thái chỉ là hình học gần đúng; chưa có thông số ô mạng, tọa độ nguyên tử, phép đối xứng và trích dẫn mẫu cụ thể.
- Xử lý: giữ nhãn minh họa hình thái; bổ sung mô hình nguyên tử riêng khi có dữ liệu công bố phù hợp.
- Không sửa phương trình trong đợt này; đối chiếu phương trình và từng đoạn DOCX xem audit gốc.

## Đơn chất

- Không có bản ghi tọa độ phù hợp đã duyệt. Không lấy tọa độ khoáng vật thay cho mạng của đơn chất, không gán tinh thể cho chất khí/lỏng hoặc nguyên tố chưa đo được.

## Khoáng vật / quặng

- Quan hệ với nguyên tố: Khoáng vật hoặc mẫu tự sinh đại diện có liên quan tới nguồn gốc tự nhiên của nguyên tố.
- Pyrolusite: AMCSD 0011760, công thức mẫu `Mn O2`, 6 vị trí/ô, 0 vị trí hỗn hợp.
  - Lưu ý: Không khẳng định mẫu đo là cùng mẫu ảnh; không mô phỏng hình dạng bề mặt quặng từ tọa độ ô mạng.
  - Giới hạn: Không thêm vị trí nguyên tử ngoài bản ghi đã công bố.
  - Bài gốc: ['Wyckoff R W G'], 1963, Second edition. Interscience Publishers, New York, New York  Note: beta phase of MnO2, rutile structure.

## Ảnh trạng thái tự nhiên

- Trạng thái: downloaded; [trang nguồn](https://commons.wikimedia.org/wiki/File:Pyrolusite_-_USGS_ID_Stose,_GW_1425.jpg).
- Tác giả: Unknown author Unknown author; giấy phép: Public domain.
- Mô tả nguồn: Pyrolusite and wad - B, earthy compact wad traversed by a sigmoid band that is of similar composition but has a rod like comb structure and radiate arrangement (the wad apparently is the process of changing to a compact and rod like psilomelane), from Doe Valley mine. Johnson County, Tennessee 1918. Plate 9-B in U.S. Geological Survey Bulletin 737. 1923.
- Không gọi ảnh tổng hợp/ảnh mẫu thí nghiệm là ảnh quặng tự nhiên nếu mô tả nguồn không xác nhận.

## Kiểm tra và giới hạn

- Đối chiếu metric đủ sáu thông số, thể tích, phép đối xứng, độ chiếm chỗ và vị trí tương đương; kết quả toàn bộ xem crystal-validation.json.
- GLB và ảnh preview sinh từ cùng tọa độ với trình xem. Màu/bán kính là quy ước; không giả lập ellipsoid nhiệt, liên kết hay ảnh chụp bề mặt.
- CIF xuất lại từ dữ liệu Larixite có lượng tử hóa tọa độ phân số 1/4.000.000; không khôi phục độ bất định đã mất.
