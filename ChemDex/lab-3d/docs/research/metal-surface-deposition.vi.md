# Kim loại bám trên chất rắn — kiểm chứng và phạm vi mô hình

Cập nhật 15/11/2026. Các route được nhận dạng: Ag trên Zn/Cu, Cu trên Fe/Zn/Mg, Pb trên Zn của exemplar `zn+pb(no3)2`. Mục tiêu là giữ đúng lượng sản phẩm, vật nền và vị trí chuyển động; không coi một lần đổi màu là lượng kim loại đã được biểu diễn đầy đủ.

## Bằng chứng thực nghiệm

- [UW–Madison, Silver tree](https://demolab.chem.wisc.edu/electrochemistry-silver-trees/): bạc tạo tinh thể trên tấm đồng nhúng trong AgNO₃. Nguồn xác nhận vị trí hình thành của Cu/Ag; không cung cấp phân bố kích thước hoặc tốc độ để áp sang Zn/Ag.
- [Indiana University, Copper plating a nail](https://www.chem.indiana.edu/faculty-research/faculty-resources/chemistry-demos/demo/copper-plating-a-nail/): đồng bám lên đinh sắt trong CuSO₄. Đây là bằng chứng hình thái/vị trí, không phải phép đo độ bám.
- [Ogata 1975, Copper immersion plating on iron](https://www.jstage.jst.go.jp/article/sfj1950/26/12/26_12_592/_article), DOI 10.4139/sfj1950.26.592: độ bám khác nhau giữa dung dịch CuSO₄ đậm đặc và bể loãng axit. Thí nghiệm này bác bỏ việc dùng một hệ số bám/bong phổ quát. Mã không lấy tốc độ của bể xử lý bề mặt làm tốc độ phản ứng lớp học.
- [Electroless growth of lead dendrites, 2021](https://www.sciencedirect.com/science/article/abs/pii/S0960077920309772), DOI 10.1016/j.chaos.2020.110586: Pb tạo trên nền Zn trong môi trường gel chứa chì nitrat. Chỉ dùng để xác nhận cơ chế/vị trí của exemplar; hình cây và thang thời gian trong gel không được coi là hiệu chuẩn cho dung dịch nước.
- [RSC — Ag](https://periodic-table.rsc.org/element/47/Silver), [Cu](https://periodic-table.rsc.org/element/29/Copper), [Pb](https://periodic-table.rsc.org/element/82/Lead): mật độ kim loại khối dùng đổi lượng chất thành thể tích vật liệu lần lượt 10,5; 8,96; 11,34 g/mL. Thể tích này không đồng nghĩa thể tích bao xốp của cây kim loại.

## Lỗi được tái hiện

Trước bản sửa, 0,1 g Cu trên nền Fe được loại khỏi huyền phù chỉ khi `lastReactionId` còn là `fe_cuso4`. Đổi trường đó sang `hcl_naoh`, không đổi lượng chất hay vị trí, làm cùng 0,1 g trở thành huyền phù. Route native dùng id `fe_cuso4_displacement` và không lưu Studio id nên cũng bỏ qua lớp bám. Bột động chỉ vẽ thể tích nền, dù lượng sản phẩm đã bị loại khỏi hệ kết tủa. Các cụm trên vật rắn lớn lấy vài đỉnh lưới rồi ép tọa độ y lên trên đáy bình, làm mất điểm tựa thật khi chạm đáy.

## Dữ liệu và bảo toàn

Mỗi dòng sản phẩm có thể giữ `depositSubstrate`, `depositionReactionId`, `depositCarrierId`, `depositReleased`. Đây là dữ liệu vật chất lưu cùng inventory, không phụ thuộc phản ứng đang hiển thị. Route native và Studio ghi cùng id chuẩn. Dòng kim loại tự do, nền kim loại thêm riêng, và lớp bám trên nền khác không được gộp vào nhau.

Khi có carrier thật, chỉ lượng mới sinh được chia theo diện tích nền tiếp xúc dung dịch nước. Carrier khô không nhận phần mới. Khi phát lại baseline ở tiến độ tích lũy, phần đã nhận giữ nguyên carrier; thay đổi vị trí không phân phối lại lớp cũ. Các save cũ có route nhận dạng được có nhánh tương thích theo nền và được nâng dữ liệu khi lớp đó tiếp tục tăng trưởng. Chỉ trường hợp không có carrier đã giải quyết mới dùng chia theo khối lượng nền; đó là xấp xỉ thiếu lịch sử.

`attachedMetalMassForRow` là phép phân bổ duy nhất để trừ phần bám khỏi kết tủa tự do. Không xóa sản phẩm khỏi ledger. Chuyển/thoát một carrier mang theo đúng các dòng lớp bám của nó; moles và mass được chia cùng tỷ lệ. Khi nền tiêu thụ hết, phần bám không còn được giữ trong lớp nền; dấu released ngăn kim loại cũ tự bám lại vào một liều nền mới. Rút huyền phù không được rút lớp bám như hạt tự do.

Cơ học giữ khối lượng lõi riêng, đồng thời cộng khối lượng và thể tích kim loại vào tải trọng, lực nổi và vỏ va chạm tương đương. Không ghi khối lượng Cu vào lượng Fe còn lại. Vỏ va chạm dùng thể tích tương đương, chưa phải mô hình riêng cho từng nhánh dendrite.

## Hiển thị

Chế độ tay và tự động dùng chung các cụm bám hữu hạn trên tam giác bề mặt thật. Tổng thể tích lưới bằng tổng `mass/density`, không sinh theo thời gian. Điểm bám đầu tiên ưu tiên phần ngập dung dịch; tọa độ vật liệu và hướng được giữ khi vật nền quay hoặc nhấc lên. Bộ nhớ đệm điểm bám tránh lấy mẫu hàng nghìn tam giác trong mỗi khung khuấy. Không dịch cụm độc lập theo trục y để tránh đáy bình.

Các cụm là phân giải hiển thị thô, không mô phỏng số hạt hay cơ chế tăng trưởng fractal. Điểm bám được dựng ở lần hiển thị đầu, chưa lưu lịch sử bề mặt vi mô trong save. Lớp rất lớn có thể vượt vỏ va chạm tương đương; mã giữ điểm tựa và lượng chất thay vì tạo mảnh lơ lửng. Bột tiếp xúc dùng thể tích nền cộng thể tích lớp bám; màu theo carrier để hạt khô không bị đổi màu theo hạt ướt khác. Pile bột vẫn dùng độ đặc 0,55 và góc nghỉ 28° minh họa. Hạt rơi ra bàn giữ lớp bám, khối lượng và chuyển động nền; nền hết thì phần kim loại tự do trở về lớp cặn hữu hạn.

## Kiểm chứng và giới hạn

`metal_deposition_provenance.test.ts` kiểm tra sáu route, dữ liệu lưu/đọc lại và đổi phản ứng, native Fe/Cu, phát lại tiến độ và đổi hạt ướt, chia chuyển đúng carrier, nền cũ hết rồi thêm nền mới, nâng save cũ, thể tích bột, thể tích cụm và tiếp xúc mặt, điểm bám ngập và phép quay. Các test stock/contact kiểm tra lớp bám trên carrier khô không tham gia phản ứng dung dịch. Test cơ học và thoát/thu carrier kiểm tra tải trọng và inventory nhiều kim loại không bị biến thành một chất.

Không có hằng số bám dính, ngưỡng ứng suất bong do khuấy, phân bố kích thước mảnh bong hay độ xốp dendrite đã hiệu chuẩn. Hiện lớp được giữ theo nền đến khi nền mất/được chuyển; không phát minh luật bong để tạo hiệu ứng. Các phép kiểm CPU về lượng chất, hình học và tọa độ không thay thế kiểm tra GPU. Không đánh dấu cơ chế bám/bong thực nghiệm là hoàn tất chỉ vì kiểm thử phần mềm đạt.

## Bằng chứng trình duyệt trong lượt kiểm tra

Audit `scripts/auditMetalDepositionBrowser.mjs` kiểm trực tiếp InstancedMesh và thể tích lưới, ngoài ảnh chụp. Ảnh/JSON đặt tại `artifacts/metal-deposition`. Mẫu tay Fe (đinh)/Cu và Cu (phoi)/Ag được dựng inventory hữu hạn bằng helper để cô lập kiểm tra renderer, không phải bằng chứng phản ứng tự diễn tiến. Chúng vẫn giữ lớp sau khi id phản ứng đổi sang HCl/NaOH. Nhánh tự động chạy chuyển liều, tiếp xúc và phản ứng thật của AutoExperiment. Thể tích cụm sai lệch dưới 2×10⁻⁶ tương đối so với inventory; một đinh rơi ra bàn mang đúng 0,05 g Cu. Chế độ tự động Fe/Cu dùng bột: thể tích vật liệu lớp bột đo được 0,000402699474061 đơn vị cảnh³, khớp 0,000402699474062 từ nền cộng lớp Cu; riêng Cu là 0,001074171 mL. Đây là kiểm dữ liệu/GPU ở mẫu cụ thể, không phải hiệu chuẩn tốc độ hay độ bám.

Audit cũng phát hiện phản ứng Cu/Ag tự động bị chặn vì phoi Cu lọt đáy trước khi AgNO₃ tới. Ca tái hiện tách còn một body Cu, khối lượng 0,0052955 g, scale 0,0008392 m, vị trí ban đầu y=0,0055146 m; kể cả vận tốc ban đầu bằng 0, body ra dưới đáy sau 0,2 s. Kiểm tra điều kiện hóa học vẫn đạt, wet-area đúng bằng 0 vì body đã ở ngoài cốc. Đây là lỗi va chạm cần sửa ở StockWorld; không bỏ cổng tiếp xúc để che lỗi. Trạng thái kiểm chứng Cu/Ag tự động chỉ được xác nhận sau khi audit này chạy lại đạt.
