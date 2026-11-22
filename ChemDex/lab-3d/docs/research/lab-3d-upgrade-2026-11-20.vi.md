# Kế hoạch và nâng cấp toàn diện ChemDex Lab 3D — 20/11/2026

## Đợt cải tiến thao tác buret

1. Đối chiếu vị trí chân giá, cột đỡ và miệng bình với hình học mặt bàn. Dùng cùng một vị trí buret cho mô hình, căn bình, điểm xuất phát của giọt, hoàn tác và tải lại. Giữ tọa độ ngang hợp lệ của bản lưu cũ và nâng các vị trí quá thấp lên mức mặc định.
2. Kiểm tra luồng chuẩn độ từ bảng **Quan sát → Chuẩn độ**. Chọn bình mở, căn bình dưới buret và nhả một giọt. Bàn đặt bình lên mặt bàn và nâng cột buret khi miệng bình cao hơn đầu nhỏ giọt.
3. Kiểm tra kéo bằng con trỏ khi chưa thả. Giữ chân giá trong giới hạn mặt bàn và cập nhật hình ảnh ngay khi kéo. Lưu vị trí sau khi thả để tránh chụp lại trạng thái vật chất mỗi khung hình.
4. Thử hết dung dịch, nạp cùng dung dịch từ kho mô phỏng và xả vào sổ chất thải. Xác nhận các thao tác giữ nguyên bình nhận và đường cong chuẩn độ. Đóng khóa và chờ giọt đã nhả chạm bình trước khi nạp hoặc xả.

Đo khoảng hở của lỗi ban đầu từ đáy chân giá đến mặt bàn được khoảng 1,045 đơn vị cảnh ở vị trí mặc định. Sau sửa, đáy giá dùng cao độ của chính mặt bàn. Kẹp nâng theo miệng bình, còn chân giá nằm sau bình nhận.

Chrome xác nhận 18 điều kiện trong audit buret, gồm kéo trước khi thả, giữ trạng thái sau tải lại, tránh khôi phục vị trí cũ nếu đặt lại bàn khi đang kéo, giữ bảng chuẩn độ khi chọn bình hoặc khi xảy ra phản ứng, và kiểm kê dung dịch khi nạp, nhả và xả. Bộ kiểm thử dụng cụ, lắp ráp và chuyển mẫu đạt 93 ca, gồm hoàn tác khi xóa số đo của một bình.

Bản production qua thử chạm trên Chrome ở độ rộng 390 px. Bản lưu cũ giữ X/Z và sửa lại cao độ buret. Với 1.000 số đo, giao diện giữ đủ dữ liệu và một đường cong, giảm số dấu điểm SVG hiển thị từ 1.000 xuống 0.

## Ghi và đối chiếu số đo chuẩn độ

1. Vẽ trục ngang theo mL đã cấp để giọt cuối có thể tích nhỏ và khoảng cách giữa hai số đo đều hiện đúng tỉ lệ. Nối các số đo bằng đoạn thẳng. Giữ chỗ ngắt khi mẫu chưa có phép đo pH phù hợp.
2. Với chuỗi dài, vẽ tối đa 800 điểm để giảm tải giao diện. Bộ chọn giữ đầu mút và cực trị pH trong từng khoảng. Nút **CSV** xuất toàn bộ số đo của bình đang xem, gồm lượng mỗi giọt, thuốc thử, nồng độ, kết quả chuyển mẫu và cơ sở tính pH nếu lần đo có ghi. Các cột chưa được thu thập trong bản lưu cũ để trống.
3. Trạng thái hoàn tác tái sử dụng chuỗi số đo bất biến. Tự lưu ghi một bản thống nhất cho buret, bình nhận và các số đo. Bản lưu được ghi sau khi dừng thao tác một giây, khi chờ lưu đủ năm giây, hoặc khi trình duyệt phát sự kiện rời trang.

Chrome production ở khung 390 px xác nhận 1.000 dòng dữ liệu trong CSV, 201 điểm được vẽ, khoảng hở ở số đo thiếu pH và bước nhảy đúng tỉ lệ trên trục thể tích. Bài thử phát sự kiện rời trang ngay sau khi nhả xác nhận buret, bình nhận và số đo của giọt được ghi cùng nhau.

