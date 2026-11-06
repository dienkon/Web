# Pha màu, phản ứng ngoài bình và Na/H₂O

## Hành vi

- Rót kho, rót từ bình và luồng đang bay dùng `receivePourAliquot`: nạp phần còn chỗ rồi trao đổi dung dịch khi đã đầy, với phần tràn mang thành phần/màu thực của dòng ra. Pipette/burette định lượng vẫn dùng `dispenseAliquot` và dừng ở sức chứa. Pha màu dùng hấp thụ RGB theo thể tích; đây là xấp xỉ Beer–Lambert, chưa phải phổ hấp thụ đo được. Lưu absorbance chưa làm tròn qua các bước rót/vũng để tránh lệch màu theo FPS; màu mới do phản ứng tự thay thế trạng thái màu cũ. Màu phản ứng/chỉ thị được tính từ lượng chất khi mô hình hóa học tương ứng có hỗ trợ. Chất hữu cơ không trộn màu với lớp nước.
- Các vũng tương thích chạm nhau pha màu và cộng lượng chất, nhiệt độ. Vũng không chạm nhau và các lớp không trộn lẫn vẫn tách riêng. Chất rắn khô được làm ướt khi footprint chất lỏng chạm tới điểm đặt nó. Kết tủa, trung hòa và các chương trình tiếp xúc pha rắn–dung dịch có động học đã khai báo tiếp tục ngoài bình; Na còn dư sau vỡ bình cũng tiếp tục gặp nước. Khí phát ra là nguồn hữu hạn, ghi vào `workbenchEscapedGas_g`, tồn tại sau khi lau bàn và trong lịch sử/lưu trạng thái.
- Chất rắn được vẽ từ lượng chất trong vũng. Bong bóng trên vũng lấy số gói khí từ lưu lượng mol, ngừng phát khi hết chất. Không gán bọt cho dung dịch chỉ vì có nhãn nguy hiểm.
- Na nhỏ chạy theo xung đẩy thay đổi hướng và va chạm thành bình. Seed gắn với bình/mẫu để phát lại được; không có lực hút về tâm hay quỹ đạo tròn. Vị trí pellet, nguồn bọt và sóng dùng cùng tọa độ.
- Chế độ Na lớn chuyển sang tiếp xúc dữ dội, dừng chạy vòng và kích hoạt nổ/vỡ sau bước hóa học đầu tiên. Vỡ bình dùng mẫu đã phản ứng, thoát khí và chuyển phần vật chất còn lại ra bàn đúng một lần; tắt phản ứng, ngọn lửa và nguồn nhiệt thuộc bình cũ.

## Giới hạn khoa học cần giữ rõ

Phương trình: **2Na + 2H₂O → 2NaOH + H₂**. NaOH không tự làm nước chuyển hồng; cần chỉ thị phù hợp. Tốc độ phản ứng, xung đẩy và kích thước hiệu ứng là minh họa.

Ngưỡng **0,5 g Na có đủ nước phản ứng** và thời gian minh họa **0,25 s** là lựa chọn của mô phỏng để phân biệt hai kịch bản người dùng yêu cầu, **không phải ngưỡng nổ đo được hay bảo đảm an toàn ngoài đời**. Nổ thực còn phụ thuộc bề mặt, lớp dầu/oxide, hình dạng, nhiệt độ và tiếp xúc. Không suy ra có cháy H₂ chỉ từ khối lượng Na; ngọn lửa vẫn cần đường cháy/oxy riêng. Mô hình chưa giải ứng suất và độ bền thực của từng bình.

Phản ứng vũng chỉ chạy các chương trình tiếp xúc có khai báo phù hợp; chưa giải toàn bộ động học, bay hơi/sôi của vũng, cháy ngoài bình hoặc hóa học dung môi hữu cơ. Khi bước phản ứng vượt miền pha lỏng, giữ lượng chất và báo `chemistryLimit: phase_boundary` thay vì tự tạo hơi hay nhiệt vượt miền mô hình.

## Nguồn đối chiếu

- [University of Washington — Alkali metals in water](https://chem.washington.edu/lecture-demos/activity-series-alkali-metals-water): chuyển động trên mặt nước, H₂, chỉ thị và ảnh hưởng của hình dạng/bề mặt.
- [Mason et al., Nature Chemistry (2015), DOI 10.1038/nchem.2161](https://www.nature.com/articles/nchem.2161): cơ chế mất ổn định điện tích ở tiếp xúc kim loại kiềm–nước. Không dùng nghiên cứu này để suy ra một khối lượng nổ cố định cho Na nguyên chất.

## Test nhanh

Mở `?vfx=1` hoặc `?studio=1`, chọn bình mở, nguyên vẹn. Khối **Test nhanh · Pha màu / Na / Vỡ bình** có Na nhỏ/lớn, pha màu–tràn, **Bình đầy · tràn kết tủa**, kết tủa trên bàn, khí trên bàn, bọt O₂, rắn khô gặp axit, kính nóng gặp nước lạnh và vỡ bình. Mỗi nút thay mẫu trong đúng bình đích, lau vũng cũ vào kho chất thải để các lần test không nhiễm chéo, rồi gọi các thao tác của phòng thí nghiệm. Sau khi vỡ, bấm **Thay bình đã vỡ** để thử tiếp.
