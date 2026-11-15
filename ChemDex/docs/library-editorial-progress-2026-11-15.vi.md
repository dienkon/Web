# Tiến độ biên tập kho tài liệu số — 15/11/2026

Mục tiêu cập nhật theo yêu cầu ngày 15/11/2026: mọi tài liệu là bài viết tiếng Việt đầy đủ, có câu chuyện thực tế và liên hệ ứng dụng hiện nay; **500 tài liệu khác nhau trong từng mục**. Người dùng yêu cầu đẩy nhanh bổ sung và giảm mốc ban đầu 1.000+ xuống 500. Tài liệu ngoại ngữ chỉ được dùng làm nguồn. Mục tiêu **chưa hoàn tất**.

## Kiểm kê

| Mục | Ban đầu | Hiện tại | Còn thiếu để đạt 500 |
| --- | ---: | ---: | ---: |
| Tiểu sử | 81 | 154 | 346 |
| Nguyên tố | 140 | 162 | 338 |
| Khái niệm hóa học | 2 | 65 | 435 |
| Phản ứng | 0 | 67 | 433 |
| Câu chuyện các chất | 357 | 363 | 137 |
| Tổng | 580 | 811 | 1.689 |

Các con số là bài có ID, đường dẫn và nội dung riêng; không phải số công thức, lượt gắn thẻ hoặc trang nguồn. Không nhân bản một bài thành nhiều góc nhìn để đạt chỉ tiêu.

## Nội dung đã cập nhật

- Viết 70 bài mới trong hai đợt đầu: 25 chuyên đề đầu tiên và 45 bài đợt 2 (15 tiểu sử, 15 ứng dụng nguyên tố, 7 phản ứng và 8 khái niệm). Riêng đợt 2 có khoảng 27.873 từ theo phép đếm khoảng trắng; mỗi bài 541–673 từ, 3–4 phần và ít nhất 3 nguồn. Nội dung chính là văn xuôi tiếng Việt; một số thuật ngữ hóa học quốc tế được giữ nguyên.
- Thêm câu chuyện/trường hợp thực tế và phần ứng dụng cho 79 hồ sơ hợp chất. Trong đó 10 bài đợt 2 có phần kể chuyện hoàn chỉnh khoảng 550–610 từ: N₂, benzen, glycerol, CsCl, SO₂, dung dịch sodium acetate, LiF, NaI, CO và acid acetic. Đưa lịch sử và ứng dụng có nguồn lên đầu 117 hồ sơ nguyên tố; phân biệt công dụng hiện tại, công dụng lịch sử, nghiên cứu và chưa có công dụng được ghi nhận.
- Bổ sung ứng dụng cho 17 bài kể chuyện đã có; thêm trường hợp thực tế cho 2 bài hướng dẫn.
- Cải thiện 93 hồ sơ lịch sử/tiểu sử cũ bằng bối cảnh nghiên cứu và ảnh. Trong đó 92 bài vẫn dùng ứng dụng của nguyên tố liên quan làm bối cảnh, chưa thay thế việc nghiên cứu riêng đóng góp và ảnh hưởng của từng nhân vật/nhóm.
- Tải 28 ảnh có tác giả/đơn vị lưu trữ, giấy phép, URL nguồn và SHA-256; 27 ảnh đã xuất hiện trong bài. Ba hình đợt 2 gồm bình bảo quản lạnh nitơ, tinh thể sodium acetate và tranh tư liệu thiết bị sản xuất benzen. Một ảnh còn lại là tư liệu dự trữ. Chú thích phân biệt ảnh hiện vật, ảnh minh họa chủ đề và bản đồ màu giả.
- Giữ URL, định danh chất, phương trình, mô hình và phụ lục tra cứu. Bản dựng lại tái tạo từ nguồn biên soạn, không ghi đè mất nội dung mới.

## Phần chưa hoàn tất

- 258 hồ sơ hợp chất chưa có câu chuyện và ứng dụng được đối chiếu riêng. Chúng vẫn là bài tra cứu và được đánh dấu `missing` trong hồ sơ biên tập. Không gán lịch sử hoặc công dụng của một nguyên tố thành phần cho hợp chất.
- 92 hồ sơ lịch sử còn có ứng dụng ở mức bối cảnh liên quan. Cần viết sâu thêm theo công trình cụ thể.
- Chưa đạt số lượng ở bất kỳ mục nào. Cần tiếp tục biên soạn 1.689 bài khác nhau và đối chiếu nguồn, hình ảnh, tính mới của từng bài.
- Nguồn/đề mục được kiểm tra bằng công cụ chỉ xác nhận tính toàn vẹn của hồ sơ, không thay thế kiểm chứng sự kiện hoặc đánh giá văn chương.

Danh sách bài và trạng thái chi tiết nằm trong `shared/library-editorial-audit.generated.json`. Trường `quantityTargetReached` kiểm số lượng; `editorialCoverageComplete` kiểm hồ sơ câu chuyện/ứng dụng tiếng Việt tường minh. `targetReached` chỉ đúng khi cả hai điều kiện đều đạt, và vẫn cần đánh giá biên tập về sự khác biệt nội dung.

