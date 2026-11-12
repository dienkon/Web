import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {applicationTopic} from './application-image-topics.mjs';
import {substanceSlug} from '../shared/library-paths.mjs';
const root=path.resolve(import.meta.dirname,'..');
const report=path.join(root,'docs/application-crystal-review/2026-11-12');
const read=async p=>JSON.parse((await fs.readFile(path.join(root,p),'utf8')).replace(/^\uFEFF/,''));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function write(file,value){
 const content=typeof value==='string'?value:JSON.stringify(value,null,2)+'\n';
 if(await fs.readFile(file,'utf8').catch(()=>null)===content)return;
 await fs.mkdir(path.dirname(file),{recursive:true});
 const temp=file+'.tmp';
 for(let attempt=0;attempt<5;attempt++)try{await fs.writeFile(temp,content);await fs.rename(temp,file);return;}catch(error){if(attempt===4)throw error;await new Promise(r=>setTimeout(r,200*(attempt+1)));}
}
const wiki=new Map((await read('data/wiki-crystal-reference.json')).elements.map(r=>[r.symbol,r]));
const base=await read('data/crystal-catalog.json'),extra=await read('data/wiki-crystal-models.json');
const photos=new Map((await read('data/application-image-provenance.json')).topics.map(r=>[r.id,r]));

