# Kế hoạch tự rà soát và nâng cấp tính chân thực

Mục tiêu người dùng: tự lập kế hoạch, nghiên cứu những thiếu sót còn lại và nâng cấp hệ thống. Tiếp tục phạm vi phản ứng, kết tủa, khuấy, khí, nhiệt, hình học và hiệu năng; không coi một nhóm test xanh là nghiệm thu toàn hệ.

## Hiện trạng được kiểm tra

- Điểm xuất phát `d6c9b886`: 3.319 test, TypeScript/build và bốn audit trình duyệt đã qua ở vòng trước.
- Đọc lại worktree ngày 14/11/2026. Các sửa đổi sẵn có ở App, AssetBrowser, chemicals, aliquotContactChemistry, sidebar store, name_search, Vite và Landolt không thuộc vòng này.
- Vòng trước là **có tiến triển**: mã đã commit, kết quả GPU và UI có thể chạy lại. Các giới hạn khoa học và hạng mục mở trong tài liệu cũ vẫn cần đối chiếu hiện trạng; không mặc định còn lỗi hoặc đã sửa chỉ vì ghi chú.

## Trình tự thực hiện

1. Rà luồng vật chất/năng lượng qua rót → tiếp xúc → phản ứng → hạt/cặn/khí; ưu tiên lỗi có tình huống tái hiện và hậu quả nhìn thấy.
2. Rà vòng đời hạt: tăng trưởng, hòa tan, thay ngân sách, bật cặn khi khuấy, nghiêng/di chuyển bình, pause và tốc độ mô phỏng.
3. Rà quang học/hình học trên mọi profile bình: đường nhìn xiên, vai/cổ bình, đáy cong, mặt vortex, lớp nước mỏng và màu của nhiều chất.
4. Rà khí/nhiệt: nguồn trong/ngoài nước, chứa kín, chuyển pha, kho hữu hạn, năng lượng qua biên và khác biệt giữa thao tác/tự động.
5. Đối chiếu nguồn sơ cấp cho thay đổi khoa học; khai báo đơn vị, miền áp dụng và phần chưa hiệu chuẩn. Không thay hệ số tùy ý để vừa mắt.
6. Sửa theo nhóm độc lập, kiểm chứng hồi quy có ý nghĩa; chạy renderer thật cho thay đổi hình ảnh và đo chi phí cho thay đổi đường chạy thường xuyên.
7. Tổng kiểm tra trên mã ổn định: test đầy đủ, TypeScript, build, audit trình duyệt, review diff và commit trực tiếp `main`. Ghi rõ phần còn mở trước vòng tiếp theo.

## Bảng công việc đang mở

| Nhóm | Trạng thái | Bằng chứng cần có |
| --- | --- | --- |
| Kết tủa/hòa tan/lớp cặn | Đã sửa phụ thuộc ngân sách và lịch sử kích thước; test tổng đã qua | Bảo toàn khối lượng, quỹ đạo không đổi giữa ngân sách 0/35/900; giới hạn 128 parcel vẫn là xấp xỉ số |
| Khí/nhiệt/chuyển pha | Đã sửa áp suất bọt, tiếp xúc thành và stock khô | Áp suất kho khí hiện tại; NaCl/CaCO₃/PbI₂ bảo vệ stock khô và giữ nguồn gốc stock còn dư |
| Phản ứng khi rót/thủ công/tự động | Đã nối kiểm tra tiếp xúc và bảo vệ replay | Hồi quy native/progressive/autoplay, dry→wet→dry và hỗn hợp stock/kết tủa cùng công thức |
| Quang học bình có vai/đáy cong/vortex | 2.160 trường hợp GPU đã qua | So pixel với quang lộ tham chiếu, nhiều góc nhìn và lớp nước mỏng |
| Hiệu năng và ngân sách | Đã đo transport và shader riêng | 20 hệ: trung bình 5,58–6,65 ms; shader quad 512²: median 1,9–3,0 ms gồm readback; không suy FPS toàn ứng dụng |
| Tái kết tinh PbI₂ và kim loại bám mặt | Đã tách lịch sử quần thể và lượng chất theo carrier trong vòng 15/11 | Còn thiếu hiệu chuẩn nucleation/growth, độ xốp và luật bong bám; xem các tài liệu vòng tiếp theo |
| Toàn danh mục và giới hạn dữ liệu | Cần đối chiếu audit hiện tại | Không gắn nhãn chính xác thực nghiệm cho profile/hằng số minh họa |

Mỗi phát hiện sẽ được cập nhật bằng tình huống, cách sửa, kết quả và giới hạn còn lại. Mục tiêu tiếp tục hoạt động khi còn hạng mục bắt buộc chưa được chứng minh.

