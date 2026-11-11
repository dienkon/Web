# Changelog chi tiết

## Đường dẫn và thư mục thư viện

- Di chuyển 19 tài liệu biên soạn từ `docs/<ma>.json` sang `docs/<ten-chat-hoac-chu-de>/index.json`. Giữ các id dùng trong tìm kiếm/liên kết cũ; thêm `slug` và `documentPath`.
- Thay 468 tài liệu sinh tự động từ `reference/ho-so-<hash>.json` sang `reference/<ten-chat>-<cong-thuc>/index.json`. Khi cần, dùng loại chất/CID để phân biệt trùng tên, không nhập hai đồng phân thành một bài.
- Tạo `shared/library-paths.mjs` dùng chung cho schema đường dẫn và kiểm toán; tạo `shared/library-routes.generated.json` ánh xạ id, slug, mã cũ sang tên URL.
- Sửa `scripts/build-library.mjs`: kiểm tra thư mục đầu ra trước khi xóa cây sinh tự động; sinh cấu trúc thư mục mới và alias ổn định. Giữ hash chỉ cho lựa chọn văn phong và tương thích mã cũ.
- Sửa loader Vite từ glob một cấp sang glob `**/index.json`; đọc tài liệu qua `documentPath` đã kiểm tra. Các chunk xuất ra `assets/tai-lieu/<ten-chat>/noi-dung-<hash>.js`.
- Sửa đường dẫn trong tìm kiếm toàn web và danh mục cấu trúc 3D, bỏ tham số doc ở liên kết mới.
- Bộ đọc tài liệu chuyển query `?doc=...` cũ sang đường dẫn tên chất, di trú lịch sử/dấu trang, hỗ trợ lùi/tiến và loại kết quả tải cũ khi chuyển bài nhanh. Bài gợi ý có nút dùng được bằng bàn phím.
- Sửa `useLocalStorage` để cập nhật hàm dùng trạng thái mới nhất; tránh callback popstate giữ bản lịch sử cũ hoặc ghi lại alias sau khi di trú. Kiểm thử kiểm tra cả lịch sử lẫn dấu trang sau reload và lùi/tiến.
- Đổi nhãn danh mục thành “Thư viện nguyên tố và hợp chất”.
- Giữ nguyên toàn bộ 487 nội dung bài; audit ghi SHA-256 trước/sau và xác nhận nội dung không đổi. Đợt này thay tổ chức/đường dẫn, không tuyên bố đã kiểm duyệt độc lập lại nội dung mọi bài trong thư viện.

## Mạng tinh thể dựa trên dữ liệu công bố

- Tạo pipeline dữ liệu riêng: tải snapshot có SHA-256 cố định, chọn mã AMCSD rõ ràng, giải mã tọa độ/độ chiếm chỗ và dùng Gemmi 0.7.5 để đổi metric, khai triển đối xứng và kiểm tra dữ liệu.
- Xuất 122 cấu trúc với đủ sáu thông số ô mạng, thể tích, phép đối xứng, vị trí bất đối xứng, vị trí trong ô, độ chiếm chỗ, thành phần trọng số, công thức mẫu và trích dẫn.
- Xuất 122 GLB và 122 PNG 640 × 480. Dùng cùng bộ dựng hình cho asset tải xuống và trình xem: ô mạng nghiêng đúng metric; khung và trục a/b/c; các vị trí hỗn hợp chia phần cầu; vị trí trống dạng lưới; không thêm liên kết giả.
- Thêm trình xem tải theo yêu cầu với xoay, phóng to, đặt lại góc nhìn, bật/tắt khung và chuyển 1 ô / 2 × 2 × 2 ô. Bảng tọa độ và các liên kết CIF/JSON/GLB nằm cạnh trích dẫn mẫu.
- Gắn pha đơn chất lên 71 trang và pha khoáng lên 79 trang. Không dùng dữ liệu khoáng vật thay cho mạng của đơn chất.
- Bauxite hiển thị ba pha độc lập. Lepidolite ghi rõ polytype 3T. Tantalite ghi mẫu Mn thật. Calaverite ghi cấu trúc trung bình. Pt/Au và UO2 ghi phạm vi pha tham chiếu. H không có tọa độ trong nguồn không được dựng thêm.
- Thay lựa chọn bản ghi pyrolusite không nhất quán metric; đổi lựa chọn La/Pr/Nd để giữ đủ bốn vị trí DHCP; graphite dùng mẫu tự nhiên đo neutron. Chi tiết mã cũ/mới trong `source-issues.json`.

## Đọc CIF trong công cụ cấu trúc

- Thay parser bỏ qua góc và đối xứng bằng tokenizer CIF 1.1, xử lý chuỗi trích dẫn, văn bản nhiều dòng, loop và cột theo tên.
- Đọc số có độ bất định; kiểm tra metric không suy biến và không điền hằng số mặc định khi thiếu.
- Xử lý tọa độ âm, offset phân số và vị trí tương đương; phân tích phép đối xứng bằng ngữ pháp số/biến, không eval.
- Từ chối nhiều khối, loop sai chiều, ô mạng thiếu, phép đối xứng không hợp lệ và dữ liệu quá lớn. Không tự coi cấu trúc không P1 thiếu phép đối xứng là toàn bộ ô mạng.
- Ngừng tự gán liên kết từ khoảng cách CIF trong cả parser và 3Dmol; sửa nhãn để không gọi tinh thể không có danh sách liên kết là “đơn nguyên tử”.

## Ảnh và truy xuất nguồn

- Thêm ảnh cục bộ có metadata cho 49 khoáng vật, liên kết tới 79 trang nguyên tố. Giữ ảnh đơn chất riêng trong gallery.
- Phần trạng thái tự nhiên hiển thị tên mẫu, chú thích, trang gốc, tác giả và giấy phép để tránh nhầm ảnh quặng với ảnh đơn chất.
- Đổi ảnh platinum nuôi tinh thể sang mẫu platinum tự sinh có địa điểm trong mô tả Commons. Sửa truy vấn Celestine sang tên trang khoáng vật để tránh trang nhập nhằng.
- Script tải ảnh giữ kết quả đã có, ghi báo cáo tiến độ và ghi lại toàn bộ danh mục ở cuối để không làm mất các mục được giữ từ cache.

## Kiểm thử và lưu vết

- Thêm kiểm tra dân số ô mạng chuẩn (NaCl, CaF2, quartz, calcite, sulfur, silicon, graphite và DHCP).
- Đối chiếu tất cả CIF bằng parser JS độc lập với tọa độ do Gemmi khai triển; kiểm tra phép đối xứng bảo toàn metric; kiểm tra độ chiếm chỗ và nguồn của GLB.
- Kiểm tra 487 tệp nội dung trong bundle production, link tên chất, reload, alias cũ, dấu trang và lùi/tiến.
- Kiểm tra trình xem mạng thực, bảng vị trí, tải CIF, ba pha bauxite, viewport điện thoại và hồi quy 118 trang nguyên tố/phương trình/đồng vị.
- Thêm khai báo kiểu Vite cho lint của Trung tâm. Các bài kiểm tra cũ được giới hạn vào đúng widget sau khi trang có nhiều nút xoay độc lập.
- Ghi audit theo tên từng nguyên tố, từng cấu trúc, từng bài; giữ báo cáo test lần đầu và kết quả sau sửa. Các tài liệu DOCX do người dùng di chuyển/xóa từ trước không được đưa vào commit này.
