# Rót và hút mẫu có hạt kết tủa lơ lửng

Đối chiếu 24/10/2026. Trước đây `withdrawAliquot` giữ tất cả chất rắn ở nguồn, nên dù hạt còn lơ lửng, mẫu rót/pipet chỉ mang chất lỏng và chất hòa tan. Bản mới cho phép snapshot vật lý hợp lệ cấp lượng hạt có thể đi cùng phần chất lỏng được lấy ra; phần đã lắng, bã lọc, mảnh rắn thêm riêng và khí vẫn ở nguồn.

## Cơ sở và giới hạn lấy mẫu

Đối chiếu khái niệm [IUPAC Gold Book — suspension](https://goldbook.iupac.org/terms/view/S06198): pha rắn phân tán trong chất lỏng. [USGS — Separation by Decantation](https://pubs.usgs.gov/of/2001/of01-041/htmldocs/methods/decant.htm) mô tả việc tách phần hạt còn lơ lửng theo thời gian lắng và khoảng độ sâu rút mẫu. Nội dung hai nguồn được đối chiếu qua dữ liệu chỉ mục tìm kiếm; truy cập trang trực tiếp trả 403 trong phiên này. Không lấy thời gian hoặc độ sâu từ quy trình phân tích đất của USGS làm tham số mặc định cho các kết tủa hóa học.

Mô hình đang triển khai là lấy mẫu huyền phù đồng đều: nồng độ hạt lơ lửng được coi như nhau trong toàn pha lỏng. Với thể tích lấy ΔV từ V, lượng hạt đi theo là m_lơ_lửng × ΔV/V cho từng công thức. Đây là giả định của ứng dụng, không được hai nguồn trên xác nhận là đúng cho mọi cách rót. Chưa giải trường nồng độ theo độ sâu, độ cao đầu pipet, phân cỡ tại mặt thoáng, tắc đầu hút, cặn trượt hoặc xói mòn lớp cặn khi nghiêng bình. Khuấy vẫn dùng cơ chế entrainment hiện hữu.

## Snapshot và giao dịch vật chất

`mobileSolidInventory` lấy tổng hạt lơ lửng từ khối lượng hệ trừ khối lượng cặn, có tính reservoir chưa phát glyph. Snapshot phải còn khớp từng công thức và khối lượng inventory, sau khi trừ phần kim loại được mô hình hiện hữu xem là bám nền. Snapshot thiếu/lỗi thời, lượng sai hoặc counter bị lùi không cấp quyền rút hạt của pha đó. Chưa có snapshot thì vẫn giữ chất rắn tại nguồn; không suy nồng độ hạt từ màu hoặc cờ UI.

Khi rút, scale đúng các hàng rắn được nhận diện là huyền phù; giữ nguồn hình thành và morphology trong mẫu. Chất rắn cùng công thức được thêm như mảnh riêng, bã lọc và khí không bị lấy nhầm. Khối lượng mẫu tăng đúng phần rắn đi theo; mol và khối lượng giảm đúng phần này ở nguồn. Mẫu rót đi qua cùng hàng đợi không khí/phim bám/thành bình có sẵn; chỉ thêm vào inventory bình nhận sau khi đến nơi. Pipet cũng giữ mẫu hữu hạn trong dụng cụ trước khi nhả.

Nguồn ghi counter tích lũy `precipitateOutflow_g` theo công thức cùng giao dịch inventory. Lượt rót kế tiếp trước khung hình vật lý mới trừ phần đã rút nhưng chưa áp dụng vào snapshot, tránh lấy lặp. Manager đọc delta counter và trừ riêng trọng số hạt/reservoir lơ lửng. Không co bán kính vật lý và không trừ lớp cặn như cơ chế hòa tan. Nếu còn giảm khối lượng do hóa học, phần giảm đó vẫn đi qua cơ chế hòa tan hiện hữu.

Counter theo trạng thái bình, không đi sang bình nhận như một hóa chất. Khi dựng manager mới từ bản lưu đã có counter, khởi tạo mốc ở giá trị hiện tại để không rút lần thứ hai. Kiểm thử phục hồi chứng minh lượng chất, không chứng minh phục hồi chính xác phân bố vị trí hạt hoặc trạng thái cặn cũ; các snapshot hạt/cặn đầy đủ chưa được lưu bền.

## Sức chứa và thể tích hạt

Bình nhận phải còn chỗ cho cả pha lỏng và thể tích chất rắn đi theo. `dispenseAliquot` kiểm tra occupancy sau khi trộn mẫu thử và tìm lượng nhận tối đa khi sát miệng bình. Phần mẫu dư giữ đúng tỷ lệ chất lỏng/hạt và đi theo đường spill hiện hữu. Đối với hàng hạt có nguồn hình thành, occupancy dùng khối lượng riêng cùng profile vật lý nếu có profile riêng; chất không có dữ liệu vẫn giữ giới hạn ước lượng hiện hữu. Profile có transport chưa hiệu chuẩn không trở thành dữ liệu thực nghiệm chỉ vì được dùng tính thể tích.

Không tính khối lượng hạt như khối lượng chất lỏng để suy mật độ carrier. Không giải co thể tích khi trộn, độ nhớt huyền phù đặc hoặc nhiệt dung nhiều pha theo mô hình mới này.

## Kiểm chứng

Kiểm thử riêng cho AgBr/CuS: rót một phần huyền phù có cặn; giữ khối lượng lớp cặn và bán kính hạt; nhiều lần rót trước frame mới; rút hết pha lỏng vẫn giữ cặn; từ chối snapshot sai; giữ mảnh rắn/bã lọc/khí; sức chứa gần miệng bình; vận chuyển qua store/in-flight thực; pipet; phục hồi counter. Đối chiếu bảo toàn từng nguyên tố và khối lượng trên tổng nguồn + mẫu đang bay/đang cầm + bình nhận + phần dư. Chưa xác minh trực quan trên GPU hoặc hiệu chuẩn lấy mẫu với thí nghiệm.