const kind=text=>{
 const s=String(text??'').toLowerCase().replace(/[\s_-]/g,'');
 if(/doublehexagonal/.test(s))return 'dhcp';
 if(/hexagonalclosepacked/.test(s))return 'hcp';
 if(/diamond/.test(s))return 'diamond';
 if(/bodycent(?:ered|red)cubic|cubicbodycent(?:ered|red)|bcc/.test(s))return 'bcc';
 if(/facecent(?:ered|red)cubic|fcc/.test(s))return 'fcc';
 if(/rhombohedral|trigonal/.test(s))return 'rhombohedral';
 if(/orthorhombic/.test(s))return 'orthorhombic';
 if(/tetragonal/.test(s))return 'tetragonal';
 if(/monoclinic/.test(s))return 'monoclinic';
 if(/triclinic/.test(s))return 'triclinic';
 if(/hexagonal/.test(s))return 'hexagonal';
 if(/cubic/.test(s))return 'cubic';
 return null;
};
function modelKind(meta,symbol){
 const sg=meta.spaceGroup.replace(/\s/g,'').toUpperCase();
 if(sg.startsWith('R'))return 'rhombohedral';
 if(/FD[3-]/.test(sg))return 'diamond';
 if(/^FM[3-]/.test(sg))return 'fcc';
 if(/^IM[3-]|^I-?43M/.test(sg))return 'bcc';
 if(/^PM-?3M/.test(sg))return 'cubic';
 if(/4/.test(sg))return 'tetragonal';
 if(sg==='P63/MMC'&&symbol!=='C')return meta.siteCount===4?'dhcp':'hcp';
 if(/6|3/.test(sg))return 'hexagonal';
 if([meta.cell.alpha,meta.cell.beta,meta.cell.gamma].filter(v=>Math.abs(v-90)>1e-5).length===1)return 'monoclinic';
 return 'orthorhombic';
}
function metricComparison(model,phase){
 if(!model||!phase)return [];
 const values={};
 for(const m of phase.lattice.matchAll(/(?:^|[^a-z])([abc](?:_?[hr])?)\s*=\s*([0-9]+(?:\.[0-9]+)?)\s*(pm|nm|Å|A)\b/gi))values[m[1].replace('_','').toLowerCase()]=Number(m[2])*(m[3].toLowerCase()==='pm'?.01:m[3].toLowerCase()==='nm'?10:1);
 const rhombo=model.spaceGroup.trim().startsWith('R'),hex=rhombo&&Math.abs(model.cell.gamma-120)<1e-4;
 let axisMap={a:'a',b:'b',c:'c'};
 if(['a','b','c'].every(k=>values[k])&&[model.cell.alpha,model.cell.beta,model.cell.gamma].every(v=>Math.abs(v-90)<1e-5)){
  const permutations=[['a','b','c'],['a','c','b'],['b','a','c'],['b','c','a'],['c','a','b'],['c','b','a']];
  const best=permutations.map(order=>({order,error:Math.max(...['a','b','c'].map((axis,i)=>Math.abs(model.cell[axis]-values[order[i]])/values[order[i]]))})).sort((a,b)=>a.error-b.error)[0];
  if(best.error<.01)axisMap=Object.fromEntries(['a','b','c'].map((axis,i)=>[axis,best.order[i]]));
 }
 const result=[];
 for(const axis of ['a','b','c']){
  const key=rhombo?(hex?axis+'h':axis+'r'):axisMap[axis];
  const expected=values[key]??(!rhombo?values[axis]:axis==='a'&&!hex?values.a:undefined);
  if(expected!==undefined)result.push({axis,wikiAxis:key,wikiAngstrom:expected,modelAngstrom:model.cell[axis],relativeDifferencePercent:Math.abs(model.cell[axis]-expected)/expected*100});
 }
 return result;
}
function wikiComparison(profile,model){
 const reference=wiki.get(profile.symbol),field=key=>reference.fields[key]?.text??'';
 const phases=[1,2,3,4].map(index=>{const suffix=index===1?'':` ${index}`;return {type:field('crystal structure'+suffix),prefix:field('crystal structure'+suffix+' prefix'),comment:field('crystal structure'+suffix+' comment'),pearson:field('crystal structure'+suffix+' Pearson symbol'.toLowerCase()),lattice:field('lattice constants'+suffix)||field('lattice constant'+suffix)};}).filter(p=>p.type);
 const actual=model?modelKind(model,profile.symbol):null;
 const matched=phases.findIndex(p=>kind(p.type)===actual||(kind(p.type)==='hexagonal'&&actual==='hcp'));
 const notes=[];
 let status=model?(matched>=0?'compatible-phase':'reviewed-setting-or-phase'):'no-reviewed-model';
 if(model&&matched>0)notes.push(`Mô hình dùng pha ${phases[matched].prefix||phases[matched].type} trong các pha Wiki liệt kê; không gộp các pha thành một ô mạng.`);
 if(model&&model.spaceGroup.trim().startsWith('R')&&Math.abs(model.cell.gamma-120)<1e-4)notes.push('CIF dùng ô lục giác quy ước của mạng thoi: số nguyên tử trong ô này bằng ba lần ô thoi nguyên thủy; không phải sai cấu trúc.');
 if(model?.evidence==='reference-prototype')notes.push('Tọa độ Wyckoff lý tưởng được dựng từ prototype; thông số mạng lấy từ tài liệu tham chiếu được nêu. Wiki dùng để đối chiếu kiểu mạng. Đây là mức chứng cứ khác với bộ tinh chỉnh nguyên tử thực nghiệm.');
 if(profile.symbol==='Mn')notes.push('α-Mn là cI58, 58 nguyên tử/ô quy ước; không dựng ô BCC đơn giản chỉ có 2 nguyên tử.');
 if(profile.symbol==='Ra')notes.push('Wiki ghi BCC nhưng Pearson cF4 không nhất quán. Giữ BCC Im-3m/cI2 theo mô tả và WebElements (University of Sheffield); a là hằng số ô mạng, không phải khoảng cách láng giềng gần nhất.');
 if(model&&matched>=0){
  const expected=Number(/(?:c|h|t|o|m|a)[PIFRSC](\d+)/i.exec(phases[matched].pearson)?.[1]);
  const factor=model.spaceGroup.trim().startsWith('R')&&Math.abs(model.cell.gamma-120)<1e-4?3:1;
  if(expected&&model.siteCount!==expected*factor){
   status=profile.symbol==='Ra'?'source-inconsistency':'basis-count-needs-review';
   notes.push(`Pearson của Wiki: ${phases[matched].pearson}; ô đang vẽ: ${model.siteCount} vị trí. Sự khác biệt được ghi rõ thay vì tự đổi số nguyên tử.`);
  }
 }
 if(profile.symbol==='Cs')notes.push('Bản ghi AMCSD đang dùng được đo ở 78 K; thông số Wiki tại 20 °C khác do điều kiện mẫu. Không đổi hằng số đo thành số ở nhiệt độ khác.');
 if(profile.symbol==='Rb')notes.push('Bản ghi giữ chú thích nguồn: hằng số mạng 297 K là ước lượng.');
 if(profile.symbol==='B')notes.push('Mô hình là pha alpha boron. Nhãn rhombohedral chung không đồng nghĩa mọi dạng boron có cùng cơ sở nguyên tử.');
 if(!model&&/dự đoán|chưa|khí|lỏng/i.test(profile.general.state))status='phase-unmeasured-or-fluid';
 if(!model)notes.push('Không lấy hình của một kiểu mạng chung để khẳng định mẫu tinh thể đã được đo. Pha khí/lỏng và cấu trúc dự đoán được ghi riêng.');
 const metrics=metricComparison(model,phases[matched]);
 if(metrics.some(m=>m.wikiAxis.length===1&&m.wikiAxis!==m.axis))notes.push('CIF và Wiki dùng quy ước thứ tự trục khác nhau: '+metrics.map(m=>`${m.axis} CIF ↔ ${m.wikiAxis} Wiki`).join(', ')+'. Giữ bộ tọa độ và metric nhất quán của bản ghi gốc; đổi tên trục không làm thay đổi vật liệu.');
 if(metrics.some(m=>m.relativeDifferencePercent>1))notes.push('Thông số ô mạng khác Wiki trên 1%; giữ số của mẫu công bố và ghi rõ điều kiện/nguồn, không thay thông số đo một cách ngầm định.');
 const additionalSources=profile.symbol==='Ra'?[{title:'WebElements / University of Sheffield — Radium crystal structure',url:'https://www.webelements.com/radium/crystal_structure.html',reference:'F. Weigel and A. Trinkl, Radiochim. Acta 1968, 19, 78, as listed by WebElements.'}]:[];
 if(model&&/webelements\.(?:com|co\.uk)/.test(model.source))additionalSources.push({title:'WebElements — thông số ô mạng',url:model.source,reference:model.primaryReference});
 if(!model&&profile.symbol==='Es')notes.push('Bài Wiki mô tả FCC là dạng khả dĩ (believed), còn bảng WebElements đã kiểm tra chưa cho số liệu ô mạng; không gắn nhãn mô hình thực nghiệm.');
 return {article:reference.article,template:reference.template,revisionId:reference.revisionId,revisionTimestamp:reference.revisionTimestamp,status,phases,selectedModel:model?.id??null,modelKind:actual,metrics,notes,additionalSources};
}

