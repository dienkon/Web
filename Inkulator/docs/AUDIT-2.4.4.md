# Audit phát hành Inkulator 2.4.4

Ngày 19/11/2026. Phạm vi gồm thao tác giảng bài, độ trễ trên cấu hình thấp, tương thích sổ cũ và nội dung bộ cài Windows x64. Thay đổi nền của phiên bản nằm ở commit `54eae26d` trên `main`. Siêu dữ liệu phát hành, chuyển câu từ lớp văn bản PDF và phép đo bộ cài được bổ sung ở đợt này.

## Kiểm tra theo yêu cầu

| Yêu cầu | Hành vi kiểm được | Phép thử |
| --- | --- | --- |
| Tắt thao tác ngữ cảnh ngoài ý muốn | `canvasMenu` mặc định tắt. Bật lại trong Cài đặt để mở menu ngữ cảnh và sửa đối tượng bằng nhấp đúp. Công cụ Chọn vẫn thao tác đối tượng bằng tay. | `ink-performance-tests.cjs` kiểm mặc định, bật lại và khôi phục sau tải lại. `desktop-tests.cjs` kiểm nhấp đúp khi viết. |
| Thu gọn cụm điều hướng | Thanh nổi có giảm/tăng zoom, phần trăm, vừa ngang và nút chuyển câu. Nút chuyển trang nằm ở danh sách trang. | `ink-performance-tests.cjs` kiểm đúng số nút và không lặp điều hướng trang. `capture-layout-browser-tests.cjs` kiểm thao tác zoom/đổi kích thước. |
| Thanh bút nằm ở góc và xếp gọn | Khởi động ở góc dưới trái, thu còn nút mở và kéo được. Khay ảnh chụp đặt bên cạnh. | `ink-performance-tests.cjs` kiểm trạng thái gập/mở. `capture-layout-browser-tests.cjs` kiểm khay ảnh lưu sẵn không che nút mở. |
| Điều khiển hình sát và di chuyển mọi hướng | Đoạn thẳng có hai tay nắm đầu mút, đổi được chiều ngang và dọc khi kéo qua đầu kia. Điều khiển hình học bám biên và kéo được khỏi hình. | `teaching-workflow-browser-tests.cjs` kéo đầu mút nét đứt qua đầu còn lại. `geometry-pen-browser-tests.cjs` kiểm tay nắm khối, góc đối diện cố định và vùng nút trên viewport máy tính bảng. |
| Nét bút mượt và bộ nhớ thấp | Đọc mẫu bút gộp, làm mượt đường bút, cập nhật vùng bẩn trên lớp xem trước và thêm nét vào bitmap khi thứ tự lớp cho phép. Chế độ tiết kiệm hạ ngân sách điểm vẽ, canvas, PDF và lịch sử. | `ink-performance-tests.cjs` và `windows-release-smoke.cjs` đo khung xem trước, chốt nét và số lượt dựng lại lớp. |
| Highlight có bộ màu riêng | Màu và độ dày highlight độc lập. Chuyển sang highlight không đổi màu bút viết. | `ink-performance-tests.cjs` đối chiếu loại nét, màu nét và màu bút viết, rồi tải lại. |
| Tẩy vùng vuông và tròn | Khoanh vùng, tẩy nét giao với vùng. Có thể kéo ngược chiều và Undo. | `ink-performance-tests.cjs` phân biệt góc vuông với vùng tròn, kiểm kéo ngược và Undo. |
| Bỏ tiêu đề trên mặt giấy | Bỏ ô tiêu đề, phần vẽ tiêu đề trên canvas và đường xuất ảnh/PDF/SVG. Giữ tên trang làm dữ liệu điều hướng cho sổ cũ. | `advanced-browser-tests.cjs` kiểm ô tiêu đề vắng mặt và xuất PDF nhiều trang. `teaching-workflow-browser-tests.cjs` kiểm DOM. |
| Nhập PDF thay trang đầu, mặc định bật | Chỉ thay trang đầu trống, không tên và không có liên kết câu hỏi khi nhập vào các trang mới. Có công tắc tắt và Undo. | `teaching-workflow-browser-tests.cjs` kiểm cả hai chế độ nhập và Undo. `studio-browser-tests.cjs` giữ trang đang có nội dung. `workspace-v23-tests.cjs` nhập, lưu và mở lại PDF 420 trang. |
| Lướt nhanh trên Windows bằng bút | Dùng công cụ bàn tay hoặc nút hông khi menu ngữ cảnh tắt. Bút và ngón tay có quán tính dọc sau khi nhấc. Vẫn chặn chạm lòng bàn tay trong lúc viết. | `teaching-workflow-browser-tests.cjs` phát Pointer Events loại `pen` với nút hông và xác nhận trang tiếp tục lướt sau khi thả. `ink-performance-tests.cjs` kiểm lòng bàn tay. |
| Vừa chiều rộng giữ vị trí đọc | Giữ tọa độ giấy tại mốc dọc đang đọc khi đổi tỉ lệ. Bố cục đặt bề rộng trang vào giữa. | `teaching-workflow-browser-tests.cjs` đối chiếu tọa độ giấy trước/sau. `capture-layout-browser-tests.cjs` kiểm vừa rộng, vừa trang và lưu zoom. |
| Nút icon chuyển nhanh đến câu sau | Dùng mốc câu đã đánh dấu. Khi trang PDF chưa đánh dấu, đọc tiêu đề có số từ lớp văn bản cục bộ của trang. Nếu không có mốc tiếp theo, chuyển trang hoặc báo hết tài liệu. | `teaching-workflow-browser-tests.cjs` kiểm hai tiêu đề PDF thực, tránh cụm “Question” ở giữa dòng và chuyển qua ba mốc đánh dấu. `windows-release-smoke.cjs` lặp trên PDF 64 trang từ EXE. |
| Smart Shape giữ nét đứt | Đường thẳng được nhận dạng thành đoạn nét đứt/chấm. Hình kín lưu kiểu viền cùng hình. | `teaching-workflow-browser-tests.cjs` vẽ nét đứt thật và kéo đầu mút kết quả. `smart-shapes-v22-tests.cjs` kiểm các dạng nhận dạng chính. |
| Bảng màu nhanh lưu xuyên sổ | Bảng màu dạng lưới, màu tùy chỉnh, ghim màu ra thanh và lưu preset bút theo thiết bị. | `teaching-workflow-browser-tests.cjs` ghim, đổi sổ và tải lại. `workspace-v23-tests.cjs` kiểm khôi phục kiểu bút sau khi mở lại Electron. |
| Chọn chế độ chụp mặc định | Cài đặt chọn Ảnh để dán hoặc Chừa chỗ giải câu hỏi. Menu chụp có thể chọn riêng từng lần. | `teaching-workflow-browser-tests.cjs` đổi mặc định, mở chụp và tải lại. `workspace-v22-tests.cjs` kiểm chế độ ảnh/câu hỏi. |
| Thiết diện nhiều đỉnh | Chọn các điểm đồng phẳng rồi chạm lại điểm đầu. Có thể lưu 3–32 điểm xác định thiết diện. Tính đa giác giao theo mô hình không gian. | `teaching-workflow-browser-tests.cjs` khép thiết diện bốn đỉnh. `construction-tests.cjs` xác minh diện tích lục giác và từ chối điểm lệch mặt phẳng. |
| Thư viện tài liệu gọn | Cây thư mục, đường dẫn, dạng lưới hoặc danh sách, tìm kiếm, sắp xếp và chuyển sổ. Bản xem trước dạng lưới tạo theo vùng nhìn, dạng danh sách không tạo canvas. | `teaching-workflow-browser-tests.cjs` tạo thư mục, tìm, chuyển sổ và mở thư mục. `learning-v24-desktop-tests.cjs` xác minh thư mục lồng nhiều cấp sau khi mở lại. |
| Đặt tên nhanh và xoay vòng | Điền `ABCD` hoặc `SABC`. Với hình chóp tên đầu là đỉnh chóp, nút xoay đổi nhãn theo vòng đáy. Với lăng trụ có thể suy tên tầng trên từ tên đáy. | `teaching-workflow-browser-tests.cjs` đặt `TJKLM` và xoay, kiểm nhãn đáy mới và nhãn đỉnh chóp. |
| Điểm bất kỳ bắt chính xác lên đường | Tìm đoạn/cạnh gần con trỏ, chiếu lên đoạn và lưu tỉ lệ theo hai điểm đầu. Điểm tiếp tục bám nếu cạnh thay đổi. Vùng trống cho phép điểm tự do. | `teaching-workflow-browser-tests.cjs` chạm lệch khỏi cạnh và kiểm tọa độ mô hình thuộc cạnh. `construction-tests.cjs` kiểm tính phụ thuộc của điểm chia cạnh. |
| Kéo vùng chụp giảm trễ | Hiển thị lớp khoanh ngay, gộp cập nhật theo khung hình, rồi mới dựng ảnh đúng vùng sau khi nhấc bút. | `capture-pdf-v2-tests.cjs` kiểm PDF thật, màu điểm ảnh và không có canvas bản sao khi kéo. `windows-release-smoke.cjs` đo kéo và mã hóa PNG. |

