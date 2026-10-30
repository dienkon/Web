# Nâng cấp trạng thái, model và hiệu ứng chất trong lab 3D

Ngày thực hiện: 28/10/2026. Phạm vi là renderer và kho thuốc thử đang hoạt động của `lab-3d`. Kho phương trình tham khảo hơn 1.000 phản ứng không đồng nghĩa với hơn 1.000 mô phỏng 3D đã hiệu chuẩn.

## Thay đổi đã đưa vào mã chạy

| Trước | Sau |
|---|---|
| H₂SO₄ đặc đỏ, HCl hồng, hexan vàng; nước và ethanol xanh nhạt | Các mẫu không màu dùng màu trung tính và alpha thấp; chất tan có màu giữ màu riêng |
| Nước bị ép alpha tối thiểu 0,78; chuyển màu hiển thị hai lần | Bỏ alpha cưỡng bức; pha màu trong không gian tuyến tính, chỉ đổi sang màu hiển thị một lần |
| Độ đục dùng lẫn tọa độ thế giới và tọa độ cốc | Tính độ sâu trong hệ tọa độ cốc, giữ đúng khi cốc di chuyển |
| Đinh là mạt sắt, lá nhôm là dải cuộn | Model đinh có thân, mũ và đầu nhọn; lá nhôm mỏng có nếp gấp; dải Mg có tiết diện chữ nhật; phoi Cu là dây cuộn hở |
| Tinh thể ngậm nước chung một bát diện; muối bị gán tính kim loại | Phân biệt khối xiên CuSO₄·5H₂O, thói quen hình dạng đại diện của các hydrate còn lại; vật liệu muối là điện môi |
| Iốt rắn tím sáng; hơi tím tự xuất hiện trên 40 °C | Iốt rắn tối có ánh; bỏ nón hơi không có nguồn khối lượng hỗ trợ |
| Bột là đống hình nón gần như cố định; kích thước chỉ theo phần trăm còn lại | Thể tích hình học lấy từ khối lượng/khối lượng riêng, hiệu chỉnh theo dung tích cốc; lớp bột theo đáy cong và giả định đóng gói |
| Đinh/lá khi thả vẫn là 28 mảnh chung | Cùng factory model và vật liệu ở thìa, khi rơi và trong cốc; đinh dùng một vật thể; chuyển lượng chất khi chạm cốc |
| Mọi kết tủa chỉ khác màu và đa diện đơn giản | Bông nhiều thùy, gel bất quy tắc, hạt mịn, hạt thô, phiến/kim có điều kiện; kim loại có nhánh |
| Lớp lắng chung hệ số 0,65 | Lớp lắng riêng và hỗn hợp cộng thể tích theo khối lượng, mật độ vật liệu và hệ số đóng gói từng chất |
| Một số sản phẩm đã có trong dữ liệu nhưng runtime mượn BaSO₄ | Bổ sung profile mang đúng tên PbCl₂, Ag₂S, Pb; toàn bộ 21 mục trong registry kết tủa có profile riêng |
| Đổi màu bề mặt cho hai đường phản ứng kim loại | Năm đường có lớp đồng/bạc trên chất nền còn lại, lấy lượng từ tồn kho sản phẩm; không vẽ lại lượng đã bám thành mây tự do |
| Nhãn dạng chất có thể bị đọc thành nhóm nguyên tử | Chuẩn hóa nhãn đinh, lá, bột… khi nhận diện phản ứng và tính mol; vẫn giữ nhãn trên hàng tồn kho để dựng model |
| CuSO₄·5H₂O lặp hai lần với dữ liệu khác nhau | Một bản ghi hydrate nhất quán; thêm CuSO₄ khan trắng, tách với dung dịch và hydrate xanh |

`LedgerEngine` hiện ưu tiên pha được ghi rõ trong tồn kho, tránh biến chất rắn thành pha nước khi tạo sổ bảo toàn. Chai trang trí cũng dùng màu không màu phù hợp và nhãn nồng độ nhất quán với kho.

Chất lỏng khởi tạo ngay bằng màu của mẫu hiện có, tránh chớp màu xanh mặc định rồi pha thành màu sai trong những khung hình đầu. Bột kim loại dùng bề mặt mờ và nhiễu độ nhám nhỏ, tránh nhìn như một nút kim loại đúc bóng.