const bindings=[],reviews=[],changes=[];
let pictures=0,elementsWithPictures=0;
for(const entry of await read('data/manifest.json')){
 const file=path.join(root,'data',entry.file),before=await fs.readFile(file),profile=JSON.parse(before.toString('utf8').replace(/^\uFEFF/,''));
 let model=extra.elements[profile.symbol]??base.elements[profile.symbol]??null;
 const comparison=wikiComparison(profile,model);
 if(model){
  const phaseNote=comparison.notes.find(n=>n.startsWith('Mô hình dùng pha'));
  model={...model,note:[model.note,phaseNote].filter(Boolean).join(' '),wikiComparison:comparison};
  profile.structure.publishedCrystal=model;profile.structure.publishedCrystalStatus='available';
 }
 profile.structure.wikiCrystalReview=comparison;
 const seen=new Set();let profilePictures=0;
 for(const [index,app] of profile.applications.entries()){
  delete app.applicationImage;
  const topic=applicationTopic(app,profile.symbol),photo=topic?photos.get(topic[0]):null;
  let status=!topic?'no-specific-verified-illustration':photo?.status==='downloaded'?'available':'source-link';
  if(photo?.status==='downloaded'){
   if(seen.has(topic[0]))status='shared-topic';
   else{
    seen.add(topic[0]);status='illustrated';profilePictures++;pictures++;
    app.applicationImage={src:photo.file,source:photo.source,author:photo.author,license:photo.license,licenseUrl:photo.licenseUrl,
      alt:`${app.title} — ${photo.topic}`,caption:topic[0]==='magnetic-material'?'Sơ đồ nguyên lý từ giảo.':`Minh họa lĩnh vực ${app.title.toLowerCase()} · ${photo.topic}.`,topic:topic[0],role:'application-context'};
   }
  }
  app.imageReview={status,topic:topic?.[0]??null,source:photo?.source??null};
  bindings.push({symbol:profile.symbol,index,sourceLine:app.sourceLine??null,title:app.title,description:app.desc,status,topic:topic?.[0]??null,source:photo?.source??null,file:app.applicationImage?.src??null,reason:!topic?'Chưa chọn ảnh đặc thù đã xác minh, hoặc đây là ghi chú giới hạn/không có ứng dụng.':photo?.reason??(status==='shared-topic'?'Dùng ảnh cùng chủ đề đã có trong trang, tránh lặp ảnh.':'Ảnh minh họa lĩnh vực; không xác nhận thành phần của sản phẩm cụ thể trong ảnh.')});
 }
 if(profilePictures)elementsWithPictures++;
 profile.sources=profile.sources.filter(s=>s.role!=='wiki-crystal-review');
 profile.sources.push({title:'Wikipedia — đối chiếu pha và mạng tinh thể',url:comparison.article,role:'wiki-crystal-review'});
 const slug=substanceSlug(profile.nameVi+' '+profile.symbol);
 const audit=`docs/application-crystal-review/2026-11-12/nguyen-to/${slug}/audit.md`;
 profile.review.applicationCrystalAudit=audit;
 await write(file,profile);
 changes.push({symbol:profile.symbol,file:'data/'+entry.file,beforeSha256:sha(before),afterSha256:sha(await fs.readFile(file)),audit});
 reviews.push({symbol:profile.symbol,...comparison});
 const lines=[`# ${profile.nameVi} (${profile.symbol}) — ảnh ứng dụng và đối chiếu mạng`, '',
  `- Nguồn Wiki: [${profile.nameEn}](${comparison.article}); revision ${comparison.revisionId}.`,
  `- Kết quả đối chiếu: ${comparison.status}.`,
  `- Mô hình: ${model?`${model.mineralName}, ${model.spaceGroup}, ${model.siteCount} vị trí/ô; chứng cứ ${model.evidence}.`:'Chưa có mô hình tọa độ phù hợp đã duyệt.'}`,
  ...comparison.notes.map(n=>'- '+n),'','## Các pha và thông số được Wiki liệt kê',''];
 for(const phase of comparison.phases)lines.push(`- ${phase.prefix} ${phase.type}; ${phase.pearson||'không ghi Pearson'}; ${phase.lattice||'không ghi hằng số trong trường đã lấy'}. ${phase.comment}`);
 lines.push('','## Kiểm duyệt ảnh cho từng mục ứng dụng','');
 for(const binding of bindings.filter(b=>b.symbol===profile.symbol)){
  lines.push(`### ${binding.index+1}. ${binding.title}`,'',`- Đoạn nguồn: ${binding.sourceLine??'không ghi'}.`,
   `- Nội dung: ${binding.description}`,`- Kết quả: ${binding.status}; chủ đề ${binding.topic??'chưa chọn'}.`,
   `- ${binding.reason}`,binding.source?`- [Nguồn ảnh/tư liệu](${binding.source}).`:'- Không tạo ảnh giả hoặc tự gán sản phẩm công nghiệp cho mục chỉ có nghiên cứu.',
   binding.file?'- Asset: `'+binding.file+'`; tác giả và giấy phép lưu trong application-image-provenance.json và hiển thị cạnh ảnh.':'','');
 }
 lines.push('## Giao diện','', '- Cấu hình electron và mạng tinh thể là hai hàng riêng trên desktop và điện thoại.',
  '- Ảnh ứng dụng dùng figure và chú thích/giấy phép riêng, không lồng một card 300 px vào vùng 160 px làm mất thông tin tác giả.',
  '- Nguyên tử trong ô mạng có thể chọn để xem vị trí; các kiểu pha/bộ tọa độ không được trộn lẫn.', '');
 await write(path.join(root,audit),lines.map(line=>line.trimEnd()).join('\n'));
}
const prior=await read('docs/application-crystal-review/2026-11-12/change-manifest.json').catch(()=>[]);
for(const change of changes)change.beforeSha256=prior.find(p=>p.symbol===change.symbol)?.beforeSha256??change.beforeSha256;
await write(path.join(report,'change-manifest.json'),changes);
await write(path.join(report,'application-image-audit.json'),bindings);
await write(path.join(root,'data/wiki-crystal-review.json'),{date:'2026-11-12',elements:reviews});
const summary={profiles:118,applications:bindings.length,topics:photos.size,downloadedTopics:[...photos.values()].filter(p=>p.status==='downloaded').length,applicationPictures:pictures,elementsWithPictures,elementCrystalModels:reviews.filter(r=>r.selectedModel).length,additionalCrystalModels:extra.structures.length,statuses:bindings.reduce((out,b)=>(out[b.status]=(out[b.status]??0)+1,out),{})};
await write(path.join(report,'summary.json'),summary);console.log(JSON.stringify(summary));
