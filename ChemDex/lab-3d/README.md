<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/615b7b6b-733d-472b-ae02-992474110b23

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. For optional AI features, set `GEMINI_API_KEY` in a local `.env.local` file. The reaction catalog and chain tools work without this key.
3. Run the app:
   `npm run dev`

## Kho phản ứng và chuỗi có nguồn

Trong lab, mở **Bài học → Kho mở rộng & chuỗi** để tra 1.299 phương trình, 378 phương trình ion rút gọn và 5.740 chuỗi mẫu ba bước. Mỗi bước có điều kiện, chất bổ sung và nguồn đối chiếu theo họ phản ứng. Các mục tra cứu được phân biệt với bài mô phỏng có runtime riêng.

Từ thư mục ChemDex, dùng `npm run catalog:build`, `npm run catalog:audit` và `npm run test:reactions` để tái tạo/kiểm tra dữ liệu. Xem [phân tích, schema và bằng chứng](docs/research/reaction-data-1000plus.vi.md).

## Trạng thái chất và hiệu ứng 3D

[Báo cáo nâng cấp](docs/research/stock-and-product-appearance.vi.md) ghi thay đổi renderer, nguồn hóa học và giới hạn mô hình. [Bảng từng chất](docs/research/stock-product-appearance-2026-10-28/material-inventory.vi.md) bao phủ kho hiện tại và các profile sản phẩm. Dùng `node --import tsx scripts/auditStockMaterials.ts` để cập nhật bảng; `node scripts/auditMaterialAppearance.mjs` chụp kiểm tra khi Vite dev chạy ở cổng 6773.

[Nâng cấp kết bông và khuấy](docs/research/flocculation.vi.md) bổ sung quần thể lơ lửng/lắng có bảo toàn khối lượng, vỡ bông có điều kiện và ba mức khuấy. Chạy `node scripts/auditFlocculation.mjs` để kiểm tra runtime. Tham số cấu trúc và lực bám được đánh dấu là giả định minh họa.

[Tối ưu mô phỏng và đo khung hình](docs/research/performance-upgrade.vi.md) ghi benchmark CPU trước/sau, đối chiếu quỹ đạo có seed và kiểm tra đổi chất lượng khi tạm dừng. Dùng `node --import tsx scripts/benchmarkPrecipitation.ts current 9` để tái chạy phép đo và kiểm tra với baseline.

[Phản ứng tiếp xúc và dòng tràn](docs/research/contact-and-discharge.vi.md) tách thời gian hóa học khỏi trình chiếu, sửa đầu áp/lưu lượng và ghi cơ sở của các bước nâng cấp tiếp. Kiểm tra gộp phản ứng và pipeline tràn hiện hành bằng `node scripts/auditContactAndDischarge.mjs`.

[Kho tràn ngoài thành hữu hạn](docs/research/finite-exterior-overflow.vi.md) bổ sung thành → bay → vũng với cùng kho chất, mesh theo thể tích, cân và persistence. Chạy `node scripts/auditOverflowTransport.mjs`; báo cáo ghi rõ các giới hạn bám ướt/hình dạng/lưu lượng chưa hiệu chuẩn.

[Phản ứng tiếp tục khi lấy bớt mẫu](docs/research/reaction-continuation.vi.md) sửa phản ứng nguồn bị xóa khi rót/hút/xả phễu, giữ kho còn lại, nhiệt và khí đã thoát. Chạy `node scripts/auditReactionContinuation.mjs` để kiểm tra ba đường rót/hút trong app thật.

[Màng tràn quanh miệng tròn](docs/research/circular-overflow.vi.md) thay dải tràn dày tại một phía bằng màng quanh vành cho bình đứng đồng mức; đồng bộ mesh bay, vị trí va chạm và nhập vũng đồng thời. Báo cáo có ảnh, kiểm tra thể tích và benchmark CPU, cùng các điều kiện áp dụng chưa hiệu chuẩn.

[Hóa học trong mẫu đang vận chuyển](docs/research/aliquot-contact-chemistry.vi.md) cho phản ứng dung dịch được hỗ trợ tiếp tục trong dòng bay, trên thành và trong pipet; thêm kho pipet chung, giao dịch hút/nhả đồng thời, lưu và khôi phục mẫu. Audit gồm 48 chương trình, tích phân thời gian tới nơi và app thật.

