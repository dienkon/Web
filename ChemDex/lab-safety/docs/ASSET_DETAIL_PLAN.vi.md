# Nâng cấp chi tiết từng asset — 27/10/2026

Phạm vi đã thực hiện là rà và phát triển **toàn bộ asset phòng thí nghiệm**, từng loại một: cấu tạo, vật liệu, điểm tựa và vị trí trong phòng. Khung thực hành giữ cố định khi đổi bước, mở hướng dẫn và phóng vùng chơi.

## Quy trình cho từng asset

1. Đọc model đang dùng và xác định tất cả vị trí xuất hiện: trong phòng, tình huống, kệ, tay cầm, bàn mô phỏng.
2. Ghi đặc điểm nhận diện và phần cấu tạo cần thấy; chọn hình học phù hợp. Kích thước trong game là tỷ lệ mô hình, không phải thông số chứng nhận thiết bị thật.
3. Dựng hình có miệng/đáy/thành phù hợp, điểm tựa đúng, vật liệu phân biệt kính–kim loại–cao su–vải. Vật chứa không dùng khối đặc giả khoang rỗng.
4. Giữ hình học nhỏ vừa đủ đọc được ở khoảng chơi, tái sử dụng geometry/model; không bật truyền sáng tốn thêm render pass cho mọi vật kính.
5. Kiểm tra chính diện, góc ba phần tư, phía sau và từ trên trong phòng xem asset riêng. Đo biên, đáy tiếp xúc, phần nhô, hình học lỗi/NaN, draw call và texture.
6. Gắn lại vào scene thực; kiểm tra không trùng hai phiên bản, không xuyên kệ/bàn/nhau, giữ interaction ID và hành vi.
7. Chỉ đánh dấu đạt sau ảnh render và kiểm tra tích hợp. Asset chưa được kiểm tra vẫn để mở.

## Danh mục bắt buộc

| Nhóm | Asset cần xử lý riêng | Kết quả |
| --- | --- | --- |
| Thủy tinh | Cốc có mỏ, ống đong, bình tam giác, bình chịu hút, ống nghiệm, chai thuốc thử trong, chai màu hổ phách | Đã rà/dựng và kiểm chứng |
| Định lượng | Pipet chia vạch, bóng hút, buret/khóa/giá, điện cực | Đã rà/dựng và kiểm chứng |
| Dụng cụ nhỏ | Giá ống có lỗ thật, khay pipet có gối đỡ, kẹp cách nhiệt, bình tia và ống hút trong bình, ống mềm/đầu nối, mảnh vỡ | Đã rà/dựng và kiểm chứng |
| Thiết bị | Cân có buồng chắn, bếp khuấy/gia nhiệt, máy pH/tay điện cực, ly tâm/nắp/rotor, Bunsen/van/vòng gió, đèn cồn/nắp | Đã rà/dựng và kiểm chứng |
| Bảo hộ | Áo blouse, móc treo, kính/đệm/đai, găng/cổ găng, hộp găng/miệng lấy, khẩu trang/nếp/đai, dây tóc, ba lô/quai/khóa | Đã rà/dựng và kiểm chứng |
| Trạm cố định | Tủ hút rỗng/khe hút/cửa, bồn rửa rỗng/vòi/xả, tủ PPE, tủ hóa chất/kệ/khay, bàn/ngăn/ray, ghế/chân/vòng để chân | Đã rà/dựng và kiểm chứng |
| Khẩn cấp | Vòi tắm/đầu phun/tay kéo, rửa mắt/chụp, bình CO₂/vòi/chốt, bình bột/đồng hồ, chăn/đai, hộp sơ cứu/phụ kiện, thùng bộ tràn/bánh/nắp/dụng cụ | Đã rà/dựng và kiểm chứng |
| Chất thải | Thùng rắn/bàn đạp/nắp, can lỏng/nắp/phễu kín, hộp kính, hộp vật sắc/khe/vạch chứa | Đã rà/dựng và kiểm chứng |
| Phòng & chỉ dẫn | Cửa/bản lề/thanh đẩy, cửa sổ/khung, tường/sàn/nẹp, đèn/trần/khung tán sáng, thông gió/lưới, báo khói, đồng hồ/kim/vạch, bảng GHS/nội quy/sơ đồ/bảng tuần hoàn/bút/khay | Đã rà/dựng và kiểm chứng |
| Nhân vật & vật cầm | Bàn tay/PPE, bình/vòi trong tay, chổi/hốt/túi khi cầm, model học sinh/giáo viên và chỗ tiếp xúc | Đã rà/dựng và kiểm chứng |

## Phát hiện ban đầu đã xử lý

