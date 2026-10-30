# Nâng cấp kho phản ứng và chuỗi chuyển hóa

Ngày rà soát: **28/10/2026**. Phạm vi: dữ liệu dùng chung, thư viện tra cứu trong Lab 3D, công cụ chuỗi phản ứng và API tương ứng.

## Kết quả dữ liệu

| Đại lượng | Kết quả |
|---|---:|
| Phương trình phân tử khác nhau | **1.299** |
| Phương trình ion rút gọn khác nhau | **378** |
| Họ phản ứng | **17** |
| Danh tính công thức trong kho | **325** |
| Chuỗi mẫu ba bước, không lặp chất trung gian | **5.740** |
| Mục suy từ quy tắc có điều kiện, ghi rõ nguồn theo họ | 1.225 |
| Mục chuyển hóa được biên soạn riêng | 74 |
| Nguồn trong registry / thực sự được trích ở các mục | 14 / 11 |

Đếm phương trình phân tử và phương trình ion riêng biệt: thay NaCl bằng KCl là một phương trình phân tử khác nhưng không tự trở thành một cơ chế kết tủa mới. Không có mục chỉ khác màu, thời lượng, số thứ tự hoặc hệ số nhân chung.

Đây là kho **phương trình và điều kiện chuyển hóa**, không phải 1.299 mô phỏng 3D đã được hiệu chuẩn. Những chương trình và bài mô phỏng chuyên biệt hiện có vẫn giữ runtime riêng. Mục mới ghi `runtime: reference_only`; thư viện hiển thị rõ phạm vi này.

## Vì sao cần thay bộ sinh cũ

V1 khai báo 1.024 mục, nhưng bộ sinh thực tế có 192 mục phản ứng theo tổ hợp, 64 mục ghép chuỗi và 768 bản sao đổi thời lượng. Một số mục dùng chữ “muối” thay sản phẩm trong phương trình, ghép ion thành công thức chưa đúng điện tích, thiếu ion đối hoặc chọn hai phản ứng không nối sản phẩm–chất tham gia.

V2 tạo công thức muối theo điện tích, giải hệ số nguyên tối giản, giữ đầy đủ sản phẩm và loại trùng bằng khóa phương trình. Chuỗi là đường đi qua các quan hệ chuyển hóa được khai báo trong từng phản ứng; không ghép hai hàng bất kỳ để đủ số lượng.

## Phân bố nội dung

| Nhóm | Số phương trình |
|---|---:|
| Kết tủa | 601 |
| Kim loại đẩy kim loại | 132 |
| Trung hòa axit–bazơ | 115 |
| Oxit và axit | 106 |
| Cacbonat/hiđrocacbonat và axit | 91 |
| Thủy phân este trong kiềm | 48 |
| Muối amoni và kiềm | 33 |
| Cháy hoàn toàn | 29 |
| Nhiệt phân | 29 |
| Kim loại và axit | 27 |
| Tổng hợp | 22 |
| Este hóa | 16 |
| Sunfit và axit | 15 |
| Sunfua và axit | 12 |
| Oxi hóa–khử biên soạn riêng | 10 |
| Chuyển hóa hữu cơ | 8 |
| Chất lưỡng tính | 5 |

## Chính sách hóa học và nguồn

