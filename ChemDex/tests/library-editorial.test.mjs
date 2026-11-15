import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {auditLibraryEditorial, editorialAuditExitCode} from '../scripts/audit-library-editorial.mjs';

const sourceURL = 'https://example.org/chemistry-history';
const exampleContent = `## Chuyện của một phép đo\n\nMột thí nghiệm có nguồn được trình bày trong bài.\n\n## Ứng dụng hiện nay\n\nỨng dụng được giải thích với phạm vi cụ thể.\n\n## Nguồn\n\n[Hồ sơ](${sourceURL})`;
const makeDoc = (id, overrides = {}) => ({
  id, slug: id, documentPath: `docs/${id}/index.json`, title: `Tài liệu ${id}`,
  author: 'Ban biên tập', category: 'nguyento', summary: `Tóm tắt ${id}`, image: '/assets/example.jpg',
  tags: ['Lịch sử'], content: `${exampleContent}\n\nDấu mốc riêng ${id}.`, ...overrides,
});
const makeEvidence = (status = 'documented') => ({
  language: 'vi', scope: 'element',
  story: {status: 'documented', section: '## Chuyện của một phép đo', sources: [sourceURL]},
  application: {status, section: '## Ứng dụng hiện nay', sources: [sourceURL]},
});

function fixture(t, indexes, {categories = [{id: 'nguyento', label: 'Nguyên tố'}], transformMetadata} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chemdex-editorial-audit-'));
  const dataRoot = path.join(root, 'trung-tam/src/data');
  fs.mkdirSync(dataRoot, {recursive: true});
  fs.writeFileSync(path.join(dataRoot, 'config.json'), JSON.stringify({categories}));
  for (const [file, docs] of Object.entries(indexes)) {
    const index = docs.map(doc => {
      const {content, ...meta} = doc;
      const destination = path.resolve(dataRoot, doc.documentPath);
      if (destination.startsWith(dataRoot + path.sep) && !doc.documentPath.includes('..')) {
        fs.mkdirSync(path.dirname(destination), {recursive: true});
        fs.writeFileSync(destination, JSON.stringify(doc));
      }
      return transformMetadata ? transformMetadata({...meta}) : meta;
    });
    fs.writeFileSync(path.join(dataRoot, file), JSON.stringify(index));
  }
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  return root;
}

test('the complete library has matching metadata, valid paths and no duplicate identities, titles or full texts', () => {
  const report = auditLibraryEditorial();
  assert.deepEqual(report.errors, []);
  assert.ok(report.indexFiles.includes('index.json'));
  assert.ok(report.indexFiles.includes('reference-index.generated.json'));
  assert.ok(report.indexFiles.includes('biography-index.generated.json'));
  assert.equal(report.categories.reduce((total, category) => total + category.documentCount, 0), report.documentCount);
  assert.equal(report.uniqueDocumentCount, report.documentCount);
  assert.equal(editorialAuditExitCode(report), 0, 'Normal integrity checks do not require the future volume target.');
});

test('new indexes are discovered and empty categories remain visible in the target report', t => {
  const root = fixture(t, {'index.json': [makeDoc('bai-mot')], 'editorial-index.generated.json': [makeDoc('bai-hai')]}, {
    categories: [{id: 'nguyento', label: 'Nguyên tố'}, {id: 'phanung', label: 'Phản ứng'}],
  });
  const report = auditLibraryEditorial({root, targetPerCategory: 2});
  assert.equal(report.documentCount, 2);
  assert.equal(report.categories.find(category => category.id === 'nguyento').remaining, 0);
  assert.equal(report.categories.find(category => category.id === 'phanung').remaining, 2);
  assert.equal(editorialAuditExitCode(report), 0);
  assert.equal(editorialAuditExitCode(report, true), 1, 'The explicit target gate must fail when any category is under target.');
  const countOnly = auditLibraryEditorial({root: fixture(t, {'index.json': [makeDoc('chi-du-so-luong')] }), targetPerCategory: 1});
  assert.equal(countOnly.quantityTargetReached, true);
  assert.equal(countOnly.editorialCoverageComplete, false);
  assert.equal(editorialAuditExitCode(countOnly, true), 1, 'Reaching the count without documented Vietnamese stories and applications does not satisfy the goal.');
  const complete = auditLibraryEditorial({root: fixture(t, {'index.json': [makeDoc('du-bai', {editorialEvidence: makeEvidence()})] }), targetPerCategory: 1});
  assert.equal(editorialAuditExitCode(complete, true), 0);
});

