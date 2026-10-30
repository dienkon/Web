import React from 'react';
import { GloveDispenserAsset, GogglesAsset, HairTieAsset, LabCoatAsset, MaskAsset } from '../assets/PPEAssets';
import { AssetLabel, Pipe, Solid } from '../assets/AssetPrimitives';

export const PPEStation:React.FC=()=> <group name="ppe-display-station" userData={{labItem:{title:'Tủ bảo hộ cá nhân',kind:'ppe'}}} position={[-3,0,7.1]}>
 <Solid size={[3,2.1,.03]} at={[0,1.05,.26]} color="#d0dadd"/>
 {[-1.485,-.51,.51,1.485].map(x=><Solid key={x} size={[.03,2.05,.55]} at={[x,1.075,0]} color="#c4d2d7"/>)}
 <Solid size={[3,.06,.55]} at={[0,.08,0]} color="#a9bdc6"/>
 <Solid size={[3,.035,.55]} at={[0,2.08,0]} color="#b8cbd1"/>
 {[-1.3,0,1.3].map(x=><Solid key={x} size={[.075,.05,.4]} at={[x,.025,0]} color="#7f949e"/>)}
 <Pipe points={[[-1.43,1.6,-.02],[-.57,1.6,-.02]]} radius={.012}/>
 {[-.21,.21].map(x=><group key={x} position={[-1+x,.758,-.02]} rotation={[0,Math.PI,0]} scale={[.65,.95,.8]} userData={{labItem:{title:'Áo blouse có cổ ve và cúc',kind:'ppe',equipKey:'hasLabCoat'}}}><LabCoatAsset/></group>)}
 <Solid size={[.94,.03,.48]} at={[0,1.2,0]} color="#afc3cc"/>
 {[-.26,0,.26].map(x=><group key={x} position={[x,1.215,-.12]} rotation={[0,Math.PI,0]} userData={{labItem:{title:'Kính chống bắn có đai và đệm',kind:'ppe',equipKey:'hasGoggles'}}}><GogglesAsset/></group>)}
 <Solid size={[.94,.025,.48]} at={[.99,1.17,0]} color="#afc3cc"/>
 {[-.22,0,.22].map((x,i)=><group key={x} position={[.95+x,1.1825,-.14]} rotation={[0,Math.PI,0]} userData={{labItem:{title:'Găng nitrile cỡ '+['S','M','L'][i],kind:'ppe',equipKey:'hasGloves'}}}><GloveDispenserAsset size={['S','M','L'][i]} color={['#7195b0','#9181a7','#6fa5aa'][i]}/></group>)}
 <Solid size={[1.85,.025,.48]} at={[.5,.61,0]} color="#b9ccd2"/>
 <group position={[.5,.624,-.16]} rotation={[0,Math.PI,0]} userData={{labItem:{title:'Khẩu trang thực hành',kind:'ppe',equipKey:'hasMask'}}}><MaskAsset/></group>
 <group position={[.85,.624,-.13]} userData={{labItem:{title:'Dây buộc tóc',kind:'ppe',equipKey:'hairTied'}}}><HairTieAsset/></group>
 {[-1,0,1].map((x,i)=><AssetLabel key={x} lines={[[ 'ÁO BLOUSE','KÍNH BẢO HỘ','GĂNG TAY'][i]]} size={[.7,.1]} at={[x,1.88,-.278]} rotation={[0,Math.PI,0]} ink="#48767b" paper="#e9efea"/>)}
</group>;