Nguồn chính là [OpenStax về phân loại phản ứng](https://openstax.org/books/chemistry-2e/pages/4-2-classifying-chemical-reactions), [Purdue về độ tan](https://chemed.chem.purdue.edu/genchem/topicreview/bp/ch18/soluble.php), [OpenStax về kết tủa–hòa tan](https://openstax.org/books/chemistry-2e/pages/15-1-precipitation-and-dissolution), [thế điện cực](https://openstax.org/books/chemistry-2e/pages/17-3-electrode-and-cell-potentials), [carbonate](https://openstax.org/books/chemistry-2e/pages/18-6-occurrence-preparation-and-properties-of-carbonates) và [hóa học este](https://openstax.org/books/organic-chemistry/pages/21-6-chemistry-of-esters). Registry lưu URL, tiêu đề và phạm vi áp dụng; từng mục trỏ tới source ID.

Nguồn theo họ phản ứng xác nhận cơ sở suy luận, không có nghĩa mỗi phương trình đều xuất hiện nguyên văn trong nguồn hoặc đã được đo thực nghiệm riêng. Trường `evidence.scope` hiện ghi `family`. Cân bằng nguyên tố/điện tích là điều kiện cần; nó không tự chứng minh tốc độ, lượng kết tủa, độ chọn lọc hoặc sự tương thích của một hỗn hợp cụ thể.

Các ràng buộc đã áp dụng:

- Kết tủa yêu cầu ion tự do đạt `Q > Ksp`; không gán kết tủa cho mọi phép trộn chỉ từ tên chất. Các ion đối được giữ trong muối sản phẩm.
- Không sinh AgOH như pha rắn bền; nhánh Ag(I) với kiềm tạo Ag₂O và nước.
- Không sinh phổ quát CuI₂, FeI₃, carbonate Al(III)/Fe(III)/Cr(III) trong các họ dung dịch nước này. Cu(II)/Fe(III) với iodide cần xét redox.
- Không dùng CuCO₃ đơn thuần để đại diện mọi kết tủa carbonate đồng trong nước; các trường hợp carbonate bazơ không được suy đại trà.
- Hydroxide lưỡng tính yêu cầu kiểm soát lượng kiềm; Fe(II)/Mn(II) có lưu ý hạn chế O₂ khi cần giữ số oxi hóa ban đầu.
- Kim loại sinh H₂ chỉ dùng axit không oxi hóa loãng trong tập hỗ trợ. Không suy H₂ cho Cu/Ag với HCl hoặc cho Zn với HNO₃.
- Không dùng Na/K/Li/Ca/Ba như một nhánh đẩy kim loại phổ quát trong dung dịch nước.
- Nhiệt phân LiNO₃ khác nhánh NaNO₃/KNO₃; không lấy một quy tắc chung cho toàn bộ nitrate.
- NH₃ nhận proton tạo muối amoni; không tự thêm sản phẩm nước vào phương trình không bảo toàn.
- Este hóa ghi phản ứng thuận nghịch, alcohol/acid mạch thẳng và điều kiện xúc tác; thủy phân kiềm có sản phẩm carboxylat và alcohol rõ ràng.
- Không đặt một giá trị nhiệt, tốc độ, màu hoặc độ tin cậy số chung cho tất cả họ phản ứng. Nhiệt chưa có nguồn riêng để `null`, hiệu ứng ghi `calibrated: false`.

Pha rắn hydroxide/oxalat/photphat có thể được viết theo công thức quy ước không ghi nước hydrat; dữ liệu nói rõ chưa xác định đa hình hoặc hydrate. Phương trình ion là mô hình tách ion hình thức, không thay một bộ giải speciation đầy đủ; ví dụ phân bố HSO₄⁻/SO₄²⁻ hoặc phối tử cần điều kiện dung dịch cụ thể.

## Cấu trúc dữ liệu và truy vết

| Tệp | Chức năng |
|---|---|
| `shared/reaction-catalog.generated.json` | Catalog V2: phản ứng, công thức, pha, hệ số, điều kiện, nguồn, phương trình ion và quan hệ chuyển hóa |
| `shared/reaction-chains.generated.json` | 5.740 chuỗi mẫu; mỗi bước tham chiếu reaction ID và có digest của catalog nguồn |
| `shared/reaction-data-summary.json` | Số đếm và digest rút gọn, không thay dữ liệu gốc |
| `shared/chemistry/catalog-sources.json` | Registry nguồn và phạm vi đối chiếu |
| `shared/chemistry/curated-reactions.mjs` | Các biến đổi riêng về oxide, carbonate, nitrate, redox, lưỡng tính và hữu cơ |
| `scripts/generate-reaction-catalog.mjs` | Bộ sinh có whitelist, ngoại lệ và cổng kiểm tra trước khi ghi |
| `shared/chemistry/formula.mjs` | Parser công thức phân biệt hoa/thường, nhóm lồng, hydrate; cân bằng hữu tỉ chính xác |
| `shared/chemistry/ionic.mjs` | Tách/cancel ion đối, rút hệ số tối giản và kiểm tra điện tích |
| `shared/chemistry/chemical-constraints.mjs` | Các cổng loại trừ hóa học độc lập với phép cân bằng |
| `shared/chemistry/reaction-catalog.mjs` | Validator, chỉ mục, tra cứu và tìm chuỗi |

Reaction ID là hash của hai vế đã chuẩn hóa thứ tự và rút hệ số; đổi tiêu đề/thời lượng không tạo thêm phản ứng. Chain ID chứa đường chất và các reaction ID; thay catalog làm digest thay đổi và cổng audit sẽ phát hiện chuỗi cũ chưa được tái sinh.

Mỗi quan hệ `transfers` gồm `from`, `to`, `carrier` và `workup`. Hai công thức phải thực sự nằm ở vế trái/phải và chứa nguyên tố được chuyển tiếp. Đây là quan hệ chuyển hóa giữa các mẫu, không khẳng định một nguyên tố biến thành nguyên tố khác; chất bổ sung được hiển thị trong từng bước.

## Chuỗi phản ứng hoạt động như thế nào

Các chuỗi ba bước được liệt kê từ graph sau khi gộp cạnh cùng chất đầu/cuối để tránh nhân nhánh tìm kiếm bởi ion đối. Không lặp chất trung gian hoặc reaction ID trong một chuỗi mẫu. Mỗi mũi tên tham chiếu phương trình đầy đủ; không chỉ có danh sách tên chất.

Bộ tìm chuỗi theo yêu cầu hỗ trợ tối thiểu 1–8 bước, tìm đến tối đa 10 bước và tối đa 40.000 trạng thái. Nó kiểm tra đường nối ngược để loại nhánh không tới đích, không chèn vòng lặp để đủ số bước. Chuỗi khép kín chỉ hợp lệ khi người dùng yêu cầu cùng chất đầu/cuối và các bước trung gian khác nhau. Hết ngân sách tìm kiếm hoặc thiếu dữ liệu được báo riêng, không kết luận “hóa học bất khả thi”.

Những ví dụ đã kiểm tra:

```text
Fe → FeCl2 → Fe(OH)2 → Fe(OH)3 → Fe2O3
Na → NaOH → NaCl → AgCl
C → CO2 → CaCO3 → CaO → CaCl2
Al → Al2O3 → AlCl3 → Al(OH)3 → NaAlO2
CaCO3 → CaO → Ca(OH)2 → CaCl2 → CaCO3
S → SO2 → SO3 → H2SO4
CH4 → C2H2 → C2H4 → C2H5OH → CH3CHO → CH3COOH → CH3COOC2H5
```

Ví dụ ở cấp phương trình: `Ba(NO3)2 + K2SO4 → BaSO4 + 2KNO3`, không mượn sản phẩm NaCl của preset BaCl₂/Na₂SO₄. Khi đi tiếp sang bước cần kết tủa riêng, chuỗi ghi việc tách/rửa và thay môi trường; không coi tất cả là cùng một thí nghiệm một bình.

## Tích hợp sản phẩm

**Lab 3D:** mở **Bài học → Kho mở rộng & chuỗi**. Có tìm kiếm theo công thức Unicode/tên tiếng Việt, lọc đủ 17 nhóm, phân trang, xem phương trình ion, điều kiện và nguồn. Trong chế độ chuỗi có phân tích chuỗi đã nhập, tìm từ chất đầu/cuối và mở/lọc/chọn kho 5.740 chuỗi mẫu. Tab **Bài thực hành** vẫn dùng các bài có runtime riêng.

**Công cụ Chuỗi phản ứng:** tính chuỗi cục bộ từ cùng catalog; kết quả có reaction ID, chất đầu/cuối của từng bước, LaTeX, điều kiện, chất bổ sung, xử lý mẫu và liên kết nguồn. Lịch sử mới giữ các trường truy vết; lịch sử cũ chưa có reaction ID được đánh dấu riêng.

**API:** đường công khai `/api/gemini/chain/` giữ tên để tương thích client cũ nhưng trả kết quả từ catalog. Server công cụ cũng phục vụ `/api/analyze` và `/api/generate` theo cùng bộ giải. Không cần Gemini API key để dùng các tính năng chuỗi này; dữ liệu ngoài kho trả trạng thái chưa xác nhận và không tự sinh phương trình AI để lấp chỗ trống.

```json
{"action":"generate","start":"S","end":"H2SO4","minSteps":3}
```

Phản hồi có `source: catalog`, `catalogVersion`, `catalogCount`, `status`, `substances`, `steps`, ghi chú về xử lý mẫu. Mỗi step có nguồn và phương trình gốc. Input sai trả 400; thiếu dữ liệu có `status: not-found`, lỗi giải thích và mảng bước rỗng.

Catalog và kho chuỗi mẫu được chia chunk tải muộn. Bản build kiểm tra cho thấy chunk catalog khoảng **105,29 kB gzip**, chunk 5.740 chuỗi khoảng **128,61 kB gzip**; kích thước này là gzip tính bởi Vite, không phải cam kết băng thông thực tế ở mọi máy chủ. Chúng không được nhúng vào tải đầu của cảnh lab. Danh sách chỉ render 40 phản ứng hoặc 20 chuỗi mỗi trang.

## Lệnh xây dựng và cổng kiểm tra

Từ thư mục ChemDex:

```powershell
npm run catalog:build
npm run catalog:audit
npm run test:reactions
npm run lint:api
```

`catalog:build` tạo đồng bộ catalog, chuỗi và summary. Build platform gọi bước này trước khi dựng/copy nội dung, và trước khi xóa output cũ. Entry cũ `lab-3d/scripts/generateReactionCatalog.mjs` còn dùng được để sinh riêng catalog; ưu tiên lệnh root để cập nhật cả digest chuỗi.

Kiểm tra các ứng dụng:

```powershell
npm --prefix lab-3d run lint
npm --prefix lab-3d run build
npm --prefix tien-ich/phuong-trinh/chuoi-phan-ung run lint
npm --prefix tien-ich/phuong-trinh/chuoi-phan-ung run build
```

Validator không tin số đếm trong manifest: nó duyệt các phương trình, công thức, hệ số, cân bằng nguyên tố/điện tích, độ tối giản, trùng lặp, nguồn, ràng buộc hóa học và các cạnh chuyển hóa. Validator chuỗi đọc lại reaction ID và kiểm tra từng đoạn nối; test tái sinh dữ liệu để phát hiện snapshot không còn khớp mã nguồn.

17 kiểm thử bao gồm các phương trình đa hóa trị/redox cho trước, toàn bộ catalog, toàn bộ 5.740 chuỗi, ion đối, ngoại lệ, ký hiệu pha khí và các bản dữ liệu cố ý bị sửa sai. Đây là phạm vi kiểm tra tự động, không thay đánh giá thực nghiệm từng điều kiện mẫu.

## Bằng chứng và giới hạn kiểm tra

| Cổng kiểm tra | Kết quả |
|---|---|
| Cân bằng, cấu trúc, điện tích, trùng lặp, nguồn và ngoại lệ | Đạt trên toàn bộ 1.299 phương trình |
| Liên kết và độ mới của chuỗi | Đạt trên toàn bộ 5.740 chuỗi mẫu |
| Unit/API tests | 17/17 đạt |
| TypeScript API, Lab 3D và công cụ chuỗi | Đạt |
| Production build Lab 3D và công cụ chuỗi | Đạt |
| Kiểm tra trình duyệt và HTTP | 12 kiểm tra đạt, không có exception JavaScript; tìm chuỗi trên UI không gọi API |
| Cú pháp KaTeX | Render được cả 1.299 phương trình; font KaTeX có cảnh báo metrics với một số dấu tiếng Việt, trình duyệt dùng font thay thế |

Nhãn điều kiện trên mũi tên đã rút gọn; mô tả đầy đủ vẫn nằm bên dưới. Khí ở vế tham gia dùng ký hiệu `(g)`, không dùng mũi tên thoát khí như sản phẩm. Trên màn hình nhỏ, bảng tra cứu được đặt trên thanh dụng cụ để các nút không bị che.

- [Audit toàn bộ dữ liệu](reaction-data-1000plus/audit.json).
- [Kết quả kiểm tra production trên trình duyệt](reaction-data-1000plus/browser-review.json).
- [Kiểm tra cú pháp phương trình](reaction-data-1000plus/latex-review.json).
- [Log unit/API tests](reaction-data-1000plus/tests.txt), [TypeScript API](reaction-data-1000plus/typecheck-api.txt), [TypeScript lab](reaction-data-1000plus/typecheck-lab.txt), [TypeScript công cụ chuỗi](reaction-data-1000plus/typecheck-chain.txt).
- [Build lab](reaction-data-1000plus/build-lab.txt), [build công cụ chuỗi](reaction-data-1000plus/build-chain.txt).
- [Chi tiết phản ứng trong lab](reaction-data-1000plus/lab-catalog-detail.png).
- [Chuỗi calcium trong lab](reaction-data-1000plus/lab-calcium-chain.png).
- [Kho chuỗi mẫu trong lab](reaction-data-1000plus/lab-chain-examples.png).
- [Tra cứu trên viewport 390 px](reaction-data-1000plus/lab-catalog-mobile.png).
- [Công cụ phân tích chuỗi sắt](reaction-data-1000plus/chain-tool-analysis.png).
- [Công cụ tìm chuỗi sulfur](reaction-data-1000plus/chain-tool-sulfur.png).

Kiểm tra trình duyệt dùng Chrome trên máy tính, gồm viewport mobile mô phỏng; không phải kiểm tra Android/iOS thật. Cổng dữ liệu không khẳng định động học, nhiệt độ ngưỡng hay mức chuyển hóa được hiệu chuẩn cho tất cả 1.299 mục. Các kết tủa cần thông tin nồng độ/speciation thực; chuỗi có thể cần thiết bị chuyên dụng và bước xử lý ngoài phạm vi mô phỏng hiện tại.
