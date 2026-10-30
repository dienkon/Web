import React from 'react';
import { TeacherNPC } from './TeacherNPC';
import { BackpackAsset } from '../assets/PPEAssets';
import { ClockAsset, GHSBoardAsset, LEDPanelAsset } from '../assets/ArchitectureAssets';
import { PrintedBoardAsset } from '../assets/BoardAssets';
import { BagRackAsset, TeachingBenchAsset } from '../assets/TeachingFurnitureAssets';
export const LabDecor: React.FC = () => <group name="lab-teaching-decor">
 <group userData={{labItem:{title:'Bảng hướng dẫn trên lớp',kind:'board'}}} position={[0,1.1,-7.35]}><PrintedBoardAsset kind="lesson"/></group>
 <group userData={{labItem:{title:'Bàn giáo viên',kind:'workspace'}}} position={[0,0,-5.5]}><TeachingBenchAsset/></group>
 <TeacherNPC position={[0,0,-4.5]} rotationY={0} scale={.88}/>
 <group userData={{labItem:{title:'Bảng ký hiệu GHS',kind:'board'}}} position={[5.5,1.2,-7.35]}><GHSBoardAsset/></group>
 <group userData={{labItem:{title:'Bảng tuần hoàn',kind:'board'}}} position={[-5.5,1.2,-7.35]}><PrintedBoardAsset kind="periodic"/></group>
 <group userData={{labItem:{title:'Đồng hồ phòng thực hành',kind:'clock'}}} position={[0,2.98,-7.35]}><ClockAsset running/></group>
 <group userData={{labItem:{title:'Giá cất ba lô',kind:'locker'}}} position={[-8.2,0,6.8]}><BagRackAsset/>{[-.4,.4].map((x,i)=><group key={x} position={[x,.9,0]} rotation={[0,Math.PI,0]}><BackpackAsset color={i?'#a16b71':'#688faa'}/></group>)}</group>
 {[-6,-2,2,6].flatMap(x=>[-5,-1.8,1.8,5].map(z=><group key={x+'/'+z} userData={{labItem:{title:'Đèn chiếu sáng phòng',kind:'electrical'}}} position={[x,3.76,z]}><LEDPanelAsset/></group>))}
</group>;
