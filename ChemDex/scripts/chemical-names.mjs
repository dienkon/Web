import fs from 'node:fs';
import ts from 'typescript';

const read = file => JSON.parse(fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8'));
const elements = read('shared/elements.json');
const compounds = read('shared/compound-seeds.json');
const coverage = read('shared/lab-structure-coverage.json');
const names = new Map();
const key = text => text.normalize('NFC').toLocaleLowerCase('en');
const english = text => text.replace(/cesium/gi, 'caesium').replace(/aluminum/gi, 'aluminium').replace(/sulph/gi, 'sulf');
function add(from, to) {
  if (from && to && key(from) !== key(english(to))) names.set(key(from), english(to));
}

// Retained names such as water, ammonia, acetic acid and benzene remain valid
// under IUPAC. Do not infer an isomer or an acid's state from a sum formula.
const preferred = {
  ethylene: 'ethene', propylene: 'propene', acetylene: 'ethyne', isobutane: '2-methylpropane',
  acetone: 'propan-2-one', formaldehyde: 'methanal', acetaldehyde: 'ethanal',
  bicarbonate:'hydrogencarbonate', 'sodium bicarbonate':'sodium hydrogencarbonate',
  'potassium bicarbonate':'potassium hydrogencarbonate',
};
for (const row of [...elements, ...compounds, ...coverage]) {
  const en = preferred[key(row.name_en ?? '')] ?? row.name_en;
  add(row.name_vi, en);
  if (en) add(row.name_en, en);
  // Parenthetical common names are search aliases, not part of the substance name.
  if (row.name_vi?.includes(' (')) add(row.name_vi.split(' (')[0], en?.split(' (')[0]);
}
const tokens = {
  natri:'sodium', kali:'potassium', liti:'lithium', canxi:'calcium', bari:'barium',
  magie:'magnesium', magnesi:'magnesium', nhôm:'aluminium', bạc:'silver',
  sắt:'iron', đồng:'copper', kẽm:'zinc', chì:'lead', thiếc:'tin', coban:'cobalt',
  niken:'nickel', crom:'chromium', mangan:'manganese', cadimi:'cadmium', stronti:'strontium',
  amoni:'ammonium', clorua:'chloride', bromua:'bromide', florua:'fluoride', iodua:'iodide',
  iođua:'iodide', iotua:'iodide', nitrat:'nitrate', nitrit:'nitrite', sunfat:'sulfate',
  sulfat:'sulfate', sunfit:'sulfite', sunfua:'sulfide', photphat:'phosphate',
  phosphat:'phosphate', cacbonat:'carbonate', hiđrocacbonat:'hydrogencarbonate',
  hidrocacbonat:'hydrogencarbonate', bicacbonat:'hydrogencarbonate',
  hiđroxit:'hydroxide', hidroxit:'hydroxide', hydroxit:'hydroxide',
  axetat:'acetate', fomat:'formate', oxalat:'oxalate', cromat:'chromate',
  đicromat:'dichromate', thioxianat:'thiocyanate', thiosulfat:'thiosulfate',
  pemanganat:'permanganate', peoxit:'peroxide', oxit:'oxide',
};
function saltName(text) {
  return text.replace(/[\p{L}]+/gu, word => tokens[key(word)] ?? word);
}
for (const [vi,en] of Object.entries(tokens)) add(vi,en);
// Full compound phrases are matched before elements. In particular, this keeps
// iron(II) distinct from iron(III), and does not translate fragments of words.
for (const row of read('shared/reaction-catalog.generated.json').species) {
  if (row.name_vi) add(row.name_vi, saltName(row.name_vi));
}
const formulaNames = Object.fromEntries(elements.map(e=>[e.symbol,english(e.name_en)]));
for (const row of read('shared/reaction-catalog.generated.json').species) {
  if (row.name_vi) formulaNames[row.formula] = saltName(row.name_vi);
}
Object.assign(formulaNames, {
  Ag2O:'silver(I) oxide',Al2O3:'aluminium oxide',BaO:'barium oxide',CaO:'calcium oxide',
  CdO:'cadmium oxide',CoO:'cobalt(II) oxide',Cr2O3:'chromium(III) oxide',CuO:'copper(II) oxide',
  Fe2O3:'iron(III) oxide',FeO:'iron(II) oxide',K2O:'potassium oxide',Li2O:'lithium oxide',
  MgO:'magnesium oxide',MnO:'manganese(II) oxide',Na2O:'sodium oxide',NiO:'nickel(II) oxide',
  PbO:'lead(II) oxide',SrO:'strontium oxide',ZnO:'zinc oxide',
  'Na2Zn(OH)4':'sodium tetrahydroxidozincate(II)',
  'NaAl(OH)4':'sodium tetrahydroxidoaluminate(III)',NaAlO2:'sodium aluminate',
  NaNO2:'sodium nitrite',KNO2:'potassium nitrite',
  H2:'hydrogen',O2:'oxygen',N2:'nitrogen',Cl2:'chlorine',H2O:'water',H2O2:'hydrogen peroxide',
  H2S:'hydrogen sulfide',HCl:'hydrogen chloride',HBr:'hydrogen bromide',HI:'hydrogen iodide',
  H2SO4:'sulfuric acid',HNO3:'nitric acid',NH3:'ammonia',NO:'nitrogen monoxide',NO2:'nitrogen dioxide',
  CO:'carbon monoxide',CO2:'carbon dioxide',SO2:'sulfur dioxide',SO3:'sulfur trioxide',
  CH4:'methane',C2H6:'ethane',C2H4:'ethene',C2H2:'ethyne',C3H8:'propane',
  CH3OH:'methanol',C2H5OH:'ethanol',CH3CHO:'ethanal',CH3COOH:'acetic acid',HCOOH:'formic acid',
  CH3CH2CH2OH:'propan-1-ol',CH3CH2CH2CH2OH:'butan-1-ol',
  C2H5COOH:'propanoic acid',C3H7COOH:'C3H7COOH carboxylic acid isomers',
});
for (const [acid,name] of [['HCOO','methanoate'],['CH3COO','ethanoate'],['C2H5COO','propanoate'],['C3H7COO','butanoate']]) {
  for (const [metal,cation] of [['Li','lithium'],['Na','sodium'],['K','potassium']]) formulaNames[acid+metal]=acid==='C3H7COO'?`${acid+metal} carboxylate isomers`:`${cation} ${name}`;
  for (const [alkyl,nameAlkyl] of [['CH3','methyl'],['C2H5','ethyl'],['C3H7','propyl'],['C4H9','butyl']]) formulaNames[acid+alkyl]=acid==='C3H7COO'||['C3H7','C4H9'].includes(alkyl)?`${acid+alkyl} ester isomers`:`${nameAlkyl} ${name}`;
}
for (const [vi, en] of Object.entries({
  'axit clohiđric':'hydrochloric acid', 'axit clohidric':'hydrochloric acid',
  'axit flohiđric':'hydrofluoric acid', 'axit sunfuric':'sulfuric acid',
  'axit sulfuric':'sulfuric acid', 'axit sunfurơ':'sulfurous acid',
  'axit photphoric':'phosphoric acid', 'axit phosphoric':'phosphoric acid',
  'axit nitric':'nitric acid', 'axit nitrơ':'nitrous acid',
  'axit axetic':'acetic acid', 'axit fomic':'formic acid',
  'nước vôi trong':'calcium hydroxide solution', 'vôi tôi':'calcium hydroxide',
  'vôi sống':'calcium oxide', 'muối ăn':'sodium chloride', 'muối nở':'sodium hydrogencarbonate',
  'thuốc tím':'potassium permanganate', 'nước cất':'distilled water',
  'nước brom':'bromine solution', 'nước clo':'chlorine solution', 'oxi già':'hydrogen peroxide solution',
  'rượu etylic':'ethanol', 'cồn etylic':'ethanol', 'cồn ethanol':'ethanol',
  'cacbon đioxit':'carbon dioxide', 'carbon đioxit':'carbon dioxide',
  'cacbon monoxit':'carbon monoxide', 'nitơ monoxit':'nitrogen monoxide',
  'lưu huỳnh đioxit':'sulfur dioxide', 'lưu huỳnh trioxit':'sulfur trioxide',
  'hiđro clorua':'hydrogen chloride', 'hiđro sunfua':'hydrogen sulfide',
  'hiđro peoxit':'hydrogen peroxide', 'amoniac':'ammonia',
  'glucozơ':'glucose', 'fructozơ':'fructose', 'saccarozơ':'sucrose',
  'glixerol':'glycerol', 'glixerin':'glycerol', 'etilen':'ethene', 'axetilen':'ethyne',
  'fomanđehit':'methanal', 'axetanđehit':'ethanal', 'etanol':'ethanol', 'metanol':'methanol',
  'etan':'ethane', 'metan':'methane', 'propan':'propane', 'propen':'propene',
  'benzen':'benzene', 'toluen':'toluene', 'anilin':'aniline', 'axeton':'propan-2-one',
  'urê':'urea', 'cafein':'caffeine', 'naphtalen':'naphthalene',
  'phenolphtalein':'phenolphthalein', 'phenolftalein':'phenolphthalein',
  'hiđrophotphat':'hydrogenphosphate', 'đihiđrophotphat':'dihydrogenphosphate',
  'anđehit':'aldehyde',
  'hiđro':'hydrogen', 'hidro':'hydrogen', 'nitơ':'nitrogen', 'nitro':'nitrogen',
  'oxi':'oxygen', 'oxy':'oxygen', 'iot':'iodine', 'iốt':'iodine',
  'vonfram':'tungsten', 'molypden':'molybdenum', 'xesi':'caesium',
})) add(vi, en);

// Keep dictionary in the repository's build layer. No DOM rewriting, network
// calls, observer, or name guessing is required in a running application.
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const phrasePattern = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${[...names.keys()].sort((a,b)=>b.length-a.length).map(escape).join('|')})(?![\\p{L}\\p{N}_])`, 'giu');
const protectedPattern = /(?:https?:\/\/|\/[\w-])[^\s<>"'`)]*|(?<![\p{L}])(?:đồng (?:bộ|thời|ý|hành|nhất|đều|nghĩa|vị)|cộng đồng|hội đồng|hợp đồng|bất đồng|bo (?:góc|tròn|mạch)|chì(?:a|m)|bạc (?:màu|hà)|vàng (?:nhạt|cam|nâu|đậm|óng|tươi)|màu vàng|(?:đất|nhà|các|nhiều|mọi) nước|nước (?:ngoài|ta|này|khác|Anh|Pháp|Đức|Mỹ|Ý|Nga|Thụy Điển|Nhật|Trung Quốc|Việt Nam|rửa bát))(?![\p{L}])/giu;