Với 10.000 số đo mô phỏng, phép đo Node cho 100 lần chụp riêng trạng thái hoàn tác dao động 598–624 ms ở cách sao chép cũ và 0,21–0,52 ms ở cách tái sử dụng chuỗi. Phép đo chỉ bao gồm tạo snapshot trong fixture nhỏ. Tốc độ phản ứng, VFX và FPS thực tế cần đo riêng.

## Đổi dung dịch chuẩn và xem lại từng lượt

1. Mở **Quan sát → Chuẩn độ → Nạp hoặc xả buret**. Dùng **Nạp đầy từ kho** khi tiếp tục với dung dịch đang có. Để đổi dung dịch, đóng khóa, chờ giọt chạm bình, chọn **Xả vào chất thải** rồi nạp HCl hoặc NaOH 0,05 M hay 0,10 M từ kho mô phỏng.
2. Căn bình và nhả giọt. Lượt đo bắt đầu từ thể tích thực của giọt đầu tiên. Đổi thuốc thử, đổi nồng độ hoặc thay mẫu trong bình sẽ mở lượt mới ở lần nhả kế tiếp. Nạp lại cùng dung dịch trong lúc giữ nguyên mẫu sẽ tiếp tục cộng dồn lượt hiện tại.
3. Chọn **Lượt chuẩn độ** để xem lại. Nút CSV tải từng lượt cùng mã `run_id`. Số đo từ bản lưu cũ vẫn giữ thể tích và pH đã lưu, để trống mã lượt. Có thể xóa riêng lượt đang xem và khôi phục bằng **Hoàn tác**.
4. Muốn lặp lại với cùng dung dịch chuẩn, thu gom mẫu cũ rồi cho mẫu mới vào bình trước khi nhả. Nếu đổi dung dịch chuẩn giữa chừng, lượt mới đo thể tích của thuốc thử mới trên mẫu còn trong bình.

Chrome ở khung nhìn 390 px đã chạy luồng xả, đổi sang HCl 0,05 M, nhả giọt, tải CSV từng lượt và tải lại trang. Giọt nhả sau khi tải lại tiếp tục đúng lượt hiện tại. Các kiểm thử hồi quy cũng bao phủ việc dùng lại mã bình khi mở bài thực hành và nhả lại sau khi xóa lượt gần nhất.

## Bài thực hành chuẩn độ HCl–NaOH

