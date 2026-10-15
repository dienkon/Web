# P0 Performance Baseline

Ngày đo: 2026-10-13 (Asia/Saigon).

## Môi trường

- Checkout: worktree hiện có (đang chứa thay đổi chưa commit của người dùng).
- Runtime đã dùng để lint/build: Node.js 26.7.0, npm 11.19.0, Windows.
- Phiên bản mục tiêu của dự án: Node.js 22 LTS (`.nvmrc`).
- `npm ci` sạch trên Node 22: **CHƯA CHẠY THẬT** vì phiên làm việc không được phép cài đặt package. `npm ci --dry-run --ignore-scripts --offline` đã exit 0 và lập kế hoạch gỡ 128 package thừa, xác nhận manifest/lockfile có thể giải quyết offline.
- `node_modules` hiện tại vẫn chứa các package vừa gỡ ở trạng thái `extraneous`; đây là trạng thái cục bộ trước clean install, không phải dependency được khai báo. `package.json` và dependency gốc trong lockfile đã đồng bộ.
- Playwright/Puppeteer: **không có trong `node_modules`**. Chrome cục bộ có tại `C:\Program Files\Google\Chrome\Application\chrome.exe`.

## Kết quả kiểm tra cơ bản

| Lệnh | Kết quả | Ghi chú |
|---|---|---|
| `npm run lint` | ĐẠT | `tsc --noEmit`, exit code 0. `tsconfig.json` đã có `types: ["vite/client"]`. |
| `npm run build` | ĐẠT | Vite 6.4.4, 2.954 module, 8,83 giây. Có cảnh báo chunk `vendor-three` lớn hơn 500 kB. |

## Bundle production trước tối ưu

Số liệu lấy trực tiếp từ output `vite build`; tên hash có thể đổi giữa các build.

| Chunk | Raw (kB) | Gzip (kB) |
|---|---:|---:|
| `index.source.html` | 1,51 | 0,70 |
| CSS chính | 89,81 | 14,74 |
| `ChemicalSymbolsQuiz` | 6,15 | 2,61 |
| `FireExtinguisherQuiz` | 11,27 | 4,25 |
| `BandageWrappingQuiz` | 13,23 | 4,86 |
| `CertificateScreen` | 21,62 | 8,22 |
| `vendor-icons` | 25,05 | 5,99 |
| `vendor-postfx` | 80,88 | 22,19 |
| `vendor-motion` | 138,03 | 45,68 |
| `vendor-r3f-core` | 182,13 | 57,99 |
| JS chính | 310,81 | 83,90 |
| `vendor-r3f-drei` | 320,31 | 99,09 |
| `vendor-three` | 734,39 | 190,19 |

## Ma trận đo runtime trước tối ưu

Đo ngày 2026-10-13 bằng Chrome 155 headless, raw CDP, CPU throttle 4×, mỗi mẫu 20 giây. JSON đầy đủ nằm tại `docs/perf/P0_BASELINE_RAW.json`; chín ảnh tương ứng nằm trong `docs/screens/p0-*.png`. Đây là số liệu baseline trên máy chạy hiện tại, không phải kết quả thiết bị thật.

| Viewport | Cảnh | FPS TB | 1% low | Draw calls | Triangles | Geometries | Textures |
|---|---|---:|---:|---:|---:|---:|---:|
| 1366×768 desktop | Start | 14,79 | 6,45 | 664 | 932.452 | 347 | 24 |
| 1366×768 desktop | Sảnh lab | 12,78 | 4,23 | 108 | 290.430 | 306 | 24 |
| 1366×768 desktop | Gần đám cháy Phase 2 | 9,89 | 4,06 | 291 | 303.334 | 177 | 21 |
| 812×375 @3x touch | Start | 13,89 | 6,55 | 703 | 936.420 | 355 | 24 |
| 812×375 @3x touch | Sảnh lab | 14,03 | 4,69 | 109 | 290.358 | 317 | 24 |
| 812×375 @3x touch | Gần đám cháy Phase 2 | 10,24 | 4,59 | 322 | 303.902 | 183 | 21 |
| 740×360 @2x touch | Start | 12,24 | 3,30 | 693 | 934.940 | 354 | 24 |
| 740×360 @2x touch | Sảnh lab | 8,98 | 2,64 | 109 | 290.358 | 316 | 24 |
| 740×360 @2x touch | Gần đám cháy Phase 2 | 9,00 | 2,55 | 319 | 304.026 | 182 | 21 |

