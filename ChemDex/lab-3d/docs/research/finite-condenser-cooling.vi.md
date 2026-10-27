# Sinh hàn: lưu lượng nước, nhiệt dung và truyền nhiệt hữu hạn

## Lỗi trong đường chạy cũ

`transferWaterCondensate` trước đây chỉ cần boolean coolingWaterActive, vapor budget và free capacity. Có thể thu cả một vapor packet mà không biết packet dài bao lâu; receiver giữ T cũ trong khi nguồn lạnh loại bỏ mọi enthalpy. Tắt van lập tức mất toàn bộ khả năng ngưng tụ dù glass còn lạnh; bật van không có flow/temperature/UA và không ghi nước đã dùng.

Đổi sang một thermal node gồm glass và nước đã thu. Nước làm mát là **dòng ngoài qua áo nước** được đo volume/mass/energy; không trộn vào chemical sample. Đây chưa phải reservoir/circuit tái tuần hoàn hữu hạn hoặc toàn bộ trường nhiệt dọc ống.

## Nguồn và mô hình

[MIT, Heat Exchangers §18.5.1](https://web.mit.edu/16.unified/www/FALL/thermodynamics/notes/node131.html) cung cấp nghiệm exponential cho một dòng qua bề mặt isothermal. Ở node temperature tức thời T, ghép với coolant capacity rate Cc=massFlow*Cp cho:

`K = Cc * [−expm1(−UA/Cc)]`, `Qcool_rate = K*(T−T_inlet)`.

UA và K đều W/K; 0≤K≤min(UA,Cc). Flow=0 hoặc UA=0 không là infinite cold sink. Inlet liquid density lấy saturation correlation IAPWS đang có, làm xấp xỉ cho nước áp suất thường; Cp coolant/bulk tiếp tục 4.184 J/g/K. Nominal glass heat capacity vẫn 33.2 J/K, chưa phải thiết bị được cân/đo/hiệu chuẩn.

Phương trình bulk cùng nguyên lý [MIT control-volume balance](https://web.mit.edu/16.unified/www/FALL/thermodynamics/notes/node19.html):

`C(t) dT/dt = r*(h_v,in−Cp*T) − K*(T−T_inlet)`, `C(t)=C0+Cp*r*t`

trong đoạn toàn lượng hơi tới có thể ngưng tụ. Enthalpy của captured stream dùng cùng reference bulk của hệ thống:

`h_v,in = Cp*T_interface + L_IAPWS(T_interface) + 1.86*(T_source−T_interface)` J/g.

Liquid reference Cp*T và vapor Cp=1.86 là reduced-model assumptions, không phải toàn bộ IAPWS enthalpy EOS. Hơi không thu không được tự làm mất mass; gas-side diffusion/axial mixing và trao đổi nhiệt sensible với phần không thu chưa được giải.

Đoạn đầy đủ có nghiệm power-law, với B=Cp*r, A=B+K:

`T_eq=(r*h_v,in+K*T_inlet)/A`,
`T(t)=T_eq+(T0−T_eq)*(C0/(C0+B*t))^(A/B)`.

Tới T_interface, nếu hơi tới nhiều hơn khả năng thải nhiệt, rate được giới hạn bởi `r_accept=K*(T_interface−T_inlet)/(h_v,in−Cp*T_interface)`. Glass/collected liquid có thể nhận nhiệt trước khi đạt ceiling, nên coolant OFF vẫn có transient condensation hữu hạn. Glass đang nóng hơn ceiling phải nguội tới đó trước khi thu hơi. Khi đầy storage thì dừng thu, coolant vẫn làm việc với node đang giữ.

Heat vào coolant được tích phân trực tiếp theo các đoạn analytic, dùng expm1/log1p và stable mean functions. Không lấy hiệu hai stored energy lớn rồi chia cho một coolant mass rất nhỏ để suy outlet temperature. `T_outlet_mean=T_inlet+Qcool/(coolantMass*Cp)` là trung bình của packet vừa tính.

## Hàm và tích hợp

- `condenserCoolingSettings(patch?)` gộp nominal defaults: 10 mL/s, inlet 20°C, jacket UA 10 W/K. Những số này là tham số giảng dạy được ghi rõ, không phải fit thực nghiệm cho mọi Liebig. `validCondenserCooling` và store actuator cùng nhận miền 0–100 mL/s, 0–90°C, 0–500 W/K; 0 có ý nghĩa vật lý.
- `stepCondenserHeatExchange({...})` nhận dt giây, finite vapor_g, remaining maxCondensate_g, source/interface T, node T/C và coolant settings. Pure analytic event solver trả mass đã thu, node T, vapor energy nhận, stored energy change, coolant heat/volume/mass/mean outlet, effective K và trạng thái. Các event gồm initial cooling, full-arrival condensation, phase-limited condensation và storage full. Không commit một partial vapor solution không hữu hạn; passive cooling và coolant throughput vẫn được tính khi riêng source packet không giải được.
- `transferWaterCondensate(vessels,vaporBudgets,dt)` bắt buộc có thời gian thực, dùng remaining source budget một lần và không tạo source/receiver mới. Jacket water chảy khi mở van ngay cả khi chưa nối hơi hoặc khi receiver đầy. Condensation còn có thể xảy ra khi tắt jacket nhờ node còn lạnh.
- Fresh `waterVaporCarrier_mol_s` cùng water budget sau wall capture được dùng để suy water partial pressure và saturation/dew-point ceiling; không đọc nhầm partial pressure lịch sử ở frame cũ. Nếu carrier metadata vắng, dùng legacy pure-water-stream approximation. Source T và local pressure bounds tiếp tục ràng ceiling; chưa giải dòng khí theo chênh áp/dọc tubing.
- Receiver hiện hỗ trợ nước lỏng và dilute nonvolatile aqueous composition theo water-surface model; mass phải có representation nhất quán. Ice/volatile/unknown receiver giữ inventory và báo unavailable; không dùng Cp nước để bịa phase transition. Vẫn ghi lượng coolant qua áo riêng, chưa giả là đã giải thermal exchange của sample ngoài miền.
- Store `setCondenserCooling(id,patch)` kiểm tra toàn patch trước commit, resolve đúng existing condenser, reject missing/wrong/locked/shattered IDs. Toggle/controls giữ trên cùng ID. Live tick truyền effectiveDt; không dùng một giây ngầm cho mọi packet.
- Inspector có flow/inlet/UA, mean outlet, signed power, cumulative coolant volume/heat; thông báo nominal calibration và cold-glass condensation khi van tắt. Nước ra trung bình chưa là inlet/outlet sensor đo từ CFD.

`condenserVaporEnergyReceived_J` ghi captured vapor enthalpy; `coolantHeatReceived_J` và legacy `condensationHeatRemoved_J` ghi heat **thực trao cho coolant**, có dấu âm nếu coolant ấm đang cấp nhiệt cho node lạnh. Chúng không còn phải bằng toàn bộ energy của vapor: một phần được lưu trong glass/nước. Step invariant:

`received vapor energy = stored node energy change + coolant heat`.

Volume/mass coolant là external jacket stream, không cộng vào sample/waste chemical ledger. Trường mới đi cùng vessel ở normal save/history checkpoints; chưa hứa crash-proof lưu mọi frame hoặc suy lại lịch sử trước khi có meters.

## Kiểm chứng và giới hạn

`condenser_heat_exchange.test.ts` đối chiếu exact cooling/effectiveness; cold-glass no-flow storage bound; saturated finite-flow rate; 1/30/60/120 packet histories qua event; disconnected/full throughput; warm-coolant signed heating; initial hot-glass cooling; tiny-flow outlet bounds; zero-UA, invalid time/numerical source; fresh diluted-vapor pressure; per-ID setting transaction; live source/wall/receiver/external water conservation khi coolant off.

Các test cũ được cập nhật dt và energy partition thật, không giữ khẳng định cũ rằng coolant OFF nghĩa là zero condensation hoặc idle jacket không dùng nước. Một fixture solute trước đây có mass=0 nhưng contents>0 được đổi thành dilute solution có solvent/mass rõ ràng rồi kiểm tra dilution ở thể tích thật.

Kết quả: **145 file, 1651/1651 test đạt** với `npm test -- --maxWorkers=1`, gồm 13 ca mới. `npm run lint` và `npm run build` đạt; Vite còn cảnh báo chunk >500 kB, Node runner có cảnh báo localStorage experimental. UI đã được nối và build, chưa có WebGL/browser QA.

Chưa có calibrated UA/nominal glass C, gas-side mass transfer, independent gas temperature/enthalpy transport, wall axial/thickness dynamics, complete VLE/activity/ice, coolant recirculation/reservoir/pressure drop hay WebGL QA. Incoming water vapor enthalpy còn suy từ source snapshot T và fresh composition, chưa là energy packet đi qua toàn gas network. Node cùng mức trộn và thermal/mass operator splitting không chứng minh toàn hệ độc lập FPS ở mọi phản ứng. Toàn mục tiêu realism vẫn mở.
