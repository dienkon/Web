# BÁO CÁO AUDIT TỔNG THỂ - LABORATORY SAFETY 3D
> Dự án: ChemDex / lab-safety
> Ngày thực hiện: 08/10/2026

Dưới đây là báo cáo chi tiết về toàn bộ các thay đổi kiến trúc và tính năng đã được thực hiện theo đúng 5 Sprint của Master Prompt.

## SPRINT 1 — ỔN ĐỊNH HỆ THỐNG
1. **Save/Resume & State (M03)**:
   - Thay đổi hành vi nút "Tiếp tục" và "Chơi mới" tại `StartScreen.tsx`. Thêm `window.confirm` chống ghi đè nhầm save cũ.
   - Sửa lỗi kẹt tường khi Resume bằng cách đặt vị trí spawn an toàn tùy theo currentPhase trong `useStore.ts`.
2. **Dialog & Task (M04, M07)**:
   - Sửa lỗi kẹt khi bấm Skip thoại (B03) bằng cách map đúng `dialogCallback` hoặc `GameEvent`.
   - Chặn cộng dồn `trashCount` (B05) nếu bỏ rác sai thùng. Rác sẽ trả về tay và báo lỗi hợp lệ.
3. **UI Fixes (M14, M13, M12, M06)**:
   - Gỡ bỏ giới hạn render `RuleDialog` chỉ trong `view === 'game'`, chuyển nó ra root `App.tsx` để có thể mở từ Certificate (B13).
   - Xóa bỏ tình trạng memory leak/timeout trên `ChemicalSymbolsQuiz` (B12).
   - Thiết lập fallback teacher để tránh ngắt crash nếu thiếu file `.glb` (M12).
   - Sửa stale closure (B07) cho phím tương tác `E`.

## SPRINT 2 — KIẾN TRÚC & REGISTRY
1. **Data Registry Chuẩn Hóa (M01, M08)**:
   - Xây dựng lại hoàn toàn `TaskRegistry.ts`, `PhaseRegistry.ts`, `MistakeRegistry.ts`.
   - Áp dụng Type Safety chặt chẽ với các kiểu định dạng Literal Types (`TaskId`, `PhaseId`, `MistakeId`) trong `types.ts`. Không còn `addError(ruleId: number)` lỏng lẻo.
2. **Tách LabEnvironment (M09)**:
   - Chẻ file khổng lồ `LabEnvironment.tsx` (>2200 dòng) thành các Component con (`LabEnvironmentPieces.tsx`, `LabDecorations`, v.v.).
3. **Interaction System & Player State (M06, M10)**:
   - Gom nhóm State của người chơi (equipment, inventory, flags) vào một sơ đồ dữ liệu đồng nhất, tránh tình trạng trùng lặp key (B19).
   - Loại bỏ hơn 20 `useFrame` độc lập của từng item. Chuyển sang 1 `useFrame` duy nhất tại `InteractionSystem.ts` để tối ưu CPU.

## SPRINT 3 — HIỆU NĂNG & A11Y
1. **Dynamic Performance (M11)**:
   - Tích hợp `PerformanceHUD` chạy ngầm.
   - Viết cơ chế Auto Quality: Khi FPS trung bình < 30 hoặc < 45, hệ thống sẽ tự động hạ đồ họa (`graphicsQuality` sang medium hoặc low).
   - Giới hạn Shadow Budget: Chỉ các vật thể chính (ultra/high) mới có `castShadow`. Low/potato sẽ tự động lược bỏ bóng đổ.
   - Lazy Load: Sử dụng `React.lazy` và `Suspense` cho toàn bộ các màn Quiz và Certificate để giảm bundle size ban đầu.
2. **Pause & Viewport (M15, M16)**:
   - Tạo biến `GameRunState` ('RUNNING', 'PAUSED'). Bất cứ khi nào UI Modal bật (Settings, Rules), game sẽ dừng vật lý.
   - Cập nhật thẻ `meta viewport` an toàn (`touch-action=pan-x pan-y`, bỏ chặn scale UI vô cớ).

## SPRINT 4 — CHẤT LƯỢNG ĐÀO TẠO
1. **Nội Dung An Toàn (M17)**:
   - Rà soát toàn bộ `SAFETY_RULES`.
   - Thay thế các từ quá tuyệt đối (100%, an toàn tuyệt đối, ra đúng pH=7) bằng các mệnh đề khoa học và an toàn hơn (Giảm thiểu nguy cơ, về mức gần trung tính, v.v.).
   - Phân biệt rõ loại bình chữa cháy cần tùy thuộc vào loại hóa chất thay vì quy chụp chung. Gắn cờ `reviewStatus: 'needs-review'`.
2. **Certificate Chuyên Nghiệp (M14)**:
   - ID chứng chỉ giờ đây dựa trên mã Hash (Base32) thay vì số random.
   - Lấy múi giờ Local thực (vi-VN) thay vì UTC. Đổi nút "Tải PDF" thành "In / Lưu PDF" đúng ngữ nghĩa web.
   - Thêm dòng giới hạn trách nhiệm (Disclaimer): Không thay thế đào tạo an toàn chính thức.

## SPRINT 5 — VFX VÀ MỞ RỘNG
1. **Simulation Clock & State-Derived VFX (M18)**:
   - Xây dựng Base `SimulationClock` và `ReactionProgram` (SimState).
   - Hệ thống hạt/hiệu ứng hóa học hiện nay sẽ được map 1-1 với biểu đồ nhiệt, pH, trạng thái (không gọi sự kiện thủ công như trước).
2. **Analytics (M19)**:
   - Triển khai \`AnalyticsService\` để log lại cục bộ (`localStorage`) các sự kiện: `task_completed`, `mistake`. 

## CẬP NHẬT CHUNG (M20)
- Dọn dẹp repo và tạo file `README.md` chuẩn, liệt kê cấu trúc và lệnh chạy.
- Khởi tạo thư mục `docs/DECISIONS.md` ghi nhận Architecture Decision Records (ADR).
- Các lệnh `npm run lint` và `npm run build` đã chạy pass 100% không cảnh báo type.
