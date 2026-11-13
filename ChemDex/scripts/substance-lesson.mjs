import {generateStructure} from '../shared/chemistry/structure-generator.mjs';
import {reactionLesson} from '../shared/chemistry/reaction-lesson.mjs';

const tidy = value => String(value ?? '').replace(/[\r\n|]/g, ' ').replace(/\s+/g, ' ').trim();
const fmt = value => Number(value).toLocaleString('vi-VN', {maximumFractionDigits: 5});
const books = {
  formula: ['OpenStax · Khối lượng theo công thức và mol', 'https://openstax.org/books/chemistry-2e/pages/3-1-formula-mass-and-the-mole-concept'],
  bonding: ['OpenStax · Hợp chất ion và hợp chất phân tử', 'https://openstax.org/books/chemistry-2e/pages/2-6-ionic-and-molecular-compounds'],
  crystal: ['OpenStax · Mạng tinh thể', 'https://openstax.org/books/chemistry-2e/pages/10-6-lattice-structures-in-crystalline-solids'],
};

export function substanceLesson({subject: s, name, prettyFormula, counts, massTerms, mass, element, detail, ions, modelURL, crystals = [], reactions, reactionSources, formulas = new Set([s.formula])}) {
  const material = Boolean(s.material), total = Object.values(counts).reduce((a,b)=>a+b,0);
  const sections = [], primarySources = new Map();
  const source = (title, url) => { if (url?.startsWith('https://')) primarySources.set(url, title); };
  const generated = s.structure || material ? null : generateStructure({...s, ...(ions ? {ions} : {})});
  const label = material ? 'Hỗn hợp / vật liệu' : element ? 'Nguyên tố' : s.kind === 'ion' ? 'Ion' : ions ? 'Đơn vị công thức' : s.kind === 'crystal' || generated?.mode === 'composition' ? 'Thành phần theo công thức' : 'Phân tử / cấu tạo';

  sections.push(`## Nhận diện ${name}\n\n${material
    ? `**${name}** là hồ sơ hỗn hợp hoặc vật liệu. Nhãn này chưa xác định một phân tử duy nhất hay một công thức dùng chung cho mọi mẫu. ${tidy(s.modelNote)}`
    : `**${name} (${prettyFormula})** được nhận diện bằng tên và công thức trong hồ sơ này${s.cid ? `, đối chiếu theo **PubChem CID ${s.cid}**` : ''}. ${s.name_en ? `Tên tiếng Anh: **${tidy(s.name_en)}**.` : ''} ${element ? `Ký hiệu **${element.symbol}** chỉ nguyên tố có số hiệu nguyên tử **${element.z}**; số này bằng số proton trong hạt nhân.` : 'Công thức cho biết thành phần; để đọc cách nối nguyên tử, hãy đối chiếu đúng tên chất và mô hình đang chọn.'}`}`);
  if (s.cid) source(`PubChem · ${name} · CID ${s.cid}`, `https://pubchem.ncbi.nlm.nih.gov/compound/${s.cid}`);
  if (s.identitySource) source(`Nguồn định danh · ${name}`, s.identitySource);

  if (!material) {
    const rows = massTerms.map(t=>`| ${tidy(t.element?.name_vi ?? t.symbol)} (${t.symbol}) | ${t.count} | ${typeof t.mass === 'number' ? fmt(t.mass) : 'Chưa có số liệu'} |`).join('\n');
    sections.push(`## Đọc công thức và tính khối lượng\n\nTheo một đơn vị công thức **${prettyFormula}**, số đếm gồm **${total} nguyên tử** thuộc **${massTerms.length} nguyên tố**:\n\n| Nguyên tố | Số nguyên tử | Giá trị khối lượng nguyên tử trong kho |\n| --- | --- | --- |\n${rows}\n\n${Number.isFinite(mass) ? `Cộng số nguyên tử nhân với giá trị khối lượng nguyên tử tương ứng:\n\nM = ${massTerms.map(t=>`${t.count} × ${fmt(t.mass)}`).join(' + ')} ≈ **${fmt(mass)} g/mol**. Đây là phép tính theo công thức đã ghi, không phải số đo khối lượng của một mẫu cụ thể.` : 'Hồ sơ chưa đủ số liệu khối lượng nguyên tử để tính giá trị số bằng phép cộng này.'}${massTerms.some(t=>t.element?.massKind === 'reference-isotope-mass-number') ? '\n\nCó nguyên tố đang dùng **số khối của đồng vị tham chiếu**, không phải khối lượng nguyên tử chuẩn; kết quả trên chỉ là giá trị quy ước gần đúng theo dữ liệu đó.' : ''}\n\n${ions || s.kind === 'crystal' || generated?.mode === 'composition' ? 'Với mạng rắn, đơn vị công thức dùng để đọc tỉ lệ thành phần; không vì thế kết luận có một phân tử riêng lẻ gồm đúng các nguyên tử trong dòng công thức.' : element ? 'Ký hiệu của nguyên tố không tự cho biết dạng đơn chất: các dạng thù hình và pha có thể có cách liên kết khác nhau.' : 'Công thức phân tử không cho biết duy nhất mọi liên kết và cấu dạng. Xoay mô hình chỉ đổi góc nhìn, không làm thay đổi số nguyên tử.'}`);
    source(...books.formula);
    if (Number.isFinite(mass) && mass > 0 && massTerms.length > 1) {
      const first = massTerms[0], percentage = (100 * first.count * first.mass / mass).toFixed(2);
      sections[sections.length-1] += `\n\nVí dụ phần trăm khối lượng của ${first.symbol} theo công thức:\n\n$$\nw(\\mathrm{${first.symbol}}) = \\frac{${first.count} \\times ${first.mass}}{${Number(mass.toFixed(6))}} \\times 100\\% \\approx ${percentage}\\%\n$$\n\nKết quả này xét thành phần theo công thức; dung dịch pha thêm dung môi có nồng độ khối lượng khác.`;
      source('OpenStax · Thành phần phần trăm và công thức hóa học','https://openstax.org/books/chemistry-2e/pages/3-2-determining-empirical-and-molecular-formulas');
    }
  }

  let modelText;
  if (material) modelText = `${tidy(s.modelNote)}\n\nĐể nhận diện một sản phẩm thực tế cần biết thành phần hoặc tài liệu của mẫu. Không lấy mô hình dung môi để suy ra cấu trúc toàn bộ hỗn hợp.`;
  else if (s.structure?.format === 'cif') modelText = 'Mô hình dùng **tọa độ mạng tinh thể**. Các vị trí nguyên tử lặp lại theo ô mạng và đối xứng của pha được công bố; số nguyên tử vẽ trong một ô không nhất thiết bằng số chỉ số trong công thức tối giản.';
  else if (s.structure?.format === 'sdf') modelText = s.structure.coordinateType === 'experimental'
    ? `Mô hình phân tử dùng **tọa độ tham chiếu thực nghiệm pha khí từ NIST CCCBDB**. ${tidy(s.structure.geometryNote)} Trong mục điều kiện dưới mô hình có nhóm đối xứng, ghi chú tham số và bài gốc; hình học pha khí không thay thế cách xếp phân tử trong tinh thể.`
    : `Mô hình dùng **${s.structure.dimension === '2d' ? 'tọa độ 2D trong tệp nguồn' : 'một cấu dạng tính toán có nguồn'}** (${tidy(s.structure.provenance)}). Phép đo trên hình thuộc đúng bộ tọa độ đó; không phải ảnh một phân tử đang chuyển động và không chứng minh hình học thực nghiệm của mọi pha.`;
  else modelText = `Mô hình hiện tại là **${generated?.mode === 'atom' ? 'nguyên tử minh họa' : generated?.componentLayout ? 'sơ đồ thành phần' : generated?.mode === 'idealized' ? 'cấu tạo và hình học minh họa' : 'sơ đồ đếm thành phần'}**. ${tidy(generated?.note ?? s.modelNote)} Không gắn nhãn dữ liệu thực nghiệm cho các tọa độ được bố trí để minh họa.`;
  sections.push(`## Đọc mô hình 3D\n\n${modelText}\n\n1. [Mở mô hình ${name}](${modelURL}), đọc tên chất và cách biểu diễn đang chọn.\n2. Xoay để thấy các vị trí bị che; thử ẩn hydrogen hoặc nhãn khi cần nhìn khung rõ hơn.\n3. Nếu hồ sơ có mục Tinh thể, bật/tắt đường nối để so sánh vị trí nguyên tử với mạng lân cận. Que nối trong tinh thể giúp quan sát lân cận, không tự gán bậc liên kết.\n4. Nếu đo khoảng cách hoặc góc, ghi rõ mô hình và bộ tọa độ. Không đo khoảng cách giữa các nhóm được tách trong sơ đồ thành phần rồi xem đó là số đo của chất thật.\n\nBệ, lọ mẫu và các chi tiết cảnh là hình minh họa. Chúng không bổ sung nguyên tử, sửa tọa độ hay thay đổi tệp SDF/CIF tải xuống.`);
  source(...books.bonding); source(...books.crystal);
  if (s.structure?.source) source(`Nguồn tọa độ · ${tidy(s.structure.provenance)}`, s.structure.source);

  if (ions && !material) {
    sections.push(`## Từ công thức đến sơ đồ thành phần\n\nSơ đồ **${prettyFormula}** tách các nhóm sau để đọc số nguyên tử và điện tích:\n\n${ions.map(i=>`- **${i.count} × ${i.formula}**, điện tích mỗi nhóm **${i.charge > 0 ? '+' : ''}${i.charge}**.`).join('\n')}\n\nTổng điện tích theo số nhóm: **${ions.map(i=>`${i.count} × (${i.charge > 0 ? '+' : ''}${i.charge})`).join(' + ')} = ${ions.reduce((n,i)=>n+i.count*i.charge,0)}**. Điện tích của ion đa nguyên tử thuộc toàn bộ nhóm. Nước kết tinh, nếu có, được đếm như thành phần trung hòa; cách nước phối trí phải xem dữ liệu pha rắn.\n\nCác nhóm được đặt cách nhau để dễ nhìn. Đây không phải hình chụp dung dịch: độ tan, pH và dạng tồn tại cần xét thêm dung môi, nồng độ, phản ứng và cân bằng.`);
  }
  if (crystals.length) {
    sections.push(`## Pha tinh thể đã gắn nguồn\n\nHồ sơ có **${crystals.length} pha/cấu trúc tham khảo**. Mở mục **Tinh thể** để chọn đúng pha và đọc điều kiện công bố. Mẫu khác nhiệt độ, áp suất, dạng thù hình hoặc lượng nước kết tinh có thể không có cùng ô mạng.\n\n${crystals.map(c=>`- **${tidy(c.mineralName)}** · ${tidy(c.spaceGroup)}${c.reference?.year ? ` · ${c.reference.year}` : ''}${c.source ? ` · [Nguồn](${c.source})` : ''}.`).join('\n')}\n\nLặp 2 × 2 × 2 ô giúp quan sát tính tuần hoàn. Các nguyên tử ở biên ô được chia sẻ với những ô lân cận; hãy đọc hệ số chia sẻ khi tính số hạt trong một ô.`);
  }

  const historySources = (detail?.sources ?? []).filter(r=>/periodic-table\.rsc\.org/.test(r.url ?? ''));
  if (element && detail?.history?.description && historySources.length) {
    sections.push(`## Lịch sử theo nguồn của nguyên tố\n\n${tidy(detail.history.description)}\n\n**Ghi nhận trong hồ sơ:** ${tidy(detail.history.discoverer)}. **Mốc:** ${tidy(detail.history.year)}. Phát hiện, cô lập và đặt tên có thể là các công việc khác nhau; với chất biết từ cổ đại không gán một người khám phá duy nhất.\n\n${historySources.map(r=>`[${r.title ?? 'Royal Society of Chemistry'}](${r.url})`).join(' · ')}`);
    historySources.forEach(r=>source(r.title ?? 'Royal Society of Chemistry',r.url));
  }

  sections.push(`## Phản ứng liên quan\n\n${reactions.length ? 'Các ví dụ dưới đây được chọn vì công thức trong hồ sơ xuất hiện ở vế chất phản ứng hoặc sản phẩm. Đọc cùng điều kiện và phạm vi nguồn; số lượng phương trình trong kho không phải số thí nghiệm đã được đo cho mẫu của bạn. Ký hiệu (s), (l), (g), (aq) lần lượt chỉ rắn, lỏng, khí và dung dịch nước.\n\n' + reactions.map((r,i)=>reactionLesson(r,{heading:`${i+1}. ${tidy(r.topic_vi ?? r.title_vi)}`,sources:reactionSources})).join('\n\n') : material ? 'Chưa chọn phương trình cho toàn bộ hỗn hợp này. Thành phần thay đổi theo sản phẩm; một công thức của dung môi không đại diện cho các chất màu hay phụ gia.' : 'Hồ sơ chưa chọn được phương trình phù hợp để trình bày ở đây. Không suy ra một phản ứng, hiện tượng hay quy trình điều chế chỉ từ công thức hoặc hình dáng mô hình.'}`);

  const firstReaction = reactions[0];
  sections.push(`## Tự kiểm tra\n\n**Câu 1.** ${material ? `Có thể dùng hình một phân tử dung môi để kết luận công thức của toàn bộ ${name} không?` : `Theo công thức ${prettyFormula}, có bao nhiêu nguyên tử ${massTerms[0].symbol} và bao nhiêu nguyên tử tất cả?`}\n\n**Câu 2.** ${firstReaction ? 'Trong phương trình đầu tiên, chất của hồ sơ xuất hiện ở vế nào? Có thể bỏ điều kiện phản ứng và vẫn kết luận chắc chắn hiện tượng không?' : 'Khi xoay hoặc đổi cảnh trưng bày, tọa độ hóa học và bản chất mẫu có thay đổi không?'}\n\n<details><summary>Xem lời giải</summary>\n\n**Câu 1:** ${material ? 'Không. Mô hình dung môi chỉ minh họa một thành phần; muốn biết hỗn hợp cần đọc thành phần của đúng mẫu.' : `Theo công thức có **${massTerms[0].count} nguyên tử ${massTerms[0].symbol}**, tổng số đếm là **${total}**. ${ions || s.kind === 'crystal' ? 'Đây là cách đọc tỉ lệ theo đơn vị công thức, không khẳng định một phân tử rời trong mạng.' : element ? 'Số đếm theo ký hiệu nguyên tố không xác định dạng đơn chất hay ô mạng.' : 'Cần đọc thêm cấu tạo để biết cách nối nguyên tử.'}`}\n\n**Câu 2:** ${firstReaction ? `${firstReaction.reactants.some(r=>formulas.has(r.formula)) ? 'Công thức xuất hiện ở vế chất phản ứng' : 'Công thức xuất hiện ở vế sản phẩm'} trong ví dụ này${firstReaction.reactants.some(r=>formulas.has(r.formula))&&firstReaction.products.some(r=>formulas.has(r.formula)) ? ' và cũng có ở vế sản phẩm' : ''}. Điều kiện ảnh hưởng dạng tồn tại, chiều phản ứng và hiện tượng, nên phải đọc cùng phương trình.` : 'Xoay toàn bộ mô hình hoặc ẩn cảnh chỉ đổi cách quan sát. Đổi sang pha/cấu trúc khác là chọn bộ dữ liệu khác và phải đọc nguồn riêng.'}\n\n</details>`);
  sections.push(`## Nguồn và đọc tiếp\n\n- [Mô hình tương tác · ${name}](${modelURL})${s.structure?.url ? `\n- [Tệp tọa độ ${s.structure.format.toUpperCase()}](${s.structure.url})` : ''}\n${[...primarySources].map(([url,title])=>`- [${title}](${url})`).join('\n')}\n\nPhân biệt dữ liệu định danh, tọa độ mô hình và quy tắc phản ứng. Mỗi nguồn hỗ trợ phần thông tin tương ứng; một đường dẫn không bảo đảm mọi tính chất ở mọi điều kiện.`);
  return {sections, label};
}
