# Bọt: đúng nguồn hiển thị, áp suất cục bộ và tuổi thọ dưới mặt nước

## Bằng chứng và phạm vi

Audit tìm thấy shared spawnTimer cộng cả credit hơi lẫn khí phản ứng rồi chọn nhãn bằng random. Hai xung nhỏ chưa đủ một glyph ở từng nguồn có thể bị gộp thành một bọt mang nhãn một nguồn khác. Bọt còn gas còn bị xóa khi life≥maxLife, mặc định4.5s, dù chưa tới mặt nước và chưa có dissolution model. Phase relaxation dùng điều kiện bulkT<ambientTb nên bỏ hydrostatic/Laplace subcooling ở độ sâu khi bulk đã chạm điểm sôi khí quyển.

Các sửa dưới đây dành cho representative visual packets. Chưa có full gas holdup/material mass trong từng bubble, measured nucleation hoặc gas dissolution; không đổi glyph count thành một kết quả số lượng bọt thực nghiệm.

## Cơ sở vật lý

[UT Austin — Spherical Interfaces](https://farside.ph.utexas.edu/teaching/336L/Fluidhtml/node42.html) trình bày pressure jump2σ/R cho một liquid/gas interface. [Prosperetti — Vapor Bubbles](https://doi.org/10.1146/annurev-fluid-010816-060221) phân biệt dynamics của vapor bubble và bubble có permanent gas, cùng vai trò heat/mass diffusion. Các nguồn này không cung cấp số glyph/g, radius distribution hoặc dissolution time cho scene.

Mechanical pressure vẫn dùng:

```text
P_external = P_atm + rho g depth
P_inside = P_external + 2 sigma/R
K_total = P_external R³ + 2 sigma R²
p_water = K_vapor/R³
```

Tại cùng bulk temperature, depth và curvature vẫn làm p_water cao hơn p_sat(Tbulk), nên ambient Tb không đủ để quyết định có condensation hay không. Runtime gọi phase solver cho mọi packet còn vapor; chính partial-pressure test quyết định có chuyển pha. Undersaturated packet vẫn không mất hơi.

## Mixed-gas equilibrium ở gần điểm sôi

Giữ K_noncondensable và yêu cầu p_water=p_sat tại endpoint:

```text
f(R) = (P_external−p_sat)R³ + 2 sigma R² − K_noncondensable = 0
```

Code cũ yêu cầu P_external>p_sat rồi gọi mechanical-radius helper với pressure difference. Điều kiện này bỏ các capillary roots có thể tới bằng condensation khi hai áp suất bằng nhau hoặc p_sat hơi cao hơn P_external.

Trong một state đang condense, f(0)=−K_noncondensable<0 và f(R_initial)=K_vapor−p_sat*R_initial³>0. Vì vậy [0,R_initial] đã bracket nghiệm nhỏ có thể tới khi bubble co lại. Solver mới chia đôi48 bước trên bracket đó, không đưa pressure âm vào mechanical helper và không suy một growing/metastable branch ngoài trajectory. Tại P_external=p_sat, nghiệm giảm về sqrt(K_noncondensable/(2sigma)) nếu sigma>0.

Pure vapor vẫn có thể co về zero. Noncondensable component không bị debit bởi condensation. R² conduction closure, constant thermal conductivity và prescribed gas/bulk temperature vẫn là mô hình giảm bậc từ vòng trước; chưa giải Rayleigh–Plesset đầy đủ hoặc thermal/diffusion boundary layer. Latent/mass values của packet này không được credit lại bulk vì nó là glyph proxy, không phải material gas inventory đã debit lần hai.

## Hai kênh sampling và giới hạn công việc

`BoilingSystem.update(dt, params)` giữ snapshot queue/fixed substep1/120s và work limit240 như trước. Trong substep:

- Thermal visual rate vẫn yêu cầu actual vaporRate_g_s>0 và active boiling stage, rồi qua nominal presentation mapping/stage cap.
- reactionGasRate là display glyphs/s do gas-visual projection cung cấp; không phải mol/s.
- Mỗi nguồn có fractional credit riêng. Chỉ nguồn đó vượt một glyph mới được sinh packet mang nhãn của nó; phần hơi chưa đủ glyph không trở thành khí không ngưng khi reaction pulse đến sau.
- Nếu cả hai có birth threshold trong cùng substep, sắp theo thời điểm threshold của từng channel. Không dùng random để chọn nguồn. Shape/location stochastic sampling và coalescence vẫn có closure của riêng chúng.
- Threshold nằm vài ulp dưới1 được xử lý theo tolerance32 machine eps của fractional credit, tránh mất một integer pulse do floating point. Đây là sampling tolerance, không phải mass cutoff.
- Khi pool đầy, bỏ unsampled whole-glyph attempts; không giữ chúng làm một burst về sau khi source đã tắt. Integer attempt count được tính trực tiếp rồi chỉ lặp tới available quality slots, không chạy vòng while cho hàng tỷ glyph không thể vẽ.

Reset xóa cả credits/counters và history của instance. Cross-vessel state tiếp tục độc lập. Invalid/negative source rates hoặc normalized agitation/intensity ngoài miền không được chấp nhận như một physics step.

## Lifetime và lý do packet có thể biến mất

Không còn underwater removal theo life/maxLife. `life` là tuổi tích lũy; `maxLife` chỉ còn legacy presentation hint. Packet có thể kết thúc khi vapor thật sự đã về zero trong phase model, surface pop hoàn tất, coalescence vào packet khác, geometry không còn hợp lệ hoặc explicit reset/shatter.

Điều này **không** khẳng định một20µm gas bubble trong nước thật luôn sống lâu hơn4.5s. Dissolution cần dissolved concentration, diffusion/solubility và noncondensable inventory của liquid; các state đó chưa được giải. Một timer không có sink tương ứng không được dùng thay dissolution. Surface film drainage/pop timing và jet ejecta vẫn là presentation closures chưa hiệu chuẩn.

## API và inspect

`BoilingSystem.sourceSampling` trả snapshot:

| Trường | Nghĩa |
|---|---|
| model | source-separated-visual-glyphs |
| vaporGlyphsBorn | cumulative actual vapor glyph births sau quality limit |
| reactionGlyphsBorn | cumulative actual reaction glyph births sau quality limit |
| vaporFractionalCredit | phần sampling chưa đủ một glyph của nguồn hơi |
| reactionFractionalCredit | phần sampling chưa đủ một glyph của nguồn phản ứng |
| activeGlyphs | glyph đang giữ, kể cả surface-pop phase |
| activeMixedGlyphs | glyph có cả vapor và noncondensable sau coalescence |

`effects.forVessel(id).inspect().state.bubbleVisualSampling` đọc snapshot của manager đã có. Nếu chưa có manager thì null; inspect dùng findManager, không tạo manager hoặc apparatus. Các số này không có đơn vị mol/g và không phải số bubble vật lý đã thoát ra khỏi mẫu. Material gas/steam mass, outgoing enthalpy và condensation recovery vẫn do ledger/routing hiện có sở hữu.

## Kiểm chứng và phần còn mở

12 test mới kiểm tra fractional-source isolation, exact integral counts ở30/60/120Hz, cutoff/reset, extreme finite input rate với pool nhỏ, không delayed burst sau quality saturation, capillary roots ở p_sat=P_external và p_sat>P_external, undersaturation, local condensation tại ambientTb, underwater no-timer removal, actual pure-vapor collapse và inspect đúngID không tạo manager.

Test Boyle/coalescence cũ dùng noncondensable gas cho assertion K không đổi; pure steam có thể ngưng tụ ở local pressure nên không còn được dùng để chứng minh một quá trình không chuyển pha. Các test mechanical conservation, component K/T, seeded30/60/120Hz events/positions, source snapshot queue và acoustic restrictions vẫn giữ yêu cầu.

Chưa có measured nucleation-size distribution, representative packet weights/gas holdup, dissolved-gas transport, thermal growth fed by bottom superheat, gas-specific acoustics đầy đủ, spatial flow/CHF/film rupture hoặc GPU visual QA. Số glyph và radius distribution vẫn nominal. Toàn mục tiêu chưa đạt.

Sau thay đổi cuối: **157 file, 1793/1793 test đạt**, TypeScript/lint, production build và diff whitespace check đạt. Vite còn cảnh báo chunk lớn; hình ảnh GPU chưa được xác minh.
