# Kế hoạch và nâng cấp toàn diện ChemDex Lab 3D — 20/11/2026

## Đợt cải tiến thao tác buret

1. Đối chiếu vị trí chân giá, cột đỡ và miệng bình với hình học mặt bàn. Dùng cùng một vị trí buret cho mô hình, căn bình, điểm xuất phát của giọt, hoàn tác và tải lại. Giữ tọa độ ngang hợp lệ của bản lưu cũ và nâng các vị trí quá thấp lên mức mặc định.
2. Kiểm tra luồng chuẩn độ từ bảng **Quan sát → Chuẩn độ**. Chọn bình mở, căn bình dưới buret và nhả một giọt. Bàn đặt bình lên mặt bàn và nâng cột buret khi miệng bình cao hơn đầu nhỏ giọt.
3. Kiểm tra kéo bằng con trỏ khi chưa thả. Giữ chân giá trong giới hạn mặt bàn và cập nhật hình ảnh ngay khi kéo. Lưu vị trí sau khi thả để tránh chụp lại trạng thái vật chất mỗi khung hình.
4. Thử hết dung dịch, nạp cùng dung dịch từ kho mô phỏng và xả vào sổ chất thải. Xác nhận các thao tác giữ nguyên bình nhận và đường cong chuẩn độ. Đóng khóa và chờ giọt đã nhả chạm bình trước khi nạp hoặc xả.

Đo khoảng hở của lỗi ban đầu từ đáy chân giá đến mặt bàn được khoảng 1,045 đơn vị cảnh ở vị trí mặc định. Sau sửa, đáy giá dùng cao độ của chính mặt bàn. Kẹp nâng theo miệng bình, còn chân giá nằm sau bình nhận.

Chrome xác nhận 18 điều kiện trong audit buret, gồm kéo trước khi thả, giữ trạng thái sau tải lại, tránh khôi phục vị trí cũ nếu đặt lại bàn khi đang kéo, giữ bảng chuẩn độ khi chọn bình hoặc khi xảy ra phản ứng, và kiểm kê dung dịch khi nạp, nhả và xả. Bộ kiểm thử dụng cụ, lắp ráp và chuyển mẫu đạt 93 ca, gồm hoàn tác khi xóa số đo của một bình.

Bản production qua thử chạm trên Chrome ở độ rộng 390 px. Bản lưu cũ giữ X/Z và sửa lại cao độ buret. Với 1.000 số đo, giao diện giữ đủ dữ liệu và một đường cong, giảm số dấu điểm SVG hiển thị từ 1.000 xuống 0.

## Phạm vi 5 giai đoạn

Bản nâng cấp hoàn thiện năm giai đoạn từ kế hoạch phát triển `lab-3d`:

1. **Giai đoạn 1 — Ổn định Working Tree & Hồi quy:**
   - Chốt đồng bộ sửa lỗi `removeVessel` trong `src/store/useAppStore.ts` (dừng ngay `reactionSimulationEngine`, `programPlayer`, `kineticsEngine`, `SimulationEngine.removeManager`, dọn `activeKinetics`/`pendingReactions`/`dissolvingSubstances`/`stirringVesselId`/`activeLitmusVesselId` và xác nhận biên nhận tiếp xúc hạt rắn kể cả khi đang tạm dừng).
   - Giữ dung sai tiếp xúc 1 µm trong `src/physical/StockWorld.ts` và hỗ trợ fixture HTML trong `server.ts`.
   - Tăng ngưỡng timeout an toàn cho bài kiểm thử hội tụ Landolt (`tests/landolt_clock.test.ts`) và bổ sung hồi quy `tests/remove_vessel_cleanup.test.ts`.

