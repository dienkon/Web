import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { gcd, balanceEquation, equationKey, formatEquation, parseFormula } from '../shared/chemistry/formula.mjs';
import { curatedReactions } from '../shared/chemistry/curated-reactions.mjs';
import { netIonicEquation } from '../shared/chemistry/ionic.mjs';
import { validateCatalog } from '../shared/chemistry/reaction-catalog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sources = JSON.parse(fs.readFileSync(path.join(root, 'shared/chemistry/catalog-sources.json'), 'utf8'));
const cations = [['Li',1],['Na',1],['K',1],['NH4',1],['Mg',2],['Ca',2],['Sr',2],['Ba',2],['Mn',2],['Fe',2],['Co',2],['Ni',2],['Cu',2],['Zn',2],['Cd',2],['Pb',2],['Ag',1],['Fe',3],['Al',3],['Cr',3],['Sn',2]].map(([formula,charge])=>({formula,charge,key:`${formula}${charge}`}));
const anions = Object.fromEntries([['Cl',1],['Br',1],['I',1],['F',1],['NO3',1],['SO4',2],['CH3COO',1],['HCOO',1],['CO3',2],['HCO3',1],['OH',1],['S',2],['SO3',2],['C2O4',2],['PO4',3],['CrO4',2]].map(([formula,charge])=>[formula,{formula,charge}]));
const ion = key => cations.find(c=>c.key===key);
const cationNames={Li:'liti',Na:'natri',K:'kali',NH4:'amoni',Mg:'magie',Ca:'canxi',Sr:'stronti',Ba:'bari',Mn:'mangan',Fe:'sắt',Co:'coban',Ni:'niken',Cu:'đồng',Zn:'kẽm',Cd:'cadimi',Pb:'chì',Ag:'bạc',Al:'nhôm',Cr:'crom',Sn:'thiếc'};
const anionNames={Cl:'clorua',Br:'bromua',I:'iodua',F:'florua',NO3:'nitrat',SO4:'sunfat',CH3COO:'axetat',HCOO:'fomat',CO3:'cacbonat',HCO3:'hiđrocacbonat',OH:'hiđroxit',S:'sunfua',SO3:'sunfit',C2O4:'oxalat',PO4:'photphat',CrO4:'cromat'};
const group = (formula,count) => count===1?formula:`${/^[A-Z][a-z]?$/.test(formula)?formula:`(${formula})`}${count}`;
export function salt(c,anion){const a=anions[anion],g=gcd(c.charge,a.charge);if(c.charge===1&&['CH3COO','HCOO'].includes(anion)&&c.formula!=='NH4')return anion+c.formula;return group(c.formula,a.charge/g)+group(anion,c.charge/g);}
function soluble(c,a){
  if(['Na','K','NH4'].includes(c.formula))return true;
  if(a==='NO3')return true;
  if(['CH3COO','HCOO'].includes(a))return !['Fe3','Al3','Cr3'].includes(c.key);
  if(a==='SO4')return !['Ag1','Ca2','Ba2','Sr2','Pb2'].includes(c.key);
  if(['Cl','Br','I'].includes(a))return !['Ag1','Pb2'].includes(c.key)&&!(a==='I'&&['Fe3','Cu2'].includes(c.key));
  if(a==='OH')return ['Li','Na','K','Ba','Sr'].includes(c.formula);
  return false;
}
const speciesRegistry=new Map();
function register(formula,phase='aq',extra={}){parseFormula(formula);if(!speciesRegistry.has(formula))speciesRegistry.set(formula,{formula,defaultPhase:phase,...extra});else Object.assign(speciesRegistry.get(formula),extra);return formula;}
function registerSalt(c,a,phase){const g=gcd(c.charge,anions[a].charge);return register(salt(c,a),phase??(soluble(c,a)?'aq':'s'),{name_vi:`${cationNames[c.formula]??c.formula}${['Fe','Cu','Co','Ni','Mn','Cr','Pb','Sn'].includes(c.formula)?`(${['','I','II','III'][c.charge]})`:''} ${anionNames[a]??a}`,ions:[{formula:c.formula,charge:c.charge,count:anions[a].charge/g},{formula:a,charge:-anions[a].charge,count:c.charge/g}]});}
const topics={precipitation:'Kết tủa',neutralization:'Axit – bazơ',oxide_acid:'Oxit và axit',carbonate_acid:'Cacbonat và axit',sulfite_acid:'Sunfit và axit',sulfide_acid:'Sunfua và axit',ammonium_base:'Muối amoni và kiềm',metal_acid:'Kim loại và axit',displacement:'Kim loại đẩy kim loại',esterification:'Este hóa',saponification:'Thủy phân este trong kiềm',combustion:'Cháy hoàn toàn',synthesis:'Tổng hợp',thermal:'Nhiệt phân',redox:'Oxi hóa – khử',amphoteric:'Chất lưỡng tính',organic_conversion:'Chuyển hóa hữu cơ'};

