// Equation Chronicles & Pioneer Story Engine
// Transforms dry chemical equations into vivid historical, thermodynamic and sensory narratives
import {
  getAllScientists,
  getScientistById,
  getScientistsByElement,
  getScientistsByCompound,
} from './scientist-biographies.mjs';

/**
 * Historical contexts mapped by reaction family or key species
 */
const REACTION_FAMILY_LORE = {
  ammonium_base: {
    title: 'Phản ứng giải phóng Amoniac từ muối amoni và kiềm',
    pioneer: 'Joseph Priestley (1774) & Carl Wilhelm Scheele',
    history:
      'Vào nửa cuối thế kỷ XVIII, khi các nhà hóa học tìm cách phân lập các chất khí tan trong nước, Joseph Priestley đã nung nóng muối amoni clorua (sal ammoniac) với vôi tôi trên chậu thủy ngân. Ông kinh ngạc thu được một chất khí kiềm có mùi khai nồng nặc làm xanh giấy quỳ tím — khí amoniac tinh khiết đầu tiên trong lịch sử.',
    molecularDance:
      'Về mặt vi mô, ion amoni (NH₄⁺) đóng vai trò là một axit Brønsted-Lowry nhường proton H⁺ cho ion hiđroxit (OH⁻) là một bazơ mạnh. Sự va chạm giữa NH₄⁺ và OH⁻ phá vỡ liên kết cho-nhận N–H, tái sắp xếp electron tạo thành phân tử amoniac (NH₃) trung hòa hình chóp tam giác và phân tử nước (H₂O) bền vững.',
    civilizationImpact:
      'Phản ứng này là cơ sở phân tích định tính nhận biết cation amoni trong phòng thí nghiệm trường học và là mắt xích quan trọng trong việc thu hồi amoniac tuần hoàn của quy trình công nghiệp Solvay sản xuất soda.',
  },
  synthesis: {
    title: 'Phản ứng Hóa hợp — Sự kết tinh của các liên kết mới',
    pioneer: 'Antoine Lavoisier & Jöns Jacob Berzelius',
    history:
      'Từ những thí nghiệm đun nóng đơn chất trong buồng khí kín của Lavoisier thế kỷ XVIII đến các công trình điện phân của Davy đầu thế kỷ XIX, phản ứng hóa hợp luôn là minh chứng hùng hồn nhất cho thấy các nguyên tố đơn chất với tính chất hoàn toàn trái ngược có thể hòa quyện vào nhau để tạo nên một hợp chất hoàn toàn mới.',
    molecularDance:
      'Các phân tử đơn chất ban đầu hấp thụ năng lượng kích hoạt để bẻ gãy liên kết nội tại. Đám mây electron hóa trị được tái phân bố: các nguyên tử kim loại nhường electron cho phi kim tạo mạng tinh thể ion, hoặc các phi kim góp chung electron để tạo ra các liên kết cộng hóa trị có cực. Quá trình tạo liên kết mới giải phóng năng lượng lớn khiến đa số phản ứng hóa hợp tỏa nhiệt mạnh (ΔrH°₂₉₈ < 0).',
    civilizationImpact:
      'Phản ứng hóa hợp là nền tảng của toàn bộ ngành công nghiệp tổng hợp vật liệu: từ việc tôi vôi xây dựng nhà cửa, sản xuất axit vô cơ cho đến chế tạo các hợp chất bán dẫn công nghệ cao.',
  },
  redox: {
    title: 'Phản ứng Oxi hóa — Khử: Cuộc chuyển giao electron vĩ đại',
    pioneer: 'Humphry Davy & Michael Faraday',
    history:
      'Khái niệm oxi hóa khử khởi nguồn từ thuyết cháy của Lavoisier (sự kết hợp với oxy), nhưng đã được nâng lên tầm lý thuyết lượng tử hiện đại nhờ Davy và Faraday khi chứng minh bản chất cốt lõi của phản ứng là sự dịch chuyển và trao đổi của các hạt electron tích điện âm.',
    molecularDance:
      'Trong thời gian chỉ vài phần nghìn tỷ giây của va chạm, chất khử nhường electron từ các orbital có mức năng lượng cao sang orbital trống hoặc bán bão hòa của chất oxi hóa. Số oxi hóa của các nguyên tố thay đổi đột ngột; sự tái tổ hợp đám mây electron làm thay đổi hoàn toàn mức hấp thụ ánh sáng của phân tử, sinh ra hiện tượng biến đổi màu sắc kỳ thú.',
    civilizationImpact:
      'Phản ứng oxi hóa khử là nguồn cội của sự sống (chu trình hô hấp tế bào và quang hợp), là động lực của cuộc cách mạng năng lượng (pin điện hóa, ắc quy xe điện) và luyện kim chiết xuất sắt thép xây dựng thế giới.',
  },
  thermal_decomposition: {
    title: 'Phản ứng Nhiệt phân — Bẻ gãy cấu trúc bằng nhiệt năng',
    pioneer: 'Joseph Black (1754) & Carl Wilhelm Scheele',
    history:
      'Năm 1754, nhà hóa học Scotland Joseph Black khi đun nóng bột đá vôi và magie cacbonat đã phát hiện ra "không khí cố định" (fixed air - CO₂), mở màn cho phương pháp dùng nhiệt độ cao để phân rã các khoáng vật phức tạp thành các oxit đơn giản hơn.',
    molecularDance:
      'Dưới tác động của nhiệt độ hàng trăm độ C, dao động nhiệt của các ion và nguyên tử trong mạng tinh thể tăng mạnh đến mức vượt qua rào cản năng lượng liên kết. Các liên kết ion và cộng hóa trị kém bền bị bẻ gãy, các phân tử khí nhẹ (CO₂, H₂O, O₂, NO₂) dao động tách khỏi mạng lưới bay lên, để lại một bộ khung oxit kim loại bền vững hơn về mặt nhiệt động học ở nhiệt độ cao (ΔrH°₂₉₈ > 0, phản ứng thu nhiệt).',
    civilizationImpact:
      'Nhiệt phân đá vôi tạo vôi sống nung xi măng xây dựng, nhiệt phân quặng kim loại trong luyện kim và sản xuất gốm sứ chịu nhiệt cao cấp.',
  },
  neutralization: {
    title: 'Phản ứng Trung hòa — Vũ điệu proton giữa Axit và Bazơ',
    pioneer: 'Svante Arrhenius (1884) & Johannes Brønsted',
    history:
      'Từ thời cổ đại, người ta đã biết dùng tro kiềm để chữa vết đốt kiến axit; nhưng mãi đến năm 1884, thuyết điện li của Arrhenius mới chỉ rõ bản chất vĩ đại của mọi phản ứng trung hòa axit mạnh - bazơ mạnh: đó là sự kết hợp giữa ion H⁺ và OH⁻ tạo thành phân tử nước tinh khiết.',
    molecularDance:
      'Ion hiđroni H₃O⁺ (axit) tiếp cận ion hiđroxit OH⁻ (bazơ) với tốc độ khuếch tán cực nhanh trong dung môi nước. Proton H⁺ nhảy vọt qua cầu nối liên kết hiđro (cơ chế Grotthuss) chỉ trong 10⁻¹³ giây để triệt tiêu điện tích, giải phóng một nhiệt lượng chuẩn không đổi khoảng 57.1 kJ cho mỗi mol nước tạo thành (ΔrH°₂₉₈ = -57.1 kJ/mol).',
    civilizationImpact:
      'Duy trì sự cân bằng pH sống còn trong máu sinh vật (hệ đệm), xử lý nước thải công nghiệp nhiễm axit, khử chua đất nông nghiệp bằng vôi và ứng dụng trong chuẩn độ phân tích thực phẩm - dược phẩm.',
  },
  precipitation: {
    title: 'Phản ứng Kết tủa — Sự ngưng tụ của các mạng tinh thể không tan',
    pioneer: 'Torbern Bergman & Claude Louis Berthollet',
    history:
      'Vào thế kỷ XVIII, các nhà hóa học phân tích Thụy Điển đã lập nên hệ thống phân tích định tính kinh điển dựa trên màu sắc và độ tan của các chất kết tủa khi cho dung dịch muối gặp các thuốc thử kiềm, sunfua hay halogenua.',
    molecularDance:
      'Khi tích số nồng độ của các ion vượt quá tích số tan (Ksp), lực hút tĩnh điện giữa các cation và anion thắng hoàn toàn năng lượng solvat hóa của các phân tử nước. Các ion lập tức hút nhau theo trật tự hình học tuần hoàn, kết tụ từ các mầm tinh thể nano thành các hạt rắn vĩ mô không tan lắng xuống đáy dung dịch.',
    civilizationImpact:
      'Sản xuất các sắc tố hội họa rực rỡ, xử lý kim loại nặng độc hại ra khỏi nguồn nước sinh hoạt, và nhận biết các bệnh lý qua xét nghiệm nước tiểu y khoa.',
  },
  esterification: {
    title: 'Phản ứng Este hóa — Khúc ca hương thơm của Hóa học hữu cơ',
    pioneer: 'Marcellin Berthelot (1862) & Emil Fischer (1895)',
    history:
      'Năm 1862, Marcellin Berthelot và Léon Péan de Saint-Gilles thực hiện những nghiên cứu định lượng đầu tiên về phản ứng giữa axit axetic và etanol. Năm 1895, nhà hóa học vĩ đại Emil Fischer hoàn thiện quy trình xúc tác axit vô cơ đậm đặc, mở ra kỷ nguyên tổng hợp hương liệu hữu cơ.',
    molecularDance:
      'Xúc tác axit H⁺ tấn công nguyên tử oxy của nhóm carbonyl (>C=O) làm tăng tính electrophin của nguyên tử carbon. Cặp electron tự do trên nguyên tử oxy của ancol tấn công nucleophin vào carbon carbonyl tạo hợp chất trung gian tứ diện, sau đó một phân tử nước tách ra để hoàn tất liên kết este –C(=O)–O–. Phản ứng là thuận nghịch cân bằng nhiệt động học.',
    civilizationImpact:
      'Sản xuất hương liệu thực phẩm (mùi chuối, táo, dứa, hoa hồng), dung môi sơn mài, tơ sợi nhân tạo dacron/polyester và chế tạo các loại thuốc giảm đau hạ sốt như Aspirin.',
  },
  saponification: {
    title: 'Phản ứng Xà phòng hóa — Bước nhảy vọt của vệ sinh văn minh',
    pioneer: 'Michel Eugène Chevreul (1823)',
    history:
      'Michel Eugène Chevreul — nhà hóa học người Pháp sống thọ tới 102 tuổi — đã dành cả cuộc đời nghiên cứu chất béo động vật. Năm 1823, ông chứng minh chất béo là este của glixerol với các axit béo, và phản ứng với kiềm sẽ tạo ra xà phòng tinh khiết.',
    molecularDance:
      'Ion hiđroxit (OH⁻) là tác nhân nucleophin mạnh mẽ tấn công trực tiếp vào cầu nối este trong phân tử chất béo. Liên kết C–O bị đứt gãy một chiều, giải phóng muối natri của axit béo mang cấu trúc lưỡng cực (đầu ưa nước mang điện tích âm và đuôi kỵ nước kẹp dầu mỡ). Phản ứng là một chiều hoàn toàn.',
    civilizationImpact:
      'Sản xuất xà phòng và chất tẩy rửa giúp cứu sống hàng trăm triệu người khỏi các bệnh truyền nhiễm vi khuẩn trong suốt hai thế kỷ qua, đồng thời cung cấp glixerol cho y dược và mỹ phẩm.',
  },
};

