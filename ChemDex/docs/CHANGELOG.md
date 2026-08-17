# Ghi chú trạng thái & refactor

## 1. Snapshot hiện tại

Theo ghi chú refactor trong repo:
- `js/app.js` là module logic gốc đã được tách ra với đường dẫn import mới.
- `data/index.js` khởi tạo data layer và nạp `detailedData` thông qua `loadAllKnownElements()`.
- `data/manifest.json` có 118 entry.
- Trong đó 36 entry có payload JSON thật, 82 entry đang `hasData: false`.
- `css/app.css` giữ các style tùy biến được tách khỏi HTML.

## 2. Ý nghĩa của refactor

Việc tách này cho thấy dự án đã đi từ:
- kiểu “mọi thứ nhét trong một file”,
sang
- kiểu “module hóa dữ liệu + giao diện + logic”.

Điều này giúp:
- dễ bảo trì,
- dễ thêm tài liệu,
- dễ mở rộng dữ liệu,
- dễ debug.

## 3. Những điểm đã ổn định

- Data layer đã có manifest rõ ràng.
- Bảng tuần hoàn có cấu trúc tự sinh.
- Trang chi tiết có nhiều loại media.
- Có tách riêng các module chức năng.

## 4. Những điểm còn cần phát triển

- Mở rộng dữ liệu chi tiết cho phần lớn nguyên tố.
- Chuẩn hóa schema nội dung trên toàn bộ file JSON.
- Tách dần các khối render lớn thành component nhỏ hơn.
- Làm rõ chiến lược offline / cache nếu muốn dùng lâu dài.

## 5. Gợi ý ghi changelog về sau

Mỗi lần cập nhật lớn nên ghi:
- ngày,
- module thay đổi,
- dữ liệu thêm / xóa,
- lỗi đã sửa,
- ảnh hưởng đến người dùng,
- ghi chú rollback nếu cần.
