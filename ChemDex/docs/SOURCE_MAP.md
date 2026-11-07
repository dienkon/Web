# Bản đồ mã nguồn ChemDex

Cập nhật: **08/11/2026**. Đường dẫn trong bảng tính từ thư mục `ChemDex/`. Bảng tập trung vào thư mục source và tài nguyên có ý nghĩa; các thư mục chứa từng nguyên tố, từng ảnh nghiên cứu hoặc cache trình duyệt được giải thích theo nhóm.

## Đọc source theo thứ tự nào?

1. [README](../README.md): chức năng, URL, ảnh và cách chạy.
2. [package.json](../package.json) → [scripts/build-platform.mjs](../scripts/build-platform.mjs): biết ứng dụng nào được build, file nào được đưa ra `dist/`.
3. [platform/sidebar.js](../platform/sidebar.js): bản đồ điều hướng thực tế của toàn website.
4. [nguyen-to.html](../nguyen-to.html) → [js/main.js](../js/main.js), [js/app.js](../js/app.js): giao diện bảng tuần hoàn và trang chi tiết.
5. Với ứng dụng React: `src/main.tsx` → `src/App.tsx` → `components/`, `store/`, engine hoặc services của phân hệ.
6. Với dữ liệu: đọc `shared/`, `data/`, sau đó scripts sinh dữ liệu và tests liên quan.
7. Với API: [api/dispatch.ts](../api/dispatch.ts) → handler trong `server/routes/`.

## Thư mục cấp cao

| Thư mục | Công dụng | Khi cần sửa |
| --- | --- | --- |
| `api/` | Entry serverless `dispatch.ts`, định tuyến API cùng origin, kiểm tra request và giới hạn tần suất trong bộ nhớ | Thêm route hoặc thay đổi cách API được gọi trên Vercel |
| `server/` | Handler nghiệp vụ phía server; nằm ngoài output công khai | AI, PubChem, phản hồi, câu hỏi |
| `platform/` | Các module web dùng chung: tiện ích, mô hình 3D, ôn tập, tìm nhanh, sidebar và CSS | Điều hướng và các trang nền tảng |
| `js/` | Logic giao diện bảng tuần hoàn, hồ sơ nguyên tố, chatbot và trình biên tập | Tính năng trang nguyên tố hoặc editor |
| `css/` | Stylesheet cho giao diện gốc và các trang HTML | Bố cục, màu, responsive của giao diện gốc |
| `data/` | Manifest nguyên tố, dữ liệu chi tiết, danh mục tính năng, câu trả lời chatbot và loader | Nội dung nguyên tố hoặc danh mục công cụ |
| `shared/` | Dataset và logic hóa học dùng giữa nhiều phân hệ | Dữ liệu chung, danh tính chất, cấu trúc, phản ứng |
| `assets/` | Tài nguyên web công khai: ảnh nguyên tố, audio, font, icon, texture | Media hiển thị trên website |
| `tien-ich/` | Các trang tính toán, tra cứu, viewer cấu trúc và hai ứng dụng React phương trình | Một công cụ học tập cụ thể |
| `on-tap/` | Trang HTML vào chế độ trắc nghiệm; logic trong `platform/study.js` | Trang ôn tập độc lập |
| `lab-2d/` | Ứng dụng React phòng thí nghiệm SVG 2D | Mô phỏng 2D, phiên thí nghiệm, báo cáo |
| `lab-3d/` | Ứng dụng React/Three.js phòng thí nghiệm 3D và server phát triển riêng | Dụng cụ, tương tác, hóa học và hiệu ứng 3D |
| `lab-safety/` | Mô phỏng an toàn 3D và học viện an toàn | Nhiệm vụ, nguy cơ, bài học, mini game |
| `trung-tam/` | Ứng dụng tài liệu số và cộng đồng | Thư viện, đọc hồ sơ, bài đăng |
| `dau-truong/` | ChemDex Arena: luyện tập, phòng đấu và tiến độ học | Game câu hỏi, realtime, hồ sơ người chơi |
| `scripts/` | Build, preview, sinh/audit dữ liệu, đo hiệu năng, chụp ảnh README | Quy trình bảo trì và đóng gói |
| `tests/` | Kiểm thử Node cho nền tảng, hóa học và Playwright cho trình duyệt | Kiểm tra hành vi liên phân hệ |
| `docs/` | Tài liệu kỹ thuật, phiên bản, bản đồ source, ảnh README và ghi chú các đợt nâng cấp | Tra cứu hoặc cập nhật tài liệu |
| `Các nguyên tố hóa học trong bảng tuần hoàn/` | Tư liệu nội dung theo nguyên tố còn lưu trong source; không được bước build nền tảng copy như một thư mục runtime | Đối chiếu tư liệu nội dung; dữ liệu giao diện hiện hành đọc từ `data/` và `shared/` |

