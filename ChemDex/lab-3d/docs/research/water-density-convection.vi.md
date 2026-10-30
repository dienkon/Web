# Đối lưu theo mật độ nước: chiều dòng và giới hạn của vận tốc

## Phạm vi thay đổi

Vòng trước thống nhất môi trường theo ID bình nhưng đối lưu còn gate10K/2W, chỉ hỗ trợ dòng nóng đi lên. Vòng này bỏ gate và thay forcing bằng water-reference density contrast liên tục. Streamfunction axisymmetric đã có vẫn sở hữu hình dạng dòng, tính không nén và biên kín. Đây là bước sửa chiều/độ liên tục của một prescribed flow; chưa phải lời giải nhiệt–động lực học trong bình.

## Cơ sở dữ liệu

[IAPWS SR6-08(2011)](https://iapws.org/public/documents/fKF3T/LiquidWater.pdf), Eq.(2)/Table1 và derivative Table2, cung cấp specific volume của nước lỏng ở0.1MPa trong253.15–383.15K. Dưới điểm đông hoặc trên điểm sôi tại áp suất đó, đây là reference liquid metastable. Không ngoại suy ngoài miền. Table8 có ba điểm độc lập để kiểm chứng triển khai:

| T K | rho kg/m³ | dv/dT m³/(kg K) |
|---|---:|---:|
|260|997.068360|−3.86550941e−7|
|298.15|997.047013|2.58054178e−7|
|375|957.009710|7.94706623e−7|

`liquidWaterDensityReference(T_c)` trả density, specific volume, analytic dv/dT và hệ số giãn nở `(dv/dT)/v`. Triển khai dùng đúng biến phụ alpha=10/(593−T_K), beta=10/(T_K−232); derivative của alpha dương, của beta âm. Các test dùng bảng nguồn và finite difference độc lập. Miền được so trực tiếp trên°C, tránh trường hợp−20+273.15 làm tròn dưới253.15 một ulp; viscosity reference được sửa cùng lỗi biên này.

[IAPWS giải thích cực đại mật độ gần4°C](https://iapws.org/faqs/faq1). [Thí nghiệm đối lưu MIT](https://ocw.mit.edu/courses/12-003-atmosphere-ocean-and-climate-dynamics-fall-2008/pages/labs/lab2/) mô tả vai trò phân tầng và cấp nhiệt đáy. Phần áp dụng bên dưới là closure của ứng dụng, không phải tương quan vận tốc do hai nguồn này công bố.

## Forcing của ứng dụng

Với rho_core=rho(T_bulk), rho_wall_ref=rho(T_room), đặt

`D=(rho_wall_ref−rho_core)/rho_core`

Đây là proxy dùng roomT cho side boundary, chưa phải nhiệt độ đo được của lớp nước sát thành. D>0 quy định core đi lên, D<0 quy định core đi xuống. Nhờ vậy warm40/room25 lên ở tâm, cold5/room25 xuống ở tâm, nhưng cold0/room4 lại lên ở tâm theo density anomaly. Cùng một envelope tạo nhánh hồi lưu đối dấu gần thành.

Đặt B_ref=thermalExpansion(25°C), B_core=thermalExpansion(T_bulk). Hai kênh nominal:

```
U_room   = 0.25 * tanh(0.0035 * D / B_ref / 0.25)
U_heater = 0.35 * tanh(0.012 * P_W * max(0,B_core) / B_ref / 0.35)
U        = (U_room + U_heater) / max(0.3, mu_mPa_s)
```

U có đơn vị scene/s sau nominal mapping; scene length lấy từ METERS_PER_SCENE_UNIT (hiện0.035m). Các hệ số0.25/0.35/0.0035/0.012 và viscosity floor0.3 giữ vai trò presentation scales, chưa hiệu chuẩn. Tanh làm giới hạn vận tốc trơn; không có threshold10°C hoặc2W. Hai kênh có thể đối nhau, không ép mọi heating/cooling thành dòng lên. Tốc độ tối đa theo magnitude không quá0.6/max(0.3,mu).

`max(0,B_core)` là giả thiết **linearized** cho đun từ đáy: expansion âm không tự tạo một heater-driven overturning cell. Đây không phải dự đoán nước2°C sẽ không bao giờ đối lưu khi đun50W. Nếu lớp sát đáy đã nóng qua cực đại mật độ, một cell có thể xuất hiện dù bulk vẫn lạnh; hệ hiện chưa có local bottomT để giải trường hợp đó. Không có critical Rayleigh, wall/floor temperature field, momentum diffusion hoặc calibrated onset. Với near-equilibrium signed room contrast, mô hình vẫn cho dòng rất nhỏ liên tục; điều này không chứng minh mọi chênh nhiệt nhỏ đều gây overturning trong bình thật.

## API và applicability

| Hàm/trường | Ý nghĩa |
|---|---|
|`liquidWaterDensityReference(T_c)`|Pure function, null ngoài−20…110°C hoặc nonfinite; không sửa inventory|
|`convectionForcing(params)`|Nhận bulk/room°C, P_W≥0, mu_mPa_s>0 và optional fluidModel|
|`strength_scene_s`|Signed nominal speed để nhân streamfunction, không phải mol/g hoặc đo vận tốc thực nghiệm|
|`densityContrast`|D dimensionless; null nếu không có reference|
|`thermalExpansion_per_K`|B_core, có thể âm; null nếu reference không dùng được|
|`referencePressure_Pa`|100000Pa của correlation, không phải áp suất hiện tại của bình|
|`status`|available, fluid-unavailable, temperature-out-of-range, invalid-input|
|`fluidModel`|pure-water-reference, aqueous-water-proxy hoặc unavailable|

`suspensionFluidProperties` chọn pure-water-reference chỉ khi có water liquid rõ phase và toàn bộ liquid inventory là nước. Có solute/liquid khác cùng nước thì aqueous-water-proxy; không có nước hoặc tồn tại positive bulk inventory chưa xác định phase thì unavailable. Solids/gas/filter cake không trở thành liquid mass. Actual density vẫn là liquid inventory mass/volume; không bị thay bằng water-reference density. Proxy dung dịch không có bảo đảm đúng cực đại mật độ hoặc giãn nở khi thêm muối/dung môi khác.

Manager truyền convectionFluidModel vào cả BoilingSystem và từng PrecipitationSystem, cùng room boundary của vòng trước. Hai hệ truyền fluidModel tới ConvectionSystem; direct legacy particle callers không khai báo model vẫn dùng water reference, nên caller mới cần chỉ rõ applicability. Unknown solvent/out-of-range không được gán một water circulation giả; bubble buoyancy, sedimentation và actual material inventory vẫn có paths riêng.

ConvectionSystem memo một bộ forcing inputs chính xác và numeric speed để tránh tính lại reference cho từng glyph cùng bước. Không làm tròn nhiệt độ/công suất; memo không giữ particle/vessel history. Geometry và profile slope vẫn được xét mỗi sample; thay fluid/room/power/mu phải thay cache key.

`effects.forVessel(id).inspect().state.convection` trả chẩn đoán pure calculation của mẫu hiện tại với actual metered thermalHeatingPower_W (default0), không tạo manager/apparatus, không sửa mẫu. Đây là forcing hiện tại; không phải lịch sử snapshot của partial bubble steps đang chờ hoặc một phép đo dòng chảy.

## Kiểm chứng và phần chưa hoàn tất

12 test mới trong convection_forcing kiểm tra ba điểm IAPWS, derivative finite difference, density maximum, miền/boundary, continuous small forcing và old-gate neighborhoods, cooling/anomaly directions, stable linearized bottom heating, finite saturation/viscosity/invalid data, fluid classification/actual density, reversed continuity và memo isolation, non-allocating inspect. Hai manager integration cases mới kiểm tra model propagation cho aqueous proxy và nonwater solvent, giữ buoyancy/solid inventory.

Test volume-flux dùng Simpson quadrature thay midpoint2000 bins để truncation error không lấn tolerance khi forcing scale thay đổi; tolerance1e−7 giữ nguyên. Differential divergence và contour/no-penetration tests giữ nguyên. Không đổi field theo một test tolerance.

Chưa có resolved spatial temperature/velocity, stable-layer evolution, surface cooling cells, gas holdup/dissolution, measured speed/onset hoặc GPU visual QA. Các vật liệu chưa có transport/EOS, glass inertia, frost và headspace vẫn cần cải tiến riêng. Mục tiêu đầy đủ chưa đạt.

Sau thay đổi cuối: **159 file, 1818/1818 test đạt**, TypeScript/lint, production build và diff whitespace check đạt. Build còn cảnh báo chunk lớn. Không có bằng chứng GPU visual hoặc calibration thực nghiệm để nâng claim lên full realism.