test('duplicate titles and content remain detectable across indexes despite whitespace changes', t => {
  const first = makeDoc('ban-goc', {title: 'Một câu chuyện', content: exampleContent});
  const second = makeDoc('ban-sao', {title: '  MỘT   câu chuyện ', content: exampleContent.replaceAll('\n', '\r\n  ')});
  const report = auditLibraryEditorial({root: fixture(t, {'index.json': [first], 'new-index.generated.json': [second]}), targetPerCategory: 2});
  assert.equal(report.duplicates.titles.length, 1);
  assert.equal(report.duplicates.content.length, 1);
  assert.equal(report.uniqueDocumentCount, 1);
  assert.equal(report.targetReached, false);
  assert.equal(editorialAuditExitCode(report), 1);
});

test('a repeated document identity or path cannot inflate the number of different documents', t => {
  const doc = makeDoc('bai-lap');
  const report = auditLibraryEditorial({root: fixture(t, {'index.json': [doc], 'duplicate-index.json': [doc]}), targetPerCategory: 2});
  assert.equal(report.duplicates.ids.length, 1);
  assert.equal(report.duplicates.slugs.length, 1);
  assert.equal(report.duplicates.paths.length, 1);
  assert.equal(report.documentCount, 2);
  assert.equal(report.uniqueDocumentCount, 1);
  assert.equal(report.targetReached, false);
});

test('path traversal and changed index metadata fail integrity checks', t => {
  const root = fixture(t, {'index.json': [makeDoc('bai-thuong'), makeDoc('duong-dan-sai', {documentPath: '../../secret.json'})]}, {
    transformMetadata: meta => meta.id === 'bai-thuong' ? {...meta, summary: 'Tóm tắt đã lệch'} : meta,
  });
  const report = auditLibraryEditorial({root});
  assert.ok(report.errors.some(error => error.code === 'invalid-path' && error.id === 'duong-dan-sai'));
  assert.ok(report.errors.some(error => error.code === 'metadata-mismatch' && error.id === 'bai-thuong'));
  assert.equal(report.uniqueDocumentCount, 0);
});

test('editorial status requires explicit sourced evidence and never follows story keywords or documentKind', t => {
  const docs = [
    makeDoc('chua-ra-soat', {documentKind: 'story', content: 'Câu chuyện thực tế, ứng dụng hiện nay, năm 1900, lịch sử.'}),
    makeDoc('co-bang-chung', {editorialEvidence: makeEvidence()}),
    makeDoc('chi-boi-canh', {editorialEvidence: makeEvidence('context-only')}),
    makeDoc('thieu-nguon', {editorialEvidence: {...makeEvidence(), story: {status: 'documented', section: 'Chuyện của một phép đo', sources: ['https://example.org/absent']}}}),
    makeDoc('thieu-de-muc', {editorialEvidence: {...makeEvidence(), application: {status: 'documented', section: 'Đề mục không tồn tại', sources: [sourceURL]}}}),
  ];
  const report = auditLibraryEditorial({root: fixture(t, {'index.json': docs})});
  const byId = new Map(report.articles.map(article => [article.id, article]));
  assert.equal(byId.get('chua-ra-soat').story.status, 'unreviewed');
  assert.equal(byId.get('chua-ra-soat').application.status, 'unreviewed');
  assert.equal(byId.get('co-bang-chung').story.status, 'documented');
  assert.equal(byId.get('co-bang-chung').application.status, 'documented');
  assert.equal(byId.get('chi-boi-canh').application.status, 'context-only');
  assert.equal(byId.get('thieu-nguon').story.status, 'invalid');
  assert.equal(byId.get('thieu-de-muc').application.status, 'invalid');
  assert.equal(report.categories[0].application['context-only'], 1);
  assert.equal(report.categories[0].application.unreviewed, 1);
  assert.equal(report.errors.filter(error => error.code === 'invalid-editorial-evidence').length, 2);
});
