import React from 'react';
import { BeakerAsset, CylinderAsset, PipetteTrayAsset, TubeRackAsset, WashBottleAsset } from '../assets/LabwareAssets';
import { Pipe, Solid } from '../assets/AssetPrimitives';
import { useStore } from '../../../store/useStore';

/** The same vessel geometry is used here, in scenarios and on storage shelves. */
export function ApparatusDetails(){
 const quality=useStore(s=>s.settings.graphicsQuality);
 return <group name="apparatus-fine-details">
  <group position={[-5.2,.901,-2.2]} userData={{labItem:{id:'detail-graduated-cylinder',title:'Ống đong có vạch chia và chân đế',kind:'volume'}}}><CylinderAsset/></group>
  <group position={[-3.3,.901,-2.2]} userData={{labItem:{id:'detail-graduated-beaker',title:'Cốc thủy tinh có mỏ rót và vạch chia',kind:'volume'}}}><BeakerAsset/></group>
  <group position={[-4.2,.901,2.1]} userData={{labItem:{id:'detail-test-tube-rack',title:'Giá ống nghiệm có nút',kind:'glass'}}}><TubeRackAsset/></group>
  <group position={[3.1,.901,2.65]} userData={{labItem:{id:'detail-wash-bottle',title:'Bình tia rửa dụng cụ',kind:'washBottle'}}}><WashBottleAsset/></group>
  {quality!=='potato'&&<group position={[-3.1,.901,2.65]} userData={{labItem:{id:'detail-pipette-tray',title:'Khay pipet và bóng hút',kind:'glass'}}}><PipetteTrayAsset/></group>}

 </group>;
}
