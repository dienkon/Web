# SỐ LIỆU ĐO LƯỜNG & THÔNG SỐ KỸ THUẬT — VIRTUAL CHEMLAB

## 1. Môi trường & Nền tảng
- **Hệ thống & Môi trường**: Windows 11, Node v20+, npm 10+
- **Framework & Công nghệ**: React 19 + Three.js r185 + @react-three/fiber + Zustand 5 + TailwindCSS v4
- **Local Dev Server**: `http://localhost:6767` (Status: 200 OK)
- **AI Model**: `gemini-3.5-flash-lite` (hỗ trợ phân tích cân bằng phương trình và hiện tượng hóa học)

## 2. Kiểm thử & Chất lượng mã nguồn
- **Unit Test Runner**: Vitest 5.0.3
- **Test Suite**: `src/pour/physics/__tests__/physics.test.ts`
- **Kết quả Test**: 13/13 test cases PASSED (100%)
  - Hình học lòng bình `profileRadiusAt` & `lipCoordinate` cho 5 loại dụng cụ thủy tinh
  - Tích phân hình viên phân `segArea` & kiểm tra diện tích hình tròn $\pi R^2$
  - Bisection giải mặt thoáng nghiêng `solveLevel` với sai số $\le 0.0001\text{ m}$
  - Bảng mẫu thể tích giữ lại $V_{retained}(\theta)$ giảm đơn điệu từ danh định về 0
  - Thủy lực đập tràn Francis weir và cột áp $Q \propto h^{3/2}$ kẹp trong dải $[0.15, 60]\text{ mL/s}$
  - Hiệu ứng bám thành mép bình Teapot effect và dao động glug
  - Động học bay đạn đạo Torricelli & phân loại điểm rơi (inside / rim / table)
  - Bảo toàn mol chất tan, khối lượng dung môi, hòa trộn năng lượng nhiệt và định luật quang phổ Beer–Lambert
  - Động học chất rắn Archimedes: khối lượng (g), thể tích chiếm chỗ, chìm/nổi (Na nổi, Fe chìm)
- **TypeScript & Build**: 0 errors, production bundle sạch sẽ.

## 3. Hiệu năng & Kiến trúc Simulation
- **Vòng lặp vật lý**: Fixed-step accumulator 60 Hz ($\Delta t = 1/60\text{ s}$), tách biệt hoàn toàn khỏi rendering loop
- **State Management**: Zustand store bridge với atomic commit khi kết thúc phiên hoặc đạt mốc dung tích, không thrash re-render ở 60 FPS
- **Giao diện âm thanh**: Web Audio API tổng hợp thủ tục (Synthesized procedural audio) — không tải file MP3 nặng, tự thích ứng tần số cột khí ($300 \rightarrow 1150\text{ Hz}$) khi bình đầy dần.
- **Hỗ trợ đa thiết bị**: Mouse, Touch/Pen (iPad/mobile), Bàn phím (Q/E/Phím mũi tên để nghiêng, Space giữ rót, Esc hủy). Responsive drawer cho màn hình nhỏ <768px.
