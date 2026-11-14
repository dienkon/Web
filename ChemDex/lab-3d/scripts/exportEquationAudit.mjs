import fs from 'node:fs';
import path from 'node:path';
import { ALL_HANDCRAFTED_PROGRAMS } from '../src/vfx/programs/library/index.ts';
import { AUTO_EXPERIMENTS } from '../src/vfx/autoplay/AutoExperiment.ts';
import { validateCatalog } from '../../shared/chemistry/reaction-catalog.mjs';
import { reactionGuide } from '../../shared/chemistry/reaction-guide.mjs';
import { equationKey } from '../../shared/chemistry/formula.mjs';
import './auditScientificCatalog.ts';
import { LESSON_DEFINITIONS } from '../src/lesson/catalog/index.ts';
import { getLessonSpecies } from '../src/lesson/catalog/species.ts';

const catalog = JSON.parse(fs.readFileSync('../shared/reaction-catalog.generated.json', 'utf8'));
const scientific = JSON.parse(fs.readFileSync('artifacts/science-audit/catalog-review.json', 'utf8'));
const audit = validateCatalog(catalog);
const programById = new Map(ALL_HANDCRAFTED_PROGRAMS.map(p => [p.id, p]));
const autoIds = new Set(AUTO_EXPERIMENTS.map(e => e.id));
const rows = catalog.entries.map(entry => ({
  id: entry.id, origin: 'catalog', equation: entry.equation, family: entry.family, title: entry.topic_vi,
  equationKey: equationKey(entry.reactants, entry.products),
  classification: [entry.family, ...(entry.reversible ? ['reversible'] : []),
    ...(entry.products.some(p => p.phase === 'g') ? ['gas_product'] : []),
    ...(entry.products.some(p => p.phase === 's') ? ['solid_product'] : [])],
  reactants: entry.reactants, products: entry.products, conditions: entry.conditions,
  ionic: entry.ionic, explanation: entry.explanation_vi, observation: entry.observation_vi,
  guide: reactionGuide(entry), evidence: entry.evidence,
  sources: entry.evidence.sourceIds.map(id => catalog.sources[id]), caveats: entry.caveats,
  runtime: 'reference_only', automatic: false, balance: 'validated_catalog',
}));
const labels = { ...Object.fromEntries(catalog.entries.map(e => [e.family, e.topic_vi])),
  dilution: 'Pha loãng', emission: 'Phát xạ ngọn lửa', equilibrium: 'Cân bằng',
  indicator: 'Chỉ thị', gas_evolution: 'Tạo khí (chương trình)', solid_formation: 'Tạo chất rắn (chương trình)',
  specialized: 'Mô hình, bài học và quy tắc chuyên biệt' };
for (const origin of ['programs', 'deterministic', 'lessons', 'dynamicRules']) for (const record of scientific[origin]) {
  const p = origin === 'programs' ? programById.get(record.id) : undefined;
  const c = p?.chemistry;
  const lesson = origin === 'lessons' ? LESSON_DEFINITIONS.find(l => l.id === record.id) : undefined;
  const lessonSide = terms => terms?.map(t => `${t.coefficient === 1 ? '' : t.coefficient}${getLessonSpecies(t.species).formula}(${getLessonSpecies(t.species).phase})`).join(' + ');
  const lessonTerms = terms => terms?.map(t => ({ formula: getLessonSpecies(t.species).formula,
    phase: getLessonSpecies(t.species).phase, coefficient: t.coefficient }));
  const family = c?.representation && c.representation !== 'reaction' ? c.representation
    : c?.conditions?.activation === 'ignition' ? 'combustion'
    : c?.kinetics.model === 'heat_activated' ? 'thermal'
    : c?.species.some(s => s.role === 'catalyst') ? 'catalytic_decomposition'
    : c?.species.some(s => s.role === 'product' && s.phase === 'g') ? 'gas_evolution'
    : c?.species.some(s => s.role === 'product' && s.phase === 's') ? 'solid_formation'
    : 'specialized';
  rows.push({ ...record, origin, family,
    classification: [...new Set([family, ...(record.classification ?? []), record.execution ?? 'specialized_model'])],
    equation: c?.equation ?? record.equation ?? (lesson ? `${lessonSide(lesson.reactants)} → ${lessonSide(lesson.products)}` : record.id),
    reactants: c?.species.filter(s => s.role === 'reactant') ?? lessonTerms(lesson?.reactants) ?? record.reactants,
    products: c?.species.filter(s => s.role === 'product') ?? lessonTerms(lesson?.products) ?? record.products,
    conditions: c?.conditions ?? lesson?.conditions ?? record.conditions ?? record.heating ?? null,
    kinetics: c?.kinetics ?? (lesson ? { model: lesson.model, duration_s: lesson.duration_s, note: lesson.physicalTime_vi } : null),
    protocol: lesson ?? null,
    runtime: origin === 'programs' ? 'dedicated_program' : origin === 'lessons' ? 'lesson_model' : 'solver_rule',
    automatic: origin === 'programs' && autoIds.has(record.id),
    explanation: p?.explain.why_vi ?? lesson?.explanation_vi ?? record.finding_vi ?? '',
    observation: p?.explain.observation_vi ?? lesson?.observation_vi ?? record.observation_vi ?? '',
    sources: lesson?.sources.map(url => ({ url, title: 'Tài liệu nền được khai báo trong bài học' })) ?? record.sources,
  });
}
const counts = field => Object.fromEntries([...new Set(rows.map(r => r[field]))].sort().map(key => [key, rows.filter(r => r[field] === key).length]));
const report = { schema: 'chemdex.full-equation-audit/1', catalogDigest: JSON.parse(fs.readFileSync('../shared/reaction-data-summary.json')).catalogDigest,
  scope: 'Toàn bộ kho tra cứu, chương trình 3D, quy tắc bộ giải, bài học và 18 trường hợp quy tắc carbonate. Phương trình AI sinh theo yêu cầu không thuộc tập dữ liệu tĩnh hữu hạn này.',
  counts: { records: rows.length, byOrigin: counts('origin'), byFamily: counts('family'), automaticPrograms: autoIds.size,
    uniqueCatalogMolecularEquations: new Set(rows.filter(r => r.origin === 'catalog').map(r => r.equationKey)).size },
  validation: { catalog: audit, runtime: scientific.counts },
  claims: { experimentallyCalibrated: false, recordsAreNotUniqueReactions: true }, rows };