/**
 * Generate a comprehensive, dramatic 4-part chronicle for a single reaction
 */
export function generateReactionStory(reaction, roleLabel, substanceName, displayFormula, isFormation) {
  const familyKey = reaction.family ?? 'synthesis';
  const lore = REACTION_FAMILY_LORE[familyKey] ?? REACTION_FAMILY_LORE.synthesis;
  const deltaH = reaction.effects?.deltaH_kJ_per_mol;
  const deltaHNote = deltaH !== null && deltaH !== undefined
    ? `với biến thiên enthalpy chuẩn ΔrH°₂₉₈ = **${deltaH} kJ/mol** (${deltaH < 0 ? 'phản ứng tỏa nhiệt thuận lợi về mặt năng lượng' : 'phản ứng thu nhiệt đòi hỏi cung cấp nhiệt lượng liên tục'})`
    : 'tuân theo định luật bảo toàn khối lượng và biến thiên enthalpy đặc trưng';

  const eq = reaction.equation || '';
  const obs = reaction.observation_vi || reaction.phenomenon_vi || 'Các chất phản ứng chuyển hóa theo đúng tỷ lệ tỷ lượng.';
  const cond = reaction.conditions?.description_vi || reaction.conditions_vi || 'Thực hiện ở điều kiện phòng thí nghiệm tiêu chuẩn.';
  const expl = reaction.explanation_vi || reaction.summary_vi || 'Sự tái sắp xếp liên kết hóa học giữa các nguyên tử.';
  const netIonic = reaction.netIonic || reaction.ionic?.equation;

  const roleIntroduction = isFormation
    ? `Đây là con đường tạo thành then chốt giúp khai sinh ra **${substanceName} (${displayFormula})** từ các tiền chất cơ bản.`
    : `Đây là con đường chuyển hóa tiêu biểu phản ánh bản tính hóa học năng động của **${substanceName} (${displayFormula})** khi tiếp xúc với môi trường xung quanh.`;

  const chronicle = [
    `### ${roleLabel}`,
    `Phương trình hóa học biểu diễn biến đổi vật chất (có ghi rõ trạng thái pha):`,
    `\`\`\`text\n${eq}\n\`\`\``,
    `#### 1. Bối cảnh lịch sử & Dấu ấn khám phá\n${lore.history} ${roleIntroduction}`,
    `#### 2. Vũ điệu va chạm phân tử & Cơ chế vi mô\n${lore.molecularDance} Trong phản ứng này, ${expl.toLowerCase()} Quá trình này diễn ra ${deltaHNote}.`,
    `#### 3. Kịch tính phòng thí nghiệm & Hiện tượng quan sát thực tế\n- **Điều kiện kích hoạt**: ${cond}.\n- **Hiện tượng mắt thấy tai nghe**: ${obs}.\n${netIonic ? `- **Bản chất ion rút gọn**: \`${netIonic}\` — lột tả trọn vẹn sự va chạm thực sự giữa các hạt mang điện tự do trong dung dịch mà bỏ qua các ion khán giả trung gian.` : ''}`,
    `#### 4. Giá trị ứng dụng & Dấu ấn văn minh\n${lore.civilizationImpact}`,
  ];

  return chronicle.join('\n\n');
}

