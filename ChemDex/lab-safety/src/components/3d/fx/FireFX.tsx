import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { fireSimulation } from '../../../core/fire/FireSim';
import { SimulationClock } from '../../../core/simulation/SimulationClock';
import { isSceneInputBlocked } from '../../../systems/input/sceneInput';
import { createParticleTexture } from './ParticleTexture';
import { useStore } from '../../../store/useStore';

const COUNT = 12;
export const FireFX = () => {
  const flames = useRef<THREE.InstancedMesh>(null);
  const smoke = useRef<THREE.Points>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const smokeTexture=useMemo(createParticleTexture,[]);
  const uniforms=useMemo(()=>({uTime:{value:0}}),[]);
  useEffect(()=>()=>smokeTexture.dispose(),[smokeTexture]);
  const smokePositions = useMemo(() => new Float32Array(24 * 3), []);
  useFrame(({ clock, camera }, delta) => {
    SimulationClock.tick(delta, isSceneInputBlocked(), dt => fireSimulation.update(dt));
    if (!flames.current || !smoke.current) return;
    const s = useStore.getState();
    if(!isSceneInputBlocked(s) && !s.settings.reduceMotion)uniforms.uTime.value+=Math.min(delta,.05);
    const cells = fireSimulation.sources.flatMap(f => f.cells).filter(c => c.intensity > 0.05);
    flames.current.visible = smoke.current.visible = s.view === 'game' && cells.length > 0;
    let index = 0;
    for (const cell of cells) {
      for (let n = 0; n < 3 && index < COUNT; n++, index++) {
        const angle = n * Math.PI * 2 / 3;
        const pulse = s.settings.reduceMotion ? 1 : 0.85 + Math.sin(clock.elapsedTime * 9 + n * 2) * 0.15;
        const height = (n % 2 ? 0.48 : 0.7) * cell.intensity * pulse;
        dummy.position.set(cell.x + Math.cos(angle) * 0.16, cell.y + height / 2, cell.z + Math.sin(angle) * 0.16);
        dummy.quaternion.copy(camera.quaternion);
        dummy.scale.set(0.3 * cell.intensity, height, 1); dummy.updateMatrix();
        flames.current.setMatrixAt(index, dummy.matrix);

      }
    }
    flames.current.count = index; flames.current.instanceMatrix.needsUpdate = true;
    if (flames.current.instanceColor) flames.current.instanceColor.needsUpdate = true;
    if (cells[0]) {
      const cell = cells[0];
      (smoke.current.material as THREE.PointsMaterial).opacity=.35*cell.intensity;
      for (let i = 0; i < 24; i++) {
        const rise = (clock.elapsedTime * 0.6 + i / 24) % 1;
        smokePositions[i * 3] = cell.x + Math.sin(i * 2.4 + rise) * rise * 0.45;
        smokePositions[i * 3 + 1] = cell.y + 0.4 + rise * 1.6;
        smokePositions[i * 3 + 2] = cell.z + Math.cos(i * 1.8) * rise * 0.45;
      }
      (smoke.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }
  });
  return <group name="fire-effects">
    <instancedMesh ref={flames} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <planeGeometry args={[1,1]} />
      <shaderMaterial uniforms={uniforms} transparent depthWrite={false} side={THREE.DoubleSide} toneMapped={false}
        vertexShader={`varying vec2 vUv;
          void main(){vUv=uv;vec4 p=vec4(position,1.0);
          #ifdef USE_INSTANCING
            p=instanceMatrix*p;
          #endif
          gl_Position=projectionMatrix*modelViewMatrix*p;}`}
        fragmentShader={`uniform float uTime;varying vec2 vUv;
          float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
          float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
          void main(){float n=noise(vec2(vUv.x*6.0,vUv.y*7.0-uTime*4.0));
            float width=.42*(1.0-pow(vUv.y,.7));float sway=sin(uTime*5.0+vUv.y*9.0)*.07*vUv.y;
            float edge=abs(vUv.x-.5+sway+(n-.5)*.08);float shape=1.0-smoothstep(width-.05,width+.06,edge);
            float alpha=shape*(1.0-smoothstep(.68,1.0,vUv.y+n*.16))*smoothstep(0.0,.08,vUv.y)*.82;
            if(alpha<.015)discard;float core=clamp(1.0-edge/max(width,.01),0.0,1.0)*(1.0-vUv.y);
            vec3 color=mix(vec3(1.0,.14,.025),vec3(1.0,.91,.42),pow(core,.7));gl_FragColor=vec4(color,alpha);}`}/>

    </instancedMesh>
    <points ref={smoke} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[smokePositions, 3]} /></bufferGeometry><pointsMaterial map={smokeTexture} size={0.35} color="#64748b" opacity={0.35} transparent depthWrite={false} /></points>
  </group>;
};
