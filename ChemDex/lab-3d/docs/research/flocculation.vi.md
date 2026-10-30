# Kết bông, vỡ bông và điều khiển khuấy trong lab 3D

Ngày 29/10/2026. Nâng cấp tiếp đường mô phỏng kết tủa đang hoạt động, không tạo thêm phản ứng hóa học chỉ để có hiệu ứng.

## Thay đổi hành vi

`aggregationLevel` trước đây luôn bằng 1, còn `aggregationRate` trong profile không điều khiển được tiến hóa quần thể. Hiện mỗi chất được hỗ trợ có hai quần thể: phần lơ lửng và phần đã lắng. Mỗi quần thể giữ khối lượng rắn, số đơn vị cấu thành ban đầu và số cụm theo mô hình trung bình.

Va chạm Brownian và do shear làm giảm số cụm, tăng kích thước cụm trung bình. Bông xốp có mật độ hiệu dụng thấp hơn vật liệu đặc; lực cản và Brownian dùng bán kính cụm, độc lập với kích thước phóng đại của glyph. Khi shear vượt ngưỡng giả định, bông có thể vỡ thành cụm nhỏ hơn. Khối lượng rắn không thay đổi do kết bông hay vỡ bông.

Lắng chuyển cả ba moment vào lớp lắng. Khuấy tái huyền phù chuyển chúng trở lại, giữ lịch sử của bông thay vì tạo lại hạt mới. Rút mẫu lấy cùng tỷ lệ moment; hòa tan giảm khối lượng và bán kính đơn vị cấu thành. Kết tủa mới bổ sung các đơn vị ban đầu vào hỗn hợp. Đóng băng ngừng tiến hóa kết bông; mẫu khô giữ chất rắn trong lớp cặn.

Trong bảng thông tin bình có thêm **Mức khuấy: Nhẹ / Vừa / Mạnh**. Nút **Khuấy đều** và dụng cụ đũa khuấy đều truyền tác động tới chất lỏng. Trước đó, nút khuấy chỉ tạo chuyển động đũa trong khi renderer vật lý chỉ đọc dụng cụ đang chọn. Khởi động lại một lượt khuấy thay thế hạn dừng cũ, tránh lượt mới bị timer trước dừng sớm.

Đổi chất lượng đồ họa giữ cùng simulation manager và lịch sử quần thể; chỉ thay ngân sách glyph và phân phối lại trọng số hiển thị. Vật liệu chất lỏng đọc manager hiện có thay vì tự tạo một manager rỗng. Xóa bình thì registry dọn manager tương ứng; bình vỡ ngừng hiệu ứng và reset phần mô phỏng đồ họa.

## Phương trình và đơn vị

Đây là closure một kích thước trung bình, không phải mô phỏng từng va chạm của các glyph:

```text
m0       = rho_s * (4*pi/3) * r0^3                    [kg]
n0       = primaryCount / liquidVolume                [1/m^3]
N        = primaryCount / clusterCount                [dimensionless]
R        = r0 * N^(1/Df)                              [m]
phi_s    = N^(1 - 3/Df)                               [dimensionless]
rho_eff  = rho_f + (rho_s - rho_f) * phi_s             [kg/m^3]
K_B      = 8*k_B*T / (3*mu)                           [m^3/s]
K_S      = (32/3)*G*R^3                               [m^3/s]
dN/dt    = (alpha/2)*(K_B + K_S)*n0                   [1/s]
k_break  = k0 * max(0, G/Gcrit - 1)^2                  [1/s]
N_after  = 1 + (N_growth - 1) * exp(-k_break*dt)
```

Brownian kernel cho hai cầu bằng nhau được suy ra từ `4*pi*(R1+R2)*(D1+D2)` và hệ thức Stokes–Einstein. Hệ số 1/2 tránh đếm hai lần một cặp. Với kernel Brownian hằng và không vỡ bông, nghiệm kiểm tra là `N(t) = 1 + alpha*K_B*n0*t/2`.

Runtime tích phân tăng trưởng bằng midpoint trong bước cố định 1/120 s, rồi tích phân suy giảm do vỡ bằng hàm mũ. Giới hạn số đơn vị trong một cụm chặn sự phát triển ngoài miền mà closure đơn giản này hỗ trợ. Tốc độ lắng dùng bộ giải lực cản cầu hiện có với `R` và `rho_eff`; không dùng mật độ vật liệu đặc cho toàn bộ thể tích nước chứa trong bông.

## Tham số được công khai là giả định

| Họ chất | alpha | Df | N tối đa | Gcrit (s⁻¹) | k0 (s⁻¹) |
|---|---:|---:|---:|---:|---:|
| Cu(OH)₂, Fe(OH)₃, Al(OH)₃, Zn(OH)₂, Fe(OH)₂, Ni(OH)₂, Co(OH)₂, Mn(OH)₂ | 0,45 | 2,2 | 32 | 35 | 0,25 |
| AgCl, AgBr, AgI, CuI | 0,30 | 2,4 | 24 | 50 | 0,20 |

