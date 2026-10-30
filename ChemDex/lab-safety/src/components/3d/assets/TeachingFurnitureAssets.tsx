import React from 'react';
import { InstancedBoxes, Solid } from './AssetPrimitives';
import { DrawerAsset } from './FurnitureAssets';

export function TeachingBenchAsset(){
 return <group name="asset-teaching-bench" userData={{assetId:'teaching-bench'}}>
  <InstancedBoxes color="#7c98a5" parts={[-1.35,-.8,.8,1.35].flatMap(x=>[-.4,.4].map(z=>({at:[x,.04,z],size:[.06,.08,.06]})))}/>
  <Solid size={[3,.05,1.1]} at={[0,.875,0]} color="#3e5966" rounded/>
  <Solid size={[2.9,.72,.025]} at={[0,.48,-.4875]} color="#afc5cc"/>
  {[-1.07,1.07].map((x,i)=><group key={x}>
   <Solid size={[.74,.03,.98]} at={[x,.1,0]} color="#a5bdc7"/>
   <InstancedBoxes color="#b7cbd0" parts={[-.35,.35].map(dx=>({at:[x+dx,.48,0],size:[.025,.72,.98]}))}/>
   {[.13,.49].map((y,row)=><group key={y} position={[x,y,.05]} scale={[.70,1,.75]} userData={{labItem:{id:`teacher-drawer-${i}-${row}`,title:'Ngăn bàn giáo viên',kind:'drawer'}}}><DrawerAsset/></group>)}
  </group>)}
  <Solid size={[1.4,.045,.08]} at={[0,.22,-.42]} color="#93afbc"/>
 </group>;
}

export function BagRackAsset(){
 return <group name="asset-bag-rack" userData={{assetId:'bag-rack'}}>
  <InstancedBoxes color="#73919f" parts={[-.71,.71].flatMap(x=>[-.16,.16].map(z=>({at:[x,.03,z],size:[.06,.06,.06]})))}/>
  <Solid size={[1.6,.825,.02]} at={[0,.4725,.215]} color="#99b4bf"/>
  <InstancedBoxes color="#9cb7c1" parts={[-.7875,0,.7875].map(x=>({at:[x,.4725,0],size:[.025,.825,.45]}))}/>
  <InstancedBoxes color="#abc1c9" parts={[.0725,.47,.8875].map(y=>({at:[0,y,0],size:[1.6,.025,.45]}))}/>
 </group>;
}
