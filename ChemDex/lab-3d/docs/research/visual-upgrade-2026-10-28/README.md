# Bằng chứng khảo sát Lab 3D — 28/10/2026

Bản phân tích, đặc tả và backlog nằm trong [nghiên cứu nâng cấp](../lab-3d-visual-upgrade.vi.md).

## Nội dung

| Tệp | Ý nghĩa |
|---|---|
| `browser-audit.json` | Lượt đo hoàn chỉnh sau khi typecheck và kiểm thử kết thúc; lưu GPU, tier, viewport, canvas, số đo theo cửa sổ và trạng thái phản ứng |
| `browser-summary.json` | Tóm tắt các cửa sổ đo; không coi trung vị các P95 cửa sổ là P95 toàn bộ frame |
| `browser-audit-first-pass.json` | Lượt khảo sát đầu có kiểm thử/typecheck đồng thời và bị HMR tải lại; giữ để truy vết, không dùng làm mốc chính |
| `browser-audit-aborted.json` | Lượt bị timeout ở `networkidle`; không chứa một benchmark hoàn chỉnh |
| `browser-audit-aborted-hmr.json` | Lượt có ba cảnh desktop rồi mất execution context vì HMR; không dùng làm mốc hoàn chỉnh |
| `desktop-auto.png` | Cảnh khởi đầu ở chế độ tự động |
| `desktop-high.png`, `desktop-ultra.png` | Cùng cảnh với hai mức chất lượng; bằng chứng nhánh kính Ultra |
| `desktop-three-reactions.png` | Cảnh sau khi khởi chạy ba chương trình cục bộ |
| `mobile-default.png` | Hai drawer mở trên viewport 390 × 844 CSS px |
| `mobile-low-clear.png` | Đóng cả hai drawer, Low, cùng viewport |
| `typecheck.log` | Kết quả `npm run lint` |
| `baseline-tests.log` | 13 tệp, 188 ca kiểm thử đạt |
| `headless-performance.json` | Logic/physics benchmark từ kiểm thử có sẵn; không bao gồm render WebGL |
| `resource-diagnostic.json` | Lượt kiểm tra network bổ sung không bắt được phản hồi lỗi; chưa xác định nguồn hai thông báo console 404 của lượt đo chính |

Các ảnh thuộc lượt đo hoàn chỉnh cuối cùng. Không dùng FPS trên ảnh để thay cho chuỗi mẫu: screenshot và GPU readback có thể gây khựng ngoài khoảng đo. Ảnh mobile có kích thước pixel gấp đôi viewport CSS do DPR thiết bị mô phỏng bằng 2.

## Tái hiện

Từ thư mục `lab-3d`:

```powershell
$env:DISABLE_HMR='true'
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 6773 --strictPort
```

Khi server sẵn sàng, ở terminal riêng, không chạy song song build/typecheck/test:

```powershell
node scripts/researchLabVisuals.mjs
```

Script tạo context Chrome riêng và chỉ thay trạng thái mẫu trong context này. Nó dùng API chuẩn bị/chạy mẫu Studio cục bộ, không gọi AI để tạo phản ứng. Đây là công cụ khảo sát, không phải suite chấp nhận sản phẩm hoặc benchmark production. Nếu sử dụng vào ngày khác, cập nhật đường dẫn/ngày và phương pháp trong script trước khi ghi đè bằng chứng ngày này.

`browser-summary.json` là tóm tắt của lần khảo sát này. Khi chạy lại harness, lấy số đo mới trực tiếp từ `browser-audit.json` hoặc tái tạo summary; không coi summary cũ là kết quả của lượt vừa chạy.

Kiểm tra nền đã chạy:

```powershell
npm run lint
node node_modules/vitest/vitest.mjs run tests/quality_adaptation.test.ts tests/shared_liquid_motion.test.ts tests/gas.visuals.test.ts tests/gas_flux_and_plume.test.ts tests/silver_halide_effects.test.ts tests/sodium_water_realism.test.ts tests/precipitate_lifecycle.test.ts tests/pour_material_truth.test.ts tests/emitted_vapor_visuals.test.ts tests/foam_inventory.test.ts tests/simulation_clock_consistency.test.ts tests/ledger_conservation.test.ts tests/performance.smoke.test.ts --maxWorkers=2
```

Kiểm thử performance hiện có tự ghi `artifacts/science-audit/headless-performance.json`. Lần khảo sát này đã chép kết quả sang thư mục bằng chứng và khôi phục artifact tracked vốn sạch về nội dung trước khi chạy, để thay đổi nghiên cứu chỉ nằm trong tài liệu/công cụ khảo sát mới.

Chưa xác minh trên iPhone/Android thật, Safari, production build hoặc bằng GPU timer. FPS headless trên GPU máy tính không đại diện FPS điện thoại. Draw call/triangle trong telemetry hiện tại bị thiếu khi hậu xử lý hoạt động, đã phân tích tại F02 của bản nghiên cứu.