export function chemicalText(text, {exact = false} = {}) {
  if (exact && names.has(key(text))) return names.get(key(text));
  // Paths, formulae, storage keys and URLs must keep their original identity.
  if (/^(?:https?:|data:|\.?\.?\/|#[\w-]+$)/.test(text)) return text;
  return text.split(/(https?:\/\/[^\s<>"'`]+|\]\([^\n]*?\)|<[^>]*>)/g).map((part, i) => {
    if (i % 2) return part;
    const protectedParts = [];
    let result = part.replace(protectedPattern, value => `\u0001${protectedParts.push(value)-1}\u0002`);
    result = result.replace(phrasePattern, value => names.get(key(value)) ?? value);
    // Water is a valid retained name, but Vietnamese "nước" also means country.
    result = result.replace(/(?<=phân tử |chất |dung môi |tạo |tạo thành |với |trong |hòa tan trong )nước\b/giu, 'water')
      .replace(/\bnước(?=\s*\(?H[₂2]O)/giu, 'water');
    return result.replace(/\u0001(\d+)\u0002/g, (_, index) => protectedParts[Number(index)]);
  }).join('');
}

const identityKeys = new Set(['id','slug','documentPath','legacyIds','url','src','href','file','sourceFile','assetFolder','image','thumbnail','symbol','formula','name_en','nameEn','name_search']);
export function chemicalData(value, field = '') {
  if (identityKeys.has(field) || /aliases|searchNames/i.test(field)) return value;
  if (typeof value === 'string') return chemicalText(value, {exact: /name|title|label/i.test(field)});
  if (Array.isArray(value)) return value.map(row => chemicalData(row, field));
  if (!value || typeof value !== 'object') return value;
  // Reviewed Vietnamese manuscripts are prose, not catalog labels. Rewriting
  // words such as “nước”, “đồng” or “chì” here damages sentences and image
  // attribution. Their scientific terminology is selected by the author.
  if (value.editorialEvidence?.language === 'vi' && value.documentPath && value.title) return value;
  const result = Object.fromEntries(Object.entries(value).map(([k,v])=>[k,chemicalData(v,k)]));
  if (value.name_vi || value.nameVi || (value.defaultPhase && value.formula)) {
    const old = value.name_vi ?? value.nameVi;
    const en = value.name_en ?? value.nameEn;
    const display = en ? chemicalText(english(en), {exact:true}) : (!old || old===value.formula) ? formulaNames[value.formula] ?? `${value.formula} isomers` : chemicalText(old, {exact:true});
    if (value.name_vi || (!value.nameVi && value.formula)) result.name_vi = display;
    if (value.nameVi) result.nameVi = display;
    if (en && value.name_en) result.name_en = chemicalText(english(en), {exact:true});
    if (en && value.nameEn) result.nameEn = chemicalText(english(en), {exact:true});
    result.aliases = [...new Set([...(value.aliases ?? []),old].filter(Boolean))];
  }
  return result;
}

export function chemicalSource(source, filename = 'file.js') {
  const kind = /\.tsx$/.test(filename) ? ts.ScriptKind.TSX : /\.jsx$/.test(filename) ? ts.ScriptKind.JSX : ts.ScriptKind.TS;
  const tree = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, kind);
  const edits = [];
  const templateEscape = text => text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  const visit = node => {
    if (ts.isPropertyAssignment(node)) {
      const field=node.name.getText(tree).replace(/^['"]|['"]$/g,'');
      if ((identityKeys.has(field) && !['name_en','nameEn'].includes(field)) || /aliases|searchNames|keywords/i.test(field)) return;
    }
    if (ts.isObjectLiteralExpression(node)) {
      const property = name => node.properties.find(p=>ts.isPropertyAssignment(p) && p.name.getText(tree)===name);
      const vi=property('name_vi'), en=property('name_en');
      if (vi && en && ts.isStringLiteral(vi.initializer) && !property('name_search'))
        edits.push([node.getStart(tree)+1,node.getStart(tree)+1,`name_search:${JSON.stringify(vi.initializer.text)},`]);
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      // Property names and module specifiers are program identities.
      if ((ts.isPropertyAssignment(node.parent) && node.parent.name === node) || ts.isImportDeclaration(node.parent) || ts.isExportDeclaration(node.parent)) return;
      if (ts.isElementAccessExpression(node.parent)) return;
      if (ts.isJsxAttribute(node.parent) && !/^(?:title|alt|placeholder|aria-label)$/.test(node.parent.name.getText(tree))) return;
      if (ts.isCallExpression(node.parent)) {
        const call=node.parent.expression.getText(tree);
        if (/(?:getElementById|getElementsBy\w+|querySelector(?:All)?|closest|matches|setAttribute|getAttribute|removeAttribute|addEventListener|removeEventListener)$/.test(call)
          || /(?:classList\.(?:add|remove|toggle|contains))$/.test(call)
          || (/(?:getItem|setItem|removeItem)$/.test(call) && node.parent.arguments[0]===node)) return;
      }
      if (ts.isBinaryExpression(node.parent) && [node.parent.left,node.parent.right].some(side=>ts.isPropertyAccessExpression(side)&&/^(?:id|value|key|slug|chemicalId)$/.test(side.name.text))) return;
      const next = chemicalText(node.text, {exact:true});
      if (next !== node.text) edits.push([node.getStart(tree),node.end,ts.isNoSubstitutionTemplateLiteral(node) ? '`'+templateEscape(next)+'`' : JSON.stringify(next)]);
    } else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      const next = chemicalText(node.text);
      if (next !== node.text) edits.push([node.getStart(tree)+1,node.end-(ts.isTemplateTail(node)?1:2),templateEscape(next)]);
    } else if (ts.isJsxText(node)) {
      const raw = source.slice(node.pos,node.end), next = chemicalText(raw);
      if (next!==raw) edits.push([node.pos,node.end,next]);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  for (const [start,end,text] of edits.sort((a,b)=>b[0]-a[0])) source=source.slice(0,start)+text+source.slice(end);
  return source;
}

export function chemicalHtml(source) {
  return source.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>|<[^>]+>|[^<]+/gi,part=>{
    if (/^<script\b/i.test(part)) {
      return part.replace(/^(<script\b[^>]*>)([\s\S]*?)(<\/script\s*>)$/i,(_,open,body,close)=>{
        if (/type\s*=\s*['"](?:importmap|application\/(?:ld\+)?json)['"]/i.test(open)) return part;
        return open+chemicalSource(body,'inline.js')+close;
      });
    }
    if (/^<style\b/i.test(part)) return part;
    if (part.startsWith('<')) return part.replace(/\b(title|alt|placeholder|aria-label)=(['"])(.*?)\2/gi,(_,name,quote,value)=>`${name}=${quote}${chemicalText(value)}${quote}`);
    return chemicalText(part);
  });
}

export function chemicalNamesPlugin() {
  return {
    name: 'chemdex-chemical-names', enforce: 'pre',
    transform(source, id) {
      if (id.includes('node_modules') || id.includes('?') || !/\.(?:[cm]?jsx?|tsx?|json)$/.test(id)) return;
      const code = id.endsWith('.json') ? JSON.stringify(chemicalData(JSON.parse(source))) : chemicalSource(source,id);
      return code===source ? null : {code,map:null};
    },
  };
}

export const chemicalNamesEsbuildPlugin = {
  name: 'chemdex-chemical-names',
  setup(build) {
    build.onLoad({filter:/\.(?:js|mjs|json)$/}, async ({path:file}) => {
      if (file.includes('node_modules')) return;
      const source = await fs.promises.readFile(file,'utf8');
      return {contents:file.endsWith('.json') ? JSON.stringify(chemicalData(JSON.parse(source))) : chemicalSource(source,file),loader:file.endsWith('.json')?'json':'js'};
    });
  },
};
