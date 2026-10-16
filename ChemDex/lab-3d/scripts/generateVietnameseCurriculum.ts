import { mkdirSync, writeFileSync } from 'node:fs';
import { ALL_HANDCRAFTED_PROGRAMS } from '../src/vfx/programs/library/index';
import { computeMolarMass } from '../src/engine/ledger';
import { INORGANIC_PROTOCOLS } from '../src/data/curriculum/inorganicProtocols';
import { getLessonDefinition, LESSON_DEFINITIONS } from '../src/lesson/catalog';
import { LESSON_SPECIES } from '../src/lesson/catalog/species';
import { compileLessonProgram, LESSON_PROGRAM_IDS } from '../src/lesson/programCompiler';
import { getReactionReview, SCIENCE_REFERENCES } from '../src/science/reviewCatalog';

// This is a reproducible export, not an AI endpoint. Quantities are deliberately
// omitted where the underlying library has no verified experimental protocol.
const sources = {
  curriculum: 'https://quanlysangkien.bacgiang.gov.vn/sites/default/files/thong-tu-32-2018-tt-bgddt-ban-hanh-chuong-trinh-giao-duc-pho-thong-moi.pdf',
  observations: 'https://edu.rsc.org/experiments/observing-chemical-changes/508.article',
  copperAmmonia: 'https://edu.rsc.org/experiments/an-equilibrium-using-copperii-and-ammonia/1711.article',
};
const exclude = new Set([
  'phenolphthalein_naoh', 'methyl_orange_hcl', 'bromothymol_blue_base',
  'flame_cu', 'flame_na', 'flame_k', 'i2_sublimation', 'water_into_h2so4',
  'nh4no3_dissolution', 'naoh_dissolution', 'cacl2_dissolution', 'h2so4_dilution',
  'agno3_k2cro4', 'bacl2_k2cro4', 'kbr_cl2', 'cu_hno3_dilute',
  'fecl3_3kscn', 'iodine_clock',
]);
const special: Record<string, string[]> = {
  cuso4_naoh: ['Nhỏ NaOH từ từ vào dung dịch CuSO4 màu xanh lam.', 'Kết tủa Cu(OH)2 xanh nhạt dạng keo xuất hiện tại nơi giọt kiềm tiếp xúc.', 'Khuấy nhẹ: huyền phù xanh lan khắp bình; không có khí.', 'Để yên: bông keo lắng chậm; NaOH dư không làm tan kết tủa trong điều kiện thí nghiệm này.'],
  feso4_naoh: ['Dùng dung dịch FeSO4 mới pha, hạn chế tiếp xúc không khí.', 'Nhỏ NaOH: kết tủa Fe(OH)2 trắng xanh hình thành.', 'Lắc nhẹ trong không khí: bề mặt dần ngả nâu do oxy hóa.', 'Để lâu: Fe(OH)3 nâu đỏ tăng dần; đây là phản ứng tiếp theo với O2, không phải màu ban đầu của Fe(OH)2.'],
  alcl3_naoh: ['Nhỏ từng giọt NaOH vào dung dịch AlCl3, chưa cho kiềm dư.', 'Xuất hiện Al(OH)3 keo trắng.', 'Tiếp tục thêm NaOH dư: bông keo tan dần.', 'Dung dịch trở lại trong do tạo [Al(OH)4]−; phải tách hai giai đoạn kết tủa và hòa tan.'],
  cuso4_nh3: ['Thêm ít NH3 vào dung dịch CuSO4 xanh nhạt.', 'OH− do NH3 thủy phân tạo lượng kết tủa Cu(OH)2 xanh nhạt.', 'Thêm tiếp NH3 dư và khuấy: kết tủa tan.', 'Dung dịch xanh thẫm do phức tetraamminđồng(II); không tạo khí màu xanh.'],
  caoh2_co2: ['Dẫn CO2 vào nước vôi trong theo từng đợt.', 'Xuất hiện CaCO3 trắng làm nước vôi đục.', 'Tiếp tục CO2 dư: CaCO3 tan dần thành Ca(HCO3)2 tan.', 'Dung dịch trong trở lại; không thể gán cùng một trạng thái cuối cho mọi lượng CO2.'],
  cu_hno3_dil: ['Quan sát mô phỏng đồng tiếp xúc HNO3 loãng trong hệ thu khí.', 'Đồng tan, dung dịch chuyển xanh do Cu2+; khí NO mới sinh không màu.', 'Cho khí tiếp xúc không khí trong mô phỏng.', 'NO bị O2 oxy hóa thành NO2 nâu; màu nâu xuất hiện sau tiếp xúc không khí.'],
  fe_cuso4: ['Làm sạch bề mặt đinh sắt rồi đưa vào dung dịch CuSO4 xanh.', 'Đồng đỏ nâu bám trực tiếp lên bề mặt sắt.', 'Màu xanh lam nhạt dần, dung dịch có thể ngả xanh lục nhạt do Fe2+.', 'Rút đinh, so sánh với mẫu đối chứng; không mô tả đồng kết tinh đồng đều trong toàn bộ thể tích.'],
  hcl_naoh: ['Đong dung dịch HCl loãng và thêm vài giọt phenolphtalein.', 'Thêm NaOH từ từ, khuấy đều; vệt hồng tại điểm rơi biến mất khi axit còn dư.', 'Gần điểm kết thúc, thêm từng giọt.', 'Dừng ở hồng nhạt bền khoảng 30 giây; điểm kết thúc chỉ thị gần điểm tương đương, không phải hồng đậm.'],
  kmno4_oxalic: ['Quan sát mẫu oxalat đã được axit hóa bằng H2SO4 loãng.', 'Làm ấm bằng bể nước theo quy trình giáo viên; không thay bằng HCl.', 'Thêm KMnO4: lúc đầu mất màu chậm, sau nhanh dần do Mn2+ xúc tác.', 'CO2 không màu thoát ra; gần điểm kết thúc chỉ còn hồng nhạt của KMnO4 dư.'],
};

