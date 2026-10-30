import React from 'react';
import { HandwashStationAsset } from '../assets/StationAssets';
import { WASH_STATION_LAYOUT as L } from '../../../data/scene/fixtureLayout';
export const HandwashSink: React.FC = () => (
 <group userData={{labItem:{title:'Bồn rửa tay',kind:'wash'}}} position={L.position} rotation={[0,L.rotationY,0]}><HandwashStationAsset/></group>
);
