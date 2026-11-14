import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { survey, introduction, appendix } from './survey-content.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const questions = survey.sections.flatMap(section => section.questions);
if (questions.length !== 50 || questions.some((q, i) => q.id !== `Q${String(i + 1).padStart(2, '0')}`)) {
  throw new Error('Bộ nghiên cứu phải có đúng Q01–Q50, không trùng hoặc bỏ số.');
}
const runtime = fs.readFileSync(path.join(dir, 'form-runtime.js'), 'utf8');
const script = '// ChemDex — 50 câu nghiên cứu; chạy createChemDexSurvey() để tạo bản nháp.\n'
  + 'const SURVEY = ' + JSON.stringify(survey, null, 2) + ';\n\n' + runtime.trim() + '\n';
const body = survey.sections.map(section => {
  const content = section.questions.map(q => {
    const type = q.type === 'paragraph' ? 'Đoạn văn' : q.type === 'checkbox' ? `Hộp kiểm — chọn tối đa ${q.maxChoices}` : 'Trắc nghiệm — chọn 1';
    const details = `*${type} · ${q.required ? 'Bắt buộc' : 'Không bắt buộc'}.*`;
    const help = q.help ? `\n\n${q.help}` : '';
    const options = q.options ? '\n\n' + q.options.map(option => `- ${option}`).join('\n') : '';
    return `### ${q.id}. ${q.title}\n\n${details}${help}${options}`;
  }).join('\n\n');
  return `## ${section.title}\n\n${section.description}\n\n${content}`;
}).join('\n\n');
const markdown = introduction.trim() + '\n\n' + body + '\n\n' + appendix.trim() + '\n\n```javascript\n' + script + '```\n';
fs.writeFileSync(path.join(dir, 'create-form.gs'), script, 'utf8');
fs.writeFileSync(path.join(dir, 'README.md'), markdown, 'utf8');
console.log(`Đã tạo README.md và create-form.gs: ${questions.length} câu nghiên cứu, ${survey.sections.length} phần.`);
