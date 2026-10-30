export interface ScienceReference {
  title: string;
  url: string;
  scope: 'experiment' | 'teaching_text' | 'research' | 'simulation';
}

export const SCIENCE_REFERENCES: Record<string, ScienceReference> = {
  aluminumEquilibrium: { title: 'PHREEQC WATEQ4F: amorphous aluminum hydroxide, hydrolysis and sulfate complexes', url: 'https://github.com/phreeqc-dev/phreeqc3/blob/master/database/wateq4f.dat', scope: 'research' },
  ferricEquilibrium: { title: 'PHREEQC WATEQ4F: amorphous ferric hydroxide, hydrolysis and chloride species', url: 'https://github.com/phreeqc-dev/phreeqc3/blob/master/database/wateq4f.dat', scope: 'research' },
  calciteEquilibrium: { title: 'USGS: Calcite, CO2 and aqueous equilibrium (Plummer & Busenberg 1982)', url: 'https://www.usgs.gov/publications/solubilities-calcite-aragonite-and-vaterite-co2-h2o-solutions-between-0-and-90degc-and', scope: 'research' },
  sodiumWashington: { title: 'University of Washington: Alkali metals in water', url: 'https://chem.washington.edu/lecture-demos/activity-series-alkali-metals-water', scope: 'experiment' },
  sodiumWaterloo: { title: 'University of Waterloo: Sodium and potassium in water without air', url: 'https://uwaterloo.ca/centre-advanced-science-education/news/sodium-and-potassium-reacting-water-absence-air', scope: 'experiment' },
  sodiumProperties: { title: 'University of Waterloo: Sodium properties', url: 'https://uwaterloo.ca/chemistry/community-outreach/periodic-table-project/sodium', scope: 'teaching_text' },
  sodiumHeat: { title: 'Oklahoma State University: Sodium-water reaction enthalpy', url: 'https://genchem1.chem.okstate.edu/BDA/ACA20Response.php', scope: 'teaching_text' },
  thiosulfate: { title: 'RSC: Effect of concentration on reaction rate', url: 'https://edu.rsc.org/experiments/the-effect-of-concentration-on-reaction-rate/743.article', scope: 'experiment' },
  aqueousEquilibria: { title: 'OpenStax Chemistry 2e: Acid/base ionization and conjugate pairs', url: 'https://openstax.org/books/chemistry-2e/pages/14-3-relative-strengths-of-acids-and-bases', scope: 'teaching_text' },
  indicatorTable: { title: 'University of Wisconsin: Indicator Table', url: 'https://www2.chem.wisc.edu/deptfiles/genchem/tables/IndicatorTable.htm', scope: 'teaching_text' },
  salts: { title: 'RSC: Testing salts for anions and cations', url: 'https://edu.rsc.org/experiments/testing-salts-for-anions-and-cations/464.article', scope: 'experiment' },
  halides: { title: 'RSC: Silver and lead halides', url: 'https://edu.rsc.org/experiments/silver-and-lead-halides/1770.article', scope: 'experiment' },
  golden: { title: 'RSC: Golden rain', url: 'https://edu.rsc.org/exhibition-chemistry/golden-rain/2000048.article', scope: 'experiment' },
  neutral: { title: 'RSC: Preparing salts by neutralisation of oxides and carbonates', url: 'https://edu.rsc.org/experiments/preparing-salts-by-neutralisation-of-oxides-and-carbonates/1762.article', scope: 'experiment' },
  displacement: { title: 'RSC: Displacement reactions of metals', url: 'https://edu.rsc.org/download?ac=513064', scope: 'experiment' },
  silverTree: { title: 'RSC: Displacement reaction of silver nitrate and copper metal', url: 'https://edu.rsc.org/exhibition-chemistry/displacement-reaction-of-silver-nitrate-and-copper-metal/2020046.article', scope: 'experiment' },
  nitric: { title: 'University of Wisconsin: Nitric acid acts on copper', url: 'https://www2.chem.wisc.edu/deptfiles/genchem/demonstrations/Gen_Chem_Pages/04chemrxnpage/nitric_acid_acts_on_copper.htm', scope: 'experiment' },
  copperAmmonia: { title: 'RSC: Transition elements and complex compounds', url: 'https://edu.rsc.org/experiments/transition-elements-and-complex-compounds-microscale-experiment-16-18-years/518.article', scope: 'experiment' },
  cobalt: { title: 'RSC: Equilibrium between two coloured cobalt species', url: 'https://edu.rsc.org/experiments/the-equilibrium-between-two-coloured-cobalt-species/1.article', scope: 'experiment' },
  chromate: { title: 'University of Washington: Chromate–dichromate equilibrium', url: 'https://chem.washington.edu/lecture-demos/chromate-dichromate-equilibrium', scope: 'experiment' },
  thiocyanate: { title: 'Harvard: Equilibrium of iron(III) thiocyanate', url: 'https://sciencedemonstrations.fas.harvard.edu/presentations/equilibrium-iron-iii-thiocyanate', scope: 'experiment' },
  prussian: { title: 'Perls’ Prussian blue staining and chemistry of Prussian blue and Turnbull blue', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12275683/', scope: 'research' },
  clock: { title: 'RSC: Chemical stop-clock, iodate/hydrogensulfite variant', url: 'https://edu.rsc.org/in-search-of-more-solutions/a-chemical-stop-clock-iodine-clock-reaction/598.article', scope: 'experiment' },
  iodineClock: { title: 'RSC: Iodine clock reaction demonstration', url: 'https://edu.rsc.org/experiments/iodine-clock-reaction-demonstration-method/744.article', scope: 'experiment' },
  lime: { title: 'Indiana University: Limewater as indicator of carbon dioxide', url: 'https://www.chem.indiana.edu/faculty-research/faculty-resources/chemistry-demos/demo/limewater-as-indicator-of-carbon-dioxide-gas/', scope: 'experiment' },
  carbonate: { title: 'RSC: Thermal decomposition of calcium carbonate', url: 'https://edu.rsc.org/experiments/thermal-decomposition-of-calcium-carbonate/704.article', scope: 'experiment' },
  weathering: { title: 'RSC: Limestone weathering', url: 'https://edu.rsc.org/resources/limestone-weathering/486.article', scope: 'experiment' },
  indicators: { title: 'RSC: pH and indicators', url: 'https://edu.rsc.org/download?ac=518622', scope: 'teaching_text' },
  phenolphthalein: { title: 'Oxford Chemistry Film Studio: Phenolphthalein', url: 'https://vrchemistry.chem.ox.ac.uk/filmstudio/phenolphthalein/HTML/page01.htm', scope: 'experiment' },
  hydration: { title: 'RSC: Reversible reactions and equilibrium', url: 'https://edu.rsc.org/cpd/how-to-teach-reversible-reactions-and-equilibrium-at-14-16/4018148.article', scope: 'teaching_text' },
  alkene: { title: 'Chemguide: Alkenes, addition of bromine, hydrogen and steam', url: 'https://www.chemguide.co.uk/14to16/organic/alkenes.html', scope: 'teaching_text' },
  phenol: { title: 'University of Bristol: Tribromophenol', url: 'https://www.chm.bris.ac.uk/motm/tribromophenol/tbpv.htm', scope: 'teaching_text' },
  sugar: { title: 'Polish public education platform: Glucose and fructose', url: 'https://zpe.gov.pl/a/sugars---glucose-and-fructose/D19A4LKCS', scope: 'teaching_text' },
  hydrolysis: { title: 'IIT Kanpur Virtual Labs: Hydrolysis of sucrose/starch', url: 'https://fc-iitk.vlabs.ac.in/exp/hydrolysis-of-sucrose/procedure.html', scope: 'experiment' },
  fermentation: { title: 'RSC: Fermentation of glucose using yeast', url: 'https://edu.rsc.org/experiments/fermentation-of-glucose-using-yeast-14-16-years/470.article', scope: 'experiment' },
  ester: { title: 'RSC: Acid-catalysed esterification mechanism', url: 'https://edu.rsc.org/download?ac=12026', scope: 'teaching_text' },
  reduction: { title: 'RSC: A visible reduction', url: 'https://edu.rsc.org/exhibition-chemistry/a-visible-reduction/2000038.article', scope: 'experiment' },
  transition: { title: 'Chemguide: Transition-metal chemistry', url: 'https://www.chemguide.co.uk/inorganic/transition/features.html', scope: 'teaching_text' },
  cobaltText: { title: 'Chemguide: Cobalt chemistry', url: 'https://www.chemguide.co.uk/inorganic/transition/cobalt.html', scope: 'teaching_text' },
  sulfide: { title: 'University inorganic/organic practical handbook', url: 'https://uou.ac.in/sites/default/files/slm/MSCCH-505L.pdf', scope: 'teaching_text' },
  chemcollective: { title: 'ChemCollective Virtual Labs', url: 'https://chemcollective.org/vlabs', scope: 'simulation' },
  phet: { title: 'PhET: Acid–Base Solutions', url: 'https://phet.colorado.edu/en/simulations/acid-base-solutions', scope: 'simulation' },
  rscLab: { title: 'RSC Titration Screen Experiment', url: 'https://virtual.edu.rsc.org/', scope: 'simulation' },
};

export interface ReactionReview {
  id: string;
  references: string[];
  finding_vi: string;
  evidence: 'specific_observation' | 'family_context' | 'model_caveat';
  quantitativeCalibration: 'not_validated';
}

const rows: ReactionReview[] = [];
function review(id: string, references: string[], finding_vi: string, evidence: ReactionReview['evidence'] = 'specific_observation') {
  rows.push({ id, references, finding_vi, evidence, quantitativeCalibration: 'not_validated' });
}

// Every program has an individual review entry. Family/context references are
// distinguished from a source describing that exact experiment.
review('hcl_naoh', ['neutral'], 'H+/OH− trung hòa trong nước; không khí, kết tủa hoặc khói trắng. pH cuối phụ thuộc lượng dư.');
review('h2so4_naoh', ['neutral'], 'Tỉ lệ 1:2 mô tả trung hòa cả hai proton; không thay cho cân bằng HSO4− khi mới thêm một phần kiềm.', 'family_context');
review('hno3_koh', ['neutral'], 'HNO3 và KOH loãng tạo muối tan và nước; không tự sủi bọt.', 'family_context');
review('ch3cooh_naoh', ['aqueousEquilibria', 'indicatorTable'], 'Axit yếu có vùng đệm và điểm tương đương pH > 7; bộ cân bằng điện tích dùng tổng axetat, Na+ và Kw, không dùng pH cuối cố định. Hằng số tham chiếu 25 °C, chưa hiệu chỉnh hoạt độ.', 'family_context');
review('nh3_hcl', ['salts'], 'Khói NH4Cl cần tiếp xúc hai pha khí; trộn hai dung dịch tạo NH4Cl tan.', 'family_context');
review('h2so4_nh3', ['salts'], 'Tỉ lệ NH3 quyết định muối amoni; dung dịch loãng không tạo khói muối.', 'family_context');
review('h3po4_naoh', ['indicators'], 'H3PO4 là axit đa nấc; 1:3 chỉ là phương trình trung hòa tổng, không phải mọi lần trộn.', 'model_caveat');
review('hcl_caoh2', ['neutral'], 'Ca(OH)2 tan ít; phần đã hòa tan trung hòa với axit, chất rắn dư có thể tan tiếp.', 'family_context');
review('h2so4_baoh2', ['salts'], 'Vừa trung hòa vừa tạo BaSO4 trắng; không gán hiệu ứng trong suốt của mọi phản ứng axit–bazơ.', 'family_context');
review('hno3_naoh', ['neutral'], 'Muối nitrat natri tan trong dung dịch loãng; nhiệt độ thay đổi không mặc định sôi.', 'family_context');
review('phenolphthalein_naoh', ['indicators', 'phenolphthalein'], 'Đổi màu cân bằng chỉ thị; không tạo chất giả In_pink theo số mol NaOH. Kiềm rất mạnh có thể làm mất màu.');
review('methyl_orange_hcl', ['indicators'], 'Methyl orange đổi màu theo pH; đây là quan sát chỉ thị, không phải phản ứng tạo phân tử In_red.');
review('bromothymol_blue_base', ['indicators'], 'BTB vàng–lục–lam theo pH; không tự tiêu thụ một mol kiềm cho mỗi mol chất chỉ thị.', 'family_context');
review('bacl2_na2so4', ['salts'], 'BaSO4 trắng khi tích số ion vượt Ksp; không sinh khí.');
review('bacl2_h2so4', ['salts'], 'BaSO4 trắng trong môi trường axit thích hợp; HCl sinh ra ở pha dung dịch.');
review('agno3_nacl', ['halides'], 'AgCl trắng, nhạy sáng; có thể tan trong NH3 loãng dư.');
review('agno3_kbr', ['halides'], 'AgBr màu kem; cần NH3 đặc hơn AgCl để hòa tan đáng kể.');
review('agno3_ki', ['halides'], 'AgI vàng; không tan trong NH3 như AgCl.');
review('pbno32_ki', ['halides', 'golden'], 'Trộn lạnh tạo kết tủa vàng; mưa phiến lấp lánh là chu kỳ hòa tan nóng rồi tái kết tinh khi nguội.');
review('cacl2_na2co3', ['salts'], 'CaCO3 trắng khi vượt độ tan; không có khí nếu không có axit.', 'family_context');
review('caoh2_co2', ['lime', 'weathering'], 'CO2 làm đục nước vôi; CO2 tiếp tục dư trong nước có thể chuyển cặn sang bicarbonat tan.');
review('caco3_co2_excess_clearing', ['calciteEquilibrium'], 'Chuyển sang cân bằng pha hữu hạn; CO2 khí vừa sinh không bị tiêu thụ tiếp như CO2 đã hòa tan. Độ trong phụ thuộc lượng cacbon hòa tan và bão hòa calcite; tốc độ, nhiệt và hiệu chỉnh nhiệt độ/hoạt độ chưa hiệu chuẩn.', 'family_context');
review('cuso4_naoh', ['salts'], 'Cu(OH)2 xanh dạng gel; đun nóng mới chuyển dần sang CuO đen.');
review('fecl3_naoh', ['salts'], 'Fe(OH)3 nâu đỏ dạng bông, không phải dung dịch đỏ trong.');
review('feoh3_hcl', ['ferricEquilibrium'], 'Acid hòa tan lượng Fe(OH)3 hữu hạn đến giới hạn thuốc thử hoặc bão hòa; có thể còn cặn, không sinh khí. Tốc độ và nhiệt pha vô định hình chưa hiệu chuẩn.', 'model_caveat');
review('feso4_naoh', ['salts'], 'Fe(OH)2 ban đầu lục nhạt; tiếp xúc O2 có thể chuyển nâu.');
review('alcl3_naoh', ['aluminumEquilibrium'], 'Al(OH)3 vô định hình tạo keo khi quá bão hòa; lượng rắn phụ thuộc speciation và pH, không theo chiều cao lớp cặn cố định.', 'model_caveat');
review('al2so43_naoh', ['aluminumEquilibrium'], 'Giới hạn tạo keo nhôm xét sulfate tự do, bisulfate và phức Al–sulfate; 2 mol Al trên mỗi mol Al2(SO4)3.', 'model_caveat');
review('alcl3_naoh_excess', ['aluminumEquilibrium'], 'Kiềm đủ dư ưu tiên aluminate hòa tan; không bắt buộc dựng một đợt keo trung gian khi mẫu dưới bão hòa.', 'model_caveat');
review('al2so43_naoh_excess', ['aluminumEquilibrium'], 'Nhánh aluminate của muối sulfate giữ cân bằng Al/Na/S và bị chặn nếu còn quá bão hòa hydroxide.', 'model_caveat');
review('na2s_cuso4', ['sulfide'], 'CuS đen; pH quyết định dạng sulfide hòa tan và nguy cơ giải phóng H2S.', 'family_context');
review('na2s_pbno32', ['sulfide'], 'PbS đen; không diễn giải mọi muối chì đều là mưa vàng.', 'family_context');
review('k2cro4_bacl2', ['chromate', 'sulfide'], 'BaCrO4 vàng trong điều kiện phù hợp; axit làm đổi cân bằng chromate/dichromate.', 'family_context');
review('k2cro4_agno3', ['sulfide'], 'Ag2CrO4 nâu đỏ; nồng độ ion và pH ảnh hưởng kết tủa.', 'family_context');
review('caco3_hcl', ['neutral', 'weathering'], 'Axit tiêu thụ carbonate tạo CO2; dừng phát khí khi chất giới hạn hết.');
review('na2co3_hcl', ['neutral'], 'Axit thêm từng phần có thể tạo bicarbonat trước khi CO2 thoát; phương trình tổng cần đủ 2H+.', 'family_context');
review('nahco3_hcl', ['neutral'], 'HCO3− nhận proton tạo CO2 và nước; không mặc định có bọt xà phòng.', 'family_context');
review('zn_hcl', ['displacement'], 'Zn và axit không oxi hóa giải phóng H2; tốc độ phụ thuộc bề mặt và nồng độ.', 'family_context');
review('mg_hcl', ['displacement'], 'Mg tan tạo H2; không phải mọi mẫu nhỏ đều nổ hoặc tự cháy.', 'family_context');
review('fe_hcl', ['displacement'], 'Fe tạo Fe(II) với HCl, không mặc định Fe(III); bọt H2 không màu.', 'family_context');
review('al_hcl', ['displacement'], 'Màng oxit có thể gây thời gian cảm ứng; phản ứng tăng sau khi màng bị phá.', 'family_context');
review('na2so3_hcl', ['salts'], 'SO2 không màu; không vẽ khói có màu do tên phản ứng.', 'family_context');
review('fes_hcl', ['sulfide'], 'H2S không màu; không dùng màu xanh/lục hoặc ngửi trực tiếp làm phép nhận biết.', 'family_context');
review('nh4cl_naoh', ['salts'], 'NH4+ chuyển thành NH3; làm ấm giúp đuổi khí, không có lượng khí vô hạn.');
review('h2o2_mno2', ['transition'], 'MnO2 là xúc tác, không bị tiêu thụ như chất đầu. O2 không màu; bọt bền cần chất hoạt động bề mặt.', 'family_context');
review('cu_hno3_conc', ['nitric'], 'HNO3 đặc tạo NO2 nâu; phải phân biệt thuốc thử loãng và đặc.');
review('cu_hno3_dil', ['nitric'], 'HNO3 loãng thường mô tả NO ban đầu không màu, sau đó hóa nâu trong không khí.', 'family_context');
review('fe_cuso4', ['displacement'], 'Cu đỏ nâu bám trên Fe; ion Fe(II) ở dung dịch, không phải mưa hạt đồng vô tận.');
review('zn_cuso4', ['displacement'], 'Zn khử Cu(II); màu xanh giảm theo Cu(II) còn lại, không bắt buộc biến mất nếu CuSO4 dư.');
review('cu_agno3', ['silverTree'], 'Ag phát triển trên bề mặt đồng; dung dịch chứa Cu(II), không tạo bong bóng H2.');
review('kmno4_oxalic', ['transition'], 'Cần axit cho sản phẩm Mn(II); thiếu axit có thể tạo MnO2. Tốc độ có cảm ứng và tự xúc tác.', 'family_context');
review('k2cr2o7_feso4', ['chromate'], 'Cr(VI) nhận electron của Fe(II) trong axit; phương trình có H2SO4, không chỉ đổi màu cam sang lục.', 'family_context');
review('fecl3_ki', ['transition'], 'Fe(III) oxi hóa iodide tạo iot; iot nâu trong nước và tạo triiodide khi iodide dư.', 'family_context');
review('cl2_kbr', ['halides'], 'Cl2 oxi hóa Br− thành Br2; màu phụ thuộc nồng độ và dung môi.', 'family_context');
review('iodine_clock', ['clock', 'iodineClock'], 'Có ít nhất hai bước redox; không tạo iot–tinh bột từ phương trình chỉ sinh iodide. Cần tinh bột để xanh đen.');
review('fecl3_kscn', ['thiocyanate'], 'Cân bằng phối tử, thường biểu diễn FeSCN2+ trong dung dịch loãng; không phải chuyển hóa hoàn toàn.');
review('cuso4_nh3', ['copperAmmonia', 'salts'], 'NH3 ít tạo hydroxide xanh nhạt; NH3 dư đủ tạo dung dịch phức xanh đậm.');
review('k2cr2o7_naoh', ['chromate'], 'Kiềm chuyển dichromate cam sang chromate vàng; cation K/Na là ion khán.');
review('k2cro4_h2so4', ['chromate'], 'Axit hóa dịch chuyển cân bằng chromate sang dichromate; không tạo khí.');
review('aloh3_naoh', ['aluminumEquilibrium'], 'Al(OH)3 vô định hình tan trong OH− đến giới hạn thuốc thử hoặc bão hòa. Nhiệt theo cùng đường cân bằng, chưa hiệu chuẩn pha loãng/già hóa gel.', 'model_caveat');
review('mg_o2_burn', ['displacement'], 'Cần mồi và O2; MgO trắng là khói hạt rắn, không phải khí màu trắng.', 'family_context');
review('na_h2o', ['sodiumWashington', 'sodiumWaterloo', 'sodiumProperties', 'sodiumHeat'], 'Na nổi, chạy và nóng chảy; NaOH không màu, chỉ hồng khi có chỉ thị. Cháy hoặc nổ phụ thuộc điều kiện. Lượng chất theo 2:2:2:1; chuyển động và truyền nhiệt cục bộ chỉ là xấp xỉ định tính.');
review('k_h2o', ['displacement'], 'K phản ứng mạnh; ngọn lửa lilac không do riêng vạch 766 nm gần hồng ngoại.', 'family_context');
review('flame_cu', ['salts'], 'Quan sát phát xạ xanh lục–lam, có đóng góp phân tử chứa đồng; không phải phương trình tiêu thụ CuCl2.');
review('flame_na', ['salts'], 'Phát xạ nguyên tử Na vùng 589 nm; phép thử ngọn lửa không tạo phân tử sản phẩm giả.');
review('flame_k', ['salts'], 'Phần tím nhìn thấy có vạch vùng 404 nm; 766/770 nm gần hồng ngoại không giải thích riêng màu lilac.');
review('cuoh2_decomp', ['salts'], 'Gia nhiệt biến hydroxide xanh thành CuO đen; nước có thể ở lỏng/hơi tùy hệ.', 'family_context');
review('nahco3_heat', ['carbonate'], 'NaHCO3 tạo carbonate, CO2, nước khi đun; nhiệt độ gán trong model không phải điểm bật/tắt tuyệt đối.', 'family_context');
review('i2_sublimation', ['hydration'], 'Thăng hoa là đổi pha, không phản ứng tiêu thụ rồi tái tạo liên tục cùng một lượng I2.', 'model_caveat');
review('water_into_h2so4', ['neutral'], 'Pha loãng tỏa nhiệt; không phải tạo chất H2SO4·H2O(aq) duy nhất hoặc luôn nổ.', 'model_caveat');
review('naclo_hcl_chlorine', ['halides'], 'Axit hóa hypochlorite với chloride tạo Cl2; không gán cùng hiện tượng cho dung dịch kiềm.', 'family_context');
review('cocl2_hcl', ['cobalt'], 'Cần hoạt độ chloride cao; pha hồng/xanh là cân bằng, không chuyển hoàn toàn theo thời gian.');
review('niso4_nh3', ['transition'], 'Ni(II) tạo phức ammine khi đủ NH3; hydroxide có thể xuất hiện trước.', 'family_context');
review('fecl3_3kscn', ['thiocyanate'], 'Fe(SCN)3 là lối viết tổng giản lược; tỷ lệ phối tử thực thay đổi theo điều kiện, không có một công thức chi phối mọi mẫu.', 'model_caveat');
review('fecl3_k4fecn6', ['prussian'], 'Xanh Phổ là vật liệu phối trí hydrat có thành phần biến đổi; công thức KFe[Fe(CN)6] là đại diện.');
review('feso4_k3fecn6', ['prussian'], 'Xanh Turnbull và xanh Phổ liên quan cấu trúc Fe(II)/Fe(III); không chỉ là màu nhuộm.');
review('cuso4_k4fecn6', ['sulfide'], 'Copper ferrocyanide nâu đỏ; công thức/hydrat và kích thước hạt là mô hình đại diện.', 'family_context');
review('agcl_nh3', ['halides'], 'AgCl trắng tan thành phức diamminesilver không màu khi đủ NH3.');
review('agi_na2s2o3', ['halides'], 'AgI khó tan hơn AgCl; tạo phức thiosulfate phụ thuộc nồng độ và thời gian, không cùng tốc độ mọi silver halide.', 'model_caveat');
review('niso4_naoh', ['transition'], 'Ni(OH)2 lục; không mặc định dung dịch tím là kết tủa.', 'family_context');
review('cocl2_naoh', ['cobaltText'], 'Co(OH)2 có thể xanh rồi đổi hồng/oxy hóa theo thời gian; một màu cố định không mô tả mọi điều kiện.');
review('znso4_naoh', ['salts'], 'Zn(OH)2 trắng, tan trong kiềm dư; sản phẩm hydroxide chỉ bền trong khoảng pH phù hợp.');
review('mgcl2_naoh', ['salts'], 'Mg(OH)2 trắng; không tan trong kiềm dư theo cách Zn/Al.');
review('mnso4_naoh', ['transition'], 'Mn(OH)2 ban đầu nhạt; sản phẩm nâu cần bước oxi hóa bởi không khí, không tự thay công thức sản phẩm.', 'family_context');
review('bino33_ki', ['sulfide'], 'BiI3 sẫm; iodide dư có thể tạo phức iodobismuthate. Chưa xác thực riêng thông số mô phỏng.', 'model_caveat');
review('znso4_na2s', ['sulfide'], 'ZnS sạch màu trắng; pH/ion sulfide quyết định có kết tủa, không phải mọi lần trộn đều hoàn toàn.', 'family_context');
review('agno3_k2cro4', ['sulfide'], 'Trùng họ Ag2CrO4; cùng phương trình chuẩn với k2cro4_agno3.', 'family_context');
review('bacl2_k2cro4', ['chromate', 'sulfide'], 'Trùng họ BaCrO4; dùng chung điều kiện chromate, không phải phản ứng mới.', 'family_context');
review('pbno32_k2cro4', ['sulfide'], 'PbCrO4 vàng; phân biệt với PbI2 và không dùng cùng chu kỳ mưa vàng.', 'family_context');
review('pbno32_na2so4', ['salts'], 'PbSO4 trắng ít tan; không dùng màu vàng của mọi hợp chất chì.', 'family_context');
review('cuso4_ki', ['transition'], 'CuI trắng và iot nâu cùng tạo thành; màu nâu không phải màu CuI.', 'family_context');
review('zn_agno3', ['displacement'], 'Ag kim loại bám trên Zn; tốc độ phụ thuộc bề mặt, không phát khí.', 'family_context');
review('kmno4_na2c2o4_titration', ['transition'], 'Cần axit và thường làm ấm; điểm cuối là dư manganate(VII) hồng nhạt, không mất màu mọi lượng thêm.', 'family_context');
review('mg_cuso4', ['displacement'], 'Mg khử Cu(II) tạo đồng; phản ứng phụ với nước phụ thuộc điều kiện.', 'family_context');
review('ki_cl2', ['halides'], 'Cl2 oxi hóa I− tạo iot; quá dư chlorine có thể gây biến đổi tiếp, không ép endpoint cố định.', 'family_context');
review('kbr_cl2', ['halides'], 'Cùng hệ Cl2/Br− với cl2_kbr, không tính thành phương trình mới.', 'family_context');
review('na2s2o3_i2', ['iodineClock'], 'Iot bị khử thành iodide, thiosulfate thành tetrathionate; màu mất khi đủ thiosulfate.');
review('h2o2_ki_h2so4', ['iodineClock'], 'H2O2 oxi hóa iodide trong axit; không đồng nhất với xúc tác phân hủy H2O2 tạo O2.');
review('feso4_kmno4_h2so4', ['transition'], 'Fe(II) thành Fe(III), permanganate thành Mn(II) trong đủ axit.', 'family_context');
review('k2cr2o7_c2h5oh_h2so4', ['reduction'], 'Sản phẩm ethanal cần kiểm soát điều kiện/tách sản phẩm; oxi hóa mạnh hoặc hồi lưu có thể đi tiếp đến axit.', 'model_caveat');
review('h2o2_kmno4', ['transition'], 'Phương trình có MnO2 phù hợp môi trường trung tính/kiềm; môi trường axit có Mn(II) và hệ số khác.', 'family_context');
review('zn_h2so4_dilute', ['displacement'], 'H2SO4 loãng cho H2; không suy rộng sang axit đặc nóng oxi hóa.', 'family_context');
review('caco3_hno3', ['neutral'], 'Carbonate với axit nitric tạo CO2, không phải khí nitơ oxide như Cu/HNO3.', 'family_context');
review('cu_conc_h2so4', ['nitric'], 'Cần H2SO4 đặc nóng; đồng không tạo SO2 khi chỉ gặp H2SO4 loãng.', 'family_context');
review('nh42so4_naoh', ['salts'], 'Kiềm giải phóng NH3 từ ammonium; lượng khí giới hạn bởi NH4+ và kiềm.');
review('cac2_h2o', ['carbonate'], 'CaC2 tạo acetylene và Ca(OH)2; có thể còn pha rắn khi vượt độ tan hydroxide.', 'family_context');
review('al_naoh_h2', ['salts'], 'Dung dịch kiềm tạo hydroxoaluminate và H2; NaAlO2 là công thức tổng giản lược.', 'model_caveat');
review('kcl_conc_h2so4', ['salts'], 'Cần H2SO4 đặc; khí HCl không màu và chỉ tạo aerosol khi gặp ẩm.', 'family_context');
review('nano2_nh4cl', ['salts'], 'Hệ ammonium nitrite thường cần làm ấm; không phát N2 vô hạn.', 'family_context');
review('cu_hno3_dilute', ['nitric'], 'Cùng biến thể nitric loãng; NO không màu trước khi gặp O2.', 'family_context');
review('kmno4_hcl', ['halides'], 'HCl đủ đặc và môi trường axit tạo chlorine; không phải phép chuẩn độ permanganate dùng HCl.', 'family_context');
review('nh4no3_dissolution', ['chemcollective'], 'Hòa tan thu nhiệt; chỉ đóng băng nếu nhiệt độ thật dưới điểm đông, không tự vẽ frost ở 2 °C.', 'model_caveat');
review('naoh_dissolution', ['neutral'], 'Hòa tan tỏa nhiệt; cần nước, có giới hạn độ tan, không mặc định sôi hoặc tạo khí.', 'family_context');
review('cacl2_dissolution', ['neutral'], 'Hòa tan CaCl2 khan tỏa nhiệt; hydrat có nhiệt hòa tan khác.', 'model_caveat');
review('h2so4_dilution', ['neutral'], 'Pha loãng không tiêu thụ tùy tiện một mol nước hay tạo một chất mới duy nhất.', 'model_caveat');
review('ethene_bromine', ['alkene'], 'Mất màu brom là phép thử; trong nước có thể có bromohydrin, phương trình dibromide là lối viết giản lược.', 'model_caveat');
review('ethene_hydrogen', ['alkene'], 'Hydrogen hóa cần xúc tác Ni và gia nhiệt; H2/C2H4 không tự chuyển hoàn toàn ở nhiệt độ phòng.');
review('ethene_water', ['alkene'], 'Hydrat hóa trực tiếp dùng hơi nước, H3PO4, khoảng 300 °C và áp suất cao; nước lạnh không đủ.');
review('ethyne_bromine', ['alkene'], 'Liên kết ba có thể cộng hai đương lượng Br2; sản phẩm một/hai lần cộng tùy lượng thuốc thử.', 'family_context');
review('ethene_combustion', ['alkene'], 'Phương trình cháy hoàn toàn cần O2 đủ và mồi; thiếu O2 có thể tạo CO/muội.', 'family_context');
review('methane_combustion', ['alkene'], 'Tỉ lệ 1CH4:2O2 chỉ cho cháy hoàn toàn; không tự bật lửa khi trộn.', 'family_context');
review('ethyne_combustion', ['alkene'], 'Acetylene dễ cho muội khi thiếu O2; phương trình tổng không mô tả mọi ngọn lửa.', 'family_context');
review('ethanol_combustion', ['fermentation'], 'Cần mồi và O2; nước sản phẩm trong vùng lửa là hơi rồi có thể ngưng tụ.', 'family_context');
review('ethanol_sodium', ['alkene'], 'Dùng ethanol khan để biểu diễn alkoxide; Na gặp nước lẫn vào sẽ cạnh tranh tạo NaOH/H2.', 'model_caveat');
review('ethanol_cuo', ['reduction'], 'CuO nóng bị khử thành Cu, ethanol thành ethanal; phương trình khác với đốt ethanol bằng O2.', 'family_context');
review('ethanol_dehydration', ['alkene'], 'H2SO4 đặc và điều kiện khoảng 170 °C thiên về ethene; nhiệt độ khác có thể thiên về ether.', 'family_context');
review('glycerol_cuoh2', ['sugar'], 'Polyol hòa tan Cu(OH)2 tạo phức xanh; công thức phức là đại diện, không phải cấu trúc duy nhất đã xác định.', 'model_caveat');
review('phenol_naoh', ['phenol'], 'Phenol bị kiềm mạnh khử proton; không tạo khí đặc trưng.', 'family_context');
review('phenol_bromine', ['phenol'], 'Nước brom mất màu, tribromophenol trắng; brom dư vẫn còn màu.');
review('acetic_carbonate', ['neutral'], 'Axit yếu vẫn giải phóng CO2 từ carbonate khi đủ lượng; không phân loại thành H2.', 'family_context');
review('acetic_bicarbonate', ['neutral'], 'Axit/bicarbonate tạo CO2; dừng theo chất giới hạn.', 'family_context');
review('ethyl_acetate_synthesis', ['ester'], 'Thuận nghịch, xúc tác axit và làm ấm; 65% là tham số minh họa, không hằng số cân bằng. Không tự tách lớp khi chưa đủ điều kiện.');
review('ethyl_acetate_saponification', ['ester'], 'OH− bị tiêu thụ trong thủy phân kiềm; tốc độ/pha phụ thuộc nồng độ, tiếp xúc và nhiệt độ.', 'family_context');
review('methyl_acetate_saponification', ['ester'], 'Sản phẩm methanol, không ethanol; kiềm là chất tham gia, không chỉ xúc tác.', 'family_context');
review('glucose_cuoh2_cold', ['sugar'], 'Glucose tạo phức Cu(II) xanh khi lạnh; công thức phối tử là đại diện giản lược.');
review('glucose_cuoh2_hot', ['sugar'], 'Khi gia nhiệt trong kiềm tạo Cu2O đỏ gạch; không gán kết tủa đỏ cho phép thử lạnh.');
review('sucrose_hydrolysis', ['hydrolysis'], 'Thủy phân tạo riêng glucose và fructose; chúng cùng công thức nhưng khác chất.');
review('starch_hydrolysis', ['hydrolysis'], 'Polyme tính theo mol mắt xích; thực tế có dextrin và đường trung gian, không chỉ biến ngay thành glucose.');
review('glucose_fermentation', ['fermentation'], 'Cần men sống và điều kiện phù hợp; phương trình lên men ethanol cần hạn chế O2, thời gian tính bằng giờ.');
review('methylamine_hcl', ['indicators'], 'Methylamine là bazơ yếu; tạo muối methylammonium trong dung dịch, không mặc định khói.', 'family_context');
review('aniline_bromine', ['phenol'], 'Vòng aniline hoạt hóa tạo tribromoaniline trắng với nước brom; môi trường proton hóa làm đổi tính hoạt hóa.', 'family_context');
review('glycine_hcl', ['indicators'], 'Glycine ở dạng ion lưỡng cực trong nước; phương trình tổng không thay cho phân bố theo pH.', 'model_caveat');
review('glycine_naoh', ['indicators'], 'Kiềm chuyển cân bằng amino acid sang glycinate; không sinh khí.', 'family_context');
review('cuo_hcl', ['neutral'], 'CuO đen tan trong HCl; dung dịch Cu(II)/chloride có màu phụ thuộc ligand, không phải Cu kim loại.');
review('fe2o3_hcl', ['neutral'], 'Oxit Fe(III) tan tạo Fe(III); phản ứng phụ thuộc bề mặt và có thể cần làm ấm.', 'family_context');
review('cao_water', ['carbonate'], 'Tôi vôi tỏa nhiệt mạnh; Ca(OH)2 ít tan, không mặc định toàn bộ sản phẩm hòa tan trong nước.');
review('caco3_heat', ['carbonate'], 'Nung tạo CaO và CO2; phụ thuộc áp suất riêng phần CO2, nhiệt độ ngưỡng model không phải hằng số tuyệt đối.');
review('cuoh2_hcl', ['neutral'], 'Hydroxide xanh tan khi đủ axit; chất dư quyết định endpoint.', 'family_context');
review('aloh3_hcl', ['salts'], 'Hydroxide nhôm tan trong axit; khác với hòa tan trong kiềm tạo hydroxoaluminate.');

review('cuso4_thermal_dehydration', ['hydration'], 'Chỉ tinh thể CuSO4·5H2O mất năm nước kết tinh; CuSO4 khan hoặc dung dịch CuSO4 không phải cùng chất đầu. Mất nước diễn ra nhiều nấc.', 'family_context');
review('thiosulfate_acid_clock', ['thiosulfate'], 'Axit phân hủy thiosulfate tạo sulfur, SO2 và nước; đây không phải đồng hồ iot–tinh bột.', 'family_context');
for (const id of ['ch3cooh_naoh_aqueous', 'ch3cooh_koh_aqueous']) {
  review(id, ['aqueousEquilibria'], 'Trung hòa axit axetic bằng kiềm mạnh; bảo toàn tổng axetat và ion đối. pH từ cân bằng điện tích/Ka/Kw tại 25 °C; ΔH vẫn là thông số minh họa.', 'family_context');
}
for (const id of ['sodium_acetate_hcl', 'potassium_acetate_hcl']) {
  review(id, ['aqueousEquilibria'], 'H+ chuyển axetat thành axit axetic; vùng đệm tùy tỷ lệ. Chưa tham số hóa nhiệt của bước proton hóa này.', 'family_context');
}
review('nh4cl_naoh_aqueous', ['aqueousEquilibria'], 'NH4+ nhận OH− tạo NH3 hòa tan và nước; không mặc định toàn bộ NH3 đã thoát khí. pH từ cân bằng NH3/NH4+; trao đổi khí và nhiệt chưa tham số hóa đầy đủ.', 'family_context');

export const REACTION_REVIEWS: ReadonlyMap<string, ReactionReview> = new Map(rows.map(row => [row.id, row]));

export const DETERMINISTIC_PROGRAM_ALIASES: Record<string, string> = {
  hcl_naoh_neutralization: 'hcl_naoh', h2so4_naoh_neutralization: 'h2so4_naoh',
  bacl2_h2so4_precipitate: 'bacl2_h2so4', bacl2_na2so4_conservation: 'bacl2_na2so4',
  agno3_nacl_precipitate: 'agno3_nacl', golden_rain_pbi2: 'pbno32_ki',
  cuso4_naoh_precipitate: 'cuso4_naoh', fe_cuso4_displacement: 'fe_cuso4',
  caco3_hcl_gas: 'caco3_hcl', zn_hcl_gas: 'zn_hcl', mg_hcl_gas: 'mg_hcl',
  h2o2_mno2_decomposition: 'h2o2_mno2', nh3_hcl_fumes: 'nh3_hcl',
  nh3_hcl_aqueous: 'nh3_hcl', na2co3_hcl_gas: 'na2co3_hcl',
  cuoh2_thermal_decomposition: 'cuoh2_decomp', iodine_sublimation: 'i2_sublimation',
  water_into_conc_h2so4_explosion: 'water_into_h2so4', sodium_water_reaction: 'na_h2o',
  cu_conc_h2so4_heated: 'cu_conc_h2so4', limewater_co2_milky: 'caoh2_co2',
  caco3_co2_excess_clearing: 'caoh2_co2', al2so4_naoh_amphoteric: 'al2so43_naoh',
  alcl3_naoh_precipitate: 'alcl3_naoh', alcl3_naoh_aluminate: 'alcl3_naoh_excess', al2so43_naoh_aluminate: 'al2so43_naoh_excess',
  cuso4_nh3_complex: 'cuso4_nh3', cuso4_nh3_hydroxide: 'cuso4_nh3',
  fecl3_kscn_complex: 'fecl3_kscn', kmno4_oxalic_redox: 'kmno4_oxalic',
  aloh3_naoh_dissolution: 'aloh3_naoh', cuoh2_nh3_complex: 'cuso4_nh3',
  agcl_nh3_complex: 'agcl_nh3', hno3_naoh_neutralization: 'hno3_naoh',
  fecl3_naoh_precipitate: 'fecl3_naoh', agno3_hcl_precipitate: 'agno3_nacl',
  feoh3_hcl_dissolution: 'feoh3_hcl',
  iodate_iodide_acid: 'iodine_clock',
};

export function getReactionReview(id: string): ReactionReview | undefined {
  return REACTION_REVIEWS.get(id) ?? REACTION_REVIEWS.get(DETERMINISTIC_PROGRAM_ALIASES[id]);
}
