# Chuyển động bọt: SI, drag và added mass

## Lỗi được xác nhận

Đường bọt chính trước đây cộng `(0.85 × hệ số random / độ nhớt)` trực tiếp vào scene/s theo dt, dù tên config là m/s². Không có drag cân bằng nên tốc độ tiếp tục tăng. Dòng đối lưu dọc được cộng như gia tốc, không nhất quán với hai thành phần ngang. Offset wobble có đơn vị chiều dài lại bị dùng như vận tốc. Kích thước glyph đã thu nhỏ để tránh kính còn có thể được đọc như kích thước hydrodynamic.

Đã thay chuyển động này trong `BoilingSystem` bằng các hàm SI của `science/bubbleRise.ts`. Config gia tốc preset cũ không còn điều khiển đường bọt đang chạy.

## Hợp đồng các hàm

`bubbleDragCdRe(Re, mobility)` trả tích `Cd × Re` để không chia cho zero ở trạng thái đứng yên:

- `mobile`: tương quan Mei cho bọt cầu có bề mặt linh động, viết dạng ổn định `16(16 + 3.315√Re + 3Re)/(16 + 3.315√Re + Re)`. Giới hạn Re→0 bằng 16.
- `immobile`: bề mặt bất động, xấp xỉ quả cầu rắn Schiller–Naumann: `24(1 + 0.15 Re^0.687)` dưới Re=1000; dùng Cd=0.44 phía trên. Giới hạn Re→0 bằng 24.

`bubbleTerminalSpeed(r_m, rhoLiquid_kg_m3, mu_Pa_s, mobility, rhoGas_kg_m3=0)` cân bằng lực nổi với drag của bọt cầu, tìm nghiệm 40 bước chia đôi trong khoảng chặn trên creeping-flow. Trả m/s, không trả scene/s. Nếu không có chênh lệch khối lượng riêng dương thì không tạo vận tốc nổi. Tại Re nhỏ, giới hạn immobile là `2 Δrho g r²/(9mu)` và mobile là `Δrho g r²/(3mu)`, tức tỷ số 1.5 cho cùng điều kiện lý tưởng này.

`bubbleResponseTime` dùng khối lượng hiệu dụng `(rhoGas + 0.5 rhoLiquid) × volume`, với added-mass coefficient 1/2 của cầu trong chất lỏng khối không biên. Bỏ added mass và chỉ dùng khối lượng khí sẽ cho đáp ứng gần tức thì không đúng. Drag được đóng băng tại slip của substep; thời gian đáp ứng là mass hiệu dụng chia hệ số drag.

`advanceBubbleMotion(position_m, velocity_m_s, fluidVelocity_m_s, r_m, rho, mu, dt, mobility)` dùng target là vận tốc chất lỏng cộng terminal slip thẳng đứng. Đóng băng drag tại ít nhất terminal slip, tích phân đáp ứng tuyến tính và dịch chuyển bằng nghiệm giải tích `particleResponseFactors`, không dùng Euler lấy vận tốc cuối nhân dt. Hệ số áp như nhau cho cả ba thành phần carrier; phép thử dịch chuyển chất lỏng đồng đều giữ được tính bất biến vận tốc tương đối. Input không hợp lệ không tích phân.

Đây là xấp xỉ frozen-drag cho các substep nhỏ, không phải nghiệm đầy đủ của ODE drag phi tuyến với mọi bước thời gian. Trong giới hạn khối lượng khí không đáng kể, gia tốc đầu từ trạng thái đứng yên tiến tới `g/0.5 = 2g`, đồng thời vẫn đạt vận tốc tới hạn thay vì tăng vô hạn.

## Đơn vị và hình ảnh

Cập nhật sau vòng này: pressure-volume packet nay có hai thành phần vapor/noncondensable, giữ K/T khi đổi nhiệt độ, gồm Laplace pressure và condensation limit. Coalescence xử lý các partner tại cùng mốc thời gian. Hợp đồng mới và phân biệt packet với bulk inventory ở [mixed-bubble-phase.vi.md](./mixed-bubble-phase.vi.md); không còn nhánh xóa ngẫu nhiên toàn bọt vapor 5/s.

`BoilingSystem` đổi vị trí, vận tốc và dòng đối lưu sang SI trước khi gọi hàm; độ nhớt mPa·s đổi sang Pa·s. Kết quả đổi về scene chỉ tại ranh giới renderer. Mật độ lỏng lấy từ fluid model hiện tại. Live solver mặc định bỏ qua mật độ khí so với nước, chỉ phù hợp ở áp suất gần khí quyển với các khí nhẹ hơn nhiều so với chất lỏng.

