# Hoạt độ nước, sôi khi nồng độ thay đổi và độ tan NaCl

## Vấn đề đã sửa

Đường cũ lấy cả nước đá làm dung môi, đặt sàn 1 g nước, dùng hệ số phân ly ước lượng rồi chặn tăng điểm sôi ở 18°C. Trong một gói nhiệt, dung môi đã bay đi nhưng điểm sôi vẫn giữ theo nồng độ đầu bước. Một predicate khác tính cả muối rắn chưa tan vào giới hạn dung dịch loãng, khiến nước có muối rắn ngừng bay hơi hoàn toàn.

Mô hình mới dùng đúng khối lượng H2O lỏng và số mol chất tan có phase aq. Đá, muối rắn và khí không phải hạt chất tan. Hỗn hợp có chất bay hơi khác, chất chưa nhận dạng, phase chưa rõ hoặc quá miền nồng độ trả về trạng thái chưa hỗ trợ; không dùng điểm sôi nước tinh khiết để xóa dung môi.

## Cơ sở và miền áp dụng

[IUPAC Gold Book — Raoult](https://goldbook.iupac.org/terms/view/15349) định nghĩa theo fugacity. Code dùng xấp xỉ hơi lý tưởng: p_water = a_water p_sat(T), với a_water = n_water / (n_water + tổng số mol hạt chất tan). Các số 2, 3, 4, 5 là số hạt khi phân ly lý tưởng hoàn toàn, không phải hệ số đo thực nghiệm. Điểm sôi được tìm bằng inverse p_sat(P/a_water), dùng đường bão hòa nước IAPWS đã có.

[OpenStax — Colligative properties](https://openstax.org/books/chemistry-2e/pages/11-4-colligative-properties) phân biệt số hạt lý tưởng và giá trị quan sát. Cách tính này chưa có hệ số hoạt độ ion, ion pairing, hệ số fugacity hoặc áp suất Poynting. Mốc 5% khối lượng chất tan là miền vận hành thận trọng được giữ từ hệ thống, **không chứng nhận độ chính xác thực nghiệm cho mọi muối dưới 5%**. Đạo hàm giới hạn loãng của chính closure này là Kb = P M_water / (1000 dp_sat/dT); không ép một hằng số 0.512 ở mọi áp suất.

## API và ngân sách trong một bước

- `aqueousWaterBoundary(vessel)` trong `src/science/aqueousWaterBoundary.ts`: water_g, solute_g, particle_mol, pressure_Pa, activity, boiling_c, model/reason, minimumSupportedWater_g; `activityAt(waterMass_g)` và `boilingAt(waterMass_g)` đánh giá trạng thái trong miền caller cho phép. Trường model phân biệt pure-water, ideal-dilute-nonvolatile, water-reference và unavailable.
- `aqueousBoilingPoint(vessel)` là wrapper; trường hợp unavailable trả NaN. `effects.forVessel(id).inspect()` chuyển sang null để UI không hiển thị một số nhiệt độ giả; có thêm waterActivity, boilingPointModel và waterActivityLimit.
- `boilDiluteSolution({water_g, particle_mol, capacity_J_K, pressure_Pa, availableHeat_J, maxEvaporated_g})` trả valid, evaporated_g, temperature_c, latentEnergy_J, vaporSensibleEnergy_J, heatUsed_J, remainingHeat_J và limited. Invalid hoặc chưa hội tụ không commit một phần khối lượng.
- `waterMassFluxG_M2_S(..., activity=1)` dùng p_surface = activity p_sat(T). Film nước tinh khiết tiếp tục dùng activity=1. Bulk flux vẫn là closure truyền khối đã có, chưa giải diffusion/hydrodynamics theo không gian.

Đặt e là số gram nước đã bay khỏi mẫu, C(e)=C0−Cp e và Tb(e)=inverse_p_sat[P(1+S M_water/(w0−e))], S là mol hạt tan được giữ lại. Khi đang sôi:

```text
dQ/de = L(Tb(e)) + C(e) dTb/de
H_out = integral [Cp Tb(e) + L(Tb(e))] de
Q = delta[C T] + H_out
```

Hạng C dTb/de làm nóng phần dung dịch còn lại khi nồng độ tăng; không được cấp toàn bộ Q cho nhiệt ẩn rồi nâng Tb miễn phí. Solver dùng adaptive Gauss 8/4 và nghiệm khối lượng có bracket. Một gói nhiệt lớn và nhiều gói nhỏ được so độc lập bằng tích phân midpoint outgoing enthalpy.

Khi dung dịch chạm mốc 5%, giữ lại lượng nước ở biên, ghi phần nhiệt chưa giải vào `thermalEnergyOutsideModel_J`, và đặt `thermalModelLimit`. Không biến nhiệt dư thành nhiệt độ dung dịch rất cao hoặc tiếp tục bốc hết nước bằng hệ số ngoại suy. Mẫu đã ngoài miền ngay từ đầu vẫn có đáp ứng sensible danh nghĩa theo Cp cũ; đó **chưa phải** mô hình nhiệt dung/VLE được hiệu chuẩn. `SimulationEngine` giữ chẩn đoán model limit và năng lượng ngoài miền khi trả kết quả.

Gas do phản ứng có nguồn riêng: VLE của mẫu chưa hỗ trợ không được xóa bọt phản ứng hoặc hơi nước hóa học đã được ledger tạo ra. Reference enthalpy của gaseous H2O dùng nước tinh khiết ở áp suất vận hành khi không có nhiệt độ phát ra đã đo. Đây là reference routing; không tuyên bố đã giải cân bằng của axit đậm đặc.

Gọi trên bình có sẵn, với `targetId` lấy từ selection/store:

```ts
const fx = effects.forVessel(targetId);
const heating = fx.setHeatInput(120); // W; trả ok/code/message và handle khi thành công
const status = fx.inspect();
// status.state: activity, boiling model, model limit và năng lượng ngoài miền
// Khi người dùng ngắt nguồn:
if (heating.ok && heating.handle) fx.stop(heating.handle);
```

Nhiệt được tích phân bởi simulation tick của đúng bình. Inspect và handle không tạo bình mới. Tắt nguồn không đặt nhiệt độ mẫu về 25°C hoặc xóa hơi đang tồn tại; nguồn đã bị thay thế sẽ từ chối stale handle.

## Độ tan NaCl theo nhiệt độ

[IUPAC Technical Report 2022, Eq. 11 và Table 5](https://doi.org/10.1515/pac-2021-1002) cung cấp tương quan NaCl–H2O. `sodiumChlorideSolubilityRatio(T_c)` trả g NaCl / g nước; không dùng 100 mL dung dịch làm mẫu số. Đặt T theo kelvin:

```text
f(T) = 4473.5/T + 33.9515 ln(T) − 0.08580 T − 189.763 + 3.92063e−5 T²
y = exp[f(T)/2]
m = y / [2 × 0.01801528 × (1−y)]       mol/kg nước
ratio = 58.44 m / 1000                 g/g nước
```

Ứng dụng giới hạn 0–100°C, không ngoại suy nhánh hydrate dưới 0°C. Tại 25°C tương quan cho khoảng 35.9677 g/100 g nước; con số 36 trước đây là số làm tròn. Test đối chiếu molality bảng IUPAC tại 275, 300, 350 và 370 K, không chỉ gọi lại chính hàm để tạo expected.

`partitionSodiumChloride(vessel, dt, stirred)` dùng ratio tại nhiệt độ hiện tại, giữ tổng mol/mass NaCl khi chuyển s↔aq. Vì vậy một lượng bay hơi khiến nhiệt độ lệch 25°C rất nhỏ không còn làm hòa tan dừng hẳn. Tốc độ relaxation 0.25/s và hệ số khuấy/nghiền vẫn là minh họa; chưa có đo kinetics, nhiệt hòa tan, co thể tích, hydrate, pressure correction hoặc common-ion SLE. Hỗn hợp có chất khác, filter cake, ngoài miền hoặc không có dung môi vẫn bị từ chối.

## Kiểm chứng và việc còn mở

Các ca mới kiểm tra scale invariance dưới 1 g, phân biệt phase, áp suất/hoạt độ, RH=activity, conservation khối lượng/enthalpy, subdivision, concentration boundary, chemical steam/reaction bubbles và live-store giữ nguyên vessel ID. Test hòa tan tích hợp kiểm tra tổng muối và khối lượng nước đã bay/hoàn lưu, thay vì ép sample mass luôn 150 g dù có nước đã thoát.

Chưa có dữ liệu VLE dung dịch đậm đặc, real ionic activity, nhiệt dung/enthalpy trộn thực nghiệm, retained closed steam, frost hoặc WebGL visual QA. Hiệu ứng vẫn cần được hiệu chuẩn hình ảnh và thực nghiệm; test số học không chứng minh toàn hệ thống đạt độ chân thật tuyệt đối.
