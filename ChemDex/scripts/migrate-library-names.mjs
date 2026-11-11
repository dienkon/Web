import fs from 'node:fs';
import path from 'node:path';
import {substanceSlug, documentFile} from '../shared/library-paths.mjs';

const root = path.resolve(import.meta.dirname, '..');
process.chdir(root);
const indexPath = 'trung-tam/src/data/index.json';
const docs = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
const changes = [];
for (const meta of docs) {
  const previous = documentFile(meta);
  const name = meta.title.split(/\s[—–]/)[0].replace(/[()]/g, ' ');
  meta.slug ??= substanceSlug(name);
  meta.documentPath = `docs/${meta.slug}/index.json`;
  const destination = documentFile(meta);
  const full = JSON.parse(fs.readFileSync(previous, 'utf8'));
  fs.mkdirSync(path.dirname(destination), {recursive: true});
  fs.writeFileSync(destination, JSON.stringify({...full, ...meta}, null, 2) + '\n');
  if (previous !== destination) {
    if (path.dirname(path.resolve(previous)) !== path.resolve('trung-tam/src/data/docs'))
      throw new Error(`Unexpected source: ${previous}`);
    fs.unlinkSync(previous);
    changes.push({id: meta.id, from: previous, to: destination, url: `/trung-tam/tai-lieu-so/${meta.slug}/`});
  }
}
fs.writeFileSync(indexPath, JSON.stringify(docs, null, 2) + '\n');
fs.mkdirSync('docs/library-crystal-upgrade/2026-11-11', {recursive:true});
fs.writeFileSync('docs/library-crystal-upgrade/2026-11-11/authored-path-migration.json', JSON.stringify(changes, null, 2) + '\n');
console.log(`Migrated ${changes.length} authored document paths.`);
