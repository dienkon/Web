# Sửa cách vẽ tinh thể và thao tác xoay

Làm trực tiếp trên `main`, sau `6ea8e4cf`. Chưa push hoặc deploy.

## Kết quả

- Có **đường nối lân cận** thay vì chỉ hiện những cầu rời rạc. Áp dụng cho cả 306 mô hình pha, ảnh xem trước và GLB tải xuống. Có nút ẩn/hiện đường nối riêng.
- Giữ nguyên tọa độ, ô mạng, nhóm không gian, pha, điều kiện mẫu và độ chiếm chỗ của dữ liệu nguồn. Không thay mọi chất bằng cùng một ô lập phương.
- Mặc định nền sáng, ẩn khung/lưới ô mạng và cảnh trưng bày. Khung ô mạng và vị trí trống có nút bật riêng; không xóa nguyên tử nguồn để làm mô hình nhẹ hơn.
- Thay OrbitControls bằng TrackballControls: kéo xoay liên tục qua hai cực, không khóa theo trục đứng. Một ngón tay xoay, hai ngón tay thu/phóng và dịch chuyển. Cập nhật vùng bắt thao tác khi cuộn/đổi kích thước, phân biệt kéo với chọn nguyên tử.
- Gộp nguyên tử và đường nối bằng instancing; giữ được chọn từng vị trí, ẩn từng nguyên tố, lặp ô và độ chiếm chỗ. Giảm độ phân giải trong lúc kéo rồi phục hồi khi thả; giảm số đa giác của cầu khi ô quá dày. Dừng vẽ khi cảnh đứng yên hoặc ra khỏi vùng nhìn.

## Đối chiếu với hình Wiki

Đã đọc [bài người dùng dẫn](https://vi.wikipedia.org/wiki/C%E1%BA%A5u_tr%C3%BAc_tinh_th%E1%BB%83), [NaCl](https://en.wikipedia.org/wiki/Sodium_chloride), [mạng kim cương](https://en.wikipedia.org/wiki/Diamond_cubic), [FCC/HCP](https://en.wikipedia.org/wiki/Close-packing_of_equal_spheres) và xem [hình NaCl trên Commons](https://commons.wikimedia.org/wiki/File:Sodium-chloride-3D-ionic.png). Hình cầu–que là một cách biểu diễn cấu trúc; màu cầu và góc camera không xác định loại mạng.

Kiểm tra láng giềng tuần hoàn trên các tọa độ thật:

| Cấu trúc | Số láng giềng đã kiểm tra |
| --- | --- |
| NaCl / halite | Na: 6 Cl, Cl: 6 Na |
| CsCl (ô kiểm chứng hình học) | Cs: 8 Cl, Cl: 8 Cs |
| CaF₂ / fluorite | Ca: 8 F, F: 4 Ca |
| Si / mạng kim cương | 4 Si |
| Fe / BCC | 8 Fe, không nối thêm lớp thứ hai |
| Al / FCC | 12 Al |
| Mg / HCP | 12 Mg |
| Thạch anh | Si: 4 O, O: 2 Si |
| F₂ rắn α | Mỗi F có một F trong phân tử |

Đường nối được tính bằng ảnh tuần hoàn trong metric đầy đủ của ô, kể cả ô xiên và cặp nguyên tử đi qua hai mặt đối diện. Cắt đường tại biên ô; không nối tắt xuyên qua ô do dùng sai khoảng cách Cartesian. Dùng ngưỡng bán kính cộng hóa trị cho phi kim và lớp lân cận gần cho ion/kim loại, giữ cặp gần nhau nhất khi tổng bán kính đánh giá quá ngắn (F₂). Phương pháp ngưỡng khoảng cách tham khảo [tài liệu neighbor list của ASE](https://docs.ase-lib.org/ase/neighborlist.html).

Đây là **lớp biểu diễn lân cận**, không phải phép tính bậc liên kết hay trạng thái electron. CIF gốc vẫn không bị chèn những liên kết suy đoán. Mẫu bất trật tự giữ các vị trí bán phần của nguồn; không coi mọi vị trí thay thế cùng chiếm chỗ đầy.

## Kiểm chứng

- [display-audit.json](display-audit.json): 306 pha có đường nối, tọa độ đầu vào không bị sửa. Caffeine 2 × 2 × 2 giữ 6.144 vị trí nguyên tử; số đối tượng vẽ từ 10.782 ở cách vẽ cũ còn 23 nhóm đang hiện. Các vị trí trống không phải nguyên tử và chỉ hiện lưới khi người dùng bật.
- [crystal-render-verification.json](crystal-render-verification.json): render 306 GLB bằng Chromium WebGL, không lỗi.
- 28 kiểm thử Node: láng giềng chuẩn, ảnh tuần hoàn, ô xiên, tọa độ/occupancy trước và sau instancing, CIF/GLB và các liên kết học tập.
- 8 kiểm thử Chromium: chọn nguyên tử, ẩn/hiện đường nối, mặc định sáng và không lưới, kéo liên tiếp nhiều hướng, cảm ứng trên caffeine 2 × 2 × 2, đổi phân tử/tinh thể và giao diện điện thoại.
- Build tài liệu số, build static và TypeScript đạt. Số nhóm vẽ không phải phép đo FPS trên mọi thiết bị.

Ảnh giao diện thật: [NaCl có đường nối và nền sáng](nacl-light-connected.png), [Si dạng kim cương lặp 2 × 2 × 2](silicon-diamond-connected.png), [caffeine trên điện thoại](caffeine-mobile.png). [Thông số từ trình duyệt](browser-snapshots.json) ghi số vị trí, số đường nối và số lệnh vẽ thực tế của từng ảnh; không có lỗi JavaScript.

Các API đồ họa dùng theo [TrackballControls](https://threejs.org/docs/pages/TrackballControls.html) và [InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) của Three.js; triển khai dựa trên phiên bản 0.165 có trong repository.

```powershell
node --test tests/crystal-display.test.mjs tests/application-crystal-review.test.mjs tests/cod-crystals.test.mjs tests/crystal-structures.test.mjs tests/learning-upgrade.test.mjs
node scripts/generate-crystal-assets.mjs
node scripts/generate-crystal-assets.mjs --wiki
node scripts/generate-crystal-assets.mjs --substances
node scripts/generate-crystal-assets.mjs --cod
node scripts/render-mineral-previews.mjs --all-crystals
npm --prefix trung-tam run build
npm run build:static
# Sau khi các bước build/copy đã hoàn tất:
npx playwright test tests/browser/crystal-display.spec.mjs tests/browser/molecular-crystals.spec.mjs --project=chromium
```
