# Hiệu ứng phản ứng: mô hình, đối chiếu và giới hạn — 2026-11-14

Đợt này bổ sung nguồn sinh khí theo vùng phản ứng, thời điểm sinh hạt, lắng có cản trở và tích phân độ đục theo đường nhìn. Phạm vi là các hệ hiệu ứng dùng chung cho phản ứng trong catalog. Không có tuyên bố rằng từng phản ứng đã được hiệu chuẩn bằng thí nghiệm hoặc toàn bộ renderer là bộ giải vật lý chính xác.

## Kết tủa và quang học

Hạt và lớp cặn tiếp tục lấy khối lượng từ tồn kho chất rắn. Atlas quang học tái dựng từ chính các hạt đại diện đó, không tạo một hệ vật chất thứ hai. Mỗi chất đóng góp màu và độ sâu quang học riêng tại vị trí của nó. Vì thế một đám xanh và một đám nâu còn có thể phân biệt trước khi khuấy trộn, thay vì tô một màu trung bình lên toàn cốc.

Shader tích phân dọc tia nhìn bằng quan hệ truyền sáng:

```text
τ_đoạn = τ_tham_chiếu × chiều_dài_đoạn / 0,01 m
T_đoạn = exp(−τ_đoạn)
T_toàn_đường = tích(T_đoạn)
α = 1 − T_toàn_đường
```

