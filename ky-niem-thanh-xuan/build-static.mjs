// Optional packaging only. GitHub Pages serves the committed HTML/CSS/JS directly.
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const files = ['index.html', 'memories.css', 'assets/site.css', 'favicon.svg',
  'drive-config.js', 'drive-live.js', 'drive-images.js', 'member-profiles.js', '.nojekyll'];
for (const file of files) {
  const target = join(root, 'dist', file);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(join(root, file), target);
}
console.log('GitHub Pages files are ready in dist/ (HTML, CSS, JavaScript only).');
