# Rà soát liên tục tính chân thực — 25/10/2026

Mục tiêu còn đang thực hiện: cải tiến toàn hệ thống vật lý/hóa học, không chỉ các hiệu ứng cơ bản. Không coi test xanh là bằng chứng đã hết mọi sai lệch hoặc đã hiệu chuẩn thực nghiệm.

Vòng trước tạo được thay đổi code và kết quả kiểm thử nên được phân loại **có tiến triển**. Vòng này đọc lại worktree, phát hiện đường ghi VFX vượt ngân sách vật chất/năng lượng và sửa bằng hợp đồng có kiểm chứng.

## Sai lệch đã xử lý trong vòng này

| Sai lệch xác định từ code | Thay đổi | Bằng chứng |
|---|---|---|
| Atom flame ép mẫu lên 450 °C; steam ép nhiệt độ theo preset; fizz tự cộng mL bọt; Atom tự bật hasGas/hasPrecipitate | Loại các trường vật lý khỏi `VesselPatch` và bỏ các phép ghi đó trong Atom | Kiểm thử đi qua toàn bộ Atom đã đăng ký; cấm các trường nhiệt/khối lượng/thể tích/cờ pha |
| Director áp patch vào object state tại chỗ, cho timeline ghi đè nhiệt/bọt/cặn/màu hóa học | `programAppearanceChanges` giới hạn thay đổi quang học; màu chỉ thị tính theo pH; thay đổi được publish bất biến theo batch | Kiểm thử mọi mẫu Studio định lượng được hỗ trợ: patch giả không đổi kho chất, nhiệt, pha, cặn hay màu hóa học; bài học nhiều dụng cụ giữ compiler riêng |
| Ledger VFX luôn báo 1 atm, thiếu species, 0 °C bị fallback thành 25 °C, hasGas mặc định thành 20% gas holdup | `buildProgramLedgerView` lấy áp suất, nhiệt độ, moles và tiến độ thực; không suy luận tỷ phần khí từ boolean | Kiểm thử snapshot 0 °C, 0.7 atm, moles nước và tiến độ 0.3 |
| Timeline quang học kết thúc trước phản ứng khi visual duration ngắn hơn chemical duration | `reactionProgress` từ engine quyết định cửa sổ Atom; thời gian dựng hình không tự làm phản ứng hoàn tất | Kiểm thử cập nhật 20 s nhưng phản ứng 10% vẫn đang chạy; các cửa sổ thay đổi theo extent |
| update(0)/timeScale=0 vẫn mount Atom hoặc dùng timeScale fallback 1 | Không update/mount với thời gian dừng/sai; thời gian nội bộ Atom dùng cùng scaledDt | Kiểm thử zero/NaN/Infinity/âm, timeScale 0 và 2 |
| Recipe mặc định coi 98 °C là sôi, sinh hơi trắng từ 48 °C, suy luận khí nặng từ chữ brown/yellow trong màu | Dùng cờ pha cùng dòng hơi hữu hạn; sương phụ thuộc trộn khí ẩm; khí lấy danh tính trong kho chất và bảng thuộc tính | Kiểm thử 48/75/98/100/110 °C không có dòng hơi; sôi dưới 98 °C; bay hơi chưa sôi; H₂ nâu giả không thành khói; NO₂ thực được nhận diện kể cả trong khí mang trong suốt |
| Plume khí có thể thoát qua bình kín | Chặn plume ngoài bình kín; không chặn bọt bên trong do phản ứng | Kiểm thử recipe NO₂ kín không có plume; guard tương ứng trong Director |

Các thay đổi này bảo vệ trạng thái engine, không thay thế mô hình truyền nhiệt/khối, động học hay quang phổ bằng lời khẳng định chính xác tuyệt đối. Tỷ phần khí phân tán, công suất phản ứng tức thời và rate từng species chưa có trường đo định lượng tại tầng view; chưa suy ra từ tốc độ hạt.

## Hạng mục còn mở cho các vòng tiếp theo

| Phạm vi phải kiểm chứng | Bằng chứng hiện tại / việc cần làm |
|---|---|
| Toàn bộ động học và nhiệt phản ứng | Rà `science/reviewCatalog.ts`, hằng số cân bằng/hoạt độ, nhiệt pha loãng và các family có ghi model_caveat; so sánh bộ tham chiếu theo từng phản ứng, không chỉ bảo toàn khối lượng |
| Tính nhất quán thời gian của tất cả hệ | `ReactionSimulationEngine.update` còn discard bước trễ; BoilingSystem và một số controller còn xác suất theo update; cần seed và so sánh 30/60/120 Hz cùng lượng thời gian được chấp nhận |
| Debug và API can thiệp trực tiếp | `SimulationDebugPanel` còn đặt isBoiling theo 98 °C. Cần tách thao tác chuẩn bị trạng thái thử khỏi kết luận vật lý, không để ngưỡng demo trở thành trạng thái thật |
| Vòng đời cùng program chạy lại | Kiểm tra session ProgramPlayer khi kinetics mới dùng lại cùng program ID, cũng như chuỗi thêm liều khi controller cũ còn sống |
| Nguồn khí dưới điểm sôi | Bọt thoát khí hòa tan cần kho khí hữu hạn và độ hòa tan; không chỉ một stage theo nhiệt độ |
| Hình học và lớp hiển thị cũ | `VesselFoamAndSteam.tsx` còn logic ngưỡng nhiệt cũ và cần kiểm tra khả năng gọi lại; rà shader/renderer khi nghiêng, vai bình, vùng tiếp xúc và scale đơn vị |
| Nước, kính, giọt và màng | Hệ số truyền khối, nhiệt độ thành, drainage, pinning và hình ảnh giọt hiện còn xấp xỉ; cần dữ liệu và kiểm chứng điều kiện biên theo từng loại bình |
| Đo đạc/dụng cụ và vận chuyển chất | Bổ sung tình huống kết hợp pipet/buret/lọc/đun/ngưng tụ/tràn, tính toàn hệ gồm wall/in-flight/spill/gas và nhiệt xuất/nhập |
| Kiểm chứng WebGL thực tế | Chưa có ảnh/quan sát trình duyệt đã xác nhận cho toàn hệ. Lần khởi chạy Chrome trước bị automatic approval review chặn `blocked by policy`; không lách chặn hoặc coi unit test thay thế ảnh |

## Nguồn đối chiếu nhiệt động

