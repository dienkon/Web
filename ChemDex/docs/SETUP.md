# Hướng dẫn chạy & triển khai

## 1. Yêu cầu môi trường

ChemDex là dự án web tĩnh, nên yêu cầu rất nhẹ:

- Trình duyệt hiện đại
- Một local server để chạy file tĩnh
- Kết nối Internet nếu muốn tải CDN assets như:
  - Tailwind CSS,
  - Three.js,
  - MathJax,
  - Font Awesome,
  - Lucide,
  - YouTube Iframe API

## 2. Cách chạy local

### Cách 1: dùng Python
Trong thư mục gốc của dự án:

```bash
python -m http.server 8000
```

Sau đó mở:

```text
http://localhost:8000/
```

### Cách 2: dùng VS Code Live Server
- Cài extension Live Server.
- Mở `index.html`.
- Chọn “Open with Live Server”.

## 3. Vì sao không nên mở trực tiếp bằng file://

Một số phần của ChemDex dùng:
- ES Modules,
- `fetch()` để lấy JSON,
- import map,
- tài nguyên CDN.

Do đó mở trực tiếp file HTML đôi khi sẽ làm:
- lỗi load module,
- lỗi CORS khi fetch data,
- lỗi media không hiển thị đúng.

## 4. Triển khai

ChemDex có thể deploy lên:
- GitHub Pages,
- Netlify,
- Vercel,
- Cloudflare Pages,
- hosting tĩnh bất kỳ.

### Lưu ý khi deploy
- Giữ cấu trúc thư mục tương đối như hiện tại.
- Đảm bảo đường dẫn tương đối của `data/`, `assets/`, `js/`, `css/` không bị đổi.
- Nếu CDN bị chặn, cần phương án fallback hoặc tự host asset quan trọng.

## 5. Kiểm tra sau deploy

Sau khi đẩy lên hosting, nên kiểm tra:
- `index.html` có dựng bảng tuần hoàn không,
- click nguyên tố có mở chi tiết không,
- `fetch` manifest có hoạt động không,
- media 3D có tải được không,
- chatbot widget có xuất hiện không,
- các trang phụ có mở đúng giao diện.

## 6. Gợi ý quy trình làm việc

1. Chỉnh sửa dữ liệu trong `data/`.
2. Cập nhật logic trong `js/` nếu thêm schema mới.
3. Kiểm tra giao diện ở `index.html` và trang chi tiết.
4. Chạy local server.
5. Test trên nhiều kích thước màn hình.
6. Đóng gói / deploy.

## 7. Mẹo phát triển an toàn

- Không hardcode dữ liệu lớn trực tiếp trong HTML.
- Tách nội dung dài ra JSON hoặc markdown nếu có thể.
- Kiểm tra kỹ những file có import map.
- Hạn chế phụ thuộc CDN cho logic cốt lõi nếu sau này cần offline mode.
