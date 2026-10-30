import { PhoneAsset, PowerSwitchAsset, SafetyShieldAsset, ShippingCrateAsset, UtilityTrayAsset } from '../../components/3d/assets/ScenePropAssets';
import { ChemicalCabinetAsset } from '../../components/3d/lab/StorageCabinets';
import { STORAGE_CABINETS } from '../../data/scene/storageLayout';
import { GlassShardsAsset, SharpsBoxAsset } from '../../components/3d/assets/WasteAssets';
import { EyewashAsset } from '../../components/3d/assets/EmergencyAssets';
import { BenchSinkAsset } from '../../components/3d/assets/StationAssets';
import { BunsenAsset, GasHoseAsset, GasTapAsset } from '../../components/3d/assets/CombustionAssets';
import { BackpackAsset, GloveAsset, GogglesAsset } from '../../components/3d/assets/PPEAssets';
import { BeakerAsset, FlaskAsset, PipetteAsset, PipetteBulbAsset, ReagentBottleAsset, TestTubeAsset, TongsAsset } from '../../components/3d/assets/LabwareAssets';
import { CentrifugeAsset, HotplateAsset } from '../../components/3d/assets/InstrumentAssets';
import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { LabScenario, PropKind } from '../types';
import { getScenarioLayout } from './sceneLayout';
import { ScenarioMotion } from './ScenarioMotion';

const GLASS = '#b9dfe8';
const STEEL = '#a8b8c5';

function Bottle({ color='#d7bd77',open=false,unlabelled=false }:{color?:string;open?:boolean;unlabelled?:boolean}) { return <ReagentBottleAsset color={color} cap={!open} unlabelled={unlabelled}/>; }

function Beaker({color='#9ecdd3',cracked=false}:{color?:string;cracked?:boolean}) { return <BeakerAsset color={color} cracked={cracked}/>; }

function Tube({color='#94c9c9',tilted=false}:{color?:string;tilted?:boolean}) {return <group rotation={tilted?[0,0,.55]:[0,0,0]}><TestTubeAsset color={color}/></group>;}

function Hose({disconnected=false}:{disconnected?:boolean}){return <GasHoseAsset disconnected={disconnected}/>;}

function Centrifuge(){return <CentrifugeAsset/>;}

function Crate({small=false}:{small?:boolean}){return <group scale={small?.45:1}><ShippingCrateAsset/></group>;}

function Goggles(){return <GogglesAsset/>;}
function Gloves(){return <group position={[0,.018,0]} rotation={[-Math.PI/2,0,.3]}><GloveAsset/></group>;}

function Placard({ title, color = '#3e7e68' }: { title: string; color?: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 192;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#d9e5e5';
    context.lineWidth = 6;
    context.strokeRect(3, 3, 506, 186);
    context.fillStyle = color;
    context.font = '600 28px sans-serif';
    context.textAlign = 'center';
    const words = title.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      if (context.measureText(`${line} ${word}`).width > 455) {
        lines.push(line);
        line = word;
      } else line = line ? `${line} ${word}` : word;
    }
    if (line) lines.push(line);
    lines.slice(0, 3).forEach((text, index) => context.fillText(text, 256, 56 + index * 43));
    const result = new THREE.CanvasTexture(canvas);
    result.colorSpace = THREE.SRGBColorSpace;
    return result;
  }, [title, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh rotation={[-.4, 0, 0]}>
    <planeGeometry args={[.52, .195]} />
    <meshStandardMaterial map={texture} side={THREE.DoubleSide} />
  </mesh>;
}

