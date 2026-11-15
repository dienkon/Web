# Lượng phản ứng theo từng hạt rắn tiếp xúc dung dịch

## Lỗi đã tái hiện

Hai hạt Zn cùng 0,1 g dùng chung một hàng kiểm kê, một hạt ở dưới dung dịch và một hạt ở trên mặt thoáng. Trước sửa, mức phản ứng 25% làm cả hai hạt giảm còn 0,075 g. Khi yêu cầu hoàn tất, sổ phản ứng tiêu thụ cả 0,2 g và tạo 0,006167 g H₂; lượng tối đa từ hạt ướt 0,1 g chỉ bằng một nửa. Đây là lỗi lượng chất và đồng bộ hình học, không chỉ màu hoặc tốc độ hiệu ứng.

## Hợp đồng tính toán

- `stockGrainContacts` trả khối lượng có trong kiểm kê, diện tích ướt và tổng diện tích của từng ID. Lượng mới chưa có pose không phóng to hạt cũ.
- `partitionDryStock` chia hàng kiểm kê thành phần có thể phản ứng và phần hạt hoàn toàn khô. `reactiveVessel` giữ đúng các pose tham gia; nguồn hình học tạm thời vẫn giữ độ chiếm chỗ của hạt trơ trong lớp hữu cơ. Phân hoạch lặp lại không được làm mất thêm chất.
- Tiến độ được chặn trước khi chấp nhận tick, cùng giới hạn với sổ lượng chất. Vì vậy khí, nhiệt và tốc độ hiệu ứng không chạy trước lượng phản ứng. Chuỗi nhôm dùng hàm nghịch đảo của đúng đường chuyển hóa từng giai đoạn.
- `allocateStockConsumption` phân lượng đã tiêu thụ theo diện tích ướt, giới hạn bởi khối lượng còn lại của từng hạt. Hạt hết chất giữ dấu ID có khối lượng/kích thước bằng không đến snapshot vật lý kế tiếp. Các pose, vận tốc và ID không đổi khi chỉ tiêu thụ chất.
- Native resolver cập nhật phân bố khối lượng sau mỗi bước nối tiếp. Sổ chạy lại từ baseline giữ phần khô hiện tại, không hồi sinh lượng đã phản ứng.
- Lớp kim loại có `depositCarrierId` dùng tiếp xúc của đúng vật chủ. Lớp trên vật chủ khô được bảo vệ riêng với kim loại tự do; hòa tan lớp phủ không làm giảm khối lượng lõi của vật chủ.
- Thao tác kéo tiến độ từ chối mức vượt lượng hạt ướt, giữ nguyên cả vessel và đồng hồ; giới hạn vẫn đúng sau khi lấy mẫu làm đổi baseline.
- Khi hạt đã có lớp phủ rơi vào vũng dung dịch, lõi và lớp phủ giữ hai ngân sách công thức riêng. Khối lượng cơ học trong pose là lõi; tổng khối lượng spill gồm cả lớp phủ. Lõi tan hết thì xóa carrier và chuyển lớp phủ đã giải phóng vào vũng.

## Kiểm chứng

`tests/stock_grain_consumption.test.ts` kiểm tra khối lượng, H₂, nhiệt, mức tiến độ, khôi phục khi nhúng xuống, chạy lại baseline, native nhiều bước, đồng–ammonia, chuỗi nhôm, liều mới, phân bổ khi một hạt hết trước, lớp hữu cơ có hạt trơ, lớp đồng trên vật chủ khô, kéo tiến độ và cùng kết quả thủ công/tự động. `tests/spill_stock_contact.test.ts` kiểm tra lớp phủ trên hạt phản ứng ở vũng, giữ riêng khối lượng lõi và giải phóng lớp phủ khi lõi hết, kèm bảo toàn nguyên tố và tổng khối lượng. Các bộ tiếp xúc, pha rắn, kim loại–acid, nhôm, cân bằng đồng, khí chạy lại và bảo toàn ledger cũng được chạy cùng.

## Giới hạn và cơ sở

Diện tích tiếp xúc chi phối xu hướng tốc độ phản ứng dị thể; phản ứng cần tiếp xúc giữa các pha. Nguồn nền: [OpenStax Chemistry 2e, §12.2](https://openstax.org/books/chemistry-2e/pages/12-2-factors-affecting-reaction-rates), truy cập 2026-11-15. Đây không phải nguồn hiệu chuẩn các hệ số tốc độ hoặc quy tắc chia khối lượng theo diện tích trong ứng dụng.

Một hạt nhúng một phần vẫn là một khối hữu hạn có thể phản ứng qua bề mặt ướt; chưa giải mặt phản ứng, hình ăn mòn bất đối xứng, màng lỏng còn bám sau khi nhấc hạt, thụ động hóa hay truyền khối vi mô. Phủ kim loại dùng mức tiếp xúc của vật chủ, chưa theo từng mảng phủ ở từng vị trí bề mặt. Liều chưa có pose dùng bố trí tĩnh, phần tiêu thụ của liều đó được trừ trước khi chia vào các hạt đã có pose. Snapshot cũ có khối lượng vượt kiểm kê được thu về theo tỷ lệ để tương thích; đây là phục hồi dữ liệu cũ, không phải mô hình phản ứng mới. Nhiệt phân khô và phản ứng khí–rắn không bị chặn bằng điều kiện nhúng dung dịch.
