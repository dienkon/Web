# Kết tủa hydroxide dạng keo

Đối chiếu 23/10/2026.

## Nguồn và yêu cầu hóa học

- [University of Helsinki — Water and Hydroxide Ion](https://blogs.helsinki.fi/inorganic-kvali/water-and-hydroxide-ion/): Al(OH)₃ trắng dạng keo và Zn(OH)₂ trắng; hydroxide dư tạo phức hydroxo hòa tan. Các hằng số và cửa sổ pH phụ thuộc chất và pha rắn, không phải một ngưỡng chung.
- [University of Washington — Amphoteric Nature of Aluminum Hydroxide](https://chem.washington.edu/lecture-demos/amphoteric-nature-aluminum-hydroxide): huyền phù Al(OH)₃ tan với axit hoặc kiềm trong thí nghiệm minh họa.
- [Sigma-Aldrich — Aluminum hydroxide](https://www.sigmaaldrich.com/SC/en/product/sigald/239186): mật độ vật liệu 2,42 g/cm³ tại 20°C.
- [Chem-Impex qua Sigma-Aldrich — Zinc hydroxide](https://www.sigmaaldrich.com/US/en/product/chemimpexinternationalinc/ch6945316505): 3,053 g/mL tại 25°C; profile làm tròn 3,05.

Phương trình ion: Al³⁺ + 3OH⁻ → Al(OH)₃(s); Zn²⁺ + 2OH⁻ → Zn(OH)₂(s). Trong kiềm dư, Al(OH)₃ + OH⁻ → [Al(OH)₄]⁻; Zn(OH)₂ + 2OH⁻ → [Zn(OH)₄]²⁻. Đây là mô tả đường phản ứng; thay đổi đồ họa này không tự thêm bộ giải cân bằng phức hoàn chỉnh.

## Đã thay đổi

Al(OH)₃ và Zn(OH)₂ không còn rơi về profile BaSO₄. Cu(OH)₂ cũng dùng morphology gel. Renderer có mesh keo 3D bo tròn không đều, không kim loại, bán trong suốt; góc nhìn camera không xoay cả hạt như billboard. Mesh được tái sử dụng và dispose khi component tháo. Kích thước nằm trong bao va chạm hiện có, tránh mở rộng hình học xuyên kính.

Hạt vẫn do lượng rắn trong tồn kho điều khiển; khi pha rắn mất đi, hạt và độ đục bị xóa. Không tự cho keo tan chỉ vì xuất hiện nhãn NaOH hoặc NH₃. Các profile mới được bộ kiểm tra vòng đời chạy qua thu nhỏ khi tan và bảo toàn lượng chất.

## Giới hạn

Mesh là glyph của cụm keo, chưa phải mạng gel được giải vật lý. Opacity, kích thước và hệ số kết bông là tham số minh họa. Mật độ vật liệu khô không phải mật độ hiệu dụng của bông ngậm nước; mô hình lắng và độ xốp cặn kế thừa chưa hiệu chuẩn. Chưa mô phỏng liên kết mạng, phá bông do shear, phân bố tuổi hạt hoặc đồng kết tủa. Chưa kiểm chứng GPU.