## Web chính và dữ liệu

| Đường dẫn | Công dụng |
| --- | --- |
| `platform/sidebar.js`, `sidebar.css` | Sidebar chung, menu mobile, Ctrl/Cmd+K và trạng thái thu gọn |
| `platform/common.js` | Hàm dựng shell, chuẩn hóa chuỗi, lưu tùy chọn và thông báo |
| `platform/catalog.js` | Kết hợp 5 mục khám phá/thực hành với 20 công cụ trong manifest |
| `platform/tools.js` | Tìm/lọc/ghim công cụ, cân bằng nhanh và chuyển tới chuỗi phản ứng |
| `platform/search.js`, `search-index.js` | Hộp tìm nhanh toàn web và chỉ mục tìm kiếm |
| `platform/periodic.js`, `periodic-model.js` | Module bảng tuần hoàn của nền tảng và mô hình dữ liệu cho bảng; giao diện home hiện dùng HTML gốc `nguyen-to.html` |
| `platform/structures.js` | Danh mục phân tử/ion/tinh thể, lọc và liên kết hồ sơ/lab |
| `platform/viewer.js`, `viewer-canvas.js` | Viewer cấu trúc, render canvas, đo hình học và xuất cấu trúc/ảnh |
| `platform/study.js` | Bộ câu hỏi, giải thích đáp án và tiến độ ôn tập |
| `platform/styles.css`, `tailwind.css` | Style nền tảng và đầu vào build utility CSS |
| `js/main.js`, `app.js`, `core.js`, `periodic.js` | Khởi tạo và điều phối bảng tuần hoàn, nội dung và tương tác nguyên tố |
| `js/model-media.js`, `js/three/` | Media mô hình và cấu trúc tinh thể Three.js |
| `js/chatbot.js` | Chatbot, gợi ý câu hỏi theo ngữ cảnh và giao tiếp API |
| `js/data-editor.js`, `js/data-editor/` | State editor, sửa JSON/dạng bảng/tài liệu, xem trước, diff, draft, export và tích hợp Firebase |
| `data/index.js`, `loader.js` | Nạp dữ liệu chi tiết theo manifest |
| `data/manifest.json` | Chỉ mục 118 nguyên tố và cờ có dữ liệu chi tiết |
| `data/elements/` | Payload JSON hồ sơ nguyên tố; snapshot có 68 file, mức độ nội dung khác nhau |
| `data/features/` | `main.json`: tên, nhóm, mô tả và URL 20 công cụ |
| `data/categories.json`, `chatbot-responses.json` | Phân loại nguyên tố và gợi ý nội dung chatbot |
| `shared/elements.json`, `atomic-weights.json`, `element-properties.json`, `element-insights.json` | Dữ liệu nguyên tố chung, nguyên tử khối, tính chất có nguồn và nội dung mở rộng |
| `shared/compound-seeds.json`, `compounds.json`, `crystals.json` | Chất nền, cấu trúc có tọa độ và mô hình ô mạng |
| `shared/structures/` | Tọa độ `.sdf` và ô tinh thể `.cif` lưu trong repo |
| `shared/nist-geometries.json`, `structure-identities.json` | Tọa độ tham chiếu và danh tính cấu trúc |
| `shared/chemistry/` | Parser công thức, cân bằng, ion, ràng buộc hóa học, catalog phản ứng và sinh mô hình thành phần |
| `shared/*generated.json` | Catalog cấu trúc, phản ứng, chuỗi, liên kết và độ phủ thư viện được scripts sinh ra |
| `shared/*audit*.json`, `*report*.json`, `*coverage*.json`, `*summary.json` | Kết quả audit, độ phủ và thống kê; dùng để kiểm tra khả năng hiển thị/dữ liệu |
| `shared/study-questions.json` | Ngân hàng câu hỏi ôn tập nền tảng |
| `assets/elements/` | Media theo mã số/tên nguyên tố; các thư mục `img/`, model hoặc video bên trong phục vụ hồ sơ nguyên tố |
| `assets/audio/`, `fonts/`, `icon/`, `texture/` | Âm thanh, font, logo/icon và texture |
| `assets/source/` | Tài nguyên nguồn lưu cùng bộ media; kiểm tra tham chiếu trước khi đổi tên hoặc xóa |