## Phát hiện đang xử lý trong vòng đầu

| Lỗi đã tái hiện | Hướng sửa | Tình trạng kiểm chứng |
| --- | --- | --- |
| Zn ngoài nước vẫn tiến triển bằng Zn ngập nước; tương tự xúc tác MnO₂, Fe/CuSO₄, CaCO₃/HCl | Dùng tiếp xúc pha lỏng từ hình học và tư thế thật ở kinetics lẫn phản ứng tức thời | 20 hồi quy tiếp xúc đã qua, gồm selector native, replay, stage nhôm và Cu/NH₃ |
| Bọt trong bình kín dùng áp suất phòng, bọt bị ghim ở vai bình nghiêng | Lấy áp suất headspace từ kho khí; chiếu chuyển động tiếp tuyến thành | Hồi quy và bộ test tổng đã qua |
| Chất lượng đồ họa làm đổi tốc độ lắng; phần khối lượng chưa phát glyph chưa được vận chuyển | Tách 128 parcel vận chuyển vật lý khỏi ngân sách glyph, bảo toàn khối lượng/moment khi lấy mẫu | Hash trạng thái giống hệt ở ba ngân sách; sai số khối lượng tối đa 7,63×10⁻¹⁷ g |
| PbI₂ bỏ thời gian sau 0,5 s và hòa tan cả trong hexane | Bỏ cắt dt, bắt buộc chất mang nước lỏng được hỗ trợ | Hồi quy dt, dung môi, stock khô/ướt và tăng trưởng cạnh stock khô đã qua |
| NaCl/CaCO₃ hòa tan stock khô; chuyển pha làm mất nhãn stock | Chỉ giải pool tiếp xúc, chuyển phần lượng thay đổi và giữ metadata phần còn lại | 35 kiểm thử pha liên quan đã qua |
| Độ đục sai ở vai/đáy bình và lõm vortex | Giao tia với contour thật và biên mặt xoáy | 2.160 trường hợp GPU qua, sai số alpha tối đa 0,002006; xem optical-contour-vortex-validation.vi.md |

Rà soát chéo bắt thêm crash Cu/NH₃ khi có Zn khô khác trong bình: phép tính extent dùng nhầm toàn bộ inventory sau khi ledger đã loại stock khô. Đã thống nhất pool tham gia và bổ sung hồi quy.

Renderer sản phẩm đã qua audit đũa khuấy, sáu kết tủa, Zn/HCl và H₂O₂/MnO₂. Audit quang học còn kiểm tra mẫu hoàn toàn trong, nồng độ, độ dài đường nhìn, thứ tự màu và camera trực giao. Kết quả tổng test/build được ghi bên dưới sau khi hoàn tất.

Lượt tổng đầu có 3.369/3.372 test qua. Hai assertion về Fe(OH)₂/S vẫn dùng envelope cũ `2,01 × radius`; đối chiếu tâm vật lý và bán kính thật của renderer xác nhận hạt vẫn trong nước. Hồi quy được sửa để kiểm tra riêng cả hạt vật lý và glyph hiện hành, ở hai chế độ đọc rõ. Lỗi thứ ba thúc đẩy đo allocation: sampler bề mặt bột cấp phát vector cho mọi tam giác trước khi chọn 128 điểm. Đã chuyển sang lấy điểm trực tiếp từ buffer và đo retained heap ngoài khoảng đo thời gian, giữ nguyên ngân sách bộ nhớ. Allocation được profiler quy cho sampler giảm khoảng 80,33 → 2,59 MB; xem `contact-allocation-benchmark.vi.md`.

Ảnh fixture còn có ellipse sáng ngoài bình do scene đặt bình theo lưới nhưng store khai báo mọi vị trí bằng zero. Đã đồng bộ tọa độ fixture, giữ caustics hoạt động và chụp lại. Đây là lỗi bố trí cảnh kiểm tra, không phải hạt kết tủa nằm trong không khí.

## Tổng kiểm tra trên mã cuối

- `npx vitest run --maxWorkers=2 --reporter=dot`: **3.375/3.375 kiểm thử, 252/252 tệp**, 156,62 s. Giữ nguyên các ngưỡng smoke hiệu năng.
- Trong lượt tổng: logic/physics ba bình trung bình **4,453 ms**, P95 **8,881 ms**; retained heap tăng **4,509 MB**, raw heap tăng **9,372 MB**. Không gồm WebGL/FPS; artifact riêng `artifacts/realism-performance/headless-performance.json`.
- Năm audit trình duyệt đã qua: đũa khuấy, sáu kết tủa, nguồn khí phản ứng, tham chiếu độ đục và 2.160 trường hợp hình học quang lộ. Đã xem ảnh trước/sau khuấy và sau hòa tan; không lỗi JavaScript/shader trong các audit.
- `npm run lint`, `npm run build` và `git diff --cached --check`: **qua**. Build vẫn báo một số chunk lớn hơn 500 kB; chưa đánh đồng kết quả kiểm tra logic với thời gian tải hay FPS. Chỉ stage các file của vòng này và hunk truyền hình học tiếp xúc trong store; các sửa đổi giao diện/dữ liệu sẵn có không đưa vào commit.

