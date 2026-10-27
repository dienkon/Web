# Replay khí theo lịch sử đóng–mở nút

## Bằng chứng

Vòng headspace trước có code và 15 test mới, phân loại có tiến triển. Đọc `applyProgramToLedger` xác nhận nơi giữ/thoát khí phụ thuộc `baseline.isSealed`. Khi đóng nút giữa run bắt đầu mở, khí sinh tiếp vẫn có thể bị ghi hết vào escaped history; trường hợp mở giữa run kín thì replay vẫn tạo lại khí giữ. Native material replay còn dùng escaped history của current như một phần dữ liệu raw replay, khiến không phân biệt được batch mới với sink cũ.

Không sửa bằng cách đổi cờ sealed của toàn baseline rồi tính lại: cách đó có thể lấy lại các phân tử đã thoát ở các mức tiến triển trước. Đã thêm lớp đối soát vật chất sau stoichiometric replay, trước thermal sinks và foam routing.

## Ngân sách từng loài

`reconcileReplayGas` chuẩn hóa species identity và giữ riêng:

```
B = khí còn trong raw replay + max(0, raw escaped - baseline escaped)
L = max(0, actual current escaped - baseline escaped)
```

B là tổng budget có thể phân bổ ở mức tiến triển đang xét; L là sink không thể lấy lại. Các counter đã tồn tại trước reaction baseline vẫn được giữ riêng. Khi current sealed, chỉ phần `B-L` có thể còn trong bình. Khi current open, budget đi qua sink mở theo closure hiện có; foam được đối soát ở bước sau từ cùng gross retained+escaped budget. Không cộng một batch cũ lần nữa chỉ vì gọi replay cùng extent.

Khối lượng mẫu được hiệu chỉnh bằng `raw mass + target retained gas - raw retained gas`. Component khí giữ lại có mass/moles cùng loài, ưu tiên molar mass từ raw component khi có; nếu raw đã thoát hết thì dùng canonical molar mass. Không trừ lượng khí thoát khỏi thể tích chất lỏng hoặc tạo một lượng nước lỏng mới. H₂O(g) vẫn đi vào water-vapor routing hiện có, tách gross chemical source khỏi net external sink/recovery.

Snapshot đầu vào không mutate. Native aluminum material stage trả escaped history từ **baseline** để tuân hợp đồng raw cumulative replay, rồi lớp đối soát dùng actual sink của current. Khí trơ đã vent không được tái tạo trong các bước vật chất không sinh khí.

## Khí làm chất phản ứng và mức tiến triển

Nếu một extent đòi B nhỏ hơn L, nó đang cố tiêu thụ/phục hồi những phân tử đã vượt boundary. Helper không áp dụng result đó, giữ current inventory và đánh dấu proposal blocked. Feasibility search giới hạn mức tiến triển cho program có reactant pha khí; giữ cả ràng buộc nhiệt của heat-activated step. Đây là giới hạn lượng chất, không phải một định luật tốc độ mới.

Store dùng limiter này cho cả gas-reactant program không được gắn heat_activated. Nếu một replay bất kỳ vẫn bị blocked, không commit mức tiến triển mới hoặc finalize chemistry. `actualProgressRate_s=0` dừng ongoing emissions, không dùng active runtime như bằng chứng rằng phản ứng còn đang sinh khí. Seek tới extent không khả thi trả false; không tua ngược sink cũ. Các duration/surface rates vẫn có miền hiệu chỉnh đã ghi trong các audit trước.

Tolerance budget là max(1e-12 g, B*1e-10), chỉ xử lý sai số số học. Không dùng một lưu lượng hoặc lượng preset làm nguồn bù.

## Kiểm chứng

13 test mới trong `tests/gas_boundary_replay.test.ts`:

- Ranh giới không đổi open/sealed khớp stoichiometry; close sau 25% chỉ giữ batch sinh sau đó; open sau run kín chuyển batch mới tới sink.
- Nhiều lần đóng–mở, replay cùng extent, lịch sử trước baseline, raw native gas và native aluminum với khí trơ đã vent.
- Canonical gas identity, snapshots bất biến, chặn rewind đã có exhaust, H₂O(g) không thành liquid source giả.
- Tick store thực đổi generated/exhaust flux theo nút; gas reactant đã xả thì không tiếp tục bị tiêu thụ, không phát hiệu ứng mới và seek không vượt budget.

Các fixture stoichiometric/isothermal được dùng kiểm tra invariant; không lấy chúng làm dữ liệu đo kinetics hoặc điều kiện mồi phản ứng. Đã chạy lại foam, water routing, thermal, heat activation, aluminum progress và toàn suite: **138 file, 1580/1580 test đạt; lint/build đạt**. Suite chạy tuần tự, build sau test; Vite còn cảnh báo chunk lớn. Chưa có kiểm chứng WebGL.

## Nguồn và giới hạn

[OpenStax Chemistry 2e §4.4 — Reaction Yields](https://openstax.org/books/chemistry-2e/pages/4-4-reaction-yields) mô tả giới hạn lượng sản phẩm theo lượng chất khả dụng; [§4.3 — Reaction Stoichiometry](https://openstax.org/books/chemistry-2e/pages/4-3-reaction-stoichiometry) trình bày tỉ lệ mol theo phương trình cân bằng. Phép phân bổ B/L ở trên là bookkeeping của dự án, không phải một correlation động học được lấy từ nguồn.

Boundary mở vẫn là sink tức thời; không giải mixing/residence time, diffusion/solubility hoặc dòng thoát do chênh áp. Closure carrier/headspace của vòng trước vẫn là khí lý tưởng, không giải VLE và nhiệt độ khí độc lập. Foam vẫn dùng mô hình giữ/thoát đã khai báo, không phải CFD đa pha. Gas import/export qua mạng thiết bị, nhiều reaction đồng thời không dùng cùng baseline và thay đổi body/sample cần được audit theo nguồn vật chất riêng. Toàn mục tiêu vẫn mở.
