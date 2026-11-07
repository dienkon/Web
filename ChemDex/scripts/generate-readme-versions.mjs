import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Snapshot direct dependencies from manifests and committed npm lockfiles.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const date = process.argv[2] ?? new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Expected YYYY-MM-DD');
const projects = [
  ['Web chính / API', '.'],
  ['Lab 2D', 'lab-2d'],
  ['Lab 3D', 'lab-3d'],
  ['Lab Safety', 'lab-safety'],
  ['Trung tâm', 'trung-tam'],
  ['Đấu trường', 'dau-truong'],
  ['Nhận diện phương trình', 'tien-ich/phuong-trinh/nhan-dien-pthh-thong-minh'],
  ['Chuỗi phản ứng', 'tien-ich/phuong-trinh/chuoi-phan-ung'],
].map(([title, directory]) => {
  const read = name => JSON.parse(fs.readFileSync(path.join(root, directory, name), 'utf8'));
  return { title, directory, manifest: read('package.json'), lock: read('package-lock.json') };
});
const version = (project, name) => project.lock.packages?.[`node_modules/${name}`]?.version ?? '—';
const lines = [
  '# Phiên bản ChemDex và thư viện', '',
  `Snapshot tài liệu: **${date}**. Nguồn: 8 cặp \`package.json\` / \`package-lock.json\` trong checkout.`, '',
  'Đây là phiên bản khóa để tái lập cài đặt, không phải danh sách phiên bản mới nhất trên npm. Cột khai báo giữ nguyên khoảng semver; cột khóa là phiên bản npm chọn trong lockfile. Dependency gián tiếp không được liệt kê; xem từng lockfile để tra toàn bộ cây.', '',
  '## Phiên bản ứng dụng', '',
  'Web gốc chưa khai báo `version`. Một số ứng dụng còn dùng tên mẫu `react-example` và `0.0.0`; các giá trị này được giữ nguyên để phản ánh đúng source, không dùng làm số phát hành chung của ChemDex.', '',
  '| Phân hệ | Thư mục | Tên package | Version ứng dụng | Lockfile |',
  '| --- | --- | --- | --- | --- |',
  ...projects.map(p => `| ${p.title} | \`${p.directory}\` | \`${p.manifest.name}\` | ${p.manifest.version ?? 'Chưa khai báo'} | ${p.lock.lockfileVersion} |`), '',
  '## Các thư viện chính (phiên bản khóa)', '',
  '| Phân hệ | React | Vite | TypeScript | Tailwind CSS | Three.js | GenAI SDK |',
  '| --- | --- | --- | --- | --- | --- | --- |',
  ...projects.map(p => `| ${p.title} | ${['react', 'vite', 'typescript', 'tailwindcss', 'three', '@google/genai'].map(n => version(p, n)).join(' | ')} |`), '',
  'Dấu “—” nghĩa là không có package tại vị trí `node_modules/<tên>` trong lockfile của phân hệ. Không suy ra phân hệ sử dụng cùng phiên bản với web gốc.', '',
  '## Toàn bộ dependency trực tiếp theo phân hệ', '',
];
for (const p of projects) {
  lines.push(`### ${p.title}`, '', `Nguồn: [manifest](../${p.directory === '.' ? '' : p.directory + '/'}package.json), [lockfile](../${p.directory === '.' ? '' : p.directory + '/'}package-lock.json).`, '',
    '| Package | Nhóm | Khai báo | Phiên bản khóa |', '| --- | --- | --- | --- |');
  for (const group of ['dependencies', 'devDependencies']) {
    for (const [name, declared] of Object.entries(p.manifest[group] ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
      lines.push(`| \`${name}\` | ${group === 'dependencies' ? 'runtime' : 'development'} | \`${declared}\` | \`${version(p, name)}\` |`);
    }
  }
  lines.push('');
}
lines.push('## Cập nhật snapshot', '',
  'Chạy từ thư mục ChemDex sau khi cập nhật manifest/lockfile:', '',
  '```sh', 'node scripts/generate-readme-versions.mjs YYYY-MM-DD', '```', '',
  'Lệnh chỉ đọc manifest/lockfile và ghi lại tài liệu này; không cài đặt hoặc nâng cấp thư viện. Ngày truyền vào là ngày chốt tài liệu. Nếu bỏ ngày, script lấy ngày UTC tại thời điểm chạy.', '',
  'Node.js yêu cầu: `22.x` theo `package.json` gốc và `.nvmrc`. npm: dùng bản tương thích đi kèm Node 22; dự án chưa khóa bằng `packageManager`.', '',
  '[Về README](../README.md)', '');
fs.writeFileSync(path.join(root, 'docs/VERSIONS.md'), lines.join('\n'));
console.log(`Wrote docs/VERSIONS.md (${projects.length} manifests, ${date})`);