### Nhận xét baseline

- Không viewport nào đạt mục tiêu 30 FPS dưới CPU throttle 4×; thấp nhất là 8,98 FPS trung bình ở sảnh 740×360.
- Start screen là cảnh nặng nhất về hình học: khoảng 693–703 draw call và 932k–936k triangle do nhân vật/cảnh showcase.
- Ảnh 740×360 cho thấy prompt chữ che gần toàn màn hình; ảnh 812×375 cho thấy Start screen bị cắt ở mép dưới. Đây là bằng chứng đầu vào trực tiếp cho P1.

## Quy trình đo có thể lặp lại

1. Chạy `npm run dev` và mở URL kèm `?debug=1`. Chỉ trong DEV, `window.__LAB_RENDERER_INFO__` cung cấp `calls`, `triangles`, `points`, `lines`, `geometries`, `textures`; `window.__LAB_DEBUG_STATE__` xác nhận phase/fire; và pose bridge đưa fixture tới điểm đo cố định. Probe không mount trong production.
2. Dùng Chromium CDP/Playwright tạo từng viewport, bật touch và `deviceScaleFactor` tương ứng.
3. Bật CPU throttling rate 4 qua CDP trước khi lấy mẫu; bỏ 3 giây đầu cho shader compile.
4. Đưa game tới đúng Start, sảnh lab và đám cháy Phase 2 bằng fixture/save xác định, không dùng thao tác tay có thời lượng khác nhau.
5. Thu `requestAnimationFrame` timestamp trong 20 giây. FPS trung bình = số frame / thời gian; 1% low = nghịch đảo trung bình của 1% frame-time chậm nhất.
6. Đọc renderer snapshot sau khi cảnh ổn định, lưu ảnh và trace cùng kết quả thô dưới `docs/perf/`.
7. Chạy ba lần mỗi ô, báo median; ghi SHA/working-tree state, Chrome version và GPU renderer.

### Raw-CDP fallback hiện có

Vì phiên P0 không được phép cài Playwright, `scripts/capture-p0-baseline.mjs` có thể thu số liệu thật bằng Chrome DevTools Protocol sẵn có. Đây là fallback cho baseline, **không thay thế** yêu cầu Playwright ở P8.

```powershell
npm run dev
& 'C:\Program Files\Google\Chrome\Application\chrome.exe' --headless=new --remote-debugging-port=9222 --user-data-dir="$PWD\node_modules\.cache\p0-chrome" about:blank
node scripts/capture-p0-baseline.mjs
```

Script áp CPU throttle 4×, lấy mẫu 20 giây, lưu JSON vào `docs/perf/P0_BASELINE_RAW.json` và ảnh PNG vào `docs/screens/`. Nếu không tìm thấy UI, save, fire scene, renderer snapshot hoặc screenshot, script thoát khác 0 thay vì điền số giả.

## Việc còn thiếu để khép P0

- Thêm Playwright ở giai đoạn QA khi được phép quản lý dependency, rồi đối chiếu lại 9 phép đo raw-CDP.
- Chạy lại `npm ci`, lint và build sạch trên Node 22 LTS.
- Xác nhận clean install không còn các package `extraneous`; nếu công cụ quản lý lock được phép chạy, tái sinh lockfile để loại metadata không còn truy cập được.
- Kiểm thử thủ công trên thiết bị thật theo `DEVICE_MATRIX.md`.
