# Nước đọng trên thành: trao đổi theo áp suất hơi và diện tích giọt

Runtime đã mở rộng finite-film cooling và integrated evaporation/drain enthalpy; xem [finite-wall-evaporation.vi.md](./finite-wall-evaporation.vi.md). Phần isothermal drying/boundary heat budget dưới đây mô tả phiên bản trước, không còn là nguồn latent heat của drying hiện tại.

## Bằng chứng và phạm vi sửa

Phía trong trước đây có `m*(1−exp(−dt/30))` để tự làm khô condensate, chỉ cần wallT≥bulkT. Vì vậy nước đọng vẫn mất khối lượng trong không khí bão hòa cùng nhiệt độ, và không thể khô trong dòng khí khô nếu thành lạnh hơn mẫu. Phía ngoài dùng diện tích cả phần thành kính ngang mức chất lỏng để tính lượng bay khỏi một giọt cũ. Cùng giọt đó có thể khô với tốc độ khác chỉ vì lượng nước trong bình thay đổi.

Mô hình mới dùng cùng closure chênh áp suất hơi đã có cho condensation/evaporation, với diện tích mặt cong của đúng giọt nước hữu hạn. Không tạo apparatus, không lấy lại nước từ bulk theo số particle. Chưa giải đầy đủ nhiệt độ kính, frost hoặc retained headspace equilibrium.

## Cơ sở và các giả định