## Kiểm kê từng chất

[Bảng 94 mẫu thuốc thử và 38 profile sản phẩm](stock-product-appearance-2026-10-28/material-inventory.vi.md) được sinh trực tiếp từ dữ liệu đang chạy. [JSON](stock-product-appearance-2026-10-28/material-inventory.json) ghi pha cấp, khối lượng mol, mật độ/nồng độ nhập, màu, hình thái, vật liệu và thể tích chuẩn của mesh.

Ba mẫu khác nhau cần giữ tách biệt:

- `CuSO4`: dung dịch 0,5 M trong kho, màu xanh.
- `CuSO4 (solid)`: CuSO₄ khan, bột trắng; không tự biến thành tinh thể xanh.
- `CuSO4·5H2O`: tinh thể xanh ngậm năm nước; công thức và khối lượng mol giữ cả nước kết tinh.

Tương tự, `NaOH` là dung dịch 1 M, còn `NaOH (solid)` là viên rắn trắng, không có tính kim loại. Cu(OH)₂ bột khô và Cu(OH)₂ mới kết tủa dùng hai đường dựng hình khác nhau. PbI₂ mới trộn lạnh giữ dạng hạt mịn; chỉ hàng tồn kho có dấu `CRYSTAL_PLATE` mới dựng phiến. Nhãn `CRYSTAL_NEEDLE` cho PbCl₂ là khả năng hiển thị, không tự tạo một đường phản ứng kết tinh mới.

## Nguồn và mức tin cậy

Nguồn dưới đây hỗ trợ trạng thái/màu định tính. Chúng không cung cấp màu sRGB hay hệ số PBR đã đo cho renderer.

