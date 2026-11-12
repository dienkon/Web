# Ảnh ứng dụng, đối chiếu mạng tinh thể và bố cục nguyên tố

Ngày rà soát: 2026-11-12. Mốc Git trước đợt này: `3ebff2cd`. Phạm vi là cập nhật nối tiếp bộ kiểm duyệt 118 tài liệu gốc, ảnh tự nhiên và thư viện đã thực hiện trong các commit `de8bf50b`, `4eece242`, `3ebff2cd`.

Đã commit và push phần triển khai lên `main`: `1085ea003933064afa5f9a928cac1f64958657a0` (688 file). [Xác nhận Git](git-verification.json) ghi kết quả đối chiếu remote và phạm vi file; báo cáo xác nhận được đưa lên bằng commit tài liệu nối tiếp.

Đã cập nhật cả 118 trang nguyên tố. Cấu hình electron và mạng tinh thể chiếm hai hàng riêng có đủ chiều rộng trên desktop lẫn điện thoại. Ảnh ứng dụng có nguồn, tác giả, giấy phép ngay dưới ảnh. Bộ mô hình dùng metric ô mạng, nhóm không gian và tọa độ cụ thể; từng trang có phần đối chiếu Wikipedia và ghi rõ pha được chọn.

## Số lượng đã đối soát

| Hạng mục | Kết quả |
| --- | --- |
| Trang nguyên tố / bản tham chiếu Wiki | 118 / 118 |
| Mục ứng dụng từ dữ liệu nhập | 676, gồm cả ghi chú giới hạn và mục không có ứng dụng công nghiệp |
| Mục có ảnh minh họa lĩnh vực | 458 |
| Trang có ít nhất một ảnh ứng dụng | 118 |
| Chủ đề ảnh / file tải về có kiểm tra SHA-256 | 103 / 101 |
| Mục dùng chung chủ đề đã xuất hiện trong trang | 86, không lặp lại ảnh |
| Mục chưa gán ảnh đặc thù đã kiểm chứng | 117 |
| Mục chỉ có đường dẫn nguồn phù hợp | 15 |
| Cấu trúc có JSON, CIF, GLB và PNG | 133 |
| Pha khoáng vật / pha đơn chất | 51 / 82 |
| Trong 82 pha đơn chất | 75 bộ tọa độ công bố; 7 prototype lý tưởng có thông số tham chiếu |
| Mô hình đã render kiểm tra | 133, không lỗi |

Ảnh minh họa lĩnh vực không chứng nhận sản phẩm cụ thể trong ảnh chứa nguyên tố đó. Với nguyên tố tổng hợp, ảnh nghiên cứu chỉ minh họa môi trường nghiên cứu; không biến thành tuyên bố có sản phẩm thương mại. Không có dữ liệu đủ để dựng ô mạng thì trang ghi rõ giới hạn, không thay bằng một khối lập phương tùy ý.

## Đối chiếu và sai sót đã xử lý

