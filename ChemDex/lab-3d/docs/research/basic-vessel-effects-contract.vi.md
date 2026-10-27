# Đặc tả triển khai hiệu ứng cơ bản theo bình

Trạng thái: đề xuất triển khai, chưa phải API đã tồn tại. Rà soát ngày 2026-10-25.
Workspace duy nhất dành cho worker: `D:\VsCode\Web\MyWeb\ChemDex\lab-3d`.

## Kết quả cần đạt

Chọn một bình rồi gọi sôi, bay hơi, đọng sương, tràn nước và gợn mặt thoáng trên chính bình đó. Gọi lặp lại hoặc đổi hiệu ứng không tự thêm bình. Mô phỏng vật chất và năng lượng là nguồn dữ liệu của hình ảnh; hiệu ứng không tự tạo lượng nước, hơi hoặc năng lượng.

## Bằng chứng từ code hiện tại

- `src/engine/studioAtom.ts`: `runStudioAtomContext` nhận `targetId` nhưng nhánh program và ice_water gọi hàm tạo mẫu mà không truyền bình đích.
- `src/store/useAppStore.ts`: `prepareStudioProgram` và `prepareStudioIceSample` luôn tạo ID mới, thêm bình, đổi lựa chọn.
- `tests/studio_atom.test.ts`: kiểm thử mẫu program đang yêu cầu giữ nguyên bình cũ và tạo mẫu riêng. Phải cập nhật yêu cầu này cùng thay đổi hành vi, giữ các kiểm tra bảo toàn lượng chất.
- `src/vfx/dev/VfxGallery.tsx`: có lựa chọn bình nhưng vẫn có `getOrCreateTargetVesselId`. Không được fallback sang bình đầu tiên khi ID đích sai.
- `src/engine/thermalState.ts`: đã có ngân sách nhiệt và mất dung môi do hóa hơi. Ghi chú trong module xác nhận chưa tính bay hơi môi trường; cần bổ sung vào cùng ngân sách thay vì tạo sink thứ hai trong renderer.
- `src/simulation/effects/EvaporationSystem.ts`: đã nhận `actualRate_ml_s`, nhưng khi có giá trị này thì không vẽ plume nếu chưa sôi. Cần phân biệt tốc độ bay hơi với điều kiện tạo sương nhìn thấy được.
- `src/components/three/Vessels.tsx`: nhánh hiện sương còn dựa vào nhiệt độ nước trên 55 °C. Không đủ để xác định ngưng tụ trên thành.
- `src/sim/condensation.ts`: sinh giọt bằng xác suất cố định mỗi update. Phải chuyển thành quá trình theo thời gian mô phỏng, giới hạn bằng khối lượng hơi. Với bán kính 0.0022 m, công thức vận tốc `15*r*r` cho 0.0000726 m/s, không khớp chú thích 0.05–0.15 m/s; cần hiệu chỉnh có đơn vị và dữ liệu tham chiếu.
- `src/engine/condensationTransfer.ts`: thu hồi hơi hữu hạn vào ống sinh hàn có kết nối. Đây là đường thu hồi vào thiết bị, cần phân biệt với giọt trên thành bình để không thu hồi hai lần cùng lượng hơi.
- `src/components/three/VesselWallOverflow.tsx`: đã có renderer theo bình; tiếp tục dùng sự kiện vật chất thực tế và kiểm tra đồng bộ với vũng nước.

## Hợp đồng hàm đề xuất

Facade `effects.forVessel(vesselId)` chỉ liên kết ID, không thêm bình. Mỗi lời gọi phải đọc lại bình hiện tại; không giữ tham chiếu state cũ sau reset/xóa. Kiểm tra toàn bộ đầu vào trước khi thay đổi state.

