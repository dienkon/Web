# Âm bọt: bán kính vật lý và thời gian mô phỏng

## Lỗi đã xác nhận

`BoilingSystem` dùng `performance.now()` để throttle 45 ms và ép bán kính âm tối thiểu 0,8 mm sau containment. Synth tiếp tục ép bán kính vào 0,6–10 mm rồi ép tần số vào 320–4800 Hz. Vì vậy một bọt siêu nhỏ có thể bị đổi thành tiếng bọt lớn; môi trường áp suất khác vẫn phát cùng cao độ. Reset không xóa mốc audio. Bọt hơi được phát cùng công thức khí không ngưng.

## Công thức và hợp đồng

`src/science/bubbleAcoustics.ts` nhận R theo m, áp suất tuyệt đối ngoài bọt P theo Pa, mật độ lỏng rho theo kg/m³, sigma theo N/m và số mũ đa biến kappa:

```
f = sqrt([3*kappa*P + (3*kappa-1)*2*sigma/R] / rho) / (2*pi*R)
```

Đây là tần số dao động nhỏ không damping cho bọt khí hình cầu, không phải dự đoán đầy đủ âm lúc màng vỡ. Có thể suy ra bằng tuyến tính hóa áp suất khí `Pg(R)=Pg0*(R0/R)^(3*kappa)` với `Pg0=P+2*sigma/R0` và sức căng một interface. Sigma bằng zero thu về Minnaert: f tỷ lệ 1/R, sqrt(P) và 1/sqrt(rho). Với R=1 mm, P=101325 Pa, rho=1000, kappa=1,4, sigma=0, kết quả khoảng 3283 Hz.

Mặc định kappa=1,4 là giả thiết khí giống không khí. Không nhận diện hóa học bằng giá trị này; CO₂, hơi nước, hỗn hợp và chế độ truyền nhiệt có thể cần hệ số khác. API cho phép truyền kappa 1–5/3, nhưng đường runtime chưa suy ra nó theo thành phần từng packet.

`labSound.playMinnaertBubble(radius_mm, isBurst, volume, medium)` giữ tương thích lời gọi cũ; đối số thứ tư nhận áp suất, mật độ, sức căng và kappa. Không ép bán kính hoặc cao độ. Tần số dưới 20 Hz, từ 20 kHz trở lên hoặc chạm Nyquist bị bỏ qua; đây là giới hạn phát lại, không phải vật lý thay đổi. Click phụ chỉ phát khi các thành phần của nó trong dải. Oscillator chính giữ f cố định; bỏ chirp +14% chưa có diễn biến R để chứng minh. Envelope/volume/click vẫn mang tính minh họa, chưa hiệu chuẩn damping hoặc SPL.

## Tích hợp theo bình

`BoilingSystem` dùng `physicalRadius_m` trước containment thay kích thước glyph, truyền áp suất môi trường của bình, mật độ lỏng và sức căng nước hiện tại. Mốc throttle dùng thời gian đã tích phân cộng dt đang xử lý, không dùng thời gian máy; reset đưa mốc về âm vô cực để sự kiện đầu tiên phát được. Mỗi system có ngân sách âm riêng, không phát sang bình khác.

Chỉ packet khí không ngưng được dùng mode này. Packet hơi hoặc hỗn hợp bỏ tone này vì trao đổi khối và ngưng tụ chưa có mô hình âm; không ngầm gán tính đàn hồi khí không khí cho hơi bão hòa. Các âm rumble/sizzle dựng sẵn vẫn cần audit riêng. Đây chưa phải kết luận rằng bọt hơi ngoài thực tế không có tiếng.

Sự kiện được chọn giống nhau ở 30/60/120 Hz. WebAudio vẫn phát ngay khi xử lý, nên nhiều sự kiện catch-up có thể chồng vào cùng thời gian máy; chưa có transport audio ánh xạ toàn timeline mô phỏng sang AudioContext. Giới hạn 45 ms là ngân sách giọng phát chứ không phải khoảng thời gian vật lý giữa các lần vỡ màng.

## Kiểm chứng và phần còn mở

8 test mới kiểm tra giá trị chuẩn, quy luật scale, sức căng/đa biến, ultrasound/Nyquist/input hỏng, oscillator thực qua AudioContext giả, bán kính trước containment, thông số riêng của bình, reset, seeded 30/60/120 Hz với đồng hồ máy khác nhau và loại trừ hơi/hỗn hợp. Test không xác nhận chất lượng âm nghe được trên thiết bị thật.

Chưa giải thermal/viscous/radiation damping, biến dạng, free-surface radiation/film rupture, pha khí hòa tan, lực kích thích và hiệu chuẩn cường độ. Một số lời gọi preview/legacy trong `Bubbles.tsx`, âm sodium/boil dựng sẵn còn kích thước hoặc lịch ngẫu nhiên minh họa; thay synth chung không làm các nguồn đó tự trở thành dữ liệu vật lý. Chưa xác nhận hình ảnh WebGL hoặc toàn hệ.

## Nguồn đối chiếu

- [Sprague, Fine & Cameron, PLOS ONE (2022)](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0267338): phân biệt Minnaert, undamped, damping và far-field resonance; các đại lượng nhiệt và điều kiện môi trường ảnh hưởng mô hình. Không dùng kết quả deep-water làm hiệu chuẩn tiếng vỡ màng ở bàn lab.
- [Air injector geometry affects passive bubble acoustic signatures (2024)](https://www.sciencedirect.com/science/article/pii/S0894177724001341): công thức Minnaert và giới hạn khi áp dụng cho bọt không đối xứng/cross-flow.
