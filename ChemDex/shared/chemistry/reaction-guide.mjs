// Qualitative teaching guides. No rate constant, induction time or thermal
// threshold is inferred from an equation or an animation's duration.
const FAMILIES = {
  precipitation: ['Các ion tạo pha ít tan khi tích hoạt độ ion vượt tích số tan; ion đối ở lại trong dung dịch.', 'Ion trộn và khuếch tán tại vùng tiếp xúc; chỉ khi Q > Ksp mới xuất hiện mầm rắn.', 'Hạt rắn lớn dần, tạo huyền phù rồi có thể kết bông và lắng. Lắng là quá trình vật lý sau tạo hạt.', 'Sự tạo ion thường nhanh khi trộn, nhưng tạo mầm, lớn hạt và lắng có thang thời gian riêng; cần nồng độ và Ksp để tính.'],
  neutralization: ['Axit cho proton, bazơ nhận proton; lượng dư và cân bằng axit–bazơ quyết định pH cuối.', 'Các pha tiếp xúc và trộn; proton được trao đổi trong dung dịch.', 'pH đổi theo đương lượng đã phản ứng. Chỉ thị chỉ đổi màu nếu có chỉ thị và pH đi qua vùng chuyển màu.', 'Trao đổi proton thường nhanh; tốc độ quan sát có thể bị giới hạn bởi trộn. Không dùng thời lượng chuyển màu làm hằng số tốc độ.'],
  oxide_acid: ['Oxit bazơ nhận proton và tạo muối; oxit rắn phải tiếp xúc với pha axit.', 'Axit thấm ướt bề mặt oxit; sản phẩm hình thành tại mặt phân cách.', 'Hạt oxit giảm dần khi bị tiêu thụ; màu dung dịch chỉ đổi nếu ion sản phẩm có màu.', 'Diện tích bề mặt, nồng độ axit, khuấy và nhiệt độ ảnh hưởng tốc độ hòa tan; không áp cùng số giây cho mọi oxit.'],
  carbonate_acid: ['Proton hóa carbonate hoặc bicarbonate tạo hệ CO2 hòa tan–khí và nước.', 'Axit tiếp xúc với carbonate; chất rắn bắt đầu bị ăn mòn tại bề mặt.', 'CO2 sinh ra có thể hòa tan trước khi tạo bọt, nổi và thoát qua mặt thoáng.', 'Tốc độ phụ thuộc nồng độ axit, diện tích hạt, trộn và thoát khí; hết một chất tham gia thì nguồn khí dừng.'],
  sulfite_acid: ['Axit hóa sulfite tạo SO2 và nước theo cân bằng phân bố các dạng sulfur(IV).', 'Axit trộn với sulfite trong môi trường đã ghi.', 'SO2 có thể chuyển từ dung dịch sang pha khí; không vẽ mây màu chỉ vì có công thức khí.', 'Mức axit hóa, hòa tan khí và vận chuyển khối quyết định mức thoát SO2.'],
  sulfide_acid: ['Axit hóa sulfide phù hợp tạo H2S; không suy quy tắc này cho mọi sulfide ít tan.', 'Môi trường axit tiếp xúc với sulfide được chỉ định.', 'H2S phân bố giữa dung dịch và pha khí; bọt cần có khí thực sự rời dung dịch.', 'Độ tan sulfide, pH và vận chuyển khí quyết định diễn biến; chỉ áp dụng đúng điều kiện riêng của mục.'],
  ammonium_base: ['OH− nhận proton từ NH4+ tạo NH3 và nước; NH3 có thể còn hòa tan.', 'Bazơ trộn với dung dịch chứa ion amoni.', 'NH3 được tạo trong dung dịch rồi có thể thoát khí, mạnh hơn khi làm ấm; không tự tạo khói trắng.', 'Phản ứng axit–bazơ và thoát khí là hai quá trình riêng; nhiệt độ, pH và diện tích mặt thoáng ảnh hưởng quan sát.'],
  metal_acid: ['Kim loại bị oxi hóa; proton của axit không oxi hóa nhận electron tạo H2 theo nhánh này.', 'Axit thấm ướt bề mặt kim loại; màng oxit có thể làm chậm lúc đầu.', 'Kim loại bị ăn mòn đồng thời H2 sinh ở vùng tiếp xúc và thoát khỏi dung dịch.', 'Nồng độ, diện tích bề mặt, màng thụ động và nhiệt độ quyết định tốc độ; Cu/Ag không được tự gán nhánh H2 với HCl.'],
  displacement: ['Kim loại hoạt động hơn nhường electron cho ion kim loại trong dung dịch; cần xét thế điện cực và thụ động hóa.', 'Dung dịch làm ướt bề mặt kim loại; trao đổi electron xảy ra tại đó.', 'Kim loại sản phẩm bám hoặc tạo hạt tại bề mặt, trong khi kim loại ban đầu bị hòa tan.', 'Tốc độ phụ thuộc trạng thái bề mặt, nồng độ ion và lớp sản phẩm; không coi lớp bám là kết tủa hydroxide.'],
  esterification: ['Axit carboxylic và alcohol tạo este cùng nước trong cân bằng thuận nghịch có xúc tác phù hợp.', 'Hai chất tiếp xúc trong môi trường xúc tác và nhiệt độ đã chỉ định.', 'Este tích lũy dần cùng nước; chuyển hóa bị giới hạn bởi cân bằng, không tự đạt 100%.', 'Thời gian phụ thuộc xúc tác, nhiệt độ và thành phần; tách sản phẩm hoặc dùng chất dư có thể dịch chuyển cân bằng.'],
  saponification: ['OH− thủy phân este tạo carboxylat và alcohol; bazơ là chất tham gia được tiêu thụ.', 'Pha este tiếp xúc dung dịch kiềm; khuấy tăng diện tích tiếp xúc nếu hai pha tách nhau.', 'Este giảm dần; muối carboxylat và alcohol tăng theo đúng hệ số.', 'Khuếch tán hai pha, nhiệt độ và nồng độ OH− ảnh hưởng tốc độ; không mặc định tạo bọt xà phòng cho mọi este.'],
  combustion: ['Trong nhánh cháy hoàn toàn này, chất hữu cơ nhận O2 và tạo CO2 cùng H2O; thiếu O2 cần mô hình sản phẩm khác.', 'Chỉ bắt đầu sau sự kiện mồi hợp lệ khi nhiên liệu và O2 sẵn có.', 'Vùng cháy tiêu thụ nhiên liệu và O2, sinh nhiệt và sản phẩm; hơi nước không tự đồng nghĩa với khói trắng.', 'Tốc độ phụ thuộc cấp nhiên liệu, O2 và trộn. Thời lượng ngọn lửa không phải hằng số tốc độ chung cho mọi nhiên liệu.'],
  thermal: ['Nhiệt phân biến đổi chất đầu thành các sản phẩm đã ghi; nhiệt là điều kiện và có thể là nguồn năng lượng phải cấp liên tục.', 'Gia nhiệt mẫu đến miền điều kiện riêng; bật đèn chưa chứng minh mẫu đã đủ nóng.', 'Chất đầu giảm trong khi sản phẩm rắn/khí tích lũy theo hệ số; khí chỉ thoát khi thực sự được tạo.', 'Nhiệt độ mẫu, cấp nhiệt, kích thước hạt và áp suất sản phẩm quyết định tốc độ; không suy ngưỡng chung 60 °C.'],
  synthesis: ['Các chất tham gia kết hợp tạo sản phẩm; chiều và mức chuyển hóa phụ thuộc điều kiện cụ thể của phương trình.', 'Thiết lập đúng pha, môi trường và cách kích hoạt đã ghi trước khi tạo sản phẩm.', 'Sản phẩm tích lũy theo lượng chất thực sự chuyển hóa; trạng thái rắn không tự chứng minh có hiện tượng kết tủa.', 'Cần dữ liệu riêng về nhiệt độ, áp suất, xúc tác và bề mặt để tính thời gian; không suy tốc độ chỉ từ phương trình cân bằng.'],
  redox: ['Chất khử nhường electron và chất oxi hóa nhận electron; môi trường quyết định dạng sản phẩm và cân bằng điện tích.', 'Trộn đúng chất trong môi trường axit/kiềm và điều kiện xúc tác đã chỉ định.', 'Số oxi hóa thay đổi; màu hoặc khí chỉ xuất hiện khi đúng chất mang màu hoặc khí đã được tạo.', 'Phụ thuộc nồng độ, môi trường, nhiệt độ và cơ chế; không gán cùng đường đổi màu hay độ trễ cho mọi phản ứng redox.'],
  amphoteric: ['Chất lưỡng tính phản ứng theo môi trường axit hoặc kiềm; dư phối tử/kiềm có thể đổi dạng tồn tại.', 'Chất rắn tiếp xúc với môi trường được chỉ định; kiểm tra lượng axit/kiềm dư.', 'Chất rắn có thể tan khi tạo ion hoặc phức tan. Chỉ có giai đoạn kết tủa trước nếu chất đầu và thứ tự thêm cho phép.', 'pH, lượng dư, trạng thái pha và trộn quyết định chuyển hóa; không chạy chuỗi kết tủa–tan vô hạn.'],
  organic_conversion: ['Nhóm chức thay đổi theo điều kiện và thuốc thử được chỉ định; công thức phân tử không đủ để suy mọi đồng phân.', 'Thiết lập thuốc thử, xúc tác, nhiệt độ và pha đúng với chất đại diện của mục.', 'Nhóm chức/sản phẩm thay đổi theo phương trình; không tự thêm khí, ngọn lửa hoặc màu nếu thiếu bằng chứng.', 'Cần dữ liệu thực nghiệm cho từng chất đại diện, xúc tác và môi trường; không áp động học của một đồng phân cho tất cả.'],
  catalytic_decomposition: ['Xúc tác mở đường phản ứng có hàng rào hoạt hóa thấp hơn và không bị tiêu thụ theo phương trình tổng.', 'Chất đầu tiếp xúc đúng xúc tác, đúng pha; gia nhiệt không thay cho xúc tác bị thiếu.', 'Chất đầu phân hủy, khí được tạo và có thể thoát; xúc tác được giữ trong kiểm kê.', 'Tốc độ phụ thuộc nồng độ, nhiệt độ, lượng và diện tích xúc tác. Bọt bền cần thêm chất giữ bọt; O2 không tự tạo bọt xà phòng.'],
};
const GAS = { H2: 'không màu', O2: 'không màu', CO2: 'không màu', NH3: 'không màu', SO2: 'không màu', H2S: 'không màu', NO: 'không màu; có thể bị O2 oxi hóa thành NO2 sau khi thoát', NO2: 'nâu, phụ thuộc nồng độ và cân bằng NO2/N2O4', Cl2: 'vàng lục, phụ thuộc nồng độ', H2O: 'hơi không màu; sương chỉ xuất hiện khi ngưng tụ thành giọt' };
const SOLID = { AgCl: 'trắng', AgBr: 'kem nhạt', AgI: 'vàng nhạt', PbI2: 'vàng', BaSO4: 'trắng', CaCO3: 'trắng', 'Cu(OH)2': 'xanh lam', 'Fe(OH)3': 'nâu đỏ', 'Fe(OH)2': 'lục nhạt, dễ bị oxi hóa ngoài không khí', 'Al(OH)3': 'trắng dạng keo', 'Mg(OH)2': 'trắng', Cu: 'đồng đỏ', Ag: 'bạc/xám tùy kích thước hạt', MgO: 'trắng', CuO: 'đen', S: 'vàng' };

