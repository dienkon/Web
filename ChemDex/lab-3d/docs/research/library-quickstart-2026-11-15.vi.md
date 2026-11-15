# Kho phản ứng: bắt đầu cục bộ và quan sát — 15/11/2026

## Thiếu sót tái hiện

- `ReactionLibraryPanel` ghi “Có chương trình hiệu ứng” cho `existing_program`, nhưng không có thao tác chạy chương trình. Người dùng phải tìm công cụ Studio riêng hoặc dựng lại mẫu bằng tay.
- Bộ tra chương trình chỉ lập khóa từ chất phản ứng. Kho thật của mẫu `h2o2_mno2` gồm `H2O2`, `MnO2`, `H2O`: khóa có xúc tác không khớp, nên `findHandcraftedProgram` trả `null` rồi resolver thử mạng dù chương trình có sẵn.
- Một danh sách chất có hai hàng cùng công thức (ví dụ hai lần thêm HCl) cũng có thể làm phép so độ dài loại bỏ chương trình sẵn có.

## Thay đổi

- Thêm 5 mục quan sát nhanh: Cu(OH)₂, PbI₂, Cu bám Fe, Ag bám Cu, phức đồng–ammonia. Mỗi mục có phương trình từ chương trình thật, diễn biến tiếp xúc, thao tác quan sát tiếp và nguồn.
- Mọi mục `existing_program` đủ hỗ trợ có nút tạo mẫu và chạy trên bàn. Gọi trực tiếp thư viện cục bộ; tạo bình mới, giữ nguyên mẫu đang có, dùng lượng chất hữu hạn và bộ kiểm điều kiện hiện tại. Mẫu cần mồi cháy/nhiệt được chuẩn bị nhưng không báo đã phản ứng khi thiếu điều kiện. Các mục tham khảo vẫn không có nút chạy giả.
- Bổ sung khóa có xúc tác, giữ khóa không có xúc tác cho caller truyền chất phản ứng riêng. Kiểm điều kiện vẫn bắt buộc có lượng xúc tác đúng pha; không bỏ qua chất lạ. Chuẩn hóa tập chất trong so khớp để chấp nhận nhiều hàng cùng công thức.
- PbI₂ ghi rõ mẫu trộn lạnh là bột mịn. Muốn phiến tái kết tinh cần tăng phần hòa tan khi đun nóng rồi để nguội; không hứa toàn bộ mẫu phối sẵn sẽ tan hết hoặc tinh thể xuất hiện tức thời.

## Nguồn đối chiếu

- University of Washington, [Copper Complexes](https://chem.washington.edu/lecture-demos/copper-complexes): Cu(OH)₂ xanh nhạt và phức đồng–ammonia xanh đậm khi thay lượng NH₃. Nguồn minh họa thuốc thử NH₃, hỗ trợ màu/pha Cu(OH)₂; mẫu CuSO₄/NaOH dùng chương trình và cân bằng đã có.
- Victoria University of Wellington, [Chemistry Teachers Day, Golden Rain](https://www.wgtn.ac.nz/__data/assets/pdf_file/0004/1984576/chem-teachers-day-lab-handout.pdf): PbI₂ tan tốt hơn khi nóng, tái kết tinh khi nguội.
- Indiana University, [Copper Plating a Nail](https://www.chem.indiana.edu/faculty-research/faculty-resources/chemistry-demos/demo/copper-plating-a-nail/): Cu hình thành trên nền Fe.
- University of Washington, [Silver onto Copper](https://chem.washington.edu/lecture-demos/replacement-reaction-silver-copper): Ag hình thành trên Cu, dung dịch có Cu(II) chuyển xanh.

Đã đọc nguồn ngày 15/11/2026. Chỉ dùng để đối chiếu hiện tượng, không lấy thời gian minh họa hoặc lượng mẫu phần mềm làm quy trình thực nghiệm.

## Kiểm chứng

`npx vitest run tests/library_launch.test.ts tests/reaction_programs_library.test.ts tests/reaction_activation.test.ts tests/programs_and_catalog.test.ts --maxWorkers=1 --reporter=dot`: **36/36 kiểm thử, 4/4 tệp qua**.

Hồi quy mới chạy thật 5 mẫu qua store, kiểm khối lượng hữu hạn và không gọi fetch; giữ nguyên bình/mẫu cũ khi khởi tạo hai chương trình; chặn Mg/O₂ chưa mồi; chặn ID sai; tra H₂O₂/MnO₂ tức thời với fetch giả không bao giờ trả lời; chặn xúc tác thiếu/sai pha; nhận công thức lặp nhưng không lờ chất lạ. Kiểm trình duyệt và tổng tích hợp do vòng kiểm chung thực hiện.

Giới hạn: các mẫu nhanh là mẫu phối sẵn, không diễn hoạt thêm từng liều như bàn tự động. Không tăng số phương trình chưa kiểm chứng chỉ để tăng số lượng kho (kho tham khảo 1.300 phương trình vẫn tách biệt). Thời gian, màu và hình thái vi mô chưa được hiệu chuẩn đầy đủ với mẫu thực.
