import React from 'react';
import { HoodShellAsset } from '../assets/StationAssets';
import { FUME_HOOD_LAYOUT as L } from '../../../data/scene/fixtureLayout';
export const FumeHood: React.FC = () => (
 <group name="fume-hood-installation" userData={{labItem:{title:'Tủ hút khí độc',kind:'hood'}}} position={L.position} rotation={[0,L.rotationY,0]}><HoodShellAsset/></group>
);