## Giới hạn và vòng nghiên cứu tiếp theo

- Nhiều hạt cơ học cùng công thức vẫn chia sẻ một hàng inventory. Diện tích ướt điều chỉnh tốc độ tổng nhưng chưa phân bổ riêng mức co của từng hạt khô/ướt. Cần thiết kế lượng chất theo carrier trước khi tuyên bố mọi hạt đều được tiêu thụ đúng vị trí.
- Tiếp xúc hóa học dùng mặt thủy tĩnh, chưa giải màng bám sau khi nhấc hạt, mao dẫn, vùng tia rót hoặc lõm vortex. Kết tủa phân tán chưa có tọa độ hóa học riêng.
- 128 parcel là độ phân giải vận chuyển cố định, không phải số tinh thể thật. Gộp ưu tiên cùng kích thước; hơn 128 cohort kích thước vẫn mất một phần phân bố. Atlas màu/tán xạ và hằng số động học chưa hiệu chuẩn thực nghiệm.
- Tiếp tục đối chiếu chu kỳ tăng trưởng PbI₂, kim loại bám mặt, các nhóm phản ứng chưa có nguồn dữ liệu phù hợp và tải toàn ứng dụng trên phần cứng mục tiêu. Các phép đo CPU/quad hiện tại không thay thế kiểm tra FPS và thao tác đồng thời.

Mục tiêu rộng tiếp tục hoạt động; vòng này giải quyết các lỗi tái hiện nêu trên, không chứng nhận toàn danh mục chính xác thực nghiệm.

## Vòng tiếp theo — 15/11/2026

Đã thực hiện các mục còn thiếu và sửa lỗi phát hiện khi tích hợp:

1. **Lượng chất theo carrier**: hạt khô không bị tiêu hao cùng hạt ướt; đồng bộ mass giữ chuyển động hiện tại, xử lý phản hồi cũ và liều mới chưa có ID. Timeline, native, pha, chế độ tay/tự động dùng cùng giới hạn tiếp xúc. Xem [lượng chất theo hạt](wetted-stock-grain-budget-2026-11-15.vi.md) và [đồng bộ cơ học](carrier-mass-synchronization-2026-11-15.vi.md).
2. **Lịch sử hình thành kết tủa**: PbI₂ bột mịn và tấm tinh thể, PbCl₂ bột và kim được vận chuyển riêng. Tăng trưởng hoặc phản ứng tạo sản phẩm mới không đổi toàn bộ phần cũ sang hình thái mới. Rót lấy đúng phần huyền phù của từng dạng. Xem [cohort kết tủa](precipitate-formation-cohorts-2026-11-15.vi.md).
3. **Kim loại bám**: lưu nền/ID/route cùng lượng chất, giữ qua phản ứng khác và replay. Mesh tay/tự động/vũng biểu diễn thể tích kim loại; lực đỡ, tràn, thu lại và phản ứng trong vũng giữ riêng lõi/lớp bám. Xem [kiểm chứng lớp bám](metal-surface-deposition.vi.md).
4. **Phoi đồng và đáy bình**: thay hull lấp khoảng trống của dây bằng các capsule có sai lệch hình học được giới hạn; sửa kích thước đặc trưng của solver. Kiểm cả xuyên đáy, khoảng hở, tải trọng lớp bạc và phản ứng Cu/Ag sau chuyển liều thật. Xem [tiếp xúc phoi đồng](copper-wire-contact-2026-11-15.vi.md).
5. **Chi phí tiếp xúc**: bỏ phép dựng hình tĩnh khi chỉ truy vấn ID hạt; phân loại tam giác để chỉ cắt các mặt đi qua biên chất lỏng. A/B cùng dữ liệu giữ nguyên kết quả, phép cắt nhanh 1,99× và phân vùng tĩnh nhanh 1,63×. Xem [đối chiếu CPU](stock-contact-clipping-performance-2026-11-15.vi.md).

Rà soát chéo còn sửa việc thu hạt vào bình đầy rút lẫn nước/hexane và việc dữ liệu lưu cũ mất hình thái tinh thể khi sinh thêm bột. Các hồi quy giữ nguyên lớp nước dưới, khối lượng từng chất, hạt macrostock cùng công thức và quần thể tinh thể cũ.