export function reactionGuide(entry) {
  const family = FAMILIES[entry.family];
  if (!family) throw new Error(`Missing reaction guide family: ${entry.family}`);
  const gases = entry.products.filter(p => p.phase === 'g');
  const solids = entry.products.filter(p => p.phase === 's');
  const requirements = [
    ...entry.reactants.map(r => `Có ${r.formula} ở pha ${r.phase} với lượng dương; phần bám thành, bọt hoặc mẫu trong dụng cụ khác không tính là đã tiếp xúc.`),
    entry.conditions.description_vi,
  ];
  if (entry.family === 'precipitation') requirements.push('Cần nồng độ/hoạt độ ion, môi trường và Ksp phù hợp để kiểm tra Q > Ksp; tên hai muối chưa đủ để xác nhận kết tủa.');
  if (entry.conditions.catalyst) requirements.push(`Có xúc tác ${entry.conditions.catalyst}; kiểm kê riêng và không tiêu thụ xúc tác như chất tham gia.`);
  const products = entry.products.map(p => `${p.coefficient} mol ${p.formula} (${p.phase})`).join(' + ');
  const observation = [
    ...gases.map(p => `${p.formula}(g): ${GAS[p.formula] ?? 'chưa gán màu khí nếu chưa có dữ liệu riêng'}.`),
    ...solids.map(p => `${p.formula}(s): ${SOLID[p.formula] ?? 'chưa gán màu/hình thái riêng'}.`),
    ...(!gases.length ? ['Phương trình không có sản phẩm khí; không tự sinh bọt hoặc mây khí.'] : []),
    ...(!solids.length ? ['Phương trình không có sản phẩm rắn; không tự tạo kết tủa.'] : []),
  ];
  return {
    requirements,
    stages: [
      { id: 'conditions', title_vi: 'Kiểm tra điều kiện', explanation_vi: entry.conditions.description_vi },
      { id: 'initiation', title_vi: 'Bắt đầu tại vùng tiếp xúc', explanation_vi: family[1] },
      { id: 'conversion', title_vi: 'Chuyển hóa và hiện tượng', explanation_vi: `${family[2]} ${observation.join(' ')}` },
      { id: 'completion', title_vi: 'Dừng nguồn và quan sát sản phẩm', explanation_vi: 'Dừng tạo sản phẩm mới khi hết chất giới hạn, không còn điều kiện hoặc đạt cân bằng. Khí đã thoát không được sinh lại; hạt rắn đã có vẫn có thể lắng và mẫu vẫn có thể trao đổi nhiệt.' },
    ],
    mechanism_vi: `${entry.explanation_vi} ${family[0]}`,
    stoichiometry_vi: `Với 1 mol mức tiến triển theo phương trình đã viết, tiêu thụ ${entry.reactants.map(r => `${r.coefficient} mol ${r.formula}`).join(' + ')} và tạo ${products}. Mức tiến triển tối đa bị giới hạn bởi min(nᵢ/νᵢ), đồng thời còn phải xét cân bằng và điều kiện thực tế.`,
    rate: { calibrated: false, duration_s: null, explanation_vi: family[3], sourceIds: ['openstax-rates'] },
    observations_vi: observation,
  };
}

export function reactionGuideErrors(entry) {
  const errors = [];
  try {
    const guide = reactionGuide(entry);
    if (guide.stages.length !== 4 || guide.requirements.length < entry.reactants.length + 1) errors.push('Incomplete observation sequence');
    if (guide.rate.calibrated || guide.rate.duration_s !== null) errors.push('Unverified quantitative rate');
  } catch (error) { errors.push(error.message); }
  return errors;
}
