# Đồng hồ kết tủa giữ đủ thời gian mô phỏng

## Lỗi và hành vi mới

`PrecipitationSystem.update` trước đây dùng `dt=min(dt,0.2)`. Đồng hồ chung có thể cấp0.8s ở10FPS/8×, nên mỗi lần gọi mất0.6s chuyển động/settling/entrainment dù thermal, bubbles và chemistry đã tiến thời gian. Đây là sai thời gian, không phải một giới hạn vật lý của kết tủa.

Nay mọi interval hợp lệ được chấp nhận đầy đủ. Chia thành các bước tối đa1/120s, xử lý tối đa240 bước mỗi update; phần còn lại nằm trong FIFO. Normal0.8s frame gồm96 bước và xử lý hết trong call đó. Exceptional4s packet xử lý2s, giữ2s chờ, không xóa hoặc dùng thông số mới để thay lịch sử cũ.

Đây là bounded substeps với **partial final step được xử lý ngay**, không phải chờ tích đủ quantum mới thấy thay đổi. Vì vậy packet0.001s vẫn tác động đúng thời gian vật lý, inventory/slip không bị cố tình trì hoãn8.3ms. Tần suất input bất kỳ có thể tạo thêm partial steps và Brownian samples; không hứa bitwise invariance cho mọi cách chia thời gian tùy ý. Các frame rates/scales chuẩn có interval chia hết120Hz được kiểm tra riêng.

## API và counters

|Hàm/trường|Nghĩa|
|---|---|
|`update(dt,params)`|Nhận đủdt hợp lệ, chụp packet params, chạy tối đa240 substeps FIFO|
|`fixedDt`|1/120s mặc định; maximum physics step trong runtime|
|`maxSubstepsPerUpdate`|240; work limit, không phải time-discard limit|
|`acceptedTime_s`|Tổng thời gian hợp lệ được nhận từ lần reset gần nhất|
|`integratedTime_s`|Thời gian đã được solver xử lý, gồm cả interval không có solid mass|
|`pendingTime_s`|Tổng thời gian packet còn chờ, không cộng lại từ thông số hiện tại|
|`clock`|Pure snapshot model/counters; model=bounded-120hz-precipitation|
|`reset()`|Explicitly bỏ particle history/queue/counters và reset PRNG seed|

Counters là tương đối cho mỗi system/species episode, không phải absolute lab clock. Normal numerical identity là accepted≈integrated+pending trong floating precision. Invalid/zero/negative time và invalid physical packet không xử lý backlog hoặc sửa vật chất. Normal update có thể nhận valid zero precipitate mass để clear physical particles và vẫn tiến clock.

Packet lưu original seconds, integer substep count và số bước đã làm. Last h lấy từ original seconds−done*fixedDt để nhận cả endpoint residue; ratio nằm vài ulp trên integer không tạo một RNG tick giả riêng. Không lặp trừ dt tạo đuôi roundoff rồi vứt đuôi đó. Endpoint tolerance32eps chỉ chọn số bước, không xóa thời gian hoặc đổi khối lượng.

## Snapshot và one-time receipts

Mỗi packet giữ temperature, viscosity, density, room, agitation, source amount, geometry parameters và copy entryPoint tuple. Người gọi sửa object/entry array sau khi nhận không thay nguồn cũ còn chờ. Geometry profile object tiếp tục được giả định ổn định trong packet như các particle systems khác; không deep-clone mesh/function vào mỗi substep.

`withdrawnSuspension_g` là **finite receipt**, không phải g/s. Sau lần đầu xử lý packet, receipt trong snapshot được đặt0; các substeps và các lần update xử lý tiếp backlog không debit lại. Authoritative chemistry inventory phải đồng thời phản ánh amount sau outflow như contract hiện có. Physical sphere radius/settling và sediment bed không bị chỉnh để làm receipt có vẻ bảo toàn.

Zero-mass step chỉ clear particles/emission/bed data; không gọi public reset làm mất queue và accepted counters. Public reset hoặc manager xóa component khi species biến mất vẫn là explicit end của episode; không replay nguồn vật chất đã bị xóa. Quality budget vẫn điều khiển glyph count, không tự đổi accepted time hoặc particle properties.

## Inspect theo đúng bình

`effects.forVessel(id).inspect().state.precipitationTiming` trả array `{formula,model,acceptedTime_s,integratedTime_s,pendingTime_s}` từ species systems đã tồn tại. Không có manager/component thìarray rỗng; inspect không tạo bình hoặc manager, không mutate sample. Exceptional backlog có thể làm visible particle history chậm hơn authoritative material state; counters công khai phần chờ, không giả như solver đã xử lý đủ.

Không thay nguồn chemistry, thermal ownership, actual mass transfer hoặc scene scale. Render frame vẫn chỉ bước tới system của đúng vessel ID; physical packet không viết lại specimen ledger từ glyph simulation.

## Kiểm chứng và các test cũ

9 test mới kiểm tra0.8s không truncate, seeded trajectories ở10/30/60/120FPS/8× so với1920 steps reference, bounded4s backlog/freeze/drain, old environment/entry snapshots trước nguồn mới, one-time withdrawal, zero-mass clock continuity, explicit reset/seed, invalid physical packets và non-allocating inspect theo species/vessel.

Test circular tracer refinement trước đây thay renderHz cũng thay numerical dt. Nay runtime luôn giới hạn120Hz, nên test numerical convergence dùng test subclass với fixedDt30/60/120 để tiếp tục chứng minh midpoint order; frame-partition invariance của runtime được kiểm tra ở file clock mới. Test source depletion giữ assertion không burst trong0.001s, rồi cấp đúng một glyph period1/64s để kiểm tra một birth mới; không dựa vào phase ngẫu nhiên do update0.1s cũ tạo ra khi pool cạn.

Các model Brownian, sphere/drag, source glyph weighting, entrainment và prescribed carrier vẫn có assumptions/tolerances của chúng. Sửa thời gian không chứng minh particle size distribution hoặc shear suspension đã calibrated. Chưa có full fluid flow/gas holdup/glass/frost/headspace/GPU QA; toàn mục tiêu chưa đạt.

Sau thay đổi cuối: **164 file,1895/1895 test đạt trong109.79s**, TypeScript/lint, production build và diff whitespace check đạt. Không tăng timeout/tolerance. Vite còn cảnh báo chunk lớn; kết quả thời gian/counters không thay thế experimental calibration hoặc GPU visual verification.

Cập nhật carrier phase: [precipitate-carrier-phase.vi.md](./precipitate-carrier-phase.vi.md) giữ clock qua dry/frozen intervals nhưng không áp liquid transport khi mất carrier. Inspect timing thêm last integrated carrierMode để phân biệt với current inventory classification.