[ASHRAE — Psychrometrics](https://handbook.ashrae.org/handbooks/f17/si/F17_Ch01/f17_ch01_si.aspx) liên hệ RH với áp suất riêng phần và trạng thái bão hòa. [NOAA — Hydrologic cycle](https://www.noaa.gov/jetstream/atmosphere/hydro) mô tả dewpoint, condensation và nhiệt trao đổi khi chuyển pha. Các nguồn này hỗ trợ điều kiện cân bằng/chiều chuyển pha; không cung cấp hệ số truyền khối hoặc contact angle của apparatus trong ứng dụng.

Code tiếp tục dùng flux danh nghĩa:

```text
j = 1000 hm [p_sat(T_wall) − p_water,gas] / (Rv T_film)    g/(m² s)
T_film = (T_wall + T_gas)/2 + 273.15                     K
hm = 0.002 + 0.006 sqrt(airSpeed)                        m/s (nominal)
```

j>0 cho phép bay hơi; j=0 không chuyển khối lượng; j<0 cho phép bắt hơi hữu hạn vào thành. Hai áp suất dùng cùng nhiệt độ quy đổi, nên chênh nhiệt gas/wall không tự tạo một flux khi hai áp suất riêng phần đã bằng nhau. Không có Stefan-flow, diffusion shielding, Kelvin curvature hoặc dữ liệu wetting được hiệu chuẩn.

## Giọt co theo khối lượng thật

`wallDropCap(mass_g)` bổ sung `surfaceArea_m2 = 2π R h`, là diện tích mặt nước–khí của spherical cap. Đây không phải diện tích footprint tiếp xúc kính. Góc tiếp xúc70° và mật độ1000kg/m³ vẫn là giả định cũ. Khi giữ góc/mật độ, A(m)=A(1g)m^(2/3), nên:

```text
dm/dt = −j A(1g) m^(2/3)
m_final^(1/3) = max[0, m_initial^(1/3) − j A(1g) dt / 3]
```

`wallDropEvaporationG(mass_g, flux_g_m2_s, dt)` trả lượng gram đã bay theo nghiệm trên; không thể lớn hơn mass ban đầu. Hiệu hai lập phương được tính theo dạng tích để không mất độ chính xác khi lượng bay rất nhỏ. Nghiệm này chính xác cho flux không đổi và fixed contact angle, chưa phải nghiệm diffusion/thermal đầy đủ của một giọt thật.

`transportWallBeads(options)` nhận thêm `evaporationFlux_g_m2_s`. Nếu được cung cấp, trường này thay request aggregate `evaporated_g`: từng bead dùng diện tích/khối lượng của nó trong substep và ghi actual evaporated mass. Không có flux thì đường aggregate cũ vẫn giữ contract cho caller khác. Runtime wall condensation dùng đường flux cho cả hai mặt.

Drainage/contact diễn ra trước evaporation. Inner bead chạm receiving pool nhưng chưa được nhận vì bình đầy không trở thành exposed source; nó không mất nước vào headspace thêm lần nữa. Bead chưa chạm pool vẫn có thể bay hơi. Coalescence/motion tiếp tục bảo toàn mass/centroid theo closure hiện có; không wrap giọt trở lên miệng bình.

Metadata bead phải khớp actual wall inventory theo sai số tương đối64 machine eps, không dùng absolute tolerance1e-10g. Nếu state cũ không khớp hoặc có bead NaN/invalid, các representative sites được dựng lại từ actual mass; không để dữ liệu giọt cũ tạo thêm nước chỉ vì cả hai lượng đều rất nhỏ.

## Chọn áp suất headspace và routing

- Caller có `headspaceWaterPressure_Pa`: dùng đúng giá trị, kể cả0 cho dòng khí khô; không đổi0 thành fallback RH. Bắt hơi vẫn bị giới hạn bởi incoming vapor inventory.
- Caller trực tiếp chưa có pressure nhưng cung cấp vapor dương: giữ giả định saturated incoming stream theo bulkT như đường compatibility cũ. Khi không có stream, open headspace dùng RH của room boundary.
- `routeWaterVaporToWall()` phân biệt stream mol dương với không có stream. Không có emitted vapor không đồng nghĩa với headspace có p_water=0. Nếu có non-water reaction gas mới mà chưa có water, stream có thể khô dù room RH cao.
- Sealed inner không dùng open-headspace drying. Exterior vẫn có thể trao đổi với room boundary. Subzero wall không bị biến thành liquid frost giả.

Ngoài thành, condensation trên vùng đủ điều kiện vẫn dùng wall region đã có; evaporation của giọt tồn tại dùng diện tích mặt nước thật kể cả sau khi mức nước bulk hạ. Chưa mở rộng ambient condensation lên toàn vùng kính lạnh hoặc giải ventilation/headspace vapor storage. Một stream pressure cố định trong call vẫn là boundary closure, chưa phải nghiệm gas residence-time/finite carrier capacity.

Actual inner drying đi vào shared vapor mass/enthalpy/temperature packet và có thể tới condenser/exhaust. Outer drying đi vào ambient sink riêng. Không tăng chemical water source hoặc bulk thermal emission chỉ vì một giọt đọng khô đi. Một residual rất nhỏ vẫn có inventory/energy thật; không dùng cutoff hiển thị để xóa nó hoặc replay cả packet hóa học cũ.

## API chẩn đoán và cân bằng nhiệt hiện tại

`WallCondensationState` bổ sung:

| Trường | Ý nghĩa |
|---|---|
| massTransferModel | pressure-driven-cap |
| innerGasWaterPressure_Pa | Áp suất riêng phần boundary dùng cho lần gọi |
| innerEvaporationFlux_g_m2_s | Flux bay hơi dương ở inner boundary |
| outerEvaporationFlux_g_m2_s | Flux bay hơi dương ở room boundary |
| innerMassTransferEvaporated_g | Tổng inner water thực sự bay theo mass-transfer path |
| outerMassTransferEvaporated_g | Tổng outer water thực sự bay theo mass-transfer path |

Các counter này khác wall thermal-boiling counters. `effects.forVessel(id).inspect().state.wall` đọc các trường; inspect không sinh bình hoặc thay mẫu. Các flux là input boundary của bước gần nhất, không phải giá trị nội suy theo không gian.

Enthalpy của drying vẫn theo local liquid reference Cp*T+L(T). Inner drying giữ boundary nhiệt isothermal trong mass-transfer segment: latent work được ghi ở `heatRejected_J` âm, tức năng lượng lấy từ boundary phòng; outgoing sensible và lost film sensible đóng cùng ngân sách. Outer latent share tiếp tục debit/credit bulk theo đường đã có. Đây là limitation rõ ràng: finite wet-film sensible/boiling coupling và drying chưa được giải đồng thời thành wet-bulb/temperature field. Không tuyên bố film có thể lấy latent heat vô hạn trong một hệ kín hoặc rằng áp suất/RH đã có full thermal calibration.

## Sửa thêm lỗi shader có bằng chứng đặc tả

Audit presentation phát hiện descending `smoothstep(edge0,edge1,x)` trong fog top fade, smoke, flame body/core và liquid mixing radius. [Khronos — smoothstep](https://github.com/KhronosGroup/OpenGL-Refpages/blob/main/gl4/smoothstep.xml) quy định kết quả không xác định khi edge0≥edge1. Sáu chỗ được đổi thành `1−smoothstep(low,high,x)`; liquid radius có guard dương trước khi gọi. Không đổi source heat/mass hoặc tham số màu/geometry. Đây là sửa contract GLSL, chưa thay thế kiểm tra ảnh trên GPU.

## Kiểm chứng

12 test mới đối chiếu micro-inventory/malformed bead reconciliation, shrinking-cap analytic/subdivision, actual bead transport, finite drainage/evaporation, submerged blocked bead, exact zero tại saturation, RH dependence, cold-wall/dry-gas sign, outer drop độc lập fill area, no-stream background versus dry reaction stream, mass/enthalpy routing, sealed-inner/outer separation và live-store/inspect đúng ID.

Hai test cũ bỏ giả định mọi bước sau phản ứng phải có nguồn hơi bằng0: giọt đã ngưng tụ có thể khô trong room air chưa bão hòa. Các test vẫn kiểm tra gross chemical source không replay, actual inventory mới đủ cấp outgoing mass/energy, và residual không bị bỏ đi bằng tolerance/cutoff giả. Test hình ảnh WebGL chưa thực hiện.

Sau thay đổi cuối: **154 file, 1750/1750 test đạt**, TypeScript/lint và production build đạt. Vite còn cảnh báo chunk lớn; chưa xác minh render/ảnh GPU.
