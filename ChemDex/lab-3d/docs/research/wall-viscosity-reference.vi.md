# Độ nhớt tham chiếu cho giọt nước trên kính

## Cơ sở và thay đổi

Wall drop motion trước đây dùng Vogel expression theo nhiệt độ, có clamp dưới0°C và không có miền hoặc model label. Bulk liquid dùng IAPWS SR6 shortcut chỉ tới110°C. Vòng này thêm một background-viscosity calculation theo nhiệt độ và mật độ, không ngoại suy shortcut tới các giọt nóng hơn110°C.

[IAPWS R12-08](https://iapws.org/public/documents/FPpx6/visc.pdf), Eqs10–12/Tables1–2, xác định tích dilute-gas factor và finite-density factor; triển khai lấy critical enhancement mu2=1. Table4 có11 điểm kiểm chứng độc lập từ298.15 tới1173.15K và density1 tới1200kg/m³. Cả11 điểm đạt tới độ chính xác số được in. Eq13 chỉ rõ vùng mà enhancement có thể vượt2%:645.91<T_K<650.77 và245.8<rho<405.3. Không được gọi background-only calculation là toàn bộ viscosity trong vùng này.

## Hàm và đơn vị

`waterBackgroundViscosity_Pa_s(temperature_K,density_kg_m3)` trả Pa.s hoặc null khi đầu vào không hợp lệ/kết quả không dương hữu hạn. Reduced T=T/647.096; reduced rho=rho/322; dilute factor và21 nonzero density terms lấy từ release. Đây là numeric correlating function, **không** là EOS hoặc kiểm tra stable pressure/phase của mọi cặp T/rho. Caller phải cung cấp thermodynamic state hợp lệ. Null không được biến thành một measured viscosity khác.

`waterViscosityNeedsCriticalEnhancement(T_K,rho)` đánh dấu open bounds Eq13. Ngoài bounds không có nghĩa enhancement chính xác bằng0; đó là simplified use của background correlation. Tại critical point viscosity thật có singular behavior, còn background có thể hữu hạn; không dùng giá trị background hữu hạn để xóa vấn đề này.

`wallDropMotion(mass_g,T_c,metric)` giữ signature, thêm kết quả:

|Trường|Nghĩa|
|---|---|
|viscosity_Pa_s|Giá trị reference đã dùng; null nếu motion không được giải|
|viscosityModel|iapws2008-saturation-reference|
|motionLimit|undefined khi closure dùng được, hoặc invalid-motion-input / unsupported-liquid-temperature / critical-enhancement-unavailable / viscosity-unavailable|
|drive_N|m_kg*9.80665/metric, thành phần trọng lực theo meridian|
|retention_N|Furmidge-style contact-angle-hysteresis closure đã có|
|speed_m_s|Quasi-steady drag balance, vẫn có nominal cap0.15m/s|

Độ nhớt wall lấy R12-08 tại saturated-liquid density từ existing IAPWS saturation helper ở cùng T, toàn miền liquid0≤T_c<373.946. Không switch correlation tại110°C. Temperature0°C tiếp tục dùng triple-point-boundary density theo quy ước saturation helper hiện có; không phải bổ sung supercooled/frost model.

Đây là **saturation reference**, không giải compressed-liquid EOS ở áp suất ngoài cộng Laplace pressure của mỗi cap. Bulk SR6 reference tại0.1MPa là một pressure approximation khác: hai giá trị gần nhau trong normal liquid range nhưng không yêu cầu bằng nhau chính xác. Các test kiểm tra agreement trong1% của shortcut ở0/25/60/100/110°C, ngoài các điểm R12 độc lập. Không dùng test agreement hai hàm nội bộ thay11 independent verification values.

## Giới hạn và vận chuyển vật chất

Invalid mass/T/metric, T dưới0°C hoặc từcritical point trở lên không sinh velocity hợp lệ. Với critical-enhancement region, không dự đoán cap motion từ background-only viscosity. Hàm giữ speed0 và báo limit; không tạo drainage sink để bỏ giọt, không thay mass thành0. Thermal evaporation/condensation tiếp tục có domains/limits và energy budget riêng. Hold là một mô hình chưa giải, **không** phải khẳng định giọt thật đứng yên tại trạng thái đó.

`transportWallBeads` thêm `motionModel` và `motionModelLimit` trong diagnostics. `stepWallCondensation` truyền `motionModel`, `innerMotionLimit`, `outerMotionLimit` vào wall state của bình hiện có. `effects.forVessel(id).inspect().state.wall` đã đọc object này nên có thể xem trực tiếp limit mà không tạo manager/bình. Limit của một transport call cho biết có substep bị giới hạn, không phải đo vận tốc cuối hoặc claim nhiệt độ film luôn ngoài miền.

Cache một nhiệt độ chính xác cùng sigma/viscosity/critical flag, không quantize, không giữ bead history hoặc chia sẻ inventory. Geometry/contact cap vẫn dùng nominal water density1000kg/m³ như wall ledger; chưa đổi shape theo thermal expansion. Contact angles, wall drag multiplier20, speed cap và pinning/coalescence vẫn chưa hiệu chuẩn. Không lấy chuẩn viscosity để khẳng định toàn drop mobility đã predictive.

## Kiểm chứng và artifact cũ

19 test mới gồm11 published points, dilute/invalid inputs, critical bounds, shortcut agreement, reference viscosity trên110°C, uncapped force balance và g chuẩn, explicit invalid/critical hold cùng cache isolation, finite bead inventory preservation/transport limit và model propagation qua wall state. Các test wall/humidity trước sửa cũng đạt; full suite còn được kiểm tra riêng.

Artifact performance trong [vòng geometry trước](./wall-transport-geometry.vi.md) là baseline của model Vogel/g9.8 cũ. Sau thay viscosity/gravity và thêm diagnostics, không yêu cầu checkpoint hash cũ giữ nguyên. Artifact đó vẫn là bằng chứng equivalence của optimization trong phiên bản vật lý trước; không dùng nó như golden output cho phiên bản mới.

Chưa có critical-enhancement solve/EOS đầy đủ, pressure-dependent drop density/volume, measured wetting/drag, full glass inertia, frost hoặc GPU visual QA. Toàn mục tiêu vẫn chưa đạt.

Kết quả bản cuối: **161 file,1866/1866 test đạt trong88.78s**, TypeScript/lint, production build và diff whitespace check đạt. Không tăng timeout long-wall test; Vite còn cảnh báo chunk lớn. Chưa có bằng chứng experimental calibration/GPU visual để nâng claim lên toàn bộ wall mobility chuẩn thực tế.
