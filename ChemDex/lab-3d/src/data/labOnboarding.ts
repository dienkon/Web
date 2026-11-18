export type GuideDestination = 'manual' | 'equipment' | 'chemicals' | 'inspect' | 'lessons' | 'auto';

type Copy = { vi: string; en: string };
export interface LabGuideStep {
  id: string;
  title: Copy;
  summary: Copy;
  instructions: Copy[];
  tip: Copy;
  action?: { destination: GuideDestination; label: Copy };
}

// Keep localized instructions intact in the chemical-name build transform.
const uiText = (vi: string, en: string): Copy => ({ vi, en });

export const LAB_GUIDE_STEPS: LabGuideStep[] = [
  {
    id: 'welcome',
    title: uiText('Làm quen với phòng thí nghiệm', 'Meet your virtual lab'),
    summary: uiText('Khoảng 3 phút để biết bắt đầu từ đâu và thao tác như thế nào.', 'About 3 minutes to learn where to start and what to do.'),
    instructions: [
      uiText('Chọn “Thao tác” trên thanh đầu trang để tự thêm dụng cụ, đong hóa chất và quan sát trên bàn 3D.', 'Choose “Hands-on” in the top bar to add equipment, measure chemicals and explore the 3D bench.'),
      uiText('Chọn “Tự động” nếu muốn xem một thí nghiệm mẫu thực hiện lần lượt các thao tác trước khi tự làm.', 'Choose “Automatic” to watch a sample experiment perform its steps before trying it yourself.'),
      uiText('Đọc từng bước bên dưới. Khi có nút “Thử…”, nhấn để mở đúng khu vực thực hành; sau đó nhấn “Hướng dẫn” trên thanh đầu trang để đọc tiếp.', 'Read each step below. Use a “Try…” button to open the relevant workspace, then use “Guide” in the top bar to continue reading.'),
    ],
    tip: uiText('Bạn có thể chọn bất kỳ mục nào trong danh sách. Hướng dẫn ghi nhớ bước đang đọc trên trình duyệt này.', 'Jump to any topic in the list. This browser remembers your reading position.'),
  },
  {
    id: 'equipment',
    title: uiText('Thêm và chọn dụng cụ', 'Add and select equipment'),
    summary: uiText('Bắt đầu bằng một cốc rỗng để tập đong nước.', 'Start with an empty beaker to practise measuring water.'),
    instructions: [
      uiText('Ở chế độ “Thao tác”, nhấn nút “Hóa chất” ở góc phải thanh đầu trang (biểu tượng cốc trên màn hình nhỏ).', 'In “Hands-on”, click “Catalog” at the top right (the beaker icon on small screens).'),
      uiText('Chọn thẻ “Dụng cụ” trong bảng bên trái, rồi nhấn “Cốc mỏ 100mL”. Mỗi lần nhấn sẽ thêm một cốc lên bàn.', 'Select “Equipment” in the left panel, then click “Beaker 100mL”. Each click adds a beaker to the bench.'),
      uiText('Nhấn vào cốc vừa thêm trên bàn 3D để chọn. Đóng bảng bằng dấu × nếu bảng đang che dụng cụ.', 'Click the new beaker on the 3D bench to select it. Close the panel with × if it covers the equipment.'),
    ],
    tip: uiText('Trước khi thêm hóa chất, luôn chọn đúng bình nhận. Nếu không chọn bình, web có thể dùng bình đầu tiên trên bàn.', 'Always select the intended receiving vessel before adding a chemical. Without a selection, the lab may use the first vessel on the bench.'),
    action: { destination: 'equipment', label: uiText('Thử mở kho dụng cụ', 'Try opening equipment') },
  },
  {
    id: 'chemicals',
    title: uiText('Đong và thêm hóa chất', 'Measure and add chemicals'),
    summary: uiText('Bài tập đầu tiên: thêm 10 mL nước vào cốc rỗng vừa chọn.', 'First exercise: add 10 mL of water to your selected empty beaker.'),
    instructions: [
      uiText('Mở thẻ “Hóa chất”, nhập “H2O” vào ô “Tìm hóa chất…”, rồi nhấn vào dòng nước. Bạn cũng có thể kéo dòng hóa chất thả vào bình nhận.', 'Open “Chemicals”, type “H2O” into “Search chemical…”, then click the water entry. You can also drag a chemical entry onto its receiving vessel.'),
      uiText('Trong hộp đong, kiểm tra tên ở dòng “Rót vào bình”. Chọn mức “10 mL” và nhấn “Đong & Rót 10.00 mL”. Chờ thao tác cấp nước kết thúc.', 'In the measurement dialog, check “Dispense Into”. Choose “10 mL”, then “Pour 10.00 mL to Vessel”. Wait for the transfer to finish.'),
      uiText('Với hóa chất khác, chú ý đơn vị: chất lỏng dùng mL, chất rắn dùng g, chất chỉ thị dùng giọt. Dùng “Hủy” nếu chọn nhầm hóa chất hoặc bình.', 'For other chemicals, check the unit: mL for liquids, g for solids and drops for indicators. Use “Cancel” if you selected the wrong chemical or vessel.'),
    ],
    tip: uiText('Chỉ thêm nước vào cốc rỗng trong bài làm quen này. Kiểm tra lượng còn trống của bình trước mỗi lần thêm.', 'Use only an empty beaker for this water exercise. Check the vessel’s remaining capacity before each addition.'),
    action: { destination: 'chemicals', label: uiText('Thử mở kho hóa chất', 'Try opening chemicals') },
  },
  {
    id: 'observe',
    title: uiText('Đọc thông tin và quan sát kết quả', 'Read measurements and results'),
    summary: uiText('Kết hợp hình ảnh trên bàn với số liệu của bình đang chọn.', 'Compare what you see on the bench with the selected vessel’s measurements.'),
    instructions: [
      uiText('Nhấn vào cốc trên bàn, rồi mở “Quan sát” ở góc phải thanh đầu trang (biểu tượng chữ i trên màn hình nhỏ).', 'Select the beaker on the bench, then open “Inspect” at the top right (the i icon on small screens).'),
      uiText('Trong thẻ “Thông tin bình”, kiểm tra thể tích, nhiệt độ và thành phần. Với cốc mới chỉ thêm 10 mL nước, kiểm tra lượng nước đã nhận.', 'In “Vessel”, check volume, temperature and contents. For the fresh beaker with only 10 mL of water added, check the received amount.'),
      uiText('Khi làm thí nghiệm có phản ứng, mở thẻ “Phản ứng” để đọc phương trình và hiện tượng. Dùng nút tạm dừng trên thanh điều khiển khi cần đọc kỹ; nhấn lại để tiếp tục.', 'For a reacting experiment, open “Reaction” to read the equation and observations. Pause using the toolbar when you need more time to read, then resume with the same button.'),
    ],
    tip: uiText('Thêm nước vào cốc rỗng là bài tập thao tác, không cần xuất hiện phản ứng. Trên điện thoại, mở từng bảng để có thêm chỗ quan sát.', 'Adding water to an empty beaker is a controls exercise; a reaction is not expected. On a phone, open one panel at a time for more viewing space.'),
    action: { destination: 'inspect', label: uiText('Thử mở bảng quan sát', 'Try opening inspection') },
  },
  {
    id: 'handling',
    title: uiText('Di chuyển, cầm và rót giữa hai bình', 'Move, hold and pour between vessels'),
    summary: uiText('Tập với nước sau khi đã quen thao tác chọn bình.', 'Practise with water once you are comfortable selecting vessels.'),
    instructions: [
      uiText('Thêm một cốc rỗng thứ hai. Bật “Di chuyển” trên thanh điều khiển rồi kéo dụng cụ đến vị trí mong muốn. Nếu bình bị khóa, chọn bình và nhấn “Mở khóa”.', 'Add a second empty beaker. Enable “Move” in the toolbar, then drag equipment into position. If a vessel is locked, select it and click “Unlock”.'),
      uiText('Chọn cốc chứa nước, nhấn G để cầm, đưa gần miệng cốc nhận. Khi web nhận diện bình đích, dùng Q để tăng độ nghiêng, E để giảm; R/F nâng hoặc hạ bình.', 'Select the water beaker, press G to hold it and move it near the receiver’s mouth. Once the target is detected, use Q to increase tilt, E to reduce it, and R/F to raise or lower the vessel.'),
      uiText('Nhấn Esc để hủy thao tác và thả dụng cụ. Nếu không dùng bàn phím, mở “Dụng cụ” trên thanh điều khiển để thao tác bằng nút và tọa độ. Nút “Trợ giúp phím tắt” ở góc dưới trái liệt kê các phím.', 'Press Esc to cancel and release equipment. Without a keyboard, open “Instruments” in the toolbar for buttons and coordinates. “Lab Controls” at the bottom left lists the shortcuts.'),
    ],
    tip: uiText('Lăn chuột trên bình đang thao tác có thể chỉnh thông số của bình. Để xem góc khác một cách rõ ràng, mở “Thiết lập” → “Góc nhìn”.', 'Scrolling over a manipulated vessel can adjust its parameters. For a clear alternate view, open “Settings” → “View”.'),
    action: { destination: 'manual', label: uiText('Thử trên bàn thao tác', 'Try the hands-on bench') },
  },
  {
    id: 'lessons',
    title: uiText('Làm thí nghiệm theo bài học', 'Follow a guided lesson'),
    summary: uiText('Dùng bài mẫu để biết thứ tự thao tác và mục tiêu cần đạt.', 'Use a lesson to learn the sequence and its learning goals.'),
    instructions: [
      uiText('Mở kho “Hóa chất” trên thanh đầu trang, rồi chọn thẻ “Bài học” trong bảng bên trái.', 'Open “Catalog” in the top bar, then select “Guide” in the left panel.'),
      uiText('Chọn thí nghiệm trong thư viện hoặc chương trình thí nghiệm chuẩn. Đọc mô tả, điều kiện và lượng chất trước khi bắt đầu; việc chuẩn bị bài mẫu có thể thay đổi bàn hiện tại.', 'Choose an experiment from the library or curriculum. Read its description, conditions and quantities first; preparing a lesson can change the current bench.'),
      uiText('Thực hiện theo từng bước hiển thị, kiểm tra kết quả và trả lời câu hỏi của bài. Dùng chế độ hướng dẫn trước khi thử các chế độ đánh giá khó hơn.', 'Follow the displayed steps, check the outcome and answer the lesson questions. Start with the guided difficulty before trying harder assessment modes.'),
    ],
    tip: uiText('Thẻ “An toàn” trong cùng bảng giúp xem nguy cơ của hóa chất đang có trên bàn và trang bị bảo hộ tương ứng.', 'The “Safety” tab in the same panel shows hazards for the chemicals on your bench and their protective equipment.'),
    action: { destination: 'lessons', label: uiText('Thử mở danh sách bài học', 'Try opening lessons') },
  },
  {
    id: 'automatic',
    title: uiText('Xem một thí nghiệm tự động', 'Watch an automatic experiment'),
    summary: uiText('Theo dõi mẫu thao tác, lượng chất và hiện tượng theo trình tự.', 'Follow a demonstration’s actions, quantities and observations in order.'),
    instructions: [
      uiText('Chọn “Tự động” ở đầu trang, nhấn “Chọn phản ứng” hoặc biểu tượng tìm kiếm ở góc phải bàn tự động.', 'Choose “Automatic” at the top, then “Chọn phản ứng” (choose a reaction) or the search icon at the top right of that workspace.'),
      uiText('Tìm và chọn một phản ứng, ví dụ “CuSO4 + NaOH”. Web sẽ chuẩn bị bàn tự động và chạy các thao tác. Đọc chú thích bên dưới bàn; dùng nút tạm dừng và tốc độ để theo dõi.', 'Find and select a reaction, for example “CuSO4 + NaOH”. The automatic bench prepares and runs its steps. Read the captions below the bench; use pause and speed controls to follow along.'),
      uiText('Mở biểu tượng trình tự cạnh nút tìm kiếm để xem phương trình, các bước và số liệu. Dùng “Cận cảnh” để xem gần, “Làm lại thí nghiệm” để chạy lại; chọn “Thao tác” ở đầu trang để trở về.', 'Open the timeline icon next to search for the equation, steps and measurements. Use “Cận cảnh” for a close view, restart to replay, and “Hands-on” in the top bar to return.'),
    ],
    tip: uiText('Bàn tự động hoạt động riêng; bạn có thể quay lại bàn thao tác đang làm. Bật “Liên tục” nếu muốn tự chuyển sang thí nghiệm tiếp theo.', 'The automatic bench is separate; you can return to your hands-on work. Enable “Liên tục” to advance automatically to the next experiment.'),
    action: { destination: 'auto', label: uiText('Thử chế độ tự động', 'Try automatic mode') },
  },
  {
    id: 'ready',
    title: uiText('Sẵn sàng tự khám phá', 'Ready to explore'),
    summary: uiText('Những cách xử lý nhanh khi bạn chưa biết làm tiếp thế nào.', 'Quick answers when you are unsure how to continue.'),
    instructions: [
      uiText('Không thấy kho hoặc thông tin bình? Mở lại “Hóa chất” / “Quan sát” ở thanh đầu trang. Không thấy dụng cụ cần chọn? Đóng bảng bên cạnh và đổi góc nhìn trong “Thiết lập”.', 'Missing the catalog or vessel information? Reopen “Catalog” / “Inspect” in the top bar. Cannot see equipment? Close the side panel and change the view in “Settings”.'),
      uiText('Không thêm được hóa chất? Kiểm tra bình nhận, dung tích còn trống và chờ lần cấp trước kết thúc. Không thấy phản ứng tiếp tục? Kiểm tra nút tạm dừng và điều kiện trong bài học.', 'Cannot add a chemical? Check the receiver, remaining capacity and whether a previous transfer is still running. Reaction stopped? Check pause and the lesson’s required conditions.'),
      uiText('Thao tác nhầm? Dùng “Hoàn tác” nếu nút còn khả dụng. Mở “Thiết lập” → “Báo cáo thực hành” để xem báo cáo; chỉ dùng “Đặt lại bàn thí nghiệm” khi muốn làm lại toàn bộ.', 'Made a mistake? Use “Undo” when available. Open “Settings” → “Lab report” for your report; use “Reset workbench” only when you want to start the entire bench again.'),
    ],
    tip: uiText('Nhấn “Hoàn tất hướng dẫn” để kết thúc. Nút “Hướng dẫn” luôn ở thanh đầu trang để xem lại bất kỳ lúc nào.', 'Click “Finish guide” to complete onboarding. “Guide” stays in the top bar whenever you want to revisit it.'),
  },
];
