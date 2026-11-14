# Tên chất, câu chuyện và giao diện ChemDex — 14/11/2026

Tên chất hiển thị bằng tiếng Anh trên bảng tuần hoàn, thư viện, mô hình, lab, ôn tập và các công cụ. Giao diện và phần giải thích vẫn bằng tiếng Việt.

- Cùng một bước chuẩn hóa khi build React, mô-đun nền tảng, HTML, JSON và chữ trong SVG; không dùng bộ theo dõi DOM khi chạy.
- Giữ công thức, điện tích, số oxi hóa, cấu trúc, URL, định danh, dấu trang và tên tìm kiếm tiếng Việt. Không suy đoán một đồng phân từ công thức tổng quát.
- Đổi các tên cũ như ethylene → ethene, acetylene → ethyne, acetone → propan-2-one. Giữ những tên được IUPAC chấp nhận như water, ammonia, acetic acid và benzene.
- Yêu cầu dùng tên chất tiếng Anh trong câu trả lời AI, kể cả hỏi đáp và phân tích thí nghiệm.
- Biên tập 17 câu chuyện có nguồn, tập trung vào người nghiên cứu, bằng chứng, bước ngoặt và tác động. Công thức và phản ứng nằm trong phần tra cứu có thể mở thêm. Hai bài hướng dẫn được ghi đúng chức năng.
- Sidebar chung mặc định thu gọn, đóng trên điện thoại. Mục lục, lọc thư viện và các bảng lab chỉ mở khi cần. Bảng đồng vị và phương trình dài cuộn trong vùng riêng.
- Bỏ nhãn quảng cáo sai nội dung, lỗi JSON thô và các chỉ dẫn chỉnh dữ liệu dành cho người phát triển khỏi trang học.

## Kiểm tra

[chemical-names.test.mjs](../../../tests/chemical-names.test.mjs) kiểm tra 118 nguyên tố và 498 bản ghi chất/cấu trúc, các tên giữ lại, số oxi hóa, công thức không xác định đồng phân, định danh không thay đổi và tên tìm kiếm cũ. Chính sách tên trong câu trả lời AI được kiểm tra bằng mô hình giả lập; không gọi dịch vụ AI có tính phí.

[chemistry-polish.spec.mjs](../../../tests/browser/chemistry-polish.spec.mjs) kiểm tra 34 đường dẫn ở 320, 360, 390, 768 và 1366 px; kiểm tra cả chiều rộng nội dung cuộn và chiều cao các màn lab. Có kiểm tra mở/đóng menu, lọc bài đọc, phụ lục câu chuyện, bảng lab và lỗi máy chủ video trả văn bản thuần.

Các lệnh dùng để xác minh:

- `npm run build`
- `npm run test:platform`
- `npm run lint:api`
- Playwright Chromium: bộ chemistry-polish và các luồng thư viện/điều hướng liên quan.

## Nguồn danh pháp và biên tập

- [IUPAC · Blue Book và các cập nhật](https://iupac.org/what-we-do/books/bluebook/)
- [IUPAC · Brief Guide to Organic Nomenclature](https://iupac.qmul.ac.uk/BriefGuide/organic.html)
- [IUPAC · Brief Guide to Inorganic Nomenclature](https://iupac.org/cms/wp-content/uploads/2016/07/Inorganic-Brief-Guide-V1-1.pdf)
- [Royal Society of Chemistry · Lịch sử bảng tuần hoàn](https://periodic-table.rsc.org/history/about)
- [Science History Institute · Fritz Haber](https://www.sciencehistory.org/education/scientific-biographies/fritz-haber/)
- [PNAS · Dấu vết đồ uống lên men ở Trung Quốc](https://pmc.ncbi.nlm.nih.gov/articles/539767/)

Nguồn cụ thể nằm cuối từng câu chuyện. Các cấu trúc và số liệu vật lý không bị thay đổi bởi bước đổi tên.

## Ảnh kiểm tra

- [Bảng tuần hoàn](periodic-english.png)
- [Hồ sơ trên điện thoại](element-mobile.png)
- [Thư viện trên điện thoại](library-mobile.png)
- [Câu chuyện ammonia](ammonia-story.png)
- [Lab Safety trên điện thoại](safety-mobile.png)
