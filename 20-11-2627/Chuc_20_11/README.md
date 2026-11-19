# Chuyến tàu ký ức · 20/11

Website tri ân Ngày Nhà giáo Việt Nam. Tám phân cảnh dẫn từ đêm khởi hành qua trái tim hạt sáng, đàn bướm, lớp học, dải phim, lá thư, vườn hoa và lời chúc 20/11. Toàn bộ mã, phông chữ và hình ảnh chạy từ máy chủ tĩnh của dự án. Nhạc piano, nền dây và tiếng động được tổng hợp tại chỗ bằng Web Audio.

## Chạy ở máy

Cần Node.js 20.19+ hoặc 22.12+ và npm. Lần đầu cài các gói từ npm. Sau khi đã cài hoặc đã có thư mục build, trải nghiệm chạy được qua máy chủ tĩnh mà không cần Internet.

```sh
npm ci
npm run dev
```

## Build và triển khai

```sh
npm run build
npm run preview
```

Đưa nội dung của `dist/` lên dịch vụ lưu trữ tĩnh. Với Vercel hoặc Netlify, chọn đúng thư mục dự án làm thư mục gốc, dùng lệnh build `npm run build` và thư mục xuất bản `dist`. Với GitHub Pages, tải `dist` lên thành artifact của quy trình Pages. Vite tạo đường dẫn tương đối để bản build hoạt động cả ở gốc tên miền và dưới đường dẫn dự án.

## Điều khiển

- Chọn một ga trên thanh hành trình để nhảy tới cảnh đó. Dùng Page Up và Page Down để chuyển trực tiếp giữa các ga.
- Dùng phím mũi tên ngang để tới bước kế tiếp hoặc quay lại. Trong dải phim, hai phím này chuyển ảnh. Có thể cuộn, kéo, vuốt ngang, chạm vào khung hoặc dùng các nút cạnh chú thích.
- Ảnh mở trong hộp thoại. Nhấn Escape để đóng ảnh. Lá thư có vùng cuộn riêng và có thể đóng bằng Escape.
- Chạm vào một bông hoa 3D hoặc chọn nút hình hoa để đọc lời chúc tương ứng.
- Thanh trên có âm thanh, tạm dừng chuyển động và toàn màn hình trên trình duyệt hỗ trợ. Chế độ giảm chuyển động của thiết bị được tôn trọng ngay khi mở trang.
- Thiết bị thiếu WebGL 2 dùng Canvas 2D với cùng bộ điều khiển và nội dung.

## Tùy chỉnh cho một lớp

Sửa `src/config.js` để điền tên trường, lớp, thầy cô, nội dung thư, lời chúc và chú thích. Để thay ảnh, thêm đường dẫn làm mục thứ ba của mỗi dòng trong `memories`, chẳng hạn `['Giờ ra chơi', 'Một buổi sáng ở sân trường.', 'memories/anh-lop.webp']`. Các đường dẫn tương đối tính từ `public/assets/`. Ảnh ngang tỉ lệ khoảng 3:2 phù hợp nhất với khung phim. Đặt `illustratedMemories: false` khi thay cả bộ ảnh bằng ảnh thật.

Có thể đặt một tệp nhạc đã được phép sử dụng trong `public/assets/audio/` và ghi đường dẫn như `audio/nhac-nen.mp3` vào `tribute.soundtrack`. Âm thanh chỉ bắt đầu sau tương tác đầu tiên. Những nhóm cấu hình `transition`, `butterflyFlight`, `volume` và `quality` chỉnh được trong cùng tệp.

## Tài nguyên hình ảnh

Ba phông cảnh và 16 ảnh minh họa trường học do ImageGen tạo riêng cho câu chuyện.

Các ảnh xuất được lưu trong `public/assets/` dưới dạng WebP. `scripts/prepare-art.py` cắt ảnh từ atlas và nén các phông cảnh bằng Pillow. Hình học dải phim, phong thư, bàn và sách, bướm và hoa được tạo trong mã nguồn. Texture giấy, sáp, gỗ, phấn và cánh bướm được vẽ bằng Canvas hoặc SVG.

### Câu lệnh ImageGen

<details><summary>Atlas 16 khung ký ức</summary>

Single high-resolution 4 by 4 seamless full-bleed contact sheet used as an illustration atlas for 16 distinctly different frames. EXACTLY four equal columns and four equal rows, zero gutters, no frames, no border, no typography, exact aspect ratio 3:2 landscape. Each cell is an independent complete cinematic 35mm nostalgic illustration with subtle painterly realism, Vietnamese public secondary school, white uniform shirts, green chalkboards, wood furniture, warm amber and jade, unified analog color grade. Row 1: empty morning classroom with billowing white curtain; chalk and handwritten chalk mathematics on dark green board; Vietnamese male teacher by lectern mid-lesson; Vietnamese female teacher writing lesson plan at her desk. Row 2: attentive students seen from the aisle; two students working on a notebook together; joyful Vietnamese students laughing at recess outdoors; marked exercise paper and red pen close-up. Row 3: long columned school corridor; sunny courtyard and flowering flamboyant tree; open ruled notebook close-up; students sweeping classroom. Row 4: wrapped bouquet on teacher's desk; amber sunset empty classroom; detail of empty chairs after class; students from behind looking back toward the school gate at graduation. No watermarks. Carefully respect the even grid for subsequent asset slicing.

</details>

<details><summary>Phông cảnh khởi hành</summary>

Premium cinematic dark fantasy artwork as a wide 3:2 full bleed web backdrop with generous near-black navy negative space on LEFT 41% reserved for site UI, no text at all. A single luminous voluminous three-dimensional heart made entirely of countless fine champagne metallic golden filaments and drifting minuscule amber embers floats on the RIGHT 54% above an indigo violet glassy water surface at night. Heart is centered around x=69% y=49%, fills about 52% height and 34% width, obvious hollow center and clearly shaped two lobes with golden fine filigree, subtle champagne butterfly-shaped points of light nearby, lavender and pink horizon haze behind it low, elegant sparkling reflections fading downward, tiny star field. Mostly near black midnight blues, soft purple depth, honest metallic gold and never neon. Romantic nostalgia, delicate art direction, high detail, wide depth, fine analog 35mm grain, soft camera halation. No labels, no watermarks, no letters, no borders.

</details>

<details><summary>Phông cảnh lớp học</summary>

A single cinematic wide 3:2 painterly illustrated photographic view of an empty Vietnamese secondary school classroom, warm morning sun beams entering through open green casement windows at left, thin almost transparent moving ivory curtains, ochre walls, period Vietnamese wooden desks and chairs, wide BLANK deep green chalkboard near center-right with center at 66% from left and 39% from top (space for a live digital chalk overlay), tiny lectern beneath, leafy branches beyond windows, fine grain, 35mm warm nostalgia. Angle from rear aisle, no text or watermark. Warm golden palette, realistic and meticulously art directed.

</details>

<details><summary>Phông cảnh vườn hoa</summary>

Wide 3:2 cinematic painterly nighttime dream garden designed as a web scene backplate. Low vantage over mist and an indigo shallow lake. Hills and trees in silhouette, violet and pink dawn on low horizon across middle, sparse stars, nearly black purple foreground with grasses and delicate amber reflections. A few tiny pink water lilies scattered far away, let foreground remain dark for interactive 3D flowers; no dominant object, no typography, no watermark. Fine analog grain, magical nostalgic realism, exquisite deep mauve and dusty gold palette.

</details>
