# Màu dung dịch và màu hạt kết tủa

Ngày 23/10/2026. [University of Wisconsin — Aqueous Reactions: Copper(II) Sulfate](https://www2.chem.wisc.edu/deptfiles/genchem/lab/ccaold/main/cuso/page1.htm) mô tả dung dịch xanh nhạt và kết tủa trắng khi trộn CuSO₄ với BaCl₂; màu xanh thuộc Cu²⁺ hòa tan. Cùng trang phân biệt kết tủa Cu(OH)₂ xanh nhạt với màu xanh đậm của phức đồng–amoniac. Do đó không thể lấy màu kết tủa làm màu toàn bộ dung dịch.

Renderer nay có uniform riêng cho màu tán xạ của huyền phù. Khi hệ hạt đã khớp tồn kho, màu đó lấy từ profile kết tủa; độ đục vẫn lấy từ lượng còn lơ lửng. Màu hấp thụ nền dùng một phép chiếu định tính chỉ cho danh sách hỗn hợp nước được hỗ trợ. Chất rắn và khí không đóng góp màu của pha hòa tan.

- Các hỗn hợp nước với muối không màu trong danh sách cho nền gần không màu, dù có AgCl, AgBr, AgI, PbI₂ hay BaSO₄ rắn.
- Các muối CuSO₄, Cu(NO₃)₂, CuCl₂ hòa tan trong miền loãng cho màu xanh; pha loãng làm màu nhạt hơn. RGB nội suy là minh họa, chưa phải phổ hấp thụ hoặc định luật Beer–Lambert đã hiệu chuẩn.
- Giới hạn 0,1 M cho Cu và chloride là hàng rào phạm vi hỗ trợ bảo thủ, không phải ranh giới chuyển pha hay tạo phức thực nghiệm.
- Có chỉ thị, NH₃, phức chất, chất hòa tan chưa nhận diện, lớp hữu cơ hoặc thiếu pha rõ ràng thì trả về không hỗ trợ và giữ màu cũ. Không suy ra màu phức từ tên muối đồng.

7 ca mới kiểm tra màu nền với năm kết tủa, Cu hòa tan cạnh BaSO₄, pha loãng và từ chối các hỗn hợp ngoài phạm vi. Cùng 3 ca độ đục đã đạt. Kiểm tra CPU chưa xác nhận shader trên GPU. Các trường hợp ngoài danh sách, hỗn hợp nhiều kết tủa, mặt phân cách lắng và màu phổ vẫn cần tiếp tục hoàn thiện.
