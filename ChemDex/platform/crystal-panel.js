import visuals from '../shared/substance-visuals.generated.json';
import { mountPublishedCrystal } from '../js/three/published-crystal.js';

const phases=new Map(Object.values(visuals).flatMap(record=>record.crystals).map(phase=>[phase.id,phase]));
export function mountStructureCrystalPanel(container,ids) {
  const selected=ids.map(id=>phases.get(id)).filter(Boolean);
  let widget;
  container.replaceChildren();
  const host=document.createElement('div');
  if(selected.length>1){
    const label=document.createElement('label');label.textContent='Pha đang xem ';
    const select=document.createElement('select');select.setAttribute('aria-label','Pha tinh thể');
    selected.forEach((phase,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=phase.mineralName;select.append(option);});
    select.onchange=()=>show(Number(select.value));label.append(select);container.append(label);
  }
  container.append(host);
  function show(index){widget?.destroy();if(selected[index])widget=mountPublishedCrystal(host,selected[index]);}
  show(0);
  return {destroy(){widget?.destroy();container.replaceChildren();}};
}