| Thuộc tính đối chiếu | Nguồn chính |
|---|---|
| H₂SO₄ tinh khiết là chất lỏng không màu dạng dầu; mẫu thương mại có thể sẫm do tạp chất | [NIOSH: Sulfuric acid](https://www.cdc.gov/niosh/npg/npgd0577.html), [NOAA CAMEO](https://m.cameochemicals.noaa.gov/chemical/5193) |
| n-Hexan không màu | [NIOSH: n-Hexane](https://www.cdc.gov/niosh/npg/npgd0322.html) |
| Iốt rắn tối, có ánh kim | [NOAA: Iodine](https://cameochemicals.noaa.gov/chemical/25035) |
| CuSO₄ khan trắng, mật độ vật liệu 3,6 g/cm³ | [ILO/WHO ICSC 0751](https://chemicalsafety.ilo.org/dyn/icsc/showcard.display?p_card_id=0751) |
| CuSO₄·5H₂O là chất rắn xanh | [ILO/WHO ICSC 1416](https://chemicalsafety.ilo.org/dyn/icsc/showcard.display?p_card_id=1416) |
| CoCl₂ khan khác dạng hồng khi nhận ẩm | [ILO/WHO ICSC 0783](https://chemicalsafety.ilo.org/dyn/icsc/showcard.display?p_card_id=0783) |
| Cu(OH)₂ mới sinh xanh nhạt, phức ammin đồng xanh đậm | [University of Wisconsin: CuSO₄ with ammonia](https://www2.chem.wisc.edu/deptfiles/genchem/lab/ccaold/mvhtm/cuso/cusonh32.htm) |
| Màu riêng của các kết tủa bạc | [University of Washington: Silver precipitates](https://chem.washington.edu/lecture-demos/silver-precipitates) |

Các thông số hóa học khác kế thừa catalog hiện có. Bảng kiểm không phải chứng nhận độc lập mọi mật độ, nồng độ hay thói quen tinh thể. Nguồn và giới hạn theo họ chất còn nằm trong các báo cáo `silver-halide`, `hydroxide`, `sulfide`, `ferrocyanide`, `copper-bismuth-iodides` và `sulfate-manganese-sulfur` sẵn có trong thư mục nghiên cứu.

## Giới hạn mô hình được giữ rõ

- RGB và vật liệu thể hiện nhận biết định tính. Chất lỏng dùng alpha compositing, chưa có phổ hấp thụ hay khúc xạ thể tích được hiệu chuẩn.
- Mesh tinh thể mô tả hình dạng mẫu vĩ mô để phân biệt, không phải ô mạng tinh thể hoặc cấu trúc phân tử.
- Mỗi hạt kết tủa là phần tử đại diện một lượng khối lượng. Kích thước hiển thị và kích thước dùng cho lực cản là hai đại lượng riêng; thời gian lắng chưa khớp dữ liệu thực nghiệm riêng cho từng quy trình điều chế.
- Hệ số đóng gói gel/bông là giả định hiển thị. Mô hình chưa giải nén bùn, lão hóa gel hoặc động học kết bông đã đo.
- Phản ứng thế giả định sản phẩm bám trên kim loại khi chất nền còn tồn tại. Nhánh bám và diện tích phủ không phải mô hình điện kết tinh hay lực bám/detachment đã đo. Hết chất nền thì sản phẩm chuyển sang phần chất rắn tự do.
- Vật rắn lớn hơn lòng cốc vẫn chịu giới hạn hiển thị hiện có để tránh xuyên thành; các mảnh có thể chồng nhau. Đây chưa phải mô phỏng tiếp xúc vật rắn đầy đủ.
- Nâng cấp không tự bổ sung các quá trình thiếu cân bằng pha/động học, ví dụ đầy đủ quá trình thăng hoa iốt và mất nước từng bước của hydrate.

## Cách tái kiểm tra

Chạy từ thư mục `lab-3d`:

```powershell
node --import tsx scripts/auditStockMaterials.ts
npx vitest run --maxWorkers=2 --exclude tests/performance.smoke.test.ts
npm run lint
npm run build
```

Khởi động Vite dev ở cổng 6773 rồi chạy `node scripts/auditMaterialAppearance.mjs`. Fixture nằm trong `scripts/fixtures/appearance.html`, không nằm trong entry build sản phẩm. Ảnh dùng chính `Beaker`, `RealisticLiquid`, `SolidContentsRenderer`, `PhysicalSimulationRenderer`; không phải bản dựng minh họa độc lập.

Kết quả và ảnh nằm trong [thư mục kiểm tra](stock-product-appearance-2026-10-28/). `browser-audit.json` tách mẫu sản phẩm đã có sẵn với các phản ứng thực sự được chuẩn bị/chạy trong lab; có thêm lượt cấp chất qua hàng đợi tiếp xúc. Việc chụp ảnh không dùng làm phép đo FPS. Bộ kiểm tra hiệu năng ghi đè artifact chuẩn của repo được loại khỏi lượt này.

Harness chặn API hóa học/cloud có chủ đích; các lỗi mạng đúng URL bị chặn được ghi riêng trong `expectedBlockedNetworkErrors`, không gộp với lỗi JavaScript/WebGL. Đợi hoàn tất cấp chất bằng predicate đồng bộ; phiên bản predicate bất đồng bộ trước đó có thể trả snapshot giữa lượt và gây báo thiếu khối lượng giả. Animation cũng giữ promise lần cấp mới nhất để đợi hàng đợi ghi tồn kho hoàn tất trước khi đóng.

## Kết quả xác minh cuối

- TypeScript (`npm run lint`): qua.
- 166 file test, 2.079 bài: tất cả qua, chạy với hai worker. Lượt mặc định dùng nhiều worker có bài hết thời gian; không sửa assertion hoặc tăng timeout để đạt kết quả này.
- Build production: qua; log nằm tại [build.log](stock-product-appearance-2026-10-28/build.log).
- WebGL: 29 ảnh kiểm kê, 9 lượt phản ứng thực tế và 4 lượt cấp chất; không có lỗi JavaScript/WebGL hoặc lỗi console ngoài các yêu cầu mạng được harness chủ đích chặn.
- Đinh Fe 1 g, lá Al 0,5 g, CuSO₄·5H₂O 1 g và NaOH rắn 0,5 g đều chốt đúng khối lượng, thể tích chất lỏng bằng 0 và pha `s` khi cấp vào cốc khô.
- [Test JSON](stock-product-appearance-2026-10-28/test-results.json) và [browser JSON](stock-product-appearance-2026-10-28/browser-audit.json) là kết quả có thể kiểm tra lại.
