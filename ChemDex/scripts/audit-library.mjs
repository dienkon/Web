import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {documentFile} from '../shared/library-paths.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8').replace(/^\uFEFF/,''));
export function auditLibrary() {
  const subjects=[...read('shared/compounds.json'),...read('shared/structure-catalog.generated.json')];
  const index=[...read('trung-tam/src/data/index.json'),...read('trung-tam/src/data/reference-index.generated.json')];
  const sharedLinks=read('shared/library-links.generated.json');
  const ids=new Set(subjects.map(s=>s.id)),docIds=new Set(),errors=[],articles=[];
  for(const meta of index) {
    if(docIds.has(meta.id))errors.push(`Duplicate document: ${meta.id}`);
    docIds.add(meta.id);
    let full;
    try {full=read(documentFile(meta));}catch{errors.push(`Missing document: ${meta.id}`);continue;}
    for(const key of ['id','title','category','summary','chemicalFormula','aliases','substanceIds'])
      if(JSON.stringify(full[key])!==JSON.stringify(meta[key]))errors.push(`Metadata mismatch: ${meta.id}.${key}`);
    const explicit=meta.substanceIds??[];
    for(const id of explicit)if(!ids.has(id))errors.push(`Unknown subject: ${meta.id} -> ${id}`);
    const element=/^\d{3}_([A-Z][a-z]?)$/.exec(meta.id)?.[1];
    const links=[...new Set([...explicit,...Object.entries(sharedLinks).filter(([,id])=>id===meta.id).map(([id])=>id),...(element?subjects.filter(s=>s.formula===element&&!s.material).map(s=>s.id):[])])];
    articles.push({id:meta.id,title:meta.title,subjectIds:links,sections:(full.content.match(/^## /gm)??[]).length,characters:full.content.length,externalSources:[...new Set([...full.content.matchAll(/https:\/\/[^\s)"<>]+/g)].map(m=>m[0]))]});
  }
  const coverage=subjects.map(subject=>({id:subject.id,formula:subject.formula,name:subject.name_vi??subject.name_en,primaryArticleId:sharedLinks[subject.id],articleIds:articles.filter(doc=>doc.subjectIds.includes(subject.id)).map(doc=>doc.id)}));
  const linked=coverage.filter(c=>c.articleIds.length);
  for(const [subject,id] of Object.entries(sharedLinks))if(!ids.has(subject)||!docIds.has(id))errors.push(`Invalid shared library link: ${subject} -> ${id}`);
  return {schema:'chemdex.library-coverage/1',scope:'Mọi định danh trong kho cấu trúc hiện tại; nhiều định danh có thể cùng một chất. Có bài liên kết không đồng nghĩa nội dung đã được đối chiếu độc lập.',subjectCount:coverage.length,documentCount:index.length,linkedSubjectCount:linked.length,missingSubjectCount:coverage.length-linked.length,errors,articles,subjects:coverage};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const report=auditLibrary();
  fs.writeFileSync(path.join(root,'shared/library-coverage.generated.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({subjects:report.subjectCount,linked:report.linkedSubjectCount,missing:report.missingSubjectCount,documents:report.documentCount,errors:report.errors}));
  if(report.errors.length)process.exitCode=1;
}
