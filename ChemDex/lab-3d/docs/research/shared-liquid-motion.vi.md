# Dòng chất lỏng chung cho bọt và kết tủa

## Lỗi được sửa

Trước vòng này, bọt nhận100% prescribed convection, còn kết tủa chỉ nhận40%. Một hạt có thời gian đáp ứng tiến về0 vì vậy vẫn trượt giả so với chất lỏng. Khi khuấy, hệ còn giảm terminal settling speed theo agitation, tới85% ở agitation1, dù kích thước/khối lượng riêng/độ nhớt không đổi. Bọt không được xoay theo khuấy nhưng thermal glyph birth rate lại tự tăng tối đa40% dù vapor source giữ nguyên.

Nay hai hệ dùng `LiquidMotionSystem.sampleVelocity` làm carrier. Kết tủa nhận đủ vận tốc carrier, cộng terminal gravitational slip độc lập; agitation không sửa gravity/settling law. Khuấy tạo một trường xoay tiếp tuyến có biên kín thay vì tác động bằng giảm lắng. Cùng source vapor/reaction rate không tăng số birth chỉ do bật khuấy.

## Cơ sở và giới hạn của lực cản

[COMSOL, Particle Motion in a Fluid](https://doc.comsol.com/6.4/doc/com.comsol.help.particle/particle_ug_fluid_flow.08.36.html) phân biệt particle velocity, local carrier velocity, lực cản và trọng lực có buoyancy. Giới hạn Stokes dùng thời gian đáp ứng phụ thuộc bán kính vật lý và độ nhớt. [OpenFOAM Schiller–Naumann](https://cpp.openfoam.org/v12/SchillerNaumann_8C_source.html) cung cấp drag correction theo relative Reynolds number. Hai nguồn này hỗ trợ việc giữ carrier advection riêng với gravitational slip; không phải nguồn cho trường xoay minh họa bên dưới.

Ứng dụng tiếp tục dùng equivalent sphere settling, physical-radius response time, frozen drag multiplier theo slip của đầu bước và analytic constant-target response. Tracer response ngắn phải tiến về `v_particle = u_carrier + v_slip`, không phải0.4*u_carrier. Với Re hữu hạn, dùng frozen drag/terminal target vẫn là approximation; chưa có full nonlinear integration, added mass, history force, wall correction hoặc drag theo shape của gel/flakes.

## Hàm carrier và trường khuấy

`LiquidMotionSystem.sampleVelocity(x,y,z,params): [vx,vy,vz]` nhận scene coordinates và `ConvectionCurrentParams` hiện có, thêm optional `agitation` chuẩn hóa0…1 (default0). Kết quả scene/s. Cả BoilingSystem và PrecipitationSystem truyền agitation của đúng manager vào hàm này. Fluid applicability của thermal convection vẫn giữ pure-water-reference/aqueous-water-proxy/unavailable; mechanical stirring không đòi một water-density EOS nên vẫn có thể xoay chất lỏng không hỗ trợ thermal reference.

```
u_total = u_thermal + u_swirl
s = (y-bottom)/(surface-bottom)
q = (x*x+z*z)/R(y)^2
omega_local = 1.5 * agitation * (1-q)^2 * sin(pi*s)^2
u_swirl = [-omega_local*z, 0, omega_local*x]
```

R(y) dùng đúng vessel profile; legacy cylinder dùng radius. Invalid coordinates/domain, nonfinite input, viscosity≤0, power<0 hoặc agitation ngoài0…1 không được coi là một sample hợp lệ. Ngoài cột nước/contour, không thêm swirl.

Vì u_swirl thuần azimuthal và omega_local độc lập góc, divergence bằng0 kể cả R(y) biến thiên. Dot với radial normal bằng0; envelope triệt tiêu ở thành, đáy, mặt nước. Dạng Cartesian không có phép chia r ở trục. Cộng với thermal streamfunction không nén vẫn cho field không nén. Đây là thuộc tính analytic của velocity field, không chứng minh transport timestep giữ volume chính xác vô hạn.

Hệ số1.5rad/s ở agitation1 là nominal presentation rate, **chưa** suy từ rpm, torque, kích thước que khuấy hoặc độ nhớt. Không giải spin-up/spin-down, turbulent mixing, vertical pumping hay mặt lõm vortex. Tắt input làm imposed field tắt, chưa mô hình hóa fluid momentum còn lưu. Không ghi một công suất cơ học giả vào thermal ledger. Đối lưu nhiệt vẫn có nominal amplitude của vòng trước; tổng field chưa được hiệu chuẩn vận tốc thực nghiệm.

## Tích phân vị trí kết tủa

Chỉ lấy carrier ở vị trí đầu bước làm tracer quay bị dịch dần ra ngoài do sai số Euler, dù field tiếp tuyến không có radial velocity. Vòng này dùng:

1. Tính carrier/slip và tau ở vị trí đầu bước.
2. Dự đoán deterministic half-step bằng analytic response factors, chưa thêm Brownian increment.
3. Lấy carrier ở vị trí giữa bước; cộng terminal gravitational slip theo phương đứng.
4. Dùng analytic frozen-target response cho displacement và velocity của cả bước; thêm đúng một Brownian position increment mỗi trục như trước.

Trong short-response tracer limit đây là explicit midpoint spatial advection, giảm lỗi vị trí xuống bậc hai. Với inertia/nonlinear drag/rapid spatial variation, đây vẫn là local approximation, không phải lời giải exact cho toàn field. Test constant carrier vẫn giữ nghiệm analytic của entry impulse. Không tăng số lần gọi RNG hoặc đổi khối lượng glyph để đạt hiệu ứng trộn.

## Vật chất và điều khiển theo bình

Vật chất vẫn do chemistry/phase ledger sở hữu. Bed entrainment hiện có chuyển mass từ cặn sang reservoir/lớp trộn hữu hạn; không tạo solid mới. Quy tắc entrainment còn phenomenological, chưa được suy từ shear/erosion và không được dùng để chứng minh swirl đã giải vertical suspension. Trong axisymmetric swirl isothermal, vertical carrier velocity bằng0 và hạt vẫn lắng theo slip thật.

Stirring không tự cấp vapor mass, không mở dissolved-gas reservoir hoặc thay nucleation physics. Số glyph vẫn là sampling display, không phải số bọt vật lý. Bỏ agitation birth boost chỉ loại một visual source multiplier không có dữ liệu hỗ trợ; không khẳng định khuấy không ảnh hưởng nucleation/degassing trong thí nghiệm thật.

Manager và renderer giữ per-vessel controls, source snapshots và thermal authority hiện có. Không tạo apparatus, global stir state hoặc debit vật chất lần hai. Inspect.convection tiếp tục là thermal forcing diagnostic của vòng trước; không giả làm đo tổng swirl velocity hoặc torque.

## Thời điểm sinh hạt và cặn được khuấy lên

Full-suite regression phát hiện AgBr vừa được entrain lại lắng toàn bộ trong một bước0.1s. Có hai vấn đề sampling: mọi glyph mới đều được tích phân đủdt dù sinh ở cuối bước; whole birth credits chưa dùng khi reservoir cạn còn bị giữ lại, làm một batch entrainment mới phát ngay từ đầu bước bằng credits cũ.

PrecipitationSystem nay tính crossing time của glyph clock64/s hoặc260/s từ initial fractional credit. New glyph chỉ nhận remaining time `dt−bornAt` cho age, drift, response và Brownian variance; glyph đã có nhận toàn dt. Whole attempts chưa dùng khi reservoir cạn/pool đầy không được bank thành burst; giữ fractional phase. Threshold rounding dùng32 machine eps, không đổi material cutoff. Reset/quality vẫn không tạo thêm solid.

Bed entrainment rate/mass/lift layer vẫn giữ closure cũ, không tăng độ cao hoặc giảm trọng lực để làm AgBr test đạt. Test lắng→khuấy đục→hòa tan giữ nguyên tolerance và đạt sau sửa timing. Đây là thời điểm **visual glyph sampling**, chưa phải phân giải liên tục khối lượng entrainment trong substep: source mass allocation vẫn operator-split từ finite reservoir. Brownian được lấy đúng một lần/trục với variance theo tuổi thật của glyph trong bước.

## Kiểm chứng

`tests/shared_liquid_motion.test.ts` có28 test: tangential flow/zero vertical/axis/boundaries, linear intensity, superposition thermal, unavailable-water-reference stirring, divergence và contour wall trên mọi profile, invalid input, full carrier tracer limit, settling không bị agitation giảm, actual azimuthal precipitate advection, invalid-step inventory preservation, source birth counts không bị stirring boost, control propagation tới cả hai immersed systems, circular tracer convergence ở30/60/120Hz, đúng tuổi từng particle theo birth threshold ở30/60/120Hz, và không replay whole attempts sau depleted source/quality increase. Brownian được đặt0 trong deterministic trajectory tests.

Một renderer hook integration test mới kiểm tra rod agitation0.85 chỉ tới bình đang chọn; đổi selection làm agitation của bình cũ về0 mà không tạo bình khác.

Circular test lấy angular velocity từ field tại điểm đầu, dùng rotational invariance để có nghiệm vòng tròn độc lập cho vị trí; không lấy kết quả một timestep làm truth. Error giảm trên3.3 lần khi chia đôi dt ở cả hai lần refinement, radius drift dưới3e−6scene, mass giữ nguyên. Các test response/settling/source lifecycle/geometry/clock hiện có vẫn cần đạt toàn suite. Chưa có GPU visual QA hoặc calibration trên apparatus thật; toàn mục tiêu chưa đạt.

Kết quả sau thay đổi cuối: suite160 file chạy1847 ca,1846 đạt và1 ca wall transport vượt timeout15s (15.702s), không phải conservation assertion fail. Chạy riêng lại `tests/basic_vessel_effects.test.ts` giữ timeout cũ:14/14 đạt,19.57s cho cả file. Vì vậy mọi ca đã có kết quả đạt, nhưng không ghi lần chạy toàn suite này là green hoàn toàn. TypeScript/lint, production build và diff whitespace check đạt; build còn cảnh báo chunk lớn. Timeout wall transport là giới hạn ổn định/performance cần theo dõi, không tăng timeout để che kết quả.

Cập nhật vòng sau: [wall-transport-geometry.vi.md](./wall-transport-geometry.vi.md) giảm chi phí dựng geometry lặp mà không đổi vật lý/timestep; full suite1847/1847 đạt trong86.36s, giữ timeout cũ. Baseline checkpoint comparison giữ nguyên từng bead và wall diagnostic trong kịch bản600s.

Cập nhật đồng hồ kết tủa: [precipitation-clock.vi.md](./precipitation-clock.vi.md) bỏ dt cap0.2s, giới hạn mỗi physics step1/120s và giữ FIFO backlog. Numerical midpoint refinement test dùng test subclass đổi fixedDt; runtime FPS partition invariance được kiểm tra riêng ở10/30/60/120FPS/8×. Không còn coi renderHz là numerical integration resolution.
