# BẢNG TIẾN ĐỘ THỰC HIỆN — VIRTUAL CHEMLAB

| Task ID | Trạng thái | Mô tả | Chi tiết / Xác minh |
|---|---|---|---|
| **E-01** | `[x]` | Khởi tạo môi trường, kiểm tra git & cổng | Đã chuyển port sang 6767, dev server đang chạy và trả về 200 OK |
| **E-02** | `[x]` | Ghi thông số môi trường (Node, npm, OS) | Ghi nhận đầy đủ vào METRICS.md |
| **T-01** | `[x]` | Thiết lập Vitest test runner | Cài đặt `vitest` v5.0.3, cấu hình alias `@`, 13/13 unit tests pass |
| **B-01** | `[x]` | So khớp hóa chất chính xác (formula chuẩn hóa) | `matchesReactants` trong `chemistryEngine.ts` |
| **B-07** | `[x]` | Sửa lỗi cộng dồn & ném lỗi thể tích | Sửa triệt để trong `useAppStore.ts` & `PouringBottle.tsx` |
| **P-01** | `[x]` | Tạo `src/pour/physics/profiles.ts` | Profile hình học lòng bình cho 5 loại bình (Beaker, Flask, Cylinder, Test Tube, Reagent Bottle) |
| **P-02** | `[x]` | `segArea` tính diện tích hình viên phân | Tích phân số học chính xác cao, unit tests kiểm tra $\pi R^2$ |
| **P-03** | `[x]` | `volumeBelowPlane` tích phân mặt phẳng nghiêng | Simpson numerical integration qua các lát cắt đĩa $r(y)$ |
| **P-04** | `[x]` | `solveLevel` tính mặt thoáng nghiêng bằng bisection | Xác định cao độ mặt thoáng và clipping plane với sai số $< 10^{-4}$ |
| **P-05** | `[x]` | `retainedVolume` tính thể tích giữ lại theo θ | Bảng mẫu cache 64 điểm, đảm bảo suy giảm đơn điệu về 0 |
| **P-06** | `[x]` | `flow.ts` lưu lượng đập tràn weir, cột áp | Francis weir discharge hydraulics, kẹp an toàn $[0.15, 60]\text{ mL/s}$ |
| **P-07** | `[x]` | `teapot/wallCling` bám thành mép | Xử lý rỉ nước dọc thành ngoài khi góc nghiêng nhỏ |
| **P-08** | `[x]` | `glug` dao động lưu lượng cổ hẹp | Tần số 2–6 Hz cho chai hẹp / reagent bottle |
| **P-09** | `[x]` | `ballistics.ts` quỹ đạo & điểm rơi | Động học bay Torricelli, phân loại inside/rim/table |
| **P-10** | `[x]` | `mixing.ts` bảo toàn khối lượng, mol, nhiệt | Nhiệt dung nước $4.18\text{ J/g}\cdot\text{K}$, bảo toàn mol các chất |
| **P-11** | `[x]` | `mixColorBeerLambert` trộn màu quang học | Định luật Beer–Lambert chuẩn quang phổ hấp thụ thực tế |
| **P-12** | `[x]` | `solids.ts` vật lý chất rắn rơi, chìm/nổi, nảy | Archimedes: khối lượng (g), thể tích chiếm chỗ, Na nổi trong nước |
| **P-13** | `[x]` | `step.ts` reducer thuần cố định 1/60s | Bước thời gian cố định 60 Hz độc lập với FPS rendering |
| **P-15** | `[x]` | `PourSession` store & controller | Máy trạng thái `PourController.ts` điều khiển phiên rót |
| **P-16** | `[x]` | `store-bridge.ts` kết nối Zustand an toàn | Commit 1 lần khi kết thúc hoặc đạt ngưỡng, không thrash state |
| **P-28** | `[x]` | Input đa thiết bị: chuột, touch, bút, bàn phím | Bàn phím Q/E/Space/Esc, Touch dial xoay tròn & nút giữ xúc giác |
| **V-01** | `[x]` | `PourStream.tsx` dòng chảy 3D động | Mesh đường cong động học Torricelli parabol từ miệng rót đến đích |
| **V-05** | `[x]` | `ImpactFX.tsx` gợn sóng đồng tâm & bong bóng | VfxBus sự kiện `pour:impact` tạo hiệu ứng mặt chất lỏng tiếp nhận |
| **V-07** | `[x]` | Mặt thoáng nghiêng nằm ngang (clipping plane) | Giữ chất lỏng luôn nằm ngang theo trọng trường bất kể góc nghiêng bình |
| **A-01** | `[x]` | `PourAudio.ts` âm thanh rót vật lý | Web Audio API procedural synthesis, cao độ nâng dần theo mức đầy bình |
| **M-04** | `[x]` | Giao diện Responsive cho Tablet/Mobile | Off-canvas drawer dưới 768px, nút đóng cảm ứng, kích thước $\ge 44\text{px}$ |
| **L-01** | `[x]` | Công cụ giáo dục cho học sinh & giáo viên | Nút bấm 1-click Auto-Setup bàn thí nghiệm cho 4 bài thực hành chuẩn SGK |
| **L-02** | `[x]` | Phiếu Báo Cáo Thực Hành `LabReportModal.tsx` | Biên bản thí nghiệm chuẩn mực, tự đồng bộ số liệu bàn thí nghiệm, in ấn/PDF/Markdown |
| **L-03** | `[x]` | Bộ 10 bài thực hành chuẩn SGK THCS & THPT | Mở rộng đầy đủ: Bảo toàn khối lượng, Điều chế O2 (MnO2), Nhiệt phân Cu(OH)2, Cu + HNO3, Na + H2O |
| **L-04** | `[x]` | 1-Click Auto-Setup presets cho 10 bài học | Bày sẵn dụng cụ, hóa chất, đĩa cân điện tử, đèn cồn chuẩn hóa |
| **L-05** | `[x]` | Động học Nhiệt phân Cu(OH)2 khi đun đèn cồn | Tự động chuyển hóa kết tủa xanh sang bột đen CuO khi $T > 60^\circ\text{C}$ |
| **L-06** | `[x]` | Trợ giảng AI Chấm Điểm & Góp Ý Báo Cáo | Tích hợp Gemini 3.5 Flash Lite chấm thang điểm 10, nhận xét ưu điểm & góp ý sư phạm |
| **O-01** | `[x]` | Tối ưu 30–60 FPS: Bàn thí nghiệm & Render pass | Loại bỏ MeshReflectorMaterial, shadow map 1024, dpr cap 1.5, tắt N8AO nặng |
| **O-02** | `[x]` | Chống giật lag React: Throttling Zustand commits | Throttle tickSimulation commits về 10 Hz, PourController.notify về 20 Hz, tách rời rendering 60 FPS |
| **O-03** | `[x]` | Triệt tiêu per-frame GC trong VfxDirector | Thay thế setState trong useFrame bằng PointLight ref & pre-allocated 4-slot Shockwave pool |
| **V-08** | `[x]` | Chất lỏng dâng từ từ khi rót | Nội suy `displayedFillFraction` tốc độ vật lý kèm sóng khuấy động `uPourAgitation` |
| **V-09** | `[x]` | Sóng sánh & gợn sóng quán tính khi di chuyển bình | Hệ phương trình vi phân lò xo giảm chấn (spring-damper) tạo sóng bề mặt và nghiêng mặt thoáng |
| **V-10** | `[x]` | Chi tiết hiệu ứng Bay hơi (Steam) & Sôi (Boiling) | Bay hơi từ 48°C với lực nâng đối lưu; Sôi 98°C+ sủi bọt từ đáy, giãn nở áp suất và vỡ bọt khí |
| **V-11** | `[x]` | Khử triệt để lỗi vòng tròn dư thừa sai vị trí | `ParticlePool.init` zero-out scale cho unspawned instances, billboarding xoay theo camera, bán kính miệng bình chuẩn |
| **V-12** | `[x]` | Chuẩn hóa kích thước bọt sôi & bọt xốp | Thu nhỏ bọt ngọc li ti 0.012–0.024m, bọt xốp 0.02m, triệt tiêu vĩnh viễn các khối cầu 1.0m mặc định |
| **S-01** | `[x]` | Hệ thống Sôi & Đun nóng Đa Tầng Vật Lý | `BoilingSystem.ts`, `PhaseEngine.ts`: 5 giai đoạn nhiệt, đối lưu xoáy xao, gia tốc Archimedes, biến dạng hydrodynamic shear, coalescence hợp nhất, vỡ bọt bề mặt |
| **S-02** | `[x]` | Hệ thống Kết tủa & Lắng đọng Trọng Lực Stokes | `PrecipitationSystem.ts`, `SolubilityEngine.ts`, `SedimentMesh.tsx`: Tích số tan $K_{sp}(T)$, sa lắng Stokes, đục Tyndall động, lớp trầm tích đáy 3D thật, khuấy tái phân tán |
| **S-03** | `[x]` | Hệ thống Bay Hơi Mặt Thoáng Clausius-Clapeyron | `EvaporationSystem.ts`: Bay hơi tự nhiên từ $20^\circ\text{C}$, phụ thuộc diện tích mặt thoáng & độ ẩm, lệch luồng gió, giảm thể tích dung môi & cô đặc chất tan |
| **S-04** | `[x]` | Bảng Điều Khiển Debug Vật Lý & 8 Kịch Bản Thử Nghiệm | `SimulationDebugPanel.tsx`: HUD đo đạc thời gian thực, thanh trượt T, Q, Airflow, Agitation, nút test nhanh 8 kịch bản |
| **S-05** | `[x]` | Renderer 3D Instanced Mesh & Shader Tương Thích | `PhysicalSimulationRenderer.tsx`, `liquid.tsx`: Zero-allocation useFrame, cập nhật trực tiếp `uTurbidity` & `uBoilingIntensity`, 21/21 vitest passed |
| **R-01** | `[x]` | `KineticsEngine.ts` Động học Phản ứng Thực tế | Phản ứng hóa học diễn tiến liên tục theo phương trình Arrhenius, tiêu hao chất tham gia và sinh sản phẩm theo thời gian thực ($dt$), tính nhiệt phản ứng enthalpy và vùng trộn cục bộ |
| **R-02** | `[x]` | `PhysicalStreamRenderer.tsx` Dòng chảy Động học Parabol & Giọt bắn | Quỹ đạo rơi parabol gia tốc trọng trường, thu hẹp đường kính dòng chảy ($w \propto 1/\sqrt{v}$), ngắt giọt Rayleigh-Plateau khi lưu lượng nhỏ $< 1.2\text{ mL/s}$ với hình giọt nước thuôn dài |
| **R-03** | `[x]` | `PourController.ts` & `modes.ts` Pipeline Rót Vật lý Hoàn chỉnh | Chuỗi trạng thái liên tục: `IDLE -> LIFT -> TILT -> FLOW -> DRIP -> RETURN -> SETTLE`, cập nhật trực tiếp thể tích/khối lượng không trễ, cho phép ngắt ngang (interruptible) êm ái |
| **R-04** | `[x]` | `liquid.tsx` Tách biệt Góc nghiêng Bình & Mặt phẳng Trọng trường | Nhân quaternion nghịch đảo bình giữ mặt thoáng chất lỏng luôn nằm ngang theo $\vec{g} = (0, -1, 0)$, tích hợp shader blending vùng trộn loang màu cục bộ (`uMixingPoint`, `uMixingRadius`, `uMixingStrength`) |
| **R-05** | `[x]` | `Vessels.tsx` & `LabScene.tsx` Đồng bộ Chuyển động Rót 60 FPS | Gắn ref trực tiếp từ `PourController.getSession()`, kích hoạt quy trình rót vật lý khi kéo thả bình |
| **R-06** | `[x]` | `SimulationDebugGizmos.tsx` & `debugStore.ts` Hiển thị 3D Trực quan | Gizmo 3D hiển thị vector trọng lực, mặt phẳng ngang chất lỏng, đường cong parabol quỹ đạo rót, vòng tròn vùng trộn cục bộ và ranh giới cặn đáy |
| **R-07** | `[x]` | `SimulationDebugPanel.tsx` Nâng cấp HUD Đo đạc & Telemetry | Hiển thị FPS, Frame Time, Tốc độ dòng chảy (mL/s), Thể tích đã rót, Tiến độ phản ứng động học (%), Tốc độ sinh khí/kết tủa, Công suất tỏa nhiệt, Toggles debug 3D |
| **S-06** | `[x]` | Sửa Lỗi Chất Rắn Trong Bình Rỗng Biến Thành Chất Lỏng | `useAppStore.ts`, `liquid.tsx`: Không tăng volume_ml khi bình rỗng, kiểm tra `hasLiquidSubstance`, ẩn hoàn toàn khối chất lỏng khi chỉ có chất rắn |
| **S-07** | `[x]` | `SolidContentsRenderer.tsx` Mô Hình Hóa Chất Rắn 3D Đáy Bình | Hiển thị đống bột hình nón tự nhiên (`CaCO3`, `MnO2`, `Cu(OH)2`), các khối kim loại ánh kim (`Fe`, `Cu`, `Zn`), tinh thể muối (`NaCl`, `PbI2`), thu nhỏ khi hòa tan |
| **S-08** | `[x]` | Động Học Rót Chất Rắn Từng Cục Rơi Xuống Nước / Đáy | `PouringBottle.tsx`: 28 hạt/khối rơi gia tốc trọng trường, va chạm mặt nước tạo gợn sóng đồng tâm, lực cản nước làm chậm tốc độ chìm, bồi đắp đáy bình |
| **S-09** | `[x]` | Hiệu Ứng Kết Tủa Hiện Từ Từ Theo Thời Gian Thực | `useAppStore.ts`, `PrecipitationSystem.ts`: Tích lũy khối lượng kết tủa `precipitateAmount_g` theo đường cong động học (sigmoid), mầm hạt nở dần, đục Tyndall và sa lắng Stokes |
| **S-10** | `[x]` | Hiệu Ứng Bốc Khói / Hơi Nước Phân Tán Trên Bề Mặt Chất Lỏng | `GasPlume.tsx`, `Steam.tsx`, `EvaporationSystem.ts`, `director.tsx`: Sinh hạt phân tán khắp diện tích mặt thoáng chất lỏng, xoáy loạn lưu 3D curl turbulence, không tụ 1 chỗ |