| Hàm dự kiến | Đầu vào và đơn vị | Tác dụng |
| --- | --- | --- |
| `setHeatInput` | công suất W, ID nguồn nhiệt | Cập nhật đầu vào nhiệt đã được engine chấp nhận; sôi và cường độ xuất hiện từ ngân sách nhiệt. Không ép `isBoiling`. |
| `setEnvironment` | nhiệt độ °C, RH 0–1, áp suất Pa, gió m/s | Điều kiện truyền nhiệt/khối lượng có phạm vi rõ ràng; không âm thầm đổi môi trường của bình khác. |
| `doseLiquid` | nguồn chất xác định, thể tích mL, lưu lượng mL/s | Đi qua đường cấp chất hữu hạn hiện có. Vượt khả năng chứa thực tế gây tràn, không cộng thể tích tùy ý. |
| `ripple` | biên độ theo giới hạn renderer | Xung mặt thoáng hữu hạn cho bình đích; không đổi lượng chất. |
| `inspect` | không có | Trả stage sôi, tốc độ bay hơi g/s, nhiệt độ thành °C, điểm sương °C, khối lượng giọt g và lưu lượng tràn mL/s từ engine. |
| `stop` | handle nguồn/hiệu ứng | Dừng phần điều khiển thuộc handle. Nhiệt tồn dư và giọt thật tiếp tục tiến triển; không xóa lịch sử vật chất. |

Mọi hàm trả kết quả có `ok`, `vesselId`, mã lý do ổn định và handle nếu cần. Phân biệt ID không tồn tại, bình vỡ, bình khóa, bình kín, thiếu chất, tham số sai và mô hình chưa hỗ trợ. Không trả thành công cho preset chỉ có thông tin tham khảo.

Chuẩn bị mẫu Studio phải là thao tác rõ ràng trên bình đang chọn. Đổi mẫu demo cần thao tác được người dùng chủ động chọn, giữ ID/hình học/vị trí bình; không âm thầm thay hóa chất khi chỉ gọi hiệu ứng. Thiếu bình thì yêu cầu chọn/tạo bằng nút riêng. Dừng và giải phóng controller/particle/audio cũ khi thay mẫu; không để phản ứng cũ tiếp tục ghi vào mẫu mới.

## Mô hình vật lý và giới hạn

### Sôi và bay hơi

Nhiệt độ bão hòa phụ thuộc áp suất; không coi 100 °C là ngưỡng chung. Phân biệt thoát khí hòa tan, bọt hơi và khí phản ứng. Năng lượng dùng tăng nhiệt, chuyển pha và tổn thất phải dùng chung một ledger. Bay hơi dưới điểm sôi dùng chênh lệch áp suất riêng phần, diện tích tiếp xúc và hệ số truyền khối có đơn vị; trừ nhiệt hóa hơi tương ứng. Giới hạn bằng lượng dung môi còn lại và giải bài toán năng lượng cùng bước, không trừ khối lượng sau rồi bỏ qua làm lạnh.

Hơi nước là khí trong suốt; plume trắng biểu diễn giọt ngưng tụ khi hơi trộn/lạnh đủ. Khoảng trong suốt không được cố định cho mọi điều kiện. Chỉ render một đường plume chính để tránh cộng lớp hơi giả. Không tự dùng mô hình nước cho mọi dung môi hoặc dung dịch đậm đặc; trường hợp vượt miền hỗ trợ phải được biểu diễn trung thực.

### Đọng sương

Tính nhiệt độ thành từ trao đổi nhiệt; so với điểm sương của môi trường tiếp xúc. Mặt trong dùng hơi headspace, mặt ngoài dùng không khí phòng. Cốc lạnh có thể đọng sương bên ngoài dù không sôi. Giới hạn tăng trưởng giọt bằng nguồn hơi khả dụng, bảo toàn thể tích khi nhập giọt. Hướng trượt theo thành và trọng lực khi bình nghiêng. Giọt quay lại nước phải được ghi nhận đúng một lần; giọt bên ngoài có thể đi xuống mặt bàn. Tạo giọt/nhập giọt và quỹ đạo phải ổn định khi thay bước thời gian.

### Tràn nước

Xác định vượt mép bằng hình học bình, độ nghiêng, mặt thoáng và lượng chiếm chỗ, không chỉ `volume_ml > capacity_ml`. Dùng lưu lượng thực để tạo màng/dòng/giọt bám thành. Tách lượng đang bay, lượng còn trên thành và lượng đã xuống bàn; mỗi lượng chỉ được ghi nhận một lần. Sự kiện VFX là thông báo từ engine, không phải nguồn cấp nước thứ hai.

