import fs from 'node:fs';
import path from 'node:path';
import { substanceSlug } from '../shared/library-paths.mjs';
import { parseFormula, normalizeFormula } from '../shared/chemistry/formula.mjs';

export function buildStudyReferences() {
  const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
  const elements = fs.readdirSync('data/elements').filter(f => /^\d+_.*\.json$/.test(f)).map(f => read(`data/elements/${f}`));
  const authored = read('trung-tam/src/data/index.json');
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
    const sections = records.map(e => {
      if (!result.formulas[e.symbol]) throw new Error(`Missing element document for historical profile: ${e.symbol}`);
      const href = `/trung-tam/tai-lieu-so/${result.formulas[e.symbol]}/`;
      const sources = (e.sources ?? []).filter(s => /periodic-table\.rsc\.org/.test(s.url));
      return `## ${e.nameVi} (${e.symbol})\n\n${e.history.description || 'Hồ sơ hiện chưa có mô tả chi tiết về quá trình phát hiện.'}\n\n**Mốc lịch sử:** ${e.history.year || 'Chưa xác định'}. **Địa điểm ghi trong hồ sơ:** ${e.history.discoveryLocation || 'Chưa xác định'}.\n\n[Đọc tài liệu về ${e.nameVi}](${href}).\n\n${sources.map(s => `[${s.title}](${s.url})`).join(' · ')}`;
    });
    const meta = { id: slug, slug, documentPath: `docs/${slug}/index.json`, title: anonymous ? `Lịch sử phát hiện ${records[0].nameVi}` : `${name} — dấu mốc khám phá hóa học`, author: 'Ban biên tập ChemDex', category: anonymous ? 'nguyento' : 'tieusu', summary: `Hồ sơ lịch sử liên quan đến ${records.map(e => `${e.nameVi} (${e.symbol})`).join(', ')}; phân biệt phát hiện, cô lập và đặt tên theo từng trường hợp.`, image: '/assets/library/history-evidence.svg', tags: ['Lịch sử hóa học', ...records.map(e => e.symbol)], aliases: [name], documentKind: 'biography', readingMinutes: Math.max(1, Math.ceil(sections.join(' ').split(/\s+/).length / 180)) };
    const content = `# ${meta.title}\n\n${meta.summary}\n\n${sections.join('\n\n')}\n\n## Cách đọc các mốc lịch sử\n\nPhát hiện một nguyên tố, cô lập đơn chất và đặt tên có thể là những công việc khác nhau, diễn ra ở các thời điểm khác nhau. Một nhóm nghiên cứu hoặc cơ quan không được xem như một cá nhân. Với nguyên tố được biết từ cổ đại, hồ sơ không gán một người khám phá. Các ghi nhận trên dẫn về tài liệu của nguyên tố và nguồn tham khảo tương ứng; không bổ sung lời trích dẫn hay giai thoại đời tư chưa có căn cứ.`;
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
    const content = selection.sections.map(s => `## ${s.heading}\n\n${s.text}`).join('\n\n') +
      `\n\n## Đọc tiếp\n\n${selection.relatedFormulas.filter(f => result.formulas[f]).map(f => `- [Tài liệu ${f}](/trung-tam/tai-lieu-so/${result.formulas[f]}/)`).join('\n')}\n\n## Nguồn\n\n${selection.sources.map(s => `- [${s.title}](${s.url})`).join('\n')}`;
    const meta = {id:slug,slug,documentPath:`docs/${slug}/index.json`,title:selection.title,author:'Ban biên tập ChemDex',category:'tieusu',summary:selection.summary,image:'/assets/library/history-evidence.svg',tags:['Lịch sử hóa học'],aliases:selection.aliases,documentKind:'biography',readingMinutes:Math.max(1,Math.ceil(content.split(/\s+/).length/180))};
    const target=path.join('trung-tam/src/data',meta.documentPath);
    fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify({...meta,content},null,2)+'\n');
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