## Tiện ích: tìm đúng folder theo bài toán

Các công cụ HTML dùng logic/style nền tảng hoặc script trong trang. Hai thư mục React có manifest và lockfile riêng.

| Đường dẫn trong `tien-ich/` | Công dụng |
| --- | --- |
| `index.html` | Cổng 25 mục tiện ích, do `platform/tools.js` dựng |
| `cau-truc-3d/` | Trang viewer cấu trúc phân tử, ion và tinh thể |
| `phuong-trinh/nhan-dien-pthh-thong-minh/` | App React nhận diện phương trình từ văn bản/ảnh, OCR và phân tích |
| `phuong-trinh/chuoi-phan-ung/` | App React tra cứu và giải chuỗi chuyển hóa |
| `phuong-trinh/so-oxi-hoa/` | Xác định số oxi hóa |
| `phuong-trinh/phuong-trinh-ion-rut-gon/` | Viết phương trình ion rút gọn |
| `phuong-trinh/tinh-theo-phuong-trinh/` | Tính lượng chất theo hệ số phản ứng |
| `dai-cuong/chuyen-doi-luong-chat/` | Đổi mol, khối lượng, thể tích và số hạt |
| `dai-cuong/tinh-toan-dung-dich/` | Tính nồng độ và các đại lượng dung dịch |
| `dai-cuong/hieu-suat-phan-ung/` | Hiệu suất và chất giới hạn |
| `hoa-ly/tinh-ph/` | Tính pH theo mô hình của công cụ |
| `hoa-ly/can-bang-hoa-hoc/` | Tính Kc, Kp và cân bằng |
| `hoa-ly/nhiet-dong-luc-hoc/` | Đại lượng nhiệt động |
| `hoa-ly/dong-hoa-hoc/` | Tốc độ và động học phản ứng |
| `hoa-ly/dien-hoa-hoc/` | Phương trình Nernst |
| `hoa-ly/quang-pho/` | Định luật Beer–Lambert |
| `tra-cuu/tinh-tan/` | Bảng tính tan và quy tắc |
| `tra-cuu/day-dien-hoa/` | Dãy điện hóa/hoạt động hóa học |
| `tra-cuu/mau-sac-nhan-biet/` | Màu và dấu hiệu nhận biết chất |
| `tra-cuu/danh-phap-huu-co/` | Danh pháp hữu cơ |
| `tra-cuu/dieu-kien-phan-ung/` | Tra điều kiện phản ứng |
| `tra-cuu/doc-danh-phap/` | Đọc danh pháp, có tích hợp AI |
| `legacy.html`, `tat-ca.html`, `generate.js` | Danh mục cũ/tương thích và script sinh trang; entry chính là `index.html` |

Trong hai app React phương trình, `src/` chứa UI và logic, `server.ts` là server development riêng, `vite.config.ts` cấu hình đóng gói. File bundle trong `dist/` không phải nơi sửa source.

## Lab 2D

