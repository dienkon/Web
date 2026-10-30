import { PrintedBoardAsset } from '../assets/BoardAssets';
import React from 'react';
import { ExtinguisherCabinetAsset, FireBlanketAsset, SpillCartAsset } from '../assets/EmergencyAssets';
export const SafetyWall: React.FC = () => <group>
 <group userData={{labItem:{title:'Tủ bình cứu hỏa',kind:'extinguisher'}}} position={[-9.85,.65,-1.5]} rotation={[0,Math.PI/2,0]}><ExtinguisherCabinetAsset/></group>
 <group userData={{labItem:{title:'Chăn chữa cháy',kind:'blanket'}}} position={[-9.85,1.13,-.4]} rotation={[0,Math.PI/2,0]}><FireBlanketAsset/></group>
 <group userData={{labItem:{title:'Bộ dụng cụ xử lý tràn',kind:'spillKit'}}} position={[-9.3,0,3]} rotation={[0,Math.PI/2,0]}><SpillCartAsset/></group>
 <group userData={{labItem:{title:'Bảng nội quy và sơ đồ thoát nạn',kind:'board'}}} position={[-9.85,1.375,4.85]} rotation={[0,Math.PI/2,0]}><PrintedBoardAsset kind="evacuation"/></group>
 <group userData={{labItem:{title:'Bảng nội quy phòng thí nghiệm',kind:'board'}}} position={[-9.85,1.375,6.15]} rotation={[0,Math.PI/2,0]}><PrintedBoardAsset kind="rules"/></group>
</group>;
