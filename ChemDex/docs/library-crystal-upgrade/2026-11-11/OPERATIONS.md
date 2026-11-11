# Nhật ký thao tác

Nhánh làm việc: `main`, theo yêu cầu AGENTS.md và người dùng. Mốc trước thay đổi: `de8bf50b` (bản cập nhật 118 nguyên tố chưa push). Đợt làm việc bắt đầu ngày 11/11 và đi qua ngày 12/11/2026 theo giờ Việt Nam. Phần Git cuối được ghi trong `git-verification.json` sau khi push.

## Kiểm kê và chuẩn bị

1. Đọc trạng thái Git, remote, script sinh thư viện, loader, schema tài liệu, route React, mã tìm kiếm/cấu trúc, mã GLB, parser CIF, trình xem và kiểm thử hiện có.
2. Ghi nhận 63 file DOCX xóa từ trước và thư mục `DATA PERIOD TABLE/` chưa theo dõi. Không khôi phục, xóa hoặc stage các thay đổi đầu vào này.
3. Xác nhận 468 bài `ho-so-...`, 19 bài biên soạn, 498 định danh chất có bài liên kết; 49 mô hình hình thái cũ chưa có tọa độ mạng thực nghiệm.

## Tìm dữ liệu và xét mẫu

4. Tra cứu tài liệu chính thức COD, AMCSD/RRUFF, IUCr và Larixite. COD trả lỗi kết nối; các trang RRUFF mới trả 403/captcha và host AMS cũ không trả ổn định. Không bỏ kiểm tra TLS và không vượt captcha.
5. Dùng tài liệu dự án Larixite và nguồn tải công khai `https://docs.xrayabsorption.org/databases/amcsd_cif2.db`, 26.865.664 byte. Tính SHA-256 và giữ snapshot trong `.cache/crystal-research/` (không commit toàn bộ database).
6. Đọc schema SQLite: cấu trúc, vị trí, độ chiếm chỗ, nhóm không gian, phép đối xứng, khoáng vật, tác giả và công bố. Đọc mã giải mã mảng Larixite để giữ đúng hệ số 4.000.000.
7. Cài Gemmi 0.7.5 cho Python 3.12 để tính metric và đối xứng. Lệnh `python -m pip` ban đầu dùng Python Inkscape không có pip; dùng trình thông dịch Python 3.12 qua `py -3.12`.
8. Xuất danh sách ứng viên để xét tên pha, thành phần, polytype, nhiệt độ, áp suất và ghi chú. Chọn mã tường minh, tránh bản ghi nhiệt độ/áp suất cao chỉ vì trùng tên chất.
9. Phát hiện nhãn giả nguyên tử nước ở một mẫu beryl, biểu diễn ô khác ở graphite, metric pyrolusite không khớp đối xứng và vị trí thiếu trong lựa chọn La/Pr/Nd. Đổi lựa chọn mẫu, không tự chỉnh số đo gốc. Toàn bộ giải thích ở `source-issues.json`.

## Thực hiện

10. Tạo helper đường dẫn tên chất, di chuyển 19 file biên soạn, sửa generator 468 tài liệu tham khảo, thêm ánh xạ link cũ và sửa loader/auditor/tests theo schema đường dẫn mới.
11. Sửa route bộ đọc, dấu trang/lịch sử, chống kết quả tải cũ và nhãn thư viện; sửa liên kết tìm kiếm toàn web và trang cấu trúc.
12. Tạo script tải/biên dịch cấu trúc, bộ dựng hình dùng chung và trình xem. Xuất CIF, JSON, GLB, PNG cho 122 cấu trúc. Render toàn bộ bằng Chromium WebGL/Three.js; không dùng ảnh AI làm chứng cứ khoa học.
13. Truy vấn ảnh theo lô MediaWiki, đọc metadata Commons, tải ảnh có giấy phép phù hợp với nhịp nghỉ giữa yêu cầu, lưu tác giả/giấy phép/nguồn/hash. Sửa tên trang Celestine; chọn ảnh platinum tự sinh thay ảnh nuôi tinh thể.
14. Sửa lỗi ghi snapshot tiến độ của script ảnh: các mục giữ từ lần trước cũng phải có trong báo cáo cuối. Tải/kiểm tra lại cho đủ 49 mục; 79 trang được gắn ảnh khoáng vật.
15. Bổ sung thông tin tinh thể/ảnh vào cả 118 file nguyên tố bằng overlay có thể chạy lặp lại. Giữ mô hình hình thái cũ có nhãn minh họa; thêm mô hình nguyên tử riêng. Compiler DOCX gọi overlay để replay không làm mất dữ liệu mới.
16. Thay parser CIF cũ bằng parser đủ góc, loop theo tên cột và khai triển đối xứng an toàn. Tắt suy liên kết CIF trong 3Dmol. Thêm kiểm thử số vị trí chuẩn và metric.
17. Xuất audit 118 nguyên tố, 122 cấu trúc và 487 tài liệu; ghi đối chiếu đường dẫn, định danh, nguồn và SHA-256. Đối chiếu Git xác nhận cả 487 phần nội dung bài không đổi.

## Kiểm tra, sửa sau kiểm tra

