import fs from 'node:fs';
import path from 'node:path';
import { substanceSlug } from '../shared/library-paths.mjs';
import { parseFormula, normalizeFormula } from '../shared/chemistry/formula.mjs';

function vietnameseNarrative(text, elements) {
  const words = [
    ...elements.map(element => [element.nameEn, element.nameVi?.toLocaleLowerCase('vi')]),
    ['ionization smoke detectors', 'thiết bị báo khói ion hóa'],
    ['radioisotope power sources', 'nguồn năng lượng đồng vị phóng xạ'],
    ['Radioisotope Thermoelectric Generator', 'máy phát nhiệt điện đồng vị phóng xạ'],
    ['Actinide', 'actini'], ['Lanthanide', 'lantan'], ['acid', 'axit'],
    ['oxide', 'oxit'], ['carbonate', 'cacbonat'], ['hydroxide', 'hiđroxit'],
    ['dioxide', 'đioxit'], ['monoxide', 'monoxit'], ['trioxide', 'trioxit'],
    ['sulfate', 'sunfat'], ['sulphate', 'sunfat'], ['sulfide', 'sunfua'],
    ['chloride', 'clorua'], ['fluoride', 'florua'], ['bromide', 'bromua'],
    ['nitride', 'nitrua'], ['nitric', 'nitric'], ['sulfuric', 'sunfuric'],
    ['sulphuric', 'sunfuric'], ['hydrochloric', 'clohiđric'],
    ['inflammable air', 'khí dễ cháy'], ['transuranium', 'siêu urani'],
    ['superconductors', 'chất siêu dẫn'],
  ].filter(([from, to]) => from && to).sort(([a], [b]) => b.length - a.length);
  let result = String(text ?? '').trim();
  for (const [from, to] of words) {
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(`(?<![\\p{L}])${escaped}(?![\\p{L}])`, 'giu'), to);
  }
  return result.replace(/(^|[.!?]\s+)(\p{Ll})/gu, (_, prefix, letter) => prefix + letter.toLocaleUpperCase('vi'));
}

