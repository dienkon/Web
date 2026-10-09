# Architecture Decisions

## ADR 1: Engine Tách Rời (Sprint 2)
Quyết định: Sử dụng các lớp thuần (PhaseEngine, ScoreEngine, MistakeRegistry) nằm ngoài Zustand để xử lý logic.
Lý do: Giảm sự cồng kềnh cho store, tách biệt logic nghiệp vụ khỏi UI.

## ADR 2: Interaction System 1-Scan (Sprint 2)
Quyết định: Chỉ sử dụng 1 \`useFrame\` duy nhất trong \`InteractionManager\` tính toán khoảng cách thay vì gắn vào từng object.
Lý do: Giải quyết overhead gọi hàm 60 lần / giây trên 20+ object.

## ADR 3: State Derived VFX (Sprint 5)
Quyết định: Hiệu ứng phản ứng (lửa, khói) không phải "phát 1 lần", mà phụ thuộc hoàn toàn vào state của \`SimState\` tại bất kỳ frame nào.
Lý do: Giúp code dễ replay, state-machine có thể khôi phục lại khi save/resume.

## ADR 4: Dynamic Performance (Sprint 3)
Quyết định: Cập nhật FPS định kỳ mỗi giây và hạ đồ họa tự động (\`graphicsQuality: auto\`) nếu liên tục thấp.
Lý do: Giữ mức 30fps ổn định tối thiểu cho thiết bị cấu hình thấp.
