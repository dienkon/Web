# Inkulator 2.4 · Thư viện, câu hỏi tại chỗ và hình học động

Ngày 13/11/2026.

## Các lỗi đã sửa

- **Vẽ shape bằng kéo:** chạm hoặc rung bút dưới 6 pixel không chèn hình, không tạo lịch sử Undo. Kéo mới xem trước và tạo đúng một hình; bỏ hành vi chèn hình 120 × 120 sau mỗi lần chạm.
- Bộ bắt điểm chỉ áp dụng cho đối tượng hình học; kéo nét viết và chọn nhiều vẫn hoạt động. Vòng công cụ tự tránh bảng thuộc tính để các nút xoay/dựng hình không bị bảng che.
- **Dọn thư viện trên Windows:** dọn và xóa sổ cập nhật cả danh mục tệp trên ổ đĩa. Gói trong thư viện được sao chép vào `Thung rac`, kiểm tra nội dung trước khi xóa bản đang dùng. Sổ đã dọn không tự xuất hiện khi khởi động lại. Đường dẫn không còn tồn tại được loại khỏi danh mục; vẫn dùng bản khôi phục khi một slot bị thiếu. Nếu di chuyển gói khi ứng dụng đang mở, lần lưu tiếp theo có thể ghi lại nội dung đang giữ trong bộ nhớ.
- **Mở tài liệu có phân cấp:** nút Mở, Ctrl+O, Thư viện và Tài liệu trên máy dùng cùng giao diện cây thư mục, đường dẫn, thẻ xem trước và ô tìm kiếm. Có tạo thư mục con, tạo sổ, đổi tên thư mục/sổ, chuyển sổ bằng bộ chọn hoặc kéo lên thẻ thư mục và dọn sổ. Tệp gốc khác mở qua **Mở tệp…**. Thư mục sổ trên ổ đĩa hỗ trợ tới 12 cấp; đường dẫn trong dữ liệu sổ tối đa 100 ký tự.

## Chụp câu hỏi và chừa chỗ giải

Chọn mũi tên cạnh camera → **Chụp câu hỏi · chừa chỗ giải ngay tại đây**, rồi khoanh câu hỏi.

1. Câu đã khoanh và phần phía trên giữ nguyên tại vị trí cũ.
2. Nội dung dưới đáy vùng khoanh, cộng khoảng đệm 20 đơn vị trang, chuyển sang một trang thường ngay kế tiếp; có khoảng đệm đầu trang tối đa 60 đơn vị.
3. Phần còn lại trên trang gốc dành để viết lời giải. Không tạo trang ảo mới. Nếu phía dưới đã trống, không thêm trang.
4. PDF giữ tài nguyên vector gốc; vùng cắt lưu bằng mặt nạ. Nét, hình, chữ và phần tiếp theo vẫn có thể sửa. Undo khôi phục cả lần chia trang.
5. Đọc số câu/ý tiếp tục dùng lớp chữ PDF, Windows OCR hoặc Gemini đã cấu hình. Nhãn câu nằm ngay trên vùng đề, kéo dời/đổi tên được, lưu và mở lại được. Nhãn không phải bản sao đề bài.

Xuất PDF vector, SVG, PNG và in áp dụng cùng mặt nạ. Trang câu hỏi ảo của tài liệu cũ vẫn mở và xuất theo thứ tự cũ.

## Hình học và thiết diện

- **Điểm bất kỳ:** bật/tắt trong Cài đặt hoặc thuộc tính hình. Chọn hình → Điểm bất kỳ → chạm vị trí → Xong. Công cụ Chọn kéo điểm tự do hoặc điểm chia cạnh; các phép dựng phụ thuộc cập nhật theo. Điểm tự do 3D đặt ban đầu trên `z = 0`; có ô sửa tọa độ.
- **Đa giác đều 3–36 cạnh:** chọn Đa giác đều trong thư viện, nhập số cạnh trong thuộc tính. Kéo một đỉnh giữ tính đều. Các đỉnh sau Z dùng A1, B1…; đổi số cạnh cần xóa các phép dựng đang phụ thuộc.
- Thêm vectơ, tịnh tiến điểm theo vectơ, quay điểm quanh tâm với góc sửa được và đối xứng điểm qua đường thẳng. Các công cụ trung điểm, song song, vuông góc, đường cao, tiếp tuyến, giao đường/đường, giao đường/mặt, giao hai mặt, số đo và ký hiệu tiếp tục dùng chung mô hình phụ thuộc.
- **Tách thiết diện:** dựng điểm trên cạnh → Thiết diện qua ba điểm → thuộc tính hình → chọn thiết diện → Tách thiết diện. Thanh Độ tách dịch chuyển hai khối theo pháp tuyến; mỗi phần có mặt cắt được tô. Có thể xoay 3D và tự đổi cạnh khuất thành nét đứt. Ghép lại đặt độ tách bằng 0.
- **Mở rộng thành mặt phẳng:** chọn thiết diện trong thuộc tính rồi bấm nút tương ứng; mặt phẳng có nền nhạt, viền đứt. Gõ tên ở thuộc tính hoặc nhấp đúp trong mặt phẳng; `alpha`, `zeta`… thành `(α)`, `(ζ)`… Kéo điểm chia cạnh khi đã thoát chế độ dựng để thiết diện và mặt phẳng cập nhật.
- **Trải phẳng:** thanh trượt mở các mặt theo cạnh bản lề. Khi trải hết, góc nhìn chuyển vuông góc mặt trải. Các mặt giữ đúng độ dài cạnh. Có thể dùng Xoay 3D để đổi góc nhìn sau đó.

