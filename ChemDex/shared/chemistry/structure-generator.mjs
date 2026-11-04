import { parseFormula, normalizeFormula } from './formula.mjs';

export function structureFormula(value) {
  return normalizeFormula(String(value).replace(/\s*\((?:dil|conc|glacial|dilute|concentrated|solid|liquid|gas|ribbon|powder|granules|dust|filings|nail|turnings|foil|chips|carbon|\d+(?:\.\d+)?%)\)/gi, ''))
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]*[⁺⁻]+$/, '').replace(/[+-]$/, '');
}
export const compositionKey = formula => JSON.stringify(Object.entries(parseFormula(structureFormula(formula))).sort(([a],[b])=>a.localeCompare(b)));
const atom = (elem,x,y,z) => ({elem,x,y,z});
const vectors = {
  tetra: [[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]].map(v=>v.map(x=>x/Math.sqrt(3))),
  planar: [[1,0,0],[-.5,Math.sqrt(3)/2,0],[-.5,-Math.sqrt(3)/2,0]],
  linear: [[1,0,0],[-1,0,0]],
  octa: [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]],
};
const same = (a,b) => compositionKey(a) === compositionKey(b);
function template(formula) {
  const definitions = {
    H2O: ['O',['H','H'], [[.7907,0,.6122],[-.7907,0,.6122]], .958],
    OH: ['O',['H'], [[1,0,0]], .97],
    H3O: ['O',['H','H','H'], vectors.tetra.slice(0,3),1.0],
    NH4: ['N',['H','H','H','H'],vectors.tetra,1.03],
    NH3: ['N',['H','H','H'],vectors.tetra.slice(0,3),1.02],
    CH4: ['C',['H','H','H','H'],vectors.tetra,1.09],
    CO2: ['C',['O','O'],[[1,0,0],[-1,0,0]],1.16],
    CO3: ['C',['O','O','O'],vectors.planar,1.29],
    NO3: ['N',['O','O','O'],vectors.planar,1.25],
    SO4: ['S',['O','O','O','O'],vectors.tetra,1.49],
    PO4: ['P',['O','O','O','O'],vectors.tetra,1.54],
    CrO4: ['Cr',['O','O','O','O'],vectors.tetra,1.65],
    MnO4: ['Mn',['O','O','O','O'],vectors.tetra,1.63],
  };
  const key = Object.keys(definitions).find(f => same(f,formula));
  if (!key) return null;
  const [center, neighbors, directions, length] = definitions[key];
  return {atoms:[atom(center,0,0,0),...neighbors.map((e,i)=>atom(e,...directions[i].map(v=>v*length)))],bonds:neighbors.map((_,i)=>({a:0,b:i+1,order:1}))};
}
// A formula determines atom counts, but not connectivity or stereochemistry.
// Unknown topologies are deliberately rendered as unbonded composition models.
function composition(formula) {
  const counts = parseFormula(structureFormula(formula));
  const count = Object.values(counts).reduce((a,b)=>a+b,0);
  if (count > 2000) throw new Error('Công thức vượt giới hạn 2.000 nguyên tử. Hãy nhập đơn vị cấu tạo nhỏ hơn.');
  const atoms = [];
  const side = Math.ceil(Math.cbrt(count));
  for (const [elem,n] of Object.entries(counts)) for(let i=0;i<n;i++) {
    const k=atoms.length;
    atoms.push(atom(elem, (k%side)*2.5, (Math.floor(k/side)%side)*2.5, Math.floor(k/(side*side))*2.5));
  }
  return {atoms,bonds:[]};
}
function idealMolecule(formula) {
  // Recognized AXn families only. Unknown connectivity remains unbonded.
  if (['H2O','NH3','CH4','CO2'].some(f=>same(f,formula))) return template(formula);
  const counts=parseFormula(formula), symbols=Object.keys(counts);
  if(symbols.length!==2) return null;
  const central=symbols.find(s=>counts[s]===1 && ['Be','B','C','Si','P','S','Se','Xe','Kr','Cl','Br','I'].includes(s));
  if(!central) return null;
  const ligand=symbols.find(s=>s!==central),n=counts[ligand];
  if(!['H','F','Cl','Br','I'].includes(ligand))return null;
  const family={Be:[2],B:[3],C:[4],Si:[4],P:[3,5],S:[2,4,6],Se:[2,4,6],Xe:[2,4,6],Kr:[2],Cl:[3],Br:[3,5],I:[3,5,7]};
  if(!family[central].includes(n) || n>6)return null;
  const shapes={2:vectors.linear,3:vectors.planar,4:vectors.tetra,5:[...vectors.planar,[0,0,1],[0,0,-1]],6:vectors.octa};
  let directions=shapes[n];
  if(['P'].includes(central)&&n===3) directions=vectors.tetra.slice(0,3);
  if(['S','Se'].includes(central)&&n===2) directions=vectors.tetra.slice(0,2);
  if(['S','Se'].includes(central)&&n===4) directions=[[1,0,0],[-.5,Math.sqrt(3)/2,0],[0,0,1],[0,0,-1]];
  if(['Cl','Br','I'].includes(central)&&n===3) directions=[[1,0,0],[0,0,1],[0,0,-1]];
  if(['Br','I'].includes(central)&&n===5) directions=[...vectors.octa.slice(0,4),[0,0,1]];
  if(central==='Xe'&&n===4)directions=vectors.octa.slice(0,4);
  const radii={H:.31,F:.57,Cl:1.02,Br:1.2,I:1.39,Be:.96,B:.84,C:.76,Si:1.11,P:1.07,S:1.05,Se:1.2,Xe:1.4,Kr:1.16};
  const length=radii[central]+radii[ligand];
  return {atoms:[atom(central,0,0,0),...directions.map(d=>atom(ligand,...d.map(v=>v*length)))],bonds:directions.map((_,i)=>({a:0,b:i+1,order:1}))};
}
export function generateStructure(record) {
  let model, mode, note;
  const formula = structureFormula(record.formula);
  const counts = parseFormula(formula);
  if(record.ions?.length) {
    const total = record.ions.reduce((n,ion)=>n+ion.count,0);
    if (total > 1000) throw new Error('Quá nhiều nhóm ion để hiển thị.');
    const atoms=[],bonds=[]; let group=0;
    for (const ion of record.ions) for(let i=0;i<ion.count;i++) {
      const part = template(ion.formula) ?? composition(ion.formula);
      const offset=atoms.length, side=Math.ceil(Math.sqrt(total));
      const dx=(group%side)*7, dy=Math.floor(group/side)*7;
      for(const a of part.atoms) atoms.push({...a,x:a.x+dx,y:a.y+dy,charge:ion.charge});
      for(const b of part.bonds) bonds.push({...b,a:b.a+offset,b:b.b+offset});
      group++;
    }
    const actual={}; for(const a of atoms) actual[a.elem]=(actual[a.elem]??0)+1;
    // Hydrates and custom species must retain every atom, including water.
    if (JSON.stringify(Object.entries(actual).sort()) !== JSON.stringify(Object.entries(counts).sort())) model=composition(formula);
    else model={atoms,bonds};
    mode='ions'; note='Mô hình các nhóm ion theo đúng tỉ lệ công thức. Vị trí giữa các ion chỉ để minh họa; không phải ô mạng tinh thể hay cấu trúc hydrat hóa.';
  } else if(Object.keys(counts).length===1 && Object.values(counts)[0]===1) {
    model=composition(formula);mode='atom';note='Nguyên tử riêng lẻ; không mô tả mạng tinh thể của đơn chất.';
  } else if (record.kind === 'ion' && template(formula)) {
    model=template(formula);mode='idealized';note='Hình học ion lý tưởng để học tập. Độ dài liên kết là giá trị minh họa, không dùng làm số liệu thực nghiệm.';
  } else if(idealMolecule(formula)) {
    model=idealMolecule(formula);mode='idealized';note='Hình học VSEPR lý tưởng để học tập. Góc và độ dài liên kết là minh họa; không phải cấu dạng tính toán tối ưu hay dữ liệu thực nghiệm. Một số phân tử có biến dạng so với hình lý tưởng.';
  } else {
    model=composition(formula);mode='composition';note='Mô hình thành phần: hiển thị đủ nguyên tử của công thức. Chưa xác định liên kết, đồng phân hoặc mạng tinh thể; đây không phải cấu trúc phân tử đã kiểm chứng.';
  }
  if(model.atoms.length>2000) throw new Error('Công thức vượt giới hạn 2.000 nguyên tử.');
  for(const axis of ['x','y','z']) { const mean=model.atoms.reduce((n,a)=>n+a[axis],0)/model.atoms.length;for(const a of model.atoms)a[axis]-=mean; }
  return {...model,mode,note:record.modelNote ? record.modelNote+' '+note : note,format:'sdf',dimension:'3d',generated:true};
}
export function toSDF(model, title='ChemDex illustration') {
  // V3000 avoids the V2000 limit of 999 atoms/bonds and retains all atoms.
  const lines=[title.replace(/[\r\n]/g,' '),'  ChemDex          3D','', '  0  0  0     0  0            999 V3000','M  V30 BEGIN CTAB',`M  V30 COUNTS ${model.atoms.length} ${model.bonds.length} 0 0 0`,'M  V30 BEGIN ATOM'];
  model.atoms.forEach((a,i)=>lines.push(`M  V30 ${i+1} ${a.elem} ${a.x.toFixed(5)} ${a.y.toFixed(5)} ${a.z.toFixed(5)} 0`));
  lines.push('M  V30 END ATOM','M  V30 BEGIN BOND');
  model.bonds.forEach((b,i)=>lines.push(`M  V30 ${i+1} ${b.order??1} ${b.a+1} ${b.b+1}`));
  lines.push('M  V30 END BOND','M  V30 END CTAB','M  END','> <CHEMDEX_MODEL_NOTE>',model.note??'Mô hình minh họa','', '$$$$');
  return lines.join('\n');
}