// Reuse recorded historical events and element applications without inventing
// dialogue, private lives, portraits, or credit for inventions made later.
export function historicalProfile({name, records, slug, anonymous, formulas, photos, elements}) {
  const vi = text => vietnameseNarrative(text, elements);
  const first = records[0];
  const names = records.map(element => vi(element.nameVi).toLocaleLowerCase('vi'));
  const sourceMap = new Map(records.flatMap(element => (element.sources ?? []).filter(source => /periodic-table\.rsc\.org/.test(source.url)).map(source => [source.url, `Hội Hóa học Hoàng gia Anh · ${element.nameVi}`])));
  const sources = [...sourceMap].map(([url, title]) => ({title, url}));
  const photo = photos.elementMeta?.[first.symbol];
  const image = photo?.image ?? photos.elements?.[first.symbol] ?? '/assets/library/history-evidence.svg';
  const firstHeading = anonymous ? `Dấu vết ${names[0]} trong lịch sử` : `Cuộc tìm kiếm dẫn đến ${names[0]}`;
  const title = anonymous
    ? `${first.nameVi}: một lịch sử có trước tên người phát hiện`
    : name.length > 105
      ? `${first.nameVi}: cuộc tìm kiếm của các nhóm nghiên cứu`
      : `${name} — lần theo dấu vết ${names.slice(0, 3).join(', ')}${names.length > 3 ? ' và những nguyên tố khác' : ''}`;
  const historySections = records.map((element, index) => {
    if (!formulas[element.symbol]) throw new Error(`Missing element document for historical profile: ${element.symbol}`);
    const heading = index === 0 ? firstHeading : `Thêm một dấu mốc: ${vi(element.nameVi)} (${element.symbol})`;
    const credit = anonymous ? '' : `\n\nNhững người hoặc cơ sở được ghi nhận trong câu chuyện này là **${element.history.discoverer}**.`;
    return `## ${heading}\n\n${vi(element.history.description)}${credit}`;
  });
  const combinedHistory = records.map(element => element.history.description ?? '').join(' ');
  let explanation;
  if (anonymous) {
    explanation = `Với ${names.join(', ')}, việc con người biết sử dụng một vật liệu và việc hóa học nhận diện nguyên tố trong vật liệu ấy thuộc về những thời kỳ khác nhau. Một đồ vật cổ có thể cho biết người xưa đã biết khai thác, nung hoặc tạo hình; nó chưa cho biết họ đã có khái niệm nguyên tử như ngày nay. Vì thế, câu chuyện này cần được đọc qua dấu tích vật liệu và sự thay đổi cách hiểu, thay vì tìm một ngày phát minh duy nhất.`;
  } else if (/quang phổ|vạch phổ|spectr/i.test(combinedHistory)) {
    explanation = `Ánh sáng giúp cuộc tìm kiếm đi xa hơn màu sắc nhìn bằng mắt. Khi tách ánh sáng thành quang phổ, người nghiên cứu có thể so sánh vị trí những vạch sáng và tìm dấu hiệu chưa giải thích được bằng các chất đã biết. Từ một dấu hiệu ấy đến kết luận về nguyên tố mới vẫn cần kiểm tra nguồn phát sáng và những chất có thể lẫn trong mẫu. Một vạch phổ là bằng chứng phải giải thích, chứ tên gọi chưa tự sinh ra từ màu của ngọn lửa.`;
  } else if (/điện phân/i.test(combinedHistory)) {
    explanation = `Trong phép điện phân, dòng điện làm thay đổi trạng thái hóa học của các chất ở điện cực. Cách làm ấy mở đường đến những kim loại khó tách bằng các phương pháp quen thuộc trước đó. Người nghiên cứu còn phải nhận ra phần vừa thu được là gì, phân biệt nó với hợp chất ban đầu và kiểm tra phản ứng của mẫu. Công việc cô lập vì thế bổ sung cho công việc nhận diện: biết một nguyên tố có mặt và giữ được nó dưới dạng đơn chất là hai bước nối tiếp nhau.`;
  } else if (/bắn phá|tổng hợp|chuỗi phân rã|hạt nhân|máy gia tốc/i.test(combinedHistory)) {
    explanation = `Ở những nguyên tố được tạo ra bằng phản ứng hạt nhân, bằng chứng có thể xuất hiện dưới dạng một chuỗi tín hiệu phân rã. Các nhà nghiên cứu phải nối những tín hiệu ấy với quá trình tạo mẫu, kiểm tra sản phẩm và đối chiếu sự kiện lặp lại. Đổi một nguyên tố thành nguyên tố khác đòi hỏi thay đổi hạt nhân; phản ứng hóa học thông thường chỉ sắp xếp lại electron và liên kết. Chính sự khác biệt này khiến cuộc tìm kiếm cần đến những công cụ vượt xa bình phản ứng quen thuộc.`;
  } else {
    explanation = `Điều làm một phát hiện có sức nặng là khả năng phân biệt chất đang nghiên cứu với những chất đã biết. Mẫu vật có thể chứa nhiều thành phần; tên khoáng vật hoặc màu sắc chưa đủ xác định nguyên tố. Tách mẫu, so sánh phản ứng và diễn giải phép đo nối với nhau thành một lập luận. Bởi vậy, ngày nhận ra một nguyên tố, ngày cô lập được đơn chất và ngày tên gọi được thống nhất có thể khác nhau.`;
  }
  const applicationSections = records.map(element => {
    const applications = (element.applications ?? []).filter(application => application.desc?.trim());
    // Avoid converting clinical statements into medical guidance. Material and
    // research contexts still connect the discovery with actual modern work.
    const nonClinical = applications.filter(application => !/điều trị|tâm thần|thuốc|chữa bệnh/i.test(application.title + ' ' + application.desc));
    const selected = (nonClinical.length ? nonClinical : applications).slice(0, 2);
    return `### ${element.nameVi} (${element.symbol})\n\n${selected.map(application => `${vi(application.desc)}`).join('\n\n')}\n\n[Đọc tiếp về ${vi(element.nameVi)}](/trung-tam/tai-lieu-so/${formulas[element.symbol]}/).`;
  });
  const applicationHeading = 'Từ dấu mốc nghiên cứu đến công việc hôm nay';
  const caption = photo?.sourceUrl
    ? `*Hình minh họa chủ đề ${names[0]}. [Nguồn hình: bộ ảnh nguyên tố](${photo.sourceUrl}).*`
    : `*Hình minh họa chủ đề ${names[0]}.*`;
  const sections = [
    historySections[0], `![Hình minh họa ${names[0]}](${image})\n\n${caption}`,
    ...historySections.slice(1), `## Bằng chứng đã thay đổi điều gì?\n\n${explanation}`,
    `## ${applicationHeading}\n\n${applicationSections.join('\n\n')}\n\nNhững ứng dụng này thuộc về hành trình phát triển tiếp theo của nguyên tố. Từ phát hiện đến thiết bị sử dụng được còn có công việc của nhiều thế hệ: tạo vật liệu đủ sạch, hiểu tính chất, thiết kế quy trình và kiểm tra độ bền. Vai trò của người khám phá nằm ở dấu mốc được kể ở trên; các công nghệ xuất hiện sau đó cần được ghi nhận cho đúng công trình.`,
    `## Nguồn và đọc tiếp\n\n${sources.map(source => `- [${source.title}](${source.url})`).join('\n')}`,
  ];
  const content = sections.join('\n\n');
  const sourceURLs = sources.map(source => source.url);
  const editorialEvidence = {
    language: 'vi', scope: 'related-element', contextLabel: records.map(element => `${element.nameVi} (${element.symbol})`).join(', '),
    reviewBasis: 'existing-element-dossier',
    story: {status: sourceURLs.length ? 'documented' : 'missing', section: `## ${firstHeading}`, sources: sourceURLs},
    application: {status: sourceURLs.length ? 'context-only' : 'missing', section: `## ${applicationHeading}`, sources: sourceURLs},
  };
  const meta = {
    id: slug, slug, documentPath: `docs/${slug}/index.json`, title, author: 'Ban biên tập ChemDex',
    category: anonymous ? 'nguyento' : 'tieusu', summary: vi(first.history.description).split(/(?<=\.)\s+/).slice(0, 2).join(' '),
    image, tags: ['Lịch sử hóa học', ...records.map(element => element.symbol)], aliases: [name],
    documentKind: 'biography', readingMinutes: Math.max(2, Math.ceil(content.split(/\s+/).length / 180)), editorialEvidence,
  };
  return {...meta, content};
}