- Cốc và ống nghiệm có nhiều bản khác nhau giữa `Benches`, `ApparatusDetails`, `ScenarioProps`, `StorageCabinets`; vạch chia, miệng và đáy không đồng nhất.
- Giá ống nghiệm hiện dùng tấm đặc, ống xuyên qua mặt tấm; cần lỗ có hình học thật và đáy đỡ riêng.
- Bình tam giác trên bếp đang ghép nón đặc và cổ riêng; cần profile thành kính liên tục, miệng mở và mực dung dịch bên trong.
- Cân có buồng kính là một hộp đặc trong suốt, màn hình chỉ có mảng màu; thiếu mặt kính riêng, ray, nút và chân cân.
- Thân tủ hút hiện là khối đặc bọc cả buồng; bồn rửa cũng là khối hộp đặc. Đây là lỗi cấu tạo cần sửa trong nhóm trạm.
- Vòng chân ghế đang dựng đứng; tủ PPE dùng hộp thay áo/kính; nhiều bảng chỉ có nền màu trống.

## Nguồn tham khảo

- [Labconco — cấu tạo tủ hút](https://www.labconco.com/news/introducing-i-s-fume-hoods), [EIU — cấu tạo Bunsen](https://www.eiu.edu/eiuchem/forms/burner.pdf), [Haws — cụm đầu/nắp/cần](https://www.hawsco.com/wp-content/uploads/2026/02/2026_Haws_Parts_Price_List_022326.pdf): tham chiếu hình dáng/cấu tạo, không áp thông số sản phẩm thật cho game.

- [Three.js MeshPhysicalMaterial](https://threejs.org/docs/pages/MeshPhysicalMaterial.html): chi phí vật liệu kính, transmission và thickness.
- [Three.js Material](https://threejs.org/docs/pages/Material.html): transparency, depth và quản lý vật liệu.
- [RSC — danh mục dụng cụ](https://edu.rsc.org/download?ac=500794), [University of York — glassware](https://chemtl.york.ac.uk/lab/glassware): phân biệt hình dáng các loại thủy tinh, pipet và ống đong.

Không thay đổi hướng dẫn an toàn hay đưa thêm thông số vận hành thiết bị thật trong đợt làm model.

## Tiến độ đã kiểm chứng

Đã hoàn tất phạm vi danh mục: 134 mẫu/biến thể và 536 ảnh từ bốn góc. Tất cả các nhóm trong kế hoạch đã có model được rà/dựng chi tiết, gắn vào scene thực và kiểm tra lại tương tác; xem [báo cáo và bằng chứng](asset-studies/README.md).

| Đợt | Thực hiện và điều kiện đạt |
| --- | --- |
| 1 · Dụng cụ và bảo hộ | Thành/đáy/miệng, nhãn, điểm tựa; cùng model giữa bàn/kệ/tình huống; áo/kính/găng/khẩu trang và ba lô |
| 2 · Gia nhiệt | Bunsen/vòng khí/ống/van/chân kiềng/lưới; đèn cồn/bấc/nắp; chuyển trạng thái qua nút thật |
| 3 · Trạm và nội thất | Tủ hút quay đúng lối đi và collider; chậu khoét cả mặt bàn lẫn thân tủ; ngăn kéo chỉ đi một hành trình; chân ghế chạm sàn |
| 4 · Khẩn cấp và chất thải | Hai luồng nước riêng, cần/nắp theo trạng thái; hai loại bình khác cấu tạo; năm vật chứa tiếp cận riêng và có nhãn/workflow đúng |
| 5 · Kiến trúc và bảng | Cửa/cửa sổ có lỗ thật; không chồng bảng; đèn/lưới/ống/báo khói/đồng hồ; GHS/118 nguyên tố/nội quy/sơ đồ có nội dung |
| 6 · Vật cầm và nhân vật | Tay/cán/van/ống/vòi đúng điểm; chốt và cò theo mô phỏng; áo/túi/ve theo thân, đai kính/khẩu trang theo đầu; chân không nhún cả model |
| 7 · Hồi quy | Typecheck/build/core, toàn bộ thư viện bốn góc, dùng thiết bị bằng ngắm + E, dập lửa thật, 15 cảnh và UI desktop/mobile/giảm chuyển động |

Các lỗi phát hiện qua ảnh đã sửa, gồm nhãn ép chữ, tủ hút quay sai, bồn đặc, vòng ghế dựng đứng, ống khí lún bàn, cọc/đồ lơ lửng, vật chứa che nhau, vỏ đèn che tấm sáng và thanh chống gương chưa nối khung.

Các thông số là tỷ lệ mô hình trong game. Kết quả không được dùng làm thông số chứng nhận thiết bị hoặc bảo đảm FPS của thiết bị di động thật.