Bán kính vật lý lấy lại từ proxy `P*r³` ở áp suất hiện tại trước khi tính lực, không đọc từ glyph đã bị containment thu nhỏ. `physicalRadius_m` và `terminalSpeed_m_s` lưu trên bubble cho kiểm tra. Vẫn giữ proxy hydrostatic/coalescence hiện có. Bán kính khởi tạo, phân bố nucleation và số packet chưa được hiệu chuẩn từ số bọt thật hoặc lượng mol mỗi bọt.

Eötvös và Weber dùng đường kính SI, sức căng nước theo IAPWS và vận tốc tương đối với chất lỏng, không dùng vận tốc tuyệt đối bị đối lưu mang đi. Wobble là hiệu ứng đường đi minh họa: biên độ nhỏ theo Eo và cập nhật bằng chênh lệch displacement. Trần 30 Hz là giới hạn số học, không phải tần số wake đã đo. Đối lưu vẫn là trường streamfunction áp đặt, chưa được giải từ phương trình nhiệt/Navier–Stokes.

## Chọn giả thiết theo bình

```
effects.forVessel(id).setBubbleInterfaceMobility('mobile')
effects.forVessel(id).setBubbleInterfaceMobility('immobile')
```

Mặc định là `immobile`. Đây là **giả thiết hydrodynamic** cho bề mặt, không phải phép đo mức sạch hoặc thao tác làm sạch mẫu. Không suy ra mobile chỉ vì công thức là H₂O. Lệnh giữ nguyên bình, vị trí, lượng chất, nhiệt và nguồn khí; ID sai/giá trị sai trả lỗi. `inspect().state.bubbleInterfaceMobility` báo lựa chọn đang dùng. Đổi mode không tự tạo bọt khi engine không có nguồn hữu hạn.

## Kiểm chứng

14 test mới trong `tests/bubble_rise.test.ts`: giới hạn CdRe và tốc độ creeping-flow; cân bằng drag–sức nổi ở finite Re của hai mode; đáp ứng độ nhớt/mobility; mật độ trung hòa; added mass và gia tốc 2g; vận tốc tới hạn/dịch chuyển; carrier translation; dt không hợp lệ; containment không đổi vật lý; mode ảnh hưởng chuyển động trong cùng cột và API cách ly bình.

Các test bọt seeded 30/60/120 Hz và geometry hiện có cũng đạt sau thay động học. Toàn suite: **129 file, 1461/1461 test đạt**, lint/build đạt; Vite còn cảnh báo chunk >500 kB.

## Miền còn mở

Hai nhánh đều dùng hình cầu tương đương. Bọt biến dạng lớn, cap bubble, swarm/hindered rise, hiệu ứng vách, lubrication, lift, Basset history và gia tốc carrier trong added-mass force chưa được giải. Góc bề mặt/surfactant không được tính từ hóa học; mode là lựa chọn giả thiết. Hình dáng có Eo/We không tự chứng minh drag hình cầu đúng cho bọt lớn. Sức căng đang dùng là nước, không phải dữ liệu đo cho mọi dung môi/acid đậm đặc.

Vòng tiếp theo đã thay luật xẹp xác suất bằng closure dẫn nhiệt và tách thành phần hơi/khí không ngưng khi gộp; xem [mixed-bubble-phase.vi.md](./mixed-bubble-phase.vi.md). Truyền nhiệt/khối đầy đủ và phản hồi latent vào chất lỏng vẫn chưa được giải. Pop/film lifetime, margin tiếp xúc theo glyph, âm thanh Minnaert có clamp và throttle theo wall clock vẫn cần audit riêng. Chưa có hình ảnh WebGL được xác nhận; các test không chứng minh cả hệ đã chân thực hoàn toàn.

## Nguồn

- [JFM — Lift force on a spherical droplet in a viscous linear shear flow, Appendix B](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/lift-force-on-a-spherical-droplet-in-a-viscous-linear-shear-flow/018B09E24992FB3EE852667024DC9B91): hai drag relation cho bọt sạch/quả cầu rắn trong miền xét. Không dùng nguồn này để xác nhận drag của bọt biến dạng hoặc độ sạch mẫu.
- [RSC Soft Matter (2016), DOI 10.1039/C5SM03151F](https://pubs.rsc.org/en/content/articlehtml/2016/sm/c5sm03151f): added mass 0.5 cho bọt cầu trong bulk và giới hạn gia tốc đầu 2g. Không dùng kết quả bulk để tuyên bố tương tác sát mặt/vách đã được giải.
- [Brennen — Cavitation and Bubble Dynamics, Chapter 5](https://media.library.caltech.edu/CaltechBOOK%3A1995.001/chap5.htm): added mass bằng một nửa khối lượng chất lỏng bị chiếm chỗ của cầu; hình dạng và biên có thể làm hệ số thay đổi.
