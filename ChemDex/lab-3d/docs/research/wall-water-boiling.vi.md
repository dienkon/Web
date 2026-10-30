# Nước đọng trên thành: sôi hữu hạn, cạn và đúng đường thoát hơi

## Vấn đề và cơ sở

Vòng finite-wet-wall trước giữ được nhiệt dung và cân bằng film/sample/air trong miền nước lỏng. Tuy nhiên kính nóng hơn điểm sôi làm cả coupling bị đánh dấu unsupported; legacy wall approximation còn có thể gán nhiệt độ trên điểm sôi cho nước đọng. Nước đang nằm trên kính nóng cần nhận nhiệt, đạt điểm sôi, dùng nhiệt ẩn để mất khối lượng và ngừng phát hơi sau khi đã hết nước.

[MIT — Control volume conservation](https://web.mit.edu/16.unified/www/FALL/thermodynamics/notes/node19.html) nêu năng lượng đi cùng vật chất qua biên. Nhiệt ẩn tiếp tục dùng [IAPWS supplementary saturation release](https://iapws.org/technical-guidance/release/Supp-sat), cùng mốc h_liquid=Cp*T và Cp=4.184 J/(g K) của solver hiện có. Kết quả dưới đây là lumped pure-water closure; các điện trở/footprint vẫn nominal, không phải dữ liệu sôi bề mặt đã hiệu chuẩn.

## Pure solver `stepWallWaterPhase`

File `src/science/wallWaterPhase.ts` nhận:

```
{ dt, mass_g, temperature_c, boiling_c,
  sample_c, air_c, sample_W_K, air_W_K, allowBoiling }
```

Nhiệt độ boundary và conductances giữ cố định trong một segment. Mẫu thật không phải reservoir vô hạn: engine bên ngoài tìm end temperature sao cho khớp heat packet của bulk hữu hạn.

1. **Sensible warming/cooling:** C=m*Cp, G=Gs+Ga, Teq=(Gs*Ts+Ga*Ta)/G. Giải exponential tới hết bước hoặc tới sự kiện T=Tb. Mean T lấy tích phân exponential để tính riêng Q_sample và Q_air.
2. **Boiling plateau:** khi T=Tb và `q_net=Gs*(Ts-Tb)+Ga*(Ta-Tb)>0`, lượng mất `dm=min(m, q_net*remaining/L(Tb))`. Mẫu và không khí cấp/nhận phần heat có dấu riêng; outgoing vapor H=dm*(Cp*Tb+L). Khối lượng film giảm, không debit lại nước bulk.
3. **Dryout:** sau khi m=0, không còn film để hút nhiệt ẩn. Trong phần dt còn lại, conductance nối tiếp Gs*Ga/(Gs+Ga) truyền trực tiếp giữa sample và air. Đường này thay phần dry baseline tương ứng, không thêm một đường cooling thứ hai.

Nếu film cũ bị lưu ở T>Tb, solver thư giãn superheat đã có trong stored sensible energy: dm=m*Cp*(Told-Tb)/L, bị chặn bởi m. Đây là xử lý state đầu vào của closure cân bằng, không phải mô phỏng nucleation/metastability. Năng lượng stored đó cấp latent, không tạo thêm một heat packet. Nếu đủ làm cạn hoàn toàn, enthalpy dư đi cùng vapor packet thay vì mất năng lượng.

Solver trả remaining mass/T, evaporated mass, outgoing enthalpy, heat từ từng boundary, stored sensible change, dry duration và valid/reason. Các ca invalid trả không transfer; không clip mass rồi lấy nhiệt từ một nguồn vô hạn.

Bất biến của một node:

```
Q_sample + Q_air = Δ(m*Cp*T_film) + H_vapor_out
```

Boiling point lấy theo áp suất môi trường, L tại chính Tb. Bulk rất nóng không đòi tra saturation tại nhiệt độ kính: nước đọng giữ plateau ở Tb khi còn sôi.

## Ghép vào runtime

`wallThermalPaths` cho phép boundary sample/air nóng hơn điểm sôi khi film còn là nước trong miền được biểu diễn. Film cũ subzero hoặc từ critical trở lên vẫn unavailable. Không thêm glass capacity lần hai.

`stepWetWallThermal` dùng pure node thay sensible-only segment. Branch không chuyển pha vẫn giải analytic với finite bulk heat capacity; phase events đi qua bracketed bulk/thermal-solver coupling. Heat từ body có thể làm body nguội thật. Bead mass giảm theo cùng tỷ lệ với lượng film đã hóa hơi; không để bead còn nước sau khi ledger đã cạn.

Sau khi tính node:

- **Mặt trong:** trả `innerVapor_g` và `innerVaporEnergy_J` cho `routeWaterVaporToWall`. Chúng trộn vào fresh water source mass/enthalpy trước wall recovery, condenser và external exhaust. Đây là nguồn từ retained wall pool; không tăng `evaporated_ml` của bulk.
- **Mặt ngoài:** tăng actual `ambientReleased_g` và outgoing energy meter riêng. Hơi này đã ở phía phòng, không được chuyển vào sinh hàn nối với đầu khí trong bình.
- **Bình kín:** chưa có retained steam/energy/pressure closure để cho phép vent của film trong. Khi inner node đòi boiling, giữ mass/T của nó, giữ phần baseline cooling của nó và ghi unsupported. Outer node vẫn được trao đổi nhiệt/sôi độc lập; credit chỉ dùng phần dry path thật sự được thay. Không vì sealed inner mà làm mất nước/heat ở exterior.

Với sealed inner unsupported và outer vẫn xử lý, `thermalStatus='partial-sealed-boiling'`. Chỉ inner unsupported: `unsupported-sealed-boiling`. Các branch được giải có `finite-liquid`, `finite-boiling` hoặc `finite-dryout`. Trạng thái này không chứng nhận gas network hoặc frost đã được giải.

Các trường thêm trong `wallCondensation`:

| Trường | Ý nghĩa |
| --- | --- |
| innerThermalEvaporated_g | Cumulative mass sôi/flash từ pool trong |
| innerThermalVaporEnergy_J | Cumulative outgoing enthalpy tương ứng |
| outerThermalEvaporated_g | Cumulative mass sôi/flash từ pool ngoài |
| outerThermalVaporEnergy_J | Cumulative outgoing enthalpy ngoài, không phải condenser input |

`filmSensibleEnergyChange_J` nay gồm cả stored sensible change do mass rời trong thermal-phase segment; bead drainage/ambient mass transport sau segment vẫn phải được audit qua enthalpy riêng. `filmHeatFromSample_J`, `filmHeatFromAir_J`, `dryHeatReplaced_J` và heat counters cũ giữ dấu/ý nghĩa nguồn nhiệt đã công bố. Đọc bằng `effects.forVessel(id).inspect().state.wall`; không tạo vessel mới.

## Kiểm chứng và giới hạn

14 test mới trong `tests/wall_water_boiling.test.ts`: plateau theo finite heat, warming event time độc lập, cooling khi net heat âm, dryout + phần dry resistance còn lại, stored-superheat relaxation, áp suất khác, partition 1/10/60/120, invalid/sealed input, finite body + hai outgoing packets, inner-only condenser routing, sealed inner retention, outer hoạt động khi inner unavailable và live-store mass conservation/IDs.

Test condensate-return cũ được cập nhật vì giờ một phần film superheated có thể flash **trước** khi chảy về mẫu. Không còn giả định toàn bộ 1 g đều trở về ở T algebraic cũ. Test thay bằng cân bằng stored bulk + retained film + outgoing vapor + heat rejected theo đúng nguồn đầu, đồng thời giữ kiểm tra tổng mass qua các bước. Chênh mass còn lại cỡ 1e-16 g do inverse saturation/roundoff được cộng vào inventory, không xóa bằng cutoff và không phát lại một nguồn 1 g.

Conductance và contact footprint giữ cố định trong mỗi segment, cập nhật giữa các bước. Coupling finite body là implicit/operator splitting bậc một; chỉ pure constant-boundary segment có partition invariance qua các sự kiện. Chưa giải glass inertia, nucleate-boiling/critical-heat-flux/Leidenfrost/contact-area evolution trong segment, frost, retained sealed steam, full EOS/mixtures, headspace residence/pressure network hay WebGL. Kết quả là bước tiến thực trong mass/energy/phase routing, chưa đủ kết luận toàn bộ hệ đúng vật lý tuyệt đối.

Xác nhận sau thay đổi cuối: **148 file, 1685/1685 test đạt**; `npm run lint` và `npm run build` đạt. Vite còn cảnh báo chunk lớn; WebGL chưa xác minh.