/**
 * Pioneer selector that GUARANTEES finding a rich pioneer biography for 100% of substances
 */
export function getGuaranteedPioneers({ subject, element, formula, counts, massTerms }) {
  const all = getAllScientists();
  const matched = [];

  // 1. Direct element matches
  if (element) {
    const byElem = getScientistsByElement(element.symbol);
    matched.push(...byElem);

    // If ancient element, match Jabir or Lavoisier
    if (['Au', 'Ag', 'Cu', 'Fe', 'Sn', 'Pb', 'Hg', 'C', 'S'].includes(element.symbol)) {
      const jabir = getScientistById('jabir-ibn-hayyan');
      if (jabir && !matched.some((s) => s.id === jabir.id)) matched.push(jabir);
      const lavoisier = getScientistById('antoine-lavoisier');
      if (lavoisier && !matched.some((s) => s.id === lavoisier.id)) matched.push(lavoisier);
    }
    // If radioactive / actinide
    if (element.z >= 89) {
      const seaborg = getScientistById('glenn-seaborg');
      if (seaborg && !matched.some((s) => s.id === seaborg.id)) matched.push(seaborg);
      const marie = getScientistById('marie-curie');
      if (marie && !matched.some((s) => s.id === marie.id)) matched.push(marie);
    }
  }

  // 2. Direct compound matches
  const byComp = [
    ...getScientistsByCompound(formula),
    ...getScientistsByCompound(subject?.name_vi || ''),
  ];
  for (const sc of byComp) {
    if (!matched.some((s) => s.id === sc.id)) matched.push(sc);
  }

  // 3. Fallback based on functional groups or constituent elements
  if (matched.length === 0) {
    const f = formula || '';
    if (f.includes('SO4') || f.includes('H2SO4')) {
      const jabir = getScientistById('jabir-ibn-hayyan');
      if (jabir) matched.push(jabir);
    } else if (f.includes('NO3') || f.includes('HNO3')) {
      const jabir = getScientistById('jabir-ibn-hayyan');
      const lavoisier = getScientistById('antoine-lavoisier');
      if (jabir) matched.push(jabir);
      if (lavoisier) matched.push(lavoisier);
    } else if (f.includes('PO4')) {
      const brand = getScientistById('hennig-brand');
      const liebig = getScientistById('justus-von-liebig');
      if (brand) matched.push(brand);
      if (liebig) matched.push(liebig);
    } else if (f.includes('CO3') || f.includes('HCO3') || f.includes('CO2')) {
      const priestley = getScientistById('joseph-priestley');
      const lavoisier = getScientistById('antoine-lavoisier');
      if (priestley) matched.push(priestley);
      if (lavoisier) matched.push(lavoisier);
    } else if (f.includes('Cl') || f.includes('HCl')) {
      const scheele = getScientistById('carl-wilhelm-scheele');
      const davy = getScientistById('humphry-davy');
      if (scheele) matched.push(scheele);
      if (davy) matched.push(davy);
    } else if (f.includes('Br')) {
      const balard = getScientistById('antoine-jerome-balard');
      if (balard) matched.push(balard);
    } else if (f.includes('I')) {
      const courtois = getScientistById('bernard-courtois');
      if (courtois) matched.push(courtois);
    } else if (f.includes('F')) {
      const moissan = getScientistById('henri-moissan');
      if (moissan) matched.push(moissan);
    } else if (f.includes('Na') || f.includes('K') || f.includes('Ca') || f.includes('Ba') || f.includes('Mg')) {
      const davy = getScientistById('humphry-davy');
      const bunsen = getScientistById('robert-bunsen');
      if (davy) matched.push(davy);
      if (bunsen) matched.push(bunsen);
    } else if (subject?.family === 'organic') {
      const wohler = getScientistById('friedrich-wohler');
      const kekule = getScientistById('august-kekule');
      const vanthoff = getScientistById('jacobus-van-t-hoff');
      if (wohler) matched.push(wohler);
      if (kekule) matched.push(kekule);
      if (vanthoff) matched.push(vanthoff);
    } else {
      // Default grand masters of general chemistry
      const berzelius = getScientistById('jons-jacob-berzelius');
      const lavoisier = getScientistById('antoine-lavoisier');
      if (berzelius) matched.push(berzelius);
      if (lavoisier) matched.push(lavoisier);
    }
  }

  // Ensure at least one pioneer is always returned
  if (matched.length === 0) {
    matched.push(all[0]);
  }

  return matched;
}