export function buildStudyReferences() {
  const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
  const elements = fs.readdirSync('data/elements').filter(f => /^\d+_.*\.json$/.test(f)).map(f => read(`data/elements/${f}`));
  const authored = read('trung-tam/src/data/index.json');
  const photos = read('shared/library-photos.generated.json');
  const compounds = [...read('shared/compounds.json'), ...read('shared/structure-catalog.generated.json')];
  const links = read('shared/library-links.generated.json');
  const result = { formulas: {}, discoverers: {}, scientistNames: {} };
  const crystalCatalog = read('data/crystal-catalog.json');
  const wikiCrystals = read('data/wiki-crystal-models.json');
  const substanceCatalog = fs.existsSync('data/substance-crystal-models.json') ? read('data/substance-crystal-models.json') : { structures: [], elements: {} };
  const substanceCrystals = substanceCatalog.structures;
  const codCrystals = fs.existsSync('data/cod-crystal-models.json') ? read('data/cod-crystal-models.json').structures : [];
  const elementalPhases = { ...crystalCatalog.elements, ...wikiCrystals.elements };
  for (const [symbol, phase] of Object.entries(substanceCatalog.elements ?? {})) elementalPhases[symbol] ??= phase;
  const diatomicElements = new Set(['N2', 'O2', 'F2', 'Cl2', 'Br2', 'I2']);
  const allCrystals = [...crystalCatalog.structures, ...wikiCrystals.structures, ...substanceCrystals];
  const visualIndex = {};
  const formulaKey = value => {
    try { return JSON.stringify(Object.entries(parseFormula(String(value).replace(/\s+/g, ''))).sort(([a],[b])=>a.localeCompare(b))); }
    catch { return null; }
  };
  const allDocs = [...authored, ...read('trung-tam/src/data/reference-index.generated.json')];
  for (const doc of allDocs) {
    const subjects = compounds.filter(c => doc.substanceIds?.includes(c.id) || links[c.id] === doc.id);
    const symbol = /^\d{3}_([A-Z][a-z]?)$/.exec(doc.id)?.[1];
    const suppliedFormula = symbol ?? doc.chemicalFormula ?? subjects[0]?.formula;
    if (!suppliedFormula || suppliedFormula === 'Hỗn hợp') continue;
    const formula = normalizeFormula(suppliedFormula);
    const candidates = subjects.length ? subjects : compounds.filter(s => normalizeFormula(s.formula) === formula);
    const models = candidates.filter(s => !s.material && s.kind !== 'unavailable');
    const model = models.find(s => s.structure?.coordinateType === 'experimental') ?? models.find(s => s.structure?.dimension === '3d') ?? models[0];
    const key = formulaKey(formula);
    // Element catalog identities are explicit: alpha-Mn's Mn29 cell is Mn,
    // whereas reducing arbitrary molecular formulas would confuse isomers.
    const elementalSymbol = symbol ?? (elementalPhases[formula] ? formula : diatomicElements.has(formula) ? formula.slice(0, -1) : null);
    const crystals = elementalSymbol ? [elementalPhases[elementalSymbol]].filter(Boolean) : [
      ...allCrystals.filter(c => key && formulaKey(c.formula) === key),
      // COD selections bind to a reviewed chemical identity. Formula-only
      // matching would attach a glucose crystal to fructose or inositol.
      ...codCrystals.filter(c => c.subjectIds?.includes(model?.id)),
    ];
    visualIndex[doc.slug ?? doc.id] = { formula, modelId: model?.id ?? null, kind: model?.kind ?? null, source: model?.structure?.source ?? null, provenance: model?.structure?.provenance ?? null, ...(model?.isomerGroup?{isomerGroup:model.isomerGroup}:{}), crystals };
  }
  fs.writeFileSync('shared/substance-visuals.generated.json', JSON.stringify(visualIndex, null, 2) + '\n');
  const crystalLinks = {};
  for (const record of Object.values(visualIndex)) {
    if (!record.modelId || !record.crystals.length) continue;
    crystalLinks[record.modelId] ??= [];
    for (const crystal of record.crystals) if (!crystalLinks[record.modelId].includes(crystal.id)) crystalLinks[record.modelId].push(crystal.id);
  }
  fs.writeFileSync('shared/crystal-links.generated.json', JSON.stringify(crystalLinks, null, 2) + '\n');
  for (const compound of compounds) {
    if (compound.formula && links[compound.id] && !result.formulas[compound.formula]) {
      const doc = allDocs.find(d => d.id === links[compound.id]);
      if (doc) result.formulas[compound.formula] = doc.slug ?? doc.id;
    }
  }
  for (const element of elements) {
    const editorial=authored.find(a=>a.chemicalFormula===element.symbol||a.id.endsWith('_'+element.symbol));
    const slug=editorial?.slug??result.formulas[element.symbol]??links[`atom-${element.symbol}`]??links[`element-${element.symbol}`];
    if(slug)result.formulas[element.symbol]=slug;
  }
  const groups = new Map();
  for (const element of elements) {
    const history = element.history ?? {};
    const names = Array.isArray(history.discoverers) ? history.discoverers.map(p => p.name ?? p.label).filter(Boolean) : [history.discoverer].filter(v => typeof v === 'string' && v.trim());
    for (const name of names) {
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(element);
    }
  }
  const metadata = [];
  for (const [name, records] of groups) {
    const anonymous = /không xác định|thời cổ|cổ đại|tiền sử|khuyết danh|chưa rõ/i.test(name);
    const slug = anonymous ? `lich-su-phat-hien-${records[0].symbol.toLowerCase()}` : `nha-khoa-hoc-${substanceSlug(name).slice(0, 160)}`;
    const existing = authored.find(d => d.category === 'tieusu' && (d.title === name || d.aliases?.includes(name)));
    if (existing) { result.discoverers[name] = existing.slug ?? existing.id; continue; }
    result.discoverers[name] = slug;
    const {content, ...meta} = historicalProfile({name, records, slug, anonymous, formulas: result.formulas, photos, elements});
    const target = path.join('trung-tam/src/data', meta.documentPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify({ ...meta, content }, null, 2) + '\n');
    metadata.push(meta);
  }
  // Referenced contributors need a profile too, even when they are not the
  // person credited in an element's discoverer field. These entries are
  // explicitly reviewed; their aliases do not imply discovery credit.
  for (const selection of read('data/scientist-reference-selections.json')) {
    const existing = [...authored, ...metadata].find(d => d.category === 'tieusu' && (d.slug === selection.slug || selection.aliases.some(name => d.aliases?.includes(name))));
    const slug = existing?.slug ?? selection.slug;
    for (const name of selection.aliases) result.scientistNames[name] = slug;
    if (existing) continue;
    const vi = text => vietnameseNarrative(text, elements);
    const sections = selection.sections.map(section => ({...section, text: vi(section.text)}));
    const sources = [...selection.sources];
    if (selection.slug === 'nha-khoa-hoc-antoine-lavoisier') {
      sections[0] = {heading: 'Khi chất cháy lại nặng thêm', text: `Đốt một vật, người quan sát thường chờ phần còn lại nhẹ đi. Nhưng khi nung một số kim loại trong không khí, sản phẩm lại nặng hơn ban đầu. Với Antoine Lavoisier, sự tăng khối lượng là một dấu vết cần giải thích. Học thuyết phlogiston khi ấy xem sự cháy như quá trình chất cháy mất đi một thành phần; phép cân đặt cách giải thích ấy trước một câu hỏi khó.\n\nLavoisier nghiên cứu vai trò của không khí và đi đến cách giải thích sự cháy bằng sự kết hợp với oxy. Kết quả của Priestley về khí thu được khi nung oxit thủy ngân và nghiên cứu của Cavendish về nước góp phần vào cuộc chuyển đổi này. Thành tựu hình thành qua thí nghiệm và cách diễn giải của nhiều người. Lavoisier giữ vai trò then chốt trong việc gắn phép đo khối lượng với một hệ thống giải thích hóa học.`};
      sections.push({heading: 'Từ phép cân đến tính lượng nguyên liệu', text: `Ngày nay, cách theo dõi lượng chất xuất hiện trong từng bài toán tính theo phương trình. Nếu một phản ứng tạo ra khí, chỉ cân phần rắn còn lại sẽ bỏ sót vật chất đã đi khỏi bình. Khi kiểm kê đủ các dòng vào và ra, người làm thí nghiệm mới có thể kiểm tra phản ứng và phát hiện thất thoát.\n\nChẳng hạn, phương trình **2H₂ + O₂ → 2H₂O** cho biết hai mol hiđro phản ứng với một mol oxy để tạo hai mol nước. Hệ số biểu diễn tỉ lệ số hạt hoặc số mol, không có nghĩa hai gam hiđro chỉ cần một gam oxy. Muốn tính khối lượng phải dùng thêm khối lượng mol.\n\nTrong sản xuất, phép tính ấy giúp ước lượng lượng nguyên liệu cần đưa vào và lượng sản phẩm có thể thu được. Kết quả thực tế còn phụ thuộc độ tinh khiết, hiệu suất và những phản ứng phụ. Một định luật bảo toàn không xóa bỏ các giới hạn đó; nó giúp nhận ra phần vật chất chưa được giải thích. Đó là cách tinh thần định lượng của cuộc cách mạng hóa học tiếp tục làm việc trong phòng thí nghiệm hôm nay.`});
      sources.push({title: 'OpenStax · Tính lượng chất theo phương trình', url: 'https://openstax.org/books/chemistry-2e/pages/4-3-reaction-stoichiometry'});
    }
    const element = elements.find(element => selection.relatedFormulas.includes(element.symbol));
    const photo = photos.elementMeta?.[element?.symbol];
    const image = photo?.image ?? '/assets/library/history-evidence.svg';
    const illustration = `![Minh họa chủ đề ${element?.nameVi ?? 'lịch sử hóa học'}](${image})\n\n*Hình minh họa chủ đề ${element?.nameVi ?? 'lịch sử hóa học'}${photo?.sourceUrl ? `; [nguồn hình](${photo.sourceUrl})` : ''}.*`;
    const content = sections.map((section, index) => `## ${section.heading}\n\n${section.text}${index === 0 ? '\n\n' + illustration : ''}`).join('\n\n') +
      `\n\n## Đọc tiếp\n\n${selection.relatedFormulas.filter(f => result.formulas[f]).map(f => `- [Tài liệu ${f}](/trung-tam/tai-lieu-so/${result.formulas[f]}/)`).join('\n')}\n\n## Nguồn\n\n${selection.sources.map(s => `- [${s.title}](${s.url})`).join('\n')}`;
    const finalContent = content.replace(/## Nguồn\n\n[\s\S]*$/, `## Nguồn\n\n${sources.map(source => `- [${source.title}](${source.url})`).join('\n')}`);
    const editorialEvidence = {language: 'vi', scope: 'chemical-family', contextLabel: 'Phép đo khối lượng và tính lượng chất', reviewBasis: 'source-read-2026-11-15', story: {status: 'documented', section: `## ${sections[0].heading}`, sources: selection.sources.map(source => source.url)}, application: selection.slug === 'nha-khoa-hoc-antoine-lavoisier' ? {status: 'documented', section: '## Từ phép cân đến tính lượng nguyên liệu', sources: [sources.at(-1).url]} : {status: 'missing', sources: [], reason: 'Chưa có phần ứng dụng được biên tập riêng.'}};
    const meta = {id:slug,slug,documentPath:`docs/${slug}/index.json`,title:selection.title,author:'Ban biên tập ChemDex',category:'tieusu',summary:selection.summary,image,tags:['Lịch sử hóa học'],aliases:selection.aliases,documentKind:'biography',readingMinutes:Math.max(2,Math.ceil(finalContent.split(/\s+/).length/180)),editorialEvidence};
    const target=path.join('trung-tam/src/data',meta.documentPath);
    fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify({...meta,content:finalContent},null,2)+'\n');
    metadata.push(meta);
  }
  fs.writeFileSync('trung-tam/src/data/biography-index.generated.json', JSON.stringify(metadata, null, 2) + '\n');
  for (const [name, slug] of Object.entries(result.discoverers)) {
    if (slug.startsWith('lich-su-phat-hien-')) continue;
    result.scientistNames[name] = slug;
    for (const part of name.split(/\s+(?:và|and|phối hợp với|cùng)\s+|[,;]\s*/)) {
      if (part.length >= 8 && /^[A-ZÀ-Ỹ]/.test(part) && !/cộng sự|nhóm nghiên cứu/i.test(part)) result.scientistNames[part] ??= slug;
    }
  }
  fs.writeFileSync('shared/study-references.generated.json', JSON.stringify(result, null, 2) + '\n');
  const routes = read('shared/library-routes.generated.json');
  metadata.forEach(d => { routes[d.id] = d.slug; });
  fs.writeFileSync('shared/library-routes.generated.json', JSON.stringify(routes, null, 2) + '\n');
  console.log(`Study references: ${metadata.length} historical profiles; ${Object.keys(result.formulas).length} formula links.`);
}