Phần tách/trải phẳng dành cho khối đa diện lồi trong thư viện. Đây là tập công cụ được bổ sung cho Inkulator, chưa phải toàn bộ hệ lệnh của GeoGebra.

## Đồ thị và giải tích

- Nhập từng bất phương trình làm một biểu thức, ví dụ `x + y ≤ 3`, `x ≥ 0`, `y ≥ 0`. App tô phần giao, có tùy chọn gạch miền loại; biên bất phương trình nghiêm ngặt dùng nét đứt.
- **Tìm và vẽ tiệm cận ≈:** tìm tiệm cận đứng trong khoảng nhìn, cùng tiệm cận ngang/xiên bằng khảo sát số.
- **Bảng biến thiên:** đặt cận, có thể dùng `-∞` và `+∞`; nhập khoảng tìm các mốc. Bảng có `y′`, `y″`, dấu đạo hàm, mũi tên biến thiên, mốc không xác định và giới hạn. Chèn bảng thành ảnh trên trang.
- **Khối tròn xoay:** chọn Ox/Oy, cận hữu hạn, thanh góc quay và hoạt cảnh. Miền giữa hai hàm đầu, hợp các khối của mọi hàm với trục hoặc giao các khối có bộ chọn riêng. Hợp có thể tô phần giao màu tím. Chèn mô hình vào trang rồi dùng Chọn và kéo để xoay 3D; cấu hình được lưu cùng sổ.
- Tính thể tích gần đúng bằng phương pháp vành khăn quanh Ox hoặc vỏ trụ quanh Oy. Với khoảng đi qua cả hai phía Oy, các miền vỏ trụ trùng nhau được gộp trước khi tích phân.

Khảo sát và tích phân là phương pháp số, không phải chứng minh ký hiệu. Khoảng tìm mốc hữu hạn có thể bỏ sót nghiệm hoặc điểm gián đoạn; `KXĐ` cũng dùng khi chưa kết luận được giới hạn. Bảng nêu rõ khoảng đã khảo sát. Hàm có điểm không xác định hoặc tích phân không hội tụ sẽ báo lỗi khi phát hiện được.

## Công cụ giảng dạy

- Thước bổ sung compa và thước parabol; hỗ trợ vẽ đường tròn/cung/parabol và bắt bút theo đường cong. Ê ke bắt thêm hai cạnh còn lại.
- Menu → Chèn → **Gọi tên ngẫu nhiên**: danh sách mỗi dòng một tên, tùy chọn `Tên | Tổ`; chọn tổ, không gọi lặp, gọi lại từ đầu và đọc tên. Danh sách và các lượt gọi được lưu cục bộ.

## Kiểm tra

`npm run test:workspace-v24` kiểm tra hình học, giải tích, giao diện Chrome/Edge ngoại tuyến và vòng đời lưu/khởi động lại Windows.

- Hai phần cắt kín, tổng thể tích bằng khối gốc; mặt trải đồng phẳng và giữ độ dài cạnh.
- Chạm shape không tạo đối tượng/lịch sử, kéo tạo một hình có Undo.
- Tạo thư mục con, đa giác 36 cạnh, kéo điểm phụ thuộc, tách/ghép/mặt phẳng/trải phẳng.
- Hàm bậc hai, hàm tuyến tính, cực của phân thức, giới hạn/tiệm cận, miền nghiệm, thể tích/hợp/giao khối tròn xoay.
- Chia một PDF hai câu; lưu/mở lại; kiểm tra ảnh dựng từ PDF vector đã xuất và SVG có clip.
- Dọn sổ qua giao diện, kiểm tra gói trong thùng rác, khởi động lại, đường dẫn bị di chuyển và lưu lại mô hình 3D.

Các kiểm tra 2.1/2.2 đã cập nhật kỳ vọng câu hỏi tại chỗ; kiểm tra xuất trang ảo cũ vẫn được giữ.

Bộ cài Windows 2.4.0 đã được tạo; 64 tệp HTML/CSS/JavaScript/desktop trong `app.asar` đã đối chiếu với mã nguồn cuối. Bộ kiểm tra vòng đời 2.4 cũng chạy qua trên chính `dist/desktop/win-unpacked/Inkulator.exe`, với hồ sơ thử độc lập.