Đây là quan hệ suy giảm chùm sáng trong môi trường tham gia tán xạ được mô tả ở [PBRT, chương Transmittance](https://www.pbr-book.org/4ed/Volume_Scattering/Transmittance). Tích phân số có sai số khi mật độ biến đổi trong một bước lấy mẫu. Nó không thay thế mô hình đa tán xạ hoặc đo độ đục. [IUPAC phân biệt độ đục với sự hấp thụ thực](https://goldbook.iupac.org/terms/view/T06533).

Những sửa đổi cụ thể:

- Lưu độ sâu quang học tuyến tính cùng RGB có trọng số bằng atlas half-float; không nén đám đặc vào alpha 8-bit trước khi tích phân.
- Dùng chiều dài vật lý theo scale dụng cụ và mốc 1 cm. Cốc lớn hơn có đường nhìn dài hơn tại cùng nồng độ.
- Tia của camera trực giao song song đúng hướng camera; không dựng tia giả phối cảnh từ vị trí camera.
- Tích phân 12 điểm từ phía gần đến phía xa, dùng contour thành cốc và mặt chất lỏng/vortex để loại phần ngoài nước.
- Tính phần chiều dài mỗi đoạn thật sự nằm trong thành trụ và dưới mặt phẳng nước, để đường nhìn sát mép không nhảy theo từng bước lấy mẫu. Thành côn được xấp xỉ bằng bán kính cục bộ trong đoạn; mặt vortex vẫn dùng kiểm tra điểm giữa.
- Mở rộng stencil nội suy ngay ngoài biên ướt, còn shader cắt theo biên thật. Cách này bỏ lớp trong suốt giả do trộn nút khô bằng 0 ở sát thành.
- Với lớp nước nghiêng quá mỏng không chứa nút lưới nào, dùng độ sâu quang học khối và cắt theo hình học thật. Độ sâu vượt miền half-float được co đồng tỷ lệ cả bốn kênh để giữ màu, với trần 65504; không khẳng định chính xác độ truyền sáng ở quang lộ cực ngắn trong miền đã cắt này.
- Atlas được dựng lại ở 15 Hz và tái sử dụng bộ nhớ; texture chỉ tải lại khi phiên bản dữ liệu thay đổi. Đây là ngân sách hiển thị, không phải độ phân giải CFD.

Hệ số quang học và RGB từng chất vẫn là minh họa chưa hiệu chuẩn. Chưa có NTU/FNU, phổ tán xạ, phụ thuộc bước sóng, phân bố kích thước đo được hay khúc xạ tia bên trong từng bông kết tủa. Kích thước glyph được phóng đại để nhìn thấy; bán kính dùng trong phương trình lắng là bán kính vật lý riêng.

## Nồng độ, khuấy và lắng

Hạt đặc có profile phù hợp dùng xấp xỉ cầu tương đương ở Reynolds nhỏ, trong đó nồng độ tăng làm vận tốc trượt giảm. Tổng thể tích lơ lửng tính trên nhiều chất và loại phần đã thành cặn. Không áp cùng tương quan này cho gel, bông xốp, phiến tinh thể hoặc chất chưa có profile. Nguồn, công thức và cờ ngoài miền được ghi ở [tài liệu lắng theo nồng độ](concentration-settling-2026-11-14.vi.md).

Đũa khuấy, vortex và hạt tiếp tục dùng chung trạng thái tiếp xúc/khuấy. Kiểm tra trình duyệt bao gồm đầu đũa nằm trong nước, không xuyên đáy/thành, dừng khi tạm dừng, và không khuấy cốc đã lật. Lắng, khuấy bật cặn và hòa tan vẫn bảo toàn tồn kho như đợt [sửa kết tủa và đũa khuấy](precipitate-stirring-fidelity-2026-11-14.vi.md). Dòng khuấy là trường vận tốc tham số; chưa giải Navier–Stokes hay va chạm từng hạt.

## Bọt phản ứng, hơi nước và ngưng tụ

Bọt hơi do đun và bọt khí do phản ứng có nguồn riêng. Phản ứng dị thể lấy vị trí trên phần bề mặt ướt của chất phản ứng/xúc tác; phản ứng dung dịch có thể lấy vùng tiếp xúc dòng rót. Khi không có vùng cục bộ được giải, nguồn đồng nhất trong nước là xấp xỉ được khai báo. Chất rắn không tham gia phản ứng không được dùng làm nguồn khí tùy tiện. Các glyph là mẫu hiển thị của thông lượng, không phải từng bọt đo thực nghiệm.

Hạt mới sinh chỉ nhận chuyển động, tuổi và trao đổi pha trong phần thời gian sau khi nó ra đời trong bước 1/120 s. Điều này bỏ sai số cho hạt cuối bước được di chuyển như đã tồn tại từ đầu bước. Nguồn sinh luôn kiểm tra giới hạn vật chứa.

Hệ số dẫn nhiệt của nước dùng [IAPWS SR6-08(2011)](https://iapws.org/technical-guidance/release/LiquidWater), phương trình 8, trong miền nhiệt độ được công bố. Ngưng tụ dùng nhiệt độ màng làm đầu vào. Ngoài miền áp dụng có hệ số tham chiếu được khai báo; không ngoại suy và gắn nhãn là IAPWS. Mô hình ngưng tụ vẫn là giới hạn dẫn nhiệt quanh cầu, chưa giải lớp biên nhiệt/khối theo thời gian. Hơi nước khí là vô hình; các puff nhìn thấy là minh họa sương giọt ngưng tụ, không phải màu của H₂O khí.

## Kiểm tra có thể chạy lại

`scripts/auditSuspensionOptics.mjs` chạy shader thật trên Chrome/WebGL, tắt ánh sáng và tone mapping ở fixture để so trực tiếp pixel với công thức giải tích. Với alpha tham chiếu 0,4, bốn đường dài 0,5/1/2/4 cm cho alpha lý thuyết 0,225403/0,4/0,64/0,8704. Sai số cho phép 0,015 bao gồm lượng tử pixel và nội suy; kết quả lưu ở `artifacts/suspension-optical-reference/audit.json`. Fixture còn đảo trước/sau hai lớp màu, dịch camera trực giao, kiểm tra dây cung sát mép tại 0,5/0,9/0,98 bán kính, và phân biệt τ=20 với τ=40 qua đường dài 0,5 mm. Lượt kiểm tra đạt sai số alpha tối đa dưới 0,003 ở các trường hợp giải tích này.

`scripts/auditPrecipitateFidelity.mjs` kiểm tra AgCl, Cu(OH)₂, Fe(OH)₃, BaSO₄, PbI₂, CaCO₃ trong renderer thật: có hạt hữu hạn đang chuyển động, đúng khối lượng, tạm dừng đứng thời gian, khuấy có vortex, hòa tan xóa hệ hạt. `scripts/auditStirringRod.mjs` kiểm tra cây đũa qua các trạng thái tiếp xúc. Các bài kiểm tra đại diện này không đồng nghĩa đã quan sát thực nghiệm mọi phản ứng trong catalog.

`scripts/auditReactionGasSources.mjs` mở giao diện tự động thật cho Zn/HCl và H₂O₂/MnO₂, chạy đến khi có bọt, kiểm tra nguồn ướt, giới hạn 128 vùng nguồn, các tọa độ hữu hạn và không nhầm bọt phản ứng với hơi sôi. Báo cáo và ảnh lưu ở `artifacts/reaction-gas-sources/`; cả hai bài qua, không có lỗi JavaScript/shader.

Các kiểm tra đơn vị bao gồm độ sâu quang học cộng được, nồng độ cao, màu từng chất, cản trở lắng theo nồng độ, nguồn khí theo chất phản ứng, tuổi hạt mới sinh và giá trị bảng IAPWS. Báo cáo trình duyệt là bằng chứng chạy renderer; kiểm tra công thức là bằng chứng miền số học; việc hiệu chuẩn theo thực nghiệm vẫn là công việc riêng.

Kết quả cuối ngày 14/11/2026: **3.319 test / 245 file đều qua**, `npm run lint` và `npm run build` đều thành công. Build còn cảnh báo kích thước một số chunk trên 500 kB. Bốn audit trình duyệt nêu trên đều qua; không có lỗi JavaScript hoặc shader được ghi nhận. Đây là kiểm chứng trên Chrome máy phát triển, chưa phải benchmark GPU/điện thoại hay xác nhận số liệu thí nghiệm.
