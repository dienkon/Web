import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const release = JSON.parse(read('release.json'));
if (!/^\d+\.\d+\.\d+$/.test(release.version) || !Number.isSafeInteger(release.androidVersionCode) || release.androidVersionCode < 2) throw new Error('Invalid release version/code.');
for (const file of ['README.md', 'CHANGELOG.md', `docs/audits/${release.version}.md`]) {
  if (!read(file).includes(release.version)) throw new Error(`Missing version in ${file}`);
}
for (const section of ['Scope', 'Firestore', 'Security', 'Validation', 'Deployment', 'Risks']) {
  if (!read(`docs/audits/${release.version}.md`).includes(section)) throw new Error(`Audit is missing ${section}`);
}
if (!read('android/app/build.gradle').includes('dkRelease.androidVersionCode') || !read('vite.config.ts').includes('JSON.stringify(release.version)')) throw new Error('Android/Vite must use release.json.');
try {
  const base = JSON.parse(execFileSync('git', ['show', 'HEAD:DkTest/release.json'], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString());
  const changes = execFileSync('git', ['diff', '--relative', '--name-only', 'HEAD', '--', 'src', 'server', 'android', 'scripts', 'package.json', 'package-lock.json', 'vite.config.ts', 'firestore.rules', 'firestore.indexes.json'], { cwd: root }).toString().trim();
  if (changes && base.version === release.version) throw new Error('Source changed without a version bump.');
  const before = base.version.split('.').map(Number), after = release.version.split('.').map(Number);
  const different = after.findIndex((part, index) => part !== before[index]);
  if ((different >= 0 && after[different] < before[different]) || release.androidVersionCode < base.androidVersionCode) throw new Error('Release version/code cannot go backwards.');
  const changesApk = changes.split(/\r?\n/).some((file) => /^(src\/|android\/|scripts\/build-mobile\.mjs$|vite\.config\.ts$|package(?:-lock)?\.json$)/.test(file));
  if (changesApk && release.androidVersionCode <= base.androidVersionCode) throw new Error('APK inputs changed without an Android versionCode increase.');
} catch (error) { if (!String(error.message).includes('Command failed: git show')) throw error; }
console.log(`Release ${release.version}, Android code ${release.androidVersionCode}: metadata/changelog/audit OK`);
