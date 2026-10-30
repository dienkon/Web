# Hiệu ứng cơ bản theo bình — triển khai 25/10/2026

Tài liệu này mô tả code đã triển khai. `basic-vessel-effects-contract.vi.md` là bản đặc tả đề xuất trước đó; không phải mọi mục trong bản đề xuất đều đã trở thành API.

## Dùng trong VFX Studio

Mở `?vfx=1`, chọn **bình đích** ở thanh trên cùng. Chọn tab Physics để điều khiển công suất nhiệt ảo, độ ẩm riêng, theo dõi tốc độ bay hơi và khối lượng sương trong/ngoài. Không có bình thì dùng nút **Thêm bình**. Xóa bình đích không tự chọn bình khác.

Các nút **Thay mẫu nước 25°C**, **Thay mẫu nước 5°C**, Atom tạo mẫu, Program và Morphology thay lượng chất ngay trong bình đích; giữ ID, vị trí, góc quay, loại và sức chứa. Đây là thao tác chuẩn bị mẫu ảo có chủ đích, không phải chuyển chất từ kho vật lý. Mẫu nước có lượng `min(100, 0.5 × capacity_ml)` g. Chuẩn bị mẫu không được dùng trên bình vỡ, khóa, kín, mẫu bài học hoặc bình đang có lần rót chưa kết thúc. Đường cũ không truyền target vẫn dành cho thao tác tạo mẫu riêng; các lệnh trong Studio hiện truyền target rõ ràng.

Đổi mẫu dừng ReactionSimulationEngine, ProgramPlayer, KineticsEngine, reset manager hạt, xóa pending reaction/dissolving và nguồn nhiệt ảo cũ. `vessel:sample-reset` dọn gợn mặt thoáng và màng tràn. Kết quả resolve phản ứng bất đồng bộ của mẫu cũ bị từ chối nếu revision mẫu đã đổi.

Gia nhiệt 80/300 W chỉ cấp năng lượng vào mẫu hiện tại; không ép nhiệt độ/sôi/thể tích. Ngắt nhiệt ảo để mẫu nguội dần. Thử tràn bằng cách chọn một bình nguồn có nước, chuyển 10 mL/lần: nguồn mất lượng tương ứng, đích nhận phần vừa sức chứa, phần dư đi qua đường spill hiện có. Muốn thao tác rót có thời gian bay/liên tục, dùng công cụ rót 3D hiện hữu; nút này là một giao dịch chuyển hữu hạn tức thời.

## API đã có

```ts
import { effects } from '../../vfx/vesselEffects';

const eff = effects.forVessel('beaker_1');
const heat = eff.setHeatInput(300); // W, nguồn nhiệt ảo được tính trong tickSimulation
eff.setEnvironment({ relativeHumidity: 0.8, airSpeed_m_s: 0.2 });
eff.ripple(0.3); // xung 0–1, không thêm nước
eff.doseLiquid('source_vessel_id', 10); // mL, lấy từ nguồn hữu hạn
const reading = eff.inspect();
if (heat.handle) eff.stop(heat.handle);
```

Mọi lệnh trả `{ ok, vesselId, code, message }`; gia nhiệt trả thêm `handle`. ID được tra lại ở từng lệnh, không giữ object state cũ. Không có nhánh tự thêm bình hoặc fallback sang ID khác. Mã lỗi ổn định: `missing_vessel`, `shattered`, `locked`, `sealed`, `unsupported`, `empty`, `invalid_parameter`, `stale_handle`, `source_unavailable`. Tham số sai bị từ chối trước khi sửa state.

