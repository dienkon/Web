import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import { LAB_REACTIONS, parseStudyEquation, resolveLabExperiment } from '../shared/chemistry/study-links.mjs';
import { normalizeMathMarkdown } from '../shared/chemistry/math-markdown.mjs';
import { youtubeURL, validateVideoQuiz } from '../shared/chemistry/video-quiz.mjs';
import { parseCIF } from '../shared/chemistry/cif.mjs';
const read = file => JSON.parse(fs.readFileSync(file,'utf8'));

test('Lab links require atom conservation, exact substances and an implemented preset', () => {
  const curriculum = fs.readFileSync('lab-3d/src/data/experiments.ts','utf8');
  const presets = fs.readFileSync('lab-3d/src/store/useAppStore.ts','utf8');
  for (const [id, equation] of LAB_REACTIONS) {
    assert.ok(parseStudyEquation(equation), equation);
    assert.equal(resolveLabExperiment(equation)?.id, id);
    assert.ok(curriculum.includes(`id: '${id}'`),id);
    assert.ok(presets.includes(`experimentId === '${id}'`),id);
  }
  assert.equal(resolveLabExperiment('2NaOH(aq) + 2HCl(aq) → 2H2O(l) + 2NaCl(aq)')?.id, 'acid_base_titration');
  for (const invalid of ['H2 + O2 -> H2O','NaCl -> Na + Cl','HCl + NaOH -> KCl + H2O','H2O ⇌ H+ + OH-','2H2 + O2 -> 2H2O','Cu + HCl -> CuCl2 + H2']) assert.equal(resolveLabExperiment(invalid), null, invalid);
  assert.equal(resolveLabExperiment('Cu(OH)2 -> CuO + H2O', 'formal'),null);
});

test('all new crystalline phases retain full metric, expanded positions, occupancy and exported artifacts', () => {
  const catalog = read('data/substance-crystal-models.json');
  assert.equal(catalog.structures.length,38);
  for (const meta of catalog.structures) {
    const data = read('.'+meta.data);
    const parsed = parseCIF(fs.readFileSync('.'+meta.cif,'utf8'));
    assert.deepEqual(parsed.cell,data.cell,meta.id);
    assert.equal(parsed.atoms.length,data.atoms.length,meta.id);
    assert.ok(meta.reference.authors.length && meta.reference.title && meta.note,meta.id);
    for (const field of ['model','preview']) assert.ok(fs.statSync('.'+meta[field]).size>100,`${meta.id}.${field}`);
    assert.ok(data.atoms.every(a=>a.occupancy>0 && a.occupancy<=1.001),meta.id);
  }
});

test('all automatic formula and discovery links target actual library documents', () => {
  const refs = read('shared/study-references.generated.json');
  const docs = [...read('trung-tam/src/data/index.json'), ...read('trung-tam/src/data/reference-index.generated.json'), ...read('trung-tam/src/data/biography-index.generated.json')];
  for (const slug of [...Object.values(refs.formulas), ...Object.values(refs.discoverers)]) {
    const doc=docs.find(d=>(d.slug??d.id)===slug);
    assert.ok(doc,slug); assert.ok(fs.existsSync(`trung-tam/src/data/${doc.documentPath}`),slug);
  }
  const anonymous = docs.filter(d=>d.id.startsWith('lich-su-phat-hien-'));
  assert.ok(anonymous.every(d=>d.category==='nguyento'));
});

test('visuals use explicit source phases and distinguish anhydrous from hydrated copper sulfate', () => {
  const visuals=read('shared/substance-visuals.generated.json');
  assert.ok(Object.keys(visuals).length>=480);
  assert.ok(Object.values(visuals).every(v=>v.modelId || v.crystals.length),'Every non-mixture profile has a molecule, atom, component or sourced crystal representation');
  const anhydrous=Object.values(visuals).find(v=>v.formula==='CuSO4');
  const hydrate=Object.values(visuals).find(v=>v.formula==='CuSO4·5H2O');
  assert.ok(anhydrous.crystals.some(c=>c.id==='chat-chalcocyanite'));
  assert.ok(anhydrous.crystals.every(c=>c.id!=='chat-chalcanthite'));
  assert.ok(hydrate.crystals.some(c=>c.id==='chat-chalcanthite'));
  assert.ok(hydrate.crystals.every(c=>c.id!=='chat-chalcocyanite'));
});

