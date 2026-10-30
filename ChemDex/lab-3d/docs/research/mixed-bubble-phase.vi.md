# Bọt hỗn hợp: thành phần khí, Laplace và ngưng tụ

Runtime hiện có source-separated sampling, local-pressure phase relaxation và reachable capillary equilibrium kể cả khi P_external≤p_sat; xem [bubble-source-lifecycle.vi.md](./bubble-source-lifecycle.vi.md). Điều kiện P_external>p_sat trong phần mô tả phiên bản đầu dưới đây đã được mở rộng; gas dissolution/full holdup vẫn chưa được giải.

## Lỗi xác nhận

`BoilingSystem` trước đây chỉ giữ `source='vapor'|'reaction'`. Coalescence cộng proxy khí nhưng giữ nhãn của bọt đứng trước. Nếu nhãn đó là vapor, nhánh xẹp ngẫu nhiên 5/s có thể xóa luôn khí không ngưng của bọt phản ứng đã nhập vào. Chuyển động/coalescence trong một vòng lặp còn làm bọt được nhập bỏ qua update của chính nó. Accumulator dùng params mới nhất cho toàn bộ thời gian chờ nên có thể bỏ mất một xung nguồn ngắn.

Đã thay bằng inventory hai thành phần, xử lý pha/chuyển động trước khi gộp và lịch snapshot đầu vào. Đây là nâng cấp vật lý của **packet hiển thị**, không phải hoàn tất mô hình gas holdup và cân bằng pha toàn bình.

## Inventory và nhiệt độ

`vaporPV_scene3_Pa` và `noncondensablePV_scene3_Pa` lưu `K_i=P_i r_scene³`; `gasPV_scene3_Pa` là tổng. Nhãn nguồn nay có thêm `mixed`, được suy từ hai thành phần. `K_i/T_K` tỷ lệ với số mol; khi đổi đơn vị SI phải nhân K với `METERS_PER_SCENE_UNIT³`. Muốn lấy `P_i V` thật cần thêm hệ số `4π/3`.

`synchronizeBubbleGas` chuyển packet legacy thành một thành phần theo nhãn cũ và đặt nhiệt độ khí bằng nhiệt độ bulk được cấp. Nó scale K theo kelvin, giữ K/T. Thành phần không rõ nhãn được coi là không ngưng thay vì tự nhận là hơi nước. Đây là giả thiết cân bằng nhiệt tức thời khí–bulk, chưa giải nhiệt bên trong từng bọt.

`mergeBubbleGas` gộp từng thành phần ở cùng nhiệt độ, giữ từng K/T và đánh dấu packet thứ hai đã nhập. Tọa độ/vận tốc dùng centroid có trọng số gas content, chưa phải nghiệm bảo toàn động lượng của bọt biến dạng + chất lỏng xung quanh. Tất cả packet được xử lý pha và di chuyển tới cùng mốc substep trước coalescence; không bỏ qua update của neighbour. Collision dùng bán kính cơ học, không dùng glyph đã thu nhỏ để tránh kính. Nhập khi footprint khí chạm nhau là ideal coalescence; chưa giải drainage/màng ngăn hoặc xác suất coalescence phụ thuộc surfactant.

## Cân bằng cơ học

`bubbleMechanicalRadius(K, P_external, sigma)` giải:

```
P_external R³ + 2 sigma R² = K_total
P_inside = P_external + 2 sigma/R
```

P_external gồm khí quyển và hydrostatic. Đây là một interface khí–lỏng, không dùng hệ số 4 của soap bubble hai mặt. Sigma=0 trả nghiệm Boyle; sigma>0 dùng chia đôi 40 bước cho các kích thước lab đang xét. Birth pressure cũng gồm Laplace nên bán kính sinh ra nhất quán với proxy nguồn. Sau coalescence, áp suất/bán kính được tính lại tại centroid mới. Lực cản và glyph containment tiếp tục dùng bán kính vật lý/hiển thị riêng.

## Ngưng tụ giới hạn truyền nhiệt

`condenseBubbleVapor(gas, P_external, sigma, T_liquid, dt, k=0.6, L=2256000)` nhận K theo SI và nhiệt độ Celsius. `saturationTemperatureC` đảo đường IAPWS để lấy nhiệt độ interface theo **áp suất riêng phần nước** `K_v/R³`, không theo tổng áp suất khí.

Chỉ có condensation khi partial pressure lớn hơn áp suất bão hòa ở bulk. Hỗn hợp chưa quá bão hòa không bị ép mất hơi; hàm cũng không tự tăng hơi khi thiếu nguồn latent/mass đã debit. Với khí không ngưng, giới hạn cuối dùng:

```
(P_external − P_sat_bulk) R_eq³ + 2 sigma R_eq² = K_noncondensable
K_vapor_eq = P_sat_bulk R_eq³
```

