# Giọt bắn không được tự tạo vật chất

## Bằng chứng và thay đổi hướng audit

Vòng cleanup trước thay code và có 13 test mới, phân loại có tiến triển. Audit tiếp bắt đầu ở proximity merge của các vũng: ngưỡng tối thiểu 0,35 scene unit và lựa chọn một neighbour vẫn chưa phải coalescence vật lý. Trong lúc truy nguồn spill đã tìm thấy lỗi nghiêm trọng hơn: `AcidSplatter` gọi `addSpill` khi glyph chạm bàn, lượng 0,35–0,8 mL nhân theo kích thước glyph và số ngẫu nhiên. Nguồn shatter/pour đã commit phần vật chất đó riêng. Mức quality quyết định số glyph nên có thể quyết định cả khối lượng mới xuất hiện trên bàn.

Một explosion còn có nhiều đường dẫn: store có thể emit cả explosion lẫn acid:splatter; renderer nghe cả hai; director dịch explosion thành acid:splatter H₂SO₄ mặc định. Vì vậy một sự kiện có thể sinh nhiều burst và sai thành phần. Renderer cũng dùng 9,8 như scene/s² thay vì m/s², raw delta và đồng hồ render, nên tiếp tục chạy khi pause và không theo timeScale. Nhãn acid tự kích hoạt tiếng sodium sizzle mà không có phản ứng xác nhận.

Đã ưu tiên sửa ranh giới vật chất này trước. Proximity merge chưa được thay ở vòng này.

## Quyền sở hữu inventory

Giọt trong `AcidSplatter` là glyph đọc dữ liệu. Chạm bàn chỉ kết thúc glyph, tạo glyph bounce và âm va chạm minh họa; không gọi store để thêm lượng chất. Shatter inventory và pour transport vẫn chịu trách nhiệm duy nhất với mass, mol, thể tích và vị trí vật chất thật. Quality/seed/số hạt không được làm thay đổi ledger.

Renderer chỉ nghe `acid:splatter`, là tên legacy của kênh giọt bắn hóa chất nói chung. Explosion riêng chỉ yêu cầu flash/shock; không chứng minh có chất lỏng bị hất ra. Director không dịch nó sang H₂SO₄ nữa. Store shatter lấy composition từ `releaseShatteredInventory`, không fallback NaOH/nước khi mẫu không có chất. Bình khô không emit liquid splatter; số glyph mẫu ướt lấy từ thể tích hữu hạn, vẫn chỉ là số glyph đại diện.

Event count=0 và speed=0 được giữ đúng thay vì dùng default bởi toán tử OR. Input âm/NaN/Infinity hoặc origin hỏng không spawn. Đã bỏ sodium sizzle tại va chạm chỉ dựa trên nhãn acid. Dung dịch acid rơi xuống bàn không tự xác nhận phản ứng sodium hay một phản ứng sinh nhiệt.

## Chuyển động

`advanceSplatterFlight` dùng đơn vị cảnh cho vị trí/vận tốc và `SCENE_GRAVITY=9,8/0,035` cho gia tốc. Nhánh bay tự do giải tích:

```
x(t)=x0+vx*t; z(t)=z0+vz*t
y(t)=y0+vy*t-g_scene*t²/2; vy(t)=vy0-g_scene*t
```

Giao với mặt bàn lấy nghiệm thời gian chạm đi xuống. Bước dài dừng đúng tại điểm chạm, không dùng vị trí overshoot để đặt bounce. Không giữ hệ số drag 0,14 nhân vận tốc cảnh chưa có nguồn/đơn vị; hiện đây là giới hạn ballistic **bỏ qua cản khí**, không phải nghiệm đầy đủ của giọt nhỏ trong không khí.

Renderer dùng `simulationFrameDt` chung với ứng dụng, dừng khi pause và theo timeScale. TABLE_SURFACE_Y lấy từ registry hình học chung. Nguồn random dùng PRNG seeded. Lịch âm dùng thời gian mô phỏng nội bộ; chưa có audio transport hoàn chỉnh ánh xạ các sự kiện catch-up sang AudioContext.

Bounce sinh ở thời gian chạm của parent và chỉ được tiến trong phần thời gian còn lại của frame. Helper bounce giải từng đoạn ballistic đến va chạm, giữ restitution=0,25 và tangentialRetention=0,6 là giả thiết trình bày có tiêu tán, không phải dữ liệu impact đã hiệu chuẩn. Chatter vi mô được kết thúc bằng tiêu tán vận tốc, không nâng glyph lên bàn mỗi frame. Không còn hiện glyph đã hết lifetime thêm một frame.

## Kiểm chứng

13 test mới trong `tests/splatter_material_boundary.test.ts`:

- SI distance, bảo toàn năng lượng ballistic, nghiệm chạm và vị trí x/z chính xác; frame partition 30/60/120 Hz; bounce không tăng năng lượng; input hỏng/rest.
- Chạy chính callback renderer với hooks/refs CPU được thay bằng harness: mọi glyph low/ultra hạ xuống không thay spills hoặc gọi addSpill; pause/timeScale; một kênh event; zero count; không sodium sound vì acid; source shatter wet/dry giữ receipt; seed lặp; renderer trajectory ở 30/60/120 Hz và thời gian sinh bounce trong frame.

Harness này không dựng WebGL, không xác nhận shader/màu/transmission hoặc chất lượng âm trên thiết bị thật. **134 file, 1526/1526 test đạt**. Lint/build được xác nhận cùng vòng; Vite còn cảnh báo chunk lớn.

## Phần còn mở

Không coi glyph là các parcel có thể tích vật lý đã phân bổ: kích thước, trail, cone, secondary breakup, opacity và volume-preserving deformation chưa được hiệu chuẩn. Chưa giải aerodynamic drag/evaporation/collision kính của giọt, We/Oh/contact angle cho impact, pinning và spreading. Một số source origin/speed vẫn là preset.

Vòng tiếp theo đã gộp source/spill và wall release của shatter trong một commit, kiểm tra cả subscriber reentry và save/load; xem [atomic-shatter.vi.md](./atomic-shatter.vi.md). Ledger arrival của một số thao tác vẫn tức thời trong khi glyph đang bay. Đây chưa phải reservoir vận chuyển thống nhất.

Proximity merge, runoff, vật tính đa pha và WebGL còn mở. Nguồn nghiên cứu coalescence vừa đối chiếu: [Sessile Microdrop Coalescence on Partial Wetting Surfaces (2019)](https://pubmed.ncbi.nlm.nih.gov/31524400/) cho thấy các giai đoạn bridge/relaxation và ảnh hưởng bề mặt; [Coalescence of immiscible sessile droplets (JFM, 2023)](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/abs/coalescence-of-immiscible-sessile-droplets-on-a-partial-wetting-surface/F2C07A5970FF791F6BCC78F20CFA14C0) nghiên cứu hình ghép nhiều pha. Không dùng các nguồn này để xác nhận luật “ở gần thì gộp” hiện có hoặc các hệ số bounce ở trên.
