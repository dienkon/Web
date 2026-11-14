# 12A1 · Nhà Có Nhau

Web tĩnh cho kho kỷ niệm của lớp, chạy trên GitHub Pages bằng HTML, CSS và JavaScript. Không cần Python, server riêng, Node.js trên hosting hay bước build khi người dùng mở trang. Đã bỏ hoàn toàn tìm kiếm khuôn mặt và các mô hình nhận diện.

## Đưa lên GitHub Pages

### Dùng repository Web hiện tại

Giữ nguyên thư mục `ky-niem-thanh-xuan` trong repo. Khi GitHub Pages phục vụ nhánh `main` tại `/(root)`, trang nằm ở `/Web/ky-niem-thanh-xuan/`. Chọn nguồn xuất bản trong **Settings → Pages → Deploy from a branch → main → /(root)** nếu repo chưa cấu hình Pages. Không cần thay đổi các dự án khác trong repo.

### Dùng repository riêng

Upload **nội dung** thư mục `dist/` vào gốc repository, rồi bật GitHub Pages cho nhánh đó. `index.html` phải nằm ở gốc nguồn xuất bản. Bộ file đã có `.nojekyll` và đường dẫn tương đối, nên chạy được ở cả gốc tên miền lẫn thư mục con.

Hướng dẫn chính thức: [Tạo GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

## Kết nối Google Drive

`drive-config.js` đã có URL Apps Script dùng chung. Trình duyệt gọi HTTPS trực tiếp đến cầu nối này để đọc Drive, upload, tạo thư mục, lưu giới thiệu và xem lịch sử. GitHub Pages chỉ phục vụ giao diện; dữ liệu vẫn nằm trên Google Drive. Không cần khởi chạy `server.py` hoặc chương trình local.

Giữ URL `/exec` hiện tại để tiếp tục dùng deployment đã có. Không cần triển khai lại Apps Script chỉ vì chuyển hosting. Nếu dùng tài khoản/kho khác, xem [DRIVE-SETUP.md](DRIVE-SETUP.md). Không đặt access token Google trong file web.

Các tính năng giữ lại: tìm tệp bằng tên, xem ảnh gốc/video, hồ sơ từng thành viên và album con, upload chia nhỏ có tiếp tục, lịch sử dùng chung, đường dự phòng cho ảnh bị trình duyệt chặn.

## Bộ file xuất bản

`index.html`, `memories.css`, `assets/site.css`, `favicon.svg`, `drive-config.js`, `drive-live.js`, `drive-images.js`, `member-profiles.js`, `.nojekyll`.

Không cần upload các file Python, tests, mã nguồn Apps Script hoặc cấu hình build. Có thể tạo lại `dist/` từ mã nguồn bằng lệnh tùy chọn:

```sh
node build-static.mjs
```

CSS đã được biên dịch sẵn. Chỉ khi sửa/thêm utility class mới, người phát triển mới cần tạo lại CSS bằng [Tailwind CLI](https://v3.tailwindcss.com/docs/installation):

```sh
npm exec --yes --package tailwindcss@3.4.17 -- tailwindcss -c tailwind.config.cjs -i styles/tailwind.css -o assets/site.css --minify
node build-static.mjs
```

## Kiểm tra

```sh
node --test tests/drive.test.cjs
node build-static.mjs
node tests/drive-ui.cjs
node tests/memories-ui.cjs
node tests/images-ui.cjs
```

Các bài kiểm tra trình duyệt cần Playwright; có thể trỏ `PLAYWRIGHT_MODULE` đến package đã cài. Mặc định chúng mô phỏng GitHub Pages qua HTTPS tại một thư mục con và chỉ phục vụ những file trong `dist/`, không cần chạy server. Drive được mô phỏng để không tạo tệp thật. Đặt `LIVE_DRIVE_THUMBNAIL_ID` khi chạy `images-ui.cjs` để thử đọc một ảnh thật qua cầu nối, không sửa dữ liệu Drive.