- **α-Mn:** mạng Bravais tâm khối nhưng cơ sở phức tạp, 58 nguyên tử/ô quy ước, 29/ô nguyên thủy. Dùng AMCSD 0009311 với bốn vị trí bất đối xứng; không dùng mẫu BCC hai nguyên tử.
- **DHCP:** Pm, Am, Cm, Bk và các pha liên quan giữ bốn lớp ABAC, bốn nguyên tử/ô. Không đồng nhất với HCP hai lớp AB. Pa giữ tứ phương tâm khối, `a=b≠c`.
- **Ra:** infobox Wiki ghi BCC nhưng Pearson `cF4` không nhất quán. Dựng `Im-3m`, `cI2`, a=5,148 Å theo mô tả và đối chiếu [WebElements](https://www.webelements.com/radium/crystal_structure.html); hiển thị mâu thuẫn trong trang và audit.
- **P và I:** hai nguồn đổi thứ tự trục b/c. Đối chiếu theo hoán vị trục, giữ nguyên metric và tọa độ CIF; không kết luận sai khác hàng chục phần trăm do so nhầm trục.
- **Cs:** mẫu AMCSD ở 78 K khác số Wiki tại 20 °C; ghi rõ điều kiện và chênh lệch khoảng 1,54% ở cạnh ô. **Rb:** giữ chú thích thông số nguồn ước tính tại 297 K.
- **Ce và P:** chọn lần lượt pha γ-FCC và phosphor đen trong bộ tọa độ đã duyệt; Wiki có các pha khác. Tên pha đang xem hiện rõ, không ghép loại mạng pha này vào bộ tọa độ pha khác.
- **Po/Cm/Bk:** kiểu mạng đối chiếu Wiki; kích thước từ WebElements và tài liệu mà trang liệt kê. Bảng không nêu nhiệt độ thì không tự gán 20 °C. Nhãn hcp viết gọn không được dùng để rút DHCP xuống hai nguyên tử.
- **Cf/Es và các nguyên tố chưa đủ dữ liệu:** chưa chọn được bộ tọa độ và metric phù hợp có căn cứ trong phạm vi nguồn đã duyệt. Đặc biệt nhận định mạng FCC của Es mang tính dự kiến; không trình bày như phép đo xác định.
- **Giới hạn mô hình:** cầu nguyên tử là ký hiệu; không có ellipsoid nhiệt, độ bất định thực nghiệm hay liên kết suy đoán. GLB tinh thể biểu diễn cấu trúc tuần hoàn, không phải ảnh quét bề mặt một mẫu quặng. 49 mô hình hình thái quặng từ đợt trước vẫn mang nhãn mô phỏng.

## Nguồn và khả năng truy vết

`data/wiki-crystal-reference.json` lưu 118 revision ID, thời điểm sửa trang, tên template và các trường mạng/pha/hằng số. Dữ liệu này là ảnh chụp tham chiếu theo revision, không tự nhận là phiên bản mới nhất mãi mãi. `data/wiki-crystal-review.json` lưu kết quả so sánh, hoán vị trục, pha thay thế và ghi chú cho từng nguyên tố.

Bộ tọa độ công bố lấy từ AMCSD qua bản dữ liệu Larixite đã ghi nguồn ở đợt trước; SHA-256 SQLite: `94e5486b763a77ebd3300e950786bc787bfce8f2722c9ba2c7c99048bee7a67e`. Mỗi mô hình có định danh, trích dẫn và phép đối xứng trong JSON/CIF. Bảy prototype Tc/Pm/Ra/Pa/Po/Cm/Bk có `evidence=reference-prototype`, `amcsdId=null`, định danh tham chiếu riêng và giới hạn hiển thị. Nguồn kích thước Tc/Pm/Ra/Pa là Arblaster (2018), *Selected Values of the Crystallographic Properties of Elements*, ISBN 978-1-62708-155-9, theo trích dẫn Wiki; Po/Cm/Bk dẫn WebElements và bài nghiên cứu trang đó liệt kê.

Ảnh lấy từ Wikipedia/Wikimedia Commons qua API và các file được kiểm duyệt thủ công. Không tạo ảnh AI giả mẫu. `data/application-image-provenance.json` lưu đường dẫn trang file, tác giả, giấy phép, URL giấy phép, SHA-256 và lý do chưa tải. Các ảnh được sửa lựa chọn gồm sơ đồ Haber–Bosch thay chân dung Haber, máy MRI thay ảnh cắt lớp, gạch chì che chắn, nhà máy lọc dầu, máy dò rò heli, thiết bị UNILAC cho nghiên cứu ion nặng và sơ đồ từ giảo có nhãn.

## Audit và bằng chứng

- [118 audit theo tên nguyên tố](nguyen-to/), gồm từng mục ứng dụng, đoạn nguồn, quyết định gán ảnh và đối chiếu Wiki.
- [133 audit theo tên tinh thể](tinh-the/), gồm loại chứng cứ, tham số, số vị trí, phép đối xứng, nguồn và giới hạn.
- [Nhật ký thay đổi](CHANGELOG.md) và [nhật ký thao tác/tái tạo](OPERATIONS.md).
- [Manifest thay đổi 118 trang](change-manifest.json), SHA trước/sau; [manifest asset](asset-manifest.json), SHA của 532 file cấu trúc.
- [Kiểm duyệt từng mục ứng dụng](application-image-audit.json); [kiểm tra tổng hợp](validation.json); [kiểm tra tinh thể](crystal-validation.json); [render](crystal-render-verification.json); [tính lặp lại](replay-validation.json).
- [12 kiểm thử Node về tinh thể/ảnh](crystal-application-tests.txt), [27 kiểm thử nền tảng](platform-tests.txt), [5 kiểm thử nhập liệu](periodic-tests.txt), [audit phương trình và dữ liệu](periodic-audit.txt), [kiểm thử trình duyệt](browser-tests.json).
- [Tổng hợp kiểm tra cuối](final-verification.json): build production thành công; 12 + 27 + 5 kiểm thử dữ liệu/nền tảng và 13 kiểm thử Chromium đều đạt, không flaky; replay 118 trang không đổi byte. Phương trình vẫn có 1.110 lượt xuất hiện, không lỗi bảo toàn hay thiếu điều kiện theo bộ quy tắc audit hiện có.
- [Ảnh bố cục hai hàng](screenshots/sat-hai-hang-cau-hinh-mang.png), [α-Mn](screenshots/mangan-alpha-58.png), [cầu tiếp xúc](screenshots/mangan-cau-tiep-xuc.png), [Ra và Wiki](screenshots/radium-doi-chieu-wiki.png), [ứng dụng H](screenshots/hydrogen-ung-dung.png), [điện thoại](screenshots/polonium-dien-thoai.png), [bảng kiểm ảnh](screenshots/application-contact-sheet.jpg).

Các sửa đổi thư viện/Trung tâm và asset đang được thực hiện đồng thời bởi công việc khác trong checkout được giữ nguyên. Commit của đợt này chỉ chọn dữ liệu, code, asset và audit thuộc phạm vi ảnh ứng dụng/mạng tinh thể/bố cục nguyên tố.
