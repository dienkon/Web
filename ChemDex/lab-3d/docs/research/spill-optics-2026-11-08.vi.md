# Quang học vũng tràn — 2026-11-08

## Vấn đề và thay đổi

Vũng tràn trước đây dùng `transmission=0.86`, `opacity=0.88`, `clearcoat=1`, màu kho đặt trực tiếp lên vật liệu và không khai báo bề dày. Nước trong vẫn có phần nền khuếch tán trắng và thêm lớp phủ phản xạ; mẫu chìm bị mờ như nhìn qua nhựa. Màu không thay đổi theo bề dày cục bộ.

Đường vẽ mới giữ nguyên hình học Young–Laplace, thể tích, kho chất, seed và thời gian. Chế độ medium/high/ultra dùng một mặt phân cách với `transmission=1`, `opacity=1`, không thêm clearcoat. Độ bóng bề mặt dùng roughness 0,025 (tham số minh họa). Màu đi vào hệ số hấp thụ RGB, dùng attenuation theo đường sáng thay cho nhuộm màu khuếch tán.

## Quy ước và giới hạn quang học

- Màu kho hiện có không kèm phổ hoặc cự li đo. Quy ước minh họa: độ truyền tuyến tính RGB của màu đó được diễn giải tại cự li 1 cm. `LiquidOptics.absorbance` chưa làm tròn được ưu tiên khi còn khớp màu; không ghi lại đại lượng nào vào inventory. Hệ số theo mét là `A / 0,01`; độ truyền theo đường dài `L` là `exp(-A*L/0,01)`. Giới hạn A=80 chỉ để số shader hữu hạn ở miền đã tối gần hoàn toàn.
- IOR 1,333 là xấp xỉ nước giống đường chạy cũ, chưa phải mô hình IOR của từng chất hay nhiệt độ/bước sóng. Phản xạ Fresnel ở phương vuông góc tương ứng khoảng 2,04%; góc nghiêng dùng xấp xỉ Schlick. Hệ số màu, roughness và IOR không được gắn nhãn hiệu chuẩn thực nghiệm.
- Bề dày lấy từ tọa độ y thật của mesh vũng. Hướng tia khúc xạ xác định quãng đường tới mặt đỡ ngang; có chặn trên bằng đường chéo của bao thể tích. Ở mép cong/góc rất thấp, chưa giải chính xác điểm thoát qua mặt bên. Chưa rút ngắn đường hấp thụ khi tia gặp mặt trên của vật rắn chìm trước mặt bàn. Không có tán sắc, hấp thụ phổ đo được hoặc tán xạ nhiều lần của huyền phù.
- Hệ số tính bằng SI, còn bề dày và attenuationDistance đổi sang thước cảnh 0,035 m/đơn vị tại biên renderer. Mặt vũng không bị phóng to để dễ nhìn.
- Low/potato dùng hai lượt vẽ cục bộ: nhân hệ số truyền lên nền đã vẽ, rồi cộng phản xạ bề mặt. Không yêu cầu transmission render target của Three cho các vũng này. Có bù gamma gần đúng khi nhân trên framebuffer hiển thị; chưa có khúc xạ dịch ảnh và phép cộng ánh sáng đầy đủ trong không gian tuyến tính như đường chất lượng cao. Các vật liệu kính khác trong lab vẫn có thể yêu cầu lượt transmission của cả cảnh; không tuyên bố loại bỏ lượt đó trên toàn ứng dụng.
- Thay màu khi pause cập nhật vật liệu ngay theo snapshot mới, không chờ đồng hồ mô phỏng chạy lại. Đổi mức chất lượng chỉ thay vật liệu; hình học, lượng chất và phản ứng được giữ nguyên.

## Kiểm tra và bằng chứng

`tests/spill_optics.test.ts` kiểm tra mẫu có độ truyền tham chiếu 1/2 và 1/4, ghép hai đường sáng liên tiếp, mép bề dày bằng không, pha loãng giữ absorbance chưa làm tròn, receipt lỗi thời, Fresnel và chuyển đổi SI/cảnh. Các test hình học vũng hiện có tiếp tục đối chiếu thể tích với nghiệm độc lập; shader không thay vị trí đỉnh.

`scripts/auditSpillOptics.mjs` dựng ba vũng 10 mL (không màu, xanh, hổ phách) trên các ô đen/trắng opaque tại mặt đỡ. Lấy pixel từ ảnh Chrome đã hiển thị, không chỉ kiểm tra tên shader. Các màu xanh/hổ phách trong fixture là màu minh họa do audit chỉ định, không phải màu do nước tinh khiết tự sinh ra. Các marker là dụng cụ kiểm tra đồ họa, không phải chất được thêm vào lab.

Ảnh và JSON trước/sau ở `artifacts/spill-optics`. Audit so sánh chênh lệch độ sáng trung bình giữa 18 ô trắng và 18 ô đen chìm dưới vũng trong cùng bố trí. Với nước không màu, độ tương phản tăng khoảng 2,90 lần ở low desktop, 2,67 lần ở high desktop và 3,49 lần ở low viewport cảm ứng. Đây là chỉ số khả năng nhìn mẫu của fixture, không phải độ chính xác quang phổ hoặc sai số vật lí ≤1%.

Hai mươi lần đổi high/low sau khi làm nóng bộ dựng giữ nguyên 858 GPU buffer và 214 geometry trong phép thử Chrome desktop. Không đổi inventory, không có lỗi trang/console hay mất WebGL. Số draw call tại fixture low tăng 301 lên 304 do thêm một pass phản xạ cho mỗi vũng; các vật liệu truyền sáng khác của cảnh vẫn còn, vì vậy không suy diễn FPS cả lab từ số pass của riêng vũng. Viewport cảm ứng là mô phỏng trên máy tính, chưa phải phép đo điện thoại thật.

Audit đổi màu xanh sang hổ phách ngay trong lúc pause và kiểm tra pixel ô trắng đổi theo, sau đó trả lại mẫu trước khi kiểm tra inventory. Audit hạt rắn thực trong `artifacts/spill-optics/contacts` giữ phép kiểm tra rơi vào vũng mới phản ứng, nguồn khí hữu hạn, pause/khôi phục và xóa không hồi sinh chất. Audit production riêng dùng shaderSource/compileShader của WebGL để xác nhận bản bundle biên dịch thành công cả đường hấp thụ nhẹ và đường khúc xạ; đổi mức chất lượng bằng combobox thật trên cả desktop và viewport cảm ứng.

Kiểm tra của mốc này: 36 test liên quan qua, TypeScript qua, build qua. Ba trường hợp dev quang học, hai trường hợp dev tiếp xúc và ba trường hợp production quang học không có pageerror/console error hoặc mất WebGL. Không dùng các kết quả này thay cho đo màu phổ, tán xạ huyền phù, IOR theo thành phần hoặc tiêu chí FPS toàn cảnh của lộ trình lớn.

Tài liệu đối chiếu API: [MeshPhysicalMaterial](https://threejs.org/docs/pages/MeshPhysicalMaterial.html) và mã nguồn Three 0.185.1 đang khóa trong repository. Tài liệu web có thể mô tả bản mới hơn; shader được kiểm tra với bản cài thực tế. Tài liệu yêu cầu opacity=1 khi dùng transmission và phân biệt đơn vị bề dày local với attenuationDistance world.