## Quy trình tiếp tục

1. Chọn các hồ sơ đang `missing`, tra nguồn phù hợp đúng định danh hóa học; ưu tiên công trình, sự kiện hoặc quy trình sử dụng cụ thể.
2. Viết câu chuyện dẫn nhập, giải thích hóa học và ứng dụng có giới hạn rõ; không tự tạo lời thoại, đời tư hoặc gán công dụng chung cho một nhóm muối.
3. Thêm bản thảo vào `scripts/data/editorial-*.mjs` hoặc case hợp chất vào `scripts/data/substance-stories*.mjs`; ảnh mới đi vào manifest `story-photo-sources.json`.
4. Chạy `npm run library:build`, `npm run library:audit-editorial`, `npm run test:library` và build ứng dụng trung tâm.
5. Chạy `npm run library:target` để đối chiếu toàn bộ mục tiêu 500 bài/mục được người dùng cập nhật. Lệnh này hiện phải trả trạng thái chưa đạt; chỉ đổi ngưỡng khi người dùng sửa yêu cầu.

## Kiểm tra kỹ thuật của đợt này

- Kiểm tra đơn vị: 19 bài kiểm tra thư viện/bản thảo và 8 bài kiểm tra biến đổi tên hóa học.
- Build production ứng dụng `trung-tam` thành công. Có cảnh báo kích thước bundle và đường dẫn CSS dùng chung; không có lỗi build.
- 4 kiểm tra trình duyệt Chromium đạt, bao gồm bài mới, tìm kiếm, đường dẫn chia sẻ, ảnh giấy phép và màn hình điện thoại. Một lỗi chọn nhầm ảnh khi thiếu `photoKey` và một lỗi tràn ngang do URL dài đã được sửa. Bộ kiểm tra cũ được cập nhật để nhận phương trình có liên kết/chỉ số dưới thay vì chỉ tìm thẻ `pre`.
- Chạy lại quy trình sinh dữ liệu cho 613 tệp của đợt đầu cho kết quả byte không đổi. Kiểm kê đợt 2 xác nhận 650 bài, còn thiếu 4.355 bài, không có lỗi cấu trúc.
- Không triển khai lên hosting trong đợt này. Công việc được lưu trên `main` của repository hiện có.

## Rà chéo nội dung đợt 2

- Sửa tên Tim S. Böscke và năm công bố của các nghiên cứu ITO, germanium, rhenium theo metadata gốc; không suy năm công bố từ mã hồ sơ NASA.
- Bài CO ghi rõ MOPITT ngừng đo đầu tháng 2/2025 và được tắt ngày 9/4/2025; ứng dụng hiện nay nằm ở chuỗi dữ liệu lưu trữ.
- Bài sodium acetate phân biệt dung dịch 0,1 M với hệ đậm đặc trong túi sưởi; LiF/NaI phân biệt chất nền với vật liệu pha tạp dùng cho đầu dò.
- Các nguồn bị chặn truy cập tự động không được coi là đã đọc toàn văn chỉ vì trả HTTP 200/403. Dữ kiện được đối chiếu bằng bài gốc, abstract của nhà xuất bản, metadata hoặc nguồn cơ quan trực tiếp; không suy diễn chi tiết ngoài phần đã đọc.
- Registry `scripts/data/editorial-manuscripts.mjs` là đầu vào chung của builder và kiểm tra bản thảo, để bài mới không bị bỏ sót khi dựng lại.

- Kiểm tra đợt 2: 27 kiểm tra tự động đạt; 3 kịch bản trình duyệt Chromium đạt, gồm danh sách phản ứng, ảnh có nguồn, đường dẫn mới, nhiều bài trên màn hình 390 px và phạm vi ứng dụng của bài sodium acetate/CO. Build production thành công. Sửa ảnh bìa SVG để giữ nguyên nội dung thay vì cắt chữ khi xem trên điện thoại.

- Chạy lại builder đợt 2 trên 659 tệp JSON/route cho kết quả byte không đổi.

## Đợt 3 — tiếp tục nội dung tiếng Việt

