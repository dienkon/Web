# Bình vỡ: một giao dịch vật chất và nước trên thành

## Bằng chứng ban đầu

Vòng trước loại bỏ ghi spill từ renderer giọt bắn và có 13 test mới, được phân loại có tiến triển. Kiểm tra tiếp source shatter xác nhận `addSpill` được gọi trước commit xóa mẫu trong bình. Subscriber có thể thấy cùng lượng chất ở cả hai nơi. Explosion/VFX phát trước commit còn có thể gọi lại shatter khi cờ `isShattered` chưa được đặt. Save dùng một bộ vessels mới nhưng đọc materials từ trạng thái hiện hành trong callback set, cũng chưa có ranh giới giao dịch rõ ràng.

Ngoài ra, `wallCondensation.inner_g/outer_g` là inventory tách khỏi `vessel.mass_g`, nhưng chưa được chuyển khi kính vỡ. Giữ beads trên trạng thái bình vỡ rồi thay thân bình có thể làm chúng xuất hiện trên kính mới hoặc mất đường đi vật chất. Hơi H₂O giữ trong contents khí được vent vào `escapedGas_g`, nhưng cần cập nhật cả net external water sink.

## Commit nguồn và đích

`shatterVessel` nay tính receipt thuần rồi commit trong một `set`:

- Đánh dấu vỡ, xóa bulk contents/mass/volume và đưa khí giữ trong mẫu vào escaped gas history.
- Chuyển condensed sample cộng nước lỏng inner/outer wall vào spill bằng `mergeWorkbenchSpill` trong cùng phiên bản state.
- Xóa held wall mass/beads, giữ history và counters xuất khi vỡ.
- Xóa active kinetics/pending/dissolving cho bình đích; ngắt virtual heat handle và các rate VFX cũ, mở seal và đặt áp suất hiển thị về môi trường.

Chỉ sau commit mới dừng playback/managers cũ, phát sample-reset, lưu physical snapshot, phát VFX/âm thanh và tạo shard. Subscriber hoặc event listener gọi shatter lại sẽ thấy cờ đã vỡ và không giải phóng chất thêm lần nữa. Subscriber lau spill ngay trong notification cũng giữ tổng lượng chất vì bulk đã được xóa cùng receipt.

Không gọi `addSpill` của đường overflow trong giao dịch breakage nữa; kính vỡ không phát hiệu ứng nước đi xuống một thành bình còn nguyên. Source vị trí spill vẫn là giả thiết lắng đọng tức thời tại bình, chưa giải ballistic parcel của toàn lượng chất.

Nếu vị trí hoặc các lượng tổng/extensive không hợp lệ, hoặc receipt có chất mà merge bị từ chối, transaction không xóa mẫu nguồn. Hàm vẫn nhận state inventory hợp lệ; chưa có cơ chế sửa mọi save hỏng hoặc các thành phần riêng lẻ tự mâu thuẫn với tổng mass.

## Nước thành và hơi nước

`releaseShatteredInventory` clone component của mẫu, tách gas rồi cộng held liquid water trên thành vào H₂O(l) của spill. Moles dùng 18,015 g/mol. Thể tích nước thành dùng quy ước hiện có 1 g≈1 mL; chưa thêm density theo nhiệt độ. Beads là đại diện của tổng inner/outer mass, không cộng thêm tổng bead lần nữa.

`innerReleasedOnBreak_g` và `outerReleasedOnBreak_g` lưu riêng provenance; không cộng nước thành vào vapor sink. Held mass/beads về zero trong chính commit. Thay thân bình và làm vỡ lần nữa không lấy lại lượng water history này.

`waterVaporReleasedHistoryG` tập trung phép đọc net history/fallback cũ. Khi vỡ, chỉ H₂O ở pha khí được cộng thêm vào net external water sink; nước lỏng trên thành không đi qua nhánh đó. `postRecoveryExhaustG` vì vậy không xóa mất lượng hơi vừa vent khi đã có counter net. Fallback history loại inner wall đã xuất ở breakage khỏi phép suy ra vapor. Không tự gán g/s cho một giao dịch tức thời chưa có duration.

Các counter history cũ vẫn có miền giả thiết trước đây của routing; không khôi phục được mọi provenance đã thiếu trong dữ liệu legacy. Không dùng bước này để khẳng định closed-vessel phase equilibrium hoặc transient decompression đã được giải.

## Vòng đời mẫu

Specimen revision tăng khi vỡ để kết quả resolve bất đồng bộ của mẫu cũ không ghi đè vào thân bình đã vỡ hoặc được thay sau đó. Reaction runtime/program session, kinetics engine và particle manager của đúng ID được dừng/reset. Parcel đang bay hoặc wall film trong `inFlightPours` vẫn sở hữu lượng chất riêng và đi qua cơ chế detachment/arrival hiện có; không cộng aggregate wall-coating hiển thị lần nữa vào spill.

## Kiểm chứng

13 test mới trong `tests/atomic_shatter.test.ts`: split bulk/gas/inner+outer wall không mutate; wall-only sample; mọi subscriber thấy một phiên bản bảo toàn; subscriber gọi break lại hoặc cleanup đồng bộ; VFX listener kiểm tra state đã commit và gọi lại; không overflow giả cho breakage; save/load atomic record; repeated break/replacement không lặp wall water; gas-only/seal/pressure/heat; inner-wall liquid không thành vapor; headspace H₂O vent với/không có net-history counter; lifecycle runtime/program/particle manager và revision.

Các ca dùng tổng mass của bulk + wall-held + spill + escaped-gas + waste, cùng kiểm tra component mass/moles/volume. **135 file, 1539/1539 test đạt; lint/build đạt**, Vite còn cảnh báo chunk lớn. Đây là kiểm chứng receipt và thứ tự publish, không phải kiểm chứng lực phá kính hoặc render WebGL.

## Còn mở

Thời gian fracture/decompression, sức bền kính theo nhiệt/áp suất, atomization, vận chuyển toàn spill thành parcel, nhiệt/enthalpy của spill và nước trên shard, gas plume theo impulse vent, wetting/merge/runoff, cùng hình ảnh WebGL chưa được giải đầy đủ. Source shatter vẫn là một giao dịch tức thời được gọi bởi luật/điều khiển hiện có; atomicity không chứng minh trigger vật lý đúng trong mọi thí nghiệm. Mục tiêu toàn hệ vẫn mở.
