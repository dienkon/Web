# Nâng cấp vật lí có kiểm chứng

## Quy ước và chứng cứ

Lõi vật lí mới dùng m, kg, s, K, mol, J, Pa. Cảnh giữ 0,035 m/đơn vị qua adapter. Pha rắn/lỏng/khí tách khỏi cấu trúc dung dịch/huyền phù/gel/bọt/cặn. Các giá trị ma sát, khối lượng vỏ và cấp vật liệu chưa đo luôn mang trạng thái `estimated`.

Baseline trước thay đổi: 2.470/2.470 test qua (`artifacts/verified-physics/baseline.json`). Không suy ra độ chính xác thực nghiệm từ test phần mềm.

## Theo dõi các mốc

| Mốc | Nội dung | Trạng thái |
|---|---|---|
| 1 | Kiểm kê, đơn vị, hồ sơ vật thể, nguồn và giới hạn | Đã có registry và audit; kiểm chứng vật thể tiếp tục ở mốc 2 |
| 2 | Runtime Worker/Rapier, tiếp xúc, cầm/thả, liên kết | Đang triển khai |
| 3 | Kho chất, lực đẩy, dòng vận chuyển, quần thể có trọng số | Chưa nghiệm thu |
| 4 | Nhiệt, pha, khí và hóa học liên thông | Chưa nghiệm thu |
| 5 | Hai gói dụng cụ và mẫu mới | Đã có hồ sơ; chưa nghiệm thu thao tác |

## Mốc 1

- 184 hồ sơ: 15 loại bình, 24 dụng cụ/phụ kiện, 7 mẫu vật liệu, 94 mục hóa chất, 38 profile sản phẩm, 6 nhóm môi trường.
- Mỗi hồ sơ có ID ổn định, hành vi, tình huống kiểm chứng, nguồn nếu có và giới hạn. Các loại chưa chọn thiết bị thật chưa có chứng nhận thực nghiệm.
- Shell va chạm bình lấy cùng contour và phép biến đổi dung tích với renderer; chia thành nêm lồi để giữ lòng rỗng.
- Bộ cầm/thả đổi gia tốc SI sang thước cảnh, giữ vận tốc ngang; class vật lí cũ đổi xung lượng và năng lượng va chạm tại biên SI.
- 35 test mục tiêu qua, gồm rơi tự do theo nghiệm độc lập, registry, mass/inertia, hồi quy cầm/thả và canary.

## Nguồn

- [SCHOTT BOROFLOAT](https://www.schott.com/en-us/products/borofloat/technical-details): mật độ 2.230 kg/m³ tại 25 °C, nhiệt dung 830 J/(kg·K) trong 20–100 °C, độ dẫn nhiệt 1,2 W/(m·K) tại 90 °C. Dùng hằng số rút gọn; không chứng nhận thủy tinh thực của mọi bình.
- [IAPWS](https://iapws.org/documents/release): mô hình nước và hơi nước.
- [NIST, nhiệt nóng chảy băng](https://nvlpubs.nist.gov/nistpubs/jres/23/jresv23n6p643_A1b.pdf): tham chiếu 333.500 J/kg.
- [Dow PMX-200 100 cSt](https://www.dow.com/en-us/pdp.xiameter-pmx-200-silicone-fluid-100-cst.01013190z.html): cấp dầu silicone tham chiếu. Không dùng chung cho mọi dầu silicone.
- [NIST hiệu chuẩn thể tích](https://nvlpubs.nist.gov/nistpubs/ir/2019/NIST.IR.7383-2019.pdf): phân biệt chứa/nhả và nhiệt độ hiệu chuẩn.

## Chạy lại

```powershell
node --import tsx scripts/auditPhysicalCoverage.ts
npx vitest run tests/physical_foundation.test.ts tests/held_object_controller.test.ts tests/damage_and_physics.test.ts tests/canaries_k1_to_k5.test.ts --maxWorkers=2
```

Không ghi đè các artifact hiệu năng lịch sử. Báo cáo mới nằm dưới `artifacts/verified-physics`.
