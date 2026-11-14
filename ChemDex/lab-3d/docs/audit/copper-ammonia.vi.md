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

Dùng cùng bộ số liệu này cho cả bốn phức; không trộn β4 từ bảng giáo khoa khác vào các hằng số đã chọn. Sự phụ thuộc nhiệt dùng van’t Hoff với giả thiết ΔCp = 0. Hằng số NH4+/nước/bisulfate, thủy phân Cu(II), cặp CuSO4 và Cu(OH)2 lấy từ các mô hình aqueous hiện có dựa trên [cơ sở dữ liệu PHREEQC](https://github.com/phreeqc-dev/phreeqc3/blob/master/database/wateq4f.dat).

Miền đầu vào gồm nước lỏng, CuSO4(aq), Cu(OH)2 rắn hoặc pool hòa tan, NH3(aq), (NH4)2SO4, H2SO4 dung dịch, NaOH, Na2SO4 và các pool ammine đã tạo; nhiệt độ 0–90 °C. Chất trên giấy lọc/bọt không tham gia. Không tự hòa tan CuSO4 khô hoặc dùng NH3 khí thay dung dịch.

## Những đại lượng được giải đồng thời

- Cân bằng điện tích, tổng Cu, tổng N và tổng sulfate; tổng Na là ion khán trong miền được hỗ trợ.
- NH4+ ⇌ H+ + NH3, cân bằng nước và bisulfate.
- Cu2+ + nNH3 ⇌ [Cu(NH3)n]2+, với n = 1–4.
- Thủy phân đơn nhân Cu(II) và cặp ion CuSO4(aq).
- Điều kiện pha: có Cu(OH)2 rắn thì [Cu2+][OH−]² = Ksp; nếu không có rắn thì tích số ion không vượt Ksp.

Hai phép chia đôi lồng nhau tìm H+ và NH3 tự do, đồng thời giới hạn Cu2+ bởi điều kiện bão hòa. Không chọn sản phẩm chỉ bằng công thức hoặc thời gian. Kiểm tra tổng thành phần được tính lại từ các loài báo cáo trong script audit, ngoài các residual nội bộ của bộ giải.

## Ví dụ kết quả tính

Cu ban đầu 1 mmol trong 50 mL ở 25 °C, nguồn CuSO4, không thêm kiềm. Đây là kết quả của mô hình nồng độ lý tưởng, không phải số đo thực nghiệm:

| NH3/Cu tổng | pH tính | Cu ở dạng Cu(OH)2 rắn | Cu ở dạng tetraammine |
|---:|---:|---:|---:|
| 1 | 5,60 | 49,54% | rất nhỏ |
| 2 | 6,79 | 99,52% | rất nhỏ |
| 4 | 9,26 | 95,85% | 3,29% |
| 5 | 9,44 | 92,16% | 6,69% |
| 20 | 10,53 | 43,73% | 54,73% |
| 100 | 11,77 | 0% | 99,50% |

[Dữ liệu 96 tổ hợp](../../artifacts/copper-ammonia/speciation-grid.json) thay đổi nhiệt độ, thể tích và lượng NH3. Pha cuối không được suy chỉ từ tỉ lệ mol. Kiểm thử riêng còn kiểm tra tác dụng của axit hóa, hydroxide chung từ NaOH, pha sai, chất đã lọc và lượng không hợp lệ.

## Ghi nhận lượng chất và trình tự

Các hàng CuSO4, muối ammine sulfate/hydroxide và muối amoni trong inventory là **pool thành phần phân tích trung hòa**. Chúng không khẳng định mọi ion trong dung dịch tồn tại thành phân tử muối trung hòa hoặc sulfate là phối tử gắn với đồng. Phân bố ion tự do và phức được giải riêng. Tổng nguyên tố H/O/N/S/Cu/Na và lượng nước hữu hạn vẫn được bảo toàn khi đổi pool.

Tiến độ vật chất trộn giữa kiểm kê tiếp xúc ban đầu và điểm cân bằng dự đoán; ảnh hưởng axit–bazơ nhanh trong phần dung dịch được tính với lượng rắn thực đang ghi nhận. Nhiệt dùng hiệu enthalpy của cùng cơ sở thành phần, cộng phần nhiệt mới và giữ lịch sử bay hơi/thu hồi nước. Đổi nhiệt độ có thể đổi phân bố và lượng nhiệt tích lũy; phát lại cùng tiến độ trong cùng môi trường không được cộng lại nhiệt đã nhận.

Auto tiếp tục tính trong suốt lúc thêm NH3. Nó không kết thúc sớm khi CuSO4 đã chuyển gần hết sang hydroxide, vì NH3 đến sau còn có thể hòa tan kết tủa. Mẫu minh họa mặc định dùng 60 mmol NH3 trong thể tích xấp xỉ 30 mL, thay cho đúng bốn đương lượng. Đây là mẫu ảo được biên soạn, không phải hướng dẫn thực hành.

Controller định lượng đọc lượng kết tủa, độ đục và màu đang ghi nhận trong bình. Hoạt ảnh hai giai đoạn theo đồng hồ chỉ còn dùng cho gallery trống, không được sửa lượng chất của mẫu thật. Dự đoán native không chạy tiếp ba phương trình Cu–NH3 như các bước một chiều độc lập.

Màn tự động hiển thị khối lượng kết tủa theo gam cho hệ này. Một phần trăm chuyển hóa tăng đơn điệu không thể hiện đúng việc keo tăng rồi giảm khi tiếp tục thêm phối tử.

## Bằng chứng và giới hạn

[Audit hóa học + hiệu ứng vật lý](../../artifacts/copper-ammonia/physical-audit.json): có keo khi rót, đỉnh khoảng 0,040 g rồi về 0 g khi đủ NH3; khối lượng được giữ tới sai số khoảng 5,3×10⁻¹⁴ g, không thay đổi bàn thủ công và không vượt 550 hạt đã cấp.

[Kiểm tra Chromium](../../artifacts/copper-ammonia/browser/audit.json) xác nhận trạng thái có keo khi đang rót và dung dịch xanh đậm ở cuối lượt; không có lỗi JavaScript. Tốc độ được dùng để minh họa, chưa đo/fit hằng số tạo mầm, hòa tan hay trộn thực tế.

[Báo cáo tổng hợp](../../artifacts/copper-ammonia/validation.json): toàn bộ 3.170 kiểm thử trong 237 tệp đạt; TypeScript và production build đạt. Cuối lượt vật lý còn 0 hạt kết tủa và độ đục bằng 0. Danh mục vẫn gồm 1.549 bản ghi; audit cân bằng và sản phẩm hiệu ứng không có lỗi.

Chưa xét đầy đủ hệ số hoạt độ, phức hydroxo–ammine hỗn hợp, dimer, già hóa Cu(OH)2 thành CuO, ammonia bay hơi hoặc phối tử cạnh tranh như chloride, carbonate và thiocyanate. Màu RGB và nhiệt pha trộn chưa hiệu chuẩn. Các nhánh ngoài miền trên phải có mô hình riêng trước khi khẳng định kết quả định lượng như thực nghiệm.

Để tái tạo bằng chứng, chạy `npx tsx scripts/auditCopperAmmonia.ts`, `node scripts/auditCopperAmmoniaBrowser.mjs` khi Vite đang phục vụ cổng 6779, và `npm run equations:audit` để sinh lại danh mục phương trình.
