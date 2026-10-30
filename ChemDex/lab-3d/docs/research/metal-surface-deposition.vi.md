# Chất rắn kim loại bám trên bề mặt

Đối chiếu 24/10/2026. Rà danh mục tìm hai chương trình đang khai báo qua trường `precipitate` nhưng cần kiểm chứng vị trí tạo kim loại: `zn_agno3` (Ag trên Zn) và `mg_cuso4` (Cu trên Mg). Không coi bổ sung profile bột Ag/Cu là hoàn tất hai hiệu ứng này.

## Bằng chứng và phạm vi

- [BISB — Crystal growing](https://www.nordangliaeducation.com/bisb-budapest/news/year-13-crystal-growing): mô tả thí nghiệm trực tiếp dùng Zn với AgNO₃/CuSO₄ và quan sát tinh thể kim loại dưới kính. Nguồn này không cung cấp đường tốc độ định lượng.
- [UW–Madison — Silver tree](https://demolab.chem.wisc.edu/electrochemistry-silver-trees/): Ag hình thành trên tấm Cu trong AgNO₃. Đây là bằng chứng vị trí bám của hệ Cu/Ag, không phải dữ liệu hiệu chuẩn Zn/Ag.
- [Indiana University — Copper plating a nail](https://www.chem.indiana.edu/faculty-research/faculty-resources/chemistry-demos/demo/copper-plating-a-nail/): Cu bám trên đinh Fe trong CuSO₄. Không tự áp thời gian/bám dính của Fe cho Mg.
- [Copper immersion plating on iron (1975)](https://www.jstage.jst.go.jp/article/sfj1950/26/12/26_12_592/_article): lớp Cu có thể bám kém tùy nồng độ. Không được giả định mọi kim loại tạo thành đều bám mãi hoặc đều rơi ngay.
- [Copper electrodeposition on magnesium (2008)](https://www.sciencedirect.com/science/article/pii/S0013468608005665): nghiên cứu xử lý bề mặt trong bể kiềm có điện áp ngoài. Không dùng tốc độ hay độ bám của quy trình này làm mô hình phản ứng thế tự phát Mg/CuSO₄.

## Khoảng trống trong mã hiện tại

Chương trình Zn/Ag khai báo dendrite ở anchor đáy; Mg/Cu khai báo Cu qua kết tủa bột. Bộ vật lý chung vẫn chỉ biết một kho hạt/lớp lắng trong bulk; chưa có vị trí bám lên bề mặt vật rắn, lượng kim loại bám và lượng bong ra tách biệt. Do đó chưa xác minh hết lỗi lơ lửng của hai hệ này. Báo cáo audit bổ sung `formationRoute`, `requiredSubstrates`, `surfaceAttachmentVerified` và mục `unverifiedSurfaceDeposition`, hiện liệt kê đúng hai chương trình trên. Các chương trình khác chưa được suy diễn mặc định là tạo trong bulk.

Để đạt cơ chế đúng, cần giữ lượng sản phẩm từ ledger, chia hữu hạn giữa lớp bám và phần bong, gắn hình học vào vị trí vật rắn thật (kể cả khi di chuyển), xử lý vật nền tan hết, cùng chuyển lượng khi rót/lọc. Hình cây/dendrite và độ dày lớp bám phải dùng lượng kim loại thực, không sinh vô hạn theo đồng hồ. Không có hằng số động học hay tiêu chí bong đã hiệu chuẩn trong lượt nghiên cứu này.

Kiểm tra cân bằng danh mục hiện không phát hiện lỗi nguyên tố/điện tích hoặc sai khai báo sản phẩm hình ảnh. Kiểm tra đó không chứng minh vị trí tạo chất rắn, bám dính, động học hay GPU. Đây là báo cáo nghiên cứu và phân loại khoảng trống; chưa phải bản sửa bộ render lớp bám.

## Bước triển khai hiển thị ban đầu

Đã thêm `metalSurfaceAppearance` cho đúng hai id phản ứng trên, lấy id gần nhất hoặc specimen Studio và khối lượng bulk thực của kim loại nền/sản phẩm. Khi nền còn tồn tại, giả định toàn bộ sản phẩm còn bám: dùng tỷ phần m_sản_phẩm/(m_sản_phẩm+m_nền) để pha màu kim loại lên chính mesh nền. Đây là đáp ứng màu minh họa, không phải độ phủ diện tích hay độ dày phim đo được. Mesh nền đã có chuyển động/biến đổi riêng nên màu đi theo nó, không có một đám hạt khác lơ lửng ở vị trí cố định.

Bộ hạt và phép đọc độ đục loại cùng lượng kim loại đang được biểu diễn trên nền khỏi huyền phù, tránh vẽ trùng sản phẩm. Không sửa/xóa lượng kim loại trong ledger. Khi nền hết hoặc id phản ứng không khớp, nhánh này không suy luận bám dính. Chưa có kho chất bám độc lập để giữ lịch sử khi trộn/chuyển mẫu, chưa có tách bong/diện tích phủ hoặc hình học dendrite; đường hạt mặc định sau khi nền hết vẫn cần hoàn thiện. Bởi vậy audit vẫn giữ `surfaceAttachmentVerified=false`.

Kiểm thử CPU xác nhận đúng hai route, lượng hữu hạn lấy từ inventory, không thay đổi ledger, không tạo đám hạt/độ đục trùng và không áp cho phản ứng khác hoặc nền đã hết. Chưa kiểm chứng màu/vị trí bằng GPU; chưa coi hiệu ứng lớp bám đã hoàn tất.

## Kim loại rời sau khi nền hết

Thêm profile Ag/Cu cho nhánh sản phẩm rời; không còn dùng màu/mật độ mặc định BaSO₄. [RSC — Silver](https://periodic-table.rsc.org/element/47/Silver) cho mật độ 10,5 g/cm³; [RSC — Copper](https://periodic-table.rsc.org/element/29/Copper) cho 8,96 g/cm³. Bán kính cầu tương đương 10 µm, dạng granular và hệ số quang học là giả định minh họa của mảnh rời, không mô tả cây bạc nguyên vẹn hay phân bố kích thước thực.

Tách `metalness` khỏi hệ số phản xạ: Ag/Cu dùng vật liệu dẫn điện PBR, profile muối/hydroxide mặc định metalness=0. Phản xạ của tinh thể điện môi không đồng nghĩa vật liệu là kim loại. Lớp lắng nhận cùng thông số metalness. Kiểm thử manager đi từ nền còn tồn tại (không tạo cloud trùng) sang nền hết (hiển thị hữu hạn lượng kim loại rời), kiểm tra danh tính/màu, lượng chất và vật liệu kim loại. Chưa có ledger bám/bong độc lập; việc giải phóng toàn bộ khi nền hết vẫn là giả định và cần thay bằng cơ chế thực nghiệm.
