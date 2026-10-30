// Independent exclusion checks supplement atom/charge balance. They are not a
// general reaction predictor or experimental verification of every catalog row.
export function chemicalConstraintErrors(entry) {
  const errors=[],left=new Set(entry.reactants.map(r=>r.formula)),right=new Set(entry.products.map(r=>r.formula));
  const all=[...left,...right];
  for(const formula of ['AgOH','CuI2','FeI3','Al2(CO3)3','Fe2(CO3)3','Cr2(CO3)3']) {
    if(all.includes(formula))errors.push(`Unsupported/unreliable aqueous species ${formula}`);
  }
  if(entry.family==='precipitation'){
    if(right.has('CuCO3'))errors.push('Aqueous copper carbonate precipitation commonly forms basic carbonate, not a universal CuCO3 solid');
    if(!entry.products.some(row=>row.phase==='s'))errors.push('Precipitation must form a solid');
    if(!/Q\s*>\s*Ksp/.test(entry.conditions?.description_vi??'')&&!right.has('Ag2O'))errors.push('Precipitation requires a saturation condition');
    const iodide=entry.reactants.some(row=>/^(Na|K|Li|NH4)I$/.test(row.formula));
    if(iodide&&entry.reactants.some(row=>/^(CuCl2|CuBr2|Cu\(NO3\)2|CuSO4|FeCl3|FeBr3|Fe\(NO3\)3|Fe2\(SO4\)3)$/.test(row.formula)))errors.push('Iodide with Cu(II)/Fe(III) needs a redox reaction');
  }
  if(right.has('H2')&&entry.family==='metal_acid'){
    if(left.has('HNO3'))errors.push('Nitric acid is not a generic H2-producing acid');
    if(left.has('Cu')||left.has('Ag'))errors.push('Cu/Ag do not release H2 from ordinary dilute nonoxidizing acid');
    if(!/loãng/.test(entry.conditions?.description_vi??''))errors.push('Metal-acid H2 cases must specify dilute nonoxidizing conditions');
  }
  if(entry.family==='displacement'&&entry.reactants.some(row=>row.phase==='s'&&['Li','Na','K','Ca','Ba'].includes(row.formula)))errors.push('Water-reactive metals cannot use a generic aqueous displacement template');
  if(entry.family==='neutralization'&&left.has('NH3')&&right.has('H2O'))errors.push('NH3 protonation must not invent a water product');
  if(entry.family==='thermal'){
    if((left.has('NaNO3')&&!right.has('NaNO2'))||(left.has('KNO3')&&!right.has('KNO2')))errors.push('Na/K nitrate thermal route must use nitrite');
    if(left.has('LiNO3')&&right.has('LiNO2'))errors.push('Li nitrate must not inherit the Na/K nitrite rule');
  }
  return errors;
}