18. `node --test tests/crystal-structures.test.mjs tests/library.test.mjs`: lần đầu phát hiện lựa chọn graphite dùng ô trực thoi thay ô lục giác mong muốn và metric pyrolusite không bảo toàn đối xứng. Đổi mã mẫu, chạy lại đạt.
19. `npm --prefix trung-tam run lint`: lần đầu thiếu kiểu ImportMeta.env/glob; bổ sung `vite-env.d.ts` tham chiếu `vite/client`, chạy lại đạt.
20. Overlay từng gặp lỗi Windows mở file Bi; chuyển ghi JSON sang tệp tạm rồi thay thế, thử lại hữu hạn khi file tạm thời bị khóa. Chạy hoàn tất cả 118 file.
21. `npm --prefix trung-tam run build` và `npm run build:static`: sinh production bundle và đồng bộ bản static theo thiết kế repo. Bundle nội dung có thư mục tên chất; root build tiếp tục sinh danh mục thư viện/audit tự động.
22. `npm run test:platform`: 27 kiểm thử đạt. `python -X utf8 tests/periodic_review_test.py`: 5 đạt. `python -X utf8 scripts/audit-periodic-table.py`: 118 trang, 1.110 phương trình, 523 đồng vị, không lỗi.
23. `node scripts/audit-crystal-assets.mjs`: đủ 122 cấu trúc, 49 ảnh, 71 liên kết mạng đơn chất, 79 liên kết khoáng và ảnh; không lỗi. Kiểm tra header GLB/PNG, trích dẫn, hash ảnh và file audit.
24. Playwright lần đầu: 6/8 đạt. Một kiểm thử đòi role button cho thẻ bài gợi ý vốn là div; đổi sang button để dùng bàn phím. Một kiểm thử cũ chọn nút xoay toàn trang bị trùng khi thêm widget; giới hạn selector vào widget hình thái cần kiểm tra. Giữ `browser-tests-initial.json` để đối chiếu.
    - Rà lại callback popstate phát hiện hook lưu trữ trước đó tính cập nhật hàm từ trạng thái đã chụp trong closure. Đổi sang cập nhật hàm của React và setter ổn định; bổ sung kiểm tra lịch sử không chứa lại mã cũ và không mất bài khi lùi/tiến.
25. Chạy lại kiểm thử production, chụp giao diện desktop/mobile và kiểm tra bằng mắt ảnh xem trước. Kết quả cuối lưu trong `browser-tests.json`, `crystal-render-verification.json`, `crystal-validation.json` và thư mục `screenshots/`.

## Git

26. `git fetch origin main`: xác nhận remote main không có commit mới cần tích hợp; nhánh local ban đầu ahead 1 commit đã được người dùng yêu cầu push cùng bản này.
27. Chỉ stage mã, dữ liệu xuất, asset và audit thuộc công việc này; giữ nguyên 63 DOCX xóa từ trước và thư mục đầu vào chưa theo dõi. Kiểm tra `git diff --cached --check` trước commit.
    - Lần stage đầu dùng đường dẫn từ gốc repo tại cwd ChemDex nên Git từ chối pathspec, không stage file; chạy lại ở đúng gốc repo bằng stdin NUL để không vượt giới hạn dòng lệnh Windows.
    - Kiểm tra whitespace phát hiện dấu cách cuối dòng trong bundle Vite: đây là Markdown hard-break được giữ bên trong template literal, không được xóa vì sẽ đổi nội dung 487 bài. Thêm quy tắc `.gitattributes` chỉ cho bundle JS sinh tự động để bỏ kiểm tra blank-at-eol ở các file này; giữ các kiểm tra khác và kiểm tra đầy đủ file nguồn.
28. Commit trực tiếp trên `main`, push thông thường lên `origin main` theo yêu cầu người dùng, kiểm tra SHA remote trùng HEAD. Mã commit và kết quả push được ghi ở `git-verification.json` và thông báo bàn giao.
29. Sau push `4eece242`, rà lại mô tả ảnh mặc định phát hiện `Gold-crystals.jpg` ghi rõ synthetic. Chọn ảnh `Gold-280481.jpg` từ Round Mountain Mine, Nevada, thay asset và provenance, chạy lại overlay/kiểm toán, tạo commit chỉnh ảnh và nhật ký xác minh rồi push tiếp. Ảnh đơn chất vàng tổng hợp cũ có thể vẫn xuất hiện trong gallery đơn chất; mục khoáng vật và trạng thái tự nhiên sử dụng ảnh vàng tự sinh.
30. Phát hiện thay đổi thư viện GDPT, useSpeech và CSS xuất hiện đồng thời ngoài công việc này. Không ghi đè hoặc đưa chúng vào commit chỉnh ảnh. Audit đường dẫn được tái tạo từ snapshot `4eece242` bằng `--library-ref` để phản ánh đúng phiên bản đã bàn giao; bản chỉnh cuối chỉ commit các đường dẫn ảnh vàng/audit thuộc công việc này. Không chạy lại build toàn workspace lên những thay đổi đang làm đồng thời.

Các file sinh hàng loạt không được liệt kê lặp lại trong nhật ký: đường dẫn trước/sau và hash nằm trong manifest tương ứng; từng thao tác nội dung được mô tả trong audit của chính file đó.
