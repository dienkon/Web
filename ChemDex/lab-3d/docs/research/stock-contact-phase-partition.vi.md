# Tiếp xúc pha lỏng và bảo toàn nguồn gốc chất rắn

## Lỗi đã tái hiện

`partitionSodiumChloride` và `partitionCalcite` trước đây đưa toàn bộ chất rắn trong sổ vật chất vào cân bằng hòa tan, dù hạt rắn đang ở trên mặt nước. Ví dụ 0,1 g NaCl nằm trong không khí trên 30 g nước vẫn mất khoảng 0,099945 g sau bước 30 s theo hàm thư giãn cũ. Sau sửa, bước này không làm thay đổi lượng chất.

Calcite còn có một lỗi nguồn gốc: mỗi lần phân bố lại pha, toàn bộ CaCO3 rắn còn lại bị ghi thành `solidOrigin: 'precipitate'`. Một mẩu đá chỉ hòa tan một phần vì thế có thể biến thành đám kết tủa, và lần sau khi nhấc lên khỏi nước vẫn bị coi là vật chất đang nằm trong dung dịch.

## Thay đổi

Hai bộ phân bố pha dùng `partitionDryStock` để tách các hàng chất rắn hoàn toàn không tiếp xúc nước khỏi mẫu đang trao đổi với dung dịch. Hàng rắn khô vẫn nằm nguyên trong sổ vật chất của bình, giữ nguyên khối lượng, mol và dữ liệu hình học. Một lượng kết tủa đã nằm trong nước có thể tiếp tục hòa tan dù bình đồng thời chứa mẩu rắn khô cùng công thức.

Khi hòa tan, phần diện tích ngập nước làm giảm tốc độ thư giãn hiện có. Khi dung dịch quá bão hòa, sự xuất hiện chất rắn mới lấy vật chất từ lượng đã hòa tan; không cần mượn một mẩu rắn đang ở trong không khí làm điều kiện cho quá trình này. Các hằng số tốc độ vẫn là minh họa, chưa phải số đo thực nghiệm.

`transferSolidPhase` chỉ chuyển lượng thay đổi giữa pha rắn và pha nước. Phần stock sống sót giữ metadata và kích thước tham chiếu ban đầu. Chỉ phần mới kết tinh được gắn nguồn gốc kết tủa; nó không ghi đè lên mẩu stock có sẵn. Hàng dung dịch nhận đúng lượng mol và khối lượng được lấy từ rắn, hoặc trả chúng lại khi kết tinh. PbI2 cũng dùng phép chuyển vật chất chung này.

Nhãn hiển thị kết tủa cũ không ghi đè một vị trí stock động đang ở ngoài nước. Những mẫu kết tủa cũ không có vị trí stock vẫn được nhận diện theo trường tương thích hiện có. Với calcite, nhãn kết tủa được xóa khi không còn lượng kết tủa thật, kể cả khi vẫn còn một mẩu stock.

## Nguồn và miền áp dụng

- [Báo cáo IUPAC về cân bằng rắn–lỏng, DOI 10.1515/pac-2021-1002](https://doi.org/10.1515/pac-2021-1002): phương trình 11 và bảng 5 cung cấp tương quan NaCl khan/nước đang dùng; bảng 7 là dữ liệu molality tham chiếu độc lập trong kiểm thử hiện có. Mô hình ứng dụng tiếp tục giới hạn ở 0–100 °C và hệ nhị phân NaCl/nước, dùng khối lượng nước làm cơ sở nồng độ. Không bổ sung hiệu chỉnh ion chung, hydrate hay enthalpy hòa tan.
- [Plummer và Busenberg, 1982, USGS](https://www.usgs.gov/publications/solubilities-calcite-aragonite-and-vaterite-co2-h2o-solutions-between-0-and-90degc-and): nguồn cho hằng số calcite tham chiếu `log10 Ksp = -8,480` ở 25 °C. Sửa này giữ mô hình carbonate hiện có; nồng độ vẫn xấp xỉ hoạt độ, khí CO2 trong khoảng khí không được coi là CO2 đã hòa tan. Mô hình ứng dụng chưa bao gồm toàn bộ ghép cặp ion và hiệu chỉnh hoạt độ trong công trình gốc.

Việc chặn vật chất không tiếp xúc dung môi là ràng buộc hình học/sổ vật chất, không phải hằng số động học được suy ra từ hai tài liệu trên. Hình học tiếp xúc được lấy từ tư thế stock và mặt chất lỏng theo trọng lực. Phân bố tiêu thụ giữa nhiều hạt stock cùng công thức có độ ngập khác nhau vẫn chưa được giải riêng cho từng hạt; helper hiện phân loại theo nhóm công thức, rồi giảm tốc độ bằng phần tiếp xúc. Không mô phỏng màng nước bám sau khi nhấc lên, mao dẫn hay truyền khối lớp biên.

## Kiểm chứng

`tests/phase_stock_contact.test.ts` có 10 tình huống cho NaCl và CaCO3: stock khô với nhãn hiển thị cũ; hòa tan rồi nhấc khỏi nước; stock khô cùng công thức với kết tủa ướt; kết tinh từ dung dịch quá bão hòa cạnh stock khô; và thay đổi độ ngập với cùng thành phần vật chất. Mỗi phép chuyển có kiểm tra bảo toàn mol, khối lượng và lượng nước.

Đã chạy `phase_stock_contact`, `mixing_inventory` và `carbonate_equilibrium`: 35 kiểm thử qua, bao gồm cân bằng bão hòa tham chiếu, ion chung, chuỗi thời gian trong store và bảo toàn nguyên tố. `npm run lint` qua. Các kiểm thử xác nhận ràng buộc và sổ vật chất; không xác nhận tốc độ hòa tan hay phân bố kích thước tinh thể bằng thực nghiệm.