| Hàm | Đầu vào | Tác dụng thực tế |
|---|---|---|
| `setHeatInput(power_W)` | 0–1000 W, hữu hạn | Một nguồn nhiệt ảo trên bình. Nguồn mới thay nguồn ảo cũ; burner/hotplate vẫn hoạt động riêng. Bắt đầu gia nhiệt đòi hỏi nước/dung dịch loãng được hỗ trợ. |
| `setEnvironment(patch)` | °C 10–40, RH 0–1, atm 0.6–1.2, gió m/s 0–1, O₂ 0–0.21 | Override riêng bình; không đổi bình khác. Các trường không override theo môi trường phòng. |
| `doseLiquid(sourceId, volume_ml)` | ID khác đích, mL dương hữu hạn | Đi qua `transferLiquidContinuous`; trả thêm moved/accepted/spilled mL. Không nhận lưu lượng hoặc tự tạo nước từ sự kiện VFX. |
| `ripple(intensity)` | 0–1 | Gửi đúng một `surface:ripple` có vesselId. |
| `inspect()` | Không | Stage, nhiệt độ, ngưỡng sôi, evaporation g/s, công suất ảo, điểm sương và ledger sương. Không giả số đo lưu lượng tràn tức thời. |
| `stop(handle)` | Handle nguồn nhiệt hiện tại | Ngắt đúng nguồn thuộc handle. Handle cũ không ngắt được nguồn mới. Nước nóng, sương và vật chất thật tiếp tục tiến triển. |

Các preset chỉ có mô tả vẫn là inspect; kết quả chỉ mở thông tin tham khảo, không xác nhận hiệu ứng vật lý đã chạy. Chọn Atom sôi/hơi/sương dẫn tới điều khiển Physics. Màu lửa dùng nguồn đèn riêng, không phải một hiệu ứng hóa học trong bình. Program bài học nhiều dụng cụ chỉ dẫn sang mục Bài học; Studio không tự khởi tạo bộ bình bài học.

## Mô hình và sổ vật chất

### Sôi và bay hơi

`stepVesselThermal` tích phân truyền nhiệt đối lưu và nguồn nhiệt. `applyThermalEnergy` dùng chung ngân sách cho nhiệt hiện, nóng chảy và hóa hơi. Sôi dùng điểm bão hòa theo áp suất và mức tăng nhiệt độ sôi của dung dịch từ mô hình hiện hữu. Bay hơi dưới điểm sôi tiêu thụ `L_v = 2256 J/g`, làm lạnh mẫu và giảm đồng thời khối lượng, thể tích, moles nước; giữ moles chất tan và tính lại nồng độ. Giá trị L_v cố định là xấp xỉ ở nhiệt độ dưới 100 °C.

`waterSurface.ts` hiện dùng áp suất bão hòa IAPWS SR1-86(1992), thay fit Antoine ghép và clamp 100 °C ban đầu; khối lượng riêng hơi dùng `p/(R_v T)` và mô hình:

```
J = 1000 × h_m × (rho_surface − rho_room)        [g/(m²·s)]
h_m = 0.002 + 0.006 sqrt(airSpeed_m_s)            [m/s]
mass = max(0, J) × exposedArea_m2 × dt_s
```

Diện tích lấy từ contour và scale mét của scene; cổ bình hẹp giới hạn diện tích trao đổi. Đây là quy tắc mô hình, không phải nghiệm khuếch tán qua cổ bình. `h_m` là hệ số minh họa, chưa hiệu chuẩn thực nghiệm. Chỉ bật chuyển khối nước môi trường khi tổng chất không phải nước (kể cả chất rắn) không vượt 1/19 khối lượng nước lỏng và không có chất bay hơi khác được nhận diện. Không áp mô hình này cho ethanol, acid đậm đặc, frost hoặc bình kín. Khối lượng bị giới hạn bởi nước/nhiệt hiện có, không làm nhiệt độ xuống dưới 0 °C chỉ vì sink bay hơi môi trường.

`waterPlumeVisibility` khảo sát 19 tỷ lệ trộn khí ẩm theo enthalpy và humidity ratio; quá bão hòa mới cho phép sương trắng. `EvaporationSystem` chỉ dùng dòng hơi thật còn lại sau sương thành và ống sinh hàn. Plume được sinh ngoài miệng bình để không xuyên vai/cổ; hơi đi qua headspace không được vẽ thành khói trắng. Vị trí bắt đầu plume là một đơn giản hóa, chưa giải vùng trộn không gian/giọt aerosol. Fade hạt giảm dần theo tuổi; nước nhiệt độ phòng không phát khói.