const output = 'docs/audit/equations'; fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, 'all-equations.json'), JSON.stringify(report, null, 2) + '\n');
const escape = x => String(x ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
const summary = ['# Audit toàn bộ phương trình hiện có', '', report.scope, '',
  '**Phân biệt:** bản ghi chương trình, bài học và quy tắc có thể biểu diễn cùng phương trình. Không cộng tổng bản ghi thành số phản ứng khác nhau. Không coi phát xạ/chỉ thị là phương trình phản ứng mol.', '',
  '| Nguồn | Số bản ghi |', '|---|---:|', ...Object.entries(report.counts.byOrigin).map(([k,n]) => `| ${k} | ${n} |`), '',
  `Catalog có ${report.counts.uniqueCatalogMolecularEquations} phương trình phân tử khác nhau; ${autoIds.size} chương trình được liệt kê trong chế độ tự động.`, '',
  'Các nhóm runtime là phân loại theo biểu diễn/sản phẩm/điều kiện của chương trình; nhóm catalog là phân loại hóa học được khai báo. Một phản ứng có thể đồng thời tạo khí, tạo rắn và oxi hóa–khử.', '',
  '## Phân loại đầy đủ', '', '| Nhóm | Số bản ghi | Chi tiết |', '|---|---:|---|'];
for (const [family, count] of Object.entries(report.counts.byFamily)) {
  const selected = rows.filter(r => r.family === family);
  summary.push(`| ${labels[family] ?? family} · ${family} | ${count} | [Danh sách](${family}.md) |`);
  const detail = [`# ${labels[family] ?? family} · ${count} bản ghi`, '', '| Nguồn / ID | Phương trình | Cân bằng | Phạm vi chạy |', '|---|---|---|---|'];
  for (const r of selected) detail.push(`| ${r.origin} / ${r.id} | ${escape(r.equation)} | ${r.balance === null ? 'Quan sát, không kiểm tra mol' : r.balance?.valid === false ? 'Lỗi' : 'Đạt cấu trúc'} | ${r.runtime}${r.automatic ? ' · tự động' : ''} |`);
  for (const r of selected) detail.push('', `## ${r.id} (${r.origin})`, '', r.equation, '',
    `- Điều kiện: ${JSON.stringify(r.conditions)}`,
    `- Phân loại: ${r.classification.join(', ')}`,
    `- Giải thích: ${r.explanation || 'Chưa có diễn giải riêng trong nguồn bản ghi; xem protocol hoặc quy tắc gốc.'}`, `- Quan sát: ${r.observation || 'Chưa có mô tả quan sát riêng; không suy hiện tượng chỉ từ phương trình cân bằng.'}`,
    `- Nguồn: ${(r.sources ?? r.references ?? []).map(s => `[${s.title}](${s.url})`).join('; ') || 'Xem audit runtime và định nghĩa nguồn gốc; không suy có nguồn thực nghiệm riêng.'}`,
    `- Giới hạn: ${(r.caveats ?? r.parameterLimits ?? []).join(' ') || 'Kiểm tra cấu trúc không xác nhận tốc độ, hiệu suất hoặc mọi tổ hợp môi trường.'}`,
    ...(r.guide ? r.guide.stages.map(s => `- ${s.title_vi}: ${s.explanation_vi}`) : []));
  fs.writeFileSync(path.join(output, family + '.md'), detail.join('\n') + '\n');
}
summary.push('', '[Dữ liệu audit đầy đủ](all-equations.json)', '', 'Các lỗi cấu trúc được báo ở validation trong JSON. Những thuộc tính chưa có dữ liệu hiệu chuẩn được giữ là chưa xác nhận, không tự gán đạt thực nghiệm.');
fs.writeFileSync(path.join(output, 'README.md'), summary.join('\n') + '\n');
console.log(JSON.stringify(report.counts, null, 2));
if (!audit.valid || scientific.counts.balanceFailures || scientific.counts.ionicFailures) process.exitCode = 1;
