# Mô tả tính năng

## 1. Bảng tuần hoàn tương tác

### Tính năng hiện có
- Hiển thị 118 nguyên tố theo layout logic.
- Màu phân loại theo nhóm:
  - phi kim,
  - khí hiếm,
  - kim loại kiềm,
  - kim loại kiềm thổ,
  - á kim,
  - halogen,
  - kim loại chuyển tiếp,
  - lanthanide,
  - actinide,
  - chưa phân loại.
- Tô sáng theo:
  - hàng,
  - cột,
  - nhóm nguyên tố,
  - trạng thái dữ liệu.
- Click nguyên tố để mở trang chi tiết.
- Có hỗ trợ tìm kiếm và lọc.

### Giá trị học tập
- Dễ quan sát quy luật chu kỳ.
- Học sinh có thể phân biệt nhóm nguyên tố bằng màu sắc.
- Giúp chuyển từ tra cứu thụ động sang khám phá tương tác.

## 2. Trang chi tiết nguyên tố

Mỗi nguyên tố chi tiết có thể hiển thị:

- thông tin chung,
- tên Latin / tên tiếng Anh,
- cấu hình electron,
- đồng vị,
- nhóm / chu kỳ / block,
- trạng thái vật chất,
- số oxi hóa,
- độ âm điện,
- khối lượng riêng,
- nhiệt độ nóng chảy / sôi,
- cấu trúc tinh thể,
- lịch sử phát hiện,
- nguồn gốc / nơi phát hiện,
- mô tả occurrence,
- tính chất vật lý và hóa học,
- điều chế,
- phản ứng tiêu biểu,
- ứng dụng,
- mô phỏng / minh họa,
- ghi chú.

## 3. Media nâng cao

ChemDex hỗ trợ nhiều dạng media:
- hình ảnh minh họa,
- video nhúng,
- mô hình 3D (GLTF/OBJ/FBX),
- widget electron,
- widget mạng tinh thể,
- khối công thức / phương trình.

## 4. Chatbot theo ngữ cảnh

Chatbot có thể thay đổi gợi ý theo:
- trang hiện tại,
- nguyên tố đang xem,
- bối cảnh chi tiết hay bảng tuần hoàn.

Tác dụng:
- giúp người học đặt câu hỏi nhanh,
- gợi ý câu hỏi mẫu,
- tăng cảm giác “trợ lý học tập”.

## 5. Thư viện tài liệu số

Trang `tai-lieu-so.html` đóng vai trò như một không gian đọc / tra cứu chuyên đề, có phong cách giao diện riêng và hướng tới nội dung học thuật hóa học dài hơi.

## 6. Phòng thí nghiệm ảo

Trang `thi-nghiem.html` mô phỏng một môi trường lab ảo kiểu PhET:
- tương tác theo kịch bản,
- mô phỏng trực quan,
- phù hợp để mở rộng các bài thực hành hoặc thí nghiệm an toàn.

## 7. Tiện ích hóa học

Trang `tien-ich.html` là bộ công cụ hỗ trợ:
- tính toán,
- tra cứu nhanh,
- tiện ích học tập,
- mở rộng các mini-tool cho người học.

## 8. Khu vực biên tập dữ liệu

`edit.html` là nơi phù hợp cho:
- dán dữ liệu JS object,
- chuẩn hóa field,
- xem trước render,
- kiểm tra nội dung có cấu trúc,
- mở rộng kho dữ liệu nguyên tố.

## 9. Các tính năng có thể xem là nền tảng

- Phân tách dữ liệu thành manifest và file chi tiết.
- Cơ chế cache dữ liệu.
- Hệ thống note / chia sẻ / liên kết chéo.
- Bootstrap module rõ ràng.
- Chuẩn bị sẵn cho mở rộng nội dung học thuật lớn hơn.
