# Inkulator · 2.2.0

Sổ tay Toán học ngoại tuyến cho Windows, lấy cảm hứng bố cục từ ảnh Scrble Ink được cung cấp. Phần Casio tích hợp source của Tikz-Physics, ghi nguồn riêng bên dưới; không phải sản phẩm chính thức của Scrble, GeoGebra hay Casio.

## Mở ứng dụng

**Windows 10/11 x64:** chạy `dist/desktop/Inkulator-Setup-2.2.0-x64.exe`, chọn thư mục cài và mở **Inkulator** từ Desktop hoặc Start Menu. Ứng dụng có cửa sổ riêng, chạy ngoại tuyến, không cần cài Node.js hoặc trình duyệt. Tài liệu tự lưu thành tệp trong **Documents / Inkulator**; bộ đệm cũ được sao lưu nén khi chuyển đổi, ứng dụng mở bản mới nhất trên ổ đĩa. Bộ cài cá nhân chưa ký số.

**Bản web và iPad:** bản web vẫn chạy từ `index.html` trên máy tính. Trên iPad, phục vụ toàn bộ thư mục ứng dụng qua HTTP/HTTPS rồi mở bằng Safari; iPad không chạy tệp `.exe`. Không có máy chủ nào được triển khai tự động. Bản Windows và trình duyệt có kho lưu riêng; dùng **Ctrl+S / Mở tệp** để chuyển sổ tay giữa các bản.

Nếu dùng bản ZIP trên máy tính:

1. Giải nén **SCRBLE-MATH-STUDIO.zip** bằng “Extract All”.
2. Mở thư mục **SCRBLE-MATH-STUDIO** vừa giải nén.
3. Nhấp đúp **index.html**, chọn Chrome hoặc Microsoft Edge.

**Viết, vẽ, tính toán và lưu tài liệu dùng ngoại tuyến, không cần API key.** Trợ lý Gemini là tính năng tùy chọn cần Internet và khóa API riêng. Không mở index.html ngay bên trong cửa sổ xem ZIP; cần giải nén toàn bộ thư mục để các tệp đi cùng được đọc đúng.

Tất cả script, CSS, icon và thư viện nằm trong thư mục sản phẩm. Bản chạy dùng script cổ điển, không cần ES module từ file://, CDN, service worker hoặc tải font mạng. PDF.js được bundle cùng phần xử lý worker để chạy trên luồng chính, nhận font/CMap/decoder từ dữ liệu nhúng; không tạo worker từ đường dẫn file://. Công thức dùng SVG glyph có sẵn, không tải font ngoài.

## Điểm mới 2.2 · capture theo chế độ, PDF xen trang câu hỏi

- Camera mặc định **chụp ảnh để dán**, không tạo trang. Mũi tên cạnh camera hoặc bộ chọn trong lúc khoanh vùng cho phép chọn **Tạo trang câu hỏi** cho riêng lần chụp đó.
- Nút mở câu hỏi nằm cố định tại khoảng trống phía trên vùng đề, kéo đổi vị trí được và lưu lại; chuột phải đổi tên. Đọc số câu/ý từ lớp chữ PDF hoặc Windows OCR, có Gemini đọc vùng ảnh khi cần và đã cấu hình.
- Nút **Xuất PDF** trên thanh trên xuất cả các trang ảo xen ngay sau trang gốc theo vị trí câu hỏi, kèm các trang giải tiếp theo.
- Chóp SA vuông góc đáy đặt SA phía trái bên trong, **thẳng đứng**, không nghiêng cả hình. Thêm 6 bút thành 10 kiểu, con trỏ viết là mũi tên gốc Windows.
- Smart Shape nhận được nét nhanh, chữ nhật/elip nghiêng, tam giác và tứ giác; giữ nét chữ/phác thảo không phù hợp thay vì ép thành hình. Có nút bật nhanh trong Thiết lập bút.

[Chi tiết và kiểm tra bản 2.2](docs/RELEASE-2.2.md).

## Điểm mới 2.1 · giảng bài từ vùng chụp

- Một nút **Máy tính & công thức**, ưu tiên hai Casio Windows 580/880; menu tài liệu chia nhóm và tìm nhanh. Khay ảnh chụp bỏ chữ để gọn hơn.
- **Chụp câu hỏi** trên thanh trên mở trang giảng có sẵn ảnh đề, nút × quay về tài liệu và nút ↗ gần vùng gốc để mở lại. Nét/lời giải và các trang tiếp theo được giữ sau khi đóng ứng dụng. **Chụp vùng trên thanh bút** tiếp tục dùng cho chụp/dán PNG.
- Trang mới mặc định giấy trắng; thêm trang ngay sau trang đang đứng, chuột phải có xóa trang và Undo.
- Đồ thị không lưới mặc định, trục đậm có mũi tên; thêm mẫu hàm, miền nhìn, đồ thị đạo hàm và diện tích giữa hai hàm. Thước/ê ke/đo góc có kéo, xoay, kẻ cạnh và bắt nét bút. Hình không gian có chỉnh góc và vị trí tên từng đỉnh.
- AI được chọn bốn model Gemini theo yêu cầu; mặc định `gemini-3.5-flash-lite`. Cho AI dựng thêm điểm, cạnh và phép dựng phụ thuộc tọa độ để hình có thể sửa tiếp.
- Undo dùng chung ảnh thay vì sao chép vào mỗi bước; giảm bộ đệm ảnh/đồ thị/PDF, OCR tự giải phóng khi không dùng. Máy Windows giả lập có chế độ tiết kiệm RAM; GPU lỗi có thể chạy `Inkulator.exe --software-rendering`.

[Chi tiết, giới hạn và kiểm tra bản 2.1](docs/RELEASE-2.1.md).

## Điểm mới 2.0 · gói tài liệu, máy tính đi kèm và OCR cục bộ

