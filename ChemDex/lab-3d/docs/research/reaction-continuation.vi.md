# Phản ứng tiếp tục khi lấy bớt mẫu — 29/10/2026

**Đợt tiếp theo:** [Hóa học trong mẫu đang vận chuyển](aliquot-contact-chemistry.vi.md) đã bổ sung động học tiếp xúc dung dịch cho dòng bay/thành/pipet trong miền được nêu, đồng thời chuyển kho pipet sang trạng thái vật chất chung. Các giới hạn ở cuối bản này mô tả thời điểm trước đợt tiếp theo.

Đã sửa lỗi lấy bớt dung dịch làm xóa phản ứng của phần còn lại. Phạm vi gồm rót trực tiếp, phát dòng đang bay, hút pipet và dòng xả từ phễu lọc/phễu chiết. Đây là một bước của mục tiêu cải tiến lab; chưa xác nhận toàn mô phỏng tương đương thí nghiệm thực.

## Lỗi đã tái hiện

Mẫu HCl–NaOH đang phản ứng ở mức 50%. Lấy nửa thể tích làm `activeKinetics[source]` biến mất. Bình nhận có thể phản ứng nhưng HCl/NaOH còn trong bình nguồn không tiếp tục chuyển hóa. Hai test cho rót trực tiếp/rót qua không khí đều thất bại trước bản sửa, tại kiểm tra tiến trình nguồn còn tồn tại.

Việc chỉ giữ baseline cũ cũng không đúng: replay từ lượng chất trước khi lấy mẫu sẽ tạo lại chất đã chuyển đi. Bản sửa thay baseline bằng kho **còn lại sau khi lấy mẫu**, giữ tiến độ toàn cục và thời điểm bắt đầu.

## Kho còn lại và đồng hồ

Với tiến độ toàn cục `p`, mốc lấy mẫu `b`, tiến độ replay cục bộ là `clamp((p − b)/(1 − b), 0, 1)`. Mỗi lần lấy mẫu cập nhật mốc và baseline. Tick thường, phép dò ngân sách nhiệt và thao tác seek đều dùng cùng ánh xạ.

Với mô hình tiếp xúc bậc nhất đang dùng, phần còn lại sau `dt` vẫn nhân `exp(−ln(2) dt/halfTime)`. Không khởi động lại đồng hồ; không bỏ phần chuyển hóa trước đó. `programHeatApplied_J` trong baseline mới giữ lịch sử nhiệt đã tạo, nên chỉ chênh lệch nhiệt mới được đưa vào mẫu. Khí đã thoát và dung môi đã bay hơi vẫn là các biên không đảo ngược.

Mô hình kim loại–HCl giữ lượng kim loại và khối lượng tham chiếu ban đầu dùng cho diện tích bề mặt. Sau khi rót axit ra, nồng độ được tính từ lượng axit và thể tích còn lại; không tự coi phần kim loại còn lại là một hạt mới. Kiểm thử Mg/Zn/Fe đối chiếu tốc độ mol/s ngay trước/sau khi lấy nửa dung dịch đồng nhất, trong điều kiện kim loại không bị chuyển đi.

Với các bước nhôm native, extents cũ không được mang sang mẫu mới: bộ giải dự đoán các bước còn có thể xảy ra từ thành phần thực tế, sau đó tiến hành dần bằng ledger. Gel đã có và nhiệt đã sinh không bị tạo lần hai. Thời gian của các bước nhôm vẫn mang tính minh họa; việc chia lại các bước sau lấy mẫu chưa phải mô hình động học đo được.

Nếu mẫu đã hết chất phản ứng hoặc phản ứng cũ chỉ còn hiệu ứng sau một endpoint đã commit, không duy trì một phản ứng vật chất giả. Thay thế thành phần tùy ý qua `setVesselState` vẫn bỏ baseline cũ; chỉ thao tác hút được đánh dấu `withdrawal` mới được tiếp tục từ kho còn lại.

Phản ứng cần nhiệt vẫn giữ trạng thái chờ khi mẫu nguội. Replay thể hiện lượng đã được chấp nhận, nên đánh giá activation trong replay không được đảo ngược sản phẩm đã có. Bộ tích phân tiến độ tiếp tục kiểm tra nhiệt độ **hiện tại**, dò nhiệt lượng khả dụng rồi mới chấp nhận extent mới; làm nóng lại có thể tiếp tục phản ứng từ baseline lấy mẫu lúc nguội. Không đồng thời đăng ký thêm pending reaction cho một nguồn đang có tiến trình vật chất tiếp tục.

## Bằng chứng

