# Hóa học trong mẫu đang vận chuyển — 29/10/2026

Đã bổ sung tiến triển hóa học cho mẫu dung dịch đang bay, trên thành trong/ngoài và nằm trong pipet. Mẫu không còn phải đợi tới bình nhận mới tiếp tục phản ứng trong miền tiếp xúc dung dịch được hỗ trợ. Pipet nay dùng chung kho vật chất với bình và dòng bay, có giao dịch hút/nhả đồng thời, lưu và khôi phục lượng đang giữ. Toàn mục tiêu mô phỏng đúng thực tế vẫn chưa hoàn tất.

## Mô hình đang áp dụng

Chương trình phải có metadata tiếp xúc `instant`, half-time dương, mọi chất phản ứng ở pha aq/l và không sinh sản phẩm khí. Các chương trình indicator/emission/dilution, fallback và phương trình chỉ đổi pha nhưng không đổi lượng các công thức phân tử không được dùng như một phản ứng vật chất mới. Mẫu phải có nước lỏng và không được đánh dấu chứa lớp hữu cơ.

Audit hiện nhận diện **48 chương trình**, tạo mẫu 5 mL từ từng mẫu Studio và cho tiến triển 0,1 s. Cả 48 thay đổi thành phần, không có số mol/khối lượng âm; sai số nguyên tố lớn nhất khoảng `1,11 × 10⁻¹⁶ mol`, tổng khối lượng giữ nguyên. Đây là kiểm tra số học trên các mẫu chuẩn của catalog; không chứng minh mọi hỗn hợp tùy ý hoặc thời gian phản ứng thực nghiệm đã đúng.

Mẫu lưu ID chương trình đã chọn, dùng lượng chất hiện tại làm đầu vào của bước kế tiếp. Mỗi bước chỉ chuyển hóa phần còn có thể phản ứng; không replay lại kho trước khi hút/rót, không mang nhiệt của toàn bình nguồn sang mẫu như một nguồn nhiệt mới. Sản phẩm rắn được giữ trong `contents` của chính mẫu, sau đó đi cùng lượng thực tế tới bình hoặc bàn.