- Bộ cài có sẵn **hai bộ giả lập Windows gốc 580 và 880**, EXE/DLL và tài liệu đi kèm. Cài Inkulator sẽ cài luôn các tài nguyên đó, tạo lối tắt trong Start Menu / Inkulator; không cần giữ hai thư mục D:\Apps để mở máy. Đây là các bộ nhị phân gốc được cung cấp, không phải mã nguồn Casio để biên dịch. Cơ chế giấy phép của chương trình gốc vẫn áp dụng.
- **Thư viện có tổ chức:** mỗi sổ là một thư mục trong `Tai lieu / nhóm sổ / tên sổ–mã`. Đổi tên/nhóm sổ cập nhật thư mục. `Images` giữ nguyên byte ảnh PNG/JPEG/WebP; `PDF` giữ PDF gốc; `Pages` giữ nét/hình chỉnh sửa được dạng nén; `Previews` có PNG trang đã xem; `History` giữ 10 phiên bản nội dung. Ảnh/PDF trùng nhau dùng chung trong từng sổ. Ảnh xem trước là dữ liệu dẫn xuất, không nhân mười bản theo lịch sử.
- **Cài đặt → Tài liệu trên máy → Đổi nơi lưu thư viện…** chọn thư mục khác, sao chép và kiểm tra tài liệu; giữ bản ở nơi cũ. **Lưu thành…** chọn thư mục lưu bản sổ riêng. **Lưu bản snapshot** xuất gói `.ink` ZIP có đầy đủ tài nguyên để chuyển máy; mở được cả `.ink` và `.smath.json` cũ. Sổ cũ tự chuyển sang gói mới khi lưu; tệp JSON cũ vẫn được giữ.
- Danh mục và manifest dùng hai bản có checksum, ghi trực tiếp vào từng bản và phục hồi khi ghi dở; đường lưu mới không dùng rename, xử lý trường hợp EXDEV của hồ sơ Windows chuyển hướng. Ghi xong tài nguyên mới cập nhật manifest. Nét viết vẫn sửa/Undo bình thường; ảnh/PDF gốc không bị chuyển thành JSON base64 trên ổ đĩa.
- **Chụp vùng:** làm mờ/tối toàn cửa sổ; vùng kéo được hiện sáng, rõ. Ảnh chụp dựng PDF riêng theo yêu cầu, không làm trống cache PDF đang hiển thị. PNG chứa đúng PDF, nét và hình; bỏ bảng điều khiển. Công cụ **Chọn** kéo hình chữ nhật để chọn nhiều đối tượng; công cụ lasso vẫn chọn tự do.
- Icon ảnh màu đúng chức năng, gồm PDF đỏ, máy tính, ảnh, camera, bút, tẩy và hình học. Các icon tải từ Microsoft Fluent/vscode-icons có ghi nguồn và giấy phép, kết hợp SVG riêng. Bảng màu bút dùng đỏ đậm `#C00000`, xanh `#0070C0`, xanh lá `#008000`, vàng `#FFC000`, tím `#7030A0`.
- **Gemini** dùng khóa mặc định theo cấu hình bản cài, không cần nhập lại. Khóa riêng có thể thay trong Cài đặt hoặc trở về khóa mặc định. Đã kiểm tra yêu cầu thật từ vùng PDF. Khóa mặc định đi cùng tài nguyên bộ cài theo yêu cầu; đây không phải bí mật không thể trích xuất khỏi chương trình. Khóa đang sử dụng được mã hóa trong hồ sơ Windows. Gemini vẫn cần Internet và hạn mức tài khoản.
- **OCR viết tay tách khỏi Gemini:** CoMER/ink-on và ONNX Runtime chạy bằng Web Worker trên CPU, có đầy đủ model/WASM trong bộ cài. Không cần mạng, API key, Python hoặc tải model lần đầu. Mặc định tắt; bật nhận diện cục bộ trong Cài đặt hoặc khoanh vùng và chọn Đẹp công thức. Xem/sửa LaTeX, chọn cách đọc khác và Undo khi thay nét. Model nhận diện thống kê, không phải cơ sở dữ liệu bao phủ tuyệt đối mọi chữ viết; chưa bảo đảm đúng 100%.

[Thay đổi và kiểm tra bản 2.0](docs/RELEASE-2.0.md).

## Lịch sử bản 1.9 · tài liệu trên máy và trợ lý Toán 12

- **Lưu như tài liệu:** bản Windows tự tạo tệp `.smath.json` cho mỗi sổ trong **Documents / Inkulator / Tai lieu**, tên tệp có tên sổ và mã riêng. Autosave dùng khoảng chờ đã cài, ghi tệp tạm rồi thay thế tệp chính; giữ tối đa 10 bản trước trong **Khoi phuc**. PDF gốc trong IndexedDB được nhúng vào tệp để mở lại độc lập. Đóng cửa sổ đợi ghi xong tài liệu, gồm cả nét vừa viết. Bộ nhớ trình duyệt đầy vẫn có thể lưu tệp trên máy.
- **Ctrl+S** lưu ngay, **Ctrl+Shift+S / Lưu thành…** chọn tệp khác và tiếp tục tự lưu vào tệp đó. Nút **Tài liệu trên máy** trên thanh trên mở danh sách, tệp khác, thư mục lưu và các phiên bản khôi phục. Khi bộ nhớ trình duyệt trống, ứng dụng khôi phục từ những tệp đã ghi. Bản web tiếp tục có nút tải tệp và bộ nhớ trình duyệt.
- **Máy tính 580 / 880:** nút máy tính có mũi tên mở bộ chọn. Có bản 580 web ngoại tuyến, **fx-580VN X Windows** và **880BTG BITEX Windows**. Hai máy Windows dùng EXE và DLL đã cài trên máy, mở bằng cửa sổ gốc, đưa cửa sổ đang chạy ra trước và có nút **Chèn ảnh máy**. Mặc định tìm trong hai thư mục `D:\Apps` đã cấu hình; **Chọn EXE…** đổi vị trí. Bộ cài Inkulator không đóng gói các chương trình giả lập thương mại này; bản iPad dùng máy tính web.
- **Vòng công cụ hình học** chừa vùng tên đỉnh/tay nắm, tìm chỗ trống quanh hình. Kéo nút xanh để đặt ở vị trí thuận tay; chạm để mở vòng.
- **✦ Khoanh vùng AI:** kéo hình chữ nhật trên trang, rồi chọn **Giải bài / Gợi ý / Đẹp công thức / Vẽ hình / Kiểm tra bài / Bài tương tự**. Chỉ ảnh vùng đã chọn được gửi tới Gemini khi chọn tác vụ. Kết quả có bản xem trước, sửa LaTeX và chèn vào trang. Hình gợi ý dùng mô hình hình học chỉnh sửa được; lời giải dài được chia trang trong một bước Undo. Các bài/gợi ý hướng tới chương trình lớp 12.
- **Nhận diện viết tay** trong Cài đặt **mặc định tắt**. Khi bật và có Internet, chờ dừng bút rồi nhận diện nhóm nét vừa viết. Xem/sửa LaTeX trước khi **Thay nét trong vùng bằng công thức**; Undo lấy lại nét gốc. Ứng dụng từ chối thay nếu nét gốc đã đổi. Nhận diện có thể sai; không bảo đảm 100% độ chính xác.
- **Gemini 3.5 Flash-Lite:** thêm/đổi/xóa khóa và kiểm tra kết nối trong Cài đặt. Windows mã hóa khóa bằng `safeStorage`/DPAPI trong hồ sơ ứng dụng; khóa không nằm trong mã nguồn, bộ cài hoặc tệp sổ tay. Bản web/iPad giữ khóa trong bộ nhớ của phiên, xóa khi tải lại/đóng trang. Ngoại tuyến không gửi yêu cầu; có hủy, thử lại và thông báo hạn mức/lỗi kết nối. Tính phí theo tài khoản API của người dùng.

Chạy `npm run test:teaching` và `npm run test:teaching-browser`; xem [báo cáo 1.9](docs/RELEASE-1.9.md).

## Điểm mới 1.8 · chụp vùng, trang cân giữa và công cụ tròn

