# GEN TRI ÂN — Khi tri thức nở hoa

Website tri ân thầy dạy Sinh học nhân ngày 20/11. React, TypeScript, Vite, Three.js, React Three Fiber, Drei và GSAP ScrollTrigger. ADN, tế bào, mô hình sinh học, phong thư và dải phim được dựng bằng hình học 3D tại runtime. Riêng bó hoa dùng **ảnh 2D nền trong suốt do ImageGen tạo**, theo lựa chọn mỹ thuật của người dùng.

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

Sửa `src/content.ts`, không cần sửa logic 3D:

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
- `src/Scene.tsx`: nucleosome, nhiễm sắc thể, mô hình phiên mã/dịch mã, phân li, Mendel, cây nhánh; bì thư; dải phim dùng BufferGeometry chạy dọc Catmull–Rom, UV và texture có lỗ đục thật bằng alpha.
- `src/DNA.tsx`: B-DNA xoắn phải, 10,5 cặp base/vòng, hai mạch ngược chiều; backbone liên tục 640 đoạn và 16 mặt, base ExtrudeGeometry bo cạnh, vật liệu clearcoat/iridescence, liên kết hydrogen instanced 2/3 và lựa chọn base. Tháo xoắn tách mạch mượt; nhân đôi giữ màu mạch gốc, thêm mạch bổ sung màu hồng.
- `src/BouquetArtwork.tsx` và `public/assets/bouquet-roses.png`: một ảnh hoa 2D có alpha, dùng chung ở trang đầu và chương tặng hoa. Không có mô hình hoa 3D. Hiệu ứng tặng hoa dùng chuyển động của ảnh, ánh sáng và cánh hoa bay.
- `src/content.ts`: toàn bộ thông tin cá nhân, danh sách chương và nội dung khoa học.
- `src/style.css`, `src/tokens.css`: bố cục responsive, màu, typography. Font tiếng Việt được đóng gói cục bộ, không gọi Google Fonts.
- Các hạt sáng dùng một instanced mesh và custom vertex/fragment shader. Tế bào dùng Fresnel shader; các vật liệu 3D còn lại dùng MeshStandardMaterial/MeshPhysicalMaterial. Ảnh hoa được lưu trong dự án, không phụ thuộc dịch vụ ảnh bên ngoài; prompt gốc nằm tại `public/assets/bouquet-roses.prompt.txt`.
- Mở trang có loader ADN màu cyan/tím, nền aurora, hiệu ứng lấy nét và kéo cảnh ra chậm, rồi hiện tiêu đề và ảnh hoa lần lượt. Nội dung từng chương có hiệu ứng reveal theo cuộn. `Giảm chuyển động` bỏ các hoạt ảnh này; loader chờ cả cảnh và ảnh hoa sẵn sàng rồi mới mở trang.

Cuộn trang để đổi chương; nút bên phải và thanh điều hướng nhảy đến từng chương. Chương ADN và triển lãm cho phép kéo xoay. **Giảm chuyển động** và **Chế độ nhẹ** ở nút tùy chỉnh. Thiết bị nhỏ hoặc có ít luồng CPU tự dùng chế độ nhẹ: giảm số hạt, DPR và hiệu ứng. Khi WebGL không khả dụng, nội dung, thư, ảnh và lưu bút vẫn dùng được.

Mô hình khoa học là **minh họa giản lược**, không dùng như mô phỏng cấu trúc nguyên tử hay tốc độ sinh hóa. Nhân đôi biểu diễn bán bảo tồn bằng mạch mới màu hồng; không mô phỏng đầy đủ enzyme và động học các đoạn Okazaki. Nhiễm sắc thể chữ X chỉ biểu diễn trạng thái kép co xoắn. Sơ đồ nguyên phân là kì sau; sơ đồ hệ sinh thái và cây nhánh là khái quát. Hoa và trái tim là chuyển cảnh nghệ thuật, không mô tả cơ chế sinh học.

Nguồn tham khảo: [NHGRI – DNA Replication](https://www.genome.gov/genetics-glossary/DNA-Replication), [NHGRI – Deoxyribonucleic Acid](https://www.genome.gov/about-genomics/fact-sheets/Deoxyribonucleic-Acid-Fact-Sheet), [React Three Fiber](https://r3f.docs.pmnd.rs/), [Three.js](https://threejs.org/docs/).

## Kiểm thử trình duyệt

```sh
npx playwright install chromium
npm run test:e2e
```

Nếu máy đã có Chromium, có thể chỉ định đường dẫn bằng biến môi trường `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Kiểm thử bao gồm điều hướng, mô hình, thư, bàn phím, lưu bút cục bộ, ảnh, âm thanh và chế độ mobile/reduced motion.

## Triển khai

Đã có `vercel.json` và `netlify.toml`. Trong Vercel/Netlify, chọn repository và **Root directory `20-11-2627/Sinh`**. Lệnh cài `npm ci`, lệnh build `npm run build`, thư mục xuất `dist`. Đây là website tĩnh, không cần tài khoản, API key hay máy chủ dữ liệu. Cũng có thể upload toàn bộ nội dung `dist` lên dịch vụ static hosting.

Trước khi xuất bản, thay lời xưng hô và tên lớp. Chỉ đưa ảnh, nhạc có quyền sử dụng và sự đồng ý cần thiết vào bản công khai. Bản mã nguồn hiện tại không tự đăng lên một dịch vụ bên ngoài.
