import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { coverageInventory } from '../src/physical/catalog';
const entries = coverageInventory();
const ids = new Set<string>();
for (const e of entries) {
  if (ids.has(e.id)) throw new Error(`Duplicate physical ID: ${e.id}`);
  ids.add(e.id);
  if (!e.behaviors.length || !e.validation.scenarios.length || !e.validation.limitations.length) throw new Error(`Incomplete profile ${e.id}`);
}
const output = resolve(process.env.PHYSICAL_AUDIT_OUTPUT ?? 'artifacts/verified-physics');
mkdirSync(output, { recursive: true });
const counts = Object.fromEntries([...new Set(entries.map(e => e.kind))].map(kind => [kind, entries.filter(e => e.kind === kind).length]));
writeFileSync(resolve(output, 'coverage.json'), JSON.stringify({ count: entries.length, counts, entries }, null, 2));
writeFileSync(resolve(output, 'coverage.vi.md'), '# Kiểm kê vật lí\n\nMức `estimated` không có nghĩa đã hiệu chuẩn thực nghiệm.\n\n| ID | Tên | Nhóm | Trạng thái | Kiểm chứng cần có |\n|---|---|---|---|---|\n'
  + entries.map(e => `| ${e.id} | ${e.name} | ${e.kind} | ${e.validation.status} | ${e.validation.scenarios.join(', ')} |`).join('\n') + '\n');
console.log(JSON.stringify({ count: entries.length, counts, output }));