- **Chụp vùng** trên thanh trên hoặc thanh bút → kéo hình chữ nhật trên trang viết → nhấc bút → **Dán ảnh**. Ảnh PNG lấy giấy, hình, công thức và nét viết; bỏ khung chọn và các bảng điều khiển. Kéo theo hướng nào cũng được; Esc hoặc nút × để hủy. Thao tác chụp không thay đổi sổ tay; dán ảnh hỗ trợ Undo/Redo.
- Bản Windows tự lưu mỗi ảnh trong thư mục `captures` thuộc hồ sơ ứng dụng và sao chép vào clipboard Windows. Khi clipboard bị chặn, ảnh vẫn sẵn để dán trong ứng dụng. Bản web giữ ảnh gần nhất trong IndexedDB. Khay nhỏ **Dán ảnh chụp** cho phép dán lại sau khi mở ứng dụng; nút **↓** tải PNG ra thư mục người dùng chọn. Tính năng chụp nội dung trang đang nhìn thấy.
- Mở sổ, chuyển trang, thêm trang và nhập trang PDF đều mặc định **vừa cả trang**, cân giữa vùng viết. Nút **↔** chuyển sang vừa chiều rộng. Đổi kích thước cửa sổ hoặc danh sách trang sẽ tự căn lại; khi đã zoom/kéo trang thủ công, ứng dụng giữ mức zoom đó.
- Chọn hình → chạm nút tròn xanh sát hình để mở/thu vòng công cụ. Các nút tròn dành cho di chuyển, xoay 3D, nối điểm, trung điểm, đổi tên, hướng nhìn, công cụ khác và xóa. Chọn công cụ xong vòng tự thu; nút ✓ kết thúc phép dựng.
- **⋯** chia thành **Dựng hình / Đo / Ký hiệu / Chỉnh hình**. Chỉnh hình có phóng vừa hình, nhân bản, ẩn/hiện tên điểm, xóa nét dựng cuối, xóa phép dựng thêm, ẩn/hiện nét khuất và đổi màu nhanh. Kích thước, sao chép, khóa và thuộc tính vẫn truy cập được bằng bút.
- Trung điểm, chia cạnh, đo độ dài: chạm vào giữa cạnh để chọn cả hai đầu. Dựng song song/vuông góc: chạm cạnh rồi chọn điểm đi qua. Chạm gần đỉnh vẫn chọn riêng từng điểm như trước.

Chạy `npm run test:capture-layout` để kiểm tra chụp, dán, lưu ảnh, căn trang và vòng công cụ. [Báo cáo 1.8](docs/RELEASE-1.8.md).

## Điểm mới 1.7 · hình học dành cho bút cảm ứng

- Khung chọn và tay nắm của khối 3D bám theo hình chiếu thực, gồm cả đường dựng thêm. Kéo góc giữ đúng góc đối diện và tỷ lệ hình. Hai thanh thao tác nằm gần hình, theo khi kéo/zoom và được giới hạn trong màn hình.
- Bỏ toàn bộ cụm **Bước giảng**, nút hiện từng bước và việc ẩn nét theo `currentStep` của tệp cũ. Mở sổ cũ sẽ hiện đầy đủ phép dựng.
- Thêm **Giao đường–mặt**, **Giao hai mặt phẳng**, **Chiếu lên mặt phẳng**, **Khoảng cách điểm–mặt**, **Góc đường–mặt**, **Góc hai mặt phẳng**, **Vuông góc chung**, **Điểm chia cạnh** và **Tiếp tuyến đường tròn**. Tính bằng tọa độ, có kiểm tra suy biến, lưu/mở và cập nhật theo kích thước khối. Không tính giao giả từ hình chiếu.
- Chọn điểm bằng cách chạm bút, có hướng dẫn thứ tự; có thể chọn lại đỉnh chung khi dựng hai mặt. Điểm chia cạnh có nút ⅓, ½, ⅔ và thanh trượt tỉ lệ; một lần điều chỉnh tạo một bước Undo.
- **Đổi tên điểm**: chạm điểm rồi chạm chữ trong bảng tên, hoặc dùng bàn phím trên màn hình. Nhãn tại các điểm trùng đỉnh được gộp, ví dụ `A=H`.
- **Hướng nhìn** có mẫu bài tập với cạnh đáy ngang, đổi hướng đáy, phối cảnh, chính diện, nhìn từ trên. Hình mới vẫn tĩnh, cạnh thấy liền/cạnh khuất đứt. Thư viện ghi thêm ký hiệu khối và giả thiết để dễ chọn.