/**
 * Build an extensive biographical chapter for a pioneer in an article
 */
export function formatPioneerChapter(pioneer, substanceName, displayFormula) {
  const parts = [
    `### Dấu ấn nhà khoa học tiên phong: Chân dung và di sản của ${pioneer.name} (${pioneer.vietnameseName})`,
    `Trong lịch sử khám phá và làm sáng tỏ bản chất của **${substanceName} (${displayFormula})**, dấu ấn thực nghiệm sâu sắc nhất gắn liền với tên tuổi của **${pioneer.name}** (${pioneer.lifeSpan}) — ${pioneer.title.toLowerCase()}.`,
    `*“${pioneer.quote}”* — Lời đúc kết nổi tiếng này không chỉ là kim chỉ nam nghiên cứu của ${pioneer.name} mà còn phản ánh tinh thần thực nghiệm bất khuất của thời đại khai sáng khoa học.`,
    `**Nghị lực sống & Thăng trầm khoa học**: ${pioneer.lifeStruggles}`,
    `**Giai thoại phòng thí nghiệm & Phong cách làm việc**: ${pioneer.personalLore}`,
    `**Đột phá thực nghiệm lịch sử**: ${pioneer.experimentalBreakthroughs}`,
  ];

  if (pioneer.laboratoryApparatus && pioneer.laboratoryApparatus.length > 0) {
    const appList = pioneer.laboratoryApparatus
      .map((app) => `- **${app.name}**: ${app.description}`)
      .join('\n');
    parts.push(`**Thiết bị phòng thí nghiệm đặc chế tiêu biểu**:\n\n${appList}`);
  }

  if (pioneer.keyEquations && pioneer.keyEquations.length > 0) {
    const eqList = pioneer.keyEquations
      .slice(0, 2)
      .map(
        (eq) =>
          `- Phương trình phản ứng bước ngoặt: \`${eq.equation}\`\n  *Hiện tượng quan sát thực tế*: ${eq.observation}\n  *Ghi chú lịch sử*: ${eq.historicalNote}`,
      )
      .join('\n\n');
    parts.push(`**Dấu mốc phản ứng gắn liền với công trình của ${pioneer.name}**:\n\n${eqList}`);
  }

  if (pioneer.pedagogicalInsight) {
    parts.push(`**Bài học phương pháp luận cho học sinh GDPT**: ${pioneer.pedagogicalInsight}`);
  }

  return parts.join('\n\n');
}