2. **Giai đoạn 2 — Vật lí Rapier Worker, Collider & Giao dịch Liên thông:**
   - `src/physical/catalog.ts`: chuẩn hóa bảng lượng giác vòng tròn đơn vị 12 chữ số thập phân (`SHELL_TRIG`, giữ đúng giá trị 0/±1 ở góc chính) để loại bỏ sai khác `Math.sin/cos` giữa các engine; rút gọn các vòng micro-bevel/vành thành dư thừa khi sinh collider vỏ rỗng (giữ nguyên toàn bộ 16-điểm midpoint integration cho khối lượng, trọng tâm và mô-men quán tính). Số collider của cốc 100 mL giảm từ **129 xuống 33** trong khi giữ nguyên `SHELL_SECTORS = 32` và độ lệch thành trong dưới 0,015 đơn vị mô hình.
   - `src/physical/PhysicsRuntime.ts`: tái sử dụng scratch `Quaternion`/`Vector3`, sàng lọc sớm theo bán kính bao ngoài trong `stepFluids()`, bảo toàn trạng thái ngủ (`sleeping`) của cụm bình–mẫu rắn khi mực dịch ổn định (chỉ đánh thức khi biến thiên mực dịch > 50 µm), và chỉnh `normalizedPredictionDistance = 0.0004 m` (0,4 mm, gấp 8 lần ngưỡng lỗi 50 µm nhưng nhỏ hơn bề dày đáy 1,0 mm của cốc 100 mL) để loại bỏ va chạm dư giữa 32 nêm thành thẳng đứng với mặt bàn.
   - `src/physical/ledgerBridge.ts`: cầu nối hai chiều giữa `VesselState` và `MatterLedger` đơn vị SI (`vesselToMatterParcels`, `createLabMatterLedger`, `applyAtomicVesselTransfer`), đảm bảo giao dịch chuyển mẫu/vũng tràn nguyên tử, bất biến nguyên tố/khối lượng và chống lặp qua biên nhận (`receipt`) khi lưu/tải lại.
   - `src/science/suspensionTransport.ts` & `src/engine/decantTransfer.ts`: bổ sung `stirredMobileSolids` (ước lượng định tính có biên theo hình thái `gel_like`/`flocculent`/`fine_powder`/`granular`/`crystalline`), trả về rỗng khi không khuấy (`stirringIntensity <= 0`, không bào mòn lớp cặn lắng) và hỗ trợ tùy chọn cuốn huyền phù khi gạn có khuấy.

3. **Giai đoạn 3 — Động học Hóa học Định lượng, Đa pha & Nhiệt động lực học:**
   - `src/science/conditions.ts` & `src/engine/advanceReaction.ts`: bổ sung `bulkAcidMassFraction` kiểm tra nồng độ khối lượng thực tế của `HNO3`/`H2SO4` khi có nước lỏng rõ ràng trong khoang `bulk` (tự chuyển nhánh `Cu + HNO3 đặc` sang `Cu + HNO3 loãng` sau khi pha loãng bằng nước, đồng thời giữ `acidGradeReferenceContents` từ baseline khi phản ứng đang chạy để quá trình tự sinh nước không làm kẹt phản ứng giữa chừng). Bổ sung `isPassivatedMetalInColdConcentratedAcid` phát hiện thụ động hóa cho `Al`, `Fe`, `Cr` rắn trong `HNO3`/`H2SO4` đặc nguội (`< 45 °C`).
   - `src/engine/thermalState.ts`: bổ sung `equilibrateSealedWaterVapor` giải cân bằng lỏng–hơi nước bình kín theo đường áp suất hơi bão hòa IAPWS `waterSaturationPressurePa(T)` với nghiệm điểm bất động có tính đến thay đổi thể tích khoảng không khi nước bay hơi/ngưng tụ, bảo toàn chặt tổng khối lượng và tổng số mol `H2O`.
   - `src/science/sulfuricDilutionEnthalpy.ts`: mô hình hàm enthalpy pha loãng tích phân/vi phân của `H2SO4(l) + n H2O(l)` ở mốc 25 °C và đánh giá nguy cơ tỏa nhiệt cục bộ khi rót nước vào axit đặc (`assessAcidDilutionOrderHazard`).
   - `src/engine/headspaceGasOxidation.ts`: mô phỏng oxy hóa bậc ba pha khí $2\text{NO}(g) + \text{O}_2(g) \to 2\text{NO}_2(g)$ tại miệng bình mở với nghiệm giải tích, bảo toàn nguyên tố N/O và khối lượng khí quyển tiêu thụ, trả về 0 khi bình kín hoặc thiếu oxy.

4. **Giai đoạn 4 — Tối ưu Bundle Size & Lazy Loading:**
   - `src/App.tsx`: chuyển `GuidedExperimentPanel`, `TitrationPanel` (kéo theo `recharts` 359 KB) và `LabReportModal` sang `React.lazy` kèm `Suspense` có điều kiện.
   - `vite.config.ts`: tách `manualChunks` thành `vendor-three`, `vendor-r3f`, `vendor-charts`, `vendor-firebase`, `vendor-motion`, `vendor-ui`, `vendor-react` và `vfx-programs`.
   - Kết quả build thực tế: chunk `App` giảm từ **894,7 KB → 511,36 KB** (-42,8%), `ErrorBoundary` giảm từ **2.021,4 KB → 1.335,34 KB** (-33,9%); `vendor-charts`, `TitrationPanel`, `GuidedExperimentPanel`, `LabReportModal` không còn tải ở frame mở đầu `/lab/`.

