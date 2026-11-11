"""Build the audit index, detailed changelog and operation/file manifest."""
from collections import Counter
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/periodic-table-audit/2026-11-11'
read = lambda file: json.loads(file.read_text(encoding='utf-8-sig'))
summary = read(OUT / 'summary.json')
audits = [read(OUT / 'files' / f'{e["number"]:03d}_{e["symbol"]}.json') for e in summary['elements']]
eqs = [r for a in audits for r in a['publishedEquations']]
images = read(ROOT / 'data/element-image-provenance.json')
photo_count = sum(r['status'] == 'downloaded' for r in images['elements'])
model_render = read(OUT / 'model-render-verification.json')
browser_path = OUT / 'browser-tests.json'
browser = read(browser_path) if browser_path.exists() and browser_path.stat().st_size else None
validation = read(OUT / 'validation.json')

intro = f'''# Kiểm duyệt toàn bộ bảng tuần hoàn ChemDex

Ngày đối chiếu: **11/11/2026**, múi giờ người dùng Asia/Saigon. Cập nhật đè toàn bộ **118 hồ sơ** từ **118 file Word**, gồm **11.426 đoạn**. Trước thay đổi có 68 hồ sơ, sau thay đổi có 118; cả 68 hồ sơ cũ được nhập lại.

Điểm vào: [changelog chi tiết](CHANGELOG.md), [nhật ký thao tác](OPERATIONS.md), [kiểm tra dữ liệu](validation.json), [kiểm tra trình duyệt](browser-tests.json), [kiểm tra render 3D](model-render-verification.json), [manifest thay đổi file](change-manifest.json).

## Kết quả và cách đọc

- {summary['editorialDecisions']} quyết định biên tập theo đúng số đoạn trong bản nguồn; đây là số quyết định sửa/loại/diễn giải, không phải số lỗi khoa học độc lập.
- {len(eqs):,} vị trí phương trình được kiểm tra lại, gồm {len(set(r['equation'] for r in eqs))} chuỗi phương trình khác nhau sau chuẩn hóa. Các phần điều chế/nhận biết/tính chất có thể lặp lại cùng phản ứng.
- Phân loại: {Counter(r['kind'] for r in eqs)['chemical']} hóa học, {Counter(r['kind'] for r in eqs)['nuclear']} hạt nhân, {Counter(r['kind'] for r in eqs)['physical']} quá trình vật lý, {Counter(r['kind'] for r in eqs)['formal']} sơ đồ ion/hệ số hình thức hoặc dự đoán.
- {validation['isotopes']} bản ghi đồng vị chọn lọc. Bỏ việc công bố chu kỳ bán rã như số đo đã xác nhận khi không có bản ghi đối chiếu; nguồn và giới hạn được ghi ở từng nguyên tố.
- {photo_count} ảnh tham chiếu có trang nguồn/tác giả/giấy phép; 118 sơ đồ định danh tự dựng. Khi ảnh chưa được xác minh hoặc giấy phép không phù hợp, website dùng sơ đồ có nhãn.
- 49 mô hình hình thái khoáng vật GLB và 49 ảnh render, liên kết với 79 nguyên tố. 39 nguyên tố còn lại có lý do không dựng quặng riêng. Một khoáng vật có thể liên quan tới nhiều nguyên tố; phần mô tả phân biệt nguyên tố chính với nguyên tố vết/thay thế/sản phẩm phân rã.
- JSON audit từng file lưu đầy đủ cặp giá trị trước/sau của {sum(a['fieldChanges'] for a in summary['elements'])} trường hồ sơ. Markdown audit ghi các phát hiện, lý do xử lý, đối chiếu đồng vị, phương trình và nguồn.

## Phạm vi xác minh

Đã đọc toàn bộ văn bản OOXML theo thứ tự đoạn, kể cả các đoạn trong bảng. Bộ nguồn không có phương trình OMML hoặc phần chú thích/đầu trang/chân trang riêng cần trích bổ sung. Không thay đổi DOCX gốc. Văn bản nguồn được xử lý như dữ liệu, không như chỉ dẫn thực thi.

Đã đối chiếu dữ liệu nền với CIAAW, RSC, PubChem, NIST và IAEA; có các nguồn nghiên cứu riêng cho trường hợp cần sửa. Không coi bảo toàn nguyên tử/điện tích/số khối là bằng chứng phản ứng xảy ra. Điều kiện định tính là biên tập theo phản ứng và ngữ cảnh; không tự tạo thông số nhiệt độ/áp suất số để hợp thức hóa phản ứng thiếu cơ sở.

Mô hình 3D là hình học minh họa hình thái, màu gần đúng, không theo tỉ lệ; không phải ảnh quét mẫu thật hay tọa độ tinh thể thực nghiệm. Không dựng quặng giả cho nguyên tố nhân tạo. Bảng đồng vị là danh sách chọn lọc, không phải danh mục mọi đồng vị đã biết.

## Kiểm tra

- Kiểm tra dữ liệu: {'PASS' if validation['valid'] else 'FAIL'} — 118 hồ sơ, 1.110 vị trí phương trình, 523 bản ghi đồng vị, SHA-256 bản nguồn, tổng electron, hạt nhân tham chiếu, ảnh cục bộ và cấu trúc GLB.
- Render mô hình: {len(model_render['models'])}/49 thành công, {len(model_render['errors'])} lỗi WebGL.
- Kiểm thử bảo toàn hồi quy: 5/5 đạt (`python tests/periodic_review_test.py`).
- Kiểm thử nền tảng/thư viện: 26/26 đạt (`npm run test:platform`).
- Build: `npm run build:static` đạt, dùng bản build hiện có của các app con. Không rebuild/publish toàn bộ app con, không triển khai lên hosting.
'''
if browser:
    intro += f"- Kiểm thử trình duyệt Chromium: {browser['stats']['expected']}/4 đạt, {browser['stats']['unexpected']} thất bại, {browser['stats']['skipped']} bỏ qua; có vòng chuyển đủ 118 nguyên tố và kiểm tra mobile 360 px.\n"
