# KẾ HOẠCH TỰ HÀNH XUYÊN ĐÊM — VIRTUAL CHEMLAB
### Agent tự đọc · tự chạy · tự build · tự tìm kiếm · tự kiểm chứng · báo cáo sáng

**Dùng cùng 2 file prompt:** `chemlab_threejs_vfx_prompt.md` (VFX toàn cảnh/phản ứng) và `chemlab_pouring_prompt.md` (cơ chế rót). Đặt cả hai vào thư mục `agent/specs/` của repo trước khi chạy.

---

## PHẦN A — LỆNH KHỞI ĐỘNG (dán cho agent)

```
Bạn là kỹ sư tự hành. Repo hiện tại là Virtual ChemLab (React 19 + R3F 9 + three r185 + zustand).
Bạn sẽ làm việc LIÊN TỤC nhiều giờ không có người giám sát, cho đến khi hết task hoặc hết ngân sách.

1. Đọc theo thứ tự: agent/specs/chemlab_overnight_agent_plan.md (file này), rồi hai spec còn lại trong agent/specs/.
2. Tạo nhánh `overnight/vfx-pour`, tạo thư mục agent/ với: PROGRESS.md, TASKS.md (sao chép phần C–O của plan này),
   DECISIONS.md, RESEARCH.md, BLOCKERS.md, METRICS.md, REPORT.md (để trống).
3. Thực hiện vòng lặp ở PHẦN B cho từng task theo thứ tự ưu tiên. Không dừng để hỏi người dùng.
   Gặp mơ hồ: chọn phương án an toàn/rẻ hơn, ghi vào DECISIONS.md, đi tiếp.
4. Tự tìm kiếm tài liệu khi cần (PHẦN D). Tự chạy build/test/dev server/trình duyệt headless để kiểm chứng bằng mắt (ảnh chụp) và bằng số liệu.
5. Cuối cùng (hoặc khi còn 20 phút ngân sách) viết agent/REPORT.md theo PHẦN P.
Bắt đầu ngay với task E-01.
```

---

## PHẦN B — GIAO THỨC VẬN HÀNH (bắt buộc)

### B1. Vòng lặp mỗi task
```
ĐỌC task → ĐỌC code liên quan → (nếu chưa chắc API) TÌM KIẾM/đọc d.ts → VIẾT kế hoạch 3–5 dòng vào PROGRESS.md
→ CÀI ĐẶT nhỏ nhất chạy được → CỔNG NHANH: npm run lint && npm run test -- --run && npm run build
→ KIỂM CHỨNG theo cột "verify" (ảnh chụp/số liệu) → COMMIT (1 task = 1 commit) → CẬP NHẬT PROGRESS.md → task kế tiếp
```
- **Cổng nhanh** phải xanh trước mỗi commit. Cuối mỗi *phần* (E, R, T, B, M, P, V, A, G, F, L, S): chạy **cổng đầy đủ** = cổng nhanh + e2e + đo hiệu năng.
- Commit message: `[ID] mô tả ngắn`. Không gộp nhiều task vào một commit.

### B2. Luật chống kẹt
- Một task thất bại **3 lần** (3 cách tiếp cận khác nhau) ⇒ ghi `BLOCKERS.md` (lỗi, đã thử gì, giả thuyết), `git stash`/revert phần dở, **đánh dấu `[~]` và đi tiếp**. Quay lại ở pha S (dọn nợ).
- Lệnh chạy lâu dùng `timeout` (build 600 s, test 300 s, e2e 900 s). Server nền ghi log ra `agent/logs/*.log`, **luôn kill khi xong**.
- Nếu cùng một lỗi lặp 2 lần liên tiếp ở hai task khác nhau ⇒ dừng, tìm nguyên nhân gốc trước.
- Không "sửa test cho qua" khi không hiểu vì sao fail; nếu test sai thì ghi lý do vào DECISIONS.md.

### B3. An toàn (không được vi phạm)
- Chỉ ghi trong repo. **Cấm**: `rm -rf` ngoài `node_modules`/`dist`/`agent/tmp`; `git push --force`; sửa `.env*`, `firebase-*`, khóa API; commit bí mật; nâng major version phụ thuộc cũ khi không cần; tải asset nhị phân lớn.
- Thêm phụ thuộc mới: chỉ khi cần, phiên bản ghim cụ thể, ghi lý do vào DECISIONS.md. Nếu cài thất bại do mạng ⇒ dùng phương án không phụ thuộc mạng.
- Tag mốc an toàn: `git tag ckpt-<phần>` sau mỗi phần xanh. Nếu mọi thứ hỏng nặng ⇒ `git reset --hard` về tag gần nhất (trên nhánh overnight, được phép).
- Không đụng logic hóa học (`chemistryEngine.ts`) trừ B-series và các điểm spec cho phép.

### B4. Ngân sách thời gian (gợi ý ~9 giờ; co giãn theo thực tế)
| Khung | Phần | Ghi chú |
|---|---|---|
| 0:00–0:40 | E, R | Nhận diện môi trường + nghiên cứu nền |
| 0:40–1:40 | T, B | Hạ tầng test + sửa lỗi nền (BẮT BUỘC trước khi làm tính năng) |
| 1:40–2:40 | M | Responsive/đa thiết bị/khung nền |
| 2:40–5:00 | P | Lõi vật lý rót + controller + input |
| 5:00–6:30 | V, A | Hiển thị rót + âm thanh |
| 6:30–8:00 | G | VFX cảnh & từng phản ứng |
| 8:00–8:40 | F, L | Hiệu năng + hoàn thiện |
| 8:40–9:00 | S, P-final | Soak, dọn nợ, báo cáo |
Trễ tiến độ ⇒ **cắt theo ưu tiên**: bỏ P2 trước, rồi P1 của G/L; **không bao giờ cắt T, B, P0**.

### B5. Ghi nhật ký
- `PROGRESS.md`: bảng `ID | trạng thái | commit | thời lượng | ghi chú`. Trạng thái: `[ ]` chưa, `[x]` xong, `[~]` bị chặn/bỏ qua, `[>]` đang làm.
- `METRICS.md`: sau mỗi phần ghi FPS, draw calls, triangles, số hạt, kích thước bundle, thời gian build.
- `RESEARCH.md`: mỗi mục = *câu hỏi · nguồn (URL + ngày) · kết luận 1–3 dòng · quyết định áp dụng*.

### B6. Nguyên tắc chất lượng
Ưu tiên: **đúng > mượt > đẹp > nhiều**. Hiệu ứng nào làm FPS tier Low < 30 ⇒ phải có phiên bản rút gọn. Mọi thứ chạy theo thời gian mô phỏng (`dt × timeScale`, dừng khi pause).

