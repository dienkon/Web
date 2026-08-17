# ChemDex

ChemDex là một web hóa học tĩnh, tập trung vào ba trụ cột chính:

1. **Bảng tuần hoàn tương tác** với khả năng lọc, tìm kiếm, tô sáng theo nhóm/chu kỳ và xem chi tiết nguyên tố.
2. **Hệ sinh thái nội dung hóa học** gồm thư viện tài liệu số, phòng thí nghiệm ảo và bộ tiện ích tính toán.
3. **Khối dữ liệu hóa học mở rộng** cho từng nguyên tố, hỗ trợ hiển thị nội dung giàu ngữ nghĩa, media 3D, video, công thức và ghi chú.

Dự án được triển khai theo kiểu **static site + ES Modules**, dùng các thư viện CDN như Tailwind CSS, Three.js, MathJax, Font Awesome, Lucide và YouTube Iframe API.

## Trạng thái hiện tại

- Có **118 nguyên tố** trong manifest dữ liệu.
- Có **36 nguyên tố** đã có JSON nội dung chi tiết.
- Phần còn lại đang ở trạng thái **placeholder / chưa mở rộng**.
- Giao diện được chia thành nhiều trang:
  - `index.html` — Bảng tuần hoàn & trang chi tiết nguyên tố.
  - `tai-lieu-so.html` — Thư viện tài liệu số.
  - `thi-nghiem.html` — Phòng thí nghiệm ảo.
  - `tien-ich.html` — Công cụ hóa học.
  - `edit.html` — Khu vực quản lý / biên tập dữ liệu hóa học.

## Điểm nổi bật

- Bố cục bảng tuần hoàn được dựng bằng thuật toán từ dữ liệu nguyên tử.
- Dữ liệu nguyên tố có phân lớp rõ: `general`, `history`, `structure`, `occurrence`, `physical`, `chemical`, `applications`, `simulation`, `notes`.
- Có hỗ trợ hiển thị media phong phú: hình ảnh, video, mô hình 3D, widget electron, mô hình mạng tinh thể.
- Có chatbot gắn ngữ cảnh theo trang / theo nguyên tố.
- Có cơ chế tải dữ liệu qua `manifest.json` và các file JSON nguyên tố.

## Cấu trúc thư mục chính

```text
ChemDex/
├─ index.html
├─ edit.html
├─ tai-lieu-so.html
├─ thi-nghiem.html
├─ tien-ich.html
├─ css/
├─ js/
├─ data/
└─ assets/
```

## Tài liệu đi kèm

- [Tổng quan kiến trúc](docs/ARCHITECTURE.md)
- [Mô tả tính năng](docs/FEATURES.md)
- [Mô hình dữ liệu](docs/DATA_MODEL.md)
- [Hướng dẫn chạy & triển khai](docs/SETUP.md)
- [Kế hoạch tương lai](docs/ROADMAP.md)
- [Quy ước đóng góp](docs/CONTRIBUTING.md)
- [Checklist kiểm thử](docs/QA_TESTING.md)
- [Ghi chú trạng thái & refactor](docs/CHANGELOG.md)

## Mục tiêu thiết kế

ChemDex hướng đến cảm giác của một **cổng học tập hóa học** hơn là một trang tra cứu đơn thuần. Mỗi nguyên tố không chỉ là một ô trong bảng tuần hoàn, mà là một “thực thể học tập” có lịch sử, cấu trúc, ứng dụng, media và liên kết chéo đến các nội dung liên quan.

## Gợi ý sử dụng

- Dùng `index.html` để tra cứu nhanh nguyên tố và mở trang chi tiết.
- Dùng `tai-lieu-so.html` để đọc nội dung chuyên đề.
- Dùng `thi-nghiem.html` để mô phỏng và tương tác với các kịch bản hóa học.
- Dùng `tien-ich.html` để tính toán và hỗ trợ học tập.
- Dùng `edit.html` để quản lý, mở rộng và chuẩn hóa dữ liệu nguyên tố.

## Ghi chú kỹ thuật

Dự án hiện nghiêng về mô hình “no-build”, dễ mở bằng web server tĩnh. Khi chạy bằng cách mở trực tiếp file, một số chức năng dùng `fetch()` hoặc ES Modules có thể không hoạt động ổn định. Nên dùng một local server nhẹ để kiểm thử.

---

*Bộ tài liệu này được viết theo snapshot hiện tại của dự án, với mục tiêu đưa repo sang phong cách tài liệu chuyên nghiệp, rõ ràng và dễ mở rộng.*