Tham khảo trực tiếp [hướng dẫn hình học Mathvera](https://mathvera.com/vi/huong-dan/#hinh-khong-gian), [tài liệu dạy hình không gian GeoGebra](https://www.geogebra.org/resource/n3unZ5Vg/p9TqufE9Fekx1eG1/material-n3unZ5Vg.pdf) và [đề minh họa Toán được công bố trên cổng Chính phủ](https://xaydungchinhsach.chinhphu.vn/de-thi-minh-hoa-mon-toan-tot-nghiep-thpt-tu-nam-2025-119231229180528163.htm). Bản này tập trung các công cụ dựng hình; chưa có toàn bộ tính năng của Mathvera như hình khai triển, tách thiết diện thành hình thật hoặc mặt cầu ngoại tiếp khối tùy ý.

Chạy `npm run test:geometry-pen` để kiểm tra khung sát hình, kéo góc, dựng hình/đổi tên bằng bút, hướng nhìn và lưu/mở. Có thể thêm WebKit bằng `INKULATOR_WEBKIT_EXECUTABLE` trỏ tới binary Playwright phù hợp. [Báo cáo 1.7](docs/RELEASE-1.7.md).

## Điểm mới 1.6 · bộ cài, bút và giao diện gọn

- Bộ cài Windows `.exe`, shortcut Desktop/Start Menu, lựa chọn thư mục cài và trình gỡ cài đặt. Dữ liệu giữ qua lần khởi động lại; toàn bộ thư viện và Casio đóng gói ngoại tuyến.
- Nhấp đúp khi đang viết không mở thuộc tính hoặc chọn nét nữa. Muốn chỉnh đối tượng, chuyển sang **Chọn** trước. Bút được ưu tiên hơn ngón tay; bỏ qua chạm lòng bàn tay khi đang viết và trong 450 ms sau lần dùng bút. Giữ điểm cuối khi nhấc bút, hoàn tất nét khi chuyển ứng dụng.
- Nét đang viết có lớp phủ riêng và đường cong được cập nhật nối tiếp. Nét đã lưu dùng cache Path2D; bỏ qua nét ngoài vùng nhìn. Chế độ **Tự động / Máy yếu / Độ nét cao** giới hạn mật độ và số pixel canvas để giảm bộ nhớ trên Retina. Thumbnail chờ tạm ngưng viết mới cập nhật.
- Undo nét bút chỉ lưu đối tượng mới, giữ cả nét xuyên trang và trang tự thêm. Mặc định **500 bước**, có thể đặt **10–2.000** trong Cài đặt; giới hạn bộ nhớ vẫn áp dụng. Các thay đổi đối tượng khác tiếp tục dùng snapshot và tương thích Undo/Redo nét bút.
- Autosave mặc định **30 giây sau thao tác cuối**, chỉnh được **1–300 giây**; đợi luồng rảnh, không lưu giữa nét. Lưu thêm khi chuyển ứng dụng/đóng cửa sổ. Thiết lập mặc định cũ 2 giây/60 Undo được nâng cấp một lần.
- Hai hàng công cụ 87 px, hàng chèn dùng icon SVG có tên truy cập và tooltip. Bảng công cụ nổi rộng mặc định 310 px, kéo vạch mép để đổi độ rộng; kéo về mép để thu gọn, bấm **‹** để mở lại. Danh sách trang cũng kéo đổi rộng/thu gọn được. Phím mũi tên trên vạch điều chỉnh hỗ trợ bàn phím.
- Dựng & đo bổ sung **Trung trực**, **Tròn tâm–điểm** và **Đối xứng qua tâm**. Tọa độ phụ thuộc cập nhật khi kéo đỉnh, dùng tiếp cho phép dựng và giữ khi lưu/mở. Trung trực và đường tròn áp dụng cho 2D; đối xứng tâm dùng được trong 2D/3D.

Đã kiểm tra Chrome, Edge, WebKit với kích thước iPad và bản desktop đóng gói. Chưa đo độ trễ Apple Pencil trên iPad thật; không cam kết mọi thiết bị hoặc mọi tài liệu đều đạt 60 fps. Xem [báo cáo bản 1.6](docs/RELEASE-1.6.md).

## Điểm mới 1.5 · Casio fx-580VN X ngoại tuyến

Bố cục Casio được thu gọn: thanh nút mini, bỏ bóng/nền thừa quanh thân máy; màn hình LCD phụ ghim sát phía trên máy. Các nút `=`, `▣`, `ƒx` ở chân cửa sổ lần lượt chèn kết quả, chèn ảnh LCD và mở công cụ sổ tay. Bản chỉnh bố cục này không chạy lại kiểm thử hoặc chụp ảnh theo yêu cầu.

- Nhấn **Máy tính** trên thanh công cụ (hoặc C) để mở Casio ngay trong sổ tay. Kéo tiêu đề để di chuyển, kéo góc phải dưới hoặc chạm **− / +** để đổi kích thước; có ghim vị trí, thu gọn, phóng to và đóng. Đóng/mở lại giữ chế độ, biểu thức và bộ nhớ trong phiên. Có thể thao tác bằng các phím trên thân máy với bút cảm ứng.
- Giữ nguyên bộ tính toán, giao diện máy, LCD và đủ 12 menu của [Tikz-Physics/casio-fx580vnx](https://github.com/Tikz-Physics/casio-fx580vnx), chốt commit `b180a74e8a900b56f73914e74d98956605e75142`. Các chức năng mô phỏng và giới hạn toán học theo repo này; không khẳng định tương đương tuyệt đối phần cứng Casio.
- **Chèn kết quả** đưa biểu thức/kết quả hoặc nội dung LCD của chế độ đang dùng vào trang. **Chèn ảnh LCD** lấy PNG 768 × 290 từ bộ dựng ảnh gốc; ảnh được chọn sẵn, kéo/đổi kích thước như ảnh thường. Nút camera của Casio sao chép/tải PNG; khi clipboard bị chặn sẽ tải PNG thay thế. **Công cụ sổ tay** mở bộ tính toán/đồ thị trước đây; nút Casio trong đó trở về máy Casio.
- Source, hình máy và font đều đóng gói cục bộ. Nút cập nhật được đổi thành thông tin **Offline**, không tìm bản mới trên mạng. Casio chạy trong iframe cô lập, không dùng chung bộ tính toán hoặc phím tắt với trang viết. Các tiện ích màn hình LCD phụ, zoom, nhật ký phím và âm thanh của repo vẫn nằm trên thanh bên trong cửa sổ.
- Toàn bộ 16 tệp được Git quản lý ở bản nguồn nằm nguyên vẹn trong `vendor/casio-fx580vnx/upstream/`, gồm HTML, ZIP nguồn, font, icon, tài liệu và launcher gốc. Ứng dụng không chạy các tệp BAT. `UPSTREAM.json` lưu SHA-256 từng tệp; `BUILD.json` lưu hash phần tính toán và bản chạy. Chạy `npm run vendor:casio` để dựng lại bản nhúng; script xác minh source và bảo đảm JavaScript gốc không bị sửa. Xem [ghi nguồn và giấy phép font](vendor/casio-fx580vnx/NOTICE.md).

## Các tính năng từ 1.4 · giao điểm, trọng tâm và trang nối liền

- **Giao điểm hai đường:** chọn hình → **Dựng & đo → Giao điểm** rồi chạm hai cạnh/đường đã dựng. Có tô sáng đường đang chọn. Dùng danh sách **Điểm, đường & phép dựng** trong thuộc tính nếu đường chồng nhau. Hỗ trợ đường nối, đường chéo, đường song song/vuông góc, trung tuyến và cạnh thiết diện trong cùng hình; giao của đường thẳng kéo dài cũng được tính.
- **Trọng tâm và nối tới G:** chọn **Trọng tâm**, chạm ba đỉnh của tam giác cần xét. G và ba trung tuyến cập nhật theo đỉnh. Dùng **Nối điểm** để nối bất kỳ đỉnh/điểm phụ tới G. Có thêm **Trung tuyến** (chọn đỉnh xuất phát trước) và **Phân giác** (đỉnh góc là điểm thứ hai).
- Giao điểm, trung điểm, trọng tâm và chân đường phụ đều là dữ liệu phụ thuộc, dùng tiếp để nối hoặc dựng hình và giữ khi lưu/mở. Đường song song/trùng nhau hoặc hai đường chéo nhau trong không gian có thông báo, không tạo giao điểm giả từ hình chiếu. Công cụ giao điểm hiện áp dụng cho đường thẳng trong hình đang chọn, chưa tính giao với đường tròn hoặc nét viết tự do.
- **Thanh dựng hình gọn:** chỉ giữ Nối điểm, Trung điểm, Trọng tâm, Dựng & đo, Xoay 3D khi phù hợp và Xong. Các công cụ khác nằm trong menu; danh sách quản lý phép dựng trong thuộc tính có thể thu gọn.
- **Mọi trang nối sát nhau:** sổ tay thường và PDF cùng cuộn liên tục. Khi kéo/bánh xe/thanh cuộn xuống gần cuối, ứng dụng tự nối thêm trang trắng cùng khổ và kiểu giấy. Không tạo trang chỉ vì render, phóng to/thu nhỏ hoặc mở toàn màn hình. Có thể tắt **Cuộn tới cuối tự thêm trang** trong thanh bút **⋯**; tùy chọn được nhớ. Giới hạn 300 trang/sổ tay.
- **Viết xuyên trang:** một nét bút đi qua ranh giới giữ tọa độ, áp lực và được lưu đúng từng trang. Undo/Redo xử lý cả lần viết, kể cả trang vừa tạo khi viết xuống cuối. Kéo ảnh/hình sang trang kế chuyển đối tượng sang trang đó, giữ ID và dữ liệu chỉnh sửa.
- **Toàn màn hình trên header:** nút **⛶** luôn có trên thanh công cụ, chạm lại để thoát; trạng thái và nhãn nút cập nhật khi trình duyệt thoát toàn màn hình.

## Các tính năng từ 1.3 · ảnh gốc, góc nhìn chuẩn và PDF

- **Ảnh gốc mặc định:** Ctrl+V, Dán ảnh và Chọn ảnh đều giữ nguyên dữ liệu màu, nền, alpha và độ phân giải của tệp. Đổi kích thước trên trang không làm mất bản gốc. Nhấp đúp ảnh nếu muốn chủ động áp dụng nét đen / nền trong suốt.
- **Bỏ thanh tiêu đề và footer:** phần công cụ còn 79 px; bỏ chế độ F8. Trạng thái lưu nằm dưới tên sổ tay, số trang và nút trước/sau nằm trong cụm điều hướng nhỏ trên vùng giấy. Hướng dẫn nằm trong menu; toàn màn hình có nút trên thanh công cụ.
- **Góc hình học kiểu sách giáo khoa:** hình hộp, lập phương, chóp và lăng trụ chèn mới có cạnh đáy nằm ngang, cạnh đứng thẳng và chiều sâu xiên. Nét khuất xét theo đúng phép chiếu. Chọn **Xoay 3D** để chuyển sang góc nhìn xoay tự do; **Góc nhìn gốc / Góc chuẩn** trở về kiểu sách giáo khoa. Dữ liệu tọa độ và số đo vẫn giữ nguyên.
- **Cuộn PDF nối tiếp:** dùng bánh xe, công cụ **Kéo trang**, thanh cuộn bên phải hoặc nút trang trước/sau. Hai trang ở ranh giới có thể cùng hiện; chạm viết lên trang nào thì nét được lưu vào trang đó.
- **Độ nét PDF theo vùng đang xem:** lấy chi tiết từ PDF gốc theo zoom và mật độ điểm ảnh màn hình. Chỉ dựng những vùng đang nhìn, có bộ nhớ đệm và hủy phần tải đã rời màn hình. PDF ảnh quét vẫn phụ thuộc độ nét nguồn. Tài liệu tối đa 40 MB; nhập dải trang trong giới hạn 300 trang của sổ tay, không còn giới hạn 30 trang/lần.

## Các tiện ích bút từ 1.2

- **Ctrl+V / Dán ảnh:** dán ảnh chụp từ clipboard Windows bằng Ctrl+V hoặc nút **Dán ảnh** trên thanh công cụ/thanh bút. Ảnh giữ nguyên bản gốc, được chọn sẵn và chuyển về chế độ di chuyển.
- **Kéo, đổi kích thước:** bốn nút góc lớn giữ tỷ lệ; có nút xoay 2D. Chọn **Kích thước** để nhập rộng/cao/X/Y, tăng giảm 10%, xoay 15° hoặc đưa hình vào giữa vùng nhìn. Tùy chọn giữ tỷ lệ cho phép đổi kích thước tự do bằng bút.
- **Nét khuất 3D:** xét che khuất theo tọa độ và góc nhìn hiện tại. Khối hộp ở góc nhìn mặc định có đúng ba cạnh khuất gặp nhau tại đỉnh sau. Đường nối, đường chéo, đường cao và thiết diện tự chia nét liền/nét đứt; có thể chọn thủ công **Tự động / Liền / Đứt** khi dựng.
- **Hình cầu mới:** đường bao tròn sạch, xích đạo liền phía trước/đứt phía sau, tâm O và bán kính r; bật thêm kinh tuyến khi cần. Trụ/nón/nón cụt dùng đường tròn đáy và đường sinh tiếp tuyến, bỏ lưới cạnh rối.
- **Thanh bút kéo được:** bút, tẩy, chọn, kéo trang, lasso, dán ảnh, bàn phím và tùy chọn. Chạm **⋯** để chọn nhiều bằng từng lần chạm, chọn tất cả, sao chép/dán/xóa, giữ tỷ lệ, bắt tọa độ/góc và bỏ chọn. Kéo dấu **⋮** để di chuyển thanh; chạm để thu gọn.
- **Bàn phím trên màn hình:** tự mở khi dùng bút chạm ô nhập; nút **⌨** mở thủ công, kể cả trong hộp thoại. Có Toán, số, ABC, ký tự LaTeX và tiếng Việt; dấu thanh áp vào nguyên âm gần nhất trước con trỏ. Có chọn hết, xóa, di chuyển con trỏ, ô tiếp và Enter. Các trường số có thể nhập số âm/thập phân mà không cần phím vật lý.
- **Di chuyển / Xoay 3D riêng:** các nút trên thanh chọn cho phép chuyển rõ ràng giữa kéo hình và xoay khối, không cần giữ Alt. Nút menu trang luôn hiện khi dùng bút; lưu, Undo/Redo, mở tệp và xuất đều có nút trên giao diện.

**Clipboard cục bộ:** quyền đọc clipboard phụ thuộc trình duyệt/chính sách Windows. Nếu nút Dán ảnh bị chặn, hộp thoại có ô chạm giữ → **Dán** và nút **Chọn ảnh trong máy**. Ctrl+V vẫn dùng sự kiện dán gốc của trình duyệt. Sao chép đối tượng trong ứng dụng dùng dữ liệu nội bộ của phiên; không xuất nét bút thành ảnh vào clipboard hệ điều hành.

## Các tính năng từ 1.1 · dành cho giáo viên

- **Header gọn:** bản 1.6 giữ hai hàng công cụ cao tổng cộng 87 px với icon dễ chạm, không có thanh tiêu đề hoặc footer trong vùng ứng dụng.
- **Nét đen, rõ, nền trong:** hình học mới dùng nét đen 2.6 px, độ đục nét 100%, bỏ màu tô mặt. Hình 3D chèn mặc định là hình chiếu tĩnh để không xoay ngoài ý muốn; chọn **Xoay 3D** khi muốn chỉnh góc nhìn. Có thể bật Live 3D trong thuộc tính.
- **Bắt điểm thông minh:** chọn hình rồi dùng thanh nổi Nối điểm / Trung điểm / Đo cạnh / Vuông góc / Song song / Đo góc. Con trỏ bắt vào đỉnh, trung điểm và điểm phụ; nối tới trung điểm cũng giữ đúng định nghĩa khi kéo đỉnh. Shift khi kéo đỉnh 2D bắt tọa độ theo bước 0.5.
- **Thiết diện thật:** với khối đa diện, chọn Thiết diện rồi chọn 3 điểm không thẳng hàng, kể cả trung điểm mới dựng. Thuật toán cắt cạnh khối bằng mặt phẳng và sắp xếp đa giác; diện tích theo tọa độ, cập nhật khi đổi a/b/h. Có nút tô nhẹ thiết diện và các góc nhìn chuẩn.
- **PDF từ máy:** nhấn Tài liệu PDF → Chọn PDF, hoặc thả tệp vào vùng viết; chọn dải trang, rồi viết/highlight/chèn hình và công thức trên lớp riêng. Giữ bản PDF gốc để zoom, xuất lại và tải nguồn. Khi xuất PDF, các trang PDF nguồn giữ nội dung vector và lớp chữ, chú thích được ghép phía trên theo thứ tự lớp.
- **Công thức đẹp:** nhấn Công thức hoặc gõ một biểu thức vào công cụ văn bản. Ví dụ `f(x)=sqrt(x^2+1)/(x-2)` được nhận dạng và dàn thành căn/phân số thật, có xem trước. Hỗ trợ LaTeX như `\frac`, `\int`, `\begin{cases}`, ma trận. Nhấp đúp để sửa; công thức lưu nguồn và dựng SVG khi hiển thị.
- **Ảnh bản vẽ:** mặc định giữ nguyên ảnh gốc; nhấp đúp để chọn tách nền trắng, chuyển nét thành đen và làm đậm. Có thể khôi phục ảnh gốc sau khi xử lý.
- PDF, ảnh, đồ thị và công thức mặc định giữ tỷ lệ khi kéo đổi kích thước để tránh méo chữ/hình. Giữ Alt trong lúc kéo nút đổi kích thước nếu cần biến đổi tự do.

**Cách dùng nhanh:** chọn tam giác → Trung điểm → nhấp B, C → Nối điểm → nhấp A, M. Với lập phương, dựng 3 trung điểm cạnh qua A rồi chọn Thiết diện và nhấp 3 trung điểm. Điểm bị chồng khi chiếu có thể chọn từ danh sách trong panel.

**Phạm vi rõ ràng:** nhận dạng công thức hiện áp dụng cho biểu thức gõ/LaTeX và văn bản trích xuất từ PDF; chưa có OCR chữ viết tay hoặc PDF ảnh quét. PDF được chỉnh qua chú thích/lớp phủ, chưa sửa trực tiếp từng ký tự nguồn. Thiết diện hiện hỗ trợ khối đa diện của thư viện, không áp dụng cho mặt tròn xoay hoặc giao tuyến tổng quát.

## Phạm vi chức năng đã triển khai

### Sổ tay và viết tay

- Vẽ bằng Pointer Events, pointer capture và các điểm lấy mẫu liên tiếp; nét quadratic; hỗ trợ dữ liệu áp lực bút. Bút bi, mực theo áp lực, chì, lông, highlight và laser tạm thời.
- Thay đổi màu, độ dày, độ trong suốt; lưu preset theo loại bút khi chuyển loại trong hộp thiết lập bút.
- Tẩy một phần **chia dữ liệu nét thành các đoạn còn lại**; tẩy cả nét và tẩy vùng chữ nhật. Tẩy chỉ tác động lớp nét bút, không phá ảnh/hình học bên dưới.
- Chọn nhiều đối tượng bằng Ctrl+A hoặc lasso; kéo di chuyển, đổi kích thước, xoay ±15°, thu/phóng, đổi màu/độ dày, sao chép/cắt/dán trong ứng dụng, nhóm/bỏ nhóm và khóa/mở khóa. Nhóm giữ tỷ lệ khi đổi kích thước.
- Undo/Redo dùng giao dịch dữ liệu cho cả nét bút, hình học, đồ thị, văn bản, kiểu nét và thao tác trang.
- Trang mới, nhân bản, đổi tên, xóa, di chuyển thứ tự bằng menu hoặc kéo thumbnail. Nhiều sổ tay, trường thư mục và tìm kiếm theo tiêu đề/thư mục trong thư viện.
- Giấy trắng, ô ly nhỏ/lớn, ngang, chấm, Oxy, tối. Khổ A4/A3/ngang/vùng rộng; vùng nhìn kéo tự do; zoom tại con trỏ. Viền đứt nét đánh dấu trang xuất.
- Đoạn thẳng, tia có mũi tên, mũi tên, nét đứt, tròn/elip, chữ nhật/vuông, tam giác, lục giác và đường Bézier; Shift khóa góc hoặc tỷ lệ.
- Smart Shape nhận dạng có ngưỡng cho nét thẳng, đường tròn và chữ nhật. Thước thẳng có vạch chia; đây là trợ giúp trực quan, không phải công cụ đo kích thước thực của màn hình.

### Graph Studio

- Nhiều công thức, màu riêng, bật/tắt, pan/zoom, đánh dấu điểm, tham số a/b/c/d/t và slider.
- Hàm đa thức, phân thức, căn, trị tuyệt đối, lượng giác, mũ/log và từng đoạn qua `điều_kiện ? biểu_thức_1 : biểu_thức_2`. Góc trong đồ thị dùng **radian**.
- Ví dụ: `y=x^3-3x`, `a*x^2+b*x+c`, `sin(x)`, `log(x)`, `x<0 ? -x : x`.
- Đường ẩn như `x^2+y^2=9`, `x^2/9+y^2/4=1`, `x^2-y^2=1` được vẽ bằng contour lấy mẫu.
- Lấy mẫu thích nghi cho hàm số; bỏ đoạn không hữu hạn hoặc có sai số giữa điểm quá lớn để tránh nối giả qua cực. Đã kiểm tra `1/(x-2)`.
- Tìm nghiệm đổi dấu/điểm mẫu, cực trị qua đổi dấu đạo hàm số, giao hai hàm, đạo hàm/tiếp tuyến tại x₀, tích phân Simpson thích nghi và bảng giá trị.
- Đồ thị chèn vào trang giữ công thức, màu, view, tham số, trục, điểm đánh dấu, tiếp tuyến và vùng tô. Nhấp đúp để sửa, nhấn **Cập nhật đồ thị** để áp dụng.

**Giới hạn tính toán số:** nghiệm bội chẵn có thể bị bỏ sót nếu không trùng điểm mẫu; kết quả không phải danh sách nghiệm đầy đủ được chứng minh. Khảo sát chỉ áp dụng cho `y=f(x)`, với biểu thức thứ nhất hoặc hai biểu thức đầu khi tìm giao. Tích phân phải trên miền liên tục; báo lỗi khi không hội tụ, không giải tích phân suy rộng. Sai số mục tiêu tích phân 10⁻⁸, có giới hạn số lần đánh giá. Contour có độ phân giải hữu hạn, có thể bỏ sót thành phần nhỏ. Chưa tự xác định/vẽ tiệm cận hay CAS đại số.

### Hình học

- 18 mẫu 2D gồm các loại tam giác, tứ giác, đa giác đều, đường tròn và các cấu hình trung tuyến/đường cao/phân giác/nội tiếp/ngoại tiếp/trọng tâm.
- Kéo đỉnh tam giác thường, sửa tọa độ, hiện tên/số đo; trung điểm, trung tuyến, đường cao và các tâm được tính lại theo định nghĩa. Có nối đỉnh, trung điểm, song song/vuông góc qua đỉnh.
- Tam giác đều/cân/vuông, vuông/chữ nhật có thao tác giữ ràng buộc cơ bản. Với hình bình hành/thoi/thang và đa giác đều, kéo nút đỉnh **tịnh tiến cả hình** để giữ mẫu; chưa có bộ giải ràng buộc tổng quát hoặc nhập độ dài/góc tùy ý.
- 13 mô hình không gian: lập phương, hộp chữ nhật, chóp đáy vuông, chóp SA vuông góc đáy, tứ diện đều, lăng trụ tam giác/lục giác, chóp cụt, trụ, nón, nón cụt, cầu và Oxyz.
- **Bộ dựng 3D bằng phần mềm**: đỉnh/mặt/cạnh là dữ liệu tọa độ thực 3 chiều, xoay bằng ma trận, chiếu xiên kiểu sách giáo khoa hoặc trực giao lên Canvas 2D, xét che khuất bằng tia nhìn và mặt khối. Không cần WebGL. Mặt tròn xoay có lưới xấp xỉ cho dữ liệu mặt; nét vẽ dùng đường bao, cung và đường sinh tính riêng.
- Khối mới mặc định tĩnh. Chọn **Xoay 3D** trên thanh nổi để kéo chỉnh góc nhìn, hoặc bật Live 3D để kéo bên trong xoay trực tiếp; **Alt+kéo** hoặc kéo gần biên để di chuyển. Thay đổi a/b/h, mặt/cạnh/cạnh khuất, nhãn, màu và độ trong suốt. Live 3D hoặc hình chiếu tĩnh giữ góc nhìn. Cả hai chế độ đều giữ dữ liệu gốc trong JSON.
- Nối đỉnh, trung điểm và đường cao cho các khối chóp hỗ trợ; chọn mặt bằng danh sách, chọn hai đỉnh để đo khoảng cách. Diện tích mặt, toàn phần, thể tích và khoảng cách điểm–mặt phẳng tính theo tọa độ, không theo pixel. Panel vectơ hỗ trợ tích vô hướng/có hướng, góc và kiểm tra song song/vuông góc có dung sai.
- Ví dụ chóp SA ⊥ (ABCD), AB=4, SA=6 có V=32; lập phương a=3 có V=27, S=54.

Chưa có chọn cạnh/mặt bằng ray-casting trực tiếp, mặt phẳng tự do ngoài khối, giao tuyến hai mặt phẳng, góc nhị diện hoặc bộ dựng hình theo mọi giả thiết. Các công cụ này không được đưa ra dưới dạng nút giả. Mô hình tròn xoay chưa có chọn từng đỉnh phụ.

### Máy tính và công cụ toán

- Máy tính nổi kéo được, thu nhỏ, đổi kích thước và ghim; nhập bàn phím, lịch sử, Ans và các ô nhớ A–F/X/Y/M với STO/RCL.
- CALC: số học, ngoặc, lũy thừa, căn, giai thừa, C/P, gcd/lcm, log, lượng giác, hyperbolic và DEG/RAD. `sin(30)` ở DEG và `sin(pi/6)` ở RAD cho 0.5. `sin(30°)` nhận biết độ tường minh.
- **S⇔D** chuyển biểu diễn hữu tỉ chính xác và thập phân khi phép tính hữu tỉ được hỗ trợ; `1/2+1/3` trả `5/6`. Không gán nhãn “chính xác” cho căn vô tỉ hoặc kết quả lượng giác gần đúng. Phần trăm nhập dưới dạng `/100`; ký hiệu `%` là phép lấy dư.
- EQUATION: bậc 1–3 (có nghiệm phức) và hệ tuyến tính 2–3 ẩn, phân biệt vô nghiệm/vô số nghiệm. SOLVE có kiểm tra hội tụ. TABLE tối đa 201 dòng.
- MATRIX tối đa 4×4, VECTOR, COMPLEX bằng biểu thức có parser; STATISTICS tính trung bình/trung vị/phương sai tổng thể/độ lệch chuẩn/min/max và hồi quy tuyến tính.
- Chèn kết quả hoặc bảng vào trang, chuyển công thức sang Graph Studio. Lịch sử và bộ nhớ máy tính ở phiên hiện tại; muốn giữ lâu dài hãy chèn kết quả vào sổ tay.
- Công cụ toán chèn ký hiệu, phân số có gạch ngang, căn có nét phủ, ma trận/bảng, mẫu giới hạn/tích phân/tổng/vectơ/hệ phương trình và bảng biến thiên/xét dấu chỉnh tay. Nhấp đúp để sửa. Công cụ Công thức mới hỗ trợ dàn LaTeX bằng SVG, gồm phân số, căn, tích phân, ma trận, hệ phương trình và công thức nhiều dòng. Các mẫu bảng cũ vẫn chỉnh từng ô được. Không thực thi macro tùy ý hoặc tải gói TeX từ mạng.

## Lưu, phục hồi và xuất

- Tự động lưu thư viện trong **localStorage** khi được phép, mặc định sau 30 giây tạm ngưng thao tác và khi chuyển ứng dụng. Dòng dưới tên sổ tay báo thành công hoặc yêu cầu tải tệp thủ công. Sổ tay/trang/đối tượng giữ ID khi phục hồi cục bộ.
- **Ctrl+S** tải `.smath.json` gồm toàn bộ dữ liệu gốc; đây là bản sao lưu có thể chỉnh sửa. Menu có snapshot ghi ngày giờ và sao lưu toàn bộ thư viện.
- **Ctrl+O** nhập sổ tay hoặc bản sao lưu thư viện. Import tạo sổ tay mới, không ghi đè sổ đang mở. Kiểm tra phiên bản, kiểu đối tượng, tọa độ, tham chiếu đường phụ, ảnh và kích thước. Tệp lỗi bị từ chối trước khi thay đổi thư viện. Định dạng hiện tại **version 1**; các phiên bản khác bị từ chối rõ ràng, chưa có migration do chưa có phiên bản schema trước.
- Xuất PNG, SVG và PDF nhiều trang A4/A3; in qua trình duyệt. SVG giữ nét bút/hình học/văn bản dạng vector; đồ thị/ảnh được nhúng raster. Trang PDF nguồn được nhúng lại dạng vector với lớp chữ có thể trích xuất; các đối tượng chú thích được raster độ phân giải cao. Với trang sổ tay thông thường, PDF vẫn dùng ảnh độ phân giải cao cho nội dung tự tạo.
- Xuất/in **chỉ nội dung trong ranh giới trang**. Chọn khổ phù hợp hoặc di chuyển/thu nhỏ đối tượng trước khi xuất; nội dung ngoài trang vẫn tồn tại trong JSON.
- Chèn ảnh PNG/JPEG/WebP tối đa 5 MB, mặc định nguyên bản và có xử lý nét đen/nền trong suốt tùy chọn. PDF tối đa 40 MB, trong giới hạn 300 trang/sổ tay; có cuộn liên tục, chọn dải trang, giữ tỉ lệ, xoay trang và trích xuất văn bản. PDF khóa bằng mật khẩu cần mở khóa trước khi nhập. Chưa có OCR ảnh quét hoặc sửa văn bản gốc trong PDF.

### Những điều cần biết về `file://`

Lưu trữ của file cục bộ phụ thuộc trình duyệt, đường dẫn, cấu hình và quota. Chế độ riêng tư, chính sách công ty, xóa dữ liệu trình duyệt hoặc chuyển vị trí thư mục có thể làm bản tự lưu không còn truy cập được. **Không có cam kết lưu vĩnh viễn**; nên tải `.smath.json` sau buổi học và sao lưu tệp ra nơi khác.

Nếu lưu trữ bị chặn/hết dung lượng, ứng dụng vẫn dùng được và tải tệp thủ công vẫn hoạt động. Giới hạn chủ động 8 triệu ký tự cho thư viện lưu tự động và 100 MB cho tệp dự án nhập; quota thực tế có thể nhỏ hơn. Tài liệu nhiều ảnh/PDF có thể chạm quota sớm. Bản gốc PDF được lưu một lần trong assets, không lặp theo từng trang hoặc từng bước Undo; bản xem trước vẫn chiếm dung lượng. Tải .smath.json để bảo toàn sổ tay lớn. Không tự ghi tệp vào thư mục gốc; tải xuống qua trình duyệt không cần File System Access API.

Nếu dữ liệu tự lưu bị lỗi hoặc khác phiên bản, ứng dụng báo lỗi và giữ nguyên bản lưu đó, không tự ghi đè. Hãy mở bản sao `.smath.json` và tải bản mới để bảo toàn công việc. Không chỉnh tay localStorage nếu chưa sao lưu dữ liệu thô.

## Phím tắt

| Phím             | Chức năng                                     |
| ---------------- | --------------------------------------------- |
| Ctrl+N / O / S   | Tạo / mở / lưu tệp                            |
| Ctrl+Z / Y       | Undo / Redo                                   |
| Ctrl+C / X / V   | Sao chép / cắt / dán đối tượng trong ứng dụng |
| Ctrl+A / Delete  | Chọn tất cả / xóa đối tượng không khóa        |
| P / E / S        | Bút / tẩy / chọn                              |
| G / H / C / R    | Đồ thị / hình học / máy tính / thước          |
| Space + kéo      | Kéo vùng nhìn                                 |
| Ctrl + lăn chuột | Zoom tại con trỏ                              |
| Shift + vẽ hình  | Khóa góc hoặc tỷ lệ                           |
| Esc              | Hủy thao tác, bỏ chọn, đóng panel             |
| F11              | Toàn màn hình do trình duyệt quản lý          |

Phím tắt trang không chạy trong input/textarea/select/hộp thoại. Ctrl+V hỗ trợ ảnh/văn bản từ clipboard hệ điều hành; sao chép/dán đối tượng dùng dữ liệu nội bộ trong phiên.

## Ví dụ đi kèm

Mở **examples/Toan-12.smath.json** qua Ctrl+O. Trang mẫu có đồ thị `x³−3x`, các điểm cực trị, hình chóp thật có thể xoay và ghi chú thể tích. Nội dung mẫu là đối tượng chỉnh sửa được, không phải ảnh chụp.

Mở **examples/Teacher-Geometry.smath.json** để xem cấu hình tam giác có điểm phụ, góc, đường cao và thiết diện qua ba trung điểm của lập phương. Các phép dựng là dữ liệu phụ thuộc có thể chỉnh sửa.

Mở **examples/Solid-Geometry.smath.json** để xem khối hộp, cầu, trụ, chóp, nón và nón cụt với nét khuất tự động. Chọn hình → **Xoay 3D** để kiểm tra các góc nhìn; **Di chuyển** để kéo vị trí.

Mở **examples/Teacher-Tools.smath.json** để thử trọng tâm G của tam giác, nối tới G và giao điểm I của hai đường chéo. Kéo đỉnh rồi quan sát các điểm phụ cập nhật.

## Kiểm thử

Đã kiểm thử tự động trên **Windows, Google Chrome và Microsoft Edge**, mở bằng `file://` với mạng của browser context bị chặn. Không phát sinh HTTP/HTTPS trong các luồng đã kiểm tra. Xem [docs/TEST-REPORT.md](docs/TEST-REPORT.md) để biết chi tiết và phần chưa kiểm thử bằng phần cứng thật.

Chỉ nhà phát triển cần Node.js/npm nếu muốn chạy lại test:

```powershell
npm ci --ignore-scripts
npm test
npm run test:browser
npm run test:advanced
npm run test:studio
npm run test:pen
npm run test:pdf
npm run test:notebook
npm run test:casio   # đối chiếu 12 menu với source gốc, cửa sổ và ảnh LCD
npm run test:desktop
npx playwright install webkit
npm run test:performance
npm start           # chạy cửa sổ desktop khi phát triển
npm run desktop:build # dựng bộ cài Windows x64 trong dist/desktop
npm run vendor:build  # chỉ cần nếu dựng lại thư viện từ dependency
npm run package
```

Browser tests dùng Chrome/Edge đã cài, không chạy localhost. Các tệp minh chứng được tạo trong `test-results/`. Kiểm thử hoàn tất không đồng nghĩa đã hỗ trợ toàn bộ đặc tả mở rộng trong yêu cầu ban đầu; các giới hạn đã ghi ở từng phần trên.

## Cấu trúc

```text
index.html                 Điểm vào; dùng script cục bộ cổ điển
css/main.css               Giao diện, panel, giấy, máy tính, in
css/studio.css             Header gọn, thanh dựng hình, PDF và công thức
css/pen.css                Thanh bút, bàn phím và các nút chạm
js/state.js                State, giao dịch, schema và localStorage
js/canvas.js               Pointer Events, vẽ, chọn, biến đổi, tẩy
js/renderer.js             Render trang, bút, hình học và lớp phủ
js/math-engine.js          Diễn giải AST với danh sách cú pháp cho phép
js/graph.js                Lấy mẫu, đồ thị, khảo sát và panel
js/geometry.js             Tọa độ, lưới 3D, phép chiếu và phép đo
js/solid-view.js           Tia nhìn, nét khuất và đường bao khối tròn
js/solid-drawing.js        Nét vẽ và nhãn hình học không gian
js/clipboard.js            Dán ảnh/văn bản và clipboard nội bộ
js/pen-tools.js            Thanh bút, chọn nhiều và chỉnh kích thước
js/pen-keyboard.js         Bàn phím Toán / số / tiếng Việt
js/constructions.js        Điểm phụ thuộc, hình chiếu, góc và thiết diện
js/teacher.js              Bắt điểm, chọn điểm và thao tác dựng trực tiếp
js/formulas.js             Nhận dạng biểu thức gõ và SVG công thức
js/pdf.js                  PDF.js offline, cache, nhập và xuất vector
js/pdf-tiles.js            Dựng vùng PDF đang xem ở độ nét theo màn hình
js/page-flow.js            Cuộn nối tiếp trang và xác định trang đang viết
js/images.js               Tách nền / làm đậm bản vẽ và phục hồi ảnh gốc
js/calculator.js           Máy tính, bộ nhớ và các chế độ
js/panels.js               Thư viện, thuộc tính, giấy/lớp/công cụ toán
js/export.js               JSON, ảnh, SVG, PDF và in
js/app.js                  Giao diện, menu, phím tắt và khởi tạo
vendor/                    math.js, pdf-lib, PDF.js, MathJax và tài nguyên nhúng
assets/                    Icon SVG tự thiết kế
examples/                  Sổ tay mẫu có thể chỉnh sửa
tests/                     Toán, schema và browser tests
scripts/                   Sinh ví dụ và đóng gói ZIP
docs/                      Báo cáo kiểm thử
```

Tách dữ liệu trang với trạng thái tương tác; mọi đối tượng có chung position/size/rotation/style/layer. Lịch sử nét bút lưu từng phần bổ sung; các thay đổi khác dùng snapshot nội dung và dùng chung PDF gốc. Mỗi ngăn Undo/Redo có giới hạn 32 triệu ký tự dữ liệu (giữ tối thiểu bước cuối), nên sổ tay lớn có thể có ít bước Undo hơn cấu hình. Nền giấy được cache riêng; đồ thị có cache raster; nét có cache Path2D; thao tác Canvas được gom qua requestAnimationFrame. Benchmark bản 1.6 là phép đo có giới hạn, chưa kiểm tra tài liệu rất lớn hoặc thời gian sử dụng hàng giờ.

Biểu thức người dùng được parse bởi math.js và **diễn giải AST theo danh sách cho phép**, không dùng `eval()`/`new Function()`, không chạy HTML/JS từ tài liệu. Cú pháp, độ sâu, số node, giai thừa, số mũ, ma trận và vòng tính số được giới hạn. Dữ liệu học tập không gửi lên mạng.

Thư viện đóng gói: **math.js 15.2.0** (Apache-2.0), **pdf-lib 1.17.1** (MIT), **PDF.js 6.5.438** (Apache-2.0), **MathJax SVG 3.2.2** (Apache-2.0); giấy phép nằm trong `vendor/`. Bản desktop dùng Electron 45.2.3; electron-builder và Playwright chỉ dùng khi phát triển/đóng gói. Cấu hình bộ cài theo [electron-builder NSIS](https://www.electron.build/docs/nsis/); cửa sổ desktop bật sandbox và context isolation theo [hướng dẫn Electron](https://www.electronjs.org/docs/latest/tutorial/security).