Các bài kiểm tra trình duyệt dùng Chrome và Edge ngoại tuyến. Bài hình học và hình chiếu cũng chạy độc lập bằng `npm test`. Kiểm thử trên bộ cài được mô tả riêng bên dưới.

## Phép đo Windows với giới hạn 4 GiB

Chạy `Inkulator.exe` x64 trích từ chính bộ cài NSIS, với Electron 45.2.3, hồ sơ trống và `--software-rendering`. Windows Job Object giới hạn tổng bộ nhớ commit của cây tiến trình kiểm thử ở **4.294.967.296 byte**. Renderer báo cấu hình 4 GiB để kiểm nhánh tự động tiết kiệm, sau đó CDP giảm tốc CPU renderer 4×. Bài thử nhập PDF 64 trang, chuyển câu từ lớp văn bản, mở sổ có 1.200 nét và 76.800 mẫu, rồi ghi thêm 22 nét thuộc 11 loại bút và kéo một vùng chụp.

| Chỉ số | Kết quả trên EXE cuối |
| --- | ---: |
| P95 xử lý mẫu đến khung xem trước nét | 14,0 ms |
| P95 từ nhấc bút đến khung tiếp theo | 19,5 ms |
| P95 xử lý bước kéo đến khung chọn vùng tiếp theo | 12,4 ms |
| Từ thả bút đến ảnh PNG trong bài thử | 84,2 ms |
| Lượt dựng lại toàn lớp nét trong 22 nét thường | 0 |
| Canvas bổ sung trong lớp điều khiển chụp khi kéo | 0 |
| Bộ nhớ commit đỉnh của cây kiểm thử | 571.293.696 byte (544,8 MiB) |

