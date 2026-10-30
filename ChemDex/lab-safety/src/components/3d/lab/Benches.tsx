import React from 'react';
import { BenchApparatus } from './BenchApparatus';
import { BenchCabinetAsset, ReagentRackAsset, StoolAsset } from '../assets/FurnitureAssets';
import { useStore } from '../../../store/useStore';
interface BenchProps {id:string;position:[number,number,number];scenarioType?:'analytical'|'heating'|'reagents'|'acid_spill';}
const IslandBench: React.FC<BenchProps> = ({id,position,scenarioType}) => {
 const scenarioPhase=useStore(s=>s.currentPhase===5);
 return <group userData={{labItem:{title:'Bàn thực hành và ngăn dụng cụ',kind:'workspace'}}} position={position}>
  <BenchCabinetAsset id={id}/>
  <group userData={{labItem:{title:'Giá hóa chất trên bàn',kind:'storage'}}} position={[0,.901,-.5]}><ReagentRackAsset/></group>
  {[[-1,-1],[1,-1],[-1,1],[1,1]].map(([x,z],i)=><group key={i} position={[x,0,z]} userData={{labItem:{title:'Ghế thực hành',kind:'seat'}}}><StoolAsset/></group>)}
  {!scenarioPhase&&<BenchApparatus type={scenarioType}/>}
 </group>;
};
export const IslandBenches: React.FC = () => {
  return (
    <group>
      {/* Bench 1 (North-West): Analytical & Balances */}
      <IslandBench id="bench_nw" position={[-4.2, 0, -2.2]} scenarioType="analytical" />

      {/* Bench 2 (North-East): Heating & Synthesis */}
      <IslandBench id="bench_ne" position={[4.2, 0, -2.2]} scenarioType="heating" />

      {/* Bench 3 (South-West): Inorganic Reagents */}
      <IslandBench id="bench_sw" position={[-4.2, 0, 2.2]} scenarioType="reagents" />

      {/* Bench 4 (South-East): Acid Dilution & Spill Scenario */}
      <IslandBench id="bench_se" position={[4.2, 0, 2.2]} scenarioType="acid_spill" />
    </group>
  );
};
