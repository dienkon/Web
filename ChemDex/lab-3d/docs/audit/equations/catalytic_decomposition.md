# Phân hủy có xúc tác · 2 bản ghi

| Nguồn / ID | Phương trình | Cân bằng | Phạm vi chạy |
|---|---|---|---|
| catalog / rx_a446617e394c09e4 | 2H2O2(aq) → 2H2O(l) + O2(g) | Đạt cấu trúc | reference_only |
| programs / h2o2_mno2 | 2H2O2(aq) -> 2H2O(l) + O2(g) | Đạt cấu trúc | dedicated_program · tự động |

## rx_a446617e394c09e4 (catalog)

2H2O2(aq) → 2H2O(l) + O2(g)

- Điều kiện: {"description_vi":"Dung dịch H2O2, có MnO2 làm xúc tác; không đồng nhất với nhiệt phân MnO2.","activation":"catalyst","catalyst":"MnO2"}
- Phân loại: catalytic_decomposition, gas_product
- Giải thích: H2O2 phân hủy thành nước và oxygen. MnO2 là chất xúc tác, không phải chất phản ứng bị tiêu hao theo phương trình tổng quát.
- Quan sát: Có bọt khí O2 thoát ra; quá trình giải phóng nhiệt.
- Nguồn: [University of Washington — Decomposition of H₂O₂ with MnO₂](https://chem.washington.edu/lecture-demos/decomposition-h2o2-mno2)
- Giới hạn: Nguồn mô tả một thí nghiệm có xúc tác. Tốc độ và mức tăng nhiệt phụ thuộc điều kiện mẫu; không suy một giá trị số từ phương trình.
- Kiểm tra điều kiện: Dung dịch H2O2, có MnO2 làm xúc tác; không đồng nhất với nhiệt phân MnO2.
- Bắt đầu tại vùng tiếp xúc: Chất đầu tiếp xúc đúng xúc tác, đúng pha; gia nhiệt không thay cho xúc tác bị thiếu.
- Chuyển hóa và hiện tượng: Chất đầu phân hủy, khí được tạo và có thể thoát; xúc tác được giữ trong kiểm kê. O2(g): không màu. Phương trình không có sản phẩm rắn; không tự tạo kết tủa.
- Dừng nguồn và quan sát sản phẩm: Dừng tạo sản phẩm mới khi hết chất giới hạn, không còn điều kiện hoặc đạt cân bằng. Khí đã thoát không được sinh lại; hạt rắn đã có vẫn có thể lắng và mẫu vẫn có thể trao đổi nhiệt.

## h2o2_mno2 (programs)

2H2O2(aq) -> 2H2O(l) + O2(g)

- Điều kiện: {"activation":"catalyst","activationNote_vi":"MnO2 xúc tác phân hủy ở nhiệt độ thường; nhiệt độ và diện tích xúc tác ảnh hưởng tốc độ.","catalyst":"MnO2"}
- Phân loại: catalytic_decomposition, specialized_model
- Giải thích: MnO2 hạ thấp năng lượng hoạt hóa của phản ứng phân hủy hiđro peoxit.
- Quan sát: Sủi bọt mãnh liệt sinh khí oxi duy trì sự cháy, tỏa nhiệt ấm, bột đen MnO2 đóng vai trò xúc tác không bị tiêu hao.
- Nguồn: [Chemguide: Transition-metal chemistry](https://www.chemguide.co.uk/inorganic/transition/features.html)
- Giới hạn: Kinetic time and RGB values are illustrative. Enthalpy and activities are not experimentally calibrated for every reagent concentration.
