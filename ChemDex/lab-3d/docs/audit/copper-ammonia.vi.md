# Cân bằng đồng(II)–ammonia trong lab 3D

Bản cập nhật 14-11-2026 bỏ ngưỡng cứng “NH3/Cu ≥ 4 thì tan hết”. Thủ công, mẫu Studio, dự đoán native và auto cùng dùng bộ giải trong `science/copperAmmoniaEquilibrium.ts` và ghi nhận vật chất qua `engine/copperAmmoniaLedger.ts`.

## Cơ sở và miền mô hình

[Purdue: Combined Equilibria](https://chemed.chem.purdue.edu/genchem/topicreview/bp/ch18/combine.php) mô tả các cân bằng liên quan giữa tính bazơ của ammonia, phức đồng và độ tan hydroxide. Việc thêm NH3 không chỉ cung cấp bốn phối tử: nó còn thay đổi pH, NH4+ và lượng Cu(OH)2. Vì vậy phải xét nồng độ và các lượng chất thực có.

Bốn hằng số tạo phức tích lũy và enthalpy được chọn từ [SKB TR-00-13, mục 7.7.1.2, trang in 87, trang PDF 84](https://skb.com/publication/17527/TR-00-13.pdf). Giá trị ở 25 °C:

| Số phối tử NH3 | log10 βn | ΔH tạo phức tích lũy, kJ/mol |
|---:|---:|---:|
| 1 | 4,10 | −24 |
| 2 | 7,51 | −45 |
| 3 | 10,31 | −68 |
| 4 | 12,35 | −90 |

Ba phức hydroxo–ammine được bổ sung từ cùng mục nguồn. Hằng số bên dưới dùng phản ứng Cu²⁺ + nNH₃ + mOH⁻ ⇌ phức:

| Phức | n | m | log10 β | ΔH được nguồn ước lượng, kJ/mol |
|---|---:|---:|---:|---:|
| CuNH₃OH⁺ | 1 | 1 | 11,3 | −44 |
| Cu(NH₃)₂(OH)₂(aq) | 2 | 2 | 17,0 | −69 |
| Cu(NH₃)₃OH⁺ | 3 | 1 | 15,0 | −88 |

Nguồn chưa có dữ liệu nhiệt thực nghiệm đầy đủ cho ba phức này. Đường nhiệt dùng các enthalpy ước lượng để ngoại suy. Giả thiết ΔCp = 0 của nguồn áp dụng cho phản ứng dùng H₂O tạo H⁺: mô hình đổi βOH sang K trên cơ sở này qua Kw(25 °C), ngoại suy, rồi đổi lại bằng Kw(T). Không áp dụng trực tiếp giả thiết đó cho phản ứng kết hợp OH⁻, và không coi kết quả ngoài 25 °C là một phép hiệu chuẩn đã đo.

Dùng cùng bộ số liệu này cho cả bốn phức; không trộn β4 từ bảng giáo khoa khác vào các hằng số đã chọn. Sự phụ thuộc nhiệt dùng van’t Hoff với giả thiết ΔCp = 0. Hằng số NH4+/nước/bisulfate, thủy phân Cu(II), cặp CuSO4 và Cu(OH)2 lấy từ các mô hình aqueous hiện có dựa trên [cơ sở dữ liệu PHREEQC](https://github.com/phreeqc-dev/phreeqc3/blob/master/database/wateq4f.dat).

Miền đầu vào gồm nước lỏng, CuSO4(aq), Cu(OH)2 rắn hoặc pool hòa tan, NH3(aq), (NH4)2SO4, H2SO4 dung dịch, NaOH, Na2SO4 và các pool ammine đã tạo; nhiệt độ 0–90 °C. Chất trên giấy lọc/bọt không tham gia. Không tự hòa tan CuSO4 khô hoặc dùng NH3 khí thay dung dịch.

## Những đại lượng được giải đồng thời

- Cân bằng điện tích, tổng Cu, tổng N và tổng sulfate; tổng Na là ion khán trong miền được hỗ trợ.
- NH4+ ⇌ H+ + NH3, cân bằng nước và bisulfate.
- Cu2+ + nNH3 ⇌ [Cu(NH3)n]2+, với n = 1–4.
- Ba cân bằng Cu/NH3/OH− hỗn hợp ở bảng trên, với điện tích sản phẩm lần lượt +1, 0 và +1. OH− là phối tử của các loài này, không được đếm chúng như ba phức tetraammine khác.
- Thủy phân đơn nhân Cu(II) và cặp ion CuSO4(aq).
- Điều kiện pha: có Cu(OH)2 rắn thì [Cu2+][OH−]² = Ksp; nếu không có rắn thì tích số ion không vượt Ksp.

Hai phép chia đôi lồng nhau tìm H+ và NH3 tự do, đồng thời giới hạn Cu2+ bởi điều kiện bão hòa. Không chọn sản phẩm chỉ bằng công thức hoặc thời gian. Kiểm tra tổng thành phần được tính lại từ các loài báo cáo trong script audit, ngoài các residual nội bộ của bộ giải.

## Ví dụ kết quả tính

Cu ban đầu 1 mmol trong 50 mL ở 25 °C, nguồn CuSO4, không thêm kiềm. Đây là kết quả của mô hình nồng độ lý tưởng, không phải số đo thực nghiệm:

| NH3/Cu tổng | pH tính | Cu ở dạng Cu(OH)2 rắn | Cu ở dạng tetraammine | Cu trong ba phức hỗn hợp |
|---:|---:|---:|---:|---:|
| 1 | 5,60 | 49,49% | rất nhỏ | 0,05% |
| 2 | 6,79 | 99,43% | rất nhỏ | 0,10% |
| 4 | 9,26 | 95,12% | 3,23% | 0,80% |
| 5 | 9,44 | 90,80% | 6,50% | 1,58% |
| 20 | 10,55 | 27,46% | 46,49% | 24,71% |
| 100 | 11,45 | 0% | 57,18% | 42,54% |

[Dữ liệu 288 tổ hợp](../../artifacts/copper-ammonia/speciation-grid.json) thay đổi nhiệt độ, thể tích, lượng NH3 và NaOH dư; lượng nước của mẫu thử tăng theo thể tích dung môi. Pha cuối không được suy chỉ từ tỉ lệ mol. Script tính lại cân bằng Cu/N/sulfate từ từng loài, gồm cả phức hỗn hợp, và kiểm tra ba phương trình hỗn hợp về nguyên tố/điện tích trong audit khoa học.

Ví dụ riêng ở 25 °C, 50 mL, 0,1 mol NH3 và 0,01 mol NaOH: mẫu có 0,1 mmol Cu(OH)2 + 0,1 mmol Na2SO4 vẫn có thể trong, với trên 90% đồng ở phức trung hòa Cu(NH3)2(OH)2. Nếu tăng cả Cu và Na2SO4 lên 1 mmol trong cùng mẫu thì còn chất rắn. Đây là dự đoán nồng độ lý tưởng; nó bác bỏ ngưỡng “kiềm dư luôn tạo keo” trong mô hình, không thay cho dữ liệu hoạt độ thực nghiệm.

## Ghi nhận lượng chất và trình tự

Các hàng CuSO4, muối ammine sulfate/hydroxide và muối amoni trong inventory là **pool thành phần phân tích trung hòa**. Chúng không khẳng định mọi ion trong dung dịch tồn tại thành phân tử muối trung hòa hoặc sulfate là phối tử gắn với đồng. Pool ammine có n nguyên tử N gộp cả loài đơn phối tử và dẫn xuất hydroxide có cùng số NH3; bảng phân bố ion tách riêng chúng. Tổng nguyên tố H/O/N/S/Cu/Na và lượng nước hữu hạn vẫn được bảo toàn khi đổi pool.

Tiến độ vật chất trộn giữa kiểm kê tiếp xúc ban đầu và điểm cân bằng dự đoán; ảnh hưởng axit–bazơ nhanh trong phần dung dịch được tính với lượng rắn thực đang ghi nhận. Nhiệt dùng hiệu enthalpy của cùng cơ sở thành phần, cộng phần nhiệt mới và giữ lịch sử bay hơi/thu hồi nước. Đổi nhiệt độ có thể đổi phân bố và lượng nhiệt tích lũy; phát lại cùng tiến độ trong cùng môi trường không được cộng lại nhiệt đã nhận.

Auto tiếp tục tính trong suốt lúc thêm NH3. Nó không kết thúc sớm khi CuSO4 đã chuyển gần hết sang hydroxide, vì NH3 đến sau còn có thể hòa tan kết tủa. Mẫu minh họa mặc định dùng 60 mmol NH3 trong thể tích xấp xỉ 30 mL, thay cho đúng bốn đương lượng. Đây là mẫu ảo được biên soạn, không phải hướng dẫn thực hành.

Controller định lượng đọc lượng kết tủa, độ đục và màu đang ghi nhận trong bình. Hoạt ảnh hai giai đoạn theo đồng hồ chỉ còn dùng cho gallery trống, không được sửa lượng chất của mẫu thật. Dự đoán native không chạy tiếp ba phương trình Cu–NH3 như các bước một chiều độc lập.

Màn tự động hiển thị khối lượng kết tủa theo gam cho hệ này. Một phần trăm chuyển hóa tăng đơn điệu không thể hiện đúng việc keo tăng rồi giảm khi tiếp tục thêm phối tử.

Thủ công và auto có chung bảng **Phân bố Cu(II) ước tính**, gồm phần rắn, phần không gắn NH3, bốn ammine và ba phức hỗn hợp. Tổng các phần là 100% đồng; không đếm riêng phần hydroxide như một nguồn Cu/N mới. Bảng còn hiển thị NH3 tự do và nhắc giới hạn nồng độ lý tưởng.

## Bằng chứng và giới hạn

[Audit hóa học + hiệu ứng vật lý](../../artifacts/copper-ammonia/physical-audit.json): có keo khi rót, đỉnh khoảng 0,038 g rồi về 0 g khi đủ NH3; khối lượng được giữ tới sai số khoảng 8,6×10⁻¹⁴ g, không thay đổi bàn thủ công và không vượt 550 hạt đã cấp.

[Kiểm tra Chromium](../../artifacts/copper-ammonia/browser/audit.json) xác nhận trạng thái có keo khi đang rót và dung dịch xanh đậm ở cuối lượt, rồi đối chiếu cùng mẫu ở bàn thủ công: chín phần Cu hiển thị trùng nhau, tổng bằng 1 trong sai số số học, không có lỗi JavaScript. Tốc độ được dùng để minh họa, chưa đo/fit hằng số tạo mầm, hòa tan hay trộn thực tế.

[Báo cáo tổng hợp](../../artifacts/copper-ammonia/validation.json): toàn bộ 3.178 kiểm thử trong 237 tệp đạt; TypeScript và production build đạt. Cuối lượt vật lý còn 0 hạt kết tủa và độ đục bằng 0. Danh mục vẫn gồm 1.549 bản ghi; audit cân bằng và sản phẩm hiệu ứng không có lỗi.

Chưa xét đầy đủ hệ số hoạt độ, dimer, già hóa Cu(OH)2 thành CuO, ammonia bay hơi hoặc phối tử cạnh tranh như chloride, carbonate và thiocyanate. Màu RGB chưa hiệu chuẩn. Nhiệt vật chất vẫn dùng xấp xỉ enthalpy của các pool thành phần, chưa mô tả đầy đủ nhiệt thế phối tử hydroxide hoặc calorimetry của phức hỗn hợp. Các nhánh ngoài miền trên phải có mô hình riêng trước khi khẳng định kết quả định lượng như thực nghiệm.

Để tái tạo bằng chứng, chạy `npx tsx scripts/auditCopperAmmonia.ts`, `node scripts/auditCopperAmmoniaBrowser.mjs` khi Vite đang phục vụ cổng 6779, và `npm run equations:audit` để sinh lại danh mục phương trình.
