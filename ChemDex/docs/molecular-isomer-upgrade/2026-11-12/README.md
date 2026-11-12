# Đồng phân: đọc tên rồi quan sát cấu trúc

Đợt này chuyển các hồ sơ chỉ ghi công thức sang bài học có ví dụ định danh rõ ràng, theo yêu cầu ưu tiên học sinh đọc hiểu và dùng được. Làm trực tiếp trên `main`; chưa push hoặc deploy.

## Phạm vi

- **28 cấu dạng PubChem, 11 nhóm công thức:** C₃H₄, C₄H₆, C₄H₈, C₅H₈, C₅H₁₀, C₅H₁₂, C₆H₁₄, C₇H₁₄, C₇H₁₆, C₈H₁₆, C₈H₁₈. Mỗi ví dụ có tên, công thức cấu tạo dễ đọc, gợi ý quan sát, CID, URL nguồn, SDF gốc và SHA-256. Chỉ giới thiệu một số ví dụ, không tuyên bố đầy đủ mọi đồng phân.
- Bộ xem có lựa chọn đồng phân, ghi rõ chất đang xem và điểm khác nhau: vòng/mạch hở, vị trí liên kết đôi/ba, nhánh, cis/trans. Lựa chọn giữ nguyên khi bật đồ họa nhẹ; URL và file SDF tải xuống theo đúng chất đã chọn.
- Nếu không tải được nguồn của đồng phân đang chọn, báo lỗi và cho chọn lại. Không thay bằng cấu trúc suy từ công thức rồi giữ tên cũ.
- **11 bài tài liệu số viết lại ngắn hơn**, gồm bảng so sánh, các bước quan sát và hai câu hỏi có lời giải. Bỏ câu chuyện phát hiện được dựng chung cho một công thức có nhiều chất. Link từng tên đi thẳng tới đúng mô hình. Metadata, tìm kiếm và mô hình nhúng được cập nhật cùng nhau.
- Không thay danh tính hồ sơ đã có tên/CID; không gắn pha tinh thể của đồng phân này cho đồng phân khác. Tổng số pha tinh thể có nguồn vẫn là 306, phủ 276/482 hồ sơ chất không phải hỗn hợp.

## Nguồn và kiểm chứng

[Manifest](../../../shared/molecular-isomers.json) ghim từng bộ tọa độ. [Báo cáo 28 nguồn](source-audit.json) kiểm tra byte nguồn, CID, thành phần nguyên tố, hóa trị C/H, liên thông, số vòng, liên kết đôi/ba và bậc nhánh cacbon. Cis/trans-but-2-ene được kiểm tra bằng hướng hai nhóm methyl sau khi chiếu vuông góc lên trục C=C, không dựa vào tên file.

Ví dụ nguồn: [PubChem but-1-ene](https://pubchem.ncbi.nlm.nih.gov/compound/7844), [cis-but-2-ene](https://pubchem.ncbi.nlm.nih.gov/compound/5287573), [trans-but-2-ene](https://pubchem.ncbi.nlm.nih.gov/compound/62695), [cyclobutane](https://pubchem.ncbi.nlm.nih.gov/compound/9250). Nguồn này cung cấp cấu dạng **tính toán**, không phải số đo cấu trúc tinh thể hay chuyển động tức thời của phân tử.

Kiểm tra đạt: 30 kiểm thử Node của `test:platform`; 9 trường hợp trình duyệt Chromium về đồng phân, tài liệu, tinh thể, cảnh và điện thoại; build tài liệu số, build static và TypeScript. Lần chạy trình duyệt đầu có một ca tinh thể hết giờ khi TypeScript quét cả các bundle đã build. Giới hạn TypeScript vào mã nguồn, chạy lại ca đó độc lập đạt trong 4,6 giây; không tăng thời gian chờ hay bỏ kiểm tra.

```powershell
npm run test:platform
node scripts/audit-isomer-examples.mjs
npm --prefix trung-tam run lint
npm --prefix trung-tam run build
npm run build:static
# Chạy sau khi build xong, không chạy cùng bước đồng bộ bundle:
npx playwright test tests/browser/molecular-isomers.spec.mjs tests/browser/molecular-crystals.spec.mjs --project=chromium
```

Ảnh kiểm tra dùng chính mô hình thật: [desktop cis-but-2-ene](cis-but-2-ene-desktop.png), [đồng phân trên điện thoại](pent-2-yne-mobile.png), [bài học trong tài liệu số](isomer-lesson-mobile.png).