export function buildReactionCatalog(){
  speciesRegistry.clear();
  const rows=[],seen=new Set();
  function add({family,left,right,phases={},condition,explanation,observation,transfers,net,sourceIds,reversible=false,evidence='family-rule',caveats=[],conditions={},...extra}){
    const balanced=balanceEquation(left,right),key=equationKey(balanced.reactants,balanced.products);
    if(seen.has(key))return null;
    const attach=side=>side.map(row=>({...row,phase:phases[row.formula]??speciesRegistry.get(row.formula)?.defaultPhase??'s'}));
    const reactants=attach(balanced.reactants),products=attach(balanced.products);
    for(const row of [...reactants,...products])register(row.formula,row.phase);
    const id=`rx_${createHash('sha256').update(key).digest('hex').slice(0,16)}`;
    const hazardous=[...new Set([...reactants,...products].flatMap(row=>Object.keys(parseFormula(row.formula))))].filter(s=>['Pb','Cd','Cr','Ba'].includes(s));
    const row={id,family,topic_vi:topics[family]??family,title_vi:`${topics[family]??family}: ${left.join(' + ')}`,equation:formatEquation(reactants,products,reversible),reactants,products,reversible,
      conditions:{description_vi:condition,...conditions},observation_vi:observation??'Hiện tượng phụ thuộc nồng độ, môi trường và trạng thái mẫu; không suy ra màu từ phương trình đơn thuần.',explanation_vi:explanation,
      evidence:{type:evidence,sourceIds:sourceIds??['openstax-reaction-types'],scope:'family'},familySignature:net??key,transfers:transfers??[],
      effects:{gases:products.filter(r=>r.phase==='g').map(r=>r.formula),solids:products.filter(r=>r.phase==='s').map(r=>r.formula),deltaH_kJ_per_mol:null,color:null,calibrated:false},
      safety_vi:hazardous.length?`Có chất chứa ${hazardous.join(', ')}; dữ liệu học tập, cần quy trình và xử lý chất thải chuyên biệt khi thực nghiệm.`:'Dữ liệu học tập về phương trình và điều kiện; không thay thế quy trình thực hành.',caveats,runtime:'reference_only',...extra};
    rows.push(row);seen.add(key);return row;
  }
  const precursorAnions=['NO3','Cl','Br','SO4','CH3COO'];
  const precipitates=[['Ag1','Cl'],['Ag1','Br'],['Ag1','I'],['Ag1','CO3'],['Ag1','PO4'],['Ag1','CrO4'],['Pb2','Cl'],['Pb2','Br'],['Pb2','I'],['Pb2','SO4'],['Pb2','CO3'],['Pb2','OH'],['Pb2','C2O4'],['Pb2','PO4'],['Pb2','CrO4'],['Pb2','F'],['Ba2','SO4'],['Ba2','CO3'],['Ba2','C2O4'],['Ba2','PO4'],['Ba2','CrO4'],['Ba2','F'],['Sr2','SO4'],['Sr2','CO3'],['Sr2','C2O4'],['Sr2','PO4'],['Sr2','F'],['Ca2','CO3'],['Ca2','C2O4'],['Ca2','PO4'],['Ca2','F'],['Mg2','OH'],['Mg2','C2O4'],['Mg2','F'],['Mn2','CO3'],['Mn2','OH'],['Mn2','S'],['Mn2','C2O4'],['Fe2','CO3'],['Fe2','OH'],['Fe2','S'],['Fe2','C2O4'],['Fe3','OH'],['Co2','OH'],['Co2','S'],['Co2','C2O4'],['Ni2','OH'],['Ni2','S'],['Ni2','C2O4'],['Cu2','OH'],['Cu2','S'],['Cu2','C2O4'],['Zn2','OH'],['Zn2','S'],['Zn2','C2O4'],['Cd2','OH'],['Cd2','S'],['Cd2','CO3'],['Cd2','C2O4'],['Al3','OH'],['Cr3','OH']];
  for(const [cationKey,anion] of precipitates){
    const c=ion(cationKey),donors=['Na1','K1',...(['Cl','Br','I','SO4'].includes(anion)?['NH41']:[]),...(['Cl','Br','I','SO4','OH','F'].includes(anion)?['Li1']:[])];
    for(const precursor of precursorAnions)for(const donorKey of donors){
      const donor=ion(donorKey);if(!soluble(c,precursor)||precursor===anion||!soluble(donor,precursor))continue;
      const source=registerSalt(c,precursor,'aq'),reagent=registerSalt(donor,anion,'aq'),solid=registerSalt(c,anion,'s'),partner=registerSalt(donor,precursor,'aq');
      const amphoteric=anion==='OH'&&['Al3','Cr3','Zn2','Pb2'].includes(c.key),airSensitive=['Fe2','Mn2'].includes(c.key);
      add({family:'precipitation',left:[source,reagent],right:[solid,partner],condition:`Dung dịch nước; lượng ion đủ để Q > Ksp.${amphoteric?' Kiềm được thêm có kiểm soát, không dư mạnh.':''}${airSensitive?' Hạn chế O2 để giữ số oxi hóa đã viết.':''}${anion==='PO4'?' Kiểm soát pH để pha photphat chiếm ưu thế.':''}`,
        explanation:`Ion ${c.formula}(${c.charge}+) kết hợp với ${anion}(${anions[anion].charge}−) tạo pha ít tan; ion đối được giữ trong ${partner}.`,observation:`Có thể tạo kết tủa ${solid} khi quá bão hòa; độ đục và tốc độ lắng chưa được hiệu chuẩn.`,
        transfers:[{from:source,to:solid,carrier:c.formula,workup:'Tách và rửa kết tủa trước bước cần mẫu rắn riêng.'},...Object.keys(parseFormula(anion)).filter(element=>!['H','O'].includes(element)).map(carrier=>({from:reagent,to:solid,carrier,workup:'Tách và rửa kết tủa; cation mới đến từ chất bổ sung.'}))],net:`precipitate:${solid}`,sourceIds:['openstax-reaction-types','purdue-solubility','openstax-equilibria'],
        caveats:[...(amphoteric?['Kiềm dư có thể hòa tan pha lưỡng tính; phương trình không áp dụng cho mọi tỷ lệ.']:[]),...(['OH','PO4','C2O4'].includes(anion)?['Pha rắn dùng công thức quy ước không ghi nước hydrat; chưa xác định đa hình hoặc thành phần hydrat.']:[])]});
    }
  }
  register('H2O','l');register('CO2','g');
  for(const precursor of ['NO3','CH3COO'])for(const donorKey of ['Na1','K1','Li1']){
    const c=ion('Ag1'),d=ion(donorKey),source=registerSalt(c,precursor,'aq'),base=registerSalt(d,'OH','aq'),partner=registerSalt(d,precursor,'aq');register('Ag2O','s');
    add({family:'precipitation',left:[source,base],right:['Ag2O',partner,'H2O'],condition:'Dung dịch nước, không có NH3 hoặc ligand tạo phức mạnh.',explanation:'Ag(I) với kiềm tạo Ag2O và nước; không lưu AgOH như kết tủa bền.',observation:'Xuất hiện pha rắn Ag2O nâu.',transfers:[{from:source,to:'Ag2O',carrier:'Ag',workup:'Tách kết tủa và dung dịch mẹ.'}],net:'precipitate:Ag2O',sourceIds:['openstax-reaction-types','purdue-solubility']});
  }
  const acids=[['HCl','Cl',1],['HBr','Br',1],['HI','I',1],['HNO3','NO3',1],['H2SO4','SO4',2],['CH3COOH','CH3COO',1],['HCOOH','HCOO',1]];
  for(const [acid,a,acidH] of acids)for(const c of cations.filter(c=>!['NH4','Sn'].includes(c.formula))){
    if(a==='HCOO'&&['Ag1','Cu2','Fe3','Al3','Cr3'].includes(c.key))continue;
    if(a==='I'&&['Cu2','Fe3'].includes(c.key))continue;
    if(a==='NO3'&&c.key==='Fe2')continue;
    if(a==='SO4'&&['Pb2','Ba2','Sr2','Ca2','Ag1'].includes(c.key))continue;
    if(['Cl','Br','I'].includes(a)&&['Ag1','Pb2'].includes(c.key))continue;
    if(['CH3COO','HCOO'].includes(a)&&['Fe3','Al3','Cr3'].includes(c.key))continue;
    register(acid,'aq');const product=registerSalt(c,a,'aq');
    const hydroxide=salt(c,'OH'),oxide=group(c.formula,2/gcd(c.charge,2))+group('O',c.charge/gcd(c.charge,2));
    for(const [family,base] of [['neutralization',hydroxide],['oxide_acid',oxide]]){
      if(c.formula==='Ag'&&family==='neutralization')continue;
      if(c.key==='Cr3'&&family==='oxide_acid')continue; // Calcined Cr2O3 is refractory; no universal acid template.
      register(base,family==='neutralization'&&soluble(c,'OH')?'aq':'s');
      add({family,left:[base,acid],right:[product,'H2O'],condition:`Axit ${acid==='H2SO4'?'H2SO4 loãng':acid}; lượng axit đủ để trung hòa hoàn toàn.${family==='oxide_acid'||c.charge===3?' Có thể cần làm ấm; tốc độ tùy mẫu rắn.':''}`,
        explanation:'Axit tiêu thụ nhóm bazơ/oxit tạo muối và nước; hệ số theo đương lượng, không gán nhiệt chung cho mọi axit.',observation:'Rắn có thể tan dần hoặc pH thay đổi; màu tùy ion và nồng độ. Không có chỉ thị thì không tự xuất hiện màu hồng.',transfers:[{from:base,to:product,carrier:c.formula,workup:'Xử lý axit dư hoặc điều chỉnh môi trường theo bước tiếp theo.'}],net:`${family}:${base}:${acid}`,sourceIds:['openstax-reaction-types','openstax-acids'],caveats:acidH===2?['Phương trình là trung hòa hoàn toàn; acid dư có thể tạo muối acid.']:[]});
    }
  }
  for(const [acid,a] of acids){if(a==='HCOO')continue;const product=registerSalt(ion('NH41'),a,'aq');register('NH3','aq');register(acid,'aq');
    add({family:'neutralization',left:['NH3',acid],right:[product],condition:'Dung dịch nước; axit đủ để proton hóa NH3.',explanation:'NH3 nhận proton tạo NH4+; không thêm nước khi nước không phải sản phẩm ròng.',transfers:[{from:'NH3',to:product,carrier:'N',workup:'Giữ muối amoni trong dung dịch, tránh kiềm dư.'}],net:`protonation:NH3:${acid}`,sourceIds:['openstax-reaction-types','openstax-acids']});}
  for(const key of ['Li1','Na1','K1','Mg2','Ca2','Sr2','Ba2','Mn2','Fe2','Zn2','Cd2','Pb2','Ag1'])for(const [acid,a] of acids){
    const c=ion(key);if(a==='NO3'&&key==='Fe2')continue;if(a==='HCOO'&&['Ag1','Pb2'].includes(key))continue;if(!soluble(c,a))continue;
    const carbonate=registerSalt(c,'CO3',['Na','K'].includes(c.formula)?'aq':'s'),product=registerSalt(c,a,'aq');register(acid,'aq');
    add({family:'carbonate_acid',left:[carbonate,acid],right:[product,'CO2','H2O'],condition:'Axit đủ, CO2 thoát khỏi hệ; không có lớp muối ít tan chặn bề mặt.',explanation:'Proton chuyển carbonate thành CO2 và nước; giữ đủ ion đối trong muối sản phẩm.',observation:'Có bọt CO2 không màu tại vùng tiếp xúc.',transfers:[{from:carbonate,to:product,carrier:c.formula,workup:'Đợi khí thoát và xử lý acid dư.'}],net:`carbonate-acid:${carbonate}:${acid}`});
  }
  for(const key of ['Na1','K1'])for(const [acid,a] of acids){const c=ion(key),source=registerSalt(c,'HCO3','aq'),product=registerSalt(c,a,'aq');register(acid,'aq');
    add({family:'carbonate_acid',left:[source,acid],right:[product,'CO2','H2O'],condition:'Dung dịch nước; acid đủ và CO2 thoát ra.',explanation:'Mỗi ion bicarbonate tiêu thụ một proton, tạo một CO2.',observation:'Sủi bọt CO2 không màu.',transfers:[{from:source,to:product,carrier:c.formula,workup:'Khử khí, xử lý acid dư nếu cần.'}],net:`bicarbonate:${source}:${acid}`});}
  for(const [anion,gas,family,keys] of [['SO3','SO2','sulfite_acid',['Na1','K1','Ca2','Mg2','Ba2','Sr2']],['S','H2S','sulfide_acid',['Na1','K1','Fe2','Mn2']]])for(const key of keys)for(const [acid,a] of acids.filter(([x])=>['HCl','HBr','H2SO4'].includes(x))){
    const c=ion(key);if(!soluble(c,a))continue;const source=registerSalt(c,anion,['Na','K'].includes(c.formula)?'aq':'s'),product=registerSalt(c,a,'aq');register(gas,'g');register(acid,'aq');
    add({family,left:[source,acid],right:[product,gas,...(anion==='SO3'?['H2O']:[])],condition:'Axit không oxi hóa ở dạng loãng; khí độc yêu cầu hệ chuyên dụng, chỉ dùng làm mô tả học tập.',explanation:`Acid hóa ${anion} tạo ${gas}; không dùng cùng phương trình cho HNO3 hoặc H2SO4 đặc.`,observation:`Sinh khí ${gas}; không dùng mùi để nhận biết.`,transfers:[{from:source,to:product,carrier:c.formula,workup:'Phải tách và xử lý khí bằng quy trình chuyên biệt.'}],net:`${family}:${source}:${acid}`});
  }
  for(const a of ['Cl','Br','I','NO3','SO4','CH3COO'])for(const baseKey of ['Li1','Na1','K1','Ca2','Sr2','Ba2']){
    const c=ion(baseKey);if(!soluble(c,a))continue;const source=registerSalt(ion('NH41'),a,'aq'),base=registerSalt(c,'OH',c.formula==='Ca'?'s':'aq'),product=registerSalt(c,a,'aq');register('NH3','g');
    add({family:'ammonium_base',left:[source,base],right:[product,'NH3','H2O'],phases:{NH3:'g'},condition:'Kiềm đủ; làm ấm để NH3 thoát khỏi dung dịch; không dùng mùi nhận biết.',explanation:'NH4+ nhường proton cho OH−, tạo NH3 và nước.',observation:'NH3 không màu thoát ra khi làm ấm.',transfers:[{from:source,to:'NH3',carrier:'N',workup:'Chuyển khí bằng hệ chuyên dụng nếu bước sau cần NH3.'}],net:`ammonium-base:${source}:${base}`});
  }
  for(const key of ['Mg2','Al3','Zn2','Fe2','Ni2','Co2','Mn2','Cd2','Sn2'])for(const [acid,a] of acids.filter(([x])=>['HCl','HBr','H2SO4'].includes(x))){
    const c=ion(key),product=registerSalt(c,a,'aq');register(c.formula,'s');register('H2','g');register(acid,'aq');
    add({family:'metal_acid',left:[c.formula,acid],right:[product,'H2'],condition:`${acid} loãng, bề mặt kim loại hoạt động; tốc độ tùy kim loại, có thể cần làm ấm.`,explanation:'Kim loại khử H+ của axit không oxi hóa thành H2; không mở rộng sang Cu, Ag hoặc acid oxi hóa.',observation:'Kim loại tan và H2 không màu thoát ra khi phản ứng diễn ra.',transfers:[{from:c.formula,to:product,carrier:c.formula,workup:'Loại kim loại dư và acid dư theo bước sau.'}],net:`metal-acid:${c.formula}:${acid}`,sourceIds:['openstax-reaction-types','openstax-electrodes'],caveats:['Thế điện cực không xác định tốc độ; oxide/thụ động hóa có thể làm chậm.']});
  }
  const metals=[['Mg2',-2.37],['Mn2',-1.18],['Zn2',-0.76],['Fe2',-0.44],['Cd2',-0.40],['Co2',-0.28],['Ni2',-0.25],['Sn2',-0.14],['Pb2',-0.13],['Cu2',0.34],['Ag1',0.80]];
  for(let i=0;i<metals.length;i++)for(let j=i+1;j<metals.length;j++){
    const [sourceKey,es]=metals[i],[targetKey,et]=metals[j];if(et-es<0.12||['Pb2','Sn2'].includes(sourceKey)||targetKey==='Sn2'||sourceKey==='Fe2'&&targetKey==='Ag1')continue;
    const c=ion(sourceKey),target=ion(targetKey);
    for(const a of ['NO3','SO4','Cl','CH3COO']){if(!soluble(target,a)||!soluble(c,a))continue;const sourceSalt=registerSalt(target,a,'aq'),product=registerSalt(c,a,'aq');register(c.formula,'s');register(target.formula,'s');
      add({family:'displacement',left:[c.formula,sourceSalt],right:[product,target.formula],phases:{[c.formula]:'s',[target.formula]:'s'},condition:'Dung dịch muối không acid hóa mạnh; bề mặt kim loại hoạt động, không có ligand chi phối; chiều thuận theo thế điện cực.',explanation:`Cặp ${c.formula}/${target.formula} có chênh lệch thế chuẩn thuận lợi; bảo toàn electron và ion đối.`,observation:`Có thể xuất hiện ${target.formula} bám trên kim loại; tốc độ/hình thái phụ thuộc bề mặt.`,transfers:[{from:c.formula,to:product,carrier:c.formula,workup:'Lọc tách kim loại tạo thành và kim loại dư.'},{from:sourceSalt,to:target.formula,carrier:target.formula,workup:'Tách và rửa kim loại thu được.'}],net:`displacement:${c.formula}:${target.formula}`,sourceIds:['openstax-electrodes'],caveats:['Chiều nhiệt động không bảo đảm tốc độ hoặc độ chọn lọc trong mọi điều kiện.']});
    }
  }
  const organicAcids=[['HCOOH','HCOO'],['CH3COOH','CH3COO'],['C2H5COOH','C2H5COO'],['C3H7COOH','C3H7COO']];
  const alcohols=[['CH3OH','CH3'],['C2H5OH','C2H5'],['CH3CH2CH2OH','C3H7'],['CH3CH2CH2CH2OH','C4H9']];
  for(const [acid,residue] of organicAcids)for(const [alcohol,alkyl] of alcohols){const ester=residue+alkyl;register(acid,'l');register(alcohol,'l');register(ester,'l');
    add({family:'esterification',left:[acid,alcohol],right:[ester,'H2O'],phases:{[acid]:'l',[alcohol]:'l',[ester]:'l'},reversible:true,condition:'Alcohol và acid mạch thẳng đã chỉ rõ; xúc tác acid, làm ấm; cân bằng, tách nước hoặc dùng chất dư để tăng chuyển hóa.',explanation:'Nhóm carboxyl và alcohol tạo este; phương trình cân bằng không khẳng định chuyển hóa 100%.',transfers:[{from:acid,to:ester,carrier:'C',workup:'Tách este khỏi acid, alcohol và nước.'}],net:`esterification:${acid}:${alcohol}`,sourceIds:['openstax-organic'],caveats:['Nhóm alkyl chỉ mạch thẳng; không bao gồm đồng phân nhánh.']});
    for(const baseKey of ['Na1','K1','Li1']){const c=ion(baseKey),base=registerSalt(c,'OH','aq'),product=register(residue+c.formula,'aq',{ions:[{formula:c.formula,charge:1,count:1},{formula:residue,charge:-1,count:1}]});
      add({family:'saponification',left:[ester,base],right:[product,alcohol],phases:{[ester]:'l',[alcohol]:'aq'},condition:'Dung dịch kiềm; làm ấm, khuấy và đủ thời gian tiếp xúc hai pha.',explanation:'Thủy phân este trong kiềm tạo carboxylat và alcohol; không sinh CO2.',transfers:[{from:ester,to:product,carrier:'C',workup:'Tách alcohol và xử lý kiềm dư.'},{from:ester,to:alcohol,carrier:'C',workup:'Tách alcohol khỏi dung dịch muối; không phải theo dõi đồng vị carbon.'}],net:`saponification:${ester}:${base}`,sourceIds:['openstax-organic']});
    }
  }
  const fuels=['CH4','C2H6','C3H8','C4H10','C5H12','C6H14','C7H16','C8H18','C2H4','C3H6','C4H8','C5H10','C6H12','C7H14','C8H16','C2H2','C3H4','C4H6','C5H8','C6H6','C7H8',...alcohols.map(a=>a[0]),...organicAcids.map(a=>a[0])];
  for(const fuel of fuels){const phase=alcohols.some(a=>a[0]===fuel)||organicAcids.some(a=>a[0]===fuel)?'l':parseFormula(fuel).C<=4?'g':'l';register(fuel,phase);register('O2','g');
    add({family:'combustion',left:[fuel,'O2'],right:['CO2','H2O'],phases:{[fuel]:phase,O2:'g',CO2:'g',H2O:'g'},condition:'Mồi cháy, O2 dư; cháy hoàn toàn. Hydrocarbon dùng chất đại diện mạch thẳng (riêng C6H6: benzen, C7H8: toluen); không suy phản ứng chọn lọc từ công thức phân tử.',explanation:'Carbon thành CO2, hydrogen thành H2O; thiếu O2 có thể tạo CO hoặc muội nên phương trình này không mô tả đủ.',transfers:[{from:fuel,to:'CO2',carrier:'C',workup:'Thu và tách khí nếu bước sau dùng CO2.'}],net:`combustion:${fuel}`,sourceIds:['openstax-combustion'],caveats:['Với alkene/alkyne, chất đại diện là mạch thẳng có liên kết bội ở đầu mạch; không gộp dữ liệu nhiệt hoặc pha của mọi đồng phân.']});
  }
  for(const authored of curatedReactions)add({...authored,evidence:'established-transformation',sourceIds:authored.sourceIds?.[0]==='openstax-reaction-types'&&authored.family==='thermal'?['openstax-oxides']:authored.sourceIds});
  for(const [acid,a,count] of acids.filter(([formula])=>['HCl','HBr','HI','HNO3','H2SO4'].includes(formula)))register(acid,'aq',{ions:[{formula:'H',charge:1,count},{formula:a,charge:-anions[a].charge,count:1}]});
  for(const row of rows){row.ionic=netIonicEquation(row,speciesRegistry);row.netTransformation=row.ionic.key;}
  rows.sort((a,b)=>a.family.localeCompare(b.family)||a.equation.localeCompare(b.equation));
  return {schema:'chemdex.catalog/2',version:2,reviewedOn:'2026-10-28',count:rows.length,counts:{molecularReactions:rows.length,netTransformations:new Set(rows.map(r=>r.netTransformation)).size,families:Object.fromEntries([...new Set(rows.map(r=>r.family))].sort().map(f=>[f,rows.filter(r=>r.family===f).length])),runtimePrograms:0},evidencePolicy:'Các phương trình được kiểm tra cấu trúc và cân bằng; family-rule ghi nguồn quy tắc họ phản ứng, chưa xác nhận thực nghiệm riêng từng mẫu. Phương trình khác ion đối đếm riêng ở molecularReactions, gộp ở netTransformations. Không có bản sao chỉ đổi màu/thời lượng.',sources,species:[...speciesRegistry.values()].sort((a,b)=>a.formula.localeCompare(b.formula)),entries:rows};
}
export function generateCatalogFile(destination){const result=buildReactionCatalog(),audit=validateCatalog(result);if(!audit.valid||result.count<=1000)throw new Error(`Catalog gate failed: ${JSON.stringify(audit.errors)}; count=${result.count}`);const output=destination?path.resolve(destination):path.join(root,'shared/reaction-catalog.generated.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({output,count:result.count,counts:result.counts},null,2));return result;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))generateCatalogFile(process.argv[2]);
