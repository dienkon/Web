# Inkulator 1.6 · kiểm tra ngày 07/11/2026

## Bản cài

- Dựng Windows x64 bằng Electron 45.2.3 và electron-builder 26.18.0, NSIS assisted installer. Tên: `Inkulator-Setup-1.6.0-x64.exe` trong `dist/desktop/`.
- Tự chứa runtime, không cần Node.js/WebView2 hay mạng. Cài theo người dùng, không yêu cầu nâng quyền; có Desktop/Start Menu shortcut và uninstaller. Chưa ký số.
- Renderer không có Node.js, bật context isolation và sandbox; chặn cửa sổ mới, điều hướng ra ngoài và HTTP/HTTPS/WebSocket. Preload chỉ cung cấp lệnh flush storage cho cửa sổ chính.
- Kiểm tra bản chạy: mở cửa sổ, Casio iframe ngoại tuyến, lưu nét rồi tắt/mở lại giữ dữ liệu, chặn fetch ra mạng. Dùng hồ sơ thử riêng, không đụng sổ tay đang sử dụng.
- Đã chạy bộ cài `/S` trên máy này vào `%LOCALAPPDATA%\Programs\Inkulator`, xác minh version 1.6.0 và shortcut Desktop/Start Menu, chạy lại đủ 5 kiểm tra trên chính EXE đã cài rồi mở ứng dụng bình thường cho người dùng.
- SHA-256 bộ cài: `738C956D263A5CA1809D9BBD691CA6DCF829A4FADFE589C57EC691FEAF2A0535`.

## Kiểm thử chức năng

| Lệnh | Kết quả |
| --- | --- |
| `npm test` | 55 nhóm: 22 toán/dữ liệu, 21 dựng hình, 12 nét khuất |
| `npm run test:browser` | 34 kiểm tra Chrome/Edge |
| `npm run test:advanced` | 14 kiểm tra nâng cao |
| `npm run test:studio` | 32 kiểm tra Chrome/Edge |
| `npm run test:pen` | 34 kiểm tra Chrome/Edge |
| `npm run test:notebook` | 22 kiểm tra Chrome/Edge |
| `npm run test:pdf` | 24 kiểm tra Chrome/Edge |
| `npm run test:desktop` | 5 kiểm tra trên desktop; chạy lại với đường dẫn EXE để kiểm tra bản đóng gói |
| `npm run test:casio` | 38 kiểm tra Chrome/Edge, bao gồm đối chiếu 12 chế độ với upstream |
| `node tests/package-smoke.cjs` | Bản ZIP mở ngoại tuyến Chrome/Edge; kiểm tra lưu thủ công khi storage bị chặn |
| `npm run test:performance` | Chrome và WebKit; chặn palm/double tap, điểm cuối, 400 undo/redo, lịch sử trộn, lưu thiết lập, panel và ngân sách pixel |

WebKit thử dùng binary build 2370 có sẵn trên máy qua biến `INKULATOR_WEBKIT_EXECUTABLE`; chạy cùng Playwright 1.56.1. Máy khác có thể dùng `npx playwright install webkit` rồi chạy test mặc định. Đây là WebKit trên Windows với cấu hình kích thước/cảm ứng iPad Pro 11, không phải Safari trên phần cứng iPad thật.

## Phép đo có thể chạy lại

Mẫu 1.200 nét × 64 điểm = 76.800 điểm; chế độ tiết kiệm, canvas 1.684.254 pixel. Sau một lần dựng khởi động, đo 15 lần dựng lại vùng nhìn; trung vị và mẫu lớn nhất (xấp xỉ P95 ở cỡ mẫu này) được ghi trong `test-results/ink-performance.json`. Bộ test không áp ngưỡng FPS tùy ý cho máy chạy CI.

- Chrome, CPU throttle 4×: các lần đo trung vị 6,3–10,5 ms, mẫu lớn nhất 9,5–19,8 ms.
- WebKit không throttle: các lần đo trung vị 2–4 ms, mẫu lớn nhất 47–83 ms. Có mẫu khựng, nên không suy ra bảo đảm luôn 60 fps. Lần cuối có chạy đồng thời tác vụ nén bộ cài.
- 500 bước Undo nét bút: 256.451 ký tự lịch sử cho mẫu nét ngắn, dưới 1 MB; kiểm tra undo và redo 400 lần liên tiếp cùng giao dịch snapshot chỉnh màu.

Số đo phụ thuộc máy và tải hệ thống. Chưa đo độ trễ đầu bút, GPU yếu thật, Apple Pencil/iPadOS, nhiều giờ sử dụng hoặc sổ tay cực lớn. Tối ưu giúp giảm công việc ở mỗi nét, không phải chứng nhận thiết bị.

## Dữ liệu và giới hạn

Autosave 30 giây sau thao tác cuối, dùng idle callback khi có và lưu thêm lúc ứng dụng ẩn/đóng. Lưu cục bộ vẫn có giới hạn quota 8 triệu ký tự thư viện; tài nguyên PDF lớn dùng IndexedDB như trước. Dùng `.smath.json` để chuyển bản web sang desktop và sao lưu sổ lớn. Undo mặc định 500, tối đa cấu hình 2.000, có ngân sách 32 triệu ký tự mỗi ngăn; lịch sử không lưu qua khởi động lại.

Nâng math.js 15.1.0 lên 15.2.0, cập nhật bản thư viện ngoại tuyến và giấy phép. `npm audit` còn cảnh báo moderate trong cây công cụ đóng gói/minimatch, không đóng gói node_modules vào ứng dụng. Không hạ công cụ hoặc ép đổi major transitive khi không cần cho bản chạy.
