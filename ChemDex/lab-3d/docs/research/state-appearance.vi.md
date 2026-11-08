# Hiệu ứng trạng thái vật chất — đợt quang học

Mục tiêu là làm chất lỏng, bọt, sương và kết tủa rõ nét, sinh động hơn khi dùng lab, đồng thời giữ màu/hình thái theo trạng thái của mẫu. Đây là nâng cấp hình ảnh; không chứng nhận đã hiệu chuẩn toàn bộ tính chất vật lí.

## Thay đổi

- Mặt chất lỏng tính pháp tuyến từ cùng hàm độ cao của meniscus, dao động và gợn. Phản chiếu chuyển theo độ dốc mặt thay vì giữ mặt phản xạ phẳng. Độ cao vẫn bị giới hạn bởi lớp lỏng còn lại; không tạo thêm thể tích.
- Màu tán xạ của huyền phù dùng cho cả thân lỏng và mặt thoáng; màu hấp thụ của chất hòa tan giữ riêng. Trọng số màu dùng chung ngân sách alpha, tránh pha trắng một lần rồi giảm alpha lần nữa khiến sắc tố bị bạc màu hai lần. Khi mẫu đang pause nhưng snapshot quần thể đã thay đổi, renderer đọc ngay độ đục hiện tại thay vì kẹt ở độ đục của khung đầu.
- Bọt dùng độ mờ của từng packet, gồm giai đoạn vỡ. Renderer không tự đặt một tuổi thọ mới cho khí.
- Kết tủa dùng độ mờ và độ phản xạ của profile; tinh thể có lớp phản xạ, gel trong hơn, kim loại giữ đúng metalness. Không bổ sung phát sáng cho chất không phát quang.
- Mesh kết tủa được scale theo **bán kính** thay vì đường kính. Tất cả glyph full/reduced nằm trong quả cầu đơn vị, do đó hình vẽ tuân theo vùng tiếp xúc đã giải. Hạt nhỏ hơn trước là sửa sai kích thước; không thay khối lượng hay tốc độ vận chuyển.
- Sương có cấu trúc mật độ mềm trong từng packet, di chuyển theo tuổi/seed của hạt. Không có đồng hồ hoạt ảnh độc lập chạy khi pause.
- Mặt bàn dùng normal map nhám nhẹ đúng không gian tiếp tuyến, có mipmap. Bỏ việc dùng ảnh nhiễu xám làm RGB normal gây lốm đốm sáng.

## Bằng chứng

- 2.537/2.537 test qua, gồm kiểm tra vùng bao của mọi profile kết tủa ở hai mức mesh, opacity, ngân sách alpha/màu, material và normal bàn. Loại `performance.smoke.test.ts` để không ghi đè artifact hiệu năng lịch sử.
- `npm run lint` và `npm run build` qua; build vẫn cảnh báo bundle lớn.
- `scripts/auditStateAppearance.mjs`: Chrome desktop 1440×1000 và viewport cảm ứng 390×844, bốn kho mẫu được khai báo; kiểm tra ma trận bán kính, opacity bọt, thuộc tính cấu trúc sương, pause và đổi quality low→medium. Không có lỗi JavaScript/WebGL.
- `scripts/auditTiltedParticles.mjs`: bốn loại bình nghiêng, đổi quality khi pause và plume NO2 trong tọa độ thế giới; giữ kiểm tra khối lượng và khung tọa độ.
- Artifact và ảnh nằm ở `artifacts/state-appearance`.

Audit hình ảnh dùng một số packet quang học được gieo có kiểm soát để kiểm tra upload/shader. Ảnh không chứng minh chúng được tạo bởi một phản ứng hay nguồn nhiệt cụ thể. Mẫu PbI2 có nhãn fixture tinh thể phiến, không tuyên bố trộn lạnh tự sinh mưa vàng. Các màu là xấp xỉ RGB từ profile hiện hữu; chưa phải phổ hấp thụ/tán xạ đo được.

Viewport cảm ứng là Chrome desktop giả lập, không thay thử điện thoại thật. Bộ kiểm tra này không đo FPS/GPU hay nghiệm thu hiệu năng toàn lab. Mục tiêu nâng cấp hiệu ứng còn tiếp tục: cấu trúc bọt xốp, hình ảnh chuyển pha/rắn và tương tác ánh sáng của các trạng thái cần kiểm tra thêm trên thiết bị thật.

Đợt bọt, băng tan và vật rắn tiếp theo được ghi tại [foam-ice-appearance.vi.md](foam-ice-appearance.vi.md).

```powershell
node scripts/auditStateAppearance.mjs
$env:TILTED_PARTICLE_AUDIT_OUTPUT='artifacts/state-appearance/tilted'
node scripts/auditTiltedParticles.mjs
```