### Sương thành bình

Cập nhật đường nguồn: `routeWaterVaporToWall` chạy sau kinetics/projection khí để nhận cả nước hóa hơi do nhiệt phản ứng và H₂O(g) do phương trình. `finalizeWaterVaporOutflow` chốt sink sau wall/condenser và partial pressure; replay giữ nước nhận về bằng counter có dấu. Mẫu rắn khô cũng có thể phát hơi hữu hạn, nhưng không tự có sương trắng nếu hỗn hợp chưa quá bão hòa. Xem [chemical-water-vapor-routing.vi.md](./chemical-water-vapor-routing.vi.md) cho trường dữ liệu, biên kiểm toán và giới hạn fresh-stream. Các phản ứng `heat_activated` còn được kiểm tra miền nhiệt từng bước theo [heat-activated-progress.vi.md](./heat-activated-progress.vi.md).

`stepWallCondensation` phân biệt thành phía trên tiếp xúc headspace và thành ngoài tiếp xúc môi trường. Nhiệt độ thành dùng xấp xỉ điện trở nhiệt: headspace `T_air + 0.35(T_liquid − T_air)`, thành ướt `T_air + 0.9(T_liquid − T_air)`; chưa giải nhiệt độ kính theo chiều cao/thời gian hay nhiệt dung kính riêng.

Mặt trong chỉ lấy từ lượng nước vừa hóa hơi hữu hạn. Phần còn lại mới đến ống sinh hàn; phần sau thu hồi mới đi ra plume. Sương ngoài lấy từ điều kiện biên không khí phòng, có ledger `ambientCollected_g` và `ambientReleased_g`. Nhiệt ngưng tụ ngoài thành làm ấm mẫu qua cùng solver nhiệt; nhiệt ngưng tụ ở thành trên được ghi là trao đổi với phòng. Tại RH bằng 0, điểm sương dưới miền nước lỏng trả `-Infinity`, không giả điểm sương 0 °C.

Đã thay closure drainage 15 s và ngưỡng giữ 0.015/0.03 g bằng bead hữu hạn do engine quản lý. `transportWallBeads` nhận nguồn ngưng tụ, cập nhật bám/trượt/nhập giọt trên substep không quá 1/120 s và chỉ chuyển nước qua biên khi có tiếp xúc. Nước trong chảy về bình tối đa bằng chỗ trống; không nhét vượt sức chứa. Nước ngoài xuống spill đúng một lần. Chưa có trạng thái bay riêng cho giọt sương ngoài; ledger chuyển trực tiếp từ thành sang bàn. Các parcel rót thông thường vẫn dùng pipeline bay/màng hiện có.

```
evaporated_total = vapor_escaped + condenser_recovered + inner_film + inner_returned
room_collected  = outer_film + outer_drainage + room_released
```

Nước quay về từ thành được khấu trừ trong replay nhiệt/phản ứng, tránh hồi sinh nước đã mất hoặc trừ hai lần. Với mẫu đang phản ứng phải xét chênh lệch các bộ đếm so với baseline. Nước ở thành nằm ngoài `vessel.mass_g` (khối lượng mẫu trong bình), nên đối chiếu toàn hệ phải cộng nó.

`WallCondensateDroplets` chỉ đọc bead từ ledger, vẽ chỏm cầu theo khối lượng và normal của đường bao kính; không còn ellipsoid quay vòng từ đáy lên trên bằng modulo. Giọt cũ giữ vị trí khi mực thay đổi; giọt trong bị ngập nhập lại mẫu. Mobility dùng lực giữ kiểu Furmidge với góc tiếp xúc/drag giả định, sức căng theo IAPWS. Hợp đồng và giới hạn bình thẳng đứng nằm trong [wall-beads-and-wetting.vi.md](./wall-beads-and-wetting.vi.md). Solver riêng `sim/condensation.ts` vẫn là nhánh tùy chọn, không được dùng để hạch toán thêm lần nữa nguồn nước của bình.

