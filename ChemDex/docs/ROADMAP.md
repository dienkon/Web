# Kế hoạch tương lai

## 1. Giai đoạn gần: hoàn thiện dữ liệu

### Mục tiêu
- Mở rộng số nguyên tố có JSON chi tiết từ 36 lên nhiều hơn nữa.
- Đồng bộ nội dung giữa:
  - bảng tuần hoàn,
  - trang chi tiết,
  - thư viện số,
  - công cụ tính toán.

### Việc nên làm
- Bổ sung dữ liệu còn thiếu cho các nguyên tố phổ biến.
- Chuẩn hóa field giữa các file JSON.
- Bổ sung nguồn tham khảo, link và ghi chú.
- Tối ưu phần text dài để dễ đọc hơn trên mobile.

## 2. Giai đoạn trung hạn: nâng cấp học thuật

### Tài liệu
- Thêm bài chuyên đề theo:
  - nhóm nguyên tố,
  - chu kỳ,
  - tính chất hóa học,
  - ứng dụng công nghiệp,
  - lịch sử khám phá.

### Tính năng
- Bộ lọc nâng cao theo:
  - trạng thái vật chất,
  - độ âm điện,
  - khối lượng nguyên tử,
  - cấu hình electron,
  - độ hiếm / mức phổ biến.
- So sánh hai nguyên tố song song.
- Tạo trang “học theo chủ đề”.

## 3. Giai đoạn trung hạn: nâng cấp trải nghiệm

- Thêm tìm kiếm mạnh hơn với gợi ý thông minh.
- Lưu lịch sử xem gần đây.
- Bookmark nguyên tố yêu thích.
- Chế độ sáng / tối đồng bộ toàn bộ website.
- Tối ưu tải media bằng lazy loading.
- Tối ưu cho mobile và tablet.

## 4. Giai đoạn dài hạn: kho học liệu lớn

- Chuyển `tai-lieu-so.html` thành thư viện chuyên đề đúng nghĩa:
  - bài viết,
  - danh mục,
  - tag,
  - tìm kiếm toàn văn.
- Thêm timeline lịch sử hóa học.
- Thêm phần hỏi đáp / ôn tập trắc nghiệm.
- Thêm case study công nghiệp cho từng nguyên tố quan trọng.

## 5. Giai đoạn dài hạn: mô phỏng và tương tác sâu

- Mở rộng phòng thí nghiệm ảo với:
  - phản ứng an toàn,
  - cân bằng phương trình,
  - thao tác kéo thả,
  - mô phỏng hiện tượng.
- Bổ sung mô hình 3D cho nhiều nguyên tố / tinh thể hơn.
- Tạo chế độ “visual learning” cho học sinh.

## 6. Giai đoạn dài hạn: cộng tác và dữ liệu mở

- Chuẩn hóa schema để nhiều người có thể đóng góp.
- Tách dữ liệu theo module:
  - nguyên tố,
  - phản ứng,
  - bài viết,
  - media,
  - câu hỏi ôn tập.
- Xây dựng quy trình review nội dung trước khi merge.

## 7. Roadmap đề xuất theo mức ưu tiên

### P0
- Hoàn thiện manifest và dữ liệu còn thiếu.
- Chuẩn hóa render toàn site.
- Fix các lỗi đường dẫn / fetch / media nếu có.

### P1
- Thêm so sánh nguyên tố.
- Thêm bộ tìm kiếm nâng cao.
- Thêm bookmark và recent view.

### P2
- Thư viện số có tag, category và search.
- Lab ảo mở rộng với mô phỏng tương tác.
- Tối ưu nội dung mobile.

### P3
- Offline support.
- PWA.
- Dữ liệu học tập đồng bộ nhiều ngôn ngữ.
