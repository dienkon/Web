# Mô hình chất, tài liệu số, video và trợ lý hóa học

Thực hiện ngày 12/11/2026 trên `main`. Các chỉnh sửa biên soạn tài liệu, hình minh họa và công cụ build đã có trong checkout trước đợt này được giữ lại. Khi commit các file dùng chung, chỉ chọn phần triển khai của đợt này.

## Những gì được bổ sung

- **38 pha tinh thể** cho các chất thường gặp, ngoài 133 pha đã có: có JSON tọa độ, CIF, GLB và ảnh render. Lựa chọn bản ghi AMCSD được ghi rõ trong [manifest lựa chọn](substance-crystal-selection.json); không tự chọn kết quả tìm kiếm đầu tiên. Ví dụ Cu₂O/CuO, α-Al₂O₃, ZnO, Ca(OH)₂, NaNO₃, KNO₃, AgCl/AgBr/AgI, PbI₂, CuSO₄ khan và CuSO₄·5H₂O.
- **482 hồ sơ chất không phải hỗn hợp** được nối với mô hình phân tử, nguyên tử, thành phần hoặc pha tinh thể phù hợp. **123 hồ sơ** có pha tinh thể có nguồn. Có thể mở/ẩn bộ xem ngay trong tài liệu số; phân tử dùng bộ xem SDF hiện có, tinh thể dùng metric và tọa độ đã công bố.
- Bộ xem tinh thể có cảnh trưng bày bật/tắt được, ẩn/hiện toàn bộ nguyên tử hoặc từng nguyên tố, khung ô mạng, lặp ô, xoay, đặt lại, toàn màn hình và tải dữ liệu. Cảnh trưng bày được tách khỏi tọa độ khoa học. Giải thích phụ được thu gọn.
- **92 hồ sơ lịch sử** được tạo từ dữ liệu nguyên tố và nguồn đã gắn trong hồ sơ. Có liên kết từ tên người/nhóm phát hiện, tên xuất hiện trong mô tả và nội dung Markdown. Trường hợp cổ đại không được gán một người khám phá giả. Thư viện có tổng cộng 579 bài.
- **485 khóa công thức** có đường dẫn tài liệu; phương trình có liên kết chất màu xanh. **11 phương trình** được đối chiếu chất tham gia, sản phẩm và bảo toàn nguyên tử để mở thẳng bộ thí nghiệm Lab 3D tương ứng. Không gán liên kết Lab cho sơ đồ hạt nhân, sơ đồ hình thức, phương trình sai hoặc phản ứng ngoài danh mục thực hiện.
- **5 URL video** được chọn từ Periodic Videos/University of Nottingham. Chỉ lưu liên kết và JSON câu hỏi. API phân tích trực tiếp video công khai qua URL, tạo câu hỏi có mốc thời gian và mô tả cảnh đối chiếu; kiểm tra thời lượng, chỉ số đáp án, lựa chọn và khoảng cách giữa câu hỏi. Có nút tắt câu hỏi, bỏ qua, thử lại; tua qua mốc cũ không mở dồn câu hỏi.
- Video natri đã được phân tích thực tế: **282 giây, 5 câu hỏi** tại giây 15, 30, 50, 150 và 248. Metadata này được lưu để trả nhanh, không lưu video. Các video còn lại phân tích khi mở; nguồn không truy cập được hoặc xử lý quá lâu sẽ báo lỗi và vẫn có liên kết gốc.
- Thẻ ứng dụng dùng cột tự xếp để không kéo dài các thẻ chỉ có chữ và không để khoảng trống theo chiều cao ảnh cùng hàng. Chatbot dùng màu xanh ngọc, giữ lịch sử hội thoại, khóa gửi trùng, hỗ trợ API máy chủ và KaTeX/mhchem. Tài liệu số sửa cả lệnh TeX bị escape hai lần; thanh đọc cố định và tránh thanh điều hướng bên/trên để nút quay lại sử dụng được trên desktop và điện thoại.

## Độ chính xác và giới hạn

Mô hình không phải bản quét mẫu thật và không chứng nhận “100% đúng thực tế”. Tọa độ, metric, nhóm không gian, pha và điều kiện của bản ghi được giữ nguyên. Cầu/màu nguyên tử, cảnh trưng bày và một số mô hình dựng từ công thức là quy ước hoặc minh họa, có nhãn tương ứng. Nguồn không ghi nhiệt độ/áp suất thì không tự gán điều kiện phòng.

Không suy ra ô mạng chỉ từ công thức. Chất khí, dung dịch, hỗn hợp và các hồ sơ thiếu dữ liệu pha phù hợp không được gán một tinh thể giả. CuSO₄ khan không dùng tọa độ của pentahydrate; các mẫu chứa deuterium, tạp chất hoặc tỉ lượng không phù hợp không được thay cho mẫu chất đang mô tả. Câu hỏi video mang nhãn AI; mốc và giải thích chưa phải kiểm chứng độc lập bởi giáo viên.

Snapshot AMCSD dùng cùng SHA-256 đã ghim ở đợt tinh thể trước. Script xuất bổ sung kiểm tra SHA trước khi chạy. Mỗi CIF được Gemmi đọc lại; kiểm thử so sánh ô mạng và số vị trí với dữ liệu đã mở rộng đối xứng. Xem [render 38 pha](crystal-render-verification.json) và [kết quả gọi API thực](live-api-verification.json).

## Kiểm tra và tái tạo

```powershell
py -3.12 scripts/extend-substance-crystals.py
node scripts/generate-crystal-assets.mjs --substances
node scripts/render-mineral-previews.mjs --crystals --substances
node scripts/build-library.mjs
npm --prefix trung-tam run build
npm --prefix lab-3d run build
npm run build:static
npm run lint:api
npm --prefix trung-tam run lint
npm --prefix lab-3d run lint
npm run test:platform
npm run test:crystals
node --test tests/learning-upgrade.test.mjs
npx playwright test tests/browser/learning-upgrade.spec.mjs tests/browser/library-crystals.spec.mjs tests/browser/application-crystal-review.spec.mjs --project=chromium
```

Để phân tích lại các URL chưa có metadata, chạy server rồi `node scripts/analyze-video-links.mjs`; đặt `CHEMDEX_API_URL` nếu dùng cổng khác 4173. Cần khóa AI hợp lệ trong môi trường máy chủ. Bản xem thử ưu tiên `.env.local` trước `.env`; khóa không được nhúng vào client hoặc đưa vào Git.

## Hình kiểm tra

- [Thẻ ứng dụng gọn](screenshots/ung-dung-gon.png), [điện thoại](screenshots/ung-dung-dien-thoai.png).
- [Tinh thể pentahydrate và cảnh trưng bày](screenshots/tinh-the-cuso4-5h2o.png).
- [Chatbot và LaTeX](screenshots/chatbot-latex.png); ảnh này dùng phản hồi cố định để chụp bố cục, kiểm tra API thật nằm trong JSON riêng.
- [Thanh đọc khi cuộn](screenshots/tai-lieu-header.png).

Tham khảo triển khai: [CIF – IUCr](https://www.iucr.org/what-we-do/digital-standards/cif), [video understanding – Google](https://ai.google.dev/gemini-api/docs/video-understanding), [video natri](https://www.youtube.com/watch?v=7IT2I3LtlNE). Danh sách URL đầy đủ nằm trong `shared/video-catalog.json`; trích dẫn tinh thể được giữ trong từng JSON/CIF.