intro += '''
## Bằng chứng hình ảnh

[Ảnh hồ sơ desktop](screenshots/iron-desktop.png) · [Bảng đồng vị](screenshots/iron-isotopes.png) · [Mô hình khoáng vật](screenshots/iron-mineral.png) · [Hồ sơ mobile](screenshots/oganesson-mobile.png) · [Phương trình mobile](screenshots/oganesson-reactions-mobile.png).

![Tổng quan ảnh tham chiếu](photo-contact-sheet.jpg)

![Tổng quan mô hình hình thái khoáng vật](mineral-contact-sheet.jpg)

## Audit từng file

| Z | File nguồn và báo cáo | Đoạn đã đọc | Quyết định biên tập | Vị trí phương trình | Mô hình khoáng vật |
|---|---|---:|---:|---:|---|
'''
for a in audits:
    name = Path(a['source']).stem
    mineral = a['media']['mineral']
    intro += f"| {a['number']} | [{a['source']}](files/{name}.md) · [JSON](files/{name}.json) · [văn bản nguồn](sources/{name}.txt) | {a['paragraphCount']} | {len(a['editorialDecisions'])} | {len(a['publishedEquations'])} | {mineral.get('name', 'Không có quặng riêng')} |\n"
intro += '''
## Tái lập kết quả

`npm run periodic:import` đọc lại 118 DOCX hiện có. `npm run periodic:replay` dùng snapshot văn bản đã lưu trong audit, không cần DOCX. `npm run periodic:audit` kiểm tra toàn bộ dữ liệu và media. Nguồn RSC có snapshot các fact box trong `reference-facts.json`; PubChem và IAEA có snapshot trong `references/` cùng SHA-256. Các nguồn trực tuyến có thể thay đổi sau ngày đối chiếu.

`npm run periodic:models` dựng lại GLB/sơ đồ và render PNG bằng Chromium. `node scripts/capture-periodic-review.mjs` chụp giao diện qua preview local đang chạy. Sau khi thay đổi dữ liệu/giao diện, chạy build trước kiểm thử trình duyệt.
'''
(OUT / 'README.md').write_text(intro, encoding='utf-8')

