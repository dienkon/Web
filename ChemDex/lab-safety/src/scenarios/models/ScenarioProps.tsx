import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { LabScenario, PropKind } from '../types';
import { useStore } from '../../store/useStore';

const GLASS = '#b9dfe8';
const STEEL = '#a8b8c5';

function Bottle({ color = '#d7bd77', open = false, unlabelled = false }: { color?: string; open?: boolean; unlabelled?: boolean }) {
  return <group>
    <mesh position={[0, .135, 0]} castShadow>
      <cylinderGeometry args={[.063, .07, .27, 16]} />
      <meshStandardMaterial color="#dbe7e9" transparent opacity={.5} roughness={.15} />
    </mesh>
    <mesh position={[0, .08, 0]}>
      <cylinderGeometry args={[.059, .064, .15, 16]} />
      <meshStandardMaterial color={color} transparent opacity={.7} roughness={.2} />
    </mesh>
    <mesh position={[0, .28, 0]}>
      <cylinderGeometry args={[.025, .044, .045, 12]} />
      <meshStandardMaterial color="#b7cbd1" roughness={.2} />
    </mesh>
    <mesh position={open ? [.09, .015, .03] : [0, .317, 0]}>
      <cylinderGeometry args={[.029, .029, .028, 12]} />
      <meshStandardMaterial color="#6d867f" roughness={.7} />
    </mesh>
    {!unlabelled && <mesh position={[0, .17, .069]}>
      <planeGeometry args={[.082, .104]} />
      <meshStandardMaterial color="#ffffff" />
    </mesh>}
    {!unlabelled && <mesh position={[0, .18, .07]} rotation={[0, 0, Math.PI / 4]}>
      <planeGeometry args={[.034, .034]} />
      <meshStandardMaterial color="#d6a25d" />
    </mesh>}
  </group>;
}

function Beaker({ color = '#9ecdd3', cracked = false }: { color?: string; cracked?: boolean }) {
  const crack = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.03, .02, .078),
    new THREE.Vector3(.005, .06, .08),
    new THREE.Vector3(-.015, .1, .08),
    new THREE.Vector3(.02, .15, .078),
  ]), []);
  return <group>
    <mesh position={[0, .11, 0]}>
      <cylinderGeometry args={[.08, .076, .22, 20, 1, true]} />
      <meshStandardMaterial color={GLASS} transparent opacity={.3} side={THREE.DoubleSide} roughness={.1} depthWrite={false} />
    </mesh>
    <mesh position={[0, .05, 0]}>
      <cylinderGeometry args={[.072, .07, .09, 20]} />
      <meshStandardMaterial color={color} transparent opacity={.6} />
    </mesh>
    <mesh position={[0, .22, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[.08, .004, 6, 20]} />
      <meshStandardMaterial color={GLASS} />
    </mesh>
    {[.07, .1, .13, .16, .19].map((y, index) => <mesh key={y} position={[.025, y, .08]}>
      <boxGeometry args={[index % 2 ? .02 : .035, .002, .002]} />
      <meshStandardMaterial color="#668b99" />
    </mesh>)}
    {cracked && <mesh>
      <tubeGeometry args={[crack, 12, .002, 4, false]} />
      <meshStandardMaterial color="#b65e4b" />
    </mesh>}
  </group>;
}

function Tube({ color = '#94c9c9', tilted = false }: { color?: string; tilted?: boolean }) {
  return <group rotation={tilted ? [0, 0, .55] : [0, 0, 0]}>
    <mesh position={[0, .13, 0]}>
      <capsuleGeometry args={[.022, .2, 4, 12]} />
      <meshStandardMaterial color={GLASS} transparent opacity={.4} roughness={.15} />
    </mesh>
    <mesh position={[0, .065, 0]}>
      <capsuleGeometry args={[.018, .06, 4, 10]} />
      <meshStandardMaterial color={color} transparent opacity={.7} />
    </mesh>
    <mesh position={[0, .25, 0]}>
      <cylinderGeometry args={[.027, .027, .025, 12]} />
      <meshStandardMaterial color="#71949f" />
    </mesh>
  </group>;
}