| Thư mục trong `lab-2d/` | Công dụng |
| --- | --- |
| `src/components/` | Bàn thí nghiệm, SVG dụng cụ, panel hóa chất, hướng dẫn và modal báo cáo/phiên |
| `src/chemistry/core/` | Kiểu dữ liệu và phép tính nền của mô hình hóa học |
| `src/chemistry/equilibrium/` | Mô hình cân bằng |
| `src/chemistry/reactions/` | Quy tắc và giải phản ứng |
| `src/chemistry/thermodynamics/` | Mô hình nhiệt |
| `src/engine/` | Nhịp cập nhật mô phỏng, `simulationTick.ts` |
| `src/data/` | Danh mục hóa chất, dụng cụ, thí nghiệm và dữ liệu mô phỏng |
| `src/services/` | Dịch vụ hỗ trợ UI, phiên, dữ liệu hoặc API |
| `src/store/` | Zustand state và thao tác bàn lab |
| `src/types/` | Hợp đồng TypeScript giữa UI và engine |
| `src/__tests__/`, `src/chemistry/__tests__/`, `src/engine/__tests__/` | Tests trạng thái, hóa học và tick mô phỏng |
| `docs/` | Ghi chú triển khai riêng của Lab 2D |

## Lab 3D

`src/App.tsx` ghép UI, `src/components/three/LabScene.tsx` là điểm bắt đầu đọc cảnh 3D. Các tầng sau có nhiệm vụ riêng; khi sửa hiện tượng cần lần theo import từ store/engine để tìm tầng đang thực thi.

| Thư mục trong `lab-3d/` | Công dụng |
| --- | --- |
| `src/adapters/` | Chuyển đổi giữa các biểu diễn dữ liệu/hệ thống |
| `src/apparatus/` | Hành vi và cấu hình bộ dụng cụ |
| `src/assets-browser/` | Giao diện duyệt/xem tài nguyên |
| `src/audio/` | Âm thanh thao tác và hiện tượng |
| `src/chem/` | Chất, phản ứng, chỉ thị, cân bằng, động học, quang học và nhiệt |
| `src/components/` | Toolbar, inspector, chuẩn độ, hướng dẫn, báo cáo và UI React |
| `src/components/three/` | Scene, bình/dụng cụ và các thành phần hiển thị Three.js |
| `src/core/` | Kiểu và tiện ích nền, đồng hồ mô phỏng, hình học cơ sở |
| `src/damage/` | Trạng thái hư hại dụng cụ và hệ quả |
| `src/data/` | Danh mục hóa chất, thiết bị, bài học/preset |
| `src/engine/` | Điều phối tương tác, phản ứng, an toàn và hoạt động lab |
| `src/handling/` | Cầm, di chuyển và thao tác vật thể |
| `src/input/` | Phím tắt và ánh xạ input |
| `src/lesson/` | Tiến trình bài thực hành có hướng dẫn |
| `src/physicsLite/` | Vật lý giản lược: rigid body và vật đỡ |
| `src/physical/` | Catalog, kiểu dữ liệu, vật liệu và lớp kết nối mô phỏng vật lý đang được phát triển |
| `src/pour/` | Logic rót, input và HUD riêng cho thao tác rót |
| `src/render/` | Hàm/hệ thống dựng hình |
| `src/safety/` | Thông tin nguy cơ và quy tắc an toàn trong Lab 3D |
| `src/science/` | Mô hình hiện tượng chi tiết: nước, nhiệt, kết tủa, giọt, dòng chảy, hình học bình và chuyển đổi đơn vị |
| `src/shared/` | Thành phần dùng chung nội bộ Lab 3D |
| `src/sim/` | Các bước mô phỏng chất chứa, sôi, bay hơi, ngưng tụ, rót, hạt và kết tủa |
| `src/simulation/chemistry/`, `core/`, `effects/`, `render/`, `ui/` | Lớp mô phỏng tách hóa học, lõi chạy, hiệu ứng, render và UI debug |
| `src/simulation/__tests__/` | Tests cho lớp mô phỏng này |
| `src/store/` | State của bàn lab và action cho UI/engine |
| `src/types/` | Khai báo kiểu dùng trong phân hệ |
| `src/ui/` | Control ring, radial menu, cheat sheet và điều khiển tương tác |
| `src/utils/` | Hàm tiện ích nội bộ |
| `src/vfx/` | Catalog, program, renderer và công cụ duyệt hiệu ứng phản ứng |
| `server/`, `server/generated/` | Cơ sở phản ứng/AI của server riêng và dữ liệu sinh phục vụ server |
| `scripts/`, `scripts/fixtures/` | Audit khoa học/preset, benchmark, review trình duyệt và fixture |
| `tests/`, `tests/helpers/` | Tests hóa học, vật lý, tương tác và helper |
| `docs/`, `docs/research/` | Quyết định mô hình và ảnh/video bằng chứng từng đợt nghiên cứu |
| `assets/` | Tài nguyên nội bộ phân hệ; xem đường dẫn tham chiếu trước khi thay đổi |
| `agent/` | Tài liệu/hướng dẫn làm việc dành cho tác vụ kỹ thuật của phân hệ |
| `tmp/`, `artifacts/` | Tài liệu tạm và kết quả chạy audit/review; không phải source runtime |