---

## PHẦN C — E: NHẬN DIỆN MÔI TRƯỜNG (P0)

- [ ] **E-01** `git status`, `git log -5`, tạo nhánh `overnight/vfx-pour`, tag `ckpt-start`. *verify:* nhánh tồn tại.
- [ ] **E-02** Ghi phiên bản `node -v`, `npm -v`, OS, CPU, RAM vào METRICS.md.
- [ ] **E-03** `npm ci` (hoặc `npm i` nếu lockfile lỗi); ghi thời gian. *verify:* `node_modules/three/package.json` có version ≥ 0.185.
- [ ] **E-04** Chạy `npm run lint`; ghi số lỗi TS hiện có (baseline). Nếu có lỗi sẵn, liệt kê nhưng **không sửa lan man** — chỉ sửa khi chặn build.
- [ ] **E-05** Chạy `npm run build`; ghi kích thước bundle (baseline) vào METRICS.md.
- [ ] **E-06** Dò xem `npm run dev` (`tsx server.ts`) khởi động thế nào; xác định cổng, biến môi trường bắt buộc (`GEMINI_API_KEY` có thể thiếu ⇒ app phải chạy được ở chế độ không AI; xác minh).
- [ ] **E-07** Tạo `.env.local` rỗng cho dev nếu cần (KHÔNG commit); xác nhận app mở được `http://localhost:<port>`.
- [ ] **E-08** Dò trình duyệt headless: thử `npx playwright --version`; nếu không có ⇒ `npm i -D @playwright/test` và `npx playwright install chromium`. Nếu tải trình duyệt thất bại (không mạng) ⇒ ghi BLOCKERS và dùng `puppeteer-core` + Chrome hệ thống nếu có; nếu vẫn không ⇒ chuyển sang kiểm chứng bằng unit test + log số liệu, bỏ qua ảnh chụp (ghi rõ trong REPORT).
- [ ] **E-09** Xác minh WebGL2 chạy trong headless: mở trang, đọc `canvas.getContext('webgl2')`; thử cờ `--use-angle=swiftshader`, `--enable-unsafe-swiftshader`, `--use-gl=angle`, `--ignore-gpu-blocklist` đến khi canvas ra hình. *verify:* chụp được 1 ảnh khác nền trắng/đen. Lưu bộ cờ chạy được vào `agent/playwright.flags.json`.
- [ ] **E-10** Chụp ảnh baseline cảnh hiện tại (desktop 1440×900, iPhone 14, Pixel 7) vào `agent/shots/baseline/`.
- [ ] **E-11** Đo baseline hiệu năng (FPS/ms, `renderer.info`) ở 3 cảnh: rỗng, 4 bình, 4 bình + sủi bọt (CaCO₃+HCl). Ghi METRICS.md.
- [ ] **E-12** Liệt kê toàn bộ file ≥ 300 dòng và hook `useFrame` (thống kê) → `agent/NOTES.md` để biết điểm nóng.
- [ ] **E-13** Tạo `agent/scripts/gate.sh` (lint + test + build, timeout) và `agent/scripts/full.sh` (gate + e2e + perf). *verify:* chạy được.
- [ ] **E-14** Thêm `.gitignore` cho `agent/logs`, `agent/tmp`, `agent/shots/tmp`, `test-results`, `playwright-report`.

## PHẦN D — R: NGHIÊN CỨU TỰ ĐỘNG (P0/P1)

Cách làm: dùng công cụ tìm kiếm web nếu có; nếu không, đọc `node_modules/<pkg>/**/*.d.ts`, `README`, `examples` đi kèm. **Mỗi kết luận phải được xác minh bằng thí nghiệm nhỏ (spike) trước khi áp dụng.** Ghi vào RESEARCH.md.

- [ ] **R-01** Three.js r185: danh sách API đã bỏ/đổi từ r160→r185 (`WebGLRenderer`, `ColorManagement`, `transmission`, `onBeforeCompile`, `InstancedMesh` update range, `Clock` → `Timer`). Truy vấn gợi ý: `three.js migration guide r170 r180`, `three.js releases r185`. *Ra:* bảng "dùng/không dùng".
- [ ] **R-02** R3F v9 + React 19: `frameloop="demand"`, `invalidate`, `useFrame` priority, `Canvas` props (`dpr`, `gl`, `flat`), lỗi thường gặp StrictMode. Truy vấn: `react-three-fiber v9 migration`, `r3f frameloop demand invalidate`.
- [ ] **R-03** drei v10: `PerformanceMonitor`, `Environment` + `Lightformer`, `MeshTransmissionMaterial`, `AdaptiveDpr`, `Preload`; kiểm tra có tương thích three r185 không.
- [ ] **R-04** `@react-three/postprocessing` + `postprocessing` phiên bản tương thích R3F 9/React 19/three r185 (xem `peerDependencies` bằng `npm view <pkg> peerDependencies versions`). Chọn phiên bản ghim.
- [ ] **R-05** Kính + chất lỏng trong suốt: giới hạn transmission buffer của three (vật thể `transparent` không nằm trong buffer) và cách giả khúc xạ viền. Truy vấn: `three.js transmission transparent objects not rendered in transmission buffer`.
- [ ] **R-06** Clipping plane theo vật thể (local clipping) để vẽ mặt chất lỏng nghiêng ngang; `renderer.localClippingEnabled`; chi phí; tương thích mobile.
- [ ] **R-07** Mô hình lưu lượng qua đập/mỏ rót, teapot effect, glug chai cổ hẹp: tóm tắt công thức đủ dùng (Q ∝ h^{3/2}); ghi rõ phần nào là xấp xỉ.
- [ ] **R-08** Rayleigh–Plateau & chiều dài vỡ dòng: công thức/xấp xỉ thực dụng cho dòng nước trong không khí ở đường kính 1–6 mm.
- [ ] **R-09** Pointer Events trên iOS Safari/Android Chrome: `setPointerCapture`, `touch-action`, `pointercancel`, hành vi 2 ngón; xung đột với OrbitControls (`touches` map). Truy vấn: `OrbitControls touches TOUCH.DOLLY_PAN`, `iOS Safari pointer events touch-action none`.
- [ ] **R-10** `dvh`/safe-area/`viewport-fit=cover`, chặn pull-to-refresh/bounce iOS (`overscroll-behavior`), chặn double-tap zoom; tương thích iOS ≥ 15.4.
- [ ] **R-11** WebGL context lost/restored trong R3F: cách xử lý, phục hồi texture/geometry; sự kiện trên canvas.
- [ ] **R-12** Giới hạn WebGL mobile: `MAX_TEXTURE_SIZE`, số uniform vector, `highp` fragment, float texture extension; cách dò và fallback.
- [ ] **R-13** Web Audio trên iOS: mở khóa `AudioContext` sau cử chỉ, `webkitAudioContext`, giới hạn node; mô hình tiếng rót (noise + bandpass + tần số cộng hưởng cột khí).
- [ ] **R-14** `navigator.vibrate`: hỗ trợ trình duyệt; cách phát hiện và bỏ qua êm.
- [ ] **R-15** Playwright: giả lập thiết bị (`devices['iPhone 14']`, `Pixel 7`), `hasTouch`, CPU throttling qua CDP (`Emulation.setCPUThrottlingRate`), `page.touchscreen.tap`, đa chạm; so sánh ảnh (`toHaveScreenshot`, `maxDiffPixelRatio`).
- [ ] **R-16** Vitest + TS strict + alias `@`; cấu hình môi trường node cho hàm thuần; mock `window`/`AudioContext`.
- [ ] **R-17** Kỹ thuật tham khảo chất lỏng/khí mức web: caustic shader rẻ, curl-noise smoke, soft particles, SDF metaball 2D cho bong bóng; chọn cái rẻ nhất đạt hiệu quả (ghi 3 phương án, chọn 1).
- [ ] **R-18** Đọc `README`/changelog của `framer-motion`/`motion` đang cài để tránh xung đột với R3F (nếu UI dùng).
- [ ] **R-19** Truy vấn dự phòng nếu bị kẹt bất kỳ API nào: `site:github.com mrdoob/three.js <từ khóa>`, `discourse.threejs.org <từ khóa>`, `r3f pmndrs <từ khóa>`. Ghi lại.
- [ ] **R-20** Tổng hợp RESEARCH.md thành "Quyết định kỹ thuật cuối" (≤ 40 dòng) làm kim chỉ nam cho các pha sau.

