import { gcd, parseFormula } from './formula.mjs';

export function netIonicEquation(entry, registry) {
  const byFormula = registry instanceof Map ? registry : new Map(registry.map(s=>[s.formula,s]));
  const values = new Map();
  for (const [rows,sign] of [[entry.reactants,-1],[entry.products,1]]) for(const row of rows){
    const dissociation = row.phase==='aq' ? byFormula.get(row.formula)?.ions : null;
    const parts = dissociation?.map(part=>({...part,phase:'aq'})) ?? [{formula:row.formula,charge:0,count:1,phase:row.phase}];
    for(const part of parts){
      const key=`${part.formula}^${part.charge}:${part.phase}`;
      const value=values.get(key)??{formula:part.formula,charge:part.charge,phase:part.phase,coefficient:0};
      value.coefficient+=sign*row.coefficient*part.count;values.set(key,value);
    }
  }
  const remaining=[...values.values()].filter(row=>row.coefficient!==0);
  const factor=remaining.reduce((g,row)=>gcd(g,row.coefficient),0)||1;
  const reactants=remaining.filter(r=>r.coefficient<0).map(r=>({...r,coefficient:-r.coefficient/factor}));
  const products=remaining.filter(r=>r.coefficient>0).map(r=>({...r,coefficient:r.coefficient/factor}));
  const side=rows=>rows.map(r=>`${r.coefficient}:${r.formula}^${r.charge}:${r.phase}`).sort().join('+');
  const display=rows=>rows.map(r=>`${r.coefficient===1?'':r.coefficient}${r.formula}${r.charge?`^${Math.abs(r.charge)===1?'':Math.abs(r.charge)}${r.charge>0?'+':'-'}`:''}(${r.phase})`).join(' + ');
  return {reactants,products,key:`${side(reactants)}>${side(products)}`,equation:`${display(reactants)} → ${display(products)}`};
}

export function ionicBalance(ionic){
  const atoms={},charge={value:0};
  for(const [rows,sign] of [[ionic.reactants,-1],[ionic.products,1]])for(const row of rows){
    charge.value+=sign*row.coefficient*row.charge;
    for(const [symbol,count] of Object.entries(parseFormula(row.formula)))atoms[symbol]=(atoms[symbol]??0)+sign*row.coefficient*count;
  }
  return {atoms:Object.fromEntries(Object.entries(atoms).filter(([,n])=>n!==0)),charge:charge.value};
}