function Prop({ kind, color, scenarioId }: { kind: PropKind; color: string; scenarioId: string }) {
  if (kind === 'backpack') return <BackpackAsset/>;
  if (kind === 'tube') return <Tube color={color}/>;
  if (kind === 'bulb') return <group position={[0,.047,0]} rotation={[0,0,Math.PI/2]}><PipetteBulbAsset/></group>;
  if (kind === 'shard') return <group scale={.7}><GlassShardsAsset/></group>;
  if (kind === 'tongs') return <TongsAsset/>;
  if (kind === 'hotplate') return <HotplateAsset/>;
  if (kind === 'phone') return <PhoneAsset/>;
  if (kind === 'sink') return <BenchSinkAsset/>;
  if (kind === 'eyewash') return <EyewashAsset/>;
  if (kind === 'valve') return <GasTapAsset/>;
  if (kind === 'vacuumFlask') return <FlaskAsset vacuum/>;
  if (kind === 'bottle') return <Bottle color={color} unlabelled={scenarioId === 'unknown-bottle'} />;
  if (kind==='cabinet') return <group scale={[.29,.2222,.3077]}><ChemicalCabinetAsset cabinet={STORAGE_CABINETS[1]} position={[0,0,0]} rotationY={0} open={false} interactive={false} name="asset-mini-storage"/></group>;
  if (kind === 'waste') return <group scale={.55}><SharpsBoxAsset/></group>;
  if (kind === 'glass') return <Beaker cracked={scenarioId === 'cracked-glass'} color={color} />;
  if (kind === 'beaker') return <Beaker color={color} />;
  if (kind === 'hose') return <Hose disconnected={scenarioId === 'gas-hose'} />;
  if (kind === 'burner') return <BunsenAsset/>;
  if (kind === 'centrifuge') return <Centrifuge />;
  if (kind === 'crate') return <Crate small={scenarioId !== 'blocked-exit'} />;
  if (kind === 'goggles') return <Goggles />;
  if (kind === 'gloves') return <Gloves />;
  if (kind === 'vacuum') return <group><Beaker /><Hose /></group>;
  if (kind === 'pipette') return <group rotation={[0,0,Math.PI/2]}><PipetteAsset/></group>;
  if (kind==='switch') return <PowerSwitchAsset/>;
  if (kind==='barrier') return <SafetyShieldAsset/>;
  if (kind==='tray') return <UtilityTrayAsset/>;
  return <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[.14, .1]} /><meshStandardMaterial color="#fff8e6" /></mesh>;
}

export function ScenarioProps({ scenario }: { scenario: LabScenario }) {
  const layout=getScenarioLayout(scenario);
  const floor=scenario.position[1]<.2;
  return <group name={`scenario-props-${scenario.id}`}>
    <mesh position={[0, -.012, 0]} receiveShadow>
      <boxGeometry args={[layout.size[0], .024, layout.size[1]]} />
      <meshStandardMaterial color="#e5edef" roughness={.8} />
    </mesh>
    {!floor&&scenario.position[1]>.95&&<group name="scenario-support">
      {[-1,1].flatMap(x=>[-1,1].map(z=><mesh key={`${x}-${z}`} position={[x*(layout.size[0]/2-.06),-scenario.position[1]/2-.012,z*(layout.size[1]/2-.06)]}><boxGeometry args={[.035,scenario.position[1]-.024,.035]}/><meshStandardMaterial color="#9eafb9" metalness={.5} roughness={.5}/></mesh>))}
    </group>}
    <group>
      {scenario.id==='incompatible-storage'&&[-.42,0].map(x=><mesh key={x} position={[x,.006,0]}><boxGeometry args={[.2,.012,.23]}/><meshStandardMaterial color="#d3d5ba" roughness={.6}/></mesh>)}
      {scenario.clues.map((clue,i) => <group key={clue.id} position={layout.offsets[i]} name={`evidence-${clue.id}`}>
        <Prop kind={layout.props?.[i]??clue.prop} color={clue.color} scenarioId={scenario.id} />
      </group>)}
    </group>
    <ScenarioMotion scenario={scenario} layout={layout}/>
    <group position={[0, floor?.015:.42, -layout.size[1]/2+.05]} rotation={floor?[-Math.PI/2+.4,0,0]:[0,0,0]}>
      <Placard title={scenario.title} />
    </group>
  </group>;
}