Quan hệ suy giảm sử dụng half-time đã có trong chương trình. [OpenStax Chemistry 2e, §12.4](https://openstax.org/books/chemistry-2e/pages/12-4-integrated-rate-laws) trình bày nghiệm tích phân bậc nhất và quan hệ nồng độ–thời gian. Trong ChemDex, việc dùng một thời gian bán chuyển hóa cho thư giãn tiếp xúc vẫn là **mô hình minh họa**, chưa phải phép khớp định luật tốc độ của từng phản ứng đa chất.

## Không tính thừa thời gian cho phần tới nơi sớm

Một packet đại diện cho khoảng cấp hữu hạn. Trong một bước lớn, phần đầu có thể đã chạm bình/bàn trước phần cuối. Nếu phản ứng cả packet tới cuối bước rồi mới chia lượng tới nơi, phần đầu sẽ bị cho thêm thời gian hóa học ngoài thời gian lưu.

Với hệ số `k = ln(2)/halfTime` và khoảng thời gian tới nơi cục bộ `[a,b]`, mô hình dùng trung bình giải tích của phần chưa chuyển hóa:

`meanRemaining = exp(−k·a) · [−expm1(−k·(b−a))] / [k·(b−a)]`.

Khi `a=b`, biểu thức về nghiệm tại một thời điểm. Phần chưa tới nơi được tiến triển tới cuối bước và tiếp tục ở packet; phần tới nơi được cập nhật bằng mức chuyển hóa trung bình trong đúng khoảng tiếp xúc. Phép này áp dụng cho cả thời gian trên thành và thời gian bay. Nghiệm tích phân được đối chiếu độc lập trên trung hòa HCl–NaOH; không suy rộng tuyên bố chính xác giải tích đó sang mọi mô hình có giới hạn bão hòa thay đổi theo nhiệt độ.

Đồng hồ hóa học bắt đầu khi cả aliquot đã được debit khỏi nguồn. Phần chờ phát trong packet vẫn phản ứng trong cùng kho hữu hạn. Điều này nhất quán với mô hình receipt hiện tại; nó chưa thay thế được mô hình rút dần khỏi nguồn và tích nước qua vành theo thời gian thực.

## Nhiệt của mẫu

Nhiệt phản ứng được lấy từ ledger stoichiometry và enthalpy của chương trình. Mẫu dùng tham chiếu đoạn nhiệt, Cp giống nước **4,184 J/(g·K)**, tính trên khối lượng mẫu; không thêm nhiệt dung beaker 33,2 J/K cho nước đang bay hay trong pipet. Đây là tham chiếu nước, chưa phải Cp đo của hỗn hợp, huyền phù hoặc bộ pipet–mẫu.

Chưa mô phỏng trao đổi nhiệt với không khí/thành pipet, khí thoát hoặc chuyển pha của aliquot. Nếu nhiệt độ dự đoán vượt miền nước lỏng của mô hình, bước được giữ nguyên với `contactChemistryLimit: phase_boundary`, thay vì làm mất nước/khí vào một kho chưa có. Với dung dịch chưa có VLE được hỗ trợ, mốc nước tinh khiết chỉ là giới hạn tham chiếu, không được diễn giải thành nhiệt độ sôi thật của axit hay dung môi dễ bay hơi. Phản ứng sinh khí, phản ứng bề mặt và phản ứng cần kích hoạt riêng còn nằm ngoài cơ chế aliquot này.

## Pipet thuộc cùng một kho

`pipetteSample` được chuyển từ store hiển thị dụng cụ sang `useAppStore`. Hút/nhả cập nhật bình và pipet bằng cùng một `set`, vì vậy người quan sát store không thấy phiên bản trung gian mất/nhân đôi mẫu. Store dụng cụ chỉ giữ trạng thái hiển thị, pulse và thông báo. Bảng đọc và mô hình 3D đọc cùng `pipetteSample` có lượng chất thực.

Mẫu được lưu trong `LabMaterialSnapshot`, có trong bản ghi localStorage cùng bình/dòng bay/chất tràn, và được khôi phục khi undo/redo. Reset bàn hoặc nạp lại bộ thí nghiệm xóa mẫu theo thao tác reset đó. Khi chỉ còn pipet có phản ứng, fast-exit của đồng hồ vẫn cho mẫu tiến triển; tạm dừng dừng cả nó. Hút/nhả không làm khởi động lại phản ứng trong phần còn lại của bình nguồn.

## Kết quả trong app thật

Audit qua trình duyệt dùng action production và cửa cập nhật thời gian thật; không thay `performance.now` hoặc bật cờ test. Mô phỏng được tạm dừng giữa các bước kiểm tra để giữ nguyên trạng thái chụp ảnh.

| Mốc pipet | Thể tích (mL) | HCl (mol) | NaCl (mol) | Nhiệt độ (°C) |
|---|---:|---:|---:|---:|
| Vừa hút | 5 | 0,000166667 | 0 | 25 |
| Sau 0,1 s | 5 | 0,000083333 | 0,000083333 | 25,222395 |
| Sau nhả 2,5 mL | 2,5 | 0,000041667 | 0,000041667 | 25,222395 |
| Sau thêm 0,1 s | 2,5 | 0,000020833 | 0,000062500 | 25,333592 |

13 phiên bản store quan sát được đều giữ tổng kho 30 g và từng nguyên tố, tính cả hơi nước đã rời các bình. Sau reload, mẫu còn 2,5 mL với HCl `2,0833333 × 10⁻⁵ mol`; cho chạy 0,1 s nữa còn `1,0416667 × 10⁻⁵ mol`.

Trong kịch bản bay 5 mL, thời gian bay `0,172688820 s`, khoảng cấp `0,2 s`: sau 0,1 s chưa chạm bàn, HCl đã giảm từ `1,6666667 × 10⁻⁴` xuống `8,3333333 × 10⁻⁵ mol`. Tổng HCl tới bàn là `2,72401446 × 10⁻⁵ mol`, khớp trung bình giải tích theo khoảng tới nơi. Tổng kho vẫn 30 g, trên bàn nhận đúng 5 mL.

- [Dữ liệu trình duyệt](aliquot-chemistry-2026-10-29/browser-audit.json)
- [Ảnh pipet](aliquot-chemistry-2026-10-29/01-reacting-pipette.png), [mẫu trước va chạm](aliquot-chemistry-2026-10-29/02-reacting-before-impact.png), [sau tới bàn](aliquot-chemistry-2026-10-29/03-arrived-composition.png)
- [Audit 48 chương trình và CPU](aliquot-chemistry-2026-10-29/model-audit.json)
- [Kiểm thử](aliquot-chemistry-2026-10-29/test-results.json), [build](aliquot-chemistry-2026-10-29/build.log)

Kiểm thử mới bao phủ trung hòa/nhiệt, kết tủa AgCl trong mẫu, khoảng tới nơi với bước 1 s/0,1 s/1⁄60 s/1⁄120 s, màng trong/ngoài, pipet khi không còn bình, pause, phần giữ lại sau nhả, bảo toàn từng store-version, lưu và undo/redo. Các kiểm tra dụng cụ/cặn cũ được chuyển sang đọc kho mẫu mới; không bỏ các bất biến lượng chất.

Kiểm tra cuối: **177 file / 2.166 test đều qua**, TypeScript qua, build production qua trong **27,10 s**. Audit trình duyệt sau cùng không có lỗi JavaScript/console WebGL. Suite bỏ `performance.smoke.test.ts` để giữ artifact benchmark lịch sử; build vẫn có cảnh báo chunk lớn và Node có cảnh báo localStorage thử nghiệm như trước.

Benchmark CPU trên máy hiện tại, Node 26.7: 24 mẫu đang tiến triển qua mỗi bước 1⁄120 s có median khoảng **1,335 ms**, p95 **1,806 ms**. Phép đo không bao gồm renderer/GPU và không được dùng để khẳng định FPS; half-time cũng chưa được hiệu chuẩn thực nghiệm.

## Phần còn lại của mục tiêu

1. Thêm kho khí/hơi và chuyển pha cho mẫu đang vận chuyển; xử lý các chương trình bề mặt, xúc tác, nhiệt và chuỗi phản ứng nhiều bước trong mẫu.
2. Tính trao đổi nhiệt, Cp hỗn hợp và vật liệu pipet; phản ứng theo nồng độ/hoạt độ thực và dữ liệu tốc độ từng phản ứng.
3. Đồng bộ mốc tiếp xúc với bộ tích phân phản ứng của bình nhận khi hai vòng cập nhật dùng bước khác nhau. Audit tích phân ở đây xác nhận thành phần **tại thời điểm tới nơi**, không chứng minh toàn bộ lịch sử sau khi trộn trong bình ở mọi bước thời gian đều chính xác.
4. Bổ sung động học cho chất tràn đã nằm trên bàn và hình ảnh hạt kết tủa/khí bên trong từng giọt; ledger hiện có thể mang rắn hữu hạn nhưng không tự tạo một renderer hạt ngoài bình.
5. Thống nhất thước SI/dung tích của dụng cụ, hiệu chuẩn dòng qua vành, bám ướt, sóng và vỡ giọt; xem [màng tràn quanh miệng tròn](circular-overflow.vi.md).

## Tái chạy

```powershell
node --import tsx scripts/auditAliquotChemistryModels.ts
npx vitest run --maxWorkers=2 --exclude tests/performance.smoke.test.ts
npm run lint
npm run build
# Với Vite ở 127.0.0.1:6773:
node scripts/auditAliquotContactChemistry.mjs
```
