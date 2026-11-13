// Complete finite DISPLAY-neighbour components at a cell boundary, using only
// integer translations of the original sites. A winding cycle identifies an
// infinite network: never try to close such a component as a molecule.
import {periodicCrystalNeighbors,periodicCrystalHydrogenBonds,crystalCartesian,crystalDisplayConnections,crystalDisplayHydrogenBonds} from './crystal-neighbors.mjs';

const cache=new WeakMap();
const add=(a,b)=>a.map((v,k)=>v+b[k]);
const subtract=(a,b)=>a.map((v,k)=>v-b[k]);
const imageKey=(i,shift)=>`${i}:${shift.join(',')}`;

export function crystalDisplayClusters(data,repeat=1){
  if(![1,2].includes(repeat))throw Error('Crystal repeat must be 1 or 2');
  if(cache.get(data)?.has(repeat))return cache.get(data).get(repeat);
  const remember=result=>{if(!cache.has(data))cache.set(data,new Map());cache.get(data).set(repeat,result);return result;};
  // Disordered/partially occupied alternatives are not complete molecules.
  if(data.atoms.some(a=>a.occupancy!==1||a.disorderGroup))return remember({additions:[],finiteComponents:0});
  const edges=periodicCrystalNeighbors(data),adjacency=data.atoms.map(()=>[]),components=[],byAtom=[];
  for(const edge of edges)adjacency[edge.a].push(edge);
  for(let start=0;start<data.atoms.length;start++){
    if(byAtom[start])continue;
    const component={offsets:new Map([[start,[0,0,0]]]),eligible:true},queue=[start];byAtom[start]=component;
    for(let cursor=0;cursor<queue.length;cursor++){
      const a=queue[cursor];
      for(const edge of adjacency[a]){
        if(edge.radius===null)component.eligible=false; // ionic/metal coordination is not a finite molecular closure
        const offset=add(component.offsets.get(a),edge.shift),known=component.offsets.get(edge.b);
        if(known){if(known.some((v,k)=>v!==offset[k]))component.eligible=false;}
        else {component.offsets.set(edge.b,offset);byAtom[edge.b]=component;queue.push(edge.b);}
      }
    }
    if(queue.length<2)component.eligible=false;
    components.push(component);
  }
  const eligible=index=>byAtom[index]?.eligible;
  const images=new Map(),base=new Set();
  const put=(index,shift)=>{
    const key=imageKey(index,shift);
    if(!images.has(key))images.set(key,{index,shift,fractional:add(data.atoms[index].fractional,shift)});
  };
  for(let i=0;i<data.atoms.length;i++){
    const limits=data.atoms[i].fractional.map(v=>repeat+(Math.abs(v)<2e-6?1:0));
    for(let x=0;x<limits[0];x++)for(let y=0;y<limits[1];y++)for(let z=0;z<limits[2];z++){const shift=[x,y,z];put(i,shift);base.add(imageKey(i,shift));}
  }
  const complete=(index,shift)=>{
    if(!eligible(index))return;
    const component=byAtom[index],root=subtract(shift,component.offsets.get(index));
    for(const [i,offset]of component.offsets)put(i,add(root,offset));
  };
  for(const image of [...images.values()])complete(image.index,image.shift);
  const hydrogen=periodicCrystalHydrogenBonds(data),canExtend=edge=>eligible(edge.a)&&eligible(edge.b)&&eligible(edge.donor)&&byAtom[edge.a]===byAtom[edge.donor];
  const outgoing=data.atoms.map(()=>[]),incoming=data.atoms.map(()=>[]);
  for(const edge of hydrogen.filter(canExtend)){outgoing[edge.a].push(edge);incoming[edge.b].push(edge);}
  // Exactly one hydrogen-neighbour shell around the completed cell fragments;
  // take a snapshot, so the hydrogen network can never expand without bound.
  for(const image of [...images.values()]){
    for(const edge of outgoing[image.index])complete(edge.b,add(image.shift,edge.shift));
    for(const edge of incoming[image.index])complete(edge.a,subtract(image.shift,edge.shift));
  }
  const additions=[...images].filter(([key])=>!base.has(key)).map(([,image])=>image);
  if(!additions.length)return remember({additions,finiteComponents:components.filter(c=>c.eligible).length});
  const connections=crystalDisplayConnections(data,repeat,edges.filter(e=>!eligible(e.a))),hydrogenBonds=crystalDisplayHydrogenBonds(data,repeat,hydrogen.filter(e=>!canExtend(e)));
  const seen=new Set(),seenHydrogen=new Set();
  const connection=(image,target,edge)=>{
    const elements=[data.atoms[edge.a].element,data.atoms[edge.b].element];
    if(edge.donor!==undefined&&!elements.includes(data.atoms[edge.donor].element))elements.push(data.atoms[edge.donor].element);
    return {from:crystalCartesian(data,image.fractional),to:crystalCartesian(data,target.fractional),elements,distance:edge.distance};
  };
  for(const [key,image]of images){
    if(eligible(image.index))for(const edge of adjacency[image.index]){
      const targetKey=imageKey(edge.b,add(image.shift,edge.shift)),target=images.get(targetKey),signature=[key,targetKey].sort().join('|');
      if(!target||seen.has(signature))continue;seen.add(signature);connections.push(connection(image,target,edge));
    }
    for(const edge of outgoing[image.index]){
      const targetKey=imageKey(edge.b,add(image.shift,edge.shift)),target=images.get(targetKey),signature=[key,targetKey].sort().join('|');
      if(!target||!images.has(imageKey(edge.donor,add(image.shift,edge.donorShift)))||seenHydrogen.has(signature))continue;
      seenHydrogen.add(signature);hydrogenBonds.push(connection(image,target,edge));
    }
  }
  return remember({additions,connections,hydrogenBonds,finiteComponents:components.filter(c=>c.eligible).length});
}
