# AgCl, AgBr, AgI — hiệu ứng kết tủa riêng

Đối chiếu ngày 22/10/2026. Phản ứng ion chung là Ag⁺(aq) + X⁻(aq) → AgX(s), với X là Cl, Br hoặc I. Màu thuộc pha rắn; không được xem AgI là PbI₂ chỉ vì cùng vàng.

| Chất | Quan sát | Profile vật lý |
|---|---|---|
| AgCl | Trắng, dạng vón | Giữ profile AgCl hiện có |
| AgBr | Kem | Thêm profile riêng, khối lượng riêng 6,47 g/cm³ |
| AgI | Vàng nhạt | Thêm profile riêng, khối lượng riêng 5,67 g/cm³ |

Trước thay đổi, renderer vật lý không có profile AgBr/AgI và mặc định dùng BaSO₄. Nay cả bộ chọn hình dạng cũ và bộ mô phỏng vật lý nhận diện đúng hai chất. Nhãn pha như `AgI(s)` cũng tìm đúng khối lượng rắn trong tồn kho, thay vì bỏ sót vì so sánh chuỗi khác nhau. Dữ liệu màu và mật độ trong bảng precipitates được đồng bộ với profile vật lý mới.

## Nguồn

- [Western University — Mystery Solutions](https://www.uwo.ca/sci/olympics/events/mystery_solutions.html): phân biệt AgCl trắng, AgBr kem, AgI vàng.
- [Sigma-Aldrich — Silver bromide 226815](https://www.sigmaaldrich.com/US/en/product/sigald/226815): khối lượng riêng 6,473 g/mL tại 25°C, làm tròn thành 6,47 trong mô hình.
- [Carl Roth — Silver iodide SDS](https://www.carlroth.com/medias/SDB-6630-CH-EN.pdf?context=bWFzdGVyfHNlY3VyaXR5RGF0YXNoZWV0c3wyNjQyNTd8YXBwbGljYXRpb24vcGRmfGFEVmlMMmc0Wmk4NU1qRXdNREEwTWpjMU1qTXdMMU5FUWw4Mk5qTXdYME5JWDBWT0xuQmtaZ3w5OTg2MjlhYzcwZTM5MDYzNGYwYzczMzUyYTdiZjQ0ODcxMWQ2NWFiZTI5MzlhMWIzMTNkYWViYmFkN2ZmMWQ5): bản trích xuất nêu khoảng 5,67 g/cm³ tại 20°C. Đây là mật độ chất rắn, không phải mật độ hiệu dụng của bông ngậm nước.

## Phạm vi kiểm chứng và phần còn thiếu

Bộ kiểm tra đưa ba chất qua `VesselSimulationManager`, xác nhận profile, màu, dạng vón, lượng chất hữu hạn và xóa hình học khi hết chất rắn. Kiểm tra thêm rằng metadata phiến tinh thể không biến AgI thành PbI₂. Bộ vòng đời cũng tự mở rộng sang hai profile mới.

Mã màu là lựa chọn hiển thị định tính; chưa đo phổ màu. Kích thước glyph, tốc độ kết bông, mật độ bông hiệu dụng và hệ số quang học chưa hiệu chuẩn. Không suy ra tốc độ lắng chính xác từ mật độ vật liệu đơn thuần. Các chương trình VFX khác vẫn có tham số màu/độ đục riêng, cần tiếp tục hợp nhất. Chưa bổ sung cân bằng tạo phức NH₃, ảnh hưởng ion chung hoặc động học quang phân. Chưa xác minh hình ảnh GPU.