type Extra = [string, string, string, string, string, string];
// id, topic, balanced equation, condition, observation, explanation
const extras: Extra[] = [
  ['ethene_bromine','Hiđrocacbon','C2H4 + Br2 -> C2H4Br2','Dung dịch brom, nhiệt độ thường','Màu vàng nâu của brom nhạt dần rồi mất khi etilen dư.','Liên kết pi tham gia phản ứng cộng; không sinh kết tủa.'],
  ['ethene_hydrogen','Hiđrocacbon','C2H4 + H2 -> C2H6','Ni, đun nóng; mô phỏng kín có kiểm soát','Hai khí không màu chuyển thành etan không màu; không tự tạo ngọn lửa.','Phản ứng cộng H2 làm mất liên kết đôi.'],
  ['ethene_water','Hiđrocacbon','C2H4 + H2O -> C2H5OH','Xúc tác axit, điều kiện công nghiệp','Không có dấu hiệu màu đặc trưng; cần phân tích sản phẩm.','Cộng nước tạo etanol, không diễn ra nhanh chỉ bằng trộn với nước lạnh.'],
  ['ethyne_bromine','Hiđrocacbon','C2H2 + 2Br2 -> C2H2Br4','Brom dư; mô phỏng','Màu brom giảm qua các giai đoạn cộng.','Một liên kết ba có thể cộng hai mol Br2.'],
  ['ethene_combustion','Hiđrocacbon','C2H4 + 3O2 -> 2CO2 + 2H2O','Mồi cháy; đủ oxi','Ngọn lửa sáng, tạo hơi nước và CO2 không màu.','Thiếu oxi có thể tạo muội; phương trình mô tả cháy hoàn toàn.'],
  ['methane_combustion','Hiđrocacbon','CH4 + 2O2 -> CO2 + 2H2O','Mồi cháy; đủ oxi','Ngọn lửa xanh khi không khí được trộn tốt.','Nhiệt và ánh sáng đến từ phản ứng oxi hóa.'],
  ['ethyne_combustion','Hiđrocacbon','2C2H2 + 5O2 -> 4CO2 + 2H2O','Mồi cháy; đủ oxi','Ngọn lửa rất sáng; cháy trong không khí thiếu oxi dễ có muội đen.','Không gán muội vào sản phẩm của phương trình cháy hoàn toàn.'],
  ['ethanol_combustion','Alcohol','C2H5OH + 3O2 -> 2CO2 + 3H2O','Mồi cháy trong mô phỏng','Lửa xanh nhạt, đôi khi khó thấy dưới ánh sáng mạnh.','Không phải mọi chất hữu cơ đều cháy bằng lửa vàng.'],
  ['ethanol_sodium','Alcohol','2C2H5OH + 2Na -> 2C2H5ONa + H2','Etanol khan; chỉ mô phỏng','Bọt H2 không màu quanh kim loại; Na nhỏ dần.','Na thay H trong nhóm OH; nước lẫn vào làm thay đổi phản ứng.'],
  ['ethanol_cuo','Alcohol','C2H5OH + CuO -> CH3CHO + Cu + H2O','Đun nóng; chỉ mô phỏng','CuO đen chuyển thành đồng đỏ.','Etanol bị oxi hóa thành etanal; Cu(II) bị khử.'],
  ['ethanol_dehydration','Alcohol','C2H5OH -> C2H4 + H2O','H2SO4 đặc, khoảng 170 °C; chỉ mô phỏng','Khí etilen không màu được tạo ra.','Điều kiện quyết định sản phẩm; không dùng như hướng dẫn đun tại nhà.'],
  ['glycerol_cuoh2','Alcohol','2C3H8O3 + Cu(OH)2 -> Cu(C3H7O3)2 + 2H2O','Cu(OH)2 mới tạo, nhiệt độ thường; công thức phức giản lược','Kết tủa xanh nhạt tan, tạo dung dịch xanh lam đậm.','Các nhóm OH kề nhau tạo phức với Cu2+.'],
  ['phenol_naoh','Phenol','C6H5OH + NaOH -> C6H5ONa + H2O','Dung dịch NaOH','Mẫu phenol tan tốt hơn; không có màu đặc trưng.','Tính axit yếu của phenol đủ phản ứng với kiềm mạnh.'],
  ['phenol_bromine','Phenol','C6H5OH + 3Br2 -> C6H2Br3OH + 3HBr','Nước brom; chỉ mô phỏng','Mất màu brom và xuất hiện kết tủa trắng 2,4,6-tribromophenol.','Nhóm OH hoạt hóa vòng benzen với phản ứng thế.'],
  ['acetic_carbonate','Carboxylic acid','2CH3COOH + Na2CO3 -> 2CH3COONa + CO2 + H2O','Dung dịch giấm và muối cacbonat','Sủi bọt CO2 không màu.','Axit axetic giải phóng CO2 từ cacbonat.'],
  ['acetic_bicarbonate','Carboxylic acid','CH3COOH + NaHCO3 -> CH3COONa + CO2 + H2O','Giấm và natri hiđrocacbonat','Bọt khí xuất hiện nhanh; có thể có bọt nổi nếu mẫu chứa chất hoạt động bề mặt.','Bản thân CO2 không tạo màu trắng đục trong pha khí.'],
  ['ethyl_acetate_synthesis','Ester','CH3COOH + C2H5OH <-> CH3COOC2H5 + H2O','Xúc tác H2SO4, làm ấm bằng bể nước; mô phỏng','Sau xử lý, lớp este nhẹ hơn nước có thể tách ở phía trên.','Phản ứng thuận nghịch; không dùng mùi làm phép thử trong mô phỏng.'],
  ['ethyl_acetate_saponification','Ester','CH3COOC2H5 + NaOH -> CH3COONa + C2H5OH','Dung dịch kiềm, làm ấm','Lớp este giảm dần khi phản ứng tiến triển.','Thủy phân este trong kiềm được kéo về phía sản phẩm muối.'],
  ['methyl_acetate_saponification','Ester','CH3COOCH3 + NaOH -> CH3COONa + CH3OH','Dung dịch kiềm, làm ấm; mô phỏng','Không có màu hoặc kết tủa đặc trưng.','Không suy ra hoàn thành chỉ từ việc mẫu trong hơn.'],
  ['glucose_cuoh2_cold','Carbohydrate','2C6H12O6 + Cu(OH)2 -> Cu(C6H11O6)2 + 2H2O','Nhiệt độ thường; công thức phức giản lược','Cu(OH)2 tan tạo dung dịch xanh lam đậm.','Các nhóm OH kề nhau tạo phức; đây chưa phải phản ứng tạo Cu2O.'],
  ['glucose_cuoh2_hot','Carbohydrate','C6H12O6 + 2Cu(OH)2 + NaOH -> C6H11O7Na + Cu2O + 3H2O','Môi trường kiềm, đun bằng bể nước','Khi nóng, xuất hiện kết tủa Cu2O đỏ gạch.','Nhóm chức khử của glucose bị oxi hóa thành gluconat.'],
  ['sucrose_hydrolysis','Carbohydrate','C12H22O11 + H2O -> C6H12O6 + C6H12O6','Axit loãng, làm ấm; sản phẩm glucose và fructose','Dung dịch vẫn trong; cần phép thử so sánh trước và sau thủy phân.','Saccarozơ thủy phân tạo hai monosaccarit khác nhau.'],
  ['starch_hydrolysis','Carbohydrate','(C6H10O5)n + nH2O -> nC6H12O6','Axit loãng, làm ấm; thủy phân hoàn toàn','Khả năng tạo màu xanh với iot giảm dần ở các mẫu kiểm tra đã nguội.','Phản ứng thực đi qua dextrin và các oligosaccarit.'],
  ['glucose_fermentation','Carbohydrate','C6H12O6 -> 2C2H5OH + 2CO2','Men, khoảng 30–35 °C, ít oxi','Bọt CO2 xuất hiện từ từ; diễn biến trong nhiều giờ.','Enzym xúc tác; không thể mô tả hoàn thành thật chỉ trong vài giây.'],
  ['methylamine_hcl','Amine','CH3NH2 + HCl -> CH3NH3Cl','Dung dịch; chỉ mô phỏng','Không có màu đặc trưng; pH giảm khi thêm HCl.','Amin nhận proton tạo muối amoni.'],
  ['aniline_bromine','Amine','C6H5NH2 + 3Br2 -> C6H2Br3NH2 + 3HBr','Nước brom; chỉ mô phỏng','Mất màu brom và xuất hiện kết tủa trắng.','Nhóm NH2 hoạt hóa vòng, tạo 2,4,6-tribromoanilin.'],
  ['glycine_hcl','Amino acid','NH2CH2COOH + HCl -> ClH3NCH2COOH','Dung dịch axit','Không có màu đặc trưng; nhóm amino nhận proton.','Glycine phản ứng với axit nhờ nhóm amino.'],
  ['glycine_naoh','Amino acid','NH2CH2COOH + NaOH -> NH2CH2COONa + H2O','Dung dịch kiềm','Không có khí hoặc kết tủa đặc trưng.','Nhóm COOH bị trung hòa; thể hiện tính lưỡng tính.'],
  ['cuo_hcl','Oxit và axit','CuO + 2HCl -> CuCl2 + H2O','HCl loãng, có thể làm ấm','Chất rắn đen tan dần; dung dịch xanh lam đến xanh lục tùy nồng độ clorua.','Oxit bazơ phản ứng axit, không giải phóng H2.'],
  ['fe2o3_hcl','Oxit và axit','Fe2O3 + 6HCl -> 2FeCl3 + 3H2O','HCl loãng, làm ấm','Chất rắn nâu đỏ tan dần, dung dịch Fe(III) ngả vàng.','Không phải phản ứng oxi hóa khử; Fe giữ số oxi hóa +3.'],
  ['cao_water','Oxit và nước','CaO + H2O -> Ca(OH)2','Thêm nước có kiểm soát; mô phỏng','Tỏa nhiệt, mẫu rắn nứt và tạo huyền phù trắng nếu vượt độ tan.','Vôi sống hydrat hóa thành vôi tôi.'],
  ['caco3_heat','Nhiệt phân','CaCO3 -> CaO + CO2','Nhiệt độ cao của lò nung; mô phỏng','Khí CO2 không màu thoát ra; chất rắn trắng còn lại.','Không diễn ra đáng kể bằng cách đun nhẹ dung dịch trên bếp.'],
  ['cuoh2_hcl','Axit và bazơ','Cu(OH)2 + 2HCl -> CuCl2 + 2H2O','Thêm axit loãng vào kết tủa','Kết tủa xanh nhạt tan dần.','Axit tiêu thụ OH−, kéo cân bằng hòa tan về phía dung dịch.'],
  ['aloh3_hcl','Axit và bazơ','Al(OH)3 + 3HCl -> AlCl3 + 3H2O','Thêm axit loãng vào kết tủa','Keo trắng tan dần thành dung dịch không màu.','Al(OH)3 có tính lưỡng tính, tan được trong axit và kiềm dư.'],
];

