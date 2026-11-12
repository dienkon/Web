# Nhật ký thao tác và tái tạo

Nhật ký ghi theo nhóm thao tác có đầu vào/đầu ra. Đây không phải bản log chứa thông tin xác thực, cũng không giả lập thời gian từng lệnh. Báo cáo JSON, SHA-256, revision Wiki và kết quả kiểm thử đi kèm cung cấp bằng chứng kiểm tra lại.

| Bước | Đọc/kiểm tra | Thao tác và đầu ra |
| --- | --- | --- |
| 1 | Git main, báo cáo gốc, 118 profile, UI ứng dụng và tinh thể | Xác định phần bổ sung, giữ audit tài liệu gốc và công việc đồng thời |
| 2 | Từng mục trong 676 mục ứng dụng | Phân loại 103 chủ đề; ghi lựa chọn và lý do cho từng mục |
| 3 | Wikipedia pageimages, Commons imageinfo và giấy phép | Tải 101 ảnh, SHA-256 và provenance; chủ đề thiếu ảnh giữ nguồn |
| 4 | Bảng ảnh tổng hợp và mục đích ứng dụng | Loại ảnh chân dung/ảnh bối cảnh lệch; chọn ảnh quy trình, thiết bị hoặc sơ đồ đúng nhãn |
| 5 | 118 infobox Wiki theo revision | Parse trường lồng, pha, Pearson, hằng số, đơn vị, điều kiện; lưu snapshot tham chiếu |
| 6 | AMCSD SQLite và nguồn chuyên ngành | Chọn thêm Mn/Np/Pu/Am; dựng bảy prototype có căn cứ kích thước, ghi rõ giới hạn |
| 7 | Metric, đối xứng, số vị trí, pha và trục | So sánh Wiki; xử lý Mn/DHCP/Ra/P/I/Cs/Rb/Ce; không phát sinh mô hình thiếu dữ liệu |
| 8 | 118 profile và toàn bộ asset cấu trúc | Overlay ảnh/nguồn/mô hình/audit; tạo 133 bộ JSON/CIF/GLB/PNG |
| 9 | Viewer, cấu hình electron, card ảnh | Tách hai hàng, fit camera, atom picking, cầu tiếp xúc, credits, bảng Wiki |
| 10 | Replay overlay | So SHA trước/sau của 118 file: không đổi |
| 11 | JSON/CIF/GLB/PNG, toàn bộ ảnh | Audit liên kết, SHA, loại chứng cứ; render 133 mô hình; giải mã 101 ảnh trong browser |
| 12 | Build production và UI thực tế | Kiểm thử bố cục 1440/1024/390 px, mô hình phức tạp, nguồn/credits và URL lịch sử; lưu screenshot |
| 13 | Phương trình, đồng vị, source SHA | Kiểm tra lại pipeline cũ; không làm thay đổi số phương trình hay hồ sơ nguồn |
| 14 | Diff theo file sở hữu | Commit trên main và push bình thường; không force, không lấy các sửa đổi đồng thời vào commit này |

## Script và lệnh

Chạy từ thư mục `ChemDex`. Node dùng dependency đã khóa; Python cần Gemmi 0.7.5 để tái dựng cell mới. Không cần Gemmi cho trình duyệt.

```powershell
# Các lệnh lấy nguồn cần mạng; giữ provenance/snapshot để so thay đổi nguồn.
node scripts/fetch-application-images.mjs
node scripts/fetch-wiki-crystal-reference.mjs
py -3.12 -X utf8 scripts/extend-wiki-crystals.py
node scripts/generate-crystal-assets.mjs --wiki
node scripts/enrich-application-crystals.mjs
node scripts/render-mineral-previews.mjs --crystals --review
node scripts/audit-crystal-assets.mjs
node scripts/audit-application-crystals.mjs
node --test tests/application-crystal-review.test.mjs tests/crystal-structures.test.mjs
npm run test:platform
python -X utf8 tests/periodic_review_test.py
python -X utf8 scripts/audit-periodic-table.py
npm run build:static
npx playwright test tests/browser/application-crystal-review.spec.mjs tests/browser/library-crystals.spec.mjs tests/browser/periodic-review.spec.mjs --project=chromium --reporter=json
node scripts/capture-application-crystals.mjs
```

Script chụp ảnh cần preview production ở `http://127.0.0.1:4173`. Playwright tự khởi chạy hoặc dùng lại preview trong quá trình kiểm thử. `build:static` cũng tái sinh thư viện chung, vì vậy kết quả ngoài phạm vi cần được xét riêng khi stage Git.

Để chụp trọn thẻ dài hơn màn hình, script screenshot tạm mở chiều cao và bỏ clipping của vùng cuộn cha, tắt animation và ẩn chrome fixed/sticky che vùng chụp. Không thay CSS production; kiểm thử bố cục và tràn ngang vẫn chạy trên giao diện production nguyên trạng. Bảng ảnh tổng hợp là trang kiểm duyệt riêng, không phải màn hình sản phẩm.

`scripts/enrich-crystal-profiles.py` gọi overlay mới nếu snapshot ảnh/Wiki tồn tại. Khi replay từ DOCX, chạy theo pipeline nhập → bổ sung tinh thể → bổ sung ảnh/Wiki; không để bước nhập sau cùng xóa trường bổ sung. Đợt này chỉ chạy kiểm tra replay overlay, không chạy lại toàn bộ nhập DOCX khi công việc thư viện khác đang chỉnh chung checkout.

## File thực thi chính

- Nguồn: `scripts/application-image-topics.mjs`, `fetch-application-images.mjs`, `fetch-wiki-crystal-reference.mjs`, `extend-wiki-crystals.py`.
- Parse/overlay: `shared/chemistry/wiki-infobox.mjs`, `scripts/enrich-application-crystals.mjs`, `scripts/enrich-crystal-profiles.py`.
- Mô hình: `js/three/published-crystal.js`, `scripts/generate-crystal-assets.mjs`, `scripts/render-mineral-previews.mjs`.
- UI: `js/application-media.js`, `js/periodic.js`, `js/core.js`, `css/element-profile.css`.
- Audit: `scripts/audit-crystal-assets.mjs`, `scripts/audit-application-crystals.mjs`; từng profile trỏ đến audit theo tên nguyên tố.
- QA: `tests/application-crystal-review.test.mjs`, `tests/browser/application-crystal-review.spec.mjs`, kiểm thử tích hợp đã có và `scripts/capture-application-crystals.mjs`.

## Lần kiểm tra không đạt và cách xử lý

- Parser regex ban đầu không bảo toàn trường rỗng/template lồng: thay bằng parser theo mức lồng và thêm trường hợp kiểm thử.
- Từ khóa “hàn” khớp lẫn “hàng”/“thành”: sửa ranh giới từ và thêm đối chứng tên ứng dụng.
- Lần render bị Windows từ chối ghi file PNG: chuyển ghi nguyên tử có retry hữu hạn và chạy lại đủ catalog. Chỉ dùng báo cáo cuối không lỗi để kết luận hoàn tất.
- Lần browser đầu có một kiểm thử giả định gợi ý thư viện cũ: sửa kiểm thử theo gợi ý thực tế, giữ xác nhận điều hướng/back/history. Báo cáo ban đầu được giữ ở `browser-tests-initial.json`.
- Một số nguồn chặn/timed out: không tắt xác minh TLS hoặc vượt chặn; dùng nguồn công khai khác và ghi trạng thái thiếu dữ liệu khi không đủ căn cứ.

Số lần kiểm thử và kết quả cuối đọc trực tiếp từ các report, không suy ra từ dòng “lệnh đã chạy”.
