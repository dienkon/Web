# Vũng hữu hạn trên mặt bàn

## Hiện trạng và lỗi đã sửa

Vòng trước đã sửa âm bọt, có 8 test mới và suite đạt 1487 ca. Vòng này kiểm tra phần tràn/vũng thực tế trong worktree: `calculateSpillRadius` lấy căn thể tích cộng offset và clamp 1,2 **scene unit**, dù comment ghi mét. Khối lượng chất rắn khô có thể tạo bán kính ướt. Renderer dùng một mặt phẳng có lobe và giọt vệ tinh không phân bổ thể tích, nở theo `Date.now()`/delta ngoài pause, rồi đặt lại vị trí theo bình đang đứng gần đó mỗi lần bình di chuyển.

Đã thay riêng vũng trên bàn bằng mặt cân bằng hydrostatic Young–Laplace. Wall stream/crest/tears/audio vẫn là preset minh họa; không dùng thay đổi này để xác nhận toàn đường tràn đã giải đúng.

## Phương trình, đơn vị và nghiệm

`src/science/sessileDrop.ts` nhận thể tích mL và trả mét/m³. Đặt capillary length `l_c=sqrt(sigma/(delta_rho*g))`. Tọa độ không thứ nguyên gồm bán kính r, độ sâu z dưới đỉnh giọt, góc tiếp tuyến psi, thể tích v; s là độ dài cung. Với b bằng độ cong chính ở đỉnh nhân l_c:

```
dr/ds   = cos(psi)
dz/ds   = sin(psi)
dpsi/ds = 2*b + z - sin(psi)/r
dv/ds   = pi*r²*sin(psi)
```

Áp suất tăng theo độ sâu, do đó dấu z là dương trong quy ước này. Điều kiện gần trục là `r≈s`, `z≈b*s²/2`, `psi≈b*s`, `v≈pi*b*s⁴/4`; không chia cho r=0. Tích phân RK4 có kiểm soát sai số bằng hai nửa bước, dừng ở góc tiếp xúc. Shooting theo log(b) và secant có bracket chọn b để v khớp thể tích. Giới hạn vũng lớn chỉ dùng để đặt bracket ban đầu, không thay nghiệm trả về bằng công thức bán kính nội suy.

Nghiệm trả null cho dữ liệu không hợp lệ, góc ngoài 5–90°, hoặc khi không đạt sai số thể tích tương đối 2e-7; không tự tạo một lượng nước nhỏ thay thế. Miền góc này tránh surface overhang mà renderer hiện tại chưa hỗ trợ. Cache tối đa 128 nghiệm theo thể tích và toàn bộ tham số để tránh giải lại mỗi frame khi lượng chất không đổi. Nghiệm cache được các đường gọi hiện tại chỉ đọc.

Mặc định dùng sigma=0,072 N/m, delta_rho=998 kg/m³, g=9,80665 m/s² và góc tiếp xúc 60°. Đây là **nước ở điều kiện phòng trên bàn có wetting giả định**. Chưa đo góc tiếp xúc của bàn lab; không suy ra theo màu hay nhãn hóa chất. API solver có đối số thay tham số; runtime spill hiện dùng bộ mặc định, chưa lấy vật tính theo thành phần/nhiệt độ.

## Renderer và dữ liệu

`createSpillGeometry` tạo một khối tròn xoay kín từ profile, gồm đáy phẳng, mặt nước và đỉnh. Đổi mét sang scene unit đúng một lần bằng `METERS_PER_SCENE_UNIT=0,035`. Renderer không vẽ thêm giọt vệ tinh chưa có phân bổ thể tích, không làm gợn lobe tùy ý và không scale mặt nước bằng đồng hồ máy. Đây là hình cân bằng của lượng chất đã được ledger ghi vào spill; **chưa giải quá trình lan động lực học**.

`calculateSpillRadius` dùng cùng nghiệm và trả scene unit cho inventory, merge và cleanup. Không suy ra thể tích nước từ khối lượng khô; không clamp bán kính để che lượng chất lớn. Vòng tiếp theo đã bổ sung normalization cho physical save và undo/redo để cập nhật radius preset cũ mà không thay lượng chất; xem [spill-cleanup.vi.md](./spill-cleanup.vi.md).

Khi tràn qua miệng bình, `overflowLandingPosition` lấy snapshot tọa độ chân thành ngoài theo hướng miệng rót và rotation hiện tại. Store dùng tọa độ đó lúc ghi spill cho addSpill và overflow của parcel vào bình. Renderer đặt trực tiếp tại tọa độ inventory, không tìm bình gần nhất để dịch vũng nữa. Di chuyển bình, xoay bình hoặc remount cảnh không kéo lượng chất đã đổ đi theo. Đây vẫn là giả thiết rơi tại chân thành; chưa giải full outer-wall transport/in-flight overflow. Nước ngưng chảy xuống có điểm tiếp đất riêng và không bị đổi sang hướng miệng rót.

## Bằng chứng

13 test mới trong `tests/sessile_drop.test.ts` gồm 7 thể tích từ 1e-6 tới 500 mL; khớp tích phân với thể tích mục tiêu; thể tích và winding của **mesh tam giác thực**; giới hạn spherical cap khi Bond nhỏ; chiều cao vũng lớn tiến tới `2*l_c*sin(theta/2)`; residual độ cong theo hydrostatic Young–Laplace; wetting/density; capillary-length similarity; dữ liệu hỏng và khối lượng khô; tọa độ/contents trong store khi bình di chuyển.

Sai số solver thể tích dưới 2e-7 tương đối; mesh 96 vòng quanh trục đạt dưới 0,4% do xấp xỉ tam giác trong các ca kiểm tra. Các test overflow cũ được đổi từ preset bán kính/clamp sang đơn vị cảnh và miền kích thước từ thể tích. **132 file, 1500/1500 test đạt; lint/build đạt**, còn cảnh báo Vite chunk lớn.

Chưa có ảnh WebGL xác nhận. Không coi test hình học CPU là kiểm chứng shading/transmission hoặc tốc độ render. Đo sơ bộ máy hiện tại cho cache miss khoảng vài ms tới khoảng 60 ms ở 500 mL, không phải benchmark thiết bị mục tiêu; liên tục thay thể tích lớn vẫn cần tối ưu/worker. Cache hit không tích phân lại.

## Chưa giải

Dynamic spreading/contact-angle hysteresis, pinning/roughness, bảng vật tính từng dung môi/dung dịch, evaporation/thermal coupling của spill, không trộn lẫn, phản ứng trên bàn, vật cản/bình đặt trên vũng, mép bàn/runoff và merge thủy động lực học chưa được giải. Ledger tràn vẫn đưa lượng chất lên bàn tức thời trong một số thao tác; ribbon ngoài thành là read-only presentation, chưa có một reservoir vận chuyển chung với thời gian đến vũng. Bỏ nở trang trí không chứng minh đường truyền chất này đã hoàn chỉnh. Toàn mục tiêu vẫn mở.

## Nguồn đối chiếu

[Effects of gravity on natural oscillations of sessile drops, JFM, Appendix B](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/effects-of-gravity-on-natural-oscillations-of-sessile-drops/9373ADEB7650B13ACA0BF3A057A9D071) trình bày hệ Young–Laplace tham số hóa theo độ dài cung và shooting để thỏa đồng thời góc tiếp xúc/thể tích. Quy ước dấu z/psi của dự án được đổi sang độ sâu dương. Không lấy nghiên cứu dao động làm bằng chứng vật tính hoặc wetting của bàn trong dự án đã được hiệu chuẩn.