test('TeX normalization preserves fenced and inline code and multiline display math', () => {
  assert.equal(normalizeMathMarkdown('Nội dòng \\(x^2\\).'),'Nội dòng $x^2$.');
  assert.match(normalizeMathMarkdown('\\[\n\\frac{1}{2}\n\\]'),/\$\$\n\\frac\{1\}\{2\}\n\$\$/);
  const code='`\\(code\\)`\n```tex\n\\[literal\\]\n```';
  assert.equal(normalizeMathMarkdown(code),code);
  assert.equal(normalizeMathMarkdown('$$\\\\bar{v} = \\\\frac{1}{2}$$'), '$$\\bar{v} = \\frac{1}{2}$$');
  assert.equal(normalizeMathMarkdown('$$\\begin{aligned}a&=b\\\\ c&=d\\end{aligned}$$'), '$$\\begin{aligned}a&=b\\\\ c&=d\\end{aligned}$$');
});

test('video questions reject bad timestamps, answer indices and unsupported URLs', () => {
  const cue={seconds:30,question:'Khí nào vừa được tạo thành?',options:['H2','O2','CO2','N2'],answer:0,explain:'Hydrogen hình thành từ phản ứng.',evidence:'Khí thoát ra trong ống nghiệm trước giây 30.'};
  assert.equal(youtubeURL('https://youtu.be/6rdmpx39PRk?t=10'),'https://www.youtube.com/watch?v=6rdmpx39PRk');
  assert.equal(youtubeURL('https://youtube.com.attacker.test/watch?v=6rdmpx39PRk'),null);
  assert.equal(youtubeURL('file:///private.mp4'),null);
  assert.deepEqual(validateVideoQuiz({durationSeconds:120,cues:[cue]}).cues[0].options,cue.options);
  for(const patch of [{seconds:-1},{seconds:121},{answer:4},{answer:'0'},{evidence:''},{options:['H2']},{options:['H2','H2','O2','N2']}]) assert.throws(()=>validateVideoQuiz({durationSeconds:120,cues:[{...cue,...patch}]}));
  assert.throws(()=>validateVideoQuiz({durationSeconds:Infinity,cues:[cue]}));
});

test('API rejects unselected video URLs, serves prepared checkpoints and explains missing server configuration',async()=>{
  const file='.cache/test-learning-api.mjs';
  await build({entryPoints:['api/dispatch.ts'],bundle:true,format:'esm',platform:'node',packages:'external',outfile:file});
  const {default:handler}=await import(pathToFileURL(process.cwd()+'/'+file));
  const oldGemini=process.env.GEMINI_API_KEY,oldGoogle=process.env.GOOGLE_API_KEY;
  delete process.env.GEMINI_API_KEY;delete process.env.GOOGLE_API_KEY;
  const request=async(url,body)=>{
    const result={status:200};
    const res={setHeader(){},status(code){result.status=code;return this;},json(value){result.body=value;return this;},end(){return this;}};
    await handler({url,method:'POST',body,headers:{}},res);return result;
  };
  try {
    assert.equal((await request('/api/gemini/video-quiz',{url:'https://attacker.test/video.mp4'})).status,400);
    const seeded=await request('/api/gemini/video-quiz',{url:'https://www.youtube.com/watch?v=7IT2I3LtlNE'});
    assert.equal(seeded.status,200);assert.equal(seeded.body.cues.length,5);
    assert.equal((await request('/api/gemini/video-quiz',{url:'https://www.youtube.com/watch?v=6rdmpx39PRk'})).status,503);
    assert.equal((await request('/api/gemini/chat',{prompt:{injected:true}})).status,400);
    const chat=await request('/api/gemini/chat',{prompt:'Vì sao sodium phản ứng với nước?'});
    assert.equal(chat.status,503);assert.match(chat.body.error,/GEMINI_API_KEY/);
  } finally {
    if(oldGemini===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldGemini;
    if(oldGoogle===undefined)delete process.env.GOOGLE_API_KEY;else process.env.GOOGLE_API_KEY=oldGoogle;
  }
});