- [IAPWS — water and steam FAQ](https://iapws.org/faqs/faq1): quan hệ bão hòa và áp suất; không có ngưỡng 98 °C chung cho mọi áp suất.
- [NIST WebBook — water Antoine fits](https://webbook.nist.gov/cgi/cbook.cgi?ID=C7732185&Mask=4&Type=ANTOINE): tương quan áp suất hơi và miền nhiệt độ của các hệ số.

Các nguồn này không xác nhận hệ số truyền khối, tốc độ hạt hoặc tham số renderer trong dự án. Mọi hạng mục còn mở cần bằng chứng tương ứng trước khi đánh dấu mục tiêu toàn hệ hoàn tất.

## Kiểm tra trên code cuối vòng

- `npm test -- --maxWorkers=2`: **121 file, 1339/1339 test đạt**, trong đó 9 test mới kiểm tra ranh giới VFX/engine và điều kiện phát hiệu ứng. Cập nhật kiểm thử lifecycle cũ để không còn yêu cầu Atom tự tạo nhiệt/khí/kết tủa.
- `npm run lint`: đạt (`tsc --noEmit`).
- `npm run build`: đạt; còn cảnh báo bundle trên 500 kB.
- `git diff --check` cho các file vừa thay đổi không có lỗi whitespace; có cảnh báo quy đổi LF/CRLF của Git.
- Kiểm tra bổ sung: condenser thu hết hơi ra ngoài chỉ làm mất plume ngoài, không được làm mất trạng thái sôi bên trong bình nguồn.
- Chưa kiểm chứng trực quan WebGL trong vòng này; mục tiêu toàn hệ vẫn **đang thực hiện**, không đánh dấu hoàn tất.

## Vòng tiếp: clock, bọt, debug và dao động mặt thoáng

Vòng trước có thay đổi code và kiểm chứng, được phân loại có tiến triển. Vòng này đã đọc lại code hiện tại trước khi sửa:

- `ReactionSimulationEngine` trước đây chỉ chạy 5 bước 1/60 s/frame rồi xóa phần dư, đồng thời clamp lại delta đã nhân timescale. Hiện engine giữ toàn bộ thời gian đã chấp nhận, có bộ đếm accepted/integrated/pending và giới hạn 240 bước công việc/lần. Các lệnh pause/zero/invalid không giải phóng backlog. Runtime mới không được dùng thời gian tích lũy từ trước lúc nó bắt đầu. Context nhận thời gian mô phỏng đã scale đúng một lần.
- `core/clock.ts` trước đây cũng xóa backlog. Đã sửa tương tự và cung cấp `acceptedFrameSeconds`/`simulationFrameDt`: khung hình thực được chấp nhận tối đa 0.1 s trước khi nhân timescale. Engine/store, Director, renderer vật lý, shader nước, stream, sương thành và hoạt ảnh cấp chất chính dùng cùng quy tắc. Khoảng tab bị treo quá giới hạn này không được tuyên bố là thời gian vật lý đã mô phỏng. API tốc độ ứng dụng hỗ trợ 0.1×–8×, từ chối NaN/Infinity/âm/zero và ngoài miền; pause dùng cờ riêng.
- `BoilingSystem` có RNG độc lập theo seed + ID bình và substep 1/120 s. Ở 30/60/120 FPS với cùng đầu vào/seed, danh sách hạt và sự kiện gợn giống nhau. Chỉ có nguồn hơi sôi thực mới tạo bọt hơi; tốc độ packet hiển thị có giới hạn theo g/s. Các stage gần sôi không tự tạo bọt từ kho khí chưa tồn tại. Bọt phản ứng được đánh dấu riêng để không bị coi là hơi nước ngưng tụ.
- Đã bỏ luật nở bán kính tuyến tính tới 45–85% trong cột nước vài cm. Khí packet hiện dùng xấp xỉ đẳng nhiệt `P*r³` theo áp suất khí quyển + `rho*g*depth`, với độ sâu đổi từ scene sang mét. Khi nhập bọt, cộng proxy `P*r³` thay vì cắt cụt bán kính tại ngưỡng cũ. Đã đổi đường kính/vận tốc sang SI trước khi tính Eötvös/Weber, và sửa bán kính dùng cho âm Minnaert theo scale mét thật. Glyph vẫn có thể bị thu nhỏ để không xuyên kính; proxy khí không bị trừ theo glyph.
- Bọt vỡ trước đây gửi `surface:ripple` không ID, có thể làm bình khác gợn theo; vị trí burst cũng là local nhưng bị đọc như world. Hiện manager truyền ID và vị trí bình, sự kiện gợn có ID, burst được tịnh tiến sang world. Hệ không có ID không phát sự kiện gợn toàn cục.
- Đã bỏ việc particle burst bất kỳ gây flash ngẫu nhiên hoặc rung camera. Nước vỡ bọt không phải nguồn phát sáng/nổ; flash/rung cần sự kiện nổ hoặc nguồn sáng chuyên biệt.
- Debug panel dùng cùng `runBasicPhysicalScenario` với VFX Studio; không còn ép nhiệt/hasGas/isBoiling/thể tích/mass cặn bằng slider. Gia nhiệt bằng W, thay mẫu được ghi rõ là thao tác chuẩn bị mẫu định lượng. Khối lượng cặn chỉ đọc từ engine. FPS lấy từ telemetry của renderer, không dùng RAF riêng hoặc mặc định 60.
- Session ProgramPlayer và controller được phân biệt bằng ID lần phản ứng, không chỉ program ID. Lần chạy mới của cùng chương trình dọn Atom cũ. Controller đang gắn chemistry không được tự kết thúc sớm hoặc báo nhiệt độ theo đường preset tương lai.
- Slosh dùng nghiệm giải tích bước lực không đổi của dao động tắt dần thay cho Euler không ổn định ở dt lớn. Smoothing màu/độ đục/mixing không còn hệ số cố định theo mỗi frame; dt=0 giữ nguyên chuyển động. Giới hạn nghiêng và hệ số lực vẫn là mô hình mặt thoáng rút gọn.

### Giới hạn còn lại sau vòng này

1. Cần tiếp tục kiểm tra clock của hệ bài học, các renderer hạt phụ còn dùng dt/frame riêng, tween/trail theo wall clock và input cơ học. Chưa khẳng định toàn bộ hệ có đáp ứng giống nhau ở mọi FPS/timescale.
2. Hệ bay hơi còn cần kiểm tra quỹ đạo/seed/substep riêng. Kiểm thử bọt giống nhau không chứng minh plume giống nhau.
3. Chưa có kho khí hòa tan và truyền nhiệt vào từng bọt hơi. Luật đẳng nhiệt hydrostatic không phải Rayleigh–Plesset và chưa có Laplace pressure, độ sạch mặt phân cách, pha thay đổi trong lúc bọt nổi hoặc drag/terminal rise được hiệu chuẩn.
4. Cần kiểm tra trạng thái shader khi thay mẫu trong lúc pause trên cùng ID; reset controller không tự chứng minh tất cả uniform/camera/audio đã reset đúng.
5. Vòng sau đã bỏ nhánh tự nổ/vỡ bình từ ngưỡng Na >0.4 g trong controller và store (xem bên dưới). Tiêu chí phá hủy vật lý thực vẫn chưa được mô hình hóa/xác thực.
6. Các mục nhiệt hóa học, cân bằng, hoạt độ, dụng cụ và kiểm chứng WebGL trong bảng phạm vi ban đầu vẫn mở.

Tham khảo: [OpenStax — pressure with fluid depth](https://openstax.org/books/university-physics-volume-1/pages/14-1-fluids-density-and-pressure) hỗ trợ `P=P0+rho*g*h`; phép tính thể tích khí đang dùng giả định khí lý tưởng đẳng nhiệt. Nguồn này không xác nhận luật vận tốc nổi, glyph, tốc độ sinh packet hoặc hệ số biến dạng trong renderer.

### Kết quả kiểm chứng vòng clock

- `npm test -- --maxWorkers=2`: **122 file, 1352/1352 test đạt**. Có 13 test mới trong `tests/simulation_clock_consistency.test.ts`; test legacy sôi được sửa để cần dòng hơi thực thay vì chỉ có nhiệt độ cao.
- So sánh controller và bọt tại 30/60/120 FPS, 1×/4×/8×; kiểm tra quy tắc frame chính và SimClock thêm tại 10 FPS. Kiểm tra backlog, zero/invalid time, runtime mới, cùng chương trình chạy lại, scoped ripple/world burst, giữ proxy khí khi nhập bọt và dao động tắt dần với bước lớn.
- `npm run lint` và `npm run build`: đạt; Vite còn cảnh báo bundle lớn hơn 500 kB.
- Chưa có xác nhận hình ảnh WebGL/GPU. Các kết quả trên chứng minh các bất biến được test, không chứng minh mọi hệ vật lý/hóa học đã chân thực hoàn toàn. Mục tiêu vẫn đang thực hiện.

## Vòng tiếp: bỏ ngưỡng nổ Na và hạch toán cháy H₂

- Bỏ hai đường ép vỡ bình theo mẩu Na >0.4 g; bỏ pop cuối phản ứng và các nhãn UI suy ra an toàn/nổ từ liều lượng.
- Thêm biên ngọn lửa H₂ ngoài miệng bình: chỉ cháy khí mới thoát, giới hạn oxy hữu hạn, cần nguồn mồi thực đang có nhiên liệu. Không mồi xuyên đáy/thành kính, không đốt lại khí cũ. Môi trường riêng từng bình và pause có hiệu lực.
- Hạch toán H₂/O₂/H₂O(g) và enthalpy 241826 J/mol; nhiệt xuất ra phòng trong closure ngọn lửa ngoài bình. Tách khí qua biên nguồn và khí sau ngọn lửa để không đếm đôi. API inspect trả sổ chi tiết theo ID bình.
- Renderer đọc ledger, đặt lửa ở miệng và dùng hình ảnh xanh nhạt/ánh sáng yếu, bỏ phóng đại theo ngưỡng khối lượng.
- Hợp đồng hàm, nguồn NIST/DOE/Nature Chemistry và các giới hạn được ghi trong [sodium-water-ignition-and-failure.vi.md](./sodium-water-ignition-and-failure.vi.md). Nghiên cứu Na/K không được dùng làm ngưỡng nổ Na thuần hoặc vỡ kính.
- Toàn bộ suite: **123 file, 1366/1366 test đạt**; 14 test biên cháy H₂ mới. Test biên mới được chạy lại sau bổ sung kiểm tra nhiều bước, override oxy và nguồn cường độ zero: đạt. Lint/build đạt; Vite vẫn có cảnh báo chunk >500 kB.
- Chưa giải nồng độ khí/hỗn hợp cháy, flashback, đánh lửa tự phát, oxy hóa Na, Coulomb fragmentation, ứng suất kính, phản hồi nhiệt từ lửa vào mẫu hoặc plume khi nghiêng rót. Chưa kiểm chứng hình ảnh WebGL; không coi test là bằng chứng toàn hệ đã chuẩn thực tế. Mục tiêu rộng vẫn đang thực hiện.

## Vòng tiếp: lịch nguồn hơi, vận chuyển sương và opacity

Vòng Na–H₂ trước có thay đổi code, tài liệu và test nên được phân loại có tiến triển. Vòng này xác nhận trên đường hiển thị chính các lỗi RNG/frame, gió sai đơn vị, fallback nguồn từ nhiệt độ, nợ packet khi đầy pool, fade bằng thu nhỏ glyph và cắt đám sương ngay khi nguồn dừng.

- `EvaporationSystem` nhận rate g/s hữu hạn từ engine, queue lịch nguồn bất biến theo thời gian, tích phân theo mốc 1/120 s, giữ backlog và chặn 240 mốc/lần; dt=0 không drain. PRNG seed riêng từng bình, reset đầy đủ. Không tự sinh nguồn hoặc trừ thêm nước.
- Gió m/s đổi sang scene/s; bỏ tích lũy gió đứng như gia tốc. Hết nguồn thì packet đã thoát vẫn trôi/tan; pool đầy không tạo burst bù.
- Mist material dùng opacity từng instance, tách fade khỏi kích thước; Director giữ phần đám sương còn bay. Pause vẫn phản chiếu snapshot reset lên mesh, không chạy vật lý.
- Đường bão hòa dùng IAPWS SR1-86(1992) thay fit ghép/clamp 100 °C, kiểm tra điểm tham chiếu tới 120 °C. Quy ước điểm sôi tròn 100 °C của engine chưa được hợp nhất với đường bão hòa mới.
- Debug/Gallery phân biệt bọt hiển thị với trạng thái sôi và thông lượng hơi ngoài với bay hơi tổng, dùng g/phút. Debug bỏ độ nhớt cố định và chuyển cm đúng scale scene.
- Toàn suite: **124 file, 1380/1380 test đạt**, gồm 14 test mới. Lint (`tsc --noEmit`) và build đạt trên thay đổi cuối; còn cảnh báo Vite chunk >500 kB.
- Chi tiết hàm, giả định, nguồn và giới hạn trong [water-mist-transport.vi.md](./water-mist-transport.vi.md). Cần tiếp tục kiểm tra renderer cũ, nguồn H₂O sinh từ chemistry, giọt sương trên kính, droplet distribution/heat/phase trong plume và hình ảnh WebGL. Mục tiêu toàn hệ chưa đạt.

## Vòng tiếp: giọt nước hữu hạn trên kính

Vòng trước có thay đổi code và 14 test transport hơi mới, được phân loại có tiến triển. Vòng này đọc lại renderer/ledger và xác nhận giọt cũ quay vòng bằng modulo, cao độ bị remap theo mực nước, pháp tuyến vai bình sai và drainage theo 15 s không liên hệ chuyển động trên hình.

- Chuyển mass/vị trí giọt vào `WallCondensationState`, bỏ animation modulo trong renderer và closure drainage 15 s. Chỉ nguồn ngưng tụ mới tạo lại bead trống; giọt trượt/nhập/chạm biên thực mới chuyển lượng nước qua ledger.
- Diện tích và normal dùng mặt lathe thật, renderer dùng chỏm cầu theo volume. Tính sức căng theo IAPWS; mobility dùng closure lực giữ/hysteresis có nêu rõ các giả định chưa hiệu chuẩn.
- Giọt trong bị nước ngập nhập lại mẫu trước khi xét drying; mực tiếp xúc có solid/ice displacement, lượng trả về bị giới hạn theo sức chứa. Bình kín không xuất nước thành trong ra khí ngoài. Giọt ngoài vẫn có thể bay hơi khi mẫu đã khô.
- Kiểm tra conservation và lịch chuyển động ở 30/60/120 Hz, seam/coalescence, không recycle sau drain, input bất biến, sink cạnh tranh, pause và isolation. Xem [wall-beads-and-wetting.vi.md](./wall-beads-and-wetting.vi.md) cho hợp đồng hàm và nguồn.
- Suite cuối: **125 file, 1403/1403 test đạt**, gồm 23 test bead/geometry mới. `npm run lint` và `npm run build` đạt trên code cuối; Vite còn cảnh báo chunk >500 kB. Test ledger giữ đủ 10 phút vật lý, timeout riêng 15 s để bao gồm coalescence trong lượt test chạy song song.
- Chưa hiệu chuẩn wetting/drag, chưa giải nghiêng/rót/đổi hướng trọng lực, màng-rivulet và gradient nhiệt; chưa có xác nhận hình ảnh WebGL. Mục tiêu toàn hệ vẫn đang thực hiện.

## Vòng tiếp: nguồn hơi từ chemistry và reaction heat

Vòng bead trước có code/test mới, được phân loại có tiến triển. Xác nhận store chốt condenser/outflow trước kinetics, làm hơi do reaction heat vào budget quá muộn, còn H₂O(g) của phương trình bỏ qua wall/condenser. Replay không giữ return khi return lớn hơn evaporation.

- Gom nguồn cuối bước, chạy mỗi wall một lần rồi chia phần còn lại cho condenser/exhaust. Tách source-boundary `escapedGas_g` và sink thực `waterVaporReleased_g`; receipt giúp replay có dấu giữ nước nhận vào.
- Partial pressure theo nguồn khí/carrier hạn chế capture/mist khi H₂O pha loãng. Drying phòng không phải jet hơi tinh khiết. Mẫu rắn khô có nguồn thật được phép có plume.
- 17 test routing mới kiểm tra sink, chemical/reaction-heat, partial pressure, signed replay, thứ tự bình, từng-frame mass balance và pause. Xem [chemical-water-vapor-routing.vi.md](./chemical-water-vapor-routing.vi.md).
- Hai handle validation cuối vòng trước không còn tồn tại khi môi trường tiếp tục; đã đọc code và chạy validation mới, không suy kết quả từ handle mất.

## Vòng tiếp: miền nhiệt độ của kinetics

- Nhánh `heat_activated` trước đây tăng progress theo duration dù mẫu nguội dưới `minTemp_c`. Thêm `advanceHeatActivatedProgress`: kiểm tra miền mỗi bước và giới hạn bước thu nhiệt bằng thăm dò ledger nhiệt thật; không commit probe.
- `actualProgressRate_s` bằng zero khi chờ nhiệt; không phát nguồn khí/Atom mới. Gia nhiệt lại tiếp tục phiên dở; hơi trong inventory/routing vẫn được vẽ độc lập.
- 10 test mới: miền nhiệt, stoichiometry, heat-limited progress, dt/duration hỏng, input bất biến, source gate, cooling/resume/pause. Giới hạn duration/Arrhenius và operator splitting nằm trong [heat-activated-progress.vi.md](./heat-activated-progress.vi.md).
- Suite cuối: **127 file, 1430/1430 test đạt**. `npm run lint` và `npm run build` đạt; Vite còn cảnh báo chunk >500 kB. Mục tiêu toàn hệ vẫn mở: chưa xác nhận kinetics từng phản ứng, mọi nguồn khí và hình ảnh WebGL đều chuẩn thực tế.

## Vòng tiếp: thông lượng khí và plume màu

Vòng trước có sửa routing/kinetics và kiểm chứng, được phân loại có tiến triển. Đọc lại Director/GasPlume xác nhận nguồn glyph bị nhân 45 hoặc fallback recipe, plume không pause/timescale, gas từ mẫu khô bị loại, alpha không nối vào material và Studio báo mL/s/số hạt bằng các hệ số tùy ý.

- Thêm `measureGasFlux`: nguồn ròng và exhaust theo từng loài mol/s từ inventory + counter, phân biệt vent/foam release và loại H₂O để không lặp routing nước. Store ghi zero khi hết nguồn; xung cuối vẫn có dữ liệu dù kinetics đã nghỉ.
- Director/bọt/plume dùng flux thật, không dùng recipe/color/flag làm nguồn. Runtime ghép chemistry và Studio đọc telemetry có cùng biên; PV=nRT cho mL/s, đếm glyph từ manager.
- `GasPlumeSystem` dùng seed, lịch nguồn, mốc 1/120 s, backlog/pause và chuyển gió đúng đơn vị. Sắc khí lấy theo loài; density contrast dùng M/T. Renderer đọc nguồn sống, vẽ alpha riêng và giữ đám khí tan sau khi nguồn tắt. Pool bọt/plume không lưu burst debt.
- **128 file, 1447/1447 test đạt**, gồm 17 test mới. Lint/build đạt; Vite còn cảnh báo chunk lớn. Chi tiết closure, nguồn và giới hạn trong [gas-flux-and-plume.vi.md](./gas-flux-and-plume.vi.md).
- Chưa hiệu chuẩn optical absorption/mixing/drag, chưa giải đầy đủ gas holdup/dissolution/aerosol, tương tác plume-kính và mọi controller/âm thanh phụ. Chưa kiểm chứng hình ảnh WebGL. Mục tiêu toàn hệ chưa đạt.

## Vòng tiếp: vận tốc bọt theo SI và lực cản

Vòng flux/plume trước có code/test mới, phân loại có tiến triển. Đọc code xác nhận đường bọt dùng gia tốc preset m/s² như scene/s², chưa có terminal drag, coupling dọc không nhất quán và offset wobble dùng sai như vận tốc.

- Thêm `bubbleRise.ts`: CdRe cho mobile/immobile sphere, terminal-force balance, spherical added mass 1/2 và đáp ứng/dịch chuyển giải tích frozen-drag. Live bọt đổi scene↔SI một lần, viscosity mPa·s↔Pa·s đúng ở ranh giới.
- Lực dùng bán kính từ `P*r³`, độc lập glyph bị containment thu nhỏ; lưu physical radius/terminal speed. Eo/We dùng SI và relative slip, sức căng nước theo nhiệt độ. Wobble là displacement nhỏ, có giới hạn số học và được ghi rõ chưa hiệu chuẩn.
- `effects.forVessel(id).setBubbleInterfaceMobility(...)` chọn giả thiết theo bình, không thay mẫu hoặc nguồn. Mặc định immobile không phải kết luận về độ sạch hóa học.
- **129 file, 1461/1461 test đạt**, 14 test mới; lint/build đạt, còn cảnh báo Vite chunk lớn. Test seeded bọt 30/60/120 Hz và geometry hiện có đều đạt.
- Nguồn, hợp đồng và miền chưa giải trong [bubble-rise-and-drag.vi.md](./bubble-rise-and-drag.vi.md). Drag bọt biến dạng/swarm/vách, mixed vapor–noncondensable coalescence/collapse, nucleation, âm thanh và hình ảnh WebGL còn mở. Mục tiêu toàn hệ chưa hoàn tất.

## Vòng tiếp: bọt hỗn hợp, Laplace và ngưng tụ

Vòng drag trước có code/test mới, phân loại có tiến triển. Xác nhận coalescence giữ một nhãn rồi xẹp ngẫu nhiên có thể xóa cả khí không ngưng, neighbour được gộp bỏ qua update riêng và accumulator dùng params mới nhất làm mất pulse ngắn.

- Tách vapor/noncondensable `K=P_i*r³`, giữ K/T khi đồng bộ nhiệt độ và gộp. Trình tự phase→motion→merge→surface cập nhật tất cả partner ở cùng mốc, không bỏ qua heat/motion của neighbour.
- Cân bằng cơ học gồm hydrostatic và single-interface Laplace 2sigma/R; birth/merged radius nhất quán. Bỏ random collapse 5/s, thêm closure condensation dẫn nhiệt có giới hạn partial-pressure và residual gas không ngưng. Đã phân biệt packet diagnostics với thermal/water ledger thật để không đếm đôi.
- Queue giữ lịch nguồn/temperature/world position, mốc 1/120 s với 240 mốc/lần và backlog; không mất pulse substep hoặc drain khi dt=0.
- **130 file, 1479/1479 test đạt**, gồm 18 test mới và test Laplace/proxy cũ cập nhật theo invariant mới. Lint/build đạt; Vite còn cảnh báo chunk lớn. Hợp đồng và miền chưa giải ở [mixed-bubble-phase.vi.md](./mixed-bubble-phase.vi.md).
- Nu=2/k/L, thermal equilibration tức thời, phase operator splitting vẫn là closure; chưa hiệu chuẩn thí nghiệm hoặc giải gas holdup/latent coupling toàn bình, surfactant/vách/màng, dissolved gas và hình ảnh WebGL. Mục tiêu toàn hệ vẫn mở.

## Vòng tiếp: âm bọt theo kích thước và môi trường

Vòng bọt hỗn hợp trước có thay đổi code và 18 test mới, phân loại có tiến triển. Đọc hiện trạng xác nhận audio dùng wall clock, không reset throttle, lấy radius sau containment rồi clamp cả kích thước/cao độ; hơi nước nhận tone khí không ngưng.

- Thêm `bubbleAcoustics.ts`: tần số tuyến tính bọt khí cầu có sức căng một interface, P/rho/kappa rõ đơn vị và giới hạn. Synth chung bỏ clamp/chirp không có diễn biến bán kính; loại tần số ngoài dải phát/Nyquist, bảo vệ click phụ.
- Live `BoilingSystem` truyền mechanical radius trước containment và môi trường bình; throttle theo integrated simulation time, reset đúng. Không gán air-like resonance cho packet hơi/hỗn hợp chưa giải âm chuyển pha. kappa runtime vẫn là giả thiết 1,4, chưa suy ra từng loài khí.
- **131 file, 1487/1487 test đạt**, gồm 8 test mới về scaling/đơn vị, oscillator, band/Nyquist, môi trường/reset và seeded event sequence 30/60/120 Hz bất chấp wall clock. Lint/build đạt; còn cảnh báo Vite chunk lớn.
- Chi tiết và nguồn ở [bubble-acoustics.vi.md](./bubble-acoustics.vi.md). Envelope/click/volume, free-surface film, damping/SPL, legacy/preview audio, catch-up audio transport và hình ảnh WebGL vẫn chưa xác nhận đầy đủ. Toàn mục tiêu còn mở.

## Vòng tiếp: vũng hữu hạn, Young–Laplace và điểm lắng đọng

Vòng âm bọt trước thay code và bổ sung 8 test, phân loại có tiến triển. Đọc worktree xác nhận bán kính vũng preset lẫn đơn vị, dry mass tạo footprint ướt, mặt phẳng/giọt vệ tinh không có thể tích và renderer làm vũng chạy theo bình/nở theo wall clock.

- Thêm solver Young–Laplace hydrostatic tròn xoay, RK4 adaptive và shooting theo thể tích/góc tiếp xúc. Miền 5–90°, mặc định nước/60° là giả thiết bề mặt, chưa hiệu chuẩn tabletop.
- Mesh tròn xoay kín, đúng m↔scene và cùng thể tích inventory; bỏ satellites/lobes chưa phân bổ lượng chất, bỏ scale nở theo đồng hồ máy. Đây là hình cân bằng, dynamic spreading vẫn mở. Bán kính dùng cùng nghiệm, không clamp hoặc lấy dry mass làm thể tích nước.
- Snapshot điểm chân thành ngoài khi ghi overflow trong store; renderer dùng điểm lưu sẵn, không kéo vũng theo bình khi move/rotate/remount.
- **132 file, 1500/1500 test đạt**, gồm 13 ca mới; kiểm tra thể tích mesh thật dưới 0,4%, thể tích solver dưới 2e-7 tương đối trong ma trận, giới hạn nhỏ/lớn, residual Young–Laplace, đơn vị và invariant tọa độ/contents. Lint/build đạt; cảnh báo Vite chunk lớn còn tồn tại.
- [sessile-puddle.vi.md](./sessile-puddle.vi.md) ghi rõ source, hiệu năng cache miss và các khoảng trống: spill cũ còn radius preset trước merge, wetting/vật tính từng mẫu, dynamic spreading/runoff/vật cản, ledger vận chuyển ngoài thành và WebGL. Toàn mục tiêu chưa đạt.

## Vòng tiếp: footprint lau, migration và receipt vật chất

Vòng vũng trước có code và 13 test mới, phân loại có tiến triển. Kiểm tra hiện trạng xác nhận save/history radius cũ lệch mesh, khăn chạm cạnh xóa cả vũng, merge bỏ component volume, microreceipt dưới 0,02 mL bị bỏ và VFX emit trước commit/validation.

- Tích phân phần thể tích dưới collector tròn theo profile cao độ thật, không lấy diện tích giao làm thể tích. Patch chia homogeneous sample và chuyển riêng phần thu vào waste; phần còn lại giữ đủ mass/moles/component volume. Đây là collector lý tưởng full-depth, chưa giải sponge kinetics hay selective removal.
- Normalize footprint khi load physical save và undo/redo, không đổi tọa độ/lượng chất/id. Merge cộng volume và initial-extensive metadata, phân biệt component state. Giữ microreceipt dương; `addSpill` phát sự kiện sau commit, không phát từ receipt hỏng.
- **133 file, 1513/1513 test đạt**, 13 ca mới; lint/build đạt, còn cảnh báo Vite chunk lớn. [spill-cleanup.vi.md](./spill-cleanup.vi.md) nêu công thức, assumptions và giới hạn.
- Chưa giải đầy đủ dry grain/shard spatial pickup, khả năng hút của khăn, relaxation sau lau, vật tính đa pha và hiệu năng/WebGL trên thiết bị thật. Dynamic spill transport/runoff và các mục toàn hệ vẫn mở. Không đánh dấu hoàn tất.

## Vòng tiếp: giọt bắn đọc dữ liệu, không nhân đôi chất

Vòng cleanup trước có code/test mới, phân loại có tiến triển. Audit proximity merge tìm ra vấn đề lớn hơn: renderer AcidSplatter tạo spill ngẫu nhiên theo glyph/quality dù source đã ghi inventory; explosion còn bị dịch thành acid H₂SO₄ và nhận nhiều lượt burst. Đã ưu tiên sửa lỗi này, proximity merge vẫn mở.

- Xóa ghi vật chất từ renderer, dùng một kênh liquid presentation; explosion không tự chứng minh ejected liquid. Source shatter lấy actual condensed composition và không emit giọt nước cho mẫu khô. Bỏ sodium sizzle suy ra từ nhãn acid.
- Flight giải tích đổi SI gravity sang scene, cắt đúng impact time/point; dùng pause/timeScale của app và tabletop registry. Seeded nguồn, đồng hồ audio mô phỏng; bounce chỉ tiến phần dt sau impact, tiêu tán/rest và dọn glyph hết lifetime đúng frame. Bỏ drag chưa có đơn vị; cản khí thật vẫn chưa giải.
- **134 file, 1526/1526 test đạt**, 13 test mới có harness chạy callback renderer thực để kiểm tra inventory bất biến qua landing/quality và wet/dry source. Lint/build xác nhận cùng vòng; cảnh báo chunk lớn còn tồn tại.
- [splatter-material-boundary.vi.md](./splatter-material-boundary.vi.md) ghi rõ chi tiết và giới hạn: glyph chưa phải parcel định lượng, chưa giải impact/air drag/transport reservoir/atomic shatter/đa pha, coalescence và WebGL. Toàn mục tiêu chưa đạt.

## Vòng tiếp: atomic shatter và wall-water receipt

Vòng splatter trước có code và 13 test mới, phân loại có tiến triển. Audit xác nhận shatter commit spill trước source depletion, phát VFX trước cờ vỡ và bỏ qua held wall water. Subscriber/reentrant listener có thể quan sát lượng chất bị đếm đôi hoặc gọi giải phóng lại.

- Source depletion, gas vent, wall release, spill receipt và xóa local kinetics commit cùng phiên bản. Publish/save/lifecycle reset sau commit; kính vỡ không emit overflow trên thành nguyên vẹn. Receipt bị từ chối không xóa nguồn.
- Wall liquid gộp vào H₂O(l) hữu hạn theo quy ước 1 g≈1 mL hiện có, clear beads/held mass và ghi inner/outer release history riêng; không re-release sau thay thân. H₂O headspace vent cập nhật net external sink, không gán duration/rate tùy ý; inner wall liquid không bị tính thành vapor.
- Ngắt virtual heat, stale emission telemetry và sealed-pressure display; tăng specimen revision và dừng/reset runtime/program/manager đúng bình.
- **135 file, 1539/1539 test đạt**, 13 test mới gồm subscriber/event reentry, đồng bộ cleanup, save/load, wall-only/gas-only, phase ledger và lifecycle. Lint/build đạt; cảnh báo Vite chunk lớn còn tồn tại.
- [atomic-shatter.vi.md](./atomic-shatter.vi.md) ghi rõ còn thiếu fracture/vent dynamics, impulse plume, nhiệt/spill transport, coalescence/runoff và WebGL. Atomic ledger không xác nhận toàn bộ trigger phá kính hoặc mọi hiệu ứng đã đúng vật lý. Toàn mục tiêu vẫn mở.

## Vòng tiếp: contact component khi gộp vũng

Vòng atomic shatter trước có code và 13 test mới, phân loại có tiến triển. Đọc worktree xác nhận ngưỡng capture tối thiểu 0,35 scene, bỏ qua incoming radius, chỉ lấy neighbour đầu tiên và hút cả dry deposit từ xa.

- Thay bằng tiếp xúc tổng hai footprint từ thể tích; recompute legacy radius và cache derived radius theo object/volume. Thu connected contact component của hình học ban đầu theo key ổn định; record ngoài nhóm không bị đổi.
- Giữ dry/wet riêng, dry chỉ gộp tại điểm trùng; giữ family/layer khai báo khác nhau riêng, không cho unknown bridge bypass phase distinction. Không nhận là đã giải miscibility/compound drops.
- Cộng đầy đủ inventory metadata, giữ mass first moment ở XZ khi relaxation, suy lại aqueous concentration khi có cơ sở và xóa concentration cache không có phase-volume basis. Tâm/radius vẫn là closure cân bằng tức thời, không phải contact-line dynamics.
- **136 file, 1552/1552 test đạt**, 13 test mới; lint/build đạt, còn cảnh báo Vite chunk lớn. [spill-contact-merge.vi.md](./spill-contact-merge.vi.md) ghi nguồn JFM và miền chưa giải: bridge/relaxation/đa pha, tabletop chemistry, vật cản/runoff, performance và WebGL. Toàn mục tiêu vẫn mở.

## Vòng tiếp: mốc khí nền và free headspace khi đóng nút

Vòng contact merge trước có code và 13 test mới, phân loại có tiến triển. Kiểm tra xác nhận background pressure luôn tham chiếu 25°C, không giữ lượng khí nền khi thể tích đổi; floor 1 mL và hai đường đóng nút không cùng xử lý. Mở nút chỉ gán 1 atm thay vì local ambient/finite gas sink.

- Thêm captured headspace reference và legacy-25C có provenance. Lượng background cố định, áp suất lấy nRT/V cùng constant chuẩn, không double-count explicit gas lúc ambient closure. Free volume trừ toàn known solid material và internal coatings; gas foam không là free headspace.
- Thermal, ledger, replay và vapor routing dùng pressure patch chung; UI/API báo unavailable thay vì số giả cho zero headspace. Seal action/direct transition/stopper 3D cùng capture; mở nút vent species thực trong commit, cập nhật net H₂O sink và xóa reference. Inspect đúng ID thêm pressure/model/reference/free volume.
- **137 file, 1567/1567 test đạt**, 15 ca mới; lint/build đạt. Một full run đồng thời build gặp timeout test sương 15 s, ca riêng đạt; đã cache các phép tính wetting/temperature không đổi và xác nhận full suite tuần tự, không tăng timeout. Vite còn cảnh báo chunk lớn.
- [sealed-headspace.vi.md](./sealed-headspace.vi.md) ghi nguồn, miền ideal-gas/nominal capacity và giới hạn. **Ưu tiên audit tiếp: đổi seal trong kinetics run có cumulative gas replay theo boundary baseline**; pressure reference mới chưa chứng minh source/sink khí ở mọi transition đó. VLE/thermal lag, carrier chemistry, pressure-only network, fracture và WebGL vẫn mở. Toàn mục tiêu chưa đạt.

## Vòng tiếp: replay khí qua nhiều lần đóng–mở

Vòng headspace trước có code và 15 test mới, phân loại có tiến triển. Đọc ledger xác nhận gas product disposition vẫn theo baseline seal; native stage cũng chưa tách raw cumulative replay khỏi sink thực của current.

- Đối soát budget theo loài: raw retained + raw escaped kể từ baseline, trừ actual irreversible sink. Phần khí sinh sau đóng nút được giữ; mở nút không tạo lại các batch đã xả. Historical offsets, canonical identity, gas mass/moles và mẫu/nhiệt được giữ qua same-extent replay.
- Native material replay dùng baseline sink đúng hợp đồng. H₂O(g) đi qua gross/net water routing hiện hữu; foam tiếp tục đối soát cùng budget ở bước sau. Không đổi carrier gas hoặc dựng volume preset.
- Gas-reactant proposal không khả thi bị chặn; limiter và store không đẩy chemistry progress/finalization quá lượng phân tử còn khả dụng. Actual emission rate về zero khi không tiến; seek không tiêu thụ lại gas đã mất.
- **138 file, 1580/1580 test đạt**, 13 ca mới gồm live kinetics seal changes, many-cycle replay, water, native inert gas và gas-reactant exhaustion. Lint/build đạt, còn cảnh báo Vite chunk lớn. [gas-boundary-replay.vi.md](./gas-boundary-replay.vi.md) ghi công thức và nguồn stoichiometry/limiting reactants.
- Chưa giải finite gas residence/vent flow/diffusion/solubility, VLE, independent gas thermal state, mọi apparatus transfer/baseline rebase và WebGL. Toàn mục tiêu vẫn mở.

## Vòng tiếp: mảnh kính trong đường render đang chạy

Vòng replay trước có code và 13 test mới, phân loại có tiến triển. Audit xác nhận `TubingNetwork` chưa có caller trong app: test module chưa chứng minh truyền khí thực giữa bình. Chuyển sang lỗi runtime rõ ràng: shard pool dùng sai thang trọng lực, nhầm vessel origin với tabletop, bỏ qua pause/timeScale và ID burst trùng.

- Shard anchor dùng cùng scale SI và mặt bàn thật; giải từng đoạn bay/thời điểm va chạm, xử lý phần thời gian còn lại, góc quay dừng theo thời gian tiếp xúc. Hệ số bounce/friction vẫn là giả định trình diễn.
- Renderer đi theo đồng hồ mô phỏng; offset tâm bằng minY của vertex đã scale/rotate để lower-support glyph chạm mặt bàn. Ghi rõ anchor không là rigid-body centroid, không nhận là fracture mechanics.
- ID riêng từng burst/source; reject count/seed/position lỗi, cap 600 trước cấp phát. Giữ hình học seed tái lập và không tạo vessel mới.
- **139 file, 1587/1587 test đạt**, 7 ca mới gồm bất biến SI/energy anchor, nhiều FPS qua bounce tới nghỉ, malformed input/pool/identity và callback renderer với vertex/instance matrix thật. TypeScript/build đạt, Vite còn cảnh báo chunk lớn.
- [shard-transport.vi.md](./shard-transport.vi.md) ghi công thức và nguồn OpenStax. Chưa giải mass/energy kính, rigid-body contact, cạnh bàn/vật cản, spatial cleanup và lớp `VesselShatteredShards` tĩnh còn riêng khỏi pool; WebGL và toàn mục tiêu vẫn mở.

## Vòng tiếp: thống nhất vòng đời kính và thao tác dọn

Vòng quỹ đạo trước có code và 7 test mới, phân loại có tiến triển. Kiểm tra runtime xác nhận lớp shard tĩnh tạo mảnh lần hai cho 13 loại dụng cụ; lau một patch dung dịch lại global-clear pool kính, còn kính khô không có patch thì early return.

- Gỡ lớp mảnh tĩnh và 13 callsite; pool thế giới là đường render mảnh duy nhất. Source replace/move không kéo kính cũ. Click instance dùng mapping theo frame đã render, tránh chọn sai source khi pool đổi index; pool count và bounding volume theo trạng thái hiện tại.
- Sponge chỉ thu gom chất tràn vào chemical waste. Thao tác chổi/hót rác riêng ở inspector thu theo đúng source ID; bảng cleanup có thao tác toàn bàn rõ ràng. Chỉ lấy mảnh đã rơi, không lấy mảnh còn bay và không suy g kính từ số glyph.
- Thêm detached/validated pool snapshot vào physical save/history, chụp sau shatter burst và checkpoint sau settling. Undo/redo phục hồi pool; reset/preset xóa pool; bản cũ migrate từ shattered flag, bản đã dọn có explicit empty pool không được tái sinh mảnh.
- **140 file, 1598/1598 test đạt**, thêm 11 ca lifecycle/renderer, TypeScript/build đạt; Vite còn cảnh báo chunk lớn. [debris-lifecycle.vi.md](./debris-lifecycle.vi.md) ghi hợp đồng hàm và miền còn thiếu.
- Còn glass mass/energy ledger, rigid-body contact/fracture, quỹ đạo/footprint chổi, chemical contamination của kính, tabletop edges/obstacles và WebGL. Source-scoped/toàn bàn vẫn là thao tác trừu tượng được khai báo, chưa là chuyển động chổi vật lý. Toàn mục tiêu vẫn mở.

## Vòng tiếp: thống nhất biên bão hòa nước

Vòng lifecycle trước có code và 11 test mới, phân loại có tiến triển. Trở lại sôi/bay hơi/sương: nhiệt độ sôi dùng Antoine đã shift 100°C trong khi pressure/dew point/bubble interface dùng IAPWS; hai nhánh wall capture so mật độ tại hai nhiệt độ khác nhau gây lệch zero-flux so với dew point.

- Tách một saturation curve/inverse chung theo IAPWS SR1-86(1992), cache exact pressure có giới hạn, không shift root 1 atm và không âm thầm clamp pressure ngoài miền. Boiling, dew point và bubble interface dùng cùng curve; generated water nhận pressure tùy chọn, default vẫn 1 atm ở chemistry caller cũ.
- Closure film dùng chênh saturation/partial pressure ở cùng mean film temperature. Ambient evaporation, exterior condensation và cả hai inner-wall routes cùng chiều/zero flux; inventory/latent sinks hiện hữu vẫn hữu hạn. hm/film temperature là xấp xỉ, không nhận là CFD hoặc số đo thực nghiệm.
- Pressure riêng theo effectsEnvironment được dùng nhất quán trong helper và renderer nucleation. Boundary không có root: thermal không tạo phase transfer, inspect báo unavailable và reset stale bubble glyph; pressure hợp lệ trở lại xóa riêng limit đó.
- **141 file, 1609/1609 test đạt**, thêm 11 ca saturation/flux/live-vessel/renderer; TypeScript/build đạt, Vite còn cảnh báo chunk lớn. Full suite đầu 1608 test đạt; sau bổ sung pressure consistency ở renderer, đã chạy lại toàn bộ phiên bản cuối, không chỉ dựa trên kết quả cũ.
- [water-saturation-boundary.vi.md](./water-saturation-boundary.vi.md) ghi công thức, nguồn IAPWS/COMSOL, hợp đồng hàm và test. Chưa giải hoạt độ dung môi/colligative legacy coefficients, VLE nhiều dung môi, latent/Cp phụ thuộc T, thermal wall dynamics, pressure/seal ở mọi chemistry caller, finite gas transport/frost và WebGL. Toàn mục tiêu vẫn mở.

## Vòng tiếp: phase enthalpy và nhiệt hóa hơi theo nhiệt độ

Vòng saturation trước có code và 11 test mới, phân loại có tiến triển. Kiểm tra source xác nhận mọi phase-energy path vẫn dùng 2256 J/g cho cả evaporation/condensation nhiệt độ phòng. Condenser còn thiếu sensible cooling và không kiểm tra receiver nóng hơn interface.

- Đọc/render trực tiếp IAPWS SR1-86(1992), Eq. 1–4/6–7 và Table 1. Thêm saturated pressure derivative, liquid/vapor density, phase enthalpy và L(T) theo Clapeyron trong module pure-water. Check bảng triple/standard/critical độc lập, không hiệu chuẩn bằng chính output code.
- Boiling/generated water dùng L tại boiling point, ambient evaporation dùng L tại surface temperature; tích lũy phase-energy riêng để heat packet không bị chia theo một latent hằng. Wall capture/drying dùng L từng interface; bubble collapse dùng L tại vapor partial-pressure saturation temperature, giữ explicit coefficient override. Constant 2256 chỉ còn reference export, không có runtime phase-budget caller.
- Condenser dùng chênh vapor/liquid enthalpy, thêm desuperheating Cp_v xấp xỉ và liquid cooling; vẫn finite source ID/budget/capacity + ideal coolant sink. Receiver nóng hơn interface không thu nước. Inspect đúng ID thêm hai latent reference theo T, nullable ngoài miền, không tạo vessel.
- Root saturation tại critical pressure trả endpoint chính xác: tránh L dương rất nhỏ do bisection tạo flash lượng lớn giả ở criticality. Chưa dùng phase division khi L=0.
- **142 file, 1619/1619 test đạt**, thêm 10 ca phase-energy gồm live source/wall/condenser/outflow conservation. TypeScript/build đạt, Vite còn cảnh báo chunk lớn. [water-phase-energy.vi.md](./water-phase-energy.vi.md) ghi hàm/đơn vị/nguồn và các closure.
- L được freeze theo từng heat packet; bulk Cp vẫn hằng, wall vẫn resistance closure/local latent, chưa giải sensible enthalpy wall/film return toàn hệ, mixture dew point hoặc finite coolant UA/flow. Near-critical property correlation không chứng minh transport/Cp ở đó. Water activity/đa dung môi, finite gas transport, chemistry pressure/seal coverage, frost và WebGL còn mở. Toàn mục tiêu chưa đạt.

## Vòng tiếp: bay hơi hữu hạn và sensible enthalpy đi cùng hơi

Vòng phase-energy trước có code và 10 test mới, phân loại có tiến triển. Đo lại cùng 100 g nước/80°C/bay hơi 5 g cho thấy freeze C/L từng packet gây lệch T cuối gần 1°C giữa 1 và 100 packet; phép cộng latent/sensible cũ chưa chứng minh năng lượng của hệ mở khi nước mang nhiệt rời bình.

- Thêm pure solver `evaporativeCooling`: nhiệt dung giảm theo nước rời, L(T) biến đổi liên tục, tách biến theo mass, quadrature adaptive và root có bracket. Floor 0°C suy lượng thực có thể bay hơi, không clamp T sau khi lấy quá nhiều nước. Tách endpoint triple-point boundary để không thất bại tích phân khi mẫu lạnh tới gần 0°C.
- `applyThermalEnergy` dùng solver trong ambient phase sau sensible packet; giữ finite mass/moles/solute/volume. Boiling ghi thêm outgoing sensible tại plateau; fusion đi cùng ledger. Thêm `storedSensibleEnergyChange_J` và `vaporSensibleEnergy_J` để kiểm chứng stored + latent + carried + outside = net heat; giữ tên `sensibleEnergy_J` cũ với ngữ nghĩa được ghi rõ.
- T cuối của fixture trên khoảng 53.4624240046°C, latent 11703.2979813 J và carried sensible 1399.5052484 J, khớp integrator RK4 độc lập và ổn định khi chia 1/10/100 packet. Thêm 10 test về ODE, floor, analytic endpoint, finite source, solute, external heat, fusion, boiling/dryout và input lỗi; không chỉ kiểm tra lại công thức implementation.
- **143 file, 1629/1629 test đạt**; xác nhận lại 10 ca sau khi dùng chung Cp constant. TypeScript/build đạt, Vite còn cảnh báo chunk lớn. Sai lệch packet cũ được sửa bằng state/energy invariants, không tăng tolerance để giữ kết quả cũ.
- [finite-evaporative-cooling.vi.md](./finite-evaporative-cooling.vi.md) ghi nguồn MIT/IAPWS, derivation, tham số/hợp đồng và miền chưa giải. Bất biến chia packet chỉ áp cùng prescribed evaporation mass không thêm heat giữa packet; chưa chứng minh toàn mass-transfer/thermal splitting không phụ thuộc FPS. Cp bulk hằng, h_liquid≈Cp*T, wall/film return, finite coolant, water activity/đa dung môi, gas transport/frost/WebGL vẫn mở. Toàn mục tiêu chưa đạt.

## Vòng tiếp: nhiệt của nước ngưng tụ hồi lưu

Vòng finite evaporation trước có code và 10 test mới, phân loại có tiến triển. Đo lại helper return: 1 g nước ở 25°C vào 50 g nước ở 100°C giữ T_bulk cũ gây phantom heat 313.8 J. Return cũng chưa route flash khi bình rất nóng hoặc kiểm tra surface capacity sau chuyển pha.

- Receipt mang T_innerWall/explicit source T, không đoán bằng T_bulk khi thiếu dữ liệu. Clone/cộng đúng H2O rồi hiệu chỉnh sensible enthalpy qua thermal solver chung; không cấp latent heat lần hai. Cold return có thể subcool, warm return có thể melt ice, hot dry glass có thể flash; giữ một source/sink nước thật.
- Preview thermal/phase admission sau cùng exterior latent packet trước khi debit bead mass. Sức chứa dùng liquid surface/submerged displacement, không coi ice-only receiver là bình rỗng hoặc đổi dry solid volume thành liquid level. Bead giữ phần chưa nhận; unsupported source T/opaque liquid không mất inventory.
- Thêm cumulative returnedSensibleEnergy_J theo mốc Cp*T/0°C; delta evaporation do return vào shared wall/condenser/external vapor budget. Source flash không được phát lại ở frame sau; preserve source ID và không tạo vessel mới.
- **144 file, 1638/1638 test đạt**, thêm 9 ca sensible mixing/ice/admission/flash/live conservation/invalid input. TypeScript/build đạt, Vite còn cảnh báo chunk lớn. [condensate-return-enthalpy.vi.md](./condensate-return-enthalpy.vi.md) ghi nguồn MIT, hàm, reference và giới hạn.
- Wall vẫn algebraic resistance, chưa có inertia hay sensible balance khi nhiệt độ film lưu lại đổi; incoming-vapor cooling, film advection, finite coolant, mixture VLE, retained gas/frost/rim runoff và WebGL còn mở. Toàn mục tiêu chưa đạt.

## Vòng tiếp: sinh hàn có thermal storage và coolant throughput hữu hạn

Vòng condensate return trước có code và 9 test mới, phân loại có tiến triển. Audit xác nhận sinh hàn chỉ có boolean coolant; không dt/flow/UA, giữ T receiver không đổi, có thể thu mọi vapor budget bằng nguồn lạnh vô hạn. Dùng receiver T như một outlet temperature cố định cũng không đúng khi nước/glass đang nhận nhiệt.

- Thêm lumped glass/collected-water node với nhiệt dung tăng theo mass, jacket effective K từ finite coolant Cc/UA; giải analytic warming/cooling/phase/storage events. Cold glass có finite condensation ngay khi van tắt; hot glass cần nguội; tới saturation thì thu theo khả năng thải nhiệt, không theo elapsed reaction preset.
- Tích phân coolant heat trực tiếp bằng nghiệm stable, giữ signed heating/cooling và tiny-flow outlet bounds; không suy Q bằng hiệu hai năng lượng lớn rồi khuếch đại thành T_out vô lý. Captured vapor enthalpy = stored node energy change + coolant heat trong cùng reduced Cp/reference model.
- Transfer bắt buộc dt, dùng fresh carrier/water molar fraction để suy dew-point ceiling, giữ finite shared source budget/capacity và source IDs. Coolant flow độc lập với kết nối hơi và receiver fullness; nước áo ngoài có volume/mass/energy meters riêng, không trộn vào sample. Out-of-domain receiver phase giữ mass và hiển thị unavailable.
- Store actuator/Inspector điều khiển flow/inlet/jacket UA trên đúng ID với whole-patch validation. Mean outlet/power/usage rõ đơn vị, defaults là nominal; settings/meters đi cùng vessel tại normal save/history checkpoints. Node nhiệt thay đổi thật, stale boiling flag được xóa khi đã subcool.
- **145 file, 1651/1651 test đạt**, thêm 13 ca analytic/event/partial-pressure/tiny-flow/live-store; TypeScript/build đạt, Vite còn cảnh báo chunk lớn. [finite-condenser-cooling.vi.md](./finite-condenser-cooling.vi.md) ghi MIT derivation, API, meters và miền còn thiếu.
- Chưa có calibrated UA/glass C, full axial/thickness wall dynamics, finite recirculating reservoir, pressure-driven gas network, independent gas temperature/enthalpy packets, full VLE/activity/ice hoặc WebGL. Constant-input packet tests không chứng minh mọi coupled thermal/chemistry FPS history. Toàn mục tiêu chưa đạt.

## Vòng tiếp: enthalpy đi cùng hơi từ lúc phát ra đến recovery/exhaust

Vòng finite condenser trước có code và 13 test mới, phân loại có tiến triển. Audit nguồn nhiệt phát hiện sinh hàn suy h_in từ T kính cuối bước. Khi nước đã rời ở điểm sôi rồi kính nóng thêm 100°C, cách đó cấp thừa khoảng 186 J/g; flash của condensate về kính khô cũng gặp lỗi tương tự. Ambient evaporation đã có tích phân nhưng năng lượng gói hơi chưa được chuyển qua biên routing.

- Thêm cumulative thermalVaporEnthalpy_J ngay trong solver phát hơi, bằng vaporization + outgoing sensible, loại fusion. Store chuyển tiếp ở cả thermal/reaction loops; reaction replay giữ meter hiện tại thay vì lấy baseline cũ. Hơi chemical/legacy thiếu meter được gắn source-temperature-estimate, không chứng nhận là thermal emission đã đo.
- Wall route chia mass/enthalpy cùng tỷ lệ; nhiệt thải phần ngưng = incoming vapor h trừ liquid Cp*T_wall. Wall drying thêm đúng h ở thành; outer latent correction và returned-water flash thêm delta meter thật. Không suy superheat của gói đã rời từ nhiệt kính về sau.
- Sinh hàn nhận energy map kèm shared source mass map; receiver đầu không làm receiver sau nhận lại cả gói nhiệt. Thành phần/partial pressure của các nhánh lấy cùng dòng nguồn trước khi chia. Ghi source condensedTransferEnergy_J và external waterVaporReleasedEnergy_J; inspect theo ID bình đọc được meters/model provenance.
- Bổ sung sửa numerical dryout: lượng thành phần H2O khoảng 6e-17 g khi scalar mass/volume đã hết không còn ghim kính ở plateau và làm mất nhiệt. Giữ phần nhiệt thừa vào kính, tắt boiling khi đã cạn. Test gần 500°C không tra saturation bằng T kính khô; carrier packet vẫn hữu hạn.
- [vapor-enthalpy-routing.vi.md](./vapor-enthalpy-routing.vi.md) ghi nguồn MIT/IAPWS, mốc Cp/reference, chữ ký hàm, API inspect, tương thích save/caller cũ và 10 test cân bằng/replay/dryout/live-store. Không tạo vessel mới cho từng hiệu ứng.
- **146 file, 1661/1661 test đạt** sau thay đổi cuối; TypeScript/lint và production build đạt. Vite còn cảnh báo chunk lớn; chưa xác minh render WebGL. Một assertion đòi carrier bằng 0 tuyệt đối được sửa thành kiểm tra hữu hạn: inverse saturation có sai số pressure tương đối khoảng 3.24e-13, không phải mất bảo toàn năng lượng. Các assertion mass/energy giữ nguyên.
- Còn thiếu energy closure của hơi hóa học, sensible storage của film khi T thành thay đổi, wall inertia, retained gas/axial residence/pressure network, full EOS/đa dung môi/frost và WebGL. Miền finite thermal-emission packet đã tiến triển; chưa đủ để kết luận toàn hệ vật lý chuẩn tuyệt đối. Toàn mục tiêu chưa đạt.

## Vòng tiếp: nhiệt dung hữu hạn của nước đã đọng trên thành

Vòng vapor enthalpy trước có code và 10 test mới, phân loại có tiến triển. Audit xác nhận nước đã đọng bị đổi T theo algebraic wall target ở frame sau mà không có heat packet từ bulk/air; 1 g tăng từ 25 lên 50°C có thêm 104.6 J chưa debit nguồn.

- Thêm hai liquid-film nodes với C=m*Cp, conductance sample/air hữu hạn và state T giữ qua bước. Nghiệm exponential của film ghép với end temperature của bulk hữu hạn qua analytic sensible branch hoặc bracketed phase solver. Film nóng/lạnh truyền nhiệt thật về/ra mẫu; bình mở có thể nhận nhiệt làm tan đá thay vì tăng T của ice qua plateau.
- Contact footprints và contour wall area chia một phần baseline resistance hiện có. Steady series conductance đúng bằng phần dry path được thay; runtime chuyển riêng heat đã tính của phần đó qua map theo ID để hoàn lại trước khi áp wet path. Không tạo thêm nguồn lạnh/cộng cooling hai lần. Các bước chuyển khỏi/nhập lại miền hỗ trợ giữ baseline thay vì mất đường thoát nhiệt.
- Route chạy thermal film trước mass/enthalpy source accounting và bead transport, chuyển T mới vào condensation/drying/return. Nước hồi lưu mang T film thực; extra vapor từ thermal coupling vẫn vào source budget. Inspect wall có signed sample/air heat, film sensible change, replaced dry heat và status; không tạo thêm vessel.
- **147 file, 1671/1671 test đạt**; TypeScript/lint và production build đạt. 10 test mới gồm resistance/bounds, finite warming/cooling, large step, chống double cooling, composed energy/return, ice melting, independent RK4 + refinement, unsupported state và live store. Vite còn cảnh báo chunk lớn; WebGL chưa xác minh.
- [finite-wet-wall-thermal.vi.md](./finite-wet-wall-thermal.vi.md) ghi MIT foundations, nominal closure, phương trình, APIs/counters và fallback. Đã tiến triển sensible storage của film trong miền lỏng; chưa giải glass inertia, film freezing/boiling ngoài miền, sealed-water phase equilibrium, gas/axial network, full EOS/mixtures hoặc calibration. Toàn mục tiêu chưa đạt.

## Vòng tiếp: lớp nước đọng sôi, cạn và phân biệt hơi trong/ngoài

Vòng finite wet-film trước có code và 10 test mới, phân loại có tiến triển. Audit xác nhận boundary nóng trên điểm sôi bị loại khỏi coupling, trong khi legacy film T có thể bị gán cao hơn Tb. Nước đọng cần mất mass theo nhiệt ẩn thật và ngừng nhận latent heat khi đã cạn; hơi ngoài không được thu vào sinh hàn nối đầu trong.

- Thêm pure phase solver với exponential sensible segment, sự kiện chạm Tb, finite latent plateau và dryout. Khi cạn, phần dt còn lại dùng đúng series dry resistance; không duy trì một nguồn hóa hơi không còn nước. Nhiệt ẩn tại Tb theo áp suất, packet dùng cùng Cp*T reference. Stored superheat cũ được thư giãn bằng chính stored enthalpy, không tạo nguồn nhiệt mới.
- Bulk/film coupling dùng phase segment và finite-body root; debits đúng source heat, giảm pool/bead mass cùng tỷ lệ. Inner wall vapor có mass/energy packet vào source → recovery/condenser/exhaust; outer wall vapor tăng ambient sink và energy meter riêng. Không debit bulk evaporation lần hai và không tạo vessel mới.
- Sealed inner chưa có retained-steam closure: giữ mass/T và baseline path của phần chưa giải. Outer wall vẫn có thể sôi, chỉ thay dry heat phần thật sự xử lý; status partial-sealed-boiling đọc được qua inspect. Không khóa cả exterior hoặc vent hơi trong ra ngoài tùy ý.
- **148 file, 1685/1685 test đạt**, thêm 14 ca analytic/event/pressure/partition, finite body, spatial vapor routing, sealed partial fallback và live-store inventory/IDs. TypeScript/lint + production build đạt; Vite còn cảnh báo chunk lớn, WebGL chưa xác minh.
- Test return sửa giả định toàn bộ film superheated đều trở về mẫu: kiểm tra wall preflash + return flash bằng energy/mass inventory tổng, giữ energy tolerance cũ. Roundoff cỡ 1e-16 g còn trong pool được audit qua inventory, không xóa cutoff hay phát lại nguồn 1 g.
- [wall-water-boiling.vi.md](./wall-water-boiling.vi.md) mô tả API, source/counters, sealed behavior, derivation và giới hạn. Còn thiếu freezing/frost, glass inertia, measured boiling/CHF/Leidenfrost/contact-area evolution, closed steam EOS/energy, gas/VFX temperature consistency và visual WebGL QA. Toàn mục tiêu chưa đạt.

## Vòng tiếp: nhiệt độ hơi phát ra và cân bằng fog tới particle renderer

Vòng wall boiling trước có code và 14 test mới, phân loại có tiến triển. Audit tìm ba đường vẫn dùng nhiệt độ kính cuối bước: basic VFX, reaction-program ledger và particle manager. Particle system còn từ chối update T>200°C; thermalSteam timeline nhìn bulk evaporation nên có thể mất wall-only steam.

- Ghi cumulative outgoing sensible enthalpy Cp*integral(T_emission dm), giữ qua reaction replay và store. Route chia temperature moment cùng mass/energy, thêm wall boiling/drying/flash và ghi actual emitted T/h/provenance cho external packet. Xóa instantaneous diagnostics khi không còn outflow. External energy chia theo fraction mass của uniform packet, tránh heat không có mass và cancellation khi trừ lifetime energy counters.
- Thay proxy excess bằng adiabatic moist-air/liquid equilibrium theo cùng Cp*T+L(T) reference. q trên total mixture mass xử lý pure steam không gán carrier 1%; root có liquid enthalpy/latent warming. Near-pure branch giải vapor quality để tránh P-p_sat singularity. ASHRAE primary reference và nominal optics gain/miền giới hạn ghi rõ.
- Basic/program VFX dùng chung snapshot projection; thermalSteam gate net external source. Particle manager nhận emitted T/h cả authoritative và standalone thermal modes; dry source dùng mouth radius. EvaporationSystem giữ cached optics trong accepted snapshots và không đóng băng aging trên ngưỡng T kính cũ. Không second solvent sink hoặc vessel mới.
- **149 file, 1699/1699 test đạt**; TypeScript/lint và production build đạt. 14 test mới gồm constructed equilibrium/latent feedback, pure/near-pure energy, source h, dryout gần500°C, emission integral/replay/recovery, exact-state cache invalidation, live wall-only source/program atom và actual particle spawn/aging/no mass debit. Vite còn cảnh báo chunk lớn; WebGL chưa xác minh.
- [emitted-vapor-visuals.vi.md](./emitted-vapor-visuals.vi.md) cụ thể hóa signatures/units/state/counters và nguồn ASHRAE/IAPWS. VFX vẫn là potential equilibrium ở 19 mixing fractions, không phải cloud inventory/microphysics/CFD; non-air carrier, post-condenser residual-gas sensible cooling, frost/glass inertia/retained sealed gas và calibration vẫn mở. Toàn mục tiêu chưa đạt.

## Vòng tiếp: nguồn thật của tràn và splatter, đúng ID và sau material commit

Vòng emitted-vapor visuals trước có code và 14 test mới, phân loại có tiến triển. Audit phát hiện controller acid dilution tự phóng 12 glyph H2SO4 khi boiling flag/rate dương, không có finite ejection parcel hoặc local momentum/pressure closure. addSpill còn suy bình tràn theo proximity; renderer thiếu volume tự dùng 5 mL và profile nâng micro-volume lên 0.05 mL.

- Controller dilution không tự cấp heat/gas/surface impulse/burst hay hard-coded H2SO4. Thermal/boiling/mist thật tiếp tục do ledger và dedicated systems sở hữu. NIOSH xác nhận phản ứng với nước có thể tỏa nhiệt mạnh, không cung cấp một xác suất/tốc độ phun chung cho mọi state; không suy ngược model chưa có thành khẳng định không thể xảy ra.
- addSpill chỉ phát wall overflow cho receiver ID caller chỉ rõ; ground deposition giữ x/z, không gán bình gần nhất. Existing finite dose/stock/aliquot/shatter ownership giữ nguyên, không debit lại nguồn hoặc tạo vessel. Pour arrivals phân biệt stream vào receiver đầy với table impact; rim overflow đi theo wall receipt, không tự tạo acid eruption trong bình. Table splatter giữ discharged composition/source ID và dùng spilled flow.
- advancePourTransport gom events, commit toàn air/wall/pool/spill transaction rồi mới publish. Live test so tổng event theo store-version với đúng phần ground inventory tăng; callback có thể thấy toàn batch trước khi tất cả event của batch đã publish. Tolerance mass/volume giữ nguyên.
- Renderer từ chối missing/zero/invalid volume, angle/duration không hợp lệ, ID khác/bình vỡ và legacy invalid state trước audio/geometry. Profiles giữ volume/footprint micro-spill thật; empty input không có active counts/puddle. Bridge không loại finite micro-receipt <=0.01 mL nữa.
- [overflow-source-truth.vi.md](./overflow-source-truth.vi.md) ghi API/source contracts, NIOSH reference và 8 test hook/store/controller mới, cùng live material/atomic-publication tests được tăng kiểm tra. Các test proximity cũ được sửa thành explicit receipt hoặc ground-spill case, không giữ hành vi sai để lấy test xanh.
- **150 file, 1707/1707 test đạt** sau thay đổi cuối, TypeScript/lint và production build đạt. Vite còn cảnh báo chunk lớn. Hook harness chạy code listener/frame/buffers, chưa xác minh hình ảnh GPU.
- Chưa có solved rim film/transit/entrainment/ballistic size distribution, measured wetting/acoustics hoặc GPU visual QA; concentrated-mixture VLE/thermal model, frost/glass inertia/retained gas vẫn mở. Source causality đã tiến triển, chưa chứng minh toàn bộ cascade geometry hoặc hệ vật lý/hóa học đúng tuyệt đối. Toàn mục tiêu chưa đạt.

## Vòng tiếp: hoạt độ nước và nồng độ thay đổi ngay trong gói nhiệt

Vòng overflow trước có code và 8 test mới, phân loại có tiến triển. Audit đường nhiệt tìm thấy floor 1 g dung môi, đá bị tính cùng nước lỏng, hệ số phân ly ước lượng, cap tăng điểm sôi 18°C và điểm sôi đứng yên trong khi nước đã bay. Surface predicate còn coi muối rắn chưa tan là dissolved solute nên che mất bay hơi/cooling thật.

- Dùng phase l/aq của H2O và mol hạt chất tan aq để tính ideal water activity; Tb từ inverse IAPWS p_sat(P/activity). Solids/gases không làm tăng dissolved concentration. Không có dữ liệu volatile/unknown/concentrated VLE thì báo unavailable, không gán boiling plateau nước tinh khiết. 5% là miền vận hành, không phải measured accuracy certification; complete dissociation và ideal vapor vẫn là giả thiết.
- Tích phân dQ/de=L(Tb)+C(e)dTb/de với nồng độ tăng ngay trong gói, đồng thời outgoing Cp*integral(Tb dm). Giữ ngân sách stored enthalpy + outgoing energy. Đạt biên nồng độ thì giữ nước tại biên, ghi nhiệt còn lại vào outside-model counter; không superheat mẫu giả hoặc tiếp tục xóa dung môi.
- Surface pressure dùng activity*p_sat. Chemical gas/steam vẫn được route riêng khi liquid VLE chưa hỗ trợ; không mất phản ứng vì Tb NaN. Standalone SimulationEngine giữ model limit/outside-energy khi trả state. API đúng ID thêm activity/model/reason và thermal limit/outside-energy diagnostics, không spawn apparatus.
- Full-suite phơi bày exact-25°C gate trong NaCl partition: nước vừa nguội rất ít đã ngừng hòa tan. Thay bằng IUPAC 2022 Eq.11/Table5 cho NaCl/water, ứng dụng 0–100°C; 25°C khoảng35.9677 g/100g nước. Kinetics vẫn minh họa; chưa ghép dissolution heat/volume. Test độc lập đối chiếu bảng molality và live mass/solute conservation, không ép mẫu giữ150g khi có actual water outflow.
- Test calcite giữ assertion pH reference theo nhiệt độ thật, không đòi cooling drift khi CO2 mixture VLE đã bị từ chối. Fixture concentrated NaCl sửa phase/mass và kiểm tra explicit unsupported model, bỏ kỳ vọng 102.8°C từ hệ số1.8 chưa đo. Không mở tolerance để giữ hành vi sai.
- [solution-water-activity.vi.md](./solution-water-activity.vi.md) ghi sources, phương trình/đơn vị/signatures, counters, ví dụ ID-bound API và miền áp dụng. Chưa có calibrated ionic activity/concentrated VLE, mixture Cp/mixing enthalpy, closed-steam EOS, frost/glass inertia hoặc visual WebGL QA. Toàn mục tiêu chưa đạt.
- **151 file, 1722/1722 test đạt** sau thay đổi cuối, gồm14 ca water-activity/finite-packet/routing/API mới và1 ca đối chiếu bảng NaCl/temperature cycling mới; các test tích hợp cũ được cập nhật theo nguồn vật chất thật. TypeScript/lint và production build đạt. Vite còn cảnh báo chunk lớn; GPU visual QA chưa thực hiện.

## Vòng tiếp: watts thật, đường nhiệt chuyển pha và thermal handoff

Vòng water activity trước có code và15 test mới, phân loại có tiến triển. Audit phát hiện standalone manager nhân input watts8.5; renderer tự suy watts từ nhiệt độ ngọn lửa dù store đã allocate nhiên liệu hữu hạn. Result manager trả evaporated_ml theo bước trái nghĩa counter tích lũy VesselState và không giữ vapor enthalpy. Store có thể bỏ outside-model energy khi T/volume/boiling đứng yên.

- Bỏ hệ số8.5. Meter thermalHeatingPower_W/thermalHeatingEnergy_J dùng absorbed allocation cho từng ID, đúng P*dt; shared burner, partial final fuel, hotplate và virtual watts đi qua cùng đường. Không gán flame temperature, setpoint hay electrical input là sample power. Renderer đọc meter từ live vessel với thermalStateAuthoritative, không debit nhiệt/mass thêm.
- Manager giữ thermal state/cumulative vapor enthalpy/counters khi merge; evaporated_ml trở về nghĩa tích lũy, lượng riêng bước có evaporatedStep_g. Store commit cả heater meter/thermal limit/outside-energy và clear power sau cutoff; API inspect đọc được cả hai meter.
- Kiểm thử conservation phát hiện predictor sensible còn tính phantom cooling khi mẫu đang ở plateau. Bổ sung tích phân dE/dt=P−K[T(E)−T_air] theo actual phase-state temperature từ existing finite heat solver. Giữ exponential path khi tuyến tính, dùng adaptive RK4 step doubling khi phase/boundary phi tuyến. Không commit material ở các stage thử; numerical failure giữ inventory và ghi unresolved energy, bước hội tụ sau xóa limit cũ.
- Nghiệm độc lập kiểm tra heating onset→boil, boil→dryout→warming, melting/freezing plateau; so thay đổi nồng độ có heat loss theo subdivision và kiểm tra cumulative mass/enthalpy qua router. Cùng kiểm tra real source không vượt received energy và giữ đúng ID.
- Full suite bắt thêm steady wet-film correction đang xóa source sôi chỉ vì correction net heat gần0. Giữ source/cường độ đã ghi nhận nếu mẫu còn nước, còn ở Tb và model hợp lệ; real subcooling/dryout vẫn tắt. Không thêm nhiệt hoặc mass để giữ animation. Test áp suất0.6/1.2atm cũ giữ nguyên yêu cầu và đạt sau sửa; không nới tolerance hay bỏ assertion boiling.
- [thermal-source-handoff.vi.md](./thermal-source-handoff.vi.md) ghi cơ sở BIPM/MIT, units/API/counter migration, phase-time equation, fallback và giới hạn. K/Cp/glass capacity còn nominal, surface evaporation và wet-film vẫn dùng operator splitting; chưa có spatial thermal/flow, concentrated VLE, frost, retained sealed gas hoặc visual GPU QA. Toàn mục tiêu chưa đạt.
- **153 file, 1738/1738 test đạt** sau thay đổi cuối:16 ca mới cho heater/source/counter/phase trajectory/wet-film và actual renderer callback. TypeScript/lint, production build và diff whitespace check đạt. Vite còn cảnh báo chunk lớn, hook harness chưa thay thế visual WebGL QA.

## Vòng tiếp: độ ẩm và diện tích giọt quyết định tốc độ khô trên thành

Vòng thermal handoff trước có code và16 test mới, phân loại có tiến triển. Audit tìm thấy inner drying30s độc lập RH, gate wallT≥bulkT sai chiều cho dòng khí khô, và exterior evaporation lấy diện tích kính theo fill thay vì mặt nước của finite beads. Không có incoming vapor còn bị diễn giải như p_water=0 trong headspace, kể cả room đã bão hòa.

- Inner drying dùng chênh p_sat(T_wall)−p_water,gas cùng pressure-driven flux closure. Không có stream mới thì dùng room humidity; explicit stream pressure0 vẫn là dry gas hợp lệ. Saturation cùng nhiệt độ cho zero net drying, không bị mất nước theo timer. Sealed inner giữ riêng, exterior vẫn trao đổi với room.
- Giọt spherical cap thêm curved water/gas surface area. Từng bead tích phân shrinking cube-root law ở constant input flux, không xóa nhiều hơn inventory; drainage/contact đi trước evaporation. Inner bead chạm pool nhưng bị full receiver từ chối không bị coi là exposed source. Exterior bead cũ có thể khô độc lập với diện tích fill hiện tại.
- Các cumulative counters mới ghi actual inner/outer mass-transfer evaporation riêng với thermal wall boiling; inspect theo vessel ID đọc được pressure/flux/model. Hơi inner vẫn đi qua shared mass/enthalpy packet, outer đi ambient; không replay chemical/bulk heat source hoặc debit bulk nước lần hai.
- Thay absolute1e-10g bead reconciliation bằng relative machine-precision tolerance, tái dựng invalid/stale metadata theo actual wall mass. Không cho tiny legacy bead metadata giữ lượng nước lớn hơn nguồn thật hoặc truyền NaN vào motion/ledger.
- Test chemical replay/returned flash cũ được sửa theo actual new drying inventory, thay expectation tuyệt đối0 khi condensate/residue vẫn còn. Giữ kiểm tra nguồn hóa học không replay và finite mass/enthalpy; không tăng cutoff để xóa residual.
- Audit shader tìm6 descending smoothstep calls có undefined result theo đặc tả Khronos trong condensation fog, smoke, flame và liquid mixing. Đổi thành1−smoothstep(low,high,x), giữ guard radius dương; không dùng việc build/test xanh làm bằng chứng GPU visuals.
- [wall-humidity-exchange.vi.md](./wall-humidity-exchange.vi.md) ghi ASHRAE/NOAA/Khronos sources, units/API, exact cap solution trong closure, source selection, counters và thermal limitations. Transfer coefficient/contact angle còn nominal, drying segment vẫn isothermal boundary với latent heat ledger, chưa simultaneous wet-bulb/film thermal closure, full headspace/ventilation/finite carrier capacity, ambient condensation toàn kính, frost hoặc GPU visual QA. Toàn mục tiêu chưa đạt.
- **154 file, 1750/1750 test đạt** sau thay đổi cuối, gồm12 ca humidity/cap/submerged/micro-inventory/routing/live-store mới. TypeScript/lint, production build và diff whitespace check đạt. Vite còn cảnh báo chunk lớn; source-level sửa GLSL không phải bằng chứng đã render/kiểm ảnh GPU.

## Vòng tiếp: drying lấy nhiệt từ chính finite film, enthalpy lúc phát ra

Vòng humidity exchange trước có code và12 test mới, phân loại có tiến triển. Audit xác nhận inner drying vẫn lấy latent heat từ isothermal room boundary, outer drying trừ latent vào bulk dù film đã có node nhiệt. Film có thể khô mà không nguội; packet dùng final film T cho toàn vapor/returned water, và direct wall call có thể reset film nguội về nominal steady T.

- Thêm adiabatic finite-film segment: shared retained film Cp, exposed caps shrink theo common cube-root exposure; flux đánh giá lại theo saturation pressure tại T đang nguội. Adaptive RK4 step doubling giải exposure/temperature drop/emission moment, source energy lấy từ stable stored enthalpy difference. Theo dõi drop riêng giữ latent energy khi absolute T thay đổi dưới1ulp; không xóa micro inventory.
- Transport substep mix deposition theo enthalpy, drain ghi Cp*m*T_at_drain và motion dùng T mới. Protected/submerged mass góp thermal capacity nhưng không là exposed vapor source. Numerical/domain failure giữ evaporation inventory và báo limit; liquid0°C floor giữ nước chưa giải frost. Không tạo room heater hoặc second bulk latent sink để duy trì drying.
- Wall state giữ T của wet film giữa direct calls; explicit solved wallTemperatures vẫn nhận theo caller. Inner/outer mass-transfer vapor energy counters tách riêng với thermal wall boiling. Router dùng integrated energy/emission-temperature moment, outer vapor đi ambient; không gán nhiệt độ bulk/final film cho lịch sử emission.
- Reflux receipt dùng mass-weighted drain enthalpy. Admission preview theo cumulative mass/sensible receipt để freezing/flash không overfill receiver; fast path chỉ khi coldest liquid0°C cũng vừa. Initial subzero wall vẫn bị từ chối liquid return. Không bớt return tùy ý theo một final-temperature proxy hoặc tạo spill giả.
- Test độc lập RK4 theo mass/T/energy coordinates, event equilibrium/floor, subdivision, protected capacity, micro/sub-ulp energy, invalid boundary rollback, deposit/drain/retained storage, actual vapor packet, weighted reflux và live-store đúngID. Các test cũ bỏ isothermal heat-source assumptions; room-temperature fog fixture khởi tạo wall từ đúng25°C thay vì mẫu85°C, giữ assertion không có white fog và không replay chemical steam.
- [finite-wall-evaporation.vi.md](./finite-wall-evaporation.vi.md) ghi MIT/ASHRAE foundations, equations/units/API/counters, admission và operator splitting. Cp/hm/contact angle/K còn nominal; conduction/mass transfer vẫn split, chưa full simultaneous condensation warming/glass/airflow, retained headspace/finite carrier, frost hoặc GPU visual QA. Toàn mục tiêu chưa đạt.
- **155 file, 1765/1765 test đạt** sau thay đổi cuối, gồm15 ca mới trong finite_wall_evaporation. TypeScript/lint, production build và diff whitespace check đạt. Vite còn cảnh báo chunk lớn; không có bằng chứng visual GPU hoặc calibration thực nghiệm để đánh dấu toàn mục tiêu complete.

## Vòng tiếp: condensation làm ấm nước đọng, tách bare glass và wet caps

Vòng finite drying trước có code và15 test mới, phân loại có tiến triển. Audit xác nhận condensation còn gửi toàn heat release vào room/bulk, không tăng T của nước đọng; một wet temperature cũng bị dùng cho toàn bare-glass area. Không thể đơn giản cấp thêm33.2J/K cho kính vì bulk đã sở hữu nhiệt dung danh nghĩa đó.

- Thêm finite wet-film condensation: incoming h giữ trong Cp*(M0+m)*T, scalar mass-growth feedback giảm flux khi T tiến tới gas dewpoint; finite vapor budget có thể hết trước thermal capacity. RK4 step doubling/closed enthalpy endpoint không commit partial mass trên numerical/domain failure, không lấy floor1g để nucleate từ nước chưa có.
- Transport tách curved exposed water area với footprint phủ kính. Wet growth chỉ vào caps hiện có, không tự nucleate ở site khác. Dry capture tạo finite liquid ở temperature của bare-glass boundary; phần heat rejected/credited được ghi riêng. Hai route chia một source budget, cập nhật area mỗi120Hz substep; refinement kiểm tra growing-cap feedback.
- Wet/dry temperatures tách riêng: film lạnh không làm vùng kính khô ấm bị coi là lạnh và ngược lại. Existing finite evaporation, sensible mix/drain, admission/flash và source temperature moments giữ path riêng. Outer wet condensation không thêm latent credit vào bulk; node giữ vapor enthalpy rồi conduction hữu hạn chuyển tiếp.
- Ambient incoming H dùng Cp*T_air+L(T_air), counter ghi source energy đầy đủ. API wall diagnostics thêm wet/dry captured mass, energy received, dry boundary T, model/limit; actual router và live store giữ đúng ID apparatus, không tạo thêm bình hoặc replay chemical steam.
- Phần bare glass vẫn là isothermal boundary danh nghĩa với heat sink minh bạch; chưa thêm finite glass inertia hoặc full headspace/ventilation. Không gọi partial closure này là mô hình nhiệt của toàn thành bình đã hiệu chuẩn. [finite-wet-condensation.vi.md](./finite-wet-condensation.vi.md) ghi NIST/ASHRAE sources, equations/API/units/counters và giới hạn.
- 16 test mới gồm independent RK4 mass/T, thermal dewpoint limit, finite source, saturation, time subdivision, microscopic inventory, unsupported data, wet-only growth/dry nucleation/coverage, shared source budget, wet/dry T split, ambient heat ownership, actual routing/conduction energy, live-store inspect và120/240/480Hz transport convergence. Test cũ đổi isothermal m*L(final T) expectation sang incoming enthalpy balance; không nới tolerance bảo toàn. Toàn mục tiêu chưa đạt.
- **156 file, 1781/1781 test đạt** sau thay đổi cuối. TypeScript/lint, production build và diff whitespace check đạt. Vite còn cảnh báo chunk lớn; không có GPU visual QA, measured apparatus calibration hoặc bằng chứng đủ cho completion toàn mục tiêu.

## Vòng tiếp: nguồn bọt độc lập, áp suất cục bộ và không xóa gas theo tuổi

Vòng finite wet condensation trước có code và16 test mới, phân loại có tiến triển. Audit tìm shared spawn credit chọn source ngẫu nhiên, underwater maxLife4.5s không có dissolution sink, và gate bulkT<ambientTb bỏ hydrostatic/capillary subcooling. Mixed-gas equilibrium còn loại tất cả P_external≤p_sat dù state đang condense đã bracket được capillary root nhỏ.

- Hai kênh visual credit độc lập, chronological threshold ordering; fractional steam không trở thành reaction gas khi xung khác đến. Integer attempts tính trực tiếp, work chỉ lặp theo quality slots, không loop hàng tỷ lần ở extreme finite rate hoặc replay backlog glyphs sau source cutoff. Sampling roundoff dùng32eps fractional threshold, không phải mass cutoff.
- Ngưng tụ dựa vào actual local vapor partial pressure ở mọi bulkT trong miền. Mixed root solve trên[0,R_initial] có f(0)<0,f(R_initial)>0, giữ noncondensableK và equilibrium vapor thay vì truyền pressure âm vào radius helper. Pure vapor collapse vẫn là phase sink; bỏ only-under-Tb gate.
- Không dùng life/maxLife xóa bọt còn gas dưới mặt nước. Dissolution vẫn cần dissolved-gas/diffusion model riêng, không gọi timer hoặc việc giữ packet là lifetime dự đoán cho bubble thật. Existing surface pop/coalescence/geometry/reset rules giữ vai trò riêng.
- API inspect đọc sourceSampling của manager đã có bằng findManager, không tạo apparatus/manager hoặc sửa mẫu. Birth counts/fractional credits/active mixed count có model label visual glyphs; material vapor/gas mass và enthalpy tiếp tục thuộc ledger, không debit/credit lần hai qua packet K proxy.
- 12 test mới kiểm tra source isolation/integral counts/cutoff/reset/extreme-rate quality budget, capillary equilibrium tại và trên saturation exterior, undersaturation, local condensation ở ambientTb, no-timer submerged gas, actual vapor collapse và non-allocating inspect đúngID. Test Boyle/coalescence đổi fixture sang noncondensable để giữ yêu cầu K không đổi khi không có phase change; không nới tolerance gas/energy conservation.
- [bubble-source-lifecycle.vi.md](./bubble-source-lifecycle.vi.md) ghi UT Austin/Prosperetti sources, bracket proof, signatures/units/counters và phần chưa giải: true gas holdup/weights, measured nucleation/growth/dissolution, bottom-superheat/flow/film rupture và GPU QA. Toàn mục tiêu chưa đạt.
- **157 file, 1793/1793 test đạt** sau thay đổi cuối. TypeScript/lint, production build và diff whitespace check đạt; seeded frame-rate events/positions, acoustic restrictions và FIFO source snapshots vẫn đạt. Vite còn cảnh báo chunk lớn; không có căn cứ để đánh dấu full physical/chemical realism complete.

## Vòng tiếp: môi trường nhất quán cho nhiệt, mist, bọt và kết tủa

Vòng nguồn bọt trước có code và12 test mới, phân loại có tiến triển. Kiểm tra tiếp tìm hardcoded25°C trong cả hai immersed particle systems, default25°C của standalone manager, và renderer gửi room/wind từ vessel.environment trước khi effect override mới được thermal store tick hợp nhất. Direct thermal còn đọc RH/gió cũ cho evaporation dù áp suất và wall conductance đã đọc effect overrides.

- Manager resolve defaults → vessel environment → effects environment → explicit ambient option; cùng nhiệt độ dùng cho thermal exchange, mist và mọi bubble/precipitate component. Renderer đọc boundary qua manager, không giữ override từ snapshot cũ. Direct thermal resolve effects ambient và merged RH/gió. Giữ explicit standalone plume-vector override với semantics transport hiện có.
- Particle params thêm ambientTemp_c optional, direct legacy default25°C; manager luôn truyền đúng boundary. Boiling FIFO lưu room cùng source snapshot; ambient không hữu hạn không nhận thời gian/inventory. Không đổi material amount, không tạo apparatus hoặc thermal integration thứ hai trong render frame.
- 11 test mới kiểm tra propagation cả ba hệ, override/default/ID isolation, analytic Newton heating/cooling của mẫu kín, direct RH evaporation, queued partial boundaries, actual seeded trajectory changes với birth count/solid mass giữ nguyên, và live renderer nhận setEnvironment ngay trước store tick. Fixture kết tủa có solidOrigin để thực sự kiểm tra precipitation path.
- [effect-environment-handoff.vi.md](./effect-environment-handoff.vi.md) ghi API/units/precedence và giới hạn. Prescribed incompressible streamfunction vẫn giữ nominal velocity và gate10K/2W, chưa solved spatial convection. Nghiên cứu IAPWS/NIST xác nhận cần density/expansion correlation có miền rõ ràng trước khi xử lý cold-water reversal; không thêm correlation chưa xác minh hoặc gán nước tinh khiết cho mọi dung môi. Toàn mục tiêu chưa đạt.
- **158 file, 1804/1804 test đạt** sau thay đổi cuối. TypeScript/lint, production build và diff whitespace check đạt. Vite còn cảnh báo chunk lớn; chưa có measured calibration, full spatial flow hoặc GPU visual verification.

## Vòng tiếp: density anomaly và forcing đối lưu liên tục

Vòng môi trường trước có code và11 test mới, phân loại có tiến triển. Audit xác nhận prescribed flow còn arbitrary10K/2W gate và chỉ hỗ trợ warm-core circulation. Không thể sửa bằng positive expansion hằng số cho nước lạnh hoặc thay authoritative inventory density bằng reference EOS.

- Thêm IAPWS SR6-08(2011) Eq2/Table1 density/specific volume và analytic derivative Table2, cùng miền−20…110°C/reference0.1MPa của viscosity hiện có. Ba verification points Table8 và finite difference kiểm tra cả coefficient transcription và derivative signs. So miền trực tiếp trên°C tránh reject−20°C do Celsius→Kelvin roundoff; viscosity sửa cùng biên.
- Forcing dùng signed density contrast bulk/room, xử lý cooling và water density maximum; bỏ gate10K/2W. Smooth nominal velocity mapping thay piecewise caps, heater contribution dùng positive expansion cho linearized bottom heating. Không gọi đây là giải onset/Rayleigh/spatial temperature hoặc dự đoán lớp đáy chưa nóng qua4°C; roomT vẫn là proxy side boundary.
- Streamfunction và profile slope giữ no-penetration/divergence-free geometry. Numeric memo chỉ cache exact forcing inputs, không giữ vessel/particle history. Simpson volume quadrature loại midpoint truncation khi amplitude tăng; tolerance1e−7 và differential/contour assertions giữ nguyên, không thay field để khớp test.
- Manager truyền fluid applicability vào bọt và từng precipitate component. Pure-water-reference/aqueous-water-proxy/unavailable tách rõ; actual material density/mass/volume và buoyancy/settling paths không bị reference EOS ghi đè. Unknown solvent không được gán water circulation. Mixture expansion và density maximum vẫn chưa có dữ liệu species-specific, không có claim đo thực nghiệm cho proxy.
- Inspect theo đúngID thêm convection diagnostics, status, reference pressure, density contrast/expansion và nominal signed speed, dùng actual metered heat. Pure calculation không tạo manager/apparatus hoặc sửa state; không giả làm lịch sử queued particle steps.
- 14 test mới:12 ca reference/forcing/continuity/memo/fluid/inspect và2 manager integration cases cho aqueous/nonwater applicability. [water-density-convection.vi.md](./water-density-convection.vi.md) ghi IAPWS/MIT sources, equations/units/API/closure limits. Prescribed amplitude chưa calibrated, chưa local bottom/wallT, stable-layer evolution hoặc spatial momentum. Toàn mục tiêu chưa đạt.
- **159 file, 1818/1818 test đạt** sau thay đổi cuối. TypeScript/lint, production build và diff whitespace check đạt. Vite còn cảnh báo chunk lớn; chưa có GPU visual QA hoặc measured physical calibration.

## Vòng tiếp: carrier chung, khuấy không giảm trọng lực và timing của hạt mới

Vòng density-reference trước có code và14 test mới, phân loại có tiến triển. Audit tìm precipitate chỉ nhận40% carrier velocity, agitation giảm terminal settling tới85%, bọt chưa nhận rotational stirring nhưng thermal birth rate lại được nhân tối đa1.4 dù source vapor không đổi.

- Thêm LiquidMotionSystem làm shared carrier cho bọt/kết tủa: full thermal field cộng prescribed azimuthal swirl theo agitation, đúng profile/local boundary. Swirl divergence-free và không có vertical velocity; không dùng nó làm claim vertical suspension, rpm/torque hoặc calibrated stirring. Ngắt input chưa có spin-down momentum. Bỏ giảm lắng và agitation-only source multiplier.
- Precipitate lấy full carrier cộng gravitational terminal slip, giữ physical-radius frozen drag response. Deterministic midpoint carrier sampling loại first-order tracer outward drift khi quay; Brownian chỉ thêm một increment/trục. Circular tracer30/60/120Hz đối chiếu nghiệm rotational invariance cho error refinement>3.3 mỗi lần chia đôi dt, giữ mass và radius drift nhỏ; không gọi finite-inertia nonlinear drag đã exact.
- Full-suite AgBr regression tìm newborn glyph bị lắng đủdt trước khi thật sự sinh và stale whole credits làm batch entrainment mới sinh ngay đầu bước. Tính birth threshold từ fractional clock, chỉ dùng remaining age cho response/drift/Brownian; không bank unused integer attempts khi reservoir cạn/pool đầy. Entrainment/lift height, gravity và turbidity assertion giữ nguyên, không tuning để qua test. Mass source allocation vẫn operator split, glyph sampling không phải physical nucleation timeline.
- 29 test mới gồm shared field/geometry/invalid input, full carrier tracer limit, agitation-independent settling, actual rotation, unchanged source births, both-system control propagation, circular convergence, exact birth ages30/60/120Hz, no stale burst after depletion/quality change, và renderer chỉ khuấy đúng bình được chọn. [shared-liquid-motion.vi.md](./shared-liquid-motion.vi.md) ghi COMSOL/OpenFOAM foundations, equations/units/API/timing và limits; tài liệu drag response cũ có ghi update.
- Lần chạy cuối:160 file,1847 ca,1846 đạt/1 wall conservation scenario vượt timeout15s (không assertion fail). Chạy riêng file basic_vessel_effects giữ timeout cũ:14/14 đạt. Không gọi full run này green hoàn toàn; mọi ca có kết quả đạt khi tính cả targeted recheck. TypeScript/lint, production build và diff whitespace check đạt. Wall transport timing/performance còn cần theo dõi, Vite còn chunk warning, chưa GPU visual QA/measured calibration. Toàn mục tiêu vẫn chưa đạt.

## Vòng tiếp: giảm chi phí wall geometry, giữ từng trạng thái vật lý

Vòng shared carrier trước có code và29 test mới, phân loại có tiến triển. Full suite còn một wall transport timeout dù targeted recheck đạt. CPU profile của đúng600s scenario tìm wallSurfaceFrame/contourRadius và cấp phát vector là hotspots; không tự giảm120Hz hoặc tăng timeout.

- Tách wallSurfaceSection scalar radius/slope/metric, dùng cùng contour interpolation/segment selection. Renderer wallSurfaceFrame vẫn dựng đầy đủ frame khi cần; transport không còn tính theta sin/cos và render vectors để rồi bỏ đi.
- Cache exact-y sections trong một transport call, tối đa256 entries; geometry không đổi trong call, lookup mới khi bead trượt/merge đổi y. Không round tọa độ, không global geometry state/cross-vessel cache, không thay force/mass/thermal solver, pair order, bead count hoặc timestep.
- Thêm benchmark CLI tái hiện1200×0.5s và baseline artifact cho150/300/450/600s. Hai unprofiled local runs giảm6904.6384→2873.4172ms (2.40294×); đây không phải hardware-independent guarantee. Toàn bộ bốn checkpoint JSON gồm mọi bead/mass/energy diagnostic giống hệt, SHA256 hai phía trùng nhau; mass residual8.88e−16g.
- [wall-transport-geometry.vi.md](./wall-transport-geometry.vi.md) và artifacts/science-audit/wall-transport-geometry.json ghi phương pháp, số đo, baseline states và cách chạy lại. Không thêm mirror tests hoặc nới physical tolerance để chứng minh optimization; targeted80 ca và full regression xác minh các invariant hiện có.
- **160 file,1847/1847 test đạt trong86.36s**, không timeout, giữ15s gate của long-wall case. TypeScript/lint, production build và diff whitespace check đạt. Model calibration/physical limits của wall film vẫn giữ nguyên, chưa glass/headspace/frost/GPU QA; Vite còn chunk warning. Toàn mục tiêu chưa đạt.

## Vòng tiếp: độ nhớt giọt nước theo IAPWS và mobility limits

Vòng geometry trước có code, benchmark và exact checkpoint equivalence, phân loại có tiến triển. Audit tiếp tìm wall motion dùng Vogel approximation không có miền/model label, khác shortcut IAPWS của bulk và bị ngoại suy cả ở nhiệt độ cao.

- Thêm IAPWS R12-08 Eqs10–12/Tables1–2 background viscosity theo kelvin/density, mu2=1;11 independent program verification points Table4 đạt tới digits được in. Numeric helper không thay EOS/phase validation và không nhận là full viscosity trong critical-enhancement region Eq13.
- Wall motion dùng saturated-liquid density reference trên toàn miền0≤T<373.946°C, không switch/extrapolate shortcut tại110°C. Bulk SR6 vẫn là0.1MPa reference khác; agreement1% được kiểm tra nhưng không ép hai reference bằng nhau. Gravity component thống nhất9.80665; nominal wetting angles, drag20 và cap0.15m/s chưa được calibration.
- Invalid/unsupported liquid state hoặc cần critical enhancement thì giữ speed0 và báo limit, không bỏ bead/mass/drainage. Hold là chưa giải mobility, không phải dự đoán giọt thật đứng yên. Transport/wall state thêm model và inner/outer motion limits, inspect đúngID đọc được qua wall object, không tạo bình/manager. Thermal mass/energy paths vẫn có budget/domain riêng.
- Cache theo exact temperature cho viscosity/sigma/critical flag, không round hoặc giữ inventory; kết quả dùng một object ổn định để không thêm copy mỗi bead ở path thông thường. Geometry cap density vẫn1000 theo ledger, không lén thay volume bằng saturation density.
- 19 test mới bao gồm11 nguồn độc lập, dilute/invalid input, critical bounds, shortcut agreement và hot reference, uncapped force balance, invalid/critical held mass, cache isolation và model propagation. [wall-viscosity-reference.vi.md](./wall-viscosity-reference.vi.md) ghi source/equations/units/API/limits, phân biệt measured transport data với nominal force closure. Benchmark hash của vòng geometry là baseline vật lý Vogel cũ, không dùng nó làm golden cho viscosity/gravity mới.
- **161 file,1866/1866 test đạt trong88.78s** ở bản cuối. TypeScript/lint, production build và diff whitespace check đạt, timeout cũ giữ nguyên. Còn critical/EOS, pressure-dependent cap geometry, wetting/drag calibration, glass/frost/headspace/GPU QA; Vite còn chunk warning. Toàn mục tiêu chưa đạt.

## Vòng tiếp: footprint theo meridian và drainage ngay sau coalescence

Vòng viscosity trước có code và19 test mới, phân loại có tiến triển. Reproducer mới dùng source scale hiện tại0.035m tìm pinned inner cap trên slope bị return sớm do contact radius bị coi là vertical distance; hai caps1e−6g nhập lại chạm mặt nước nhưng chưa return trong cùng substep. Không dựa vào scale0.05 trong ngữ cảnh cũ.

- Thêm meridian coordinate/inverse cho piecewise-linear wall, tích phân sqrt(1+r'^2) theo từng segment; giữ horizontal floor/rim exclusion của wall model. Surface section trả arc coordinate, local exact-y cache vẫn scoped/bounded như trước. Không thay global display scale/profile calibration.
- Một contact predicate theo arc length dùng cho inner contact, wet-condensation recipients, exposed evaporation và post-motion drainage. Receiver từ chối một phần thì remainder nằm tangent theo inverse arc, không bị nâng quá cao trên slope. Mass/admission/enthalpy paths giữ finite receipts như trước.
- Coalescence dùng exact meridian separation qua corners, mass-weighted arc centroid và short periodic theta. Meridian exact không đồng nghĩa full2D geodesic/curved contact footprint; azimuth radius vẫn local approximation. Refresh footprint/mobility sau merge, drain ngay nếu mới chạm, không chạy thêm một motion timestep. Drain hết thì không dùng empty site tiếp tục merge.
- 11 test mới kiểm tra analytic segment/inverse, premature/actual slope contact, partial admission/tangent remainder, exposed drying, same-step post-merge drain/no replay, finite rejection, one admission receipt, no false merge qua steep corner và mass-weighted S centroid. [wall-meridian-contact.vi.md](./wall-meridian-contact.vi.md) ghi OpenStax parametrization, suy dẫn metric, hàm/units/predicate và phần chưa giải. Tài liệu convection cập nhật source scale hiện tại để bỏ literal cũ.
- **162 file,1877/1877 test đạt trong90.37s**, TypeScript/lint, production build và diff whitespace check đạt. Không nới timeouts/conservation assertions. Chưa contact-line/coalescence inertia/energy, horizontal-rim wetting, calibrated drag/angles, full glass/frost/headspace/GPU QA; Vite còn chunk warning. Toàn mục tiêu chưa đạt.

## Vòng tiếp: thời gian trượt qua corner và pinning theo đúng đoạn thành

Vòng contact trước có code và11 test mới, phân loại có tiến triển. Audit tiếp tìm motion vẫn lấy speed/metric đầu bước để cập nhật y suốt substep, có thể đi sai arc distance hoặc xuyên vào lower segment vốn phải pin. Contact đúng chưa đủ nếu trajectory vẫn dùng độ dốc cũ.

- Thêm advanceWallDrop: piecewise-exact advection của declared quasi-steady mass/T-fixed closure. Trên straight segment speed cố định; chia remaining time tại mỗi strict lower corner, tính lại force/viscosity/mobility của đoạn tiếp theo. Pinned/critical state giữ vị trí; không dùng quán tính giả để vượt vùng bị ghim.
- Dừng tại footprint lower-boundary event; caller transport vẫn sở hữu finite drainage/admission và enthalpy. Không đi xuống dưới receiver rồi kéo ngược center lên. Giữ source/thermal models,48 beads,120Hz, bounded exact-y geometry cache và coalescence paths của vòng trước.
- Downward path qua mỗi contour height tối đa một lần, loop bounded theo số points+2, không discard time theo distance cutoff. distance_m/movingTime_s là derived geometric diagnostics, không phải new energy/material budget. Horizontal rim faces, actual pin/unpin inertia và contact-line dynamics vẫn chưa giải.
- 9 test mới kiểm tra vertical displacement, corner arc distance, lower-segment pinning, exact within-model time subdivision, pinned/critical hold, footprint stop, invalid duration, nhiều corners và actual transport mass/pin. [wall-drop-advection.vi.md](./wall-drop-advection.vi.md) ghi API/units/event equations và giới hạn; không gọi quasi-steady analytic stepping là full measured droplet dynamics.
- **163 file,1886/1886 test đạt trong98.35s**, TypeScript/lint, production build và diff whitespace check đạt. Timeout/tolerance giữ nguyên; Vite còn chunk warning. Chưa wetting/drag calibration, inertia/glass/frost/headspace/GPU QA. Toàn mục tiêu vẫn chưa đạt.

## Vòng tiếp: kết tủa không bỏ thời gian và one-time outflow receipts

Vòng wall advection trước có code và9 test mới, phân loại có tiến triển. Audit toàn hệ thống tìm PrecipitationSystem dùng min(dt,0.2), trong khi shared clock có thể nhận0.8s ở10FPS/8×. Bọt/chemistry tiến đủ thời gian nhưng precipitation bị chậm; không được giảm elapsed time để lấy hiệu năng.

- Bỏ time discard, nhận snapshot FIFO và integrate các bước tối đa1/120s, work cap240/update. Normal0.8s xử lý đủ96 bước; exceptional4s giữ phần chờ sau2s. Last step nhận cả original endpoint residue, integer-ratio roundoff không sinh extra RNG tick giả; partial final step nhỏ được xử lý ngay, không thêm quantum latency cho inventory.
- Snapshot copy entry tuple, giữ bulk/room/viscosity/agitation/source cũ trước điều kiện mới. withdrawnSuspension_g là finite receipt áp dụng một lần/packet, không debit lại trong96 substeps hoặc khi tiếp tục backlog. Explicit reset clear clock/queue/PRNG; zero-material interval chỉ clear physical particles, vẫn đếm accepted/integrated time.
- Thêm acceptedTime_s/integratedTime_s/pendingTime_s/clock và inspect precipitationTiming theo species ở đúng manager đã có; inspect không tạo bình/manager hoặc sửa specimen. Counters là per-system episode, không phải absolute lab clock. Invalid physical packets không nhận time hay flush pending work.
- 9 test mới kiểm tra full0.8s, seeded trajectories10/30/60/120FPS/8×, bounded/frozen backlog, snapshot entry/environment, one-time withdrawal, zero-mass interval, reset, invalid input và non-allocating inspect. Midpoint order test cũ dùng subclass resolution30/60/120 thay vì đồng nhất renderHz vớisolverHz; no-stale-burst test giữ0.001s assertion rồi cấp đúng một glyph period để tránh phụ thuộc clock phase cũ.
- [precipitation-clock.vi.md](./precipitation-clock.vi.md) ghi API/units/queue/endpoint/receipt semantics và limitations. Đây là time consistency cho held parameter packets, không phải spatial field hoặc calibrated particle/entrainment model. Exceptional backlog hiển thị có thể chậm hơn authoritative material state và được report rõ.
- **164 file,1895/1895 test đạt trong109.79s**, TypeScript/lint, production build và diff whitespace check đạt; không tăng timeout/tolerance. Còn transport/calibration/spatial-flow/glass/frost/headspace/GPU QA và chunk warning như trước. Toàn mục tiêu chưa đạt.

## Vòng tiếp: carrier phase cho cặn khô, matrix băng và underwater bubbles

Vòng clock trước có code và9 test mới, phân loại có tiến triển. Audit tìm reference fluid properties vẫn tồn tại khi liquid đã cạn, fill height có thể do solid/ice occupancy nên particle systems tiếp tục dùng water drag/Brownian/entrainment hoặc tạo underwater bubbles chỉ vì positive legacy volume.

- suspensionFluidProperties phân biệt liquid/dry-residue/frozen-matrix từ bulk l/aq inventory, liquid volume và explicit water ice, không lấy nhiệt độ làm phase toggle. Exclude gas/filter/foam; legacy unknown-phase positive-volume data giữ explicit proxy. Thêm carrierModel/liquidMass diagnostic, không đổi actual material density/chemistry ledger.
- Dry branch biểu diễn declared bulk residue trong finite bed, không liquid glyph/Brownian/entrainment và cloudiness0; giữ target mass/time. Đây là coarse dry-bed projection, chưa aerosol/granular/adhesion dynamics. Khi rewet không tự resuspend bed; chemistry/stirring giữ paths riêng.
- Frozen branch giữ particle positions và pending/bed inventory, zero velocity/liquid haze, vẫn tăng age/clock; không cho Stokes-water lắng qua ice. Hold là unresolved representation, không giả định interface luôn engulf tại chỗ. NASA source và missing pushing/engulfment/front data được ghi rõ; slush còn bulk-liquid approximation, chưa ice-obstacle field.
- Manager chỉ chạy underwater bubbles trong liquid carrier, kể cả reaction bubbles. Known dry/frozen phase thắng positive legacy display volume; reset glyph domain không xóa gas/material inventory. Inspect theoID thêm current suspensionCarrier và per-species last processed mode cạnh clock backlog, không tạo apparatus/manager hoặc mutate sample.
- 11 test mới kiểm tra phase/slush/gas/filter/legacy classification, wet→dry mass/time, zero-volume direct call, rewet/stir, freeze/thaw hold, frozen solid reservoir, actual manager/inspect và no bubbles trong dry/frozen samples còn display volume. [precipitate-carrier-phase.vi.md](./precipitate-carrier-phase.vi.md) ghi API/assumptions/source/limits; không nới conservation/time assertions.
- **165 file,1906/1906 test đạt trong98.17s**, TypeScript/lint, production build và diff whitespace check đạt. Timeout/tolerance giữ nguyên. Còn interface transport, dry dust/granular/adhesion, validated mixtures, field/calibration/glass/frost/headspace/GPU QA; Vite còn chunk warning. Toàn mục tiêu chưa đạt.
