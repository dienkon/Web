# Co(OH)₂ và Mn(OH)₂

Đối chiếu 24/10/2026. Thêm cấu hình riêng: Co(OH)₂ hồng của dạng hydroxide ổn định và Mn(OH)₂ trắng rất nhạt. Đồng bộ màu sản phẩm, timeline phát hạt và trạng thái sau phản ứng. Đây chưa phải mô hình đầy đủ tạo mầm, chuyển dạng hoặc oxy hóa.

- [IARC — Cobalt and cobalt compounds](https://www.ncbi.nlm.nih.gov/books/NBK506968/?report=printable): các sản phẩm cobalt hydroxide có thể xanh lục lam hoặc hồng tùy vật liệu. Không suy ra một màu duy nhất cho mọi điều kiện.
- [Museum of Fine Arts — Cobaltous hydroxide](https://cameo.mfa.org/wiki/Cobaltous_hydroxide): bột hồng đỏ, mật độ 3,597 g/mL. Profile mới chọn trạng thái hồng đó; chưa mô phỏng dạng α/muối bazơ có anion xen lớp.
- [US EPA — Drinking Water Criteria Document for Manganese](https://19january2021snapshot.epa.gov/sites/static/files/2018-12/documents/dw-criteria-manganese.pdf): Mn(OH)₂ trắng hồng, mật độ 3,258. Không dùng mật độ vật liệu để khẳng định mật độ của bông ngậm nước.

Chương trình cobalt cũ thể hiện muối bazơ xanh chuyển hồng bằng `beerLambertFade`, trong khi inventory chỉ có Co(OH)₂. Bỏ hoạt ảnh đổi màu đó để tránh hiển thị bước trung gian chưa được theo dõi định lượng; mô tả hiện ghi rõ phần chưa thực hiện. Để hoàn thành cần phản ứng trung gian cân bằng, lượng anion, điều kiện kiềm và trạng thái cấu trúc riêng. Không biến sự đổi màu thành bằng chứng phản ứng đã được mô phỏng.

Chương trình manganese giữ giai đoạn Mn(II) mới tạo; không tự chuyển nâu hay sửa thành MnO₂ theo tuổi hạt. Cần oxy được cấp hữu hạn và ledger cho trạng thái oxy hóa tiếp theo. Bán kính cầu 1 µm, hình gel/floc và hệ số quang học/kết tụ là giả định hiển thị chưa hiệu chuẩn. Chưa có cân bằng pH/tạo phức riêng cho hai chất.

Kiểm thử kiểm tra màu giữa species/after/profile khớp nhau, không còn hoạt ảnh chuyển màu vô điều kiện, bảo toàn khối lượng và xóa hạt khi hết chất. Bảng độ phủ hiện 35/42 chương trình có profile riêng; chưa phải 35 cơ chế đã hoàn chỉnh. Chưa xác minh GPU.