change = '''# Changelog cập nhật toàn bộ bảng tuần hoàn

Ngày 11/11/2026. Phạm vi: dữ liệu và giao diện bảng tuần hoàn ChemDex trong checkout `main`. Giữ nguyên thay đổi người dùng đã có ở các thư mục tài liệu.

## Dữ liệu và bộ nhập

1. Thay bộ nhập mất dữ liệu bằng bộ nhập 118 tài liệu; nhập đè cả hồ sơ cũ và bổ sung 50 hồ sơ thiếu.
2. Đọc XML Word, giữ số đoạn, số khối trên/chỉ số dưới, băm SHA-256, lưu văn bản và inventory. Kiểm tra cả OMML và các phần tài liệu bổ sung trước khi kết luận phạm vi trích xuất.
3. Sửa phân đoạn có dấu hai chấm, tiêu đề đánh số `9. Tổng quan`, Unicode tổ hợp `Nhận biết`, nhãn `Phát hiện:`, `Cấu hình electron:` và `Hợp chất phổ biến:`.
4. Không coi dòng `Phương trình:` trong điều chế là bắt đầu mục phản ứng chung. Không coi câu diễn giải có chữ “điều chế” là một tiêu đề; khắc phục mất đoạn ở Ar/Po.
5. Đồng bộ cấu hình electron, số electron từng lớp, nhóm 1–18 và họ f. Nhóm VIIIB cũ được phân biệt 8, 9, 10; No không bị đưa vào nhóm 12 vì số oxi hóa +2.
6. Đồng bộ nguyên tử khối với 84 giá trị CIAAW kèm độ bất định; phân biệt số khối đồng vị tham chiếu ở nguyên tố không có nguyên tử khối chuẩn. Số neutron được ghi cho đồng vị cụ thể, không suy từ khối lượng trung bình.
7. Bổ sung bảng đồng vị chọn lọc có hàm lượng, chu kỳ bán rã, ký hiệu nguồn và độ bất định. Dữ liệu ground-states không được dùng mù quáng để khẳng định bền cho Ge-76/Xe-124; có nguồn nghiên cứu riêng.
8. Giữ trạng thái “chưa xác định/ước tính/dự đoán” ở thông số chưa đo; phân biệt carbon thăng hoa, helium không hóa rắn ở áp suất khí quyển và dạng thù hình phosphorus.
9. Đồng bộ dữ liệu dùng chung, nhiệt độ nóng chảy và các bài thư viện được build sinh lại từ hồ sơ. Các app con dùng bản build đã có; không sửa logic riêng của DkTest hoặc các phòng lab.

## Phương trình và biên tập khoa học

Kiểm tra bảo toàn nguyên tử, điện tích ion, số khối và Z hạt nhân. Giữ phân loại hóa học/hạt nhân/vật lý/sơ đồ hình thức. Thêm phản neutrino cho phân rã beta và gamma cho sơ đồ bắt neutron phù hợp. Không cân bằng hình thức để giữ một phản ứng sai sản phẩm hoặc không có cơ sở. Phương trình trong từng vị trí đều có điều kiện/giới hạn diễn giải.

Các sửa đổi theo đúng đoạn bản nguồn được liệt kê dưới đây; cặp trước/sau đầy đủ nằm trong audit JSON từng file.

'''
for a in audits:
    if not a['editorialDecisions']: continue
    stem = Path(a['source']).stem
    change += f"## {a['source']}\n\n[Audit chi tiết](files/{stem}.md).\n\n"
    for e in a['editorialDecisions']:
        change += f"- Đoạn {e['line']}: {e['reason']}\n  - Trước: {e['before']}\n  - Sau: {e['after'] or 'Loại phương trình/sơ đồ khỏi nội dung xuất bản; giữ nguyên trong bản nguồn và audit.'}\n"
    change += '\n'