Các giá trị trên là tham số minh họa cho tiến hóa hình thái, **không phải dữ liệu thực nghiệm của 12 kết tủa**. Bán kính ban đầu và mật độ vật liệu tiếp tục là đầu vào của profile hiện có; “đơn vị ban đầu” không có nghĩa là đã đo kích thước crystallite của mẫu thật.

Quy đổi điều khiển khuấy sang gradient trung bình dùng giả định `G = 80*a²`, với `a` là mức khuấy 0…1. Ba lựa chọn tương ứng `a = 0,3 / 0,65 / 0,95`; đây không phải hiệu chuẩn rpm của một máy khuấy. `PrecipitationSystem` cũng nhận được gradient `velocityGradient_s_1` tường minh cho kiểm tra định lượng kernel. Không suy ra hệ số SI từ trường `aggregationRate` cũ.

BaSO₄, bột mịn khác, PbI₂ kết tinh và kim loại giữ đường transport riêng; model mới không được gán theo màu hoặc gán cho một chất chưa biết.

## Cơ sở tham khảo và giới hạn

- [The Smoluchowski Ensemble—Statistical Mechanics of Aggregation](https://pmc.ncbi.nlm.nih.gov/articles/PMC7597352/) trình bày cách mô tả phân bố và số cụm trong quá trình kết tụ. Ở đây chỉ sử dụng closure trung bình, không giải đầy đủ phân bố kích thước.
- [Maggi (2007), Variable fractal dimension](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2006JC003951) liên hệ cấu trúc fractal, mật độ hiệu dụng, lắng và kết/vỡ bông. Nghiên cứu cũng cho thấy Df biến thiên; việc dùng Df cố định ở đây là giản lược.
- [EPA, Turbidity Guidance Manual, mục 4.3.2](https://www.epa.gov/sites/default/files/2020-06/documents/swtr_turbidity_gm_final_508.pdf) mô tả ảnh hưởng của điều kiện khuấy tới hình thành bông và khả năng shear phá vỡ bông. Tài liệu về xử lý nước không cung cấp bộ hệ số cho các kết tủa trong app.

Mô hình chưa giải phân bố nhiều kích thước, điện thế bề mặt, biến đổi lực bám theo pH/ionic strength, shear cục bộ, độ thấm của bông hoặc va chạm giữa hai loài kết tủa. Trộn moment coi phần lơ lửng là đồng nhất; glyph vẫn là phần tử đại diện, có sai số lấy mẫu khi xác định vị trí lắng. Độ đục hiện có vẫn dựa trên khối lượng lơ lửng và là tín hiệu minh họa, không phải phép đo NTU hay phổ tán xạ.

## Kiểm tra lại

```powershell
node scripts/auditFlocculation.mjs
npx vitest run --maxWorkers=2 --exclude tests/performance.smoke.test.ts
npm run lint
npm run build
```

Browser audit cần Vite dev đang chạy tại `127.0.0.1:6773`. [Bằng chứng](flocculation-2026-10-29/browser-audit.json) gồm mẫu có khối lượng hữu hạn, các mốc thời gian mô phỏng, kiểm tra pause, giao diện ba mức khuấy và giữ lịch sử khi đổi chất lượng. Fixture dùng renderer và manager thật; API cloud bị chặn, không dùng để dựng phản ứng.

Các test mới kiểm nghiệm nghiệm Brownian giải tích, ảnh hưởng nồng độ/độ nhớt, bảo toàn moment qua lắng–tái huyền phù–rút mẫu–hòa tan, khung hình khác nhau, ngân sách glyph và thời hạn khuấy. Test hòa tan cũ được cập nhật để phân biệt bán kính đơn vị cấu thành giảm với bán kính bao bông có thể đồng thời thay đổi do kết tụ.

## Xác minh cuối

- TypeScript: qua. Build production: qua; [log build](flocculation-2026-10-29/build.log).
- 168 file test, **2.096 bài qua**, không có bài thất bại; [kết quả máy đọc](flocculation-2026-10-29/test-results.json).
- Browser: bốn mốc tiến hóa trên sáu mẫu, ba mức khuấy trong giao diện thật; không có lỗi JavaScript hoặc console.
- Trong thử nghiệm rút 90% phần lơ lửng rồi thêm nước về thể tích ban đầu, giữ riêng lớp lắng, quần thể Cu(OH)₂ đang có khoảng 32 đơn vị/cụm giảm còn khoảng 4,2 khi khuấy mạnh. Đây là kết quả của mô hình với tham số giả định, không phải số đo phòng thí nghiệm.
- Khối lượng đại diện và tổng khối lượng hai quần thể khớp lượng còn lại sau rút mẫu trong sai số kiểm tra 10⁻⁹ g. Nút pause giữ nguyên quần thể, vị trí glyph và pha chuyển động đũa trong fixture.
- Chuyển chất lượng medium → low khi pause giữ cùng manager, lịch sử và các moment; ngân sách glyph giảm còn 260.
- [Ảnh điều khiển khuấy](flocculation-2026-10-29/05-live-stirring-control.png) và [toàn bộ snapshot](flocculation-2026-10-29/browser-audit.json) ghi lại trạng thái kiểm tra.