Nhánh này đòi P_external>P_sat_bulk; không suy thêm các nghiệm metastable gần sôi nếu điều kiện đó không đạt. Pure vapor có thể về zero; noncondensable không bị trừ trong bất kỳ bước condensation nào.

Closure truyền nhiệt lấy giới hạn dẫn nhiệt cầu tĩnh Nu=2: `Qdot=4π k R ΔT`, với k cố định đại diện 0.6 W/(m K) và L=2256 kJ/kg. Đây **không phải** tính chất k(T)/L(T) đầy đủ hoặc correlation đối lưu được hiệu chuẩn. Từ cân bằng latent và phương trình cơ học, bước đóng băng ΔT cho:

```
d(R²)/dt = −2 k ΔT / (rho_effective L)
rho_effective = (P_external + 4 sigma/(3R)) / (Rv T_gas_K)
```

Update chặn ở R_eq để không đi quá giới hạn partial-pressure, không tạo bán kính âm. Sigma=0 và pure vapor ở P/T không đổi cho đúng R² law của closure này. Khối lượng vapor mất được đổi từ ΔK bằng EOS và `4π/3`; `latentHeat_J` trả ra là kiểm toán **cho packet lý tưởng đó**.

Live renderer không cộng lượng nước/nhiệt packet này vào `VesselState`: packet count/radius là ánh xạ hiển thị, chưa phải toàn inventory khí vật lý. Nguồn nước và ngân sách nhiệt thật vẫn thuộc thermal/water routing. Cộng kết quả packet vào ledger lần nữa sẽ đếm đôi. Để có phase-change/holdup toàn bình thật, cần thay ánh xạ packet bằng inventory có trọng số và kết nối đầy đủ nhiệt/khối lượng.

Các packet sôi được cấp từ nguồn vapor thật ở nhiệt độ sôi không được tự xẹp chỉ vì nucleation superheat chưa được giải. Nhánh giảm hơi này chạy khi bulk dưới `boilingPoint_c` do engine cấp; không giả ra profile nhiệt đáy. Chất tan/hoạt độ nước, khí hòa tan, hạn chế khuếch tán do lớp khí không ngưng, transient thermal layer, dao động Rayleigh–Plesset và phản hồi latent vào từng vùng lỏng chưa được giải.

## Thời gian và vòng đời

`BoilingSystem.update` giữ queue params theo thời gian, clone world position và chia tại ranh giới snapshot khi cần. Mốc xử lý 1/120 s, tối đa 240 mốc/lần; không xóa backlog. `acceptedTime_s`, `integratedTime_s`, `pendingTime_s` cho phép đối chiếu. dt không hợp lệ/zero không tiến thời gian hoặc drain. Một pulse ngắn hơn mốc vẫn được dùng trước snapshot zero-source tiếp theo.

Seeded nguồn và sự kiện gợn tiếp tục có ID bình. Phase, motion, merge, surface/burst là các lượt tách biệt. Lifetime/pool là giới hạn glyph, không phải một phản ứng tiêu thụ khí. Pop margin, âm thanh và điều kiện tiếp xúc mặt chưa được coi là mô hình màng vật lý hoàn chỉnh.

## Bằng chứng

18 test mới trong `tests/bubble_phase_inventory.test.ts`: Laplace/zero-sigma/inverse saturation; R² law và latent/mass của packet; subcooling; residual noncondensable + equilibrium vapor; undersaturation; dt hỏng; K/T qua đổi nhiệt và gộp; live cool-down mixed/pure; mỗi collision partner được xử lý cùng thời điểm và mỗi phase step đúng một lần; pulse nhỏ/queue snapshot; backlog/pause.

Test proxy cũ đổi từ `P_hydro*r³` sang `(P_hydro+2sigma/R)*R³`; vẫn yêu cầu bảo toàn gas content khi gộp. Test bọt seeded ở 30/60/120 Hz và test glyph containment/drag hiện có cũng được chạy lại. Chưa có ảnh WebGL xác nhận và chưa đối chiếu tốc độ condensation với thí nghiệm cho từng điều kiện cụ thể.

## Nguồn đối chiếu

- [University of Guelph — Pressure, density and surface tension](https://www.physics.uoguelph.ca/study-guide-13-pressure-denisty-and-surface-tension): chênh áp 2gamma/r cho mỗi interface, phân biệt với soap bubble hai mặt.
- [Experimental study on air–steam bubble condensation in subcooled water](https://www.sciencedirect.com/science/article/abs/pii/S0735193322006923): đo ảnh hưởng subcooling và phần khí không ngưng; không dùng làm bằng chứng closure Nu=2 của dự án đã khớp thí nghiệm.
- [MOOSE/INL HeatConduction — sphere tests](https://mooseframework.inl.gov/docs/PRs/33206/site/source/kernels/HeatConduction.html): dạng dẫn nhiệt hình cầu. R² update ở trên là phép suy giảm từ các giả thiết đã nêu, không phải correlation thực nghiệm được lấy từ nguồn này.
