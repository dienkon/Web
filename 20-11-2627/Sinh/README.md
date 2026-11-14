# GEN TRI ÂN — Khi tri thức nở hoa

Website tri ân thầy dạy Sinh học nhân ngày 20/11. React, TypeScript, Vite và GSAP ScrollTrigger. **Toàn bộ hình minh họa đã chuyển sang ảnh 2D sắc nét tạo bằng ImageGen**, gồm ADN, tế bào, 9 chủ đề sinh học, phong thư, hoa và bướm. Không dùng Three.js, mô hình 3D hoặc WebGL.

## Chạy trên máy

Yêu cầu Node.js 22.12+ hoặc 24+. Mở terminal tại thư mục `Sinh`:

```sh
npm install
npm run dev
```

Mở địa chỉ Vite in trong terminal, mặc định `http://127.0.0.1:5173`.

```sh
npm run build
npm run preview
```

## Cá nhân hóa

Sửa `src/content.ts`, không cần sửa logic hiệu ứng:

| Trường            | Nội dung                                                           |
| ----------------- | ------------------------------------------------------------------ |
| `teacherName`     | Lời xưng hô / tên thầy                                             |
| `className`       | Tên lớp, chữ ký tập thể                                            |
| `schoolName`      | Tên trường, để trống nếu không dùng                                |
| `greetings`       | Các đoạn thư                                                       |
| `photos`          | Đường dẫn ảnh, ví dụ `['./assets/anh-lop.jpg']`                    |
| `photoCaptions`   | Lời nhắn tương ứng với ảnh                                         |
| `studentMessages` | Lưu bút đã được lớp đồng ý đưa lên website                         |
| `backgroundMusic` | Ví dụ `'./assets/nhac-nen.mp3'`; để trống dùng hợp âm nền tổng hợp |

Đặt tệp tại `public/assets/`. Dùng đường dẫn tương đối `./assets/...` để hỗ trợ cả GitHub Pages có thư mục con. Không có ảnh thầy/học sinh giả. Các khung phim mặc định là thiệp chữ, chờ ảnh thật.

Nút **Thêm ảnh của lớp** đọc ảnh bằng `URL.createObjectURL`, không gửi ảnh đi, không lưu vào localStorage. Ảnh thêm theo cách này biến mất sau khi tải lại. Để giữ ảnh trong bản triển khai, cấu hình đường dẫn trong `content.ts`. Ảnh được đưa vào cả dải phim uốn và cửa sổ xem lớn. Giới hạn mỗi lần chọn: 24 ảnh, 15 MB/ảnh; hỗ trợ JPG, PNG, WebP, AVIF.

Lưu bút do khách viết được lưu riêng trong localStorage của trình duyệt; **không tự đồng bộ giữa thiết bị**. Nút tải xuống xuất tệp UTF-8. Muốn đưa lời nhắn vào bản quà tặng, chuyển nội dung đã duyệt sang `studentMessages` rồi build lại. Thay đổi tên miền hoặc xóa dữ liệu trình duyệt sẽ làm mất các lời nhắn cục bộ.

Nhạc chỉ bắt đầu khi nhấn nút âm thanh. Nếu chưa cấu hình tệp, website tạo hợp âm C nhẹ bằng Web Audio; không phải bản nhạc thu âm.

## Trải nghiệm và kiến trúc

