# Mở rộng tinh thể, video và quan sát Lab 3D

Đợt tiếp theo sau commit `033183cc`, thực hiện trên `main`.

- Thêm **113 pha** từ các lựa chọn AMCSD được duyệt tường minh. Danh mục chất bổ sung có **151 pha**; cùng hai danh mục đã có, ứng dụng có 284 mô hình pha. **254/482 hồ sơ chất không phải hỗn hợp** hiện gắn được pha tinh thể có nguồn. Các hồ sơ khác vẫn dùng mô hình phân tử/nguyên tử/thành phần có nhãn mức chứng cứ.
- Xuất JSON tọa độ, CIF, GLB và ảnh cho mỗi pha. Kiểm tra đủ nguyên tố, tỉ lượng theo occupancy, metric, khai triển đối xứng và đọc lại CIF. 151 mô hình render được trong Chromium/WebGL. Tên nhóm không gian của danh mục bổ sung được đối chiếu trực tiếp với toàn bộ phép đối xứng bằng Gemmi; giữ cả tên nguồn và số nhóm. Ví dụ nguồn ghi `P a 3`, nhưng tập phép đối xứng xác nhận nhóm 205 `P a -3` cho α-N₂.
- Bổ sung pha rắn đo ở điều kiện lạnh/áp suất cho He, Ne, Ar, Kr, Xe, N₂, O₂, F₂, Cl₂, Br₂; không thay đổi trạng thái ở điều kiện phòng của nguyên tố. Các hồ sơ đơn chất dùng danh tính nguyên tố đã chọn, nên Mn29 trong ô nguyên thủy không bị coi thành một chất khác với Mn. Không rút gọn tùy tiện công thức phân tử để ghép pha.
- Loại bản ghi thiếu H của Ni(OH)₂, Sr(OH)₂, dữ liệu H của băng Ih bị làm tròn gây sai bội số vị trí và bản CrCl₃ khai triển sai thành phần. Có băng II với tọa độ proton đầy đủ, ghi rõ −75 °C, 0,3 GPa; đây không phải băng Ih hay nước lỏng. Xem [các trường hợp loại](crystal-exclusions.json) và [lựa chọn/điều kiện](substance-crystal-selection.json).
- Mở rộng thành **120 liên kết video**, phủ đủ **118 nguyên tố**. Thu thập từ [bộ Periodic Videos trên TED-Ed](https://ed.ted.com/ted_ed_collections/periodic-videos), đối chiếu tên kênh bằng YouTube oEmbed. Không lưu video hay thumbnail. Video dùng tên nguyên tố tạm thời có nhãn lưu trữ; prompt yêu cầu phân biệt tên lịch sử với ký hiệu hiện hành. Số câu hỏi phụ thuộc thời lượng, khoảng cách tối thiểu 12 giây và thời lượng AI phải khớp metadata nguồn.
- API thực đã phân tích video Bk dài 24 giây và tạo một câu hỏi tại giây 8, có mô tả lời nói làm chứng cứ. Lưu JSON chuẩn bị sẵn cùng kết quả Na đã có; video khác phân tích theo nhu cầu. Câu hỏi vẫn mang nhãn AI, chưa phải nội dung được giáo viên kiểm duyệt độc lập.
- **11 liên kết phương trình → Lab** mở chế độ quan sát tự động bằng `observe=1`. Có tạm dừng, tiếp tục, dừng, chạy lại và chuyển sang tự thực hành. Quy trình điều khiển chuyển mẫu hữu hạn, phản ứng và đèn cồn của lab, không gán màu/sản phẩm để dựng cảnh. Thêm chuyển mẫu rắn giữ nguyên lượng vật chất. Phần kiểm tra từng bước thực hành được ẩn khi xem tự động để không hiển thị lỗi dung sai của bài thực hành chưa làm.
- Sửa khởi tạo phản ứng chờ nhiệt trong preset: Cu(OH)₂ có sẵn giờ được bộ tính nhiệt kích hoạt thành CuO khi đủ điều kiện; kiểm thử tích hợp chạy bộ tính nhiệt và xác nhận sản phẩm. Chế độ xem phản ứng không tự chấm hoàn thành toàn bộ bài thực hành (ví dụ các bước hòa tan bằng NH₃ của bài AgCl).

Kiểm chứng được ghi trong [verification.json](verification.json); ảnh chụp thật trong [screenshots](screenshots/). Khóa API chỉ ở cấu hình máy bị Git bỏ qua; không đưa vào tài liệu, bundle hoặc commit. Các thay đổi biên soạn và ảnh tài liệu đã có trong checkout được giữ nguyên, không gộp vào commit này.

Các mô hình dùng tọa độ từ nguồn và các quy ước hiển thị đã công bố trong bộ xem. Không chứng nhận bản mô phỏng giống mẫu thật “100%”: chưa có dữ liệu tinh thể phù hợp cho mọi hồ sơ, một số mô hình cũ là prototype có nhãn, cảnh trưng bày không phải điều kiện vật lý của mẫu. Chưa deploy hay push.

Tái tạo từ snapshot AMCSD đã ghim:

```powershell
py -3.12 -X utf8 scripts/extend-substance-crystals.py
node scripts/generate-crystal-assets.mjs --substances
node scripts/render-mineral-previews.mjs --crystals --substances
node scripts/import-periodic-video-links.mjs
npm --prefix trung-tam run build
npm --prefix lab-3d run build
npm run build:static
```

Đối chiếu nhóm không gian dùng [Gemmi: Groups of Operations](https://gemmi.readthedocs.io/en/stable/symmetry.html). Snapshot, tên bài, tác giả, năm, ô mạng và điều kiện gốc được giữ ở từng mô hình, không suy cấu trúc từ tên mạng chung.