## PHẦN E — T: HẠ TẦNG KIỂM THỬ (P0)

- [ ] **T-01** Thêm `vitest` + cấu hình (`vitest.config.ts`, alias, môi trường `node`); script `test`. *verify:* một test mẫu xanh.
- [ ] **T-02** Test baseline cho `chemistryEngine`: mỗi phản ứng trong `DETERMINISTIC_REACTIONS` khớp đúng khi đưa vào bộ chất mong đợi (snapshot id).
- [ ] **T-03** Test hồi quy lỗi khớp lỏng (sẽ ĐỎ trước khi sửa B-01): `['NaOH','H2O']` **không** được khớp `sodium_water_reaction`; `['NaCl','H2O']`, `['H2O','MnO2']`, `['CuSO4','H2SO4 (conc)']` tương tự.
- [ ] **T-04** Thêm Playwright + `playwright.config.ts` (projects: desktop-chromium, desktop-firefox, desktop-webkit, iphone-14, pixel-7, ipad), dùng cờ từ E-09; `webServer` tự khởi chạy app.
- [ ] **T-05** Thêm **API gỡ lỗi** `window.__chemlab` (chỉ bật khi `import.meta.env.DEV` hoặc `?e2e=1`): `getState()`, `setSeed(n)`, `pause()`, `advance(ms)` (tiến mô phỏng theo bước cố định), `addVessel(type)`, `fill(id, formula, ml)`, `startPour(src, dst, opts)`, `setTilt(id, rad)`, `snapshot()`, `fps()`, `rendererInfo()`. *verify:* gọi được từ Playwright.
- [ ] **T-06** Bộ **RNG có seed** dùng chung (thay `Math.random()` trong hệ hạt/VFX) để ảnh chụp lặp lại được.
- [ ] **T-07** Chế độ `?e2e=1`: tắt animation không tất định, cố định `dpr=1`, chất lượng `high` hoặc theo `?q=low|medium|high`, ẩn FPS HUD.
- [ ] **T-08** Helper ảnh: `shot(page, name)` lưu vào `agent/shots/<run>/` + tạo `index.html` xem lưới ảnh (để người xem buổi sáng).
- [ ] **T-09** Helper đo hiệu năng: chạy kịch bản 10 s, thu FPS trung vị/p5, ms/frame, `renderer.info.render.calls/triangles`, `memory.geometries/textures`; ghi JSON vào `agent/metrics/`.
- [ ] **T-10** Helper giả lập CPU chậm (CDP throttle 4×) để kiểm tier Low.
- [ ] **T-11** Test e2e smoke: trang mở, canvas hiện, không `console.error`, thêm 1 cốc, kéo hóa chất vào → thể tích tăng.
- [ ] **T-12** Test e2e đa thiết bị: không cuộn ngang ở 320/375/390/768/1024/1440 px.
- [ ] **T-13** Test **property-based** (fast-check hoặc tự viết): sinh ngẫu nhiên chuỗi thao tác store (thêm/rót/đun/undo/reset) 2000 lần → không ném lỗi, không NaN, thể tích ≥ 0, không vượt dung tích (trừ tràn có ghi spill).
- [ ] **T-14** Script `npm run test:e2e`, `npm run test:perf`, `npm run test:all`.
- [ ] **T-15** CI cục bộ: `agent/scripts/full.sh` chạy được liền mạch (kể cả khi một project Playwright không có trình duyệt ⇒ bỏ qua có cảnh báo, không đỏ cả bộ).

## PHẦN F — B: SỬA LỖI NỀN (P0 — làm trước tính năng)

