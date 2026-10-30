# Nâng cấp hiện trường dụng cụ — 28/10/2026

## Phát hiện và mục tiêu

Bộ tình huống đã có nền/chuyển động riêng, nhưng nhiều bài dụng cụ còn rơi vào nền mặc định. Thông gió và báo khói cùng dùng hình tủ hút; bình tia là chai thường. Thang buret đang cùng chiều ống đong; vòi nước có thể hiện trước khi kích hoạt. Mục tiêu là hoàn thiện đúng từng trạm và trạng thái, giữ nguyên khung thực hành và các bước đã có.

## Kế hoạch

1. Gán visual ID rõ ràng cho mọi bài dụng cụ chưa có; giữ các bài đã trỏ tới tình huống riêng. Thêm hồ sơ nền, tên trạm, màu và chú thích cho cân, thể tích, chuẩn độ, pH, nhiệt, vệ sinh, bình tia, ghế, ngăn kéo/tủ, chăn, vòi tắm, bộ tràn, đồng hồ, thông gió và báo khói. Thu gom/phân loại chất thải có hiện trường theo loại.
2. Dựng SVG đúng loại: bình tia có vòi cong; tấm thông gió có lá; đầu báo khói có khe/đế; hộp bộ tràn; vật chứa sắc nhọn có khe. Ống đong/buret có chiều chia khác nhau và mặt khum theo mức điều chỉnh.
3. Cho hiệu ứng đi theo dữ liệu bước và cử chỉ: giọt chuẩn độ chỉ khi khóa mở; vòi rửa/tắm đúng bước; bọt giảm sau tráng; vệt bình tia khi bóp; trạng thái cân/TARE, pH đang đo/ổn định; nhiệt dư không tự coi là nguội; dây chăn kéo riêng; đồng hồ tính số giây mô phỏng thực.
4. Kiểm chứng bằng thao tác browser thật cho từng loại dụng cụ, bao gồm hoàn thành bài, sai vị trí/đặt lại, thu phóng, touch và reduced motion. Đo bounds khung trước/sau. Chạy TypeScript, build và kiểm tra lõi; lưu ảnh và báo cáo.

Rà tất cả điểm gọi `PracticalSimulation` còn phát hiện hai bài nằm ngoài danh mục cũ: pha loãng và nhận diện biểu tượng. Cả hai được đưa vào danh mục kiểm tra lõi và browser; bổ sung vùng rót/khay/khuấy và vùng gắn nhãn riêng. Chỉ chỉnh tiêu đề bài biểu tượng để bao quát cả các ký hiệu sinh học đã có, giữ nội dung từng mô tả và số bước.

## Cơ sở kiểm tra hình dáng

- [University of Wisconsin — đọc buret](https://www2.chem.wisc.edu/deptfiles/genchem/lab/labdocs/modules/buret/bretread.htm): buret có số 0 phía trên, khác chiều ống đong; đọc mặt khum ngang mắt.
- [Vernier — pH sensor manual](https://www.vernier.com/manuals/ph-bta/): phân biệt đo, rửa và bảo quản đầu điện cực. Chỉ dùng để rà hình/trạng thái, không thêm thông số vận hành hay số đo hóa chất thật vào game.

## Nghiệm thu

- Mọi bài dụng cụ có visual ID xác định; nhóm dùng chung quy trình vẫn giữ đúng hiện trường tương ứng.
- Mỗi trạm mới có hình nền/chi tiết riêng và phản hồi liên quan đến công dụng, không dùng rung khung hay một chuyển động đổi màu chung.
- Buret/ống đong đúng chiều chia; không có dòng nước/giọt rót trước kích hoạt; không hiển thị pH giả của mẫu chưa có số liệu.
- Không đổi vị trí khung qua bước/lỗi/gợi ý/zoom/reduced motion; không làm mất khả năng hoàn thành bài hoặc tiến độ cũ.

## Trạng thái

Đã hoàn tất. Xem [báo cáo, ảnh và kiểm chứng](instrument-upgrade/README.md): 29 bài/biến thể mới được hoàn thành bằng gesture thật, 351 mục kiểm tra browser trong các báo cáo, 78 workflow / 421 bước được kiểm tra lõi.

Rà ảnh cuối đã thay pipet minh họa bằng đũa thủy tinh đúng dạng, đưa cốc nước vào khay, bỏ nhãn chồng ở giá điện cực. Đáy mặt khum được đo trên chính đường SVG để khớp vạch đọc, không chỉ đối chiếu số hiển thị.