5. **Giai đoạn 5 — Đánh giá Thực hành Định lượng & Xuất Báo cáo:**
   - `src/engine/experimentEngine.ts`: bổ sung kiểm tra bước `MEASURE_PH`, `DISPENSE_DROP` (sai số chuẩn độ mặc định ±0,1 mL cho chế độ Thực hành/Thi thử), theo dõi vi phạm an toàn (`recordSafetyViolation`), chấm điểm tích hợp số liệu định lượng (`QuantitativeRubricMetrics`), và xuất JSON (`serializeReportCardJson`).
   - `src/components/GuidedExperimentPanel.tsx`: truyền chỉ số định lượng thực của bàn thí nghiệm (pH, nhiệt độ cực đại, chất thải đã thu, vũng tràn chưa dọn) vào phiếu điểm và thêm nút **Xuất JSON** trong hộp thoại báo cáo thi thực hành.

## Kiểm chứng thực tế

- **Benchmark CPU Rapier 20 bình / 50 mẫu rắn / 5 fixture** (`npm run physics:benchmark`, lưu tại `artifacts/upgrade-2026-11-20/runtime-cpu.json`):
  - Trước tối ưu: median **174,55 ms**, p95 **195,51 ms**, tổng 150 frame **27.464,5 ms**, `activeContacts` **1.814**.
  - Sau tối ưu: median **19,11 ms**, p95 **28,69 ms**, tổng 150 frame **3.892,0 ms**, `activeContacts` **752** (**nhanh hơn 9,1×**, nằm trong khung thời gian lô Worker 33,33 ms; đây là đo CPU Node, không phải FPS trình duyệt hoặc điện thoại thật).
- **Kiểm tra kiểu & Build:** `npm run lint` (`tsc --noEmit`) và `npm run build` đạt 0 lỗi.
- **Kiểm kê khoa học & dữ liệu:**
  - `npm run science:audit`: 149 chương trình, 48 quy tắc định lượng, 34 bài học, 18 nhánh động, 109 phương trình ion, **0 lỗi cân bằng / 0 lệch hiển thị**.
  - `npm run presets:audit`: 21 mã preset, 41 mẫu bình, **0 lỗi khối lượng**.
  - `npm run physics:audit`: 185 hồ sơ phủ đủ 6 nhóm.
  - `npm run autoplay:audit -- fe_hcl agcl_nh3 agi_na2s2o3 cac2_h2o feoh3_hcl cu_hno3_conc cu_hno3_dilute`: **7/7 đạt** (`failed: []`).
  - `tests/auto_experiment.test.ts`: **152/152 đạt** toàn danh mục tự động.
- **Kiểm chứng trình duyệt production độc lập** (Chrome headless trên `http://127.0.0.1:6767/lab/`):
  - `node scripts/auditStandaloneProduction.mjs`: `manual: true`, `automatic: true`, `paused: true`, `errors: []`, `assets: []`; xác nhận `initialChunks` chỉ tải 8 chunk lõi, không tải sớm `vendor-charts`, `TitrationPanel`, `GuidedExperimentPanel`, `LabReportModal` hay kho tra cứu lớn.
  - `node scripts/auditPhaseProduction.mjs`: `pass: true`, `errors: []`, `consoleErrors: []`, tạo và lưu mẫu nước–đá 20 mL + 5 g ở 0 °C với nhãn tiếng Việt đầy đủ.
- **Bộ kiểm thử hồi quy tổng thể (Vitest):** `npx vitest run --maxWorkers=1 --reporter=dot` đạt **3.849/3.849 kiểm thử trên 307/307 tệp** (373,52 giây, 0 lỗi), bao gồm toàn bộ 152 bài kiểm thử `auto_experiment.test.ts`, 20/20 bài `landolt_clock.test.ts`, các bài canary K1–K5, tiếp xúc hạt đang tan và 12 kiểm thử mới cho Giai đoạn 1–5.

## Giới hạn còn lại

- Các ngưỡng nồng độ khối lượng `HNO3`/`H2SO4`, ngưỡng nhiệt thụ động hóa 45 °C, hệ số cuốn huyền phù theo hình thái và đường enthalpy pha loãng `H2SO4` ở 25 °C là mô hình tham chiếu/xấp xỉ minh họa (`estimated`), chưa thay thế tính hoạt độ nhiệt động lực học ở nồng độ cao hoặc số đo phòng thí nghiệm.
- Nhánh **Thiết lập → Vật lí** vẫn giữ tắt mặc định vì cần thêm kiểm chứng tương tác trên Safari/điện thoại thật, hình học va chạm chi tiết cho 24 dụng cụ phụ kiện và hợp nhất hoàn toàn vòng hóa học/nhiệt vào Worker.
- Build vẫn còn các chunk > 500 kB chủ yếu từ thư viện lõi (`ErrorBoundary`, `vendor-three`, `vendor-r3f`) và các chunk tải theo yêu cầu (WASM Rapier ~4,4 MB, kho tra cứu 1.299 phương trình ~2,5 MB).