- Bổ sung 63 bài riêng: 20 tiểu sử nghiên cứu, 20 phản ứng có trường hợp công nghiệp/tổng hợp cụ thể, 20 khái niệm qua phép đo hoặc ứng dụng thực, và 3 bài về PTFE, Kevlar, indigo. Tổng số bản thảo bài báo mới qua ba đợt là 133. Số 713 là toàn bộ tài liệu trong kho, bao gồm các hồ sơ cũ còn cần viết sâu; không khẳng định 713 bài đều đã hoàn tất biên tập.
- Viết thêm phần báo chí khoảng 540–590 từ cho 8 hồ sơ hợp chất: KBr, CaF₂, dung dịch K₂CO₃, Fe₂O₃, acid formic, ammonium sulfate, propane và H₂S. Tổng số hồ sơ hợp chất được thêm câu chuyện/trường hợp riêng là 87; còn 264 hồ sơ cần tiếp tục. Các hồ sơ tiểu sử còn 79 ứng dụng ở mức bối cảnh; nhóm nguyên tố còn 13, như đã ghi trong kiểm kê.
- Thêm 4 ảnh đã kiểm tra: các hạt cầu trên Sao Hỏa do Opportunity ghi lại, bó sợi aramid, mẫu indigo trong bộ sưu tập Dresden và cuộn băng PTFE. Manifest hiện có 32 hình, kèm giấy phép, nguồn, tác giả/đơn vị và hàm băm.
- Rà chéo các trường hợp dễ nhầm: phân biệt xúc tác FCC tầng sôi năm 1942 với zeolite ở thập niên 1960; lễ khánh thành ADN năm 2022 với thời điểm sản xuất; công bố mở rộng Geismar tháng 1/2019 với khởi động tháng 12/2018; ảnh đầu dò với mô hình được dựng từ tín hiệu.
- Các nguồn gốc và ảnh giữ ở phần đọc thêm trong từng bài. Tài liệu doanh nghiệp được dùng cho thông tin quy trình/sự kiện của chính doanh nghiệp, không coi lời quảng bá là đánh giá môi trường độc lập.

- Thân bài của 63 bài mới đợt 3 có tổng 38.257 từ theo phép đếm khoảng trắng, mỗi bài 551–686 từ. Kiểm tra bản thảo, metadata và tên hóa học: 27 kiểm tra đạt. Dựng lại 722 tệp JSON/route cho kết quả byte không đổi.

- Bốn kịch bản Chromium đợt 3 đạt; đã xem ảnh chụp màn hình điện thoại của bài indigo và màn hình máy tính của bài Fe₂O₃. Không tràn ngang; ảnh chọn đúng và nguồn/giấy phép hiện trong nội dung. Build production đợt 3 thành công; các cảnh báo bundle/CSS dùng chung đã được ghi ở phần kiểm tra trước.

## Đợt 4 — tăng tốc và đổi mục tiêu theo yêu cầu

- Người dùng giảm mục tiêu xuống **500 bài đầy đủ tiếng Việt mỗi mục** và yêu cầu bổ sung nhanh. Audit dùng ngưỡng mới 500, vẫn báo chưa đạt. Đợt này bổ sung 98 bài: 30 tiểu sử, 30 khái niệm, 30 phản ứng, 5 ứng dụng nguyên tố và 3 câu chuyện vật liệu. Các bản thảo mới có tổng 57.254 từ theo phép đếm khoảng trắng, mỗi bài 510–674 từ. Tổng số bài báo biên soạn mới qua bốn đợt là 231.
- Thêm phần kể chuyện có nguồn cho 6 hồ sơ sẵn có: LiCl và nguyên mẫu DEVap, KOH trong nguồn điện Apollo, MgSO₄ trong nghiên cứu lưu nhiệt, KIO₃ trong muối iod, phenolphthalein khảo sát bê tông và AgNO₃ hiện dấu tay. Giữ đúng phân biệt dung dịch/hydrate, thuốc thử/phụ gia thực phẩm và chất điện li/nhiên liệu. Còn 258 hồ sơ chất cần viết sâu; 92 hồ sơ lịch sử vẫn ở mức bối cảnh ứng dụng.
- Tìm và đưa vào bài 6 hình mới: thử tấm chắn Webb trên mặt đất, bản in Đại lãng của Hokusai, biểu diễn dữ liệu ngưng tụ rubidium, aerogel NASA/JPL, thử phenolphthalein trên bê tông và sổ lưu trữ FBI. Manifest hiện có 38 hình, 37 hình được sử dụng; giữ tác giả, giấy phép, nguồn và SHA-256. Chú thích tách ảnh hiện vật khỏi biểu diễn dữ liệu và ảnh minh họa chủ đề.
- Rà chéo đã sửa DOI/đường dẫn sai trong các bản thảo, đổi báo cáo NREL sang địa chỉ lưu trữ chính thức `docs.nlr.gov`, ghi bài MgSO₄–silica gel theo tập xuất bản 2024, phân biệt năm thử nghiệm với năm công bố. Giữ ghi nhận khi chỉ đọc được abstract hoặc nguồn liên quan; không coi HTTP thành công là bằng chứng đã đọc toàn văn.
- 27 kiểm tra thư viện và tên hóa học đạt. Rút gọn hai phần dẫn nhập bị dài khi ghép với phụ lục cũ. Chạy lại builder trên 818 tệp JSON/route cho kết quả byte không đổi. Build production thành công, với các cảnh báo bundle/CSS đã biết. Audit xác nhận 811 tài liệu riêng, không có lỗi cấu trúc; còn thiếu 1.689 bài để đạt mốc mới.
- 4 kịch bản Chromium trên bản dựng cuối đạt: bộ đếm danh mục, đường dẫn chia sẻ, màn hình 390 px và tải đúng các hình mới kèm ghi công/giấy phép. Đợt tiếp theo đang được biên soạn song song; chưa tính bản nháp vào kiểm kê.
