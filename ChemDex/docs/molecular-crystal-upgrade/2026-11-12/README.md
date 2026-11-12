# Tinh thể phân tử, CIF gốc và cảnh trưng bày

Đợt tiếp theo sau `444dde62`, làm trực tiếp trên `main`. Chưa push hoặc deploy.

Thêm **22 pha có nguồn COD** với CIF gốc, JSON tọa độ, GLB và ảnh render: AgNO₃, KMnO₄, NaOH, β-Ni(OH)₂, Pb(NO₃)₂, α-Cu(NO₃)₂ khan, AlCl₃/AlBr₃/AlI₃, Na₂S₂O₃ khan, H₂O₂ rắn, benzen, ethanol, methanol, acetone, acid acetic, aspirin, caffeine, α-D-glucose, β-D-fructose, sodium acetate và sucrose. Tổng số mô hình pha hiện là **306**; **276/482 hồ sơ chất không phải hỗn hợp** gắn được pha tinh thể có nguồn. Các hồ sơ còn lại vẫn có mô hình phân tử/nguyên tử/thành phần, với mức chứng cứ tương ứng.

## Dữ liệu và danh tính hóa học

- [Manifest lựa chọn](../../../data/cod-crystal-selections.json) ghim SHA-256 của từng CIF. File CIF công khai giữ nguyên byte nguồn, gồm cả độ bất định, xử lý H, occupancy và các dữ liệu đo đi kèm. Có thể tái xuất từ chính CIF đã commit khi không có cache nghiên cứu.
- Gemmi khai triển đối xứng độc lập; kiểm tra nhóm không gian, ô mạng, thể tích, đủ nguyên tố, thành phần có trọng số và số đơn vị công thức Z trước khi xuất. Giữ số vị trí hiển thị khác số nguyên tử có trọng số ở mẫu bất trật tự (ví dụ caffeine).
- Các pha COD được gắn bằng **ID hồ sơ hóa học đã duyệt**, thay vì chỉ so công thức. Glucose và fructose không dùng chung tinh thể; ethanol không lấy dimethyl ether; aspirin không lấy methyl terephthalate; H₂O₂ không được rút thành HO rồi gán cho ion hydroxide.
- Pha lạnh có nhiệt độ trong nhãn; không gán benzen/ethanol rắn lạnh thành trạng thái thường. Dữ liệu nguồn không ghi nhiệt độ thì không tự thêm 25 °C. Các vị trí H được dựng theo hình học hoặc chịu ràng buộc trong phép tinh chỉnh có ghi chú tương ứng.
- Nguồn: [COD REST API](https://wiki.crystallography.net/RESTful_API/), [COD PSDI mirror](https://cod.psdi.ac.uk/). Tên bài, tác giả, DOI và điều kiện cụ thể nằm trong từng mô hình. Chỉ tải dữ liệu cấu trúc và metadata; không thêm file video.

## Những nguồn đã loại

Xem [danh sách loại](../../../data/crystal-source-exclusions.json). Đủ tỉ lượng không phải điều kiện đủ để một mô hình được coi là cấu trúc đúng.

- COD 8104274 ghi NaOH nhưng không có tọa độ H; dùng bản đơn tà 8104275 đủ H.
- COD 2310927 chỉ có N của ammonia; COD 1533172 có số H đính kèm trong Ba(OH)₂ nhưng không có tọa độ H. Không tự thêm nguyên tử.
- COD 1010575 có đủ Cr:Cl = 1:3 nhưng là mô hình CrCl₃ lịch sử P3212 đã bị thay thế. Không đưa vào bộ xem như tinh thể thực của chất. Đối chiếu [nghiên cứu thực nghiệm McGuire và cộng sự (2017)](https://doi.org/10.1103/PhysRevMaterials.1.014001) và [tổng quan cấu trúc của cùng tác giả](https://doi.org/10.3390/cryst7050121). Bảng I của bài thực nghiệm phân biệt các cột tính toán DFT và số đo ở 298/225 K; không lấy cột DFT làm dữ liệu thực nghiệm. CIF trong Supplementary Note 1 của [Zhou và cộng sự (2026)](https://doi.org/10.1038/s42005-026-02943-7) là mô hình tính toán supercell C2 có khoảng chân không, cũng không được dùng thay ô mạng bulk thực nghiệm.

## Bộ đọc CIF

JavaScript được đối chiếu với JSON do Gemmi khai triển trên toàn bộ 22 CIF gốc. Tọa độ, occupancy, metric và số vị trí đều khớp trong độ chính xác in của nguồn; không suy liên kết hóa học từ khoảng cách.

Một số file ghi 1/3, 2/3 dưới dạng `.3333`, `.6667`, tạo các ảnh gần trùng khi áp đối xứng số học. Chỉ gộp khi bội số được xác nhận và sai lệch nằm trong độ chính xác in; giữ một ảnh nguyên bản, không dịch chuyển tọa độ. Trường cũ `_atom_site_symmetry_multiplicity` có hai quy ước không tương thích trong kho lưu trữ. Bộ đọc kiểm tra quy ước trên toàn khối, ưu tiên tên trường hiện hành và từ chối dữ liệu không nhất quán. Đối chiếu [từ điển IUCr về trường cũ](https://www.iucr.org/__data/iucr/cifdic_html/1/cif_core.dic/Iatom_site_symmetry_multiplicity.html) và [định nghĩa hiện hành](https://www.iucr.org/__data/iucr/cifdic_html/3/CORE_DIC/Iatom_site.site_symmetry_multiplicity.html).

## Giao diện 3D

- Tài liệu số và công cụ cấu trúc có nút chuyển **Phân tử/Nguyên tử/Thành phần ↔ Tinh thể**. Chỉ hiển thị khi có dữ liệu đúng danh tính; không buộc người dùng mất bộ xem phân tử khi đã có tinh thể.
- Cảnh trưng bày cho mô hình phân tử có bệ, bàn và lọ mẫu; bật/tắt được. Hình trang trí nằm ngoài tập nguyên tử, picking, phép đo và SDF/CIF tải xuống. Hướng ban đầu được tính riêng để hệ trục tọa độ tùy ý của phân tử không làm bàn bị xoay đứng hoặc cắt khỏi khung. Bộ chiếu Canvas nhẹ cũng có cảnh trang trí.
- Thông tin phụ và ghi chú đọc CIF thu gọn. Bỏ dòng tuyên bố “100% đa nguyên tử có liên kết” trên trang công cụ; số bộ tọa độ có nguồn được tính từ dữ liệu thực.

## Kiểm chứng và tái tạo

[verification.json](verification.json) ghi phạm vi kiểm tra; [ảnh chụp](screenshots/) dùng dữ liệu và bộ xem thật. 22 GLB render thành công. Kiểm thử xác nhận cảnh không đổi số nguyên tử/tọa độ/file nguồn, chuyển qua lại giữa hai cách biểu diễn, phân biệt đồng phân, không đưa pha đã loại vào giao diện, và giữ nút thoát tài liệu trên điện thoại.

```powershell
py -3.12 -X utf8 scripts/compile-cod-crystals.py
node scripts/generate-crystal-assets.mjs --cod
node scripts/render-mineral-previews.mjs --crystals --cod
node --test tests/cod-crystals.test.mjs tests/crystal-structures.test.mjs tests/learning-upgrade.test.mjs
npm run test:platform
npm --prefix trung-tam run build
npm run build:static
```

Chưa chứng nhận “100% thực tế”. Tọa độ nguồn là mô hình cấu trúc trung bình ở điều kiện cụ thể; cầu nguyên tử, cảnh trưng bày và một số mô hình thành phần là quy ước. Những hồ sơ thiếu dữ liệu pha đáng tin cậy không được gán một tinh thể giả.
