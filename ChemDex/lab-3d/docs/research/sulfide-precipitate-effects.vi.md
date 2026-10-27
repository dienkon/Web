# CuS, PbS và ZnS

Đối chiếu 23/10/2026. CuS/PbS dùng profile bột đen riêng; ZnS trắng. Phương trình ion hình thức M²⁺ + S²⁻ → MS(s), M = Cu, Pb, Zn. Trong dung dịch thực, phân bố H₂S/HS⁻/S²⁻ phụ thuộc pH; không coi phương trình này là bộ giải tạo kết tủa đầy đủ.

## Nguồn

- [University of Washington — Lead Sulfide Precipitate](https://chem.washington.edu/lecture-demos/lead-sulfide-precipitate): quan sát kết tủa PbS đen.
- [SAASTA — Chemistry](https://www2.saasta.ac.za/wp-content/uploads/2015/11/chemistry_2005-20061.pdf): CuS đen và ZnS trắng trong phép thử sulfide.
- [Sigma-Aldrich — Copper(II) sulfide](https://www.sigmaaldrich.com/US/en/product/aldrich/342467): mật độ vật liệu CuS 4,6 g/mL ở 25°C.
- [PubChem — Zinc sulfide](https://pubchem.ncbi.nlm.nih.gov/compound/zinc_sulfide): mật độ khác nhau theo dạng tinh thể. Profile hiện dùng 4,09 g/cm³; chưa có chọn đa hình.

PbS giữ mật độ 7,6 g/cm³ từ bảng dữ liệu nội bộ; chưa thêm nguồn sơ cấp kiểm chứng riêng trong lượt này. Không sử dụng mật độ vật liệu để khẳng định mật độ bông kết tụ ngậm nước.

## Hiển thị và vận chuyển

Thêm `displayRadius_scene` cho phép phóng đại glyph nhưng không tăng bán kính trong tính lực cản. Bán kính vật lý mẫu CuS 50 nm, PbS/ZnS 100 nm là giả định minh họa; kích thước thực phụ thuộc quá bão hòa, điều kiện trộn và kết tụ. Với giả định này, hạt còn lơ lửng trong khoảng kiểm tra và không bị ép rơi bởi kích thước hiển thị. Khối lượng mỗi glyph vẫn đại diện một phần hữu hạn của tổng lượng kết tủa.

Chưa có động học tạo mầm/kết tụ của riêng các sulfide; chưa giải Brownian định lượng, cân bằng sulfide theo pH, oxy hóa hoặc chuyển đa hình. Bổ sung profile không đồng nghĩa hoàn tất cơ chế thực nghiệm. Các kiểm tra CPU không chứng minh hình ảnh GPU.

23 ca liên quan đạt. Bảng độ phủ cập nhật: 17/42 chương trình có profile riêng; 25 chương trình vẫn cần bổ sung, không còn sai danh tính do fallback.
