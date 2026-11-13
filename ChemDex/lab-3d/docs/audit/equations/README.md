# Audit toàn bộ phương trình hiện có

Toàn bộ kho tra cứu, chương trình 3D, quy tắc bộ giải, bài học và 18 trường hợp quy tắc carbonate. Phương trình AI sinh theo yêu cầu không thuộc tập dữ liệu tĩnh hữu hạn này.

**Phân biệt:** bản ghi chương trình, bài học và quy tắc có thể biểu diễn cùng phương trình. Không cộng tổng bản ghi thành số phản ứng khác nhau. Không coi phát xạ/chỉ thị là phương trình phản ứng mol.

| Nguồn | Số bản ghi |
|---|---:|
| catalog | 1300 |
| deterministic | 48 |
| dynamicRules | 18 |
| lessons | 34 |
| programs | 149 |

Catalog có 1300 phương trình phân tử khác nhau; 149 chương trình được liệt kê trong chế độ tự động.

Các nhóm runtime là phân loại theo biểu diễn/sản phẩm/điều kiện của chương trình; nhóm catalog là phân loại hóa học được khai báo. Một phản ứng có thể đồng thời tạo khí, tạo rắn và oxi hóa–khử.

## Phân loại đầy đủ

| Nhóm | Số bản ghi | Chi tiết |
|---|---:|---|
| Muối amoni và kiềm · ammonium_base | 33 | [Danh sách](ammonium_base.md) |
| Chất lưỡng tính · amphoteric | 5 | [Danh sách](amphoteric.md) |
| Cacbonat và axit · carbonate_acid | 91 | [Danh sách](carbonate_acid.md) |
| Phân hủy có xúc tác · catalytic_decomposition | 2 | [Danh sách](catalytic_decomposition.md) |
| Cháy hoàn toàn · combustion | 30 | [Danh sách](combustion.md) |
| Pha loãng · dilution | 1 | [Danh sách](dilution.md) |
| Kim loại đẩy kim loại · displacement | 132 | [Danh sách](displacement.md) |
| Phát xạ ngọn lửa · emission | 3 | [Danh sách](emission.md) |
| Cân bằng · equilibrium | 1 | [Danh sách](equilibrium.md) |
| Este hóa · esterification | 16 | [Danh sách](esterification.md) |
| Tạo khí (chương trình) · gas_evolution | 35 | [Danh sách](gas_evolution.md) |
| Chỉ thị · indicator | 3 | [Danh sách](indicator.md) |
| Kim loại và axit · metal_acid | 27 | [Danh sách](metal_acid.md) |
| Axit – bazơ · neutralization | 115 | [Danh sách](neutralization.md) |
| Chuyển hóa hữu cơ · organic_conversion | 8 | [Danh sách](organic_conversion.md) |
| Oxit và axit · oxide_acid | 106 | [Danh sách](oxide_acid.md) |
| Kết tủa · precipitation | 601 | [Danh sách](precipitation.md) |
| Oxi hóa – khử · redox | 10 | [Danh sách](redox.md) |
| Thủy phân este trong kiềm · saponification | 48 | [Danh sách](saponification.md) |
| Tạo chất rắn (chương trình) · solid_formation | 42 | [Danh sách](solid_formation.md) |
| Mô hình, bài học và quy tắc chuyên biệt · specialized | 146 | [Danh sách](specialized.md) |
| Sunfua và axit · sulfide_acid | 12 | [Danh sách](sulfide_acid.md) |
| Sunfit và axit · sulfite_acid | 15 | [Danh sách](sulfite_acid.md) |
| Tổng hợp · synthesis | 22 | [Danh sách](synthesis.md) |
| Nhiệt phân · thermal | 45 | [Danh sách](thermal.md) |

[Dữ liệu audit đầy đủ](all-equations.json)

Các lỗi cấu trúc được báo ở validation trong JSON. Những thuộc tính chưa có dữ liệu hiệu chuẩn được giữ là chưa xác nhận, không tự gán đạt thực nghiệm.
