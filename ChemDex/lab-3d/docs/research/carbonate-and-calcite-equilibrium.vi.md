# Cacbonat, CO2 hòa tan và giới hạn hòa tan calcite

## Lỗi đã xác nhận và sửa

Trước sửa, bộ giải áp dụng liên tiếp `CaCO3 + 2HCl → CaCl2 + CO2 + H2O` rồi dùng toàn bộ CO2(g) vừa sinh cho `CaCO3 + CO2 + H2O → Ca(HCO3)2`. Ví dụ 2 g CaCO3 với 10 mL HCl 1 M bị trừ thêm 0,005 mol đá vôi ở bước thứ hai. Kết quả này giả định khí vừa sinh đã hòa tan hoàn toàn và toàn bộ cân bằng dịch chuyển đến hết chất.

Nhánh thứ cấp nay được đánh dấu `equilibriumOnly` và không chạy như phép tiêu thụ không thuận nghịch. Với liều trên, axit chỉ tiêu thụ 0,005 mol CaCO3. Phần hòa tan cân bằng về sau được xử lý riêng từ kho pha lỏng thực có. Bộ giải cũng ưu tiên trung hòa kho cacbonat đã hòa tan trước khi tiêu thụ thêm chất rắn bằng liều axit mới.

## Nguồn và hằng số