## Lab Safety

Đọc [AGENTS.md của phân hệ](../lab-safety/AGENTS.md) trước khi chỉnh mã bên trong `lab-safety/`.

| Thư mục trong `lab-safety/` | Công dụng |
| --- | --- |
| `src/academy/` | Cổng học viện an toàn |
| `src/academy/core/` | Logic tiến độ, điểm và mô hình bài học |
| `src/academy/data/` | Chương, huy hiệu, tình huống, trò chơi và thuật ngữ |
| `src/academy/components/`, `screens/` | Thành phần UI và màn hình học viện |
| `src/academy/games/`, `hooks/` | Mini game và hook điều phối |
| `src/audio/` | Âm thanh và vòng đời phát âm |
| `src/components/3d/` | Phòng lab, nhân vật, dụng cụ và asset 3D |
| `src/components/ui/` | Start screen, HUD, quiz, chứng nhận, cài đặt và hồ sơ nhân vật |
| `src/core/` | Phase/task registry, mistake registry và hệ tương tác |
| `src/core/chemistry/`, `fire/`, `spill/`, `incident/` | Mô hình hóa chất, cháy, tràn đổ và sự cố |
| `src/core/focus/`, `simulation/` | Điểm tương tác và thời gian mô phỏng |
| `src/data/` | Dữ liệu nhiệm vụ, vật dụng và quy tắc |
| `src/i18n/` | Chuỗi giao diện, gồm tiếng Việt |
| `src/scenarios/` | Các kịch bản tình huống và panel điều khiển |
| `src/store/` | Trạng thái người chơi, trang bị, inventory, tiến độ và tùy chọn |
| `src/styles/`, `ui/`, `utils/` | Style, thành phần hỗ trợ UI và tiện ích |
| `src/systems/analytics/` | Ghi nhận/đánh giá hoạt động học |
| `src/systems/device/` | Nhận diện thiết bị và chặn/hướng dẫn xoay màn hình |
| `src/systems/input/` | Input bàn phím, chuột, cảm ứng và guard khi làm quiz |
| `src/systems/performance/` | Chất lượng đồ họa thích ứng và HUD hiệu năng |
| `src/systems/texture/` | Tạo/quản lý texture |
| `public/` | Model, biểu tượng cảnh báo, media được Vite copy nguyên trạng |
| `assets/` | Tài nguyên nguồn nội bộ |
| `scripts/` | Tests academy, thực hành, asset và trình duyệt |
| `docs/` và các thư mục con | Ảnh review, asset study, hiệu năng, nâng cấp phòng/học viện và thao tác |
| `.browser-review*` | Profile/cache trình duyệt dùng review local; không dùng làm dữ liệu người chơi hay source |

## Trung tâm, cộng đồng và Đấu trường

