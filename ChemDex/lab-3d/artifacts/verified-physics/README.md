# Bằng chứng kiểm tra nhánh vật lí thử nghiệm

- `baseline.json`: 2.470 test trước nâng cấp.
- `test-results.json`: 2.530 test qua, không có test thất bại; loại `tests/performance.smoke.test.ts` để giữ artifact lịch sử.
- `coverage.json`, `coverage.vi.md`: 184 hồ sơ, tất cả còn nhãn ước lượng khi chưa đo thực nghiệm.
- `browser-audit.json`: Chrome desktop và viewport cảm ứng; bật/pause, sáu fixture và lưu/khôi phục.
- `interaction-audit.json`: cầm/thả bằng chuột Playwright và touch CDP; không có lỗi JavaScript.
- `physics-1440.png`, `physics-390.png`: giao diện thực tại các viewport.
- `tilted-regression/`: hồi quy khung tọa độ hạt cho bốn bình và plume khí.
- `runtime-cpu.json`: fixture CPU Node 20 bình/50 khối rắn, ba fixture dòng và hai fixture nhiệt. P95 195,51 ms cho bốn tick và snapshot, **chưa đạt** ngân sách. Không phải benchmark FPS hoặc điện thoại.

TypeScript và build đã chạy thành công. Build còn cảnh báo bundle lớn. Các báo cáo số học/phần mềm không thay thế hiệu chuẩn thiết bị thật. Phần chưa nghiệm thu được ghi tại `docs/research/verified-physics.vi.md`.

Chạy từ thư mục `lab-3d`:

```powershell
npm run physics:audit
npm run physics:benchmark
npx vitest run --exclude tests/performance.smoke.test.ts --reporter=json --outputFile=artifacts/verified-physics/test-results.json
npm run lint
npm run build
# Với Vite đang phục vụ ở localhost:6773:
node scripts/auditVerifiedPhysics.mjs
node scripts/auditPhysicsInteraction.mjs
```
