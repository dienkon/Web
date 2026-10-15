import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useStore } from '../../../store/useStore';

// One draw call for all graduation marks on each vessel.
function Graduations({ radius, height, count = 10 }: { radius: number; height: number; count?: number }) {
  const marks = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!marks.current) return;
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      matrix.compose(new THREE.Vector3(0, .035 + height * i / (count + 2), radius + .002), new THREE.Quaternion(), new THREE.Vector3(i % 5 === 0 ? .055 : .028, .003, .002));
      marks.current.setMatrixAt(i, matrix);
    }
    marks.current.instanceMatrix.needsUpdate = true;
  }, [radius, height, count]);
  return <instancedMesh ref={marks} args={[undefined, undefined, count]}><boxGeometry /><meshStandardMaterial color="#334155" /></instancedMesh>;
}

function GraduatedVessel({ tall = false, color = '#67e8f9' }: { tall?: boolean; color?: string }) {
  const radius = tall ? .045 : .095, height = tall ? .38 : .23;
  return <group>
    <mesh position={[0, height / 2, 0]}><cylinderGeometry args={[radius, radius * .97, height, 20, 1, true]} /><meshStandardMaterial color="#bce4ed" transparent opacity={.28} roughness={.15} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    <mesh position={[0, .008, 0]}><cylinderGeometry args={[tall ? .085 : radius, tall ? .085 : radius, .015, 20]} /><meshStandardMaterial color={tall ? '#e2e8f0' : '#bce4ed'} transparent opacity={.8} /></mesh>
    <mesh position={[0, height * .28, 0]}><cylinderGeometry args={[radius * .94, radius * .94, height * .5, 20]} /><meshStandardMaterial color={color} transparent opacity={.65} roughness={.18} /></mesh>
    <mesh position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[radius, .005, 6, 20]} /><meshStandardMaterial color="#d1f3fa" metalness={.2} roughness={.15} /></mesh>
    <mesh position={[0, height * .53, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[radius * .91, .003, 5, 20]} /><meshStandardMaterial color="#e0faff" /></mesh>
    <Graduations radius={radius} height={height} />
    {!tall && <mesh position={[radius, height - .01, 0]} rotation={[0, 0, -.7]}><boxGeometry args={[.035, .012, .035]} /><meshStandardMaterial color="#ccebf3" transparent opacity={.55} /></mesh>}
  </group>;
}

function TubeRack() {
  return <group userData={{ labItem: { id: 'detail-test-tube-rack', title: 'Giá ống nghiệm có nút', kind: 'glass' } }}>
    {[.04, .18].map(y => <mesh key={y} position={[0, y, 0]}><boxGeometry args={[.5, .025, .16]} /><meshStandardMaterial color="#dde7ed" metalness={.6} roughness={.3} /></mesh>)}
    {[-.22, .22].map(x => <mesh key={x} position={[x, .1, 0]}><boxGeometry args={[.025, .2, .14]} /><meshStandardMaterial color="#94a3b8" metalness={.7} /></mesh>)}
    {[-.16, -.05, .06, .17].map((x, i) => <group key={x} position={[x, .05, 0]}>
      <mesh position={[0, .12, 0]}><cylinderGeometry args={[.025, .025, .24, 12, 1, true]} /><meshStandardMaterial color="#c4e8f5" transparent opacity={.3} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      <mesh position={[0, .055, 0]}><capsuleGeometry args={[.022, .07, 4, 10]} /><meshStandardMaterial color={['#38bdf8', '#fbbf24', '#a78bfa', '#34d399'][i]} transparent opacity={.65} /></mesh>
      <mesh position={[0, .25, 0]}><cylinderGeometry args={[.029, .029, .025, 12]} /><meshStandardMaterial color="#475569" /></mesh>
      <mesh position={[0, .17, .026]}><planeGeometry args={[.027, .045]} /><meshStandardMaterial color="#f8fafc" /></mesh>
    </group>)}
  </group>;
}

function Hose({ points, color = '#334155', radius = .012 }: { points: [number, number, number][]; color?: string; radius?: number }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), [points]);
  return <mesh><tubeGeometry args={[curve, 20, radius, 6, false]} /><meshStandardMaterial color={color} roughness={.85} /></mesh>;
}

