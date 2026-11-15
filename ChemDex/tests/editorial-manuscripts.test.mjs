import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {editorialArticles} from '../scripts/data/editorial-articles.mjs';
import {editorialBiographies} from '../scripts/data/editorial-biographies.mjs';
import {editorialApplications} from '../scripts/data/editorial-applications.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const manuscripts = [...editorialArticles, ...editorialBiographies, ...editorialApplications];
const index = read('trung-tam/src/data/editorial-index.generated.json');
const metadata = new Map(index.map(doc => [doc.id, doc]));
const photoRecords = read('scripts/data/story-photo-sources.json').photos;
const photosById = new Map(photoRecords.map(photo => [photo.id, photo]));
const existing = ['index.json', 'biography-index.generated.json', 'reference-index.generated.json']
  .flatMap(file => read('trung-tam/src/data/' + file));

test('the editorial index contains each distinct manuscript once, with substantial prose and cited sources', () => {
  assert.equal(new Set(manuscripts.map(doc => doc.id)).size, manuscripts.length);
  assert.equal(new Set(manuscripts.map(doc => doc.title)).size, manuscripts.length);
  assert.deepEqual([...metadata.keys()].sort(), manuscripts.map(doc => doc.id).sort());
  assert.equal(index.length, metadata.size);
  const oldIds = new Set(existing.flatMap(doc => [doc.id, doc.slug, ...(doc.legacyIds ?? [])]).filter(Boolean));
  for (const article of manuscripts) {
    assert.ok(!oldIds.has(article.id), `New article collides with an existing identity: ${article.id}`);
    assert.ok(article.sections.length >= 3, article.id);
    const prose = article.sections.map(([, text]) => text).join(' ');
    assert.ok(prose.trim().split(/\s+/).length >= 450, `Short manuscript: ${article.id}`);
    assert.ok(new Set(article.sources.map(([, url]) => url)).size >= 2, `Too few distinct sources: ${article.id}`);
    for (const [label, url] of article.sources) {
      assert.ok(label.trim(), article.id);
      assert.equal(new URL(url).protocol, 'https:', article.id);
    }
  }
});

test('generated features preserve their manuscripts, headings and declared editorial evidence', () => {
  for (const article of manuscripts) {
    const meta = metadata.get(article.id);
    const doc = read('trung-tam/src/data/' + meta.documentPath);
    assert.equal(doc.title, article.title, article.id);
    assert.equal(doc.summary, article.summary, article.id);
    assert.equal(doc.category, article.category, article.id);
    assert.equal(doc.editorialEvidence.language, 'vi', article.id);
    assert.deepEqual(meta.editorialEvidence, doc.editorialEvidence, article.id);
    for (const [heading, prose] of article.sections) {
      assert.ok(doc.content.includes(`## ${heading}\n\n${prose.trim()}`), `Missing or altered manuscript section: ${article.id} / ${heading}`);
    }
    for (const [, source] of article.sources) assert.ok(doc.content.includes(source), `Missing citation: ${article.id}`);
    for (const part of ['story', 'application']) {
      const evidence = doc.editorialEvidence[part];
      assert.equal(evidence.status, 'documented', `${article.id} / ${part}`);
      assert.ok(doc.content.includes(evidence.section + '\n'), `${article.id} / ${part}`);
      assert.ok(evidence.sources.length >= 2, `${article.id} / ${part}`);
      for (const source of evidence.sources) assert.ok(doc.content.includes(source), `${article.id} / ${part}`);
    }
  }
});

test('a feature without a photo key retains its own illustration instead of inheriting the first manifest photo', () => {
  const fallbackArticles = manuscripts.filter(article => !article.photoKey);
  assert.ok(fallbackArticles.length > 0, 'Keep coverage of the missing-photo-key regression.');
  for (const article of manuscripts) {
    const meta = metadata.get(article.id);
    const doc = read('trung-tam/src/data/' + meta.documentPath);
    const photo = article.photoKey ? photosById.get(article.photoKey) : null;
    if (article.photoKey) assert.ok(photo, `Unknown explicit photo key: ${article.id} / ${article.photoKey}`);
    const expectedImage = photo ? photo.image : article.image;
    const expectedAlt = photo ? photo.alt : article.imageAlt;
    assert.ok(expectedImage, `No chosen illustration: ${article.id}`);
    assert.equal(meta.image, expectedImage, `Wrong index illustration: ${article.id}`);
    assert.equal(doc.image, expectedImage, `Wrong article illustration: ${article.id}`);
    assert.ok(doc.content.includes(`![${expectedAlt}](${expectedImage})`), `Wrong inline illustration: ${article.id}`);
    assert.ok(fs.existsSync(path.join(root, 'trung-tam/public', expectedImage)), `Missing illustration file: ${article.id}`);
    if (photo) {
      assert.ok(doc.content.includes(photo.author), `Missing image author: ${article.id}`);
      assert.ok(doc.content.includes(photo.sourceUrl), `Missing image source: ${article.id}`);
      assert.ok(doc.content.includes(photo.license), `Missing image license: ${article.id}`);
    }
  }
});