1. Từ **Bài học → Chuẩn độ Axit - Bazơ**, chọn **Tự động bày bàn thí nghiệm**. Bình tam giác 100 mL chứa 20,00 mL HCl 0,10 M. Buret được đóng khóa và nạp NaOH 0,10 M. Thể tích tương đương lý thuyết là 20,00 mL, trong một lần nạp 50 mL. Mẫu cũ cần khoảng 200,23 mL và quá nông để ngập đầu đo trong bình 250 mL.
2. Thêm 0,10 mL dung dịch phenolphthalein bằng nút trong bài. Chọn **Căn bình và mở bảng chuẩn độ**. Rót liên tục tới gần mốc rồi dùng từng giọt 0,05 mL để căn thể tích. Màu hồng của chỉ thị xuất hiện ở phía bazơ của bước nhảy pH. Điểm tương đương của hệ HCl–NaOH ở gần pH 7 tại 25 °C. [IUPAC Gold Book](https://goldbook.iupac.org/terms/view/T06387/plain) · [OpenStax Chemistry 2e](https://openstax.org/books/chemistry-2e/pages/14-7-acid-base-titrations)
3. Đóng khóa rồi chấm. Bài thực hành và thi thử dùng dung sai ±0,10 mL. Điểm và báo cáo JSON dùng thể tích NaOH 0,10 M đã vào mẫu đã chuẩn bị. Hóa chất khác hoặc NaOH khác nồng độ đi từ buret vào mẫu được ghi riêng. Có thể xóa đồ thị và chấm từ kiểm kê của mẫu. Sau khi làm rỗng bình, dùng **Tự động bày bàn thí nghiệm** để bắt đầu lần thực hành mới.

Kiểm thử đi qua 400 lần nhả 0,05 mL, xác nhận pH gần 7 ở 20,00 mL và pH tăng sau giọt tiếp theo. Lượt Chrome production ở khung nhìn 390 px bày bàn, thêm chỉ thị, rót liên tục rồi nhả từng giọt tới mốc, xóa đồ thị và xuất báo cáo JSON. Báo cáo ghi 20,00 mL đã vào bình, sai lệch 0,00 mL, quy trình 40/40 và điểm trắc nghiệm được giữ qua lần chuyển bảng.

## Bài thực hành kết tủa AgCl và nồng độ mẫu

1. Bày bàn trong bài **Kết tủa Dạng Vón Bã Đậu** để nhận 25,00 mL AgNO₃ 0,10 M trong ống đong và 25,00 mL NaCl 0,10 M trong cốc. Rót từ ống đong sang cốc. Mẫu có thể đi qua nút của bài hoặc qua đường rót trên bàn 3D. Hệ thống ghi thể tích từ ống đong của lần thực hành được giữ lại trong cốc, rồi kiểm tra AgCl rắn trong kiểm kê. [OpenStax về kết tủa và độ tan](https://openstax.org/books/chemistry-2e/pages/15-1-precipitation-and-dissolution)
2. Khuấy mẫu kết tủa trong ít nhất 1 giây mô phỏng kể từ khi đầu đũa ngập và làm chất lỏng chuyển động. Báo cáo và JSON ghi thể tích thực nhận, khối lượng AgCl rắn và thời gian khuấy. Thi thử và thực hành có dung sai thể tích ±0,25 mL. Bài yêu cầu khối lượng rắn đạt ít nhất 95% giá trị theo tỉ lượng của liều đã nhận. Kiểm kê tổng bạc và chloride có dung sai 2% lượng chloride chuẩn bị ban đầu để phát hiện liều thêm hoặc mẫu đã thất thoát.
3. Trong **Thông tin bình**, dòng **Nồng độ mẫu** lấy số mol của cấu tử đã ghi trong pha nước khối mẫu chia cho thể tích pha nước hiện tại. Dòng **Kho** nhận diện tên dung dịch gốc, ví dụ HCl 1 M trong danh mục và mẫu HCl 0,10 M trên bàn chuẩn độ. Kết tủa, khí, pha hữu cơ và phần giữ trên lọc hoặc bọt được loại khỏi số đo pha nước. [IUPAC về nồng độ lượng chất](https://goldbook.iupac.org/terms/view/A00295/plain)

Chrome production ở khung nhìn 390 px ghi 27/40 điểm quy trình sau khi rót, 40/40 sau khi đũa khuấy đủ thời gian, và tải được JSON. Bảng thành phần hiển thị mẫu HCl 0,1 mol/L cùng tên chai kho 1 M. Kiểm thử engine bao phủ lượng AgNO₃ đang bay, liều rót từ ống khác, hoàn tác và tạm dừng khi khuấy.

## Bài thực hành nhiệt trung hòa

1. Bày bàn trong **Hiệu Ứng Nhiệt Phản Ứng Trung Hòa**. Mỗi cốc chứa 40,00 mL dung dịch 2,00 M, tương ứng 0,080 mol HCl hoặc NaOH. Khối lượng chất tan tính trực tiếp từ số mol và khối lượng mol. Bản trước dùng khối lượng đã làm tròn, để lại axit dư và cho pH khoảng 2,97 sau khi rót đủ 40 mL.
2. Đặt nhiệt kế vào cốc HCl, chờ ổn định rồi chọn **Ghi nhiệt độ ban đầu**. Rót từ cốc NaOH đã chuẩn bị. Báo cáo lưu riêng số đo nhiệt kế ban đầu, nhiệt độ đỉnh của mẫu sau các liều đã nhận và độ tăng nhiệt. Trong lúc rót có thể quan sát **Nhiệt kế hiện tại** khi đầu dò đã ngập. Ở thiết lập mặc định, nhiệt độ mẫu tăng từ khoảng 25 °C lên 37,14 °C. Cân bằng nhiệt của mô hình dùng nhiệt dung và trao đổi nhiệt với môi trường. [OpenStax về nhiệt lượng kế](https://openstax.org/books/chemistry-2e/pages/5-2-calorimetry)
3. Đặt đầu dò pH vào cùng cốc rồi chọn **Ghi pH**. Bài so sánh số đo với pKw(T)/2 từ mô hình dung dịch. Mốc trung tính gần 6,81 ở khoảng 37 °C. Báo cáo JSON lưu số đo, nhiệt độ tham chiếu và mốc trung tính. Thể tích nhận và nhiệt độ đỉnh lấy từ mẫu trong mô phỏng, còn pH dùng mô hình dung dịch lý tưởng. [IAPWS về sự phụ thuộc của Kw vào nhiệt độ](https://iapws.org/technical-guidance/release/Ionization)

Thực hành và thi thử dùng dung sai ±0,25 mL cho thể tích và ±0,20 pH so với mốc trung tính. Kiểm thử engine bao phủ đầu dò sai vị trí, đầu dò còn dao động, lượt đang bay, hoàn tác, làm lại và sự thay đổi thành phần sau khi ghi pH. Chrome production ở khung nhìn 390 px đo được 40,00 mL, ΔT 12,14 °C và pH 6,81. Báo cáo ghi 27/40 điểm quy trình trước khi ghi pH và 40/40 sau khi ghi.

## Chấm theo bằng chứng và phiếu tự thực hành

Chương trình có 19 bài và 43 bước. Chín bước thuộc ba bài chuẩn độ, AgCl và nhiệt trung hòa được kiểm tra từ mẫu, giao dịch vật chất hoặc đầu dò. Khi mở báo cáo, bộ chấm kiểm tra lại từng bước trên trạng thái hiện tại của bàn. Bài chuẩn độ dùng cùng tiêu chí cho giao diện và bộ chấm gọi trực tiếp.

Ở 16 bài còn lại, người học có thể xem qua các bước và đánh dấu **Tự xác nhận đã thực hiện bước này** cho 34 bước còn dựa vào quan sát. **Xem phiếu tự thực hành** hiển thị số bước tự xác nhận và số câu trắc nghiệm đúng. JSON lưu trạng thái từng bước, phân biệt bước tự xác nhận với bước phòng lab kiểm tra và có thể dùng cho bài kết hợp cả hai loại. Phiếu lưu tiến độ trong phiên khi đóng bảng bài học hoặc chuyển sang thẻ dụng cụ. Nút **Tự động bày bàn thí nghiệm** bắt đầu lượt mới và xóa các xác nhận cùng câu trả lời của lượt trước.

Kiểm tra bàn trống xác nhận cả 43 bước đều chưa đạt. Ở Chrome production khung nhìn 390 px, phiếu của bài bảo toàn khối lượng ghi 0/2 khi chỉ chuyển bước và 1/2 khi người học đã xác nhận một bước. Kiểm tra cũng bao phủ đóng mở bảng, hủy xác nhận, làm lại, xuất JSON và ba luồng chấm tự động.

## Điểm tựa của cân điện tử

Cảnh 3D, thao tác **Đặt lên cân** và phép đọc khối lượng dùng cùng tâm, bán kính và độ cao của mặt đĩa. Cân đọc một bình khi đáy ở sát mặt đĩa, bình đứng thẳng và đã dừng chuyển động. Trong bài bảo toàn khối lượng, nút **Tự động bày bàn thí nghiệm** đặt cốc nhận theo vị trí hiện tại của cân. Bảng dụng cụ và mặt số 3D dùng cùng bình để tính số đọc và mốc TARE.

Kiểm tra trên Chrome ở khung nhìn 390 px đọc 110,800 g cho cốc mẫu đã bày, về 0,000 g sau TARE và báo đĩa đã có cốc khi thử đặt cốc thứ hai. Kiểm thử engine kiểm tra riêng cốc quá cao, quá thấp, đang nghiêng, đang kéo và cân đã đổi vị trí.

Để tự động chấm bài bảo toàn khối lượng, bước tiếp theo là ghi số đo cho cả cốc nguồn và cốc nhận trước và sau khi rót. Các số đo cần thuộc cùng lượt thực hành. Bộ chấm sẽ đối chiếu phần còn trong cốc nguồn, phần đã vào cốc nhận và phần tràn từ chính lượt rót.

## Phạm vi 5 giai đoạn

Bản nâng cấp hoàn thiện năm giai đoạn từ kế hoạch phát triển `lab-3d`:

1. **Giai đoạn 1 — Ổn định Working Tree & Hồi quy:**
   - Chốt đồng bộ sửa lỗi `removeVessel` trong `src/store/useAppStore.ts` (dừng ngay `reactionSimulationEngine`, `programPlayer`, `kineticsEngine`, `SimulationEngine.removeManager`, dọn `activeKinetics`/`pendingReactions`/`dissolvingSubstances`/`stirringVesselId`/`activeLitmusVesselId` và xác nhận biên nhận tiếp xúc hạt rắn kể cả khi đang tạm dừng).
   - Giữ dung sai tiếp xúc 1 µm trong `src/physical/StockWorld.ts` và hỗ trợ fixture HTML trong `server.ts`.
   - Tăng ngưỡng timeout an toàn cho bài kiểm thử hội tụ Landolt (`tests/landolt_clock.test.ts`) và bổ sung hồi quy `tests/remove_vessel_cleanup.test.ts`.

2. **Giai đoạn 2 — Vật lí Rapier Worker, Collider & Giao dịch Liên thông:**
   - `src/physical/catalog.ts`: chuẩn hóa bảng lượng giác vòng tròn đơn vị 12 chữ số thập phân (`SHELL_TRIG`, giữ đúng giá trị 0/±1 ở góc chính) để loại bỏ sai khác `Math.sin/cos` giữa các engine; rút gọn các vòng micro-bevel/vành thành dư thừa khi sinh collider vỏ rỗng (giữ nguyên toàn bộ 16-điểm midpoint integration cho khối lượng, trọng tâm và mô-men quán tính). Số collider của cốc 100 mL giảm từ **129 xuống 33** trong khi giữ nguyên `SHELL_SECTORS = 32` và độ lệch thành trong dưới 0,015 đơn vị mô hình.
   - `src/physical/PhysicsRuntime.ts`: tái sử dụng scratch `Quaternion`/`Vector3`, sàng lọc sớm theo bán kính bao ngoài trong `stepFluids()`, bảo toàn trạng thái ngủ (`sleeping`) của cụm bình–mẫu rắn khi mực dịch ổn định (chỉ đánh thức khi biến thiên mực dịch > 50 µm), và chỉnh `normalizedPredictionDistance = 0.0004 m` (0,4 mm, gấp 8 lần ngưỡng lỗi 50 µm nhưng nhỏ hơn bề dày đáy 1,0 mm của cốc 100 mL) để loại bỏ va chạm dư giữa 32 nêm thành thẳng đứng với mặt bàn.
   - `src/physical/ledgerBridge.ts`: cầu nối hai chiều giữa `VesselState` và `MatterLedger` đơn vị SI (`vesselToMatterParcels`, `createLabMatterLedger`, `applyAtomicVesselTransfer`), đảm bảo giao dịch chuyển mẫu/vũng tràn nguyên tử, bất biến nguyên tố/khối lượng và chống lặp qua biên nhận (`receipt`) khi lưu/tải lại.
   - `src/science/suspensionTransport.ts` & `src/engine/decantTransfer.ts`: bổ sung `stirredMobileSolids` (ước lượng định tính có biên theo hình thái `gel_like`/`flocculent`/`fine_powder`/`granular`/`crystalline`), trả về rỗng khi không khuấy (`stirringIntensity <= 0`, không bào mòn lớp cặn lắng) và hỗ trợ tùy chọn cuốn huyền phù khi gạn có khuấy.

3. **Giai đoạn 3 — Động học Hóa học Định lượng, Đa pha & Nhiệt động lực học:**
   - `src/science/conditions.ts` & `src/engine/advanceReaction.ts`: bổ sung `bulkAcidMassFraction` kiểm tra nồng độ khối lượng thực tế của `HNO3`/`H2SO4` khi có nước lỏng rõ ràng trong khoang `bulk` (tự chuyển nhánh `Cu + HNO3 đặc` sang `Cu + HNO3 loãng` sau khi pha loãng bằng nước, đồng thời giữ `acidGradeReferenceContents` từ baseline khi phản ứng đang chạy để quá trình tự sinh nước không làm kẹt phản ứng giữa chừng). Bổ sung `isPassivatedMetalInColdConcentratedAcid` phát hiện thụ động hóa cho `Al`, `Fe`, `Cr` rắn trong `HNO3`/`H2SO4` đặc nguội (`< 45 °C`).
   - `src/engine/thermalState.ts`: bổ sung `equilibrateSealedWaterVapor` giải cân bằng lỏng–hơi nước bình kín theo đường áp suất hơi bão hòa IAPWS `waterSaturationPressurePa(T)` với nghiệm điểm bất động có tính đến thay đổi thể tích khoảng không khi nước bay hơi/ngưng tụ, bảo toàn chặt tổng khối lượng và tổng số mol `H2O`.
   - `src/science/sulfuricDilutionEnthalpy.ts`: mô hình hàm enthalpy pha loãng tích phân/vi phân của `H2SO4(l) + n H2O(l)` ở mốc 25 °C và đánh giá nguy cơ tỏa nhiệt cục bộ khi rót nước vào axit đặc (`assessAcidDilutionOrderHazard`).
   - `src/engine/headspaceGasOxidation.ts`: mô phỏng oxy hóa bậc ba pha khí $2\text{NO}(g) + \text{O}_2(g) \to 2\text{NO}_2(g)$ tại miệng bình mở với nghiệm giải tích, bảo toàn nguyên tố N/O và khối lượng khí quyển tiêu thụ, trả về 0 khi bình kín hoặc thiếu oxy.

4. **Giai đoạn 4 — Tối ưu Bundle Size & Lazy Loading:**
   - `src/App.tsx`: chuyển `GuidedExperimentPanel`, `TitrationPanel` (kéo theo `recharts` 359 KB) và `LabReportModal` sang `React.lazy` kèm `Suspense` có điều kiện.
   - `vite.config.ts`: tách `manualChunks` thành `vendor-three`, `vendor-r3f`, `vendor-charts`, `vendor-firebase`, `vendor-motion`, `vendor-ui`, `vendor-react` và `vfx-programs`.
   - Kết quả build thực tế: chunk `App` giảm từ **894,7 KB → 511,36 KB** (-42,8%), `ErrorBoundary` giảm từ **2.021,4 KB → 1.335,34 KB** (-33,9%); `vendor-charts`, `TitrationPanel`, `GuidedExperimentPanel`, `LabReportModal` không còn tải ở frame mở đầu `/lab/`.

5. **Giai đoạn 5 — Đánh giá Thực hành Định lượng & Xuất Báo cáo:**
   - `src/engine/experimentEngine.ts`: bổ sung kiểm tra bước `MEASURE_PH`, `DISPENSE_DROP` (sai số chuẩn độ mặc định ±0,1 mL cho chế độ Thực hành/Thi thử), theo dõi vi phạm an toàn (`recordSafetyViolation`), chấm điểm tích hợp số liệu định lượng (`QuantitativeRubricMetrics`), và xuất JSON (`serializeReportCardJson`).
   - `src/components/GuidedExperimentPanel.tsx`: truyền chỉ số định lượng thực của bàn thí nghiệm (pH, nhiệt độ cực đại, chất thải đã thu, vũng tràn chưa dọn) vào phiếu điểm và thêm nút **Xuất JSON** trong hộp thoại báo cáo thi thực hành.

## Kiểm chứng thực tế

- **Benchmark CPU Rapier 20 bình / 50 mẫu rắn / 5 fixture** (`npm run physics:benchmark`, lưu tại `artifacts/upgrade-2026-11-20/runtime-cpu.json`):
  - Trước tối ưu: median **174,55 ms**, p95 **195,51 ms**, tổng 150 frame **27.464,5 ms**, `activeContacts` **1.814**.
  - Sau tối ưu: median **19,11 ms**, p95 **28,69 ms**, tổng 150 frame **3.892,0 ms**, `activeContacts` **752** (**nhanh hơn 9,1×**, nằm trong khung thời gian lô Worker 33,33 ms; đây là đo CPU Node, không phải FPS trình duyệt hoặc điện thoại thật).
- **Kiểm tra kiểu & Build:** `npm run lint` (`tsc --noEmit`) và `npm run build` đạt 0 lỗi.
- **Kiểm kê khoa học & dữ liệu:**
  - `npm run science:audit`: 149 chương trình, 48 quy tắc định lượng, 34 bài học, 18 nhánh động, 109 phương trình ion, **0 lỗi cân bằng / 0 lệch hiển thị**.
  - `npm run presets:audit`: 21 mã preset, 41 mẫu bình, **0 lỗi khối lượng**.
  - `npm run physics:audit`: 185 hồ sơ phủ đủ 6 nhóm.
  - `npm run autoplay:audit -- fe_hcl agcl_nh3 agi_na2s2o3 cac2_h2o feoh3_hcl cu_hno3_conc cu_hno3_dilute`: **7/7 đạt** (`failed: []`).
  - `tests/auto_experiment.test.ts`: **152/152 đạt** toàn danh mục tự động.
- **Kiểm chứng trình duyệt production độc lập** (Chrome headless trên `http://127.0.0.1:6767/lab/`):
  - `node scripts/auditStandaloneProduction.mjs`: `manual: true`, `automatic: true`, `paused: true`, `errors: []`, `assets: []`; xác nhận `initialChunks` chỉ tải 8 chunk lõi, không tải sớm `vendor-charts`, `TitrationPanel`, `GuidedExperimentPanel`, `LabReportModal` hay kho tra cứu lớn.
  - `node scripts/auditPhaseProduction.mjs`: `pass: true`, `errors: []`, `consoleErrors: []`, tạo và lưu mẫu nước–đá 20 mL + 5 g ở 0 °C với nhãn tiếng Việt đầy đủ.
- **Bộ kiểm thử hồi quy tổng thể (Vitest):** `npx vitest run --maxWorkers=1 --reporter=dot` đạt **3.849/3.849 kiểm thử trên 307/307 tệp** (373,52 giây, 0 lỗi), bao gồm toàn bộ 152 bài kiểm thử `auto_experiment.test.ts`, 20/20 bài `landolt_clock.test.ts`, các bài canary K1–K5, tiếp xúc hạt đang tan và 12 kiểm thử mới cho Giai đoạn 1–5.

## Giới hạn còn lại

- Các ngưỡng nồng độ khối lượng `HNO3`/`H2SO4`, ngưỡng nhiệt thụ động hóa 45 °C, hệ số cuốn huyền phù theo hình thái và đường enthalpy pha loãng `H2SO4` ở 25 °C là mô hình tham chiếu/xấp xỉ minh họa (`estimated`), chưa thay thế tính hoạt độ nhiệt động lực học ở nồng độ cao hoặc số đo phòng thí nghiệm.
- Nhánh **Thiết lập → Vật lí** vẫn giữ tắt mặc định vì cần thêm kiểm chứng tương tác trên Safari/điện thoại thật, hình học va chạm chi tiết cho 24 dụng cụ phụ kiện và hợp nhất hoàn toàn vòng hóa học/nhiệt vào Worker.
- Build vẫn còn các chunk > 500 kB chủ yếu từ thư viện lõi (`ErrorBoundary`, `vendor-three`, `vendor-r3f`) và các chunk tải theo yêu cầu (WASM Rapier ~4,4 MB, kho tra cứu 1.299 phương trình ~2,5 MB).