export function ApparatusDetails() {
  const quality = useStore(s => s.settings.graphicsQuality);
  return <group name="apparatus-fine-details">
    <group position={[-5.2, .91, -2.65]} userData={{ labItem: { id: 'detail-graduated-cylinder', title: 'Ống đong có vạch chia và chân đế', kind: 'volume' } }}><GraduatedVessel tall /></group>
    <group position={[-3.3, .91, -2.65]} userData={{ labItem: { id: 'detail-graduated-beaker', title: 'Cốc thủy tinh có mỏ rót và vạch chia', kind: 'volume' } }}><GraduatedVessel /></group>
    <group position={[-4.2, .91, 1.75]}><TubeRack /></group>
    <group position={[4.2, .91, -2.2]}>
      <Hose points={[[.7, .05, .4], [.85, .025, .3], [.7, .025, -.2], [.2, .025, -.25], [0, .035, 0]]} color="#c56b38" radius={.016} />
      <mesh position={[0, .06, 0]}><cylinderGeometry args={[.022, .028, .12, 12]} /><meshStandardMaterial color="#c0a36b" metalness={.7} /></mesh>
    </group>
    <group position={[3.1, .91, 2.65]} userData={{ labItem: { id: 'detail-wash-bottle', title: 'Bình tia rửa dụng cụ', kind: 'washBottle' } }}>
      <mesh position={[0, .1, 0]}><cylinderGeometry args={[.055, .065, .2, 16]} /><meshStandardMaterial color="#e0f2fe" roughness={.35} /></mesh>
      <mesh position={[0, .215, 0]}><cylinderGeometry args={[.04, .04, .03, 12]} /><meshStandardMaterial color="#38bdf8" /></mesh>
      <Hose points={[[0, .23, 0], [0, .33, 0], [.05, .38, 0], [.12, .36, 0]]} color="#e2e8f0" radius={.009} />
      <mesh position={[0, .1, .061]}><planeGeometry args={[.08, .075]} /><meshStandardMaterial color="#ffffff" /></mesh>
    </group>
    {quality !== 'potato' && <group position={[-3.1, .92, 2.65]} userData={{ labItem: { id: 'detail-pipette-tray', title: 'Khay pipet và bóng hút', kind: 'glass' } }}>
      <mesh><boxGeometry args={[.48, .025, .2]} /><meshStandardMaterial color="#dbe6ed" metalness={.5} /></mesh>
      {[-.055, 0, .055].map(z => <group key={z} position={[0, .025, z]} rotation={[0, 0, Math.PI / 2]}>
        <mesh><cylinderGeometry args={[.007, .004, .36, 8]} /><meshStandardMaterial color="#bce5f0" transparent opacity={.7} /></mesh>
        <mesh position={[0, .13, 0]} scale={[1, 1.6, 1]}><sphereGeometry args={[.021, 10, 8]} /><meshStandardMaterial color="#dc665f" roughness={.75} /></mesh>
      </group>)}
    </group>}
    <group position={[-9.65, .95, -1.38]} rotation={[0, Math.PI / 2, 0]} name="extinguisher-valve-detail">
      <mesh position={[0, .25, 0]}><cylinderGeometry args={[.025, .03, .075, 12]} /><meshStandardMaterial color="#a3a3a3" metalness={.9} /></mesh>
      {[.285, .32].map(y => <mesh key={y} position={[.025, y, 0]}><boxGeometry args={[.13, .014, .035]} /><meshStandardMaterial color="#1e293b" /></mesh>)}
      <mesh position={[-.035, .29, .02]}><torusGeometry args={[.024, .004, 6, 16]} /><meshStandardMaterial color="#d4af37" metalness={.8} /></mesh>
      <mesh position={[0, .13, .072]}><planeGeometry args={[.075, .15]} /><meshStandardMaterial color="#f8fafc" /></mesh>
      <Hose points={[[.04, .3, 0], [.12, .25, 0], [.12, .03, 0], [.07, -.03, 0]]} />
    </group>
  </group>;
}