const records: any[] = [];
function equationSide(side: string, role: string) {
  return side.split(' + ').map(term => {
    const match = term.match(/^(\d+)?(.+)$/)!;
    return { formula: match[2], coeff: Number(match[1] ?? 1), role };
  });
}
for (const p of ALL_HANDCRAFTED_PROGRAMS) {
  if (exclude.has(p.id) || LESSON_PROGRAM_IDS.has(p.id)) continue;
  const reactants = p.chemistry.species.filter(s => s.role === 'reactant');
  const category = p.visual.after.precipitate ? 'precipitation' : p.visual.after.gasesOffgassed.length ? 'gas' : 'redox';
  const hazardous = (p.chemistry.hazards ?? []).some(h => /toxic|explosive|health_hazard/.test(h)) || /na_h2o|k_h2o|hno3|conc|cac2|kmno4_hcl/.test(p.id);
  const sequence = special[p.id] ?? INORGANIC_PROTOCOLS[p.id] ?? [
    `Chuẩn bị riêng ${reactants.map(s => `${s.formula} (${s.phase})`).join(', ')}; đối chiếu nhãn và điều kiện trước khi ghép mẫu.`,
    `Cho các chất tiếp xúc có kiểm soát theo phương trình: ${p.chemistry.equation}. ${p.chemistry.conditions?.medium ?? ''}`,
    p.explain.observation_vi,
    `Để hệ tiến triển rồi so sánh trạng thái cuối với phương trình. ${p.explain.why_vi}`,
  ];
  const grades = /cl2_|agno3_(nacl|kbr|ki)|kcl_conc/.test(p.id) ? [10]
    : /nh3|nh4|hcl_naoh|h2so4_naoh|hno3_|ch3cooh|na2co3|nahco3|caco3|caoh2_co2/.test(p.id) ? [11]
    : [12];
  const scope = /cocl|niso|bino|k2cro|k2cr2o7|fecn|scn|pbno/.test(p.id) ? 'extension' : 'core_or_review';
  records.push({
    id: p.id, title_vi: reactants.map(s => s.formula).join(' + '), suggestedGrades: grades,
    topic_vi: category === 'precipitation' ? 'Ion, kết tủa và nhận biết' : category === 'gas' ? 'Phản ứng tạo khí' : 'Axit–bazơ, oxi hóa khử và cân bằng',
    curriculumScope: scope, category, equation: p.chemistry.equation,
    ionic: p.chemistry.ionic ?? null, conditions: p.chemistry.conditions ?? {},
    reactants, products: p.chemistry.species.filter(s => s.role === 'product'),
    simulationDoses: reactants.map(species => ({ formula: species.formula, phase: species.phase,
      moles: species.coeff * 0.0001,
      mass_g: species.coeff * 0.0001 * computeMolarMass(species.formula),
      volume_ml: species.phase === 'aq' ? 2 : null,
      concentration_M: species.phase === 'aq' ? species.coeff * 0.05 : null,
      purpose: 'stoichiometric_virtual_sample_not_real_lab_protocol',
    })),
    mode: hazardous ? 'simulation_only' : 'teacher_supervised',
    runtime: 'existing_program', programId: p.id,
    protocolStatus: special[p.id] || INORGANIC_PROTOCOLS[p.id] ? 'reaction_specific' : 'qualitative_outline',
    quantityPolicy: 'Không có định lượng thực nghiệm đã kiểm chứng: giáo viên cung cấp nồng độ, lượng mẫu và quy trình trước thực hành.',
    safety_vi: p.chemistry.warning_vi ?? 'Thao tác thực phải theo quy trình giáo viên, kính bảo hộ và phân loại chất thải; không ngửi trực tiếp hoặc đậy kín hệ sinh khí.',
    hazards: p.chemistry.hazards ?? [],
    steps: sequence.map((instruction_vi, i) => ({ order: i + 1, instruction_vi, checkpoint: ['prepare','contact','observe','conclude'][i], automaticValidation: false })),
    observation_vi: p.explain.observation_vi, explanation_vi: p.explain.why_vi,
    effects: { ...p.visual, timingBasis: 'illustrative_not_measured', massBasis: 'fromLedger', gasNote_vi: 'Bọt khí trong chất lỏng không đồng nghĩa khí có màu; màu plume phải theo từng loài khí.' },
    sources: [{ url: sources.curriculum, scope: 'curriculum_context' },
      { url: p.id === 'pbno32_ki' ? 'https://edu.rsc.org/exhibition-chemistry/golden-rain/2000048.article'
        : p.id === 'cuso4_nh3' ? sources.copperAmmonia
        : /agno3_(nacl|kbr|ki)|agcl_nh3/.test(p.id) ? 'https://edu.rsc.org/experiments/the-chemistry-of-silver/516.article'
        : /cl2_kbr|ki_cl2/.test(p.id) ? 'https://edu.rsc.org/experiments/reactions-of-chlorine-with-water-or-halide-ions/530.article'
        : sources.observations,
        scope: /cuso4_nh3|agno3_(nacl|kbr|ki)|agcl_nh3|cl2_kbr|ki_cl2/.test(p.id) ? 'reaction_observation' : 'general_practical_context' }],
  });
}
for (const [id, topic, equation, condition, observation, explanation] of extras) {
  const lesson = getLessonDefinition(id);
  if (!lesson) throw new Error(`Missing dynamic lesson ${id}`);
  const program = compileLessonProgram(lesson);
  const [left, right] = equation.split(/ -> | <-> /);
  records.push({
    id, title_vi: left, suggestedGrades: [/Hiđrocacbon|Alcohol|Phenol|Carboxylic/.test(topic) ? 11 : 12],
    topic_vi: topic, curriculumScope: 'core_or_extension', category: 'organic', equation, ionic: null,
    conditions: { description_vi: condition }, reactants: equationSide(left, 'reactant'), products: equationSide(right, 'product'), mode: 'simulation_only',
    runtime: 'lesson_simulation', programId: id, protocolStatus: 'reaction_specific',
    quantityPolicy: 'Định lượng mol theo hệ số phương trình trong mô hình; thời gian và điều kiện chưa hiệu chuẩn bằng số liệu thực nghiệm.',
    safety_vi: lesson.safety_vi, hazards: [],
    steps: [
      { order: 1, checkpoint: 'prepare', instruction_vi: `Nhận diện chất đầu và mẫu đối chứng: ${equation.split(/ -> | <-> /)[0]}.`, automaticValidation: false },
      { order: 2, checkpoint: 'contact', instruction_vi: `Thiết lập điều kiện: ${condition}.`, automaticValidation: false },
      { order: 3, checkpoint: 'observe', instruction_vi: observation, automaticValidation: false },
      { order: 4, checkpoint: 'conclude', instruction_vi: explanation, automaticValidation: false },
    ], observation_vi: observation, explanation_vi: explanation,
    effects: { ...program.visual, timingBasis: 'illustrative_not_measured', massBasis: 'fromLessonInventory' },
    lessonConditions: lesson.conditions,
    checkpoints: lesson.checkpoints,
    modelLimitations_vi: lesson.misconception_vi,
    sources: [{ url: sources.curriculum, scope: 'curriculum_context' }],
  });
}
mkdirSync('src/data/curriculum', { recursive: true });
for (const record of records) {
  const review = getReactionReview(record.id);
  if (!review) throw new Error(`Missing scientific review: ${record.id}`);
  record.scientificReview = {
    finding_vi: review.finding_vi,
    evidence: review.evidence,
    quantitativeCalibration: review.quantitativeCalibration,
    references: review.references.map(key => SCIENCE_REFERENCES[key]),
  };
}
const output = { schema: 'chemdex.vn-curriculum/1', language: 'vi',
  description_vi: String(records.length) + ' phản ứng THPT và mở rộng: ' + records.filter(record => record.runtime === 'existing_program').length + ' chương trình cảnh tự do và ' + LESSON_DEFINITIONS.length + ' bài mô phỏng có điều kiện. Một số phản ứng chỉ phù hợp minh họa, không phải thực hành bắt buộc.',
  reactions: records };
writeFileSync('src/data/curriculum/reactions.vi.json', JSON.stringify(output, null, 2) + '\n');
writeFileSync('src/data/curriculum/lessonDefinitions.vi.json', JSON.stringify({
  schema: 'chemdex.lesson-catalog/1',
  amountBasis: 'mol_or_polymer_repeat_unit',
  timeBasis: 'illustrative_not_measured',
  species: [...LESSON_SPECIES.values()],
  lessons: LESSON_DEFINITIONS,
}, null, 2) + '\n');
console.log(`Exported ${records.length} distinct reaction entries (${records.filter(r => r.runtime === 'existing_program').length} existing programs).`);