Kết quả tổng trên mã tích hợp:

- `npx vitest run --maxWorkers=1 --reporter=default`: **3.454/3.454 kiểm thử, 258/258 tệp**, 359,53 s. Toàn bộ kịch bản phản ứng tự động, các ca tiếp xúc, khuấy, chuyển pha và vận chuyển đều qua.
- Benchmark ba bình trong lượt tổng: trung bình **3,182 ms**, P95 **6,217 ms**, retained heap tăng **4,244 MB**. Giữ nguyên ngưỡng trung bình 5 ms/P95 10 ms. Artifact `artifacts/realism-performance-2026-11-15/headless-performance.json`; không gồm WebGL/FPS.
- Lượt song song trước đó qua toàn bộ assertion hành vi nhưng benchmark CPU đạt 5,68 ms và trượt ngân sách. Vì phép đo thời gian chịu tải đồng thời, lượt cuối chạy tuần tự; không tăng ngưỡng hoặc bỏ test. Lỗi timeout Cu/H₂SO₄ ở lượt đầu đã dẫn đến tối ưu hình học có A/B cùng dữ liệu, không đổi kinetics.
- `npm run lint` và `npm run build`: **qua**. Build vẫn báo chunk lớn hơn 500 kB; tốc độ tải toàn ứng dụng chưa được coi là đã giải quyết.
- Năm audit trình duyệt trên mã cuối đều qua: `auditCarrierMassSync`, `auditPrecipitateFormation`, `auditMetalDepositionBrowser`, `auditStirringRod`, `auditReactionGasSources`. Không có lỗi JavaScript/shader; đã xem ảnh đũa trong ống nghiệm, sáu mẫu tinh thể, bạc trên phoi đồng và đinh phủ đồng nghỉ trên bàn. Hạt khô trong fixture worker vẫn được pause có chủ ý để kiểm tính bất biến của pose.
- Cu/Ag chạy chuyển liều thật đạt tiến độ 0,150095 sau 21,4667 s mô phỏng, 12/12 hạt ngập, 0,0323809067 g Ag. Audit CPU riêng trên mã cuối mất 9,16 s; kiểm GPU có 96 cụm bám và thể tích khớp kho trong ngưỡng 2×10⁻⁶ tương đối.

Ưu tiên kế tiếp vẫn là thiếu sót có thể tái hiện: lịch sử lớp bám nhiều tầng và điểm bám khi tải lại, kim loại sinh trong vũng, tiếp xúc ngoài mặt thủy tĩnh, rồi độ phủ dữ liệu khoa học và tải thao tác toàn ứng dụng. Không coi kết quả test logic là chứng nhận động học, màu hay cơ chế bong bám đã khớp thực nghiệm. Mục tiêu tiếp tục hoạt động.

## Vòng tiếp xúc và vật nền — tiếp tục ngày 15/11/2026

Từ baseline sạch `1767a90b`, đã tái hiện ba lỗi còn lại: Ag sinh từ lớp Cu trên Fe bị biến thành huyền phù, kim loại sinh trong vũng mất carrier, và phần ngập hóa học trái với mặt xoáy khi khuấy. Thực hiện sửa nguồn gốc vật nền, dùng tiếp xúc vũng đo từ pose thật, và thống nhất lịch sử chuyển động chất lỏng cho hóa học/cơ học/renderer. Ca tái hiện, nguồn đối chiếu và giới hạn được ghi trong [liên tục tiếp xúc và vật nền](surface-contact-continuity-2026-11-15.vi.md).

Kiểm chứng bắt buộc gồm vật nền khô/ướt cùng công thức, sản phẩm từ kho tự do và kho bám, tiêu thụ hết lớp trung gian hoặc lõi, chuyển/thu carrier, replay và lưu/khôi phục. Mặt xoáy cần kiểm cả vùng tâm khô và vành ướt, spin-up/spin-down, pause và đồng hồ các chế độ. Sau hồi quy tập trung sẽ chạy toàn bộ test, TypeScript/build, trình duyệt thật và commit trực tiếp `main`.

## Tích hợp yêu cầu UI và thao tác — 15/11/2026

Vòng tiếp xúc/vật nền đã được tích hợp cùng giao diện gọn, rót/rửa có hồi quy, khởi động phản ứng cục bộ và hình thái tinh thể NaCl. Bộ tổng 3.515 kiểm thử/262 tệp đã qua; các kiểm tra trình duyệt xem [báo cáo nâng cấp tích hợp](compact-lab-upgrade-2026-11-15.vi.md). Các giới hạn hiệu chuẩn/mao dẫn/bóc tách nêu trên vẫn là giới hạn mô hình, không phải cam kết đã giải chính xác thực nghiệm mọi chất.
