# Pha loãng · 1 bản ghi

| Nguồn / ID | Phương trình | Cân bằng | Phạm vi chạy |
|---|---|---|---|
| programs / water_into_h2so4 | H2SO4(conc) + H2O(l) -> H2SO4(aq) + H2O(l) | Đạt cấu trúc | dedicated_program · tự động |

## water_into_h2so4 (programs)

H2SO4(conc) + H2O(l) -> H2SO4(aq) + H2O(l)

- Điều kiện: {}
- Phân loại: dilution, specialized_model
- Giải thích: Nhiệt hiđrat hóa và trộn dung dịch làm tăng nhiệt độ; chỉ phát hiệu ứng sôi khi trạng thái nhiệt trong mô hình đạt điều kiện. Luôn theo quy trình rót axit vào nước.
- Quan sát: Pha loãng axit tỏa nhiệt. Đổ nước vào axit đặc có nguy cơ nóng cục bộ và bắn axit; mức độ phụ thuộc lượng, nồng độ, tốc độ trộn và tản nhiệt, không mặc định nổ.
- Nguồn: [RSC: Preparing salts by neutralisation of oxides and carbonates](https://edu.rsc.org/experiments/preparing-salts-by-neutralisation-of-oxides-and-carbonates/1762.article)
- Giới hạn: Kinetic time and RGB values are illustrative. Enthalpy and activities are not experimentally calibrated for every reagent concentration.
