# Quyết định Kỹ thuật: FPS Laboratory Safety Rebuild

## 1. Bối cảnh & Mục tiêu
Chuyển đổi ứng dụng Đào tạo An toàn Phòng Thí nghiệm từ góc nhìn thứ ba (`ThirdPersonController`, `PlayerModel`, quiz cứu hỏa dạng modal) sang **Trải nghiệm FPS Nhập vai Góc nhìn thứ nhất (First-Person Simulation)** trong phòng lab hóa học tiêu chuẩn 12m x 9m x 3.2m.
- Người chơi trực tiếp quan sát bằng mắt, thao tác tay qua Viewmodel (PPE tay áo, găng, viền kính bảo hộ).
- Thay thế quiz bình cứu hỏa bằng mô phỏng PASS thời gian thực (`FireSim`, `ExtinguisherModel`, `SmokeModel`), hỗ trợ 3 loại đám cháy A/B/C với hậu quả thật (bùng lửa, giật điện).
- Tích hợp các tình huống xử lý sự cố chân thực: Spill hóa chất (`SpillSim`), bắn hóa chất vào mắt/da (bồn rửa mắt / vòi sen khẩn cấp), pha loãng axit đúng cách, phân loại rác thải nguy hại.
- Kế thừa toàn bộ hệ thống engine v1: Registry, Phase State Machine, Teacher Checkpoint, Save/Resume có versioning, Mistake/Score tracking, Certificate có ID bất biến, Accessibility.

## 2. Kiến trúc Thư mục Đích
- `src/core/simulation/`: `SimulationClock.ts`, `DeterministicRandom.ts`
- `src/core/fire/`: `FireClasses.ts`, `FireSim.ts`, `ExtinguisherModel.ts`, `SmokeModel.ts`
- `src/core/spill/`: `SpillSim.ts`
- `src/core/incident/`: `IncidentDirector.ts`
- `src/data/scene/`: `lab-standard.ts` (định nghĩa toàn bộ 100% item mục 4 trong prompt v2)
- `src/systems/texture/`: `ProceduralTextures.ts` (canvas/shader texture generator có cache)
- `src/components/3d/fps/`: `FirstPersonController.tsx`, `Viewmodel.tsx`, `Crosshair.tsx`, `Mirror.tsx`
- `src/components/3d/lab/`: `Architecture.tsx`, `Benches.tsx`, `FumeHood.tsx`, `StorageCabinets.tsx`, `SafetyWall.tsx`, `PPEStation.tsx`, `Sinks.tsx`, `WasteStation.tsx`, `Decor.tsx`
- `src/components/3d/fx/`: `FireFX.tsx`, `SmokeFX.tsx`, `ExtinguisherFX.tsx`, `SpillFX.tsx`, `LiquidFX.tsx`
- `src/components/3d/npc/`: `Teacher.tsx`, `Students.tsx`
- `src/components/ui/hud/`: `FPSHUD.tsx`, `ClipboardModal.tsx`, `ExtinguisherGauge.tsx`, `AlertBanner.tsx`

## 3. Baseline Hiệu năng & Build ban đầu (M0)
- **Branch**: `fps-rebuild`
- **Baseline Git Tag**: `pre-fps-baseline`
- **Lint (`tsc --noEmit`)**: PASS (0 lỗi)
- **Build (`vite build`)**: PASS
  - `dist/assets/main-Cb5pNS8o.js`: 1,814.02 kB (gzip: 520.39 kB)
  - `dist/assets/main-i4ebnRgf.css`: 66.06 kB (gzip: 11.43 kB)
  - Build time: ~41s