Chạy `node scripts/auditReactionContinuation.mjs` khi Vite ở cổng 6773. Audit dùng app thật, không thay `performance.now`, không bật cờ test. Cửa cập nhật production 20 Hz được chờ bằng thời gian thực khi mô phỏng đang tạm dừng; mỗi bước hóa học gọi chính action production với `dt=0,1 s`.

| Thao tác | HCl nguồn trước bước tiếp (mol) | HCl nguồn sau bước tiếp (mol) | Tiến độ | Nhiệt mới ở nguồn (J) | Tổng khối lượng (g) |
|---|---:|---:|---:|---:|---:|
| Rót trực tiếp 15 mL | 0,000250000 | 0,000125000 | 0,50 → 0,75 | 6,97875 | 30 → 30 |
| Phát 15 mL vào dòng bay | 0,000250000 | 0,000125000 | 0,50 → 0,75 | 6,97875 | 30 → 30 |
| Hút pipet 5 mL | 0,000416667 | 0,000208333 | 0,50 → 0,75 | 11,63125 | 30 → 30 |

Cả ba kiểm tra số nguyên tử H/Cl/Na/O trước/sau, tính cả mẫu trong pipet/dòng bay và nước đã thoát. Không có lỗi JavaScript hoặc console WebGL trong audit. Ảnh là bằng chứng runtime, không phải phép đo tốc độ thực nghiệm hay thay đổi tạo hình chất lỏng.

- [Báo cáo trình duyệt](reaction-continuation-2026-10-29/browser-audit.json)
- [Ảnh rót trực tiếp](reaction-continuation-2026-10-29/direct.png), [dòng bay](reaction-continuation-2026-10-29/flight.png), [pipet](reaction-continuation-2026-10-29/pipette.png)
- [Toàn bộ kiểm thử](reaction-continuation-2026-10-29/test-results.json), [nhóm kiểm thử liên quan](reaction-continuation-2026-10-29/continuation-test-results.json), [build](reaction-continuation-2026-10-29/build.log)

Kiểm thử mới bao phủ lấy mẫu lặp 12 lần, lấy hết nguồn, pipet thật, hai loại phễu, Mg/Zn/Fe, ngân sách nhiệt khi làm nóng lại, gel nhôm và khí H₂ không bị replay. Kiểm thử gel cũ được cập nhật từ hành vi “ngừng phản ứng sau hút” sang hành vi “tiếp tục phản ứng và bảo toàn toàn mẫu nguồn + pipet”; vẫn kiểm tra khối lượng và từng nguyên tố.

Kiểm tra cuối: **174 file / 2.143 test đều qua**, TypeScript qua; build production qua trong **23,04 s**. Nhóm 67 test liên quan cũng qua. Suite đầy đủ bỏ `performance.smoke.test.ts` vì test đó ghi đè artifact benchmark lịch sử; đợt này không đưa ra kết luận hiệu năng mới. Cảnh báo chunk lớn và cảnh báo localStorage thử nghiệm của Node vẫn còn.

## Cơ sở và giới hạn

[OpenStax Chemistry 2e, §12.2](https://openstax.org/books/chemistry-2e/pages/12-2-factors-affecting-reaction-rates) được đối chiếu cho các xu hướng tốc độ theo nồng độ, diện tích tiếp xúc và nhiệt độ. Nguồn này không hiệu chuẩn các hằng số của ChemDex. Ánh xạ tiến độ và việc giữ tham chiếu bề mặt là lựa chọn triển khai nhằm tránh khởi động lại vật chất/đồng hồ khi lấy mẫu; không phải một định luật động học mới.

Các phần vẫn cần làm tiếp:

1. Hiệu chuẩn tốc độ theo dữ liệu từng phản ứng, nồng độ, nhiệt độ và dạng mẫu; `halfTime_s`, Q10, hệ số nghiền/khuấy và thời lượng nhôm hiện chưa được khớp dữ liệu thực nghiệm.
2. Hình dạng màng ngoài thành ở lưu lượng lớn vẫn quá dày trong một số trường hợp; chiều rộng bám ướt, vận tốc qua mép, miền áp dụng màng tầng và tách dòng chưa được hiệu chuẩn. Xem [báo cáo tràn](finite-exterior-overflow.vi.md).
3. Mẫu hỗn hợp đã rời nguồn trong dòng bay hoặc pipet hiện không tự tích phân phản ứng trong thời gian lưu; phần nguồn tiếp tục đúng, phần được lấy chưa có mô hình động học riêng khi đang vận chuyển. Audit không chứng minh hóa học của mọi giọt ngoài bình đã đúng.
4. Bảo toàn kho và kiểm thử số học không thay thế đối chiếu hình ảnh, chuyển pha, hoạt độ, truyền khối và số đo thí nghiệm.
