# Tràn và bắn giọt phải có nguồn chất lỏng thật

## Bằng chứng và sửa đổi

Audit phát hiện hai đường không đủ bằng chứng vật lý:

- Controller pha loãng axit thấy `isBoiling` và rate bay hơi dương thì tự tạo ripple/burst và 12 giọt mang nhãn H2SO4 trong 0.8 giây đầu. Không có aliquot bị lấy khỏi mẫu, không giải ejection momentum/local pressure, còn nhãn hóa chất được ghi cứng bất kể mẫu thực.
- `addSpill` chọn bình gần tọa độ vết đổ để tự phát `vessel:overflow`, đồng thời chuyển vị trí puddle sang chân bình. Một vết đổ trên bàn cạnh bình không chứng minh rằng nước đã đi qua miệng bình đó.

Nguồn [NIOSH — Sulfuric acid](https://www.cdc.gov/niosh/npg/npgd0577.html) xác nhận tương tác với nước có thể tỏa nhiệt mạnh; nguồn này không cung cấp model ejected-liquid rate, projectile speed hay xác suất phun bắn cho mọi dilution state. Việc controller chưa có hydrodynamic/local-phase closure không cho phép nó lấy một boiling flag làm bằng chứng định lượng cho vụ bắn axit. Bỏ suy diễn đó không phải khẳng định rằng hiện tượng không thể xảy ra ngoài thực tế.

## Controller quan sát, source vật chất có chủ sở hữu riêng

`WaterIntoConcH2so4ExplosionController` giữ internal ID/aliases để không làm hỏng dữ liệu program, nhưng không tự emit acid:splatter, particle burst hay impulse. Nó đọc T hiện tại và cập nhật lifetime hiển thị; không tự cấp heat, gas hoặc liquid source. Thermal ledger/boiling/mist hiện có tiếp tục sở hữu nhiệt và hơi thực.

Liquid pour, finite overflow và shatter inventory vẫn có đường presentation của riêng chúng. Các glyph bắn giọt không được dùng làm nguồn tạo persistent spill lần nữa.

## Đúng bình, đúng receipt

`addSpill(pos, volume_ml, substances, color, sourceName?, actualMass_g?, contents?, vesselId?)` là **receipt/deposition API**, không phải lệnh lấy chất lỏng từ một bình:

- Không có vesselId: đặt ground spill đúng x/z đã cho, không tìm bình gần nhất và không phát wall overflow.
- Có ID bình còn nguyên: finite-overflow caller chỉ định receiver; puddle/cascade dùng đúng receiver đó.
- ID đã mất hoặc bình vỡ: vẫn giữ vật chất deposition hợp lệ nhưng không phát rim overflow của một bình không còn chứa nó.

Các caller finite dose/stock/transport đang cung cấp receipt thật giữ nguyên debit/accept/spill ledger. API công khai `effects.forVessel(targetId).doseLiquid(sourceId, volume_ml)` vẫn là đường dùng để gọi tràn trên một bình có sẵn; không tạo thêm apparatus. `addSpill` không được tự debit bình lần hai vì source đã được xử lý trước đó.

`advancePourTransport(dt)` gom overflow events trong lúc tính các arrivals rồi commit air/wall/pool/products/spill bằng cùng một store update. Sau đó mới publish các events. Listener thấy đủ vật chất đã ghi; nếu có nhiều arrivals trong một batch, callback đầu đã thấy toàn batch, không chỉ receipt đầu. Test cộng event volume theo từng store-version và so đúng phần spill tăng của version đó, thay vì ép mọi callback riêng lẻ phải bằng tổng đang publish dở.

Ví dụ gọi trên đúng bình đã có trong scene:

```ts
const eff = effects.forVessel('receiver_id');
const receipt = eff.doseLiquid('existing_source_id', 20);
// Source chỉ có thể cấp lượng thực còn trong nó; receiver nhận theo capacity.
// Phần vượt capacity đã có receipt/spill/event, không gọi addSpill lần nữa.
```

`PourController.applyArrivals` tách impact trên bàn khỏi rim overflow. Một phần stream đã vào trong receiver đầy không chứng minh chất lỏng bị bắn ngược lên: nó đi theo wall-cascade receipt. Table impact vẫn có splatter glyphs, giữ composition của discharged sample ngay cả khi nguồn vừa cạn và gắn source ID. Rate glyphs dùng spilled_ml/dt, không dùng toàn bộ lượng vừa chảy vào receiver.

## Không mặc định thêm nước để vẽ hiệu ứng

`VesselWallOverflow` chỉ nhận event đúng ID, bình chưa vỡ, volume hữu hạn >0; angle/duration khi có cũng phải hợp lệ. Thiếu volume không còn mặc định thành 5 mL. Legacy state fallback cũng kiểm tra finite volume/timestamp. Invalid event không khởi động mesh hoặc audio.

`calculateOverflowProfile(volume_ml)` giữ nguyên mọi volume dương hữu hạn, kể cả <0.05 mL. Puddle footprint vẫn tính bằng hydrostatic sessile-drop helper từ đúng volume. Invalid/empty input trả volume/footprint/counts bằng 0, không tạo profile 1 mL thay thế. `storeBridge.recordSpill` bỏ ngưỡng loại <=0.01 mL: receipt dương hữu hạn không bị xóa chỉ vì là micro-spill.

Các profile width/thickness/drip count/audio/duration vẫn là presentation presets. Chúng chưa giải discharge qua mép, film thickness theo flux, contact-line/wetting, entrainment threshold, droplet size distribution, kinetic-energy allocation hoặc end-to-end wall→ground transit. Việc sửa nguồn phát không phải bằng chứng rằng toàn bộ cascade geometry đã bảo toàn thể tích tức thời.

## Kiểm chứng

8 test mới trong `tests/overflow_source_truth.test.ts` kiểm tra ground spill không tạo overflow của bình gần, dose/cascade đúng B khi A cùng vị trí, input event không hợp lệ, legacy invalid state, micro-volume/profile/receipt, micro-event không second material sink và controller đang sôi không tự phát giọt H2SO4.

Hook harness chạy actual overflow listener/frame/geometry/audio code với Three buffers nhưng không có GPU. Các test cũ suy nguồn theo proximity được viết lại thành explicit-receiver receipt hoặc giữ ground deposition; kiểm tra real finite capacity/mass/rotation vẫn giữ. Live pour test kiểm tra actual overflow sum, không có acid eruption trong receiver và table spill vẫn giữ material identity/source ID.

Chưa có xác minh WebGL; các hạn chế động lực học nêu trên vẫn mở. Toàn mục tiêu vật lý/hóa học của hệ thống chưa hoàn tất.

Xác nhận sau thay đổi cuối: **150 file, 1707/1707 test đạt**; `npm run lint` và `npm run build` đạt. Vite còn cảnh báo chunk lớn. Source/receipt/geometry-buffer tests không thay thế xác minh hình ảnh trên GPU.
