# Báo cáo P0 — Baseline & dọn repo

## 1. Tóm tắt

- Lint và production build đạt; repo nguồn không còn `grep_output.txt`, `m10.py` hoặc bundle cũ trong `assets/`.
- Bỏ 7 dependency gốc đã xác nhận không được import; giữ `framer-motion`.
- Có baseline thật cho 3 viewport × 3 cảnh, mỗi mẫu 20 giây dưới CPU throttle 4×, kèm JSON và 9 ảnh.
- Không chạy cài đặt thật theo ràng buộc workspace; dry-run offline của `npm ci` exit 0.
- Các thay đổi người dùng có sẵn trong worktree được giữ nguyên; không tạo branch/commit.

## 2. Đã làm

| File/nhóm | Thay đổi |
|---|---|
| `package.json`, `package-lock.json` | Bỏ `@google/genai`, `express`, `dotenv`, `tsx`, `react-router-dom`, `motion`, `@types/express` khỏi dependency gốc. |
| `.gitignore`, `.nvmrc`, `README.md` | Chuẩn hóa build vào `dist/`, bỏ qua `assets/`, pin Node 22 LTS và ghi yêu cầu runtime. |
| `docs/DECISIONS.md` | ADR cho `index.html`/`index.source.html`, build output và Node. |
| `src/systems/performance/RendererInfoProbe.tsx` | Probe DEV-only cho full-frame `renderer.info`, phase/fire state và pose fixture; không mount production. |
| `scripts/capture-p0-baseline.mjs` | Raw-CDP harness không dependency, fail-fast, 3 viewport × 3 cảnh × 20 giây. |
| `docs/PERF_BASELINE.md` | Bundle, FPS, 1% low, draw calls, triangles, geometry, texture và quy trình lặp lại. |
| `docs/DEVICE_MATRIX.md` | Ma trận iPhone/Android/desktop, checklist 10 mục và phát hiện ảnh baseline. |
| `docs/perf/`, `docs/screens/` | JSON thô và 9 ảnh PNG có hash khác nhau. |
| File rác/generated | Xóa 7 bundle cũ, `m10.py`; chuyển `grep_output.txt` vào Recycle Bin. |

## 3. Kiểm chứng

| Kiểm tra | Kết quả thật |
|---|---|
| `npm run lint` | ĐẠT, `tsc --noEmit`, exit 0. |
| `npm run build` | ĐẠT, Vite 6.4.4, 2.954 module, 15,90 giây ở lượt cuối; cảnh báo `vendor-three` >500 kB. |
| `npm ci --dry-run --ignore-scripts --offline` | ĐẠT, exit 0; dự kiến gỡ 128 package thừa. Không cài đặt thật. |
| `node --check scripts/capture-p0-baseline.mjs` | ĐẠT. |
| Raw baseline validator | ĐẠT: 3 viewport × 3 cảnh, mỗi cảnh ≥20.000 ms, renderer counters không tầm thường. |
| `git diff --check -- .` | ĐẠT; chỉ có cảnh báo chuyển LF→CRLF của Git. |
| Thiết bị thật | CHƯA KIỂM CHỨNG: không có iPhone/Android thật trong môi trường. |
| Playwright | CHƯA KIỂM CHỨNG: package không có sẵn và không được phép cài. Raw CDP chỉ là fallback P0. |

Ảnh: `docs/screens/p0-<viewport>-<scene>.png`. Dữ liệu gốc: `docs/perf/P0_BASELINE_RAW.json`.

## 4. Số liệu trước tối ưu

| Viewport | Start FPS / 1% low | Lobby FPS / 1% low | Fire FPS / 1% low |
|---|---:|---:|---:|
| 1366×768 | 14,79 / 6,45 | 12,78 / 4,23 | 9,89 / 4,06 |
| 812×375 @3x | 13,89 / 6,55 | 14,03 / 4,69 | 10,24 / 4,59 |
| 740×360 @2x | 12,24 / 3,30 | 8,98 / 2,64 | 9,00 / 2,55 |

Start dùng khoảng 664–703 draw call và 932k–936k triangle; đây là mục tiêu tối ưu lớn cho P2/P4.

## 5. Tiêu chí hoàn thành

| Tiêu chí P0 | Trạng thái | Bằng chứng/lý do |
|---|---|---|
| Lint/build không lỗi | ĐẠT | Exit 0. |
| Repo không còn file rác/bundle cũ | ĐẠT | Working tree ghi nhận deletion; `grep_output.txt` không còn tồn tại. |
| Dependency khai báo giảm, build vẫn chạy | ĐẠT | 7 dependency gốc bị bỏ; dry-run offline và build đều đạt. |
| `PERF_BASELINE.md` có số liệu thật | ĐẠT | JSON thô + 9 ảnh + validator. |
| `DEVICE_MATRIX.md` và checklist | ĐẠT | Có đủ thiết bị mục tiêu và 10 mục. |
| Clean install thật trên Node 22 | HOÃN | Ràng buộc cấp cao không cho phép cài package; dry-run đã đạt. |
| Thiết bị thật/Playwright | HOÃN | Không có thiết bị/package; không tuyên bố đã chạy. |

## 6. Phát hiện thêm và rủi ro

- 740×360 có prompt chữ che gần toàn viewport; 812×375 Start bị cắt mép dưới. P1 phải xử lý trước tiên.
- Baseline dưới throttle 4× chỉ đạt khoảng 9–15 FPS; chưa viewport nào đạt mục tiêu 30 FPS.
- `node_modules` hiện vẫn chứa dependency cũ dưới dạng `extraneous` cho đến clean install thật.
- Có thay đổi không liên quan trong project sibling `lab-2d`; không chạm vào.

## 7. Commit message đề xuất

`chore: establish measured P0 baseline and clean generated artifacts`
