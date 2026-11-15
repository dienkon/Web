# Nâng cấp thao tác, kho phản ứng và hình thái vật chất — 15/11/2026

## Phạm vi

Tiếp tục tích hợp các sửa đổi tiếp xúc/vật nền có sẵn trong worktree, rồi bổ sung UI gọn, thao tác rót/rửa và chạy mẫu cục bộ. Các sửa đổi bên ngoài `lab-3d` thuộc công việc khác và không nằm trong commit này.

- Menu ChemDex ở góc thay hàng điều hướng website thường trực; công cụ và thống kê mở theo yêu cầu. Sidebar có nút đóng trên desktop, chỉ một bảng mở trên màn hình nhỏ. Panel dụng cụ thoát khỏi vùng overflow; điều khiển rót nằm trong viewport của bàn.
- Rót góc 0 trước giọt đầu tiên vẫn trả bình về; kết thúc giải phóng khóa camera. Giữ chuột/Space/Enter dùng góc trợ giúp theo lượng dịch. Cọ/tia rửa và lịch sử rót giữ đầy đủ kho vật chất. Chi tiết: `pour-wash-operations-2026-11-15.vi.md`.
- Thêm lối chạy trực tiếp cho chương trình đã hỗ trợ và năm thẻ hiện tượng có nguồn. Sửa tìm chương trình H₂O₂/MnO₂ để nhận xúc tác, không rơi sang mạng. Chi tiết: `library-quickstart-2026-11-15.vi.md`.
- Lớp Cu/Ag giữ nguồn gốc vật nền qua phản ứng kế tiếp, chuyển vật và lưu/khôi phục; hóa học/cơ học/renderer đọc cùng mặt xoáy. Chi tiết: `surface-contact-continuity-2026-11-15.vi.md`.

## Tinh thể muối

Trước sửa, NaCl sinh từ mô hình bão hòa có sẵn không có profile: renderer lấy hạt mịn và khối lượng riêng BaSO₄ mặc định. Thêm profile NaCl với hình lập phương và 2,16 g/cm³, thống nhất với dữ liệu stock sẵn có. [Kansas Geological Survey — Halite](https://geokansas.ku.edu/halite-salt) mô tả muối kết tinh khi nước bay hơi, màu trắng/không màu, tính tan và specific gravity 2,16. Hình lập phương là hình thái đại diện; không mô phỏng mạng ion.

Chế độ đọc rõ nay phóng đại riêng glyph tinh thể với biên 0,015 đơn vị hoặc 1,5% bán kính bình. Phép kiểm thành/mặt nước vẫn chặn glyph vượt biên. Khối lượng, bán kính vật lý, tốc độ lắng và cân bằng hòa tan không đọc kích thước phóng đại này. Bột PbI₂ mới tạo vẫn dùng profile bột; chỉ quần thể có lịch sử làm nguội dùng phiến.

Mô hình bão hòa NaCl nhị phân và đường IUPAC sẵn có giữ nguyên. Kích thước hạt, hệ số quang học, tốc độ tăng trưởng và động học là xấp xỉ minh họa, chưa hiệu chuẩn thực nghiệm. Không tuyên bố mọi chất trong kho có mô hình vi mô riêng.

## Kiểm chứng tập trung

- Hồi quy muối: dưới bão hòa không tạo hạt; quá bão hòa tăng khối lượng rắn liên tục; thêm nước giảm dần lượng rắn; bảo toàn tổng mass/mol; hình lập phương nằm trong envelope và glyph rõ không đổi dữ liệu vật lý.
- Trình duyệt `auditSaltCrystalLifecycle.mjs`: mẫu 8 g NaCl/30 g nước không có rắn; mẫu 11 g/30 g nước tạo 0,1629001665 g rắn sau 6 s mô phỏng; thêm 10 g nước còn 0,0363479402 g sau 6 s. Mass được renderer biểu diễn khớp kho trong ngưỡng 1e-10 g, không lỗi JavaScript/shader. Đây là kiểm phần mềm của mô hình, không phải đo tốc độ ngoài thực nghiệm.
- Ảnh tổng và cận cảnh dùng renderer thật tại `artifacts/salt-crystal-lifecycle/`.

## Kết quả tích hợp

- Bộ hồi quy: **3.514/3.514 kiểm thử, 261/261 tệp**, 319,25 s; chạy tuần tự với benchmark tách riêng để trình duyệt kiểm UI không nhiễu phép đo CPU.
- Benchmark riêng: **1/1 qua**; tổng **3.515/3.515 kiểm thử, 262 tệp**. Ba bình logic/physics đạt trung bình **4,071 ms**, P95 **7,595 ms**, retained heap tăng **4,283 MB**. Giữ ngưỡng 5 ms/10 ms; số này không gồm WebGL và không chứng nhận FPS mọi thiết bị.
- Audit UI ở **1480×1000** và **390×844**: canvas chiếm chiều cao viewport trừ 92 px thanh điều khiển; không control vượt màn hình; menu/Escape, một drawer mobile, chọn đũa, modal physics và tạo mẫu Cu(OH)₂ hoạt động. Rót thật bằng pointer chuyển 2,58 mL desktop / 2,48 mL mobile; thả pointer/Space kết thúc phiên, rotationZ nguồn về 0. Không lỗi JavaScript.
- Audit tiếp xúc lớp bám, mặt xoáy và đũa khuấy trên mã tích hợp đều qua. Lượng Cu trong vũng 0,0105563376254 g vẫn gắn đúng carrier; JSON restore giữ lớp Cu/Ag. Tại tâm mặt xoáy khô không tiêu thụ Zn; vùng vành ướt có phản ứng. Pause và spin-down giữ đồng hồ chung.
- Audit sáu quần thể PbI₂/PbCl₂ (bột, tinh thể, hỗn hợp) giữ đúng tổng khối lượng và hai hình học khi cùng công thức; pause và đổi chất lượng không thay lịch sử vật lý.

Log chạy được lưu cục bộ trong `artifacts/compact-lab-*.log`; JSON và ảnh tái lập nằm trong các thư mục `compact-lab-ui`, `compact-lab-performance`, `salt-crystal-lifecycle`, `deposit-contact-continuity`, `vortex-chemical-contact`, `stirring-rod-fidelity` và `precipitate-formation`.


`npm run lint` và `npm run build` trên mã cuối: **qua**. Vite vẫn cảnh báo một số chunk lớn hơn 500 kB (thư viện vật lý/Three và dữ liệu kho); tối ưu bố cục không được coi là đã xử lý toàn bộ chi phí tải ban đầu.

Audit `auditMetalDepositionBrowser.mjs` cũng qua trên mã cuối: lớp bám thủ công/trên vật rơi, Fe/CuSO₄ tự động và Cu/AgNO₃ tự động giữ thể tích mesh tương ứng lượng kim loại; không lỗi JavaScript/shader. Tổng **7 audit trình duyệt** đã qua trong vòng tích hợp.
