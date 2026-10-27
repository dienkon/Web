# Kiểm tra cơ chế tạo hạt và kết bông

Đối chiếu mã ngày 24/10/2026. Đây là nghiên cứu và tiêu chí triển khai; chưa bổ sung solver kết tụ vào runtime. Các profile hình thái riêng và kiểm thử bảo toàn hiện có không chứng minh đã tái hiện động học kết tủa thực nghiệm.

## Bằng chứng trong mã hiện tại

- `src/simulation/effects/PrecipitationSystem.ts`: lượng rắn mới vào reservoir, sau đó cấp glyph theo tốc độ 64 hoặc 260 glyph/s. Đây là tốc độ cấp hình vẽ, không phải tốc độ tạo mầm theo thể tích dung dịch.
- `aggregationLevel` chỉ được gán 1 khi tạo hạt; tìm kiếm toàn bộ `src` chưa thấy cập nhật kết tụ. `aggregationRate` có trong các profile nhưng chưa được dùng bởi hệ hạt.
- `physicalRadius_m` lấy từ profile; Brownian và lực cản đã dùng kích thước vật lý riêng với kích thước phóng đại để nhìn thấy. Cần giữ sự phân biệt này.
- Chuyển rắn giữa reservoir, huyền phù và cặn có sổ khối lượng. Thu hồi hạt khi giảm chất lượng hình ảnh chuyển trọng số đại diện, không phải sự kiện kết tụ vật lý.
- `sedimentGeometry.ts` dùng hệ số đóng gói 0,65; bảng `data/precipitates.ts` có các giá trị khác theo chất. Không được coi hai đường này là cùng một mô hình cặn đã hiệu chuẩn. Đặc biệt chưa chứng minh hình học cặn keo xốp.
- `suspensionCloudiness.ts` dùng đáp ứng minh họa theo g/L; chưa mô phỏng phân bố kích thước, phổ tán xạ hoặc NTU/FNU.

## Nguồn và giới hạn đọc

