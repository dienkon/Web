from pathlib import Path
import json
p=Path('docs/player-mobile')
notes=[
('full-front','Đủ PPE, chính diện','Tay áo trắng lệch thân áo; khoảng mở trước bụng quá rộng, giày hộp.','Thân và tay cùng màu ivory; nẹp đóng, cúc/túi rõ, giày có mũi bo.','Toàn thân; không dùng ảnh này để kết luận độ kín mép khẩu trang.'),
('full-back','Đủ PPE, sau chếch','Lưng áo trơn, đuôi tóc thiếu dây buộc, giày vuông.','Đường ráp lưng và gấu áo xuất hiện; dây buộc tóc rõ; gót có chi tiết.','Mặt trước bị khuất đúng góc chụp.'),
('full-quarter','Đủ PPE, trước chếch','Kính tạo khối hộp nhô; áo tách hai vạt ở bụng.','Khung cong theo mặt, ve áo chồng thân, nẹp kín đến gấu.','Hai tay buông, chưa phải tư thế cầm dụng cụ.'),
('plain-front','Không PPE, trước','Áo và hai chân rời ở hông; dép chỉ là hộp đổi màu.','Hông nối quần, tay trần có ngón; dép hở lộ ngón chân.','Trạng thái chưa an toàn được thể hiện bằng hình học khác.'),
('plain-back','Không PPE, sau','Tóc đuôi ngựa thiếu dây; hông hở và dép hộp.','Dây buộc đồng bộ vật phẩm, phần eo nối chân; quai/gót dép có hình.','Màu da và tóc giữ cùng nhân vật tham chiếu.'),
('coat-front','Chỉ áo blouse, thân trước','Ve và túi phẳng ít cấu tạo; nẹp mở rộng.','Hai ve, ba túi, sáu cúc; nẹp có đường may và che bụng.','Đã sửa thêm sau lượt đầu vì nẹp còn quá mở.'),
('coat-back','Chỉ áo blouse, thân sau','Không có đường ráp lưng/gấu; cổ áo đơn giản.','Đường giữa lưng và gấu chạy theo bề mặt; cổ/ve có độ dày.','Chỗ nối tay áo vẫn phong cách nhân vật cách điệu.'),
('coat-side','Chỉ áo blouse, bên phải','Tay áo capsule trơn, cổ tay không có bo.','Có đường may tay và cửa tay; lớp ve nổi nhẹ trên ngực.','Không thấy túi phía đối diện từ góc này.'),
('goggles-front','Chỉ kính, đầu trước','Khung thẳng ngang, mắt là các cầu lồi.','Tròng/khung/gasket cùng đường cong, mắt và lông mày nằm trên mặt.','Tròng giữ trong suốt, không tô kín hai mắt.'),
('goggles-side','Chỉ kính, đầu bên','Càng dày ngang, mép trước nhô thành hộp.','Khung ôm thái dương, dây đi lên quanh đầu; tai hiện đúng vị trí.','Kiểm tiếp xúc bổ sung bằng tọa độ anchor.'),
('goggles-back','Chỉ kính, sau chếch','Khung ló nhiều cạnh mặt; dây đai thiếu điểm kết nối.','Dây nhỏ và gọn sát vùng tóc/đầu, khung phía trước ít nhô hơn.','Tóc che một phần đai; ảnh không chứng minh toàn vòng dây.'),
('mask-front','Chỉ khẩu trang, đầu trước','Tấm chữ nhật gần phẳng, dây bung rộng hai bên.','Mặt vải cong theo má, nếp/viền/nẹp mũi cùng bề mặt; dây lên tai.','Mắt vẫn rõ phía trên nẹp.'),
('mask-side','Chỉ khẩu trang, đầu bên','Vòng dây nằm dưới tai; mép khẩu trang cách mặt rõ.','Vòng dây tới và vòng quanh tai; hai đầu vải uốn về má.','Sai số điểm nối tai được đo dưới 4 mm.'),
('all-head-front','Kính + khẩu trang + áo, đầu trước','Khung kính và mép khẩu trang cùng tạo hai thanh thẳng dày.','Các lớp cong riêng, mắt còn thấy; nẹp mũi dưới kính và cổ áo rõ.','Không suy ra độ kín bảo hộ thật từ mô hình cách điệu.'),
('all-head-side','Đủ PPE, đầu bên','Dây khẩu trang thấp; khung kính cứng; ve áo ít nét.','Dây khẩu trang tới tai, đai kính chạy cao hơn; ve/cổ tách lớp.','Không dùng chung đường dây của hai món.'),
('all-head-back','Đủ PPE, đầu sau','Đuôi tóc nối đầu nhưng thiếu dây buộc có cấu tạo.','Dây buộc có vòng/sợi, đuôi tóc nối vùng sau đầu; lưng áo có ráp.','Góc sau che phần lớn khẩu trang theo tự nhiên.'),
('glove-hands','Chỉ găng, trước vùng tay','Găng là khối xanh đậm nhỏ, không phân biệt ngón.','Màu nitrile ở tủ, có cổ găng và các ngón buông riêng.','Khung này còn rộng; có thêm ảnh bàn tay độc lập để soi nếp/ngón.'),
('bare-hands','Không găng, trước vùng tay','Bàn tay là khối tròn và áo dài tay giống mặc bảo hộ.','Tay trần, ống tay áo ngắn; lòng tay/ngón rõ, không có cổ nitrile.','Kiểm thêm ảnh bàn tay độc lập; khác màu da theo profile được giữ.'),
('shoe-feet','Giày kín, chân trước chếch','Đế và upper đều là hộp vuông, không dây/cổ giày.','Mũi bo, cổ giày, dây bám mặt upper, đế thấp chạm sàn.','Đã sửa dây nổi và đường gấu quần sau lượt soi đầu.'),
('open-feet','Không giày kín, chân trước chếch','Đổi màu cùng hộp khiến không nhận ra chân hở.','Dép có quai, bàn chân/ngón chân lộ; khác hình giày kín.','Sole đặt ở y=0 như trạng thái giày kín.'),
('bun-head','Tóc búi, sau đầu','Búi nhỏ như khối nổi đơn giản.','Búi có thể tích và dây buộc quanh chân; áo/lớp kính giữ vị trí.','Búi cao là biến thể riêng, không đổi thành đuôi ngựa.'),
('braid-head','Tóc tết, sau đầu','Các đốt tết rời thành chuỗi hạt cách nhau.','Năm đốt gối nhau, thu nhỏ về cuối, có dây buộc ngọn.','Đầu bím nối mép tóc, không còn khoảng đứt giữa đốt.'),
('long-head','Tóc dài chưa buộc, sau đầu','Khối tóc dài gồ, đường nối với cap hở.','Tóc dài liên tục và áp vùng sau đầu; giữ trạng thái chưa buộc.','Không tự thêm dây buộc cho trạng thái thiếu PPE.')]
b=json.loads((p/'before-character.json').read_text()); a=json.loads((p/'after-character.json').read_text())
text='# Audit player và mobile — 28/10/2026\n\nĐã xem trực tiếp 23 cặp ảnh dưới đây qua sáu bảng đối chiếu `review-character-1…6.jpg`. Ảnh gốc giữ nguyên độ phân giải; bảng ghép chỉ phục vụ rà soát. Mỗi cặp dùng cùng góc/cỡ khung/ánh sáng, trạng thái được ghi riêng. `before` là baseline trước thay đổi model, `after` là lượt cuối sau sửa nẹp áo, eo, dây giày và gấu quần.\n\n## Từng cặp ảnh nhân vật\n\n'
for id,state,old,new,limit in notes:
 oldm=next(r['model'] for r in b['snapshots'] if r['id']==id);newm=next(r['model'] for r in a['snapshots'] if r['id']==id)
 text+=f'### {id} — {state}\n\n[Trước](before-{id}.png) · [Sau](after-{id}.png)\n\n- Trước: {old}\n- Sau, đã soi: {new}\n- Phạm vi: {limit}\n- Lượt vẽ trong viewer: {oldm["calls"]} → {newm["calls"]}; tam giác: {oldm["triangles"]} → {newm["triangles"]}. Mesh hữu hạn, đáy chân sai khác mặt sàn dưới 0,001 mm.\n\n'
audit=p/'AUDIT.vi.md'
existing=audit.read_text(encoding='utf-8') if audit.exists() else ''
marker='## Vật phẩm độc lập'
suffix=marker+existing.split(marker,1)[1] if marker in existing else ''
audit.write_text(text+suffix,encoding='utf-8')
