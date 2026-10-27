# Nhiệt độ mẫu, pH và độ tan calcite

## Nguồn đã đối chiếu

- [USGS, PHREEQC SOLUTION_SPECIES](https://water.usgs.gov/water-resources/software/PHREEQC/documentation/phreeqc3-html/phreeqc3-50.htm): dạng biểu thức log10(K) theo nhiệt độ tuyệt đối và hệ số cho nước/cacbonat.
- [Cơ sở dữ liệu PHREEQC hiện hành](https://github.com/phreeqc-dev/phreeqc3/blob/master/database/phreeqc.dat): các biểu thức cho nước, amoni, proton hóa sunfat và cacbonat. Hằng số proton hóa phải đảo chiều khi dùng cho phân ly axit.
- [Cơ sở dữ liệu PHREEQC cổ điển](https://github.com/phreeqc-dev/phreeqc/blob/master/database/phreeqc.dat): công thức calcite tương ứng mốc log10(Ksp) = −8,480 đã chọn. Không thay bằng biểu thức calcite khác trong phiên bản dữ liệu mới mà không ghi nhận thay đổi bộ tham chiếu.
- [Plummer & Busenberg (1982), USGS](https://www.usgs.gov/publications/solubilities-calcite-aragonite-and-vaterite-co2-h2o-solutions-between-0-and-90degc-and): nền tảng thực nghiệm và mô hình của hệ CaCO3–CO2–H2O; vai trò của hoạt độ/cặp ion vẫn cần được phân biệt với xấp xỉ nồng độ trong ứng dụng.

## Phép tính đang áp dụng

Với T tính bằng kelvin, biểu thức PHREEQC được đọc theo thứ tự:

`log10(K) = A1 + A2*T + A3/T + A4*log10(T) + A5/T² + A6*T²`.

Đường cong được chuẩn hóa tại 25 °C để giữ bộ hằng số tham chiếu đã chọn trong dự án: Kw = 10⁻¹⁴; Ka của NH4+ = Kw/Kb(NH3) với Kb = 1,8×10⁻⁵; Ka(HSO4−) = 1,2×10⁻²; các giá trị cacbonat/calcite trong ghi chép trước. Do khác biệt làm tròn và bộ dữ liệu, phép chuẩn hóa này cần được ghi rõ; không tuyên bố mọi phiên bản PHREEQC hoặc mọi bảng giáo khoa có cùng giá trị.

Từ hai phản ứng proton hóa của CO3²⁻, tính Ka2 bằng nghịch đảo hằng số proton hóa một bước, và Ka1 từ hằng số phân ly tổng chia Ka2. Ksp của calcite và các hằng số phân bố cacbonat cùng dùng nhiệt độ tương ứng trong phép giải bão hòa. Không giữ Ksp ở 25 °C trong khi chỉ đổi pH theo nhiệt độ.

Phạm vi triển khai hiện tại là **0–90 °C**, dung dịch nước lý tưởng. Mẫu ngoài phạm vi hoặc nhiệt độ không hữu hạn không nhận nhãn đã có lời giải nhiệt độ. Áp suất/hoạt độ/cặp ion chưa được hiệu chỉnh trong bộ cân bằng này.

## Mốc trung tính không cố định ở pH 7

Mốc trung tính có `[H+] = [OH−]`, vì vậy `pH_trung_tính = pKw(T)/2`. Đầu ra tính toán theo đường cong đã chuẩn hóa:

| Nhiệt độ, °C | pKw | pH trung tính | pKa1 | pKa2 | Ksp calcite |
|---:|---:|---:|---:|---:|---:|
| 0 | 14,94371 | 7,47186 | 6,57870 | 10,62872 | 4,15347×10⁻⁹ |
| 10 | 14,53666 | 7,26833 | 6,46348 | 10,48802 | 3,88465×10⁻⁹ |
| 25 | 14,00000 | 7,00000 | 6,35200 | 10,32900 | 3,31131×10⁻⁹ |
| 40 | 13,53868 | 6,76934 | 6,29753 | 10,22184 | 2,63134×10⁻⁹ |
| 50 | 13,26698 | 6,63349 | 6,28594 | 10,17455 | 2,17302×10⁻⁹ |
| 80 | 12,59400 | 6,29700 | 6,33837 | 10,12573 | 1,02618×10⁻⁹ |
| 90 | 12,41007 | 6,20503 | 6,37819 | 10,13517 | 7,55296×10⁻¹⁰ |

Bảng này là kết quả mô hình, không phải bảng số đo mới. Nước trung tính 50 °C có pH khoảng 6,63 và vẫn trung tính. Ở cùng nhiệt độ, pH 7 nằm về phía kiềm so với mốc trung tính của mô hình.

Nhãn trong bảng kiểm tra mẫu giờ mô tả dung dịch có tính axit/kiềm theo mốc này. Đã bỏ việc suy ra “axit mạnh/yếu” chỉ từ khoảng pH, vì độ mạnh nội tại của axit/bazơ không được xác định bằng riêng một giá trị pH của dung dịch.

## Liên kết với phản ứng, môi trường và dụng cụ

- Vòng mô phỏng dùng nhiệt độ hiện có của mẫu sau gia nhiệt/tản nhiệt. Nhiệt độ phòng làm thay đổi nhiệt độ mẫu theo mô hình trao đổi nhiệt, rồi pH được chiếu lại.
- Nhánh native và ledger tính pH tại nhiệt độ sau khi nhận nhiệt phản ứng. Việc phát lại ledger có giữ tản nhiệt/gia nhiệt không được khôi phục nhầm pH ở nhiệt độ ban đầu.
- Cache của pH và của mục tiêu bão hòa calcite có khóa nhiệt độ. Cùng một kho chất ở nhiệt độ mới phải được giải lại.
- Metadata lưu nhiệt độ thực sự dùng để chọn hằng số. Máy đo pH hiển thị nhiệt độ mô hình, và bảng dụng cụ nêu cả mốc pH trung tính.
- Mẫu nước–đá 0 °C đọc pH của phần nước lỏng. Phần đá không bị đưa vào tổng chất tan hoặc tạo thêm thể tích dung dịch.

## Axetat và những giới hạn còn mở

Chưa áp dụng đường cong nhiệt độ cho hệ có tổng axetat/axit axetic. Các nguồn ban đầu đã tìm được gồm nghiên cứu Harned–Ehlers (1933) và tài liệu NIST, nhưng lần truy cập toàn văn nguồn chính bị từ chối hoặc không tải đủ. Không lấy một công thức chưa kiểm tra từ trí nhớ hay bản chép thứ cấp để gắn nhãn đã có nguồn.

Với hệ có axetat, toàn bộ phép phân bố hiện giữ bộ tham chiếu 25 °C, kể cả khi mẫu nóng hơn, và metadata/máy đo ghi rõ mốc 25 °C. Điều này cũng áp dụng khi axetat trộn với cacbonat/amoni để tránh ghép các hằng số ở hai nhiệt độ khác nhau mà vẫn trình bày như một lời giải nhất quán.

Các phần **chưa hoàn tất**:

1. Bổ sung và kiểm chứng đường cong axetat, rồi mở rộng các hệ axit/bazơ và ion kim loại chưa hỗ trợ.
2. Hiệu chỉnh hoạt độ, cặp ion, ảnh hưởng áp suất và các giới hạn nồng độ. Xấp xỉ nồng độ không phải phép đo pH hoạt độ ở mọi dung dịch đậm đặc.
3. Nhiệt do cân bằng proton/phân bố pha dịch chuyển chưa được ghép đầy đủ vào ngân sách năng lượng; các đường cong K(T) không tự chứng nhận mô hình nhiệt đã hoàn chỉnh.
4. Độ nhạy nhiệt độ của chính chỉ thị, phổ hấp thụ và đáp ứng điện cực chưa hiệu chuẩn; RGB hiện còn là minh họa.
5. Trao đổi khí, bề mặt kim loại, động học từng phản ứng và kiểm tra hình ảnh/thao tác trình duyệt vẫn nằm trong mục tiêu toàn hệ thống.

## Kiểm chứng

**68 tệp, 896/896 kiểm thử đạt; TypeScript và build đạt.** Kiểm tra gồm giữ mốc 25 °C, trung tính ở nhiều nhiệt độ, nước–đá 0 °C, amoni/bisulfat, bảo toàn tổng và điện tích, calcite tại nhiệt độ khác nhau, cache, phạm vi ngoại suy, nhãn tham chiếu axetat, pH sau phản ứng tỏa nhiệt và thay đổi nhiệt độ phòng trên mẫu thật trong store.

Một mẫu kiểm thử cũ ghi 100 mL nhưng thiếu nước trong kho chất đã được sửa để phép tính nhiệt dung có lượng dung môi thực. Các kỳ vọng pH cố định 7 cho dung dịch trung hòa ấm đã được thay bằng quan hệ trung tính tại nhiệt độ mẫu; các kiểm tra bảo toàn lượng chất vẫn giữ nguyên.

Bản dựng tiếp tục cảnh báo bundle chính lớn. Kiểm thử hiệu năng là logic/headless và không bao gồm WebGL; chưa có bằng chứng trình duyệt xác nhận hình ảnh hoặc FPS.
