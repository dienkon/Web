import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const metadataFields = ['id', 'slug', 'documentPath', 'title', 'author', 'category', 'summary', 'image', 'tags', 'aliases', 'substanceIds', 'chemicalFormula', 'documentKind', 'lessonKind', 'readingMinutes', 'editorialEvidence'];
const readJSON = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const normalizedText = text => String(text ?? '').normalize('NFKC').replace(/\s+/gu, ' ').trim();
const normalizedTitle = title => normalizedText(title).toLocaleLowerCase('vi');
const contentHash = content => createHash('sha256').update(normalizedText(content)).digest('hex');
const headingText = heading => normalizedText(String(heading ?? '').replace(/^#{1,6}\s+/, ''));
const HTTPS = /^https:\/\/[^\s<>]+$/;

function duplicateGroups(entries, key, label) {
  const groups = new Map();
  for (const entry of entries) {
    const value = key(entry);
    if (!value) continue;
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(entry);
  }
  return [...groups].filter(([, rows]) => rows.length > 1).map(([value, rows]) => ({
    [label]: value,
    documents: rows.map(row => ({id: row.id, indexFile: row.indexFile, documentPath: row.documentPath})),
  }));
}

function evidenceStatus(evidence, part, content) {
  const item = evidence?.[part];
  if (!item) return {status: 'unreviewed', reason: 'Chưa có hồ sơ biên tập tường minh; không suy đoán từ từ khóa.'};
  if (item.status === 'missing') return {status: 'missing', reason: item.reason ?? 'Hồ sơ biên tập ghi nhận phần này còn thiếu.'};
  if (!['documented', 'context-only'].includes(item.status)) return {status: 'invalid', reason: 'Trạng thái bằng chứng không được hỗ trợ.'};
  const heading = headingText(item.section);
  const headings = [...content.matchAll(/^#{1,6}\s+(.+)$/gm)].map(match => headingText(match[1]));
  if (!heading || !headings.includes(heading)) return {status: 'invalid', reason: 'Không tìm thấy đề mục đã khai báo trong nội dung.'};
  if (!Array.isArray(item.sources) || item.sources.length === 0 || item.sources.some(url => typeof url !== 'string' || !HTTPS.test(url))) {
    return {status: 'invalid', reason: 'Bằng chứng cần ít nhất một URL nguồn HTTPS hợp lệ.'};
  }
  if (item.sources.some(url => !content.includes(url))) return {status: 'invalid', reason: 'Nguồn khai báo chưa được dẫn trong bài.'};
  return {status: item.status, section: item.section, sources: [...new Set(item.sources)]};
}

/** This is a structural audit, not an automated fact-check or literary review. */
export function auditLibraryEditorial({root = repositoryRoot, targetPerCategory = 1001} = {}) {
  if (!Number.isInteger(targetPerCategory) || targetPerCategory < 1) throw new Error('Target must be a positive integer.');
  const dataRoot = path.resolve(root, 'trung-tam/src/data');
  const categories = readJSON(path.join(dataRoot, 'config.json')).categories;
  const categoryIds = new Set(categories.map(category => category.id));
  const indexFiles = fs.readdirSync(dataRoot).filter(file => /index.*\.json$/i.test(file)).sort();
  const errors = [], articles = [];
  for (const indexFile of indexFiles) {
    const index = readJSON(path.join(dataRoot, indexFile));
    if (!Array.isArray(index)) {
      errors.push({code: 'invalid-index', indexFile, message: 'Index phải là một mảng tài liệu.'});
      continue;
    }
    for (const meta of index) {
      const article = {id: meta.id, slug: meta.slug, title: meta.title, category: meta.category, indexFile, documentPath: meta.documentPath};
      articles.push(article);
      const issue = (code, message) => errors.push({code, id: meta.id, indexFile, message});
      for (const field of ['id', 'slug', 'title', 'category', 'summary', 'image']) {
        if (typeof meta[field] !== 'string' || !meta[field].trim()) issue('missing-metadata', `Thiếu ${field}.`);
      }
      if (!categoryIds.has(meta.category)) issue('unknown-category', `Danh mục không tồn tại: ${meta.category}.`);
      if (typeof meta.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.slug)) issue('invalid-slug', 'Slug không hợp lệ.');
      // Validate before resolving or reading: no traversal, drive paths, or backslashes.
      if (typeof meta.documentPath !== 'string' || !/^(?:docs|reference)\/(?:[a-z0-9-]+\/)+index\.json$/.test(meta.documentPath)) {
        issue('invalid-path', `Đường dẫn không hợp lệ: ${meta.documentPath}.`);
        continue;
      }
      if (meta.documentPath.split('/').at(-2) !== meta.slug) issue('slug-path-mismatch', 'Thư mục bài không khớp slug.');
      const fullPath = path.resolve(dataRoot, meta.documentPath);
      if (!fullPath.startsWith(dataRoot + path.sep)) {
        issue('invalid-path', 'Đường dẫn vượt ra ngoài kho tài liệu.');
        continue;
      }
      let full;
      try { full = readJSON(fullPath); }
      catch (error) {
        issue('unreadable-document', `Không đọc được bài: ${error.code ?? error.name}.`);
        continue;
      }
      for (const field of metadataFields) {
        if (JSON.stringify(meta[field]) !== JSON.stringify(full[field])) issue('metadata-mismatch', `Index và bài không khớp ${field}.`);
      }
      if (typeof full.content !== 'string' || !full.content.trim()) {
        issue('empty-content', 'Nội dung bài trống hoặc không phải văn bản.');
        continue;
      }
      article.contentHash = contentHash(full.content);
      article.wordCount = normalizedText(full.content).split(' ').length;
      article.inlineImageCount = (full.content.match(/!\[[^\]]*\]\([^)]+\)/g) ?? []).length;
      article.sourceCount = new Set([...full.content.matchAll(/https:\/\/[^\s)"<>]+/g)].map(match => match[0])).size;
      article.declaredLanguage = full.editorialEvidence?.language ?? full.language ?? null;
      article.story = evidenceStatus(full.editorialEvidence, 'story', full.content);
      article.application = evidenceStatus(full.editorialEvidence, 'application', full.content);
      if (full.editorialEvidence?.scope) article.evidenceScope = full.editorialEvidence.scope;
      for (const part of ['story', 'application']) {
        if (article[part].status === 'invalid') issue('invalid-editorial-evidence', `${part}: ${article[part].reason}`);
      }
    }
  }
  const duplicates = {
    ids: duplicateGroups(articles, row => row.id, 'id'),
    slugs: duplicateGroups(articles, row => row.slug, 'slug'),
    paths: duplicateGroups(articles, row => row.documentPath, 'documentPath'),
    titles: duplicateGroups(articles, row => normalizedTitle(row.title), 'normalizedTitle'),
    content: duplicateGroups(articles, row => row.contentHash, 'contentHash'),
  };
  for (const [kind, groups] of Object.entries(duplicates)) {
    for (const group of groups) errors.push({code: `duplicate-${kind}`, documents: group.documents, message: `Trùng ${kind}: ${group.documents.map(row => row.id).join(', ')}.`});
  }
  const validUnique = new Set(), seenIds = new Set(), seenSlugs = new Set(), seenPaths = new Set(), seenTitles = new Set(), seenContent = new Set();
  for (const article of articles) {
    const title = normalizedTitle(article.title);
    if (!article.contentHash || seenIds.has(article.id) || seenSlugs.has(article.slug) || seenPaths.has(article.documentPath) || seenTitles.has(title) || seenContent.has(article.contentHash)) continue;
    if (errors.some(error => error.id === article.id && error.indexFile === article.indexFile)) continue;
    validUnique.add(article);
    seenIds.add(article.id); seenSlugs.add(article.slug); seenPaths.add(article.documentPath); seenTitles.add(title); seenContent.add(article.contentHash);
  }
  const countStatus = (rows, part, status) => rows.filter(row => row[part]?.status === status).length;
  const hasDocumentedContent = row => validUnique.has(row) && row.declaredLanguage === 'vi' && row.story.status === 'documented' && row.application.status === 'documented';
  const categoryReport = categories.map(category => {
    const rows = articles.filter(article => article.category === category.id);
    const uniqueDocumentCount = rows.filter(row => validUnique.has(row)).length;
    return {
      id: category.id, label: category.label, documentCount: rows.length, uniqueDocumentCount,
      documentedArticleCount: rows.filter(hasDocumentedContent).length,
      target: targetPerCategory, remaining: Math.max(0, targetPerCategory - uniqueDocumentCount),
      story: Object.fromEntries(['documented', 'context-only', 'unreviewed', 'missing', 'invalid'].map(status => [status, countStatus(rows, 'story', status)])),
      application: Object.fromEntries(['documented', 'context-only', 'unreviewed', 'missing', 'invalid'].map(status => [status, countStatus(rows, 'application', status)])),
      declaredVietnamese: rows.filter(row => row.declaredLanguage === 'vi').length,
    };
  });
  const quantityTargetReached = categoryReport.every(category => category.remaining === 0) && errors.length === 0;
  const editorialCoverageComplete = articles.every(hasDocumentedContent) && articles.length > 0;
  return {
    schema: 'chemdex.library-editorial-audit/1',
    scope: 'Mọi mảng index*.json ở gốc trung-tam/src/data; đối chiếu metadata, đường dẫn, trùng tiêu đề và trùng toàn văn sau chuẩn hóa khoảng trắng.',
    evidencePolicy: 'documented chỉ xác nhận hồ sơ biên tập tường minh có đề mục và nguồn được dẫn trong bài; không chứng nhận độ đúng sự kiện, chất lượng văn chương, độ khác biệt ngữ nghĩa hay toàn bộ bài đã Việt hóa. context-only là bối cảnh liên quan, chưa được tính là ứng dụng của đúng đối tượng. unreviewed nghĩa là chưa có bằng chứng tường minh, không khẳng định bài thực sự thiếu câu chuyện.',
    indexFiles, targetPerCategory, documentCount: articles.length, uniqueDocumentCount: validUnique.size,
    quantityTargetReached, editorialCoverageComplete,
    targetReached: quantityTargetReached && editorialCoverageComplete,
    categories: categoryReport, duplicates, errors, articles,
  };
}

export function editorialAuditExitCode(report, requireTarget = false) {
  return report.errors.length || (requireTarget && !report.targetReached) ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = auditLibraryEditorial();
  fs.writeFileSync(path.join(repositoryRoot, 'shared/library-editorial-audit.generated.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({documents: report.documentCount, uniqueDocuments: report.uniqueDocumentCount, targetReached: report.targetReached, categories: report.categories, errors: report.errors}, null, 2));
  process.exitCode = editorialAuditExitCode(report, process.argv.includes('--require-target'));
}