1. [IUPAC: coagulation](https://goldbook.iupac.org/terms/view/C01117): mục thuật ngữ về sự tạo aggregate trong hệ keo. Trang trực tiếp trả 403 ở phiên kiểm tra; chỉ mục tìm kiếm xác nhận thuật ngữ, không dùng làm nguồn định lượng.
2. [Gardner, Theis, Young (1998), Water Research, DOI 10.1016/S0043-1354(98)00042-6](https://scholars.unh.edu/civeng_facpub/131/): đã đọc abstract tại kho của tác giả. Thực nghiệm hematite mất ổn định cho thấy shear và phân bố kích thước ảnh hưởng tương tác aggregate; Brownian chi phối giai đoạn đầu trong điều kiện nghiên cứu. Không suy rộng hệ số của hematite thành Fe(OH)3 mới kết tủa hoặc Al(OH)3.
3. [RSC, Strategies for determining heteroaggregation attachment efficiencies (2020)](https://pubs.rsc.org/en/content/articlehtml/2020/en/c9en01016e): trang trực tiếp trả 403; đoạn chỉ mục nhấn mạnh nhiều quần thể và nhiều đường kết tụ làm việc xác định hiệu suất bám phức tạp. Chưa lấy hệ số, bảng số liệu hoặc kết luận ngoài đoạn đã truy cập.

Các phương trình dưới đây là đề xuất mô hình tối giản để kiểm tra, không phải tham số đã đo cho từng thuốc thử trong lab ảo.

## Phân biệt các quá trình

Tạo pha rắn do phản ứng, tạo mầm, tăng trưởng tinh thể và kết tụ là những biến trạng thái khác nhau. Q/Ksp xác định xu hướng nhiệt động trong miền mô hình, không tự cung cấp thời gian cảm ứng, tốc độ tăng trưởng hoặc tốc độ kết bông. Q phải dùng các ion tự do từ speciation; tổng kim loại hòa tan không thay được nồng độ ion tự do khi có thủy phân/phức.

Mỗi nhóm kích thước cần số hạt vật lý trên thể tích, thể tích chất rắn, bán kính thủy động và thành phần. Glyph chỉ là cách lấy mẫu quần thể để vẽ. Không tính nồng độ số hạt bằng số instance GPU chia thể tích cốc.

Với hạt cầu đặc, thể tích mỗi hạt bằng 4πr³/3. Nếu một glyph đại diện khối lượng M, số hạt mà nó đại diện là M/(ρ × 4πr³/3), sau khi đổi toàn bộ đơn vị về SI. Bông xốp cần phân biệt bán kính thủy động và thể tích vật chất rắn; không gán toàn bộ thể tích bông bằng mật độ tinh thể đặc.

Một kernel Brownian cầu loãng có thể kiểm tra bằng βij = 4π(Di + Dj)(ri + rj), đơn vị m³/s. Đây là giới hạn mô hình khuếch tán đến tiếp xúc, chưa gồm rào tương tác bề mặt hoặc thủy động gần tiếp xúc. Tốc độ bám cần hiệu suất αij; không mặc định α = 1 cho mọi hydroxide, pH, lực ion và ligand. Chưa có dữ liệu phù hợp thì giữ nhãn minh họa, không tự điền hệ số thực nghiệm.

Khi kết tụ, tổng khối lượng và thể tích chất rắn của hai quần thể phải giữ nguyên; số hạt vật lý giảm. Khi tăng trưởng do dung dịch, phải rút đúng mol ion khỏi ledger và cộng đúng pha rắn. Khi hòa tan, trả vật chất về dung dịch; khi bông vỡ chỉ phân phối lại kích thước, không tạo hay mất mol rắn. Giảm số glyph khi đổi chất lượng đồ họa không được kích hoạt bất kỳ quá trình hóa học nào trong số này.

## Yêu cầu theo hệ phản ứng

| Hệ | Cơ chế cần giữ | Phần còn thiếu cần chứng minh |
|---|---|---|
| AlCl3/Al2(SO4)3 + NaOH | Thủy phân, ngưỡng tạo Al(OH)3, lượng gel hữu hạn; kiềm đủ dư có thể ưu tiên aluminate | Diễn tiến lượng chất theo thời gian, kích thước/bông gel; không ép tạo gel thoáng qua chỉ để chạy hiệu ứng |
| Al(OH)3 + NaOH | Lượng tan giới hạn bởi base và cân bằng đã chọn | Co rút/quần thể gel theo lượng tan; không xóa toàn bộ gel khi timeline hết |
| FeCl3 + NaOH | Ion tự do sau thủy phân/phức chloride; pha hydroxide vô định hình đã chọn | Tạo bông, già hóa và lực ion; không dùng hematite thay Fe(OH)3 mới tạo |
| Fe(OH)3 + HCl | Acid hữu hạn, hoàn nguyên Fe hòa tan và pH | Diễn tiến hòa tan, cặn còn lại và hạt không biến mất trước khi lượng rắn giảm |
| CuSO4 + NaOH | Speciation sulfate/hydrolysis và Q/Ksp trong miền hỗ trợ | Động học gel và tác động khuấy; không suy ra phức NH3 từ mô hình không chứa ligand đó |
| AgCl/AgBr/AgI | Pha riêng, common ion, T và lượng hữu hạn | Quần thể curd/kết tụ, ánh sáng theo dữ liệu; không coi bán kính profile là kích thước đo được |
| BaSO4 | Quá bão hòa và pha hữu hạn | Tách tốc độ tạo mầm với lớn tinh thể; tốc độ cấp glyph không được thay vai trò hai quá trình |
| PbI2 | Lịch sử nóng/lạnh và lượng pha rắn | Phân bố kích thước/phiến có kiểm chứng; trộn lạnh không tự tạo phiến lớn như mẫu kết tinh khi nguội |
| CaCO3 | Tổng carbonate, pH, nhiệt và pha được chọn | Trao đổi CO2 phải có thông lượng; không coi hệ kín hiện tại là cốc mở đã cân bằng với không khí |
| Ca(OH)2/Mg(OH)2 | Độ tan và ion chung trong miền hỗ trợ | Động học hạt/kết tụ; không gán nhiệt phản ứng chưa có nguồn |
| Nhiều pha cùng tồn tại | Giữ thành phần, khối lượng và lịch sử từng pha | Heteroaggregation cần thành phần aggregate và dữ liệu bám; trộn màu không chứng minh các pha đã kết bông cùng nhau |

## Tiêu chí chấp nhận triển khai

1. Cùng mẫu, cùng thời gian vật lý: thay tier hoặc số instance không đổi lượng kết tủa, quần thể vật lý hoặc tốc độ lắng dự đoán.
2. Mỗi bước kiểm tra mol nguyên tố, điện tích phân tích và tổng rắn trong reservoir + huyền phù + cặn; rót/hút lấy đúng phần đã chuyển, không tái sinh vật chất từ baseline cũ.
3. Tắt kernel kết tụ thì kích thước không tăng chỉ vì hạt già đi. Chỉ bật kết tụ khi có mô hình hiệu suất và miền áp dụng được khai báo.
4. Kiểm tra riêng giới hạn α = 0 và α = 1 của mô hình thử, trường hợp không có hạt, cực loãng, nhiều nhóm kích thước và dt khác nhau; đây là kiểm tra toán, không phải xác nhận α thực tế.
5. Không dùng va chạm giữa glyph phóng đại làm va chạm vật lý; xác suất sự kiện phải dựa trên nồng độ số hạt và thể tích thật.
6. Chemistry cập nhật trước vật lý hạt, rồi buffer vẽ và shader. Snapshot cũ không được dùng để tạo thêm rắn hoặc xóa cặn còn thật.
7. Tạo mầm/tăng trưởng cần giới hạn nguồn mol và chỉ chạy trong miền speciation được hỗ trợ. Không lấy một đường cân bằng đơn chất làm bằng chứng hỗn hợp nhiều kim loại đã đúng.
8. Chứng minh riêng vật thể nằm trong lòng bình, không xuyên cặn/thành và không nổi khỏi đáy sau khi hết chất lỏng; kiểm thử hình học phải đi cùng kiểm tra 3D trên thiết bị GPU.
9. Hiệu chuẩn từng hệ bằng điều kiện và phép đo phù hợp: nồng độ, T, pH, cách thêm, khuấy, thời gian, phân bố kích thước và lắng/đục. Chưa có phép đo thì giữ mô tả minh họa, không công bố độ chính xác phòng thí nghiệm.

Thứ tự triển khai: sửa thứ tự frame và diễn tiến vật chất nhôm trước; sau đó xây quần thể hạt độc lập GPU, kiểm tra bảo toàn, rồi mới nối kernel kết tụ có dữ liệu. Bổ sung cùng ngày: thứ tự frame đã dùng priority chung và đường native thuần nhôm đã có tiến triển inventory hữu hạn, xem [chi tiết nhôm](aluminum-hydroxide-amphoteric-equilibrium.vi.md). Chưa bổ sung kernel kết tụ hoặc xác nhận đồ họa đã hết lỗi.