## Tiêu chí nghiệm thu và kiểm thử

1. Với hai bình A/B, chọn B rồi gọi liên tục các hiệu ứng: tập ID và số bình không đổi; A không đổi; mọi handle/sự kiện có ID B.
2. ID sai hoặc bình vừa bị xóa không tạo mẫu/fallback. Bình vỡ/khóa/kín được xử lý đúng miền hỗ trợ, không bypass điều kiện.
3. Chuẩn bị liên tiếp mẫu Studio trên cùng bình không tạo thêm bình, không thay hình học/vị trí và không để controller cũ hoạt động.
4. Ngân sách nhiệt kiểm tra tăng nhiệt đến bão hòa, nhiệt hóa hơi, cạn nước và làm lạnh do bay hơi. Khối lượng/thể tích/moles không âm và hữu hạn.
5. Tăng RH ở cùng điều kiện làm giảm bay hơi trong miền mô hình; tăng diện tích làm tăng tốc độ trong cùng chế độ. Áp suất thay đổi làm thay đổi ngưỡng sôi theo tương quan được chọn.
6. Thành ấm hơn điểm sương không tăng condensate; thành lạnh hơn có tăng từ nguồn hữu hạn. Kiểm tra riêng sương ngoài cốc lạnh và sương trong headspace nóng, kể cả thu hồi qua condenser để phát hiện đếm đôi.
7. Nhập hai giọt bảo toàn tổng thể tích, không chỉ cộng bán kính. Dòng trượt vẫn bám thành khi di chuyển/nghiêng bình.
8. Overflow: khối lượng ban đầu + lượng cấp = lượng trong bình + trên thành + đang bay + trên bàn + lượng hơi thoát ròng, theo sai số số học được công bố và không đếm đôi condensate.
9. So sánh cùng thời gian mô phỏng với bước 1/30, 1/60, 1/120 s: ngân sách vật chất/năng lượng và thống kê hạt phải nằm trong dung sai được xác lập trước, dùng seed cho kiểm thử xác suất.
10. Pause giữ nguyên tiến triển; resume/timeScale dùng clock mô phỏng. Xóa/reset/thay mẫu giải phóng audio, listener, controller và particle.
11. Chạy các test liên quan Studio, thermal_state, water_phase, overflow và kiểm tra TypeScript/build bằng dependency sẵn có. Không cài package. Review diff trước kết luận.
12. Kiểm tra trực quan trong trình duyệt: hai bình cạnh nhau; nước nguội, đun nhẹ, sôi, cạn; cốc lạnh đọng sương ngoài; giọt chảy; tràn ít/nhiều và nghiêng bình. Hình ảnh không xuyên thành; ghi nhận điều kiện và giới hạn thay vì chỉ dựa test unit để khẳng định realistic.

## Nguồn nghiên cứu

- IAPWS, boiling and pressure: https://www.iapws.org/faq1/boil.html
- NOAA/NWS, phương pháp đo điểm sương qua ngưng tụ trên mặt gương lạnh: https://www.weather.gov/asos/AmbientDewPointTemperature.html

Hai nguồn trên hỗ trợ điều kiện nhiệt động cơ bản; không xác nhận các hệ số thực nghiệm và chi tiết renderer trong dự án. Các hệ số truyền nhiệt, truyền khối, pinning/contact angle, nucleation và dòng tràn cần nguồn/miền hiệu lực hoặc ghi rõ là xấp xỉ hiệu chỉnh.

## Ràng buộc giao Antigravity

Chỉ giao công việc thuận nghịch trong workspace tuyệt đối nêu trên. Không sửa sandbox/confirmation, không dùng `--dangerously-skip-permissions`, không cài package, Git writes/push, deploy, xóa phá hủy hoặc truy cập ngoài workspace. Giữ thay đổi có sẵn. Tối đa ba vòng test/fix; trả diff, lệnh test, kết quả và giới hạn để Codex review. Hiện phiên làm việc không có công cụ `antigravity_worker`; tài liệu này không chứng minh đã triển khai hoặc đã kiểm thử tính năng.
