# Al(OH)₃: tạo keo và tan trong kiềm dư

Đối chiếu 24/10/2026. Các đường AlCl₃/Al₂(SO₄)₃ + NaOH, Al(OH)₃ + NaOH và muối nhôm trong kiềm đủ dư dùng cùng bộ tính nhôm. Không buộc mọi lần trộn muối nhôm–kiềm phải tạo keo trước, không buộc hết timeline phải tan hết và không gán lớp cặn 7 mm từ tham số hiệu ứng.

## Pha được chọn và nguồn

[PHREEQC WATEQ4F](https://github.com/phreeqc-dev/phreeqc3/blob/master/database/wateq4f.dat) có pha `Al(OH)3(a)` vô định hình: log K hòa tan acid 10,8; ΔH −26,5 kcal/mol. Không lấy hằng số gibbsite 8,11 hoặc Al(OH)₃ hòa tan thay pha này. Ksp(T) = K_acid(T) Kw(T)³; log Ksp tại 25°C = −31,2. K_acid dùng van't Hoff với ΔH hằng.

Thủy phân đơn nhân đến AlOH²⁺, Al(OH)₂⁺, Al(OH)₃(aq), Al(OH)₄⁻ dùng log K tích lũy tham chiếu −5/−10,1/−16,9/−22,7. Hiệu chỉnh theo các đường analytical trong cùng cơ sở, chuẩn hóa tại 25°C bằng hàm nhiệt chung của ứng dụng. AlSO₄⁺ và Al(SO₄)₂⁻ dùng log β 3,5/5 và ΔH 2,29/3,11 kcal/mol. Kw và HSO₄⁻ dùng cùng [mô hình nhiệt nước/acid–base](https://github.com/phreeqc-dev/phreeqc3/blob/master/database/phreeqc.dat) đã chọn trong ứng dụng.

## Cân bằng vật chất và điện tích

Với mỗi pH thử, chia nhôm hòa tan giữa Al³⁺ tự do, các dạng thủy phân và hai phức sulfate. Khi có sulfate, giải cân bằng tổng sulfate giữa SO₄²⁻ tự do, HSO₄⁻ và sulfate liên kết với nhôm. Giải điện trung hòa gồm H⁺, OH⁻, Na⁺, chloride, sulfate và điện tích các dạng nhôm. Không dùng toàn bộ nhôm hòa tan làm [Al³⁺] trong Q = [Al³⁺][OH⁻]³.

Ledger vẫn là inventory theo công thức phân tử, còn speciation là phép chiếu các tổng phân tích. Khi chuyển x mol Al sang pha rắn, nhôm hòa tan giảm x nhưng Na/Cl/S tổng giữ nguyên. Khi hòa tan x mol Al(OH)₃ bằng NaOH, nhôm hòa tan tăng x, tổng Na/Cl/S vẫn giữ nguyên. Hằng số dùng hoạt độ nhưng bộ tính hiện xấp xỉ bằng nồng độ; chưa hiệu chỉnh hệ số hoạt độ.

Miền gồm nước lỏng; AlCl₃, Al₂(SO₄)₃, NaOH, NaCl, Na₂SO₄, Na[Al(OH)₄] aq; Al(OH)₃ rắn trong bulk, nhiệt độ 0–90°C. HCl/NH₃, kim loại khác, vật chất mắc trên lọc, acid khai báo đặc hoặc pha không phù hợp trả về không hỗ trợ. Các đường nhôm được nối mới không chạy lượng phản ứng mặc định khi ngoài miền này. Chưa xét phức chloride của nhôm, polymer/Al₁₃, hydroxysulfate, ion pair của natri hoặc pha già hóa.

## Các nhánh phản ứng

- `alcl3_naoh` / native `alcl3_naoh_precipitate`: AlCl₃ + 3NaOH → Al(OH)₃ + 3NaCl. Chỉ tạo lượng rắn trong giới hạn thuốc thử và quá bão hòa.
- `al2so43_naoh` / native `al2so4_naoh_amphoteric`: Al₂(SO₄)₃ + 6NaOH → 2Al(OH)₃ + 3Na₂SO₄. Primitive khoa học trả mol Al; adapter chia hai để lấy mol phản ứng phân tử. Chương trình Studio sulfate có phương trình riêng, không dùng nhầm phương trình AlCl₃.
- `aloh3_naoh` / native `aloh3_naoh_dissolution`: Al(OH)₃ + NaOH → Na[Al(OH)₄]. Lượng tan bị chặn bởi lượng rắn, lượng NaOH và điểm bão hòa. Một đương lượng base không được coi như bằng chứng chắc chắn toàn bộ gel đã tan.
- `alcl3_naoh_excess` và `al2so43_naoh_excess`: nhánh dung dịch khi kiềm đủ dư, lần lượt cần 4 OH trên một Al hoặc 8 OH trên một Al₂(SO₄)₃. Không tự sinh hạt hoặc khí. Lượng chuyển công thức được chặn ở phần Al(OH)₄⁻ bổ sung mà speciation dự đoán và lượng thuốc thử còn thật; tổng Al/Na/Cl/S và pH phân tích không đổi chỉ vì đổi cách ghi muối hòa tan.

Resolver xét lượng chất và cân bằng trước khi chọn một nhánh chỉ từ tên thuốc thử hoặc cache. Native bỏ qua nhánh lượng bằng không để tiếp tục tìm nhánh phù hợp, thay vì dừng ở một phản ứng tạo gel không còn khả thi. pH đầu ra và pH projection dùng cùng speciation, không dùng pH 12/12,5 cố định cho các phản ứng này.

Giới hạn tạo rắn vẫn theo phản ứng phân tử có NaOH, chưa mô phỏng kết tủa tự phát do thủy phân khi không có NaOH. Chưa phân bố lại hoàn toàn pool aluminate thành rắn theo chiều ngược khi môi trường đổi sau phản ứng. Đặc biệt, thay đổi nhiệt có thể đòi hỏi phản ứng ngược rất nhỏ để đạt cân bằng cuối chính xác; chưa khẳng định vòng cập nhật nhiệt–pha này là solver cân bằng đa pha đầy đủ.

## Nhiệt theo cùng cơ sở cân bằng

Đặt H_w = enthalpy phân ly nước từ đạo hàm của đường Kw, H_a = −26,5 kcal/mol và H_4 là enthalpy từ đạo hàm đường thủy phân tích lũy Al(OH)₄⁻. Khi đó:

- Tạo Al(OH)₃ từ Al³⁺ + 3OH⁻: ΔH = −(H_a + 3H_w).
- Hòa tan Al(OH)₃ + OH⁻: ΔH = H_a + H_4 − H_w.
- Tạo Al(OH)₄⁻ từ Al³⁺ + 4OH⁻: tổng hai bước trên.

Native và ledger lấy nhiệt tại nhiệt độ mẫu; metadata chương trình ghi giá trị tham chiếu 298,15 K. Theo bộ đường đã chọn, bước hòa tan base ở 25°C có ΔH dương khoảng 9,74 kJ/mol, thay giá trị tỏa nhiệt gán tay trước đây. Không suy ra rằng mọi lần rót NaOH vào gel thực tế đều làm lạnh: nhiệt pha loãng, nồng độ và mẫu gel cụ thể chưa được hiệu chuẩn, nhiệt tái phân bố phức sulfate cũng chưa giải riêng.

## Hiển thị và mẫu Studio

Lượng keo và cặn lấy từ inventory, dùng hệ hạt gel và lớp cặn có thể tích theo khối lượng hiện hữu. Timeline nhôm không áp chiều cao lớp cặn hoặc độ trong cuối cố định thay lượng rắn còn lại. Thời gian hoạt ảnh vẫn minh họa, chưa là tốc độ tạo mầm/kết tụ/hòa tan đo được.

Mẫu Studio nhôm dùng extent 0,0001 mol và ngân sách pha lỏng 30 mL của bộ tạo mẫu. Mẫu Al(OH)₃ + NaOH bắt đầu với gel có thật và thêm lượng base dư; hai mẫu muối nhôm đi thẳng sang aluminate cũng có thêm base hữu hạn ngoài tỷ lượng tối thiểu. Mô tả này là cấu hình mẫu ảo, không phải quy trình thí nghiệm đã xác nhận.

### Tiến triển vật chất trên đường native

Khi toàn bộ chuỗi phản ứng native thuộc các nhánh nhôm đã nêu, thao tác thêm thuốc thử từ kho hoặc nhận aliquot giữ nguyên inventory tại thời điểm tiếp xúc. `aluminumMaterialProgress.ts` lưu từng bước hữu hạn gồm hệ số, pha, extent do bộ tính cân bằng giới hạn và enthalpy đã dự đoán. Vòng mô phỏng mới tiêu thụ thuốc thử, tạo gel hoặc hòa tan gel theo tiến trình; không ghi ngay toàn bộ sản phẩm cuối rồi chỉ chạy hoạt ảnh. Chuỗi có phản ứng ngoài nhôm chưa được chuyển sang đường này.

Các bước chạy tuần tự; phần thời gian được chia theo mol Al tham gia, kể cả hệ sulfate có hai Al trên một mol phản ứng. Đường tiến trình first-order chuẩn hóa có hệ số hình dạng 4 theo phần thời gian của bước. Đây là lựa chọn hoạt ảnh, chưa phải hằng số tốc độ thực nghiệm, thời gian cảm ứng, mô hình tạo mầm hoặc kết tụ. Nhánh kiềm đủ dư không tạo một giai đoạn gel giả để minh họa.

Mỗi lần phát lại dùng baseline để tính lượng tích lũy, nhưng chỉ đưa phần nhiệt chưa cộng vào trạng thái nhiệt hiện tại; nhiệt độ do nguồn nhiệt ngoài và lượng nước đã bay hơi được giữ. pH được chiếu lại từ thành phần và nhiệt độ hiện tại. Endpoint và enthalpy của chuỗi được dự đoán lúc tiếp xúc; chưa tái giải cân bằng pha–nhiệt đầy đủ khi có gia nhiệt mạnh giữa phản ứng. Không công bố thời gian tiến trình này là thời gian phản ứng đo được.

Thay inventory qua pipette hoặc thao tác gán mẫu hủy baseline cũ để không khôi phục phần đã lấy ra. Khi nhận liều mới, kế hoạch dùng inventory hiện tại cùng đúng lượng mẫu mới, giữ khối lượng gel chưa tan. Việc hủy playback ở bình nguồn chưa tự xây lại động học cho phần thuốc thử còn lại; đây vẫn là giới hạn khi rút mẫu giữa phản ứng. Các tham số tên/vị trí/nhiệt độ riêng không hủy baseline chỉ vì metadata đổi.

Thứ tự R3F được khai báo chung: hóa học −3, vật lý −2, buffer hạt −1, vật liệu mặc định 0. Ưu tiên âm giữ chế độ render tự động của R3F. Kiểm chứng này dựa trên mã dependency và luồng cập nhật; chưa thay thế kiểm tra GPU về nhấp nháy, xuyên thành bình hay tốc độ khung hình.

Kiểm thử primitive và pipeline đối chiếu Al/S/điện tích, trace dưới bão hòa, điểm cuối đẳng nhiệt Q/K, miền 3/4/6 đương lượng, lượng aluminate bổ sung, nhiệt bằng đạo hàm ln K và chu trình Hess, hai muối chloride/sulfate, native/ledger/resolver, cặn ở tiến triển một nửa và trạng thái Studio ban đầu. Audit danh mục xác nhận phương trình/nguyên tố/ion/sản phẩm hiển thị; chưa có xác minh GPU hoặc hiệu chuẩn với mẫu phòng thí nghiệm.
