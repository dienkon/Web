# Nhật ký thao tác cập nhật bảng tuần hoàn

Ngày làm việc theo ngữ cảnh người dùng: 11/11/2026 (Asia/Saigon). Nhật ký này tổng hợp các thao tác đã thực hiện trong phiên, không tạo giờ phút giả cho những thao tác không được ghi timestamp riêng. Các lần kiểm tra có timestamp máy nằm trong báo cáo browser; các tệp/nguồn có hash trong inventory và change-manifest.

## Trình tự và kết quả

1. Đọc yêu cầu và quy tắc Git do người dùng cung cấp. Kiểm tra checkout `main`, status, README, package scripts, importer, loader và renderer. Ghi nhận các DOCX ở thư mục cũ đã bị xóa trước phiên làm việc, `DATA PERIOD TABLE` là dữ liệu người dùng mới có; không khôi phục/xóa/sửa chúng.
2. Đọc skill `documents` cho việc đọc Word. Chỉ trích xuất nguồn; không author hoặc sửa DOCX. Không dùng Sites để tạo/publish một website khác; đây là sửa checkout ChemDex hiện có.
3. Liệt kê đủ 118 DOCX, đọc toàn bộ 11.426 đoạn XML; không có OMML hoặc comments/footnotes/endnotes/header/footer riêng. Lưu văn bản từng file, hash, số đoạn và inventory.
4. Đọc mô hình dữ liệu hiện tại và các consumer. Lưu baseline 68 hồ sơ trước khi nhập đè để so sánh trường trước/sau.
5. Tra nguồn chính thức bằng công cụ web: CIAAW, RSC, PubChem, NIST, IAEA và các nghiên cứu về trường hợp sai. Tải 118 trang fact box RSC thành công; lưu facts và hash, không republish toàn bộ trang hoặc ảnh RSC.
6. Yêu cầu Python urllib đầu tiên tới RSC gặp lỗi trust certificate trên host. Chuyển sang Node fetch dùng trust store hoạt động; không tắt kiểm tra TLS. Tải thành công snapshot PubChem và IAEA ground-states.
7. Viết bộ kiểm tra bảo toàn hóa học/ion/hạt nhân và chạy trên mọi đoạn có mũi tên. Phân biệt sơ đồ chữ, khoảng đồng vị và chuỗi nhiều mũi tên với phương trình một bước. Ghi các trường hợp sai A/Z hoặc điện tích riêng.
8. Biên tập quyết định theo số đoạn. Ví dụ: phần Nb chép Mo; thiếu C trong Mg₂C₃; sai oxygen trong Mn/Ge/As/Rh/W; sai cyanide/sulfur ở Ag; sai điện tích Au; sai Pt với nước cường toan; sai isotope calcium ở Og; sản phẩm/kênh không có cơ sở.
9. Viết bộ nhập mới; trong vòng kiểm tra, sửa thêm hệ số của phương trình As/Pr được biên tập, parser HTML thẻ SUP viết hoa của RSC, tiêu đề con `Phương trình:`, Unicode tổ hợp Tm, tổng quan đánh số Be/Rh và câu diễn giải Ar/Po. Các vòng nhập cuối đều đạt kiểm tra bảo toàn.
10. Đối chiếu cấu trúc La/Pr/Nd/Pm và Am/Cm/Bk/Cf: phân biệt DHCP/HCP; sửa Si/diamond, Mn phức tạp, Hg/Bi mặt thoi. Phát hiện CAS H trên fact box RSC thiếu chữ số; dùng NIST và checksum CAS để sửa.
11. Đánh giá lại một sửa tạm về Eu(II)/Eu(III) trong acid; không giữ thay đổi chưa đủ cơ sở. Bản cuối giữ phương trình nguồn Eu(III), không coi có ion Eu(II) là bằng chứng tự động bác bỏ phương trình tổng quát.
12. Truy vấn ảnh Commons ban đầu quá nhanh gặp HTTP 429; chuyển truy vấn metadata theo lô, tải giãn cách và giữ 53 ảnh đủ metadata. Giữ lý do fallback của từng nguyên tố; không giả báo ảnh tải thành công khi lỗi. Xem contact sheet để kiểm tra mẫu và ghi chú pha.
13. Viết 49 recipe khoáng vật đại diện, 79 liên kết nguyên tố, 118 sơ đồ SVG. Tạo GLB có geometry, normals, vật liệu, provenance; render toàn bộ 49 bằng Chromium/Three.js, không có lỗi. Xem contact sheet; giảm sáng preview sau lượt đầu để phân biệt màu/vật liệu rõ hơn.
14. Sửa giao diện theo dữ liệu: isotope table, source links/attribution, điều kiện, phân loại phản ứng, mẫu hạt nhân tham chiếu, thông số dự đoán, nhóm f, ảnh local và mô hình tải theo yêu cầu.
15. Build static nhiều vòng sau các thay đổi. Build tự sinh lại catalog và bài thư viện có liên quan; không chạy build toàn bộ 7 ứng dụng con. Cảnh báo Browserslist cũ và Node module-type của repo được giữ trong log kiểm tra; không gây lỗi build/test.
16. Chạy 26 kiểm thử nền tảng/thư viện: đạt. Chạy 5 kiểm thử hồi quy xuất phát từ lỗi thực tế của tài liệu: đạt. Chạy audit toàn bộ 118 hồ sơ, 1.110 vị trí phương trình, 523 isotope, 79 liên kết mô hình và 49 GLB: đạt.
17. Chạy browser Chromium: chuyển đủ 118 hồ sơ, kiểm tra nguồn/đồng vị/tổng quan, mô hình Fe và điều khiển, nhãn dự đoán Og, viewport mobile 360 px. Các lần chạy cuối có báo cáo JSON.
18. Chụp và kiểm tra giao diện desktop/mobile. Lượt chụp đầu bắt trúng hiệu ứng fade và có ảnh trống; sửa capture đợi opacity, đồng thời sửa threshold observer để các mục dài không thể ẩn do không đạt tỉ lệ nhìn thấy. Chụp lại sau build.
19. Khi kiểm tra ảnh mobile sau đó, phát hiện công thức bị xếp dọc do flex co và `white-space: normal` cũ. Bọc hai vế bằng span không co, cố định công thức không xuống dòng và cuộn ngang trong ô. Bài kiểm thử mới bắt thêm 5 ô điều chế H bị tràn vì grid min-content; sửa min-width/max-width của grid con, không thu nhỏ chữ để che lỗi. Giữ báo cáo lỗi tại `browser-tests-before-mobile-overflow-fix.json`, chạy lại sau sửa.
20. Replay snapshot và so SHA-256 của 118 hồ sơ + manifest + shared/elements: không có file thay đổi (deterministic).
21. Tạo README audit, changelog từng quyết định, nhật ký này, snapshot reference và manifest đường dẫn/hash các file thay đổi. Giữ bản DOCX gốc và các thao tác người dùng đã có trước phiên.