### Tràn, clock và vòng đời

Tràn tiếp tục dùng hình học/sức chứa/chiếm chỗ và ledger rót hiện có; lệnh hiệu ứng không tự cộng nước. `VesselWallOverflow` dùng thời gian mô phỏng cho vòng đời hoạt ảnh, giữ nguyên khi pause và chạy theo timeScale. Thời lượng/cường độ màng tràn vẫn là ánh xạ minh họa theo thể tích, chưa phải nghiệm Navier–Stokes. Không thay đổi các công việc khác đang có trong workspace, không cài dependency hoặc triển khai website.

## Kiểm chứng và giới hạn

Các test mới ở `tests/basic_vessel_effects.test.ts` kiểm tra: A/B và ID bị xóa; validation/handle; thay mẫu không thêm bình; dọn controller; nguồn chuyển hữu hạn và spill; áp suất hơi/điểm sương; RH/gió/diện tích; lạnh do bay hơi; loại trừ dung môi không hỗ trợ; nguồn sương trong/ngoài hữu hạn; nhập giọt bảo toàn thể tích; 30/60/120 Hz; pause. Dung sai so sánh 10 s bay hơi: 0.0001 °C và 0.00001 g; sổ vật chất dùng 8–12 chữ số thập phân tùy phép kiểm.

Kiểm tra hình ảnh tương tác trong trình duyệt chưa hoàn tất: automatic approval review chặn lệnh khởi chạy Chrome headless với lý do `blocked by policy`. Vì vậy chưa xác nhận bằng ảnh thực tế các trường hợp kính trong, sương ngoài, góc nghiêng, clipping và độ rõ của hiệu ứng. Build/typecheck và unit test không thay thế xác nhận hình ảnh hoặc hiệu chuẩn vật lý thực nghiệm.

## Nguồn nghiên cứu

- [NIST Chemistry WebBook — water Antoine parameters](https://webbook.nist.gov/cgi/cbook.cgi?ID=C7732185&Mask=4&Type=ANTOINE): tương quan áp suất hơi theo nhiệt độ và miền hệ số.
- [IAPWS — boiling and pressure](https://www.iapws.org/faq1/boil.html): quan hệ áp suất và nhiệt độ sôi.
- [NOAA/NWS — dew point vs humidity](https://www.weather.gov/arx/why_dewpoint_vs_humidity): điểm sương và điều kiện ngưng tụ.

Các nguồn này hỗ trợ nhiệt động học nền tảng; không xác nhận các hệ số truyền khối, điện trở nhiệt, drainage, pinning hoặc shading được chọn trong phần mềm.

## Kết quả kiểm tra cuối phiên

- `npm test -- --maxWorkers=2`: 120 file, **1330/1330 test đạt**, gồm 14 test mới cho hiệu ứng cơ bản.
- `npm run lint`: đạt (`tsc --noEmit`).
- `npm run build`: đạt. Vite còn cảnh báo kích thước bundle trên 500 kB.
- Một số kiểm thử khối lượng cũ đã được cập nhật để cộng lượng nước rời mẫu và trừ lượng quay về từ thành; không nới dung sai để bỏ qua mất khối lượng. Test clock dùng kính khô để tách phép kiểm thời gian khỏi nhiệt ẩn của trao đổi ẩm.
- Kiểm tra diff có sẵn phát hiện trailing whitespace tại các dòng thay đổi khác trong workspace. Các thay đổi có sẵn được giữ nguyên.
- Chưa có ảnh kiểm chứng WebGL do giới hạn khởi chạy trình duyệt nêu trên; chưa khẳng định độ chân thực đã được hiệu chuẩn thực nghiệm.