| Đường dẫn | Công dụng |
| --- | --- |
| `trung-tam/src/pages/` | Hai entry thư viện và cộng đồng |
| `trung-tam/src/components/` | Grid tài liệu, reader, header, sidebar, drawer và toast |
| `trung-tam/src/community/` | UI bài đăng và tương tác cộng đồng |
| `trung-tam/src/data/` | Dữ liệu thư viện, nội dung tài liệu và cấu hình |
| `trung-tam/src/hooks/` | Hook lưu tùy chọn và trạng thái UI |
| `trung-tam/src/lib/`, `utils/` | Firebase, API/config và tìm kiếm thư viện |
| `trung-tam/tai-lieu-so/`, `cong-dong/` | Entry/đường dẫn tương thích trong source; production dùng app build với rewrite được khai báo |
| `trung-tam/assets/` | Tài nguyên của trung tâm |
| `dau-truong/src/pages/` | Dashboard, đăng nhập, tạo/tham gia phòng, lobby, trận đấu, luyện tập, bảng xếp hạng, hồ sơ, lịch sử, bài hằng ngày và sổ lỗi |
| `dau-truong/src/components/` | Layout, điều khiển game và UI dùng chung |
| `dau-truong/src/config/` | Đọc biến môi trường và đường dẫn cơ sở |
| `dau-truong/src/data/` | Ngân hàng câu hỏi và dữ liệu học |
| `dau-truong/src/features/gameplay/` | Nghiệp vụ vòng chơi và tính điểm |
| `dau-truong/src/features/learning/` | Tiến độ, luyện tập và phản hồi học |
| `dau-truong/src/features/security/` | Kiểm tra dữ liệu/hành vi của phân hệ |
| `dau-truong/src/games/` | Registry và kiểu dữ liệu các trò chơi |
| `dau-truong/src/services/` | Firebase và nghiệp vụ gọi dịch vụ |
| `dau-truong/src/store/` | Zustand: auth, room, theme và trạng thái khác |
| `dau-truong/src/utils/` | Hàm tiện ích của Arena |
| `dau-truong/public/` | Tài nguyên tĩnh riêng |
| `dau-truong/scripts/` | Kiểm tra câu hỏi và chạy unit tests |

## API, build và kiểm thử

| Đường dẫn | Công dụng |
| --- | --- |
| `server/routes/health.ts` | Health check, release SHA và nhãn nền tảng |
| `server/routes/feedback.ts`, `generate-questions.ts` | Nhận phản hồi và tạo câu hỏi |
| `server/routes/chemistry/` | Proxy tìm kiếm/cấu trúc PubChem và helper upstream |
| `server/routes/experiment/` | Xử lý đề xuất AI và trộn hóa chất |
| `server/routes/gemini/` | Chat, chuỗi phản ứng, generate, verify, cộng đồng và client AI phía server |
| `scripts/build-platform.mjs` | Sinh dữ liệu, build 7 app, copy runtime, bundle nền tảng/vendor, dựng CSS và hoàn thiện HTML |
| `scripts/preview.mjs` | Phục vụ `dist/` và dispatch API local; có redirect lab và fallback trung tâm |
| `scripts/build-reaction-data.mjs`, `generate-reaction-*`, `audit-reaction-catalog.mjs` | Sinh, tổng hợp và kiểm tra catalog phản ứng/chuỗi |
| `scripts/build-library.mjs`, `audit-library.mjs` | Sinh và kiểm tra hồ sơ/thư viện |
| `scripts/generate-structure-catalog.mjs`, `prepare-catalog.mjs`, `apply-reference-geometries.mjs` | Dựng catalog, chuẩn hóa và áp dụng tọa độ tham chiếu |
| `scripts/fetch-*.ps1` | Lấy dữ liệu cấu trúc/tham chiếu khi bảo trì có chủ đích |
| `scripts/generate-elements.mjs`, `enrich-elements.mjs`, `refresh-atomic-weights.mjs`, `build_all_elements.py` | Sinh/bổ sung dữ liệu nguyên tố và nguyên tử khối |
| `scripts/generate-study.mjs`, `generate-platform-summary.mjs` | Tạo câu hỏi và thống kê nền tảng |
| `scripts/3dmol-lifecycle.mjs` | Plugin build xử lý vòng đời viewer 3Dmol |
| `scripts/vendor-platform-font.mjs` | Chuẩn bị font dùng local |
| `scripts/measure-platform.mjs`, `benchmark-browser.mjs` | Đo Lighthouse/hiệu năng trình duyệt |
| `scripts/test-preview.mjs`, `review-reaction-catalog-browser.mjs` | Kiểm tra preview và review catalog qua trình duyệt |
| `scripts/generate-readme-versions.mjs` | Sinh [VERSIONS.md](VERSIONS.md) từ 8 manifest/lockfile |
| `scripts/capture-readme.mjs` | Chụp ảnh giao diện local cho README |
| `tests/*.test.mjs` | Tests nền tảng, workspace, thư viện, sinh cấu trúc, phản ứng và chain API |
| `tests/browser/` | Tests Playwright cho trang, viewer, thư viện và lab |
| `docs/images/` | Ảnh WebP README và manifest nguồn chụp |

