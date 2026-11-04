import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parseFormula} from '../shared/chemistry/formula.mjs';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));

const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const subjects=[...read('shared/compounds.json'),...read('shared/structure-catalog.generated.json')];
const authored=read('trung-tam/src/data/index.json');
const elements=read('shared/elements.json'),byElement=new Map(elements.map(e=>[e.symbol,e]));
const reactionData=read('shared/reaction-catalog.generated.json');
const manifest=read('data/manifest.json');
const output='trung-tam/src/data/reference';
fs.mkdirSync(output,{recursive:true});
const clean=s=>String(s??'').replace(/\|/g,' / ').replace(/[\r\n]+/g,' ');
const prettyFormula=formula=>formula.split(/[·.]/).map((part,index)=>{const prefix=index>0?(part.match(/^\d+/)?.[0]??''):'';return prefix+part.slice(prefix.length).replace(/\d/g,digit=>'₀₁₂₃₄₅₆₇₈₉'[Number(digit)]);}).join('·');
const fmt=n=>Number(n).toLocaleString('vi-VN',{maximumFractionDigits:5});
function identity(s) {
  if(s.material)return 'material:'+s.materialLabel;
  if(s.kind==='crystal')return s.id;
  if(s.cid)return 'cid:'+s.cid;
  if(/^[A-Z][a-z]?$/.test(s.formula))return 'element:'+s.formula;
  // An organic formula alone does not establish isomer identity.
  return s.family==='organic'?'named:'+s.formula+':'+s.name_vi:'formula:'+s.formula;
}
const existing=new Map();
for(const a of authored) {
  const article=read(`trung-tam/src/data/docs/${a.id}.json`);
  // Keep brief legacy introductions available, but do not let them suppress
  // a complete, sourced dossier for the same element.
  if(article.content.length<2500||(article.content.match(/^## /gm)??[]).length<4||!article.content.includes('https://'))continue;
  for(const id of a.substanceIds??[])existing.set(id,a.id);
  const symbol=/^\d{3}_([A-Z][a-z]?)$/.exec(a.id)?.[1];
  if(symbol)for(const s of subjects.filter(s=>s.formula===symbol&&!s.material))existing.set(s.id,a.id);
}
const groups=new Map();
for(const subject of subjects) {const key=identity(subject);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(subject);}
const generated=[],links={};
for(const [key,group] of groups) {
  const editorial=group.map(s=>existing.get(s.id)).find(Boolean);
  if(editorial){for(const s of group)links[s.id]=editorial;continue;}
  const s=group.find(s=>s.structure)??group[0],formula=s.formula,counts=parseFormula(formula),atomCount=Object.values(counts).reduce((a,b)=>a+b,0);
  const element=Object.keys(counts).length===1&&atomCount===1?byElement.get(formula):null;
  const detailMeta=element?manifest.find(m=>m.symbol===element.symbol&&m.file):null;
  const detail=detailMeta&&fs.existsSync('data/'+detailMeta.file)?read('data/'+detailMeta.file):null;
  const isMaterial=s.material||Boolean(s.modelNote?.includes('đơn vị lặp'));
  const ions=s.ions??group.find(r=>r.ions)?.ions;
  const candidateFormulas=new Set(group.map(r=>r.formula));
  const reactions=isMaterial?[]:reactionData.entries.filter(r=>[...r.reactants,...r.products].some(row=>candidateFormulas.has(row.formula)));
  const selected=[];
  for(const r of reactions)if(!selected.some(a=>a.family===r.family)&&selected.length<3)selected.push(r);
  const massTerms=Object.entries(counts).map(([symbol,count])=>({symbol,count,mass:byElement.get(symbol)?.mass}));
  const canCalculate=!isMaterial&&massTerms.every(t=>typeof t.mass==='number'&&Number.isFinite(t.mass));
  const mass=canCalculate?massTerms.reduce((n,t)=>n+t.count*t.mass,0):null;
  const id='ho-so-'+createHash('sha256').update(key).digest('hex').slice(0,12);
  const name=element?.name_vi??s.name_vi??s.name_en??formula;
  const modelURL='/tien-ich/cau-truc-3d/?compound='+encodeURIComponent(s.id).replace(/[()]/g, c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
  const notes=[];
  if(isMaterial)notes.push(s.modelNote??'Vật liệu hoặc hỗn hợp không có một phân tử duy nhất đại diện.');
  if(s.kind==='ion')notes.push('Đây là ion: công thức nguyên tử cần được đọc cùng điện tích trong tên và dữ liệu cấu trúc.');
  if(s.kind==='crystal'||ions)notes.push('Tỉ lệ công thức không đồng nghĩa một phân tử riêng lẻ; biểu diễn nhóm ion và ô mạng cần được phân biệt.');
  if(s.family==='organic')notes.push('Không suy đồng phân hay cấu hình lập thể chỉ từ công thức tổng quát. Tên và định danh chất quyết định mô hình cần chọn.');
  const title=element?`${name} (${formula}) — ${detail?.history?.description ? 'hồ sơ nguyên tố và hành trình khám phá' : 'đọc dấu vết từ cấu trúc nguyên tử'}`:`${name} — đọc cấu trúc, lần theo sự chuyển hóa`;
  const sections=[];
  if(detail?.history?.description) sections.push(`## Câu chuyện: hành trình của ${name}\n\n${detail.history.description}\n\n${detail.history.discoverer?`**Người/nhóm được ghi trong dữ liệu:** ${clean(detail.history.discoverer)}. `:''}${detail.history.year?`**Mốc ghi nhận:** ${clean(detail.history.year)}. `:''}\n\n*Phần lịch sử được chuyển từ bài nguyên tố ChemDex hiện có; liên kết nguồn đối chiếu nằm cuối bài.*`);
  else if(selected.length) {
    const r=selected[0],input=r.reactants.some(row=>candidateFormulas.has(row.formula));
    sections.push(`## Câu chuyện: ${input?'khi '+name+' tham gia phản ứng':'khi '+name+' xuất hiện ở phía sản phẩm'}\n\nBắt đầu từ một câu hỏi cụ thể: ${input?`từ ${formula}, các nguyên tử sẽ phân bố vào sản phẩm như thế nào sau chuyển hóa`:`những chất nào có thể được biểu diễn như tiền chất tạo ${formula}`}? Một trường hợp trong danh mục là:\n\n**${r.equation}**\n\nTrong trường hợp này, ${name} được đọc ở phía ${input?'chất phản ứng':'sản phẩm'}. ${r.explanation_vi??''} ${r.observation_vi??''}\n\nCâu chuyện chưa kết thúc ở phương trình: ${r.conditions?.description_vi??'phải xác định điều kiện của hệ trước khi kết luận diễn biến thực tế'}. Điểm cần theo dõi là danh tính chất, trạng thái ghi trong ngoặc và tỉ lệ hệ số, thay vì chỉ ghi nhớ tên phản ứng.\n\n> ${r.evidence.type==='family-rule'?'Trường hợp này được xây dựng theo quy tắc họ phản ứng. Cân bằng nguyên tử không tự chứng minh phản ứng đã được kiểm chứng thực nghiệm riêng cho mọi điều kiện.':'Xem nguồn của phương trình và phạm vi áp dụng bên dưới.'}`);
  } else {
    const distinct=Object.entries(counts).map(([el,n])=>`${n} ${el}`).join(', ');
    sections.push(`## Câu chuyện: đọc danh tính của ${name}\n\n${isMaterial?`Tên ${name} mô tả vật liệu hoặc hỗn hợp; công thức ${formula} trong mô hình chỉ đại diện một thành phần hay đơn vị cấu tạo.`:`Điểm xuất phát là ${formula}: ${distinct}. Những con số ấy là dấu vết đầu tiên để lần theo danh tính ${name}, nhưng chưa kể hết cách các thành phần sắp xếp trong không gian.`}\n\n${s.cid?`Định danh CID ${s.cid} giúp chọn đúng hồ sơ ${s.name_en??name} thay vì lựa chọn chỉ theo số nguyên tử. `:''}${element?`Với số hiệu ${element.z}, nguyên tử trung hòa ${formula} có ${element.z} proton và ${element.z} electron. Cấu hình ${element.electronConfig??'chưa được ghi trong dữ liệu'} là bước tiếp theo khi đọc cấu trúc electron.`:`Trong mô hình hiện tại có ${atomCount} nguyên tử của đơn vị công thức được biểu diễn. Hãy so sánh bảng thành phần với cấu trúc, rồi phân biệt thông tin được xác định bằng phép đếm với thông tin cần có nguồn tọa độ hoặc dữ liệu liên kết.`}\n\n${notes.join(' ')}\n\n${s.structure?`Mô hình có dữ liệu từ ${s.structure.provenance??'nguồn cấu trúc được ghi trong kho'}. Một tệp tọa độ không tự mô tả mọi trạng thái dung dịch hoặc chuyển động nhiệt của chất.`:'Chưa có tọa độ kiểm chứng riêng trong kho. Trình xem vẫn có thể biểu diễn thành phần để học tập; vị trí minh họa không được coi là kết quả đo.'}`);
  }
  const facts=[['Công thức đọc trong hồ sơ',isMaterial?`${formula} — chỉ là đại diện`:formula],['Tên tiếng Anh',s.name_en??element?.name_en??'Chưa ghi'],['Loại biểu diễn',isMaterial?'Thành phần/đơn vị lặp':element?'Nguyên tử':s.kind==='crystal'?'Tinh thể':s.kind==='ion'?'Ion':ions?'Các nhóm ion':'Công thức chất'],['Khối lượng tính từ bảng nguyên tử',mass===null?'Không áp dụng / thiếu dữ liệu':`${fmt(mass)} g/mol`]];
  if(element)facts.push(['Số hiệu nguyên tử',element.z],['Nhóm / chu kỳ',`${element.group??'chưa gán'} / ${element.period}`],['Cấu hình electron',element.electronConfig??'Chưa ghi'],['Số oxi hóa được ghi',element.oxidationText??'Chưa ghi']);
  if(s.cid)facts.push(['PubChem CID',s.cid]);
  sections.push('## Hồ sơ nhanh\n\n| Mục | Dữ kiện |\n|---|---|\n'+facts.map(([a,b])=>`| ${a} | ${clean(b)} |`).join('\n')+'\n\nGiá trị khối lượng ở đây được tính từ bảng nguyên tử ChemDex và làm tròn để học tập; không thay thế chứng nhận phân tích mẫu. Với nguyên tố không có khối lượng nguyên tử chuẩn, cần xác định đồng vị khi làm phép tính chính xác.');
  sections.push('## Lần theo thành phần nguyên tử\n\n| Nguyên tố | Tên | Số nguyên tử trong đơn vị công thức | Đóng góp khối lượng tính toán |\n|---|---|---:|---:|\n'+massTerms.map(t=>`| ${t.symbol} | ${byElement.get(t.symbol)?.name_vi??t.symbol} | ${t.count} | ${t.mass==null?'Chưa ghi':fmt(t.count*t.mass)} |`).join('\n')+`\n\nTổng phép đếm là **${atomCount} nguyên tử** trong đơn vị được mô tả. ${isMaterial?'Đây là phép đếm của thành phần/đơn vị minh họa, không phải số nguyên tử của cả mẫu vật liệu.':s.kind==='crystal'||ions?'Với chất ion hoặc tinh thể, cần nói rõ “đơn vị công thức”, tránh gọi phép đếm này là kích thước của một phân tử rời.':'Phép đếm không tự xác định thứ tự liên kết hoặc cấu dạng.'}`);
  if(ions)sections.push('## Từ công thức đến các nhóm ion\n\n| Nhóm | Điện tích | Số nhóm theo công thức |\n|---|---:|---:|\n'+ions.map(i=>`| ${i.formula} | ${i.charge>0?'+':''}${i.charge} | ${i.count} |`).join('\n')+`\n\nTổng điện tích tính theo các nhóm trên là **${ions.reduce((n,i)=>n+i.count*i.charge,0)}**. Phép cộng điện tích giúp kiểm tra tỉ lệ công thức; không xác định nồng độ, mức phân li, cân bằng hay lớp dung môi của mẫu thực.`);
  if(Array.isArray(detail?.applications)&&detail.applications.length)sections.push('## Cấu trúc và những vai trò được ghi nhận\n\n'+detail.applications.map(a=>`- **${a.title}:** ${a.desc}`).join('\n')+'\n\nCác mô tả ứng dụng được chuyển từ dữ liệu nguyên tố ChemDex hiện có; không suy rằng mọi hợp chất chứa nguyên tố này có cùng tính chất.');
  if(selected.length) {
    sections.push('## Những ngã rẽ phản ứng cụ thể\n\n'+selected.map((r,i)=>`### ${i+1}. ${r.topic_vi}\n\n**${r.equation}**\n\n- **Điều kiện:** ${r.conditions?.description_vi??'Cần xem hồ sơ phản ứng.'}\n- **Điều được mô tả:** ${r.observation_vi??'Chưa có mô tả quan sát.'}\n- **Giải thích:** ${r.explanation_vi??'Chưa ghi.'}\n- **Giới hạn:** ${[r.safety_vi,...(r.caveats??[])].filter(Boolean).join(' ')}\n- **Loại bằng chứng:** ${r.evidence.type==='family-rule'?'Quy tắc họ phản ứng; chưa phải xác nhận riêng từng hệ.':r.evidence.type}\n${(r.evidence.sourceIds??[]).map(key=>reactionData.sources[key]).filter(Boolean).map(src=>`- [${src.title}](${src.url}) — ${src.scope}`).join('\n')}`).join('\n\n'));
  }
  if(mass!==null) {
    const term=massTerms.find(t=>t.count>1)??massTerms[0];
    sections.push(`## Bài tính: một mẫu ${name} theo đơn vị công thức\n\nGiả sử xét **0,100 mol** ${formula} theo đúng đơn vị công thức và giả thiết chất tinh khiết của bài toán.\n\n1. Tính khối lượng mol: **M = ${massTerms.map(t=>`${t.count} × ${fmt(t.mass)}`).join(' + ')} = ${fmt(mass)} g/mol**.\n2. Tính khối lượng mẫu: **m = nM = 0,100 × ${fmt(mass)} = ${fmt(mass*.1)} g**.\n3. Theo công thức, lượng nguyên tử ${term.symbol} tương ứng là **${term.count} × 0,100 = ${fmt(term.count*.1)} mol nguyên tử ${term.symbol}**.\n\nĐây là phép tính từ công thức, không phải nồng độ của một chai hóa chất hay lượng có sẵn trong lab. ${element?'Với mẫu đồng vị cụ thể cần thay đúng khối lượng đồng vị.':'Nếu mẫu chứa dung môi, tạp chất hoặc phần nước kết tinh chưa được ghi trong công thức, phải điều chỉnh mô hình bài toán.'}`);
  } else sections.push(`## Vì sao không gán một khối lượng mol duy nhất?\n\n${isMaterial?`${name} đang được mô tả như hỗn hợp hoặc polyme có đơn vị đại diện. Dùng khối lượng của ${formula} cho cả vật liệu sẽ đánh đồng thành phần minh họa với toàn bộ mẫu. Cần biết thành phần, độ dài chuỗi hoặc quy ước cụ thể trước khi tính.`:'Dữ liệu hiện tại chưa đủ để cộng đầy đủ khối lượng các nguyên tử. Hồ sơ giữ trường trống thay vì gán một con số suy đoán.'}`);
  sections.push(`## Tự kiểm tra và lời giải\n\n1. Trong ${formula}, nguyên tố nào có số lượng lớn nhất theo phép đếm công thức?\n2. ${selected.length?'Tên chất đứng ở phía nào của phương trình đầu tiên? Điều kiện phản ứng có thể bỏ qua không?':'Một công thức hoặc một mô hình tĩnh có đủ chứng minh mọi tính chất của mẫu thực không?'}\n\n<details><summary>Mở lời giải và cách suy luận</summary>\n\nTheo bảng thành phần, ${Object.entries(counts).filter(([,n])=>n===Math.max(...Object.values(counts))).map(([el,n])=>`${el} có ${n} nguyên tử`).join('; ')} trong đơn vị công thức. ${selected.length?`${name} nằm ở phía ${selected[0].reactants.some(r=>candidateFormulas.has(r.formula))?'chất phản ứng':'sản phẩm'} của ví dụ đầu. Điều kiện và loại bằng chứng phải được đọc cùng phương trình.`:'Không. Cần phân biệt danh tính, cấu trúc, pha, điều kiện và thành phần thực của mẫu.'}\n\n</details>`);
  const sourceLinks=[`[Kho mô hình ${name}](${modelURL})`,'[Bảng nguyên tử dùng cho phép tính](/shared/elements.json)'];
  if(s.structure?.source)sourceLinks.push(`[Nguồn tọa độ: ${s.structure.provenance??'hồ sơ cấu trúc'}](${s.structure.source})`);
  if(s.cid)sourceLinks.push(`[PubChem CID ${s.cid} — đối chiếu danh tính](https://pubchem.ncbi.nlm.nih.gov/compound/${s.cid})`);
  if(element?.sourceFile&&fs.existsSync('.'+element.sourceFile))sourceLinks.push(`[Dữ liệu nguyên tố ChemDex](${element.sourceFile})`);
  if(element?.massSource==='CIAAW2024')sourceLinks.push('[CIAAW — khối lượng nguyên tử chuẩn](https://ciaaw.org/abridged-atomic-weights.htm)');
  if(s.identitySource)sourceLinks.push(`[Nguồn định danh bổ sung](${s.identitySource})`);
  if(!s.structure&&!s.cid&&!element)sourceLinks.push('[Dữ liệu chất trong danh mục phản ứng ChemDex](/shared/reaction-catalog.generated.json)');
  sections.push('## Nguồn, phạm vi và bước tiếp theo\n\n'+sourceLinks.map(a=>'- '+a).join('\n')+`\n\n${notes.join(' ')}\n\nHồ sơ này được tổng hợp từ dữ liệu cấu trúc, bảng nguyên tố và các phản ứng đã có trong ChemDex. Các phép đếm và bài tính có thể kiểm tra lại từ công thức. Câu chuyện phản ứng là diễn giải học tập của trường hợp được nêu, không phải sự kiện lịch sử được dựng thêm. Những dữ kiện chưa có nguồn hoặc điều kiện cụ thể được giữ ở phạm vi mô tả hiện có.`);
  const summary=s.material?`Hồ sơ ${name}: cách phân biệt tên vật liệu, thành phần đại diện và giới hạn của mô hình; không có một công thức phân tử duy nhất cho cả hỗn hợp.`:selected.length?`Theo dấu ${formula} qua ${selected.map(r=>r.topic_vi.toLowerCase()).join(', ')}; đọc thành phần, điều kiện và bài tính riêng của ${name}.`:`Hồ sơ ${name}: ${formula}, ${atomCount} nguyên tử trong đơn vị công thức; đối chiếu danh tính, dữ liệu cấu trúc và cách đọc những giới hạn của mô hình.`;
  const meta={id,title,author:'ChemDex · Hồ sơ tổng hợp',category:element?'nguyento':'hopchat',summary,image:'/assets/icon/logo.png',chemicalFormula:s.material?'Hỗn hợp':prettyFormula(formula),tags:[element?'Nguyên tố':isMaterial?'Vật liệu / hỗn hợp':s.kind==='ion'?'Ion':'Hồ sơ chất',s.material?s.materialLabel:formula,...selected.map(r=>r.topic_vi)],aliases:[...new Set(group.flatMap(r=>[r.name_vi,r.name_en,r.material?r.materialLabel:r.formula,...(r.aliases??[])]).filter(Boolean))],substanceIds:group.map(r=>r.id),documentKind:'reference',readingMinutes:Math.max(1,Math.ceil(sections.join('\n\n').length/1000))};
  fs.writeFileSync(path.join(output,id+'.json'),JSON.stringify({...meta,chemicalEvidence:{formula,representativeId:s.id,counts,mass,material:isMaterial,reactionIds:selected.map(r=>r.id)},content:sections.join('\n\n')},null,2)+'\n');
  generated.push(meta);
  for(const row of group)links[row.id]=id;
}
fs.writeFileSync('trung-tam/src/data/reference-index.generated.json',JSON.stringify(generated,null,2)+'\n');
fs.writeFileSync('shared/library-links.generated.json',JSON.stringify(links,null,2)+'\n');
console.log(`Reference library: ${generated.length} substance-specific dossiers; ${Object.keys(links).length} subject links.`);