- [ ] **B-01** `matchesReactants`: so khớp **chính xác theo công thức chuẩn hóa** (map về key trong `chemicals.ts`, giữ hậu tố `(conc)/(dil)/(30%)`); T-03 chuyển xanh. *verify:* T-02, T-03 xanh.
- [ ] **B-02** Gộp trùng id `cuoh2_thermal_decomposition` (#14/#18) thành một; đảm bảo đường "CuSO₄+NaOH → đun → CuO" thật sự kích hoạt. *verify:* test engine + kịch bản `__chemlab`.
- [ ] **B-03** Đưa mọi hook lên trước `return null` trong `Beaker/Flask/TestTube/GraduatedCylinder` và `VesselPourAnimation`. *verify:* xóa bình đang chọn không ném "fewer hooks".
- [ ] **B-04** Bình `Beaker/...` bỏ subscribe cả map `vessels`; dùng selector theo id + `subscribeWithSelector`/ref trong `useFrame`. *verify:* đếm số lần render (React Profiler/counter) giảm rõ khi nhiệt độ cập nhật.
- [ ] **B-05** Loại cấp phát trong `useFrame` ở `VesselLiquid` (`new THREE.Color`), `ContinuousLiquidStream` (`new Vector3`), `GasParticles` (`Math.random()` mỗi frame đổi kích thước bong bóng). *verify:* không còn `new ` trong thân `useFrame` (lint rule/regex test).
- [ ] **B-06** `AddingAnimation`: thay `Math.random()` trong JSX bằng mảng `useMemo` có seed (hạt rắn không nhảy mỗi render).
- [ ] **B-07** **Sửa lỗi cộng dồn** `updatePourVolumeProgress` (tính từ thể tích **ban đầu** lưu trong `vesselPourAnimation`, không đọc lại `to.volume_ml`). Viết test hồi quy: sau animation, `V_to = V_to0 + V_from0` (≤ dung tích) và `pourVessel` không chạy trên thể tích 0 ngẫu nhiên.
- [ ] **B-08** `finishVesselPourAnimation` → `pourVessel` đảm bảo **một** lần giải quyết phản ứng (idempotent); test.
- [ ] **B-09** Dừng gọi `setVesselState` mỗi frame trong `AddingAnimation` (gộp theo bước 30 Hz hoặc cập nhật qua controller sau này).
- [ ] **B-10** `isExplosion` hiện chỉ lưu state: thêm placeholder sự kiện `explosion` trên bus (VFX ở pha G sẽ vẽ). *verify:* phản ứng nước+H₂SO₄ đặc phát sự kiện.
- [ ] **B-11** Dùng thời gian mô phỏng thay `Date.now()` trong `AddingAnimation`, `VesselPourAnimation`, `tickSimulation` (startTime của kinetics). Tôn trọng `isSimulationPaused`/`timeScale`. *verify:* pause giữa lúc rót ⇒ đứng hình; 0.25× chậm đúng.
- [ ] **B-12** Rắn: thể tích rắn không cộng thẳng vào `volume_ml` chất lỏng (`amount` hiện là mL); đổi sang khối lượng (g) + thể tích chiếm chỗ. Giữ tương thích dữ liệu lưu cũ (migration nhẹ trong `persistence.ts`).
- [ ] **B-13** `transferLiquidContinuous`: cập nhật `contents` (mol/khối lượng), nhiệt độ, và giới hạn tần suất `evaluateLocalChemistry`. (Chuẩn bị cho P-series; có thể gộp vào P-18.)
- [ ] **B-14** Kiểm tra `chemistryCache` key có phụ thuộc `lang` hợp lý; `localStorage` không phình (giới hạn kích thước/LRU).
- [ ] **B-15** Tắt `StrictMode` double-invoke gây animation chạy 2 lần? Kiểm chứng; nếu có ảnh hưởng, làm các effect idempotent (không tắt StrictMode).
- [ ] **B-16** `ErrorBoundary` bao quanh `LabScene`: lỗi 3D không làm trắng cả app; có nút "Tải lại cảnh".
- [ ] **B-17** Dọn cảnh báo console còn lại (React key, deprecated), mục tiêu 0 `console.error/warn` trong smoke test.

## PHẦN G — M: ĐA THIẾT BỊ, RESPONSIVE, ỔN ĐỊNH (P0/P1)

- [ ] **M-01** `index.html`: `viewport-fit=cover`, `theme-color`, `apple-mobile-web-app-capable`; bỏ khối script vá `fetch` nếu không cần (kiểm tra trước, ghi lý do).
- [ ] **M-02** CSS toàn cục: `html,body,#root{height:100%}`, `100dvh`, `overscroll-behavior:none`, `-webkit-tap-highlight-color:transparent`, `touch-action:manipulation` cho UI, `touch-action:none` cho canvas, `user-select:none` cho khu 3D.
- [ ] **M-03** Hook `useDeviceProfile()`: `pointer: coarse`, `hover`, kích thước màn hình, `deviceMemory`, `hardwareConcurrency`, `prefers-reduced-motion`, hướng màn hình.
- [ ] **M-04** Sidebar trái/phải → **drawer/bottom sheet** dưới 768 px (vuốt, nút mở/đóng lớn), giữ nguyên chức năng; desktop không đổi.
- [ ] **M-05** Toolbar: gom nhóm, cuộn ngang an toàn trên màn hẹp; nút ≥ 44 px; nhãn ẩn/hiện theo breakpoint.
- [ ] **M-06** Modal (Dosage/Litmus/AI/Inspector) thành **sheet toàn màn** trên di động, đóng bằng vuốt xuống/nút X, không bị bàn phím ảo che ô nhập.
- [ ] **M-07** `Canvas`: `dpr` theo bậc chất lượng; bỏ `powerPreference:'high-performance'` khi `pointer:coarse`; `frameloop="demand"` + `invalidate()` (làm ở F-series nhưng chuẩn bị điểm gắn ở đây).
- [ ] **M-08** Màn hình **không hỗ trợ WebGL2**: phát hiện sớm, hiển thị hướng dẫn song ngữ + liên kết nâng cấp trình duyệt; app không trắng.
- [ ] **M-09** Xử lý `webglcontextlost`/`restored` trên canvas: ngừng loop, hiện lớp phủ "Đang khôi phục…", tái tạo tài nguyên, giữ state store. *verify:* dùng `WEBGL_lose_context` trong e2e rồi `restoreContext`.
- [ ] **M-10** Xoay màn hình / resize: giữ tiêu điểm camera, không nhảy; `ResizeObserver` cho canvas.
- [ ] **M-11** Camera cảm ứng: cấu hình `OrbitControls.touches` (1 ngón orbit chỉ khi chạm nền, 2 ngón dolly+pan); khóa orbit khi đang giữ bình/đang kéo hóa chất.
- [ ] **M-12** Nút **khóa màn hình/xem** (`isScreenLocked` có sẵn) rõ ràng trên di động.
- [ ] **M-13** `AdaptiveQuality`: `PerformanceMonitor` hạ/nâng bậc, có trễ (hysteresis) 3 s để không nhấp nháy; HUD chọn tay `Auto/Low/Medium/High`; lưu `localStorage`.
- [ ] **M-14** Bật `prefers-reduced-motion`: tắt rung, giảm nhấp nháy, chuyển cảnh nhanh.
- [ ] **M-15** Tab ẩn: dừng loop, clamp `dt` ≤ 0.1 s khi quay lại; âm thanh tạm dừng.
- [ ] **M-16** Chặn menu ngữ cảnh/long-press chọn văn bản trên khu 3D nhưng **không** chặn trên ô nhập.
- [ ] **M-17** Kiểm tra accessibility cơ bản: tương phản, `aria-label` nút icon, focus ring, thứ tự Tab; thêm `aria-live` cho thông báo thao tác.
- [ ] **M-18** E2E đa thiết bị: chụp ảnh giao diện ở 6 kích thước × (dọc/ngang) vào `agent/shots/layout/`; kiểm không tràn, nút bấm được.
- [ ] **M-19** Kiểm tra bàn phím ảo iOS/Android không đẩy canvas méo (dùng `visualViewport`).
- [ ] **M-20** Tài liệu `agent/DEVICE_MATRIX.md`: thiết bị/trình duyệt nào đã kiểm bằng giả lập, nào chưa (ghi rõ **không thay thế máy thật**).

## PHẦN H — P: LÕI CƠ CHẾ RÓT (P0, theo `chemlab_pouring_prompt.md`)

**Vật lý thuần (có test):**
- [ ] **P-01** `src/pour/physics/profiles.ts`: profile 5 loại bình (+ chai gốc), `SCENE_UNIT_CM` theo dung tích. *verify:* test hình học (thể tích tích phân ≈ công thức trụ/nón).
- [ ] **P-02** `segArea` + test so với tích phân số (sai số < 1e-6).
- [ ] **P-03** `volumeBelowPlane(profile, n, c)` tích phân theo lát (≥ 64 lát, Simpson) + test: bình trụ thẳng đứng đúng `πR²·h`; nghiêng 45° đối chiếu giải tích.
- [ ] **P-04** `solveLevel(profile, n, V)` bằng chia đôi + test round-trip.
- [ ] **P-05** `retainedVolume(profile, θ)` + bảng 64 mẫu cache; nội suy; test đơn điệu giảm theo θ.
- [ ] **P-06** `flow.ts`: `weirFlow(h, b, Cd, viscosity)`, `headFromExcess`, kẹp [0.15, 60] mL/s; test đơn điệu & đơn vị.
- [ ] **P-07** `teapot/wallCling`: điều kiện bám thành và tỉ lệ thể tích rơi theo thành; test ranh giới.
- [ ] **P-08** `glug`: dao động lưu lượng cho miệng hẹp đầy; test biên độ/chu kỳ.
- [ ] **P-09** `ballistics.ts`: `exitVelocity`, `trajectory(t)`, `solveLanding(y_target)`; test với rơi tự do; phân loại inside/rim/table.
- [ ] **P-10** `mixing.ts`: bảo toàn thể tích, mol theo tỉ lệ, khối lượng, nhiệt (cp mặc định 4.18); test tổng không đổi.
- [ ] **P-11** `mixColorBeerLambert`: sRGB→tuyến tính→hấp thụ→trộn theo thể tích; test: pha 1:1 với nước trong ⇒ A giảm một nửa; trộn hai màu giống nhau ⇒ giữ nguyên.
- [ ] **P-12** `solids.ts`: rơi tự do, nảy tắt dần, chìm/nổi theo ρ, thể tích chiếm chỗ; test.
- [ ] **P-13** `step.ts`: reducer thuần `(session, vessels, input, dt) → {session, vessels, events}`; bước cố định 1/60; test bảo toàn.
- [ ] **P-14** Property test 10 000 kịch bản ngẫu nhiên: không NaN, V ≥ 0, `ΔV_src+ΔV_dst+ΔV_spill < 1e-6`.

**Controller & Store:**
- [ ] **P-15** `PourSession` types + slice store: `pour`, `beginPour`, `setPourTilt`, `setPourAssist`, `endPour`, `cancelPour` (thêm, không phá API).
- [ ] **P-16** `store-bridge.ts`: `applyPourStep`, `commitPour` (1 snapshot undo/lần rót), `cancelPour` (dọn sạch, trả tư thế).
- [ ] **P-17** `PourController.ts`: máy trạng thái (`idle → lifting → aiming → pouring → draining → settling → idle`), hàng đợi sự kiện, tick từ `SimulationTicker`.
- [ ] **P-18** Chỉ gọi `evaluateLocalChemistry` khi **bộ chất đích đổi** + 1 lần cuối; tối đa 4 lần/s; kết quả vào `activeKinetics` với `startProgress` theo tỉ lệ chất đã vào.
- [ ] **P-19** Adapter: `startVesselPourAnimation` → `beginPour(mode:'ASSIST')`; `triggerPour/clearPour` → `STOCK_BOTTLE`/`DROPPER`/`SOLID`; `transferLiquidContinuous` → bước của controller. Tất cả test cũ vẫn xanh.
- [ ] **P-20** Mode `HAND_TILT`: nhấc (lift), kéo, nghiêng, nhả hạ; hỗ trợ ngắm (off/low/high).
- [ ] **P-21** Mode `ASSIST`: đường bay cung tới mép đích, tự điều khiển tilt để đạt lưu lượng mục tiêu, nhả nút ⇒ ngẩng bình; **dùng chính bình thật** (bỏ bình giả).
- [ ] **P-22** Mode `STOCK_BOTTLE`: chọn lượng, tháo/đặt nút, rót đúng mL, giọt cuối, đóng nút.
- [ ] **P-23** Mode `DROPPER`: giọt 0.05 mL, tốc độ chỉnh được, bộ đếm giọt.
- [ ] **P-24** Mode `SOLID`: thìa/panh, khối lượng g, đống bột, rơi nhúm; mực nước dâng theo thể tích chiếm chỗ.
- [ ] **P-25** Mode `TABLE`: điểm rơi → `addSpill` đúng vị trí, vũng lan theo độ nhớt.
- [ ] **P-26** Xử lý biên: nguồn rỗng, đích đầy, nguồn = đích, đích di chuyển giữa chừng, xóa bình/undo/reset giữa chừng, pause, timeScale 0.25–4×, 2 lần rót đồng thời (giới hạn ≤ 2 hoặc xếp hàng).
- [ ] **P-27** Hợp nhất `tiltAngle` vào store/controller (thay `useState` cục bộ); `Beaker/Flask/TestTube/Cylinder` đọc tư thế từ controller (`pose`), loại logic rót trong component.

**Input đa thiết bị:**
- [ ] **P-28** `PourInput.tsx` với Pointer Events thống nhất + `setPointerCapture` + xử lý `pointercancel`; ngưỡng kéo 6/3 px.
- [ ] **P-29** `PourHandle` 3D (gizmo mới) + **dial 2D** cho cảm ứng (vùng chạm ≥ 48 px) + nút "Rót" lớn giữ-để-rót.
- [ ] **P-30** Chuột phải kéo dọc / bánh xe để nghiêng; chạm giữ 350 ms chọn bình trên cảm ứng.
- [ ] **P-31** Bàn phím: `Tab/Enter/↑↓/Q-E/Space/Esc` + `aria-live`.
- [ ] **P-32** `ChemicalDragLayer`: thay HTML5 DnD bằng pointer-drag có ghost, highlight bình mục tiêu; thêm luồng "chạm hóa chất → chạm bình". Giữ DnD cũ làm đường lui trên desktop nếu cần.
- [ ] **P-33** Quỹ đạo ngắm (đường chấm) + vòng điểm rơi (xanh/vàng/đỏ) khi bắt đầu nghiêng.
- [ ] **P-34** `PourHUD`: mL đã rót/mục tiêu, lưu lượng, góc, gợi ý ngắn (vi/en, tắt được).
- [ ] **P-35** Haptics `navigator.vibrate` (kiểm tra hỗ trợ, bọc try/catch).
- [ ] **P-36** E2E: cảm ứng giả lập rót bằng dial; chuột rót bằng kéo; bàn phím rót; cả 3 cho kết quả mL như nhau (±0.5).

## PHẦN I — V: HIỂN THỊ RÓT (P0/P1)

- [ ] **V-01** `PourStream`: ống 24 đoạn dựng sẵn + vertex shader quỹ đạo (uniform `p0,v0,g,tLand`), không tạo geometry mỗi frame.
- [ ] **V-02** Bán kính theo liên tục `r=r0√(v0/v)`, nhiễu pháp tuyến cuộn, vật liệu Physical (+ `onBeforeCompile` Fresnel, hấp thụ theo độ dày).
- [ ] **V-03** Vỡ giọt (Rayleigh–Plateau) → chuỗi giọt InstancedMesh hình giọt nước kéo giãn theo vận tốc; 3 chế độ dòng (laminar/dày/hỗn loạn).
- [ ] **V-04** Dòng dán thành/teapot: màng chảy xuống thành ngoài (`WallFilm`) + giọt cuối ở mép.
- [ ] **V-05** `ImpactFX`: gợn tròn đồng tâm (shader), tắt dần theo thời gian mô phỏng.
- [ ] **V-06** Vương miện/giọt bắn đạn đạo (ít, nhỏ), bong bóng cuốn xuống rồi nổi (InstancedMesh, ngân sách theo bậc).
- [ ] **V-07** Mặt thoáng **nằm ngang** khi bình nghiêng: clipping plane theo `solveLevel`, đĩa mặt thoáng theo mặt phẳng, meniscus.
- [ ] **V-08** Sóng sánh lò xo giảm chấn (nguồn & đích) theo gia tốc/góc.
- [ ] **V-09** Đám màu loang (`uInject`) từ điểm rót; màu hòa dần theo Beer–Lambert; không "bật công tắc".
- [ ] **V-10** Gạn (decantation): rắn/kết tủa nằm lại khi chỉ nghiêng nhẹ; trượt khi nghiêng mạnh.
- [ ] **V-11** Chai gốc LatheGeometry + nhãn canvas (tên, GHS) + nút mài; chai đến từ phía gần camera, né vật cản.
- [ ] **V-12** Thìa/panh/ống nhỏ giọt mô hình thật hơn; giọt hình thành (cầu phồng → thắt cổ → rơi).
- [ ] **V-13** Hạt rắn rơi/nảy/chìm (InstancedMesh, ngân sách), bụi bốc nhẹ cho bột mịn.
- [ ] **V-14** `SpillFlow`: vũng mép không đều, lan dần, phản chiếu, vết bắn, bay hơi; viền cảnh báo nguy hiểm.
- [ ] **V-15** Bình chứa nóng: hơi từ dòng chảy khi ≥ 60 °C.
- [ ] **V-16** Bậc chất lượng cho toàn bộ V-series (Low/Medium/High) đúng bảng trong spec; kiểm bằng `?q=`.
- [ ] **V-17** Ảnh chụp mốc cho từng mode × 3 bậc → `agent/shots/pour/`; kiểm mắt: không răng cưa lộ liễu, không nhấp nháy, không xuyên hình học.
- [ ] **V-18** Gallery `?pour=1`: nút kích từng mode + bật vẽ quỹ đạo/điểm rơi/số hạt.

## PHẦN J — A: ÂM THANH & HAPTICS (P1)

- [ ] **A-01** `PourAudio`: noise → bandpass; cao độ tăng theo mức đầy đích; biên độ theo Q; pause/timeScale.
- [ ] **A-02** Glug chai cổ hẹp; giọt nhỏ; rắn rơi nảy; chạm kính; tràn.
- [ ] **A-03** `AudioContext` chỉ resume sau cử chỉ đầu tiên (iOS); bao `webkitAudioContext`; nút tắt tiếng hiện có.
- [ ] **A-04** Giới hạn số node âm đồng thời; ngắt sạch khi `cancelPour`.
- [ ] **A-05** Nối âm thanh với sự kiện VFX phản ứng (fizz theo `gasRate`, xèo Na, nổ, whoosh đèn cồn).

## PHẦN K — G: HẠ TẦNG VFX & CẢNH (theo `chemlab_threejs_vfx_prompt.md`)

**Hạ tầng (P0):**
- [ ] **G-01** `src/vfx/quality.ts` + slice store + lưu; tích hợp M-13.
- [ ] **G-02** `src/vfx/bus.ts` sự kiện có kiểu (dùng chung với pour).
- [ ] **G-03** `src/vfx/glsl/noise.glsl.ts` (simplex, fbm, curl) + test biên dịch shader bằng spike.
- [ ] **G-04** `textures.ts`: soft-sprite, noise, gạch men, vạch chia ml, caustic (CanvasTexture/DataTexture).
- [ ] **G-05** `ParticlePool` ring-buffer + RNG seed; test không cấp phát (đếm).
- [ ] **G-06** `Environment` code-only (Lightformer): softbox + 2 dải đèn ống + mảng trời nhạt; giảm ambient; kiểm bằng ảnh.
- [ ] **G-07** `PostFX` theo bậc (Bloom + SMAA + ToneMapping AGX + Vignette; N8AO ở High) với phiên bản đã ghim ở R-04.
- [ ] **G-08** Bóng đổ: shadow map 2048, hẹp frustum, bias; kiểm không acne.
- [ ] **G-09** `schema`: thêm `reaction_id`; `ActiveKineticsState.reactionId`; cache `MixResult` mang theo id.
- [ ] **G-10** `VfxDirector` + registry recipe + `buildGenericRecipe` (phản ứng AI).

**Cảnh & vật liệu (P1):**
- [ ] **G-11** Kính chuẩn: vật liệu chung theo bậc; bỏ tổ hợp transmission+opacity cũ; Low = kính giả Fresnel.
- [ ] **G-12** Hình học bình bằng `LatheGeometry` (thành dày, gờ miệng, mỏ rót, đáy cầu); vạch chia ml theo dung tích.
- [ ] **G-13** Chất lỏng: shader Beer–Lambert, Fresnel viền, sóng mặt, `uTurbidity`, meniscus.
- [ ] **G-14** Caustic dưới bình theo màu/thể tích.
- [ ] **G-15** Mặt bàn epoxy + (High) phản chiếu mờ; tường gạch men; cửa sổ + chùm sáng; kệ chai có nhãn.
- [ ] **G-16** Đèn cồn: ngọn lửa shader (xanh gốc → vàng ngọn), pointLight nhấp nháy, heat-haze (High), lụi dần khi hết cồn, lưới amiăng/đáy bình phát sáng đỏ.

**Hệ hạt (P0/P1):**
- [ ] **G-17** Bubbles (shader Fresnel, lớn dần khi nổi, nổ ở mặt thoáng) + emitters (solid/bulk/bottom/surface).
- [ ] **G-18** GasPlume/Smoke (billboard, curl-noise, buoyancy âm cho khí nặng).
- [ ] **G-19** Steam theo nhiệt độ liên tục (≥ 60 °C dần).
- [ ] **G-20** Foam (cụm bong bóng, viscous trào & chảy xuống thành ngoài → `addSpill`).
- [ ] **G-21** Splash/Droplets đạn đạo + vết bắn.
- [ ] **G-22** Precipitate lắng thật (milky/curdy/flake-gold/gel/powder-black/metal-copper) + lớp đáy gồ ghề.
- [ ] **G-23** Sparks/tia lửa (additive, bloom, kéo vệt).

**Recipe từng phản ứng (mỗi dòng 1 task; xem bảng trong VFX spec):**
- [ ] **G-24** `hcl_naoh_neutralization` (schlieren + phenolphtalein hồng tan)
- [ ] **G-25** `h2so4_naoh_neutralization` (tỏa nhiệt, heat shimmer)
- [ ] **G-26** `bacl2_h2so4_precipitate` (sữa trắng nở, Tyndall, lắng chậm)
- [ ] **G-27** `agno3_nacl_precipitate` (vón cục)
- [ ] **G-28** `golden_rain_pbi2` (tinh thể lục giác lấp lánh, bloom)
- [ ] **G-29** `cuso4_naoh_precipitate` (keo xanh lam)
- [ ] **G-30** `fe_cuso4_displacement` (phủ đồng + mặt trận màu)
- [ ] **G-31** `caco3_hcl_gas` (bong bóng trên đá, CO₂ nặng tràn xuống bàn)
- [ ] **G-32** `zn_hcl_gas` (H₂ li ti dày)
- [ ] **G-33** `mg_hcl_gas` (dải Mg lao, sủi dữ, tràn)
- [ ] **G-34** `h2o2_mno2_decomposition` (kem đánh răng voi, chảy xuống thành)
- [ ] **G-35** `nh3_hcl_fumes` (khói trắng dày, sương bám kính)
- [ ] **G-36** `na2co3_hcl_gas` (sủi đồng nhất)
- [ ] **G-37** `cuoh2_thermal_decomposition` (xanh→đen từ đáy, giọt ngưng tụ)
- [ ] **G-38** `iodine_sublimation` (hơi tím tầng, ngưng tụ tinh thể)
- [ ] **G-39** `water_into_conc_h2so4_explosion` (**cảnh nổ**: bắn tóe, sóng xung kích, chớp ≤ 3 lần/s, rung camera, slow-mo, còi)
- [ ] **G-40** `sodium_water_reaction` (viên Na chạy, xèo, bùng cháy vàng, nổ "bụp")
- [ ] **G-41** `cu_conc_h2so4_heated` (dòng xanh nặng, SO₂ mỏng)
- [ ] **G-42** Hiệu ứng chung: KMnO₄/K₂Cr₂O₇ tỏa dải màu; phenolphtalein nhỏ giọt lóe hồng.
- [ ] **G-43** `VfxGallery ?vfx=1`: nút từng recipe, số hạt, draw calls.
- [ ] **G-44** Chụp ảnh chuỗi (t=0,25,50,75,100 %) cho **mỗi** recipe × bậc Medium → `agent/shots/vfx/<id>/`. Kiểm mắt từng ảnh; ghi nhận xét vào PROGRESS.md (đẹp/cần chỉnh); chỉnh tối đa 2 vòng/recipe.
- [ ] **G-45** Thử 5 thí nghiệm có hướng dẫn (`experiments.ts`) bằng `__chemlab` từ đầu đến cuối; không lỗi, hiện đúng hiệu ứng.

## PHẦN L — F: HIỆU NĂNG & PIN (P0/P1)

- [ ] **F-01** `frameloop="demand"` + `invalidate()` khi có thứ động (rót, kinetics, đèn cồn, kéo, damping camera, âm). *verify:* cảnh tĩnh ≈ 0 frame/5 s.
- [ ] **F-02** `AdaptiveDpr`/`dpr` theo bậc; giảm dpr tạm khi kéo/xoay camera.
- [ ] **F-03** Gộp `useFrame` của hệ hạt thành 1 vòng/hệ; bỏ vòng lặp thừa khi ngủ.
- [ ] **F-04** Vật liệu/geometry dùng chung (singleton), dispose đúng; kiểm `renderer.info.memory` ổn định sau 200 lần rót + 100 lần reset.
- [ ] **F-05** Giảm draw call: merge decor tĩnh (bàn, tường, kệ) bằng `mergeGeometries`; instancing chai trên kệ.
- [ ] **F-06** Kiểm shader: không vòng lặp biến thiên; `precision` có kiểm tra; fallback khi thiếu extension.
- [ ] **F-07** Đo tier Low dưới CPU throttle 4×: mục tiêu ≥ 30 FPS ở cảnh 4 bình + sủi; điều chỉnh ngân sách nếu chưa đạt.
- [ ] **F-08** Giảm tải re-render React: `React.memo`, selector hẹp; kiểm Profiler ở cảnh rót.
- [ ] **F-09** Bundle: code-split modal/panel nặng, `recharts` lazy; ghi so sánh kích thước trước/sau.
- [ ] **F-10** Trì hoãn tạo AudioContext, lazy-load `PostFX` khi bậc cho phép.
- [ ] **F-11** Báo cáo METRICS.md: bảng trước/sau theo cảnh × bậc × thiết bị giả lập.

## PHẦN M — L: HOÀN THIỆN (P1/P2)

- [ ] **L-01** i18n: mọi chuỗi mới có `vi`/`en`; định dạng số `Intl`.
- [ ] **L-02** Hướng dẫn nhanh lần đầu (3 thẻ ngắn: chọn bình – nghiêng/giữ Rót – xem phản ứng), tắt vĩnh viễn được.
- [ ] **L-03** Cài đặt: chất lượng, hỗ trợ ngắm, rung, âm, giảm chuyển động, ngôn ngữ — gom 1 bảng.
- [ ] **L-04** Camera điện ảnh nhẹ khi phản ứng (có nút tắt); DOF ở High.
- [ ] **L-05** Thông báo an toàn gắn với rót (axit đặc, chì…) dùng `safetyEngine`, hiển thị không che khu thao tác.
- [ ] **L-06** Kiểm tra các modal với dữ liệu mới (`contents`, nhiệt độ trộn) hiển thị đúng.
- [ ] **L-07** `ROD_GUIDED` (rót dọc đũa) + chấm điểm quy trình pha loãng axit.
- [ ] **L-08** `FUNNEL` (phễu) cho miệng hẹp (P2).
- [ ] **L-09** Chế độ trình chiếu (`isPresentationMode`) tương thích hiệu ứng mới (UI ẩn, camera mượt).
- [ ] **L-10** Dọn code chết: `VesselTiltGizmo` cũ (nếu thay), bình giả, đoạn trùng; cập nhật comment.

## PHẦN N — S: SOAK, FUZZ, DỌN NỢ (chạy cho đến sáng)

*Khi mọi P0/P1 xong, **không nghỉ** — lặp các vòng sau theo thứ tự; mỗi vòng ghi kết quả vào METRICS.md/BLOCKERS.md.*

- [ ] **S-01** Quay lại mọi mục `[~]` trong PROGRESS.md; thử cách khác; đóng hoặc ghi lý do chắc chắn không làm được.
- [ ] **S-02** Fuzz e2e: 300 chuỗi thao tác ngẫu nhiên (seed ghi lại) trên 3 thiết bị giả lập; thu mọi `console.error`, `pageerror`, mất khung; mỗi lỗi → test tái hiện → sửa.
- [ ] **S-03** Soak 30 phút: lặp rót qua lại + phản ứng + đun; theo dõi bộ nhớ JS heap, `renderer.info.memory`, số object Three (`scene.traverse` đếm); nghi rò ⇒ tìm & vá.
- [ ] **S-04** Kịch bản "tay vụng": nghiêng quá tay, rót ngoài miệng ống nghiệm, rót vào bình đầy, rót nước vào axit đặc, đun bình rỗng; tất cả phải có hành vi hợp lý, không NaN/kẹt.
- [ ] **S-05** Pause/resume/timeScale ở mọi pha của mọi mode; cancel ở từng trạng thái controller.
- [ ] **S-06** Đổi bậc chất lượng giữa lúc đang rót/phản ứng; không crash, hiệu ứng chuyển mượt.
- [ ] **S-07** Mất ngữ cảnh WebGL giữa lúc rót; khôi phục; số liệu thể tích vẫn đúng.
- [ ] **S-08** Resize/xoay liên tục 50 lần trong lúc rót; không méo, không rò.
- [ ] **S-09** Chạy lại toàn bộ e2e + ảnh chụp, so sánh với lần trước; xử lý hồi quy.
- [ ] **S-10** Rà soát TypeScript: giảm `any`, bật thêm kiểm tra nghiêm ngặt trên thư mục mới (`src/pour`, `src/vfx`).
- [ ] **S-11** Rà soát console: 0 error/warn trong smoke ở mọi thiết bị.
- [ ] **S-12** Tối ưu lần 2 dựa trên METRICS: top 5 hệ tốn nhất → cắt/gộp; đo lại.
- [ ] **S-13** Tinh chỉnh hình ảnh lần 2: xem lại toàn bộ ảnh chụp; chọn 10 ảnh "xấu nhất" và cải thiện.
- [ ] **S-14** Tinh chỉnh cảm giác rót: đo thời gian 50/100/250 mL ở HAND_TILT và ASSIST; chỉnh `pourTimeCompression`, `Cd`, ngưỡng bám để nằm trong 6–12 s/100 mL.
- [ ] **S-15** Viết `agent/HOWTO.md`: chạy dev, gallery, test, tiêu chuẩn thêm recipe/mode mới.
- [ ] **S-16** Nếu còn thời gian: mở rộng recipe cho hóa chất chưa có phản ứng tất định (K+H₂O lửa tím, Al+CuSO₄, S cháy xanh…) — **chỉ phần hiển thị hòa tan/pha màu**, không thêm hóa học mới nếu chưa có spec.

## PHẦN O — TIÊU CHÍ DỪNG

Dừng khi **một** điều kiện đúng: (1) mọi task P0 và P1 xong và S-series chạy ≥ 1 vòng sạch; (2) còn ≤ 20 phút ngân sách; (3) 3 cổng đầy đủ liên tiếp đỏ vì nguyên nhân ngoài tầm (ghi BLOCKERS). Trước khi dừng: kill mọi tiến trình nền, `git status` sạch, tag `ckpt-final`.

## PHẦN P — BÁO CÁO SÁNG (`agent/REPORT.md`)

Phải có: (1) **Tóm tắt 10 dòng**: làm được gì, chưa làm được gì. (2) Bảng task: xong / bỏ qua / chặn (kèm lý do). (3) Ảnh "trước/sau" ghim đường dẫn (`agent/shots/...`) và `agent/shots/index.html`. (4) METRICS trước/sau. (5) Danh sách lỗi đã sửa (B-series) kèm test hồi quy. (6) Quyết định kỹ thuật quan trọng (link DECISIONS.md). (7) Rủi ro còn lại + việc người cần kiểm trên **máy thật** (iOS Safari, Android tầm thấp). (8) Cách chạy lại: lệnh dev/test/gallery/e2e. (9) Danh sách commit theo phần. (10) Gợi ý bước tiếp theo.