## File gốc cần biết

| File | Vai trò |
| --- | --- |
| `package.json`, `package-lock.json` | Lệnh cấp nền tảng và dependency gốc |
| `.nvmrc` | Node 22 |
| `nguyen-to.html` | Source HTML trang bảng tuần hoàn và hồ sơ nguyên tố; build copy thành `dist/index.html` |
| `index.html` | HTML entry còn lưu tại gốc; khi build, home cuối cùng được lấy từ `nguyen-to.html` |
| `tai-lieu-so.html` | Entry tài liệu tương thích |
| `thi-nghiem.html` | Trang thí nghiệm cũ; preview/Vercel redirect sang `/lab-2d/` |
| `edit.html`, `data-editor.html` | Hai entry phục vụ biên tập dữ liệu |
| `test-3d.html` | Trang thử nghiệm mô hình; không phải entry học tập chính |
| `404.html` | Trang không tìm thấy |
| `vercel.json` | Build/output, redirects, rewrites API/trung tâm và headers |
| `firestore.rules` | Quy tắc Firestore cần triển khai cho môi trường Firebase |
| `playwright.config.mjs` | Cấu hình browser test và preview server |
| `tsconfig.server.json` | Type-check API/server nền tảng |
| `tailwind.config.cjs` | Cấu hình CSS utility của web chính |
| `build.js`, `run-dev.bat`, `build-and-run.bat` | Entry/tập lệnh tương thích lịch sử; quy trình chuẩn hiện tại ở README là `npm run build` + `npm run preview` |
| `.env*` | Cấu hình local; không đưa secret vào Git hoặc frontend bundle |
| `.gitignore` | Danh sách output/cache/local config không theo dõi |
| `TODO.md` | Ghi chú công việc còn lại |

## Output, cache và thư mục không chỉnh trực tiếp

| Thư mục | Ý nghĩa |
| --- | --- |
| `dist/` ở gốc | Artifact production tổng hợp, sẽ bị tạo lại khi build |
| `<phân-hệ>/dist/` | Artifact Vite của từng ứng dụng |
| `node_modules/` ở gốc và ứng dụng con | Dependency cài từ lockfile |
| `.cache/` | Bundle API preview và cache kỹ thuật |
| `.vercel/` | Liên kết/cấu hình deployment local |
| `.vscode/` | Thiết lập editor local |
| `artifacts/`, `coverage/` | Kết quả audit, đo đạc hoặc độ phủ nếu đã chạy công cụ tương ứng |
| `playwright-report/`, `test-results/` | Báo cáo, trace và ảnh do test tạo |
| `scripts/__pycache__/` | Bytecode cache Python |

Repo Git cha còn chứa dự án DkTest. Khi xem diff/stage/commit, giới hạn thay đổi vào `ChemDex/` và các file thuộc tác vụ.

[Về README](../README.md) · [Phiên bản chi tiết](VERSIONS.md)
