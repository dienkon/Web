// CIF 1.1 parser for one periodic structure. Never executes symmetry expressions.
// Full cell angles and explicit symmetry operations are required for non-P1 data.
function tokens(raw) {
  const source=String(raw).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
  if(source.length>4_000_000)throw Error('CIF quá lớn.');
  const out=[];let i=0;
  while(i<source.length){
    if(/\s/.test(source[i])){i++;continue;}
    if(source[i]==='#'){while(i<source.length&&source[i]!=='\n')i++;continue;}
    if(source[i]===';'&&(i===0||source[i-1]==='\n')){
      const end=source.indexOf('\n;',i+1);if(end<0)throw Error('CIF thiếu dấu kết thúc văn bản.');
      out.push({value:source.slice(i+1,end),quoted:true});i=end+2;continue;
    }
    if(source[i]==='"'||source[i]==="'"){
      const quote=source[i++],start=i;while(i<source.length&&!(source[i]===quote&&(i+1===source.length||/\s/.test(source[i+1]))))i++;
      if(i===source.length)throw Error('CIF thiếu dấu đóng chuỗi.');
      out.push({value:source.slice(start,i),quoted:true});i++;continue;
    }
    const start=i;while(i<source.length&&!/\s/.test(source[i]))i++;
    out.push({value:source.slice(start,i),quoted:false});
  }
  return out;
}
const control=t=>t&&!t.quoted&&/^(?:_|loop_|data_|save_|stop_|global_)/i.test(t.value);
export function cifNumber(value) {
  const text=String(value??'');
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:\(\d+\))?(?:[eE][+-]?\d+)?$/.test(text))throw Error(`Số CIF không hợp lệ: ${text}`);
  const result=Number(text.replace(/\(\d+\)/,''));if(!Number.isFinite(result))throw Error('Số CIF không hữu hạn.');return result;
}
function rational(text) {
  if(!/^[+-]?\d+(?:\/\d+)?$/.test(text))throw Error(`Phép đối xứng CIF không hợp lệ: ${text}`);
  const [n,d=1]=text.split('/').map(Number);if(!d)throw Error('Mẫu số đối xứng bằng 0.');return n/d;
}
export function symmetryOperator(expression) {
  const rows=String(expression).toLowerCase().replace(/\s/g,'').split(',');
  if(rows.length!==3)throw Error('Phép đối xứng cần ba thành phần.');
  const matrix=[],translation=[];
  for(const row of rows){
    const terms=row.match(/[+-]?[^+-]+/g)??[];
    if(terms.join('')!==row)throw Error('Biểu thức đối xứng không hợp lệ.');
    const coefficients=[0,0,0];let offset=0;
    for(const term of terms){
      const variable=/^([+-]?)(?:(\d+(?:\/\d+)?)\*?)?([xyz])$/.exec(term);
      if(variable)coefficients['xyz'.indexOf(variable[3])]+=(variable[1]==='-'?-1:1)*(variable[2]?rational(variable[2]):1);
      else offset+=rational(term);
    }
    matrix.push(coefficients);translation.push(offset);
  }
  const [a,b,c]=matrix,det=a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]);
  if(Math.abs(Math.abs(det)-1)>1e-8)throw Error('Ma trận đối xứng CIF không khả nghịch đơn vị.');
  return xyz=>matrix.map((row,i)=>row.reduce((s,v,k)=>s+v*xyz[k],translation[i]));
}
export function parseCIF(raw) {
  const input=tokens(raw),values=new Map(),loops=[];let i=0,blocks=0;
  while(i<input.length){
    const token=input[i++],lower=token.value.toLowerCase();
    if(!token.quoted&&lower.startsWith('data_')){if(++blocks>1)throw Error('Chọn một khối cấu trúc CIF trước khi xem.');continue;}
    if(!token.quoted&&lower==='loop_'){
      const columns=[];while(i<input.length&&!input[i].quoted&&input[i].value.startsWith('_'))columns.push(input[i++].value.toLowerCase());
      if(!columns.length)throw Error('Vòng lặp CIF thiếu cột.');
      const cells=[];while(i<input.length&&!control(input[i]))cells.push(input[i++].value);
      if(cells.length%columns.length)throw Error('Số giá trị trong vòng lặp CIF không khớp cột.');
      loops.push({columns,rows:Array.from({length:cells.length/columns.length},(_,r)=>cells.slice(r*columns.length,(r+1)*columns.length))});continue;
    }
    if(!token.quoted&&lower.startsWith('_')){if(!input[i]||control(input[i]))throw Error(`CIF thiếu giá trị ${lower}`);values.set(lower,input[i++].value);}
  }
  const cell={};for(const key of ['a','b','c','alpha','beta','gamma'])cell[key]=cifNumber(values.get(`_cell_${['a','b','c'].includes(key)?'length':'angle'}_${key}`));
  if(['a','b','c'].some(k=>cell[k]<=0)||['alpha','beta','gamma'].some(k=>cell[k]<=0||cell[k]>=180))throw Error('Thông số ô mạng CIF không hợp lệ.');
  const rad=Math.PI/180,ca=Math.cos(cell.alpha*rad),cb=Math.cos(cell.beta*rad),cg=Math.cos(cell.gamma*rad),sg=Math.sin(cell.gamma*rad);
  const cx=cell.c*cb,cy=cell.c*(ca-cb*cg)/sg,cz2=cell.c**2-cx**2-cy**2;
  if(cz2<=1e-12)throw Error('Metric ô mạng CIF suy biến.');
  const basis=[[cell.a,cell.b*cg,cx],[0,cell.b*sg,cy],[0,0,Math.sqrt(cz2)]];
  const xyzLoop=loops.find(loop=>['_atom_site_fract_x','_atom_site_fract_y','_atom_site_fract_z'].every(c=>loop.columns.includes(c)));
  if(!xyzLoop)throw Error('CIF thiếu tọa độ phân số nguyên tử.');
  const symColumns=['_space_group_symop_operation_xyz','_symmetry_equiv_pos_as_xyz'];
  const symLoop=loops.find(loop=>symColumns.some(c=>loop.columns.includes(c)));
  const symbol=values.get('_space_group_name_h-m_alt')??values.get('_symmetry_space_group_name_h-m')??'';
  let expressions=symLoop?symLoop.rows.map(row=>row[symLoop.columns.findIndex(c=>symColumns.includes(c))]):symColumns.map(c=>values.get(c)).filter(Boolean);
  if(!expressions.length){
    if(symbol.replace(/\s/g,'').toUpperCase()!=='P1')throw Error('CIF thiếu phép đối xứng; không tự coi vị trí bất đối xứng là toàn ô.');
    expressions=['x,y,z'];
  }
  if(expressions.length>384)throw Error('Quá nhiều phép đối xứng CIF.');
  const ops=expressions.map(symmetryOperator),atoms=[],expansionWarnings=[],sites=[];
  for(const row of xyzLoop.rows){
    const get=c=>row[xyzLoop.columns.indexOf(c)];
    const label=get('_atom_site_label')??get('_atom_site_type_symbol')??'';
    const element=(get('_atom_site_type_symbol')??label).match(/^[A-Z][a-z]?/)?.[0];
    if(!element)throw Error(`Không xác định được nguyên tố: ${label}`);
    const fractionalText=['x','y','z'].map(k=>get('_atom_site_fract_'+k));
    const fractional=fractionalText.map(cifNumber);
    const occupancy=get('_atom_site_occupancy')===undefined?1:cifNumber(get('_atom_site_occupancy'));
    if(occupancy<0||occupancy>1.001)throw Error('Độ chiếm chỗ CIF không hợp lệ.');
    let seen=[];
    for(const op of ops){
      const frac=op(fractional).map(v=>{const f=((v%1)+1)%1;return Math.min(f,1-f)<2e-6?0:f;});
      if(seen.some(old=>old.every((v,k)=>Math.min(Math.abs(v-frac[k]),1-Math.abs(v-frac[k]))<2e-5)))continue;
      seen.push(frac);
    }
    const present=value=>value!==undefined && value!=='.' && value!=='?';
    const modern=get('_atom_site_site_symmetry_multiplicity')??get('_atom_site.site_symmetry_multiplicity');
    const order=get('_atom_site_site_symmetry_order')??get('_atom_site.site_symmetry_order');
    const legacy=get('_atom_site_symmetry_multiplicity');
    sites.push({label,element,occupancy,seen,fractionalText,
      declared:present(modern)?cifNumber(modern):present(order)?expressions.length/cifNumber(order):null,
      legacy:present(legacy)?cifNumber(legacy):null});
  }
  function reconciled(site,multiplicity){
    if(!Number.isInteger(multiplicity)||multiplicity<1||multiplicity>expressions.length)return null;
    if(site.seen.length===multiplicity)return site.seen;
    if(site.seen.length<multiplicity)return null;
    // Reconcile only duplicate images within the printed coordinate precision.
    // The representative remains an original image, never a snapped coordinate.
    const rounding=site.fractionalText.map(text=>{
      const value=String(text).replace(/\(\d+\)/,'').split(/[eE]/);
      const digits=(value[0].split('.')[1]??'').length;
      return digits ? .5*Math.pow(10,(Number(value[1])||0)-digits) : 0;
    });
    const tolerance=Math.max(2e-5,Math.min(.001,6*Math.max(...rounding))),merged=[];
    for(const frac of site.seen)if(!merged.some(old=>old.every((v,k)=>Math.min(Math.abs(v-frac[k]),1-Math.abs(v-frac[k]))<tolerance+1e-10)))merged.push(frac);
    return merged.length===multiplicity?merged:null;
  }
  // IUCr deprecated this legacy tag because some software writes the site
  // symmetry ORDER instead of multiplicity. Confirm the convention across the
  // entire block; do not interpret each atom opportunistically.
  const legacySites=sites.filter(s=>s.declared===null&&s.legacy!==null);
  const legacyMultiplicity=legacySites.every(s=>reconciled(s,s.legacy));
  const legacyOrder=legacySites.every(s=>reconciled(s,expressions.length/s.legacy));
  if(legacySites.length&&!legacyMultiplicity&&!legacyOrder)throw Error('Bội số/thứ tự đối xứng cũ không nhất quán với toàn khối CIF.');
  if(legacySites.length&&!legacyMultiplicity&&legacyOrder)expansionWarnings.push('Trường _atom_site_symmetry_multiplicity cũ chứa thứ tự đối xứng vị trí; diễn giải theo quy ước được xác nhận trên toàn khối.');
  for(const site of sites){
    const {label,element,occupancy}=site;
    const multiplicity=site.declared??(site.legacy===null?null:legacyMultiplicity?site.legacy:expressions.length/site.legacy);
    const expanded=multiplicity===null?site.seen:reconciled(site,multiplicity);
    if(!expanded)throw Error(`Bội số vị trí ${label} không khớp tọa độ/đối xứng; không tự bổ sung hay sửa nguyên tử.`);
    if(expanded.length!==site.seen.length)expansionWarnings.push(`Vị trí ${label}: gộp ảnh trùng do làm tròn theo bội số ${multiplicity} của CIF; không dịch chuyển tọa độ.`);
    for(const frac of expanded){
      const position=basis.map(r=>r.reduce((sum,v,k)=>sum+v*frac[k],0));
      atoms.push({elem:element,label,fractional:frac,occupancy,x:position[0],y:position[1],z:position[2]});
      if(atoms.length>20000)throw Error('CIF có quá nhiều vị trí nguyên tử để xem.');
    }
  }
  if(!atoms.length)throw Error('CIF không có nguyên tử.');
  // Distance alone does not establish a chemical bond or a bond order.
  return {atoms,bonds:[],cell,basis,spaceGroup:symbol,symmetryOperations:expressions,periodic:true,expansionWarnings};
}
