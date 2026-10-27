# Hơi ngưng tụ làm giọt ấm lên: tách nước đọng và kính khô

## Bằng chứng và phạm vi sửa

Drying trước đã lấy nhiệt từ finite film, nhưng chiều condensation vẫn gửi toàn bộ heat release ra phòng hoặc vào bulk. Hơi bám lên nước đọng có thể làm khối lượng tăng mà không tăng nhiệt độ giọt; ngược lại, dùng một nhiệt độ giọt để đại diện cả kính trống có thể làm toàn vùng kính ngừng bắt hơi khi chỉ một giọt đã ấm lên.

Runtime mới tách hai diện tích và hai chủ sở hữu nhiệt: nước đọng có heat capacity hữu hạn; kính khô giữ **isothermal boundary approximation** đã có. Không thêm một glass heat capacity thứ hai cạnh33.2J/K của bulk. Finite glass inertia vẫn chưa được giải, nên thay đổi này không chứng minh mọi thành bình thực đã được hiệu chuẩn.

## Cơ sở và mô hình

[NIST — Condensation](https://www.nist.gov/publications/condensation-chapter-15) mô tả heat release khi vapor chuyển sang liquid và điều kiện bề mặt lạnh hơn equilibrium temperature. [ASHRAE — Mass Transfer](https://handbook.ashrae.org/handbooks/F17/SI/F17_Ch06/f17_ch06_si.aspx) trình bày simultaneous sensible/latent heat transfer khi condensation và mối liên hệ với dewpoint. Các tài liệu hỗ trợ nguyên lý; không cung cấp hm, contact angle hoặc thermal resistance đã đo cho mesh/apparatus của app.

Wet segment giữ nguồn enthalpy h_in (J/g) của packet đến. Với M0 gram nước ban đầu ở T0 và m gram đã ngưng:

```text
(M0+m) Cp T(m) = M0 Cp T0 + m h_in
T(m) = T0 + m (h_in−Cp T0) / [Cp(M0+m)]
dm/dt = A_water max[0, −j(T(m), T_gas, p_water,gas)]
```

j là pressure-driven flux có dấu đã dùng cho evaporation, g/(m²s). Cp vẫn4.184J/(gK). Khi giọt ấm lên, p_sat(T) tăng và condensation giảm. Nếu h_in>Cp*T_dew, finite adiabatic thermal capacity cho giới hạn:

```text
m_dew = M0 Cp (T_dew−T0) / (h_in−Cp T_dew)
```

Một layer không có heat sink không được tăng khối lượng vô hạn ở nhiệt độ cũ. `condenseWallFilm()` giải scalar normalized mass bằng adaptive RK4 step doubling, giữ exact enthalpy mixing tại endpoint. Nguồn hữu hạn có thể hết trước dewpoint; khi chứng minh lower bound flux đủ dùng hết nguồn thì không tích phân phần stream tưởng tượng còn lại. Domain/numerical failure giữ nguyên nguồn/inventory.

Pure helper không tự nucleate nếu M0=0. Nucleation trên kính khô thuộc phần boundary riêng trong transport; không dùng một khối lượng nước sàn giả để làm heat capacity.

## Diện tích nước và phần kính chưa phủ

Mỗi120Hz transport substep lấy water/gas area là tổng curved spherical-cap area của các giọt exposed. Footprint π*r_contact² thay phần kính đã bị phủ. Dry area là max(0, regionArea−footprintSum), chỉ trừ footprint ở trong region. Diện tích nước cong khác diện tích tiếp xúc kính; chưa giải diffusion shielding/overlap hoặc spatial gas boundary layer.

- Wet condensation chỉ phân bổ mass cho các giọt exposed đã tồn tại, theo diện tích mặt nước của chúng. Không tạo microdroplet mới ở một site đang khô chỉ vì một giọt khác lớn lên.
- Dry condensation có thể nucleate ở các representative sites và cấp liquid sensible enthalpy Cp*m*T_dry vào node nước. Phần m*(h_in−Cp*T_dry) đi vào boundary heat ledger rõ ràng.
- Liquid deposition được mix theo enthalpy, rồi dry capture và wet condensation cập nhật node trước contact/drain; sau đó finite evaporative cooling và motion/coalescence tiếp tục giữ actual return receipts. Không dùng một preset mass growth hoặc countdown thay flux.
- Dry và wet cùng dùng một `availableVapor_g`; dry capture được xử lý trước trong substep, wet nhận phần còn lại. Không mỗi route tự lấy cả packet. Đây là operator splitting; test refine time kiểm tra convergence khi collection area đổi vì giọt lớn lên.

Cold droplet có thể tiếp tục ngưng tụ trên thành khô ấm hơn dewpoint; vùng kính ấm đó không bị gán nhiệt độ của giọt. Ngược lại, một giọt đã ấm không làm kính khô lạnh ở vùng khác mất khả năng nucleate. Inner beads chạm receiving pool không trở thành một exposed capture/evaporation source thêm lần nữa.

## API cụ thể

`condenseWallFilm({mass_g, temperature_c, area_m2, dt, boundary, vaporSpecificEnthalpy_J_g, availableVapor_g?})` trong `src/science/wallFilmCondensation.ts`:

- boundary: gasTemperature_c, waterPressure_Pa và airSpeed_m_s.
- availableVapor_g bỏ trống nghĩa là open reservoir, dùng cho room boundary; inner source luôn truyền mass hữu hạn.
- output: valid, condensed_g, temperature_c, receivedVaporEnergy_J và reason. reason phân biệt no-condensation, vapor-inventory, dewpoint, none hoặc unsupported/dewpoint/enthalpy limit.

`transportWallBeads()` nhận `condensationBoundary`: các gas properties trên, regionArea_m2, dryWallTemperature_c, vaporSpecificEnthalpy_J_g và optional availableVapor_g. Output thêm condensed_g, wetCondensed_g, dryCondensed_g, condensationReceivedEnergy_J, condensationBoundaryHeat_J và condensationThermalLimit. Các partial stage chỉ sửa bản sao state; caller nhận actual inventory sau cả transport.

`stepWallCondensation()` nhận thêm `source.dryWallTemperatures` (innerWall_c/outerWall_c). Các nhiệt độ này dành cho bare-glass boundary, không phải film temperature. Nếu chưa cung cấp, explicit `wallTemperatures` giữ contract áp dụng chung; nếu cả hai thiếu, dry glass dùng nominal resistance proxy, còn wet film giữ T hữu hạn có sẵn.

`routeWaterVaporToWall()` cung cấp wet temperatures đã giải từ `stepWetWallThermal` và dry proxy riêng. Điều này không ghi heat-storage credit mới cho kính, cũng không biến một film nguội thành nhiệt độ toàn kính. Model vẫn cần finite glass node và hiệu chuẩn trước khi có thể mô tả apparatus thật đầy đủ.

## Energy ownership và counters

Đối với cả transport segment:

```text
U_film,final + H_drained + H_evaporated + Q_dry_boundary
  = U_film,initial + H_captured_vapor + H_explicit_liquid_deposition
```

Wet vapor enthalpy được giữ trong film storage/mass, không phát latent credit vào bulk hoặc room lần nữa. Sau đó finite conduction mới chuyển heat sang sample/air theo network hiện có. Inner dry-boundary heat tiếp tục vào heatRejected_J; outer dry-boundary heat tiếp tục vào sample heat handoff. Đây là boundary giả định isothermal của dry glass, chưa phải glass inertia được giải.

Ambient vapor incoming enthalpy dùng Cp*T_air+L(T_air), được ghi riêng; không coi L(T_wall) một mình là toàn bộ incoming vapor enthalpy. Thermal packets có energy ledger giữ nguyên h_in; chemical/legacy packets vẫn dùng source-temperature estimate có label đã có. Nguồn room mở khác sealed retained-gas inventory; không tự vent sealed inner để tạo condensation effect.

Wall state bổ sung:

| Trường | Đơn vị/ý nghĩa |
|---|---|
| condensationModel | finite-wet-caps/isothermal-dry-glass |
| innerDryGlass_c, outerDryGlass_c | °C, bare-glass boundary trong bước gần nhất |
| innerWetCondensed_g, outerWetCondensed_g | cumulative capture trên nước đọng |
| innerDryCondensed_g, outerDryCondensed_g | cumulative nucleation/capture trên bare glass |
| innerCondensationEnergyReceived_J | cumulative enthalpy từ inner vapor packet đã capture |
| ambientCondensationEnergyReceived_J | cumulative enthalpy từ room vapor đã capture |
| innerCondensationLimit, outerCondensationLimit | trạng thái ngoài miền/chưa hội tụ nếu có |

`effects.forVessel(id).inspect().state.wall` đọc các fields này trên đúng apparatus đang có. Không tạo bình mới và không lấy chemical steam lịch sử làm nguồn mới. Existing evaporation energy, weighted return enthalpy và outer drainage counters vẫn giữ nghĩa riêng.

## Kiểm chứng và phần chưa đạt

16 test mới gồm RK4 độc lập theo added-mass/T, finite adiabatic dewpoint limit, isothermal-flux bound, source depletion, saturation/undersaturation, time partition, micro-film, invalid data, existing-cap-only growth, dry nucleation, wet footprint, shared budget, warm dry/cold wet split, ambient wet heating không double bulk credit, composed conduction/router/inspect energy và live-store đúng ID. Actual transport được refine120/240/480Hz để kiểm tra area feedback khi giọt lớn lên; không chỉ so pure helper ở fixed area.

Test condensation cũ thay expectation toàn heat=m*L(final wall T) bằng full incoming enthalpy balance qua film, boundary và drain. Không nới tolerance bảo toàn hoặc bỏ kiểm tra saturation/finite incoming source.

Chưa có finite glass inertia, measured hm/contact angles, diffusion shielding/nucleation kinetics, simultaneous spatial conduction/condensation, retained headspace/finite carrier closure, frost hoặc GPU visual QA. Bare-glass boundary vẫn là giả định, chưa thể đánh dấu toàn mục tiêu hoàn thành.

Sau thay đổi cuối: **156 file, 1781/1781 test đạt**, TypeScript/lint, production build và diff whitespace check đạt. Vite còn cảnh báo chunk lớn; hình ảnh GPU chưa được xác minh.