- `src/App.tsx`: sáu chương, điều hướng, thư, lưu bút, thêm ảnh, âm thanh, tùy chọn trợ năng.
- `src/IllustrationScene.tsx`: toàn bộ khung cảnh 2D. Các ảnh nền trong suốt được tách thành lớp, dịch chuyển theo con trỏ, trôi nhẹ và đổi theo chương. ADN có điểm chọn nucleotide, dịch chuyển tranh và phóng to/thu nhỏ. Triển lãm có 9 ảnh riêng cho các chủ đề, cộng ảnh ADN. Dải phim 2D uốn thành đường cong từ các khung HTML có góc và độ cao riêng; nhấn mở ảnh thật, giữ nguyên quyền riêng tư.
- `src/illustrations.css`: bướm vỗ cánh bằng hai nửa ảnh quanh thân, bay theo motion path, quầng sáng, hạt bụi, cánh hoa rơi, hiệu ứng riêng ở các chương và chuyển cảnh đi vào tế bào rồi tới ADN.
- `src/BouquetArtwork.tsx` và `public/assets/bouquet-roses.png`: một ảnh hoa 2D có alpha, dùng chung ở trang đầu và chương tặng hoa. Không có mô hình hoa 3D. Hiệu ứng tặng hoa dùng chuyển động của ảnh, ánh sáng và cánh hoa bay.
- `src/content.ts`: toàn bộ thông tin cá nhân, danh sách chương và nội dung khoa học.
- `src/style.css`, `src/tokens.css`: bố cục responsive, màu, typography. Font tiếng Việt được đóng gói cục bộ, không gọi Google Fonts.
- Tất cả ảnh và prompt ImageGen được lưu trong `public/assets/`, không phụ thuộc dịch vụ ảnh bên ngoài. Bản PNG giữ nguyên làm nguồn; WebP là bản mã hóa nhẹ hơn, giữ alpha. Có thể tạo lại WebP bằng `node scripts/optimize-art.mjs` sau khi đổi PNG.
- Mở trang có loader ADN và các vòng sáng quay, hai rèm tách ra, sóng sáng lan rộng, nền aurora, hiệu ứng lấy nét và kéo cảnh ra chậm, rồi hiện tiêu đề và ảnh hoa lần lượt. Các chương có reveal theo cuộn; kỷ niệm có dải phim trôi, hoa có vòng sáng và cánh hoa, thư có hiệu ứng tiến vào khung hình. `Giảm chuyển động` bỏ hoạt ảnh; loader chờ cả hình minh họa và ảnh hoa sẵn sàng rồi mới mở trang.

Cuộn trang để đổi chương; nút bên phải và thanh điều hướng nhảy đến từng chương. Chương ADN và triển lãm cho phép kéo dịch chuyển ảnh và phóng to. **Giảm chuyển động** và **Chế độ nhẹ** ở nút tùy chỉnh. Thiết bị nhỏ hoặc có ít luồng CPU tự dùng chế độ nhẹ: giảm bướm và số hạt. Toàn bộ trang chạy được khi WebGL không khả dụng.

Ảnh khoa học là **minh họa nghệ thuật**, không phải dữ liệu cấu trúc nguyên tử hoặc mô phỏng cơ chế. Hình dạng, màu và tỉ lệ trong ảnh có thể được cách điệu. Nội dung kiến thức ở cột bên trái và sơ đồ chữ A–T / G–C mới là phần giải thích; nguyên tắc nhân đôi 5′→3′ và bán bảo tồn được nêu bằng chữ. Hiệu ứng tách hai nửa ảnh ADN chỉ gợi ý chuyển động, không mô phỏng tháo xoắn thật. Nhiễm sắc thể chữ X chỉ biểu diễn trạng thái kép co xoắn; tranh Mendel, cây và hệ sinh thái là hình tượng minh họa.

Nguồn tham khảo nội dung: [NHGRI – DNA Replication](https://www.genome.gov/genetics-glossary/DNA-Replication), [NHGRI – Deoxyribonucleic Acid](https://www.genome.gov/about-genomics/fact-sheets/Deoxyribonucleic-Acid-Fact-Sheet).

## Kiểm thử trình duyệt

```sh
npx playwright install chromium
npm run test:e2e
```

Nếu máy đã có Chromium, có thể chỉ định đường dẫn bằng biến môi trường `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Kiểm thử bao gồm điều hướng, mô hình, thư, bàn phím, lưu bút cục bộ, ảnh, âm thanh và chế độ mobile/reduced motion.

## Triển khai

Đã có `vercel.json` và `netlify.toml`. Trong Vercel/Netlify, chọn repository và **Root directory `20-11-2627/Sinh`**. Lệnh cài `npm ci`, lệnh build `npm run build`, thư mục xuất `dist`. Đây là website tĩnh, không cần tài khoản, API key hay máy chủ dữ liệu. Cũng có thể upload toàn bộ nội dung `dist` lên dịch vụ static hosting.

Trước khi xuất bản, thay lời xưng hô và tên lớp. Chỉ đưa ảnh, nhạc có quyền sử dụng và sự đồng ý cần thiết vào bản công khai. Bản mã nguồn hiện tại không tự đăng lên một dịch vụ bên ngoài.