P95 kéo vùng trong lượt đo bản trước khi bỏ lớp che động là 40 ms. Với bản cuối, lớp che xuất hiện lúc vào chế độ chụp rồi nhường chỗ cho khung khoanh nhẹ khi kéo. App hoãn cập nhật thumbnail và tránh dựng lại trang nếu không có thao tác hình học đang chạy.

Thời gian đo từ Pointer Events tổng hợp đến `requestAnimationFrame` hoặc callback trả PNG. Phép đo chưa bao gồm cảm biến bút, driver, độ trễ hiển thị và tải của hệ điều hành trên máy tính bảng cụ thể. Giới hạn Job Object áp dụng cho cây tiến trình, không đặt tổng RAM của Windows ở mức 4 GiB. Các số liệu áp dụng cho PDF và sổ trong bài thử. Với PDF scan, nút chuyển câu ưu tiên mốc đã đánh dấu vì có thể không có lớp chữ.

Để lặp bài đo, trích `app-64.7z` từ bộ cài, giải nén payload vào thư mục kiểm thử riêng, rồi chạy:

```powershell
pwsh -NoProfile -File scripts/test-release-memory.ps1 -Executable '.../payload/Inkulator.exe' -Report '.../packaged-memory.json'
```

## Bộ cài và tính toàn vẹn

`npm run desktop:build` dựng OCR và máy tính ngoại tuyến rồi đóng gói Electron bằng electron-builder 26.18.0. Bộ cài dùng NSIS 3 Unicode, cài theo người dùng và giữ thư viện khi gỡ theo cấu hình. `7z t` xác nhận cấu trúc bộ cài và ZIP web. Payload trích từ bộ cài có PE x64, phiên bản 2.4.4 và `app.asar` trùng bản build. `index.html`, JavaScript, CSS và ghi chú phát hành trong ASAR trùng từng byte với nguồn được kiểm.

| Tệp | Byte | SHA-256 |
| --- | ---: | --- |
| `Inkulator-Setup-2.4.4-x64.exe` | 151.132.833 | `163dda0f8acc1cc8a639637d9667ef70bbd5294ba480fa8bfffa6084fca1e229` |
| `Inkulator-Web-2.4.4.zip` | 14.115.551 | `9c436aaf504165207765d49733e359c334fb55a7ca0fc8747eff1e23f0eb89b4` |

Windows trả trạng thái Authenticode `NotSigned`. Kiểm thử chạy payload trích trực tiếp bằng hồ sơ riêng. Máy kiểm thử có bản 2.0.1 sẵn, do đó chưa chạy trình cài nâng cấp và gỡ trên hồ sơ người dùng đó. Bộ cài chuẩn không nhúng khóa Gemini. Gemini dùng khóa đã lưu trong Windows hoặc khóa người dùng nhập. Viết, PDF và OCR công thức tại chỗ hoạt động ngoại tuyến.

Trên payload cuối, `desktop-tests.cjs` đã qua kiểm tra sandbox, nhấp đúp khi viết, chụp PNG, clipboard Windows, dán ảnh và mở lại sổ sau khi thoát ứng dụng. `desktop-v2-tests.cjs` đã mở và chụp cả hai máy tính đi kèm, chạy mô hình OCR cục bộ, kiểm mã hóa khóa thử nghiệm trong hồ sơ riêng và giữ renderer ở chế độ ngoại tuyến.