[Dung tích và hình học dùng chung thước SI](docs/research/world-scale.vi.md) sửa sai lệch kích thước 14 thân bình, đồng bộ profile rót/va chạm với chiều dài vật lý và đổi thước nội bộ của hạt, bọt, giọt thành. `node scripts/auditWorldScale.mjs` đo mesh thật ở mức đầy/nửa bình, ghi rõ sai số đa giác và chạy lại bảo toàn dòng tràn trong Chrome.

[Hạt và khí khi bình đang nghiêng/rót](docs/research/tilted-particles.vi.md) đồng bộ hiệu ứng với ma trận thân thật, đổi hướng lắng/nổi và độ sâu áp suất theo mặt nước nghiêng, giữ hơi/khí đã thoát trong tọa độ thế giới. `node scripts/auditTiltedParticles.mjs` kiểm tra bốn bình, instance buffer, bảo toàn, tạm dừng và đổi chất lượng.

[Vòng đời đám khí](docs/research/gas-cloud-lifecycle.vi.md) tách khí ngoài bình khỏi renderer nguồn, giữ đuôi khí khi kết thúc/thay/xóa mẫu và nhận receipt khí thoát một lần. `node scripts/auditGasCloudLifecycle.mjs` kiểm tra ledger, đổi chất lượng, tạm dừng, tháo/mount Canvas và chống phát lại flux sau reload.

[Mặt cặn hữu hạn khi nghiêng bình](docs/research/sediment-surface.vi.md) bổ sung mặt cặn hạt rời có thư giãn theo ngưỡng ma sát tham chiếu, mesh kín theo thể tích và va chạm hạt trên cùng mặt. `node scripts/auditSedimentSurface.mjs` kiểm tra bốn bình trong Chrome; báo cáo ghi rõ gel/bột mịn, dòng cặn qua cửa và hiệu chuẩn vật liệu còn chưa giải.

[Nêm dung dịch mỏng](docs/research/thin-liquid.vi.md) sửa tích phân, đầu áp và điểm bắt đầu rót khi gần cạn; giữ lượng nhỏ trong hiển thị và pipeline, tăng số cạnh theo độ mỏng của nêm. `node scripts/auditThinLiquid.mjs` kiểm tra mesh đã upload, uniform WebGL và bảo toàn nước ở bốn bình; báo cáo tách độ chính xác hình học khỏi giới hạn mao dẫn và hiệu chuẩn lưu lượng.

[Lưới nước theo cung ướt](docs/research/wet-arc-mesh.vi.md) giảm lưới dày ở phần khô, đưa buffer/clipping về gần điểm đỡ để sửa sai số lớp nước trải phẳng. Báo cáo có benchmark CPU trước–sau cùng kịch bản, đo các uniform ngay sau draw của từng lớp, bảo toàn khi rót và kiểm tra phễu hai pha qua bốn mức chất lượng.

[Đầu áp khi nguồn có vật rắn](docs/research/displaced-source-flow.vi.md) nối mặt thoáng có chiếm chỗ với đầu áp, giới hạn lượng dung dịch rời bình và mẫu huyền phù hữu hạn. Audit đo bốn nguồn có đồng, vận chuyển CuS và hồi quy phản ứng; báo cáo tách mô hình chiếm chỗ tham chiếu khỏi sai lệch mesh vật rắn còn phải sửa.

[Giữ đủ thể tích vật rắn](docs/research/solid-volume-layout.vi.md) bỏ thu nhỏ mảnh để nhét vừa bình, bố trí bằng bao không giao nhau trong từng nhóm và giữ kế hoạch khi tan. Báo cáo đo ma trận thật ở bốn mức chất lượng, chi phí CPU và giới hạn còn lại khi ghép hình học vật rắn với mực nước/đầu áp.

[Phần vật rắn ngập thật](docs/research/stock-immersion.vi.md) nối lưới vật rắn với mặt nước, hệ hạt, dung tích nhận mẫu và đầu áp ở các bố trí được hỗ trợ. Audit dùng nắp miệng độc lập, đo 16 tư thế trong Chrome và xác nhận ca bình tam giác chưa đủ head sẽ không chảy; các dạng bột, vật nổi và tiếp xúc động còn được ghi rõ là chưa giải.

[Hai pha có vật rắn trong phễu phân lớp](docs/research/layered-stock.vi.md) giải mặt phân cách và mặt thoáng theo phần rắn ngập, thêm mesh stock trong phễu và giữ thể tích pha trong aliquot xả/tràn. Audit đo 24 snapshot ở hai thứ tự pha, kiểm tra khi vật rắn giảm khối lượng và xả hết từng pha; thủy lực xả đáy vẫn là phần chưa hoàn thành.