change += '''## Media

- Tải ảnh tham chiếu theo tên file được định danh; chỉ giữ giấy phép CC BY, CC BY-SA, CC0 hoặc public domain đủ thông tin. Tác giả, giấy phép, URL và SHA-256 nằm trong `data/element-image-provenance.json`.
- Truy vấn Commons ban đầu bị HTTP 429; chuyển sang truy vấn MediaWiki theo lô và tải giãn cách. Những ảnh còn lỗi/không xác minh dùng sơ đồ cục bộ, không dùng link hỏng.
- Tạo 118 sơ đồ SVG định danh/lớp electron có nhãn rõ, 49 GLB khoáng vật và 49 PNG render. Tổng 129.010 tam giác trong 49 mẫu hình học; mỗi mẫu có disclaimer/provenance trong GLB extras.
- Ghi rõ ảnh N/O/F là pha lỏng, ảnh Po/Ra là lượng nhỏ lắng đọng/mạ, ảnh uranium là mẫu kim loại; không dùng như ảnh quặng tự nhiên.
- Lựa chọn khoáng vật đại diện cho 79 nguyên tố; ghi rõ nguyên tố vết/thay thế/phân rã và các trường hợp không có quặng riêng.

## Giao diện

- Bố cục thông tin chung có trạng thái, khối lượng riêng, nóng chảy, sôi; nhóm số và họ f được hiển thị đúng.
- Tên tiếng Việt, tên tiếng Anh và số hiệu rõ; bổ sung màu/lọc kim loại hậu chuyển tiếp.
- Bảng đồng vị có hàng xen kẽ, nguồn từng bản ghi, cuộn ngang trong vùng bảng và tiêu đề cố định; không làm tràn trang mobile.
- Điều chế/nhận biết hiển thị nhiều phương trình riêng, ghép hiện tượng với phép thử. Điều kiện dài được đọc dưới phương trình để không kéo mũi tên ra quá rộng.
- Mô hình tải theo yêu cầu, có poster, điều khiển xoay/dừng/reset, tải GLB, xử lý khi WebGL không có và hủy tài nguyên sau khi chuyển nguyên tố.
- Không thay cấu trúc chưa hỗ trợ bằng BCC mặc định; không vẽ mạng tinh thể rắn như trạng thái thường của chất khí/lỏng hoặc một cấu trúc dự đoán đã đo.
- Sửa loader không ghi đè ảnh đã biên tập bằng đường dẫn mặc định không tồn tại.
- Sửa IntersectionObserver để mục dài không bị ẩn vĩnh viễn và giải phóng observer cũ; rút gọn header số khối trên mobile, giữ giải thích riêng.

## Công cụ và kiểm tra

Bổ sung các lệnh `periodic:import`, `periodic:replay`, `periodic:audit`, `periodic:models`; lệnh nhập cũ chuyển sang bộ nhập đã audit. Thêm 5 bài kiểm thử hồi quy bảo toàn và 4 bài kiểm thử browser. Kết quả build, 26 kiểm thử nền tảng, kiểm tra dữ liệu 118 hồ sơ và render 49 GLB được lưu trong thư mục audit. Không xuất bản hoặc push lên remote trong lần làm việc này.
'''
(OUT / 'CHANGELOG.md').write_text(change, encoding='utf-8')

operations = '''# Nhật ký thao tác cập nhật bảng tuần hoàn

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
'''
(OUT / 'OPERATIONS.md').write_text(operations, encoding='utf-8')

def git(*args):
    return subprocess.check_output(['git', '-c', 'core.safecrlf=false', *args], cwd=ROOT, stderr=subprocess.DEVNULL)

prefix = git('rev-parse', '--show-prefix').decode().strip()
tracked = git('diff', '--name-only', '--relative', '--', '.').decode('utf-8').splitlines()
untracked = git('ls-files', '--others', '--exclude-standard').decode('utf-8').splitlines()
changes = []
for name in sorted(set(tracked + untracked)):
    name = name.strip('"')
    p = ROOT / name
    if not p.is_file() or name.startswith(('DATA PERIOD TABLE/', 'Các nguyên tố hóa học trong bảng tuần hoàn/')) or name.endswith('change-manifest.json'):
        continue
    # Git can quote non-ASCII paths unless core.quotepath is disabled; source
    # inputs are already represented separately by their exact filenames.
    if name in tracked:
        try: before = git('show', 'HEAD:' + prefix + name)
        except subprocess.CalledProcessError: before = None
    else: before = None
    after = p.read_bytes()
    changes.append({'path': name, 'operation': 'modify' if before is not None else 'create',
                    'beforeSha256': hashlib.sha256(before).hexdigest() if before is not None else None,
                    'afterSha256': hashlib.sha256(after).hexdigest(), 'bytes': len(after)})
(OUT / 'change-manifest.json').write_text(json.dumps({'date':'2026-11-11', 'scope':'ChemDex only; pre-existing source-document moves/deletions excluded', 'files':changes}, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'auditFiles':len(audits),'editorialDecisions':summary['editorialDecisions'],'filesRecorded':len(changes),'browser':browser['stats'] if browser else 'pending'}))