| Đại lượng tại 25 °C | Giá trị dùng | Nguồn/cách suy ra |
|---|---:|---|
| pKa2 | 10,329 | [USGS, PHREEQC SOLUTION_SPECIES](https://water.usgs.gov/water-resources/software/PHREEQC/documentation/phreeqc3-html/phreeqc3-50.htm), phản ứng proton hóa CO3²⁻ |
| pKa1 của hệ CO2* | 6,352 | [Cơ sở dữ liệu PHREEQC](https://github.com/phreeqc-dev/phreeqc3/blob/master/database/phreeqc.dat): 16,681 − 10,329 |
| log10(Ksp) của calcite | −8,480 | [Plummer & Busenberg (1982), USGS](https://www.usgs.gov/publications/solubilities-calcite-aragonite-and-vaterite-co2-h2o-solutions-between-0-and-90degc-and) |

CO2* là tổng CO2 đã hòa tan và axit cacbonic hydrat hóa theo quy ước cân bằng. Nó không bao gồm CO2 trong bọt khí hoặc khoảng không trên mặt chất lỏng.

Bài USGS nêu vai trò của cặp ion và hiệu chỉnh hoạt độ. Mã hiện dùng nồng độ để xấp xỉ hoạt độ và chưa giải cặp ion, nên không tuyên bố tái tạo đầy đủ mô hình PHREEQC. Cơ sở dữ liệu PHREEQC hiện hành có thể chọn hằng số calcite khác một chút; Ksp ở đây được ghi rõ theo tài liệu 1982, không ngầm coi mọi phiên bản dữ liệu là đồng nhất.

[USGS PHREEQC, ví dụ 7](https://water.usgs.gov/water-resources/software/PHREEQC/documentation/phreeqc3-html/phreeqc3-69.htm) phân biệt tiếp xúc với nguồn khí có áp suất riêng phần cố định và kho khí hữu hạn trong bình kín. Bộ cân bằng mới hiện giải kho cacbon **đã hòa tan** hữu hạn; chưa thay thế bài toán vận chuyển khí qua ống hoặc trao đổi với không khí.

[NIST Chemistry WebBook — CO2, Henry](https://webbook.nist.gov/cgi/cbook.cgi?ID=C124389&Mask=10) đã được đọc để chuẩn bị bước trao đổi khí tiếp theo. Giá trị được liệt kê theo mol/(kg·bar), kèm nhiều bộ tham số nhiệt độ và mức độ đầy đủ của trích dẫn. Các số này chưa được gắn vào bộ chuyển khí hiện tại; cần giữ đúng đơn vị, áp suất riêng phần và lượng nước khi triển khai.

## Cách giữ lượng chất và tính pH

Hệ phân bố CO2*/HCO3⁻/CO3²⁻ dùng tổng cacbon vô cơ, điện tích ion đối và Kw, kết hợp các hệ axetat, amoni và bisulfat đang có. NaHCO3/KHCO3 là hệ lưỡng tính; Na2CO3/K2CO3 có thủy phân kiềm. CO2 hòa tan làm nước có tính axit. Chỉ thị theo pH giải được; không gán pH 7 chỉ vì chưa còn axit mạnh.

Kho `CaCO3(aq)` là cách ghi lượng phân tích Ca và cacbonat đã hòa tan để bảo toàn nguyên tố. Phân bố ion thực được tính riêng; ký hiệu kho này không khẳng định mọi canxi trong nước tồn tại dưới dạng phân tử CaCO3 trung hòa.

Khi có calcite, bộ chia pha tìm lượng đã tan sao cho `[Ca2+][CO3²⁻] = Ksp`, hoặc dừng ở lượng tối đa nếu mẫu rắn hết trước khi bão hòa. Nó xét canxi đang có trong các muối tan được hỗ trợ. Kho đã tan có thể trở lại pha rắn khi quá bão hòa. Không tạo canxi/cacbon từ tên chất hoặc từ màu đục.

Lượng từng nguyên tố và tổng khối lượng được giữ khi chuyển pha. Khối rắn trên giấy lọc không bị tự chuyển vào dung dịch trong bình. Hỗn hợp thiếu nước, có axit mạnh còn cần bước phản ứng, hoặc chứa chất không được bộ cân bằng hỗ trợ sẽ không bị suy diễn thành một kết quả tan hoàn toàn.

## Kết quả tham chiếu từ chính mô hình

Đây là đầu ra tính toán cho thể tích quy ước 100 mL ở hằng số 25 °C, **không phải số đo thực nghiệm**:

| CaCO3 ban đầu, g | CO2 đã hòa tan ban đầu, mol | CaCO3 tan, g | Chất rắn còn lại, g | pH |
|---:|---:|---:|---:|---:|
| 1 | 0 | 0,001102 | 0,998898 | 9,904 |
| 1 | 0,0001 | 0,009099 | 0,990901 | 7,633 |
| 1 | 0,001 | 0,036792 | 0,963208 | 6,417 |
| 0,01 | 0,001 | 0,010000 | 0 | 5,699 |

Ba trường hợp còn chất rắn cho tích số ion xấp xỉ 3,3113×10⁻⁹. Trường hợp hết chất rắn chưa bão hòa, nên không thể tiếp tục tạo thêm chất tan để ép tích số ion bằng Ksp.

Đã thêm mẫu nước CO2(aq) tham chiếu 0,01 M vào kệ để khảo sát lượng cacbon đã hòa tan. Mật độ mẫu xấp xỉ nước; mô tả mẫu ghi rõ đường cấp khí và thoát khí sau mở bình chưa được mô hình hóa đầy đủ.

## Tiến triển và liên kết với thao tác

Sự chia pha tiếp cận trạng thái bão hòa dần theo thời gian mô phỏng. Khuấy/nghiền thay đổi tốc độ tiếp cận, giữ nguyên giới hạn cuối. Các hệ số tốc độ và công thức độ đục là minh họa; độ đục giảm theo lượng rắn thực còn lại. Đá vôi dạng khối không tự nhận cùng độ đục của bột mịn.

Một lỗi liên kết khác đã được sửa: bộ pH nhận được dung dịch không được phép chặn phản ứng tạo kết tủa đã biết. Bước tìm chương trình được kiểm tra dùng chung cho thêm stock và trộn aliquot. CaCl2/Na2CO3 vẫn giữ chất ban đầu ở thời điểm bắt đầu, rồi tạo sản phẩm theo mức tiến triển.

## Kiểm chứng và phần còn thiếu

Đợt này: **67 tệp, 886/886 kiểm thử đạt**, TypeScript và build đạt. Kiểm thử bao phủ pH lưỡng tính/thủy phân, tổng cacbon, điện tích, hai tỷ số phân ly, Ksp, hiệu ứng ion chung, tan một phần/hết mẫu, phân biệt CO2(g)/CO2(aq), thứ tự trung hòa chất tan, nguyên tố/khối lượng khi chuyển pha, khuấy, tạm dừng, giấy lọc và chọn phản ứng tạo kết tủa.

Kiểm toán vẫn có 145 chương trình, 44 định nghĩa quy tắc gồm 1 mục chuyển sang cân bằng pha; 0 lỗi cân bằng, ion hoặc hiệu ứng khai báo sai sản phẩm. Điều này chưa chứng nhận hình ảnh hoặc thời gian phản ứng ngoài đời.

Những việc **chưa hoàn tất**, vẫn thuộc mục tiêu toàn hệ thống:

1. Trao đổi CO2 khí–lỏng hữu hạn theo áp suất riêng phần, nhiệt độ, diện tích tiếp xúc và khuấy; thoát khí sau khi mở mẫu; đường dẫn khí giữa các dụng cụ.
2. Hiệu chỉnh nhiệt độ, hoạt độ và cặp ion. Hằng số đang dùng là tham chiếu 25 °C, không phải lời giải chính xác cho mọi môi trường phòng thí nghiệm.
3. Nhiệt của quá trình chia pha **kèm phân bố proton/cacbonat** chưa được tham số hóa. Không dùng riêng nhiệt hòa tan ion của calcite để giả rằng đã tính đủ nhiệt của toàn hệ CO2/HCO3⁻/CO3²⁻.
4. Động học CaCO3/axit vẫn còn nhánh native tiêu thụ tức thời. Cần chuyển sang lượng chất tiến triển, giữ đúng lớp sản phẩm và cơ chế bề mặt cho từng axit.
5. Kết tủa từ các kho ion khác, thủy phân kim loại và các chất cạnh tranh cần bổ sung giao dịch lượng chất tương ứng.
6. Kiểm tra hình ảnh, thao tác thực và hiệu năng trong trình duyệt. Chưa có lần mở trình duyệt tự động thành công sau lần bị từ chối trước đó; không dùng unit test để thay bằng chứng này.


## Cập nhật sau bước nhiệt độ

Các hằng số nước/cacbonat và Ksp calcite đã có đường cong theo nhiệt độ trong phạm vi 0–90 °C, với bộ tham chiếu 25 °C được giữ rõ ràng. Hệ có axetat vẫn dùng mốc 25 °C. Xem [ghi chép nhiệt độ và pH](aqueous-temperature-and-ph.vi.md) để biết phép chuẩn hóa, thông tin dụng cụ đo, kết quả 896 kiểm thử và các phần nhiệt/hoạt độ còn thiếu. Các bảng 25 °C và giới hạn trao đổi CO2 ở trên vẫn là ghi nhận của đợt cacbonat ban đầu.
