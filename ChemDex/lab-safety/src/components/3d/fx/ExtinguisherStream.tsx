import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { createParticleTexture } from './ParticleTexture';
import { isSceneInputBlocked } from '../../../systems/input/sceneInput';
import { fireSimulation } from '../../../core/fire/FireSim';
import * as THREE from 'three';

interface Props {
  isDischarging: boolean;
}

const PARTICLE_COUNT = 48;

export const ExtinguisherStream: React.FC<Props> = ({ isDischarging }) => {
  const { camera, size, gl, scene } = useThree();
  const texture=useMemo(createParticleTexture,[]);
  const uniforms=useMemo(()=>({uSprite:{value:texture},uScale:{value:300}}),[texture]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  const alpha=useMemo(()=>new Float32Array(PARTICLE_COUNT),[]);
  const particleSize=useMemo(()=>new Float32Array(PARTICLE_COUNT),[]);
  const pointsRef = useRef<THREE.Points>(null);

  const vectors = useMemo(() => ({ fwd: new THREE.Vector3(), right: new THREE.Vector3(), up: new THREE.Vector3(), muzzle: new THREE.Vector3(), velocity: new THREE.Vector3() }), []);
  // Particle data arrays
  const { positions, velocities, lifetimes, maxLifetimes, sizes } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const vel = new Float32Array(PARTICLE_COUNT * 3);
    const life = new Float32Array(PARTICLE_COUNT);
    const maxLife = new Float32Array(PARTICLE_COUNT);
    const sz = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Start inactive
      life[i] = 1.0;
      maxLife[i] = 0.4 + Math.random() * 0.3; // short fast bursts
      sz[i] = 0.08 + Math.random() * 0.12;
      pos[i * 3] = 0;
      pos[i * 3 + 1] = -100; // hidden
      pos[i * 3 + 2] = 0;
    }

    return {
      positions: pos,
      velocities: vel,
      lifetimes: life,
      maxLifetimes: maxLife,
      sizes: sz,
    };
  }, []);

  // Frame update: spawn and advance particles
  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    delta=Math.min(delta,.05);
    const emitting=isDischarging && !isSceneInputBlocked() && !!fireSimulation.currentExtinguisher?.isDischarging;
    uniforms.uScale.value=size.height*gl.getPixelRatio()*camera.projectionMatrix.elements[5]/2;

    const geo = pointsRef.current.geometry;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;

    // Camera forward and right vectors
    const { fwd, right, up, muzzle: muzzlePos, velocity } = vectors;
    fwd.set(0,0,-1).applyQuaternion(camera.quaternion);
    right.set(1,0,0).applyQuaternion(camera.quaternion);
    up.set(0,1,0).applyQuaternion(camera.quaternion);
    muzzlePos.copy(camera.position).addScaledVector(fwd,.6).addScaledVector(right,-.22).addScaledVector(up,-.16);
    const nozzle = emitting ? scene.getObjectByName('extinguisher-muzzle') : undefined;
    if (nozzle) { nozzle.updateWorldMatrix(true, false); nozzle.getWorldPosition(muzzlePos); }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      lifetimes[i] += delta;
      const progress=Math.min(1,lifetimes[i]/maxLifetimes[i]);
      alpha[i]=(1-progress)*.48;
      particleSize[i]=sizes[i]*(1+progress*1.5);

      if (lifetimes[i] >= maxLifetimes[i]) {
        if (emitting) {
          // Re-spawn particle from muzzle
          lifetimes[i] = 0;
          positions[i * 3] = muzzlePos.x + (Math.random() - 0.5) * 0.04;
          positions[i * 3 + 1] = muzzlePos.y + (Math.random() - 0.5) * 0.04;
          positions[i * 3 + 2] = muzzlePos.z + (Math.random() - 0.5) * 0.04;

          // Velocity: high speed cone forward
          const spreadX = (Math.random() - 0.5) * 0.45;
          const spreadY = (Math.random() - 0.5) * 0.35;
          const speed = 7.5 + Math.random() * 3.5;

          const pVel = velocity.copy(fwd).multiplyScalar(speed).addScaledVector(right,spreadX*speed*.3).addScaledVector(up,spreadY*speed*.3);

          velocities[i * 3] = pVel.x;
          velocities[i * 3 + 1] = pVel.y;
          velocities[i * 3 + 2] = pVel.z;
        } else {
          // Hide particle
          positions[i * 3 + 1] = -100;
        }
      } else {
        // Move existing particle
        positions[i * 3] += velocities[i * 3] * delta;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * delta;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * delta;
      }
    }

    posAttr.needsUpdate = true;
    (geo.attributes.aOpacity as THREE.BufferAttribute).needsUpdate=true;
    (geo.attributes.aSize as THREE.BufferAttribute).needsUpdate=true;
  });

  return (
    <points name="extinguisher-stream" ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute attach="attributes-aOpacity" args={[alpha,1]} />
        <bufferAttribute attach="attributes-aSize" args={[particleSize,1]} />
      </bufferGeometry>
      <shaderMaterial uniforms={uniforms} transparent depthWrite={false}
        vertexShader={`attribute float aOpacity;attribute float aSize;uniform float uScale;varying float vOpacity;
          void main(){vOpacity=aOpacity;vec4 p=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*p;gl_PointSize=clamp(aSize*uScale/max(.1,-p.z),1.0,48.0);}`}
        fragmentShader={`uniform sampler2D uSprite;varying float vOpacity;void main(){float a=texture2D(uSprite,gl_PointCoord).a*vOpacity;if(a<.005)discard;gl_FragColor=vec4(.93,.97,1.0,a);}`}/>
    </points>
  );
};