function Hose({ disconnected = false }: { disconnected?: boolean }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.28, .035, -.08),
    new THREE.Vector3(-.24, .025, .16),
    new THREE.Vector3(.2, .025, .17),
    new THREE.Vector3(.24, .07, -.08),
  ]), []);
  return <group>
    <mesh>
      <tubeGeometry args={[curve, 24, .018, 8, false]} />
      <meshStandardMaterial color="#b88a61" roughness={.8} />
    </mesh>
    <mesh position={[.24, .07, disconnected ? -.14 : -.08]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[.02, .02, .065, 10]} />
      <meshStandardMaterial color={STEEL} metalness={.6} roughness={.3} />
    </mesh>
    <mesh position={[-.28, .07, -.08]}>
      <cylinderGeometry args={[.016, .016, .08, 10]} />
      <meshStandardMaterial color={STEEL} metalness={.6} />
    </mesh>
    <mesh position={[-.28, .12, -.08]}>
      <boxGeometry args={[.07, .016, .025]} />
      <meshStandardMaterial color="#c36d56" />
    </mesh>
  </group>;
}

function Centrifuge() {
  return <group>
    <mesh position={[0, .09, 0]} castShadow>
      <cylinderGeometry args={[.24, .22, .18, 24]} />
      <meshStandardMaterial color="#edf2f5" roughness={.45} metalness={.1} />
    </mesh>
    <mesh position={[0, .184, 0]}>
      <cylinderGeometry args={[.18, .18, .012, 24]} />
      <meshStandardMaterial color="#a6b9c5" metalness={.6} roughness={.3} />
    </mesh>
    {[0, 1, 2, 3, 4, 5].map(index => {
      const angle = index / 6 * Math.PI * 2;
      return <mesh key={index} position={[Math.cos(angle) * .12, .194, Math.sin(angle) * .12]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[.024, 10]} />
        <meshStandardMaterial color="#607b8b" />
      </mesh>;
    })}
    <group position={[.12, .185, 0]} scale={.4}><Tube color="#d7b77e" /></group>
    <group position={[.06, .185, .104]} scale={.4}><Tube /></group>
    <mesh position={[0, .32, -.2]} rotation={[.8, 0, 0]}>
      <cylinderGeometry args={[.24, .24, .025, 24]} />
      <meshStandardMaterial color="#e4edf2" roughness={.4} />
    </mesh>
    <mesh position={[0, .08, .218]}>
      <boxGeometry args={[.12, .04, .01]} />
      <meshStandardMaterial color="#b8d8c5" emissive="#b8d8c5" emissiveIntensity={.15} />
    </mesh>
  </group>;
}

function Crate({ small = false }: { small?: boolean }) {
  return <group scale={small ? .45 : 1}>
    <mesh position={[0, .22, 0]} castShadow>
      <boxGeometry args={[.55, .44, .42]} />
      <meshStandardMaterial color="#cfb993" roughness={.9} />
    </mesh>
    <mesh position={[0, .445, 0]}>
      <boxGeometry args={[.09, .008, .42]} />
      <meshStandardMaterial color="#e5d3af" />
    </mesh>
    <mesh position={[0, .24, .213]}>
      <planeGeometry args={[.25, .16]} />
      <meshStandardMaterial color="#faf8ed" />
    </mesh>
    {[-.12, -.08, -.04, .01, .04, .08, .12].map(x => <mesh key={x} position={[x, .24, .214]}>
      <planeGeometry args={[.009, .09]} />
      <meshStandardMaterial color="#809087" />
    </mesh>)}
  </group>;
}

function Goggles() {
  return <group rotation={[-Math.PI / 2, 0, 0]}>
    {[-1, 1].map(side => <group key={side} position={[side * .064, .07, 0]}>
      <mesh>
        <boxGeometry args={[.105, .072, .018]} />
        <meshStandardMaterial color="#8eb8bd" roughness={.5} />
      </mesh>
      <mesh position={[0, 0, .011]}>
        <planeGeometry args={[.087, .052]} />
        <meshStandardMaterial color="#d8f1f5" transparent opacity={.65} />
      </mesh>
    </group>)}
    <mesh position={[0, .07, 0]}>
      <boxGeometry args={[.035, .022, .02]} />
      <meshStandardMaterial color="#8eb8bd" />
    </mesh>
    <mesh position={[0, .07, -.06]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[.105, .009, 6, 20, Math.PI]} />
      <meshStandardMaterial color="#75979a" />
    </mesh>
  </group>;
}

