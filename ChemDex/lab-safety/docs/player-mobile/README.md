# Player, trang phục và mobile

[Plan](../PLAYER_MOBILE_PLAN.vi.md) · [Audit từng ảnh](AUDIT.vi.md)

## Thay đổi

- Palette/chất liệu chung cho vật phẩm, avatar, tay FPS và gương; áo có ve/nẹp đóng, 6 cúc, 3 túi, ráp lưng, gấu và cửa tay. Găng có ngón/cổ/nếp; quần có đường may; giày kín có cổ/dây/đế, trạng thái chưa mang dùng dép hở thật.
- Kính/đệm/tròng uốn cùng mặt; khẩu trang cong theo má, vòng dây đến tai. Năm kiểu tóc, dây buộc cùng model vật phẩm; mặt có chi tiết mắt/mày/tai/mũi/miệng.
- Gương cầm cùng loại bình CO₂/bột, hốt/chổi, thùng rác với tay FPS. Vòi/ống và van/chốt/cò theo simulation. Preview ngừng render lúc nhàn rỗi.
- Ghép chi tiết tĩnh trên từng bộ phận; 514 mesh opaque phòng ghép thành 82 batch, giữ proxy tương tác. Tài nguyên được giải phóng qua ba vòng tháo/lắp; cửa, ngăn kéo, ghế và nhân vật tách riêng.
- Vuốt bảo toàn tổng quãng; hình joystick gom theo rAF và dùng transform. Phản hồi input tức thời; cancel/lost capture/blur/hidden/modal không giữ trạng thái đi. Gia tốc/cúi dùng damping theo thời gian; giảm bob trên mobile, tôn trọng reduced motion của hệ điều hành.
- Auto mobile khởi tạo DPR 0,85, có thể xuống 0,7; tính cả frame chậm hơn 250 ms vào auto quality. Low coarse trình bày mục tiêu 30 Hz; gương compact 256×384, không MSAA, dành ít nhất hai frame chính giữa các lần cập nhật; dừng khi bị modal/ngoài tầm/ngoài khung nhìn.
- Sửa marker nhiệm vụ bay trước tủ hút chặn tia ngắm: lớp chỉ dẫn không tính như bề mặt vật lý.

## Bằng chứng

- [23 ảnh trước](before-character.json), [23 ảnh sau](after-character.json), sáu bảng `review-character-1…6.jpg`.
- [Wardrobe/gương/preview/vòng đời](browser-checks.json), [cảm ứng thực hai ngón và đổi quality](mobile-controls-checks.json), [quãng vuốt trước](before-touch.json) / [sau](after-touch.json).
- Core: 78 workflow, 421 bước; test gesture thực, học viện, 1.000 cập nhật buffer ống mềm; TypeScript/build.
- Browser hồi quy: PPE, vật cầm/phun bình thật, cửa/kiến trúc, ngăn kéo/tủ hút/đèn gas, 15 phân cảnh và frame UI, popup mobile, thực hành.

## Chạy lại

```powershell
npm run lint
npm run build
npm test
npm run test:practical
node scripts/check-touch-look.mjs after
node scripts/test-mutable-hose.mjs
node scripts/test-player-mobile-browser.mjs
node scripts/test-mobile-controls-browser.mjs
node scripts/profile-player-mobile.mjs after
node scripts/profile-batching-control.mjs
```

Browser cần Vite ở port 3000 và Chrome CDP 9222; các bài browser chạy tuần tự. Khi code đổi qua HMR, restart Vite trước các bộ dùng dynamic store import để dùng đúng cùng instance module. Phép kiểm bổ sung scene R3F lấy URL dependency thật của trang (bao gồm version query); import một URL dependency khác có thể tạo một registry test rỗng.

## Đo có kiểm soát phần ghép mesh

[JSON ABBA](batching-control.json). Cùng scene/avatar/camera, 844×390, DPR 0,85, preset Low, reduced motion; thứ tự tắt–bật–bật–tắt, mỗi mẫu 6 giây. Chỉ đổi visibility batch/proxy render; bounds/vị trí các model không đổi trong cả tám mẫu.

| CPU throttle | Tắt batch: FPS hai mẫu | Bật batch: FPS hai mẫu | Trung bình tắt → bật |
|---|---:|---:|---:|
| 1× | 30.16, 29.99 | 29.99, 29.99 | 30.07 → 29.99 |
| 4× | 7.64, 6.64 | 9.33, 9.90 | 7.14 → 9.62 |

Lượt vẽ 1.072 → 798 (−25,6%); tam giác 309.368 → 340.150 (+10,0%) do batch giữ nhiều phần trong frustum hơn. Bộ nhớ renderer ở cả hai trạng thái là 1.709 geometry / 125 texture: thử nghiệm đã upload cả bản gốc và batch trước khi đo, nên đây không phải so bộ nhớ cold-start. Giữ mesh gốc phục vụ bounds/raycast là chi phí có chủ ý.

Ở CPU 1× cả hai chạm giới hạn 30 Hz của preset Low nên không thể suy ra mức tăng FPS tối đa. Ở 4× hai mẫu bật đều nhanh hơn hai mẫu tắt; trung bình tăng khoảng 34,7%. Hai mẫu chưa đủ thành thống kê cho mọi thiết bị. Số này đo phần ghép mesh, không gán toàn bộ lợi ích cho model player.

## Kết quả Auto theo từng góc

[Trước](before-mobile.json) · [Sau](after-mobile.json) · [Audit ảnh và giới hạn](AUDIT.vi.md#ảnh-và-đo-mobiledesktop-cuối). CPU throttle 4×, GPU Intel UHD/D3D11 của máy tính; chưa thử điện thoại vật lý. Render DPR thay đổi theo auto quality, nên không gán toàn bộ mức tăng FPS cho ghép mesh.

| Khung/cảnh | FPS trước → sau | DPR trước → sau |
|---|---:|---:|
| mobile-844-room | 4.40 → 7.29 | 1.00 → 0.75 |
| mobile-844-mirror | 2.26 → 15.45 | 0.90 → 0.70 |
| mobile-844-mirror-off-axis | 1.97 → 14.14 | 0.90 → 0.70 |
| mobile-844-move-look | 4.87 → 13.63 | 0.70 → 0.70 |
| mobile-740-room | 2.15 → 10.66 | 1.00 → 0.75 |
| mobile-740-mirror | 1.77 → 11.05 | 0.90 → 0.70 |
| mobile-740-mirror-off-axis | 4.54 → 9.59 | 0.80 → 0.70 |
| mobile-740-move-look | 10.89 → 13.32 | 0.70 → 0.70 |
| desktop-room | 10.03 → 9.31 | 0.90 → 0.80 |
| desktop-mirror | 4.09 → 7.26 | 0.80 → 0.70 |
| desktop-mirror-off-axis | 3.09 → 7.75 | 0.70 → 0.70 |

Mẫu desktop nhìn phòng giảm 10,03 → 9,31 FPS; không khẳng định mọi góc đều nhanh hơn. Các P95 dưới CPU 4× vẫn cao: đã giảm chi phí và cải thiện input, nhưng chưa chứng nhận 30/60 FPS trên điện thoại thật. Muốn đánh giá tăng tốc riêng geometry, dùng bảng ABBA cố định DPR. Build thành công còn cảnh báo kích thước các chunk lớn.

[Validation](validation.json): 322 kiểm tra browser liên quan đã qua; catalog đủ 134 biến thể/805 kiểm tra, trong đó 13 model × 4 góc được render lại ở lượt này. Core/lint/build và kiểm buffer/touch đều qua.
