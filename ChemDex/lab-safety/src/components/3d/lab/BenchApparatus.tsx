import React from 'react';
import { BalanceAsset, BuretteAsset, HotplateAsset, PHMeterAsset } from '../assets/InstrumentAssets';
import { CylinderAsset, TubeRackAsset } from '../assets/LabwareAssets';

export function BenchApparatus({type}:{type?:string}) {
 if(type==='analytical')return <group position={[0,.901,0]}>
  <group userData={{labItem:{title:'Cân phân tích',kind:'balance'}}} position={[-.5,0,.4]}><BalanceAsset/></group>
  <group userData={{labItem:{title:'Bếp gia nhiệt và bình tam giác',kind:'heat'}}} position={[.4,0,.4]}><HotplateAsset flask/></group>
  <group userData={{labItem:{title:'Máy đo pH và điện cực',kind:'ph'}}} position={[1,0,.35]}><PHMeterAsset/></group>
 </group>;
 if(type==='heating')return <group position={[0,.901,0]}>
  <group userData={{labItem:{title:'Giá kẹp, buret và bình chuẩn độ',kind:'titration'}}} position={[.4,0,.38]}><BuretteAsset/></group>
 </group>;
 if(type==='reagents')return <group position={[0,.901,0]}>
  <group userData={{labItem:{title:'Giá đỡ ống nghiệm',kind:'glass'}}} position={[-.5,0,.35]}><TubeRackAsset/></group>
  <group userData={{labItem:{title:'Ống đong chia vạch',kind:'volume'}}} position={[.3,0,.38]}><CylinderAsset/></group>
 </group>;
 return null;
}
