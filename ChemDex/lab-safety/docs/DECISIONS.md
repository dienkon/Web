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

## ADR 5: Điểm vào HTML và thư mục build (P0)
Quyết định: Tạm giữ cả `index.html` và `index.source.html`. `index.source.html` là nguồn chính: Vite dùng file này làm `build.rollupOptions.input`, còn middleware phát triển ánh xạ các URL gốc sang file này. `index.html` hiện được giữ để tương thích với cách đóng gói/host cũ; không được xem là đầu ra build.

Lý do: Hợp nhất hai file ở P0 sẽ chạm vào middleware và quy trình host đang hoạt động, vượt phạm vi “không đổi tính năng”. Mọi bundle sinh ra chỉ nằm trong `dist/`; thư mục `assets/` ở gốc là đầu ra cũ và bị loại khỏi Git. Có thể hợp nhất entry trong một ADR riêng sau khi kiểm thử đường dẫn deploy tĩnh và đường dẫn `/lab-safety/`.

## ADR 6: Phiên bản Node (P0)
Quyết định: Pin Node.js 22 LTS bằng `.nvmrc`.

Lý do: Node 22 là nhánh LTS phù hợp cho CI và được Vite 6/TypeScript 5.8 hỗ trợ. Baseline P0 được chạy cục bộ bằng Node 26.7.0; vì vậy cần chạy lại `npm ci`, lint và build trên Node 22 trước khi phát hành.
