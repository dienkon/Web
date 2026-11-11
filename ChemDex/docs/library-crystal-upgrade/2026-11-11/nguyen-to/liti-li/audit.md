# Liti (Li) — kiểm duyệt mạng tinh thể và ảnh

- File: `data/elements/003_Li.json`.
- Sơ suất trước: mô hình hình thái chỉ là hình học gần đúng; chưa có thông số ô mạng, tọa độ nguyên tử, phép đối xứng và trích dẫn mẫu cụ thể.
- Xử lý: giữ nhãn minh họa hình thái; bổ sung mô hình nguyên tử riêng khi có dữ liệu công bố phù hợp.
- Không sửa phương trình trong đợt này; đối chiếu phương trình và từng đoạn DOCX xem audit gốc.

## Đơn chất

- AMCSD 0011220; Lithium; nhóm không gian I m 3 m.
- Ô mạng: {'a': 3.5093, 'b': 3.5093, 'c': 3.5093, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}; V = 43.217684 Å³.
- Giữ nguyên dạng cấu trúc của mẫu trong nguồn.
- Điều kiện và ghi chú bản gốc: Second edition. Interscience Publishers, New York, New York  Sample at T = 293 K  Body centered cubic, bcc, structure.

## Khoáng vật / quặng

- Quan hệ với nguyên tố: Khoáng vật hoặc mẫu tự sinh đại diện có liên quan tới nguồn gốc tự nhiên của nguyên tố.
- Spodumene: AMCSD 0000355, công thức mẫu `Si2 Al Li O6`, 40 vị trí/ô, 0 vị trí hỗn hợp.
  - Lưu ý: Không khẳng định mẫu đo là cùng mẫu ảnh; không mô phỏng hình dạng bề mặt quặng từ tọa độ ô mạng.
  - Giới hạn: Không thêm vị trí nguyên tử ngoài bản ghi đã công bố.
  - Bài gốc: ['Prewitt C T', 'Cameron M', 'Papike J J', 'Sueno S'], 1973, High-temperature crystal chemistry of acmite, diopside, hedenbergite, jadeite,  spodumene, and ureyite  T = 24 C  pyroxene.

## Ảnh trạng thái tự nhiên

- Trạng thái: downloaded; [trang nguồn](https://commons.wikimedia.org/wiki/File:Spodumene-usa59abg.jpg).
- Tác giả: Robert M. Lavinsky; giấy phép: CC BY-SA 3.0.
- Mô tả nguồn: Spodumene Locality: Walnut Hill Pegmatite Prospect, Huntington , Hampshire County, Massachusetts , USA ( Locality at mindat.org ) Size: cabinet, 14.2 x 9.2 x 3.0 cm Spodumene This is the CRYSTAL TYPE LOCALITY for spodumene, apparently. A LARGE, 660-gram single, sharply terminated crystal of spodumene from this classic old locality circa mid-1800s! They were considered very important at the time (remember, gem pink kunzite had NOT yet been found in California, Brazil, or Afghanistan), and these crystals were considered highly important and sold or traded into all major museums. Owning one of these would be a goal to assemble any major collection of the time, of important US minerals. Today, they are not worth their weight in gold any more (660 grams...ouch!), but they still are important historical pieces. This location was first documented by Edward Hitchcock in 1833 (Report on the Geology, Mineralogy, Botany and Zoology of Massachusetts), and the first location to yield crystallography on the species (1879). The quarry was last operated by B. K Emerson of Amherst College, and Frank Nason (Nasonite) operated the location in 1885. This is when the majority of the old specimens were recovered. For the size of this crystal, this is really good! They generally get a little more "aesthetically challenged" with size. This is one of the best I have seen, and although color-challenged, it is a very important historical specimen nonetheless, and a superb example from this now defunct pegmatite. ex. Ken Hollman Collection. Thanks to Jim Chenard for this footnote: A funny note on this area was with regards to the early Professor Emerson, who wrote the Mineralogical Lexicon of Hampshire, Hampden Counties in Mass. His journal well documents the Walnut Hill location, and always used taverns as landmarks. His writing got worse during the day, and he would frequently come back to Amherst on foot, since he would forget where his horse was. This is an old location!
- Không gọi ảnh tổng hợp/ảnh mẫu thí nghiệm là ảnh quặng tự nhiên nếu mô tả nguồn không xác nhận.

## Kiểm tra và giới hạn

- Đối chiếu metric đủ sáu thông số, thể tích, phép đối xứng, độ chiếm chỗ và vị trí tương đương; kết quả toàn bộ xem crystal-validation.json.
- GLB và ảnh preview sinh từ cùng tọa độ với trình xem. Màu/bán kính là quy ước; không giả lập ellipsoid nhiệt, liên kết hay ảnh chụp bề mặt.
- CIF xuất lại từ dữ liệu Larixite có lượng tử hóa tọa độ phân số 1/4.000.000; không khôi phục độ bất định đã mất.