## Lệnh chính đã dùng

```powershell
git status --short --branch
rg --files
node scripts/fetch-periodic-references.mjs
python -X utf8 scripts/periodic_review/extract.py
node scripts/fetch-element-images.mjs
python -X utf8 scripts/rebuild-periodic-table.py
node scripts/generate-mineral-assets.mjs
node scripts/render-mineral-previews.mjs
python -X utf8 scripts/audit-periodic-table.py
python -X utf8 tests/periodic_review_test.py
npm run build:static
npm run test:platform
node scripts/preview.mjs
npx playwright test tests/browser/periodic-review.spec.mjs --project=chromium
node scripts/capture-periodic-review.mjs
python -X utf8 scripts/write-periodic-review-report.py
```

Các lệnh liệt kê/đọc source dùng PowerShell và rg; không đọc nội dung `.env` hoặc xuất secret. Preview chỉ chạy tại loopback `127.0.0.1:4173`. Không push, merge hoặc deploy hosting. Manifest dưới đây chỉ ghi file trong phạm vi ChemDex đã được thay đổi/tạo trong công việc, bỏ qua DOCX nguồn người dùng đã thay đổi vị trí trước phiên.

## Chốt thay đổi Git

Đã kiểm tra diff trong phạm vi ChemDex và chỉ stage các file nội dung, code, media, audit được tạo/sửa trong công việc. Commit trực tiếp trên `main` theo hướng dẫn Git của người dùng; không push. Các DOCX bị xóa ở thư mục cũ và thư mục `DATA PERIOD TABLE` của người dùng được để nguyên ngoài commit. SHA commit xem trong lịch sử Git và thông báo hoàn tất.

Lượt stage đầu bằng danh sách đối số vượt giới hạn dòng lệnh Windows (WinError 206). Chuyển sang `git add --pathspec-from-file=- --pathspec-file-nul`, truyền danh sách đường dẫn qua stdin, giữ nguyên phạm vi file đã chọn.

Kiểm tra diff trước commit phát hiện CRLF ở các dòng mới của `js/periodic.js` và dòng trống cuối snapshot IAEA. Chuẩn hóa file JS sang LF và bỏ dòng trống cuối CSV; giữ nguyên mọi hàng dữ liệu. Manifest reference ghi cả hash payload tải về và hash bản chuẩn hóa. Chạy lại `git diff --cached --check` sau cập nhật.