function Gloves() {
  return <group rotation={[-Math.PI / 2, 0, .3]}>
    <mesh position={[0, .055, 0]}>
      <boxGeometry args={[.09, .12, .018]} />
      <meshStandardMaterial color="#a6d4ca" roughness={.9} />
    </mesh>
    {[-.033, -.011, .011, .033].map((x, index) => <mesh key={x} position={[x, .15 - Math.abs(index - 1.5) * .009, 0]}>
      <capsuleGeometry args={[.009, .075, 3, 8]} />
      <meshStandardMaterial color="#a6d4ca" roughness={.9} />
    </mesh>)}
    <mesh position={[-.06, .075, 0]} rotation={[0, 0, -.6]}>
      <capsuleGeometry args={[.012, .055, 3, 8]} />
      <meshStandardMaterial color="#a6d4ca" roughness={.9} />
    </mesh>
  </group>;
}

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
  if (kind === 'bottle' || kind === 'cabinet' || kind === 'waste') return <Bottle color={color} open={scenarioId === 'unknown-bottle'} unlabelled={scenarioId === 'unknown-bottle'} />;
  if (kind === 'glass') return <Beaker cracked={scenarioId === 'cracked-glass'} color={color} />;
  if (kind === 'beaker') return <Beaker color={color} />;
  if (kind === 'hose' || kind === 'burner') return <Hose disconnected={scenarioId === 'gas-hose'} />;
  if (kind === 'centrifuge') return <Centrifuge />;
  if (kind === 'crate') return <Crate small={scenarioId !== 'blocked-exit'} />;
  if (kind === 'goggles') return <Goggles />;
  if (kind === 'gloves') return <Gloves />;
  if (kind === 'vacuum') return <group><Beaker /><Hose /></group>;
  if (kind === 'pipette') return <group rotation={[0, 0, Math.PI / 2]}>
    <mesh position={[0, .14, 0]}><cylinderGeometry args={[.007, .003, .3, 8]} /><meshStandardMaterial color={GLASS} /></mesh>
    <mesh position={[0, .29, 0]} scale={[1, 1.5, 1]}><sphereGeometry args={[.025, 10, 8]} /><meshStandardMaterial color="#cb9284" /></mesh>
  </group>;
  if (kind === 'switch') return <group>
    <mesh position={[0, .025, 0]}><boxGeometry args={[.12, .05, .085]} /><meshStandardMaterial color="#e3eaed" /></mesh>
    <mesh position={[0, .055, 0]} rotation={[.2, 0, 0]}><boxGeometry args={[.055, .02, .04]} /><meshStandardMaterial color="#799e8c" /></mesh>
  </group>;
  if (kind === 'barrier') return <mesh position={[0, .09, 0]}><boxGeometry args={[.3, .18, .012]} /><meshStandardMaterial color="#d4e8ee" transparent opacity={.55} /></mesh>;
  if (kind === 'tray') return <mesh position={[0, .016, 0]}><boxGeometry args={[.38, .032, .25]} /><meshStandardMaterial color="#d6e1e6" metalness={.35} roughness={.4} /></mesh>;
  return <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[.14, .1]} /><meshStandardMaterial color="#fff8e6" /></mesh>;
}

export function ScenarioProps({ scenario }: { scenario: LabScenario }) {
  const cinematic = useStore(s => s.cinematic);
  const reduced = useStore(s => s.settings.reduceMotion);
  const moving = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!moving.current) return;
    const activeFilm = cinematic === `scenario:${scenario.id}`;
    moving.current.rotation.y = activeFilm && !reduced ? Math.sin(clock.elapsedTime * .8) * .035 : 0;
  });
  return <group name={`scenario-props-${scenario.id}`}>
    <mesh position={[0, -.005, 0]} receiveShadow>
      <boxGeometry args={[.95, .018, .55]} />
      <meshStandardMaterial color="#e5edef" roughness={.8} />
    </mesh>
    <group ref={moving}>
      {scenario.clues.map(clue => <group key={clue.id} position={clue.offset} name={`evidence-${clue.id}`}>
        <Prop kind={clue.prop} color={clue.color} scenarioId={scenario.id} />
      </group>)}
    </group>
    <group position={[0, .36, -.17]}>
      <Placard title={scenario.title} />
    </group>
    <mesh position={[0, -.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[.48, .49, 32]} />
      <meshStandardMaterial color="#b5cec2" transparent opacity={.65} />
    </mesh>
  </group>;
}
